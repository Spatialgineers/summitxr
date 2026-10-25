import { TelemetryStats } from '../types/engine';

interface PacketRecord {
  timestamp: number;
  bytesIn: number;
  bytesOut: number;
}

export interface SessionTelemetryEvent {
  id: string;
  category: string;
  action: string;
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface SessionTelemetrySummary {
  totalEvents: number;
  categoryBreakdown: Record<string, number>;
  recentEvents: SessionTelemetryEvent[];
  networkStats: TelemetryStats;
}

const SESSION_EVENTS_STORAGE_KEY = 'sgx_session_telemetry_events_v1';

class TelemetryTracker {
  private packets: PacketRecord[] = [];
  private totalBytesIn = 0;
  private totalBytesOut = 0;
  private listeners: Set<(stats: TelemetryStats) => void> = new Set();
  private sessionListeners: Set<(summary: SessionTelemetrySummary) => void> = new Set();
  private lastLatency = 8; // ms
  private sessionEvents: SessionTelemetryEvent[] = [];
  private categoryCounts: Record<string, number> = {
    navigation: 1,
    game: 0,
    vote: 0,
    social: 0,
    sponsor: 0,
    audio: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem(SESSION_EVENTS_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed.events)) {
            this.sessionEvents = parsed.events;
          }
          if (parsed.categoryCounts && typeof parsed.categoryCounts === 'object') {
            this.categoryCounts = { ...this.categoryCounts, ...parsed.categoryCounts };
          }
        }
      } catch {
        // Ignore storage error
      }

      // Periodic cleanup every 2 seconds
      setInterval(() => {
        this.cleanupOldPackets();
        this.notify();
      }, 2000);
    }
  }

  public recordBytesIn(bytes: number, latencyMs?: number) {
    const now = Date.now();
    this.totalBytesIn += bytes;
    if (latencyMs !== undefined && latencyMs > 0) {
      this.lastLatency = latencyMs;
    }
    this.packets.push({
      timestamp: now,
      bytesIn: bytes,
      bytesOut: 0,
    });
    this.cleanupOldPackets();
    this.notify();
  }

  public recordBytesOut(bytes: number) {
    const now = Date.now();
    this.totalBytesOut += bytes;
    this.packets.push({
      timestamp: now,
      bytesIn: 0,
      bytesOut: bytes,
    });
    this.cleanupOldPackets();
    this.notify();
  }

  public recordEvent(category: string, action: string, metadata?: Record<string, any>) {
    const evt: SessionTelemetryEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      category,
      action,
      metadata,
      timestamp: Date.now(),
    };
    this.sessionEvents = [evt, ...this.sessionEvents.slice(0, 199)];
    this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;

    // Also record packet footprint for the telemetry stream
    this.recordBytesOut(128);

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem(
          SESSION_EVENTS_STORAGE_KEY,
          JSON.stringify({
            events: this.sessionEvents.slice(0, 100),
            categoryCounts: this.categoryCounts,
          })
        );
      } catch {
        // Ignore storage quota
      }
    }

    this.notifySessionListeners();
  }

  public getSessionSummary(): SessionTelemetrySummary {
    const totalEvents = Object.values(this.categoryCounts).reduce((acc, v) => acc + v, 0);
    return {
      totalEvents,
      categoryBreakdown: { ...this.categoryCounts },
      recentEvents: this.sessionEvents.slice(0, 30),
      networkStats: this.getStats(),
    };
  }

  private cleanupOldPackets() {
    const cutoff = Date.now() - 30000; // 30-second sliding window
    this.packets = this.packets.filter(p => p.timestamp >= cutoff);
  }

  public getStats(connectedUsers: number = 1): TelemetryStats {
    this.cleanupOldPackets();
    const effectiveUsers = Math.max(1, connectedUsers);

    let rollingBytesIn = 0;
    let rollingBytesOut = 0;
    for (const p of this.packets) {
      rollingBytesIn += p.bytesIn;
      rollingBytesOut += p.bytesOut;
    }
    const rollingBytes30s = rollingBytesIn + rollingBytesOut;

    const kbPerUserPer30s = Number(
      (rollingBytes30s / 1024 / (effectiveUsers > 1 ? effectiveUsers * 0.4 : 1)).toFixed(2)
    );

    const baseline = effectiveUsers * 60;
    const currentKb = rollingBytes30s / 1024;
    const efficiency = Math.min(99.8, Math.max(88.0, 100 - (currentKb / Math.max(1, baseline)) * 100));

    return {
      totalBytesIn: this.totalBytesIn,
      totalBytesOut: this.totalBytesOut,
      rollingBytes30s,
      kbPerUserPer30s: Math.max(0.4, kbPerUserPer30s),
      messageCount30s: this.packets.length,
      connectedUsers: effectiveUsers,
      latencyMs: this.lastLatency,
      streamEfficiencyScore: Number(efficiency.toFixed(1)),
      lastUpdated: Date.now(),
    };
  }

  public subscribe(callback: (stats: TelemetryStats) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public subscribeSession(callback: (summary: SessionTelemetrySummary) => void) {
    this.sessionListeners.add(callback);
    return () => {
      this.sessionListeners.delete(callback);
    };
  }

  private notify() {
    setTimeout(() => {
      const stats = this.getStats();
      this.listeners.forEach(cb => {
        try {
          cb(stats);
        } catch {
          // ignore error
        }
      });
    }, 0);
  }

  private notifySessionListeners() {
    setTimeout(() => {
      const summary = this.getSessionSummary();
      this.sessionListeners.forEach(cb => {
        try {
          cb(summary);
        } catch {
          // ignore error
        }
      });
    }, 0);
  }
}

export const telemetry = new TelemetryTracker();

export function recordEvent(category: string, action: string, metadata?: Record<string, any>): void {
  telemetry.recordEvent(category, action, metadata);
}

export function getSessionSummary(): SessionTelemetrySummary {
  return telemetry.getSessionSummary();
}

export function subscribeTelemetry(callback: (summary: SessionTelemetrySummary) => void): () => void {
  return telemetry.subscribeSession(callback);
}

export function exportEventsCSV(): string {
  const summary = telemetry.getSessionSummary();
  const rows = [
    ['EventID', 'TimestampISO', 'Category', 'Action', 'Details'],
    ...summary.recentEvents.map(ev => [
      ev.id,
      new Date(ev.timestamp).toISOString(),
      ev.category,
      ev.action,
      JSON.stringify(ev.metadata || {}).replace(/"/g, '""'),
    ]),
  ];
  return rows.map(r => r.map(cell => `"${cell}"`).join(',')).join('\n');
}
