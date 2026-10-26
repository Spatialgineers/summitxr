import React, { useState } from 'react';
import { 
  X, 
  Trophy, 
  Award, 
  Flame, 
  Zap, 
  Calendar, 
  Sparkles, 
  Clock, 
  User, 
  Edit2, 
  Check, 
  ChevronRight, 
  TrendingUp, 
  Gamepad2, 
  Layers, 
  Activity, 
  ShieldCheck, 
  Star, 
  Wind, 
  Radio, 
  Compass, 
  RefreshCw,
  Users
} from 'lucide-react';
import { usePilotProfile, calculateRankAndLevel } from '../../context/PilotProfileContext';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { WeekendActivityCategory } from '../../types/pilot';

interface PilotProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDroneGame?: () => void;
  onOpenMatchmaking?: () => void;
}

export const PilotProfileModal: React.FC<PilotProfileModalProps> = ({
  isOpen,
  onClose,
  onOpenDroneGame,
  onOpenMatchmaking,
}) => {
  const { 
    profile, 
    leaderboard, 
    updateProfileName, 
    updateAvatar, 
    claimAchievement,
    refreshLeaderboard 
  } = usePilotProfile();
  const { tenant } = useTenantTheme();

  const [activeTab, setActiveTab] = useState<'breakdown' | 'dron' | 'leaderboard' | 'achievements'>('breakdown');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNickname, setEditNickname] = useState(profile.nickname);
  const [editCallsign, setEditCallsign] = useState(profile.callsign || 'SGX-01');

  if (!isOpen) return null;

  const b = tenant.branding;
  const primaryRgb = hexToRgbStr(b.primaryColor);

  const { level, rankTitle, nextLevelXp, currentLevelBaseXp } = calculateRankAndLevel(profile.totalXp);
  const xpInCurrentLevel = profile.totalXp - currentLevelBaseXp;
  const xpNeededForNext = nextLevelXp - currentLevelBaseXp;
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / xpNeededForNext) * 100)));

  const handleSaveName = () => {
    updateProfileName(editNickname, editCallsign);
    setIsEditingName(false);
  };

  // Filter activities
  const filteredActivities = profile.weekendActivity.filter(item => {
    if (selectedDayFilter !== 'all' && item.day !== selectedDayFilter) return false;
    if (selectedCategoryFilter === 'dron' && !item.category.includes('drone')) return false;
    if (selectedCategoryFilter === 'match' && !item.category.includes('match')) return false;
    if (selectedCategoryFilter === 'keynote' && !item.category.includes('keynote')) return false;
    if (selectedCategoryFilter === 'stage' && !item.category.includes('stage')) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-4xl bg-[#0E0E0E] border rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-all"
        style={{
          borderColor: `rgba(${primaryRgb}, 0.35)`,
          boxShadow: `0 25px 70px rgba(0, 0, 0, 0.9), 0 0 35px rgba(${primaryRgb}, 0.15)`
        }}
      >
        {/* Top Header with Pilot Badge & XP Level */}
        <div 
          className="p-4 sm:p-6 border-b flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{ 
            borderColor: `rgba(${primaryRgb}, 0.15)`,
            background: `linear-gradient(180deg, rgba(${primaryRgb}, 0.12) 0%, rgba(9, 13, 20, 0.95) 100%)`
          }}
        >
          {/* Avatar & Callsign */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div 
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center font-mono font-bold text-xl sm:text-2xl border shadow-lg"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.15)`,
                borderColor: b.primaryColor,
                color: b.primaryColor,
                boxShadow: `0 0 20px rgba(${primaryRgb}, 0.3)`
              }}
            >
              🧑‍🚀
              <div 
                className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold border bg-black text-white"
                style={{ borderColor: b.primaryColor }}
              >
                NVL {level}
              </div>
            </div>

            <div className="flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editNickname}
                    onChange={(e) => setEditNickname(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-bold text-sm w-36"
                    placeholder="Nickname"
                  />
                  <input
                    type="text"
                    value={editCallsign}
                    onChange={(e) => setEditCallsign(e.target.value)}
                    className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-mono text-xs w-20"
                    placeholder="Callsign"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-500"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                    {profile.nickname}
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                    {profile.callsign || 'SGX-01'}
                  </span>
                  <button
                    onClick={() => { setIsEditingName(true); setEditNickname(profile.nickname); setEditCallsign(profile.callsign || 'SGX-01'); }}
                    className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 transition"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2 mt-1">
                <span 
                  className="text-xs font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded border"
                  style={{
                    color: b.primaryColor,
                    borderColor: `rgba(${primaryRgb}, 0.35)`,
                    backgroundColor: `rgba(${primaryRgb}, 0.1)`,
                  }}
                >
                  {rankTitle}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {profile.totalXp} XP Acumulados
                </span>
              </div>
            </div>
          </div>

          {/* XP Progress Bar & Close */}
          <div className="flex items-center gap-4 w-full md:w-72 justify-between md:justify-end">
            <div className="flex-1 max-w-[200px]">
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Progreso Nivel {level}</span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${progressPercent}%`,
                    backgroundColor: b.primaryColor,
                    boxShadow: `0 0 10px rgba(${primaryRgb}, 0.8)`
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-500 text-right mt-0.5 font-mono">
                {xpInCurrentLevel} / {xpNeededForNext} XP
              </div>
            </div>

            <button
              onClick={() => { playUiChirp(330); onClose(); }}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div 
          className="flex border-b overflow-x-auto px-4 sm:px-6 bg-slate-950/60"
          style={{ borderColor: `rgba(${primaryRgb}, 0.15)` }}
        >
          <button
            onClick={() => { playUiChirp(440); setActiveTab('breakdown'); }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'breakdown'
                ? 'text-white border-cyan-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
            style={{
              borderColor: activeTab === 'breakdown' ? b.primaryColor : 'transparent',
              color: activeTab === 'breakdown' ? b.primaryColor : undefined
            }}
          >
            <Activity className="w-4 h-4" />
            Desglose Fin de Semana
          </button>

          <button
            onClick={() => { playUiChirp(440); setActiveTab('dron'); }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'dron'
                ? 'text-white border-cyan-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
            style={{
              borderColor: activeTab === 'dron' ? b.primaryColor : 'transparent',
              color: activeTab === 'dron' ? b.primaryColor : undefined
            }}
          >
            <Wind className="w-4 h-4" />
            Telemetría de Dron ({profile.droneStats.totalTricks} Trucos)
          </button>

          <button
            onClick={() => { playUiChirp(440); setActiveTab('leaderboard'); }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'leaderboard'
                ? 'text-white border-cyan-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
            style={{
              borderColor: activeTab === 'leaderboard' ? b.primaryColor : 'transparent',
              color: activeTab === 'leaderboard' ? b.primaryColor : undefined
            }}
          >
            <Trophy className="w-4 h-4" />
            Leaderboard Global
          </button>

          <button
            onClick={() => { playUiChirp(440); setActiveTab('achievements'); }}
            className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 whitespace-nowrap transition-all ${
              activeTab === 'achievements'
                ? 'text-white border-cyan-400'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
            style={{
              borderColor: activeTab === 'achievements' ? b.primaryColor : 'transparent',
              color: activeTab === 'achievements' ? b.primaryColor : undefined
            }}
          >
            <Award className="w-4 h-4" />
            Logros & Medallas
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: WEEKEND BREAKDOWN */}
          {activeTab === 'breakdown' && (
            <div className="space-y-5">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase">Interacciones</div>
                  <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                    {profile.weekendStats.totalInteractions}
                  </div>
                  <div className="text-[10px] text-cyan-400 font-mono mt-0.5">Actividades registradas</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase">Trucos Aéreos</div>
                  <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-0.5">
                    {profile.droneStats.totalTricks}
                  </div>
                  <div className="text-[10px] text-amber-300/80 font-mono mt-0.5">Maniobras exitosas</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase">Matches & Red</div>
                  <div className="text-xl sm:text-2xl font-bold text-orange-400 mt-0.5">
                    {profile.weekendStats.connectionsMade}
                  </div>
                  <div className="text-[10px] text-orange-300/80 font-mono mt-0.5">Conexiones summit</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-mono uppercase">Votos / CYOA</div>
                  <div className="text-xl sm:text-2xl font-bold text-sky-400 mt-0.5">
                    {profile.weekendStats.votesSubmitted}
                  </div>
                  <div className="text-[10px] text-sky-300/80 font-mono mt-0.5">Decisiones en vivo</div>
                </div>
              </div>

              {/* Filters for Activity Feed */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                {/* Day Filter */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400 mr-1">Día:</span>
                  {['all', 'Viernes', 'Sábado', 'Domingo'].map(day => (
                    <button
                      key={day}
                      onClick={() => { playUiChirp(520); setSelectedDayFilter(day); }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                        selectedDayFilter === day
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {day === 'all' ? 'Todos' : day}
                    </button>
                  ))}
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-slate-400 mr-1">Tipo:</span>
                  {[
                    { id: 'all', label: 'Todo' },
                    { id: 'dron', label: 'Drones' },
                    { id: 'match', label: 'Matchmaking' },
                    { id: 'keynote', label: 'Keynotes' },
                    { id: 'stage', label: 'Stage 3D' }
                  ].map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { playUiChirp(520); setSelectedCategoryFilter(cat.id); }}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition ${
                        selectedCategoryFilter === cat.id
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Timeline Feed */}
              <div className="space-y-2.5">
                {filteredActivities.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-slate-400 text-sm">
                    No hay actividades registradas con estos filtros todavía. ¡Explora el summit y haz trucos para llenar tu bitácora!
                  </div>
                ) : (
                  filteredActivities.map((act) => (
                    <div 
                      key={act.id}
                      className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 border"
                          style={{
                            backgroundColor: `${act.highlightColor || '#00DDFF'}15`,
                            borderColor: `${act.highlightColor || '#00DDFF'}40`,
                            color: act.highlightColor || '#00DDFF',
                          }}
                        >
                          {act.category.includes('drone') ? '🚁' : act.category.includes('match') ? '🤝' : act.category.includes('stage') ? '🎭' : '✨'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{act.title}</h4>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                              {act.day}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            {act.details}
                          </p>
                          <div className="text-[10px] text-slate-500 font-mono mt-1">
                            {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div 
                        className="px-2.5 py-1 rounded-lg font-mono text-xs font-bold border shrink-0 text-right"
                        style={{
                          backgroundColor: `${act.highlightColor || '#00DDFF'}15`,
                          borderColor: `${act.highlightColor || '#00DDFF'}40`,
                          color: act.highlightColor || '#00DDFF',
                        }}
                      >
                        +{act.xpEarned} XP
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DRONE TELEMETRY & TRICKS */}
          {activeTab === 'dron' && (
            <div className="space-y-5">
              {/* Drone Highlights Banner */}
              <div 
                className="p-4 sm:p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                style={{
                  background: `linear-gradient(135deg, rgba(${primaryRgb}, 0.15) 0%, rgba(15, 23, 42, 0.8) 100%)`,
                  borderColor: `rgba(${primaryRgb}, 0.35)`
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      TELEMETRÍA AÉREA ACTIVA
                    </span>
                    <span className="text-xs text-slate-300 font-mono">
                      Chassis: {profile.droneStats.favoriteChassis}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">
                    Simulador & Maniobras de Dron
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Cada truco que ejecutas en vuelo otorga XP instantáneo y desbloquea medallas de piloto.
                  </p>
                </div>

                {onOpenDroneGame && (
                  <button
                    onClick={() => { onClose(); onOpenDroneGame(); }}
                    className="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-black flex items-center gap-2 shadow-lg hover:scale-105 transition"
                    style={{ backgroundColor: b.primaryColor }}
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Jugar Simulador
                  </button>
                )}
              </div>

              {/* Tricks Breakdown Cards */}
              <div className="space-y-2">
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  Desglose de Trucos Ejecutados
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Barrel Roll 360°', count: profile.droneStats.tricksBreakdown.barrelRoll, key: 'Q / Tecla', xp: '+40 XP', color: '#00DDFF' },
                    { label: 'Salto Vertical 360°', count: profile.droneStats.tricksBreakdown.flip360, key: 'E / Tecla', xp: '+50 XP', color: '#FFFFFF' },
                    { label: 'Hyper Dash Turbo', count: profile.droneStats.tricksBreakdown.speedDash, key: 'Space / Shift', xp: '+30 XP', color: '#FDCC0D' },
                    { label: 'Hover de Precisión', count: profile.droneStats.tricksBreakdown.precisionHover, key: 'Z / Tecla', xp: '+45 XP', color: '#38BDF8' },
                    { label: 'Pulso EMP Cuántico', count: profile.droneStats.tricksBreakdown.empPulse, key: 'X / Tecla', xp: '+60 XP', color: '#FFBB00' },
                  ].map((trick, i) => (
                    <div 
                      key={i}
                      className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-white">{trick.label}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{trick.key}</div>
                        <div className="text-[10px] font-mono font-bold mt-1" style={{ color: trick.color }}>
                          {trick.xp}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-bold font-mono text-white">
                          {trick.count}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">ejecutados</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Drone Lifetime Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Récord de Puntaje</div>
                  <div className="text-lg sm:text-xl font-bold text-cyan-400 font-mono mt-0.5">
                    {profile.droneStats.highScore} pts
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Paquetes Entregados</div>
                  <div className="text-lg sm:text-xl font-bold text-amber-400 font-mono mt-0.5">
                    {profile.droneStats.packagesDelivered}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Total Vuelos</div>
                  <div className="text-lg sm:text-xl font-bold text-sky-400 font-mono mt-0.5">
                    {profile.droneStats.totalFlights}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GLOBAL LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Tabla de Posiciones en Tiempo Real</h3>
                  <p className="text-xs text-slate-400">Sincronizado vía Firestore con todos los asistentes del summit.</p>
                </div>
                <button
                  onClick={() => { playUiChirp(520); refreshLeaderboard(); }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Actualizar
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 font-mono text-slate-400">
                      <th className="p-3">Rank</th>
                      <th className="p-3">Piloto</th>
                      <th className="p-3">Rango</th>
                      <th className="p-3 text-center">Nivel</th>
                      <th className="p-3 text-right">Dron Score</th>
                      <th className="p-3 text-right">Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {leaderboard.length === 0 ? (
                      // Local preview when leaderboard is populating
                      <tr className="bg-cyan-950/20 text-white">
                        <td className="p-3 font-bold text-cyan-400">#1</td>
                        <td className="p-3 flex items-center gap-2">
                          <span>🧑‍🚀</span>
                          <span className="font-bold">{profile.nickname} (Tú)</span>
                        </td>
                        <td className="p-3 text-slate-300">{profile.rankTitle}</td>
                        <td className="p-3 text-center text-cyan-300 font-bold">Nv {profile.level}</td>
                        <td className="p-3 text-right text-amber-400">{profile.droneStats.highScore}</td>
                        <td className="p-3 text-right font-bold text-cyan-400">{profile.totalXp} XP</td>
                      </tr>
                    ) : (
                      leaderboard.map((entry, idx) => {
                        const isMe = entry.uid === profile.uid;
                        return (
                          <tr 
                            key={entry.uid || idx}
                            className={`transition ${isMe ? 'bg-cyan-950/30 text-white font-semibold' : 'text-slate-300 hover:bg-slate-900/50'}`}
                          >
                            <td className="p-3 font-bold">
                              {idx === 0 ? '🥇 #1' : idx === 1 ? '🥈 #2' : idx === 2 ? '🥉 #3' : `#${idx + 1}`}
                            </td>
                            <td className="p-3 flex items-center gap-2">
                              <span>🧑‍🚀</span>
                              <span>{entry.nickname} {isMe && '(Tú)'}</span>
                            </td>
                            <td className="p-3 text-slate-400">{entry.rankTitle}</td>
                            <td className="p-3 text-center text-cyan-400">Nv {entry.level}</td>
                            <td className="p-3 text-right text-amber-400">{entry.droneHighScore || 0}</td>
                            <td className="p-3 text-right font-bold text-cyan-300">{entry.totalXp} XP</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: ACHIEVEMENTS */}
          {activeTab === 'achievements' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">Logros del Piloto</h3>
                <span className="text-xs text-slate-400 font-mono">
                  {profile.achievements.filter(a => a.unlocked).length} de {profile.achievements.length} Desbloqueados
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {profile.achievements.map((ach) => (
                  <div 
                    key={ach.id}
                    className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                      ach.unlocked 
                        ? 'bg-slate-900/90 border-slate-700' 
                        : 'bg-slate-950/60 border-slate-800/80 opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl p-2 rounded-xl bg-slate-800 border border-slate-700 shrink-0">
                        {ach.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{ach.title}</h4>
                        <p className="text-xs text-slate-300 mt-0.5">{ach.description}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-slate-800 flex items-center justify-between">
                      <div className="text-[11px] font-mono text-slate-400">
                        Progreso: {ach.progress} / {ach.maxProgress}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400">
                          +{ach.xpReward} XP
                        </span>
                        {ach.unlocked ? (
                          <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500 text-cyan-300 text-[10px] font-mono font-bold">
                            COMPLETADO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-500 text-[10px] font-mono">
                            BLOQUEADO
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
