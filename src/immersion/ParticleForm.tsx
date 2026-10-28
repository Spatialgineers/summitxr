import React, { useEffect, useRef } from 'react';

/* PARTICLE FORM: the boot film's move, reusable. A swarm streaks in from an
   origin and settles into a shape (text or a drawn mark), shimmers for a
   beat, then hands over to the real element underneath. Pure 2D canvas;
   skipped for reduced motion, lite mode and very small screens. */

export interface ParticleFormProps {
  /** Paint the target shape (white on transparent) into a w × h context. */
  paint: (g: CanvasRenderingContext2D, w: number, h: number) => void;
  width: number;
  height: number;
  /** Where the swarm comes from, in this canvas' coordinates. Default: a wide ring. */
  origin?: { x: number; y: number } | 'ring' | 'left' | 'below';
  colors?: string[];
  /** ms until the swarm settles */
  duration?: number;
  /** ms the settled shape shimmers before fading */
  hold?: number;
  density?: number;
  className?: string;
  style?: React.CSSProperties;
  onSettled?: () => void;
  onDone?: () => void;
}

export function canRunParticles(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
    if (document.documentElement.classList.contains('sgx-lite')) return false;
    if (localStorage.getItem('sgx_lite_mode') === 'true') return false;
  } catch { /* ignore */ }
  return true;
}

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const ParticleForm: React.FC<ParticleFormProps> = ({
  paint, width, height, origin = 'ring', colors = ['#FDCC0D', '#00DDFF', '#FFFFFF'],
  duration = 1300, hold = 450, density = 1, className, style, onSettled, onDone,
}) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const cb = useRef({ onSettled, onDone });
  cb.current = { onSettled, onDone };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || width < 10 || height < 10) { cb.current.onDone?.(); return; }
    const W = Math.round(width), H = Math.round(height);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // sample the shape
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const g = off.getContext('2d');
    if (!g) { cb.current.onDone?.(); return; }
    paint(g, W, H);
    let data: Uint8ClampedArray;
    try { data = g.getImageData(0, 0, W, H).data; } catch { cb.current.onDone?.(); return; }
    const target = Math.round(Math.min(1600, (W * H) / 90) * density);
    let filled = 0;
    for (let i = 3; i < data.length; i += 16) if (data[i] > 128) filled++;
    const step = Math.max(2, Math.round(Math.sqrt((filled * 4) / Math.max(target, 1))));
    const pts: { x: number; y: number }[] = [];
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (data[(y * W + x) * 4 + 3] > 128) pts.push({ x, y });

    const ps = pts.map((p) => {
      let sx: number, sy: number;
      if (origin === 'left') { sx = -40 - Math.random() * W * 0.4; sy = H / 2 + (Math.random() - 0.5) * H * 2; }
      else if (origin === 'below') { sx = W / 2 + (Math.random() - 0.5) * W; sy = H + 40 + Math.random() * H; }
      else if (origin === 'ring') { const a = Math.random() * Math.PI * 2; const r = Math.max(W, H) * (0.7 + Math.random() * 0.4); sx = W / 2 + Math.cos(a) * r; sy = H / 2 + Math.sin(a) * r; }
      else { const o = origin as unknown as { x: number; y: number }; sx = o.x + (Math.random() - 0.5) * 30; sy = o.y + (Math.random() - 0.5) * 30; }
      return { sx, sy, tx: p.x, ty: p.y, d: Math.random() * 0.35, c: colors[(Math.random() * colors.length) | 0], s: Math.random() < 0.15 ? 2.2 : 1.4 };
    });

    let raf = 0;
    let settled = false;
    const start = performance.now();
    const frame = (now: number) => {
      const t = now - start;
      ctx.clearRect(0, 0, W, H);
      const swarm = Math.min(1, t / duration);
      const fade = t > duration + hold ? Math.max(0, 1 - (t - duration - hold) / 450) : 1;
      ctx.globalAlpha = fade;
      ctx.globalCompositeOperation = 'lighter';
      for (const p of ps) {
        const local = Math.min(1, Math.max(0, (swarm - p.d) / (1 - p.d)));
        const k = ease(local);
        const x = p.sx + (p.tx - p.sx) * k + (local >= 1 ? Math.sin(t / 90 + p.tx) * 0.5 : 0);
        const y = p.sy + (p.ty - p.sy) * k;
        ctx.fillStyle = p.c;
        ctx.fillRect(x, y, p.s, p.s);
      }
      ctx.globalCompositeOperation = 'source-over';
      if (!settled && t >= duration) { settled = true; cb.current.onSettled?.(); }
      if (fade <= 0) { cb.current.onDone?.(); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
    // runs once per mount: the shape is captured at mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" style={{ position: 'absolute', pointerEvents: 'none', ...style }} />;
};

/** Paint helper: centered (or left-aligned) lines of text, sized to fit. */
export function paintLines(lines: { text: string; font: string; color?: string }[], align: 'left' | 'center' = 'center', lineHeight = 1.0) {
  return (g: CanvasRenderingContext2D, w: number, h: number) => {
    g.textBaseline = 'alphabetic';
    g.textAlign = align;
    const sizes = lines.map((l) => { g.font = l.font; const m = /(\d+(?:\.\d+)?)px/.exec(l.font); return m ? Number(m[1]) : 32; });
    const total = sizes.reduce((a, s) => a + s * lineHeight, 0);
    let y = (h - total) / 2;
    lines.forEach((l, i) => {
      y += sizes[i] * lineHeight;
      g.font = l.font;
      g.fillStyle = '#fff';
      g.fillText(l.text, align === 'center' ? w / 2 : 0, y - sizes[i] * 0.12);
    });
  };
}

export default ParticleForm;
