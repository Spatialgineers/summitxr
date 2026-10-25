import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Tenant } from '../../types/engine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { Sliders, Sparkles, Zap, Flame, Shield, Layers, Radio, ChevronDown, Check, X, Palette } from 'lucide-react';

interface PillarTenantSelectorProps {
  currentTenantId?: string;
  onSelectTenant?: (tenant: Tenant) => void;
  className?: string;
  compact?: boolean;
}

export const PillarTenantSelector: React.FC<PillarTenantSelectorProps> = ({
  onSelectTenant,
  className = '',
}) => {
  const { tenant: activeTenant, selectTenant, tenants } = useTenantTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside or escape key
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

  const handleSelect = (t: Tenant) => {
    selectTenant(t);
    if (onSelectTenant) {
      onSelectTenant(t);
    }
    setIsOpen(false);
  };

  const getIconForPillar = (pillarId?: string, sizeClass: string = "w-4 h-4") => {
    const cdnMap: Record<string, string> = {
      'SGX.STORY': 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
      'SGX.SHOWCASE': 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      'SGX.SPARK': 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
      'SGX.STAGE': 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
      'SGX.SYSTEM': 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
      'SGX.SYNTHESIZE': 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
    };

    if (pillarId && cdnMap[pillarId]) {
      return (
        <img 
          src={cdnMap[pillarId]} 
          alt={pillarId} 
          className={`${sizeClass} object-contain filter drop-shadow-[0_0_6px_rgba(0,255,255,0.4)]`} 
        />
      );
    }

    switch (pillarId) {
      case 'SGX.STORY': return <Shield className={`${sizeClass} text-[#FDCC0D]`} />;
      case 'SGX.SHOWCASE': return <Sparkles className={`${sizeClass} text-[#00FFFF]`} />;
      case 'SGX.SPARK': return <Zap className={`${sizeClass} text-[#FF6B00]`} />;
      case 'SGX.STAGE': return <Flame className={`${sizeClass} text-white`} />;
      case 'SGX.SYSTEM': return <Layers className={`${sizeClass} text-[#32527B]`} />;
      case 'SGX.SYNTHESIZE': return <Radio className={`${sizeClass} text-[#00FFFF] animate-pulse`} />;
      default: return <Sliders className={`${sizeClass} text-cyan-400`} />;
    }
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      {/* Compact Tactical Trigger Button */}
      <button
        id="sgx-tenant-theme-trigger-btn"
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-[var(--sgx-card-bg)]/90 hover:bg-[#182236] border text-[10px] sm:text-xs font-mono transition-all shadow-md group shrink-0 cursor-pointer"
        style={{
          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
          borderColor: activeTenant.branding.primaryColor,
          boxShadow: `0 0 10px ${activeTenant.branding.glowShadow}`
        }}
        title="Cambiar Tema & Vibe SGX"
      >
        <span className="flex items-center gap-1 sm:gap-1.5">
          {getIconForPillar(activeTenant.pillarId, "w-3.5 h-3.5")}
          <span className="font-bold text-white text-[10px] sm:text-[11px] tracking-tight sm:tracking-wide">
            {activeTenant.pillarId || activeTenant.name}
          </span>
        </span>

        {/* Color Palette Indicators */}
        <div className="flex items-center space-x-1 shrink-0">
          <span 
            className="w-2.5 h-2.5 rounded-full inline-block border border-black/60 shrink-0" 
            style={{ 
              backgroundColor: activeTenant.branding.primaryColor,
              boxShadow: `0 0 6px ${activeTenant.branding.primaryColor}` 
            }}
          />
          <span 
            className="w-2 h-2 rounded-full inline-block border border-black/60 shrink-0 hidden sm:inline-block" 
            style={{ 
              backgroundColor: activeTenant.branding.secondaryColor || '#64748B'
            }}
          />
        </div>

        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Modal Overlay Centered in Screen via Portal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          id="sgx-tenant-theme-modal-backdrop"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsOpen(false);
            }
          }}
        >
          <div 
            ref={modalRef}
            id="sgx-tenant-theme-modal"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg bg-[#0B101D] border-2 shadow-2xl overflow-hidden font-mono text-xs animate-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]"
            style={{ 
              clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
              borderColor: activeTenant.branding.primaryColor,
              boxShadow: `0 0 35px ${activeTenant.branding.glowShadow}`
            }}
          >
            {/* Header */}
            <div className="p-3 sm:p-4 bg-[var(--sgx-card-bg)] border-b border-[var(--sgx-secondary)]/50 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <Palette 
                  className="w-4 h-4" 
                  style={{ color: activeTenant.branding.primaryColor }}
                />
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] tracking-wider">
                    Temas & Pilares SGX
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Selecciona una paleta de colores y vibra del ecosistema
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span 
                  className="text-[9px] px-2 py-0.5 font-bold border"
                  style={{ 
                    clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
                    color: activeTenant.branding.primaryColor,
                    borderColor: `${activeTenant.branding.primaryColor}60`,
                    backgroundColor: `${activeTenant.branding.primaryColor}15`
                  }}
                >
                  {tenants.length} PRESETS
                </span>
                <button
                  id="sgx-theme-modal-close-btn"
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
                  title="Cerrar modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* List of Tenants / Themes */}
            <div className="p-2 sm:p-3 space-y-2 overflow-y-auto max-h-[60vh] no-scrollbar">
              {tenants.map((t) => {
                const isActive = activeTenant.id === t.id;
                const b = t.branding;

                return (
                  <button
                    key={t.id}
                    id={`sgx-theme-option-${t.id}`}
                    type="button"
                    onClick={() => handleSelect(t)}
                    className={`w-full text-left p-3 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 group cursor-pointer ${
                      isActive
                        ? 'bg-[#162238] border-cyan-400 text-white shadow-md'
                        : 'bg-[#0E1524]/80 border-[var(--sgx-secondary)]/40 text-slate-300 hover:bg-[#141F33] hover:border-slate-500 hover:text-white'
                    }`}
                    style={{ 
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                      borderColor: isActive ? b.primaryColor : undefined
                    }}
                  >
                    {/* Left: Icon & Pillar Info */}
                    <div className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1">
                      <div 
                        className="p-2 bg-black/50 border border-slate-700 shrink-0"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        {getIconForPillar(t.pillarId, "w-4 h-4")}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-white truncate font-['Orbitron',sans-serif]">
                            {t.name}
                          </span>
                          <span 
                            className="text-[9px] px-1.5 py-0.2 border font-bold"
                            style={{ 
                              color: b.primaryColor,
                              borderColor: b.primaryColor,
                              backgroundColor: `${b.primaryColor}15`
                            }}
                          >
                            {t.pillarId}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {t.vibe}
                        </p>
                      </div>
                    </div>

                    {/* Right: Color Swatches & Active Status */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                      {/* Swatches */}
                      <div className="flex items-center space-x-1.5 bg-black/60 p-1 border border-slate-800">
                        <span 
                          className="w-3.5 h-3.5 rounded-sm border border-black/40" 
                          style={{ backgroundColor: b.primaryColor }}
                          title={`Primary: ${b.primaryColor}`}
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-sm border border-black/40" 
                          style={{ backgroundColor: b.secondaryColor || '#64748B' }}
                          title={`Secondary: ${b.secondaryColor}`}
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-sm border border-black/40" 
                          style={{ backgroundColor: b.accentColor || '#FDCC0D' }}
                          title={`Accent: ${b.accentColor}`}
                        />
                        <span 
                          className="w-3.5 h-3.5 rounded-sm border border-black/40" 
                          style={{ backgroundColor: b.backgroundColor || '#0B0F17' }}
                          title={`Background: ${b.backgroundColor}`}
                        />
                      </div>

                      {/* Active / Select CTA */}
                      <div className="flex items-center min-w-[70px] justify-end">
                        {isActive ? (
                          <span 
                            className="text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 border"
                            style={{
                              color: b.primaryColor,
                              borderColor: b.primaryColor,
                              backgroundColor: `${b.primaryColor}20`
                            }}
                          >
                            <Check className="w-3 h-3" />
                            <span>ACTIVO</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 group-hover:text-white text-[10px] font-bold">
                            SELECCIONAR →
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-2.5 sm:p-3 bg-[#070B14] border-t border-[var(--sgx-secondary)]/40 text-[10px] text-slate-400 flex items-center justify-between shrink-0">
              <span className="font-mono text-[10px] text-slate-400">
                El tema seleccionado se aplica a toda la interfaz y simulaciones 3D.
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-mono text-[10px] font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};


