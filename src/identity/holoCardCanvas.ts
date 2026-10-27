import { SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { ROLE_COPY, type HoloCredential } from './credentials';

/* The Holo Card drawn on canvas, with the same layout as <SgxPassCard>:
   header (bolt, SGX PASS, serial), portrait with tier tag, who (label, name,
   callsign or title, pillar, rank or org), QR + code, pillar stamps and the
   CHROMA stamp. Role cards (speaker, initiate, sponsor) add the role band.
   Used for the PNG exports, the post/story formats and the 3D orbit card. */

export const CARD_W = 1050;
export const CARD_H = 648; // 1.62, same ratio as the pass

export type HoloFormat = 'badge' | 'post' | 'story';

export interface CardArt {
  cred: HoloCredential;
  es: boolean;
  accent: string;
  serial?: string;
  code?: string;
  tierLabel?: string;
  rank?: string;
  stamps?: Partial<Record<PillarKey, boolean>>;
  chroma?: boolean;
  portrait?: CanvasImageSource | null;
  /** Photo framing (only for photos; the pilot is always centered). */
  frame?: { zoom: number; x: number; y: number };
  qr?: CanvasImageSource | null;
  bolt?: CanvasImageSource | null;
  pillarIcons?: Partial<Record<PillarKey, CanvasImageSource>>;
  /** 0..1 */
  foil?: number;
  /** rotation of the foil sheen, degrees */
  foilAngle?: number;
}

export interface BackArt {
  es: boolean;
  accent: string;
  serial?: string;
  stats: { label: string; value: string }[];
  fine: string;
  issued: string;
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

function chamfer(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: number) {
  ctx.beginPath();
  ctx.moveTo(x + c, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - c);
  ctx.lineTo(x + w - c, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + c);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxW: number, size: number, weight: string, family: string, min = 18): number {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    if (ctx.measureText(text).width <= maxW) return s;
    s -= 2;
  } while (s > min);
  return s;
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxW) t = t.slice(0, -1);
  return `${t}…`;
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const DISPLAY = 'Orbitron, sans-serif';
const MONO = '"Share Tech Mono", monospace';

function cardBase(ctx: CanvasRenderingContext2D, accent: string, foil = 0.7, foilAngle = 35) {
  const W = CARD_W, H = CARD_H, CUT = 34;
  chamfer(ctx, 0, 0, W, H, CUT);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, 0, W * 0.55, H * 1.3);
  g.addColorStop(0, '#15181e');
  g.addColorStop(0.45, '#1a1a1a');
  g.addColorStop(1, '#050505');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W, 0, 0, W, 0, W * 0.9);
  r.addColorStop(0, withAlpha(accent, 0.2));
  r.addColorStop(1, withAlpha(accent, 0));
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, W, H);
  // holo sheen (the pass's rotating conic, frozen at an angle)
  if (foil > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.28 * foil;
    const a = (foilAngle * Math.PI) / 180;
    const sheen = ctx.createLinearGradient(W / 2 - Math.cos(a) * W, H / 2 - Math.sin(a) * W, W / 2 + Math.cos(a) * W, H / 2 + Math.sin(a) * W);
    sheen.addColorStop(0.2, 'rgba(0,221,255,0)');
    sheen.addColorStop(0.38, 'rgba(0,221,255,0.9)');
    sheen.addColorStop(0.5, 'rgba(253,204,13,0.9)');
    sheen.addColorStop(0.62, 'rgba(0,221,255,0.9)');
    sheen.addColorStop(0.8, 'rgba(0,221,255,0)');
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();
  chamfer(ctx, 1.5, 1.5, W - 3, H - 3, CUT);
  ctx.strokeStyle = withAlpha(accent, 0.75);
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, CUT); ctx.lineTo(CUT, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W - CUT, H); ctx.lineTo(W, H - CUT); ctx.stroke();
}

function header(ctx: CanvasRenderingContext2D, art: { es: boolean; accent: string; serial?: string; bolt?: CanvasImageSource | null }, brand: string) {
  if (art.bolt) ctx.drawImage(art.bolt, 38, 34, 40, 52);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#FDCC0D';
  ctx.shadowColor = 'rgba(253,204,13,0.5)';
  ctx.shadowBlur = 12;
  ctx.font = `800 36px ${DISPLAY}`;
  ctx.fillText(brand, 94, 66);
  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `400 17px ${MONO}`;
  ctx.fillText(art.es ? 'SPATIALGINEERS SUMMIT 2026 · 11–13 DIC' : 'SPATIALGINEERS SUMMIT 2026 · DEC 11–13', 96, 92);
  if (art.serial) {
    ctx.textAlign = 'right';
    ctx.fillStyle = art.accent;
    ctx.shadowColor = withAlpha(art.accent, 0.6);
    ctx.shadowBlur = 14;
    ctx.font = `400 50px ${MONO}`;
    ctx.fillText(`#${art.serial}`, CARD_W - 40, 80);
    ctx.shadowBlur = 0;
    ctx.textAlign = 'left';
  }
}

/** Front of the Holo Card at (0,0), CARD_W × CARD_H. */
export function drawCardFront(ctx: CanvasRenderingContext2D, art: CardArt) {
  const { cred, es, accent } = art;
  const isVisitor = cred.role === 'visitor';
  const review = cred.status === 'review';
  ctx.save();
  cardBase(ctx, accent, art.foil ?? 0.7, art.foilAngle);
  header(ctx, art, isVisitor ? 'SGX PASS' : `SGX PASS · ${ROLE_COPY[cred.role].label[es ? 0 : 1].toUpperCase()}`);

  let top = 128;
  if (!isVisitor) {
    const band = ROLE_COPY[cred.role];
    const bandColor = review ? '#FFBB00' : band.color;
    ctx.save();
    chamfer(ctx, 38, top, CARD_W - 76, 46, 12);
    ctx.fillStyle = review ? 'rgba(255,187,0,0.12)' : bandColor;
    ctx.fill();
    if (review) {
      ctx.clip();
      ctx.strokeStyle = 'rgba(255,187,0,0.35)';
      ctx.lineWidth = 8;
      for (let x = 20; x < CARD_W; x += 28) { ctx.beginPath(); ctx.moveTo(x, top + 50); ctx.lineTo(x + 46, top - 4); ctx.stroke(); }
    }
    ctx.restore();
    ctx.fillStyle = review ? '#FFBB00' : '#050505';
    ctx.font = `800 22px ${DISPLAY}`;
    const text = review ? (es ? `${band.band[0]} · EN REVISIÓN` : `${band.band[1]} · IN REVIEW`) : band.band[es ? 0 : 1];
    ctx.fillText(ellipsize(ctx, text, CARD_W - 120), 58, top + 31);
    top += 62;
  } else {
    top += 18;
  }

  // Portrait
  const pH = isVisitor ? 300 : 270;
  const pW = Math.round(pH * 5 / 6);
  const px = 40, py = top + 6;
  ctx.save();
  chamfer(ctx, px, py, pW, pH, 18);
  ctx.fillStyle = '#0b0d12';
  ctx.fill();
  ctx.clip();
  if (art.portrait) {
    const img = art.portrait as HTMLImageElement;
    const iw = (img as any).naturalWidth || (img as any).width || pW;
    const ih = (img as any).naturalHeight || (img as any).height || pH;
    const f = art.frame || { zoom: 1, x: 0, y: 0 };
    const scale = Math.max(pW / iw, pH / ih) * (f.zoom || 1);
    const dw = iw * scale, dh = ih * scale;
    ctx.drawImage(img, px + (pW - dw) / 2 + f.x * pW * 0.5, py + (pH - dh) / 2 + f.y * pH * 0.5, dw, dh);
  }
  ctx.restore();
  chamfer(ctx, px, py, pW, pH, 18);
  ctx.strokeStyle = withAlpha(accent, 0.6);
  ctx.lineWidth = 2;
  ctx.stroke();
  if (art.tierLabel) {
    ctx.fillStyle = accent;
    ctx.fillRect(px, py + pH - 30, pW, 30);
    ctx.fillStyle = '#050505';
    ctx.font = `700 15px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.fillText(ellipsize(ctx, art.tierLabel, pW - 10), px + pW / 2, py + pH - 10);
    ctx.textAlign = 'left';
  }

  // Who
  const hasQr = !!art.qr;
  const wx = px + pW + 32;
  const ww = (hasQr ? CARD_W - 290 : CARD_W - 40) - wx;
  let y = py + 24;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = `400 17px ${MONO}`;
  ctx.fillText(ROLE_COPY[cred.role].label[es ? 0 : 1].toUpperCase().split('').join(' '), wx, y);
  y += 52;
  const name = (cred.name || '').toUpperCase();
  const size = fitText(ctx, name, ww, 50, '700', DISPLAY, 26);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(ellipsize(ctx, name, ww), wx, y);
  y += size * 0.3 + 30;
  ctx.fillStyle = '#00DDFF';
  ctx.font = `400 25px ${MONO}`;
  const sub = isVisitor ? (cred.handle || '') : (cred.title || '');
  if (sub) { ctx.fillText(ellipsize(ctx, sub.toUpperCase(), ww), wx, y); y += 20; }
  const pillar = cred.pillar ? SGX_PILLARS.find((p) => p.key === cred.pillar) : null;
  if (pillar) {
    y += 16;
    ctx.font = `400 19px ${DISPLAY}`;
    const label = pillar.name.toUpperCase();
    const tw = ctx.measureText(label).width + 56;
    ctx.strokeStyle = withAlpha(accent, 0.55);
    ctx.lineWidth = 2;
    ctx.strokeRect(wx, y, tw, 38);
    const icon = art.pillarIcons?.[pillar.key];
    if (icon) ctx.drawImage(icon, wx + 8, y + 5, 28, 28);
    ctx.fillStyle = accent;
    ctx.fillText(label, wx + 44, y + 27);
    y += 38;
  }
  y += 30;
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = `400 17px ${MONO}`;
  const lines = isVisitor ? [art.rank || ''] : [cred.org || '', cred.topic || ''];
  lines.filter(Boolean).forEach((l) => { ctx.fillText(ellipsize(ctx, l.toUpperCase(), ww), wx, y); y += 26; });

  // QR
  if (art.qr) {
    const q = 210, qx = CARD_W - 40 - q, qy = py + 4;
    ctx.save();
    ctx.shadowColor = 'rgba(253,204,13,0.35)';
    ctx.shadowBlur = 24;
    (ctx as any).imageSmoothingEnabled = false;
    ctx.drawImage(art.qr, qx, qy, q, q);
    ctx.restore();
    if (art.code) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = `400 16px ${MONO}`;
      ctx.textAlign = 'center';
      ctx.fillText(art.code, qx + q / 2, qy + q + 26);
      ctx.textAlign = 'left';
    }
  }

  // Stamps
  const sy = CARD_H - 72, s = 46;
  SGX_PILLARS.forEach((p, i) => {
    const sx = 40 + i * (s + 12);
    const on = !!art.stamps?.[p.key];
    ctx.save();
    ctx.globalAlpha = on ? 1 : 0.22;
    chamfer(ctx, sx, sy, s, s, 8);
    ctx.strokeStyle = on ? accent : 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();
    const icon = art.pillarIcons?.[p.key];
    if (icon) {
      if (!on) ctx.filter = 'grayscale(1)';
      ctx.drawImage(icon, sx + 7, sy + 7, s - 14, s - 14);
    }
    ctx.restore();
  });
  const cw = 130, cx = CARD_W - 40 - cw;
  ctx.save();
  ctx.globalAlpha = art.chroma ? 1 : 0.3;
  chamfer(ctx, cx, sy, cw, s, 8);
  if (art.chroma) { ctx.fillStyle = '#FDCC0D'; ctx.fill(); }
  ctx.strokeStyle = art.chroma ? '#FDCC0D' : 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = art.chroma ? '#050505' : '#FFFFFF';
  ctx.font = `400 18px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText('C H R O M A', cx + cw / 2, sy + 30);
  ctx.textAlign = 'left';
  ctx.restore();

  if (review) {
    ctx.save();
    ctx.translate(CARD_W / 2, CARD_H / 2 + 40);
    ctx.rotate(-0.18);
    ctx.fillStyle = 'rgba(255,187,0,0.16)';
    ctx.font = `900 96px ${DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText(es ? 'EN REVISIÓN' : 'IN REVIEW', 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

/** Back of the card (pilot telemetry), same as the pass back. */
export function drawCardBack(ctx: CanvasRenderingContext2D, art: BackArt & { bolt?: CanvasImageSource | null; foil?: number }) {
  ctx.save();
  cardBase(ctx, art.accent, art.foil ?? 0.7, 120);
  header(ctx, art, art.es ? 'TELEMETRÍA DEL PILOTO' : 'PILOT TELEMETRY');
  const cols = 3, gw = (CARD_W - 80 - 2 * 16) / cols, gh = 96;
  art.stats.slice(0, 6).forEach((s, i) => {
    const x = 40 + (i % cols) * (gw + 16), y = 136 + Math.floor(i / cols) * (gh + 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, gw, gh);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = `400 17px ${MONO}`;
    ctx.fillText(s.label.toUpperCase(), x + 16, y + 32);
    ctx.fillStyle = art.accent;
    ctx.font = `700 36px ${DISPLAY}`;
    ctx.fillText(s.value, x + 16, y + 76);
  });
  ctx.fillStyle = 'rgba(255,255,255,0.62)';
  ctx.font = `400 21px sans-serif`;
  const words = art.fine.split(' ');
  let line = '', y = 400;
  words.forEach((w) => {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > CARD_W - 80) { ctx.fillText(line, 40, y); y += 30; line = w; } else line = t;
  });
  if (line) ctx.fillText(line, 40, y);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = `400 17px ${MONO}`;
  ctx.fillText(art.issued.toUpperCase(), 40, CARD_H - 40);
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
