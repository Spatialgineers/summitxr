import type { SummitSectionKey } from '../components/summit/sectionKeys';
export type { SummitSectionKey };
import { PageRoute } from '../components/common/HeaderNav';

/**
 * Mapping between friendly URL slugs and internal SummitSectionKey values.
 * Supports English, Spanish, and common abbreviations.
 */
export const SECTION_TO_SLUG: Record<SummitSectionKey, string> = {
  OVERVIEW: 'overview',
  PILLARS_MANIFESTO: 'pilares',
  AGENDA: 'agenda',
  SPEAKERS: 'speakers',
  MAP_360: 'mapa',
  BROADCAST_ROOMS: 'broadcast',
  SOCIAL_STREAM: 'social',
  GUILD: 'guild',
  NETWORKING: 'networking',
  ENTREPRENEUR_MATCH: 'match',
  EMBEDS_GAMES: 'juegos',
  SPONSORS_HUB: 'sponsors',
  CREDENTIAL_GENERATOR: 'pase',
  PILLAR: 'pilar',
  VISITS: 'visitas',
  AVATAR_STUDIO: 'avatar',
  REWARDS: 'tienda',
  PASS_SCANNER: 'escaner',
  TERMINAL: 'terminal',
  MODELS_3D: 'modelos-3d',
  SPONSOR: 'patrocina',
  SPEAKER_PORTAL: 'portal-speakers',
};

export const SLUG_TO_SECTION: Record<string, SummitSectionKey> = {
  // Overview
  overview: 'OVERVIEW',
  resumen: 'OVERVIEW',
  home: 'OVERVIEW',
  general: 'OVERVIEW',
  portal: 'OVERVIEW',

  // Agenda
  agenda: 'AGENDA',
  schedule: 'AGENDA',
  cronograma: 'AGENDA',
  runofshow: 'AGENDA',
  itinerario: 'AGENDA',
  programa: 'AGENDA',
  timeline: 'AGENDA',

  // Speakers
  speakers: 'SPEAKERS',
  speaker: 'SPEAKERS',
  ponentes: 'SPEAKERS',
  conferencistas: 'SPEAKERS',
  oradores: 'SPEAKERS',
  artistas: 'SPEAKERS',

  // Pillars & Manifesto
  pillars: 'PILLARS_MANIFESTO',
  pilares: 'PILLARS_MANIFESTO',
  manifesto: 'PILLARS_MANIFESTO',
  manifiesto: 'PILLARS_MANIFESTO',
  sgx_pillars: 'PILLARS_MANIFESTO',

  // 360 Map / Venue
  map: 'MAP_360',
  mapa: 'MAP_360',
  venue: 'MAP_360',
  '360': 'MAP_360',
  map_360: 'MAP_360',
  tour: 'MAP_360',
  chroma: 'MAP_360',

  // Broadcast Rooms
  broadcast: 'BROADCAST_ROOMS',
  salones: 'BROADCAST_ROOMS',
  rooms: 'BROADCAST_ROOMS',
  salas: 'BROADCAST_ROOMS',
  broadcast_rooms: 'BROADCAST_ROOMS',
  streaming: 'BROADCAST_ROOMS',

  // Social Stream
  social: 'SOCIAL_STREAM',
  stream: 'SOCIAL_STREAM',
  social_stream: 'SOCIAL_STREAM',
  feed: 'SOCIAL_STREAM',
  comunidad: 'SOCIAL_STREAM',
  instagram: 'SOCIAL_STREAM',

  // Guild Initiates
  guild: 'GUILD',
  initiates: 'GUILD',
  iniciados: 'GUILD',
  cohorte: 'GUILD',
  cohort: 'GUILD',
  sgx_guild: 'GUILD',

  // Networking
  networking: 'NETWORKING',
  foros: 'NETWORKING',
  forums: 'NETWORKING',
  chat: 'NETWORKING',
  comunidades: 'NETWORKING',

  // Entrepreneur Match (SGX.Match)
  match: 'ENTREPRENEUR_MATCH',
  entrepreneur_match: 'ENTREPRENEUR_MATCH',
  sgx_match: 'ENTREPRENEUR_MATCH',
  speed_pitch: 'ENTREPRENEUR_MATCH',
  citas: 'ENTREPRENEUR_MATCH',
  pitch: 'ENTREPRENEUR_MATCH',
  matchmaking: 'ENTREPRENEUR_MATCH',

  // Drone & Games
  games: 'EMBEDS_GAMES',
  dron: 'EMBEDS_GAMES',
  drone: 'EMBEDS_GAMES',
  simulador: 'EMBEDS_GAMES',
  embeds: 'EMBEDS_GAMES',
  embeds_games: 'EMBEDS_GAMES',
  juegos: 'EMBEDS_GAMES',

  // Sponsors
  sponsors: 'SPONSORS_HUB',
  patrocinadores: 'SPONSORS_HUB',
  marcas: 'SPONSORS_HUB',
  sponsors_hub: 'SPONSORS_HUB',
  alianzas: 'SPONSORS_HUB',
  brands: 'SPONSORS_HUB',

  // Visit radar
  visitas: 'VISITS',
  visits: 'VISITS',
  radar: 'VISITS',
  visitantes: 'VISITS',

  // Pillar stations (?tab=pillar&subtab=story)
  pillar: 'PILLAR',
  pilar: 'PILLAR',
  estacion: 'PILLAR',
  station: 'PILLAR',

  // Credential Generator
  'credential-generator': 'CREDENTIAL_GENERATOR',
  pase: 'CREDENTIAL_GENERATOR',
  'sgx-pass': 'CREDENTIAL_GENERATOR',
  pass: 'CREDENTIAL_GENERATOR',
  hangar: 'CREDENTIAL_GENERATOR',
  estudio: 'CREDENTIAL_GENERATOR',
  studio: 'CREDENTIAL_GENERATOR',
  credential_generator: 'CREDENTIAL_GENERATOR',
  credentials: 'CREDENTIAL_GENERATOR',
  credencial: 'CREDENTIAL_GENERATOR',
  credenciales: 'CREDENTIAL_GENERATOR',
  holo: 'CREDENTIAL_GENERATOR',
  holocard: 'CREDENTIAL_GENERATOR',
  'holo-card': 'CREDENTIAL_GENERATOR',

  // Module pages (they used to open as dialogs)
  avatar: 'AVATAR_STUDIO',
  highbot: 'AVATAR_STUDIO',
  tienda: 'REWARDS',
  recompensas: 'REWARDS',
  rewards: 'REWARDS',
  escaner: 'PASS_SCANNER',
  scanner: 'PASS_SCANNER',
  rolodex: 'PASS_SCANNER',
  terminal: 'TERMINAL',
  'modelos-3d': 'MODELS_3D',
  modelos: 'MODELS_3D',
  models: 'MODELS_3D',
  patrocina: 'SPONSOR',
  patrocinar: 'SPONSOR',
  sponsor: 'SPONSOR',
  'portal-speakers': 'SPEAKER_PORTAL',
  'speaker-portal': 'SPEAKER_PORTAL',
};

/**
 * All Top-Level App Page Slugs
 */
export const APP_PAGE_SLUGS: Record<string, PageRoute> = {
  summit: 'summit',
  portal: 'summit',
  event: 'summit',
  play: 'play',
  vote: 'play',
  audience: 'play',
  pwa: 'play',
  stage: 'stage',
  '3d': 'stage',
  screen: 'stage',
  admin: 'admin',
  director: 'admin',
  cms: 'admin',
  analytics: 'analytics',
  telemetry: 'analytics',
  metrics: 'analytics',
  schema: 'schema',
  database: 'schema',
  firestore: 'schema',
  multiview: 'multiview',
  master: 'multiview',
  studio: 'multiview',
};

export interface ParsedAppLocation {
  page: PageRoute;
  summitSection: SummitSectionKey | null;
  subtab?: string | null;
  day?: string | null;
  theme?: string | null;
  view?: string | null;
}

/**
 * Extracts full app location & state parameters from window.location.
 * Prioritizes unified 'tab' / 'page' / 'section' query params and pathnames.
 */
export function getAppRouteAndSectionFromUrl(): ParsedAppLocation {
  if (typeof window === 'undefined') {
    return { page: 'summit', summitSection: null };
  }

  try {
    // Pillar names in the URL (?tab=story, ?tab=showcase…) open that pillar's
    // station, so a link never lands on a different page than its name says.
    // (?tab=stage stays the live 3D stage page used on the venue screens.)
    {
      const sp = new URLSearchParams(window.location.search);
      const tab = (sp.get('tab') || '').trim().toLowerCase();
      if (['story', 'showcase', 'spark', 'system', 'synthesize'].includes(tab) && !sp.get('section')) {
        sp.delete('tab');
        const rest = sp.toString();
        window.history.replaceState(window.history.state, '', `/pilar/${tab}${rest ? `?${rest}` : ''}${window.location.hash}`);
      }
    }
    const searchParams = new URLSearchParams(window.location.search);
    const rawTab = (searchParams.get('tab') || searchParams.get('page') || '').trim().toLowerCase();
    const rawSection = (searchParams.get('section') || searchParams.get('sec') || '').trim().toLowerCase();
    const rawSubtab = (searchParams.get('subtab') || searchParams.get('view') || '').trim().toLowerCase();
    const rawDay = searchParams.get('day');
    const rawTheme = searchParams.get('theme') || searchParams.get('tenant') || searchParams.get('pillar');
    const rawView = searchParams.get('view');

    // 1. Check if 'tab' or 'page' directly points to a standalone top-level route (e.g. ?tab=play, ?tab=admin)
    if (rawTab && APP_PAGE_SLUGS[rawTab] && APP_PAGE_SLUGS[rawTab] !== 'summit') {
      return {
        page: APP_PAGE_SLUGS[rawTab],
        summitSection: null,
        subtab: rawSubtab || null,
        day: rawDay || null,
        theme: rawTheme || null,
        view: rawView || null,
      };
    }

    // 2. Check if 'tab' or 'section' points to a Summit Section (e.g. ?tab=match, ?tab=agenda, ?section=match)
    const targetSlug = rawSection || rawTab;
    if (targetSlug && SLUG_TO_SECTION[targetSlug]) {
      return {
        page: 'summit',
        summitSection: SLUG_TO_SECTION[targetSlug],
        subtab: rawSubtab || null,
        day: rawDay || null,
        theme: rawTheme || null,
        view: rawView || null,
      };
    }

    // 3. Check hash fallback (e.g. #match, #agenda, #play)
    if (window.location.hash) {
      const hash = window.location.hash.replace('#', '').trim().toLowerCase();
      if (APP_PAGE_SLUGS[hash] && APP_PAGE_SLUGS[hash] !== 'summit') {
        return {
          page: APP_PAGE_SLUGS[hash],
          summitSection: null,
          subtab: rawSubtab || null,
          day: rawDay || null,
          theme: rawTheme || null,
          view: rawView || null,
        };
      }
      if (SLUG_TO_SECTION[hash]) {
        return {
          page: 'summit',
          summitSection: SLUG_TO_SECTION[hash],
          subtab: rawSubtab || null,
          day: rawDay || null,
          theme: rawTheme || null,
          view: rawView || null,
        };
      }
    }

    // 4. Clean paths (/agenda, /juegos, /pilar/story, /play, /admin…)
    const segments = window.location.pathname.split('/').filter(Boolean);
    for (let i = 0; i < segments.length; i++) {
      const lower = segments[i].toLowerCase();
      if (APP_PAGE_SLUGS[lower] && APP_PAGE_SLUGS[lower] !== 'summit') {
        return {
          page: APP_PAGE_SLUGS[lower],
          summitSection: null,
          subtab: rawSubtab || null,
          day: rawDay || null,
          theme: rawTheme || null,
          view: rawView || null,
        };
      }
      if (SLUG_TO_SECTION[lower]) {
        const section = SLUG_TO_SECTION[lower];
        return {
          page: 'summit',
          summitSection: section,
          subtab: (section === 'PILLAR' && segments[i + 1] ? segments[i + 1].toLowerCase() : null) || rawSubtab || null,
          day: rawDay || null,
          theme: rawTheme || null,
          view: rawView || null,
        };
      }
    }
  } catch (err) {
    console.warn('URL route parsing notice:', err);
  }

  return { page: 'summit', summitSection: null };
}

/**
 * Extracts only the SummitSectionKey from URL if present.
 */
/** Rewrites an old query-style link (?tab=agenda&section=agenda&theme=spark) to its clean path, once on load. */
export function upgradeLegacyUrl(): void {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams(window.location.search);
  if (!sp.has('tab') && !sp.has('section') && !sp.has('theme') && !sp.has('page')) return;
  const parsed = getAppRouteAndSectionFromUrl();
  const url = getShareableUrl({
    page: parsed.page,
    section: parsed.summitSection || undefined,
    subtab: parsed.subtab || undefined,
    day: parsed.day || undefined,
    view: sp.get('view') || undefined,
  });
  const keep = new URL(url);
  for (const [k, v] of sp) if (!['tab', 'page', 'section', 'sec', 'subtab', 'day', 'view', 'theme', 'tenant'].includes(k) && !keep.searchParams.has(k)) keep.searchParams.set(k, v);
  window.history.replaceState(window.history.state, '', keep.pathname + keep.search + window.location.hash);
}

export function getSectionFromUrl(): SummitSectionKey | null {
  const parsed = getAppRouteAndSectionFromUrl();
  return parsed.summitSection;
}

/**
 * Builds a clean, fully shareable deep link URL for any page, summit section, subtab, or day.
 */
export const PILLAR_PARAM_PATHS = ['/', '/pilares', '/play', '/stage'];

export function getShareableUrl(options: {
  page?: PageRoute;
  section?: SummitSectionKey | string;
  subtab?: string;
  day?: string | number;
  theme?: string;
  view?: string;
}): string {
  if (typeof window === 'undefined') return '';

  /* Clean links: the place is the path (/agenda, /juegos, /pilar/spark, /play)
     and only real options stay in the query (?day=2, ?pillar=spark). */
  const current = new URLSearchParams(window.location.search);
  const out = new URLSearchParams();
  for (const keep of ['embed']) { const v = current.get(keep); if (v) out.set(keep, v); }
  const pillar = options.theme || current.get('pillar') || current.get('theme');

  let path = '/';
  const sectionKey = options.section
    ? (SECTION_TO_SLUG[options.section as SummitSectionKey] ? options.section as SummitSectionKey : SLUG_TO_SECTION[String(options.section).toLowerCase()])
    : undefined;
  if (options.page && options.page !== 'summit') {
    path = `/${options.page}`;
  } else if (sectionKey === 'PILLAR') {
    const slug = options.subtab || (getAppRouteAndSectionFromUrl().summitSection === 'PILLAR' ? getAppRouteAndSectionFromUrl().subtab : null) || 'story';
    path = `/pilar/${slug.toLowerCase()}`;
    out.delete('pillar');
  } else if (sectionKey && sectionKey !== 'OVERVIEW') {
    path = `/${SECTION_TO_SLUG[sectionKey]}`;
    if (options.subtab) out.set('subtab', options.subtab);
  } else if (options.section && !sectionKey) {
    path = `/${String(options.section).toLowerCase()}`;
  }
  // The live-engine pillar only matters where it is read: the core, the pillars manifesto, /play and /stage.
  if (pillar && PILLAR_PARAM_PATHS.includes(path)) out.set('pillar', pillar.toLowerCase());
  if (options.day) out.set('day', String(options.day));
  if (options.view) out.set('view', options.view);

  const query = out.toString();
  return `${window.location.origin}${path}${query ? `?${query}` : ''}`;
}

/** The pillar of the pillar page in the URL (/pilar/spark, or the old ?subtab=spark). */
export function getPillarSlugFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const parsed = getAppRouteAndSectionFromUrl();
  return parsed.summitSection === 'PILLAR' ? parsed.subtab || null : null;
}

/**
 * Synchronizes the window URL without triggering full page reload.
 */
export function syncAppUrl(options: {
  page?: PageRoute;
  section?: SummitSectionKey | string;
  subtab?: string;
  day?: string | number;
  theme?: string;
  view?: string;
  replace?: boolean;
}): void {
  if (typeof window === 'undefined') return;

  try {
    const newUrl = getShareableUrl(options);
    const same = newUrl === window.location.origin + window.location.pathname + window.location.search;
    if (options.replace || same) {
      window.history.replaceState(window.history.state, '', newUrl);
    } else {
      window.history.pushState(window.history.state, '', newUrl);
    }
    // Lets listeners outside the router (e.g. the immersion layer) follow navigation.
    window.dispatchEvent(new CustomEvent('sgx:route_changed', { detail: getAppRouteAndSectionFromUrl() }));
  } catch (err) {
    console.warn('URL sync notice:', err);
  }
}

/**
 * Copies a shareable link to the clipboard and provides fallback.
 */
export async function copyUnifiedLinkToClipboard(options: {
  page?: PageRoute;
  section?: SummitSectionKey | string;
  subtab?: string;
  day?: string | number;
  theme?: string;
  view?: string;
}): Promise<boolean> {
  const url = getShareableUrl(options);
  if (!url) return false;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
    // Fallback
    const textArea = document.createElement('textarea');
    textArea.value = url;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    return true;
  } catch (err) {
    console.warn('Clipboard copy error:', err);
    return false;
  }
}

/**
 * Smoothly scrolls the viewport to a section container after rendering.
 */
export function scrollToSectionContainer(sectionKey: SummitSectionKey | string): void {
  if (typeof document === 'undefined') return;

  setTimeout(() => {
    const slug = typeof sectionKey === 'string' && SECTION_TO_SLUG[sectionKey as SummitSectionKey]
      ? SECTION_TO_SLUG[sectionKey as SummitSectionKey]
      : String(sectionKey).toLowerCase();

    const candidates = [
      `summit-section-${slug}`,
      `section-${slug}`,
      slug,
      'summit-content-area',
      'sgx-summit-tabs-container',
    ];

    for (const id of candidates) {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
  }, 100);
}

/**
 * Section-specific convenience helpers (alias for unified functions)
 */
export function getShareableSectionUrl(
  sectionKey: SummitSectionKey,
  additionalParams?: Record<string, string | number | undefined>
): string {
  return getShareableUrl({
    page: 'summit',
    section: sectionKey,
    subtab: typeof additionalParams?.subtab === 'string' ? additionalParams.subtab : undefined,
    day: additionalParams?.day,
    view: typeof additionalParams?.view === 'string' ? additionalParams.view : undefined,
    theme: typeof additionalParams?.theme === 'string' ? additionalParams.theme : undefined,
  });
}

export function syncSectionToUrl(
  sectionKey: SummitSectionKey,
  additionalParams?: Record<string, string | number | undefined>,
  replace: boolean = false
): void {
  syncAppUrl({
    page: 'summit',
    section: sectionKey,
    subtab: typeof additionalParams?.subtab === 'string' ? additionalParams.subtab : undefined,
    day: additionalParams?.day,
    view: typeof additionalParams?.view === 'string' ? additionalParams.view : undefined,
    theme: typeof additionalParams?.theme === 'string' ? additionalParams.theme : undefined,
    replace,
  });
}

export async function copySectionLinkToClipboard(
  sectionKey: SummitSectionKey,
  additionalParams?: Record<string, string | number | undefined>
): Promise<boolean> {
  return copyUnifiedLinkToClipboard({
    page: 'summit',
    section: sectionKey,
    subtab: typeof additionalParams?.subtab === 'string' ? additionalParams.subtab : undefined,
    day: additionalParams?.day,
    view: typeof additionalParams?.view === 'string' ? additionalParams.view : undefined,
    theme: typeof additionalParams?.theme === 'string' ? additionalParams.theme : undefined,
  });
}

