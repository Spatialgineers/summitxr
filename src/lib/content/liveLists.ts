import { useEffect, useState } from 'react';
import { PILLAR_BY_KEY } from '../sgxPillars';
import { makeLiveList, OFFICIAL_BRAND_ASSETS } from '../summitData';

/* Lists that used to be hard-coded and are now editable from the admin (and by
   CSV): keynote polls, weekly capsules and the retrospective gallery. Each one
   keeps its bundled defaults until an admin publishes to summit_content. */

/* ---------- keynote polls (summit_content/polls) ---------- */

export interface KeynotePollOption {
  id: string;
  label: string;
  labelEn?: string;
  votes: number;
  color: string;
}

export interface KeynotePoll {
  id: string;
  question: string;
  speaker: string;
  sessionTitle: string;
  questionEn?: string;
  speakerEn?: string;
  sessionTitleEn?: string;
  options: KeynotePollOption[];
}

// Polls tied to the real Run of Show. Speakers are named only when confirmed in writing.
const PILLAR_OPTIONS = [
  { id: 'opt_story', label: 'SGX.Story (lore)', labelEn: 'SGX.Story (lore)', votes: 0, color: PILLAR_BY_KEY['STORY'].color },
  { id: 'opt_showcase', label: 'SGX.Showcase (inmersión)', labelEn: 'SGX.Showcase (immersion)', votes: 0, color: PILLAR_BY_KEY['SHOWCASE'].color },
  { id: 'opt_spark', label: 'SGX.Spark (interactividad y juegos)', labelEn: 'SGX.Spark (interactivity and games)', votes: 0, color: PILLAR_BY_KEY['SPARK'].color },
  { id: 'opt_stage', label: 'SGX.Stage (eventos)', labelEn: 'SGX.Stage (events)', votes: 0, color: PILLAR_BY_KEY['STAGE'].color },
  { id: 'opt_system', label: 'SGX.System (herramientas, IA y backend)', labelEn: 'SGX.System (tools, AI and backend)', votes: 0, color: PILLAR_BY_KEY['SYSTEM'].color },
  { id: 'opt_synthesize', label: 'SGX.Synthesize (todo converge)', labelEn: 'SGX.Synthesize (everything converges)', votes: 0, color: PILLAR_BY_KEY['SYNTHESIZE'].color },
];

export const DEFAULT_POLLS: KeynotePoll[] = [
  {
    id: 'poll_day1_open',
    sessionTitle: 'Día 1 · Apertura',
    sessionTitleEn: 'Day 1 · Opening',
    speaker: 'Danelson Maldonado González',
    question: '¿Qué pilar te mueve más?',
    questionEn: 'Which pillar moves you the most?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day2_industry',
    sessionTitle: 'Día 2 · Día de la Industria',
    sessionTitleEn: 'Day 2 · Industry Day',
    speaker: 'Personas invitadas (por anunciar)',
    speakerEn: 'Guests (TBA)',
    question: '¿Qué conversación de industria quieres escuchar primero?',
    questionEn: 'Which industry conversation do you want to hear first?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day3_showcase',
    sessionTitle: 'Día 3 · SGX Showcase',
    sessionTitleEn: 'Day 3 · SGX Showcase',
    speaker: 'Initiates del SGX Guild',
    speakerEn: 'SGX Guild Initiates',
    question: '¿En qué pilar quieres ver el próximo proyecto de un Initiate?',
    questionEn: 'In which pillar do you want to see an Initiate\'s next project?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
];


export const POLLS = makeLiveList<KeynotePoll>('polls', 'sgx_summit_polls_v1', () => DEFAULT_POLLS);

/* ---------- weekly capsules (summit_content/capsules) ---------- */

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

export const DEFAULT_CAPSULES: WeeklyCapsule[] = [
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

export const CAPSULES = makeLiveList<WeeklyCapsule>('capsules', 'sgx_summit_capsules_v1', () => DEFAULT_CAPSULES);

/* ---------- retrospective gallery (summit_content/gallery) ---------- */

export type GalleryPhoto = (typeof OFFICIAL_BRAND_ASSETS.retrospectiveGallery)[number] & { id: string };

export const GALLERY = makeLiveList<GalleryPhoto>('gallery', 'sgx_summit_gallery_v1', () => OFFICIAL_BRAND_ASSETS.retrospectiveGallery as GalleryPhoto[]);

/** Re-reads a live list whenever the CMS content changes (published or imported). */
export function useLiveList<T>(list: { load(): T[] }): T[] {
  const [items, setItems] = useState<T[]>(() => list.load());
  useEffect(() => {
    const refresh = () => setItems(list.load());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [list]);
  return items;
}

/* ---------- reactor mission copy & XP (summit_content/mission_overrides) ----------
   Missions are wired to code (what completes them), so the admin can only
   retitle them and change their XP; new missions still need code. */

export interface MissionOverride {
  id: string;
  xp?: number;
  titleEs?: string;
  hintEs?: string;
  titleEn?: string;
  hintEn?: string;
}

export const MISSION_OVERRIDES = makeLiveList<MissionOverride>('mission_overrides', 'sgx_summit_mission_overrides_v1', () => []);

export function applyMissionOverrides<M extends { id: string; xp: number; es: { title: string; hint: string }; en: { title: string; hint: string } }>(missions: M[]): M[] {
  const byId = new Map(MISSION_OVERRIDES.load().map((o) => [o.id, o]));
  return missions.map((m) => {
    const o = byId.get(m.id);
    if (!o) return m;
    return {
      ...m,
      xp: typeof o.xp === 'number' && o.xp >= 0 ? o.xp : m.xp,
      es: { title: o.titleEs || m.es.title, hint: o.hintEs || m.es.hint },
      en: { title: o.titleEn || m.en.title, hint: o.hintEn || m.en.hint },
    };
  });
}
