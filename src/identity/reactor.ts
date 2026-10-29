import type { PillarKey } from '../lib/sgxPillars';
import type { ApprovedSponsor } from '../types/summit';

/* =========================================================================
   REACTOR: the Summit's one mission system. Every mission lives inside one
   of the six pillar stations (2–3 each), pays the same XP the rank and the
   leaderboard use, and closing every mission of a pillar stamps that pillar
   on your SGX Pass. Sponsor challenges (Tier 3+ "reto en el Pasaporte") are
   branded missions inside SGX.Showcase.
   ========================================================================= */

export type IdentityFlag = 'forged' | 'avatar' | 'contact' | 'checkin' | 'redeem' | 'holo' | 'constellation' | 'drone_route';

export type MissionTrigger =
  | { visit: string[] }
  | { quest: string }
  | { flag: IdentityFlag }
  | { sponsor: string };

type Copy = { title: string; hint: string };

export interface ReactorMission {
  id: string;
  pillar: PillarKey;
  xp: number;
  trigger: MissionTrigger;
  es: Copy;
  en: Copy;
  /** Where the "Ir" button takes you. */
  go?: { section?: string; page?: string; event?: string; detail?: Record<string, unknown> };
  /** Missions that only open on Day 3 at Chroma Space Studios. */
  day3?: boolean;
  /** Secret: shown as ??? until done, never required for the pillar stamp. */
  secret?: boolean;
}

export const REACTOR_MISSIONS: ReactorMission[] = [
  // SGX.Story
  { id: 'm_story_forge', pillar: 'STORY', xp: 120, trigger: { flag: 'forged' },
    es: { title: 'Forja tu SGX Pass', hint: 'Tu nombre, tu pilar y tu avatar en tu pase.' },
    en: { title: 'Forge your SGX Pass', hint: 'Your name, your pillar and your avatar on your pass.' },
    go: { event: 'sgx:open_forge' } },
  { id: 'm_story_manifesto', pillar: 'STORY', xp: 60, trigger: { visit: ['PILLARS_MANIFESTO'] },
    es: { title: 'Lee el manifiesto', hint: 'La historia detrás de los 6 pilares.' },
    en: { title: 'Read the manifesto', hint: 'The story behind the 6 pillars.' },
    go: { section: 'PILLARS_MANIFESTO' } },
  { id: 'm_story_avatar', pillar: 'STORY', xp: 80, trigger: { flag: 'avatar' },
    es: { title: 'Diseña tu avatar XR', hint: 'Ajusta tu avatar pieza por pieza en el constructor; queda impreso en tu pase.' },
    en: { title: 'Design your XR avatar', hint: 'Fine-tune your avatar part by part in the builder; it is printed on your pass.' },
    go: { event: 'sgx:open_avatar' } },

  // SGX.Showcase
  { id: 'm_showcase_360', pillar: 'SHOWCASE', xp: 60, trigger: { visit: ['MAP_360'] },
    es: { title: 'Recorre Chroma Space Studios', hint: 'Entra al tour 360° de la sede del Día 3.' },
    en: { title: 'Walk Chroma Space Studios', hint: 'Enter the 360° tour of the Day 3 venue.' },
    go: { section: 'MAP_360' } },
  { id: 'm_showcase_partners', pillar: 'SHOWCASE', xp: 60, trigger: { visit: ['SPONSORS_HUB'] },
    es: { title: 'Visita el pabellón de partners', hint: 'Las marcas que viven dentro de la experiencia.' },
    en: { title: 'Visit the partner pavilion', hint: 'The brands living inside the experience.' },
    go: { section: 'SPONSORS_HUB' } },

  // SGX.Spark
  { id: 'm_spark_play', pillar: 'SPARK', xp: 60, trigger: { visit: ['EMBEDS_GAMES', 'PAGE_PLAY'] },
    es: { title: 'Juega en el Spark', hint: 'Entra a Juegos y laboratorios o al arcade.' },
    en: { title: 'Play in Spark', hint: 'Open Games & labs or the arcade.' },
    go: { section: 'EMBEDS_GAMES' } },
  { id: 'm_spark_drone_route', pillar: 'SPARK', xp: 150, trigger: { flag: 'drone_route' }, secret: true,
    es: { title: 'Ruta de los 6 pilares', hint: 'En el dron, cruza seis anillos seguidos con los colores de los pilares en orden.' },
    en: { title: 'Six-pillar route', hint: 'In the drone game, fly through six rings in a row in the pillar colors, in order.' },
    go: { section: 'EMBEDS_GAMES' } },
  { id: 'm_spark_cells', pillar: 'SPARK', xp: 120, trigger: { quest: 'q_cells_6' },
    es: { title: 'Carga 6 celdas', hint: 'Encuentra 6 rayos SGX escondidos en las secciones.' },
    en: { title: 'Charge 6 cells', hint: 'Find 6 SGX bolts hidden across the sections.' } },
  { id: 'm_spark_overdrive', pillar: 'SPARK', xp: 200, trigger: { quest: 'q_overdrive' },
    es: { title: 'Overdrive', hint: 'Llena la barra de energía al 100%.' },
    en: { title: 'Overdrive', hint: 'Fill the energy bar to 100%.' } },

  // SGX.Stage
  { id: 'm_stage_agenda', pillar: 'STAGE', xp: 60, trigger: { visit: ['AGENDA'] },
    es: { title: 'Arma tu Run of Show', hint: 'Explora los 3 días del programa.' },
    en: { title: 'Build your Run of Show', hint: 'Explore the 3-day program.' },
    go: { section: 'AGENDA' } },
  { id: 'm_stage_rooms', pillar: 'STAGE', xp: 60, trigger: { visit: ['BROADCAST_ROOMS'] },
    es: { title: 'Sintoniza una sala', hint: 'Entra a las salas de transmisión.' },
    en: { title: 'Tune into a room', hint: 'Enter the broadcast rooms.' },
    go: { section: 'BROADCAST_ROOMS' } },
  { id: 'm_stage_speakers', pillar: 'STAGE', xp: 60, trigger: { visit: ['SPEAKERS'] },
    es: { title: 'Conoce el line-up', hint: 'Speakers y artistas confirmados.' },
    en: { title: 'Meet the line-up', hint: 'Confirmed speakers and artists.' },
    go: { section: 'SPEAKERS' } },

  // SGX.System
  { id: 'm_system_core', pillar: 'SYSTEM', xp: 50, trigger: { quest: 'q_core_boot' },
    es: { title: 'Inicia el núcleo', hint: 'Orbita el núcleo 3D de la portada.' },
    en: { title: 'Boot the core', hint: 'Orbit the 3D core on the front page.' },
    go: { section: 'OVERVIEW' } },
  { id: 'm_system_terminal', pillar: 'SYSTEM', xp: 40, trigger: { quest: 'q_terminal' },
    es: { title: 'Terminal de mando', hint: 'Ábrela con Ctrl+K o la tecla /.' },
    en: { title: 'Command terminal', hint: 'Open it with Ctrl+K or the / key.' },
    go: { event: 'sgx:open_terminal' } },
  { id: 'm_system_radar', pillar: 'SYSTEM', xp: 60, trigger: { visit: ['VISITS'] },
    es: { title: 'Lee el radar', hint: 'Mira desde dónde nos visitan, en vivo.' },
    en: { title: 'Read the radar', hint: 'See where visitors come from, live.' },
    go: { section: 'VISITS' } },
  { id: 'm_system_holo', pillar: 'SYSTEM', xp: 60, trigger: { flag: 'holo' },
    es: { title: 'Holo Card', hint: 'Comparte tu Holo Card: tu pase como tarjeta 3D, post o story.' },
    en: { title: 'Holo Card', hint: 'Share your Holo Card: your pass as a 3D card, post or story.' },
    go: { event: 'sgx:open_credential_generator' } },

  // SGX.Synthesize
  { id: 'm_syn_match', pillar: 'SYNTHESIZE', xp: 60, trigger: { visit: ['ENTREPRENEUR_MATCH'] },
    es: { title: 'Entra a SGX.Match', hint: 'Conecta con creadores y marcas.' },
    en: { title: 'Enter SGX.Match', hint: 'Connect with creators and brands.' },
    go: { section: 'ENTREPRENEUR_MATCH' } },
  { id: 'm_syn_contact', pillar: 'SYNTHESIZE', xp: 100, trigger: { flag: 'contact' },
    es: { title: 'Intercambia pases', hint: 'Escanea el QR del pase de otra persona. Quedan en los dos Rolodex.' },
    en: { title: 'Swap passes', hint: "Scan someone's pass QR. You land in both Rolodexes." },
    go: { event: 'sgx:open_qr_scanner' } },
  { id: 'm_syn_chroma', pillar: 'SYNTHESIZE', xp: 250, trigger: { flag: 'checkin' }, day3: true,
    es: { title: 'Presente en Chroma', hint: 'Día 3: escanea el QR de entrada en Chroma Space Studios.' },
    en: { title: 'Present at Chroma', hint: 'Day 3: scan the entrance QR at Chroma Space Studios.' } },
  { id: 'm_syn_constellation', pillar: 'SYNTHESIZE', xp: 300, trigger: { flag: 'constellation' }, secret: true,
    es: { title: 'Red completa', hint: 'Tu Rolodex conecta creadores de los 6 pilares.' },
    en: { title: 'Full network', hint: 'Your Rolodex links creators from all 6 pillars.' },
    go: { event: 'sgx:open_hangar', detail: { tab: 'stars' } } },
];

/** Tier 3+ partners get a branded challenge inside SGX.Showcase. */
export function sponsorMissions(sponsors: ApprovedSponsor[]): ReactorMission[] {
  return sponsors
    .filter((s) => ['tier_3', 'tier_4', 'tier_5'].includes(s.tierId))
    .map((s) => ({
      id: `m_sponsor_${s.id}`,
      pillar: 'SHOWCASE' as PillarKey,
      xp: 90,
      trigger: { sponsor: s.id },
      es: { title: `Reto ${s.companyName}`, hint: `Abre el showcase de ${s.companyName} y llévate su sello.` },
      en: { title: `${s.companyName} challenge`, hint: `Open the ${s.companyName} showcase and take its stamp.` },
    }));
}

export function missionsOfPillar(all: ReactorMission[], pillar: PillarKey): ReactorMission[] {
  return all.filter((m) => m.pillar === pillar);
}

/** A pillar is stamped when every core (non-sponsor, non-Day-3) mission is done. */
export function isPillarComplete(all: ReactorMission[], pillar: PillarKey, done: Record<string, number>): boolean {
  const core = all.filter((m) => m.pillar === pillar && !m.day3 && !m.secret && !('sponsor' in m.trigger));
  return core.length > 0 && core.every((m) => done[m.id]);
}

/** Day 3 check-in window: Dec 13 2026, all day Puerto Rico time. Rehearsals (?checkinTest=1) open it locally. */
export function isDay3Open(now = Date.now(), rehearsal = false): boolean {
  if (rehearsal) return true;
  const start = Date.parse('2026-12-13T00:00:00-04:00');
  const end = Date.parse('2026-12-14T06:00:00-04:00');
  return now >= start && now <= end;
}
