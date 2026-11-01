/* HIGHBOT: the Summit avatar. Everyone is a Highbot (Highcoon's robot form,
   modelled in Nomad: public/characters/highbot/highbot.glb) and makes it theirs:
   which parts it keeps (without ears, whiskers and mask it is a plain bot),
   headgear and a visor (the 3D gear of the old XR avatar, fitted to the
   Highbot head), eyelids, glowing eyes, the pillar on the chest gear and the logo on
   the back gear, colors per part group and an SGX motif etched into the
   torso (only the torso), in the bot's own colors, at one of four sizes.
   Every bot is brushed metal (metalness 0.4, roughness 0.2). Presets are
   different bots built that way.
   The 3D figure is built in highbot3d.ts; flat places (header, chat, Holo Card,
   pass PDF) show a rendered portrait (highbotPortrait.ts), with a vector
   silhouette until it is ready or when WebGL is missing.
   New options always go at the END of a list: saved avatars keep their value. */

import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';

export type Eyelid = 'low' | 'mid' | 'sus' | 'high' | 'chill';
export type Plate = PillarKey | 'SGX';
export type ColorGroup = 'shell' | 'trim' | 'joints' | 'mask' | 'iris' | 'shoes';

export interface PilotColors {
  /** head, body, ears, arms, legs */
  shell: string;
  /** head band, chest and shoe decor, gears */
  trim: string;
  /** neck, shoulders, hips, pelvis, hands */
  joints: string;
  /** the mask around the eyes, and the nose */
  mask: string;
  iris: string;
  shoes: string;
}

export interface PilotConfig {
  v: 2;
  eyelid: Eyelid;
  /** the small plate on the chest gear */
  chest: Plate;
  /** the big plate on the back gear */
  back: Plate;
  colors: PilotColors;
  /** SGX motif etched into the torso (id in PILOT_TEXTURES, '' = plain) */
  pattern: string;
  /** how the motif is drawn: body tone, trim color or the eyes' light */
  ink: Ink;
  /** motif size: 0 fine, 1 medium, 2 large, 3 XL */
  tile: number;
  /** model parts kept on (off: a plainer bot) */
  parts: PilotParts;
  /** index in HEADGEAR (0 = none) */
  headgear: number;
  /** index in VISORS (0 = none) */
  visor: number;
  /** the chest: logo on the small corner gear, or the big 3D pillar in the middle */
  chestStyle: ChestStyle;
  /** an extra place for the 3D emblem of the chest pillar (the Summit logo: the SGX icon) */
  relic: RelicMount;
}

export type Ink = 'tone' | 'trim' | 'glow';
/** The motif's finish: etched in the body's own tone, in the trim color, or lit in the eyes' color. */
export const INKS: { id: Ink; es: string; en: string }[] = [
  { id: 'tone', es: 'Grabado', en: 'Etched' },
  { id: 'trim', es: 'Acento', en: 'Accent' },
  { id: 'glow', es: 'Luz', en: 'Light' },
];

export type RelicMount = 'none' | 'back' | 'orbit' | 'antenna';
/** Extra places for the pillar's 3D emblem (the same .glb as the core). Never in the hands. */
export const RELIC_MOUNTS: { id: RelicMount; es: string; en: string }[] = [
  { id: 'none', es: 'Sin emblema extra', en: 'No extra emblem' },
  { id: 'back', es: 'Núcleo en la espalda', en: 'Back core' },
  { id: 'orbit', es: 'Compañero', en: 'Companion' },
  { id: 'antenna', es: 'Punta de antena', en: 'Antenna tip' },
];

export type ChestStyle = 'gear' | 'big';
/** How the chest shows its pillar: the logo on the small corner gear, or the big 3D pillar in the middle. */
export const CHEST_STYLES: { id: ChestStyle; es: string; en: string }[] = [
  { id: 'gear', es: 'Logo en el engrane', en: 'Logo on the gear' },
  { id: 'big', es: 'Pilar grande al centro', en: 'Big pillar in the middle' },
];
/** Headgear that sits on the side sockets (one at a time) and that grows from the top button. */
export const SOCKET_GEAR = [1, 2, 9];
export const TOP_GEAR = [3, 4];

export interface PilotParts {
  ears: boolean;
  mask: boolean;
  nose: boolean;
  /** the band across the top of the head */
  headDecor: boolean;
  /** the discs on the sides of the head */
  sideDiscs: boolean;
  /** the marks on the chest */
  chestDecor: boolean;
}
export type PartId = keyof PilotParts;
export const PARTS: { id: PartId; es: string; en: string }[] = [
  { id: 'ears', es: 'Orejas y bigotes', en: 'Ears and whiskers' },
  { id: 'mask', es: 'Antifaz', en: 'Mask' },
  { id: 'nose', es: 'Nariz', en: 'Nose' },
  { id: 'headDecor', es: 'Banda de la cabeza', en: 'Head band' },
  { id: 'sideDiscs', es: 'Discos laterales', en: 'Side discs' },
  { id: 'chestDecor', es: 'Detalles del pecho', en: 'Chest marks' },
];
const ALL_PARTS: PilotParts = { ears: true, mask: true, nose: true, headDecor: true, sideDiscs: true, chestDecor: true };
const PLAIN: PilotParts = { ears: false, mask: false, nose: false, headDecor: true, sideDiscs: true, chestDecor: true };

/** Headgear and visors (built in highbotGear.ts). New ones go at the END. */
export const HEADGEAR: { es: string; en: string }[] = [
  { es: 'Nada', en: 'None' },
  { es: 'Audífonos', en: 'Headphones' },
  { es: 'Headset con mic', en: 'Headset + mic' },
  { es: 'Antena', en: 'Antenna' },
  { es: 'Antena rayo SGX', en: 'SGX bolt antenna' },
  { es: 'Halo', en: 'Halo' },
  { es: 'Halo engranaje SGX', en: 'SGX gear halo' },
  { es: 'Aletas mecha', en: 'Mech fins' },
  { es: 'Diadema LED', en: 'LED headband' },
  { es: 'Auricular rayo', en: 'Bolt earpiece' },
  { es: 'Ícono SGX flotante', en: 'Floating SGX icon' },
];
export const VISORS: { es: string; en: string }[] = [
  { es: 'Nada', en: 'None' },
  { es: 'VR clásico', en: 'Classic VR' },
  { es: 'VR slim', en: 'Slim VR' },
  { es: 'Gafas AR', en: 'AR glasses' },
  { es: 'Visor MR', en: 'MR visor' },
  { es: 'Visor gaming', en: 'Gaming visor' },
  { es: 'Goggles', en: 'Goggles' },
  { es: 'Banda LED', en: 'LED band' },
  { es: 'T-visor mecha', en: 'Mech T-visor' },
];
/** Motif sizes on the torso: the width of one motif, in model units (the torso is ~0.53 wide). */
export const TILE_SIZES: { size: number; es: string; en: string }[] = [
  { size: 0.085, es: 'Fino', en: 'Fine' },
  { size: 0.13, es: 'Medio', en: 'Medium' },
  { size: 0.2, es: 'Grande', en: 'Large' },
  { size: 0.32, es: 'XL', en: 'XL' },
];

/* SGX motifs (from the SGX Tile Lab), cut into masks (public/pilot/tex/etch,
   scripts/pilot-etch-masks.py): the bot paints them in its own colors, on the
   torso only. per: motifs across one tile, so every size reads the same. */
export const PILOT_TEXTURES: { id: string; es: string; en: string; per?: number }[] = [
  { id: '', es: 'Liso', en: 'Plain' },
  { id: 'engranajes', es: 'Engranajes SGX', en: 'SGX gears', per: 4 },
  { id: 'engranaje-g', es: 'Engranaje G', en: 'G gear', per: 4 },
  { id: 'engranajes-entrelazados', es: 'Engranajes', en: 'Meshed gears', per: 2.5 },
  { id: 'rayos', es: 'Rayos SGX', en: 'SGX bolts', per: 3.5 },
  { id: 'panel-hud', es: 'Panel HUD', en: 'HUD panel', per: 4 },
  { id: 'holodeck', es: 'Holodeck', en: 'Holodeck', per: 4 },
  { id: 'red-de-energia', es: 'Red de energía', en: 'Energy grid', per: 4 },
  { id: 'lineas-de-energia', es: 'Líneas de energía', en: 'Energy lines', per: 4 },
  { id: 'circuito', es: 'Circuito', en: 'Circuit', per: 3 },
  { id: 'escudo-hex', es: 'Escudo hex', en: 'Hex shield', per: 5 },
  { id: 'zigzag', es: 'Zigzag SGX', en: 'SGX zigzag', per: 4 },
];
export const etchSrc = (id: string) => `/pilot/tex/etch/${id}.png`;
/** The motif's color: the trim, the eyes' light, or the body pushed darker (light bodies) or lighter (dark ones). */
export function etchInk(c: PilotConfig): string {
  if (c.ink === 'glow') return c.colors.iris;
  if (c.ink === 'trim') return c.colors.trim;
  const n = parseInt(c.colors.shell.slice(1), 16);
  const rgb = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  const k = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255 > 0.45 ? -0.34 : 0.24;
  return `#${rgb.map((v) => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k)).toString(16).padStart(2, '0')).join('')}`;
}
/** Saved avatars kept the old list's index: the pillar tiles and the brushed metal became plain. */
const LEGACY_TEXTURES = ['', '', '', '', '', '', '', '', 'engranajes', 'engranaje-g', 'engranajes-entrelazados', 'rayos', 'rayos',
  'panel-hud', 'holodeck', 'red-de-energia', 'lineas-de-energia', 'circuito', 'escudo-hex', '', 'zigzag'];
const patternOf = (v: unknown): string => {
  if (typeof v === 'number') return LEGACY_TEXTURES[Math.floor(v)] || '';
  return typeof v === 'string' && PILOT_TEXTURES.some((t) => t.id === v) ? v : '';
};

/** The eyelid shapes in the model (node names in the .glb). */
export const EYELIDS: { id: Eyelid; node: string; es: string; en: string }[] = [
  { id: 'high', node: 'HIGH', es: 'High', en: 'High' },
  { id: 'mid', node: 'Mid', es: 'Medio', en: 'Mid' },
  { id: 'low', node: 'Low', es: 'Bajo', en: 'Low' },
  { id: 'sus', node: 'Sus', es: 'Sospechoso', en: 'Sus' },
  { id: 'chill', node: 'Chill', es: 'Chill', en: 'Chill' },
];
export const PLATES: { id: Plate; es: string; en: string; src: string; color: string }[] = [
  ...SGX_PILLARS.map((p) => ({ id: p.key as Plate, es: p.name, en: p.name, src: `/holo/${p.slug}.png`, color: p.color })),
  { id: 'SGX' as Plate, es: 'Logo del Summit', en: 'Summit logo', src: '/holo/summitIcon.png', color: '#FDCC0D' },
];
export const plateSrc = (p: Plate) => PLATES.find((x) => x.id === p)?.src || '/holo/summitIcon.png';

export const COLOR_GROUPS: { id: ColorGroup; es: string; en: string }[] = [
  { id: 'shell', es: 'Cuerpo', en: 'Body' },
  { id: 'trim', es: 'Detalles', en: 'Trim' },
  { id: 'joints', es: 'Articulaciones', en: 'Joints' },
  { id: 'mask', es: 'Antifaz', en: 'Mask' },
  { id: 'iris', es: 'Ojos', en: 'Eyes' },
  { id: 'shoes', es: 'Zapatos', en: 'Shoes' },
];

/** Official SGX lights (design system + pillar inks). */
export const PILOT_SWATCHES = ['#FDCC0D', '#FFBB00', '#B87000', '#00DDFF', '#5D86C6', '#32527B', '#888888', '#FFF9E2', '#FFFFFF'];
/** Official SGX bases. */
export const SHELL_SWATCHES = ['#050505', '#1A1A1A', '#333333', '#32527B', '#888888', '#FFF9E2', '#B87000', '#5D86C6'];
/** Every color a Highbot part can take: SGX bases and lights, Highbot gray and its red eyes. */
export const BOT_SWATCHES = ['#050505', '#1A1A1A', '#333333', '#5A5F66', '#888888', '#FFF9E2', '#FFFFFF', '#FDCC0D', '#FFBB00', '#B87000', '#FF4040', '#00DDFF', '#5D86C6', '#32527B'];

const HEX = /^#[0-9a-fA-F]{6}$/;
function rgbOf(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Any color snaps to the closest one in the palette. */
function snap(c: string | undefined, palette: string[], fallback: string): string {
  if (!c || !HEX.test(c)) return fallback;
  const up = c.toUpperCase();
  if (palette.includes(up)) return up;
  const [r, g, b] = rgbOf(up);
  let best = fallback, d = Infinity;
  for (const p of palette) {
    const [pr, pg, pb] = rgbOf(p);
    const dd = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
    if (dd < d) { d = dd; best = p; }
  }
  return best;
}

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}
const pickOf = <T,>(r: () => number, a: readonly T[]) => a[Math.floor(r() * a.length)];

/* ---------- presets: bots born from the Highbot design ---------- */

const bot = (o: { eyelid: Eyelid; chest: Plate; colors: PilotColors; parts?: PilotParts; headgear?: number; visor?: number; pattern?: string; ink?: Ink; tile?: number; back?: Plate; relic?: RelicMount; chestStyle?: ChestStyle }): PilotConfig =>
  ({ v: 2, back: 'SGX', pattern: '', ink: 'trim', tile: 1, headgear: 0, visor: 0, chestStyle: 'gear', relic: 'none', ...o, colors: { ...o.colors }, parts: { ...(o.parts || ALL_PARTS) } });

/* Signature bots: one idea per pillar, built from the model's own parts, the
   gear fitted to its anchors and the pillar's 3D emblem, plus two specials.
   Palette rule: one body color, one accent (trim, often the shoes), one dark
   (joints, mask) and the eyes as the light, with the pillar's color in it. */
export const HIGHBOT_PRESETS: { id: string; es: string; en: string; config: PilotConfig }[] = [
  { id: 'highbot', es: 'Highbot', en: 'Highbot',
    config: bot({ eyelid: 'high', chest: 'SGX', colors: { shell: '#5A5F66', trim: '#1A1A1A', joints: '#1A1A1A', mask: '#050505', iris: '#FF4040', shoes: '#5A5F66' } }) },
  { id: 'narrador', es: 'Narrador · Story', en: 'Storyteller · Story',
    config: bot({ eyelid: 'mid', chest: 'STORY', relic: 'back', colors: { shell: '#32527B', trim: '#FFF9E2', joints: '#1A1A1A', mask: '#050505', iris: '#00DDFF', shoes: '#FFF9E2' } }) },
  { id: 'curador', es: 'Curador · Showcase', en: 'Curator · Showcase',
    config: bot({ eyelid: 'sus', chest: 'SHOWCASE', chestStyle: 'big', visor: 3, parts: { ...PLAIN, chestDecor: false }, colors: { shell: '#FFF9E2', trim: '#00DDFF', joints: '#1A1A1A', mask: '#050505', iris: '#00DDFF', shoes: '#00DDFF' } }) },
  { id: 'gamer', es: 'Gamer · Spark', en: 'Gamer · Spark',
    config: bot({ eyelid: 'chill', chest: 'SPARK', relic: 'orbit', headgear: 2, visor: 5, parts: PLAIN, colors: { shell: '#1A1A1A', trim: '#B87000', joints: '#050505', mask: '#050505', iris: '#FDCC0D', shoes: '#B87000' }, pattern: 'rayos', ink: 'trim', tile: 2 }) },
  { id: 'performer', es: 'Performer · Stage', en: 'Performer · Stage',
    config: bot({ eyelid: 'high', chest: 'STAGE', relic: 'back', headgear: 1, parts: { ...PLAIN, mask: true }, colors: { shell: '#050505', trim: '#FDCC0D', joints: '#1A1A1A', mask: '#050505', iris: '#FDCC0D', shoes: '#FDCC0D' }, pattern: 'escudo-hex', ink: 'glow', tile: 1 }) },
  { id: 'ingeniero', es: 'Ingeniero · System', en: 'Engineer · System',
    config: bot({ eyelid: 'low', chest: 'SYSTEM', relic: 'antenna', visor: 8, parts: { ...PLAIN, headDecor: true }, colors: { shell: '#888888', trim: '#00DDFF', joints: '#333333', mask: '#1A1A1A', iris: '#00DDFF', shoes: '#333333' }, pattern: 'circuito', ink: 'glow', tile: 2 }) },
  { id: 'conector', es: 'Conector · Synthesize', en: 'Connector · Synthesize',
    config: bot({ eyelid: 'mid', chest: 'SYNTHESIZE', chestStyle: 'big', headgear: 6, parts: { ...PLAIN, chestDecor: false }, colors: { shell: '#FFFFFF', trim: '#32527B', joints: '#1A1A1A', mask: '#1A1A1A', iris: '#00DDFF', shoes: '#32527B' }, pattern: 'engranajes-entrelazados', ink: 'tone', tile: 1 }) },
  { id: 'gold', es: 'Creador Dorado', en: 'Golden Creator',
    config: bot({ eyelid: 'high', chest: 'SGX', relic: 'orbit', colors: { shell: '#FDCC0D', trim: '#050505', joints: '#050505', mask: '#050505', iris: '#00DDFF', shoes: '#050505' } }) },
];

const BASE = HIGHBOT_PRESETS[0].config;
const clone = (c: PilotConfig): PilotConfig => ({ ...c, colors: { ...c.colors }, parts: { ...c.parts } });

/** Same seed, same bot: for passes forged before the builder and for other people's QR seeds. */
export function configFromSeed(seed: string, accent = '#FDCC0D'): PilotConfig {
  const r = rng(seed || 'sgx');
  const c = clone(pickOf(r, HIGHBOT_PRESETS).config);
  c.eyelid = pickOf(r, EYELIDS).id;
  if (r() < 0.5) c.colors.iris = snap(accent, BOT_SWATCHES, c.colors.iris);
  return c;
}

/** Sorpresa: a preset as a starting point, with its own face, plate and a color or two. */
export function randomPilot(accent?: string): PilotConfig {
  const r = Math.random;
  const c = clone(pickOf(r, HIGHBOT_PRESETS).config);
  c.eyelid = pickOf(r, EYELIDS).id;
  c.chest = pickOf(r, PLATES).id;
  if (r() < 0.6) c.colors.iris = accent && r() < 0.5 ? snap(accent, BOT_SWATCHES, c.colors.iris) : pickOf(r, BOT_SWATCHES);
  if (r() < 0.5) c.colors.trim = pickOf(r, BOT_SWATCHES);
  if (r() < 0.35) c.colors.shell = pickOf(r, BOT_SWATCHES);
  if (r() < 0.35) { c.pattern = pickOf(r, PILOT_TEXTURES).id; c.ink = pickOf(r, INKS).id; }
  if (r() < 0.3) c.tile = Math.floor(r() * TILE_SIZES.length);
  if (r() < 0.3) c.headgear = Math.floor(r() * HEADGEAR.length);
  if (r() < 0.25) c.visor = Math.floor(r() * VISORS.length);
  if (r() < 0.4) c.relic = pickOf(r, RELIC_MOUNTS).id;
  if (r() < 0.3) c.chestStyle = pickOf(r, CHEST_STYLES).id;
  return c;
}

/** A close cousin: one or two things change. */
export function varyPilot(c: PilotConfig): PilotConfig {
  const r = Math.random;
  const others = <T,>(list: readonly T[], now: T) => list.filter((x) => x !== now);
  // every pick lands on something new and visible, and the bot always ends up different
  for (let attempt = 0; attempt < 8; attempt++) {
    const next = clone(c);
    const n = 1 + Math.floor(r() * 2);
    for (let i = 0; i < n; i++) {
      const k = Math.floor(r() * 10);
      if (k === 0) next.eyelid = pickOf(r, EYELIDS.filter((e) => e.id !== next.eyelid)).id;
      // the finish only shows with a motif on the torso
      else if (k === 1 && next.pattern) next.ink = pickOf(r, INKS.filter((x) => x.id !== next.ink)).id;
      else if (k === 2) next.chest = pickOf(r, PLATES.filter((p) => p.id !== next.chest)).id;
      else if (k === 3) { const g = pickOf(r, COLOR_GROUPS).id; next.colors[g] = pickOf(r, BOT_SWATCHES.filter((h) => h !== next.colors[g])); }
      else if (k === 4) next.pattern = pickOf(r, PILOT_TEXTURES.filter((t) => t.id !== next.pattern)).id;
      else if (k === 5) { const pid = pickOf(r, PARTS).id; next.parts[pid] = !next.parts[pid]; }
      else if (k === 6) next.headgear = pickOf(r, others(HEADGEAR.map((_, idx) => idx), next.headgear));
      else if (k === 7) next.visor = pickOf(r, others(VISORS.map((_, idx) => idx), next.visor));
      else if (k === 8) next.relic = pickOf(r, RELIC_MOUNTS.filter((x) => x.id !== next.relic)).id;
      else next.chestStyle = next.chestStyle === 'big' ? 'gear' : 'big';
    }
    if (JSON.stringify(next) !== JSON.stringify(c)) return next;
  }
  const next = clone(c);
  next.eyelid = pickOf(r, EYELIDS.filter((e) => e.id !== next.eyelid)).id;
  return next;
}

/** The pillar plate an old (v1) avatar's emblem pointed at: emblems 3–8 were the six pillars. */
const V1_EMBLEM_PLATE: Record<number, Plate> = { 3: 'STORY', 4: 'SHOWCASE', 5: 'SPARK', 6: 'STAGE', 7: 'SYSTEM', 8: 'SYNTHESIZE' };

const idx = (v: unknown, n: number, d: number) => { const x = Number(v); return Number.isFinite(x) && x >= 0 && x < n ? Math.floor(x) : d; };

export function normalizePilot(raw: unknown, accent = '#FDCC0D'): PilotConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, any>;
  // v1 (the XR pilot): keep its colors, texture and pillar emblem; the face comes from its own data
  if (c.v !== 2) {
    const r = rng(JSON.stringify(c));
    const out = clone(BASE);
    out.eyelid = pickOf(r, EYELIDS).id;
    out.colors = {
      shell: snap(c.shell, BOT_SWATCHES, BASE.colors.shell),
      trim: snap(c.primary, BOT_SWATCHES, snap(accent, BOT_SWATCHES, BASE.colors.trim)),
      joints: '#1A1A1A',
      mask: '#050505',
      iris: snap(c.glow, BOT_SWATCHES, BASE.colors.iris),
      shoes: snap(c.secondary, BOT_SWATCHES, BASE.colors.shoes),
    };
    out.chest = V1_EMBLEM_PLATE[Number(c.emblem)] || 'SGX';
    out.pattern = patternOf(Number(c.pattern));
    return out;
  }
  const colors = (c.colors && typeof c.colors === 'object' ? c.colors : {}) as Partial<PilotColors>;
  return {
    v: 2,
    eyelid: EYELIDS.some((e) => e.id === c.eyelid) ? c.eyelid : BASE.eyelid,
    chest: PLATES.some((x) => x.id === c.chest) ? c.chest : BASE.chest,
    back: PLATES.some((x) => x.id === c.back) ? c.back : BASE.back,
    colors: {
      shell: snap(colors.shell, BOT_SWATCHES, BASE.colors.shell),
      trim: snap(colors.trim, BOT_SWATCHES, BASE.colors.trim),
      joints: snap(colors.joints, BOT_SWATCHES, BASE.colors.joints),
      mask: snap(colors.mask, BOT_SWATCHES, BASE.colors.mask),
      iris: snap(colors.iris, BOT_SWATCHES, BASE.colors.iris),
      shoes: snap(colors.shoes, BOT_SWATCHES, BASE.colors.shoes),
    },
    pattern: patternOf(c.pattern),
    ink: INKS.some((x) => x.id === c.ink) ? c.ink : 'trim',
    tile: idx(c.tile, TILE_SIZES.length, 1),
    parts: Object.fromEntries(PARTS.map(({ id }) => [id, typeof c.parts?.[id] === 'boolean' ? c.parts[id] : true])) as unknown as PilotParts,
    headgear: idx(c.headgear, HEADGEAR.length, 0),
    visor: idx(c.visor, VISORS.length, 0),
    // the old 'chest' emblem is the big chest pillar now; 'hand' is gone (no pillars in the hands)
    chestStyle: c.chestStyle === 'big' || c.relic === 'chest' ? 'big' : 'gear',
    relic: RELIC_MOUNTS.some((x) => x.id === c.relic) ? c.relic : 'none',
  };
}

/** The accent a Highbot glows with (podium rim, card light): its eyes. */
export const pilotAccent = (c: PilotConfig) => (normalizePilot(c) as PilotConfig).colors.iris;

/* ---------- images inlined for raster copies (canvas, PDF) ---------- */

const INLINE = new Map<string, string>();

async function inline(url: string): Promise<void> {
  if (!url || INLINE.has(url)) return;
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    INLINE.set(url, data);
  } catch { /* the raster copy simply goes without it */ }
}

/** Swap every <image> href in a rendered SVG for an inlined copy, so a
    data-URL raster of it (canvas, PDF) still shows its images. */
export async function inlineSvgImages(svg: SVGSVGElement): Promise<void> {
  const imgs = Array.from(svg.querySelectorAll('image'));
  await Promise.all(imgs.map(async (el) => {
    const href = el.getAttribute('href') || el.getAttribute('xlink:href') || '';
    if (!href || href.startsWith('data:')) return;
    await inline(href);
    const data = INLINE.get(href);
    if (data) el.setAttribute('href', data);
  }));
}

/** The SGX bolt, in a unit box (x right, y down). Shared with the 3D icon build. */
export const BOLT_POINTS: [number, number][] = [[0.78, 0], [0.3, 0.56], [0.52, 0.56], [0.22, 1], [0.8, 0.4], [0.56, 0.4]];

/* ---------- portraits ----------
   A rendered bust of the 3D Highbot (highbotPortrait.ts, three.js loads only
   when one is needed). Cached in memory and, for the last few, in localStorage.
   Until it is ready, pilotSvg() draws a vector Highbot in the same colors; when
   it lands, 'sgx:pilot_portrait' tells the glyphs to redraw. */

export const PORTRAIT_EVENT = 'sgx:pilot_portrait';
// v4: studio light, lacquer, true-color eyes: older portraits are dropped
const PORTRAIT_STORE = 'sgx_pilot_portraits_v5';
const PORTRAIT_KEEP = 16;
const PORTRAITS = new Map<string, string>();
const PENDING = new Map<string, Promise<string | null>>();
let portraitsBroken = false;

export const portraitKey = (c: PilotConfig) => JSON.stringify(normalizePilot(c));

try {
  const saved = JSON.parse(localStorage.getItem(PORTRAIT_STORE) || '[]') as [string, string][];
  saved.forEach(([k, v]) => { if (typeof v === 'string' && v.startsWith('data:image')) PORTRAITS.set(k, v); });
} catch { /* private mode */ }

function keepPortrait(key: string, url: string) {
  PORTRAITS.delete(key);
  PORTRAITS.set(key, url);
  try {
    const recent = Array.from(PORTRAITS.entries()).slice(-PORTRAIT_KEEP);
    localStorage.setItem(PORTRAIT_STORE, JSON.stringify(recent));
  } catch { /* storage full: memory only */ }
}

/** The rendered portrait (data URL), rendering it if needed. null when WebGL is missing. */
export function portraitFor(raw: PilotConfig): Promise<string | null> {
  const c = normalizePilot(raw) as PilotConfig;
  const key = JSON.stringify(c);
  const have = PORTRAITS.get(key);
  if (have) return Promise.resolve(have);
  if (portraitsBroken || typeof window === 'undefined') return Promise.resolve(null);
  const pending = PENDING.get(key);
  if (pending) return pending;
  const job = import('./highbotPortrait')
    .then((m) => m.renderPortrait(c))
    .then((url) => {
      PENDING.delete(key);
      if (!url) return null;
      keepPortrait(key, url);
      window.dispatchEvent(new CustomEvent(PORTRAIT_EVENT, { detail: { key } }));
      return url;
    })
    .catch(() => { PENDING.delete(key); portraitsBroken = true; return null; });
  PENDING.set(key, job);
  return job;
}

/* ---------- vector Highbot (viewBox 0 0 100 120) ---------- */

/** Eyelid cover: the share of the eye hidden from the top, and from the bottom. */
const LID: Record<Eyelid, [number, number]> = { high: [0.5, 0.18], mid: [0.32, 0], low: [0.62, 0], sus: [0.42, 0.3], chill: [0.7, 0.12] };
let uid = 0;

/** A hex color darkened (k < 1) or lightened toward white (k > 1). */
function tone(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', '').padEnd(6, '0').slice(0, 6), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k <= 1 ? v * k : v + (255 - v) * (k - 1)));
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

/* The vector Highbot, drawn like a cartoon cel: a thick black outline on every
   piece, a hard two-tone shadow on the lower right of each volume (no
   gradients) and a hard highlight on the top left. */
const INK = '#0B0C0F';
const LINE = 2.1;

function vectorBot(c: PilotConfig, id: string): string {
  const k = c.colors;
  let n = 0;
  /** A rounded box with cel shading: lit face, a shadow crescent bottom-right, a highlight, the outline. */
  const cel = (x: number, y: number, w: number, h: number, rx: number, fill: string, hi = true) => {
    const cid = `${id}-c${n++}`;
    const dx = Math.max(1.6, w * 0.13), dy = Math.max(1.6, h * 0.15);
    return `<clipPath id="${cid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/></clipPath>`
      + `<g clip-path="url(#${cid})"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${tone(fill, 0.62)}"/>`
      + `<rect x="${x - dx}" y="${y - dy}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`
      + (hi ? `<rect x="${x + w * 0.12}" y="${y + h * 0.1}" width="${w * 0.34}" height="${Math.max(1.4, h * 0.1)}" rx="${Math.max(0.7, h * 0.05)}" fill="#FFFFFF" opacity="0.5"/>` : '')
      + `</g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="${INK}" stroke-width="${LINE}"/>`;
  };
  /** A ball (joint) with a hard shadow and a dot of light. */
  const ball = (cx: number, cy: number, r: number, fill: string) => {
    const cid = `${id}-c${n++}`;
    return `<clipPath id="${cid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
      + `<g clip-path="url(#${cid})"><circle cx="${cx}" cy="${cy}" r="${r}" fill="${tone(fill, 0.6)}"/><circle cx="${cx - r * 0.28}" cy="${cy - r * 0.28}" r="${r}" fill="${fill}"/>`
      + `<circle cx="${cx - r * 0.38}" cy="${cy - r * 0.4}" r="${r * 0.26}" fill="#FFFFFF" opacity="0.55"/></g>`
      + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${LINE * 0.8}"/>`;
  };
  /** A flat shape with the outline (paths: ears, mask, decor). */
  const flat = (d: string, fill: string, w = LINE) => `<path d="${d}" fill="${fill}" stroke="${INK}" stroke-width="${w}" stroke-linejoin="round"/>`;
  const eye = (cx: number) => {
    const [top, bot] = LID[c.eyelid];
    const r = 9.5, cy = 47;
    const lidTop = cy - r + top * 2 * r;
    const lidBot = cy + r - bot * 2 * r;
    return `<clipPath id="${id}-e${cx}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`
      + `<g clip-path="url(#${id}-e${cx})"><circle cx="${cx}" cy="${cy}" r="${r}" fill="#D9DEE6"/><circle cx="${cx - 1.4}" cy="${cy - 1.4}" r="${r}" fill="#F7F8FA"/>`
      + `<circle cx="${cx}" cy="${cy + 1}" r="6.2" fill="${k.iris}"/><circle cx="${cx}" cy="${cy + 1}" r="2.7" fill="#050505"/>`
      + `<circle cx="${cx - 2.3}" cy="${cy - 1.7}" r="1.6" fill="#FFFFFF"/>`
      + `<path d="M${cx - r - 1} ${cy - r - 1} H${cx + r + 1} V${lidTop} Q${cx} ${lidTop + 2.2} ${cx - r - 1} ${lidTop} Z" fill="${k.shell}" stroke="${INK}" stroke-width="${LINE * 0.8}"/>`
      + (bot ? `<path d="M${cx - r - 1} ${cy + r + 1} H${cx + r + 1} V${lidBot} Q${cx} ${lidBot - 2} ${cx - r - 1} ${lidBot} Z" fill="${tone(k.shell, 0.8)}" stroke="${INK}" stroke-width="${LINE * 0.8}"/>` : '')
      + `</g><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${INK}" stroke-width="${LINE}"/>`;
  };
  const big = c.chestStyle === 'big';
  const plate = plateSrc(c.chest);
  return ''
    // legs and shoes
    + cel(35, 103, 11, 12, 4, k.shell, false) + cel(54, 103, 11, 12, 4, k.shell, false)
    + cel(32.5, 111.5, 16, 7.5, 3.6, k.shoes) + cel(51.5, 111.5, 16, 7.5, 3.6, k.shoes)
    // arms with shoulder joints and hooks
    + cel(16.5, 84, 11.5, 22, 5.7, k.shell) + cel(72, 84, 11.5, 22, 5.7, k.shell)
    + ball(22.3, 107, 3.6, k.joints) + ball(77.7, 107, 3.6, k.joints)
    // body: the chest gear with the logo, or the big pillar in the middle
    + `<rect x="45" y="73.5" width="10" height="7" fill="${k.joints}" stroke="${INK}" stroke-width="${LINE}"/>`
    + cel(28, 79, 44, 30, 8, k.shell)
    + ball(28.5, 85, 4.2, k.joints) + ball(71.5, 85, 4.2, k.joints)
    + (big
      ? `<circle cx="50" cy="94" r="11.5" fill="#121417" stroke="${INK}" stroke-width="${LINE}"/><circle cx="50" cy="94" r="10.2" fill="none" stroke="${k.trim}" stroke-width="1.6"/>`
        + `<image href="${plate}" xlink:href="${plate}" x="41.5" y="85.5" width="17" height="17" preserveAspectRatio="xMidYMid meet"/>`
      : `<circle cx="39.5" cy="90.5" r="5.6" fill="${k.trim}" stroke="${INK}" stroke-width="${LINE * 0.8}"/><circle cx="39.5" cy="90.5" r="3.6" fill="#121417"/>`
        + `<image href="${plate}" xlink:href="${plate}" x="36.4" y="87.4" width="6.2" height="6.2" preserveAspectRatio="xMidYMid meet"/>`
        + `<rect x="55" y="87.6" width="9.5" height="2.2" rx="1.1" fill="${k.trim}" stroke="${INK}" stroke-width="0.8"/><rect x="55" y="91.4" width="9.5" height="2.2" rx="1.1" fill="${k.trim}" stroke="${INK}" stroke-width="0.8"/>`)
    // headgear hints: halo / antenna
    + (c.headgear === 5 || c.headgear === 6 ? `<ellipse cx="50" cy="9" rx="18" ry="3.4" fill="none" stroke="${INK}" stroke-width="4"/><ellipse cx="50" cy="9" rx="18" ry="3.4" fill="none" stroke="${c.headgear === 6 ? k.trim : k.iris}" stroke-width="2"/>` : '')
    + (c.headgear === 3 || c.headgear === 4 || c.relic === 'antenna' ? `<path d="M30 15 L27 3" stroke="${INK}" stroke-width="3.4" stroke-linecap="round"/><path d="M30 15 L27 3" stroke="${k.joints}" stroke-width="1.6" stroke-linecap="round"/>${c.relic === 'antenna' ? '' : `<circle cx="26.8" cy="2.8" r="2.8" fill="${k.iris}" stroke="${INK}" stroke-width="1.4"/>`}` : '')
    + `<rect x="27" y="12.5" width="6" height="4.4" rx="2" fill="${k.trim}" stroke="${INK}" stroke-width="1.4"/>`
    // ears (behind the head)
    + (c.parts.ears
      ? flat('M17 30 L21 8 L36 20 Z', k.shell) + flat('M83 30 L79 8 L64 20 Z', tone(k.shell, 0.72))
        + `<path d="M21 26 L23 13 L31 20 Z" fill="${k.mask}"/><path d="M79 26 L77 13 L69 20 Z" fill="${k.mask}"/>`
      : '')
    + (c.headgear === 1 || c.headgear === 2 ? `<path d="M10 44 Q10 8 50 8 Q90 8 90 44" fill="none" stroke="${INK}" stroke-width="5.2"/><path d="M10 44 Q10 8 50 8 Q90 8 90 44" fill="none" stroke="${k.joints}" stroke-width="2.8"/>` : '')
    // head
    + cel(12, 16, 76, 60, 16, k.shell)
    + (c.parts.headDecor ? flat('M24 17 Q50 12 76 17 L74 21 Q50 17 26 21 Z', k.trim, 1.2) : '')
    // mask (the raccoon band) and eyes
    + (c.parts.mask ? flat('M13 46 Q13 33 26 33 Q38 33 44 40 Q50 44 56 40 Q62 33 74 33 Q87 33 87 46 Q87 60 74 60 Q62 60 56 53 Q50 50 44 53 Q38 60 26 60 Q13 60 13 46 Z', k.mask, 1.4) : '')
    + ([1, 2, 4, 5, 6, 8].includes(c.visor)
      ? cel(15, 36, 70, 22, 8, k.trim, false) + `<rect x="19" y="39" width="62" height="16" rx="6" fill="${k.iris}" stroke="${INK}" stroke-width="1.2"/><rect x="23" y="41.5" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.6"/>`
      : eye(30) + eye(70))
    // headphone cups over the sides, a mic for the headset
    + (c.headgear === 1 || c.headgear === 2 ? cel(4.5, 37, 9.5, 17, 3.2, k.trim) + cel(86, 37, 9.5, 17, 3.2, k.trim) : '')
    + (c.headgear === 2 ? `<path d="M9 54 Q10 66 24 66" fill="none" stroke="${INK}" stroke-width="3.2" stroke-linecap="round"/><path d="M9 54 Q10 66 24 66" fill="none" stroke="${k.joints}" stroke-width="1.5" stroke-linecap="round"/><circle cx="25.5" cy="66" r="2.6" fill="${k.iris}" stroke="${INK}" stroke-width="1.3"/>` : '')
    // the pillar's 3D emblem, where the bot carries it (the back core does not show from the front)
    + (c.relic === 'orbit' || c.relic === 'antenna'
      ? (() => {
        const [x, y, r] = (c.relic === 'orbit' ? [90, 28, 6] : [26, 3, 5]);
        return `<circle cx="${x}" cy="${y}" r="${r + 1}" fill="#121417" stroke="${INK}" stroke-width="1.6"/><image href="${plate}" xlink:href="${plate}" x="${x - r}" y="${y - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMid meet"/>`;
      })()
      : '')
    // nose
    + (c.parts.nose ? `<ellipse cx="50" cy="57" rx="3.6" ry="2.8" fill="${k.mask}" stroke="${INK}" stroke-width="1.2"/>` : '');
}

/** The avatar as a standalone SVG string: the rendered portrait once it exists, the vector Highbot until then. */
/** `vector`: always the vector Highbot (option thumbnails: no 3D render per option). */
export function pilotSvg(raw: PilotConfig, opts: { size?: number; idPrefix?: string; title?: string; animate?: boolean; vector?: boolean } = {}): string {
  const c = normalizePilot(raw) as PilotConfig;
  const id = opts.idPrefix || `hb${(uid = (uid + 1) % 1e6)}`;
  const size = opts.size || 160;
  const key = JSON.stringify(c);
  const portrait = opts.vector ? undefined : PORTRAITS.get(key);
  if (!portrait && !opts.vector) void portraitFor(c);
  const label = (opts.title || 'Highbot').replace(/"/g, '');
  const style = opts.animate
    ? `<style>#${id} .hb-bob{animation:sgxBotBob 3.6s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}`
      + `@keyframes sgxBotBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-1.2px)}}`
      + `@media (prefers-reduced-motion:reduce){#${id} *{animation:none!important}}</style>`
    : '';
  const body = portrait
    ? `<image href="${portrait}" xlink:href="${portrait}" x="0" y="0" width="100" height="120" preserveAspectRatio="xMidYMax meet"/>`
    : vectorBot(c, id);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="${id}" viewBox="0 0 100 120" width="${size}" height="${Math.round(size * 1.2)}" role="img" aria-label="${label}">`
    + style + `<g class="hb-bob">${body}</g></svg>`;
}

/** The avatar as an image (portrait if it can be rendered), for canvas cards and the speaker portal. */
export async function pilotImage(c: PilotConfig, size = 512): Promise<HTMLImageElement> {
  await portraitFor(c);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pilotSvg(c, { size }))}`;
  });
}

/** Raster copy (PNG data URL) for canvas cards and the PDF. */
export async function pilotPng(c: PilotConfig, size = 512): Promise<string> {
  const img = await pilotImage(c, size);
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = Math.round(size * 1.2);
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}
