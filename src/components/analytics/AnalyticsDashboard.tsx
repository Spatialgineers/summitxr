import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Question, VoteSummary } from '../../types/engine';
import {
  Trophy,
  Users,
  Zap,
  Flame,
  Download,
  GitBranch,
  Activity,
  Globe,
  ShieldCheck,
  Gamepad2,
} from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { getSessionSummary, subscribeTelemetry, exportEventsCSV } from '../../lib/telemetry';
import { SummitAnalyticsView } from './SummitAnalyticsView';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface AnalyticsDashboardProps {
  tenantId: string;
  eventId: string;
  users: UserProfile[];
  questions: Question[];
  voteSummary?: VoteSummary | null;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  tenantId,
  eventId,
  users,
  questions,
  voteSummary,
}) => {
  const [activeTab, setActiveTab] = useState<'SUMMIT_GLOBAL' | 'LEADERBOARD' | 'CYOA_TREE' | 'TELEMETRY'>('SUMMIT_GLOBAL');
  const { profile, leaderboard, setIsProfileModalOpen } = usePilotProfile();
  const [sessionTelemetry, setSessionTelemetry] = useState(() => getSessionSummary());

  useEffect(() => {
    setSessionTelemetry(getSessionSummary());
    const unsub = subscribeTelemetry(() => {
      setSessionTelemetry(getSessionSummary());
    });
    return unsub;
  }, []);

  // Merge stage users with global Pilot Leaderboard so rankings are always populated and live
  const mergedUsers: UserProfile[] = useMemo(() => {
    const byId = new Map<string, UserProfile>();
    users.forEach((u) => byId.set(u.id, u));

    leaderboard.forEach((entry) => {
      if (!byId.has(entry.uid)) {
        byId.set(entry.uid, {
          id: entry.uid,
          nickname: entry.nickname,
          avatar: '🧑‍🚀',
          avatarSeed: entry.uid,
          tenantId: 'spatialgineers',
          eventId: 'summit-2026',
          totalScore: entry.totalXp,
          score: entry.totalXp,
          // Only what the leaderboard really records; the rest is unknown (0).
          accuracyRate: 0,
          multiplier: 1,
          currentStreak: 0,
          highestStreak: 0,
          totalInteractions: entry.votesCount + entry.connectionsCount + entry.totalTricks,
          activeSeconds: 0,
          prizeTier: entry.level >= 6 ? 'GOLD' : entry.level >= 3 ? 'SILVER' : 'BRONZE',
          unlockedPrizeIds: [],
          choiceHistory: [],
          joinedAt: entry.updatedAt,
        });
      }
    });

    // Always ensure the active pilot is included
    if (!byId.has(profile.uid)) {
      byId.set(profile.uid, {
        id: profile.uid,
        nickname: `${profile.nickname} (Tú)`,
        avatar: '🧑‍🚀',
        avatarSeed: profile.uid,
        tenantId: 'spatialgineers',
        eventId: 'summit-2026',
        totalScore: profile.totalXp,
        score: profile.totalXp,
        accuracyRate: 0,
        multiplier: 1,
        currentStreak: 0,
        highestStreak: 0,
        totalInteractions: profile.weekendStats.totalInteractions,
        activeSeconds: 0,
        prizeTier: profile.level >= 6 ? 'GOLD' : profile.level >= 3 ? 'SILVER' : 'BRONZE',
        unlockedPrizeIds: [],
        choiceHistory: [],
        joinedAt: Date.now(),
      });
    }

    return Array.from(byId.values()).sort((a, b) => b.totalScore - a.totalScore);
  }, [users, leaderboard, profile]);

  const totalInteractions =
    mergedUsers.reduce((acc, u) => acc + u.totalInteractions, 0) + sessionTelemetry.totalEvents;
  const avgScore =
    mergedUsers.length > 0
      ? Math.round(mergedUsers.reduce((acc, u) => acc + u.totalScore, 0) / mergedUsers.length)
      : 0;
  const topStreak = mergedUsers.reduce((max, u) => Math.max(max, u.highestStreak), 0);

  const handleExportJSON = () => {
    playUiChirp(760);
    const data = {
      tenantId,
      eventId,
      exportedAt: new Date().toISOString(),
      metrics: {
        totalAudience: mergedUsers.length,
        totalInteractions,
        avgScore,
        topStreak,
        sessionTelemetry,
      },
      leaderboard: mergedUsers,
      questions,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgx_analytics_${tenantId}_${eventId}.json`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[var(--sgx-bg)] text-slate-100 p-4 md:p-8 font-['Orbitron',sans-serif]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Banner */}
        <div className="sgx-crystal-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl">
          <div>
            <div className="flex items-center space-x-2 text-[10px] font-mono text-[#00DDFF] uppercase">
              <span>REAL-TIME SUMMIT ANALYTICS & TELEMETRY</span>
              <span>•</span>
              <span>TENANT: {tenantId}</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wider mt-1 uppercase">
              Centro de Telemetría Espacial, Ranking XP & Métricas del Summit
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                playUiChirp(620);
                setIsProfileModalOpen(true);
              }}
              className="px-3.5 py-2 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] hover:text-black border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold flex items-center space-x-2 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>MI BITÁCORA XP (NV.{profile.level})</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              className="sgx-btn flex items-center space-x-2 py-2 px-3.5 text-xs font-mono font-bold cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>EXPORT DATA (.JSON)</span>
            </button>
          </div>
        </div>

        {/* Metric Cards Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sgx-crystal-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">CREADORES EN RANKING</span>
              <Users className="w-4 h-4 text-[#00DDFF]" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-white mt-1.5 tabular-nums">
              {mergedUsers.length}
            </div>
            <span className="text-[10px] text-[#FDCC0D] font-mono mt-1 block">
              Sincronizado con Firestore
            </span>
          </div>

          <div className="sgx-crystal-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">INTERACCIONES EN VIVO</span>
              <Zap className="w-4 h-4 text-[#FDCC0D]" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#FDCC0D] mt-1.5 tabular-nums">
              {totalInteractions.toLocaleString()}
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-1 block">
              +{sessionTelemetry.totalEvents} eventos en tu sesión
            </span>
          </div>

          <div className="sgx-crystal-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">PROMEDIO DE XP</span>
              <Trophy className="w-4 h-4 text-[#00DDFF]" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-white mt-1.5 tabular-nums">
              {avgScore.toLocaleString()} <span className="text-xs text-slate-400">XP</span>
            </div>
            <span className="text-[10px] text-[#00DDFF] font-mono mt-1 block">
              Tu XP actual: {profile.totalXp.toLocaleString()} XP
            </span>
          </div>

          <div className="sgx-crystal-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">RÉCORD DRON 3D</span>
              <Gamepad2 className="w-4 h-4 text-[#FFBB00]" />
            </div>
            <div className="text-xl md:text-2xl font-bold font-mono text-[#FFBB00] mt-1.5 tabular-nums">
              {Math.max(profile.droneStats.highScore, ...(leaderboard.map((l) => l.droneHighScore || 0))).toLocaleString()} PTS
            </div>
            <span className="text-[10px] text-[#FDCC0D] font-mono mt-1 block">
              Racha Máxima: {topStreak ? `x${topStreak}` : "—"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs for Analytics View */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--sgx-secondary)] pb-2">
          {[
            { id: 'SUMMIT_GLOBAL', label: 'SUMMIT 3-DAY ANALYTICS', icon: Globe },
            { id: 'LEADERBOARD', label: 'CREATOR & AUDIENCE LEADERBOARD', icon: Trophy },
            { id: 'CYOA_TREE', label: 'CYOA DECISION GRAPH', icon: GitBranch },
            { id: 'TELEMETRY', label: 'LIVE SESSION TELEMETRY', icon: Activity },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  playUiChirp(680);
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-mono font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#FDCC0D] text-black shadow-md'
                    : 'text-slate-300 hover:text-white bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60'
                }`}
                style={{
                  clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                }}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab 0: Unified Summit 3-Day Analytics */}
        {activeTab === 'SUMMIT_GLOBAL' && (
          <SummitAnalyticsView
            questions={questions}
            connectedAudienceCount={mergedUsers.length}
          />
        )}

        {/* Tab 1: Leaderboard */}
        {activeTab === 'LEADERBOARD' && (
          <div className="sgx-crystal-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Clasificación Global de Pilotos & Participantes en Vivo
              </h3>
              <span className="text-[10px] font-mono text-[#00DDFF]">
                {mergedUsers.length} PILOTOS CLASIFICADOS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[var(--sgx-secondary)] text-slate-400 text-[10px] uppercase">
                    <th className="py-2.5 px-3">Rank</th>
                    <th className="py-2.5 px-3">Participant</th>
                    <th className="py-2.5 px-3">Prize Tier</th>
                    <th className="py-2.5 px-3">Interactions</th>
                    <th className="py-2.5 px-3">Highest Streak</th>
                    <th className="py-2.5 px-3 text-right">Total XP / Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--sgx-secondary)]/40">
                  {mergedUsers.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-[var(--sgx-secondary)]/15 transition-colors">
                      <td className="py-3 px-3">
                        <span
                          className={`font-bold ${
                            idx === 0
                              ? 'text-[#FDCC0D]'
                              : idx === 1
                              ? 'text-[#00DDFF]'
                              : idx === 2
                              ? 'text-[#FFBB00]'
                              : 'text-slate-400'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold text-white flex items-center space-x-2">
                        <span>{user.avatar}</span>
                        <span>{user.nickname}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-2 py-0.5 text-[9px] text-[#00DDFF] uppercase">
                          {user.prizeTier}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-300 tabular-nums">{user.totalInteractions}</td>
                      <td className="py-3 px-3 text-[#FDCC0D] tabular-nums">{user.highestStreak ? `x${user.highestStreak}` : "—"}</td>
                      <td className="py-3 px-3 text-right font-extrabold text-[#FDCC0D] text-sm tabular-nums">
                        {user.totalScore.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: CYOA Decision Graph */}
        {activeTab === 'CYOA_TREE' && (
          <div className="sgx-crystal-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Event Narrative Tree & Audience Choice Distribution
              </h3>
              <span className="text-[10px] font-mono text-[#00DDFF]">
                {questions.length} SCENARIO NODES
              </span>
            </div>

            <div className="space-y-4">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]"
                  style={{
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
                    <span className="text-[#FDCC0D] font-bold">
                      NODE {idx + 1}: {q.category}
                    </span>
                    <span>Duration: {q.durationSeconds}s</span>
                  </div>
                  <h4 className="text-sm font-bold text-white mb-3">{q.prompt}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {q.options.map((opt) => {
                      const votesForOpt = voteSummary?.counts?.[opt.id] || 0;
                      const pctForOpt = voteSummary?.percentages?.[opt.id] || 0;
                      return (
                        <div
                          key={opt.id}
                          className="p-2.5 bg-[#121212] border border-[var(--sgx-secondary)]/60 text-xs font-mono space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[#00DDFF] font-bold text-[11px]">
                            <span>{opt.label.split(':')[0]}</span>
                            <span className="text-[9px] text-[#FDCC0D]">{opt.presetId}</span>
                          </div>
                          <p className="text-[10px] text-slate-300 font-sans line-clamp-1">
                            {opt.label.split(':')[1] || opt.label}
                          </p>
                          {voteSummary && voteSummary.questionId === q.id && (
                            <div className="pt-1">
                              <div className="flex justify-between text-[9px] text-slate-400">
                                <span>{votesForOpt} votos</span>
                                <span>{pctForOpt}%</span>
                              </div>
                              <div className="w-full h-1.5 bg-black mt-0.5">
                                <div
                                  className="h-full bg-[#FDCC0D]"
                                  style={{ width: `${pctForOpt}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Live Session Telemetry */}
        {activeTab === 'TELEMETRY' && (
          <div className="sgx-crystal-card p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--sgx-secondary)] pb-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Diagnóstico de Telemetría en Tiempo Real & Eventos de Sesión
              </h3>
              <button
                type="button"
                onClick={exportEventsCSV}
                className="px-3 py-1 bg-[#00DDFF] text-black font-mono text-[10px] font-extrabold cursor-pointer"
              >
                EXPORTAR EVENTOS CSV ({sessionTelemetry.totalEvents})
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
              <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]">
                <span className="text-slate-400 text-[10px] uppercase block">ID de Sesión Anónima</span>
                <span className="text-xs font-bold text-[#FDCC0D] mt-1 block truncate">
                  {sessionTelemetry.sessionId}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Cumplimiento Leyes PR</span>
              </div>
              <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]">
                <span className="text-slate-400 text-[10px] uppercase block">Eventos Capturados</span>
                <span className="text-base font-bold text-[#00DDFF] mt-1 block tabular-nums">
                  {sessionTelemetry.totalEvents} Pulsos
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Sincronizados en vivo</span>
              </div>
              <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]">
                <span className="text-slate-400 text-[10px] uppercase block">Pilar Más Activo</span>
                <span className="text-base font-bold text-[#FDCC0D] mt-1 block">
                  {sessionTelemetry.mostActivePillar}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Frecuencia de acoplamiento</span>
              </div>
            </div>

            {/* Category Breakdown Table */}
            <div className="pt-2">
              <h4 className="text-[11px] font-mono font-bold text-slate-300 uppercase mb-2">
                Desglose por Categoría de Interacción en esta Sesión:
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 font-mono text-xs">
                {Object.entries(sessionTelemetry.categoryBreakdown).map(([catKey, count]) => (
                  <div
                    key={catKey}
                    className="p-2.5 bg-black/50 border border-white/10 flex items-center justify-between"
                  >
                    <span className="text-slate-300 text-[11px]">{catKey}</span>
                    <strong className="text-[#FDCC0D] tabular-nums">{count}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
