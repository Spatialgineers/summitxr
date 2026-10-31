/* HIGHBOT: the Summit avatar. Everyone is a Highbot (Highcoon's robot form,
   modelled in Nomad: public/characters/highbot/highbot.glb) and makes it theirs:
   eyelids, mouth, the pillar on the chest gear and the logo on the back gear,
   colors per part group, finish and an SGX tile texture. Presets are bots
   invented from the same design, one per pillar plus two specials.
   The 3D figure is built in highbot3d.ts; flat places (header, chat, Holo Card,
   pass PDF) show a rendered portrait (highbotPortrait.ts), with a vector
   silhouette until it is ready or when WebGL is missing.
   New options always go at the END of a list: saved avatars keep their value. */

import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';

export type Eyelid = 'low' | 'mid' | 'sus' | 'high' | 'chill';
export type Mouth = 'normal' | 'meh' | 'woah' | 'happy' | 'sad';
export type Plate = PillarKey | 'SGX';
export type Finish = 'gloss' | 'matte' | 'metal';
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
  mouth: Mouth;
  /** the small plate on the chest gear */
  chest: Plate;
  /** the big plate on the back gear */
  back: Plate;
  colors: PilotColors;
  finish: Finish;
  /** SGX tile on the shell (index in PILOT_TEXTURES, 0 = plain) */
  pattern: number;
}

/* Seamless SGX tiles (from the SGX Tile Lab). 0 = plain. gain lifts the darker
   tiles so they read; scale evens out the motif size across tiles. */
export const PILOT_TEXTURES: { file: string; es: string; en: string; gain?: number; scale?: number }[] = [
  { file: '', es: 'Liso', en: 'Plain' },
  { file: 'sgx-story', es: 'SGX.Story', en: 'SGX.Story', gain: 1.98, scale: 1.3 },
  { file: 'sgx-showcase', es: 'SGX.Showcase', en: 'SGX.Showcase', gain: 2.71, scale: 1.3 },
  { file: 'sgx-spark', es: 'SGX.Spark', en: 'SGX.Spark', gain: 2.57, scale: 1.3 },
  { file: 'sgx-stage', es: 'SGX.Stage', en: 'SGX.Stage', gain: 2.26, scale: 1.3 },
  { file: 'sgx-system', es: 'SGX.System', en: 'SGX.System', gain: 2.32, scale: 1.3 },
  { file: 'sgx-synthesize', es: 'SGX.Synthesize', en: 'SGX.Synthesize', gain: 2.21, scale: 1.3 },
  { file: 'los-seis-pilares', es: 'Seis pilares', en: 'Six pillars', gain: 2.32, scale: 1.3 },
  { file: 'engranajes-sgx', es: 'Engranajes SGX', en: 'SGX gears', gain: 0.74, scale: 1.05 },
  { file: 'engranaje-g', es: 'Engranaje G', en: 'G gear', gain: 0.72, scale: 1.05 },
  { file: 'engranajes-entrelazados', es: 'Engranajes', en: 'Meshed gears', gain: 0.95 },
  { file: 'rayos-sgx', es: 'Rayos SGX', en: 'SGX bolts', gain: 1.08 },
  { file: 'rayos-nocturnos', es: 'Rayos nocturnos', en: 'Night bolts', gain: 2.32 },
  { file: 'panel-hud', es: 'Panel HUD', en: 'HUD panel', gain: 1.03, scale: 0.85 },
  { file: 'reticula-holodeck', es: 'Holodeck', en: 'Holodeck', gain: 2.88, scale: 0.7 },
  { file: 'red-de-energia-sgx', es: 'Red de energía', en: 'Energy grid', gain: 2.57, scale: 0.7 },
  { file: 'lineas-de-energia', es: 'Líneas de energía', en: 'Energy lines', gain: 3.2, scale: 0.75 },
  { file: 'circuito-futurista', es: 'Circuito', en: 'Circuit', gain: 2.88, scale: 0.75 },
  { file: 'escudo-de-energia', es: 'Escudo hex', en: 'Hex shield', gain: 3.2, scale: 1.5 },
  { file: 'metal-cepillado', es: 'Metal cepillado', en: 'Brushed metal', gain: 0.66 },
  { file: 'zigzag-sgx', es: 'Zigzag SGX', en: 'SGX zigzag', gain: 0.45, scale: 0.7 },
];

/** The eyelid shapes in the model (node names in the .glb). */
export const EYELIDS: { id: Eyelid; node: string; es: string; en: string }[] = [
  { id: 'high', node: 'HIGH', es: 'High', en: 'High' },
  { id: 'mid', node: 'Mid', es: 'Medio', en: 'Mid' },
  { id: 'low', node: 'Low', es: 'Bajo', en: 'Low' },
  { id: 'sus', node: 'Sus', es: 'Sospechoso', en: 'Sus' },
  { id: 'chill', node: 'Chill', es: 'Chill', en: 'Chill' },
];
export const MOUTHS: { id: Mouth; node: string; es: string; en: string }[] = [
  { id: 'normal', node: 'Normal', es: 'Normal', en: 'Normal' },
  { id: 'happy', node: 'Happy', es: 'Feliz', en: 'Happy' },
  { id: 'woah', node: 'Woah', es: 'Woah', en: 'Woah' },
  { id: 'meh', node: 'Meh', es: 'Meh', en: 'Meh' },
  { id: 'sad', node: 'Sad', es: 'Triste', en: 'Sad' },
];
export const PLATES: { id: Plate; es: string; en: string; src: string; color: string }[] = [
  ...SGX_PILLARS.map((p) => ({ id: p.key as Plate, es: p.name, en: p.name, src: `/holo/${p.slug}.png`, color: p.color })),
  { id: 'SGX' as Plate, es: 'Logo del Summit', en: 'Summit logo', src: '/holo/summitIcon.png', color: '#FDCC0D' },
];
export const plateSrc = (p: Plate) => PLATES.find((x) => x.id === p)?.src || '/holo/summitIcon.png';

export const FINISHES: { id: Finish; es: string; en: string }[] = [
  { id: 'gloss', es: 'Brillante', en: 'Gloss' },
  { id: 'matte', es: 'Mate', en: 'Matte' },
  { id: 'metal', es: 'Metal', en: 'Metal' },
];

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

const bot = (eyelid: Eyelid, mouth: Mouth, chest: Plate, colors: PilotColors, finish: Finish, pattern = 0, back: Plate = 'SGX'): PilotConfig =>
  ({ v: 2, eyelid, mouth, chest, back, colors, finish, pattern });

export const HIGHBOT_PRESETS: { id: string; es: string; en: string; config: PilotConfig }[] = [
  { id: 'highbot', es: 'Highbot', en: 'Highbot',
    config: bot('high', 'normal', 'SGX', { shell: '#5A5F66', trim: '#1A1A1A', joints: '#1A1A1A', mask: '#050505', iris: '#FF4040', shoes: '#5A5F66' }, 'gloss') },
  { id: 'story', es: 'StoryBot', en: 'StoryBot',
    config: bot('mid', 'happy', 'STORY', { shell: '#32527B', trim: '#5D86C6', joints: '#050505', mask: '#1A1A1A', iris: '#00DDFF', shoes: '#FFF9E2' }, 'gloss', 1) },
  { id: 'showcase', es: 'ShowcaseBot', en: 'ShowcaseBot',
    config: bot('sus', 'woah', 'SHOWCASE', { shell: '#FFF9E2', trim: '#00DDFF', joints: '#1A1A1A', mask: '#050505', iris: '#00DDFF', shoes: '#00DDFF' }, 'gloss') },
  { id: 'spark', es: 'SparkBot', en: 'SparkBot',
    config: bot('high', 'happy', 'SPARK', { shell: '#B87000', trim: '#FDCC0D', joints: '#1A1A1A', mask: '#050505', iris: '#FDCC0D', shoes: '#FDCC0D' }, 'metal', 3) },
  { id: 'stage', es: 'StageBot', en: 'StageBot',
    config: bot('chill', 'normal', 'STAGE', { shell: '#1A1A1A', trim: '#FDCC0D', joints: '#FDCC0D', mask: '#050505', iris: '#FDCC0D', shoes: '#FDCC0D' }, 'gloss', 4) },
  { id: 'system', es: 'SystemBot', en: 'SystemBot',
    config: bot('low', 'meh', 'SYSTEM', { shell: '#888888', trim: '#00DDFF', joints: '#333333', mask: '#1A1A1A', iris: '#00DDFF', shoes: '#333333' }, 'metal', 17) },
  { id: 'synthesize', es: 'SynthBot', en: 'SynthBot',
    config: bot('mid', 'happy', 'SYNTHESIZE', { shell: '#FFF9E2', trim: '#B87000', joints: '#32527B', mask: '#32527B', iris: '#FFBB00', shoes: '#32527B' }, 'matte', 7) },
  { id: 'gold', es: 'Creador Dorado', en: 'Golden Creator',
    config: bot('high', 'happy', 'SGX', { shell: '#FDCC0D', trim: '#050505', joints: '#050505', mask: '#050505', iris: '#00DDFF', shoes: '#050505' }, 'metal') },
];

const BASE = HIGHBOT_PRESETS[0].config;
const clone = (c: PilotConfig): PilotConfig => ({ ...c, colors: { ...c.colors } });

/** Same seed, same bot: for passes forged before the builder and for other people's QR seeds. */
export function configFromSeed(seed: string, accent = '#FDCC0D'): PilotConfig {
  const r = rng(seed || 'sgx');
  const c = clone(pickOf(r, HIGHBOT_PRESETS).config);
  c.eyelid = pickOf(r, EYELIDS).id;
  c.mouth = pickOf(r, MOUTHS).id;
  if (r() < 0.5) c.colors.iris = snap(accent, BOT_SWATCHES, c.colors.iris);
  return c;
}

/** Sorpresa: a preset as a starting point, with its own face, plate and a color or two. */
export function randomPilot(accent?: string): PilotConfig {
  const r = Math.random;
  const c = clone(pickOf(r, HIGHBOT_PRESETS).config);
  c.eyelid = pickOf(r, EYELIDS).id;
  c.mouth = pickOf(r, MOUTHS).id;
  c.chest = pickOf(r, PLATES).id;
  if (r() < 0.6) c.colors.iris = accent && r() < 0.5 ? snap(accent, BOT_SWATCHES, c.colors.iris) : pickOf(r, BOT_SWATCHES);
  if (r() < 0.5) c.colors.trim = pickOf(r, BOT_SWATCHES);
  if (r() < 0.35) c.colors.shell = pickOf(r, BOT_SWATCHES);
  if (r() < 0.3) c.pattern = Math.floor(r() * PILOT_TEXTURES.length);
  if (r() < 0.3) c.finish = pickOf(r, FINISHES).id;
  return c;
}

/** A close cousin: one or two things change. */
export function varyPilot(c: PilotConfig): PilotConfig {
  const next = clone(c);
  const r = Math.random;
  const n = 1 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const k = Math.floor(r() * 5);
    if (k === 0) next.eyelid = pickOf(r, EYELIDS.filter((e) => e.id !== next.eyelid)).id;
    else if (k === 1) next.mouth = pickOf(r, MOUTHS.filter((m) => m.id !== next.mouth)).id;
    else if (k === 2) next.chest = pickOf(r, PLATES.filter((p) => p.id !== next.chest)).id;
    else if (k === 3) { const g = pickOf(r, COLOR_GROUPS).id; next.colors[g] = pickOf(r, BOT_SWATCHES.filter((h) => h !== next.colors[g])); }
    else next.pattern = r() < 0.4 ? 0 : 1 + Math.floor(r() * (PILOT_TEXTURES.length - 1));
  }
  return next;
}

/** The pillar plate an old (v1) avatar's emblem pointed at: emblems 3–8 were the six pillars. */
const V1_EMBLEM_PLATE: Record<number, Plate> = { 3: 'STORY', 4: 'SHOWCASE', 5: 'SPARK', 6: 'STAGE', 7: 'SYSTEM', 8: 'SYNTHESIZE' };

export function normalizePilot(raw: unknown, accent = '#FDCC0D'): PilotConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, any>;
  // v1 (the XR pilot): keep its colors, texture and pillar emblem; the face comes from its own data
  if (c.v !== 2) {
    const r = rng(JSON.stringify(c));
    const out = clone(BASE);
    out.eyelid = pickOf(r, EYELIDS).id;
    out.mouth = pickOf(r, MOUTHS).id;
    out.colors = {
      shell: snap(c.shell, BOT_SWATCHES, BASE.colors.shell),
      trim: snap(c.primary, BOT_SWATCHES, snap(accent, BOT_SWATCHES, BASE.colors.trim)),
      joints: '#1A1A1A',
      mask: '#050505',
      iris: snap(c.glow, BOT_SWATCHES, BASE.colors.iris),
      shoes: snap(c.secondary, BOT_SWATCHES, BASE.colors.shoes),
    };
    out.chest = V1_EMBLEM_PLATE[Number(c.emblem)] || 'SGX';
    const p = Number(c.pattern);
    out.pattern = Number.isFinite(p) && p >= 0 && p < PILOT_TEXTURES.length ? Math.floor(p) : 0;
    return out;
  }
  const colors = (c.colors && typeof c.colors === 'object' ? c.colors : {}) as Partial<PilotColors>;
  const p = Number(c.pattern);
  return {
    v: 2,
    eyelid: EYELIDS.some((e) => e.id === c.eyelid) ? c.eyelid : BASE.eyelid,
    mouth: MOUTHS.some((m) => m.id === c.mouth) ? c.mouth : BASE.mouth,
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
    finish: FINISHES.some((f) => f.id === c.finish) ? c.finish : BASE.finish,
    pattern: Number.isFinite(p) && p >= 0 && p < PILOT_TEXTURES.length ? Math.floor(p) : 0,
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
const PORTRAIT_STORE = 'sgx_pilot_portraits_v1';
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
const MOUTH_PATH: Record<Mouth, string> = {
  normal: 'M46.5 64.5 Q50 66.5 53.5 64.5',
  happy: 'M45.5 63.5 Q50 69 54.5 63.5 Z',
  woah: 'M50 66.2 m-2.4 0 a2.4 2.6 0 1 0 4.8 0 a2.4 2.6 0 1 0 -4.8 0',
  meh: 'M46.5 65 L53.5 65',
  sad: 'M46.5 66.5 Q50 63.5 53.5 66.5',
};
let uid = 0;

function vectorBot(c: PilotConfig, id: string): string {
  const k = c.colors;
  const eye = (cx: number) => {
    const [top, bot] = LID[c.eyelid];
    const r = 9.5, cy = 47;
    const lidTop = cy - r + top * 2 * r;
    const lidBot = cy + r - bot * 2 * r;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#F2F4F7"/>`
      + `<circle cx="${cx}" cy="${cy + 1}" r="6.2" fill="${k.iris}"/><circle cx="${cx}" cy="${cy + 1}" r="2.6" fill="#050505"/>`
      + `<circle cx="${cx - 2.2}" cy="${cy - 1.6}" r="1.4" fill="#FFFFFF" opacity="0.8"/>`
      + `<path d="M${cx - r - 1} ${cy - r - 1} H${cx + r + 1} V${lidTop} Q${cx} ${lidTop + 2.2} ${cx - r - 1} ${lidTop} Z" fill="${k.shell}" clip-path="url(#${id}-e${cx})"/>`
      + (bot ? `<path d="M${cx - r - 1} ${cy + r + 1} H${cx + r + 1} V${lidBot} Q${cx} ${lidBot - 2} ${cx - r - 1} ${lidBot} Z" fill="${k.shell}" clip-path="url(#${id}-e${cx})"/>` : '')
      + `<clipPath id="${id}-e${cx}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`;
  };
  const mouth = MOUTH_PATH[c.mouth];
  const mouthFill = c.mouth === 'happy' || c.mouth === 'woah' ? `fill="${k.mask}"` : 'fill="none"';
  return ''
    // legs and shoes
    + `<rect x="35" y="104" width="11" height="12" rx="4" fill="${k.shell}"/><rect x="54" y="104" width="11" height="12" rx="4" fill="${k.shell}"/>`
    + `<rect x="33" y="112" width="15" height="7" rx="3.5" fill="${k.shoes}"/><rect x="52" y="112" width="15" height="7" rx="3.5" fill="${k.shoes}"/>`
    // arms with shoulder joints
    + `<rect x="17" y="84" width="11" height="22" rx="5.5" fill="${k.shell}"/><rect x="72" y="84" width="11" height="22" rx="5.5" fill="${k.shell}"/>`
    + `<circle cx="28.5" cy="85" r="4" fill="${k.joints}"/><circle cx="71.5" cy="85" r="4" fill="${k.joints}"/>`
    + `<circle cx="22.5" cy="107" r="3.4" fill="${k.joints}"/><circle cx="77.5" cy="107" r="3.4" fill="${k.joints}"/>`
    // body, chest gear and decor
    + `<rect x="28" y="79" width="44" height="30" rx="8" fill="${k.shell}"/>`
    + `<rect x="28" y="79" width="44" height="30" rx="8" fill="url(#${id}-g)"/>`
    + `<circle cx="40" cy="91" r="5.2" fill="${k.trim}"/><circle cx="40" cy="91" r="2.8" fill="#050505"/>`
    + `<rect x="55" y="88" width="9" height="1.8" rx="0.9" fill="${k.trim}"/><rect x="55" y="91.5" width="9" height="1.8" rx="0.9" fill="${k.trim}"/>`
    + `<rect x="45" y="74" width="10" height="6" fill="${k.joints}"/>`
    // ears (behind the head)
    + `<path d="M17 30 L21 8 L36 20 Z" fill="${k.shell}"/><path d="M83 30 L79 8 L64 20 Z" fill="${k.shell}"/>`
    + `<path d="M21 26 L23 13 L31 20 Z" fill="${k.mask}"/><path d="M79 26 L77 13 L69 20 Z" fill="${k.mask}"/>`
    // head
    + `<rect x="12" y="16" width="76" height="60" rx="16" fill="${k.shell}"/>`
    + `<rect x="12" y="16" width="76" height="60" rx="16" fill="url(#${id}-g)"/>`
    + `<path d="M24 17 Q50 12 76 17 L74 21 Q50 17 26 21 Z" fill="${k.trim}"/>`
    // mask (the raccoon band) and eyes
    + `<path d="M13 46 Q13 33 26 33 Q38 33 44 40 Q50 44 56 40 Q62 33 74 33 Q87 33 87 46 Q87 60 74 60 Q62 60 56 53 Q50 50 44 53 Q38 60 26 60 Q13 60 13 46 Z" fill="${k.mask}"/>`
    + eye(30) + eye(70)
    // nose and mouth
    + `<ellipse cx="50" cy="57" rx="3.4" ry="2.6" fill="${k.mask}"/>`
    + `<path d="${mouth}" ${mouthFill} stroke="${k.mask}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
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
    : `<defs><linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.18"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.3"/></linearGradient></defs>`
      + vectorBot(c, id);
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
