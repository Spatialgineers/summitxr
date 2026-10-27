import { pillarIcon } from '../../lib/sgxPillars';
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
import { SGX_PILLARS, pillarOfSection, sectionModule } from '../../lib/sgxPillars';
import { SgxPassStrip } from '../../identity/SgxPassStrip';
import { useLanguage } from '../../context/LanguageContext';

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
  | 'CREDENTIAL_GENERATOR'
  | 'PILLAR'
  | 'VISITS';

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
  const { language } = useLanguage();
  const es = language === 'es';
  const lang: 'es' | 'en' = language === 'en' ? 'en' : 'es';
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
      title: (es ? 'Manifiesto Oficial & 6 Pilares' : 'Official Manifesto & 6 Pillars'),
      shortLabel: (es ? 'Manifiesto & Pilares' : 'Manifesto & Pillars'),
      description: (es ? 'Filosofía creadora de Spatialgineers y los 6 pilares de computación espacial.' : 'The Spatialgineers creative philosophy and the 6 pillars of spatial computing.'),
      icon: Boxes,
      iconUrl: pillarIcon('STORY'),
      badge: 'SGX.STORY',
      badgeColor: 'border-amber-400/60 text-[#FDCC0D] bg-amber-950/40',
      group: 'story',
    },

    // 2. SGX.STAGE — TRANSMISIÓN & ESCENARIO 3D
    {
      key: 'AGENDA',
      title: (es ? 'Run of Show & Agenda de 3 Días' : 'Run of Show & 3-Day Agenda'),
      shortLabel: 'Run of Show & Agenda',
      description: (es ? 'Línea de tiempo interactiva minuto a minuto y creador de agenda oficial.' : 'Interactive minute-by-minute timeline and official agenda builder.'),
      icon: Calendar,
      iconUrl: pillarIcon('STAGE'),
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },
    {
      key: 'BROADCAST_ROOMS',
      title: (es ? 'Salas de transmisión' : 'Broadcast rooms'),
      shortLabel: (es ? 'Salas Broadcast' : 'Broadcast Rooms'),
      description: (es ? 'Transmisiones simultáneas con canales de audio espacial.' : 'Simultaneous streams with spatial audio channels.'),
      icon: Radio,
      iconUrl: pillarIcon('STAGE'),
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },
    {
      key: 'SPEAKERS',
      title: (es ? 'Directorio 3D de Speakers & Artistas' : '3D Speakers & Artists Directory'),
      shortLabel: (es ? 'Directorio 3D Speakers' : '3D Speakers Directory'),
      description: (es ? 'Card deck holográfico con filtros de industria, pilares y roles.' : 'Holographic card deck with industry, pillar and role filters.'),
      icon: Users,
      iconUrl: pillarIcon('STAGE'),
      badge: 'SGX.STAGE',
      badgeColor: 'border-slate-300/60 text-white bg-slate-800/60',
      group: 'stage',
    },

    // 3. SGX.SPARK — GAMIFICACIÓN & DRONES
    {
      key: 'EMBEDS_GAMES',
      title: (es ? 'Simulador de Drones & Trucos XP' : 'Drone Simulator & XP Tricks'),
      shortLabel: (es ? 'Simulador de Drones' : 'Drone Simulator'),
      description: (es ? 'Acrobacias aéreas (Q, E, Z, X) con XP en vivo y entregas de marca.' : 'Aerial stunts (Q, E, Z, X) with live XP and brand deliveries.'),
      icon: Gamepad2,
      iconUrl: pillarIcon('SPARK'),
      badge: 'SGX.SPARK',
      badgeColor: 'border-cyan-400/60 text-cyan-300 bg-cyan-950/40',
      group: 'spark',
    },

    // 4. SGX.SYSTEM — TELEMETRÍA & VOTACIÓN
    {
      key: 'GUILD',
      title: 'SGX Guild Showcase & Initiates',
      shortLabel: 'Guild Initiates',
      description: (es ? 'Los 8 Initiates oficiales de la cohorte 2026 y evaluaciones de Growth Factor.' : 'The 8 official Initiates of the 2026 cohort and Growth Factor evaluations.'),
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
      description: (es ? 'Conecta con creadores y marcas de todos los pilares.' : 'Connect with creators and brands from every pillar.'),
      icon: Zap,
      iconUrl: pillarIcon('SHOWCASE'),
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'SPONSORS_HUB',
      title: (es ? 'Dossier de Auspicios & Brand Showcases' : 'Sponsorship Dossier & Brand Showcases'),
      shortLabel: (es ? 'Dossier de Auspicios' : 'Sponsorship Dossier'),
      description: (es ? 'Matriz de los 5 tiers (licencia de 365 días solo en Tiers 4 y 5).' : 'Matrix of the 5 tiers (365-day license only in Tiers 4 and 5).'),
      icon: Building2,
      iconUrl: pillarIcon('SHOWCASE'),
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'CREDENTIAL_GENERATOR',
      title: 'SGX Pass',
      shortLabel: 'SGX Pass',
      description: (es ? 'Tu registro, Holo Card, credencial y QR de networking en un solo pase que evoluciona con cada misión.' : 'Your registration, Holo Card, credential and networking QR in a single pass that evolves with every mission.'),
      icon: Award,
      iconUrl: pillarIcon('SHOWCASE'),
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'VISITS',
      title: (es ? 'Radar de visitas del Summit' : 'Summit Visit Radar'),
      shortLabel: (es ? 'Radar de visitas' : 'Visit radar'),
      description: (es ? 'Mapa en vivo de Puerto Rico y el mundo: desde dónde nos visitan, contadores y leaderboards.' : 'Live map of Puerto Rico and the world: where our visitors come from, counters and leaderboards.'),
      icon: Navigation,
      iconUrl: pillarIcon('SYSTEM'),
      badge: 'SGX.SYSTEM',
      badgeColor: 'border-amber-400/60 text-[#FDCC0D] bg-amber-950/40',
      group: 'system',
    },
    {
      key: 'MAP_360',
      title: (es ? 'Recorrido 360° Chroma Space Studios' : 'Chroma Space Studios 360° Tour'),
      shortLabel: (es ? 'Mapa 360° Venue' : '360° Venue Map'),
      description: (es ? 'Exploración virtual interactiva del venue oficial en San Juan.' : 'Interactive virtual tour of the official venue in San Juan.'),
      icon: Navigation,
      iconUrl: pillarIcon('SHOWCASE'),
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },
    {
      key: 'SOCIAL_STREAM',
      title: (es ? 'Live Social Stream (Radar Social)' : 'Live Social Stream (Social Radar)'),
      shortLabel: 'Live Social Stream',
      description: (es ? 'Muro social en vivo: posts de Instagram, Threads y X proyectados en pantalla.' : 'Live social wall: Instagram, Threads and X posts shown on screen.'),
      icon: Instagram,
      iconUrl: pillarIcon('SHOWCASE'),
      badge: 'SGX.SHOWCASE',
      badgeColor: 'border-orange-500/60 text-orange-400 bg-orange-950/40',
      group: 'showcase',
    },

    // 6. SGX.SYNTHESIZE — SÍNTESIS & COMUNIDAD
    {
      key: 'OVERVIEW',
      title: (es ? 'Vista Principal (Resumen General)' : 'Main View (Overview)'),
      shortLabel: (es ? 'Resumen General' : 'Overview'),
      description: (es ? 'Panel de control principal, contador en vivo, patrocinadores y accesos rápidos.' : 'Main control panel, live countdown, sponsors and quick links.'),
      icon: Sparkles,
      iconUrl: pillarIcon('SYNTHESIZE'),
      badge: 'SGX.SYNTHESIZE',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/15',
      group: 'synthesize',
    },
    {
      key: 'NETWORKING',
      title: (es ? 'Foro & Chat de Networking en Vivo' : 'Live Networking Forum & Chat'),
      shortLabel: 'Networking Chat',
      description: (es ? 'Canal de chat con avatares holográficos e hilos por pilar.' : 'Chat channel with holographic avatars and threads by pillar.'),
      icon: MessageSquare,
      iconUrl: pillarIcon('SYNTHESIZE'),
      badge: 'SGX.SYNTHESIZE',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/15',
      group: 'synthesize',
    },
  ];

  // Every item lives in its one home pillar (lib/sgxPillars); OVERVIEW is the core, not a pillar.
  const homedSections = sectionsList.map((item) => {
    const home = pillarOfSection(item.key);
    return home
      ? { ...item, group: home.slug as SectionItemMeta['group'], badge: home.id, iconUrl: home.iconUrl }
      : item;
  });
  const visibleSectionsList = homedSections.filter((s) => isSectionVisible(s.key));
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

  // Official order: Story, Showcase, Spark, Stage, System, Synthesize.
  const groupsMeta = SGX_PILLARS.map((p) => ({
    id: p.slug,
    title: `0${p.index} · ${p.id} • ${p.title.es.toUpperCase()}`,
    color: 'text-[#FDCC0D]',
  }));

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
        title={es ? 'Explorar las secciones y contenidos del Summit' : 'Explore the Summit sections and content'}
      >
        <div className="flex items-center gap-1.5">
          <CurrentIcon 
            className="w-3.5 h-3.5 shrink-0" 
            style={{ color: tenant.branding.primaryColor }}
          />
          <div className="text-left">
            <span className="text-[8px] text-slate-400 uppercase tracking-wider block leading-none hidden sm:block">
              {es ? 'SECCIÓN SUMMIT' : 'SUMMIT SECTION'}
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
          {es ? '6 Pilares' : '6 Pillars'}
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
                      {es ? 'SECCIONES & CONTENIDOS DEL SUMMIT' : 'SUMMIT SECTIONS & CONTENT'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {es ? 'Menú central de áreas, perfil, pasaporte y herramientas interactivas' : 'Central menu of areas, profile, passport and interactive tools'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title={es ? 'Cerrar (ESC)' : 'Close (ESC)'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* The SGX Pass is the one "me" surface; this strip just links to it. */}
              <div className="p-3 sm:p-4 border-b border-[var(--sgx-secondary)]/40 shrink-0 space-y-2">
                <SgxPassStrip onAction={() => setIsOpen(false)} />
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
                          {groupItems.length}{es ? ' Secciones' : ' Sections'}
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
                                      {sectionModule(item.key)?.label[lang] || item.title}
                                    </span>
                                    <span className={`px-1 py-0.1 text-[7px] font-bold border rounded ${item.badgeColor}`}>
                                      {item.badge}
                                    </span>
                                  </div>
                                  <p className="text-[9px] text-slate-400 leading-tight mt-1 line-clamp-2">
                                    {sectionModule(item.key)?.desc[lang] || item.description}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center justify-between pt-1 border-t border-[var(--sgx-secondary)]/20 text-[9px]">
                                <span className="text-slate-500">{es ? 'Área Activa' : 'Active Area'}</span>
                                {isActive ? (
                                  <span className="text-[var(--sgx-neon)] font-bold flex items-center space-x-0.5">
                                    <Check className="w-3 h-3" />
                                    <span>{es ? 'SELECCIONADA' : 'SELECTED'}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 group-hover:text-white font-bold">{es ? 'VER ÁREA →' : 'VIEW AREA →'}</span>
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
                    <span className="text-xs text-white font-bold">{es ? '¿Listo para asistir presencial o virtualmente?' : 'Ready to attend in person or online?'}</span>
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
                        <span>{es ? 'MI SGX PASS' : 'MY SGX PASS'}</span>
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
                        <span>{es ? 'SER PATROCINADOR' : 'BECOME A SPONSOR'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-[var(--sgx-card-bg)] border-t border-[var(--sgx-secondary)]/50 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span>Spatialgineers Summit • San Juan, PR</span>
                <span className="text-slate-500">{es ? 'Presiona ESC para cerrar' : 'Press ESC to close'}</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
