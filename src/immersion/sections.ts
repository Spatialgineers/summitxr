import type { SummitSectionKey } from '../components/summit/SummitSectionsDropdown';

export type PillarId = 'SGX.STORY' | 'SGX.STAGE' | 'SGX.SPARK' | 'SGX.SHOWCASE' | 'SGX.SYSTEM' | 'SGX.SYNTHESIZE';

export interface SectionMeta {
  key: SummitSectionKey;
  es: string;
  en: string;
  pillar: PillarId;
  /** Extra words the command terminal matches on. */
  aliases: string[];
  /** Number key (1–8) that jumps here, per the SGX HUD shortcut map. */
  hotkey?: string;
}

// Same section → pillar mapping the landing page's section bar uses.
export const SECTION_META: SectionMeta[] = [
  { key: 'OVERVIEW', es: 'Núcleo 3D', en: '3D Core', pillar: 'SGX.STORY', aliases: ['inicio', 'home', 'core', 'nucleo', 'overview'], hotkey: '1' },
  { key: 'PILLARS_MANIFESTO', es: 'Manifiesto 6 Pilares', en: '6 Pillars Manifesto', pillar: 'SGX.STORY', aliases: ['pilares', 'pillars', 'manifiesto'], hotkey: '2' },
  { key: 'AGENDA', es: 'Agenda 3 Días', en: '3-Day Agenda', pillar: 'SGX.STAGE', aliases: ['agenda', 'programa', 'schedule'], hotkey: '3' },
  { key: 'SPEAKERS', es: 'Speakers', en: 'Speakers', pillar: 'SGX.STAGE', aliases: ['speakers', 'ponentes', 'oradores'], hotkey: '4' },
  { key: 'EMBEDS_GAMES', es: 'Dron 3D & XP', en: 'Drone 3D & XP', pillar: 'SGX.SPARK', aliases: ['dron', 'drone', 'juegos', 'games'], hotkey: '5' },
  { key: 'MAP_360', es: 'Tour 360° Venue', en: '360° Venue Tour', pillar: 'SGX.SHOWCASE', aliases: ['mapa', 'map', '360', 'venue', 'chroma'], hotkey: '6' },
  { key: 'ENTREPRENEUR_MATCH', es: 'SGX.Match', en: 'SGX.Match', pillar: 'SGX.SHOWCASE', aliases: ['match', 'pitch', 'conexiones'], hotkey: '7' },
  { key: 'SPONSORS_HUB', es: 'Partners & Paquetes', en: 'Partners & Packages', pillar: 'SGX.SHOWCASE', aliases: ['sponsors', 'auspicios', 'partners', 'marcas'], hotkey: '8' },
  { key: 'BROADCAST_ROOMS', es: 'Salas 4K', en: '4K Rooms', pillar: 'SGX.STAGE', aliases: ['salas', 'broadcast', 'stream', 'live'] },
  { key: 'GUILD', es: 'Guild Initiates', en: 'Guild Initiates', pillar: 'SGX.SYSTEM', aliases: ['guild', 'initiates', 'iniciados'] },
  { key: 'CREDENTIAL_GENERATOR', es: 'Credencial', en: 'Credential', pillar: 'SGX.SHOWCASE', aliases: ['credencial', 'credential', 'holo', 'holocard'] },
  { key: 'SOCIAL_STREAM', es: 'Social Radar', en: 'Social Radar', pillar: 'SGX.SHOWCASE', aliases: ['social', 'instagram', 'feed', 'radar'] },
  { key: 'NETWORKING', es: 'Foros Chat', en: 'Forum Chat', pillar: 'SGX.SYNTHESIZE', aliases: ['foros', 'chat', 'networking', 'forums'] },
];

export const SECTION_BY_KEY: Record<string, SectionMeta> = Object.fromEntries(SECTION_META.map((s) => [s.key, s]));

export const SECTION_BY_HOTKEY: Record<string, SectionMeta> = Object.fromEntries(
  SECTION_META.filter((s) => s.hotkey).map((s) => [s.hotkey as string, s]),
);

export const ALL_PILLARS: PillarId[] = ['SGX.SPARK', 'SGX.STAGE', 'SGX.SHOWCASE', 'SGX.STORY', 'SGX.SYSTEM', 'SGX.SYNTHESIZE'];

/** Normalizes the pillar ids the 3D core and section bar emit ("STORY", "SGX.Story", "sgx.story"). */
export function normalizePillarId(raw: string | undefined | null): PillarId | null {
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/^SGX[._-]?/, '');
  const name = up === 'SYSTEMS' ? 'SYSTEM' : up;
  const id = `SGX.${name}` as PillarId;
  return ALL_PILLARS.includes(id) ? id : null;
}

export function sectionLabel(meta: SectionMeta | undefined, language: string): string {
  if (!meta) return '';
  return language === 'es' ? meta.es : meta.en;
}

/** Title-case pillar name the way the brand writes it: SGX.Story, SGX.System. */
export function pillarDisplay(id: PillarId): string {
  const name = id.slice(4);
  return `SGX.${name.charAt(0)}${name.slice(1).toLowerCase()}`;
}
