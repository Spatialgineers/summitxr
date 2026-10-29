/* SGX PILOT: a parametric XR avatar. Every part is a choice the visitor
   makes in the Pilot Builder: head, headset (VR, AR, MR, gaming), what the
   lens shows, accessory, outfit, chest emblem (SGX bolt, SGX gear, Guild or
   a pillar) and the outfit texture (the seamless SGX tiles from the Tile
   Lab). Only official SGX and pillar colors. Drawn as a plain SVG string so
   it renders the same in React, on canvas (Holo Card, PDF) and at any size. */

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
}

/* Seamless SGX tiles (from the SGX Tile Lab) used as outfit textures. 0 = plain. */
/* gain lifts the darker tiles so they read on a small outfit. */
export const PILOT_TEXTURES: { file: string; es: string; en: string; gain?: number }[] = [
  { file: '', es: 'Liso', en: 'Plain' },
  { file: 'sgx-story', es: 'SGX.Story', en: 'SGX.Story', gain: 1.98 },
  { file: 'sgx-showcase', es: 'SGX.Showcase', en: 'SGX.Showcase', gain: 2.71 },
  { file: 'sgx-spark', es: 'SGX.Spark', en: 'SGX.Spark', gain: 2.57 },
  { file: 'sgx-stage', es: 'SGX.Stage', en: 'SGX.Stage', gain: 2.26 },
  { file: 'sgx-system', es: 'SGX.System', en: 'SGX.System', gain: 2.32 },
  { file: 'sgx-synthesize', es: 'SGX.Synthesize', en: 'SGX.Synthesize', gain: 2.21 },
  { file: 'los-seis-pilares', es: 'Seis pilares', en: 'Six pillars', gain: 2.32 },
  { file: 'engranajes-sgx', es: 'Engranajes SGX', en: 'SGX gears', gain: 0.74 },
  { file: 'engranaje-g', es: 'Engranaje G', en: 'G gear', gain: 0.72 },
  { file: 'engranajes-entrelazados', es: 'Engranajes', en: 'Meshed gears', gain: 0.95 },
  { file: 'rayos-sgx', es: 'Rayos SGX', en: 'SGX bolts', gain: 1.08 },
  { file: 'rayos-nocturnos', es: 'Rayos nocturnos', en: 'Night bolts', gain: 2.32 },
  { file: 'panel-hud', es: 'Panel HUD', en: 'HUD panel', gain: 1.03 },
  { file: 'reticula-holodeck', es: 'Holodeck', en: 'Holodeck', gain: 2.88 },
  { file: 'red-de-energia-sgx', es: 'Red de energía', en: 'Energy grid', gain: 2.57 },
  { file: 'lineas-de-energia', es: 'Líneas de energía', en: 'Energy lines', gain: 3.2 },
  { file: 'circuito-futurista', es: 'Circuito', en: 'Circuit', gain: 2.88 },
  { file: 'escudo-de-energia', es: 'Escudo hex', en: 'Hex shield', gain: 3.2 },
  { file: 'metal-cepillado', es: 'Metal cepillado', en: 'Brushed metal', gain: 0.66 },
  { file: 'zigzag-sgx', es: 'Zigzag SGX', en: 'SGX zigzag', gain: 0.45 },
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
];

export const PART_COUNTS = { helmet: 8, visor: 9, eyes: 8, crest: 10, armor: 7, emblem: EMBLEMS.length, pattern: PILOT_TEXTURES.length } as const;
export type PilotPart = keyof typeof PART_COUNTS;

export const PART_NAMES: Record<PilotPart, { es: string[]; en: string[] }> = {
  helmet: {
    es: ['Redonda', 'Ovalada', 'Cuadrada', 'Hexa', 'Cápsula', 'Low-poly', 'Mecha', 'Holograma'],
    en: ['Round', 'Oval', 'Square', 'Hex', 'Capsule', 'Low-poly', 'Mech', 'Hologram'],
  },
  visor: {
    es: ['VR clásico', 'VR slim', 'Gafas AR', 'Visor MR', 'Visor gaming', 'Goggles', 'Monóculo holo', 'Banda LED', 'Escudo facial'],
    en: ['Classic VR', 'Slim VR', 'AR glasses', 'MR visor', 'Gaming visor', 'Goggles', 'Holo monocle', 'LED band', 'Face shield'],
  },
  eyes: {
    es: ['HUD', 'Escáner', 'Ojos LED', 'Mira', 'Píxel', 'Cargando', 'Onda', 'Rayo SGX'],
    en: ['HUD', 'Scanner', 'LED eyes', 'Reticle', 'Pixel', 'Loading', 'Waveform', 'SGX bolt'],
  },
  crest: {
    es: ['Nada', 'Audífonos', 'Headset con mic', 'Orejas de gato', 'Antena', 'Halo', 'Gorro', 'Capucha', 'Mohawk', 'Pelo en punta'],
    en: ['None', 'Headphones', 'Headset + mic', 'Cat ears', 'Antenna', 'Halo', 'Beanie', 'Hood', 'Mohawk', 'Spiky hair'],
  },
  armor: {
    es: ['Hoodie', 'Techwear', 'Traje háptico', 'Jersey esports', 'Bomber', 'Chaleco', 'Capa streamer'],
    en: ['Hoodie', 'Techwear', 'Haptic suit', 'Esports jersey', 'Bomber', 'Vest', 'Streamer cape'],
  },
  emblem: { es: EMBLEMS.map((e) => e.es), en: EMBLEMS.map((e) => e.en) },
  pattern: { es: PILOT_TEXTURES.map((t) => t.es), en: PILOT_TEXTURES.map((t) => t.en) },
};

/** Official SGX lights (design system + pillar inks). No free colors. */
export const PILOT_SWATCHES = ['#FDCC0D', '#FFBB00', '#B87000', '#00DDFF', '#5D86C6', '#32527B', '#888888', '#FFF9E2', '#FFFFFF'];
/** Official SGX bases for the head and plain outfits. */
export const SHELL_SWATCHES = ['#050505', '#1A1A1A', '#333333', '#32527B', '#888888', '#FFF9E2'];

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

function pickParts(r: () => number) {
  const p = {} as Record<PilotPart, number>;
  (Object.keys(PART_COUNTS) as PilotPart[]).forEach((k) => { p[k] = Math.floor(r() * PART_COUNTS[k]); });
  return p;
}

/** Same seed, same pilot: for passes forged before the builder and for other people's QR seeds. */
export function configFromSeed(seed: string, accent = '#FDCC0D'): PilotConfig {
  const r = rng(seed || 'sgx');
  const parts = pickParts(r);
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
  };
}

export function randomPilot(accent?: string): PilotConfig {
  const r = Math.random;
  const parts = pickParts(r);
  const pick = (a: string[]) => a[Math.floor(r() * a.length)];
  const primary = accent && r() < 0.6 ? snap(accent, PILOT_SWATCHES, '#FDCC0D') : pick(PILOT_SWATCHES);
  let secondary = pick(PILOT_SWATCHES);
  if (secondary === primary) secondary = primary === '#00DDFF' ? '#FDCC0D' : '#00DDFF';
  return {
    v: 1, ...parts,
    primary,
    secondary,
    glow: pick(['#00DDFF', '#FDCC0D', '#FFBB00', '#FFFFFF']),
    shell: pick(SHELL_SWATCHES),
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
  await Promise.all([inline(EMBLEMS[n.emblem]?.src || ''), inline(texUrl(n.pattern))]);
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
    emblemUrl: EMBLEMS[c.emblem]?.src || '',
    textureUrl: texUrl(c.pattern),
    textureGain: PILOT_TEXTURES[c.pattern]?.gain ?? 1,
    lensSvg: lens,
  };
}

/* ---------- geometry (viewBox 0 0 100 120) ---------- */

const HEADS = [
  'M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 C34 82 24 70 24 52 C24 34 34 22 50 22 Z',
  'M50 18 C66 18 74 34 74 54 C74 72 64 84 50 84 C36 84 26 72 26 54 C26 34 34 18 50 18 Z',
  'M32 22 L68 22 Q78 22 78 32 L78 70 Q78 82 66 82 L34 82 Q22 82 22 70 L22 32 Q22 22 32 22 Z',
  'M50 18 L76 32 L76 68 L50 84 L24 68 L24 32 Z',
  'M50 16 C68 16 76 28 76 44 L76 66 C76 78 66 86 50 86 C34 86 24 78 24 66 L24 44 C24 28 32 16 50 16 Z',
  'M50 18 L70 26 L78 50 L70 74 L50 84 L30 74 L22 50 L30 26 Z',
  'M30 22 L70 22 L78 32 L78 58 L72 64 L72 76 L62 84 L38 84 L28 76 L28 64 L22 58 L22 32 Z',
  'M50 22 C66 22 76 34 76 52 C76 70 66 82 50 82 C34 82 24 70 24 52 C24 34 34 22 50 22 Z',
];

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
    default: return `<path d="${BOLT_MINI}" fill="${lite}"/><circle cx="50" cy="51" r="9" fill="${glow}" opacity="0.25"/>`;
  }
}

function crestBack(i: number, p: string, s: string, fill: string): string {
  switch (i) {
    case 5: return `<ellipse cx="50" cy="13" rx="20" ry="4.5" fill="none" stroke="${s}" stroke-width="2" opacity="0.95"/>`;
    case 7: return `<path d="M16 64 C10 22 90 22 84 64 L80 92 L20 92 Z" fill="${fill}" stroke="${p}" stroke-width="1.2"/>`;
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
    default: return `<path d="M2 120 L16 94 L84 94 L98 120 Z" fill="${fill}" stroke="${p}" stroke-width="1.2" opacity="0.95"/><path d="${TORSO}" fill="${shell}" stroke="${p}" stroke-width="1.3"/><path d="M34 90 Q50 100 66 90" fill="none" stroke="${s}" stroke-width="3"/>`;
  }
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
  const emblem = EMBLEMS[c.emblem]?.src || '';
  const fill = tex ? `url(#${id}-t)` : c.shell;
  const holo = c.helmet === 7;
  // Volume (light from above-left, rim light from the right, lens gloss). `flat` skips it (3D build: real lights do that job).
  const shade = !opts.flat;
  const anim = !!opts.animate;
  const style = anim ? `<style>`
    + `#${id} .pga-head{animation:sgxPilotBreath 4.2s ease-in-out infinite;transform-box:fill-box;transform-origin:50% 100%}`
    + `#${id} .pga-glow{animation:sgxPilotGlow 2.6s ease-in-out infinite}`
    + `#${id} .pga-sweep{animation:sgxPilotSweep 3.4s linear infinite}`
    + `#${id} .pga-led{animation:sgxPilotLed 1.6s steps(2,end) infinite}`
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
      + `<pattern id="${id}-t" patternUnits="userSpaceOnUse" width="22" height="22"><image href="${asset(tex)}" xlink:href="${asset(tex)}" width="22" height="22" preserveAspectRatio="none" filter="url(#${id}-b)"/></pattern>` : '')
    + `<clipPath id="${id}-c">${set.lens}</clipPath>`
    + `<filter id="${id}-g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `</defs>`
    + crestBack(c.crest, c.primary, c.secondary, fill)
    + outfitSvg(c.armor, fill, c.primary, c.secondary, c.glow, c.shell)
    + (shade ? `<path d="${TORSO}" fill="url(#${id}-o)"/><path d="${TORSO}" fill="none" stroke="url(#${id}-r)" stroke-width="1.4"/>` : '')
    + (emblem ? `<path d="M41 100 L59 100 L59 112 L55 116 L41 116 Z" fill="#050505" stroke="${c.primary}" stroke-width="1"/><image href="${asset(emblem)}" xlink:href="${asset(emblem)}" x="43" y="101" width="14" height="14" preserveAspectRatio="xMidYMid meet"/>` : '')
    + `<rect x="44" y="78" width="12" height="12" fill="${c.shell}"/><rect x="44" y="78" width="12" height="12" fill="#000" opacity="0.3"/>`
    + (shade ? `<ellipse cx="50" cy="90" rx="20" ry="3.6" fill="#000" opacity="0.5" filter="url(#${id}-sh)"/>` : '')
    + `<g class="pga-head">`
    + `<path d="${head}" fill="${c.shell}" ${holo ? 'fill-opacity="0.35"' : ''}/>`
    + (shade ? `<path d="${head}" fill="url(#${id}-h)"/>` : '')
    + (holo ? `<g fill="none" stroke="${c.glow}" stroke-opacity="0.55" stroke-width="0.6"><ellipse cx="50" cy="52" rx="26" ry="10"/><ellipse cx="50" cy="52" rx="26" ry="20"/><ellipse cx="50" cy="52" rx="10" ry="30"/><ellipse cx="50" cy="52" rx="19" ry="30"/></g>` : '')
    + `<path d="${head}" fill="none" stroke="${c.primary}" stroke-width="1.6" stroke-linejoin="round"/>`
    + (shade ? `<path d="${head}" fill="none" stroke="url(#${id}-r)" stroke-width="1.2" stroke-linejoin="round" transform="translate(0.6 0)"/>` : '')
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
