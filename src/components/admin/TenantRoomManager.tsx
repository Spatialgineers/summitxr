import React, { useState } from 'react';
import { 
  Layers, 
  Edit3, 
  Save, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Radio, 
  Sparkles, 
  Eye, 
  Sliders, 
  Palette, 
  FileCode, 
  Video, 
  Users, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Shield,
  Zap,
  Box,
  Globe
} from 'lucide-react';
import { Tenant, TenantPresetConfig, TenantRoom } from '../../types/engine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { INITIAL_TENANTS } from '../../lib/schemas';

const GEOMETRY_OPTIONS: Array<NonNullable<TenantPresetConfig['coreGeometry']>> = [
  'icosahedron', 'torus_knot', 'dodecahedron', 'crystal', 'cyber_ring', 'sphere', 'cube', 'octahedron'
];

const SHADER_OPTIONS: Array<NonNullable<TenantPresetConfig['shaderKey']>> = [
  'glitch', 'warp', 'volcano', 'matrix', 'vortex', 'plasma', 'holographic'
];

const PARTICLE_BEHAVIORS: Array<NonNullable<TenantPresetConfig['particleBehavior']>> = [
  'ambient_float', 'upward_fountain', 'vortex_spiral', 'shockwave_pulse', 'matrix_fall', 'tunnel_stream'
];

const DEFAULT_ROOMS_TEMPLATES: TenantRoom[] = [
  {
    id: 'room_main_stage',
    name: 'Main Broadcast Arena',
    type: 'MAIN_STAGE',
    status: 'LIVE',
    capacity: 2500,
    currentAttendees: 0,
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=SGX_SUMMIT',
    description: 'Escenario principal de transmisión con renderizado 3D y captura facial de avatar en vivo.'
  },
  {
    id: 'room_vip_lounge',
    name: 'VIP Backstage Lounge',
    type: 'VIP_LOUNGE',
    status: 'UPCOMING',
    capacity: 200,
    currentAttendees: 0,
    streamUrl: 'https://www.youtube.com/embed/live_stream?channel=SGX_VIP',
    description: 'Sala exclusiva para patrocinadores, speakers y acreditados de alto nivel.'
  },
  {
    id: 'room_breakout_1',
    name: 'Techno-Creative Workshop Pod',
    type: 'WORKSHOP_POD',
    status: 'OFF_AIR',
    capacity: 500,
    currentAttendees: 0,
    streamUrl: '',
    description: 'Mesa de discusión interactiva para desarrollo de Shaders, WebGL y Unreal Engine 5.'
  }
];

export const TenantRoomManager: React.FC = () => {
  const { tenant: activeGlobalTenant, selectTenant, tenants, updateTenant, addTenant, deleteTenant, resetTenantsToDefaults } = useTenantTheme();

  const [selectedTenantId, setSelectedTenantId] = useState<string>(activeGlobalTenant.id);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(() => {
    return tenants.find(t => t.id === activeGlobalTenant.id) || tenants[0] || null;
  });

  const [activeSubTab, setActiveSubTab] = useState<'METADATA' | 'PRESET_SHADERS' | 'BRANDING' | 'ASSETS' | 'ROOMS'>('METADATA');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Room editing state inside the modal/form
  const [editingRoom, setEditingRoom] = useState<TenantRoom | null>(null);

  const handleSelectTenantToEdit = (t: Tenant) => {
    setSelectedTenantId(t.id);
    setEditingTenant(JSON.parse(JSON.stringify(t))); // Deep copy
    setEditingRoom(null);
  };

  const showStatus = (msg: string) => {
    setSaveStatus(msg);
    setTimeout(() => setSaveStatus(null), 3500);
  };

  const handleSaveTenantChanges = async () => {
    if (!editingTenant) return;
    await updateTenant(editingTenant);
    showStatus(`¡Preset & Configuración guardados persistentemente para ${editingTenant.name}!`);
  };

  const handleActivateGlobal = () => {
    if (!editingTenant) return;
    selectTenant(editingTenant);
    showStatus(`¡${editingTenant.name} activado como el Vibe Global en tiempo real!`);
  };

  const handleCreateNewTenant = () => {
    const id = `tenant_custom_${Date.now()}`;
    const newTenant: Tenant = {
      id,
      name: 'NUEVA INSTANCIA SGX',
      slug: `custom-${Date.now().toString().slice(-4)}`,
      pillarId: 'SGX.SYNTHESIZE',
      vibe: 'Cyan & Magenta Cyber Vibe',
      description: 'Instancia personalizada configurable para nuevos salones o sub-eventos.',
      erraticRating: 3,
      presetId: 'preset_matrix_flow',
      branding: {
        primaryColor: '#00DDFF',
        secondaryColor: '#FF007F',
        accentColor: '#33FFFF',
        backgroundColor: '#0D0D0D',
        cardBgColor: '#1A1A1A',
        borderColor: '#00DDFF',
        neonHighlightColor: '#00DDFF',
        glowShadow: 'rgba(0, 221, 255, 0.4)',
        gradientCss: 'linear-gradient(135deg, #00DDFF 0%, #FF007F 100%)'
      },
      presetConfig: {
        coreGeometry: 'crystal',
        shaderKey: 'holographic',
        wireframe: true,
        particleBehavior: 'vortex_spiral',
        particleDensity: 6000,
        particleSpeed: 1.5,
        glitchIntensity: 0.2,
        bloomIntensity: 1.5,
        cameraShake: 0.1
      },
      rooms: DEFAULT_ROOMS_TEMPLATES
    };

    addTenant(newTenant);
    setEditingTenant(newTenant);
    setSelectedTenantId(newTenant.id);
    showStatus(`¡Nueva instancia creada: ${newTenant.name}!`);
  };

  const handleDeleteCurrentTenant = async () => {
    if (!editingTenant) return;
    if (INITIAL_TENANTS.some(t => t.id === editingTenant.id)) {
      showStatus('No se pueden eliminar las 6 instancias de pilares por defecto de SGX.');
      return;
    }
    if (confirm(`¿Estás seguro de eliminar la instancia ${editingTenant.name}?`)) {
      await deleteTenant(editingTenant.id);
      const remaining = tenants.filter(t => t.id !== editingTenant.id);
      if (remaining.length > 0) {
        setEditingTenant(remaining[0]);
        setSelectedTenantId(remaining[0].id);
      }
      showStatus('Instancia personalizada eliminada.');
    }
  };

  // Preset config updater helper
  const updatePresetField = (key: keyof TenantPresetConfig, val: any) => {
    if (!editingTenant) return;
    setEditingTenant({
      ...editingTenant,
      presetConfig: {
        ...(editingTenant.presetConfig || {}),
        [key]: val
      }
    });
  };

  // Branding updater helper
  const updateBrandingField = (key: keyof Tenant['branding'], val: any) => {
    if (!editingTenant) return;
    setEditingTenant({
      ...editingTenant,
      branding: {
        ...editingTenant.branding,
        [key]: val
      }
    });
  };

  // Room CRUD handlers inside current tenant
  const handleSaveRoom = () => {
    if (!editingTenant || !editingRoom) return;
    const currentRooms = editingTenant.rooms || [];
    const exists = currentRooms.some(r => r.id === editingRoom.id);
    const updatedRooms = exists
      ? currentRooms.map(r => r.id === editingRoom.id ? editingRoom : r)
      : [...currentRooms, editingRoom];

    setEditingTenant({
      ...editingTenant,
      rooms: updatedRooms
    });
    setEditingRoom(null);
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!editingTenant) return;
    const currentRooms = editingTenant.rooms || [];
    setEditingTenant({
      ...editingTenant,
      rooms: currentRooms.filter(r => r.id !== roomId)
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Notification Banner */}
      {saveStatus && (
        <div 
          className="p-3 bg-[#1C1C1C] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-mono text-xs flex items-center justify-between shadow-lg animate-in fade-in duration-200"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[var(--sgx-neon)]" />
            <span className="font-bold">{saveStatus}</span>
          </div>
          <span className="text-[10px] text-slate-400">FIRESTORE + LOCALSTORAGE PERSISTENCIA</span>
        </div>
      )}

      {/* Instance / Tenant Selector Bar */}
      <div 
        className="p-4 bg-[var(--sgx-card-bg)]/90 border border-[var(--sgx-secondary)] space-y-3"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Layers className="w-4 h-4 text-[var(--sgx-neon)]" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
                GESTOR DE INSTANCIAS, TENANTS Y SALONES (PRESET CMS)
              </h3>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Edita individualmente las 6 instancias de pilares SGX o crea salones personalizados. Configura shaders 3D, assets, paleta cromática y salones de transmisión con guardado persistente.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleCreateNewTenant}
              className="px-3 py-1.5 bg-[var(--sgx-neon)]/10 hover:bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-mono text-xs font-bold transition-all flex items-center space-x-1"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NUEVA INSTANCIA</span>
            </button>
            <button
              onClick={resetTenantsToDefaults}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 font-mono text-xs transition-all flex items-center space-x-1"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              title="Restablecer presets a valores de fábrica"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>RESET FÁBRICA</span>
            </button>
          </div>
        </div>

        {/* Tenant Selector Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 font-mono text-xs">
          {tenants.map(t => {
            const isSelected = editingTenant?.id === t.id;
            const isGlobalLive = activeGlobalTenant.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTenantToEdit(t)}
                className={`p-2.5 border text-left transition-all flex flex-col justify-between relative group ${
                  isSelected
                    ? 'bg-[#272727] border-[var(--sgx-neon)] text-white shadow-lg'
                    : 'bg-[#181818]/80 border-[var(--sgx-secondary)]/60 text-slate-300 hover:border-slate-400 hover:bg-[#1f1f1f]'
                }`}
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tracking-wider" style={{ color: t.branding.primaryColor }}>
                    {t.pillarId || t.slug.toUpperCase()}
                  </span>
                  {isGlobalLive && (
                    <span className="text-[8px] px-1 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] font-bold uppercase animate-pulse">
                      LIVE
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs truncate my-1">{t.name.split('—')[0]}</div>

                <div className="flex items-center space-x-1 text-[9px] text-slate-400">
                  <div 
                    className="w-2.5 h-2.5 shrink-0 border border-white/30" 
                    style={{ backgroundColor: t.branding.primaryColor }}
                  />
                  <span className="truncate">{t.branding.primaryColor}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Tenant Editor Drawer / Workspace */}
      {editingTenant && (
        <div 
          className="p-5 bg-[#1A1A1A]/95 border-2 border-[var(--sgx-secondary)] space-y-5"
          style={{ 
            borderColor: editingTenant.branding.primaryColor,
            clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' 
          }}
        >
          {/* Tenant Editor Top Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[var(--sgx-secondary)]/60 pb-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <div 
                  className="w-4 h-4 border border-white/40 shadow-md"
                  style={{ backgroundColor: editingTenant.branding.primaryColor }}
                />
                <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                  EDITANDO: {editingTenant.name}
                </h4>
                <span className="text-xs px-2 py-0.5 bg-[#252525] border border-cyan-400/50 text-cyan-300 font-mono">
                  ID: {editingTenant.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono">
                {editingTenant.vibe}
              </p>
            </div>

            {/* Global Actions for Active Tenant */}
            <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
              <button
                onClick={handleSaveTenantChanges}
                className="px-4 py-2 bg-[#FDCC0D]/20 hover:bg-[#FDCC0D]/30 border border-[#FDCC0D] text-[#FDCC0D] font-bold transition-all flex items-center space-x-1.5 shadow-md"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Save className="w-4 h-4 text-[#FDCC0D]" />
                <span>GUARDAR PRESET (PERSISTIR)</span>
              </button>

              <button
                onClick={handleActivateGlobal}
                className="px-4 py-2 bg-[var(--sgx-neon)]/20 hover:bg-[var(--sgx-neon)]/30 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-bold transition-all flex items-center space-x-1.5 shadow-md"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Radio className="w-4 h-4 text-[var(--sgx-neon)] animate-pulse" />
                <span>ACTIVAR VIBE GLOBAL</span>
              </button>

              {!INITIAL_TENANTS.some(def => def.id === editingTenant.id) && (
                <button
                  onClick={handleDeleteCurrentTenant}
                  className="px-3 py-2 bg-red-950/50 hover:bg-red-900/50 border border-red-500 text-red-300 font-bold transition-all flex items-center space-x-1"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Sub-Tabs Bar */}
          <div className="flex flex-wrap gap-1 border-b border-[var(--sgx-secondary)]/60 font-mono text-xs pb-1">
            {[
              { id: 'METADATA', label: '1. IDENTIDAD & SLUG', icon: FileCode },
              { id: 'PRESET_SHADERS', label: '2. PRESET 3D & SHADERS', icon: Box },
              { id: 'BRANDING', label: '3. PALETA DE BRANDING', icon: Palette },
              { id: 'ASSETS', label: '4. RECURSOS VISUALES', icon: Sliders },
              { id: 'ROOMS', label: `5. SALONES & BROADCAST (${(editingTenant.rooms || []).length})`, icon: Video },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as any)}
                  className={`px-3 py-2 border font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#282828] border-[var(--sgx-neon)] text-[var(--sgx-neon)]'
                      : 'bg-[#181818] border-slate-800 text-slate-400 hover:text-white hover:bg-[#222222]'
                  }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: METADATA & IDENTITY */}
          {activeSubTab === 'METADATA' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">NOMBRE DE INSTANCIA / PILAR:</label>
                <input
                  type="text"
                  value={editingTenant.name}
                  onChange={(e) => setEditingTenant({ ...editingTenant, name: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">PILAR ASIGNADO (IDENTIFICADOR):</label>
                <select
                  value={editingTenant.pillarId || 'SGX.STORY'}
                  onChange={(e) => setEditingTenant({ ...editingTenant, pillarId: e.target.value as any })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <option value="SGX.STORY">SGX.STORY (Narrativa & Lore)</option>
                  <option value="SGX.SHOWCASE">SGX.SHOWCASE (Showroom de Marcas)</option>
                  <option value="SGX.SPARK">SGX.SPARK (Gamificación & Lógica)</option>
                  <option value="SGX.STAGE">SGX.STAGE (Escenario Virtual en Vivo)</option>
                  <option value="SGX.SYSTEM">SGX.SYSTEM (Infraestructura de Bajo Nivel)</option>
                  <option value="SGX.SYNTHESIZE">SGX.SYNTHESIZE (Síntesis Spatialgineers)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">SLUG DE RUTA (/tenant/{editingTenant.slug}):</label>
                <input
                  type="text"
                  value={editingTenant.slug}
                  onChange={(e) => setEditingTenant({ ...editingTenant, slug: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">VIBE TAGLINE (DESCRIPCIÓN RÁPIDA):</label>
                <input
                  type="text"
                  value={editingTenant.vibe}
                  onChange={(e) => setEditingTenant({ ...editingTenant, vibe: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-300 font-bold">DESCRIPCIÓN EXTENDIDA DE LA INSTANCIA:</label>
                <textarea
                  rows={2}
                  value={editingTenant.description || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, description: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-bold">NIVEL CAÓTICO / ERRATIC RATING (1 A 6):</label>
                  <span className="text-[var(--sgx-neon)] font-bold">{editingTenant.erraticRating || 1} / 6</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={editingTenant.erraticRating || 1}
                  onChange={(e) => setEditingTenant({ ...editingTenant, erraticRating: parseInt(e.target.value) })}
                  className="w-full accent-[var(--sgx-neon)]"
                />
                <p className="text-[10px] text-slate-400">
                  Nivel 1: Vuelo calmo y fluido. Nivel 6: Strobes de alta frecuencia, efecto glitch agresivo y sacudidas de cámara espacial.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: PRESET 3D & SHADERS */}
          {activeSubTab === 'PRESET_SHADERS' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 3D Geometry */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">GEOMETRÍA NÚCLEO 3D:</label>
                  <select
                    value={editingTenant.presetConfig?.coreGeometry || 'icosahedron'}
                    onChange={(e) => updatePresetField('coreGeometry', e.target.value)}
                    className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {GEOMETRY_OPTIONS.map(g => (
                      <option key={g} value={g}>{g.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Shader Effect */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">EFECTO SHADER / MATERIAL:</label>
                  <select
                    value={editingTenant.presetConfig?.shaderKey || 'glitch'}
                    onChange={(e) => updatePresetField('shaderKey', e.target.value)}
                    className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {SHADER_OPTIONS.map(s => (
                      <option key={s} value={s}>{s.toUpperCase()}</option>
                    ))}
                  </select>
                </div>

                {/* Particle Behavior */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">COMPORTAMIENTO DE PARTÍCULAS:</label>
                  <select
                    value={editingTenant.presetConfig?.particleBehavior || 'ambient_float'}
                    onChange={(e) => updatePresetField('particleBehavior', e.target.value)}
                    className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {PARTICLE_BEHAVIORS.map(pb => (
                      <option key={pb} value={pb}>{pb.replace('_', ' ').toUpperCase()}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Sliders for Density, Speed, Glitch, Bloom, Camera Shake */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-[#121212] border border-[var(--sgx-secondary)]">
                
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">DENSIDAD DE PARTÍCULAS:</span>
                    <span className="text-[var(--sgx-neon)] font-bold">{editingTenant.presetConfig?.particleDensity || 5000}</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="15000"
                    step="500"
                    value={editingTenant.presetConfig?.particleDensity || 5000}
                    onChange={(e) => updatePresetField('particleDensity', parseInt(e.target.value))}
                    className="w-full accent-[var(--sgx-neon)]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">VELOCIDAD DE PARTÍCULAS:</span>
                    <span className="text-[var(--sgx-accent)] font-bold">{(editingTenant.presetConfig?.particleSpeed || 1.0).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={editingTenant.presetConfig?.particleSpeed || 1.0}
                    onChange={(e) => updatePresetField('particleSpeed', parseFloat(e.target.value))}
                    className="w-full accent-[var(--sgx-accent)]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">INTENSIDAD DE GLITCH:</span>
                    <span className="text-[#FDCC0D] font-bold">{Math.round((editingTenant.presetConfig?.glitchIntensity || 0.1) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={editingTenant.presetConfig?.glitchIntensity || 0.1}
                    onChange={(e) => updatePresetField('glitchIntensity', parseFloat(e.target.value))}
                    className="w-full accent-[#FDCC0D]"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">BLOOM / RESPLANDOR NEÓN:</span>
                    <span className="text-[#FDCC0D] font-bold">{(editingTenant.presetConfig?.bloomIntensity || 1.2).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={editingTenant.presetConfig?.bloomIntensity || 1.2}
                    onChange={(e) => updatePresetField('bloomIntensity', parseFloat(e.target.value))}
                    className="w-full accent-[#FDCC0D]"
                  />
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: BRANDING PALETTE */}
          {activeSubTab === 'BRANDING' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                
                {/* Primary Color */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <span className="text-slate-300 font-bold block">COLOR PRIMARIO:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editingTenant.branding.primaryColor}
                      onChange={(e) => updateBrandingField('primaryColor', e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-none"
                    />
                    <input
                      type="text"
                      value={editingTenant.branding.primaryColor}
                      onChange={(e) => updateBrandingField('primaryColor', e.target.value)}
                      className="w-full bg-[var(--sgx-card-bg)] border border-slate-700 p-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Secondary Color */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <span className="text-slate-300 font-bold block">COLOR SECUNDARIO:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editingTenant.branding.secondaryColor}
                      onChange={(e) => updateBrandingField('secondaryColor', e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-none"
                    />
                    <input
                      type="text"
                      value={editingTenant.branding.secondaryColor}
                      onChange={(e) => updateBrandingField('secondaryColor', e.target.value)}
                      className="w-full bg-[var(--sgx-card-bg)] border border-slate-700 p-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Accent Color */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <span className="text-slate-300 font-bold block">COLOR ACENTO:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editingTenant.branding.accentColor}
                      onChange={(e) => updateBrandingField('accentColor', e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-none"
                    />
                    <input
                      type="text"
                      value={editingTenant.branding.accentColor}
                      onChange={(e) => updateBrandingField('accentColor', e.target.value)}
                      className="w-full bg-[var(--sgx-card-bg)] border border-slate-700 p-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Border Color */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <span className="text-slate-300 font-bold block">COLOR DE BORDE NEÓN:</span>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={editingTenant.branding.borderColor}
                      onChange={(e) => updateBrandingField('borderColor', e.target.value)}
                      className="w-8 h-8 cursor-pointer bg-transparent border-none"
                    />
                    <input
                      type="text"
                      value={editingTenant.branding.borderColor}
                      onChange={(e) => updateBrandingField('borderColor', e.target.value)}
                      className="w-full bg-[var(--sgx-card-bg)] border border-slate-700 p-1 text-white text-xs font-mono"
                    />
                  </div>
                </div>

              </div>

              {/* Gradient Preview */}
              <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-1.5">
                <span className="text-slate-300 font-bold block">CSS GRADIENTE DE BRANDING:</span>
                <input
                  type="text"
                  value={editingTenant.branding.gradientCss || ''}
                  onChange={(e) => updateBrandingField('gradientCss', e.target.value)}
                  className="w-full bg-[var(--sgx-card-bg)] border border-slate-700 p-2 text-white font-mono text-xs"
                />
                <div 
                  className="h-6 w-full mt-2 border border-white/20"
                  style={{ background: editingTenant.branding.gradientCss || `linear-gradient(135deg, ${editingTenant.branding.primaryColor} 0%, ${editingTenant.branding.secondaryColor} 100%)` }}
                />
              </div>
            </div>
          )}

          {/* TAB 4: ASSETS & VISUAL FILES */}
          {activeSubTab === 'ASSETS' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
              
              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">URL LOGO DE LA INSTANCIA / TENANT:</label>
                <input
                  type="text"
                  placeholder="https://... o /public/logo.png"
                  value={editingTenant.logoUrl || ''}
                  onChange={(e) => setEditingTenant({ ...editingTenant, logoUrl: e.target.value })}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">URL HERO BANNER (IMAGEN DE CABECERA):</label>
                <input
                  type="text"
                  placeholder="https://images.unsplash.com/..."
                  value={editingTenant.branding.bannerUrl || ''}
                  onChange={(e) => updateBrandingField('bannerUrl', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">MODELO 3D PERSONALIZADO (GLTF / OBJET):</label>
                <input
                  type="text"
                  placeholder="model_drone / model_trophy / model_stage / https://..."
                  value={editingTenant.presetConfig?.model3dUrl || ''}
                  onChange={(e) => updatePresetField('model3dUrl', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-slate-300 font-bold">IMAGEN DE FONDO / SKYBOX 360°:</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={editingTenant.presetConfig?.backgroundUrl || ''}
                  onChange={(e) => updatePresetField('backgroundUrl', e.target.value)}
                  className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2.5 text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
              </div>

            </div>
          )}

          {/* TAB 5: ROOMS & BROADCAST INSTANCES */}
          {activeSubTab === 'ROOMS' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2">
                <h5 className="font-bold text-white uppercase">
                  SALONES Y INSTANCIAS DE TRANSMISIÓN DE {editingTenant.name}
                </h5>
                <button
                  onClick={() => setEditingRoom({
                    id: `room_${Date.now()}`,
                    name: 'Nuevo Salón de Transmisión',
                    type: 'BREAKOUT_ROOM',
                    status: 'UPCOMING',
                    capacity: 500,
                    currentAttendees: 0,
                    streamUrl: '',
                    description: 'Salón interactivo de transmisión.'
                  })}
                  className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400 text-cyan-300 font-bold transition-all flex items-center space-x-1"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>AÑADIR SALÓN</span>
                </button>
              </div>

              {/* Rooms Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(editingTenant.rooms || DEFAULT_ROOMS_TEMPLATES).map(room => (
                  <div
                    key={room.id}
                    className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2 relative group hover:border-[var(--sgx-neon)] transition-all"
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{room.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 font-bold uppercase ${
                        room.status === 'LIVE' 
                          ? 'bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D] animate-pulse' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {room.status}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-400">{room.description}</p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800 pt-1.5">
                      <span>TIPO: {room.type}</span>
                      <span>AFORO: {room.currentAttendees} / {room.capacity}</span>
                    </div>

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        onClick={() => setEditingRoom(room)}
                        className="px-2 py-1 bg-[var(--sgx-card-bg)] hover:bg-[#282828] border border-cyan-400 text-cyan-300 text-[10px] font-bold"
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        EDITAR SALÓN
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 border border-red-500 text-red-300 text-[10px]"
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      >
                        ELIMINAR
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Room Edit Modal */}
              {editingRoom && (
                <div className="p-4 bg-[#1E1E1E] border-2 border-cyan-400 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                    <span className="font-bold text-white">CONFIGURAR SALÓN / INSTANCIA DE TRANSMISIÓN</span>
                    <button onClick={() => setEditingRoom(null)} className="text-slate-400 hover:text-white">✕</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold">NOMBRE DEL SALÓN:</label>
                      <input
                        type="text"
                        value={editingRoom.name}
                        onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold">ESTADO DE TRANSMISIÓN:</label>
                      <select
                        value={editingRoom.status}
                        onChange={(e) => setEditingRoom({ ...editingRoom, status: e.target.value as any })}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      >
                        <option value="LIVE">LIVE (En Vivo Ahora)</option>
                        <option value="UPCOMING">UPCOMING (Próxima Sesión)</option>
                        <option value="OFF_AIR">OFF_AIR (Fuera de Aire)</option>
                      </select>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-slate-300 font-bold">URL DE TRANSMISIÓN / EMBED (YOUTUBE / TWITCH / HLSL):</label>
                      <input
                        type="text"
                        placeholder="https://www.youtube.com/embed/..."
                        value={editingRoom.streamUrl || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, streamUrl: e.target.value })}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white font-mono text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-300 font-bold">¿SALÓN GLOBAL?</label>
                      <div className="flex items-center space-x-2 h-[34px]">
                        <input
                          type="checkbox"
                          id="isGlobalRoom"
                          checked={editingRoom.isGlobal || false}
                          onChange={(e) => setEditingRoom({ ...editingRoom, isGlobal: e.target.checked })}
                          className="w-4 h-4"
                        />
                        <label htmlFor="isGlobalRoom" className="text-xs text-slate-300 cursor-pointer">
                          Aparece en todos los Tenants
                        </label>
                      </div>
                    </div>

                    <div className="space-y-1 md:col-span-2">
                      <label className="text-slate-300 font-bold">DESCRIPCIÓN DEL SALÓN:</label>
                      <input
                        type="text"
                        value={editingRoom.description || ''}
                        onChange={(e) => setEditingRoom({ ...editingRoom, description: e.target.value })}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setEditingRoom(null)}
                      className="px-3 py-1.5 bg-slate-800 text-slate-300"
                    >
                      CANCELAR
                    </button>
                    <button
                      onClick={handleSaveRoom}
                      className="px-4 py-1.5 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] font-bold"
                    >
                      GUARDAR SALÓN EN TENANT
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  );
};
