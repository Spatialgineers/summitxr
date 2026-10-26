import {
  Boxes, Instagram, UserCircle2, Globe, Building2, Gamepad2, Vote, Map as MapIcon, Gift,
  Calendar, Radio, Users, BadgeCheck, ScanLine, Terminal, Zap, MessageSquare, Award, Radar,
} from 'lucide-react';
import type { ComponentType } from 'react';

/* =========================================================================
   THE SIX SGX PILLARS: single source of truth for the whole platform.
   Every navigation surface (header, section HUD, sections dropdown, 3D hub,
   command terminal, quests) reads the pillars, their order and their modules
   from here, so the event is divided the same way everywhere.

   Official order (Ground Truth v2026.10.1 / Run of Show v2026.10.1):
   SGX.Story · SGX.Showcase · SGX.Spark · SGX.Stage · SGX.System · SGX.Synthesize
   ========================================================================= */

export type PillarKey = 'STORY' | 'SHOWCASE' | 'SPARK' | 'STAGE' | 'SYSTEM' | 'SYNTHESIZE';
export type PillarId = `SGX.${PillarKey}`;

type Bi = { es: string; en: string };

export type PillarModule =
  | { kind: 'section'; key: string; label: Bi; desc: Bi; icon: ComponentType<{ className?: string }> }
  | { kind: 'page'; page: 'play'; label: Bi; desc: Bi; icon: ComponentType<{ className?: string }> }
  | { kind: 'action'; event: string; label: Bi; desc: Bi; icon: ComponentType<{ className?: string }> };

export interface ProgramSlot {
  day: 1 | 2 | 3;
  time: string;
  label: Bi;
}

export interface SgxPillar {
  key: PillarKey;
  /** Official brand color of the pillar (main color of its theme). */
  color: string;
  id: PillarId;
  /** Brand spelling: SGX.Story, SGX.System… */
  name: string;
  slug: string;
  index: number;
  title: Bi;
  line: Bi;
  scope: Bi;
  /** SGX Guild team name for this pillar. */
  guildTeam: string;
  iconUrl: string;
  program: ProgramSlot[];
  modules: PillarModule[];
}

const ICON_BASE = 'https://cdn.spatialgineers.com/Branding/Pilares/';

export const SGX_PILLARS: SgxPillar[] = [
  {
    key: 'STORY', color: '#32527B', id: 'SGX.STORY', name: 'SGX.Story', slug: 'story', index: 1,
    title: { es: 'Historias que mueven ideas', en: 'Stories that move ideas' },
    line: { es: 'Toda innovación necesita una historia.', en: 'Every innovation needs a story.' },
    scope: { es: 'Lore, cine 360, arte, música, preservación cultural y efectos visuales.', en: 'Lore, 360 film, art, music, cultural preservation and visual effects.' },
    guildTeam: 'SGX.Storytellers',
    iconUrl: `${ICON_BASE}Story1.png`,
    program: [
      { day: 1, time: '10:30–10:45 AM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '10:45–11:10 AM', label: { es: 'Bloque SGX.Story', en: 'SGX.Story block' } },
      { day: 2, time: '10:30–11:15 AM', label: { es: 'Conversación de industria SGX.Story', en: 'SGX.Story industry conversation' } },
      { day: 3, time: '10:00 AM–4:00 PM', label: { es: 'SGX Showcase en Chroma Space Studios: todos los pilares (demos en vivo y networking)', en: 'SGX Showcase at Chroma Space Studios: every pillar (live demos and networking)' } },
    ],
    modules: [
      { kind: 'section', key: 'PILLARS_MANIFESTO', icon: Boxes, label: { es: 'Manifiesto de los 6 pilares', en: 'The 6 pillars manifesto' }, desc: { es: 'El SGX Framework y la historia detrás de cada pilar.', en: 'The SGX Framework and the story behind each pillar.' } },
      { kind: 'section', key: 'SOCIAL_STREAM', icon: Instagram, label: { es: 'Radar social', en: 'Social radar' }, desc: { es: 'Las historias de la comunidad en vivo con #SpatialgineersSummit.', en: 'Community stories live with #SGXSummit2026.' } },
      { kind: 'action', event: 'sgx:open_avatar', icon: UserCircle2, label: { es: 'Avatar Studio', en: 'Avatar Studio' }, desc: { es: 'Crea tu identidad de piloto en pixel art o low-poly.', en: 'Create your pilot identity in pixel art or low-poly.' } },
    ],
  },
  {
    key: 'SHOWCASE', color: '#00DDFF', id: 'SGX.SHOWCASE', name: 'SGX.Showcase', slug: 'showcase', index: 2,
    title: { es: 'Visuales que comunican innovación', en: 'Visuals that communicate innovation' },
    line: { es: 'No mostramos cosas. Mostramos mundos.', en: "We don't show things. We show worlds." },
    scope: { es: 'Renders, animación 3D, galerías, gemelos digitales y entornos XR.', en: 'Renders, 3D animation, galleries, digital twins and XR environments.' },
    guildTeam: 'SGX.Showcasers',
    iconUrl: `${ICON_BASE}Showcase1.png`,
    program: [
      { day: 1, time: '11:10–11:25 AM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '11:25–11:50 AM', label: { es: 'Bloque SGX.Showcase', en: 'SGX.Showcase block' } },
      { day: 2, time: '11:25 AM–12:10 PM', label: { es: 'Conversación de industria SGX.Showcase', en: 'SGX.Showcase industry conversation' } },
      { day: 3, time: '10:00 AM–4:00 PM', label: { es: 'SGX Showcase en Chroma Space Studios: todos los pilares (demos en vivo y networking)', en: 'SGX Showcase at Chroma Space Studios: every pillar (live demos and networking)' } },
    ],
    modules: [
      { kind: 'section', key: 'MAP_360', icon: Globe, label: { es: 'Recorrido 360° Chroma Space Studios', en: '360° Chroma Space Studios walk-through' }, desc: { es: 'Recorre Chroma Space Studios, la sede del Día 3 en San Juan.', en: 'Walk Chroma Space Studios, the Day 3 venue in San Juan.' } },
      { kind: 'section', key: 'SPONSORS_HUB', icon: Building2, label: { es: 'Partners & Brand Showcases', en: 'Partners & Brand Showcases' }, desc: { es: 'Las marcas viven dentro de la experiencia. Tiers 1 a 5.', en: 'Brands live inside the experience. Tiers 1 to 5.' } },
    ],
  },
  {
    key: 'SPARK', color: '#B87000', id: 'SGX.SPARK', name: 'SGX.Spark', slug: 'spark', index: 3,
    title: { es: 'Experiencias que activan la conexión', en: 'Experiences that spark connection' },
    line: { es: 'Jugamos para entender. Creamos para conectar.', en: 'We play to understand. We create to connect.' },
    scope: { es: 'Videojuegos, gamificación, simulaciones, activaciones y juego educativo.', en: 'Games, gamification, simulations, activations and educational play.' },
    guildTeam: 'SGX.Sparkers',
    iconUrl: `${ICON_BASE}Spark1.png`,
    program: [
      { day: 1, time: '11:50 AM–12:05 PM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '12:05–12:30 PM', label: { es: 'Bloque SGX.Spark', en: 'SGX.Spark block' } },
      { day: 2, time: '12:20–1:05 PM', label: { es: 'Conversación de industria SGX.Spark', en: 'SGX.Spark industry conversation' } },
      { day: 3, time: '2:00–3:30 PM', label: { es: 'Interacción libre: demos y Roblox (si se usa)', en: 'Free interaction: demos and Roblox (if used)' } },
    ],
    modules: [
      { kind: 'section', key: 'EMBEDS_GAMES', icon: Gamepad2, label: { es: 'Simulador de dron 3D', en: '3D drone simulator' }, desc: { es: 'Vuela entre conferencias, haz trucos y gana XP.', en: 'Fly between talks, pull tricks and earn XP.' } },
      { kind: 'page', page: 'play', icon: Vote, label: { es: 'Arena de votación en vivo', en: 'Live voting arena' }, desc: { es: 'Votación estilo Kahoot durante la transmisión (+25 XP).', en: 'Kahoot-style voting during the stream (+25 XP).' } },
      { kind: 'action', event: 'sgx:open_passport', icon: MapIcon, label: { es: 'Reactor de misiones', en: 'Mission reactor' }, desc: { es: 'Misiones por pilar; cada pilar completo sella tu SGX Pass.', en: 'Missions per pillar; every finished pillar stamps your SGX Pass.' } },
      { kind: 'action', event: 'sgx:open_rewards', icon: Gift, label: { es: 'Tienda del Reactor', en: 'Reactor store' }, desc: { es: 'Gasta el mismo XP que ganas, sin bajar de rango.', en: 'Spend the same XP you earn, without losing rank.' } },
    ],
  },
  {
    key: 'STAGE', color: '#FDCC0D', id: 'SGX.STAGE', name: 'SGX.Stage', slug: 'stage', index: 4,
    title: { es: 'Creatividad en tiempo real', en: 'Creativity in real time' },
    line: { es: 'Porque el show no solo se ve, se vive.', en: "Because the show isn't just watched, it's lived." },
    scope: { es: 'Conciertos, podcasts, visualizers, performances y transmisiones híbridas.', en: 'Concerts, podcasts, visualizers, performances and hybrid broadcasts.' },
    guildTeam: 'SGX.Stagers',
    iconUrl: `${ICON_BASE}Stage1.png`,
    program: [
      { day: 1, time: '12:30–12:45 PM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '12:45–1:10 PM', label: { es: 'Bloque SGX.Stage', en: 'SGX.Stage block' } },
      { day: 2, time: '1:15–2:00 PM', label: { es: 'Conversación de industria SGX.Stage', en: 'SGX.Stage industry conversation' } },
      { day: 3, time: '11:00 AM–12:30 PM', label: { es: 'Presentación y showcase con visualizadores SGX', en: 'Presentation and showcase with SGX visualizers' } },
    ],
    modules: [
      { kind: 'section', key: 'AGENDA', icon: Calendar, label: { es: 'Run of Show: agenda de 3 días', en: 'Run of Show: 3-day agenda' }, desc: { es: 'El programa minuto a minuto del 11 al 13 de diciembre.', en: 'The minute-by-minute program, December 11 to 13.' } },
      { kind: 'section', key: 'BROADCAST_ROOMS', icon: Radio, label: { es: 'Salas de transmisión', en: 'Broadcast rooms' }, desc: { es: 'YouTube Live como canal principal, con LinkedIn y Facebook Live.', en: 'YouTube Live as the main channel, plus LinkedIn and Facebook Live.' } },
      { kind: 'section', key: 'SPEAKERS', icon: Users, label: { es: 'Speakers & artistas', en: 'Speakers & artists' }, desc: { es: 'Solo se publican quienes están confirmados por escrito.', en: 'Only people confirmed in writing are published.' } },
    ],
  },
  {
    key: 'SYSTEM', color: '#888888', id: 'SGX.SYSTEM', name: 'SGX.System', slug: 'system', index: 5,
    title: { es: 'Tecnología que soluciona', en: 'Technology that solves' },
    line: { es: 'Diseñamos tecnología que resuelve, conecta y amplifica ideas.', en: 'We design technology that solves, connects and amplifies ideas.' },
    scope: { es: 'Webapps, IA, dashboards, backends, AR, Web3, manufactura y robótica.', en: 'Web apps, AI, dashboards, backends, AR, Web3, manufacturing and robotics.' },
    guildTeam: 'SGX.Systematizers',
    iconUrl: `${ICON_BASE}Systems1.png`,
    program: [
      { day: 1, time: '1:10–1:25 PM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '1:25–1:50 PM', label: { es: 'Bloque SGX.System', en: 'SGX.System block' } },
      { day: 2, time: '2:10–2:55 PM', label: { es: 'Conversación de industria SGX.System', en: 'SGX.System industry conversation' } },
      { day: 3, time: '10:00 AM–4:00 PM', label: { es: 'SGX Showcase en Chroma Space Studios: todos los pilares (demos en vivo y networking)', en: 'SGX Showcase at Chroma Space Studios: every pillar (live demos and networking)' } },
    ],
    modules: [
      { kind: 'section', key: 'VISITS', icon: Radar, label: { es: 'Radar de visitas', en: 'Visit radar' }, desc: { es: 'Desde dónde nos visitan, en vivo: mapa de PR, contadores y leaderboards.', en: 'Where our visitors come from, live: PR map, counters and leaderboards.' } },
      { kind: 'section', key: 'CREDENTIAL_GENERATOR', icon: BadgeCheck, label: { es: 'SGX Pass', en: 'SGX Pass' }, desc: { es: 'Registro, Holo Card, credencial y QR en un solo pase.', en: 'Registration, Holo Card, credential and QR in one pass.' } },
      { kind: 'action', event: 'sgx:open_qr_scanner', icon: ScanLine, label: { es: 'Escáner de pases & Rolodex', en: 'Pass scanner & Rolodex' }, desc: { es: 'Escanea un SGX Pass: quedan en los dos Rolodex (+50 XP).', en: 'Scan an SGX Pass: you land in both Rolodexes (+50 XP).' } },
      { kind: 'action', event: 'sgx:open_terminal', icon: Terminal, label: { es: 'Terminal de mando', en: 'Command terminal' }, desc: { es: 'Navega toda la plataforma escribiendo. Ctrl+K.', en: 'Navigate the whole platform by typing. Ctrl+K.' } },
    ],
  },
  {
    key: 'SYNTHESIZE', color: '#FFFFFF', id: 'SGX.SYNTHESIZE', name: 'SGX.Synthesize', slug: 'synthesize', index: 6,
    title: { es: 'Innovación que une disciplinas', en: 'Innovation that unites disciplines' },
    line: { es: 'Imaginación y tecnología, trabajando como una sola.', en: 'Imagination and technology, working as one.' },
    scope: { es: 'Donde todo converge: proyectos multi-pilar, comunidad y el SGX Guild.', en: 'Where everything converges: multi-pillar projects, community and the SGX Guild.' },
    guildTeam: 'SGX.Synthesizers',
    iconUrl: `${ICON_BASE}Synthesize1.png`,
    program: [
      { day: 1, time: '1:50–2:05 PM', label: { es: 'Artista invitado (por anunciar)', en: 'Guest artist (to be announced)' } },
      { day: 1, time: '2:05–2:30 PM', label: { es: 'Bloque SGX.Synthesize', en: 'SGX.Synthesize block' } },
      { day: 1, time: '2:30–4:00 PM', label: { es: 'Portafolios de los 8 Initiates', en: 'Portfolios of the 8 Initiates' } },
      { day: 2, time: '3:05–3:50 PM', label: { es: 'Conversación de industria SGX.Synthesize', en: 'SGX.Synthesize industry conversation' } },
      { day: 3, time: '12:30–1:00 PM', label: { es: 'SGX Guild Ranked Trials Pitch Session (top 6)', en: 'SGX Guild Ranked Trials Pitch Session (top 6)' } },
      { day: 3, time: '1:00–2:00 PM', label: { es: 'Networking con votación gamificada', en: 'Networking with gamified voting' } },
    ],
    modules: [
      { kind: 'section', key: 'ENTREPRENEUR_MATCH', icon: Zap, label: { es: 'SGX.Match', en: 'SGX.Match' }, desc: { es: 'Conecta con creadores y marcas de todos los pilares.', en: 'Connect with creators and brands from every pillar.' } },
      { kind: 'section', key: 'NETWORKING', icon: MessageSquare, label: { es: 'Foros & chat', en: 'Forums & chat' }, desc: { es: 'Salas por tema, preguntas para speakers y código.', en: 'Topic rooms, questions for speakers and code.' } },
      { kind: 'section', key: 'GUILD', icon: Award, label: { es: 'SGX Guild Initiates', en: 'SGX Guild Initiates' }, desc: { es: 'Los 8 Initiates activos y sus portafolios.', en: 'The 8 active Initiates and their portfolios.' } },
    ],
  },
];

export const PILLAR_BY_KEY: Record<PillarKey, SgxPillar> = Object.fromEntries(SGX_PILLARS.map((p) => [p.key, p])) as Record<PillarKey, SgxPillar>;

const SLUG_INDEX: Record<string, SgxPillar> = Object.fromEntries(SGX_PILLARS.map((p) => [p.slug, p]));

/** Accepts "story", "STORY", "SGX.Story", "sgx.story", "systems". */
export function findPillar(raw: string | null | undefined): SgxPillar | undefined {
  if (!raw) return undefined;
  const s = raw.toLowerCase().replace(/^sgx[._-]?/, '').replace(/^systems$/, 'system');
  return SLUG_INDEX[s];
}

const SECTION_HOME: Record<string, SgxPillar> = {};
SGX_PILLARS.forEach((p) => p.modules.forEach((m) => { if (m.kind === 'section') SECTION_HOME[m.key] = p; }));

/** The one pillar a section belongs to. */
export function pillarOfSection(sectionKey: string): SgxPillar | undefined {
  return SECTION_HOME[sectionKey];
}

/** Sections in official pillar order, as the HUD and menus list them. */
export const SECTIONS_IN_PILLAR_ORDER: { key: string; pillar: SgxPillar; label: Bi }[] = SGX_PILLARS.flatMap((p) =>
  p.modules.flatMap((m) => (m.kind === 'section' ? [{ key: m.key, pillar: p, label: m.label }] : [])),
);

export function bi(text: Bi, language: string): string {
  return language === 'es' ? text.es : text.en;
}

/** "04.1": pillar index + position of the section inside its pillar. */
export function moduleCode(sectionKey: string): string | undefined {
  const p = pillarOfSection(sectionKey);
  if (!p) return undefined;
  const sections = p.modules.filter((m) => m.kind === 'section');
  const i = sections.findIndex((m) => m.kind === 'section' && m.key === sectionKey);
  return `0${p.index}.${i + 1}`;
}

/** One label map for every surface (menu, HUD dropdown, terminal, stations). */
export function sectionModule(sectionKey: string): { label: Bi; desc: Bi } | undefined {
  for (const p of SGX_PILLARS) {
    const m = p.modules.find((x) => x.kind === 'section' && x.key === sectionKey);
    if (m) return { label: m.label, desc: m.desc };
  }
  return undefined;
}

/* ---------- Pillar colors & themes ----------
   One brand color per pillar, in official order: azul, cyan, naranja,
   amarillo, gris y blanco. `ink` is the same color lifted for text on the
   dark background (only the deep blue and the copper need it). */

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (sh: number) => Math.round(((pa >> sh) & 255) * (1 - t) + ((pb >> sh) & 255) * t);
  return `#${[16, 8, 0].map((sh) => ch(sh).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const INK_LIFT: Partial<Record<PillarKey, number>> = { STORY: 0.42, SPARK: 0.25 };

export function pillarColor(key: PillarKey): string {
  return PILLAR_BY_KEY[key].color;
}

/** Text-safe variant of the pillar color on #050505 / #1A1A1A. */
export function pillarInk(key: PillarKey): string {
  const lift = INK_LIFT[key];
  return lift ? mixHex(PILLAR_BY_KEY[key].color, '#FFFFFF', lift) : PILLAR_BY_KEY[key].color;
}

const SECONDARY: Record<PillarKey, PillarKey> = {
  STORY: 'SHOWCASE', SHOWCASE: 'STORY', SPARK: 'STAGE', STAGE: 'SPARK', SYSTEM: 'SHOWCASE', SYNTHESIZE: 'STAGE',
};

/** The pillar theme: its color is the main color (buttons, borders, glow). */
export function pillarTheme(key: PillarKey) {
  const primary = pillarColor(key);
  const ink = pillarInk(key);
  const secondary = pillarColor(SECONDARY[key]);
  const n = parseInt(primary.slice(1), 16);
  return {
    primaryColor: primary,
    secondaryColor: secondary,
    accentColor: ink,
    borderColor: primary,
    neonHighlightColor: ink,
    glowShadow: `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, 0.45)`,
    gradientCss: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`,
  };
}
