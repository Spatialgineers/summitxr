import React, { useState, useEffect } from 'react';
import { 
  VisualizerPreset, 
  VisualizerPresetId, 
  ShaderKeyType, 
  ParticleBehaviorType, 
  CoreGeometryType 
} from '../../types/engine';
import { 
  getAllPresets, 
  saveCustomPreset, 
  deleteCustomPreset, 
  DEFAULT_PRESET, 
  exportPresetsJSON, 
  importPresetsJSON 
} from '../../lib/presets';
import { 
  BUILTIN_PARTICLE_SPRITES, 
  BUILTIN_3D_SAMPLES,
  BUILTIN_BG_SAMPLES,
  preloadAllPresetAssets, 
  subscribePreloadProgress, 
  getPreloadStatus, 
  PreloadProgress 
} from '../../lib/assetCache';
import { StageVisualizer } from '../visualizer/StageVisualizer';
import { 
  Sparkles, 
  Radio, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  Upload, 
  Layers, 
  Zap, 
  Flame, 
  Cpu, 
  Eye, 
  Box, 
  Maximize2, 
  RefreshCw, 
  HardDrive, 
  Check, 
  AlertCircle,
  Sliders,
  Image,
  Globe
} from 'lucide-react';

interface FXPresetsStudioProps {
  activeStagePresetId: VisualizerPresetId;
  onTriggerPreset: (presetId: VisualizerPresetId) => void;
  tenantId?: string;
  eventId?: string;
  isSuperAdmin?: boolean;
}

export const FXPresetsStudio: React.FC<FXPresetsStudioProps> = ({
  activeStagePresetId,
  onTriggerPreset,
  tenantId = 'tenant_spatialgineers',
  eventId = 'event_live_main',
  isSuperAdmin = true,
}) => {
  const [allPresets, setAllPresets] = useState<Record<string, VisualizerPreset>>({});
  const [selectedPresetId, setSelectedPresetId] = useState<string>('preset_glitch_cyber');
  const [editingPreset, setEditingPreset] = useState<VisualizerPreset>(DEFAULT_PRESET);
  const [activeTab, setActiveTab] = useState<'IDENTITY' | 'UBERSHADER' | 'PARTICLES' | 'MODEL3D' | 'ENVIRONMENT'>('IDENTITY');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Preload status
  const [preloadStatus, setPreloadStatus] = useState<PreloadProgress>(getPreloadStatus());
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [liveTriggerSuccessMsg, setLiveTriggerSuccessMsg] = useState<string | null>(null);
  const [importCountMsg, setImportCountMsg] = useState<string | null>(null);

  // Load all presets on mount & listen to update events
  const refreshPresets = () => {
    const list = getAllPresets();
    setAllPresets(list);
    if (list[selectedPresetId]) {
      setEditingPreset(JSON.parse(JSON.stringify(list[selectedPresetId])));
    } else {
      const firstKey = Object.keys(list)[0] || 'preset_glitch_cyber';
      setSelectedPresetId(firstKey);
      setEditingPreset(JSON.parse(JSON.stringify(list[firstKey] || DEFAULT_PRESET)));
    }
  };

  useEffect(() => {
    refreshPresets();

    const handleUpdate = () => refreshPresets();
    window.addEventListener('sgx_presets_updated', handleUpdate);

    const unsubProgress = subscribePreloadProgress((p) => {
      setPreloadStatus(p);
    });

    return () => {
      window.removeEventListener('sgx_presets_updated', handleUpdate);
      unsubProgress();
    };
  }, []);

  // When selected preset changes
  const handleSelectPreset = (id: string) => {
    setSelectedPresetId(id);
    if (allPresets[id]) {
      setEditingPreset(JSON.parse(JSON.stringify(allPresets[id])));
    }
  };

  // Field change helper
  const handleFieldChange = (field: keyof VisualizerPreset, value: any) => {
    setEditingPreset((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Save preset to LocalStorage & trigger update
  const handleSavePreset = () => {
    saveCustomPreset(editingPreset);
    refreshPresets();
    setSaveSuccessMsg(`Preset "${editingPreset.name}" guardado exitosamente.`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Duplicate / Clone preset
  const handleClonePreset = () => {
    const newId = `preset_custom_${Date.now()}`;
    const cloned: VisualizerPreset = {
      ...editingPreset,
      id: newId,
      name: `${editingPreset.name} (Copia)`,
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveCustomPreset(cloned);
    refreshPresets();
    setSelectedPresetId(newId);
    setEditingPreset(cloned);
    setSaveSuccessMsg(`Copia creada: "${cloned.name}".`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Create new preset from scratch
  const handleCreateNew = () => {
    const newId = `preset_custom_${Date.now()}`;
    const fresh: VisualizerPreset = {
      id: newId,
      name: 'Nuevo UberShader FX',
      category: 'UberShaders',
      description: 'Preset visual personalizado con partículas y efectos en tiempo real',
      themeColor: '#00ffff',
      accentColor: '#ff007f',
      shaderKey: 'glitch',
      glitchIntensity: 0.6,
      warpSpeed: 1.5,
      distortionAmount: 1.5,
      bloomIntensity: 2.0,
      wireframe: true,
      coreGeometry: 'torus_knot',
      coreRotationSpeed: 1.5,
      cameraShake: 0.3,
      particleTextureUrl: BUILTIN_PARTICLE_SPRITES.spark.dataUri,
      particleShape: 'spark',
      particleDensity: 6000,
      particleSize: 0.16,
      particleSpeed: 1.5,
      particleBehavior: 'vortex_spiral',
      particleBlending: 'additive',
      isCustom: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    saveCustomPreset(fresh);
    refreshPresets();
    setSelectedPresetId(newId);
    setEditingPreset(fresh);
    setSaveSuccessMsg('Nuevo preset inicializado.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete custom preset
  const handleDeletePreset = (id: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el preset "${allPresets[id]?.name || id}"?`)) {
      deleteCustomPreset(id);
      refreshPresets();
    }
  };

  // Trigger live on stage
  const handleTriggerLive = (id: string) => {
    onTriggerPreset(id);
    setLiveTriggerSuccessMsg(`¡PRESET "${allPresets[id]?.name || id}" TRANSMITIDO EN VIVO A AUDIENCIA Y STAGE!`);
    setTimeout(() => setLiveTriggerSuccessMsg(null), 3500);
  };

  // Preload all assets
  const handlePreloadAll = async () => {
    setIsPreloading(true);
    const presetsList = Object.values(allPresets) as VisualizerPreset[];
    await preloadAllPresetAssets(presetsList);
    setIsPreloading(false);
  };

  // Export JSON
  const handleExportJSON = () => {
    const json = exportPresetsJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sgx_fx_presets_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const count = importPresetsJSON(content);
      refreshPresets();
      setImportCountMsg(`Se importaron exitosamente ${count} presets.`);
      setTimeout(() => setImportCountMsg(null), 3000);
    };
    reader.readAsText(file);
  };

  // Filtered preset list
  const filteredPresets = (Object.values(allPresets) as VisualizerPreset[]).filter((p: VisualizerPreset) => {
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shaderKey.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-5 font-mono text-slate-200">
      
      {/* Top Banner & Ecosystem Preload Bar */}
      <div className="bg-[var(--sgx-bg)] border-2 border-[var(--sgx-secondary)] p-4 shadow-xl relative overflow-hidden" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded bg-[var(--sgx-neon)]/10 border border-[var(--sgx-neon)] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[var(--sgx-neon)]" />
              </div>
              <div>
                <h1 className="text-base md:text-lg font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-wider">
                  FX Presets & UberShaders Studio
                </h1>
                <p className="text-xs text-[#888888]">
                  Motor de efectos 3D, glitches, warps relativistas, instancias de partículas y precarga offline
                </p>
              </div>
            </div>
          </div>

          {/* Micro-Payload Architecture Status */}
          <div className="flex flex-wrap items-center gap-2.5 bg-[#121212] border border-[var(--sgx-secondary)]/80 px-3.5 py-2">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-[var(--sgx-neon)]" />
              <div>
                <div className="text-[10px] uppercase text-[#888888] font-bold">ECOSISTEMA PRELOADED</div>
                <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                  <span className="text-[#FDCC0D] font-bold">
                    {preloadStatus.loaded}/{preloadStatus.total || 8} ASSETS CACHED ({Math.round(preloadStatus.cachedBytes / 1024)} KB)
                  </span>
                  {preloadStatus.isComplete ? (
                    <span className="text-[10px] bg-amber-950 text-[#FDCC0D] border border-[#FDCC0D] px-1.5 py-0.2 font-bold">
                      100% LISTO
                    </span>
                  ) : (
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-500 px-1.5 py-0.2 animate-pulse">
                      CARGANDO {preloadStatus.percentage}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={handlePreloadAll}
              disabled={isPreloading}
              className="sgx-btn-cyan py-1.5 px-3 text-[10px] font-bold flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isPreloading ? 'animate-spin' : ''}`} />
              <span>PRECARGAR TODO LOCAL</span>
            </button>
          </div>

        </div>

        {/* Informative Micro-Payload Box */}
        <div className="mt-3 pt-2.5 border-t border-[var(--sgx-secondary)]/40 text-[11px] text-slate-400 flex items-start space-x-2">
          <Zap className="w-4 h-4 text-[var(--sgx-accent)] shrink-0 mt-0.5" />
          <span>
            <strong className="text-white">Arquitectura Micro-Payload en Kilobytes:</strong> Todos los sprites SVG de partículas, shaders GLSL, modelos 3D y texturas se precargan y almacenan en <strong className="text-[var(--sgx-neon)]">IndexedDB local</strong>. En vivo, el Director solo envía micro-paquetes JSON (~0.2 KB) por WebSocket/Firestore para cambiar el visual de inmediato sin importar la latencia móvil de la persona.
          </span>
        </div>

        {/* Notifications */}
        {saveSuccessMsg && (
          <div className="mt-3 p-2 bg-amber-950/90 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-bold flex items-center space-x-2">
            <Check className="w-4 h-4 text-[#FDCC0D]" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {liveTriggerSuccessMsg && (
          <div className="mt-3 p-2 bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)] text-white text-xs font-bold flex items-center space-x-2 animate-pulse">
            <Radio className="w-4 h-4 text-[var(--sgx-neon)]" />
            <span>{liveTriggerSuccessMsg}</span>
          </div>
        )}

        {importCountMsg && (
          <div className="mt-3 p-2 bg-blue-950/90 border border-blue-500 text-blue-300 text-xs font-bold flex items-center space-x-2">
            <Check className="w-4 h-4 text-blue-400" />
            <span>{importCountMsg}</span>
          </div>
        )}
      </div>

      {/* Main Grid Layout: Interactive 3D Simulator + Presets Drawer + Parameter Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        
        {/* Left Column: Preset Catalog & Filter (4 cols) */}
        <div className="xl:col-span-4 space-y-3">
          
          <div className="sgx-panel space-y-3">
            
            {/* Header & Quick Action Buttons */}
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-white uppercase">
                <Layers className="w-4 h-4 text-[var(--sgx-accent)]" />
                <span>Presets Disponibles ({filteredPresets.length})</span>
              </div>
              <button
                onClick={handleCreateNew}
                className="sgx-btn py-1 px-2.5 text-[10px] font-bold flex items-center space-x-1"
              >
                <Plus className="w-3 h-3" />
                <span>NUEVO PRESET</span>
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[10px]">
              {['ALL', 'UberShaders', 'Cyber', 'Cosmic', 'Elements', 'Abstract'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 font-bold whitespace-nowrap transition-all ${
                    categoryFilter === cat
                      ? 'bg-[var(--sgx-neon)] text-black'
                      : 'bg-[#121212] text-slate-400 hover:text-white border border-[var(--sgx-secondary)]/40'
                  }`}
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar presets, glitches, warps, shaders..."
                className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-[var(--sgx-neon)]"
              />
            </div>

            {/* Presets Cards List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredPresets.map((preset) => {
                const isSelected = preset.id === selectedPresetId;
                const isLiveOnStage = preset.id === activeStagePresetId;

                return (
                  <div
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`p-3 border transition-all cursor-pointer relative ${
                      isSelected 
                        ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/10 shadow-lg shadow-[var(--sgx-neon)]/10' 
                        : 'border-[var(--sgx-secondary)]/50 bg-[#121212] hover:border-[var(--sgx-secondary)] hover:bg-[var(--sgx-bg)]'
                    }`}
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center space-x-1.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: preset.themeColor || '#00ffff' }} 
                        />
                        <span className="font-bold text-white text-xs">{preset.name}</span>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {isLiveOnStage && (
                          <span className="bg-red-950 text-red-400 border border-red-500 text-[9px] font-bold px-1.5 py-0.2 animate-pulse flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                            <span>EN VIVO</span>
                          </span>
                        )}
                        <span className="text-[#888888] uppercase text-[9px]">{preset.category}</span>
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                      {preset.description}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between border-t border-[var(--sgx-secondary)]/30 pt-2 text-[10px]">
                      <div className="flex items-center space-x-2 text-[#888888]">
                        <span>Shader: <strong className="text-[var(--sgx-neon)]">{preset.shaderKey}</strong></span>
                        <span>•</span>
                        <span>Partículas: <strong className="text-white">{preset.particleDensity}</strong></span>
                      </div>

                      {/* Action buttons inside card */}
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTriggerLive(preset.id);
                          }}
                          title="Transmitir este preset en vivo al escenario"
                          className="px-2 py-1 bg-[var(--sgx-neon)]/10 hover:bg-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:text-black border border-[var(--sgx-neon)]/50 text-[10px] font-bold transition-all flex items-center space-x-1"
                        >
                          <Radio className="w-3 h-3" />
                          <span>EN VIVO</span>
                        </button>
                        
                        {preset.isCustom && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePreset(preset.id);
                            }}
                            title="Eliminar preset personalizado"
                            className="p-1 text-red-400 hover:text-white hover:bg-red-950 border border-red-500/40"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Import / Export JSON tools */}
            <div className="pt-2 border-t border-[var(--sgx-secondary)] flex items-center justify-between gap-2">
              <button
                onClick={handleExportJSON}
                className="sgx-btn py-1.5 px-3 text-[10px] font-bold flex items-center space-x-1 w-1/2 justify-center"
              >
                <Download className="w-3 h-3" />
                <span>EXPORTAR JSON</span>
              </button>

              <label className="sgx-btn-cyan py-1.5 px-3 text-[10px] font-bold flex items-center space-x-1 w-1/2 justify-center cursor-pointer">
                <Upload className="w-3 h-3" />
                <span>IMPORTAR JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>
            </div>

          </div>

        </div>

        {/* Right Column: Live 3D Viewport Simulator + Parameter Editor (8 cols) */}
        <div className="xl:col-span-8 space-y-4">
          
          {/* 3D WebGL Live Stage Viewport Simulator */}
          <div className="sgx-panel p-0 overflow-hidden relative border-2 border-[var(--sgx-neon)]/50 shadow-2xl">
            <div className="h-[280px] md:h-[340px] w-full relative bg-black">
              <StageVisualizer
                presetId={editingPreset.id}
                customPresetOverride={editingPreset}
                sessionStatus="VOTING_ACTIVE"
                timeRemaining={24}
                totalDuration={30}
                isMasterCanvasOnly={true}
              />

              {/* Viewport Floating HUD Overlay */}
              <div className="absolute top-3 left-3 z-30 bg-[#121212]/90 border border-[var(--sgx-secondary)] px-3 py-1.5 text-[10px] font-mono backdrop-blur-md">
                <div className="text-[var(--sgx-neon)] font-bold uppercase flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#FDCC0D] animate-pulse" />
                  <span>SIMULADOR 3D EN TIEMPO REAL • 60 FPS</span>
                </div>
                <div className="text-slate-400">
                  Visualizando: <span className="text-white font-bold">{editingPreset.name}</span>
                </div>
              </div>

              {/* Viewport Top Right: Big Broadcast Trigger */}
              <div className="absolute top-3 right-3 z-30 flex items-center space-x-2">
                <button
                  onClick={() => handleTriggerLive(editingPreset.id)}
                  className="px-4 py-2 bg-gradient-to-r from-red-600 to-[var(--sgx-neon)] text-white font-mono font-bold text-xs uppercase shadow-xl hover:opacity-90 flex items-center space-x-2 transition-all"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Radio className="w-4 h-4 text-[var(--sgx-accent)] animate-pulse" />
                  <span>ACTIVAR EN VIVO EN EL ESCENARIO</span>
                </button>
              </div>

              {/* Viewport Bottom Specs Bar */}
              <div className="absolute bottom-3 left-3 right-3 z-30 bg-[#121212]/85 border border-[var(--sgx-secondary)]/80 px-3 py-1.5 text-[10px] flex flex-wrap items-center justify-between gap-2 backdrop-blur-md">
                <div className="flex items-center space-x-3 text-slate-300">
                  <span>Shader: <strong className="text-[var(--sgx-neon)]">{editingPreset.shaderKey}</strong></span>
                  <span>Geometría: <strong className="text-[var(--sgx-accent)]">{editingPreset.coreGeometry || 'icosahedron'}</strong></span>
                  <span>Flujo: <strong className="text-white">{editingPreset.particleBehavior || 'ambient'}</strong></span>
                </div>
                <div className="text-[#FDCC0D] font-bold">
                  Latencia de Cambio: &lt; 12ms (Asset Preloaded)
                </div>
              </div>
            </div>
          </div>

          {/* Preset Customization Tabs & Parameter Panels */}
          <div className="sgx-panel space-y-4">
            
            {/* Editor Sub-tabs */}
            <div className="flex items-center space-x-2 border-b border-[var(--sgx-secondary)] pb-2 overflow-x-auto text-xs">
              {[
                { id: 'IDENTITY', label: '1. IDENTIDAD & COLORES', icon: Sliders },
                { id: 'UBERSHADER', label: '2. UBERSHADER, GLITCH & WARP', icon: Zap },
                { id: 'PARTICLES', label: '3. ENLACES & PARTÍCULAS', icon: Sparkles },
                { id: 'MODEL3D', label: '4. MODELO 3D (GLB/OBJ)', icon: Box },
                { id: 'ENVIRONMENT', label: '5. FONDO & LOGO 2D', icon: Image },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 font-bold whitespace-nowrap transition-all ${
                      isActive
                        ? 'sgx-btn-cyan shadow-md shadow-[var(--sgx-neon)]/20'
                        : 'text-[#888888] hover:text-white bg-[#121212] border border-[var(--sgx-secondary)]/40'
                    }`}
                    style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: IDENTITY & PALETTE */}
            {activeTab === 'IDENTITY' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Nombre del Preset</label>
                    <input
                      type="text"
                      value={editingPreset.name}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white text-xs focus:outline-none focus:border-[var(--sgx-neon)]"
                      placeholder="e.g. Hyperdrive Matrix Core"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Categoría</label>
                    <select
                      value={editingPreset.category}
                      onChange={(e) => handleFieldChange('category', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-[var(--sgx-accent)] text-xs focus:outline-none focus:border-[var(--sgx-neon)]"
                    >
                      <option value="UberShaders">UberShaders</option>
                      <option value="Cyber">Cyber</option>
                      <option value="Cosmic">Cosmic</option>
                      <option value="Elements">Elements</option>
                      <option value="Abstract">Abstract</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-[#888888] uppercase block mb-1">Descripción del Efecto</label>
                  <textarea
                    value={editingPreset.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    rows={2}
                    className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white text-xs focus:outline-none focus:border-[var(--sgx-neon)] resize-none"
                    placeholder="Describe los efectos visuales y el impacto que tendrá en el escenario..."
                  />
                </div>

                {/* Color Palette Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Color Primario / Núcleo</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={editingPreset.themeColor}
                        onChange={(e) => handleFieldChange('themeColor', e.target.value)}
                        className="w-10 h-10 bg-transparent border-[var(--sgx-neon)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingPreset.themeColor}
                        onChange={(e) => handleFieldChange('themeColor', e.target.value)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Color Secundario / Emisivo</label>
                    <div className="flex items-center space-x-3">
                      <input
                        type="color"
                        value={editingPreset.accentColor}
                        onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                        className="w-10 h-10 bg-transparent border-[var(--sgx-neon)] cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingPreset.accentColor}
                        onChange={(e) => handleFieldChange('accentColor', e.target.value)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: UBERSHADER, GLITCH & WARP */}
            {activeTab === 'UBERSHADER' && (
              <div className="space-y-4">
                
                {/* Shader Pipeline Selector */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <label className="text-[10px] text-[var(--sgx-neon)] uppercase font-bold block mb-1">
                    Pipeline de Shader & Algoritmo de Renderizado
                  </label>
                  <select
                    value={editingPreset.shaderKey}
                    onChange={(e) => handleFieldChange('shaderKey', e.target.value)}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-[var(--sgx-accent)] text-xs font-bold"
                  >
                    <option value="glitch">👾 Cyberpunk Glitch & Aberración Cromática (RGB Split)</option>
                    <option value="warp">🚀 Hyperspace Relativistic Warp Tunnel (Velocidad Luz)</option>
                    <option value="matrix">🟢 Neural Matrix Digital Stream Rain</option>
                    <option value="volcano">🔥 Inferno Magma Vortex & Convective Lava</option>
                    <option value="vortex">🔮 Singularity Quantum Black Hole Swirl</option>
                    <option value="plasma">⚡ Tesla High-Voltage Plasma Bloom & Rayos</option>
                    <option value="aurora">💎 Prismatic Quartz Crystal & Organic Aurora Waves</option>
                    <option value="grid">🕹️ Synthwave Wireframe Horizon & Neon Sun</option>
                    <option value="ubershader">✨ Master SGX Multi-Pass Hologram UberShader</option>
                  </select>
                </div>

                {/* Glitch & Warp FX Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Glitch Intensity */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Intensidad de Glitch (RGB Split):</span>
                      <span className="text-[var(--sgx-neon)] font-bold">{Math.round((editingPreset.glitchIntensity || 0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={editingPreset.glitchIntensity || 0}
                      onChange={(e) => handleFieldChange('glitchIntensity', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                    />
                    <span className="text-[9px] text-[#888888] block mt-1">
                      Controla el desplazamiento de canales cromáticos y strobe jitter en pantalla.
                    </span>
                  </div>

                  {/* Warp Speed */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Velocidad Relativista Warp:</span>
                      <span className="text-[var(--sgx-accent)] font-bold">{(editingPreset.warpSpeed || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={editingPreset.warpSpeed || 1.0}
                      onChange={(e) => handleFieldChange('warpSpeed', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                    />
                    <span className="text-[9px] text-[#888888] block mt-1">
                      Aceleración de estrellas en túnel hiperspacial y distorsión FOV.
                    </span>
                  </div>

                  {/* Distortion Amount */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Distorsión de Ruido de Vértices:</span>
                      <span className="text-[#FDCC0D] font-bold">{(editingPreset.distortionAmount || 1.0).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="3.0"
                      step="0.1"
                      value={editingPreset.distortionAmount || 1.0}
                      onChange={(e) => handleFieldChange('distortionAmount', parseFloat(e.target.value))}
                      className="w-full accent-[#FDCC0D] cursor-pointer"
                    />
                  </div>

                  {/* Bloom Intensity */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Intensidad Bloom / Emisivo:</span>
                      <span className="text-amber-400 font-bold">{(editingPreset.bloomIntensity || 2.0).toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="4.0"
                      step="0.1"
                      value={editingPreset.bloomIntensity || 2.0}
                      onChange={(e) => handleFieldChange('bloomIntensity', parseFloat(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                </div>

                {/* Core Geometry Settings */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Geometría Central 3D</label>
                    <select
                      value={editingPreset.coreGeometry || 'icosahedron'}
                      onChange={(e) => handleFieldChange('coreGeometry', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-[var(--sgx-neon)] text-xs font-bold"
                    >
                      <option value="torus_knot">Torus Knot (Nudo Magnético)</option>
                      <option value="icosahedron">Icosaedro Cuántico</option>
                      <option value="sphere_sun">Sol Synthwave Esfera</option>
                      <option value="octahedron">Octaedro Prisma</option>
                      <option value="dodecahedron">Dodecaedro Singular</option>
                      <option value="torus_ring">Anillo Vórtice Toroidal</option>
                      <option value="cube_matrix">Cubo Matriz Digital</option>
                      <option value="none">Sin Geometría (Solo Partículas)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Velocidad Rotación Núcleo</label>
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.1"
                      value={editingPreset.coreRotationSpeed || 1.0}
                      onChange={(e) => handleFieldChange('coreRotationSpeed', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-accent)] cursor-pointer mt-2"
                    />
                  </div>

                  <div className="flex items-center space-x-3 pt-4">
                    <label className="flex items-center space-x-2 text-xs font-bold text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingPreset.wireframe !== false}
                        onChange={(e) => handleFieldChange('wireframe', e.target.checked)}
                        className="w-4 h-4 accent-[var(--sgx-neon)]"
                      />
                      <span>Modo Wireframe Holográfico</span>
                    </label>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: PARTICLE INSTANCE LINKS & BUILT-IN SPRITES */}
            {activeTab === 'PARTICLES' && (
              <div className="space-y-4">
                
                {/* Built-in Sprite Gallery (Click to Instant Link) */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase flex items-center space-x-1.5">
                      <Sparkles className="w-4 h-4 text-[var(--sgx-accent)]" />
                      <span>Galería de Sprites de Partículas Vectoriales (Precargados 100% Offline)</span>
                    </span>
                    <span className="text-[10px] text-[#FDCC0D] font-bold">Zero Network Overhead</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    {Object.entries(BUILTIN_PARTICLE_SPRITES).map(([key, sprite]) => {
                      const isLinked = editingPreset.particleTextureUrl === sprite.dataUri || (!editingPreset.particleTextureUrl && editingPreset.particleShape === key);

                      return (
                        <div
                          key={key}
                          onClick={() => {
                            handleFieldChange('particleTextureUrl', sprite.dataUri);
                            handleFieldChange('particleShape', key);
                          }}
                          className={`p-2 border transition-all cursor-pointer flex items-center space-x-2 ${
                            isLinked
                              ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 shadow-md shadow-[var(--sgx-neon)]/20'
                              : 'border-[var(--sgx-secondary)]/60 bg-[var(--sgx-bg)] hover:border-[var(--sgx-neon)]'
                          }`}
                        >
                          <img
                            src={sprite.dataUri}
                            alt={sprite.name}
                            className="w-7 h-7 shrink-0 bg-black/80 p-0.5 border border-slate-700"
                          />
                          <div className="overflow-hidden">
                            <div className="text-[11px] font-bold text-white truncate">{sprite.name}</div>
                            <div className="text-[9px] text-[#888888] truncate">{key.toUpperCase()}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Direct Particle Link URL Input */}
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <label className="text-[10px] text-[#888888] uppercase block mb-1">
                    Enlace / URL Personalizada para Textura de Partículas (PNG / SVG / Data URI)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={editingPreset.particleTextureUrl || ''}
                      onChange={(e) => handleFieldChange('particleTextureUrl', e.target.value)}
                      placeholder="https://ejemplo.com/particula_custom.png o data:image/svg+xml..."
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                    />
                    {editingPreset.particleTextureUrl && (
                      <img
                        src={editingPreset.particleTextureUrl}
                        alt="Particle Preview"
                        className="w-8 h-8 bg-black border border-[var(--sgx-neon)] p-0.5 shrink-0 object-contain"
                      />
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 block mt-1">
                    Cualquier enlace provisto se almacena en caché local la primera vez que se abre la app.
                  </span>
                </div>

                {/* Particle Flow Behavior & Sliders */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Flow Behavior */}
                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Comportamiento del Flujo de Partículas</label>
                    <select
                      value={editingPreset.particleBehavior || 'ambient_float'}
                      onChange={(e) => handleFieldChange('particleBehavior', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-[var(--sgx-neon)] text-xs font-bold"
                    >
                      <option value="vortex_spiral">🌀 Vórtice Espiral Gravitacional</option>
                      <option value="upward_fountain">🌋 Fuente Convectiva Eruptiva de Brasas</option>
                      <option value="tunnel_stream">🚀 Túnel Acelerado Hiperspacial (Relativista)</option>
                      <option value="matrix_fall">🟢 Lluvia Digital Matrix Vertical</option>
                      <option value="orbital_galaxy">🌌 Galaxia Orbital Doble Brazo</option>
                      <option value="shockwave_pulse">⭕ Expansión de Ondas de Choque Plasma</option>
                      <option value="ambient_float">✨ Polvo Armónico Flotante Ambiental</option>
                    </select>
                  </div>

                  {/* Blending Mode */}
                  <div>
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">Modo de Fusión (Blending)</label>
                    <select
                      value={editingPreset.particleBlending || 'additive'}
                      onChange={(e) => handleFieldChange('particleBlending', e.target.value)}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-[var(--sgx-accent)] text-xs font-bold"
                    >
                      <option value="additive">Additive (Brillo Máximo Neón)</option>
                      <option value="normal">Normal (Transparencia Alpha)</option>
                      <option value="multiply">Multiply (Sombra de Absorción)</option>
                    </select>
                  </div>

                  {/* Particle Count / Density */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Densidad / Cantidad de Partículas:</span>
                      <span className="text-[var(--sgx-neon)] font-bold">{editingPreset.particleDensity || 5000}</span>
                    </div>
                    <input
                      type="range"
                      min="500"
                      max="12000"
                      step="500"
                      value={editingPreset.particleDensity || 5000}
                      onChange={(e) => handleFieldChange('particleDensity', parseInt(e.target.value))}
                      className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                    />
                  </div>

                  {/* Particle Speed */}
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Velocidad de Movimiento:</span>
                      <span className="text-[var(--sgx-accent)] font-bold">{(editingPreset.particleSpeed || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={editingPreset.particleSpeed || 1.0}
                      onChange={(e) => handleFieldChange('particleSpeed', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                    />
                  </div>

                </div>

              </div>
            )}

            {/* TAB 4: 3D MODEL INSTANCE LINK */}
            {activeTab === 'MODEL3D' && (
              <div className="space-y-4">
                
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-3">
                  <div className="flex items-center space-x-2">
                    <Box className="w-4 h-4 text-[var(--sgx-neon)]" />
                    <span className="text-xs font-bold text-white uppercase">
                      Enlace de Modelo 3D por Instancia de Preset (.GLB / .GLTF / .OBJ)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Puedes enlazar un modelo 3D específico para este preset. Soporta URLs directas de modelos GLB/GLTF/OBJ, archivos locales IndexedDB, o modelos procedurales.
                  </p>

                  <div>
                    <span className="text-[10px] text-[var(--sgx-accent)] font-bold block mb-1 uppercase">Modelos 3D de Muestra Precargados (1-Click):</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {BUILTIN_3D_SAMPLES.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => handleFieldChange('model3dUrl', sample.url)}
                          className={`p-2 border text-left text-[11px] font-bold transition-all truncate ${
                            editingPreset.model3dUrl === sample.url
                              ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)] shadow-md shadow-[var(--sgx-neon)]/20'
                              : 'border-[var(--sgx-secondary)]/60 bg-[var(--sgx-bg)] text-slate-300 hover:border-[var(--sgx-neon)]'
                          }`}
                        >
                          {sample.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="text-[10px] text-[#888888] uppercase block mb-1">URL del Modelo 3D (Personalizado)</label>
                    <input
                      type="text"
                      value={editingPreset.model3dUrl || ''}
                      onChange={(e) => handleFieldChange('model3dUrl', e.target.value)}
                      placeholder="https://raw.githubusercontent.com/.../model.glb"
                      className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Escala del Modelo 3D:</span>
                      <span className="text-[var(--sgx-neon)] font-bold">{(editingPreset.modelScale || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="4.0"
                      step="0.1"
                      value={editingPreset.modelScale || 1.0}
                      onChange={(e) => handleFieldChange('modelScale', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-neon)] cursor-pointer"
                    />
                  </div>

                  <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-white font-bold">Velocidad de Rotación:</span>
                      <span className="text-[var(--sgx-accent)] font-bold">{(editingPreset.modelRotationSpeed || 1.0).toFixed(1)}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="4.0"
                      step="0.1"
                      value={editingPreset.modelRotationSpeed || 1.0}
                      onChange={(e) => handleFieldChange('modelRotationSpeed', parseFloat(e.target.value))}
                      className="w-full accent-[var(--sgx-accent)] cursor-pointer"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 5: ENVIRONMENT & 2D BRANDING */}
            {activeTab === 'ENVIRONMENT' && (
              <div className="space-y-4">
                
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <label className="text-[10px] text-[#888888] uppercase block mb-1">
                    Enlace de Fondo 2D / Textura de Entorno (URL)
                  </label>
                  <input
                    type="text"
                    value={editingPreset.backgroundUrl || ''}
                    onChange={(e) => handleFieldChange('backgroundUrl', e.target.value)}
                    placeholder="https://ejemplo.com/panorama_cyber.jpg"
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                  />
                  <span className="text-[9px] text-slate-400">
                    Si se deja vacío, utiliza el fondo oscuro de nebulosa nativo con fog volumétrico a 60fps.
                  </span>
                </div>

                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                  <label className="text-[10px] text-[#888888] uppercase block mb-1">
                    Enlace de Logo Holográfico Flotante (PNG con transparencia)
                  </label>
                  <input
                    type="text"
                    value={editingPreset.logoUrl || ''}
                    onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                    placeholder="https://ejemplo.com/logo_holograma.png"
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:outline-none focus:border-[var(--sgx-neon)]"
                  />
                </div>

              </div>
            )}

            {/* Footer Action Bar */}
            <div className="pt-3 border-t border-[var(--sgx-secondary)] flex flex-wrap items-center justify-between gap-3">
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSavePreset}
                  className="sgx-btn-cyan py-2 px-5 text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-[var(--sgx-neon)]/20"
                >
                  <Save className="w-4 h-4" />
                  <span>GUARDAR PRESET</span>
                </button>

                <button
                  onClick={handleClonePreset}
                  className="sgx-btn py-2 px-4 text-xs font-bold flex items-center space-x-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>DUPLICAR COMO NUEVO</span>
                </button>
              </div>

              <button
                onClick={() => handleTriggerLive(editingPreset.id)}
                className="px-5 py-2 bg-gradient-to-r from-red-600 to-[var(--sgx-neon)] hover:opacity-90 text-white font-mono font-bold text-xs uppercase shadow-xl flex items-center space-x-2 transition-all"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Radio className="w-4 h-4 text-[var(--sgx-accent)] animate-pulse" />
                <span>TRANSMITIR EN VIVO A AUDIENCIA Y STAGE</span>
              </button>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
