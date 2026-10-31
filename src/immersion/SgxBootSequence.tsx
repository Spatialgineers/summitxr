import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { ScrambleText } from './ScrambleText';
import { loc } from '../lib/localize';
import { isFallback, isOpenSlot, pickSplashSponsors, sponsorTierLevel } from './splashSponsors';

/*
 * The one splash: a swarm of particles streaks in and assembles the Summit
 * logo (the gear with the S, in its own colors), the logo ignites, a
 * shockwave rolls out, "Spatialgineers LLC presenta" and the Summit wordmark
 * decode, and the Tier 3+ partner row (with open "your brand here" slots)
 * gets its moment. ~5 s, skippable with any key, a tap, or the Skip button.
 * If the logo image can't load, the SGX bolt stands in.
 */

/** The Summit logo, trimmed and served locally so the splash never waits on the network. */
const SUMMIT_LOGO = '/brand/summit-logo.png';
const BOLT_PATH = 'M1665 62 L121 1265 L763 1266 L382 1987 L1925 784 L1284 782 Z';
const TOTAL_MS = 5200;
const COLORS = ['#FDCC0D', '#FDCC0D', '#FDCC0D', '#FFBB00', '#00DDFF', '#32527B'];

interface Particle { x: number; y: number; sx: number; sy: number; tx: number; ty: number; c: string; d: number; s: number }

// Official order (Ground Truth §8).
const PILLARS = ['SGX.STORY', 'SGX.SHOWCASE', 'SGX.SPARK', 'SGX.STAGE', 'SGX.SYSTEM', 'SGX.SYNTHESIZE'];

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

/** Draws the mark (the Summit logo, or the bolt as a stand-in) into a size x size box. */
function drawMark(g: CanvasRenderingContext2D, size: number, logo: HTMLImageElement | null) {
  if (logo) { g.drawImage(logo, 0, 0, size, size); return; }
  g.save();
  g.scale(size / 2048, size / 2048);
  g.fillStyle = '#FDCC0D';
  g.fill(new Path2D(BOLT_PATH));
  g.restore();
}

/** Samples points inside the mark at the given on-screen size, each with the mark's own color there. */
function sampleMark(size: number, count: number, logo: HTMLImageElement | null): { x: number; y: number; c: string }[] {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  if (!g) return [];
  drawMark(g, size, logo);
  const data = g.getImageData(0, 0, size, size).data;
  const pts: { x: number; y: number; c: string }[] = [];
  const area = data.reduce((n, v, i) => (i % 4 === 3 && v > 128 ? n + 1 : n), 0);
  const step = Math.max(2, Math.floor(Math.sqrt(area / count)));
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      const i = (y * size + x) * 4;
      if (data[i + 3] > 128) pts.push({ x: x / size - 0.5, y: y / size - 0.5, c: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})` });
    }
  }
  return pts;
}

export const SgxBootSequence: React.FC<{ onComplete: () => void; onFadeStart?: () => void }> = ({ onComplete, onFadeStart }) => {
  const { language } = useLanguage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phase, setPhase] = useState<'swarm' | 'ignite' | 'title' | 'out'>('swarm');
  const [log, setLog] = useState<string[]>(['SGX://BOOT v2026.10.1']);
  const doneRef = useRef(false);
  const [sponsors] = useState(() => { try { return pickSplashSponsors(4); } catch { return []; } });

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setPhase('out');
    onFadeStart?.();
    window.setTimeout(onComplete, 380);
  };

  // Skip on any key or tap.
  useEffect(() => {
    const skip = () => finish();
    window.addEventListener('keydown', skip);
    return () => window.removeEventListener('keydown', skip);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Boot log: each pillar comes online.
  useEffect(() => {
    const timers = PILLARS.map((p, i) =>
      window.setTimeout(() => setLog((l) => [...l.slice(-6), `${p.padEnd(15, '.')} ONLINE`]), 220 + i * 190),
    );
    timers.push(window.setTimeout(() => setLog((l) => [...l.slice(-6), 'REACTOR ............ 100%']), 1500));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let cancelled = false;
    const logo = new Image();
    const begin = (mark: HTMLImageElement | null) => { if (!cancelled) run(mark); };
    logo.onload = () => begin(logo);
    logo.onerror = () => begin(null);
    logo.src = SUMMIT_LOGO;

    const run = (mark: HTMLImageElement | null) => {
      let reduce = false;
      try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const W = window.innerWidth, H = window.innerHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Room below for the title and the partner row.
      const boltSize = Math.min(W, H) * (W < 640 ? 0.42 : 0.33);
      const cx = W / 2, cy = H * (W < 640 ? 0.27 : 0.33);
      const count = W < 640 ? 650 : 1400;
      const pts = sampleMark(Math.round(boltSize), count, mark);

      const particles: Particle[] = pts.map((p) => {
        // Spawn on a wide ring outside the viewport so the swarm streaks in.
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(W, H) * (0.6 + Math.random() * 0.5);
        return {
          x: 0, y: 0,
          sx: cx + Math.cos(a) * r, sy: cy + Math.sin(a) * r,
          tx: cx + p.x * boltSize, ty: cy + p.y * boltSize,
          // the logo's own colors, with a few SGX sparks
          c: mark && Math.random() < 0.82 ? p.c : COLORS[(Math.random() * COLORS.length) | 0],
          d: Math.random() * 0.35,
          s: Math.random() < 0.15 ? 2.2 : 1.3,
        };
      });

      const start = performance.now();
      let ignited = false, titled = false;

      const drawLogo = (alpha: number, glow: number) => {
        ctx.save();
        ctx.translate(cx - boltSize / 2, cy - boltSize / 2);
        ctx.globalAlpha = alpha;
        ctx.shadowColor = 'rgba(253, 204, 13, 0.75)';
        ctx.shadowBlur = glow;
        drawMark(ctx, boltSize, mark);
        ctx.restore();
      };

      const frame = (now: number) => {
        const t = now - start;
        // Motion trails: fade the previous frame instead of clearing it.
        ctx.fillStyle = 'rgba(5, 5, 5, 0.28)';
        ctx.fillRect(0, 0, W, H);

        // Holodeck horizon.
        const hy = H * 0.52;
        const grad = ctx.createLinearGradient(0, 0, W, 0);
        grad.addColorStop(0, 'rgba(253,204,13,0)');
        grad.addColorStop(0.5, `rgba(253,204,13,${0.25 + 0.2 * Math.sin(t / 300)})`);
        grad.addColorStop(1, 'rgba(253,204,13,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, hy, W, 1);

        const swarmT = reduce ? 1 : Math.min(1, t / 1500);
        ctx.globalCompositeOperation = 'lighter';
        for (const p of particles) {
          const local = Math.min(1, Math.max(0, (swarmT - p.d) / (1 - p.d)));
          const k = easeInOutCubic(local);
          p.x = p.sx + (p.tx - p.sx) * k;
          p.y = p.sy + (p.ty - p.sy) * k;
          // Settled particles shimmer like a live mesh.
          const jitter = local >= 1 ? Math.sin(t / 90 + p.tx) * 0.6 : 0;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x + jitter, p.y, p.s, p.s);
        }
        ctx.globalCompositeOperation = 'source-over';

        // Ignite: the real logo fades in with emission and a shockwave rolls out.
        if (t > 1450) {
          if (!ignited) { ignited = true; setPhase('ignite'); }
          const it = Math.min(1, (t - 1450) / 450);
          drawLogo(easeOutCubic(it), 20 + 40 * Math.sin(Math.min(1, it) * Math.PI));
          const wt = Math.min(1, (t - 1450) / 900);
          if (wt < 1) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(0, 221, 255, ${0.8 * (1 - wt)})`;
            ctx.lineWidth = 2;
            ctx.arc(cx, cy, boltSize * 0.4 + easeOutCubic(wt) * Math.max(W, H) * 0.6, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
        if (t > 1850 && !titled) { titled = true; setPhase('title'); }
        if (t > TOTAL_MS) { finish(); return; }
        raf = requestAnimationFrame(frame);
      };
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(frame);
    };
    return () => { cancelled = true; cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const es = language === 'es';
  return (
    <div className={`sgx-boot ${phase === 'out' ? 'is-out' : ''}`} onPointerDown={finish} role="presentation">
      <canvas ref={canvasRef} className="sgx-boot__canvas" aria-hidden="true" />
      <div className="sgx-boot__tl sgx-brand-tag">Powered by Spatialgineers</div>
      <div className="sgx-boot__tr">
        <span className="sgx-led sgx-led--action" aria-hidden="true" />
        <span className="sgx-readout">BOOT {phase === 'swarm' ? 'MESH GEN' : 'EMISSION'}</span>
      </div>
      <pre className="sgx-boot__log" aria-hidden="true">{log.join('\n')}</pre>
      {(phase === 'title' || phase === 'out') && (
        <div className="sgx-boot__title">
          <p className="sgx-boot__presents">{es ? 'Spatialgineers LLC presenta' : 'Spatialgineers LLC presents'}</p>
          <h1><ScrambleText text="SPATIALGINEERS SUMMIT 2026" durationMs={650} /></h1>
          <p className="sgx-boot__meta">{es ? '11–13 DIC · YOUTUBE LIVE · DÍA 3 EN SAN JUAN' : 'DEC 11–13 · YOUTUBE LIVE · DAY 3 IN SAN JUAN'}</p>
          <p className="sgx-boot__tagline">
            {es ? 'Ingeniando imaginación, construyendo realidades.' : 'Engineering imagination, building reality.'}
          </p>
        </div>
      )}
      {sponsors.length > 0 && (phase === 'title' || phase === 'out') && (
        <div className="sgx-boot__partners" onPointerDown={(e) => e.stopPropagation()}>
          <p className="sgx-boot__partners-head">{es ? 'Patrocinadores y aliados' : 'Sponsors and partners'}</p>
          <ul>
            {sponsors.map((sp, i) => {
              const open = isOpenSlot(sp);
              const tier = sponsorTierLevel(sp);
              return (
                <li key={sp.id} style={{ ['--i' as string]: i }}>
                  <button
                    type="button"
                    className={`sgx-boot__partner ${open ? 'is-open' : ''}`}
                    onClick={() => {
                      finish();
                      window.setTimeout(() => {
                        if (open) {
                          window.dispatchEvent(new CustomEvent('sgx:open_sponsorships', { detail: { preferredTier: sp.tierId, source: 'splash_intro' } }));
                          window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section: 'SPONSORS_HUB' } }));
                        } else {
                          window.dispatchEvent(new CustomEvent('sgx:open_brand_showcase', { detail: { sponsor: sp } }));
                        }
                      }, 380);
                    }}
                  >
                    {!isFallback(sp) && sp.logoUrl && <img src={sp.logoUrl} alt="" loading="lazy" />}
                    <span className="sgx-boot__partner-tier">{sp.tierId === 'media_partner' ? (es ? 'Aliado de transmisión' : 'Streaming partner') : `Tier ${tier}`}</span>
                    <strong>{open ? (es ? 'Tu marca podría estar aquí' : 'Your brand could be here') : loc(sp, 'companyName', language)}</strong>
                    <span className="sgx-boot__partner-line">{open ? (es ? 'Postula tu marca →' : 'Apply your brand →') : loc(sp, 'tagline', language)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button type="button" className="sgx-boot__skipbtn" onPointerDown={(e) => e.stopPropagation()} onClick={finish}>{es ? 'Saltar intro' : 'Skip intro'} ›</button>
      <div className="sgx-boot__skip sgx-type-caption">{es ? 'Toca o presiona cualquier tecla para saltar' : 'Tap or press any key to skip'}</div>
    </div>
  );
};
