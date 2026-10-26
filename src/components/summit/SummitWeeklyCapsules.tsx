import React, { useState } from 'react';
import {
  Lock,
  Unlock,
  Sparkles,
  Calendar,
  Radio,
  FileText,
  Eye,
  CheckCircle2,
  ChevronRight,
  X,
  Volume2,
  Award,
  Zap,
  Layers,
  ArrowRight,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { SECTION_TO_SLUG, SummitSectionKey, scrollToSectionContainer } from '../../lib/summitUrlSync';

export interface WeeklyCapsule {
  id: string;
  weekNumber: number;
  dateRange: string;
  unlockDate: string; // ISO 8601 string
  title: string;
  category: 'LORE' | 'BLUEPRINT' | 'TECH' | 'SPEAKERS' | 'SPONSORS' | 'VIP';
  badgeColor: string;
  isUnlockedDefault: boolean;
  xpReward: number;
  summary: string;
  fullTransmission: string;
  blueprintUrl?: string;
  relatedSectionKey: string;
  relatedActionLabel: string;
}

export const isCapsuleDateReached = (unlockDateStr: string): boolean => {
  try {
    const target = new Date(unlockDateStr).getTime();
    return Date.now() >= target;
  } catch {
    return false;
  }
};

export const getTimeUntilUnlock = (unlockDateStr: string) => {
  try {
    const diff = Math.max(0, new Date(unlockDateStr).getTime() - Date.now());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return { days, hours, isReached: diff === 0 };
  } catch {
    return { days: 0, hours: 0, isReached: false };
  }
};

export const SUMMIT_WEEKLY_CAPSULES: WeeklyCapsule[] = [
  {
    id: 'capsule_w1',
    weekNumber: 1,
    dateRange: 'Semana 1 · 25 Oct - 31 Oct',
    unlockDate: '2026-10-25T00:00:00-04:00',
    title: 'Cápsula Alpha: El Manifiesto SGX y el Origen Cuántico',
    category: 'LORE',
    badgeColor: '#FDCC0D',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'La génesis de la computación espacial en el Caribe y el manifiesto de soberanía creativa.',
    fullTransmission: `TRANSMISIÓN INTERCEPTADA // FRECUENCIA SGX-432Hz:
"En 2026, Puerto Rico no es un espectador de la revolución espacial; es su laboratorio. Desde Chroma Space Studios en San Juan, unimos la ingeniería de software con la producción virtual para crear un nuevo estándar de eventos híbridos donde la audiencia es co-directora.

El Núcleo 3D de Spatialgineers no es solo un visualizador; es un puente entre los mundos físicos de fibra óptica y los archipiélagos virtuales de Roblox."`,
    relatedSectionKey: 'PILLARS_MANIFESTO',
    relatedActionLabel: 'Ver Manifiesto 6 Pilares'
  },
  {
    id: 'capsule_w2',
    weekNumber: 2,
    dateRange: 'Semana 2 · 01 Nov - 07 Nov',
    unlockDate: '2026-11-01T00:00:00-04:00',
    title: 'Cápsula Beta: Blueprint del Mundo Virtual en Roblox',
    category: 'BLUEPRINT',
    badgeColor: '#00DDFF',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Planos esquemáticos de la arena de conciertos, circuito aéreo de drones y hubs de teletransporte.',
    fullTransmission: `PLANO ARQUITECTÓNICO // MUNDO VIRTUAL SGX ROBLOX:
• Coordenadas del Núcleo Central: (0, 100, 0)
• Zona de Vuelo Dron: Campo antigravedad con 12 aros de turbo recargable.
• Escenario Transversal: Conexión WebSocket bidireccional entre las pantallas LED de San Juan y los avatares en la arena virtual.
• Capacidad de Concurrencia: Servidores sincronizados con latencia sub-50ms.`,
    relatedSectionKey: 'EMBEDS_GAMES',
    relatedActionLabel: 'Probar Simulador de Dron 3D'
  },
  {
    id: 'capsule_w3',
    weekNumber: 3,
    dateRange: 'Semana 3 · 08 Nov - 14 Nov',
    unlockDate: '2026-11-08T00:00:00-04:00',
    title: 'Cápsula Gamma: Ficha Técnica del Volumen LED en Chroma Studios',
    category: 'TECH',
    badgeColor: '#32527B',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Especificaciones de cámaras OptiTrack, Unreal Engine 5 nDisplay y tracking de perspectiva en tiempo real.',
    fullTransmission: `DOCUMENTO TÉCNICO // CHROMA SPACE STUDIOS:
• Pitch de Píxel de Pantalla: 1.9mm Black Face LED.
• Sistema de Render: Cluster nDisplay en Unreal Engine 5.4 con Nanite & Lumen.
• Sistema de Tracking de Cámara: Mo-Sys StarTracker óptico con metadatos de lente en tiempo real.
• Modo Híbrido: Transmisión 4K a 60fps con renderizado dinámico de avatares holográficos en escenario.`,
    relatedSectionKey: 'MAP_360',
    relatedActionLabel: 'Explorar Tour 360° Venue'
  },
  {
    id: 'capsule_w4',
    weekNumber: 4,
    dateRange: 'Semana 4 · 15 Nov - 21 Nov',
    unlockDate: '2026-11-15T00:00:00-04:00',
    title: 'Cápsula Delta: Drop de Artistas & Conciertos Híbridos',
    category: 'SPEAKERS',
    badgeColor: '#FFBB00',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Primeros teasers de las presentaciones musicales inmersivas y las charlas magistrales.',
    fullTransmission: `LINEUP REVELADO // ARTISTAS & KEYNOTES:
• Keynote Apertura: "Soberanía Tecnológica en el Caribe a través de Spatial Computing".
• Concierto Inmersivo: Actuación en vivo dentro del volumen LED con captura de movimiento transmitida en directo al universo de Roblox.
• Dinámica CYOA: El público en línea y presencial vota con sus dispositivos qué visuales de shader se proyectarán durante el clímax musical.`,
    relatedSectionKey: 'SPEAKERS',
    relatedActionLabel: 'Ver Speakers y Artistas 3D'
  },
  {
    id: 'capsule_w5',
    weekNumber: 5,
    dateRange: 'Semana 5 · 22 Nov - 28 Nov',
    unlockDate: '2026-11-22T00:00:00-04:00',
    title: 'Cápsula Epsilon: Estaciones Holográficas y Patrocinadores',
    category: 'SPONSORS',
    badgeColor: '#FDCC0D',
    isUnlockedDefault: false,
    xpReward: 40,
    summary: 'Satélites orbitales 3D interactivos para marcas aliadas desde $50 hasta $2,500.',
    fullTransmission: `REGISTRO DE ÓRBITA // ALIADOS DEL SUMMIT:
• En vez de un muro estático de logotipos, cada patrocinador cuenta con una baliza orbital 3D o satélite en el Núcleo.
• Los asistentes escanean las balizas con su HUD para ganar XP y desbloquear ofertas exclusivas de software, cursos y hardware XR.
• Paquetes oficiales: Tier 1 Digital Presence ($50–$100), Tier 2 Gamified Experience ($250–$500), Tier 3 Experience Sponsor ($750–$1,000), Tier 4 Signature Experience ($1,500–$2,500 con Licencia Anual 365D) y Tier 5 Co-Producción In-Kind.`,
    relatedSectionKey: 'SPONSORS_HUB',
    relatedActionLabel: 'Explorar Patrocinios y Tiers'
  },
  {
    id: 'capsule_w6',
    weekNumber: 6,
    dateRange: 'Semana 6 · 29 Nov - 11 Dic',
    unlockDate: '2026-11-29T00:00:00-04:00',
    title: 'Cápsula Omega: El Golden Master del Summit & Recompensas VIP',
    category: 'VIP',
    badgeColor: '#FFFFFF',
    isUnlockedDefault: false,
    xpReward: 50,
    summary: 'Desbloqueo final previo al día inaugural: Casco de Astronauta Dorado y Pase VIP.',
    fullTransmission: `SECUENCIA FINAL // LANZAMIENTO GLOBAL:
• 11 de Diciembre de 2026 · 10:00 AM AST.
• Se abren los portales físicos en Chroma Space Studios y la arena virtual en Roblox.
• Los pilotos que desbloquearon las 6 cápsulas reciben la Insignia Legendaria "Pionero Cuántico" en su Pasaporte de Piloto.`,
    relatedSectionKey: 'OVERVIEW',
    relatedActionLabel: 'Ver Pasaporte de Piloto'
  }
];

interface SummitWeeklyCapsulesProps {
  onNavigateToSection?: (sectionKey: string) => void;
}

export const SummitWeeklyCapsules: React.FC<SummitWeeklyCapsulesProps> = ({
  onNavigateToSection,
}) => {
  const { profile, unlockWeeklyCapsule } = usePilotProfile();
  const [selectedCapsule, setSelectedCapsule] = useState<WeeklyCapsule | null>(null);

  const unlockedList = profile.unlockedCapsules || [];

  // A capsule is ONLY unlocked if the target date has arrived AND it was either default or unlocked by the user
  const isCapsuleUnlocked = (c: WeeklyCapsule) => {
    const dateReached = isCapsuleDateReached(c.unlockDate);
    if (!dateReached) return false;
    return c.isUnlockedDefault || unlockedList.includes(c.id);
  };

  const handleOpenCapsule = (c: WeeklyCapsule) => {
    const dateReached = isCapsuleDateReached(c.unlockDate);
    if (dateReached) {
      playUiChirp(820);
      const wasUnlocked = unlockWeeklyCapsule(c.id, c.xpReward, c.title);
      if (wasUnlocked) {
        playScanSuccessSound();
      }
    } else {
      playUiChirp(460);
    }
    setSelectedCapsule(c);
  };

  const handleNavigateToSection = (sectionKey: string) => {
    playUiChirp(880);
    setSelectedCapsule(null);

    // 1. Invoke direct parent callback
    if (onNavigateToSection) {
      onNavigateToSection(sectionKey);
    }

    // 2. Dispatch global event for listeners
    window.dispatchEvent(
      new CustomEvent('sgx:switch_summit_section', {
        detail: { section: sectionKey }
      })
    );

    // 3. Scroll smoothly to the target section element
    setTimeout(() => {
      scrollToSectionContainer(sectionKey as SummitSectionKey);
      const slug = SECTION_TO_SLUG[sectionKey as SummitSectionKey] || sectionKey.toLowerCase();
      const candidateIds = [
        `summit-section-${slug}`,
        `section-${slug}`,
        slug,
        'summit-main-tab-content'
      ];
      for (const id of candidateIds) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          break;
        }
      }
    }, 120);
  };

  const totalUnlocked = SUMMIT_WEEKLY_CAPSULES.filter(isCapsuleUnlocked).length;

  return (
    <div
      className="p-4 sm:p-5 bg-black/60 border border-[var(--sgx-secondary)]/80 relative overflow-hidden shadow-2xl backdrop-blur-md"
      style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,rgba(253,204,13,0.05)_0%,transparent_70%)]" />

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5 mb-3 font-mono text-xs">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-[#FDCC0D] animate-ping" />
          <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#FDCC0D]" />
            <span>COUNTDOWN JUGABLE · CÁPSULAS CUÁNTICAS SEMANALES</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[#FDCC0D] font-bold">
            PROGRESO: {totalUnlocked} / {SUMMIT_WEEKLY_CAPSULES.length} REVELADAS
          </span>
          <span className="text-slate-400">
            DESBLOQUEO SEGÚN FECHA HASTA EL 11 DIC
          </span>
        </div>
      </div>

      {/* 6 Capsules Horizontal / Grid */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {SUMMIT_WEEKLY_CAPSULES.map((cap) => {
          const unlocked = isCapsuleUnlocked(cap);
          const isActivelyViewed = selectedCapsule?.id === cap.id;
          const { days, hours } = getTimeUntilUnlock(cap.unlockDate);

          return (
            <div
              key={cap.id}
              onClick={() => handleOpenCapsule(cap)}
              className={`p-3 border transition-all cursor-pointer flex flex-col justify-between ${
                unlocked
                  ? isActivelyViewed
                    ? 'bg-[#222222] border-cyan-400 shadow-md'
                    : 'bg-slate-950/70 hover:bg-[#1A1A1A] border-slate-800 hover:border-slate-600'
                  : 'bg-black/50 border-slate-900/80 hover:border-slate-700 hover:bg-slate-950/60'
              }`}
              style={{
                clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
              }}
            >
              <div className="space-y-1.5">
                {/* Status Bar */}
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className="text-slate-400 font-bold uppercase tracking-wider">
                    {cap.dateRange}
                  </span>
                  <div className="flex items-center space-x-1">
                    {unlocked ? (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 font-bold">
                        <Unlock className="w-2.5 h-2.5" />
                        <span>REVELADA</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1 font-bold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{days > 0 ? `EN ${days}D` : `EN ${hours}H`}</span>
                      </span>
                    )}
                    <span className="px-1.5 py-0.2 bg-[#FDCC0D]/20 text-[#FDCC0D] font-black">
                      +{cap.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-white font-['Orbitron',sans-serif] line-clamp-1">
                  {cap.title}
                </h4>

                {/* Summary / Teaser */}
                <p className="text-[11px] text-slate-300 font-sans line-clamp-2">
                  {cap.summary}
                </p>
              </div>

              {/* Action row */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-400 flex items-center space-x-1 font-bold">
                  <Eye className="w-3 h-3" />
                  <span>{unlocked ? 'Leer Transmisión' : 'Inspeccionar Señal'}</span>
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Inline Expanded Capsule Transmission Panel (No modal popup) */}
      {selectedCapsule && (() => {
        const unlocked = isCapsuleUnlocked(selectedCapsule);
        const { days, hours } = getTimeUntilUnlock(selectedCapsule.unlockDate);

        return (
          <div
            className={`mt-3.5 p-4 sm:p-5 bg-[#111111] border-2 ${
              unlocked ? 'border-[#FDCC0D]' : 'border-amber-400/80'
            } relative space-y-3 font-mono text-slate-100 animate-fadeIn shadow-2xl`}
            style={{
              clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              boxShadow: unlocked ? '0 0 25px rgba(253, 204, 13, 0.2)' : '0 0 25px rgba(245, 158, 11, 0.15)',
            }}
          >
            {/* Inline Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="space-y-0.5 min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  <span className={`w-2 h-2 rounded-full ${unlocked ? 'bg-[#FDCC0D] animate-ping' : 'bg-amber-400'}`} />
                  <span className="text-[#FDCC0D] font-bold tracking-widest uppercase">
                    {unlocked 
                      ? `TRANSMISIÓN DE LORE CUÁNTICO // CÁPSULA S${selectedCapsule.weekNumber}`
                      : `FRECUENCIA ENCRIPTADA // CÁPSULA S${selectedCapsule.weekNumber}`}
                  </span>
                  <span className="text-slate-400">• {selectedCapsule.dateRange}</span>
                  {unlocked ? (
                    <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                      +{selectedCapsule.xpReward} XP REGISTRADOS
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>DESBLOQUEO EN DIC 2026</span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase font-['Orbitron',sans-serif] truncate">
                  {selectedCapsule.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCapsule(null)}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:border-yellow-400 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                title="Cerrar vista detallada de cápsula"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Decoded Text vs Locked Status */}
            {unlocked ? (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 space-y-2 rounded-xs font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                  <span>ESTADO: DECODIFICADO CON ÉXITO</span>
                  <span>ORIGEN: CHROMA SPACE STUDIOS // SAN JUAN, PR</span>
                </div>
                <p className="text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs sm:text-sm">
                  {selectedCapsule.fullTransmission}
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-950/90 border border-amber-500/40 space-y-2.5 rounded-xs font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-amber-300 border-b border-slate-800/80 pb-1.5 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>FALTAN {days} DÍAS Y {hours} HORAS PARA EL DESBLOQUEO</span>
                  </span>
                  <span>SEÑAL ENCRIPTADA</span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans text-xs sm:text-sm">
                  {selectedCapsule.summary}
                </p>

                <div className="p-2.5 bg-black/60 border border-dashed border-slate-800 rounded text-slate-400 text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold">Transmisión Protegida por Cronograma Espacial: </span>
                    <span>
                      Esta cápsula se revelará el <strong>{selectedCapsule.dateRange.split('·')[1]?.trim()}</strong>. 
                      Se liberará el contenido técnico y +{selectedCapsule.xpReward} XP para tu pasaporte.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400">
                {unlocked ? 'Módulo decodificado para tu pasaporte.' : 'Puedes explorar la estación relacionada antes de la apertura.'}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleNavigateToSection(selectedCapsule.relatedSectionKey)}
                  className="px-3 py-1.5 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-yellow-500/20"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  <span>{unlocked ? selectedCapsule.relatedActionLabel : `Ir a ${selectedCapsule.relatedActionLabel}`}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCapsule(null)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
