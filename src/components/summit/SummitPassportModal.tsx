import React, { useState, useEffect } from 'react';
import { 
  Award, 
  X, 
  CheckCircle2, 
  Sparkles, 
  Compass, 
  Gamepad2, 
  MessageSquare, 
  Ticket, 
  Building2, 
  ShieldCheck, 
  Share2, 
  Download, 
  Zap, 
  Lock,
  ChevronRight,
  Trophy,
  ScanLine,
  Shield,
  Palette
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PILLAR_COLORS, AvatarConfig } from './AttendeeAvatarGenerator';
import { SpatialTiltCard } from '../common/SpatialTiltCard';
import { playUiChirp, playHoloFocusSound } from '../../lib/cyberAudioEngine';

export interface QuestItem {
  id: string;
  title: string;
  desc: string;
  xp: number;
  icon: React.ElementType;
  completed: boolean;
  actionText: string;
  sectionKey?: string;
}

interface SummitPassportModalProps {
  onClose: () => void;
  onNavigateToSection: (sectionKey: string) => void;
  onOpenTickets: () => void;
  onOpenSponsors: () => void;
  onOpenRewardsStore?: () => void;
  onOpenAvatarGenerator?: () => void;
  onOpenQrScanner?: () => void;
  onOpenTour?: () => void;
}

export const SummitPassportModal: React.FC<SummitPassportModalProps> = ({
  onClose,
  onNavigateToSection,
  onOpenTickets,
  onOpenSponsors,
  onOpenRewardsStore,
  onOpenAvatarGenerator,
  onOpenQrScanner,
  onOpenTour
}) => {
  const { user, playerProfile } = useAuth();

  // Load avatar configuration
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(() => {
    try {
      const saved = localStorage.getItem('sgx_attendee_custom_avatar');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Load completed quest IDs from localStorage
  const [completedQuests, setCompletedQuests] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sgx_passport_quests');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Check if ticket exists
  useEffect(() => {
    try {
      const hasTicket = localStorage.getItem('sgx_summit_pass_registered');
      if (hasTicket) {
        setCompletedQuests(prev => {
          const next = { ...prev, quest_ticket: true };
          localStorage.setItem('sgx_passport_quests', JSON.stringify(next));
          return next;
        });
      }
    } catch {}
  }, []);

  const quests: QuestItem[] = [
    {
      id: 'quest_ticket',
      title: 'Acreditación Oficial',
      desc: 'Regístrate y obtén tu pase digital o presencial en PDF.',
      xp: 250,
      icon: Ticket,
      completed: Boolean(completedQuests['quest_ticket']),
      actionText: 'Obtener Pase'
    },
    {
      id: 'quest_360',
      title: 'Explorador Espacial 360°',
      desc: 'Haz un recorrido virtual interactivo por Chroma Space Studios.',
      xp: 200,
      icon: Compass,
      completed: Boolean(completedQuests['quest_360']),
      actionText: 'Visitar Tour 360°',
      sectionKey: 'MAP_360'
    },
    {
      id: 'quest_drone',
      title: 'Piloto Táctico de Dron',
      desc: 'Prueba tus habilidades de vuelo en el simulador espacial.',
      xp: 200,
      icon: Gamepad2,
      completed: Boolean(completedQuests['quest_drone']),
      actionText: 'Iniciar Simulador',
      sectionKey: 'EMBEDS_GAMES'
    },
    {
      id: 'quest_forum',
      title: 'Voz en la Comunidad',
      desc: 'Participa en los foros públicos de discusión o Q&A.',
      xp: 150,
      icon: MessageSquare,
      completed: Boolean(completedQuests['quest_forum']),
      actionText: 'Ir a Foros',
      sectionKey: 'NETWORKING'
    },
    {
      id: 'quest_guild',
      title: 'Jurado del SGX Guild',
      desc: 'Descubre los 8 proyectos finalistas de los Ranked Trials.',
      xp: 200,
      icon: Trophy,
      completed: Boolean(completedQuests['quest_guild']),
      actionText: 'Ver Initiates',
      sectionKey: 'GUILD'
    },
    {
      id: 'quest_qr_networking',
      title: 'Networking Presencial San Juan',
      desc: 'Escanea el código QR de otro participante y agrégalo a tu libreta.',
      xp: 250,
      icon: ScanLine,
      completed: Boolean(completedQuests['quest_qr_networking']),
      actionText: 'Escanear QR'
    },
    {
      id: 'quest_avatar',
      title: 'Diseñador de Avatar',
      desc: 'Personaliza tu astronauta con cascos y colores temáticos de los 6 pilares.',
      xp: 200,
      icon: Shield,
      completed: Boolean(completedQuests['quest_avatar']),
      actionText: 'Crear Avatar'
    },
    {
      id: 'quest_sponsors',
      title: 'Radar de Alianzas',
      desc: 'Explora el directorio de marcas y patrocinadores del Summit.',
      xp: 150,
      icon: Building2,
      completed: Boolean(completedQuests['quest_sponsors']),
      actionText: 'Ver Patrocinios',
      sectionKey: 'SPONSORS_HUB'
    },
    {
      id: 'quest_match_squad',
      title: 'Ensambla tu Squad (Match)',
      desc: 'Crea tu perfil en SGX.MATCH y conecta con otros emprendedores del Summit.',
      xp: 250,
      icon: Zap,
      completed: Boolean(completedQuests['quest_match_profile'] || completedQuests['quest_match_first'] || completedQuests['quest_match_squad']),
      actionText: 'Abrir Matchmaking',
      sectionKey: 'ENTREPRENEUR_MATCH'
    },
    {
      id: 'quest_onboarding',
      title: 'Iniciación Táctica (Tour Guiado)',
      desc: 'Conoce los 4 cuadrantes, las 12 secciones y funciones de la app.',
      xp: 100,
      icon: Sparkles,
      completed: Boolean(completedQuests['quest_onboarding']),
      actionText: 'Iniciar Tour'
    }
  ];

  const completedCount = quests.filter(q => q.completed).length;
  const totalXp = quests.filter(q => q.completed).reduce((acc, q) => acc + q.xp, 0);
  const maxPossibleXp = quests.reduce((acc, q) => acc + q.xp, 0);
  const progressPercent = Math.round((completedCount / quests.length) * 100);

  // Determine Level Rank
  let rankTitle = 'Cadete Espacial';
  let rankColor = 'text-slate-300 border-slate-500';
  if (completedCount >= 5) {
    rankTitle = 'Gran Maestro Spatialgineer';
    rankColor = 'text-[#FDCC0D] border-[#FDCC0D] bg-amber-950/40';
  } else if (completedCount >= 3) {
    rankTitle = 'Ingeniero Táctico';
    rankColor = 'text-[var(--sgx-neon)] border-[var(--sgx-neon)] bg-[#1A1A1A]';
  } else if (completedCount >= 1) {
    rankTitle = 'Iniciado del Summit';
    rankColor = 'text-[#FDCC0D] border-[#FDCC0D]/60 bg-[#1A1A1A]';
  }

  const handleQuestAction = (quest: QuestItem) => {
    // Mark as completed
    const updated = { ...completedQuests, [quest.id]: true };
    setCompletedQuests(updated);
    try {
      localStorage.setItem('sgx_passport_quests', JSON.stringify(updated));
    } catch {}

    onClose();

    if (quest.id === 'quest_ticket') {
      onOpenTickets();
    } else if (quest.id === 'quest_qr_networking' && onOpenQrScanner) {
      onOpenQrScanner();
    } else if (quest.id === 'quest_avatar' && onOpenAvatarGenerator) {
      onOpenAvatarGenerator();
    } else if (quest.id === 'quest_onboarding' && onOpenTour) {
      onOpenTour();
    } else if (quest.sectionKey) {
      onNavigateToSection(quest.sectionKey);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-[#141414] border-t-2 sm:border-2 border-[var(--sgx-neon)] p-4 sm:p-6 space-y-4 shadow-2xl relative overflow-hidden font-sans text-slate-100 max-h-[93vh] flex flex-col"
        style={{ boxShadow: '0 0 45px rgba(0, 221, 255, 0.22)' }}
      >
        {/* Top Accent Lines */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#32527B] via-[var(--sgx-neon)] to-[#FDCC0D]" />

        {/* Header with Avatar & Passport Info */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[var(--sgx-secondary)]/80 pb-4 shrink-0 gap-3">
          <div className="flex items-center space-x-3.5">
            {/* Avatar Visualizer Badge */}
            <div className="relative group shrink-0">
              <div 
                className="w-14 h-14 bg-black border-2 overflow-hidden flex items-center justify-center relative shadow-lg"
                style={{ 
                  borderColor: avatarConfig ? PILLAR_COLORS[avatarConfig.pillar]?.primary || 'var(--sgx-neon)' : 'var(--sgx-neon)',
                  boxShadow: `0 0 15px ${avatarConfig ? PILLAR_COLORS[avatarConfig.pillar]?.primary : 'var(--sgx-neon)'}44`
                }}
              >
                {playerProfile?.avatar ? (
                  <img 
                    src={playerProfile.avatar} 
                    alt="Avatar Spatialgineer" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0D0D] text-[#FDCC0D]">
                    <Shield className="w-7 h-7 text-[var(--sgx-neon)]" />
                  </div>
                )}

                {/* Edit avatar overlay button */}
                {onOpenAvatarGenerator && (
                  <button
                    type="button"
                    onClick={onOpenAvatarGenerator}
                    className="absolute inset-0 bg-black/75 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-[8px] font-mono text-white font-bold p-1 text-center"
                    title="Editar mi avatar con colores SGX"
                  >
                    <Palette className="w-3.5 h-3.5 text-[#FDCC0D] mb-0.5" />
                    <span>EDITAR</span>
                  </button>
                )}
              </div>

              {avatarConfig && (
                <div 
                  className="absolute -bottom-1 -right-1 px-1 py-0.2 text-[7px] font-mono font-black uppercase border bg-black"
                  style={{ 
                    color: PILLAR_COLORS[avatarConfig.pillar]?.primary || '#00DDFF',
                    borderColor: PILLAR_COLORS[avatarConfig.pillar]?.primary || '#00DDFF'
                  }}
                >
                  {avatarConfig.pillar.split('.')[1] || 'SGX'}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold font-['Orbitron',sans-serif] text-white tracking-wide">
                  PASAPORTE DEL SUMMIT
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 border font-extrabold uppercase ${rankColor}`}>
                  {rankTitle}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                {avatarConfig ? (
                  <span>
                    Piloto: <strong className="text-white">{playerProfile?.nickname || 'Spatialgineer'}</strong> • Traje {avatarConfig.suit.toUpperCase()} • {avatarConfig.helmet.toUpperCase()}
                  </span>
                ) : (
                  <span>Completa misiones interactivas para desbloquear insignias, rangos y XP.</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-end sm:self-center">
            {onOpenAvatarGenerator && (
              <button
                type="button"
                onClick={onOpenAvatarGenerator}
                className="px-2.5 py-1 bg-[#191919] border border-[#FDCC0D] hover:bg-[#FDCC0D] hover:text-black text-[#FDCC0D] text-[10px] font-mono font-bold flex items-center space-x-1 transition-colors"
                title="Personalizar avatar espacial con colores SGX"
              >
                <Palette className="w-3 h-3 text-[#FDCC0D]" />
                <span>CAMBIAR AVATAR</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white border border-transparent hover:border-[var(--sgx-secondary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3D Interactive Passport Telemetry & 6-Pillar Holographic Stamp Matrix */}
        <SpatialTiltCard showCornerBrackets maxTilt={8} className="shrink-0">
          <div className="p-3.5 bg-gradient-to-r from-[#0F0F0F] via-[#1A1A1A] to-[#0F0F0F] border border-[var(--sgx-secondary)] space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-200 font-bold flex items-center space-x-1.5">
                <Zap className="w-4 h-4 text-[#FDCC0D]" />
                <span>SELLOS HOLOGRÁFICOS DE 6 PILARES ({completedCount}/{quests.length})</span>
              </span>
              <span className="text-[var(--sgx-neon)] font-extrabold">{totalXp} / {maxPossibleXp} XP</span>
            </div>

            {/* 6 Official SGX Pillar Holographic Stamps */}
            <div className="grid grid-cols-6 gap-1.5">
              {[
                { name: 'STORY', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png', color: '#FDCC0D', unlocked: completedCount >= 1 },
                { name: 'SHOWCASE', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png', color: '#00DDFF', unlocked: completedCount >= 2 },
                { name: 'SPARK', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png', color: '#FFBB00', unlocked: completedCount >= 3 },
                { name: 'STAGE', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png', color: '#38BDF8', unlocked: completedCount >= 4 },
                { name: 'SYSTEM', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png', color: '#5F86B4', unlocked: completedCount >= 5 },
                { name: 'SYNTH', icon: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png', color: '#10B981', unlocked: completedCount >= 6 },
              ].map((stamp) => (
                <div
                  key={stamp.name}
                  onClick={() => playHoloFocusSound()}
                  className={`p-1.5 border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                    stamp.unlocked
                      ? 'bg-[#1F1F1F] border-cyan-400/70 shadow-[0_0_12px_rgba(0, 221, 255,0.2)]'
                      : 'bg-black/50 border-slate-800 opacity-50'
                  }`}
                >
                  <img src={stamp.icon} alt={stamp.name} className="w-5 h-5 object-contain mb-0.5" />
                  <span className="text-[8px] font-mono font-bold truncate w-full" style={{ color: stamp.unlocked ? stamp.color : '#767676' }}>
                    {stamp.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Bar */}
            <div className="w-full h-2.5 bg-black border border-[var(--sgx-secondary)] overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#00DDFF] via-[#32527B] to-[#FDCC0D] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 font-mono">
              <span>{progressPercent}% Completado · {user ? `Piloto: ${user.displayName || user.email?.split('@')[0]}` : 'Modo Local Activo'}</span>
              <button
                type="button"
                onClick={() => {
                  playUiChirp(840);
                  onClose();
                  onNavigateToSection('CREDENTIAL_GENERATOR');
                }}
                className="px-2.5 py-0.5 bg-[#00DDFF]/20 hover:bg-[#00DDFF] text-[#00DDFF] hover:text-black border border-[#00DDFF]/60 font-bold uppercase cursor-pointer transition-colors"
              >
                🪪 Abrir Mi Credencial 3D (+150 XP) →
              </button>
            </div>
          </div>
        </SpatialTiltCard>

        {/* Quests Scrollable Grid */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
          {quests.map((quest) => {
            const Icon = quest.icon;
            return (
              <div 
                key={quest.id}
                className={`p-3.5 border transition-all flex items-center justify-between gap-3 ${
                  quest.completed 
                    ? 'bg-[#191919] border-[#32527B] text-slate-200' 
                    : 'bg-[#1A1A1A] border-[var(--sgx-secondary)]/80 hover:border-[var(--sgx-neon)]/60 text-slate-300'
                }`}
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-start space-x-3 min-w-0">
                  <div 
                    className={`p-2 shrink-0 border ${
                      quest.completed 
                        ? 'bg-[#32527B]/40 border-[#FDCC0D] text-[#FDCC0D]' 
                        : 'bg-black/60 border-[var(--sgx-secondary)] text-slate-400'
                    }`}
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-white font-mono uppercase truncate">{quest.title}</h4>
                      <span className="text-[10px] font-mono font-bold text-[#FDCC0D] shrink-0">+{quest.xp} XP</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{quest.desc}</p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center space-x-2">
                  {quest.completed ? (
                    <span className="px-3 py-1 bg-[#191919] border border-[#FDCC0D] text-[#FDCC0D] text-[11px] font-mono font-bold flex items-center space-x-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>COMPLETADO</span>
                    </span>
                  ) : (
                    <button
                      onClick={() => handleQuestAction(quest)}
                      className="px-3.5 py-1.5 bg-[#FDCC0D] hover:bg-[#E5B80B] text-black text-xs font-mono font-extrabold flex items-center space-x-1 shadow-md transition-all hover:scale-105"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <span>{quest.actionText}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--sgx-secondary)]/80 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 font-mono text-xs">
          {onOpenRewardsStore && (
            <button
              onClick={() => {
                onClose();
                onOpenRewardsStore();
              }}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-600 text-black font-extrabold flex items-center justify-center space-x-1.5 shadow-lg shadow-amber-500/20 hover:scale-[1.02] transition-transform"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <Trophy className="w-4 h-4" />
              <span>CANJEAR XP EN TIENDA DE PREMIOS & RANKING</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-white text-xs font-bold transition-colors"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            CERRAR PASAPORTE
          </button>
        </div>

      </div>
    </div>
  );
};
