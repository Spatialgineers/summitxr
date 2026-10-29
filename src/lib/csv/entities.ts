import type { CsvCol, CsvEntity } from './csvEngine';
import type { ApprovedSponsor, EmbedWidget, Map360Node, SponsorshipTier, SummitSession, SummitSpeaker } from '../../types/summit';
import type { GamificationReward } from '../../types/gamification';
import {
  loadAllSessions, saveAllSessions, loadAllSpeakers, saveAllSpeakers, loadAllMapNodes, saveAllMapNodes,
  loadAllEmbedWidgets, saveAllEmbedWidgets, loadAllSponsorshipTiers, saveAllSponsorshipTiers,
  loadAllApprovedSponsors, saveAllApprovedSponsors, loadAllInitiates, saveAllInitiates, type SgxInitiate,
} from '../summitData';
import { loadAllRewards, saveReward, deleteReward } from '../rewardsStore';
import { loadInitiateEmails, saveInitiateEmails } from '../../identity/credentials';
import { REACTOR_MISSIONS } from '../../identity/reactor';
import { POLLS, GALLERY, MISSION_OVERRIDES, applyMissionOverrides, type KeynotePoll, type GalleryPhoto } from '../content/liveLists';
import { PILLAR_BY_KEY, findPillar } from '../sgxPillars';

/* One CSV definition per data set, column for column with the real fields. */

const bi = (field: string, help: string, required = false): CsvCol[] => [
  { field, help: `${help} (español)`, required },
  { field: `${field}En`, help: `${help} (inglés; vacío = se usa el español)` },
];
const biList = (field: string, help: string): CsvCol[] => [
  { field, help: `${help} (español)`, kind: 'list' },
  { field: `${field}En`, help: `${help} (inglés)`, kind: 'list' },
];
const ID = (example: string): CsvCol => ({ field: 'id', help: `Identificador único, sin espacios (ej: ${example}). Vacío = se crea uno nuevo`, required: true });

/** "10:30 AM" → minutes since midnight, for sorting the agenda. */
function minutesOf(t: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((t || '').trim());
  if (!m) return undefined;
  let h = Number(m[1]) % 12;
  if (m[3]?.toUpperCase() === 'PM') h += 12;
  if (!m[3] && Number(m[1]) === 12) h = 12;
  return h * 60 + Number(m[2]);
}
const DAY_DATES: Record<number, string> = { 1: 'Dec 11, 2026', 2: 'Dec 12, 2026', 3: 'Dec 13, 2026' };

export const SESSIONS_CSV: CsvEntity<SummitSession> = {
  key: 'sessions', label: 'Agenda / Run of Show', file: 'sgx_agenda', idPrefix: 'sess',
  load: loadAllSessions,
  save: (items) => saveAllSessions(items),
  blank: () => ({ day: 1, speakerIds: [], tags: [], format: 'DIGITAL', status: 'UPCOMING', venueLocation: 'YouTube Live', description: '' }),
  finalize: (s) => ({
    ...s,
    dateStr: s.dateStr || DAY_DATES[s.day] || '',
    startMinutes: minutesOf(s.startTime) ?? s.startMinutes ?? 0,
  }),
  cols: [
    ID('sess_d1_apertura'),
    { field: 'day', help: 'Día del Summit', kind: { oneOf: [1, 2, 3] }, required: true },
    { field: 'startTime', help: 'Hora de inicio, ej: 10:00 AM (hora de PR)', required: true },
    { field: 'endTime', help: 'Hora de fin, ej: 10:30 AM', required: true },
    ...bi('title', 'Título de la sesión', true),
    ...bi('subtitle', 'Subtítulo'),
    ...bi('description', 'Descripción'),
    { field: 'pillarId', help: 'Pilar', kind: 'pillar' },
    { field: 'speakerIds', help: 'IDs de speakers (de la hoja de speakers)', kind: 'list' },
    { field: 'format', help: 'Formato', kind: { oneOf: ['DIGITAL', 'HYBRID', 'PHYSICAL', 'ROBLOX_STREAM'] } },
    ...bi('venueLocation', 'Lugar (ej: YouTube Live, Chroma Space Studios)'),
    { field: 'streamUrl', help: 'Enlace del stream' },
    { field: 'mapNodeId', help: 'ID del nodo del mapa 360' },
    ...biList('tags', 'Etiquetas'),
    { field: 'status', help: 'Estado', kind: { oneOf: ['UPCOMING', 'LIVE', 'COMPLETED'] } },
    { field: 'dateStr', help: 'Fecha mostrada; vacío = se pone sola por el día' },
    { field: 'startMinutes', help: 'Se calcula solo de la hora de inicio', kind: 'number', readOnly: true },
  ],
};

export const SPEAKERS_CSV: CsvEntity<SummitSpeaker> = {
  key: 'speakers', label: 'Speakers', file: 'sgx_speakers', idPrefix: 'spk',
  load: loadAllSpeakers,
  save: (items) => saveAllSpeakers(items),
  blank: () => ({ day: 1, avatarUrl: '', bio: '', role: '', organization: '' }),
  cols: [
    ID('spk_nombre'),
    { field: 'name', help: 'Nombre completo', required: true },
    { field: 'handle', help: 'Usuario (ej: @nombre)' },
    ...bi('role', 'Rol o cargo'),
    { field: 'organization', help: 'Empresa u organización' },
    { field: 'avatarUrl', help: 'URL de la foto' },
    ...bi('bio', 'Biografía'),
    { field: 'pillarId', help: 'Pilar', kind: 'pillar' },
    { field: 'day', help: 'Día en que presenta', kind: { oneOf: [1, 2, 3] } },
    { field: 'isKeynote', help: 'Keynote', kind: 'bool' },
    { field: 'socialLinks.linkedin', help: 'LinkedIn' },
    { field: 'socialLinks.instagram', help: 'Instagram' },
    { field: 'socialLinks.twitter', help: 'X / Twitter' },
    { field: 'socialLinks.github', help: 'GitHub' },
    { field: 'socialLinks.portfolio', help: 'Portafolio / web' },
    { field: 'socialLinks.roblox', help: 'Roblox' },
  ],
};

export const TIERS_CSV: CsvEntity<SponsorshipTier> = {
  key: 'sponsorship_tiers', label: 'Niveles de auspicio', file: 'sgx_niveles_auspicio', idPrefix: 'tier',
  load: loadAllSponsorshipTiers,
  save: (items) => saveAllSponsorshipTiers(items),
  blank: () => ({ tierNumber: 1, features: [], sponsors: [], yearLongLicense: false, priceRange: '', keyBenefit: '' }),
  cols: [
    ID('tier_1'),
    { field: 'tierNumber', help: 'Número de nivel', kind: { oneOf: [1, 2, 3, 4, 5] }, required: true },
    ...bi('name', 'Nombre del nivel', true),
    ...bi('priceRange', 'Rango de precio'),
    ...bi('keyBenefit', 'Beneficio principal'),
    { field: 'yearLongLicense', help: 'Licencia de un año', kind: 'bool' },
    ...biList('features', 'Beneficios incluidos'),
    { field: 'sponsors', help: 'Marcas en este nivel: [{"name","logoUrl","websiteUrl","description"}]', kind: 'json' },
  ],
};

export const SHOWCASES_CSV: CsvEntity<ApprovedSponsor> = {
  key: 'approved_sponsors', label: 'Sponsors aprobados (showcases)', file: 'sgx_sponsors_aprobados', idPrefix: 'sp',
  load: loadAllApprovedSponsors,
  save: (items) => saveAllApprovedSponsors(items),
  blank: () => ({ highlights: [], activeInVisualizer: true, activeInMiniGame: false, activeInAppTicker: true, tierId: 'tier_1', tierName: '', tagline: '', logoUrl: '', websiteUrl: '', description: '', ctaButtonText: 'Visitar sitio', publishedAt: Date.now() }),
  finalize: (s) => ({ ...s, brandSlug: s.brandSlug || s.companyName.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), updatedAt: Date.now() }),
  note: 'Importar aquí no otorga la Holo Card de sponsor: eso sigue pasando al aprobar la solicitud.',
  cols: [
    ID('sp_marca'),
    ...bi('companyName', 'Nombre de la marca', true),
    { field: 'brandSlug', help: 'Slug para la URL; vacío = se crea del nombre' },
    { field: 'tierId', help: 'ID del nivel (de la hoja de niveles)' },
    ...bi('tierName', 'Nombre del nivel mostrado'),
    ...bi('tagline', 'Frase corta'),
    { field: 'logoUrl', help: 'URL del logo' },
    { field: 'bannerUrl', help: 'URL del banner' },
    { field: 'websiteUrl', help: 'Sitio web' },
    ...bi('description', 'Descripción'),
    ...biList('highlights', 'Puntos destacados'),
    ...bi('ctaButtonText', 'Texto del botón'),
    ...bi('specialOfferText', 'Oferta especial'),
    { field: 'specialOfferCode', help: 'Código de la oferta' },
    ...bi('boothLocation', 'Ubicación del stand'),
    { field: 'contactName', help: 'Contacto (privado del admin)' },
    { field: 'contactEmail', help: 'Email de contacto' },
    { field: 'phone', help: 'Teléfono' },
    { field: 'activeInVisualizer', help: 'Sale en el núcleo 3D y el escenario', kind: 'bool' },
    { field: 'activeInMiniGame', help: 'Sale en el juego del dron', kind: 'bool' },
    { field: 'activeInAppTicker', help: 'Sale en la cinta de sponsors', kind: 'bool' },
  ],
};

type InitiateRow = SgxInitiate & { email?: string };
export const INITIATES_CSV: CsvEntity<InitiateRow> = {
  key: 'initiates', label: 'SGX Guild Initiates', file: 'sgx_initiates', idPrefix: 'init',
  load: async () => {
    const list = loadAllInitiates();
    const emails = await loadInitiateEmails().catch(() => ({} as Record<string, string>));
    return list.map((i) => ({ ...i, email: emails[i.id] || '' }));
  },
  save: async (items, previous) => {
    const prevEmails = Object.fromEntries(previous.filter((p) => p.email).map((p) => [p.id, p.email as string]));
    const nextEmails = Object.fromEntries(items.filter((p) => p.email).map((p) => [p.id, p.email as string]));
    await saveAllInitiates(items.map(({ email: _e, ...rest }) => rest));
    await saveInitiateEmails(nextEmails, prevEmails);
  },
  blank: () => ({ handle: '', role: '', pillar: 'SGX.STORY', specialty: '' }),
  note: 'El email es privado: solo sirve para que el initiate reclame su Holo Card al entrar con Google.',
  cols: [
    ID('init_9'),
    { field: 'name', help: 'Nombre', required: true },
    { field: 'handle', help: 'Usuario (ej: @nombre)' },
    { field: 'role', help: 'Rol' },
    { field: 'pillar', help: 'Pilar', kind: 'pillar' },
    ...bi('specialty', 'Especialidad'),
    { field: 'photoUrl', help: 'URL de la foto' },
    { field: 'email', help: 'Email con el que reclama su Holo Card (privado)' },
  ],
};

export const MAP_CSV: CsvEntity<Map360Node> = {
  key: 'map_nodes', label: 'Mapa 360', file: 'sgx_mapa_360', idPrefix: 'node',
  load: loadAllMapNodes,
  save: (items) => saveAllMapNodes(items),
  blank: () => ({ category: 'PHYSICAL_STUDIO', mapCoords: { x: 50, y: 50 }, liveStatus: 'VIRTUAL_READY', connectedNodeIds: [], hotspots: [], panorama360Url: '', thumbnailUrl: '', description: '', areaName: '', locationLabel: '' }),
  cols: [
    ID('node_lobby'),
    ...bi('title', 'Nombre del lugar', true),
    ...bi('areaName', 'Área'),
    ...bi('locationLabel', 'Etiqueta de ubicación'),
    { field: 'category', help: 'Tipo', kind: { oneOf: ['PHYSICAL_STUDIO', 'METAVERSE', 'VIRTUAL_GALLERY', 'ARENA', 'LOUNGE'] } },
    { field: 'mapCoords.x', help: 'Posición X en el plano (0–100)', kind: 'number' },
    { field: 'mapCoords.y', help: 'Posición Y en el plano (0–100)', kind: 'number' },
    { field: 'panorama360Url', help: 'URL de la foto 360' },
    { field: 'thumbnailUrl', help: 'URL de la miniatura' },
    ...bi('description', 'Descripción'),
    { field: 'liveStatus', help: 'Estado', kind: { oneOf: ['ONLINE_ACTIVE', 'HYBRID_LIVE', 'VIRTUAL_READY'] } },
    ...bi('capacityInfo', 'Capacidad'),
    { field: 'connectedNodeIds', help: 'IDs de lugares conectados', kind: 'list' },
    { field: 'embedUrl', help: 'Enlace embebido' },
    { field: 'hotspots', help: 'Puntos interactivos: [{"id","title","description","yaw","pitch","actionType"}]', kind: 'json' },
  ],
};

export const EMBEDS_CSV: CsvEntity<EmbedWidget> = {
  key: 'embeds', label: 'Apps embebidas', file: 'sgx_apps_embebidas', idPrefix: 'emb',
  load: loadAllEmbedWidgets,
  save: (items) => saveAllEmbedWidgets(items),
  blank: () => ({ category: 'WEBAPP', embedType: 'URL', thumbnailUrl: '', author: 'Spatialgineers', tags: [], description: '' }),
  cols: [
    ID('emb_juego'),
    ...bi('title', 'Título', true),
    { field: 'category', help: 'Categoría', kind: { oneOf: ['MINI_GAME', 'METAVERSE_ROBLOX', 'WEBGL_XR', 'WEBAPP', 'STREAM_VIDEO', 'CUSTOM_CODE'] } },
    ...bi('description', 'Descripción'),
    { field: 'embedType', help: 'URL o código', kind: { oneOf: ['URL', 'CODE'] } },
    { field: 'embedUrl', help: 'URL a embeber' },
    { field: 'externalUrl', help: 'URL para abrir aparte' },
    { field: 'customCode', help: 'Código HTML (si es CODE)' },
    { field: 'thumbnailUrl', help: 'URL de la miniatura' },
    { field: 'aspectRatio', help: 'Proporción (16:9, 4:3, 1:1, fullscreen)' },
    { field: 'author', help: 'Autor' },
    ...biList('tags', 'Etiquetas'),
    { field: 'featured', help: 'Destacada', kind: 'bool' },
  ],
};

export const REWARDS_CSV: CsvEntity<GamificationReward> = {
  key: 'rewards', label: 'Tienda del Reactor (premios)', file: 'sgx_premios', idPrefix: 'rw',
  load: loadAllRewards,
  save: async (items, previous) => {
    const before = new Map(previous.map((p) => [p.id, JSON.stringify(p)]));
    const keep = new Set(items.map((i) => i.id));
    await Promise.all(items.filter((i) => before.get(i.id) !== JSON.stringify(i)).map((i) => saveReward(i)));
    await Promise.all(previous.filter((p) => !keep.has(p.id)).map((p) => deleteReward(p.id)));
  },
  blank: () => ({ category: 'DIGITAL_ASSET', xpCost: 100, originalValueUsd: '', inventoryCount: -1, claimedCount: 0, badgeIcon: '🎁', themeColor: '#FDCC0D', active: true, accessUrl: '', accessCodePrefix: 'SGX-', features: [], createdAt: Date.now(), updatedAt: Date.now() }),
  finalize: (r) => ({ ...r, updatedAt: Date.now() }),
  cols: [
    ID('rw_sticker_pack'),
    ...bi('title', 'Nombre del premio', true),
    { field: 'category', help: 'Categoría', kind: { oneOf: ['WEBAPP_SUBSCRIPTION', 'SERVICE_CONSULTING', 'VIP_PASS', 'DIGITAL_ASSET', 'PHYSICAL_SWAG', 'EARLY_ACCESS'] } },
    ...bi('description', 'Descripción'),
    { field: 'xpCost', help: 'Costo en XP', kind: 'number', required: true },
    ...bi('originalValueUsd', 'Valor mostrado (ej: $60)'),
    { field: 'inventoryCount', help: 'Inventario disponible (-1 = ilimitado)', kind: 'number' },
    { field: 'claimedCount', help: 'Canjeados hasta ahora (lo lleva la app)', kind: 'number', readOnly: true },
    { field: 'active', help: 'Disponible para canjear', kind: 'bool' },
    { field: 'badgeIcon', help: 'Emoji del premio' },
    { field: 'themeColor', help: 'Color (hex)' },
    { field: 'accessUrl', help: 'Enlace de acceso' },
    { field: 'accessCodePrefix', help: 'Prefijo del código del voucher' },
    ...biList('features', 'Qué incluye'),
    ...bi('sponsorName', 'Sponsor que lo ofrece'),
  ],
};

/* ---- lists that used to be hard-coded ---- */

const POLL_COLORS = ['#FDCC0D', '#00DDFF', '#B87000', '#5C87C7', '#888888', '#FFFFFF'];
export const POLLS_CSV: CsvEntity<KeynotePoll> = {
  key: 'polls', label: 'Encuestas del keynote', file: 'sgx_encuestas', idPrefix: 'poll',
  load: () => POLLS.load(),
  save: (items) => POLLS.save(items),
  blank: () => ({ options: [], speaker: '', sessionTitle: '' }),
  note: 'Los votos van por id de opción: si cambias el texto de una opción se conservan sus votos; si cambias el orden, no.',
  cols: [
    ID('poll_day1_open'),
    { field: 'open', help: 'Abierta para votar (true/false)', kind: 'bool' },
    ...bi('sessionTitle', 'Sesión (ej: Día 1 · Apertura)'),
    ...bi('speaker', 'Quién la lanza'),
    ...bi('question', 'Pregunta', true),
    {
      field: 'options', help: 'Opciones', kind: 'list', required: true,
      get: (p) => p.options.map((o) => o.label),
      set: (p, v) => {
        const labels = (v as string[]) || [];
        p.options = labels.map((label, i) => {
          const prev = p.options?.[i];
          const pillar = /SGX\.(\w+)/i.exec(label)?.[1];
          const color = (pillar && PILLAR_BY_KEY[findPillar(pillar)?.key || 'STAGE']?.color) || POLL_COLORS[i % POLL_COLORS.length];
          return { id: prev?.id || `opt_${i + 1}`, label, labelEn: prev?.labelEn, votes: 0, color: prev?.color || color };
        });
      },
    },
    {
      field: 'optionsEn', help: 'Opciones en inglés, mismo orden', kind: 'list',
      get: (p) => p.options.map((o) => o.labelEn || ''),
      set: (p, v) => { ((v as string[]) || []).forEach((l, i) => { if (p.options[i]) p.options[i].labelEn = l || undefined; }); },
    },
  ],
};

export const GALLERY_CSV: CsvEntity<GalleryPhoto> = {
  key: 'gallery', label: 'Galería retrospectiva', file: 'sgx_galeria', idPrefix: 'photo',
  load: () => GALLERY.load(),
  save: (items) => GALLERY.save(items),
  blank: () => ({ tag: 'Summit' } as Partial<GalleryPhoto>),
  cols: [
    ID('photo_1'),
    ...bi('title', 'Título', true),
    ...bi('description', 'Descripción'),
    { field: 'url', help: 'URL de la foto', required: true },
    ...bi('tag', 'Categoría (filtro)'),
  ],
};

type MissionRow = { id: string; pillar: string; xp: number; titleEs: string; hintEs: string; titleEn: string; hintEn: string };
export const MISSIONS_CSV: CsvEntity<MissionRow> = {
  key: 'missions', label: 'Misiones del Reactor', file: 'sgx_misiones', allowNew: false, allowReplace: false,
  load: () => applyMissionOverrides(REACTOR_MISSIONS).map((m) => ({ id: m.id, pillar: `SGX.${m.pillar}`, xp: m.xp, titleEs: m.es.title, hintEs: m.es.hint, titleEn: m.en.title, hintEn: m.en.hint })),
  save: (items) => {
    const base = new Map(REACTOR_MISSIONS.map((m) => [m.id, m]));
    return MISSION_OVERRIDES.save(items.flatMap((r) => {
      const m = base.get(r.id);
      if (!m) return [];
      const o = { id: r.id, xp: r.xp !== m.xp ? r.xp : undefined, titleEs: r.titleEs !== m.es.title ? r.titleEs : undefined, hintEs: r.hintEs !== m.es.hint ? r.hintEs : undefined, titleEn: r.titleEn !== m.en.title ? r.titleEn : undefined, hintEn: r.hintEn !== m.en.hint ? r.hintEn : undefined };
      return Object.values(o).filter((v) => v !== undefined).length > 1 ? [JSON.parse(JSON.stringify(o))] : [];
    }));
  },
  note: 'Las misiones están conectadas al código (qué las completa). Aquí cambias su texto y su XP; una misión nueva necesita programarse.',
  cols: [
    { field: 'id', help: 'ID de la misión (no cambiar)', required: true },
    { field: 'pillar', help: 'Pilar', readOnly: true },
    { field: 'xp', help: 'XP que da', kind: 'number', required: true },
    { field: 'titleEs', help: 'Título (español)' },
    { field: 'hintEs', help: 'Pista (español)' },
    { field: 'titleEn', help: 'Título (inglés)' },
    { field: 'hintEn', help: 'Pista (inglés)' },
  ],
};

export const CSV_ENTITIES = {
  sessions: SESSIONS_CSV,
  speakers: SPEAKERS_CSV,
  tiers: TIERS_CSV,
  showcases: SHOWCASES_CSV,
  initiates: INITIATES_CSV,
  map: MAP_CSV,
  embeds: EMBEDS_CSV,
  rewards: REWARDS_CSV,
  polls: POLLS_CSV,
  gallery: GALLERY_CSV,
  missions: MISSIONS_CSV,
};
