import React, { useState, useEffect, useRef } from 'react';
import { 
  Radio, 
  Smartphone, 
  Tv, 
  BarChart3, 
  Database, 
  LayoutGrid, 
  Building2,
  Copy,
  Check,
  ShieldCheck, 
  ShieldAlert, 
  LogIn, 
  LogOut, 
  User, 
  Vote, 
  Compass, 
  Globe,
  ChevronDown,
  Sparkles,
  Trophy,
  Calendar,
  Users,
  Layers,
  Zap,
  Ticket,
  HelpCircle,
  Share2,
  Menu,
  X,
  Gamepad2,
  Award,
  Flame,
  UserCheck,
  MessageSquare,
  Boxes,
  Rocket,
  Sliders,
  Volume2,
  VolumeX
} from 'lucide-react';
import { INITIAL_TENANTS } from '../../lib/schemas';
import { useAuth } from '../../context/AuthContext';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserProfilePassportDrawer } from './UserProfilePassportDrawer';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp, getIsAudioMuted, toggleAudioMute } from '../../lib/cyberAudioEngine';
import { syncAppUrl, getAppRouteAndSectionFromUrl } from '../../lib/summitUrlSync';
import { SummitSectionKey } from '../summit/SummitSectionsDropdown';
import { TransientSponsorSlot } from '../summit/TransientSponsorSlot';

export type PageRoute = 'summit' | 'multiview' | 'admin' | 'play' | 'stage' | 'analytics' | 'schema';

interface HeaderNavProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  selectedTenantId: string;
  selectedEventId: string;
  onSelectTenant: (tenantId: string) => void;
  isConnected: boolean;
}

interface NavTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  type: 'SUMMIT_SECTION' | 'PAGE' | 'ACTION';
  sectionKey?: SummitSectionKey;
  pageRoute?: PageRoute;
  actionKey?: 'open_passport' | 'open_avatar';
  isActive: boolean;
}

const PILLARS_CONFIG = [
  {
    id: 'SGX.STORY',
    slug: 'story',
    name: 'SGX.STORY',
    title: 'Lore, Narrativa & Worldbuilding',
    accentColor: '#FDCC0D',
    badgeText: 'AMARILLO NEÓN',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Story%20Icon%20BY.png',
  },
  {
    id: 'SGX.STAGE',
    slug: 'stage',
    name: 'SGX.STAGE',
    title: 'Virtual Production & Escenario',
    accentColor: '#FFFFFF',
    badgeText: 'BLANCO PURO',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png',
  },
  {
    id: 'SGX.SPARK',
    slug: 'spark',
    name: 'SGX.SPARK',
    title: 'Gamificación, Drones & Dinámicas',
    accentColor: '#FF6B00',
    badgeText: 'NARANJA SPARK',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png',
  },
  {
    id: 'SGX.SYSTEM',
    slug: 'system',
    name: 'SGX.SYSTEM',
    title: 'Infraestructura & Guild Core',
    accentColor: '#32527B',
    badgeText: 'AZUL SGX',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20System%20Icon%20BY.png',
  },
  {
    id: 'SGX.SHOWCASE',
    slug: 'showcase',
    name: 'SGX.SHOWCASE',
    title: 'Exhibición 3D, XR & Marcas',
    accentColor: '#00FFFF',
    badgeText: 'CYAN SHOWCASE',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
  },
  {
    id: 'SGX.SYNTHESIZE',
    slug: 'synthesize',
    name: 'SGX.SYNTHESIZE',
    title: 'Integración Holística Total',
    accentColor: '#FDCC0D',
    badgeText: 'AMARILLO / AZUL SGX',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Synthesize%20Icon%20BY.png',
  },
];

export const HeaderNav: React.FC<HeaderNavProps> = ({
  currentPage,
  onNavigate,
  selectedTenantId,
  selectedEventId,
  onSelectTenant,
  isConnected,
}) => {
  const [copiedPath, setCopiedPath] = useState(false);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => getIsAudioMuted());
  const systemMenuRef = useRef<HTMLDivElement>(null);
  const [activeSummitSection, setActiveSummitSection] = useState<string>('OVERVIEW');
  const { tenant, tenants, selectTenant, selectPillar, styles } = useTenantTheme();
  const { language, setLanguage, t } = useLanguage();
  const { profile, liteMode, setLiteMode, setIsRoleModalOpen } = usePilotProfile();

  const { 
    user, 
    playerProfile,
    isAdmin, 
    isSuperAdmin, 
    signInWithGoogle, 
    logout, 
    loading
  } = useAuth();

  // Close system menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(e.target as Node)) {
        setIsSystemMenuOpen(false);
      }
    };
    if (isSystemMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSystemMenuOpen]);

  // Track active summit section from URL / events
  useEffect(() => {
    const updateFromUrl = () => {
      const parsed = getAppRouteAndSectionFromUrl();
      if (parsed.summitSection) {
        setActiveSummitSection(parsed.summitSection);
      } else if (parsed.page === 'summit') {
        setActiveSummitSection('OVERVIEW');
      }
    };

    updateFromUrl();
    window.addEventListener('popstate', updateFromUrl);
    window.addEventListener('hashchange', updateFromUrl);
    return () => {
      window.removeEventListener('popstate', updateFromUrl);
      window.removeEventListener('hashchange', updateFromUrl);
    };
  }, []);

  useEffect(() => {
    const handleOpenDrawer = () => setIsProfileDrawerOpen(true);
    window.addEventListener('sgx:open_profile_drawer', handleOpenDrawer);
    return () => window.removeEventListener('sgx:open_profile_drawer', handleOpenDrawer);
  }, []);

  useEffect(() => {
    const handleOpenMainMenu = () => setIsMobileMenuOpen(true);
    window.addEventListener('sgx:open_main_menu', handleOpenMainMenu);
    return () => window.removeEventListener('sgx:open_main_menu', handleOpenMainMenu);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  const handleDirectorySectionClick = (sectionKey: SummitSectionKey) => {
    playUiChirp(700);
    setIsMobileMenuOpen(false);
    if (currentPage !== 'summit') {
      onNavigate('summit');
    }
    setActiveSummitSection(sectionKey);
    syncAppUrl({ page: 'summit', section: sectionKey, replace: false });
    window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', {
      detail: { section: sectionKey }
    }));
  };

  const handleDirectoryPageClick = (pageRoute: PageRoute) => {
    playUiChirp(700);
    setIsMobileMenuOpen(false);
    onNavigate(pageRoute);
  };

  const handleCopyCurrentURL = () => {
    const fullUrl = window.location.href;
    navigator.clipboard.writeText(fullUrl);
    setCopiedPath(true);
    playUiChirp(880);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const displayName = playerProfile?.nickname || user?.displayName || (user && !user.isAnonymous ? user.email?.split('@')[0] : 'Invitado');
  const userAvatar = playerProfile?.avatar || (user as any)?.photoURL;

  // Identify current pillar config
  const currentPillarId = tenant?.pillarId?.toUpperCase() || 'SGX.SYNTHESIZE';
  const currentPillarMeta = PILLARS_CONFIG.find(p => p.id === currentPillarId) || PILLARS_CONFIG[5];

  const handlePillarChange = (pillarId: string) => {
    playUiChirp(780);
    selectPillar(pillarId);
  };

  // Dynamic Navigation Tabs filtered strictly by the Active SGX Pillar
  const getPillarTabs = (pillarId: string): NavTabItem[] => {
    switch (pillarId) {
      case 'SGX.STORY':
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && activeSummitSection === 'OVERVIEW' },
          { id: 'summit_pillars', label: 'MANIFIESTO & 6 PILARES', icon: Layers, type: 'SUMMIT_SECTION', sectionKey: 'PILLARS_MANIFESTO', isActive: currentPage === 'summit' && activeSummitSection === 'PILLARS_MANIFESTO' },
          { id: 'summit_speakers', label: 'SPEAKERS & LORE', icon: Users, type: 'SUMMIT_SECTION', sectionKey: 'SPEAKERS', isActive: currentPage === 'summit' && activeSummitSection === 'SPEAKERS' },
          { id: 'summit_passport', label: 'PASAPORTE & XP', icon: Sparkles, type: 'ACTION', actionKey: 'open_passport', isActive: false },
        ];

      case 'SGX.STAGE':
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && activeSummitSection === 'OVERVIEW' },
          { id: 'summit_agenda', label: 'RUN OF SHOW & AGENDA', icon: Calendar, type: 'SUMMIT_SECTION', sectionKey: 'AGENDA', isActive: currentPage === 'summit' && activeSummitSection === 'AGENDA' },
          { id: 'summit_broadcast', label: 'SALAS BROADCAST 4K', icon: Tv, type: 'SUMMIT_SECTION', sectionKey: 'BROADCAST_ROOMS', isActive: currentPage === 'summit' && activeSummitSection === 'BROADCAST_ROOMS' },
          { id: 'summit_speakers', label: 'SPEAKERS', icon: Users, type: 'SUMMIT_SECTION', sectionKey: 'SPEAKERS', isActive: currentPage === 'summit' && activeSummitSection === 'SPEAKERS' },
          { id: 'page_play', label: 'ARENA 3D EN VIVO', icon: Vote, type: 'PAGE', pageRoute: 'play', isActive: currentPage === 'play' },
        ];

      case 'SGX.SPARK':
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && activeSummitSection === 'OVERVIEW' },
          { id: 'summit_drones', label: 'SIMULADOR DE DRONES 3D', icon: Gamepad2, type: 'SUMMIT_SECTION', sectionKey: 'EMBEDS_GAMES', isActive: currentPage === 'summit' && activeSummitSection === 'EMBEDS_GAMES' },
          { id: 'summit_match', label: 'SGX.MATCH', icon: Flame, type: 'SUMMIT_SECTION', sectionKey: 'ENTREPRENEUR_MATCH', isActive: currentPage === 'summit' && activeSummitSection === 'ENTREPRENEUR_MATCH' },
          { id: 'page_play', label: 'ARENA 3D GAMIFICADA', icon: Vote, type: 'PAGE', pageRoute: 'play', isActive: currentPage === 'play' },
        ];

      case 'SGX.SYSTEM':
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && activeSummitSection === 'OVERVIEW' },
          { id: 'summit_guild', label: 'SGX GUILD INITIATES', icon: Award, type: 'SUMMIT_SECTION', sectionKey: 'GUILD', isActive: currentPage === 'summit' && activeSummitSection === 'GUILD' },
          { id: 'page_play', label: 'TELEMETRÍA & ARENA 3D', icon: Vote, type: 'PAGE', pageRoute: 'play', isActive: currentPage === 'play' },
        ];

      case 'SGX.SHOWCASE':
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && activeSummitSection === 'OVERVIEW' },
          { id: 'summit_map', label: 'TOUR 360° CHROMA', icon: Globe, type: 'SUMMIT_SECTION', sectionKey: 'MAP_360', isActive: currentPage === 'summit' && activeSummitSection === 'MAP_360' },
          { id: 'summit_match', label: 'SGX.MATCH (PITCHING)', icon: Flame, type: 'SUMMIT_SECTION', sectionKey: 'ENTREPRENEUR_MATCH', isActive: currentPage === 'summit' && activeSummitSection === 'ENTREPRENEUR_MATCH' },
          { id: 'summit_sponsors', label: 'PATROCINADORES & MARCAS', icon: Building2, type: 'SUMMIT_SECTION', sectionKey: 'SPONSORS_HUB', isActive: currentPage === 'summit' && activeSummitSection === 'SPONSORS_HUB' },
          { id: 'summit_credential', label: 'CREDENTIAL GENERATOR', icon: Award, type: 'SUMMIT_SECTION', sectionKey: 'CREDENTIAL_GENERATOR', isActive: currentPage === 'summit' && activeSummitSection === 'CREDENTIAL_GENERATOR' },
          { id: 'summit_social', label: 'LIVE STREAM', icon: MessageSquare, type: 'SUMMIT_SECTION', sectionKey: 'SOCIAL_STREAM', isActive: currentPage === 'summit' && activeSummitSection === 'SOCIAL_STREAM' },
        ];

      case 'SGX.SYNTHESIZE':
      default:
        return [
          { id: 'summit_overview', label: 'INICIO', icon: Compass, type: 'SUMMIT_SECTION', sectionKey: 'OVERVIEW', isActive: currentPage === 'summit' && (activeSummitSection === 'OVERVIEW' || !activeSummitSection) },
          { id: 'summit_agenda', label: 'RUN OF SHOW', icon: Calendar, type: 'SUMMIT_SECTION', sectionKey: 'AGENDA', isActive: currentPage === 'summit' && activeSummitSection === 'AGENDA' },
          { id: 'summit_pillars', label: '6 PILARES', icon: Layers, type: 'SUMMIT_SECTION', sectionKey: 'PILLARS_MANIFESTO', isActive: currentPage === 'summit' && activeSummitSection === 'PILLARS_MANIFESTO' },
          { id: 'summit_speakers', label: 'SPEAKERS', icon: Users, type: 'SUMMIT_SECTION', sectionKey: 'SPEAKERS', isActive: currentPage === 'summit' && activeSummitSection === 'SPEAKERS' },
          { id: 'summit_match', label: 'SGX.MATCH', icon: Flame, type: 'SUMMIT_SECTION', sectionKey: 'ENTREPRENEUR_MATCH', isActive: currentPage === 'summit' && activeSummitSection === 'ENTREPRENEUR_MATCH' },
          { id: 'summit_map', label: 'TOUR 360°', icon: Globe, type: 'SUMMIT_SECTION', sectionKey: 'MAP_360', isActive: currentPage === 'summit' && activeSummitSection === 'MAP_360' },
          { id: 'page_play', label: 'ARENA 3D', icon: Vote, type: 'PAGE', pageRoute: 'play', isActive: currentPage === 'play' },
        ];
    }
  };

  const primaryTabs: NavTabItem[] = [
    ...getPillarTabs(tenant.pillarId),
    ...(isAdmin ? [
      { 
        id: 'page_admin', 
        label: 'DIRECTOR STUDIO', 
        icon: ShieldCheck, 
        type: 'PAGE' as const,
        pageRoute: 'admin' as PageRoute,
        isActive: currentPage === 'admin'
      }
    ] : [])
  ];

  const handleTabClick = (tab: NavTabItem) => {
    playUiChirp(650);
    setIsMobileMenuOpen(false);

    if (tab.type === 'ACTION') {
      if (tab.actionKey === 'open_passport') {
        setIsProfileDrawerOpen(true);
      }
    } else if (tab.type === 'PAGE') {
      if (tab.pageRoute) {
        onNavigate(tab.pageRoute);
      }
    } else if (tab.type === 'SUMMIT_SECTION') {
      if (currentPage !== 'summit') {
        onNavigate('summit');
      }
      setActiveSummitSection(tab.sectionKey || 'OVERVIEW');
      syncAppUrl({ page: 'summit', section: tab.sectionKey, replace: false });
      
      // Dispatch global section switch
      window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', {
        detail: { section: tab.sectionKey }
      }));
    }
  };

  const primaryColor = tenant.branding.primaryColor || '#FDCC0D';
  const isSynthesize = currentPillarId === 'SGX.SYNTHESIZE';

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--sgx-bg)]/95 backdrop-blur-xl border-b px-3 sm:px-6 py-2 transition-colors duration-300 shadow-lg" style={{ borderColor: tenant.branding.borderColor }}>
        <div className="max-w-[1750px] mx-auto flex items-center justify-between gap-2 sm:gap-4">
          
          {/* 1. Brand Logo & Title */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            <button 
              data-tour="brand-logo"
              onClick={() => {
                playUiChirp(700);
                if (currentPage !== 'summit') onNavigate('summit');
                setActiveSummitSection('OVERVIEW');
                syncAppUrl({ page: 'summit', section: 'OVERVIEW' });
                window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', {
                  detail: { section: 'OVERVIEW' }
                }));
              }} 
              className="flex items-center gap-1.5 sm:gap-2 hover:opacity-90 transition-opacity cursor-pointer text-left"
            >
              <img 
                src="https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG" 
                alt="Spatialgineers Logo" 
                className="h-7 sm:h-8 w-auto object-contain"
              />
              <img 
                src="https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png" 
                alt="Summit Icon Logo" 
                className="h-6 sm:h-7 w-auto object-contain"
              />
              <div className="hidden xl:block">
                <span className="font-extrabold text-xs tracking-wider text-white uppercase font-['Orbitron',sans-serif] block">
                  SPATIALGINEERS SUMMIT 2026
                </span>
                <span 
                  className="text-[9px] font-mono font-bold block -mt-0.5 tracking-wider uppercase"
                  style={{ color: primaryColor }}
                >
                  LIVE ENGINE • PUERTO RICO
                </span>
              </div>
            </button>
          </div>



          {/* 3. Transient Sponsor Logo with 10s rotation and '(tu marca podría estar aquí)' */}
          <div className="hidden md:flex items-center shrink-0">
            <TransientSponsorSlot slotId="header_main" variant="compact" showSubtitleLink={true} />
          </div>

          {/* 4. Fast Actions: Language + Registration CTA + System Popover + User Passport */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 font-mono shrink-0">

            {/* Language Selector (ES | EN) */}
            <div data-tour="language-toggle" className="hidden sm:flex items-center bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-0.5" style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}>
              <button
                onClick={() => setLanguage('es')}
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                  language === 'es' ? 'bg-[var(--sgx-neon)] text-black font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
                title="Español"
              >
                ES
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-1.5 py-0.5 text-[10px] font-bold transition-all ${
                  language === 'en' ? 'bg-[var(--sgx-neon)] text-black font-extrabold' : 'text-slate-400 hover:text-white'
                }`}
                title="English"
              >
                EN
              </button>
            </div>

            {/* Astronaut Guide / Pilot Route Indicator */}
            <button
              onClick={() => {
                playUiChirp(840);
                setIsRoleModalOpen(true);
              }}
              className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 bg-slate-900/90 hover:bg-[#162540] border border-cyan-400/70 hover:border-cyan-300 text-cyan-200 hover:text-white transition-all cursor-pointer text-xs font-mono font-bold"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title="Abre el selector de ruta del Astronauta Guía"
            >
              <span className="text-sm">🧑‍🚀</span>
              <span className="text-[10px] uppercase font-bold tracking-wider">
                {profile.selectedRole ? profile.selectedRole : 'RUTA (+50 XP)'}
              </span>
            </button>

            {/* Master Audio Mute/Unmute Toggle */}
            <button
              onClick={() => {
                const muted = toggleAudioMute();
                setIsAudioMuted(muted);
                if (!muted) playUiChirp(840);
              }}
              className={`p-1.5 text-[10px] font-bold transition-all cursor-pointer border ${
                isAudioMuted
                  ? 'bg-slate-900/90 border-slate-700 text-slate-500 hover:text-white'
                  : 'bg-slate-900/90 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
              }`}
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title={isAudioMuted ? 'Activar efectos de sonido y ambiente espacial' : 'Silenciar audio espacial (Mute SFX)'}
            >
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>

            {/* Lite Mode Toggle */}
            <button
              onClick={() => {
                playUiChirp(820);
                setLiteMode(prev => !prev);
              }}
              className={`hidden sm:flex items-center space-x-1 px-2 py-1 text-[10px] font-bold transition-all cursor-pointer border ${
                liteMode
                  ? 'bg-amber-400 text-black border-amber-300 font-extrabold shadow-sm'
                  : 'bg-slate-900/90 border-slate-700 hover:border-amber-400 text-amber-300'
              }`}
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title="Modo ligero sin WebGL para ahorrar batería en móviles y conexiones lentas"
            >
              <Zap className={`w-3 h-3 ${liteMode ? 'fill-black' : 'text-amber-400'}`} />
              <span>{liteMode ? 'LIGERO' : '3D'}</span>
            </button>

            {/* Direct Ticket Registration CTA */}
            <button
              onClick={() => {
                playUiChirp(880);
                window.dispatchEvent(new CustomEvent('sgx:open_tickets'));
              }}
              className="hidden md:flex items-center space-x-1 px-2.5 py-1 bg-cyan-400 hover:bg-[#FDCC0D] text-black font-extrabold text-[11px] shadow-md transition-all cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title="Obtener Taquilla Oficial en PDF"
            >
              <Ticket className="w-3.5 h-3.5" />
              <span>REGISTRO</span>
            </button>

            {/* System Utilities Popover Trigger */}
            <div className="relative" ref={systemMenuRef}>
              <button
                onClick={() => {
                  playUiChirp(680);
                  setIsSystemMenuOpen(!isSystemMenuOpen);
                }}
                className={`px-2 py-1 border transition-all cursor-pointer flex items-center space-x-1 text-xs font-mono font-bold ${
                  isSystemMenuOpen 
                    ? 'bg-cyan-500 text-black border-cyan-400' 
                    : 'bg-[#080E1C] border-[#00FFFF]/50 text-[#00FFFF] hover:bg-[#00FFFF] hover:text-black'
                }`}
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                title="Herramientas del Sistema, Módulos y Admin"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden xl:inline text-[10px]">SISTEMA</span>
              </button>

              {isSystemMenuOpen && (
                <div 
                  className="absolute right-0 mt-2 w-56 bg-[#080E1A]/98 border-2 border-cyan-400 text-white shadow-2xl p-2 space-y-1 z-50 animate-fadeIn"
                  style={{
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                    boxShadow: '0 0 25px rgba(0, 255, 255, 0.4)'
                  }}
                >
                  <div className="px-2 py-1 text-[9px] font-mono text-cyan-300 uppercase tracking-wider border-b border-white/10 font-bold">
                    Control Plane & Herramientas
                  </div>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(720);
                      window.dispatchEvent(new CustomEvent('sgx:open_audit_modal'));
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Módulos & Visibilidad</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => {
                        setIsSystemMenuOpen(false);
                        playUiChirp(720);
                        onNavigate('admin');
                      }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D]" />
                      <span>Admin Control Panel</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(680);
                      window.dispatchEvent(new CustomEvent('sgx:open_analytics'));
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-[#FDCC0D]" />
                    <span>Analíticas & Telemetría</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(840);
                      window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                        detail: {
                          name: playerProfile?.nickname || displayName || 'Piloto Espacial',
                          title: playerProfile?.specialty || 'Creador SGX',
                          org: playerProfile?.faction || 'Spatialgineers Guild',
                          photoUrl: userAvatar || playerProfile?.avatar,
                          tier: 'PILOT'
                        }
                      }));
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-cyan-300 hover:text-white text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>🎨 Holo Card Generator</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(650);
                      window.dispatchEvent(new CustomEvent('sgx:open_sponsor_modal'));
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-orange-400" />
                    <span>Ser Patrocinador</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(840);
                      window.dispatchEvent(new CustomEvent('sgx:open_tour'));
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Tour Táctico Guiado</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(840);
                      setIsRoleModalOpen(true);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-cyan-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <span className="text-xs">🧑‍🚀</span>
                    <span>Ruta Piloto: {profile.selectedRole || 'Elegir (+50 XP)'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setIsSystemMenuOpen(false);
                      playUiChirp(820);
                      setLiteMode(prev => !prev);
                    }}
                    className="w-full text-left px-2.5 py-1.5 hover:bg-cyan-950/70 text-slate-200 hover:text-amber-300 text-xs font-mono flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Zap className={`w-3.5 h-3.5 ${liteMode ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                    <span>{liteMode ? 'Modo 3D Completo' : 'Modo Ligero (Ahorro)'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Profile & Passport Trigger */}
            <button
              data-tour="user-passport-btn"
              onClick={() => {
                playUiChirp(840);
                setIsProfileDrawerOpen(true);
              }}
              className="flex items-center space-x-1.5 bg-[var(--sgx-card-bg)] hover:bg-[var(--sgx-bg)] border border-[var(--sgx-primary)] px-2 py-1 text-left transition-all group cursor-pointer"
              style={{ 
                clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
              }}
              title="Abrir Pasaporte de Misiones y Perfil"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden bg-black border border-[var(--sgx-primary)] flex items-center justify-center shrink-0">
                {userAvatar ? (
                  <img 
                    src={userAvatar} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : isAdmin ? (
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D]" />
                ) : (
                  <User className="w-3 h-3 text-[var(--sgx-primary)]" />
                )}
              </div>
              <span className="hidden md:inline text-[10px] text-white font-bold truncate max-w-[90px]">
                {displayName}
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--sgx-primary)] shrink-0" />
            </button>

            {/* Share / Copy Link Button */}
            <button
              data-tour="share-btn"
              onClick={handleCopyCurrentURL}
              className="p-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-[var(--sgx-neon)] transition-colors cursor-pointer"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              title="Copiar enlace directo"
            >
              {copiedPath ? <Check className="w-3.5 h-3.5 text-[#FDCC0D]" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>

            {/* Global Navigation Menu Trigger (Visible on Desktop Full Screen, Tablet, and Mobile) */}
            <button
              onClick={() => {
                playUiChirp(700);
                setIsMobileMenuOpen(!isMobileMenuOpen);
              }}
              className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 hover:bg-[#32527B] border border-cyan-400/60 hover:border-cyan-300 text-white transition-all cursor-pointer text-xs font-mono font-bold shadow-sm"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              title="Abrir Directorio de Estaciones del Summit"
            >
              {isMobileMenuOpen ? (
                <X className="w-4 h-4 text-cyan-300" />
              ) : (
                <Menu className="w-4 h-4 text-cyan-300" />
              )}
              <span className="font-extrabold uppercase tracking-wider text-[11px]">MENÚ</span>
            </button>

          </div>

        </div>

      </header>

      {/* Global Navigation Directory Modal (Desktop Full Screen, Tablet, Mobile) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <div 
            className="max-w-4xl w-full bg-[#080E1C] border-2 border-cyan-500/60 p-4 sm:p-6 shadow-2xl relative space-y-6 my-auto text-slate-100 font-mono"
            style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <h3 className="text-base sm:text-lg font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider">
                    DIRECTORIO DE ESTACIONES · SPATIALGINEERS SUMMIT 2026
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  Selecciona cualquier estación para acceder directamente sin navegación lateral
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  playUiChirp(450);
                  setIsMobileMenuOpen(false);
                }}
                className="p-1.5 bg-slate-900 hover:bg-red-950 border border-slate-700 hover:border-red-500 text-slate-300 hover:text-white transition-colors cursor-pointer"
                title="Cerrar menú (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Categorized Grid of All Stations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              
              {/* Category 1: Núcleo & Filosofía */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider pb-1 border-b border-cyan-500/30 flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5" />
                  <span>NÚCLEO & FILOSOFÍA</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('OVERVIEW')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-cyan-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-cyan-300 flex items-center justify-between">
                      <span>Inicio & Núcleo 3D</span>
                      <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">3D</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Visor orbital y 7 modelos .glb</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('PILLARS_MANIFESTO')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-cyan-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-cyan-300 flex items-center justify-between">
                      <span>Manifiesto 6 Pilares</span>
                      <span className="text-[9px] px-1 bg-slate-800 text-slate-300">DOC</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Story, Showcase, Spark, Stage...</div>
                  </button>
                </div>
              </div>

              {/* Category 2: Escenario & Transmisiones */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-[#FDCC0D] uppercase tracking-wider pb-1 border-b border-[#FDCC0D]/30 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>ESCENARIO & EN VIVO</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('AGENDA')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-[#FDCC0D] transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-[#FDCC0D] flex items-center justify-between">
                      <span>Run of Show (3 Días)</span>
                      <span className="text-[9px] px-1 bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/40 font-bold">AGENDA</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Minuto a minuto y timeline</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('BROADCAST_ROOMS')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-[#FDCC0D] transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-[#FDCC0D] flex items-center justify-between">
                      <span>Salas Broadcast 4K</span>
                      <span className="text-[9px] px-1 bg-red-950 text-red-400 border border-red-500/40 font-bold animate-pulse">LIVE</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Transmisiones simultáneas</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('SPEAKERS')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-[#FDCC0D] transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-[#FDCC0D] flex items-center justify-between">
                      <span>Speakers & Artistas</span>
                      <span className="text-[9px] px-1 bg-slate-800 text-slate-300">DECK</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Baraja interactiva 3D</div>
                  </button>
                </div>
              </div>

              {/* Category 3: Gamificación & Metaverso */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider pb-1 border-b border-emerald-500/30 flex items-center gap-1.5">
                  <Gamepad2 className="w-3.5 h-3.5" />
                  <span>GAMIFICACIÓN & XP</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('EMBEDS_GAMES')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-emerald-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-emerald-300 flex items-center justify-between">
                      <span>Dron 3D & Minijuegos</span>
                      <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">+XP</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Simulador WebGL y misiones</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('ENTREPRENEUR_MATCH')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-emerald-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-emerald-300 flex items-center justify-between">
                      <span>SGX.Match (Pitch Arena)</span>
                      <span className="text-[9px] px-1 bg-orange-950 text-orange-400">PITCH</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Proyectos espaciales</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('GUILD')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-emerald-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-emerald-300 flex items-center justify-between">
                      <span>8 Guild Initiates</span>
                      <span className="text-[9px] px-1 bg-slate-800 text-slate-300">TRIALS</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Golden Master y mentores</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectoryPageClick('play')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-emerald-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-emerald-300 flex items-center justify-between">
                      <span>Arena 3D Telemetría</span>
                      <span className="text-[9px] px-1 bg-cyan-950 text-cyan-300">VOTE</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Físicas de avatar y votos</div>
                  </button>
                </div>
              </div>

              {/* Category 4: Venue, Redes & Alianzas */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider pb-1 border-b border-purple-500/30 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  <span>VENUE & COMUNIDAD</span>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('MAP_360')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-purple-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-purple-300 flex items-center justify-between">
                      <span>Tour 360° Chroma</span>
                      <span className="text-[9px] px-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">VR</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Estudio de producción virtual</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('SPONSORS_HUB')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-purple-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-purple-300 flex items-center justify-between">
                      <span>Partners & Tiers 365</span>
                      <span className="text-[9px] px-1 bg-slate-800 text-slate-300">TIERS</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Marcas aliadas y matriz</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('CREDENTIAL_GENERATOR')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-cyan-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-cyan-300 flex items-center justify-between">
                      <span>SGX Credential & Holo Card</span>
                      <span className="text-[9px] px-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">PASE 3D</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Generador de pases y visitante</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('SOCIAL_STREAM')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-purple-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-purple-300 flex items-center justify-between">
                      <span>Live Social Radar</span>
                      <span className="text-[9px] px-1 bg-pink-950 text-pink-400">#SGX</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Instagram y feed en vivo</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectorySectionClick('NETWORKING')}
                    className="w-full text-left p-2.5 bg-slate-950/80 hover:bg-[#32527B]/60 border border-slate-800 hover:border-purple-400 transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-white group-hover:text-purple-300 flex items-center justify-between">
                      <span>Foros & Chat</span>
                      <span className="text-[9px] px-1 bg-slate-800 text-slate-300">CHAT</span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">Networking entre asistentes</div>
                  </button>
                </div>
              </div>

            </div>

            {/* Quick Actions Footer */}
            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    playUiChirp(880);
                    window.dispatchEvent(new CustomEvent('sgx:open_tickets'));
                  }}
                  className="px-3 py-1.5 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-extrabold flex items-center gap-1 cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  <Ticket className="w-3.5 h-3.5 fill-black" />
                  <span>REGISTRO OFICIAL</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsProfileDrawerOpen(true);
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>PASAPORTE & XP</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    window.dispatchEvent(new CustomEvent('sgx:open_audit_modal'));
                  }}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold flex items-center gap-1 cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  <Sliders className="w-3.5 h-3.5 text-[#FDCC0D]" />
                  <span>GESTOR DE MÓDULOS</span>
                </button>
              </div>

              <div className="text-slate-500 text-[11px]">
                Pulsa <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 rounded text-[10px]">ESC</kbd> para cerrar
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Slide-over User Profile & Passport Drawer */}
      <UserProfilePassportDrawer
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        onNavigate={onNavigate}
      />
    </>
  );
};

