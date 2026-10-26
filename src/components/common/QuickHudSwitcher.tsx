import React from 'react';
import { 
  Compass, 
  Layers, 
  Gamepad2, 
  Users, 
  Wind, 
  Sparkles, 
  Trophy, 
  Activity,
  ChevronDown
} from 'lucide-react';
import { usePilotProfile, calculateRankAndLevel } from '../../context/PilotProfileContext';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

export type MainAppView = 'summit' | 'stage' | 'play' | 'matchmaking';

interface QuickHudSwitcherProps {
  currentView: MainAppView;
  onSelectView: (view: MainAppView) => void;
  onOpenDroneGame: () => void;
  onOpenTour: () => void;
}

export const QuickHudSwitcher: React.FC<QuickHudSwitcherProps> = ({
  currentView,
  onSelectView,
  onOpenDroneGame,
  onOpenTour
}) => {
  const { profile, setIsProfileModalOpen } = usePilotProfile();
  const { tenant } = useTenantTheme();

  const b = tenant.branding;
  const primaryRgb = hexToRgbStr(b.primaryColor);
  const { level } = calculateRankAndLevel(profile.totalXp);

  return (
    <div className="fixed top-2.5 sm:top-4 inset-x-0 z-[80] flex justify-center px-2 pointer-events-none">
      <div 
        className="pointer-events-auto flex items-center justify-between gap-1.5 sm:gap-3 p-1.5 sm:p-2 bg-[#0D0D0D]/90 backdrop-blur-md border rounded-2xl sm:rounded-full shadow-2xl max-w-full overflow-x-auto transition-all"
        style={{
          borderColor: `rgba(${primaryRgb}, 0.35)`,
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(${primaryRgb}, 0.15)`
        }}
      >
        {/* Hub View Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Summit Hub */}
          <button
            onClick={() => { playUiChirp(440); onSelectView('summit'); }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'summit'
                ? 'text-black shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{
              backgroundColor: currentView === 'summit' ? b.primaryColor : 'transparent',
            }}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Summit Hub</span>
          </button>

          {/* 3D CYOA Stage */}
          <button
            onClick={() => { playUiChirp(440); onSelectView('stage'); }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'stage'
                ? 'text-black shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{
              backgroundColor: currentView === 'stage' ? b.primaryColor : 'transparent',
            }}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Escenario 3D</span>
          </button>

          {/* Live Play Console */}
          <button
            onClick={() => { playUiChirp(440); onSelectView('play'); }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'play'
                ? 'text-black shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{
              backgroundColor: currentView === 'play' ? b.primaryColor : 'transparent',
            }}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Votación Live</span>
            <span className="sm:hidden">Play</span>
          </button>

          {/* Matchmaking */}
          <button
            onClick={() => { playUiChirp(440); onSelectView('matchmaking'); }}
            className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all ${
              currentView === 'matchmaking'
                ? 'text-black shadow-md scale-105'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
            style={{
              backgroundColor: currentView === 'matchmaking' ? b.primaryColor : 'transparent',
            }}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Matchmaking</span>
            <span className="md:hidden">Match</span>
          </button>

          {/* Drone Arena Quick Launcher */}
          <button
            onClick={() => { playUiChirp(520); onOpenDroneGame(); }}
            className="px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1.5 text-amber-300 bg-amber-950/40 border border-amber-500/40 hover:bg-amber-900/60 transition"
          >
            <Wind className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">Dron & Trucos</span>
            <span className="lg:hidden">Dron</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-slate-800 shrink-0" />

        {/* Pilot Profile & XP Pill (Click to open Weekend Breakdown) */}
        <button
          onClick={() => { playUiChirp(620); setIsProfileModalOpen(true); }}
          className="flex items-center gap-2 px-2.5 py-1 sm:py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 hover:border-cyan-400 transition-all text-left group shrink-0"
          style={{
            boxShadow: `0 0 10px rgba(${primaryRgb}, 0.15)`
          }}
          title="Abrir Perfil de Piloto & Desglose del Fin de Semana"
        >
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border"
            style={{
              borderColor: b.primaryColor,
              backgroundColor: `rgba(${primaryRgb}, 0.2)`
            }}
          >
            🧑‍🚀
          </div>

          <div className="flex flex-col leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-white group-hover:text-cyan-300 transition">
                {profile.nickname}
              </span>
              <span 
                className="text-[9px] font-mono font-bold px-1 rounded bg-black border text-cyan-400"
                style={{ borderColor: b.primaryColor }}
              >
                Nv {level}
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] font-mono text-slate-400">
              <span className="text-amber-400 font-bold">{profile.totalXp} XP</span>
              <span>•</span>
              <span className="text-slate-300 group-hover:underline">Bitácora</span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
