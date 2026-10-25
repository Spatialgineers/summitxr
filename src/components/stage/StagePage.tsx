import React, { useState, useEffect, useRef } from 'react';
import { StageVisualizer } from '../visualizer/StageVisualizer';
import { 
  VisualizerPresetId, 
  VoteSummary, 
  EventSession, 
  Question, 
  ReactionBurst, 
  StageRenderSettings,
  CustomVisualAssets
} from '../../types/engine';
import { 
  Maximize, 
  Eye, 
  EyeOff, 
  Volume2, 
  VolumeX, 
  Copy, 
  Check, 
  SlidersHorizontal,
  HelpCircle,
  Layers,
  Trophy
} from 'lucide-react';
import { SummitSponsorTicker } from '../summit/SummitSponsorTicker';
import { SummitBrandShowcaseModal } from '../summit/SummitBrandShowcaseModal';
import { QuickGuideModal, GuideStep } from '../common/QuickGuideModal';
import { ApprovedSponsor } from '../../types/summit';

const STAGE_GUIDE_STEPS: GuideStep[] = [
  {
    badge: 'GUÍA 1/3 • NARRATIVA Y VOTACIÓN EN VIVO',
    title: 'Choose-Your-Own-Adventure en Tiempo Real',
    subtitle: 'Cada decisión de la audiencia transforma el mundo 3D',
    description: 'En el Escenario 3D interactivo, los espectadores votan desde su móvil (/play) para decidir el rumbo de la historia, las transiciones de shaders en Three.js y el clímax visual del evento.',
    icon: Layers,
    tips: [
      'Al cerrar la votación, la opción ganadora muta instantáneamente los shaders y partículas del escenario.',
      'Votar activamente te otorga XP y racha de participación en tu perfil de piloto.'
    ]
  },
  {
    badge: 'GUÍA 2/3 • CÁMARA & CONTROL ORBITAL',
    title: 'Navegación Espacial Three.js',
    subtitle: 'Explora geometrías procedimentales y torres de votación 3D',
    description: 'Puedes rotar la cámara 3D libremente haciendo clic y arrastrando con el ratón o pantalla táctil. Activa el modo pantalla completa para proyecciones en vivo o transmisiones en directo.',
    icon: Maximize,
    tips: [
      'Usa el botón de ajustes (icono de sliders) para alternar el fondo transparente si usas OBS Studio.',
      'Las torres 3D muestran la altura de los votos en tiempo real.'
    ]
  },
  {
    badge: 'GUÍA 3/3 • TELEMETRÍA Y XP',
    title: 'Ganancia de XP de Codirector',
    subtitle: 'Desbloquea el logro "Codirector del Escenario"',
    description: 'Participar en al menos 3 decisiones del CYOA desbloquea la medalla exclusiva de Codirector y otorga +350 XP directos a tu historial del fin de semana.',
    icon: Trophy,
    tips: [
      'Los resultados quedan registrados en la bitácora cronológica de tu perfil de piloto.'
    ]
  }
];

interface StagePageProps {
  tenantId: string;
  eventId: string;
  session: EventSession;
  currentQuestion?: Question | null;
  voteSummary?: VoteSummary | null;
  reactions: ReactionBurst[];
  customAssets?: CustomVisualAssets;
  onNavigate?: (page: 'play' | 'admin' | 'analytics' | 'stage') => void;
}

export const StagePage: React.FC<StagePageProps> = ({
  tenantId,
  eventId,
  session,
  currentQuestion,
  voteSummary,
  reactions,
  customAssets,
  onNavigate,
}) => {
  const [isTransparent, setIsTransparent] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isSoloMaster, setIsSoloMaster] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [settings, setSettings] = useState<StageRenderSettings>({
    transparentBackground: false,
    showHUD: true,
    show3DVotingBars: true,
    cameraMotion: true,
    particleDensityMultiplier: 1.0,
    resolutionQuality: 'high',
    bloomIntensity: 1.2,
  });

  const [showControlOverlay, setShowControlOverlay] = useState(false);
  const [selectedBrandShowcase, setSelectedBrandShowcase] = useState<ApprovedSponsor | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio Synth for tactical stage sound effects
  const playSound = (freq: number, duration: number = 0.1, type: OscillatorType = 'sine') => {
    if (!audioEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed:', e);
    }
  };

  // Play audio triggers on events
  useEffect(() => {
    if (session.status === 'VOTING_ACTIVE') {
      playSound(440, 0.12, 'triangle');
    } else if (session.status === 'RESULT_REVEALED') {
      playSound(880, 0.4, 'sine');
      setTimeout(() => playSound(1174, 0.5, 'sine'), 150);
    }
  }, [session.status]);

  const handleCopyOBSLink = () => {
    const url = `${window.location.origin}/${tenantId}/${eventId}/stage?transparent=${isTransparent}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[var(--sgx-bg)] select-none">
      
      {/* 3D WebGL Canvas Visualizer Engine */}
      <StageVisualizer
        presetId={session.activePresetId}
        voteSummary={voteSummary}
        currentQuestion={currentQuestion}
        timeRemaining={session.timeRemaining}
        totalDuration={currentQuestion?.durationSeconds || 30}
        sessionStatus={session.status}
        reactions={reactions}
        settings={{
          ...settings,
          transparentBackground: isTransparent,
        }}
        isTransparent={isTransparent}
        isMasterCanvasOnly={isSoloMaster}
        customAssets={customAssets}
        onExitToGame={onNavigate ? () => onNavigate('play') : undefined}
      />

      {/* Top Left Navigation: Back to Game Tab */}
      {onNavigate && (
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={() => onNavigate('play')}
            className="px-3.5 py-2 bg-[var(--sgx-bg)]/90 hover:bg-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:text-black border border-[var(--sgx-neon)]/60 hover:border-[var(--sgx-neon)] backdrop-blur-md text-xs font-mono font-bold uppercase transition-all shadow-2xl flex items-center space-x-2 group"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            title="Salir del Stage Visual y volver al Game Tab de Audiencia"
          >
            <span>🎮</span>
            <span>← VOLVER AL JUEGO (GAME TAB)</span>
          </button>
        </div>
      )}

      {/* Floating Stage Controls (For OBS / Technical Director HUD) */}
      <div className="absolute top-4 right-4 z-50 flex items-center space-x-2">
        
        {/* Solo Visual Maestro Direct Toggle Button */}
        <button
          onClick={() => setIsSoloMaster(!isSoloMaster)}
          className={`px-3 py-2 text-xs font-bold font-mono uppercase backdrop-blur-md border shadow-xl transition-all flex items-center space-x-1.5 ${
            isSoloMaster
              ? 'bg-[var(--sgx-neon)] text-black border-[var(--sgx-neon)] shadow-[var(--sgx-neon)]/40'
              : 'bg-[var(--sgx-bg)]/90 text-[var(--sgx-neon)] border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]'
          }`}
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="Solo Visual Maestro: Oculta preguntas y muestra sólo el Canvas 3D"
        >
          <span>🎥</span>
          <span>{isSoloMaster ? 'CANVAS MAESTRO (SOLO 3D)' : 'SOLO VISUAL MAESTRO'}</span>
        </button>
        
        {/* CYOA 3D Guide Tutorial Button */}
        <button
          onClick={() => setIsGuideOpen(true)}
          className="px-2.5 py-2 text-xs font-bold font-mono uppercase bg-[var(--sgx-bg)]/90 hover:bg-cyan-950/60 text-cyan-300 border border-cyan-500/50 backdrop-blur-md shadow-xl transition-all flex items-center space-x-1.5"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="Ver Guía del Escenario CYOA 3D y Controles"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Guía 3D</span>
        </button>

        {/* Toggle Control Tray */}
        <button
          onClick={() => setShowControlOverlay(!showControlOverlay)}
          className="p-2.5 bg-[var(--sgx-bg)]/90 hover:bg-[var(--sgx-bg)] backdrop-blur-md border border-[var(--sgx-secondary)] text-slate-200 shadow-xl transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="OBS Stage Settings"
        >
          <SlidersHorizontal className="w-4 h-4 text-[var(--sgx-accent)]" />
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            setAudioEnabled(!audioEnabled);
            if (!audioEnabled) playSound(523, 0.2);
          }}
          className={`p-2.5 backdrop-blur-md border shadow-xl transition-all ${
            audioEnabled
              ? 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)] text-[var(--sgx-neon)]'
              : 'bg-[var(--sgx-bg)]/90 border-[var(--sgx-secondary)] text-[#888888] hover:text-white'
          }`}
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="Synthesized Audio SFX"
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Fullscreen Button */}
        <button
          onClick={handleFullscreen}
          className="p-2.5 bg-[var(--sgx-bg)]/90 hover:bg-[var(--sgx-bg)] backdrop-blur-md border border-[var(--sgx-secondary)] text-slate-200 shadow-xl transition-all"
          style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          title="Enter Fullscreen Projections"
        >
          <Maximize className="w-4 h-4 text-[var(--sgx-neon)]" />
        </button>
      </div>

      {/* Interactive Quick Guide Modal */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        guideTitle="Escenario CYOA 3D & Control Maestro"
        guideCategory="TUTORIAL EN VIVO"
        steps={STAGE_GUIDE_STEPS}
        primaryActionLabel="¡Entendido, vamos al escenario!"
      />

      {/* Slide-out OBS & Stage Settings Panel */}
      {showControlOverlay && (
        <div className="absolute top-16 right-4 z-50 w-80 sgx-panel space-y-4 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2">
            <span className="text-xs font-mono font-bold text-[var(--sgx-neon)] uppercase tracking-wider">
              OBS / Projections Panel
            </span>
            <span className="text-[10px] text-[#888888] font-mono">
              SGX ENGINE
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {/* Transparent Background for OBS Chroma */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">Chroma Key Transparency</span>
                <span className="text-[10px] text-[#888888]">Remove dark canvas for OBS overlay</span>
              </div>
              <button
                onClick={() => setIsTransparent(!isTransparent)}
                className={`p-2 rounded-lg border transition-all ${
                  isTransparent ? 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)] text-[var(--sgx-neon)]' : 'bg-[var(--sgx-bg)] border-[var(--sgx-secondary)] text-[#888888]'
                }`}
              >
                {isTransparent ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Toggle HUD */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">Show Stage HUD</span>
                <span className="text-[10px] text-[#888888]">Option cards & live timer</span>
              </div>
              <button
                onClick={() => setSettings({ ...settings, showHUD: !settings.showHUD })}
                className={`p-2 rounded-lg border transition-all ${
                  settings.showHUD ? 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)] text-[var(--sgx-neon)]' : 'bg-[var(--sgx-bg)] border-[var(--sgx-secondary)] text-[#888888]'
                }`}
              >
                {settings.showHUD ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Toggle 3D Voting Pillar Bars */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">3D Voting Pillar Towers</span>
                <span className="text-[10px] text-[#888888]">Real-time Three.js vertical bars</span>
              </div>
              <button
                onClick={() => setSettings({ ...settings, show3DVotingBars: !settings.show3DVotingBars })}
                className={`p-2 rounded-lg border transition-all ${
                  settings.show3DVotingBars ? 'bg-[var(--sgx-accent)]/20 border-[var(--sgx-accent)] text-[var(--sgx-accent)]' : 'bg-[var(--sgx-bg)] border-[var(--sgx-secondary)] text-[#888888]'
                }`}
              >
                {settings.show3DVotingBars ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Camera Motion */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-white font-medium block">Camera Orbital Motion</span>
                <span className="text-[10px] text-[#888888]">Gentle cinematic breathing</span>
              </div>
              <button
                onClick={() => setSettings({ ...settings, cameraMotion: !settings.cameraMotion })}
                className={`p-2 rounded-lg border transition-all ${
                  settings.cameraMotion ? 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)] text-[var(--sgx-neon)]' : 'bg-[var(--sgx-bg)] border-[var(--sgx-secondary)] text-[#888888]'
                }`}
              >
                {settings.cameraMotion ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
            </div>

            {/* Copy OBS Browser Source URL */}
            <div className="pt-2 border-t border-[var(--sgx-secondary)]">
              <button
                onClick={handleCopyOBSLink}
                className="w-full sgx-btn py-2 px-3 flex items-center justify-center space-x-2 text-xs font-bold font-mono tracking-wider"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-[#FDCC0D]" />
                    <span>COPIED TO CLIPBOARD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>COPY OBS BROWSER LINK</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-[#888888] font-mono text-center mt-1.5">
                Paste into OBS Browser Source (1920x1080, 60fps)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Brand Showcase Modal */}
      <SummitBrandShowcaseModal
        sponsor={selectedBrandShowcase}
        onClose={() => setSelectedBrandShowcase(null)}
      />

    </div>
  );
};
