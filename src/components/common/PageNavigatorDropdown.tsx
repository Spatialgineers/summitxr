import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Compass, 
  Vote, 
  Tv, 
  LayoutGrid, 
  Radio, 
  BarChart3, 
  Database, 
  ChevronDown, 
  Check, 
  X, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  ExternalLink,
  Calendar,
  Users,
  Navigation,
  Gamepad2,
  Ticket,
  Briefcase
} from 'lucide-react';
import { PageRoute } from './HeaderNav';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useAuth } from '../../context/AuthContext';
import { syncAppUrl, scrollToSectionContainer } from '../../lib/summitUrlSync';

interface PageNavigatorDropdownProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  className?: string;
}

interface PageItemInfo {
  id: PageRoute;
  title: string;
  shortLabel: string;
  tagline: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  category: 'public' | 'director';
  adminOnly?: boolean;
}

export const PageNavigatorDropdown: React.FC<PageNavigatorDropdownProps> = ({
  currentPage,
  onNavigate,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { tenant } = useTenantTheme();
  const { isAdmin, isSuperAdmin } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape key
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

  const allPages: PageItemInfo[] = [
    // PUBLIC EXPERIENCES
    {
      id: 'summit',
      title: 'Spatialgineers Summit 2026',
      shortLabel: 'Summit Portal',
      tagline: 'Portal principal del evento: Agenda de 3 días, directorio de speakers, mapa 360°, simulador drone, registro y boletos.',
      icon: Compass,
      badge: 'PORTAL PRINCIPAL',
      badgeColor: 'border-cyan-400/60 text-cyan-300 bg-cyan-950/40',
      category: 'public',
      adminOnly: false,
    },
    {
      id: 'play',
      title: 'Play & Vote Interactive Arena (/play)',
      shortLabel: 'Play & Vote',
      tagline: 'Experiencia PWA de audiencia en vivo para votar historias CYOA, interactuar con el stream y enviar reacciones dinámicas.',
      icon: Vote,
      badge: 'VOTACIÓN EN VIVO',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-amber-950/40',
      category: 'public',
      adminOnly: false,
    },
    {
      id: 'stage',
      title: 'Stage Output 3D Broadcast',
      shortLabel: 'Stage 3D Output',
      tagline: 'Visualizador escénico 3D WebGL a pantalla completa optimizado para proyección en eventos presenciales y OBS.',
      icon: Tv,
      badge: 'WEBGL 3D',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/10',
      category: 'public',
      adminOnly: false,
    },

    // DIRECTOR & PRODUCTION TOOLS
    {
      id: 'admin',
      title: 'Director Studio & Summit CMS',
      shortLabel: 'Director Studio',
      tagline: 'Panel maestro de control: CMS de agenda, gestión de speakers, aprobación de sponsors, moderación y encuestas CYOA.',
      icon: Radio,
      badge: 'CMS & DIRECTOR',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#FDCC0D]/10',
      category: 'director',
      adminOnly: true,
    },
    {
      id: 'multiview',
      title: 'Multi-View Studio Master',
      shortLabel: 'Multi-View Studio',
      tagline: 'Matriz de control multi-cámara para monitoreo simultáneo de transmisiones, chats y señales de audio.',
      icon: LayoutGrid,
      badge: 'MULTI-CÁMARA',
      badgeColor: 'border-[#FDCC0D]/60 text-[#FDCC0D] bg-[#0F1626]',
      category: 'director',
      adminOnly: true,
    },
    {
      id: 'analytics',
      title: 'Live Telemetry & Analytics',
      shortLabel: 'Live Analytics',
      tagline: 'Métricas en tiempo real sobre interacción de asistentes, votos por segundo, pico de audiencia y distribución regional.',
      icon: BarChart3,
      badge: 'TELEMETRÍA',
      badgeColor: 'border-sky-400/60 text-sky-300 bg-sky-950/40',
      category: 'director',
      adminOnly: true,
    },
    {
      id: 'schema',
      title: 'Firestore Database & Schema Viewer',
      shortLabel: 'Database Schema',
      tagline: 'Inspector de arquitectura de datos Firestore, colecciones activas, reglas de seguridad y validación de esquemas.',
      icon: Database,
      badge: 'INFRAESTRUCTURA',
      badgeColor: 'border-amber-400/60 text-amber-300 bg-amber-950/40',
      category: 'director',
      adminOnly: true,
    },
  ];

  const currentPageItem = allPages.find((p) => p.id === currentPage) || allPages[0];
  const CurrentIcon = currentPageItem.icon;

  const publicPages = allPages.filter((p) => p.category === 'public');
  const directorPages = allPages.filter((p) => p.category === 'director' && (!p.adminOnly || isAdmin));
  const visiblePages = isAdmin ? allPages : publicPages;

  const handleSelectPage = (pageId: PageRoute) => {
    onNavigate(pageId);
    syncAppUrl({ page: pageId, replace: false });
    setIsOpen(false);
  };

  const handleJumpToSummitSection = (sectionId: string) => {
    if (currentPage !== 'summit') {
      onNavigate('summit');
    }
    const cleanSectionSlug = sectionId.replace('summit-section-', '').replace('section-', '');
    syncAppUrl({ page: 'summit', section: cleanSectionSlug, replace: false });
    setIsOpen(false);
    scrollToSectionContainer(cleanSectionSlug);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Trigger Button - Tactical Dropdown */}
      <button
        id="sgx-page-navigator-trigger-btn"
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-[var(--sgx-card-bg)]/90 hover:bg-[#182236] border text-[10px] sm:text-xs font-mono transition-all shadow-md group shrink-0 cursor-pointer"
        style={{
          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
          borderColor: tenant.branding.primaryColor,
          boxShadow: `0 0 10px ${tenant.branding.glowShadow}`,
        }}
        title="Explorar todas las páginas y experiencias del Summit"
      >
        <div className="flex items-center gap-1.5">
          <CurrentIcon className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0" />
          <div className="text-left">
            <span className="text-[8px] text-slate-400 uppercase tracking-wider block leading-none hidden sm:block">
              PÁGINA / VISTA
            </span>
            <span className="font-bold text-white text-[10px] sm:text-[11px] tracking-tight truncate max-w-[130px] sm:max-w-[170px] block leading-tight font-['Orbitron',sans-serif]">
              {currentPageItem.shortLabel}
            </span>
          </div>
        </div>

        {/* Total Available Badge - dynamic according to role */}
        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[var(--sgx-neon)]/15 border border-[var(--sgx-neon)]/60 text-[var(--sgx-neon)] rounded hidden md:inline-block">
          {visiblePages.length} Vistas
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Modal / Popover via Portal */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            id="sgx-page-navigator-modal-backdrop"
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsOpen(false);
              }
            }}
          >
            <div
              ref={modalRef}
              id="sgx-page-navigator-modal"
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-2xl bg-[#0B101D] border-2 shadow-2xl overflow-hidden font-mono text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
              style={{
                clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                borderColor: tenant.branding.primaryColor,
                boxShadow: `0 0 35px ${tenant.branding.glowShadow}`,
              }}
            >
              {/* Header */}
              <div className="p-3 sm:p-4 bg-[var(--sgx-card-bg)] border-b border-[var(--sgx-secondary)]/50 flex items-center justify-between shrink-0">
                <div className="flex items-center space-x-2.5">
                  <div
                    className="p-1.5 border border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/10"
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    <Layers className="w-4 h-4 text-[var(--sgx-neon)]" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base text-white tracking-wider uppercase font-['Orbitron',sans-serif]">
                      DIRECTORIO DE PÁGINAS & EXPERIENCIAS
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono">
                      Explora todas las áreas interactivas, transmisiones y herramientas del Summit
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                  title="Cerrar (ESC)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-3 sm:p-5 overflow-y-auto space-y-5 custom-scrollbar">
                {/* SECTION 1: EXPERIENCIAS PÚBLICAS & ASISTENTES */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--sgx-secondary)]/40 mb-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                      <span className="text-[11px] font-bold text-white uppercase font-['Orbitron',sans-serif]">
                        EXPERIENCIAS PÚBLICAS (ASISTENTES & VISITANTES)
                      </span>
                    </div>
                    <span className="text-[9px] text-[var(--sgx-neon)] font-mono">
                      Acceso Libre
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {publicPages.map((page) => {
                      const Icon = page.icon;
                      const isActive = currentPage === page.id;

                      return (
                        <div
                          key={page.id}
                          onClick={() => handleSelectPage(page.id)}
                          className={`p-3 border transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isActive
                              ? 'bg-[var(--sgx-card-bg)] border-[var(--sgx-neon)] shadow-lg'
                              : 'bg-black/40 border-[var(--sgx-secondary)]/40 hover:border-[var(--sgx-secondary)] hover:bg-[#131A2B]'
                          }`}
                          style={{
                            clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                            boxShadow: isActive ? `0 0 16px ${tenant.branding.glowShadow}` : undefined,
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div
                              className={`p-2 shrink-0 border mt-0.5 ${
                                isActive
                                  ? 'bg-[var(--sgx-neon)] text-black border-[var(--sgx-neon)]'
                                  : 'bg-black/60 text-slate-300 border-[var(--sgx-secondary)]/60 group-hover:text-white group-hover:border-white'
                              }`}
                              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                            >
                              <Icon className="w-4 h-4" />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="font-bold text-white text-xs font-['Orbitron',sans-serif] group-hover:text-[var(--sgx-neon)] transition-colors">
                                  {page.title}
                                </span>
                                <span className={`px-1.5 py-0.2 text-[8px] font-bold border rounded ${page.badgeColor}`}>
                                  {page.badge}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 leading-relaxed max-w-lg">
                                {page.tagline}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center justify-end sm:justify-center">
                            {isActive ? (
                              <div className="flex items-center space-x-1 px-2.5 py-1 bg-[var(--sgx-neon)] text-black font-extrabold text-[10px] uppercase rounded">
                                <Check className="w-3 h-3" />
                                <span>VISTA ACTIVA</span>
                              </div>
                            ) : (
                              <div className="text-[10px] text-slate-400 group-hover:text-white flex items-center space-x-1 font-bold">
                                <span>ABRIR</span>
                                <ExternalLink className="w-3 h-3" />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* SECTION 2: HERRAMIENTAS DE PRODUCCIÓN & DIRECTOR (ADMIN ONLY) */}
                {isAdmin && directorPages.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-[var(--sgx-secondary)]/40 mb-3">
                      <div className="flex items-center space-x-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D]" />
                        <span className="text-[11px] font-bold text-white uppercase font-['Orbitron',sans-serif]">
                          CONTROL DE PRODUCCIÓN & DIRECTOR (STAFF AUTORIZADO)
                        </span>
                      </div>
                      <span className="text-[9px] text-[#FDCC0D] font-mono">
                        Acceso Autorizado
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {directorPages.map((page) => {
                        const Icon = page.icon;
                        const isActive = currentPage === page.id;

                        return (
                          <div
                            key={page.id}
                            onClick={() => handleSelectPage(page.id)}
                            className={`p-3 border transition-all cursor-pointer group flex flex-col justify-between ${
                              isActive
                                ? 'bg-[var(--sgx-card-bg)] border-[#FDCC0D] shadow-lg'
                                : 'bg-black/40 border-[var(--sgx-secondary)]/40 hover:border-[#FDCC0D]/60 hover:bg-[#131A2B]'
                            }`}
                            style={{
                              clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                            }}
                          >
                            <div className="flex items-start space-x-2.5 mb-2">
                              <div
                                className={`p-1.5 shrink-0 border ${
                                  isActive
                                    ? 'bg-[#FDCC0D] text-black border-[#FDCC0D]'
                                    : 'bg-black/60 text-slate-300 border-[var(--sgx-secondary)]/60 group-hover:text-[#FDCC0D] group-hover:border-[#FDCC0D]/60'
                                }`}
                                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>

                              <div>
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="font-bold text-white text-xs font-['Orbitron',sans-serif] group-hover:text-[#FDCC0D] transition-colors">
                                    {page.shortLabel}
                                  </span>
                                  <span className={`px-1 py-0.1 text-[7px] font-bold border rounded ${page.badgeColor}`}>
                                    {page.badge}
                                  </span>
                                </div>
                                <p className="text-[9px] text-slate-400 leading-tight mt-1 line-clamp-2">
                                  {page.tagline}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-[var(--sgx-secondary)]/20 text-[9px]">
                              <span className="text-slate-500">/{page.id}</span>
                              {isActive ? (
                                <span className="text-[#FDCC0D] font-bold flex items-center space-x-0.5">
                                  <Check className="w-3 h-3" />
                                  <span>ACTIVO</span>
                                </span>
                              ) : (
                                <span className="text-slate-400 group-hover:text-white font-bold">ABRIR →</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 3: ATRIBUTOS & SECCIONES RÁPIDAS DEL SUMMIT */}
                <div className="p-3 bg-black/60 border border-[var(--sgx-secondary)]/40 space-y-2 rounded">
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                    Acceso Rápido a Secciones del Summit:
                  </span>
                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-agenda-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Calendar className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Agenda 3 Días</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-speakers-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Users className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Speakers & Artistas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-venue-map-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Navigation className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Mapa 360° Venue</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-drone-game-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Gamepad2 className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Simulador Drone</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-tickets-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Ticket className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Boletos & Pases</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleJumpToSummitSection('summit-sponsors-section')}
                      className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-white transition-colors flex items-center space-x-1"
                    >
                      <Briefcase className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Patrocinadores</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-3 bg-[var(--sgx-card-bg)] border-t border-[var(--sgx-secondary)]/50 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400 shrink-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#FDCC0D] animate-pulse" />
                  <span>
                    Sesión: {isAdmin ? (isSuperAdmin ? 'Super Admin SGX' : 'Director Autenticado') : 'Visitante / Asistente'}
                  </span>
                </div>
                <span className="text-slate-500 hidden sm:inline">Presiona ESC para cerrar</span>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
