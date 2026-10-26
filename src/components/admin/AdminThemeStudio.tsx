import React, { useState, useEffect } from 'react';
import { 
  Palette, 
  Sparkles, 
  RefreshCw, 
  Save, 
  Radio, 
  Copy, 
  Check, 
  Download, 
  Upload, 
  Sliders, 
  Eye, 
  Zap, 
  Layers, 
  Flame, 
  RotateCcw,
  Sun,
  Moon,
  Shield,
  FileCode,
  ArrowRight,
  Droplet
} from 'lucide-react';
import { Tenant } from '../../types/engine';
import { useTenantTheme, applyRootTenantCSSVariables } from '../../context/TenantThemeContext';
import { INITIAL_TENANTS } from '../../lib/schemas';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface CuratedThemePreset {
  id: string;
  name: string;
  pillar: string;
  description: string;
  branding: Tenant['branding'];
  icon: any;
}

const CURATED_PALETTES: CuratedThemePreset[] = [
  {
    id: 'cyber_cyan',
    name: 'Cyber Cyan Matrix',
    pillar: 'SGX.SPARK',
    description: 'Neón cian clásico de alta energía sobre fondo abisal y contrastes ámbar.',
    icon: Zap,
    branding: {
      primaryColor: '#00DDFF',
      secondaryColor: '#0284C7',
      accentColor: '#FDCC0D',
      backgroundColor: '#0D0D0D',
      cardBgColor: '#1B1B1B',
      borderColor: '#00DDFF',
      neonHighlightColor: '#00DDFF',
      glowShadow: 'rgba(0, 221, 255, 0.45)',
      gradientCss: 'linear-gradient(135deg, #00DDFF 0%, #0284C7 100%)'
    }
  },
  {
    id: 'solar_gold_sanjuan',
    name: 'San Juan Solar Gold',
    pillar: 'SGX.STORY',
    description: 'Dorado solar caribeño con acentos ámbar y carbón obsidiana.',
    icon: Sun,
    branding: {
      primaryColor: '#FDCC0D',
      secondaryColor: '#FFBB00',
      accentColor: '#00DDFF',
      backgroundColor: '#0E0E0E',
      cardBgColor: '#1C1C1C',
      borderColor: '#FDCC0D',
      neonHighlightColor: '#FFDD00',
      glowShadow: 'rgba(253, 204, 13, 0.5)',
      gradientCss: 'linear-gradient(135deg, #FDCC0D 0%, #FFBB00 100%)'
    }
  },
  {
    id: 'synthwave_magenta',
    name: 'Synthwave Sunset',
    pillar: 'SGX.SYNTHESIZE',
    description: 'Magenta eléctrico retro-futurista, violeta cósmico y turquesa neón.',
    icon: Flame,
    branding: {
      primaryColor: '#FF007F',
      secondaryColor: '#7928CA',
      accentColor: '#00F5FF',
      backgroundColor: '#0D0714',
      cardBgColor: '#1A0D2A',
      borderColor: '#FF007F',
      neonHighlightColor: '#FF007F',
      glowShadow: 'rgba(255, 0, 127, 0.45)',
      gradientCss: 'linear-gradient(135deg, #FF007F 0%, #7928CA 100%)'
    }
  },
  {
    id: 'emerald_core',
    name: 'Emerald Core Protocol',
    pillar: 'SGX.SYSTEM',
    description: 'Verde esmeralda fósforo puro y acentos de terminal de datos militar.',
    icon: Shield,
    branding: {
      primaryColor: '#00FF66',
      secondaryColor: '#059669',
      accentColor: '#FDCC0D',
      backgroundColor: '#050D0A',
      cardBgColor: '#0D1C16',
      borderColor: '#00FF66',
      neonHighlightColor: '#00FF66',
      glowShadow: 'rgba(0, 255, 102, 0.45)',
      gradientCss: 'linear-gradient(135deg, #00FF66 0%, #059669 100%)'
    }
  },
  {
    id: 'electric_nebula',
    name: 'Electric Nebula Violet',
    pillar: 'SGX.SHOWCASE',
    description: 'Púrpura holográfico y azul ultravioleta espacial de máxima profundidad.',
    icon: Sparkles,
    branding: {
      primaryColor: '#5F86B4',
      secondaryColor: '#3B82F6',
      accentColor: '#F43F5E',
      backgroundColor: '#090714',
      cardBgColor: '#140E29',
      borderColor: '#5F86B4',
      neonHighlightColor: '#C084FC',
      glowShadow: 'rgba(168, 85, 247, 0.45)',
      gradientCss: 'linear-gradient(135deg, #5F86B4 0%, #3B82F6 100%)'
    }
  },
  {
    id: 'volcanic_crimson',
    name: 'Volcanic Crimson & Lava',
    pillar: 'SGX.STAGE',
    description: 'Rojo hiper-reactivo y naranja estroboscópico de escenario de alto impacto.',
    icon: Flame,
    branding: {
      primaryColor: '#FF3344',
      secondaryColor: '#FFBB00',
      accentColor: '#FDCC0D',
      backgroundColor: '#0F0607',
      cardBgColor: '#1E0C0E',
      borderColor: '#FF3344',
      neonHighlightColor: '#FF4455',
      glowShadow: 'rgba(255, 51, 68, 0.45)',
      gradientCss: 'linear-gradient(135deg, #FF3344 0%, #FFBB00 100%)'
    }
  },
  {
    id: 'caribbean_coral',
    name: 'Caribbean Turquoise & Coral',
    pillar: 'SGX.SPARK',
    description: 'Turquesa brillante del mar de San Juan con contraste coral rosa intenso.',
    icon: Droplet,
    branding: {
      primaryColor: '#06B6D4',
      secondaryColor: '#F43F5E',
      accentColor: '#FBBF24',
      backgroundColor: '#101010',
      cardBgColor: '#1D1D1D',
      borderColor: '#06B6D4',
      neonHighlightColor: '#22D3EE',
      glowShadow: 'rgba(6, 182, 212, 0.45)',
      gradientCss: 'linear-gradient(135deg, #06B6D4 0%, #F43F5E 100%)'
    }
  },
  {
    id: 'titanium_minimal',
    name: 'Titanium Platinum & Ice',
    pillar: 'SGX.SYSTEM',
    description: 'Monocromo de alto contraste con blanco platino, plata y hielo glacial.',
    icon: Moon,
    branding: {
      primaryColor: '#E2E8F0',
      secondaryColor: '#767676',
      accentColor: '#38BDF8',
      backgroundColor: '#101010',
      cardBgColor: '#202020',
      borderColor: '#94A3B8',
      neonHighlightColor: '#F8FAFC',
      glowShadow: 'rgba(226, 232, 240, 0.35)',
      gradientCss: 'linear-gradient(135deg, #E2E8F0 0%, #767676 100%)'
    }
  }
];

export const AdminThemeStudio: React.FC = () => {
  const { 
    tenant: activeGlobalTenant, 
    selectTenant, 
    tenants, 
    updateTenant, 
    resetTenantsToDefaults 
  } = useTenantTheme();

  // Selected tenant being tweaked
  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeGlobalTenant.id);
  const [editingTenant, setEditingTenant] = useState<Tenant>(() => {
    const found = tenants.find(t => t.id === activeGlobalTenant.id) || tenants[0];
    return JSON.parse(JSON.stringify(found));
  });

  // Live real-time preview toggle
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedCss, setCopiedCss] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Synchronize when active tenant changes outside
  useEffect(() => {
    const current = tenants.find(t => t.id === selectedTenantId) || tenants[0];
    if (current) {
      setEditingTenant(JSON.parse(JSON.stringify(current)));
    }
  }, [selectedTenantId, tenants]);

  // Apply live CSS variables if live sync is on
  useEffect(() => {
    if (liveSyncEnabled && editingTenant) {
      applyRootTenantCSSVariables(editingTenant);
    }
  }, [editingTenant, liveSyncEnabled]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    playUiChirp(880);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleSelectTenant = (tenantId: string) => {
    playUiChirp(660);
    setSelectedTenantId(tenantId);
    const found = tenants.find(t => t.id === tenantId);
    if (found) {
      setEditingTenant(JSON.parse(JSON.stringify(found)));
    }
  };

  const updateColorField = (field: keyof Tenant['branding'], value: string) => {
    setEditingTenant(prev => {
      const updated = {
        ...prev,
        branding: {
          ...prev.branding,
          [field]: value
        }
      };

      // Auto update gradient and glow if primary or secondary changes
      if (field === 'primaryColor' || field === 'secondaryColor') {
        const p = field === 'primaryColor' ? value : prev.branding.primaryColor;
        const s = field === 'secondaryColor' ? value : prev.branding.secondaryColor;
        updated.branding.gradientCss = `linear-gradient(135deg, ${p} 0%, ${s} 100%)`;
      }

      if (field === 'primaryColor') {
        updated.branding.borderColor = value;
        updated.branding.neonHighlightColor = value;
      }

      return updated;
    });
  };

  const handleApplyCuratedPalette = (preset: CuratedThemePreset) => {
    playUiChirp(920);
    setEditingTenant(prev => ({
      ...prev,
      vibe: preset.name,
      branding: { ...preset.branding }
    }));
    showStatus(`Paleta "${preset.name}" cargada en el editor.`);
  };

  const handleSaveAndPersist = async () => {
    if (!editingTenant) return;
    await updateTenant(editingTenant);
    showStatus(`¡Colores y tema guardados y persistidos para ${editingTenant.name}!`);
  };

  const handleActivateAsGlobal = () => {
    if (!editingTenant) return;
    selectTenant(editingTenant);
    showStatus(`¡${editingTenant.name} activado como el Tema Global en toda la aplicación!`);
  };

  const handleResetToDefaultPillar = () => {
    const original = INITIAL_TENANTS.find(t => t.id === editingTenant.id);
    if (original) {
      setEditingTenant(JSON.parse(JSON.stringify(original)));
      showStatus(`Tema restablecido a la configuración por defecto de ${original.name}.`);
    } else {
      showStatus('No hay configuración por defecto registrada para esta instancia personalizada.');
    }
  };

  const handleCopyCssVariables = () => {
    const b = editingTenant.branding;
    const cssSnippet = `:root {
  --sgx-primary: ${b.primaryColor};
  --sgx-secondary: ${b.secondaryColor};
  --sgx-accent: ${b.accentColor};
  --sgx-bg: ${b.backgroundColor};
  --sgx-card-bg: ${b.cardBgColor};
  --sgx-border: ${b.borderColor};
  --sgx-neon: ${b.neonHighlightColor};
  --sgx-glow: ${b.glowShadow};
  --sgx-gradient: ${b.gradientCss};
}`;
    navigator.clipboard.writeText(cssSnippet);
    setCopiedCss(true);
    playUiChirp(840);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(editingTenant.branding, null, 2));
    setCopiedJson(true);
    playUiChirp(840);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  const handleDownloadThemeJson = () => {
    const blob = new Blob([JSON.stringify(editingTenant, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgx-theme-${editingTenant.slug || editingTenant.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Archivo JSON de tema descargado.');
  };

  const b = editingTenant.branding;

  return (
    <div className="space-y-6 font-mono text-xs">
      
      {/* Top Banner & Target Selector */}
      <div 
        className="p-4 sm:p-5 bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-primary)] flex flex-col xl:flex-row xl:items-center justify-between gap-4 shadow-xl"
        style={{
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: `0 0 25px ${b.glowShadow}`
        }}
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-[var(--sgx-primary)] font-bold">
            <Palette className="w-5 h-5 text-[var(--sgx-primary)]" />
            <h2 className="text-sm sm:text-base font-black uppercase text-white font-['Orbitron',sans-serif] tracking-wider">
              SGX LIVE THEME & COLOR STUDIO
            </h2>
            <span className="text-[10px] px-2 py-0.5 bg-[var(--sgx-primary)] text-black font-bold font-mono">
              DIRECTOR CUSTOMIZER
            </span>
          </div>
          <p className="text-slate-400 text-xs font-sans max-w-2xl leading-relaxed">
            Ajusta y afina en tiempo real los colores primarios, secundarios, bordes neón, fondos oscuros y gradientes para el diseño de toda la plataforma o para salones individuales.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {statusMessage && (
            <span className="px-3 py-1.5 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-bold animate-pulse">
              {statusMessage}
            </span>
          )}

          <button
            onClick={handleSaveAndPersist}
            className="sgx-btn px-4 py-2 text-xs font-bold uppercase flex items-center space-x-1.5 shadow-lg cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>GUARDAR & PERSISTIR</span>
          </button>

          <button
            onClick={handleActivateAsGlobal}
            className="px-4 py-2 bg-[var(--sgx-primary)]/20 hover:bg-[var(--sgx-primary)]/30 border border-[var(--sgx-primary)] text-[var(--sgx-primary)] text-xs font-bold uppercase flex items-center space-x-1.5 transition-all shadow-md cursor-pointer"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Radio className="w-4 h-4 text-[var(--sgx-primary)] animate-pulse" />
            <span>ACTIVAR COMO TEMA GLOBAL</span>
          </button>
        </div>
      </div>

      {/* Target Instance Picker & Live Toggle */}
      <div className="p-3.5 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-slate-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-[var(--sgx-primary)]" />
            <span>Instancia / Pilar Objetivo:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {tenants.map(t => {
              const isCurrent = t.id === selectedTenantId;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelectTenant(t.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isCurrent 
                      ? 'bg-[var(--sgx-card-bg)] border-[var(--sgx-primary)] text-white shadow-md' 
                      : 'bg-black/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                  }`}
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-black" 
                    style={{ backgroundColor: t.branding.primaryColor }}
                  />
                  <span>{t.pillarId || t.name.split('—')[0]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Sync Toggle */}
        <div className="flex items-center space-x-2">
          <label className="flex items-center space-x-2 cursor-pointer text-slate-300">
            <input
              type="checkbox"
              checked={liveSyncEnabled}
              onChange={(e) => setLiveSyncEnabled(e.target.checked)}
              className="accent-[var(--sgx-primary)] w-4 h-4 rounded cursor-pointer"
            />
            <span className="text-[11px] font-bold">Live CSS Sync en Vivo</span>
          </label>
        </div>
      </div>

      {/* SECTION 1: ONE-CLICK CURATED PALETTES PRESETS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-[var(--sgx-primary)]" />
            <span>1. Paletas Cyberpunk & Sci-Fi Curadas (1-Click Apply)</span>
          </h3>
          <span className="text-[10px] text-slate-400">Haz clic para cargar una base y luego afinarla</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {CURATED_PALETTES.map(preset => {
            const Icon = preset.icon;
            const pb = preset.branding;
            return (
              <button
                key={preset.id}
                onClick={() => handleApplyCuratedPalette(preset)}
                className="p-3 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-left transition-all duration-200 group relative overflow-hidden shadow-sm hover:shadow-lg cursor-pointer"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                {/* Gradient Header Line */}
                <div 
                  className="h-1.5 w-full mb-2 rounded-xs" 
                  style={{ background: pb.gradientCss }} 
                />

                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-xs font-['Orbitron',sans-serif] group-hover:text-[var(--sgx-primary)] transition-colors">
                    {preset.name}
                  </span>
                  <Icon className="w-3.5 h-3.5 text-[var(--sgx-primary)] shrink-0" />
                </div>

                <p className="text-[10px] text-slate-400 line-clamp-2 mb-2.5 font-sans leading-tight">
                  {preset.description}
                </p>

                {/* Color Swatch Dots */}
                <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-800">
                  <span className="w-3.5 h-3.5 rounded-full border border-black/80" style={{ backgroundColor: pb.primaryColor }} title="Primario" />
                  <span className="w-3.5 h-3.5 rounded-full border border-black/80" style={{ backgroundColor: pb.secondaryColor }} title="Secundario" />
                  <span className="w-3.5 h-3.5 rounded-full border border-black/80" style={{ backgroundColor: pb.accentColor }} title="Acento" />
                  <span className="w-3.5 h-3.5 rounded-full border border-black/80" style={{ backgroundColor: pb.backgroundColor }} title="Fondo" />
                  <span className="w-3.5 h-3.5 rounded-full border border-black/80" style={{ backgroundColor: pb.cardBgColor }} title="Tarjeta" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SECTION 2 & 3: COLOR CONTROLS GRID + LIVE SANDBOX PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column: Precise Color Pickers (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-border)] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Sliders className="w-4 h-4 text-[var(--sgx-primary)]" />
              <span>2. Ajuste Fino de Canales de Color & CSS</span>
            </h3>
            <button
              onClick={handleResetToDefaultPillar}
              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
              title="Restablecer a valores iniciales"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer Pilar</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            
            {/* 1. Primary Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">1. COLOR PRIMARIO</span>
                <span className="text-[10px] text-slate-400">Botones & Títulos</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.primaryColor}
                  onChange={(e) => updateColorField('primaryColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.primaryColor}
                  onChange={(e) => updateColorField('primaryColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Secondary Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">2. COLOR SECUNDARIO</span>
                <span className="text-[10px] text-slate-400">Bordes & Degradados</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.secondaryColor}
                  onChange={(e) => updateColorField('secondaryColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.secondaryColor}
                  onChange={(e) => updateColorField('secondaryColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 3. Accent Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">3. COLOR DE ACENTO</span>
                <span className="text-[10px] text-slate-400">Medallas & Alertas</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.accentColor}
                  onChange={(e) => updateColorField('accentColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.accentColor}
                  onChange={(e) => updateColorField('accentColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 4. Neon Highlight Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">4. NEÓN HIGHLIGHT</span>
                <span className="text-[10px] text-slate-400">Puntos de Luz & Glow</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.neonHighlightColor}
                  onChange={(e) => updateColorField('neonHighlightColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.neonHighlightColor}
                  onChange={(e) => updateColorField('neonHighlightColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 5. Background Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">5. FONDO GLOBAL (CANVAS)</span>
                <span className="text-[10px] text-slate-400">Oscuro base</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.backgroundColor}
                  onChange={(e) => updateColorField('backgroundColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.backgroundColor}
                  onChange={(e) => updateColorField('backgroundColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 6. Card Background Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">6. FONDO DE TARJETAS / PANELES</span>
                <span className="text-[10px] text-slate-400">Superficie elevada</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.cardBgColor}
                  onChange={(e) => updateColorField('cardBgColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.cardBgColor}
                  onChange={(e) => updateColorField('cardBgColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 7. Border Color */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">7. COLOR DE BORDES</span>
                <span className="text-[10px] text-slate-400">Líneas estructurales</span>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={b.borderColor}
                  onChange={(e) => updateColorField('borderColor', e.target.value)}
                  className="w-9 h-9 cursor-pointer bg-transparent border border-slate-700 rounded-xs"
                />
                <input
                  type="text"
                  value={b.borderColor}
                  onChange={(e) => updateColorField('borderColor', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
                />
              </div>
            </div>

            {/* 8. Glow Shadow */}
            <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-white font-bold">8. RESPLANDOR NEÓN (GLOW)</span>
                <span className="text-[10px] text-slate-400">Sombra perimetral</span>
              </div>
              <input
                type="text"
                value={b.glowShadow}
                onChange={(e) => updateColorField('glowShadow', e.target.value)}
                placeholder="rgba(0, 221, 255, 0.45)"
                className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-1.5 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
              />
            </div>

          </div>

          {/* 9. Gradient CSS Generator */}
          <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-border)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white font-bold">9. EXPRESIÓN DE DEGRADADO CSS:</span>
              <div className="flex items-center space-x-1 text-[10px]">
                {['135deg', '90deg', '45deg', '180deg'].map(deg => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => updateColorField('gradientCss', `linear-gradient(${deg}, ${b.primaryColor} 0%, ${b.secondaryColor} 100%)`)}
                    className="px-1.5 py-0.5 bg-[var(--sgx-card-bg)] hover:bg-slate-800 border border-slate-700 text-slate-300"
                  >
                    {deg}
                  </button>
                ))}
              </div>
            </div>

            <input
              type="text"
              value={b.gradientCss || ''}
              onChange={(e) => updateColorField('gradientCss', e.target.value)}
              className="w-full bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] p-2 text-white font-mono text-xs focus:border-[var(--sgx-primary)] focus:outline-none"
            />

            {/* Gradient Live Bar */}
            <div 
              className="h-7 w-full border border-white/30 rounded-xs shadow-md transition-all duration-300"
              style={{ background: b.gradientCss || `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor} 100%)` }}
            />
          </div>

          {/* Code Export & Clipboard Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleCopyCssVariables}
              className="px-3 py-1.5 bg-[var(--sgx-card-bg)] hover:bg-slate-800 border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              {copiedCss ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />}
              <span>{copiedCss ? '¡VARIABLES CSS COPIADAS!' : 'COPIAR CSS :ROOT'}</span>
            </button>

            <button
              onClick={handleCopyJson}
              className="px-3 py-1.5 bg-[var(--sgx-card-bg)] hover:bg-slate-800 border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <FileCode className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />}
              <span>{copiedJson ? '¡JSON COPIADO!' : 'COPIAR JSON'}</span>
            </button>

            <button
              onClick={handleDownloadThemeJson}
              className="px-3 py-1.5 bg-[var(--sgx-card-bg)] hover:bg-slate-800 border border-[var(--sgx-border)] hover:border-[var(--sgx-primary)] text-slate-300 text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[var(--sgx-primary)]" />
              <span>DESCARGAR .JSON</span>
            </button>
          </div>

        </div>

        {/* Right Column: Live Interactive Sandbox Preview (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border-b border-[var(--sgx-border)] pb-2">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Eye className="w-4 h-4 text-[var(--sgx-primary)]" />
              <span>3. Sandbox de Previsualización en Vivo</span>
            </h3>
          </div>

          {/* Sandbox Box */}
          <div 
            className="p-5 border-2 space-y-4 transition-all duration-300 rounded-xs shadow-2xl relative overflow-hidden"
            style={{
              backgroundColor: b.backgroundColor,
              borderColor: b.borderColor,
              boxShadow: `0 0 35px ${b.glowShadow}`
            }}
          >
            {/* Ambient Background Gradient Spot */}
            <div 
              className="absolute top-0 right-0 w-48 h-48 pointer-events-none rounded-full blur-3xl opacity-30"
              style={{ background: b.gradientCss }}
            />

            {/* Sandbox Header Simulation */}
            <div 
              className="p-2.5 border flex items-center justify-between"
              style={{
                backgroundColor: b.cardBgColor,
                borderColor: b.borderColor
              }}
            >
              <div className="flex items-center space-x-2">
                <div 
                  className="w-6 h-6 border flex items-center justify-center font-bold text-[10px]"
                  style={{
                    backgroundColor: b.backgroundColor,
                    borderColor: b.primaryColor,
                    color: b.primaryColor
                  }}
                >
                  SGX
                </div>
                <span className="font-bold text-white text-xs font-['Orbitron',sans-serif]">
                  {editingTenant.name.split('—')[0]}
                </span>
              </div>

              <span 
                className="text-[9px] px-2 py-0.5 font-bold uppercase font-mono"
                style={{
                  backgroundColor: b.primaryColor,
                  color: '#000000'
                }}
              >
                LIVE VIBE
              </span>
            </div>

            {/* Sandbox Card Component */}
            <div 
              className="p-4 border space-y-3"
              style={{
                backgroundColor: b.cardBgColor,
                borderColor: b.borderColor,
                boxShadow: `0 0 15px ${b.glowShadow}`
              }}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span style={{ color: b.primaryColor }} className="font-bold">
                  PREGUNTA ACTIVA #01
                </span>
                <span 
                  className="px-2 py-0.5 text-[9px] font-bold"
                  style={{
                    backgroundColor: `${b.accentColor}20`,
                    borderColor: b.accentColor,
                    borderWidth: '1px',
                    color: b.accentColor
                  }}
                >
                  VOTING ACTIVE
                </span>
              </div>

              <h4 className="text-sm font-bold text-white leading-snug">
                ¿Qué arquitectura espacial 3D debemos sintetizar en la pantalla gigante?
              </h4>

              {/* Progress Bar Simulation */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-slate-300 font-mono">
                  <span>Opción A: Cyber Temple</span>
                  <span style={{ color: b.primaryColor }} className="font-bold">78%</span>
                </div>
                <div 
                  className="h-2 w-full border overflow-hidden p-0.5"
                  style={{ backgroundColor: b.backgroundColor, borderColor: b.secondaryColor }}
                >
                  <div 
                    className="h-full transition-all duration-300"
                    style={{
                      width: '78%',
                      background: b.gradientCss || b.primaryColor
                    }}
                  />
                </div>
              </div>

              {/* Sandbox Buttons Row */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] font-bold font-mono transition-transform hover:scale-105"
                  style={{
                    background: b.gradientCss || b.primaryColor,
                    color: '#000000',
                    boxShadow: `0 0 12px ${b.glowShadow}`
                  }}
                >
                  VOTAR [A]
                </button>

                <button
                  type="button"
                  className="px-3 py-1.5 text-[11px] font-bold font-mono border transition-colors"
                  style={{
                    backgroundColor: b.backgroundColor,
                    borderColor: b.borderColor,
                    color: '#FFFFFF'
                  }}
                >
                  INFO PASAPORTE
                </button>
              </div>
            </div>

            {/* Sandbox Gamification XP Badge */}
            <div 
              className="p-2.5 border flex items-center justify-between text-xs"
              style={{
                backgroundColor: b.cardBgColor,
                borderColor: b.secondaryColor
              }}
            >
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4" style={{ color: b.primaryColor }} />
                <span className="text-slate-300">Puntaje Gamificado:</span>
              </div>
              <span className="font-black font-['Orbitron',sans-serif]" style={{ color: b.primaryColor }}>
                +350 XP
              </span>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
