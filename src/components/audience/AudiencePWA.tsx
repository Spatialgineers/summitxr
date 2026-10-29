import React, { useEffect, useState } from 'react';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { SgxPilotGlyph } from '../../identity/SgxPilotGlyph';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import { runAnime } from '../../lib/animeHelper';
import { 
  Question, 
  EventSession, 
  VoteSummary, 
  UserProfile 
} from '../../types/engine';
import { 
  CheckCircle2, 
  Tv,
  Vote,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  Award,
  HelpCircle,
  Zap,
  Trophy
} from 'lucide-react';
import { StageVisualizer } from '../visualizer/StageVisualizer';
import { useAuth } from '../../context/AuthContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { SummitRewardsStoreModal } from '../summit/SummitRewardsStoreModal';
import { QuickGuideModal, GuideStep } from '../common/QuickGuideModal';
import { TransientSponsorSlot } from '../summit/TransientSponsorSlot';

const VOTING_GUIDE_STEPS: GuideStep[] = [
  {
    badge: 'GUÍA 1/3 • VELOCIDAD & PRECISIÓN',
    title: 'Bonos de Velocidad y Rachas',
    subtitle: 'Vota en los primeros segundos para maximizar tus puntos',
    description: 'Mientras más rápido envíes tu respuesta en las preguntas de trivia o decisiones narrativas, mayor será tu bono de velocidad (hasta +150 PTS extras). Mantén una racha de aciertos para duplicar tus puntos (hasta 2.0x).',
    icon: Zap,
    tips: [
      'La barra de tiempo superior te indica los segundos restantes antes del cierre de votación.',
      'Las preguntas de opinión (CYOA) otorgan puntos garantizados por participar.'
    ]
  },
  {
    badge: 'GUÍA 2/3 • RECOMPENSAS Y CUPONES',
    title: 'Niveles de Recompensa (Tiers)',
    subtitle: 'Canjea cupones de patrocinadores con tu puntaje',
    description: 'A medida que acumulas puntos desbloqueas los niveles Bronce, Plata, Oro, Platino y Backstage. Los premios son mayormente digitales y se anuncian según el Run of Show.',
    icon: Award,
    tips: [
      'Visita la pestaña "Premios" para consultar tus códigos desbloqueados.'
    ]
  },
  {
    badge: 'GUÍA 3/3 • TU PERFIL',
    title: 'Tu registro del Summit',
    subtitle: 'Cada voto suma a tu nivel y rango',
    description: 'Tus votos, respuestas correctas y reacciones se registran automáticamente en tu perfil de creador y tabla de clasificación en tiempo real.',
    icon: Trophy,
    tips: [
      'Toca tu avatar superior para abrir el desglose completo del fin de semana.'
    ]
  }
];

interface AudiencePWAProps {
  tenantId: string;
  eventId: string;
  session: EventSession;
  currentQuestion?: Question | null;
  voteSummary?: VoteSummary | null;
  user: UserProfile;
  hasVoted: boolean;
  selectedOptionId: string | null;
  onCastVote: (optionId: string, optionCode: number) => void;
  onSendReaction?: (emoji: string, type: any) => void;
  isConnected: boolean;
}


export const AudiencePWA: React.FC<AudiencePWAProps> = ({
  tenantId,
  eventId,
  session,
  currentQuestion,
  voteSummary,
  user,
  hasVoted,
  selectedOptionId,
  onCastVote,
  isConnected,
}) => {
  const { savePlayerProfile } = useAuth();
  const { recordActivity, setIsProfileModalOpen } = usePilotProfile();
  // The SGX Pass is the player profile: its callsign is the nickname on the stage and
  // its email ties prizes to the registration. There is no separate SGX Live profile.
  const sgx = useOptionalSgxIdentity();
  const passCallsign = sgx?.isForged ? sgx.identity.callsign : '';
  const passEmail = sgx?.isForged ? sgx.identity.pass?.email || '' : '';
  useEffect(() => {
    if (!passCallsign) return;
    if (user.nickname === passCallsign && (!passEmail || user.email === passEmail)) return;
    savePlayerProfile?.({ nickname: passCallsign, ...(passEmail ? { email: passEmail } : {}) }).catch?.(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passCallsign, passEmail]);
  const [activeTab, setActiveTab] = useState<'vote' | 'visualizer'>('vote');
  const [showRewardsModal, setShowRewardsModal] = useState<boolean>(false);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);

  const handleVoteClick = (e: React.MouseEvent<HTMLButtonElement>, optionId: string, optionCode: number) => {
    if (hasVoted || session.status !== 'VOTING_ACTIVE') return;

    // Tactile haptic button animation
    runAnime({
      targets: e.currentTarget,
      scale: [1, 0.95, 1.02, 1],
      duration: 300,
      easing: 'easeOutQuad',
    });

    const isCYOA = currentQuestion?.answerType === 'OPINION_CYOA';
    recordActivity(
      isCYOA ? 'stage_cyoa' : 'trivia_vote',
      isCYOA ? 'Decisión CYOA 3D Emitida' : 'Voto de Trivia Emitido',
      `Votaste en "${currentQuestion?.prompt || 'Votación en vivo'}".`,
      isCYOA ? 120 : 100,
      isCYOA ? '#8B5CF6' : '#00DDFF'
    );

    onCastVote(optionId, optionCode);
  };

  const progressPercent = currentQuestion && currentQuestion.durationSeconds > 0
    ? Math.max(0, ((session.timeRemaining || 0) / currentQuestion.durationSeconds) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-[var(--sgx-bg)] text-slate-100 flex flex-col max-w-lg mx-auto select-none font-['Orbitron',sans-serif] relative">
      
      {/* Top Floating Guest Header & Mode Selector (Only 2 Modes: Vote & Live Visualizer) */}
      <header className="p-3 border-b border-[var(--sgx-secondary)]/60 bg-[var(--sgx-bg)]/95 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center justify-between">
          {/* The SGX Pass is your player profile: tap it to open your Studio. */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } }))}
            className="flex items-center space-x-2 text-left group hover:opacity-90 transition-opacity min-w-0"
            title="Mi SGX Pass"
          >
            <div className="w-9 h-9 bg-[var(--sgx-bg)] border border-[var(--sgx-accent)]/70 group-hover:border-[var(--sgx-neon)] flex items-center justify-center overflow-hidden shadow-md transition-colors shrink-0" style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}>
              {sgx?.isForged ? (
                <SgxPilotGlyph seed={sgx.identity.avatar.seed} config={sgx.identity.avatar.pilot} accent={sgx.identity.affinity ? PILLAR_ACCENT[sgx.identity.affinity] : '#FDCC0D'} size={26} />
              ) : (
                <span>{user.avatar || '🚀'}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-bold text-white tracking-wider truncate max-w-[130px] group-hover:text-[var(--sgx-neon)]">
                  {passCallsign || user.nickname}
                </span>
                <span className="text-[9px] font-mono text-[var(--sgx-accent)] px-1.5 py-0.2 bg-[var(--sgx-accent)]/10 border border-[var(--sgx-accent)]/30">
                  {sgx?.isForged ? `#${sgx.identity.pass?.serial}` : 'ADMIN'}
                </span>
              </div>
              <span className="text-[9px] text-[var(--sgx-neon)] font-mono block">
                {(sgx?.xpEarned ?? 0).toLocaleString('es-PR')} XP · SGX Pass
              </span>
            </div>
          </button>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="p-1.5 bg-cyan-950/40 border border-cyan-500/60 text-cyan-300 hover:border-cyan-400 transition-colors text-[10px] font-mono flex items-center space-x-1"
              title="Guía de Votación & Puntos"
            >
              <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">GUÍA</span>
            </button>

            <button
              onClick={() => setShowRewardsModal(true)}
              className="p-1.5 bg-amber-950/40 border border-[#FDCC0D]/60 text-[#FDCC0D] hover:border-[#FDCC0D] transition-colors text-[10px] font-mono flex items-center space-x-1"
              title="Canjear puntos por suscripciones a apps y servicios gratis"
            >
              <Award className="w-3.5 h-3.5 text-[#FDCC0D]" />
              <span className="hidden sm:inline">PREMIOS</span>
            </button>

            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-1.5 bg-[#121212] border border-[var(--sgx-secondary)] text-[var(--sgx-accent)] hover:border-[var(--sgx-accent)] transition-colors text-[10px] font-mono flex items-center space-x-1"
              title="Abrir Mi Perfil y Desglose del Fin de Semana"
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">BITÁCORA</span>
            </button>

            {isConnected ? (
              <span className="flex items-center space-x-1 text-[10px] font-mono text-[#FDCC0D] bg-[#32527B]/40 px-2 py-1 border border-[#FDCC0D]/30">
                <Wifi className="w-3 h-3 text-[#FDCC0D]" />
                <span>LIVE</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-[10px] font-mono text-[#FFBB00] bg-[#FFBB00]/10 px-2 py-1 border border-[#FFBB00]/30">
                <WifiOff className="w-3 h-3 text-[#FFBB00]" />
                <span>OFFLINE</span>
              </span>
            )}
          </div>
        </div>

        {/* 2-Option Guest View Switcher: (1) Vote Card, (2) Live 3D Visualizer */}
        <div className="grid grid-cols-2 gap-2 mt-2.5">
          <button
            onClick={() => setActiveTab('vote')}
            className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold transition-all border ${
              activeTab === 'vote'
                ? 'bg-[var(--sgx-neon)] text-black border-[var(--sgx-neon)] shadow-md shadow-[var(--sgx-neon)]/20'
                : 'bg-[var(--sgx-bg)] text-[#888888] border-[var(--sgx-secondary)] hover:text-white'
            }`}
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>1. Vote / Decidir</span>
          </button>

          <button
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center justify-center space-x-2 py-2 text-xs font-bold transition-all border ${
              activeTab === 'visualizer'
                ? 'bg-[var(--sgx-accent)] text-black border-[var(--sgx-accent)] shadow-md shadow-[var(--sgx-accent)]/20'
                : 'bg-[var(--sgx-bg)] text-[#888888] border-[var(--sgx-secondary)] hover:text-white'
            }`}
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>2. Live Visualizer</span>
          </button>
        </div>
      </header>

      {/* Transient Rotating Sponsor Banner for Audience Console */}
      <div className="px-3 pt-2">
        <TransientSponsorSlot 
          slotId="audience_console_top" 
          variant="badge" 
          showSubtitleLink={true} 
        />
      </div>

      {/* Mode 1: Voting Interface */}
      {activeTab === 'vote' && (
        <main className="flex-1 p-4 flex flex-col justify-center space-y-4">
          
          {/* Standing By / Waiting for question */}
          {session.status === 'IDLE' && (
            <div className="sgx-panel text-center py-12 px-4 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-xl bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] flex items-center justify-center text-[var(--sgx-neon)] shadow-lg">
                <Sparkles className="w-7 h-7 animate-pulse text-[var(--sgx-neon)]" />
              </div>
              <h2 className="text-sm md:text-base font-bold text-white uppercase tracking-wider">
                Esperando Próxima Pregunta
              </h2>
              <p className="text-xs text-slate-300 font-sans max-w-xs mx-auto leading-relaxed">
                El director de escena está por iniciar la siguiente votación en tiempo real. Mantén tu pantalla lista para responder.
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('visualizer')}
                  className="text-xs font-mono text-[var(--sgx-neon)] underline hover:text-[var(--sgx-accent)] transition-colors"
                >
                  Ver el visual 3D en vivo mientras esperas →
                </button>
              </div>
            </div>
          )}

          {/* Active Question to Vote */}
          {session.status === 'VOTING_ACTIVE' && currentQuestion && (
            <div className="space-y-4 animate-fadeIn">
              
              {/* Question / Assertion Prompt Card */}
              <div className="sgx-panel space-y-2.5">
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-[var(--sgx-neon)] font-bold uppercase tracking-wider">
                    {currentQuestion.category}
                  </span>
                  <span className={`font-bold ${(session.timeRemaining || 0) <= 5 ? 'text-[#FFBB00] animate-pulse' : 'text-white'}`}>
                    ⏱ {session.timeRemaining}s RESTANTES
                  </span>
                </div>

                <h2 className="text-base md:text-lg font-bold text-white leading-snug tracking-tight">
                  {currentQuestion.prompt}
                </h2>

                {currentQuestion.subtitle && (
                  <p className="text-xs text-slate-300 font-sans">
                    {currentQuestion.subtitle}
                  </p>
                )}

                {/* Countdown Progress Line */}
                <div className="w-full h-1.5 bg-[#121212] overflow-hidden mt-2">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--sgx-neon)] to-[var(--sgx-accent)] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>

              {/* Tactical Option Choice Buttons */}
              <div className="space-y-2.5">
                {currentQuestion.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const pct = voteSummary?.optionPercentages[opt.id] ?? 0;

                  return (
                    <button
                      key={opt.id}
                      onClick={(e) => handleVoteClick(e, opt.id, opt.code)}
                      disabled={hasVoted}
                      className={`w-full p-4 text-left border transition-all relative overflow-hidden flex items-center justify-between ${
                        isSelected
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 shadow-lg shadow-[var(--sgx-neon)]/20'
                          : hasVoted
                          ? 'border-[var(--sgx-secondary)]/40 bg-[var(--sgx-bg)] opacity-60 cursor-not-allowed'
                          : 'border-[var(--sgx-secondary)] bg-[var(--sgx-bg)] hover:border-[var(--sgx-accent)] hover:bg-[var(--sgx-accent)]/10 active:scale-[0.99]'
                      }`}
                      style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                    >
                      {/* Live percentage fill bar when voted */}
                      {hasVoted && (
                        <div
                          className="absolute inset-0 opacity-15 transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: opt.color }}
                        />
                      )}

                      <div className="relative z-10 flex items-center space-x-3">
                        <span className="w-8 h-8 flex items-center justify-center bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-xs font-mono font-bold text-[var(--sgx-accent)]">
                          {opt.label.split(':')[0]}
                        </span>
                        <div>
                          <span className="text-xs md:text-sm font-bold text-white block">
                            {opt.label.split(':')[1] || opt.label}
                          </span>
                          {opt.description && (
                            <span className="text-[11px] text-slate-300 font-sans block mt-0.5">
                              {opt.description}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="relative z-10 text-right font-mono">
                        {isSelected ? (
                          <div className="flex items-center space-x-1 text-[var(--sgx-neon)]">
                            <CheckCircle2 className="w-5 h-5 text-[var(--sgx-neon)]" />
                            <span className="text-xs font-bold">VOTADO</span>
                          </div>
                        ) : hasVoted ? (
                          <span className="text-xs font-bold text-slate-300">{pct}%</span>
                        ) : (
                          <span className="text-[11px] text-[var(--sgx-neon)] font-bold">SELECCIONAR</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Vote confirmation status */}
              {hasVoted && (
                <div className="text-center text-[11px] font-mono text-[var(--sgx-neon)] bg-[var(--sgx-neon)]/10 py-2 border border-[var(--sgx-neon)]/30">
                  ✓ TU VOTO HA SIDO REGISTRADO EN TIEMPO REAL
                </div>
              )}

            </div>
          )}

          {/* Voting Closed / Result Revealed */}
          {session.status === 'RESULT_REVEALED' && (
            <div className="sgx-panel-gold text-center py-8 px-4 space-y-3 animate-fadeIn">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--sgx-accent)]/20 border border-[var(--sgx-accent)] flex items-center justify-center text-2xl">
                🏆
              </div>
              <span className="text-[10px] font-mono font-bold text-[var(--sgx-accent)] uppercase tracking-widest block">
                Resultado de la Audiencia
              </span>
              <h3 className="text-base font-bold text-white uppercase">
                Opción Ganadora Confirmada
              </h3>
              {currentQuestion?.storyPathOutcome && (
                <p className="text-xs text-slate-200 font-mono bg-[var(--sgx-bg)] p-3 border border-[var(--sgx-secondary)] text-left">
                  {currentQuestion.storyPathOutcome.narrative}
                </p>
              )}
              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('visualizer')}
                  className="w-full py-2.5 bg-[var(--sgx-accent)] text-black font-bold text-xs uppercase tracking-wider hover:bg-[#ffe066] transition-colors"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  Ver Cómo Cambió el Visual 3D →
                </button>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Mode 2: Live 3D Visualizer on Guest Device */}
      {activeTab === 'visualizer' && (
        <main className="flex-1 flex flex-col relative bg-black min-h-[500px]">
          <div className="absolute inset-0">
            <StageVisualizer
              presetId={session.activePresetId}
              voteSummary={voteSummary}
              currentQuestion={currentQuestion}
              timeRemaining={session.timeRemaining}
              totalDuration={currentQuestion?.durationSeconds || 30}
              sessionStatus={session.status}
              settings={{
                transparentBackground: false,
                showHUD: true,
                show3DVotingBars: true,
                cameraMotion: true,
                particleDensityMultiplier: 0.9,
                resolutionQuality: 'high',
                bloomIntensity: 1.0,
              }}
            />
          </div>

          {/* Quick return to vote button if voting is currently active */}
          {session.status === 'VOTING_ACTIVE' && !hasVoted && (
            <div className="absolute bottom-4 left-4 right-4 z-20">
              <button
                onClick={() => setActiveTab('vote')}
                className="w-full py-3 bg-[var(--sgx-neon)] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-2xl animate-pulse"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Vote className="w-4 h-4" />
                <span>¡Votación Abierta! Toca aquí para Votar ({session.timeRemaining}s)</span>
              </button>
            </div>
          )}
        </main>
      )}

      {/* Rewards Store & Leaderboard Modal */}
      {showRewardsModal && (
        <SummitRewardsStoreModal
          onClose={() => setShowRewardsModal(false)}
        />
      )}

      {/* Interactive Quick Guide Modal */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        guideTitle="Consola de Votación & Puntos Live"
        guideCategory="GUÍA DE JUEGO"
        steps={VOTING_GUIDE_STEPS}
        primaryActionLabel="¡Listo para votar!"
      />

      {/* Bottom Minimal Footer */}
      <footer className="p-2.5 text-center text-[10px] font-mono text-[#888888] border-t border-[var(--sgx-secondary)]/40 bg-[var(--sgx-bg)]">
        SPATIALGINEERS LIVE CYOA • GUEST INTERACTION CONSOLE
      </footer>

    </div>
  );
};
