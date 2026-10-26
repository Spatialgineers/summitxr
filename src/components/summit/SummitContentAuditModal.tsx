import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  EyeOff,
  Eye,
  Search,
  Sliders,
  RefreshCw,
  X,
  FileCheck,
  Database,
  Users,
  Layers,
} from 'lucide-react';
import { useSummitFeatures, FeatureToggleItem } from '../../context/SummitFeatureContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

export const SummitContentAuditModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    features,
    updateFeatureStatus,
    bulkUpdateCategoryStatus,
    resetToDefaults,
  } = useSummitFeatures();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<
    'ALL' | 'SECTIONS' | 'HUB_MODULES' | 'MODALS' | 'EXPERIENCES'
  >('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'DISABLED'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickAuditTab, setQuickAuditTab] = useState<'TOGGLES' | 'AUDIT_REPORT'>('TOGGLES');

  if (!isOpen) return null;

  const featureList: FeatureToggleItem[] = Object.values(features);

  const filteredFeatures = featureList.filter((f) => {
    if (activeCategoryFilter !== 'ALL' && f.category !== activeCategoryFilter) return false;
    if (activeStatusFilter !== 'ALL' && f.status !== activeStatusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.pillar && f.pillar.toLowerCase().includes(q)) ||
        f.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalFeatures = featureList.length;
  const activeCount = featureList.filter((f) => f.status === 'ACTIVE').length;
  const maintenanceCount = featureList.filter((f) => f.status === 'MAINTENANCE').length;
  const disabledCount = featureList.filter((f) => f.status === 'DISABLED').length;

  const categoryLabels: Record<string, string> = {
    ALL: 'Todos',
    SECTIONS: 'Secciones / Tabs',
    HUB_MODULES: 'Núcleo 3D / Sub-Módulos',
    MODALS: 'Modales / Portales',
    EXPERIENCES: 'Widgets / Flotantes',
  };

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#0D0D0D] border-2 border-[#00DDFF] shadow-[0_0_50px_rgba(0, 221, 255,0.25)] overflow-hidden"
        style={{
          clipPath:
            'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#121212] border-b border-[#32527B]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#00DDFF]/10 border border-[#00DDFF] text-[#00DDFF]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2 py-0.5 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D]">
                  SGX MODULE VISIBILITY CONTROL
                </span>
                <span className="text-[10px] font-mono text-[#00DDFF]">
                  ● Sincronización en Vivo (Firestore + Local)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wide mt-0.5">
                Gestor de Visibilidad de Módulos, Secciones & Experiencias
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => {
                playUiChirp(520);
                resetToDefaults();
              }}
              className="px-3 py-1.5 bg-[#1B1B1B] hover:bg-[#FDCC0D] hover:text-black border border-[#FDCC0D]/60 text-[#FDCC0D] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restaurar todos los módulos a su estado visible por defecto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Mostrar Todos</span>
            </button>
            <button
              type="button"
              onClick={() => {
                playUiChirp(400);
                onClose();
              }}
              className="p-2 text-slate-300 hover:text-black bg-[#1B1B1B] hover:bg-[#FFBB00] border border-white/20 hover:border-[#FFBB00] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Highlights & Tab bar */}
        <div className="px-4 py-3 bg-[#0B0B0B] border-b border-[#32527B]/50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 bg-[#00DDFF]/10 border border-[#00DDFF]/60 text-[#00DDFF] font-bold flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5" />
              <span>{activeCount} Visibles / Activos</span>
            </span>
            <span className="px-2.5 py-1 bg-[#FDCC0D]/15 border border-[#FDCC0D]/60 text-[#FDCC0D] font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{maintenanceCount} En Construcción (Próximamente)</span>
            </span>
            <span className="px-2.5 py-1 bg-[#FFBB00]/15 border border-[#FFBB00]/70 text-[#FFBB00] font-bold flex items-center gap-1.5">
              <EyeOff className="w-3.5 h-3.5" />
              <span>{disabledCount} Ocultos</span>
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#121212] p-1 border border-[#32527B]/60">
            <button
              type="button"
              onClick={() => {
                playUiChirp(600);
                setQuickAuditTab('TOGGLES');
              }}
              className={`px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                quickAuditTab === 'TOGGLES'
                  ? 'bg-[#00DDFF] text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ocultar / Mostrar Módulos ({totalFeatures})
            </button>
            <button
              type="button"
              onClick={() => {
                playUiChirp(600);
                setQuickAuditTab('AUDIT_REPORT');
              }}
              className={`px-3 py-1 text-xs font-mono font-bold transition-all cursor-pointer ${
                quickAuditTab === 'AUDIT_REPORT'
                  ? 'bg-[#FDCC0D] text-black shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Auditoría de Assets Reales
            </button>
          </div>
        </div>

        {/* Filters & Search */}
        {quickAuditTab === 'TOGGLES' && (
          <div className="p-3 sm:p-4 bg-[#0F0F0F] border-b border-[#32527B]/50 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar módulo, pestaña, pilar o modal (ej. Match, Dron, Speakers, Salas)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-[#090909] border border-[#32527B] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00DDFF] font-mono"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto justify-start md:justify-end">
                {(['ALL', 'ACTIVE', 'MAINTENANCE', 'DISABLED'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      playUiChirp(650);
                      setActiveStatusFilter(st);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${
                      activeStatusFilter === st
                        ? 'bg-[#FDCC0D] text-black border border-[#FDCC0D]'
                        : 'bg-[#121212] text-slate-300 hover:text-white border border-[#32527B]/60'
                    }`}
                  >
                    {st === 'ALL' && 'Todos'}
                    {st === 'ACTIVE' && 'Visibles'}
                    {st === 'MAINTENANCE' && 'En Construcción'}
                    {st === 'DISABLED' && 'Ocultos'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'SECTIONS', 'HUB_MODULES', 'MODALS', 'EXPERIENCES'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      playUiChirp(650);
                      setActiveCategoryFilter(cat);
                    }}
                    className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase transition-colors whitespace-nowrap cursor-pointer ${
                      activeCategoryFilter === cat
                        ? 'bg-[#32527B] text-white border border-[#00DDFF]'
                        : 'bg-[#121212] text-slate-400 hover:text-white border border-white/10'
                    }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>

              {activeCategoryFilter !== 'ALL' && (
                <div className="flex items-center gap-1.5 text-[10px] font-mono">
                  <span className="text-slate-400">Acción en lote ({categoryLabels[activeCategoryFilter]}):</span>
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(740);
                      bulkUpdateCategoryStatus(activeCategoryFilter, 'ACTIVE');
                    }}
                    className="px-2 py-0.5 bg-[#00DDFF]/15 hover:bg-[#00DDFF] hover:text-black border border-[#00DDFF]/60 text-[#00DDFF] font-bold transition-colors cursor-pointer"
                  >
                    Mostrar Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(420);
                      bulkUpdateCategoryStatus(activeCategoryFilter, 'DISABLED');
                    }}
                    className="px-2 py-0.5 bg-[#FFBB00]/15 hover:bg-[#FFBB00] hover:text-black border border-[#FFBB00]/60 text-[#FFBB00] font-bold transition-colors cursor-pointer"
                  >
                    Ocultar Todos
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {quickAuditTab === 'AUDIT_REPORT' ? (
            <div className="space-y-6">
              <div className="p-4 bg-[#131313] border-2 border-[#00DDFF]/40 space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00DDFF] uppercase">
                  <FileCheck className="w-4 h-4" />
                  <span>AUDITORÍA DE CONTENIDO: VERIFICAR CONTRA EL DOCUMENTO MAESTRO v2026.10.1</span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">
                  El contenido público debe coincidir con el Documento Maestro y el Run of Show v2026.10.1. Los perfiles de muestra y las simulaciones están marcados como datos simulados. Puedes ocultar cualquier sección o módulo que aún esté en preparación usando la pestaña <strong>Ocultar / Mostrar Módulos</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#121212] border border-[#32527B]/60 space-y-3">
                  <h3 className="text-sm font-bold text-[#FDCC0D] font-mono uppercase flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    <span>Assets de Marca & CDN Oficial</span>
                  </h3>
                  <ul className="text-xs text-slate-300 space-y-2 font-mono">
                    <li className="flex items-center justify-between p-2 bg-[#0B0B0B] border border-white/10">
                      <span>Logo Spatialgineers:</span>
                      <span className="text-[#00DDFF] font-bold">CDN Conectado</span>
                    </li>
                    <li className="flex items-center justify-between p-2 bg-[#0B0B0B] border border-white/10">
                      <span>Logo Spatialgineers Summit:</span>
                      <span className="text-[#00DDFF] font-bold">CDN Conectado</span>
                    </li>
                    <li className="flex items-center justify-between p-2 bg-[#0B0B0B] border border-white/10">
                      <span>6 Modelos 3D GLB de Pilares:</span>
                      <span className="text-[#00DDFF] font-bold">Materiales Originales + Luz Neutra</span>
                    </li>
                    <li className="flex items-center justify-between p-2 bg-[#0B0B0B] border border-white/10">
                      <span>Galería Retrospectiva (7 Fotos):</span>
                      <span className="text-[#00DDFF] font-bold">Nosotros/IMG_2026-41</span>
                    </li>
                  </ul>
                </div>

                <div className="p-4 bg-[#121212] border border-[#32527B]/60 space-y-3">
                  <h3 className="text-sm font-bold text-[#00DDFF] font-mono uppercase flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>SGX Guild Initiates (8 Oficiales)</span>
                  </h3>
                  <div className="space-y-1.5 text-xs font-mono text-slate-300">
                    {[
                      '1. Fabián Nieves (Spatial Architect • SGX.Sparkers)',
                      '2. Sebasthian Andre Rosado (Transmedia Lead • SGX.Stagers)',
                      '3. Gabriela Cintrón (Shader Artisan • SGX.Storytellers)',
                      '4. Elvin G. Andrades (Stage MoCap Engineer • SGX.Sparkers)',
                      '5. Christian Jimenez Machuca (Systems Logic • SGX.Sparkers)',
                      '6. Mellangie González (Worldbuilder • SGX.Stagers)',
                      '7. Luis E. A. Fontánez Casanova (Mechanics Dev • SGX.Stagers)',
                      '8. Luis A. Oneill (AI & WebXR Pipeline • SGX.Storytellers)',
                    ].map((init, idx) => (
                      <div
                        key={idx}
                        className="p-1.5 bg-[#0B0B0B] border border-white/10 text-slate-200 flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00DDFF] shrink-0" />
                        <span>{init}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 font-mono flex flex-wrap items-center justify-between gap-2 pb-1">
                <span>
                  Mostrando <strong>{filteredFeatures.length}</strong> de {totalFeatures} módulos configurables
                </span>
                <span className="text-[#FDCC0D]">
                  "Ocultar" remueve el módulo del menú, tabs y Núcleo 3D al instante
                </span>
              </div>

              <div className="space-y-2">
                {filteredFeatures.map((item) => {
                  const statusBadges = {
                    ACTIVE: 'border-[#00DDFF]/60 bg-[#00DDFF]/10 text-[#00DDFF]',
                    MAINTENANCE: 'border-[#FDCC0D]/60 bg-[#FDCC0D]/15 text-[#FDCC0D]',
                    DISABLED: 'border-[#FFBB00]/70 bg-[#FFBB00]/15 text-[#FFBB00]',
                  };

                  const isCoreOverview = item.id === 'section_overview';

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 bg-[#141414] border transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        item.status === 'DISABLED'
                          ? 'border-[#FFBB00]/40 opacity-75'
                          : item.status === 'MAINTENANCE'
                          ? 'border-[#FDCC0D]/50'
                          : 'border-[#32527B]/60 hover:border-[#00DDFF]/60'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 bg-[#0B0B0B] border border-[#32527B] text-[10px] font-mono uppercase text-slate-300 font-bold">
                            {categoryLabels[item.category] || item.category}
                          </span>
                          {item.pillar && (
                            <span className="px-2 py-0.5 bg-[#32527B]/30 border border-[#00DDFF]/40 text-[10px] font-mono uppercase text-[#00DDFF] font-bold flex items-center gap-1">
                              <Layers className="w-2.5 h-2.5" />
                              {item.pillar}
                            </span>
                          )}
                          <h4 className="text-sm font-bold text-white font-mono">{item.name}</h4>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase border ${statusBadges[item.status]}`}
                          >
                            {item.status === 'ACTIVE' && '● VISIBLE'}
                            {item.status === 'MAINTENANCE' && '⏳ EN CONSTRUCCIÓN'}
                            {item.status === 'DISABLED' && '✕ OCULTO'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 font-sans">{item.description}</p>
                      </div>

                      {/* State Switchers */}
                      <div className="flex items-center gap-1.5 self-end md:self-center shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            playUiChirp(800);
                            updateFeatureStatus(item.id, 'ACTIVE');
                          }}
                          className={`px-3 py-1.5 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            item.status === 'ACTIVE'
                              ? 'bg-[#00DDFF] text-black border-[#00DDFF] shadow-[0_0_12px_rgba(0, 221, 255,0.4)]'
                              : 'bg-[#0B0B0B] text-slate-400 border-[#32527B]/60 hover:text-[#00DDFF] hover:border-[#00DDFF]'
                          }`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visible</span>
                        </button>
                        <button
                          type="button"
                          disabled={isCoreOverview}
                          onClick={() => {
                            playUiChirp(600);
                            updateFeatureStatus(item.id, 'MAINTENANCE');
                          }}
                          className={`px-3 py-1.5 text-xs font-mono font-bold border transition-all cursor-pointer ${
                            isCoreOverview ? 'opacity-40 cursor-not-allowed ' : ''
                          }${
                            item.status === 'MAINTENANCE'
                              ? 'bg-[#FDCC0D] text-black border-[#FDCC0D] shadow-[0_0_12px_rgba(253,204,13,0.4)]'
                              : 'bg-[#0B0B0B] text-slate-400 border-[#32527B]/60 hover:text-[#FDCC0D] hover:border-[#FDCC0D]'
                          }`}
                          title="Muestra el módulo con insignia 'Próximamente / En Construcción'"
                        >
                          Próximamente
                        </button>
                        <button
                          type="button"
                          disabled={isCoreOverview}
                          onClick={() => {
                            playUiChirp(350);
                            updateFeatureStatus(item.id, 'DISABLED');
                          }}
                          className={`px-3 py-1.5 text-xs font-mono font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isCoreOverview ? 'opacity-40 cursor-not-allowed ' : ''
                          }${
                            item.status === 'DISABLED'
                              ? 'bg-[#FFBB00] text-black border-[#FFBB00] shadow-[0_0_12px_rgba(255, 187, 0,0.4)]'
                              : 'bg-[#0B0B0B] text-slate-400 border-[#32527B]/60 hover:text-[#FFBB00] hover:border-[#FFBB00]'
                          }`}
                          title="Oculta completamente el módulo de todos los menús, tabs y del Núcleo 3D"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Ocultar</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#121212] border-t border-[#32527B]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#00DDFF] animate-ping" />
            <span>
              Los módulos ocultos desaparecen de inmediato de la navegación, menús desplegables y estaciones del Núcleo 3D.
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              playUiChirp(500);
              onClose();
            }}
            className="px-5 py-2 bg-[#00DDFF] hover:bg-[#FDCC0D] text-black font-bold uppercase transition-all cursor-pointer shrink-0"
          >
            Listo & Guardar
          </button>
        </div>
      </div>
    </div>
  );
};
