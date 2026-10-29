/* SGX PILOT: a parametric XR avatar. Every part is a choice the visitor
   makes in the Pilot Builder: head (human, android, cyborg, mech), hair,
   headset (VR, AR, MR, gaming, faceplates), what the lens shows, accessory,
   outfit, chest emblem (SGX bolt, SGX gear, the SGX icon, Guild or a pillar)
   and the outfit texture (the seamless SGX tiles from the Tile Lab). Official
   SGX and pillar colors, plus natural hair tones. Drawn as a plain SVG string
   so it renders the same in React, on canvas (Holo Card, PDF) and at any size.
   New options always go at the END of a list: saved avatars keep their index. */

export interface PilotConfig {
  v: 1;
  /** head shape */
  helmet: number;
  /** headset */
  visor: number;
  /** what the lens shows */
  eyes: number;
  /** accessory */
  crest: number;
  /** outfit */
  armor: number;
  emblem: number;
  /** outfit texture */
  pattern: number;
  /** trim, outline, emblem plate */
  primary: string;
  /** accessory and details */
  secondary: string;
  /** lens light */
  glow: string;
  /** head and plain outfit */
  shell: string;
  /** hairstyle (0 = none; older avatars have none) */
  hair: number;
  hairColor: string;
}

/* Seamless SGX tiles (from the SGX Tile Lab) used as outfit textures. 0 = plain. */
/* gain lifts the darker tiles so they read on a small outfit. scale evens out
   the motif size: a tile with 5×5 small marks prints bigger, one with two big
   stripes smaller, so every texture reads at about the same size. */
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

/* Chest emblems: official marks only. */
const EMBLEMS: { src: string; es: string; en: string }[] = [
  { src: '/holo/bolt.png', es: 'Rayo SGX', en: 'SGX bolt' },
  { src: '/holo/gear.png', es: 'Engranaje SGX', en: 'SGX gear' },
  { src: '/holo/guild.png', es: 'SGX Guild', en: 'SGX Guild' },
  { src: '/holo/story.png', es: 'Story', en: 'Story' },
  { src: '/holo/showcase.png', es: 'Showcase', en: 'Showcase' },
  { src: '/holo/spark.png', es: 'Spark', en: 'Spark' },
  { src: '/holo/stage.png', es: 'Stage', en: 'Stage' },
  { src: '/holo/system.png', es: 'System', en: 'System' },
  { src: '/holo/synthesize.png', es: 'Synthesize', en: 'Synthesize' },
  { src: '', es: 'Ninguno', en: 'None' },
  { src: '/holo/gearG.png|/holo/bolt.png', es: 'Ícono SGX', en: 'SGX icon' },
];
/** An emblem can stack two marks (the SGX icon: G gear + bolt). */
const emblemSrcs = (i: number) => (EMBLEMS[i]?.src || '').split('|').filter(Boolean);
const ICON_SRCS = emblemSrcs(EMBLEMS.length - 1);

export const PART_COUNTS = { helmet: 13, visor: 13, eyes: 12, crest: 19, armor: 13, emblem: EMBLEMS.length, pattern: PILOT_TEXTURES.length, hair: 11 } as const;
/* The part counts before the 2026-10 expansion: avatars made from a seed (passes
   forged before the builder, other people's QR seeds) keep their exact look. */
const SEED_COUNTS = { helmet: 8, visor: 9, eyes: 8, crest: 10, armor: 7, emblem: 10, pattern: 21 } as const;
export type PilotPart = keyof typeof PART_COUNTS;

export const PART_NAMES: Record<PilotPart, { es: string[]; en: string[] }> = {
  helmet: {
    es: ['Redonda', 'Ovalada', 'Cuadrada', 'Hexa', 'Cápsula', 'Low-poly', 'Mecha', 'Holograma', 'Suave', 'Corazón', 'Androide', 'Cyborg', 'Mecha con aletas'],
    en: ['Round', 'Oval', 'Square', 'Hex', 'Capsule', 'Low-poly', 'Mech', 'Hologram', 'Soft', 'Heart', 'Android', 'Cyborg', 'Finned mech'],
  },
  visor: {
    es: ['VR clásico', 'VR slim', 'Gafas AR', 'Visor MR', 'Visor gaming', 'Goggles', 'Monóculo holo', 'Banda LED', 'Escudo facial', 'Gafas cat-eye', 'Placa androide', 'Visor T mecha', 'Máscara cyborg'],
    en: ['Classic VR', 'Slim VR', 'AR glasses', 'MR visor', 'Gaming visor', 'Goggles', 'Holo monocle', 'LED band', 'Face shield', 'Cat-eye AR', 'Android faceplate', 'Mech T-visor', 'Cyborg half-mask'],
  },
  eyes: {
    es: ['HUD', 'Escáner', 'Ojos LED', 'Mira', 'Píxel', 'Cargando', 'Onda', 'Rayo SGX', 'Ojos delineados', 'Ojos androide', 'Engranaje SGX', 'Destellos'],
    en: ['HUD', 'Scanner', 'LED eyes', 'Reticle', 'Pixel', 'Loading', 'Waveform', 'SGX bolt', 'Winged eyes', 'Android eyes', 'SGX gear', 'Sparkles'],
  },
  crest: {
    es: ['Nada', 'Audífonos', 'Headset con mic', 'Orejas de gato', 'Antena', 'Halo', 'Gorro', 'Capucha', 'Mohawk', 'Pelo en punta', 'Aretes de aro', 'Ear cuffs LED', 'Diadema tech', 'Pinzas LED', 'Halo engranaje SGX', 'Antena rayo SGX', 'Auricular rayo', 'Aletas mecha', 'Ícono SGX flotante'],
    en: ['None', 'Headphones', 'Headset + mic', 'Cat ears', 'Antenna', 'Halo', 'Beanie', 'Hood', 'Mohawk', 'Spiky hair', 'Hoop earrings', 'LED ear cuffs', 'Tech headband', 'LED hair clips', 'SGX gear halo', 'SGX bolt antenna', 'Bolt earpiece', 'Mech fins', 'Floating SGX icon'],
  },
  armor: {
    es: ['Hoodie', 'Techwear', 'Traje háptico', 'Jersey esports', 'Bomber', 'Chaleco', 'Capa streamer', 'Chaqueta corta', 'Body cuello alto', 'Abrigo largo', 'Hombreras mecha', 'Chasis androide', 'Hombreras engranaje'],
    en: ['Hoodie', 'Techwear', 'Haptic suit', 'Esports jersey', 'Bomber', 'Vest', 'Streamer cape', 'Cropped jacket', 'High-collar bodysuit', 'Long coat', 'Mech shoulders', 'Android frame', 'Gear pauldrons'],
  },
  hair: {
    es: ['Sin cabello', 'Largo lacio', 'Largo ondulado', 'Cola alta', 'Dos moños', 'Trenzas', 'Afro rizado', 'Bob', 'Rapado lateral', 'Locs', 'Corto rizado'],
    en: ['None', 'Long straight', 'Long wavy', 'High ponytail', 'Double buns', 'Box braids', 'Curly afro', 'Bob', 'Undercut', 'Locs', 'Short curls'],
  },
  emblem: { es: EMBLEMS.map((e) => e.es), en: EMBLEMS.map((e) => e.en) },
  pattern: { es: PILOT_TEXTURES.map((t) => t.es), en: PILOT_TEXTURES.map((t) => t.en) },
};

/** Official SGX lights (design system + pillar inks). No free colors. */
export const PILOT_SWATCHES = ['#FDCC0D', '#FFBB00', '#B87000', '#00DDFF', '#5D86C6', '#32527B', '#888888', '#FFF9E2', '#FFFFFF'];
/** Official SGX bases for the head and plain outfits. */
export const SHELL_SWATCHES = ['#050505', '#1A1A1A', '#333333', '#32527B', '#888888', '#FFF9E2', '#B87000', '#5D86C6'];
/** Hair: natural tones first (black, browns, auburn, copper, gray), then SGX lights. */
export const HAIR_SWATCHES = ['#121212', '#2E1D14', '#5A3622', '#8A4A24', '#B87000', '#D9D4C7', '#FDCC0D', '#00DDFF', '#5D86C6', '#FFF9E2'];
const HAIR_NATURAL = HAIR_SWATCHES.slice(0, 6);

const HEX = /^#[0-9a-fA-F]{6}$/;
function rgbOf(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/** Any color snaps to the closest official one (older pilots had free colors). */
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
const wrap = (n: number, max: number) => ((Math.floor(n) % max) + max) % max;

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

function pickParts<K extends string>(r: () => number, counts: Record<K, number>) {
  const p = {} as Record<K, number>;
  (Object.keys(counts) as K[]).forEach((k) => { p[k] = Math.floor(r() * counts[k]); });
  return p;
}

/* Accessories that are themselves hair: they replace a hairstyle. */
export const HAIR_CRESTS = [8, 9];

/** Same seed, same pilot: for passes forged before the builder and for other people's QR seeds. */
export function configFromSeed(seed: string, accent = '#FDCC0D'): PilotConfig {
  const r = rng(seed || 'sgx');
  const parts = { ...pickParts(r, SEED_COUNTS), hair: 0 };
  const primary = snap(accent, PILOT_SWATCHES, '#FDCC0D');
  const lights = ['#00DDFF', '#FDCC0D', '#FFFFFF', '#5D86C6'];
  let secondary = lights[Math.floor(r() * lights.length)];
  if (secondary === primary) secondary = primary === '#00DDFF' ? '#FDCC0D' : '#00DDFF';
  return {
    v: 1, ...parts,
    primary,
    secondary,
    glow: r() > 0.5 ? '#00DDFF' : primary,
    shell: SHELL_SWATCHES[Math.floor(r() * 4)],
    hairColor: HAIR_SWATCHES[0],
  };
}

/* Sorpresa: every option stays in the draw, but most rolls lean either human
   (hairstyles, soft heads, earrings, cut outfits) or machine (android, cyborg,
   mech heads, faceplates, armor), half and half, so neither look dominates. */
const LEAN_HUMAN = { helmet: [0, 1, 4, 7, 8, 9], visor: [0, 1, 2, 3, 5, 7, 8, 9], crest: [0, 1, 2, 3, 5, 10, 11, 12, 13, 14], armor: [0, 1, 3, 4, 5, 6, 7, 8, 9] };
const LEAN_MACHINE = { helmet: [2, 3, 5, 6, 10, 11, 12], visor: [3, 4, 6, 10, 11, 12], crest: [4, 14, 15, 16, 17, 18], armor: [1, 2, 10, 11, 12] };
const anyHair = (r: () => number) => 1 + Math.floor(r() * (PART_COUNTS.hair - 1));

export function randomPilot(accent?: string): PilotConfig {
  const r = Math.random;
  const parts = pickParts(r, PART_COUNTS);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  if (r() < 0.7) {
    const human = r() < 0.5;
    const lean = human ? LEAN_HUMAN : LEAN_MACHINE;
    parts.helmet = pick(lean.helmet);
    parts.visor = pick(lean.visor);
    parts.crest = pick(lean.crest);
    parts.armor = pick(lean.armor);
    parts.hair = human || r() < 0.3 ? anyHair(r) : 0;
  } else {
    parts.hair = r() < 0.6 ? anyHair(r) : 0;
  }
  if (parts.hair && HAIR_CRESTS.includes(parts.crest)) parts.crest = pick([0, 10, 11, 12, 13]);
  const primary = accent && r() < 0.6 ? snap(accent, PILOT_SWATCHES, '#FDCC0D') : pick(PILOT_SWATCHES);
  let secondary = pick(PILOT_SWATCHES);
  if (secondary === primary) secondary = primary === '#00DDFF' ? '#FDCC0D' : '#00DDFF';
  return {
    v: 1, ...parts,
    primary,
    secondary,
    glow: pick(['#00DDFF', '#FDCC0D', '#FFBB00', '#FFFFFF']),
    shell: pick(SHELL_SWATCHES),
    hairColor: r() < 0.7 ? pick(HAIR_NATURAL) : pick(HAIR_SWATCHES),
  };
}

/** A close cousin: 1–2 parts (or one color) change. */
export function varyPilot(c: PilotConfig): PilotConfig {
  const next = { ...c };
  const keys = Object.keys(PART_COUNTS) as PilotPart[];
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const k = keys[Math.floor(Math.random() * keys.length)];
    next[k] = wrap(next[k] + 1 + Math.floor(Math.random() * (PART_COUNTS[k] - 1)), PART_COUNTS[k]);
  }
  if (Math.random() < 0.35) next.glow = PILOT_SWATCHES[Math.floor(Math.random() * PILOT_SWATCHES.length)];
  if (next.hair && Math.random() < 0.25) next.hairColor = HAIR_SWATCHES[Math.floor(Math.random() * HAIR_SWATCHES.length)];
  // a hair-like accessory (mohawk, spikes) and a hairstyle never stack
  if (next.hair && HAIR_CRESTS.includes(next.crest)) {
    if (next.crest !== c.crest) next.hair = 0; else next.crest = 0;
  }
  return next;
}

export function normalizePilot(c: Partial<PilotConfig> | null | undefined, accent = '#FDCC0D'): PilotConfig | null {
  if (!c || typeof c !== 'object') return null;
  const base = configFromSeed('sgx', accent);
  const out = { ...base } as PilotConfig;
  (Object.keys(PART_COUNTS) as PilotPart[]).forEach((k) => {
    const v = Number((c as any)[k]);
    out[k] = Number.isFinite(v) ? wrap(v, PART_COUNTS[k]) : base[k];
  });
  out.primary = snap(c.primary, PILOT_SWATCHES, base.primary);
  out.secondary = snap(c.secondary, PILOT_SWATCHES, base.secondary);
  out.glow = snap(c.glow, PILOT_SWATCHES, base.glow);
  out.shell = snap(c.shell, SHELL_SWATCHES, base.shell);
  out.hairColor = snap(c.hairColor, HAIR_SWATCHES, base.hairColor);
  return out;
}

/* ---------- images (emblems, textures) ----------
   In the page the SVG points at /holo and /pilot/tex. A raster copy (canvas,
   PDF) cannot load outside images, so those are inlined as data URIs first. */

const INLINE = new Map<string, string>();
const texUrl = (i: number) => (PILOT_TEXTURES[i]?.file ? `/pilot/tex/${PILOT_TEXTURES[i].file}.png` : '');
const asset = (url: string) => INLINE.get(url) || url;

async function inline(url: string): Promise<void> {
  if (!url || INLINE.has(url)) return;
  try {
    const blob = await (await fetch(url)).blob();
    const data = await new Promise<string>((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.onerror = rej; fr.readAsDataURL(blob); });
    INLINE.set(url, data);
  } catch { /* the raster copy simply goes without it */ }
}

/** Inline the images this avatar uses, so its raster copy carries them. */
export async function loadPilotAssets(c: PilotConfig): Promise<void> {
  const n = normalizePilot(c) as PilotConfig;
  await Promise.all([...emblemSrcs(n.emblem).map(inline), inline(texUrl(n.pattern)), ...(n.crest === 18 ? ICON_SRCS.map(inline) : [])]);
}

/** Swap every <image> href in a rendered SVG for an inlined copy, so a
    data-URL raster of it (canvas, PDF) still shows emblems and textures. */
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

/** What the 3D avatar (pilot3d.ts) needs from a config: the emblem and texture
    images, the texture gain, and the lens interface as a standalone SVG. */
export function pilotAssets3D(raw: PilotConfig) {
  const c = normalizePilot(raw) as PilotConfig;
  const lensBox = '20 38 60 26';
  const lens = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${lensBox}" width="512" height="222">`
    + `<defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.glow}"/><stop offset="1" stop-color="${c.secondary}"/></linearGradient></defs>`
    + `<rect x="0" y="0" width="100" height="120" fill="url(#lg)"/>`
    + `<rect x="0" y="0" width="100" height="120" fill="#000" opacity="0.18"/>`
    + lensSvg(c.eyes, c.glow, c.secondary)
    + `</svg>`;
  return {
    emblemUrl: emblemSrcs(c.emblem)[0] || '',
    /** the SGX icon emblem: built from the real 3D icon (pilot3d) */
    emblemIcon: c.emblem === EMBLEMS.length - 1,
    textureUrl: texUrl(c.pattern),
    textureGain: PILOT_TEXTURES[c.pattern]?.gain ?? 1,
    textureScale: PILOT_TEXTURES[c.pattern]?.scale ?? 1,
    lensSvg: lens,
  };
}

/* ---------- geometry (viewBox 0 0 100 120) ---------- */

/** The SGX bolt, in a unit box (x right, y down). Shared with the 3D build. */
export const BOLT_POINTS: [number, number][] = [[0.78, 0], [0.3, 0.56], [0.52, 0.56], [0.22, 1], [0.8, 0.4], [0.56, 0.4]];
const boltPath = (x: number, y: number, w: number, h: number) => `M${BOLT_POINTS.map(([px, py]) => `${(x + px * w).toFixed(2)} ${(y + py * h).toFixed(2)}`).join(' L')} Z`;

/** SGX gear outline (flat-topped teeth) with an optional bore; use fill-rule evenodd. */
function gearPath(cx: number, cy: number, ro: number, ri: number, teeth: number, bore = 0): string {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let k = 0; k < teeth; k++) {
    const a = k * step - Math.PI / 2;
    for (const [da, r] of [[-0.3, ri], [-0.17, ro], [0.17, ro], [0.3, ri]]) pts.push(`${(cx + Math.cos(a + da * step) * r).toFixed(2)} ${(cy + Math.sin(a + da * step) * r).toFixed(2)}`);
  }
  const hole = bore ? ` M${cx + bore} ${cy} A${bore} ${bore} 0 1 0 ${cx - bore} ${cy} A${bore} ${bore} 0 1 0 ${cx + bore} ${cy} Z` : '';
  return `M${pts.join(' L')} Z${hole}`;
}

/** A four-point sparkle. */
const star = (x: number, y: number, r: number) => `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`;

const HEADS = [
  'M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 C34 82 24 70 24 52 C24 34 34 22 50 22 Z',
  'M50 18 C66 18 74 34 74 54 C74 72 64 84 50 84 C36 84 26 72 26 54 C26 34 34 18 50 18 Z',
  'M32 22 L68 22 Q78 22 78 32 L78 70 Q78 82 66 82 L34 82 Q22 82 22 70 L22 32 Q22 22 32 22 Z',
  'M50 18 L76 32 L76 68 L50 84 L24 68 L24 32 Z',
  'M50 16 C68 16 76 28 76 44 L76 66 C76 78 66 86 50 86 C34 86 24 78 24 66 L24 44 C24 28 32 16 50 16 Z',
  'M50 18 L70 26 L78 50 L70 74 L50 84 L30 74 L22 50 L30 26 Z',
  'M30 22 L70 22 L78 32 L78 58 L72 64 L72 76 L62 84 L38 84 L28 76 L28 64 L22 58 L22 32 Z',
  'M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 C34 82 24 70 24 52 C24 34 34 22 50 22 Z',
  'M50 20 C69 20 78 31 78 50 C78 70 68 83 50 83 C32 83 22 70 22 50 C22 31 31 20 50 20 Z',
  'M50 20 C68 20 78 31 77 47 C76 63 64 77 50 85 C36 77 24 63 23 47 C22 31 32 20 50 20 Z',
  'M50 18 C66 18 75 32 75 50 C75 68 64 82 50 84 C36 82 25 68 25 50 C25 32 34 18 50 18 Z',
  'M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 C34 82 24 70 24 52 C24 34 34 22 50 22 Z',
  'M32 22 L50 15 L68 22 L77 36 L77 62 L70 76 L58 84 L42 84 L30 76 L23 62 L23 36 Z',
];

/* Head pieces behind the head (mech fins) and on top of it (android seams, cyborg plate). */
function headBack(i: number, p: string, glow: string): string {
  if (i !== 12) return '';
  return `<path d="M27 44 L5 14 L12 15 L31 36 Z M73 44 L95 14 L88 15 L69 36 Z" fill="${p}"/><path d="M25 38 L10 18 M75 38 L90 18" stroke="${glow}" stroke-width="1" opacity="0.9"/>`;
}
function headDetail(i: number, p: string, glow: string): string {
  switch (i) {
    case 10: return `<g fill="none" stroke="${p}" stroke-width="0.8" opacity="0.75"><path d="M50 18 L50 30 M29 64 Q38 76 50 78 Q62 76 71 64"/></g>`
      + `<g fill="${p}" opacity="0.8"><rect x="45" y="72" width="10" height="1"/><rect x="46" y="74.5" width="8" height="1"/></g>`
      + `<g fill="#141414" stroke="${glow}" stroke-width="0.9"><circle cx="25" cy="58" r="3.4"/><circle cx="75" cy="58" r="3.4"/></g>`;
    case 11: return `<path d="M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 Z" fill="#8A9099"/><path d="M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 Z" fill="#000" opacity="0.25"/>`
      + `<path d="M50 22 L50 82" stroke="${glow}" stroke-width="1"/><path d="M55 72 L61 66 L68 66 M58 30 L64 34 L64 40" fill="none" stroke="${glow}" stroke-width="0.7"/>`
      + `<g fill="#2A2D33"><circle cx="58" cy="26" r="1.1"/><circle cx="71" cy="38" r="1.1"/><circle cx="72" cy="68" r="1.1"/><circle cx="59" cy="78" r="1.1"/></g>`;
    case 12: return `<path d="M50 15 L50 32" stroke="${p}" stroke-width="3"/><path d="M42 84 L45 76 L55 76 L58 84" fill="none" stroke="${p}" stroke-width="1"/>`;
    default: return '';
  }
}

/* ---------- hair: a back layer (behind the head, over the shoulders) and a front layer (over the head, under the headset) ---------- */

// cap with a center part (leaves the hairline open around the headset)
const CAP_PART = 'M23 50 C21 28 34 15 50 15 C66 15 79 28 77 50 L74 50 C73 36 64 27 52 25.5 L50 29 L48 25.5 C36 27 27 36 26 50 Z';
// slicked back (ponytail, buns)
const CAP_TIGHT = 'M24 46 C23 27 35 17 50 17 C65 17 77 27 76 46 L73 40 C70 30 61 25 50 25 C39 25 30 30 27 40 Z';
const MASS = 'M23 46 C21 26 34 15 50 15 C66 15 79 26 77 46 L78 84 L22 84 Z';
const mirrorX = (d: string) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${+(100 - +x).toFixed(2)} ${y}`);

/** Scalloped curls along an arc: a ring of small circles. */
function curls(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number, r: number, fill: string, opacity = 1): string {
  let out = '';
  for (let k = 0; k < n; k++) {
    const a = a0 + ((a1 - a0) * k) / (n - 1);
    out += `<circle cx="${(cx + Math.cos(a) * rx).toFixed(2)}" cy="${(cy + Math.sin(a) * ry).toFixed(2)}" r="${r}"/>`;
  }
  return `<g fill="${fill}" fill-opacity="${opacity}">${out}</g>`;
}
/** Hanging strands (braids, locs): rounded bars with ticks and SGX cuffs. */
function strands(xs: number[], y0: number, len: (k: number) => number, w: number, h: string, cuff: string, ticks: boolean): string {
  return xs.map((x, k) => {
    const L = len(k);
    const t = ticks ? Array.from({ length: Math.floor(L / 4.5) }, (_, j) => `M${x - w / 2} ${y0 + 3 + j * 4.5} L${x + w / 2} ${y0 + 4.6 + j * 4.5}`).join(' ') : '';
    return `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${L}" rx="${w / 2}" fill="${h}"/>`
      + (t ? `<path d="${t}" stroke="#000" stroke-opacity="0.3" stroke-width="0.7"/>` : '')
      + `<rect x="${x - w / 2 - 0.3}" y="${y0 + L - 4}" width="${w + 0.6}" height="1.8" fill="${cuff}"/>`;
  }).join('');
}

function hairBack(i: number, h: string, s: string, glow: string): string {
  switch (i) {
    case 1: return `<path d="M23 46 C21 26 34 15 50 15 C66 15 79 26 77 46 L80 106 Q72 110 64 104 L63 82 L37 82 L36 104 Q28 110 20 106 Z" fill="${h}"/>`;
    case 2: return `<path d="M23 46 C21 26 34 15 50 15 C66 15 79 26 77 46 C84 58 76 66 82 78 C88 90 78 98 84 108 Q74 112 66 104 C70 96 62 90 64 82 L36 82 C38 90 30 96 34 104 Q26 112 16 108 C22 98 12 90 18 78 C24 66 16 58 23 46 Z" fill="${h}"/>`;
    case 3: return `<path d="M58 21 C64 8 80 6 86 18 C92 32 84 50 88 70 C91 84 85 96 80 102 C82 86 76 74 76 58 C76 42 80 30 70 25 C66 23 62 23 60 25 Z" fill="${h}"/><path d="M80 30 C82 50 80 70 84 92" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="0.8"/>`
      + `<rect x="55" y="15" width="9" height="7" rx="2" fill="${s}" transform="rotate(-20 59 18)"/><circle cx="59.5" cy="18.5" r="1.3" fill="${glow}"/>`;
    case 4: return `<g fill="${h}"><circle cx="28" cy="22" r="10"/><circle cx="72" cy="22" r="10"/></g><g fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="0.8"><path d="M22 20 Q28 13 34 20 Q30 26 25 23"/><path d="M66 20 Q72 13 78 20 Q74 26 69 23"/></g>`
      + `<g fill="none" stroke="${glow}" stroke-width="1" stroke-dasharray="2 2.4"><circle cx="28" cy="22" r="11.6"/><circle cx="72" cy="22" r="11.6"/></g>`;
    case 5: return `<path d="${MASS}" fill="${h}"/>` + strands([18.5, 23, 27.5, 72.5, 77, 81.5], 44, (k) => 58 + (k % 3) * 4, 3.8, h, s, true);
    case 6: {
      const cx = 50, cy = 44, n = 22;
      let d = '';
      for (let k = 0; k <= n; k++) {
        const a = (k / n) * Math.PI * 2;
        const x = (cx + Math.cos(a) * 33).toFixed(2), y = (cy + Math.sin(a) * 31).toFixed(2);
        d += k === 0 ? `M${x} ${y}` : ` A5.2 5.2 0 0 1 ${x} ${y}`;
      }
      return `<path d="${d} Z" fill="${h}"/>` + curls(cx, cy, 26, 24, Math.PI * 1.05, Math.PI * 1.95, 7, 2.2, '#000', 0.18);
    }
    case 7: return `<path d="M21 48 C19 24 34 13 50 13 C66 13 81 24 79 48 L81 78 Q76 84 68 80 L32 80 Q24 84 19 78 Z" fill="${h}"/>`;
    case 9: return `<path d="${MASS}" fill="${h}"/>` + strands([18, 24, 30, 70, 76, 82], 42, (k) => 56 + (k % 2) * 8, 5, h, s, false);
    default: return '';
  }
}

function hairFront(i: number, h: string, s: string, glow: string): string {
  const shade = (d: string) => `<path d="${d}" fill="none" stroke="#000" stroke-opacity="0.22" stroke-width="0.8"/>`;
  switch (i) {
    case 1: {
      const strand = 'M26 44 C23 58 24 72 22 88 L28 90 C30 74 29 60 30 46 Z';
      return `<path d="${CAP_PART}" fill="${h}"/><path d="${strand} ${mirrorX(strand)}" fill="${h}"/>` + shade('M28 60 L26 86 M72 60 L74 86 M40 22 C34 26 30 32 28 40');
    }
    case 2: {
      const strand = 'M26 44 C20 54 30 62 24 72 C20 80 28 86 24 94 L30 94 C34 86 26 80 30 72 C34 62 26 54 31 46 Z';
      return `<path d="${CAP_PART}" fill="${h}"/><path d="${strand} ${mirrorX(strand)}" fill="${h}"/>` + shade('M60 22 C68 26 72 32 74 40');
    }
    case 3: case 4: return `<path d="${CAP_TIGHT}" fill="${h}"/>` + shade('M36 22 C44 19 56 19 64 22');
    case 5: return `<path d="${CAP_PART}" fill="${h}"/>` + strands([27, 73], 54, () => 48, 3.8, h, s, true);
    case 6: return `<path d="M23 48 C21 27 34 17 50 17 C66 17 79 27 77 48 L74 42 C71 31 61 27 50 27 C39 27 29 31 26 42 Z" fill="${h}"/>` + curls(50, 44, 25.5, 19, Math.PI * 1.08, Math.PI * 1.92, 9, 3.2, h);
    case 7: {
      const side = 'M23 40 L21 78 Q25 82 31 79 L29 42 Z';
      return `<path d="M23 46 C21 26 34 15 50 15 C66 15 79 26 77 46 L77 39 L23 39 Z" fill="${h}"/><path d="${side} ${mirrorX(side)}" fill="${h}"/>` + shade('M32 39 L33 30 M42 39 L42.5 28 M58 39 L57.5 28 M68 39 L67 30');
    }
    case 8: return `<path d="M23 50 C20 24 36 10 56 12 C72 14 82 26 78 40 C72 30 60 27 48 31 C38 34 30 42 27 56 Z" fill="${h}"/>`
      + `<path d="M75 34 C78 40 78 48 77 56" fill="none" stroke="${h}" stroke-opacity="0.65" stroke-width="3" stroke-dasharray="1 1.2"/>`
      + `<path d="M73 40 L76 43 L76 50" fill="none" stroke="${glow}" stroke-width="0.8"/>` + shade('M30 40 C36 26 48 18 62 18');
    case 9: return `<path d="${CAP_PART}" fill="${h}"/>` + strands([27, 73], 52, () => 50, 5, h, s, false);
    case 10: return `<path d="M24 48 C22 27 35 17 50 17 C65 17 78 27 76 48 L73 42 C70 31 61 26 50 26 C39 26 30 31 27 42 Z" fill="${h}"/>` + curls(50, 46, 26.5, 28.5, Math.PI * 1.06, Math.PI * 1.94, 11, 3.4, h);
    default: return '';
  }
}


/* Headsets: body (drawn dark), lens (glows, clips the interface). */
const HEADSETS: { body: string; lens: string; strap?: boolean }[] = [
  { body: '<path d="M20 40 Q20 34 26 34 L74 34 Q80 34 80 40 L80 62 Q80 68 74 68 L58 68 L54 62 L46 62 L42 68 L26 68 Q20 68 20 62 Z"/>', lens: '<path d="M25 39 L75 39 L75 60 L57 60 L53 56 L47 56 L43 60 L25 60 Z"/>', strap: true },
  { body: '<rect x="22" y="40" width="56" height="22" rx="7"/>', lens: '<rect x="26" y="43" width="48" height="16" rx="5"/>', strap: true },
  { body: '<path d="M26 46 Q26 42 30 42 L44 42 Q48 42 48 46 L48 54 Q48 59 43 59 L31 59 Q26 59 26 54 Z M52 46 Q52 42 56 42 L70 42 Q74 42 74 46 L74 54 Q74 59 69 59 L57 59 Q52 59 52 54 Z M46 46 L54 46 L54 48 L46 48 Z M22 46 L26 45 L26 48 L22 49 Z M74 45 L78 46 L78 49 L74 48 Z"/>', lens: '<rect x="28" y="44" width="18" height="13" rx="3"/><rect x="54" y="44" width="18" height="13" rx="3"/>' },
  { body: '<path d="M20 40 Q20 34 26 34 L74 34 Q80 34 80 40 L80 62 Q80 68 74 68 L26 68 Q20 68 20 62 Z"/>', lens: '<path d="M24 39 L76 39 L76 63 L24 63 Z"/>', strap: true },
  { body: '<path d="M14 46 Q50 30 86 46 L84 62 Q50 74 16 62 Z"/>', lens: '<path d="M19 47 Q50 35 81 47 L79 59 Q50 69 21 59 Z"/>' },
  { body: '<circle cx="37" cy="52" r="13"/><circle cx="63" cy="52" r="13"/><rect x="46" y="49" width="8" height="5"/>', lens: '<circle cx="37" cy="52" r="9.5"/><circle cx="63" cy="52" r="9.5"/>', strap: true },
  { body: '<circle cx="62" cy="51" r="12"/><path d="M24 49 L50 49 L50 53 L24 53 Z"/>', lens: '<circle cx="62" cy="51" r="8.5"/>' },
  { body: '<rect x="20" y="46" width="60" height="12" rx="6"/>', lens: '<rect x="23" y="49" width="54" height="6" rx="3"/>' },
  { body: '<path d="M24 34 L76 34 L78 62 L64 78 L36 78 L22 62 Z"/>', lens: '<path d="M28 38 L72 38 L74 60 L62 73 L38 73 L26 60 Z"/>' },
  { body: '<path d="M19 41 L45 44 Q49 45 48 49 L47 55 Q46 59 41 59 L31 59 Q26 59 25 55 Z M81 41 L55 44 Q51 45 52 49 L53 55 Q54 59 59 59 L69 59 Q74 59 75 55 Z M46 47 L54 47 L54 49 L46 49 Z"/>', lens: '<path d="M26 46 L44 47.5 L43.5 54 Q43 56.5 40 56.5 L31 56.5 Q28.5 56.5 28 54 Z M74 46 L56 47.5 L56.5 54 Q57 56.5 60 56.5 L69 56.5 Q71.5 56.5 72 54 Z"/>' },
  { body: '<path d="M26 36 Q26 30 32 30 L68 30 Q74 30 74 36 L74 66 Q72 78 50 82 Q28 78 26 66 Z"/><rect x="44" y="68" width="12" height="1.2"/><rect x="45" y="71.5" width="10" height="1.2"/>', lens: '<path d="M29 47 L71 47 L70 54 L30 54 Z"/>' },
  { body: '<path d="M22 38 L78 38 L80 58 L66 74 L34 74 L20 58 Z"/>', lens: '<path d="M27 45 L73 45 L73 51 L54 51 L54 66 L46 66 L46 51 L27 51 Z"/>', strap: true },
  { body: '<path d="M16 40 L48 38 L50 48 L48 64 L34 74 L20 66 Z"/><rect x="57" y="47" width="14" height="8" rx="4"/>', lens: '<circle cx="34" cy="52" r="8.5"/><rect x="59.5" y="49.5" width="9" height="3" rx="1.5"/>' },
];

const BOLT_MINI = 'M52 43 L44 54 L49 54 L47 61 L56 50 L51 50 Z';

function lensSvg(i: number, glow: string, sec: string): string {
  const lite = '#FFFFFF';
  switch (i) {
    case 0: return `<rect x="28" y="45" width="14" height="1.6" fill="${lite}"/><rect x="28" y="50" width="22" height="1.6" fill="${lite}" opacity="0.8"/><rect x="28" y="55" width="9" height="1.6" fill="${lite}" opacity="0.6"/><rect x="62" y="44" width="8" height="12" fill="none" stroke="${lite}" stroke-width="1"/>`;
    case 1: return [42, 46, 50, 54, 58, 62, 66].map((y) => `<rect x="14" y="${y}" width="72" height="1.1" fill="#000" opacity="0.3"/>`).join('') + `<rect class="pg-scan" x="14" y="50" width="72" height="2.2" fill="${lite}" opacity="0.6"/>`;
    case 2: return `<rect x="33" y="49" width="10" height="5" rx="2.5" fill="${lite}"/><rect x="57" y="49" width="10" height="5" rx="2.5" fill="${lite}"/>`;
    case 3: return `<circle cx="50" cy="51" r="6" fill="none" stroke="${lite}" stroke-width="1.2"/><path d="M50 42 V47 M50 55 V60 M41 51 H46 M54 51 H59" stroke="${lite}" stroke-width="1.2"/><circle cx="50" cy="51" r="1.4" fill="${sec}"/>`;
    case 4: return `<g fill="${lite}"><rect x="34" y="47" width="4" height="4"/><rect x="38" y="51" width="4" height="4"/><rect x="34" y="51" width="4" height="4"/><rect x="58" y="47" width="4" height="4"/><rect x="62" y="51" width="4" height="4"/><rect x="58" y="51" width="4" height="4"/></g>`;
    case 5: return `<circle cx="50" cy="51" r="6" fill="none" stroke="${lite}" stroke-opacity="0.3" stroke-width="2"/><circle class="pg-load" cx="50" cy="51" r="6" fill="none" stroke="${lite}" stroke-width="2" stroke-dasharray="12 26" stroke-linecap="round"/>`;
    case 6: return `<polyline points="24,51 30,51 33,45 37,57 41,47 45,55 49,49 53,53 57,46 61,56 65,50 70,51 78,51" fill="none" stroke="${lite}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 7: return `<path d="${BOLT_MINI}" fill="${lite}"/><circle cx="50" cy="51" r="9" fill="${glow}" opacity="0.25"/>`;
    case 8: return `<g fill="${lite}"><ellipse cx="38" cy="51.5" rx="5.6" ry="3.4"/><ellipse cx="62" cy="51.5" rx="5.6" ry="3.4"/><path d="M32.8 50.4 L28.4 47.2 L30.6 51.4 Z M67.2 50.4 L71.6 47.2 L69.4 51.4 Z"/></g><g fill="${sec}"><circle cx="38.6" cy="51.6" r="1.6"/><circle cx="62.6" cy="51.6" r="1.6"/></g>`;
    case 9: return `<g fill="none" stroke="${lite}" stroke-width="1.1"><circle cx="38" cy="51" r="4.4"/><circle cx="62" cy="51" r="4.4"/><path d="M30 46 V44 H32 M70 46 V44 H68 M30 56 V58 H32 M70 56 V58 H68"/></g><g fill="${lite}"><circle cx="38" cy="51" r="1.7"/><circle cx="62" cy="51" r="1.7"/></g>`;
    case 10: return `<path class="pga-spin" d="${gearPath(50, 51, 7.4, 5.6, 8, 2.4)}" fill="${lite}" fill-rule="evenodd"/><path d="M28 51 H39 M61 51 H72" stroke="${lite}" stroke-width="1" opacity="0.7"/>`;
    default: return `<g fill="${lite}"><path d="${star(36, 50, 5)}"/><path d="${star(62, 52, 4)}"/><path d="${star(47, 45, 2.2)}" opacity="0.8"/><path d="${star(71, 46, 2)}" opacity="0.8"/><path d="${star(28, 56, 1.8)}" opacity="0.7"/></g>`;
  }
}

function crestBack(i: number, p: string, s: string, fill: string): string {
  switch (i) {
    case 5: return `<ellipse cx="50" cy="13" rx="20" ry="4.5" fill="none" stroke="${s}" stroke-width="2" opacity="0.95"/>`;
    case 7: return `<path d="M16 64 C10 22 90 22 84 64 L80 92 L20 92 Z" fill="${fill}" stroke="${p}" stroke-width="1.2"/>`;
    case 14: return `<g class="pga-spin"><path d="${gearPath(50, 48, 39, 35, 14, 31.5)}" fill="${p}" fill-rule="evenodd" opacity="0.95"/></g><circle cx="50" cy="48" r="30" fill="none" stroke="${s}" stroke-width="0.8" opacity="0.7"/>`;
    case 17: return `<path d="M36 27 L27 3 L32 4 L42 24 Z M64 27 L73 3 L68 4 L58 24 Z" fill="${p}"/><path d="M33 20 L28.5 7 M67 20 L71.5 7" stroke="${s}" stroke-width="1"/>`;
    default: return '';
  }
}

function crestFront(i: number, p: string, s: string, glow: string): string {
  const band = `<path d="M23 50 C23 18 77 18 77 50" fill="none" stroke="${s}" stroke-width="4" stroke-linecap="round"/>`;
  const cups = `<rect x="15" y="42" width="10" height="20" rx="4" fill="${p}"/><rect x="75" y="42" width="10" height="20" rx="4" fill="${p}"/>`;
  switch (i) {
    case 1: return band + cups;
    case 2: return band + cups + `<path d="M20 61 Q22 76 38 74" fill="none" stroke="${s}" stroke-width="2"/><circle cx="39" cy="74" r="2.6" fill="${glow}"/>`;
    case 3: return `<path d="M28 30 L24 12 L40 24 Z M72 30 L76 12 L60 24 Z" fill="${p}"/><path d="M29 27 L27 17 L36 24 Z M71 27 L73 17 L64 24 Z" fill="${glow}"/>` + band + cups;
    case 4: return `<line x1="64" y1="26" x2="74" y2="6" stroke="${s}" stroke-width="1.8"/><circle cx="74.5" cy="5" r="3" fill="${glow}"/>`;
    case 6: return `<path d="M24 42 C24 14 76 14 76 42 Z" fill="${s}"/><rect x="22" y="38" width="56" height="7" rx="2" fill="${p}"/><circle cx="50" cy="13" r="4" fill="${p}"/>`;
    case 7: return `<path d="M22 70 C20 40 30 26 50 26 C70 26 80 40 78 70" fill="none" stroke="${p}" stroke-width="1.4" opacity="0.8"/>`;
    case 8: return `<path d="M40 26 L43 8 L47 22 L50 2 L53 22 L57 8 L60 26 Z" fill="${p}"/>`;
    case 9: return `<path d="M24 40 L22 22 L32 30 L34 14 L42 26 L50 10 L58 26 L66 14 L68 30 L78 22 L76 40 Z" fill="${s}"/>`;
    case 10: return `<g fill="none" stroke="${p}" stroke-width="1.4"><circle cx="22.5" cy="69" r="4.2"/><circle cx="77.5" cy="69" r="4.2"/></g><g fill="${glow}"><circle cx="22.5" cy="73.2" r="1.2"/><circle cx="77.5" cy="73.2" r="1.2"/></g>`;
    case 11: return `<path d="M22.5 54 Q18.5 60 22.5 67" fill="none" stroke="${s}" stroke-width="2.2" stroke-linecap="round"/><g fill="${glow}"><circle cx="21" cy="57" r="0.9"/><circle cx="20.4" cy="60.6" r="0.9"/><circle cx="21.2" cy="64.2" r="0.9"/><circle cx="78" cy="63" r="1.4"/></g>`;
    case 12: return `<path d="M25 38 C27 19 73 19 75 38" fill="none" stroke="${s}" stroke-width="3.6" stroke-linecap="round"/><g fill="${glow}"><circle cx="31.5" cy="27.5" r="1"/><circle cx="40.5" cy="22.6" r="1"/><circle cx="50" cy="21" r="1"/><circle cx="59.5" cy="22.6" r="1"/><circle cx="68.5" cy="27.5" r="1"/></g>`;
    case 13: return `<g transform="rotate(32 66 29)"><rect x="60" y="25" width="11" height="2.6" rx="1.3" fill="${p}"/><rect x="61.5" y="30" width="11" height="2.6" rx="1.3" fill="${glow}"/><rect x="63" y="35" width="8" height="2.6" rx="1.3" fill="${s}"/></g>`;
    case 15: return `<rect x="61" y="21" width="9" height="3.4" fill="#141414" stroke="${p}" stroke-width="0.8"/><path d="${boltPath(58, -1, 18, 24)}" fill="${p}" stroke="${glow}" stroke-width="0.7" stroke-linejoin="round"/>`;
    case 16: return `<path d="${boltPath(9, 24, 13, 22)}" fill="${s}" stroke="${glow}" stroke-width="0.6" stroke-linejoin="round"/><rect x="14.5" y="44" width="9.5" height="17" rx="3" fill="${p}"/><circle cx="19.2" cy="52.5" r="2" fill="${glow}"/>`;
    case 18: return `<circle cx="81" cy="17" r="13" fill="${glow}" opacity="0.14"/><ellipse cx="81" cy="31" rx="9" ry="1.8" fill="none" stroke="${glow}" stroke-width="0.8" opacity="0.8"/>`
      + `<image href="${asset(ICON_SRCS[0])}" xlink:href="${asset(ICON_SRCS[0])}" x="73" y="5" width="20" height="20"/><image href="${asset(ICON_SRCS[1])}" xlink:href="${asset(ICON_SRCS[1])}" x="67" y="6" width="18" height="18"/>`;
    default: return '';
  }
}

const TORSO = 'M8 120 L14 100 Q18 92 32 90 L42 88 L58 88 L68 90 Q82 92 86 100 L92 120 Z';

function outfitSvg(i: number, fill: string, p: string, s: string, glow: string, shell: string): string {
  const torso = `<path d="${TORSO}" fill="${fill}" stroke="${p}" stroke-width="1.3"/>`;
  switch (i) {
    case 0: return torso + `<path d="M30 92 Q50 76 70 92 Q60 99 50 99 Q40 99 30 92 Z" fill="${fill}" stroke="${p}" stroke-width="1.2"/><path d="M45 98 L44 111 M55 98 L56 111" stroke="${s}" stroke-width="1.2" stroke-linecap="round"/><path d="M34 113 L66 113 L62 120 L38 120 Z" fill="none" stroke="${p}" stroke-opacity="0.7"/>`;
    case 1: return torso + `<path d="M38 82 L62 82 L65 97 L35 97 Z" fill="${shell}" stroke="${p}" stroke-width="1.2"/><path d="M22 97 L72 120" stroke="${p}" stroke-width="3"/><rect x="44" y="104" width="7" height="5" fill="${s}" transform="rotate(25 47 106)"/>`;
    case 2: return `<path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="M20 104 L38 96 L50 104 L62 96 L80 104 M38 96 L38 120 M62 96 L62 120 M50 104 L50 120" fill="none" stroke="${glow}" stroke-width="1.2" opacity="0.9"/><g fill="${glow}"><circle cx="20" cy="104" r="2"/><circle cx="38" cy="96" r="2"/><circle cx="50" cy="104" r="2"/><circle cx="62" cy="96" r="2"/><circle cx="80" cy="104" r="2"/></g>` + `<path d="${TORSO}" fill="${fill}" opacity="0.35"/>`;
    case 3: return torso + `<path d="M14 100 Q18 92 32 90 L36 98 L18 110 Z M86 100 Q82 92 68 90 L64 98 L82 110 Z" fill="${p}"/><path d="M42 88 L50 99 L58 88" fill="none" stroke="${s}" stroke-width="2"/>`;
    case 4: return torso + `<path d="M40 86 Q50 92 60 86 L62 92 Q50 98 38 92 Z" fill="${s}"/><path d="M50 95 L50 120" stroke="${p}" stroke-width="1.6"/><path d="M14 116 L86 116" stroke="${s}" stroke-width="2.5" opacity="0.7"/>`;
    case 5: return `<path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="M14 100 Q18 92 32 90 L40 89 L44 120 L10 120 Z M86 100 Q82 92 68 90 L60 89 L56 120 L90 120 Z" fill="${fill}" stroke="${p}" stroke-width="1.2"/>`;
    case 6: return `<path d="M2 120 L16 94 L84 94 L98 120 Z" fill="${fill}" stroke="${p}" stroke-width="1.2" opacity="0.95"/><path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="M34 90 Q50 100 66 90" fill="none" stroke="${s}" stroke-width="3"/>`;
    case 7: { // cropped jacket over a bodysuit
      const half = 'M14 100 Q18 92 32 90 L42 88 L46 97 L44 108 L11.5 108 Z';
      return `<path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="${half} ${mirrorX(half)}" fill="${fill}" stroke="${p}" stroke-width="1.2"/>`
        + `<path d="M42 88 L38 96 L44 99 M58 88 L62 96 L56 99" fill="none" stroke="${p}" stroke-width="1"/><path d="M12 107 L44 107 M56 107 L88 107" stroke="${s}" stroke-width="2"/><rect x="15" y="112" width="70" height="2.2" fill="${s}" opacity="0.8"/>`;
    }
    case 8: return torso + `<path d="M34 120 C34 106 38 98 44 94 M66 120 C66 106 62 98 56 94" fill="none" stroke="${glow}" stroke-width="1" opacity="0.85"/><path d="M14 104 L22 100 M86 104 L78 100" stroke="${s}" stroke-width="2"/>`;
    case 9: { // long coat: flared skirt-cape silhouette
      return `<path d="M0 120 L12 98 Q18 92 32 90 L68 90 Q82 92 88 98 L100 120 Z" fill="${fill}" stroke="${p}" stroke-width="1.2"/><path d="M42 91 L58 91 L61 120 L39 120 Z" fill="${shell}"/>`
        + `<path d="M40 90 L49 104 L40 120 M60 90 L51 104 L60 120" fill="none" stroke="${p}" stroke-width="1.2"/><path d="M16 108 L40 108 M60 108 L84 108" stroke="${s}" stroke-width="2.4"/>`;
    }
    case 10: { // mech: angular pauldrons and chest plates
      const pad = 'M5 108 L9 94 L22 87 L37 89 L35 100 L20 109 Z';
      const plate = 'M24 100 L39 98 L40 112 L26 114 Z';
      return `<path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="${plate} ${mirrorX(plate)}" fill="${fill}" stroke="${p}" stroke-width="0.9"/>`
        + `<path d="${pad} ${mirrorX(pad)}" fill="${p}"/><path d="M11 98 L23 91 L33 92 M89 98 L77 91 L67 92" fill="none" stroke="#141414" stroke-width="1.8"/>`
        + `<path d="M28 117 L38 116 M62 116 L72 117" stroke="${glow}" stroke-width="1.4"/>`;
    }
    case 11: { // android frame: panel seams, ball joints, cables, core
      const joint = (x: number) => `<circle cx="${x}" cy="101" r="6" fill="#141414" stroke="${p}" stroke-width="1"/><circle cx="${x}" cy="101" r="3" fill="none" stroke="${glow}" stroke-width="1.1"/>`;
      return `<path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="M30 93 L34 120 M70 93 L66 120 M34 107 L40 107 M60 107 L66 107" fill="none" stroke="${p}" stroke-width="0.8" opacity="0.6"/>`
        + `<path d="M30 92 Q36 97 42 92 M58 92 Q64 97 70 92" fill="none" stroke="${s}" stroke-width="1.4"/>` + joint(19) + joint(81)
        + `<circle cx="50" cy="95" r="2.6" fill="${glow}"/>`;
    }
    default: { // gear pauldrons (SGX gear)
      const g = (x: number) => `<path d="${gearPath(x, 99, 11.5, 8.8, 9, 3.4)}" fill="${p}" fill-rule="evenodd" stroke="#141414" stroke-width="0.5"/><circle cx="${x}" cy="99" r="2" fill="${glow}"/>`;
      return torso + g(19) + g(81);
    }
  }
}

/** Outfit pieces in front of the neck (standing collars). */
function outfitTop(i: number, fill: string, p: string): string {
  if (i === 8) return `<path d="M40 76 L60 76 L61 92 Q50 96 39 92 Z" fill="${fill}" stroke="${p}" stroke-width="1.1"/>`;
  if (i === 9) return `<path d="M37 80 L44 90 L56 90 L63 80 L61 93 Q50 98 39 93 Z" fill="${fill}" stroke="${p}" stroke-width="1.1"/>`;
  return '';
}

let uidCounter = 0;

/** The pilot as a standalone SVG string. */
export function pilotSvg(raw: PilotConfig, opts: { size?: number; idPrefix?: string; title?: string; animate?: boolean; flat?: boolean } = {}): string {
  const c = normalizePilot(raw) as PilotConfig;
  const id = opts.idPrefix || `pl${(uidCounter = (uidCounter + 1) % 1e6)}`;
  const size = opts.size || 160;
  const head = HEADS[c.helmet];
  const set = HEADSETS[c.visor];
  const tex = texUrl(c.pattern);
  const gain = PILOT_TEXTURES[c.pattern]?.gain ?? 1;
  const tile = +(22 * (PILOT_TEXTURES[c.pattern]?.scale ?? 1)).toFixed(2);
  const emblem = emblemSrcs(c.emblem);
  // the SGX icon stacks the G gear and the bolt, offset like the logo
  const emblemImgs = emblem.map((src, k) => {
    const [x, y, w] = emblem.length > 1 ? [k ? 42 : 45, k ? 102 : 101.5, k ? 11.5 : 13] : [43, 101, 14];
    return `<image href="${asset(src)}" xlink:href="${asset(src)}" x="${x}" y="${y}" width="${w}" height="${w}" preserveAspectRatio="xMidYMid meet"/>`;
  }).join('');
  const fill = tex ? `url(#${id}-t)` : c.shell;
  const holo = c.helmet === 7;
  // hair gets a thin trim edge so dark hair still reads on a dark head
  const hairEdge = `stroke="${c.primary}" stroke-opacity="0.55" stroke-width="0.7" stroke-linejoin="round"`;
  // Volume (light from above-left, rim light from the right, lens gloss). `flat` skips it (3D build: real lights do that job).
  const shade = !opts.flat;
  const anim = !!opts.animate;
  const style = anim ? `<style>`
    + `#${id} .pga-head{animation:sgxPilotBreath 4.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}`
    + `#${id} .pga-glow{animation:sgxPilotGlow 2.6s ease-in-out infinite}`
    + `#${id} .pga-sweep{animation:sgxPilotSweep 3.4s linear infinite}`
    + `#${id} .pga-led{animation:sgxPilotLed 1.6s steps(2,end) infinite}`
    + `#${id} .pga-spin{animation:sgxPilotSpin 12s linear infinite;transform-box:fill-box;transform-origin:50% 50%}`
    + `@keyframes sgxPilotSpin{to{transform:rotate(360deg)}}`
    + `@keyframes sgxPilotBreath{0%,100%{transform:translateY(0)}50%{transform:translateY(-0.9px)}}`
    + `@keyframes sgxPilotGlow{0%,100%{opacity:.45}50%{opacity:.8}}`
    + `@keyframes sgxPilotSweep{0%{transform:translateX(-70px)}60%,100%{transform:translateX(70px)}}`
    + `@keyframes sgxPilotLed{0%{opacity:1}100%{opacity:.25}}`
    + `@media (prefers-reduced-motion:reduce){#${id} *{animation:none!important}}`
    + `</style>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" id="${id}" viewBox="0 0 100 120" width="${size}" height="${Math.round(size * 1.2)}" role="img" aria-label="${(opts.title || 'SGX pilot').replace(/"/g, '')}">`
    + style
    + `<defs>`
    + `<radialGradient id="${id}-h" cx="0.36" cy="0.3" r="0.8"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.26"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.04"/><stop offset="1" stop-color="#000000" stop-opacity="0.45"/></radialGradient>`
    + `<linearGradient id="${id}-r" x1="0" y1="0" x2="1" y2="0"><stop offset="0.55" stop-color="${c.glow}" stop-opacity="0"/><stop offset="1" stop-color="${c.glow}" stop-opacity="0.9"/></linearGradient>`
    + `<linearGradient id="${id}-o" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.16"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.5"/></linearGradient>`
    + `<filter id="${id}-sh" x="-50%" y="-200%" width="200%" height="500%"><feGaussianBlur stdDeviation="2.4"/></filter>`
    + `<linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.glow}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.secondary}" stop-opacity="0.75"/></linearGradient>`
    + `<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.12"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.35"/></linearGradient>`
    + (tex ? `<filter id="${id}-b" color-interpolation-filters="sRGB"><feComponentTransfer><feFuncR type="linear" slope="${gain}"/><feFuncG type="linear" slope="${gain}"/><feFuncB type="linear" slope="${gain}"/></feComponentTransfer></filter>`
      + `<pattern id="${id}-t" patternUnits="userSpaceOnUse" width="${tile}" height="${tile}"><image href="${asset(tex)}" xlink:href="${asset(tex)}" width="${tile}" height="${tile}" preserveAspectRatio="none" filter="url(#${id}-b)"/></pattern>` : '')
    + `<clipPath id="${id}-c">${set.lens}</clipPath>`
    + `<filter id="${id}-g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `</defs>`
    + crestBack(c.crest, c.primary, c.secondary, fill)
    + outfitSvg(c.armor, fill, c.primary, c.secondary, c.glow, c.shell)
    + (shade ? `<path d="${TORSO}" fill="url(#${id}-o)"/><path d="${TORSO}" fill="none" stroke="url(#${id}-r)" stroke-width="1.4"/>` : '')
    + (emblem.length ? `<path d="M41 100 L59 100 L59 112 L55 116 L41 116 Z" fill="#050505" stroke="${c.primary}" stroke-width="1"/>${emblemImgs}` : '')
    + `<g class="pga-head">${headBack(c.helmet, c.primary, c.glow)}<g ${hairEdge}>${hairBack(c.hair, c.hairColor, c.secondary, c.glow)}</g></g>`
    + `<rect x="44" y="78" width="12" height="12" fill="${c.shell}"/><rect x="44" y="78" width="12" height="12" fill="#000" opacity="0.3"/>`
    + outfitTop(c.armor, fill, c.primary)
    + (shade ? `<ellipse cx="50" cy="90" rx="20" ry="3.6" fill="#000" opacity="0.5" filter="url(#${id}-sh)"/>` : '')
    + `<g class="pga-head">`
    + `<path d="${head}" fill="${c.shell}" ${holo ? 'fill-opacity="0.35"' : ''}/>`
    + (shade ? `<path d="${head}" fill="url(#${id}-h)"/>` : '')
    + (holo ? `<g fill="none" stroke="${c.glow}" stroke-opacity="0.55" stroke-width="0.6"><ellipse cx="50" cy="52" rx="26" ry="10"/><ellipse cx="50" cy="52" rx="26" ry="20"/><ellipse cx="50" cy="52" rx="10" ry="30"/><ellipse cx="50" cy="52" rx="19" ry="30"/></g>` : '')
    + `<path d="${head}" fill="none" stroke="${c.primary}" stroke-width="1.6" stroke-linejoin="round"/>`
    + (shade ? `<path d="${head}" fill="none" stroke="url(#${id}-r)" stroke-width="1.2" stroke-linejoin="round" transform="translate(0.6 0)"/>` : '')
    + headDetail(c.helmet, c.primary, c.glow)
    + `<g ${hairEdge}>${hairFront(c.hair, c.hairColor, c.secondary, c.glow)}</g>`
    + (set.strap ? `<path d="M14 51 L22 51 M78 51 L86 51" stroke="#1A1A1A" stroke-width="4"/>` : '')
    + `<g fill="#141414" stroke="${c.primary}" stroke-width="1.2">${set.body}</g>`
    + `<g class="pga-glow" fill="${c.glow}" opacity="0.55" filter="url(#${id}-g)">${set.lens}</g>`
    + `<g fill="url(#${id}-v)">${set.lens}</g>`
    + `<g clip-path="url(#${id}-c)">${lensSvg(c.eyes, c.glow, c.secondary)}`
    + (shade ? `<path d="M18 30 L40 30 L22 72 L0 72 Z" fill="#FFFFFF" opacity="0.16"/>` : '')
    + (anim ? `<rect class="pga-sweep" x="40" y="30" width="6" height="45" fill="#FFFFFF" opacity="0.28" transform="skewX(-18)"/>` : '')
    + `</g>`
    + (c.visor === 3 ? `<g fill="#050505" stroke="${c.glow}" stroke-width="0.8"><circle cx="31" cy="64" r="2.2"/><circle cx="69" cy="64" r="2.2"/></g>` : '')
    + crestFront(c.crest, c.primary, c.secondary, c.glow).replace('<circle cx="74.5" cy="5" r="3"', '<circle class="pga-led" cx="74.5" cy="5" r="3"')
    + `</g>`
    + `</svg>`;
}

/** Raster copy (PNG data URL) for canvas cards and the PDF. */
export async function pilotPng(c: PilotConfig, size = 512): Promise<string> {
  const img = await pilotImage(c, size);
  const cv = document.createElement('canvas');
  cv.width = size; cv.height = Math.round(size * 1.2);
  cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
  return cv.toDataURL('image/png');
}

/** The pilot as an image with its emblem and texture inlined (for canvas). */
export async function pilotImage(c: PilotConfig, size = 512): Promise<HTMLImageElement> {
  await loadPilotAssets(c);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pilotSvg(c, { size }))}`;
  });
}
