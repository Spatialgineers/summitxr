import { SummitSectionKey } from '../components/summit/SummitSectionsDropdown';
export type { SummitSectionKey };
import { PageRoute } from '../components/common/HeaderNav';

/**
 * Mapping between friendly URL slugs and internal SummitSectionKey values.
 * Supports English, Spanish, and common abbreviations.
 */
export const SECTION_TO_SLUG: Record<SummitSectionKey, string> = {
  OVERVIEW: 'overview',
  PILLARS_MANIFESTO: 'pillars',
  AGENDA: 'agenda',
  SPEAKERS: 'speakers',
  MAP_360: 'map',
  BROADCAST_ROOMS: 'broadcast',
  SOCIAL_STREAM: 'social',
  GUILD: 'guild',
  NETWORKING: 'networking',
  ENTREPRENEUR_MATCH: 'match',
  EMBEDS_GAMES: 'games',
  SPONSORS_HUB: 'sponsors',
  CREDENTIAL_GENERATOR: 'pase',
  PILLAR: 'pillar',
  VISITS: 'visitas',
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
  story: 'PILLARS_MANIFESTO',
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
  showcase: 'SPONSORS_HUB',
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
  credential_generator: 'CREDENTIAL_GENERATOR',
  credentials: 'CREDENTIAL_GENERATOR',
  credencial: 'CREDENTIAL_GENERATOR',
  credenciales: 'CREDENTIAL_GENERATOR',
  holo: 'CREDENTIAL_GENERATOR',
  holocard: 'CREDENTIAL_GENERATOR',
  'holo-card': 'CREDENTIAL_GENERATOR',
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

    // 4. Check pathname segments (e.g. /play, /admin, /stage, /tenant_story/event_main/play)
    const segments = window.location.pathname.split('/').filter(Boolean);
    for (const seg of segments) {
      const lower = seg.toLowerCase();
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
        return {
          page: 'summit',
          summitSection: SLUG_TO_SECTION[lower],
          subtab: rawSubtab || null,
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
export function getSectionFromUrl(): SummitSectionKey | null {
  const parsed = getAppRouteAndSectionFromUrl();
  return parsed.summitSection;
}

/**
 * Builds a clean, fully shareable deep link URL for any page, summit section, subtab, or day.
 */
export function getShareableUrl(options: {
  page?: PageRoute;
  section?: SummitSectionKey | string;
  subtab?: string;
  day?: string | number;
  theme?: string;
  view?: string;
}): string {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.origin + window.location.pathname);
  const searchParams = new URLSearchParams(window.location.search);

  // Preserve tenant/theme
  if (options.theme) {
    searchParams.set('theme', options.theme);
  }

  // Handle Page vs Section
  if (options.page && options.page !== 'summit') {
    searchParams.set('tab', options.page);
    searchParams.delete('section');
  } else if (options.section) {
    const slug = typeof options.section === 'string' && SECTION_TO_SLUG[options.section as SummitSectionKey]
      ? SECTION_TO_SLUG[options.section as SummitSectionKey]
      : String(options.section).toLowerCase();

    // Use unified 'tab' or 'section'
    searchParams.set('tab', slug);
    searchParams.set('section', slug);
  } else {
    searchParams.delete('section');
    searchParams.set('tab', 'summit');
  }

  // Optional subtab / view / day
  if (options.subtab) {
    searchParams.set('subtab', options.subtab);
  } else if (options.section && searchParams.get('section') !== new URLSearchParams(window.location.search).get('section')) {
    // A subtab belongs to the section it was set on (e.g. a pillar station); drop it when leaving.
    searchParams.delete('subtab');
  }
  if (options.day) {
    searchParams.set('day', String(options.day));
  }
  if (options.view) {
    searchParams.set('view', options.view);
  }

  const queryString = searchParams.toString();
  return queryString ? `${url.origin}${url.pathname}?${queryString}` : `${url.origin}${url.pathname}`;
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
    if (options.replace) {
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

