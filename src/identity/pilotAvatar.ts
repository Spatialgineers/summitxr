/* SGX PILOT: a parametric pilot portrait. Every part is a choice the
   visitor makes in the Pilot Builder; colors are free. Drawn as a plain SVG
   string so it renders the same in React, on canvas (Holo Card, PDF) and
   at any size, from the 30 px pass strip to a 600 px export. */

export interface PilotConfig {
  v: 1;
  helmet: number;
  visor: number;
  eyes: number;
  crest: number;
  armor: number;
  emblem: number;
  pattern: number;
  /** trim and emblem */
  primary: string;
  /** crest, pattern, second light */
  secondary: string;
  /** visor light */
  glow: string;
  /** helmet and armor body */
  shell: string;
}

export const PART_COUNTS = { helmet: 10, visor: 9, eyes: 8, crest: 10, armor: 7, emblem: 8, pattern: 6 } as const;
export type PilotPart = keyof typeof PART_COUNTS;

export const PART_NAMES: Record<PilotPart, { es: string[]; en: string[] }> = {
  helmet: {
    es: ['Domo', 'Hexa', 'Bloque', 'Caballero', 'Burbuja', 'Samurái', 'Mecha', 'Aletas', 'Racing', 'Cresta'],
    en: ['Dome', 'Hex', 'Block', 'Knight', 'Bubble', 'Samurai', 'Mech', 'Fins', 'Racing', 'Ridge'],
  },
  visor: {
    es: ['Banda', 'Trapecio', 'Escudo', 'Óvalo', 'T', 'Lentes', 'Rendija', 'V', 'Cristal'],
    en: ['Band', 'Trapeze', 'Shield', 'Oval', 'T', 'Lenses', 'Slit', 'V', 'Glass'],
  },
  eyes: {
    es: ['Reflejo', 'Scan', 'LEDs', 'Mira', 'HUD', 'Píxel', 'Feliz', 'Ojo único'],
    en: ['Glint', 'Scan', 'LEDs', 'Reticle', 'HUD', 'Pixel', 'Happy', 'Mono-eye'],
  },
  crest: {
    es: ['Nada', 'Aleta', 'Antena', 'Antenas', 'Halo', 'Mohawk', 'Cuernos', 'Alas', 'Corona', 'Órbita'],
    en: ['None', 'Fin', 'Antenna', 'Antennas', 'Halo', 'Mohawk', 'Horns', 'Wings', 'Crown', 'Orbit'],
  },
  armor: {
    es: ['Base', 'Hombreras', 'Placas', 'Cuello alto', 'Chaqueta', 'Exo', 'Capa'],
    en: ['Base', 'Pauldrons', 'Plates', 'High collar', 'Jacket', 'Exo', 'Cape'],
  },
  emblem: {
    es: ['Bolt SGX', 'Hexágono', 'Estrella', 'Chevron', 'Diamante', 'Núcleo', 'Pilar', 'Nada'],
    en: ['SGX bolt', 'Hexagon', 'Star', 'Chevron', 'Diamond', 'Core', 'Pillar', 'None'],
  },
  pattern: {
    es: ['Liso', 'Franja', 'Hexágonos', 'Circuito', 'Camuflaje', 'Bicolor'],
    en: ['Plain', 'Stripe', 'Hex', 'Circuit', 'Camo', 'Two-tone'],
  },
};

/** Swatches: the six pillar colors plus a few extra lights. */
export const PILOT_SWATCHES = ['#FDCC0D', '#00DDFF', '#5D86C6', '#E08A1E', '#9AA3AD', '#FFFFFF', '#FF3D71', '#7CFF6B', '#B07CFF'];
export const SHELL_SWATCHES = ['#0B0D12', '#1A1A1A', '#1D2633', '#2B1F14', '#32527B', '#3A3F47', '#E6E8EB'];

const HEX = /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/;
const col = (c: string | undefined, fallback: string) => (c && HEX.test(c) ? c : fallback);
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
  const lights = ['#00DDFF', '#FDCC0D', '#FFFFFF', '#5D86C6'];
  const secondary = lights[Math.floor(r() * lights.length)];
  return {
    v: 1, ...parts,
    primary: col(accent, '#FDCC0D'),
    secondary: secondary.toLowerCase() === accent.toLowerCase() ? '#00DDFF' : secondary,
    glow: r() > 0.5 ? '#00DDFF' : col(accent, '#FDCC0D'),
    shell: SHELL_SWATCHES[Math.floor(r() * 4)],
  };
}

export function randomPilot(accent?: string): PilotConfig {
  const r = Math.random;
  const parts = pickParts(r);
  const pick = (a: string[]) => a[Math.floor(r() * a.length)];
  const primary = accent && r() < 0.6 ? accent : pick(PILOT_SWATCHES);
  let secondary = pick(PILOT_SWATCHES);
  if (secondary === primary) secondary = primary === '#00DDFF' ? '#FDCC0D' : '#00DDFF';
  return {
    v: 1, ...parts,
    primary,
    secondary,
    glow: r() < 0.5 ? pick(['#00DDFF', '#FDCC0D', '#FF3D71', '#7CFF6B', '#FFFFFF']) : secondary,
    shell: r() < 0.12 ? '#E6E8EB' : pick(SHELL_SWATCHES.slice(0, 6)),
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
  out.primary = col(c.primary, base.primary);
  out.secondary = col(c.secondary, base.secondary);
  out.glow = col(c.glow, base.glow);
  out.shell = col(c.shell, base.shell);
  return out;
}

/* ---------- geometry (viewBox 0 0 100 120) ---------- */

const HELMETS = [
  'M50 16 C28 16 20 36 20 56 L20 80 L34 94 L66 94 L80 80 L80 56 C80 36 72 16 50 16 Z',
  'M50 14 L76 26 L82 58 L72 92 L28 92 L18 58 L24 26 Z',
  'M28 20 L72 20 L82 34 L82 82 L70 94 L30 94 L18 82 L18 34 Z',
  'M50 10 L70 24 L80 52 L76 84 L62 96 L38 96 L24 84 L20 52 L30 24 Z',
  'M16 56 A34 34 0 1 1 84 56 A34 34 0 1 1 16 56 Z',
  'M50 16 C34 16 26 28 24 44 L12 60 L22 64 L22 82 L36 94 L64 94 L78 82 L78 64 L88 60 L76 44 C74 28 66 16 50 16 Z',
  'M30 18 L70 18 L80 30 L80 62 L72 70 L72 88 L60 96 L40 96 L28 88 L28 70 L20 62 L20 30 Z',
  'M24 12 L36 26 L64 26 L76 12 L80 40 L80 80 L66 94 L34 94 L20 80 L20 40 Z',
  'M50 20 C26 20 14 38 14 58 C14 78 26 92 40 94 L60 94 C74 92 86 78 86 58 C86 38 74 20 50 20 Z',
  'M50 8 L58 18 C72 22 80 38 80 56 L80 80 L66 94 L34 94 L20 80 L20 56 C20 38 28 22 42 18 Z',
];

const VISORS = [
  '<rect x="28" y="44" width="44" height="16" rx="3"/>',
  '<path d="M26 44 L74 44 L66 62 L34 62 Z"/>',
  '<path d="M28 42 L72 42 L72 54 L58 64 L42 64 L28 54 Z"/>',
  '<ellipse cx="50" cy="53" rx="23" ry="10"/>',
  '<path d="M26 42 L74 42 L74 50 L56 50 L56 68 L44 68 L44 50 L26 50 Z"/>',
  '<circle cx="38" cy="52" r="9"/><circle cx="62" cy="52" r="9"/>',
  '<rect x="24" y="49" width="52" height="7" rx="3.5"/>',
  '<path d="M24 42 L50 60 L76 42 L76 50 L50 68 L24 50 Z"/>',
  '<path d="M30 36 L70 36 L74 60 L62 72 L38 72 L26 60 Z"/>',
];

const BOLT = 'M53 99 L44 111 L50 111 L47 119 L57 106 L51 106 Z';

function eyesSvg(i: number, glow: string, sec: string): string {
  const lite = '#FFFFFF';
  switch (i) {
    case 0: return `<path d="M32 46 L44 46" stroke="${lite}" stroke-opacity="0.7" stroke-width="1.6" stroke-linecap="round"/><path d="M66 58 L70 58" stroke="${lite}" stroke-opacity="0.35" stroke-width="1.2" stroke-linecap="round"/>`;
    case 1: return [42, 46, 50, 54, 58, 62, 66].map((y) => `<rect x="20" y="${y}" width="60" height="1.2" fill="#000" opacity="0.35"/>`).join('') + `<rect class="pg-scan" x="20" y="50" width="60" height="2.2" fill="${lite}" opacity="0.55"/>`;
    case 2: return `<rect x="35" y="50" width="9" height="4" rx="2" fill="${lite}"/><rect x="56" y="50" width="9" height="4" rx="2" fill="${lite}"/>`;
    case 3: return `<circle cx="50" cy="53" r="6" fill="none" stroke="${lite}" stroke-width="1.2"/><path d="M50 44 V49 M50 57 V62 M41 53 H46 M54 53 H59" stroke="${lite}" stroke-width="1.2"/><circle cx="50" cy="53" r="1.4" fill="${sec}"/>`;
    case 4: return `<rect x="30" y="47" width="16" height="2" fill="${lite}"/><rect x="30" y="52" width="24" height="2" fill="${lite}" opacity="0.8"/><rect x="30" y="57" width="10" height="2" fill="${lite}" opacity="0.6"/><rect x="62" y="47" width="6" height="12" fill="none" stroke="${lite}" stroke-width="1"/>`;
    case 5: return `<g fill="${lite}"><rect x="36" y="48" width="4" height="4"/><rect x="40" y="52" width="4" height="4"/><rect x="36" y="52" width="4" height="4"/><rect x="56" y="48" width="4" height="4"/><rect x="60" y="52" width="4" height="4"/><rect x="56" y="52" width="4" height="4"/></g>`;
    case 6: return `<path d="M35 56 Q40 48 45 56 M55 56 Q60 48 65 56" fill="none" stroke="${lite}" stroke-width="2.2" stroke-linecap="round"/>`;
    default: return `<circle cx="50" cy="53" r="6" fill="${glow}" opacity="0.5"/><circle class="pg-eye" cx="50" cy="53" r="3.4" fill="${lite}"/>`;
  }
}

function crestSvg(i: number, p: string, s: string, shell: string): string {
  switch (i) {
    case 1: return `<path d="M50 2 L57 20 L43 20 Z" fill="${p}"/><path d="M50 6 L50 19" stroke="${shell}" stroke-width="1"/>`;
    case 2: return `<g stroke="${s}" stroke-width="1.6"><line x1="70" y1="26" x2="80" y2="6"/></g><circle cx="80.5" cy="5" r="2.6" fill="${s}"/>`;
    case 3: return `<g stroke="${s}" stroke-width="1.4"><line x1="34" y1="22" x2="26" y2="4"/><line x1="66" y1="22" x2="74" y2="4"/></g><circle cx="25.5" cy="3.5" r="2.2" fill="${p}"/><circle cx="74.5" cy="3.5" r="2.2" fill="${p}"/>`;
    case 4: return `<ellipse cx="50" cy="10" rx="20" ry="4" fill="none" stroke="${s}" stroke-width="1.6" opacity="0.95"/>`;
    case 5: return `<path d="M38 22 L42 6 L46 20 L50 2 L54 20 L58 6 L62 22 Z" fill="${p}"/>`;
    case 6: return `<path d="M30 28 C20 22 16 12 20 4 C22 14 28 18 36 22 Z M70 28 C80 22 84 12 80 4 C78 14 72 18 64 22 Z" fill="${s}"/>`;
    case 7: return `<path d="M20 50 L4 36 L8 58 Z M80 50 L96 36 L92 58 Z" fill="${p}" opacity="0.95"/>`;
    case 8: return `<path d="M32 22 L36 8 L43 18 L50 4 L57 18 L64 8 L68 22 Z" fill="${p}"/><circle cx="50" cy="12" r="2" fill="${s}"/>`;
    case 9: return `<ellipse cx="50" cy="40" rx="44" ry="10" fill="none" stroke="${s}" stroke-width="1.4" opacity="0.8" transform="rotate(-14 50 40)"/><circle cx="91" cy="31" r="2.6" fill="${p}"/>`;
    default: return '';
  }
}

function armorSvg(i: number, p: string, shell: string): string {
  const base = `<path d="M14 120 L20 100 L38 92 L62 92 L80 100 L86 120 Z" fill="${shell}" stroke="${p}" stroke-width="1.2"/>`;
  switch (i) {
    case 1: return `${base}<circle cx="19" cy="106" r="11" fill="${shell}" stroke="${p}" stroke-width="1.2"/><circle cx="81" cy="106" r="11" fill="${shell}" stroke="${p}" stroke-width="1.2"/><path d="M12 106 H26 M74 106 H88" stroke="${p}" stroke-opacity="0.6"/>`;
    case 2: return `<path d="M6 120 L12 98 L36 90 L64 90 L88 98 L94 120 Z" fill="${shell}" stroke="${p}" stroke-width="1.2"/><path d="M14 104 L34 98 M86 104 L66 98 M22 116 L38 108 M78 116 L62 108" stroke="${p}" stroke-opacity="0.55"/>`;
    case 3: return `${base}<path d="M34 86 L66 86 L70 102 L30 102 Z" fill="${shell}" stroke="${p}" stroke-width="1.2"/><path d="M38 90 H62" stroke="${p}" stroke-opacity="0.5"/>`;
    case 4: return `${base}<path d="M38 92 L50 112 L62 92" fill="none" stroke="${p}" stroke-width="1.4"/><path d="M30 100 L40 120 M70 100 L60 120" stroke="${p}" stroke-opacity="0.45"/>`;
    case 5: return `${base}<path d="M20 102 L38 112 L50 104 L62 112 L80 102" fill="none" stroke="${p}" stroke-width="1.2"/><circle cx="38" cy="112" r="1.8" fill="${p}"/><circle cx="62" cy="112" r="1.8" fill="${p}"/>`;
    case 6: return `<path d="M2 120 L16 96 L40 90 L60 90 L84 96 L98 120 Z" fill="${shell}" stroke="${p}" stroke-width="1.2"/><path d="M16 96 L10 120 M84 96 L90 120" stroke="${p}" stroke-opacity="0.5"/>`;
    default: return base;
  }
}

function emblemSvg(i: number, p: string, s: string): string {
  switch (i) {
    case 0: return `<path d="${BOLT}" fill="${p}"/>`;
    case 1: return `<path d="M50 100 L57 104 L57 112 L50 116 L43 112 L43 104 Z" fill="none" stroke="${p}" stroke-width="1.6"/><circle cx="50" cy="108" r="2" fill="${s}"/>`;
    case 2: return `<path d="M50 99 L52.6 105 L59 105.4 L54 109.4 L55.8 116 L50 112.3 L44.2 116 L46 109.4 L41 105.4 L47.4 105 Z" fill="${p}"/>`;
    case 3: return `<path d="M42 102 L50 108 L58 102 M42 109 L50 115 L58 109" fill="none" stroke="${p}" stroke-width="2"/>`;
    case 4: return `<path d="M50 99 L58 108 L50 117 L42 108 Z" fill="${p}"/><path d="M50 103 L54 108 L50 113 L46 108 Z" fill="${s}"/>`;
    case 5: return `<circle cx="50" cy="108" r="7" fill="none" stroke="${p}" stroke-width="1.6"/><circle cx="50" cy="108" r="2.6" fill="${s}"/>`;
    case 6: return `<path d="M50 100 L58 116 L42 116 Z" fill="none" stroke="${p}" stroke-width="1.6"/><path d="M50 106 L53.5 113 L46.5 113 Z" fill="${p}"/>`;
    default: return '';
  }
}

function patternSvg(i: number, s: string): string {
  switch (i) {
    case 1: return `<rect x="44" y="0" width="12" height="100" fill="${s}" opacity="0.5"/><rect x="40" y="0" width="1.5" height="100" fill="${s}" opacity="0.6"/><rect x="58.5" y="0" width="1.5" height="100" fill="${s}" opacity="0.6"/>`;
    case 2: {
      let d = '';
      for (let y = 10; y < 100; y += 10) for (let x = (y / 10) % 2 ? 10 : 15; x < 95; x += 10) d += `M${x} ${y - 3} l3 1.7 v3.4 l-3 1.7 l-3 -1.7 v-3.4 Z `;
      return `<path d="${d}" fill="none" stroke="${s}" stroke-width="0.7" opacity="0.45"/>`;
    }
    case 3: return `<path d="M22 70 H34 L40 64 H48 M78 70 H66 L60 76 H52 M30 32 H40 L46 26 M70 32 H60 L54 26 M24 84 H40 M60 84 H76" fill="none" stroke="${s}" stroke-width="1" opacity="0.6"/><g fill="${s}" opacity="0.7"><circle cx="48" cy="64" r="1.3"/><circle cx="52" cy="76" r="1.3"/><circle cx="46" cy="26" r="1.3"/><circle cx="54" cy="26" r="1.3"/></g>`;
    case 4: return `<g fill="${s}" opacity="0.28"><ellipse cx="30" cy="30" rx="12" ry="7" transform="rotate(-20 30 30)"/><ellipse cx="70" cy="74" rx="14" ry="8" transform="rotate(25 70 74)"/><ellipse cx="66" cy="28" rx="8" ry="5"/><ellipse cx="30" cy="80" rx="9" ry="6" transform="rotate(10 30 80)"/></g>`;
    case 5: return `<rect x="50" y="0" width="50" height="100" fill="${s}" opacity="0.22"/>`;
    default: return '';
  }
}

let uidCounter = 0;

/** The pilot as a standalone SVG string. */
export function pilotSvg(raw: PilotConfig, opts: { size?: number; idPrefix?: string; title?: string } = {}): string {
  const c = normalizePilot(raw) as PilotConfig;
  const id = opts.idPrefix || `pl${(uidCounter = (uidCounter + 1) % 1e6)}`;
  const size = opts.size || 160;
  const helmet = HELMETS[c.helmet];
  const visor = VISORS[c.visor];
  const light = c.shell.toUpperCase() === '#E6E8EB';
  const vents = c.helmet !== 4 && c.visor !== 8;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="${size}" height="${Math.round(size * 1.2)}" role="img" aria-label="${(opts.title || 'SGX pilot').replace(/"/g, '')}">`
    + `<defs>`
    + `<linearGradient id="${id}-v" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.glow}" stop-opacity="0.95"/><stop offset="1" stop-color="${c.secondary}" stop-opacity="0.75"/></linearGradient>`
    + `<linearGradient id="${id}-s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF" stop-opacity="${light ? 0.15 : 0.1}"/><stop offset="0.5" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.35"/></linearGradient>`
    + `<clipPath id="${id}-h"><path d="${helmet}"/></clipPath>`
    + `<clipPath id="${id}-c">${visor}</clipPath>`
    + `<filter id="${id}-g" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2.2"/></filter>`
    + `</defs>`
    + armorSvg(c.armor, c.primary, c.shell)
    + emblemSvg(c.emblem, c.primary, c.secondary)
    + crestSvg(c.crest, c.primary, c.secondary, c.shell)
    + `<path d="${helmet}" fill="${c.shell}"/>`
    + `<g clip-path="url(#${id}-h)">${patternSvg(c.pattern, c.secondary)}<rect width="100" height="100" fill="url(#${id}-s)"/></g>`
    + `<path d="${helmet}" fill="none" stroke="${c.primary}" stroke-width="1.6" stroke-linejoin="round"/>`
    + (vents ? `<g stroke="${c.primary}" stroke-opacity="0.55" stroke-width="1"><line x1="41" y1="76" x2="41" y2="84"/><line x1="46" y1="76" x2="46" y2="86"/><line x1="54" y1="76" x2="54" y2="86"/><line x1="59" y1="76" x2="59" y2="84"/></g>` : '')
    + `<g fill="${c.glow}" opacity="0.55" filter="url(#${id}-g)">${visor}</g>`
    + `<g fill="url(#${id}-v)">${visor}</g>`
    + `<g clip-path="url(#${id}-c)">${eyesSvg(c.eyes, c.glow, c.secondary)}</g>`
    + `<g fill="none" stroke="#000" stroke-opacity="0.35" stroke-width="0.8">${visor}</g>`
    + `</svg>`;
}

/** Raster copy (PNG data URL) for canvas cards and the PDF. */
export function pilotPng(c: PilotConfig, size = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement('canvas');
      cv.width = size; cv.height = Math.round(size * 1.2);
      cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
      resolve(cv.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pilotSvg(c, { size }))}`;
  });
}
