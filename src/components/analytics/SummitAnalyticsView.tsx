import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Users,
  Vote,
  MessageSquare,
  Eye,
  Trophy,
  Download,
  Globe,
  Layers,
  Activity,
  ShieldCheck,
  Zap,
  RefreshCw,
  MapPin,
  Ticket,
} from 'lucide-react';
import { SummitAnalyticsMetrics } from '../../types/summit';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { getSessionSummary, subscribeTelemetry, exportEventsCSV, recordEvent } from '../../lib/telemetry';
import { db } from '../../lib/firebase';
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, query, where } from 'firebase/firestore';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { SGX_PILLARS } from '../../lib/sgxPillars';

/* Summit telemetry, real numbers only. Every figure comes from Firestore
   (counts) or from this device's own session; nothing is estimated or
   seeded. Counts the rules reserve for the team (registrations, prizes)
   show as "solo admin" to visitors. */

export interface SummitAnalyticsViewProps {
  metrics?: SummitAnalyticsMetrics;
  questions?: any[];
  currentQuestionIndex?: number;
  connectedAudienceCount?: number;
  telemetryStats?: any;
}

interface LiveCounts {
  pilots: number | null;
  chats: number | null;
  votes: number | null;
  checkins: number | null;
  registrations: number | null;
  registrationsDay3: number | null;
  prizes: number | null;
  visits: number | null;
  uniqueVisitors: number | null;
  countries: { code: string; count: number }[];
  pillars: Record<string, number>;
}

const EMPTY: LiveCounts = {
  pilots: null, chats: null, votes: null, checkins: null, registrations: null, registrationsDay3: null,
  prizes: null, visits: null, uniqueVisitors: null, countries: [], pillars: {},
};

async function countOf(q: any): Promise<number | null> {
  try {
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return null; // offline, or reserved for admins by the rules
  }
}

function flagOf(code: string): string {
  const cc = (code || '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '🌐';
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const SummitAnalyticsView: React.FC<SummitAnalyticsViewProps> = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile, leaderboard, setIsProfileModalOpen } = usePilotProfile();
  const [sessionTelemetry, setSessionTelemetry] = useState(() => getSessionSummary());
  const [live, setLive] = useState<LiveCounts>(EMPTY);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    setSessionTelemetry(getSessionSummary());
    return subscribeTelemetry(() => setSessionTelemetry(getSessionSummary()));
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [pilots, chats, votes, checkins, registrations, registrationsDay3, prizes] = await Promise.all([
        countOf(collection(db, 'pilot_leaderboard')),
        countOf(collection(db, 'chat_messages')),
        countOf(collection(db, 'summit_poll_votes')),
        countOf(collection(db, 'summit_checkins')),
        countOf(collection(db, 'ticket_inquiries')),
        countOf(query(collection(db, 'ticket_inquiries'), where('ticketType', '==', 'SHOWCASE_PHYSICAL'))),
        countOf(collection(db, 'redeemed_prizes')),
      ]);

      let visits: number | null = null;
      let uniqueVisitors: number | null = null;
      try {
        const s = await getDoc(doc(db, 'summit_visit_stats', 'global'));
        if (s.exists()) {
          visits = Number(s.data().totalVisits) || 0;
          uniqueVisitors = Number(s.data().uniqueVisitors) || 0;
        } else {
          visits = 0;
          uniqueVisitors = 0;
        }
      } catch { /* keep null */ }

      const byCountry = new Map<string, number>();
      try {
        const regions = await getDocs(query(collection(db, 'summit_visit_regions'), limit(500)));
        regions.forEach((d) => {
          const r = d.data() as any;
          const cc = String(r.country || '').toUpperCase() || '??';
          byCountry.set(cc, (byCountry.get(cc) || 0) + (Number(r.totalVisits) || 0));
        });
      } catch { /* offline */ }

      const pillars: Record<string, number> = {};
      try {
        const stars = await getDocs(query(collection(db, 'summit_constellations'), limit(1000)));
        stars.forEach((d) => {
          const a = (d.data() as any).affinity;
          if (a) pillars[a] = (pillars[a] || 0) + 1;
        });
      } catch { /* offline */ }

      setLive({
        pilots, chats, votes, checkins, registrations, registrationsDay3, prizes, visits, uniqueVisitors,
        countries: Array.from(byCountry.entries()).map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count).slice(0, 6),
        pillars,
      });
      setUpdatedAt(Date.now());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const fmt = (v: number | null, adminOnly = false) =>
    v === null ? (adminOnly ? (es ? 'Solo admin' : 'Admin only') : '—') : v.toLocaleString(es ? 'es-PR' : 'en-US');

  const exportCSV = () => {
    playUiChirp(760);
    const rows: (string | number)[][] = [
      ['Metric', 'Value'],
      ['Active creators', live.pilots ?? ''],
      ['Platform visits', live.visits ?? ''],
      ['Unique visitors', live.uniqueVisitors ?? ''],
      ['Poll votes', live.votes ?? ''],
      ['Chat messages', live.chats ?? ''],
      ['Day 3 check-ins', live.checkins ?? ''],
      ['Registrations', live.registrations ?? ''],
      ['Registrations Day 3', live.registrationsDay3 ?? ''],
      ['Prizes redeemed', live.prizes ?? ''],
      ...SGX_PILLARS.map((p) => [`Creators with ${p.name} affinity`, live.pillars[p.key] || 0]),
      ...live.countries.map((c) => [`Visits from ${c.code}`, c.count]),
      ['Exported at', new Date().toISOString()],
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Spatialgineers_Summit_2026_metrics_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const maxPillar = Math.max(1, ...SGX_PILLARS.map((p) => live.pillars[p.key] || 0));

  const tiles: { icon: React.ElementType; label: string; value: string; note: string; color: string }[] = [
    { icon: Users, label: es ? 'Creadores activos' : 'Active creators', value: fmt(live.pilots), note: es ? 'En el ranking global' : 'On the global ranking', color: '#00DDFF' },
    { icon: Eye, label: es ? 'Visitas a la plataforma' : 'Platform visits', value: fmt(live.visits), note: `${fmt(live.uniqueVisitors)} ${es ? 'visitantes únicos' : 'unique visitors'}`, color: '#FDCC0D' },
    { icon: Vote, label: es ? 'Votos en encuestas' : 'Poll votes', value: fmt(live.votes), note: es ? 'Encuestas del keynote' : 'Keynote polls', color: '#FDCC0D' },
    { icon: MessageSquare, label: es ? 'Mensajes en el chat' : 'Chat messages', value: fmt(live.chats), note: es ? 'Networking del Summit' : 'Summit networking', color: '#00DDFF' },
    { icon: MapPin, label: es ? 'Check-ins Día 3' : 'Day 3 check-ins', value: fmt(live.checkins), note: 'Chroma Space Studios', color: '#B87000' },
    { icon: Ticket, label: es ? 'Inscritos (SGX Pass)' : 'Registrations (SGX Pass)', value: fmt(live.registrations, true), note: live.registrationsDay3 === null ? (es ? 'Visible para el equipo' : 'Visible to the team') : `${fmt(live.registrationsDay3)} ${es ? 'quieren el Día 3' : 'want Day 3'}`, color: '#FFFFFF' },
    { icon: Trophy, label: es ? 'Premios canjeados' : 'Prizes redeemed', value: fmt(live.prizes, true), note: es ? 'Tienda de recompensas' : 'Rewards store', color: '#FDCC0D' },
    { icon: Zap, label: es ? 'Tu progreso' : 'Your progress', value: `${profile.totalXp.toLocaleString()} XP`, note: `${es ? 'Nivel' : 'Level'} ${profile.level} · ${es ? 'récord dron' : 'drone best'} ${profile.droneStats?.highScore || 0}`, color: '#888888' },
  ];

  return (
    <div className="space-y-6">
      <div className="sgx-crystal-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#00DDFF]" />
            <h2 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              {es ? 'Telemetría del Summit' : 'Summit telemetry'}
            </h2>
            <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D]">
              {es ? 'DATOS REALES' : 'REAL DATA'}
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-mono">
            {es
              ? 'Conteos en vivo desde Firestore. Sin estimados ni valores de referencia.'
              : 'Live counts from Firestore. No estimates or placeholder values.'}
            {updatedAt && ` ${es ? 'Actualizado' : 'Updated'} ${new Date(updatedAt).toLocaleTimeString(es ? 'es-PR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playUiChirp(680);
              recordEvent('pillar_explore', 'manual_telemetry_sync', { source: 'SummitAnalyticsView' });
              refresh();
            }}
            className="min-h-[40px] px-3 py-1.5 bg-[#161616] hover:bg-[#32527B] border border-[#00DDFF]/50 text-[#00DDFF] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{es ? 'Actualizar' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={() => { playUiChirp(620); setIsProfileModalOpen(true); }}
            className="min-h-[40px] px-3 py-1.5 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] hover:text-black border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{es ? 'Mi bitácora' : 'My log'} ({profile.totalXp} XP)</span>
          </button>
          <button type="button" onClick={exportCSV} className="min-h-[40px] sgx-btn-cyan px-3.5 py-1.5 text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            <span>{es ? 'Exportar CSV' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.label} className="p-3.5 sgx-crystal-card flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border flex items-center justify-center shrink-0" style={{ borderColor: t.color, color: t.color }}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 uppercase font-mono block">{t.label}</span>
                <span className="text-xl font-extrabold text-white font-mono tabular-nums block truncate">{t.value}</span>
                <span className="text-[11px] block truncate" style={{ color: t.color }}>{t.note}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 sgx-crystal-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00DDFF]" />
              <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                {es ? 'Creadores por pilar de afinidad' : 'Creators by affinity pillar'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{es ? 'Redes' : 'Networks'}</span>
          </div>
          <div className="space-y-3.5">
            {SGX_PILLARS.map((p) => {
              const val = live.pillars[p.key] || 0;
              const pct = Math.round((val / maxPillar) * 100);
              return (
                <div key={p.key} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span className="w-2 h-2 inline-block" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                    <span className="text-slate-300 tabular-nums">{val.toLocaleString()} {es ? 'creadores' : 'creators'}</span>
                  </div>
                  <div className="w-full h-2.5 bg-black/70 border border-[#32527B]/70 overflow-hidden">
                    <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: p.color }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[11px] text-slate-400 block">{es ? 'TU NIVEL' : 'YOUR LEVEL'}</span>
              <strong className="text-[#FDCC0D] text-sm">Nv.{profile.level} ({profile.totalXp} XP)</strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[11px] text-slate-400 block">{es ? 'TIEMPO EN ESTA SESIÓN' : 'TIME THIS SESSION'}</span>
              <strong className="text-[#00DDFF] text-sm tabular-nums">{sessionTelemetry.durationMinutes} min</strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[11px] text-slate-400 block">{es ? 'TRUCOS DE DRON' : 'DRONE TRICKS'}</span>
              <strong className="text-[#B87000] text-sm tabular-nums">{profile.droneStats?.totalTricks || 0}</strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[11px] text-slate-400 block">{es ? 'TU PILAR MÁS VISITADO' : 'YOUR MOST VISITED PILLAR'}</span>
              <strong className="text-white text-sm truncate block">{sessionTelemetry.mostActivePillar}</strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { playUiChirp(740); exportEventsCSV(); }}
            className="text-[11px] text-[#00DDFF] hover:underline flex items-center gap-1 cursor-pointer py-2"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{es ? 'Descargar el registro de esta sesión' : 'Download this session log'} ({sessionTelemetry.totalEvents} {es ? 'eventos' : 'events'})</span>
          </button>
        </div>

        <div className="lg:col-span-5 sgx-crystal-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2.5 gap-2">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#FDCC0D]" />
              <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                {es ? 'Desde dónde nos visitan' : 'Where visitors come from'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">{es ? 'Visitas' : 'Visits'}</span>
          </div>
          <div className="space-y-1.5">
            {!live.countries.length && (
              <p className="text-xs font-mono text-slate-400">{es ? 'Todavía no hay visitas registradas.' : 'No visits recorded yet.'}</p>
            )}
            {live.countries.map((c) => (
              <div key={c.code} className="p-2 bg-[var(--sgx-bg)]/90 border border-[#32527B]/70 flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="text-base" aria-hidden="true">{flagOf(c.code)}</span>
                  <span className="text-white font-bold">{c.code}</span>
                </div>
                <span className="text-[#00DDFF] font-bold tabular-nums">{c.count.toLocaleString()} {es ? 'visitas' : 'visits'}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono gap-2">
              <span className="text-[#FDCC0D] font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{es ? 'Top creadores' : 'Top creators'}</span>
              </span>
              <button type="button" onClick={() => { playUiChirp(640); setIsProfileModalOpen(true); }} className="text-[#00DDFF] hover:underline cursor-pointer py-2">
                {es ? 'Ver ranking completo →' : 'Full ranking →'}
              </button>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {!leaderboard.length && <p className="text-slate-400">{es ? 'El ranking empieza con los primeros creadores.' : 'The ranking starts with the first creators.'}</p>}
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <div key={entry.uid} className="px-2.5 py-1.5 bg-black/60 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#FDCC0D] font-black">#{idx + 1}</span>
                    <span className="text-white font-bold truncate">{entry.nickname}</span>
                    <span className="text-[11px] text-slate-400">Nv.{entry.level}</span>
                  </div>
                  <span className="text-[#00DDFF] font-extrabold tabular-nums">{entry.totalXp.toLocaleString()} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
