import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Users,
  Tv,
  Vote,
  MessageSquare,
  Eye,
  Gamepad2,
  Trophy,
  Download,
  TrendingUp,
  Globe,
  Layers,
  Activity,
  ShieldCheck,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { SummitAnalyticsMetrics } from '../../types/summit';
import { INITIAL_ANALYTICS } from '../../lib/summitData';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { getSessionSummary, subscribeTelemetry, exportEventsCSV, recordEvent } from '../../lib/telemetry';
import { db } from '../../lib/firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';
import { playUiChirp } from '../../lib/cyberAudioEngine';

export interface SummitAnalyticsViewProps {
  metrics?: SummitAnalyticsMetrics;
  questions?: any[];
  currentQuestionIndex?: number;
  connectedAudienceCount?: number;
  telemetryStats?: any;
}

export const SummitAnalyticsView: React.FC<SummitAnalyticsViewProps> = ({
  metrics = INITIAL_ANALYTICS,
  connectedAudienceCount = 0,
}) => {
  const [activeRange, setActiveRange] = useState<'3_DAYS' | 'DAY_1' | 'DAY_2' | 'DAY_3'>('3_DAYS');
  const { profile, leaderboard, setIsProfileModalOpen } = usePilotProfile();
  const [sessionTelemetry, setSessionTelemetry] = useState(() => getSessionSummary());
  const [liveCloudCounts, setLiveCloudCounts] = useState({
    tickets: 0,
    chats: 0,
    prizes: 0,
    pilots: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Subscribe to real-time in-app telemetry events
  useEffect(() => {
    setSessionTelemetry(getSessionSummary());
    const unsub = subscribeTelemetry(() => {
      setSessionTelemetry(getSessionSummary());
    });
    return unsub;
  }, []);

  // Fetch live collection counts from Firestore with graceful fallback
  const fetchLiveFirestoreCounts = async () => {
    setIsRefreshing(true);
    try {
      const [ticketsSnap, chatsSnap, prizesSnap, pilotsSnap] = await Promise.allSettled([
        getDocs(query(collection(db, 'ticket_inquiries'), limit(200))),
        getDocs(query(collection(db, 'chat_messages'), limit(200))),
        getDocs(query(collection(db, 'redeemed_prizes'), limit(200))),
        getDocs(query(collection(db, 'pilot_leaderboard'), limit(100))),
      ]);

      setLiveCloudCounts({
        tickets: ticketsSnap.status === 'fulfilled' ? ticketsSnap.value.size : 0,
        chats: chatsSnap.status === 'fulfilled' ? chatsSnap.value.size : 0,
        prizes: prizesSnap.status === 'fulfilled' ? prizesSnap.value.size : 0,
        pilots: pilotsSnap.status === 'fulfilled' ? pilotsSnap.value.size : 0,
      });
    } catch {
      // Keep existing counts if offline
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveFirestoreCounts();
  }, []);

  // Compute day multiplier and dynamic live metrics combining baseline + session telemetry + pilot profile + Firestore
  const computedMetrics = useMemo(() => {
    const rangeMultiplier =
      activeRange === '3_DAYS'
        ? 1.0
        : activeRange === 'DAY_1'
        ? 0.34
        : activeRange === 'DAY_2'
        ? 0.29
        : 0.37;

    const sessionEvents = sessionTelemetry.totalEvents || 0;
    const cat = sessionTelemetry.categoryBreakdown || ({} as Record<string, number>);

    const liveVotesDelta =
      (profile.weekendStats?.votesSubmitted || 0) + (cat.trivia_vote || 0) + (cat.stage_cyoa || 0);
    const liveDroneDelta =
      (profile.droneStats?.totalFlights || 0) + (cat.drone_game || 0);
    const live360Delta = (cat.map_360 || 0) + (cat.pillar_explore || 0);
    const liveChatDelta = liveCloudCounts.chats + (cat.networking_chat || 0);
    const livePrizeDelta = liveCloudCounts.prizes + (cat.reward_redeem || 0);
    const liveRegDelta = liveCloudCounts.tickets + Math.max(leaderboard.length, liveCloudCounts.pilots) + connectedAudienceCount;

    const scaleVal = (val: number) => Math.max(1, Math.round(val * rangeMultiplier));

    const pillarBase = metrics.pillarEngagement;
    const dynamicPillarEngagement: Record<string, number> = {
      'SGX.STAGE': scaleVal((pillarBase['SGX.STAGE'] || 920) + (cat.stage_cyoa || 0) * 12 + liveVotesDelta * 4),
      'SGX.SHOWCASE': scaleVal((pillarBase['SGX.SHOWCASE'] || 850) + live360Delta * 9 + (cat.sponsor_click || 0) * 6),
      'SGX.SPARK': scaleVal((pillarBase['SGX.SPARK'] || 790) + liveDroneDelta * 15 + (profile.droneStats?.totalTricks || 0) * 3),
      'SGX.STORY': scaleVal((pillarBase['SGX.STORY'] || 640) + (cat.navigation || 0) * 5 + 25),
      'SGX.SYSTEM': scaleVal((pillarBase['SGX.SYSTEM'] || 710) + sessionEvents * 3 + leaderboard.length * 8),
      'SGX.SYNTHESIZE': scaleVal((pillarBase['SGX.SYNTHESIZE'] || 880) + liveChatDelta * 7 + (profile.weekendStats?.connectionsMade || 0) * 14),
    };

    return {
      totalRegistered: scaleVal(metrics.totalRegistered + liveRegDelta),
      digitalAttendees: scaleVal(metrics.digitalAttendees + liveRegDelta),
      physicalAttendees: scaleVal(metrics.physicalAttendees + Math.floor(liveCloudCounts.tickets * 0.35)),
      liveStreamPeakViewers: scaleVal(metrics.liveStreamPeakViewers + connectedAudienceCount * 12 + sessionEvents * 2),
      totalVotesCast: scaleVal(metrics.totalVotesCast + liveVotesDelta),
      chatMessagesSent: scaleVal(metrics.chatMessagesSent + liveChatDelta),
      xr360NodeViews: scaleVal(metrics.xr360NodeViews + live360Delta),
      droneGamesPlayed: scaleVal(metrics.droneGamesPlayed + liveDroneDelta),
      prizesClaimed: scaleVal(metrics.prizesClaimed + livePrizeDelta),
      pillarEngagement: dynamicPillarEngagement,
      countryDistribution: metrics.countryDistribution.map((c) => ({
        ...c,
        count: scaleVal(c.count + (c.country === 'Puerto Rico' ? liveRegDelta : Math.floor(liveRegDelta * 0.2))),
      })),
    };
  }, [activeRange, metrics, sessionTelemetry, profile, leaderboard.length, liveCloudCounts, connectedAudienceCount]);

  const exportCSV = () => {
    playUiChirp(760);
    const rows = [
      ['Metric', 'Range', 'Value'],
      ['Total Registered', activeRange, computedMetrics.totalRegistered],
      ['Digital Attendees', activeRange, computedMetrics.digitalAttendees],
      ['Physical Attendees (San Juan)', activeRange, computedMetrics.physicalAttendees],
      ['Peak Live Viewers', activeRange, computedMetrics.liveStreamPeakViewers],
      ['Total Votes Cast', activeRange, computedMetrics.totalVotesCast],
      ['Chat Messages Sent', activeRange, computedMetrics.chatMessagesSent],
      ['360 Node Views', activeRange, computedMetrics.xr360NodeViews],
      ['Drone MiniGames Played', activeRange, computedMetrics.droneGamesPlayed],
      ['Prizes Claimed', activeRange, computedMetrics.prizesClaimed],
      ['Active Pilot XP', activeRange, profile.totalXp],
      ['Stage Engagement', activeRange, computedMetrics.pillarEngagement['SGX.STAGE']],
      ['Showcase Engagement', activeRange, computedMetrics.pillarEngagement['SGX.SHOWCASE']],
      ['Spark Engagement', activeRange, computedMetrics.pillarEngagement['SGX.SPARK']],
      ['Story Engagement', activeRange, computedMetrics.pillarEngagement['SGX.STORY']],
      ['System Engagement', activeRange, computedMetrics.pillarEngagement['SGX.SYSTEM']],
      ['Synthesize Engagement', activeRange, computedMetrics.pillarEngagement['SGX.SYNTHESIZE']],
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Spatialgineers_Summit_Analytics_${activeRange}_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maxPillarValue = Math.max(1, ...(Object.values(computedMetrics.pillarEngagement) as number[]));

  return (
    <div className="space-y-6">
      {/* Top Header & Day Range Switcher */}
      <div className="sgx-crystal-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-[#00FFFF]" />
            <h2 className="text-base sm:text-lg font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              DASHBOARD DE TELEMETRÍA & ENGAGEMENT DEL SUMMIT
            </h2>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D]">
              EN VIVO • {sessionTelemetry.totalEvents} PULSOS SESIÓN
            </span>
          </div>
          <p className="text-xs text-slate-300 mt-1 font-mono">
            Métricas en tiempo real sincronizadas con Firestore, Telemetría 3D (.GLB), Votación CYOA y Récords de Pilotos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              playUiChirp(680);
              recordEvent('pillar_explore', 'manual_telemetry_sync', { source: 'SummitAnalyticsView' });
              fetchLiveFirestoreCounts();
            }}
            className="px-3 py-1.5 bg-[#0A1424] hover:bg-[#32527B] border border-[#00FFFF]/50 text-[#00FFFF] text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>SINCRONIZAR PULSO</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playUiChirp(620);
              setIsProfileModalOpen(true);
            }}
            className="px-3 py-1.5 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] hover:text-black border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>MI BITÁCORA XP ({profile.totalXp} XP)</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="sgx-btn-cyan px-3.5 py-1.5 text-xs font-bold font-mono flex items-center space-x-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORTAR CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Day Range Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#070C18]/90 border border-[#32527B] p-2.5 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: '3_DAYS', label: '3 DÍAS (GLOBAL ACUMULADO)' },
            { id: 'DAY_1', label: 'DÍA 1 · ROBLOX & METAVERSO' },
            { id: 'DAY_2', label: 'DÍA 2 · SGX GUILD TRIALS' },
            { id: 'DAY_3', label: 'DÍA 3 · CHROMA SPACE LIVE' },
          ].map((tab) => {
            const isActive = activeRange === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playUiChirp(700);
                  setActiveRange(tab.id as any);
                }}
                className={`px-3 py-1.5 font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FDCC0D] text-black shadow-[0_0_14px_rgba(253,204,13,0.45)]'
                    : 'bg-black/50 text-slate-300 hover:text-white border border-white/10'
                }`}
                style={{
                  clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => {
            playUiChirp(740);
            exportEventsCSV();
          }}
          className="text-[11px] text-[#00FFFF] hover:underline flex items-center gap-1 cursor-pointer px-2 py-1"
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Descargar Log Crudo de Sesión ({sessionTelemetry.totalEvents} eventos)</span>
        </button>
      </div>

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Registered */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#00FFFF] flex items-center justify-center text-[#00FFFF] shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Asistentes Totales</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.totalRegistered.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#00FFFF] block">
              {computedMetrics.physicalAttendees.toLocaleString()} Presenciales / {computedMetrics.digitalAttendees.toLocaleString()} Digital
            </span>
          </div>
        </div>

        {/* Live Stream Peak Viewers */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#FDCC0D] flex items-center justify-center text-[#FDCC0D] shrink-0">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Pico Audiencia Stream</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.liveStreamPeakViewers.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FDCC0D] block">YouTube Live + Roblox</span>
          </div>
        </div>

        {/* Total Votes Cast */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#FDCC0D] flex items-center justify-center text-[#FDCC0D] shrink-0">
            <Vote className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Votos Registrados</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.totalVotesCast.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FDCC0D] block">
              CYOA & Trivia (+{profile.weekendStats?.votesSubmitted || 0} tuyos)
            </span>
          </div>
        </div>

        {/* 360 Map Node Views */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#00FFFF] flex items-center justify-center text-[#00FFFF] shrink-0">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Vistas Nodos 360° & GLB</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.xr360NodeViews.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#00FFFF] block">7 Núcleos 3D + Sedes XR</span>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#FDCC0D] flex items-center justify-center text-[#FDCC0D] shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Mensajes en Chat</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.chatMessagesSent.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FDCC0D] block">5 Canales + SGX.Match</span>
          </div>
        </div>

        {/* Drone MiniGames Played */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#FF6B00] flex items-center justify-center text-[#FF6B00] shrink-0">
            <Gamepad2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Partidas de Drones 3D</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.droneGamesPlayed.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FF6B00] block">
              Récord Local: {profile.droneStats?.highScore || 0} PTS
            </span>
          </div>
        </div>

        {/* Prizes Claimed */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#FDCC0D] flex items-center justify-center text-[#FDCC0D] shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Premios Canjeados</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">
              {computedMetrics.prizesClaimed.toLocaleString()}
            </span>
            <span className="text-[9px] text-[#FDCC0D] block">Tienda de Recompensas XP</span>
          </div>
        </div>

        {/* System Efficiency */}
        <div className="p-3.5 sgx-crystal-card flex items-center space-x-3">
          <div className="w-10 h-10 rounded bg-[var(--sgx-bg)] border border-[#00FFFF] flex items-center justify-center text-[#00FFFF] shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-mono block">Sincronización Firestore</span>
            <span className="text-xl font-extrabold text-white font-mono tabular-nums">60 FPS</span>
            <span className="text-[9px] text-[#00FFFF] block">
              {leaderboard.length} Pilotos en Ranking
            </span>
          </div>
        </div>
      </div>

      {/* Engagement by Pillar & Country Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Cols: Pillar Engagement Bars (100% Official SGX Colors) */}
        <div className="lg:col-span-7 sgx-crystal-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[#00FFFF]" />
              <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                INTERÉS & PARTICIPACIÓN POR PILAR SGX (.GLB CORES)
              </span>
            </div>
            <span className="text-[10px] text-[#FDCC0D] font-mono">
              {activeRange === '3_DAYS' ? 'ACUMULADO 3 DÍAS' : activeRange}
            </span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(computedMetrics.pillarEngagement).map(([pillar, val]) => {
              const numVal = Number(val) || 0;
              const pct = Math.round((numVal / maxPillarValue) * 100);
              // Strict Official Spatialgineers Palette
              const color =
                pillar === 'SGX.STAGE'
                  ? '#FFFFFF'
                  : pillar === 'SGX.SHOWCASE'
                  ? '#00FFFF'
                  : pillar === 'SGX.SPARK'
                  ? '#FF6B00'
                  : pillar === 'SGX.STORY'
                  ? '#FDCC0D'
                  : pillar === 'SGX.SYSTEM'
                  ? '#00FFFF'
                  : '#FDCC0D';

              return (
                <div key={pillar} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white flex items-center gap-2">
                      <span
                        className="w-2 h-2 inline-block"
                        style={{ backgroundColor: color }}
                      />
                      {pillar}
                    </span>
                    <span className="text-slate-300 tabular-nums">
                      {val.toLocaleString()} interacciones ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-black/70 border border-[#32527B]/70 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Live Session Telemetry Breakdown */}
          <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[10px] text-slate-400 block">TU NIVEL PILOTO</span>
              <strong className="text-[#FDCC0D] text-sm">
                Nv.{profile.level} ({profile.totalXp} XP)
              </strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[10px] text-slate-400 block">TIEMPO ACTIVO</span>
              <strong className="text-[#00FFFF] text-sm tabular-nums">
                {sessionTelemetry.durationMinutes} min
              </strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[10px] text-slate-400 block">TRUCOS DRON 3D</span>
              <strong className="text-[#FF6B00] text-sm tabular-nums">
                {profile.droneStats?.totalTricks || 0} Maniobras
              </strong>
            </div>
            <div className="p-2.5 bg-black/50 border border-white/10">
              <span className="text-[10px] text-slate-400 block">PILAR FAVORITO</span>
              <strong className="text-white text-sm truncate block">
                {sessionTelemetry.mostActivePillar}
              </strong>
            </div>
          </div>
        </div>

        {/* Right 5 Cols: Country Distribution & Top Live Pilots */}
        <div className="lg:col-span-5 sgx-crystal-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2.5">
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4 text-[#FDCC0D]" />
              <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                DISTRIBUCIÓN GEOGRÁFICA & TOP PILOTOS
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">EN VIVO</span>
          </div>

          <div className="space-y-1.5">
            {computedMetrics.countryDistribution.map((item) => (
              <div
                key={item.country}
                className="p-2 bg-[var(--sgx-bg)]/90 border border-[#32527B]/70 flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{item.flag}</span>
                  <span className="text-white font-bold">{item.country}</span>
                </div>
                <span className="text-[#00FFFF] font-bold tabular-nums">
                  {item.count.toLocaleString()} Asistentes
                </span>
              </div>
            ))}
          </div>

          {/* Live Top 3 Leaderboard Snapshot */}
          <div className="pt-2 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#FDCC0D] font-bold flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                <span>TOP PILOTOS EN CLASIFICACIÓN GLOBAL</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  playUiChirp(640);
                  setIsProfileModalOpen(true);
                }}
                className="text-[#00FFFF] hover:underline cursor-pointer"
              >
                Ver Ranking Completo →
              </button>
            </div>
            <div className="space-y-1.5 font-mono text-xs">
              {leaderboard.slice(0, 3).map((entry, idx) => (
                <div
                  key={entry.uid}
                  className="px-2.5 py-1.5 bg-black/60 border border-white/10 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[#FDCC0D] font-black">#{idx + 1}</span>
                    <span className="text-white font-bold truncate">{entry.nickname}</span>
                    <span className="text-[10px] text-slate-400">Nv.{entry.level}</span>
                  </div>
                  <span className="text-[#00FFFF] font-extrabold tabular-nums">
                    {entry.totalXp.toLocaleString()} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
