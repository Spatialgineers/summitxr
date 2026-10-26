import type { SummitSectionKey } from '../components/summit/SummitSectionsDropdown';
import { SGX_PILLARS, SECTIONS_IN_PILLAR_ORDER } from '../lib/sgxPillars';

export type PillarId = 'SGX.STORY' | 'SGX.SHOWCASE' | 'SGX.SPARK' | 'SGX.STAGE' | 'SGX.SYSTEM' | 'SGX.SYNTHESIZE';

export interface SectionMeta {
  key: SummitSectionKey;
  es: string;
  en: string;
  pillar: PillarId;
  /** Extra words the command terminal matches on. */
  aliases: string[];
}

const ALIASES: Record<string, string[]> = {
  OVERVIEW: ['inicio', 'home', 'core', 'nucleo', 'overview'],
  PILLARS_MANIFESTO: ['manifiesto', 'manifesto', 'framework'],
  SOCIAL_STREAM: ['social', 'instagram', 'feed', 'radar'],
  MAP_360: ['mapa', 'map', '360', 'venue', 'chroma', 'tour'],
  SPONSORS_HUB: ['sponsors', 'auspicios', 'partners', 'marcas', 'tiers'],
  EMBEDS_GAMES: ['dron', 'drone', 'juegos', 'games'],
  AGENDA: ['agenda', 'programa', 'schedule', 'run of show'],
  BROADCAST_ROOMS: ['salas', 'broadcast', 'stream', 'live', 'youtube'],
  SPEAKERS: ['speakers', 'ponentes', 'artistas', 'artists'],
  CREDENTIAL_GENERATOR: ['pase', 'pass', 'sgx pass', 'credencial', 'credential', 'holo', 'holocard', 'qr', 'registro'],
  ENTREPRENEUR_MATCH: ['match', 'pitch', 'conexiones'],
  NETWORKING: ['foros', 'chat', 'networking', 'forums'],
  GUILD: ['guild', 'initiates', 'iniciados'],
  VISITS: ['visitas', 'visits', 'radar', 'mapa de visitas', 'leaderboard'],
};

/**
 * Every Summit section in official pillar order (Story → Synthesize), with the
 * 3D core first. Derived from src/lib/sgxPillars.ts so the immersion layer,
 * the quests and the energy cells divide the event exactly like the menus.
 */
export const SECTION_META: SectionMeta[] = [
  { key: 'OVERVIEW', es: 'Núcleo 3D', en: '3D Core', pillar: 'SGX.STORY', aliases: ALIASES.OVERVIEW },
  ...SECTIONS_IN_PILLAR_ORDER.map((s) => ({
    key: s.key as SummitSectionKey,
    es: s.label.es,
    en: s.label.en,
    pillar: s.pillar.id as PillarId,
    aliases: ALIASES[s.key] || [],
  })),
];

export const SECTION_BY_KEY: Record<string, SectionMeta> = Object.fromEntries(SECTION_META.map((s) => [s.key, s]));

/** Official order: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System, SGX.Synthesize. */
export const ALL_PILLARS: PillarId[] = SGX_PILLARS.map((p) => p.id as PillarId);

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
