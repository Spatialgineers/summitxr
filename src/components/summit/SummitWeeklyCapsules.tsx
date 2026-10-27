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
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

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
  dateRangeEn?: string;
  titleEn?: string;
  summaryEn?: string;
  fullTransmissionEn?: string;
  relatedActionLabelEn?: string;
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
    dateRangeEn: 'Week 1 · Oct 25 - Oct 31',
    unlockDate: '2026-10-25T00:00:00-04:00',
    title: 'Cápsula Alpha: El Manifiesto SGX y el Origen Cuántico',
    titleEn: 'Alpha Capsule: The SGX Manifesto and the Quantum Origin',
    category: 'LORE',
    badgeColor: '#FDCC0D',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'La génesis de la computación espacial en el Caribe y el manifiesto de soberanía creativa.',
    summaryEn: 'The genesis of spatial computing in the Caribbean and the manifesto of creative sovereignty.',
    fullTransmission: `TRANSMISIÓN INTERCEPTADA // FRECUENCIA SGX-432Hz:
"En 2026, Puerto Rico no es un espectador de la revolución espacial; es su laboratorio. El Spatialgineers Summit regresa del 11 al 13 de diciembre: dos días digitales por YouTube Live y el SGX Showcase del Día 3, híbrido y por invitación. Unimos la ingeniería de software con la producción virtual para crear eventos donde la audiencia es co-directora.

El Núcleo 3D de Spatialgineers no es solo un visualizador; es un puente entre los mundos físicos de fibra óptica y los archipiélagos virtuales de Roblox."`,
    fullTransmissionEn: 'INTERCEPTED TRANSMISSION // FREQUENCY SGX-432Hz:\n"In 2026, Puerto Rico isn\'t a spectator of the spatial revolution; it\'s its lab. The Spatialgineers Summit returns December 11 to 13: two digital days on YouTube Live and the Day 3 SGX Showcase, hybrid and by invitation. We bring software engineering and virtual production together to create events where the audience is co-director.\n\nThe Spatialgineers 3D Core isn\'t just a visualizer; it\'s a bridge between the physical worlds of fiber optics and the virtual archipelagos of Roblox."',
    relatedSectionKey: 'PILLARS_MANIFESTO',
    relatedActionLabel: 'Ver Manifiesto 6 Pilares',
    relatedActionLabelEn: 'View the 6 Pillars Manifesto',
  },
  {
    id: 'capsule_w2',
    weekNumber: 2,
    dateRange: 'Semana 2 · 01 Nov - 07 Nov',
    dateRangeEn: 'Week 2 · Nov 01 - Nov 07',
    unlockDate: '2026-11-01T00:00:00-04:00',
    title: 'Cápsula Beta: Blueprint del Mundo Virtual en Roblox',
    titleEn: 'Beta Capsule: Blueprint of the Virtual World in Roblox',
    category: 'BLUEPRINT',
    badgeColor: '#00DDFF',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Planos esquemáticos del espacio en Roblox para las presentaciones de artistas: zona de artistas, circuito aéreo de drones y hubs de teletransporte.',
    summaryEn: 'Schematic plans of the Roblox space for the artist performances: artist zone, aerial drone circuit and teleport hubs.',
    fullTransmission: `PLANO ARQUITECTÓNICO // MUNDO VIRTUAL SGX ROBLOX:
• Coordenadas del Núcleo Central: (0, 100, 0)
• Zona de Artistas: espacio para los intermedios de artistas invitados del Día 1 (por anunciar).
• Estado: embed opcional; YouTube Live es el canal principal del Summit.`,
    fullTransmissionEn: 'ARCHITECTURAL BLUEPRINT // SGX ROBLOX VIRTUAL WORLD:\n• Central Core coordinates: (0, 100, 0)\n• Artist Zone: space for the Day 1 guest artist interludes (TBA).\n• Status: optional embed; YouTube Live is the Summit\'s main channel.',
    relatedSectionKey: 'EMBEDS_GAMES',
    relatedActionLabel: 'Probar Simulador de Dron 3D',
    relatedActionLabelEn: 'Try the 3D Drone Simulator',
  },
  {
    id: 'capsule_w3',
    weekNumber: 3,
    dateRange: 'Semana 3 · 08 Nov - 14 Nov',
    dateRangeEn: 'Week 3 · Nov 08 - Nov 14',
    unlockDate: '2026-11-08T00:00:00-04:00',
    title: 'Cápsula Gamma: El Venue del SGX Showcase',
    titleEn: 'Gamma Capsule: The SGX Showcase Venue',
    category: 'TECH',
    badgeColor: '#32527B',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Chroma Space Studios en San Juan: venue del Día 3.',
    summaryEn: 'Chroma Space Studios in San Juan: the Day 3 venue.',
    fullTransmission: `DOCUMENTO TÉCNICO // SGX SHOWCASE (DÍA 3):
• Venue: Chroma Space Studios, San Juan, PR.
• Equipo integrado del estudio: luces, proyectores y cámaras.
• Aforo: por invitación y cupo limitado, 40 a 60 personas como máximo.
• Horario: 10:00 a.m. a 4:00 p.m., con transmisión por YouTube Live. Apertura de puertas: por anunciar.`,
    fullTransmissionEn: 'TECHNICAL DOCUMENT // SGX SHOWCASE (DAY 3):\n• Venue: Chroma Space Studios, San Juan, PR.\n• Built-in studio equipment: lights, projectors and cameras.\n• Capacity: by invitation, limited to 40 to 60 people maximum.\n• Schedule: 10:00 a.m. to 4:00 p.m., streamed on YouTube Live. Doors open: TBA.',
    relatedSectionKey: 'MAP_360',
    relatedActionLabel: 'Explorar el recorrido 360°',
    relatedActionLabelEn: 'Explore the 360° tour',
  },
  {
    id: 'capsule_w4',
    weekNumber: 4,
    dateRange: 'Semana 4 · 15 Nov - 21 Nov',
    dateRangeEn: 'Week 4 · Nov 15 - Nov 21',
    unlockDate: '2026-11-15T00:00:00-04:00',
    title: 'Cápsula Delta: Artistas & Speakers del Summit',
    titleEn: 'Delta Capsule: Summit Artists & Speakers',
    category: 'SPEAKERS',
    badgeColor: '#FFBB00',
    isUnlockedDefault: false,
    xpReward: 30,
    summary: 'Cómo se integran los artistas y las personas invitadas en el programa. Solo se anuncian los confirmados por escrito.',
    summaryEn: 'How artists and guests fit into the program. Only those confirmed in writing are announced.',
    fullTransmission: `LINEUP // ARTISTAS & SPEAKERS:
• Día 1: un artista invitado de 15 minutos antes de cada uno de los seis pilares (por anunciar).
• Día 2: una persona invitada por pilar en conversaciones de 45 minutos (por anunciar).
• Día 3: Danelson con su avatar y captura facial en tiempo real, y dos artistas invitados (por confirmar).
• La dinámica de interacción libre del Día 3 se define el 1 de noviembre.`,
    fullTransmissionEn: 'LINEUP // ARTISTS & SPEAKERS:\n• Day 1: a 15-minute guest artist before each of the six pillars (TBA).\n• Day 2: one guest per pillar in 45-minute conversations (TBA).\n• Day 3: Danelson with his avatar and real-time facial capture, and two guest artists (TBC).\n• The Day 3 open-interaction format is set on November 1.',
    relatedSectionKey: 'SPEAKERS',
    relatedActionLabel: 'Ver Speakers y Artistas 3D',
    relatedActionLabelEn: 'View 3D Speakers and Artists',
  },
  {
    id: 'capsule_w5',
    weekNumber: 5,
    dateRange: 'Semana 5 · 22 Nov - 28 Nov',
    dateRangeEn: 'Week 5 · Nov 22 - Nov 28',
    unlockDate: '2026-11-22T00:00:00-04:00',
    title: 'Cápsula Epsilon: Estaciones Holográficas y Patrocinadores',
    titleEn: 'Epsilon Capsule: Holographic Stations and Sponsors',
    category: 'SPONSORS',
    badgeColor: '#FDCC0D',
    isUnlockedDefault: false,
    xpReward: 40,
    summary: 'Satélites orbitales 3D interactivos para las marcas de los cinco Tiers de auspicio.',
    summaryEn: 'Interactive 3D orbital satellites for brands in the five sponsorship Tiers.',
    fullTransmission: `REGISTRO DE ÓRBITA // ALIADOS DEL SUMMIT:
• En vez de un muro estático de logotipos, cada patrocinador cuenta con una baliza orbital 3D o satélite en el Núcleo.
• Los asistentes escanean las balizas con su HUD para ganar XP y descubrir los beneficios de cada marca.
• Tiers oficiales: Tier 1 Digital Presence ($50–$100), Tier 2 Gamified ($250–$500), Tier 3 Experience ($750–$1,000), Tier 4 Signature Experience ($1,500–$2,500, licencia de 365 días desde noviembre) y Tier 5 a convenir, sin precio público (a convenir, sin precio público).`,
    fullTransmissionEn: 'ORBIT LOG // SUMMIT PARTNERS:\n• Instead of a static logo wall, each sponsor gets a 3D orbital beacon or satellite in the Core.\n• Attendees scan the beacons with their HUD to earn XP and discover each brand\'s benefits.\n• Official Tiers: Tier 1 Digital Presence ($50–$100), Tier 2 Gamified ($250–$500), Tier 3 Experience ($750–$1,000), Tier 4 Signature Experience ($1,500–$2,500, 365-day license starting in November) and Tier 5 to be agreed, with no public price.',
    relatedSectionKey: 'SPONSORS_HUB',
    relatedActionLabel: 'Explorar Patrocinios y Tiers',
    relatedActionLabelEn: 'Explore Sponsorships and Tiers',
  },
  {
    id: 'capsule_w6',
    weekNumber: 6,
    dateRange: 'Semana 6 · 29 Nov - 11 Dic',
    dateRangeEn: 'Week 6 · Nov 29 - Dec 11',
    unlockDate: '2026-11-29T00:00:00-04:00',
    title: 'Cápsula Omega: Cuenta Final & Premios del Summit',
    titleEn: 'Omega Capsule: Final Countdown & Summit Prizes',
    category: 'VIP',
    badgeColor: '#FFFFFF',
    isUnlockedDefault: false,
    xpReward: 50,
    summary: 'Desbloqueo final antes del Día 1: insignia del SGX Pass y la escalera de premios del Summit.',
    summaryEn: 'The final unlock before Day 1: the SGX Pass badge and the Summit prize ladder.',
    fullTransmission: `SECUENCIA FINAL // LANZAMIENTO GLOBAL:
• 11 de diciembre de 2026 · 10:00 AM AST: apertura por YouTube Live.
• 12 de diciembre: Día de la Industria por YouTube Live.
• 13 de diciembre: SGX Showcase en Chroma Space Studios (por invitación).
• Premios: cupón de descuento de un auspiciador, suscripción de 3 meses a nuestras plataformas, sesión "Grit" con artistas (por confirmar) y el premio mayor "Spatialgineers activa tu evento".
• Los pilotos que desbloquearon las 6 cápsulas reciben la Insignia Legendaria "Pionero Cuántico" en su SGX Pass.`,
    fullTransmissionEn: 'FINAL SEQUENCE // GLOBAL LAUNCH:\n• December 11, 2026 · 10:00 AM AST: opening on YouTube Live.\n• December 12: Industry Day on YouTube Live.\n• December 13: SGX Showcase at Chroma Space Studios (by invitation).\n• Prizes: a sponsor discount coupon, a 3-month subscription to our platforms, a "Grit" session with artists (TBC) and the grand prize "Spatialgineers activa tu evento" (Spatialgineers activates your event).\n• Pilots who unlocked all 6 capsules get the Legendary "Quantum Pioneer" Badge on their SGX Pass.',
    relatedSectionKey: 'OVERVIEW',
    relatedActionLabel: 'Ver mi SGX Pass',
    relatedActionLabelEn: 'View my SGX Pass',
  }
];

interface SummitWeeklyCapsulesProps {
  onNavigateToSection?: (sectionKey: string) => void;
}

export const SummitWeeklyCapsules: React.FC<SummitWeeklyCapsulesProps> = ({
  onNavigateToSection,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
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
            <span>{es ? 'COUNTDOWN JUGABLE · CÁPSULAS CUÁNTICAS SEMANALES' : 'PLAYABLE COUNTDOWN · WEEKLY QUANTUM CAPSULES'}</span>
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-[#FDCC0D] font-bold">
            {es ? 'PROGRESO: ' : 'PROGRESS: '}{totalUnlocked} / {SUMMIT_WEEKLY_CAPSULES.length}{es ? ' REVELADAS' : ' REVEALED'}
          </span>
          <span className="text-slate-400">
            {es ? 'DESBLOQUEO SEMANAL · 25 OCT – 29 NOV' : 'WEEKLY UNLOCK · OCT 25 – NOV 29'}
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
                    {loc(cap, 'dateRange', language)}
                  </span>
                  <div className="flex items-center space-x-1">
                    {unlocked ? (
                      <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 font-bold">
                        <Unlock className="w-2.5 h-2.5" />
                        <span>{es ? 'REVELADA' : 'REVEALED'}</span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center space-x-1 font-bold">
                        <Lock className="w-2.5 h-2.5" />
                        <span>{days > 0 ? (es ? `EN ${days}D` : `IN ${days}D`) : (es ? `EN ${hours}H` : `IN ${hours}H`)}</span>
                      </span>
                    )}
                    <span className="px-1.5 py-0.2 bg-[#FDCC0D]/20 text-[#FDCC0D] font-black">
                      +{cap.xpReward} XP
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-xs font-bold text-white font-['Orbitron',sans-serif] line-clamp-1">
                  {loc(cap, 'title', language)}
                </h4>

                {/* Summary / Teaser */}
                <p className="text-[11px] text-slate-300 font-sans line-clamp-2">
                  {loc(cap, 'summary', language)}
                </p>
              </div>

              {/* Action row */}
              <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                <span className="text-cyan-400 flex items-center space-x-1 font-bold">
                  <Eye className="w-3 h-3" />
                  <span>{unlocked ? (es ? 'Leer Transmisión' : 'Read Transmission') : (es ? 'Inspeccionar Señal' : 'Inspect Signal')}</span>
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
                      ? (es ? `TRANSMISIÓN DE LORE CUÁNTICO // CÁPSULA S${selectedCapsule.weekNumber}` : `QUANTUM LORE TRANSMISSION // CAPSULE S${selectedCapsule.weekNumber}`)
                      : (es ? `FRECUENCIA ENCRIPTADA // CÁPSULA S${selectedCapsule.weekNumber}` : `ENCRYPTED FREQUENCY // CAPSULE S${selectedCapsule.weekNumber}`)}
                  </span>
                  <span className="text-slate-400">• {loc(selectedCapsule, 'dateRange', language)}</span>
                  {unlocked ? (
                    <span className="px-2 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-bold">
                      +{selectedCapsule.xpReward}{es ? ' XP REGISTRADOS' : ' XP LOGGED'}
                    </span>
                  ) : (
                    <span className="px-2 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" />
                      <span>{es ? 'DESBLOQUEO · ' : 'UNLOCK · '}{loc(selectedCapsule, 'dateRange', language).split('·')[1]?.trim() || loc(selectedCapsule, 'dateRange', language)}</span>
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase font-['Orbitron',sans-serif] truncate">
                  {loc(selectedCapsule, 'title', language)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCapsule(null)}
                className="p-1.5 bg-slate-900 border border-slate-700 hover:border-yellow-400 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                title={es ? 'Cerrar vista detallada de cápsula' : 'Close capsule detail view'}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body: Decoded Text vs Locked Status */}
            {unlocked ? (
              <div className="p-3.5 bg-slate-950/80 border border-slate-800 space-y-2 rounded-xs font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800/80 pb-1.5">
                  <span>{es ? 'ESTADO: DECODIFICADO CON ÉXITO' : 'STATUS: DECODED SUCCESSFULLY'}</span>
                  <span>{es ? 'ORIGEN: CHROMA SPACE STUDIOS // SAN JUAN, PR' : 'ORIGIN: CHROMA SPACE STUDIOS // SAN JUAN, PR'}</span>
                </div>
                <p className="text-slate-200 whitespace-pre-line leading-relaxed font-sans text-xs sm:text-sm">
                  {loc(selectedCapsule, 'fullTransmission', language)}
                </p>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-950/90 border border-amber-500/40 space-y-2.5 rounded-xs font-mono text-xs">
                <div className="flex items-center justify-between text-[10px] text-amber-300 border-b border-slate-800/80 pb-1.5 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{es ? 'FALTAN ' : ' '}{days}{es ? ' DÍAS Y ' : ' DAYS AND '}{hours}{es ? ' HORAS PARA EL DESBLOQUEO' : ' HOURS UNTIL UNLOCK'}</span>
                  </span>
                  <span>{es ? 'SEÑAL ENCRIPTADA' : 'ENCRYPTED SIGNAL'}</span>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans text-xs sm:text-sm">
                  {loc(selectedCapsule, 'summary', language)}
                </p>

                <div className="p-2.5 bg-black/60 border border-dashed border-slate-800 rounded text-slate-400 text-[11px] leading-relaxed flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-white font-bold">{es ? 'Transmisión Protegida por Cronograma Espacial: ' : 'Transmission Protected by the Spatial Schedule: '}</span>
                    <span>
                      {es ? 'Esta cápsula se revelará el ' : 'This capsule will be revealed on '}<strong>{loc(selectedCapsule, 'dateRange', language).split('·')[1]?.trim()}</strong>{es ? '. Se liberará el contenido técnico y +' : '. The technical content and +'}{selectedCapsule.xpReward}{es ? ' XP para tu pasaporte.' : ' XP for your passport will be released.'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-400">
                {unlocked ? (es ? 'Módulo decodificado para tu pasaporte.' : 'Module decoded for your passport.') : (es ? 'Puedes explorar la estación relacionada antes de la apertura.' : 'You can explore the related station before it opens.')}
              </span>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleNavigateToSection(selectedCapsule.relatedSectionKey)}
                  className="px-3 py-1.5 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-md shadow-yellow-500/20"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  <span>{unlocked ? loc(selectedCapsule, 'relatedActionLabel', language) : (es ? `Ir a ${loc(selectedCapsule, 'relatedActionLabel', language)}` : `Go to ${loc(selectedCapsule, 'relatedActionLabel', language)}`)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCapsule(null)}
                  className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white text-xs font-mono font-bold transition-all cursor-pointer"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  {es ? 'Cerrar' : 'Close'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
