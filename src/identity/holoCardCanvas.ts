import { useEffect, useState } from 'react';
import { PILLAR_BY_KEY, SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { type HoloCredential } from './credentials';

/* The Holo Card drawn on canvas, in the style of the Summit badge
   ("Credenciales Summit 2026"): a ticket with 45° cuts and notches, the SGX
   gear-and-bolt pattern, a brushed-blue stub with the role in big type and
   the "Una producción de" plate, a holographic foil, and a back with the
   event: the 3-day program, dates, Chroma Space Studios and your QR.
   Used by the Hangar, the Holo Card Studio, the share formats and the 3D
   orbit card. */

export const CARD_W = 1050;
export const CARD_H = 660;
const CUT = 28, STUB_X = 840, NOTCH = 16;
const ART = { x: 36, y: 110, w: 400, h: 400 };
const STUB_MID = STUB_X + 32 + (CARD_W - 6 - STUB_X - 32) / 2;

export type HoloFormat = 'badge' | 'post' | 'story';

export interface CardArt {
  cred: HoloCredential;
  es: boolean;
  accent: string;
  serial?: string;
  code?: string;
  /** Visitor pass details. */
  passTier?: 'DIGITAL' | 'SHOWCASE';
  passStatus?: 'CONFIRMED' | 'PENDING';
  xp?: number;
  rank?: string;
  portrait?: CanvasImageSource | null;
  /** Photo framing (only for photos; the pilot is always centered). */
  frame?: { zoom: number; x: number; y: number };
  /** 'contain' shows the whole portrait (the pilot); photos fill the window. */
  fit?: 'cover' | 'contain';
  /** The pass QR: printed on the back. */
  qr?: CanvasImageSource | null;
  /** 0..1 */
  foil?: number;
  /** 0..1, where the foil sweep sits (moves with the tilt). Undefined = no sweep. */
  sheen?: number;
  // Kept for older callers; the new card reads its own assets.
  tierLabel?: string;
  stamps?: Partial<Record<PillarKey, boolean>>;
  chroma?: boolean;
  bolt?: CanvasImageSource | null;
  pillarIcons?: Partial<Record<PillarKey, CanvasImageSource>>;
  foilAngle?: number;
}

/* ---------- assets ---------- */

const ASSET_SRC: Record<string, string> = {
  gear: '/holo/gear.png', gearG: '/holo/gearG.png', bolt: '/holo/bolt.png', guild: '/holo/guild.png',
  summitIcon: '/holo/summitIcon.png', summitType: '/holo/summitType.png', sgxLogo: '/holo/sgxLogo.png',
  STORY: '/holo/story.png', SHOWCASE: '/holo/showcase.png', SPARK: '/holo/spark.png',
  STAGE: '/holo/stage.png', SYSTEM: '/holo/system.png', SYNTHESIZE: '/holo/synthesize.png',
};
const A: Record<string, HTMLImageElement> = {};
let assetsPromise: Promise<void> | null = null;

/** Images and fonts the card needs. Safe to call many times. */
export function loadHoloAssets(): Promise<void> {
  if (!assetsPromise) {
    const fonts = typeof document !== 'undefined' && document.fonts
      ? Promise.all(['900 40px Orbitron', '700 20px Orbitron', '400 16px "Chakra Petch"', '600 16px "Chakra Petch"', '400 16px "Exo 2"', '600 16px "Exo 2"', '400 16px "Share Tech Mono"']
        .map((f) => document.fonts.load(f).catch(() => undefined)))
      : Promise.resolve([]);
    assetsPromise = Promise.all([
      fonts,
      ...Object.entries(ASSET_SRC).map(([k, src]) => loadImage(src).then((img) => { if (img) A[k] = img; })),
    ]).then(() => undefined);
  }
  return assetsPromise;
}

/** true once the card assets are ready (re-render to redraw). */
export function useHoloAssets(): boolean {
  const [ready, setReady] = useState(() => Object.keys(A).length > 0);
  useEffect(() => {
    let alive = true;
    loadHoloAssets().then(() => { if (alive) setReady(true); });
    return () => { alive = false; };
  }, []);
  return ready;
}

export function loadImage(src?: string | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    if (/^https?:/.test(src) && !src.startsWith(window.location.origin)) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/** Any rendered <svg> (the pilot glyph) → image. */
export function svgElementToImage(svg: SVGSVGElement | null, size = 512): Promise<HTMLImageElement | null> {
  if (!svg) return Promise.resolve(null);
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const vb = clone.viewBox?.baseVal;
  const ratio = vb && vb.width ? vb.height / vb.width : 1.2;
  clone.setAttribute('width', String(size));
  clone.setAttribute('height', String(Math.round(size * ratio)));
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
  return loadImage(url);
}


/* ---------- program (Run of Show v2026.10) ---------- */

const DAYS = {
  d1: { n: ['DÍA 1', 'DAY 1'], date: ['VIE 11 DIC', 'FRI DEC 11'], mode: ['DIGITAL', 'DIGITAL'], what: ['LOS SEIS PILARES', 'THE SIX PILLARS'], long: ['Los seis pilares, intermedios artísticos y los Initiates.', 'The six pillars, artistic interludes and the Initiates.'], hours: '10:00 AM–4:30 PM' },
  d2: { n: ['DÍA 2', 'DAY 2'], date: ['SÁB 12 DIC', 'SAT DEC 12'], mode: ['DIGITAL', 'DIGITAL'], what: ['INDUSTRY DAY', 'INDUSTRY DAY'], long: ['Industry Day: una conversación con expertos por pilar.', 'Industry Day: a conversation with experts per pillar.'], hours: '10:00 AM–4:00 PM' },
  d3: { n: ['DÍA 3', 'DAY 3'], date: ['DOM 13 DIC', 'SUN DEC 13'], mode: ['HÍBRIDO', 'HYBRID'], what: ['EXHIBICIÓN EN VIVO', 'LIVE EXHIBITION'], long: ['Exhibición performativa en Chroma Space Studios, San Juan.', 'Performative exhibition at Chroma Space Studios, San Juan.'], hours: '10:00 AM–4:00 PM' },
} as const;
type DayKey = keyof typeof DAYS;
const L = (pair: readonly [string, string], es: boolean) => pair[es ? 0 : 1];

const C = { y: '#fdcc0d', cyan: '#00ddff', white: '#ffffff', muted: '#9a9a9a', soft: '#b5b5b5' };
const TITLE = 'Orbitron, system-ui, sans-serif';
const HUD = '"Chakra Petch", system-ui, sans-serif';
const BODY = '"Exo 2", system-ui, sans-serif';
const MONO = '"Share Tech Mono", ui-monospace, monospace';
const DISPLAY = TITLE;

/* ---------- drawing helpers ---------- */

function chamfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
  ctx.beginPath(); ctx.moveTo(x + c, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + c); ctx.closePath();
}
function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
function font(ctx: CanvasRenderingContext2D, size: number, weight = 400, fam?: string) {
  ctx.font = `${weight} ${size}px ${fam || (weight >= 700 ? TITLE : HUD)}`;
}
function spacing(ctx: CanvasRenderingContext2D, px: number) { if ('letterSpacing' in ctx) (ctx as any).letterSpacing = `${px}px`; }
function measure(ctx: CanvasRenderingContext2D, s: string, size: number, weight = 400, fam?: string, ls = 0) {
  font(ctx, size, weight, fam); spacing(ctx, ls); const w = ctx.measureText(s).width; spacing(ctx, 0); return w;
}
interface TxtOpts { size?: number; weight?: number; fam?: string; color?: string; align?: CanvasTextAlign; ls?: number }
function txt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, o: TxtOpts = {}) {
  font(ctx, o.size || 16, o.weight || 400, o.fam); spacing(ctx, o.ls || 0);
  ctx.fillStyle = o.color || C.white; ctx.textAlign = o.align || 'left'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  const w = ctx.measureText(s).width; spacing(ctx, 0); ctx.textAlign = 'left'; return w;
}
function fitSize(ctx: CanvasRenderingContext2D, s: string, maxW: number, start: number, min: number, weight = 400, fam?: string, ls = 0) {
  let size = start;
  while (size > min && measure(ctx, s, size, weight, fam, ls) > maxW) size -= 1;
  return size;
}
function ellipsize(ctx: CanvasRenderingContext2D, s: string, maxW: number, size: number, fam?: string, weight = 400) {
  if (measure(ctx, s, size, weight, fam) <= maxW) return s;
  while (s.length > 1 && measure(ctx, `${s}…`, size, weight, fam) > maxW) s = s.slice(0, -1);
  return `${s.trim()}…`;
}
function wrapLines(ctx: CanvasRenderingContext2D, s: string, maxW: number, maxLines: number, size: number, fam?: string, weight = 400) {
  font(ctx, size, weight, fam);
  const words = s.split(' '); const lines: string[] = []; let cur = '';
  words.forEach((w) => { const t = cur ? `${cur} ${w}` : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const keep = lines.slice(0, maxLines);
    keep[maxLines - 1] = ellipsize(ctx, `${keep[maxLines - 1]} ${lines.slice(maxLines).join(' ')}`, maxW, size, fam, weight);
    return keep;
  }
  return lines;
}
function drawFit(ctx: CanvasRenderingContext2D, im: CanvasImageSource | undefined | null, cx: number, cy: number, maxW: number, maxH: number, alpha?: number) {
  if (!im) return;
  const iw = (im as HTMLImageElement).naturalWidth || (im as HTMLCanvasElement).width;
  const ih = (im as HTMLImageElement).naturalHeight || (im as HTMLCanvasElement).height;
  if (!iw || !ih) return;
  const s = Math.min(maxW / iw, maxH / ih);
  ctx.save(); if (alpha != null) ctx.globalAlpha = alpha;
  ctx.drawImage(im, cx - (iw * s) / 2, cy - (ih * s) / 2, iw * s, ih * s);
  ctx.restore();
}
function cardPath(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(CUT, 0); ctx.lineTo(STUB_X - NOTCH, 0);
  ctx.arc(STUB_X, 0, NOTCH, Math.PI, 0, true);
  ctx.lineTo(CARD_W, 0); ctx.lineTo(CARD_W, CARD_H - CUT); ctx.lineTo(CARD_W - CUT, CARD_H);
  ctx.lineTo(STUB_X + NOTCH, CARD_H);
  ctx.arc(STUB_X, CARD_H, NOTCH, 0, Math.PI, true);
  ctx.lineTo(0, CARD_H); ctx.lineTo(0, CUT); ctx.closePath();
}
let tile: HTMLCanvasElement | null = null;
function patternTile() {
  if (tile || !A.gear || !A.bolt) return tile;
  const c = document.createElement('canvas'); c.width = 132; c.height = 132; const x = c.getContext('2d')!;
  x.globalAlpha = 0.34; drawFit(x, A.gear, 33, 33, 34, 34);
  x.globalAlpha = 0.11; drawFit(x, A.bolt, 99, 99, 34, 34);
  x.globalAlpha = 0.07; drawFit(x, A.bolt, 99, 33, 18, 18); drawFit(x, A.bolt, 33, 99, 18, 18);
  tile = c; return tile;
}
function pattern(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, alpha = 1) {
  const tl = patternTile(); if (!tl) return;
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = ctx.createPattern(tl, 'repeat')!; ctx.fillRect(x, y, w, h); ctx.restore();
}
function metalBlue(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  let g = ctx.createLinearGradient(x, y, x + w, y + h);
  ([[0, '#4b72a3'], [0.28, '#32527b'], [0.5, '#1d3452'], [0.72, '#3a5f8e'], [1, '#22395a']] as const).forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  g = ctx.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.42, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(0.58, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.035)';
  for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
}
function base(ctx: CanvasRenderingContext2D, foil: number) {
  ctx.save(); cardPath(ctx); ctx.clip();
  let g = ctx.createLinearGradient(0, 0, 420, CARD_H);
  g.addColorStop(0, '#1e1e1e'); g.addColorStop(0.55, '#131313'); g.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, STUB_X, CARD_H);
  pattern(ctx, 0, 0, STUB_X, CARD_H, 1);
  metalBlue(ctx, STUB_X, 0, CARD_W - STUB_X, CARD_H);
  drawFit(ctx, A.bolt, CARD_W - 30, 36, 140, 140, 0.95);
  g = ctx.createLinearGradient(0, 0, 0, CARD_H);
  ([[0, '#fdcc0d'], [0.18, '#fff3b0'], [0.36, '#00ddff'], [0.52, '#32527b'], [0.7, '#ffbb00'], [0.86, '#fff3b0'], [1, '#fdcc0d']] as const).forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(STUB_X + 12, 0, 20, CARD_H);
  ctx.globalAlpha = 0.25 + foil * 0.5; ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  for (let y = -40; y < CARD_H + 40; y += 14) { ctx.beginPath(); ctx.moveTo(STUB_X + 12, y + 20); ctx.lineTo(STUB_X + 32, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.y; ctx.fillRect(CARD_W - 6, 0, 6, CARD_H);
  ctx.strokeStyle = 'rgba(253,204,13,0.75)'; ctx.lineWidth = 2; ctx.setLineDash([8, 7]);
  ctx.beginPath(); ctx.moveTo(STUB_X + 2, NOTCH + 6); ctx.lineTo(STUB_X + 2, CARD_H - NOTCH - 6); ctx.stroke(); ctx.setLineDash([]);
  ctx.restore();
  // lanyard slot
  const sx = STUB_X / 2 - 60;
  ctx.beginPath(); if ((ctx as any).roundRect) (ctx as any).roundRect(sx, 16, 120, 14, 7); else ctx.rect(sx, 16, 120, 14);
  ctx.fillStyle = '#050505'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,0.14)'; ctx.lineWidth = 1; ctx.stroke();
  cardPath(ctx); ctx.strokeStyle = 'rgba(253,204,13,0.5)'; ctx.lineWidth = 2; ctx.stroke();
}
function producedBy(ctx: CanvasRenderingContext2D, es: boolean, x: number, y: number, w: number, h: number) {
  ctx.save();
  chamfer(ctx, x, y, w, h, 10); ctx.clip();
  const g = ctx.createLinearGradient(x, y, x + w, y + h);
  ([[0, '#d9dfe6'], [0.35, '#aab6c4'], [0.55, '#e6eaef'], [0.8, '#9eabbb'], [1, '#c7d0da']] as const).forEach(([o, c]) => g.addColorStop(o, c));
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let yy = y; yy < y + h; yy += 3) ctx.fillRect(x, yy, w, 1);
  ctx.restore();
  chamfer(ctx, x, y, w, h, 10); ctx.strokeStyle = C.y; ctx.lineWidth = 1.5; ctx.stroke();
  [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px, py, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#6b7a8c'; ctx.fill(); });
  const label = es ? 'UNA PRODUCCIÓN DE' : 'A PRODUCTION BY';
  txt(ctx, label, x + w / 2, y + 24, { size: fitSize(ctx, label, w - 24, 11, 8, 600, HUD, 1.2), weight: 600, fam: HUD, color: '#1d3452', align: 'center', ls: 1.2 });
  drawFit(ctx, A.sgxLogo, x + w / 2, y + 28 + (h - 36) / 2, w - 26, h - 46);
}
function holo(ctx: CanvasRenderingContext2D, foil: number, t?: number) {
  if (foil <= 0) return;
  ctx.save();
  cardPath(ctx); ctx.clip();
  ctx.globalCompositeOperation = 'overlay'; ctx.globalAlpha = foil * 0.5; ctx.lineWidth = 7;
  for (let i = -CARD_H; i < CARD_W + CARD_H; i += 28) {
    ctx.strokeStyle = (i / 28) % 2 ? 'rgba(0,221,255,0.14)' : 'rgba(253,204,13,0.14)';
    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - CARD_H * 0.577, CARD_H); ctx.stroke();
  }
  if (t != null) {
    const sh = (t - 0.4) * 1800;
    ctx.globalCompositeOperation = 'color-dodge'; ctx.globalAlpha = foil * 0.55;
    const g = ctx.createLinearGradient(-250 + sh, -120, 850 + sh, 780);
    ([[0, 'rgba(0,0,0,0)'], [0.3, 'rgba(0,0,0,0)'], [0.4, 'rgba(253,204,13,0.5)'], [0.46, 'rgba(0,221,255,0.45)'], [0.5, 'rgba(255,255,255,0.55)'], [0.54, 'rgba(255,187,0,0.4)'], [0.6, 'rgba(50,82,123,0.45)'], [0.7, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0)']] as const).forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, CARD_H);
  }
  ctx.restore();
}
function seal(ctx: CanvasRenderingContext2D, sx: number, sy: number, r: number, logo: number) {
  ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2);
  let g: CanvasGradient;
  if ((ctx as any).createConicGradient) {
    g = (ctx as any).createConicGradient(0.35, sx, sy);
    ([[0, '#fdcc0d'], [0.2, '#00ddff'], [0.4, '#32527b'], [0.6, '#ffbb00'], [0.8, '#fff3b0'], [1, '#fdcc0d']] as const).forEach(([o, c]) => g.addColorStop(o, c));
  } else {
    g = ctx.createLinearGradient(sx - r, sy - r, sx + r, sy + r); g.addColorStop(0, '#fdcc0d'); g.addColorStop(0.5, '#00ddff'); g.addColorStop(1, '#ffbb00');
  }
  ctx.fillStyle = g; ctx.fill(); ctx.restore();
  ctx.beginPath(); ctx.arc(sx, sy, r * 0.84, 0, Math.PI * 2); ctx.fillStyle = '#111111'; ctx.fill();
  drawFit(ctx, A.summitIcon, sx, sy, logo, logo);
}
interface Cell { k: string; v: string; f?: number; big?: number; weight?: number; fam?: string; color?: string }
function infoCells(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cells: Cell[]) {
  chamfer(ctx, x, y, w, h, 10); ctx.fillStyle = 'rgba(10,10,10,0.82)'; ctx.fill();
  ctx.strokeStyle = 'rgba(253,204,13,0.65)'; ctx.lineWidth = 1.2; ctx.stroke();
  const tot = cells.reduce((s, c) => s + (c.f || 1), 0); let acc = 0;
  cells.forEach((c, i) => {
    const cw = (w * (c.f || 1)) / tot, x0 = x + acc; acc += cw;
    if (i > 0) { ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(x0, y + 14, 1, h - 28); }
    txt(ctx, c.k, x0 + 12, y + 26, { size: 12, color: C.muted, ls: 1.2 });
    const size = fitSize(ctx, c.v, cw - 20, c.big || 18, 10, c.weight || 600, c.fam || HUD, 0.5);
    txt(ctx, c.v, x0 + 12, y + (c.big ? 62 : 58), { size, weight: c.weight || 600, fam: c.fam || HUD, color: c.color || C.white, ls: 0.5 });
  });
}
function verticalWord(ctx: CanvasRenderingContext2D, word: string, cx: number, top: number, bottom: number, color: string) {
  const len = bottom - top;
  const size = fitSize(ctx, word, len, 70, 26, 900, TITLE, 2);
  ctx.save(); ctx.translate(cx, top + len / 2); ctx.rotate(-Math.PI / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 2;
  txt(ctx, word, 0, size * 0.36, { size, weight: 900, fam: TITLE, color, align: 'center', ls: 2 });
  ctx.restore();
}
function topBar(ctx: CanvasRenderingContext2D, es: boolean) {
  drawFit(ctx, A.summitIcon, 58, 58, 44, 40);
  txt(ctx, 'SPATIALGINEERS SUMMIT 2026', 92, 68, { size: 19, weight: 700, color: C.white, ls: 1 });
  txt(ctx, es ? '11–13 DIC · SAN JUAN, PR' : 'DEC 11–13 · SAN JUAN, PR', STUB_X - 24, 68, { size: 14, color: C.muted, align: 'right', ls: 1.2 });
  ctx.save(); ctx.shadowColor = 'rgba(253,204,13,0.8)'; ctx.shadowBlur = 12; ctx.fillStyle = C.y; ctx.fillRect(36, 88, STUB_X - 60, 2); ctx.restore();
}
function footer(ctx: CanvasRenderingContext2D, left: string, num: string, leftColor = C.white) {
  const R = STUB_X - 24;
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(36, 600, STUB_X - 60, 1);
  txt(ctx, ellipsize(ctx, left, 300, 14, HUD, 600), 36, 636, { size: 14, weight: 600, fam: HUD, color: leftColor, ls: 1.2 });
  txt(ctx, 'summit.spatialgineers.com', (36 + R) / 2 + 40, 636, { size: 15, fam: MONO, color: C.cyan, align: 'center' });
  txt(ctx, `N.º ${num}`, R, 636, { size: 15, fam: MONO, color: C.cyan, align: 'right' });
}

/* ---------- what each role says ---------- */

function roleCopy(art: CardArt) {
  const { cred, es } = art;
  const pillar = cred.pillar ? PILLAR_BY_KEY[cred.pillar] : null;
  const review = cred.status === 'review';
  const name = (cred.name || '').trim().toUpperCase() || (cred.role === 'sponsor' ? (es ? '[TU MARCA]' : '[YOUR BRAND]') : (es ? '[NOMBRE APELLIDO]' : '[FULL NAME]'));
  const d2Slot = pillar?.program.find((p) => p.day === 2)?.time;
  const joinTitleOrg = [cred.title, cred.org].map((s) => (s || '').trim()).filter(Boolean).join(' · ');
  if (cred.role === 'visitor') {
    const showcase = art.passTier === 'SHOWCASE';
    const invited = showcase && art.passStatus === 'CONFIRMED';
    return {
      chip: invited ? (es ? 'INVITADO DÍA 3' : 'DAY 3 GUEST') : showcase ? (es ? 'DÍA 3 SOLICITADO' : 'DAY 3 REQUESTED') : (es ? 'CONFIRMADO' : 'CONFIRMED'),
      eyebrow: showcase ? (es ? 'SGX PASS · DÍA 3 CHROMA' : 'SGX PASS · DAY 3 CHROMA') : (es ? 'SGX PASS · DIGITAL GLOBAL' : 'SGX PASS · GLOBAL DIGITAL'),
      name,
      line2: joinTitleOrg || art.rank || (es ? 'Piloto del Summit' : 'Summit pilot'),
      handle: cred.handle || '',
      blockLabel: es ? 'AFINIDAD' : 'AFFINITY',
      blockWord: pillar ? pillar.key : (es ? 'POR ELEGIR' : 'TO PICK'),
      blockText: pillar ? pillar.line[es ? 'es' : 'en'] : '',
      cells: [
        { k: es ? 'DÍAS 1–2' : 'DAYS 1–2', v: es ? '11–12 DIC' : 'DEC 11–12', weight: 700, fam: TITLE, color: C.y, big: 19, f: 0.95 },
        { k: es ? 'DÍA 3' : 'DAY 3', v: invited ? 'CHROMA' : (es ? 'POR INVITACIÓN' : 'BY INVITATION'), f: 1.1 },
        { k: 'XP', v: (art.xp ?? 0).toLocaleString('es-PR'), color: C.cyan, fam: MONO, weight: 400, big: 19, f: 0.9 },
      ] as Cell[],
      stub: es ? 'PILOTO' : 'PILOT',
      myDays: (invited ? ['d1', 'd2', 'd3'] : ['d1', 'd2']) as DayKey[],
    };
  }
  if (cred.role === 'speaker') {
    return {
      chip: review ? (es ? 'EN REVISIÓN' : 'IN REVIEW') : (es ? 'CONFIRMADO' : 'CONFIRMED'),
      eyebrow: review ? (es ? 'SPEAKER · EN REVISIÓN' : 'SPEAKER · IN REVIEW') : (es ? 'SPEAKER CONFIRMADO' : 'CONFIRMED SPEAKER'),
      name, line2: joinTitleOrg || (es ? 'Cargo · Organización' : 'Title · Organization'), handle: cred.handle || '',
      blockLabel: es ? 'MISIÓN' : 'MISSION', blockWord: es ? 'CHARLA' : 'TALK',
      blockText: (cred.topic || '').trim() || L(DAYS.d2.long, es),
      cells: [
        { k: L(DAYS.d2.n, es), v: L(DAYS.d2.date, es), weight: 700, fam: TITLE, color: C.y, big: 19, f: 0.9 },
        { k: L(DAYS.d2.mode, es), v: L(DAYS.d2.what, es), f: 0.95 },
        { k: d2Slot ? (es ? 'HORA' : 'TIME') : (es ? 'HORARIO' : 'HOURS'), v: d2Slot || DAYS.d2.hours, color: C.cyan, fam: MONO, weight: 400, big: 17, f: 1.35 },
      ] as Cell[],
      stub: 'SPEAKER', myDays: ['d2'] as DayKey[],
    };
  }
  if (cred.role === 'initiate') {
    return {
      chip: 'PRE-SHOWCASE',
      eyebrow: 'SGX GUILD · PRE-SHOWCASE',
      name, line2: ['Spatialgineer Initiate', (cred.title || '').trim()].filter(Boolean).join(' · '), handle: cred.handle || '',
      blockLabel: es ? 'PORTAFOLIO' : 'PORTFOLIO', blockWord: (cred.topic || '').trim().toUpperCase() || (es ? 'PORTAFOLIO INTERACTIVO' : 'INTERACTIVE PORTFOLIO'),
      blockText: es ? '8 minutos en vivo. SGX Ranked Trials, Temporada 1.' : '8 minutes live. SGX Ranked Trials, Season 1.',
      cells: [
        { k: L(DAYS.d1.n, es), v: L(DAYS.d1.date, es), weight: 700, fam: TITLE, color: C.y, big: 19, f: 0.9 },
        { k: 'SGX GUILD', v: 'PRE-SHOWCASE', f: 0.95 },
        { k: es ? 'HORA' : 'TIME', v: '2:30–4:00 PM', color: C.cyan, fam: MONO, weight: 400, big: 17, f: 1.35 },
      ] as Cell[],
      stub: 'INITIATE', myDays: ['d1'] as DayKey[],
    };
  }
  return {
    chip: review ? (es ? 'EN REVISIÓN' : 'IN REVIEW') : 'SPONSOR',
    eyebrow: review ? (es ? 'SPONSOR · EN REVISIÓN' : 'SPONSOR · IN REVIEW') : (es ? 'AUSPICIADOR OFICIAL' : 'OFFICIAL SPONSOR'),
    name, line2: (cred.handle || '').trim() || (es ? 'Auspiciador oficial del Summit' : 'Official Summit sponsor'), handle: '',
    blockLabel: es ? 'EXPERIENCIA' : 'EXPERIENCE', blockWord: '',
    blockText: (cred.topic || '').trim() || `The ${(cred.name || '').trim() || 'Brand'} Showcase`,
    cells: [
      { k: es ? 'NIVEL' : 'LEVEL', v: 'SPONSOR', weight: 700, fam: TITLE, color: C.y, big: 20 },
      { k: es ? 'AUSPICIO' : 'PARTNER', v: es ? 'OFICIAL' : 'OFFICIAL' },
      { k: es ? 'EN VIVO' : 'LIVE', v: es ? '11–13 DIC' : 'DEC 11–13', color: C.cyan, fam: MONO, weight: 400 },
    ] as Cell[],
    stub: 'SPONSOR', myDays: [] as DayKey[],
  };
}

/* ---------- front ---------- */

/** Front of the Holo Card at (0,0), CARD_W × CARD_H. */
export function drawCardFront(ctx: CanvasRenderingContext2D, art: CardArt) {
  const { es } = art;
  const sponsor = art.cred.role === 'sponsor';
  const ini = art.cred.role === 'initiate';
  const foil = art.foil ?? 0.7;
  const r = roleCopy(art);
  ctx.save();
  base(ctx, foil);
  topBar(ctx, es);

  // portrait window
  ctx.save();
  chamfer(ctx, ART.x, ART.y, ART.w, ART.h, 14); ctx.clip();
  ctx.fillStyle = '#090909'; ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
  pattern(ctx, ART.x, ART.y, ART.w, ART.h, 0.8);
  const im = art.portrait;
  if (im) {
    const iw = (im as HTMLImageElement).naturalWidth || (im as HTMLCanvasElement).width;
    const ih = (im as HTMLImageElement).naturalHeight || (im as HTMLCanvasElement).height;
    if (iw && ih) {
      if (sponsor) {
        drawFit(ctx, im, ART.x + ART.w / 2, ART.y + ART.h / 2 - 10, ART.w * 0.76, ART.h * 0.66);
      } else if (art.fit === 'contain') {
        drawFit(ctx, im, ART.x + ART.w / 2, ART.y + ART.h / 2 + 8, ART.w * 0.86, ART.h * 0.86);
      } else {
        const f = art.frame;
        const cover = Math.max(ART.w / iw, ART.h / ih) * Math.max(1, f?.zoom ?? 1);
        const dw = iw * cover, dh = ih * cover;
        const mx = Math.max(0, (dw - ART.w) / 2), my = Math.max(0, (dh - ART.h) / 2);
        ctx.drawImage(im, ART.x + (ART.w - dw) / 2 + (f?.x ?? 0) * mx, ART.y + (ART.h - dh) / 2 + (f?.y ?? 0) * my, dw, dh);
        const g = ctx.createLinearGradient(0, ART.y + ART.h - 110, 0, ART.y + ART.h);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = g; ctx.fillRect(ART.x, ART.y + ART.h - 110, ART.w, 110);
      }
    }
  } else {
    drawFit(ctx, A.gearG, ART.x + ART.w / 2, ART.y + ART.h / 2 - 24, 260, 260, 0.5);
    txt(ctx, sponsor ? (es ? '[TU LOGO]' : '[YOUR LOGO]') : (es ? '[TU FOTO]' : '[YOUR PHOTO]'), ART.x + ART.w / 2, ART.y + ART.h / 2 + 140, { size: 22, weight: 700, color: C.y, align: 'center' });
  }
  ctx.restore();
  chamfer(ctx, ART.x + 0.5, ART.y + 0.5, ART.w - 1, ART.h - 1, 14); ctx.strokeStyle = 'rgba(253,204,13,0.55)'; ctx.lineWidth = 1.2; ctx.stroke();
  const rw = measure(ctx, r.chip, 13, 600, HUD, 1.4) + 20;
  ctx.fillStyle = C.y; ctx.fillRect(ART.x + 14, ART.y + 14, rw, 25);
  txt(ctx, r.chip, ART.x + 24, ART.y + 31, { size: 13, weight: 600, fam: HUD, color: '#050505', ls: 1.4 });
  if (ini) { ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8; drawFit(ctx, A.guild, ART.x + ART.w - 36, ART.y + 34, 40, 40); ctx.restore(); }
  ctx.save(); ctx.shadowColor = 'rgba(253,204,13,0.9)'; ctx.shadowBlur = 14; ctx.fillStyle = C.y;
  ctx.fillRect(ART.x + 14, ART.y + ART.h - 3, ART.w - 28, 3); ctx.restore();

  // pillar under the window
  txt(ctx, es ? 'PILAR' : 'PILLAR', ART.x, 562, { size: 12, color: C.muted, ls: 1.2 });
  const pk = art.cred.pillar;
  if (pk) {
    drawFit(ctx, A[pk], ART.x + 72, 552, 36, 36);
    txt(ctx, ellipsize(ctx, PILLAR_BY_KEY[pk].id, ART.w - 100, 15, MONO), ART.x + 98, 562, { size: 15, fam: MONO, color: C.cyan });
  } else {
    txt(ctx, es ? 'SGX · 6 PILARES' : 'SGX · 6 PILLARS', ART.x + 62, 562, { size: 15, fam: MONO, color: C.cyan });
  }

  // info column
  const Lx = ART.x + ART.w + 28, R = STUB_X - 24, W = R - Lx;
  drawFit(ctx, A.bolt, Lx + 12, 128, 26, 26);
  txt(ctx, r.eyebrow, Lx + 32, 136, { size: fitSize(ctx, r.eyebrow, W - 32, 15, 10, 600, HUD, 2), weight: 600, fam: HUD, color: C.y, ls: 2 });
  txt(ctx, r.name, Lx, 184, { size: fitSize(ctx, r.name, W, 38, 18, 900), weight: 900, color: C.white });
  txt(ctx, ellipsize(ctx, r.line2, W, 17, BODY), Lx, 214, { size: 17, fam: BODY, color: C.soft });
  if (r.handle) txt(ctx, ellipsize(ctx, r.handle, W, 15, MONO), Lx, 240, { size: 15, fam: MONO, color: C.cyan });
  ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(Lx, 260, W, 1);
  txt(ctx, r.blockLabel, Lx, 290, { size: 13, color: C.muted, ls: 1.6 });
  if (r.blockWord) {
    const bs = fitSize(ctx, r.blockWord, W, 36, 18, 900);
    ctx.save(); ctx.shadowColor = 'rgba(253,204,13,0.45)'; ctx.shadowBlur = 14;
    txt(ctx, ellipsize(ctx, r.blockWord, W, bs, TITLE, 900), Lx, 336, { size: bs, weight: 900, color: C.y, ls: 1 });
    ctx.restore();
    wrapLines(ctx, r.blockText, W, 2, 17, BODY).forEach((ln, i) => txt(ctx, ln, Lx, 368 + i * 22, { size: 17, fam: BODY, color: C.soft }));
  } else {
    wrapLines(ctx, r.blockText, W, 3, 22, BODY, 600).forEach((ln, i) => txt(ctx, ln, Lx, 322 + i * 28, { size: 22, fam: BODY, weight: 600, color: C.white }));
  }
  infoCells(ctx, Lx, 412, W, 92, r.cells);
  const live = es ? 'GRATIS · EN VIVO POR YOUTUBE LIVE' : 'FREE · LIVE ON YOUTUBE LIVE';
  txt(ctx, live, Lx, 562, { size: fitSize(ctx, live, W, 13, 9, 600, HUD, 1.2), weight: 600, fam: HUD, color: C.white, ls: 1.2 });

  footer(ctx, '#SGXSUMMIT2026', art.serial || '001');
  verticalWord(ctx, r.stub, STUB_MID, 140, 426, C.y);
  producedBy(ctx, es, STUB_X + 40, 440, CARD_W - STUB_X - 56, 178);
  holo(ctx, foil, art.sheen);
  ctx.restore();
}

/* ---------- back ---------- */

/** Back: the event (program, dates, Chroma) and, on a pass, its QR. */
export function drawCardBack(ctx: CanvasRenderingContext2D, art: CardArt) {
  const { es } = art;
  const foil = art.foil ?? 0.7;
  const r = roleCopy(art);
  ctx.save();
  base(ctx, foil);
  if (art.qr) {
    // The pass QR: Day 3 entrance, contact card and prize token.
    const qs = 236;
    chamfer(ctx, 200 - qs / 2 - 14, 300 - qs / 2 - 14, qs + 28, qs + 28, 14);
    ctx.fillStyle = '#fdcc0d'; ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(253,204,13,0.55)'; ctx.shadowBlur = 30;
    chamfer(ctx, 200 - qs / 2 - 14, 300 - qs / 2 - 14, qs + 28, qs + 28, 14); ctx.strokeStyle = C.y; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
    ctx.drawImage(art.qr, 200 - qs / 2, 300 - qs / 2, qs, qs);
    txt(ctx, es ? 'TU QR · ENTRADA Y NETWORKING' : 'YOUR QR · ENTRANCE & NETWORKING', 200, 152, { size: 12, weight: 600, fam: HUD, color: C.cyan, align: 'center', ls: 1.4 });
    if (art.code) txt(ctx, art.code, 200, 470, { size: 16, fam: MONO, color: C.white, align: 'center', ls: 1 });
  } else {
    drawFit(ctx, A.gear, 200, 300, 400, 400, 0.95);
    seal(ctx, 200, 300, 100, 128);
  }
  txt(ctx, es ? '11 · 12 · 13 DIC 2026' : 'DEC 11 · 12 · 13, 2026', 200, 568, { size: 19, weight: 700, color: C.y, align: 'center', ls: 1 });
  txt(ctx, 'CHROMA SPACE STUDIOS · SAN JUAN', 200, 596, { size: 12, color: C.muted, align: 'center', ls: 1.2 });
  const Lx = 420, R = STUB_X - 24;
  drawFit(ctx, A.summitType, Lx + 105, 88, 210, 80);
  drawFit(ctx, A.bolt, Lx + 10, 152, 22, 22);
  txt(ctx, es ? 'PROGRAMA' : 'PROGRAM', Lx + 28, 160, { size: 15, weight: 700, color: C.y, ls: 2 });
  (['d1', 'd2', 'd3'] as DayKey[]).forEach((k, i) => {
    const d = DAYS[k], y = 184 + i * 92;
    const mine = r.myDays.includes(k);
    chamfer(ctx, Lx - 10, y - 4, R - Lx + 20, 82, 8); ctx.fillStyle = mine ? 'rgba(30,24,4,0.9)' : 'rgba(10,10,10,0.72)'; ctx.fill();
    if (mine) { ctx.strokeStyle = 'rgba(253,204,13,0.7)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    txt(ctx, L(d.n, es), Lx, y + 22, { size: 14, fam: MONO, color: C.cyan });
    txt(ctx, `${L(d.date, es)} · ${L(d.mode, es)}`, Lx + 66, y + 22, { size: 15, weight: 600, fam: HUD, ls: 0.8 });
    txt(ctx, d.hours, R, y + 22, { size: 13, fam: MONO, color: C.cyan, align: 'right' });
    if (mine) txt(ctx, es ? 'TU DÍA' : 'YOUR DAY', Lx, y + 70, { size: 11, weight: 600, fam: HUD, color: C.y, ls: 1.4 });
    wrapLines(ctx, L(d.long, es), R - Lx - 66, 2, 15, BODY).forEach((ln, j) => txt(ctx, ln, Lx + 66, y + 46 + j * 20, { size: 15, fam: BODY, color: C.soft }));
  });
  txt(ctx, es ? 'GRATIS · EN VIVO POR YOUTUBE LIVE' : 'FREE · LIVE ON YOUTUBE LIVE', Lx, 488, { size: 14, weight: 600, fam: HUD, color: C.white, ls: 1.2 });
  txt(ctx, es ? 'Día 3 por invitación y cupo limitado.' : 'Day 3 by invitation, limited capacity.', Lx, 514, { size: 14, fam: BODY, color: C.soft });
  txt(ctx, '#SGXSUMMIT2026', Lx, 542, { size: 14, weight: 600, fam: HUD, color: C.y, ls: 1.2 });
  footer(ctx, `${r.stub} · ${r.name}`, art.serial || '001', C.muted);
  verticalWord(ctx, 'SUMMIT 2026', STUB_MID, 140, 426, C.y);
  producedBy(ctx, es, STUB_X + 40, 440, CARD_W - STUB_X - 56, 178);
  holo(ctx, foil, art.sheen);
  ctx.restore();
}

/** A card face rendered into a share format. */
export function renderFormat(
  face: (ctx: CanvasRenderingContext2D) => void,
  format: HoloFormat,
  opts: { es: boolean; accent: string; headline: string; backdrop: 0 | 1 | 2; scale?: number },
): HTMLCanvasElement {
  const c = document.createElement('canvas');
  if (format === 'badge') {
    const k = opts.scale || 1;
    c.width = CARD_W * k; c.height = CARD_H * k;
    const ctx = c.getContext('2d')!;
    ctx.scale(k, k);
    face(ctx);
    return c;
  }
  const W = 1080, H = format === 'post' ? 1350 : 1920;
  c.width = W; c.height = H;
  const ctx = c.getContext('2d')!;
  // backdrop
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0b0d12'); bg.addColorStop(1, '#050505');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  if (opts.backdrop === 0) {
    ctx.strokeStyle = 'rgba(0,221,255,0.08)'; ctx.lineWidth = 1;
    for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  } else if (opts.backdrop === 1) {
    for (let i = 0; i < 160; i++) {
      const r = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const r2 = (Math.sin(i * 78.233) * 12345.6789) % 1;
      ctx.fillStyle = `rgba(255,255,255,${0.2 + Math.abs(r) * 0.6})`;
      ctx.fillRect(Math.abs(r) * W, Math.abs(r2) * H, 2, 2);
    }
  } else {
    ctx.strokeStyle = withAlpha(opts.accent, 0.12); ctx.lineWidth = 2;
    for (let i = -H; i < W; i += 70) { ctx.beginPath(); ctx.moveTo(i, H); ctx.lineTo(i + H, 0); ctx.stroke(); }
  }
  const glow = ctx.createRadialGradient(W / 2, H * 0.46, 40, W / 2, H * 0.46, W * 0.8);
  glow.addColorStop(0, withAlpha(opts.accent, 0.35)); glow.addColorStop(1, withAlpha(opts.accent, 0));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // title
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FDCC0D';
  ctx.font = `800 46px ${DISPLAY}`;
  ctx.fillText('SPATIALGINEERS SUMMIT 2026', W / 2, format === 'post' ? 120 : 220);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `400 26px ${MONO}`;
  ctx.fillText(opts.es ? '11–13 DIC · YOUTUBE LIVE · DÍA 3 CHROMA SPACE STUDIOS' : 'DEC 11–13 · YOUTUBE LIVE · DAY 3 CHROMA SPACE STUDIOS', W / 2, format === 'post' ? 170 : 272);
  // card
  const cw = W - 120, k = cw / CARD_W, ch = CARD_H * k;
  const cy = H / 2 - ch / 2 + (format === 'post' ? 10 : 0);
  // The card renders on its own canvas so the glow is one soft shadow, not one per stroke.
  const card = document.createElement('canvas');
  card.width = Math.round(cw * 2); card.height = Math.round(ch * 2);
  const cctx = card.getContext('2d')!;
  cctx.scale((cw * 2) / CARD_W, (ch * 2) / CARD_H);
  face(cctx);
  ctx.save();
  ctx.translate(W / 2, cy + ch / 2);
  ctx.rotate(-0.035);
  ctx.shadowColor = withAlpha(opts.accent, 0.45);
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 24;
  ctx.drawImage(card, -cw / 2, -ch / 2, cw, ch);
  ctx.restore();
  // headline
  ctx.textAlign = 'center';
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `800 54px ${DISPLAY}`;
  ctx.fillText(opts.headline, W / 2, cy + ch + (format === 'post' ? 130 : 220));
  ctx.fillStyle = '#00DDFF';
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText('summit.spatialgineers.com · #SpatialgineersSummit', W / 2, H - (format === 'post' ? 70 : 200));
  ctx.textAlign = 'left';
  return c;
}
