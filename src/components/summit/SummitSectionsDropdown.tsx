import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Users, 
  Navigation, 
  Radio, 
  Award, 
  Gamepad2, 
  Building2, 
  ChevronDown, 
  Check, 
  X, 
  Sparkles, 
  Ticket,
  ExternalLink,
  MessageSquare,
  Instagram,
  Trophy,
  ScanLine,
  Shield,
  Volume2,
  VolumeX,
  ShieldCheck,
  UserCheck,
  Zap,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useAuth } from '../../context/AuthContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useSummitFeatures } from '../../context/SummitFeatureContext';

export type SummitSectionKey = 
  | 'OVERVIEW'
  | 'PILLARS_MANIFESTO'
  | 'AGENDA'
  | 'SPEAKERS'
  | 'MAP_360'
  | 'BROADCAST_ROOMS'
  | 'SOCIAL_STREAM'
  | 'GUILD'
  | 'NETWORKING'
  | 'ENTREPRENEUR_MATCH'
  | 'EMBEDS_GAMES'
  | 'SPONSORS_HUB'
  | 'CREDENTIAL_GENERATOR';

interface SummitSectionsDropdownProps {
  activeSection: SummitSectionKey;
  onSelectSection: (section: SummitSectionKey) => void;
  onOpenTickets?: () => void;
  onOpenSponsors?: () => void;
  onOpenPassport?: () => void;
  onOpenQrScanner?: () => void;
  onOpenAvatar?: () => void;
  onOpenRewards?: () => void;
  onOpenTour?: () => void;
  onToggleAmbiance?: () => void;
  isAmbiancePlaying?: boolean;
  isAdmin?: boolean;
  onNavigateToAdmin?: () => void;
  className?: string;
}

interface SectionItemMeta {
  key: SummitSectionKey;
  title: string;
  shortLabel: string;
  description: string;
  icon: React.ElementType;
  iconUrl?: string;
  badge: string;
  badgeColor: string;
  group: 'story' | 'stage' | 'spark' | 'system' | 'showcase' | 'synthesize';
}

export const SummitSectionsDropdown: React.FC<SummitSectionsDropdownProps> = ({
  activeSection,
  onSelectSection,
  onOpenTickets,
  onOpenSponsors,
  onOpenPassport,
  onOpenQrScanner,
  onOpenAvatar,
  onOpenRewards,
  onOpenTour,
  onToggleAmbiance,
  isAmbiancePlaying = false,
  isAdmin = false,
  onNavigateToAdmin,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tenant } = useTenantTheme();
  const { playerProfile } = useAuth();
  const { isSectionVisible, getSectionStatus, isFeatureVisible } = useSummitFeatures();
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const userAvatar = playerProfile?.avatar || (typeof window !== 'undefined' ? localStorage.getItem('sgx_attendee_avatar_png') : null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (containerRef.current && containerRef.current.contains(target)) ||
        (modalRef.current && modalRef.current.contains(target))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const sectionsList: SectionItemMeta[] = [
    // 1. SGX.STORY — IDENTIDAD & NARRATIVA
    {
      key: 'PILLARS_MANIFESTO',
      title: 'Manifiesto Oficial & 6 Pilares',
      shortLabel: 'Manifiesto & Pilares',
      description: 'Filosofía creadora de Spatialgineers y los 6 pilares de computación espacial.',
      icon: Boxes,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
      badge: 'SGX.STORY',
      badgeColor: 'border-amber-400/60 text-[#FDCC0D] bg-amber-950/40',
      group: 'story',
    },

    // 2. SGX.STAGE — TRANSMISIÓN & ESCENARIO 3D
    {
      key: 'AGENDA',
      title: 'Run of Show & Agenda de 3 Días',
      shortLabel: 'Run of Show & Agenda',
      description: 'Línea de tiempo interactiva minuto a minuto y creador de agenda oficial.',
      icon: Calendar,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },
    {
      key: 'BROADCAST_ROOMS',
      title: 'Salones & Canales Broadcast 4K',
      shortLabel: 'Salas Broadcast',
      description: 'Transmisiones simultáneas con canales de audio espacial.',
      icon: Radio,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },
    {
      key: 'SPEAKERS',
      title: 'Directorio 3D de Speakers & Artistas',
      shortLabel: 'Directorio 3D Speakers',
      description: 'Card deck holográfico con filtros de industria, pilares y roles.',
      icon: Users,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },

    // 3. SGX.SPARK — GAMIFICACIÓN & DRONES
    {
      key: 'EMBEDS_GAMES',
      title: 'Simulador de Drones & Trucos XP',
      shortLabel: 'Simulador de Drones',
      description: 'Acrobacias aéreas (Q, E, Z, X) con XP en vivo y entregas Chroma.',
      icon: Gamepad2,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
      badge: 'SGX.SPARK',
      badgeColor: 'border-cyan-400/60 text-cyan-300 bg-cyan-950/40',
      group: 'spark',
    },

    // 4. SGX.SYSTEM — TELEMETRÍA & VOTACIÓN
    {
      key: 'GUILD',
      title: 'SGX Guild Showcase & Initiates',
      shortLabel: 'Guild Initiates',
      description: 'Los 8 Initiates oficiales de la cohorte 2026 y evaluaciones de Growth Factor.',
      icon: Award,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
      badge: 'SGX.SYSTEM',
      badgeColor: 'border-[#32527B] text-sky-300 bg-[#32527B]/40',
      group: 'system',
    },

    // 5. SGX.SHOWCASE — EMPRENDIMIENTO & ALIANZAS
    {
      key: 'ENTREPRENEUR_MATCH',
      title: 'SGX.MATCH — Entrepreneur Matchmaking',
      shortLabel: 'Entrepreneur Match',
      description: 'Dating app para conectar co-fundadores, ángeles y clientes.',
      icon: Zap,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'SPONSORS_HUB',
      title: 'Dossier de Auspicios & Brand Showcases',
      shortLabel: 'Dossier de Auspicios',
      description: 'Matriz comparativa de 5 tiers y presencia WebApp por 365 días.',
      icon: Building2,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'CREDENTIAL_GENERATOR',
      title: 'SGX Credential Generator & Holo Card',
      shortLabel: 'Credential Generator',
      description: 'Generador de credencial holográfica oficial y pase 3D para Speakers, Initiates, Sponsors y Visitantes.',
      icon: Award,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'MAP_360',
      title: 'Tour 360° Chroma Space Studios',
      shortLabel: 'Mapa 360° Venue',
      description: 'Exploración virtual interactiva del venue oficial en San Juan.',
      icon: Navigation,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'SOCIAL_STREAM',
      title: 'Live Social Stream (Radar Social)',
      shortLabel: 'Live Social Stream',
      description: 'Muro social en vivo: posts de Instagram, Threads y X proyectados en pantalla.',
      icon: Instagram,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },

    // 6. SGX.SYNTHESIZE — SÍNTESIS & COMUNIDAD
    {
      key: 'OVERVIEW',
      title: 'Vista Principal (Resumen General)',
      shortLabel: 'Resumen General',
      description: 'Panel de control principal, contador en vivo, patrocinadores y accesos rápidos.',
      icon: Sparkles,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
      badge: 'SGX.SYNTHESIZE',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/15',
      group: 'synthesize',
    },
    {
      key: 'NETWORKING',
      title: 'Foro & Chat de Networking en Vivo',
      shortLabel: 'Networking Chat',
      description: 'Canal de chat con avatares holográficos e hilos por pilar.',
      icon: MessageSquare,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
      badge: 'SGX.SYNTHESIZE',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/15',
      group: 'synthesize',
    },
  ];

  const visibleSectionsList = sectionsList.filter((s) => isSectionVisible(s.key));
  const currentItem = visibleSectionsList.find((s) => s.key === activeSection) || visibleSectionsList[0] || sectionsList[0];
  const CurrentIcon = currentItem.icon;

  const handleSelect = (key: SummitSectionKey) => {
    onSelectSection(key);
    setIsOpen(false);
    // Smooth scroll to the main content container
    setTimeout(() => {
      const hubEl = document.getElementById('summit-main-tab-content');
      if (hubEl) {
        hubEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const groupsMeta = [
    { id: 'story', title: 'SGX.STORY • IDENTIDAD & NARRATIVA', color: 'text-[#FDCC0D]' },
    { id: 'stage', title: 'SGX.STAGE • TRANSMISIÓN & ESCENARIO 3D', color: 'text-white' },
    { id: 'spark', title: 'SGX.SPARK • GAMIFICACIÓN & DRONES', color: 'text-cyan-400' },
    { id: 'system', title: 'SGX.SYSTEM • TELEMETRÍA, DATOS & VOTACIÓN', color: 'text-sky-400' },
    { id: 'showcase', title: 'SGX.SHOWCASE • EMPRENDIMIENTO & ALIANZAS', color: 'text-orange-400' },
    { id: 'synthesize', title: 'SGX.SYNTHESIZE • ECOSISTEMA MAESTRO', color: 'text-[#FDCC0D]' },
  ];

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        id="sgx-summit-sections-trigger-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[var(--sgx-card-bg)]/90 hover:bg-[#252525] border text-[10px] sm:text-xs font-mono transition-all shadow-md group shrink-0 cursor-pointer"
        style={{
          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
          borderColor: tenant.branding.primaryColor,
          boxShadow: `0 0 10px ${tenant.branding.glowShadow}`,
        }}
        title="Explorar las secciones y contenidos del Summit"
      >
        <div className="flex items-center gap-1.5">
          <CurrentIcon 
            className="w-3.5 h-3.5 shrink-0" 
            style={{ color: tenant.branding.primaryColor }}
          />
          <div className="text-left">
            <span className="text-[8px] text-slate-400 uppercase tracking-wider block leading-none hidden sm:block">
              SECCIÓN SUMMIT
            </span>
            <span className="font-bold text-white text-[10px] sm:text-[11px] tracking-tight truncate max-w-[120px] sm:max-w-[160px] block leading-tight font-['Orbitron',sans-serif]">
              {currentItem.shortLabel}
            </span>
          </div>
        </div>

        <span 
          className="px-1.5 py-0.5 text-[9px] font-bold border rounded hidden md:inline-block"
          style={{
            color: tenant.branding.primaryColor,
            borderColor: `${tenant.branding.primaryColor}60`,
            backgroundColor: `${tenant.branding.primaryColor}15`
          }}
        >
          {visibleSectionsList.length} Áreas
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Modal / Portal Dropdown Menu */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="sgx-summit-sections-modal-backdrop"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div
              ref={modalRef}
              id="sgx-summit-sections-modal"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#131313] border-2 shadow-2xl overflow-hidden font-mono text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              style={{
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 100%)',
                borderColor: tenant.branding.primaryColor,
                boxShadow: `0 0 35px ${tenant.branding.glowShadow}`,
              }}
            >
              {/* Header */}
              <div className="p-3 sm:p-4 bg-[var(--sgx-card-bg)] border-b border-[var(--sgx-secondary)]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="p-1.5 border"
                    style={{ 
                      clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
                      borderColor: tenant.branding.primaryColor,
                      backgroundColor: `${tenant.branding.primaryColor}15`
                    }}
                  >
                    <Sparkles 
                      className="w-4 h-4" 
                      style={{ color: tenant.branding.primaryColor }}
                    />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wider uppercase font-['Orbitron',sans-serif]">
                      SECCIONES & CONTENIDOS DEL SUMMIT
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Menú central de áreas, perfil, pasaporte y herramientas interactivas
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title="Cerrar (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User Profile, Passport & Tool Hub */}
              <div className="p-3 sm:p-4 bg-[#0d0d0d] border-b border-[var(--sgx-secondary)]/40 shrink-0 space-y-3">
                {/* User Avatar Badge Header */}
                <div 
                  className="flex items-center justify-between p-2.5 bg-[#161616] border rounded-sm"
                  style={{ borderColor: `${tenant.branding.primaryColor}40` }}
                >
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-10 h-10 rounded-full bg-black border-2 overflow-hidden flex items-center justify-center shrink-0"
                      style={{ 
                        borderColor: tenant.branding.primaryColor,
                        boxShadow: `0 0 10px ${tenant.branding.glowShadow}`
                      }}
                    >
                      {userAvatar ? (
                        <img src={userAvatar} alt="Mi Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <Shield 
                          className="w-6 h-6" 
                          style={{ color: tenant.branding.primaryColor }}
                        />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2 font-mono">
                        <span>{playerProfile?.nickname || 'Spatialgineer Asistente'}</span>
                        <span 
                          className="px-1.5 py-0.5 border text-[9px] font-bold rounded"
                          style={{
                            color: tenant.branding.primaryColor,
                            borderColor: `${tenant.branding.primaryColor}60`,
                            backgroundColor: `${tenant.branding.primaryColor}15`
                          }}
                        >
                          {playerProfile?.totalScore || 100} XP
                        </span>
                      </div>
                      <div className="text-[9px] text-slate-300 font-mono flex items-center gap-1 mt-0.5">
                        <UserCheck 
                          className="w-3 h-3" 
                          style={{ color: tenant.branding.primaryColor }}
                        />
                        <span>Foto de Perfil & Pasaporte SGX Activos</span>
                      </div>
                    </div>
                  </div>
                  <span 
                    className="text-[9px] font-mono font-bold border px-2 py-1 rounded hidden sm:inline-block"
                    style={{
                      color: tenant.branding.primaryColor,
                      borderColor: `${tenant.branding.primaryColor}60`,
                      backgroundColor: `${tenant.branding.primaryColor}15`
                    }}
                  >
                    {playerProfile?.tierTag || 'SPATIALGINEER'}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-center font-mono">
                  {/* Avatar Creator */}
                  {onOpenAvatar && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(800);
                        onOpenAvatar();
                      }}
                      className="p-2 bg-[#161616] hover:bg-[#262626] border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group cursor-pointer"
                      style={{
                        borderColor: `${tenant.branding.primaryColor}50`,
                        color: tenant.branding.primaryColor
                      }}
                      title="Personalizar mi avatar espacial con colores SGX"
                    >
                      <Shield 
                        className="w-4 h-4 group-hover:scale-110 transition-transform" 
                        style={{ color: tenant.branding.primaryColor }}
                      />
                      <span className="truncate w-full">MI AVATAR</span>
                    </button>
                  )}

                  {/* Passport & XP */}
                  {onOpenPassport && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(750);
                        onOpenPassport();
                      }}
                      className="p-2 bg-[#161616] hover:bg-[#262626] border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group cursor-pointer"
                      style={{
                        borderColor: `${tenant.branding.primaryColor}50`,
                        color: tenant.branding.primaryColor
                      }}
                      title="Ver pasaporte de misiones y acumulación de XP"
                    >
                      <Trophy 
                        className="w-4 h-4 group-hover:scale-110 transition-transform" 
                        style={{ color: tenant.branding.primaryColor }}
                      />
                      <span className="truncate w-full">PASAPORTE & XP</span>
                    </button>
                  )}

                  {/* QR Scanner */}
                  {onOpenQrScanner && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(840);
                        onOpenQrScanner();
                      }}
                      className="p-2 bg-[#161616] hover:bg-[#262626] border border-[var(--sgx-secondary)]/50 hover:border-white text-slate-200 text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group cursor-pointer"
                      title="Escanear credencial QR de participantes"
                    >
                      <ScanLine className="w-4 h-4 text-slate-300 group-hover:scale-110 transition-transform" />
                      <span className="truncate w-full">ESCANEAR QR</span>
                    </button>
                  )}

                  {/* Rewards Store */}
                  {onOpenRewards && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(820);
                        onOpenRewards();
                      }}
                      className="p-2 bg-[#161616] hover:bg-[#262626] border border-[var(--sgx-secondary)]/50 hover:border-white text-slate-200 text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group cursor-pointer"
                      title="Canjear puntos por suscripciones y premios"
                    >
                      <Award className="w-4 h-4 text-slate-300 group-hover:scale-110 transition-transform" />
                      <span className="truncate w-full">PREMIOS</span>
                    </button>
                  )}

                  {/* Onboarding Tour / Guía */}
                  {onOpenTour && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(850);
                        onOpenTour();
                      }}
                      className="p-2 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-400/60 hover:border-cyan-300 text-cyan-300 text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group"
                      title="Tour interactivo por las 12 secciones y funciones (+100 XP)"
                    >
                      <HelpCircle className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform animate-pulse" />
                      <span className="truncate w-full">TOUR GUÍA</span>
                    </button>
                  )}

                  {/* Ticket Registration */}
                  {onOpenTickets && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        playUiChirp(800);
                        onOpenTickets();
                      }}
                      className="p-2 bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black text-[10px] font-extrabold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group"
                      title="Ver o registrar mi pase de admisión oficial"
                    >
                      <Ticket className="w-4 h-4 text-black group-hover:scale-110 transition-transform" />
                      <span className="truncate w-full">MI PASE</span>
                    </button>
                  )}

                  {/* Cyber Ambiance Audio Toggle */}
                  {onToggleAmbiance && (
                    <button
                      type="button"
                      onClick={() => {
                        playUiChirp(600);
                        onToggleAmbiance();
                      }}
                      className={`p-2 border text-[10px] font-bold flex flex-col items-center justify-center gap-1 transition-all rounded-sm group ${
                        isAmbiancePlaying
                          ? 'bg-cyan-950/70 border-[var(--sgx-neon)] text-[var(--sgx-neon)] shadow-[0_0_10px_rgba(0, 221, 255,0.2)]'
                          : 'bg-[#161616] hover:bg-[#262626] border-slate-700 text-slate-400 hover:text-white'
                      }`}
                      title={isAmbiancePlaying ? "Silenciar audio ambiente cyber" : "Activar banda sonora espacial inmersiva"}
                    >
                      {isAmbiancePlaying ? (
                        <Volume2 className="w-4 h-4 text-[var(--sgx-neon)] animate-pulse" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="truncate w-full">
                        {isAmbiancePlaying ? 'AUDIO ON' : 'AUDIO OFF'}
                      </span>
                    </button>
                  )}
                </div>

                {/* Admin Link if Admin */}
                {isAdmin && onNavigateToAdmin && (
                  <div className="pt-2 border-t border-slate-800 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        onNavigateToAdmin();
                      }}
                      className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-400 text-cyan-300 text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>ADMIN PANEL (CONTROL PLANE)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-3 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar">
                {groupsMeta.map((group) => {
                  const groupItems = visibleSectionsList.filter((s) => s.group === group.id);
                  if (groupItems.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-[var(--sgx-secondary)]/40">
                        <span className={`text-[11px] font-extrabold uppercase font-['Orbitron',sans-serif] ${group.color}`}>
                          {group.title}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {groupItems.length} Secciones
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {groupItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = activeSection === item.key;

                          return (
                            <div
                              key={item.key}
                              onClick={() => handleSelect(item.key)}
                              className={`p-3 border transition-all cursor-pointer group flex flex-col justify-between ${
                                isActive
                                  ? 'bg-[var(--sgx-card-bg)] border-[var(--sgx-neon)] shadow-lg'
                                  : 'bg-black/40 border-[var(--sgx-secondary)]/40 hover:border-[var(--sgx-secondary)] hover:bg-[#1D1D1D]'
                              }`}
                              style={{
                                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                                boxShadow: isActive ? `0 0 16px ${tenant.branding.glowShadow}` : undefined,
                              }}
                            >
                              <div className="flex items-start space-x-2.5 mb-2">
                                <div
                                  className={`p-1.5 shrink-0 border mt-0.5 flex items-center justify-center ${
                                    isActive
                                      ? 'bg-[var(--sgx-neon)] text-black border-[var(--sgx-neon)]'
                                      : 'bg-black/60 text-slate-300 border-[var(--sgx-secondary)]/60 group-hover:text-white group-hover:border-white'
                                  }`}
                                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                                >
                                  {item.iconUrl ? (
                                    <img src={item.iconUrl} alt={item.title} className="w-4 h-4 object-contain" />
                                  ) : (
                                    <Icon className="w-3.5 h-3.5" />
                                  )}
                                </div>

                                <div>
                                  <div className="flex items-center space-x-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs font-['Orbitron',sans-serif] group-hover:text-[var(--sgx-neon)] transition-colors">
                                      {item.title}
                                    </span>
                                    <span className={`px-1 py-0.1 text-[7px] font-bold border rounded ${item.badgeColor}`}>
                                      {item.badge}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 leading-tight mt-1 line-clamp-2">
                                    {item.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[var(--sgx-secondary)]/20 text-[9px]">
                                <span className="text-slate-500">Área Activa</span>
                                {isActive ? (
                                  <span className="text-[var(--sgx-neon)] font-bold flex items-center space-x-0.5">
                                    <Check className="w-3 h-3" />
                                    <span>SELECCIONADA</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 group-hover:text-white font-bold">VER ÁREA →</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Acciones Globales Rápidas (Boletos y Sponsors) */}
                <div className="p-3 bg-black/60 border border-[var(--sgx-secondary)]/50 flex flex-wrap items-center justify-between gap-2 rounded">
                  <div className="flex items-center space-x-2">
                    <Ticket className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs text-white font-bold">¿Listo para asistir presencial o virtualmente?</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onOpenTickets && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenTickets();
                        }}
                        className="px-3 py-1 bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black font-extrabold text-[10px] font-mono flex items-center space-x-1"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        <Ticket className="w-3 h-3" />
                        <span>REGISTRARSE (BOLETOS)</span>
                      </button>
                    )}
                    {onOpenSponsors && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          onOpenSponsors();
                        }}
                        className="px-3 py-1 bg-[var(--sgx-accent)] hover:bg-amber-300 text-black font-extrabold text-[10px] font-mono flex items-center space-x-1"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        <Building2 className="w-3 h-3" />
                        <span>SER PATROCINADOR</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-[var(--sgx-card-bg)] border-t border-[var(--sgx-secondary)]/50 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span>Spatialgineers Summit • San Juan, PR</span>
                <span className="text-slate-500">Presiona ESC para cerrar</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
