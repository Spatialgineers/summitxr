import React, { useEffect, useRef, useState } from 'react';
import { useImmersion } from './ImmersionContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { SECTION_BY_KEY, pillarDisplay, sectionLabel } from './sections';
import { findPillar } from '../lib/sgxPillars';

/* -------------------------------------------------------------------------
   Atmosphere: holodeck vignette + scanlines. Pure CSS, pointer-events none.
   ------------------------------------------------------------------------- */
export const Atmosphere: React.FC = () => <div className="sgx-atmosphere" aria-hidden="true" />;

/* -------------------------------------------------------------------------
   Warp: a short hyperspace jump each time the section changes.
   ------------------------------------------------------------------------- */
export const WarpTransition: React.FC<{ sectionKey: string }> = ({ sectionKey }) => {
  const { language } = useLanguage();
  const [jump, setJump] = useState<{ key: string; n: number } | null>(null);
  const prevRef = useRef(sectionKey);

  useEffect(() => {
    if (prevRef.current === sectionKey) return;
    prevRef.current = sectionKey;
    setJump((j) => ({ key: sectionKey, n: (j?.n || 0) + 1 }));
    const t = window.setTimeout(() => setJump(null), 760);
    return () => window.clearTimeout(t);
  }, [sectionKey]);

  if (!jump) return null;
  const meta = SECTION_BY_KEY[jump.key];
  const station = jump.key.startsWith('PILLAR:') ? findPillar(jump.key.slice(7)) : undefined;
  const pillarText = station ? `${language === 'es' ? 'Estación' : 'Station'} 0${station.index}` : meta ? pillarDisplay(meta.pillar) : '';
  const titleText = station ? station.name : sectionLabel(meta, language) || jump.key.replace(/^PAGE_/, '');
  return (
    <div className="sgx-warp" key={jump.n} aria-hidden="true">
      <div className="sgx-warp__streaks" />
      <div className="sgx-warp__label">
        {pillarText && <span className="sgx-warp__pillar">{pillarText}</span>}
        <span className="sgx-warp__title">{titleText}</span>
        <span className="sgx-warp__telemetry">WARP · SYNC OK</span>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------
   Reticle: a chamfered targeting bracket that trails the pointer and locks
   onto anything interactive. Mouse/pen only; the native cursor stays.
   ------------------------------------------------------------------------- */
const INTERACTIVE = 'a, button, [role="button"], input, select, textarea, summary, label, [data-sgx-hover]';

export const CursorReticle: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return;
    const el = ref.current;
    if (!el) return;
    let tx = -100, ty = -100, x = -100, y = -100;
    let raf = 0;
    let visible = false;

    const loop = () => {
      x += (tx - x) * 0.28;
      y += (ty - y) * 0.28;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.3 ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      tx = e.clientX; ty = e.clientY;
      if (!visible) { visible = true; el.classList.add('is-visible'); x = tx; y = ty; }
      const target = e.target as Element | null;
      el.classList.toggle('is-locked', !!target?.closest?.(INTERACTIVE));
      kick();
    };
    const onLeave = () => { visible = false; el.classList.remove('is-visible'); };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const ring = document.createElement('span');
      ring.className = 'sgx-click-ring';
      ring.style.left = `${e.clientX}px`;
      ring.style.top = `${e.clientY}px`;
      document.body.appendChild(ring);
      window.setTimeout(() => ring.remove(), 520);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={ref} className="sgx-reticle" aria-hidden="true">
      <span /><span /><span /><span />
    </div>
  );
};

/* -------------------------------------------------------------------------
   Pulse: expanding energy rings from wherever sgx:pulse was fired.
   ------------------------------------------------------------------------- */
export const PulseWaves: React.FC = () => {
  const [waves, setWaves] = useState<{ id: number; x: number; y: number }[]>([]);
  useEffect(() => {
    const onPulse = (e: Event) => {
      const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail || { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      const id = Date.now() + Math.random();
      setWaves((w) => [...w.slice(-3), { id, x, y }]);
      window.setTimeout(() => setWaves((w) => w.filter((v) => v.id !== id)), 1100);
    };
    window.addEventListener('sgx:pulse', onPulse);
    return () => window.removeEventListener('sgx:pulse', onPulse);
  }, []);
  return (
    <>
      {waves.map((w) => (
        <div key={w.id} className="sgx-pulse" style={{ left: w.x, top: w.y }} aria-hidden="true">
          <span /><span />
        </div>
      ))}
    </>
  );
};

/* -------------------------------------------------------------------------
   Overdrive frame: lit edges while the reactor is at full power.
   ------------------------------------------------------------------------- */
export const OverdriveFrame: React.FC = () => {
  const { overdrive } = useImmersion();
  if (!overdrive) return null;
  return (
    <div className="sgx-overdrive-frame" aria-hidden="true">
      <span className="sgx-overdrive-frame__label">OVERDRIVE · XP x2</span>
    </div>
  );
};

/* -------------------------------------------------------------------------
   XP ticker: every XP gain on the platform floats up from the mission rail,
   and activities from other modules (drone, match, votes…) charge the reactor.
   ------------------------------------------------------------------------- */
const SELF_CATEGORIES = ['quest_complete', 'energy_cell'];

export const XpTicker: React.FC = () => {
  const { profile } = usePilotProfile();
  const { addEnergy } = useImmersion();
  const [floats, setFloats] = useState<{ id: number; xp: number }[]>([]);
  const lastXp = useRef<number | null>(null);
  const lastActivity = useRef<string | null>(null);
  // The saved profile hydrates a moment after mount; don't celebrate that jump.
  const readyAt = useRef(Date.now() + 3000);

  useEffect(() => {
    const xp = profile.totalXp;
    if (lastXp.current !== null && xp > lastXp.current && Date.now() > readyAt.current) {
      const id = Date.now() + Math.random();
      setFloats((f) => [...f.slice(-4), { id, xp: xp - (lastXp.current as number) }]);
      window.setTimeout(() => setFloats((f) => f.filter((v) => v.id !== id)), 1600);
    }
    lastXp.current = xp;
  }, [profile.totalXp]);

  const latest = profile.weekendActivity?.[0];
  useEffect(() => {
    if (!latest) return;
    if (lastActivity.current !== null && latest.id !== lastActivity.current && Date.now() > readyAt.current && !SELF_CATEGORIES.includes(latest.category)) {
      addEnergy(6);
    }
    lastActivity.current = latest.id;
  }, [latest, addEnergy]);

  return (
    <div className="sgx-xp-ticker" aria-hidden="true">
      {floats.map((f) => (
        <span key={f.id} className="sgx-xp-float">+{f.xp} XP</span>
      ))}
    </div>
  );
};

/* -------------------------------------------------------------------------
   Holodeck: a receding grid floor with a yellow horizon behind every page.
   ------------------------------------------------------------------------- */
export const Holodeck: React.FC<{ motion: boolean }> = ({ motion }) => (
  <div className="sgx-holodeck" data-motion={motion ? 'on' : 'off'} aria-hidden="true">
    <div className="sgx-holodeck__horizon" />
    <div className="sgx-holodeck__floor"><div className="sgx-holodeck__grid" /></div>
  </div>
);

/* -------------------------------------------------------------------------
   Scroll reveal: blocks of the active section rise in as they enter view.
   Only tags elements from JS, so without it everything stays visible.
   ------------------------------------------------------------------------- */
const REVEAL_SELECTOR = [
  '#summit-main-tab-content > div > *',
  '#summit-main-tab-content > div > div > .grid > *',
  '#summit-main-tab-content > div > div > div > .grid > *',
].join(',');

export function useScrollReveal(enabled: boolean, routeKey: string) {
  useEffect(() => {
    if (!enabled || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          (e.target as HTMLElement).dataset.sgxReveal = 'in';
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.06, rootMargin: '0px 0px -4% 0px' });

    const scan = () => {
      const nodes = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
      const perParent = new Map<Element, number>();
      nodes.forEach((el) => {
        if (el.dataset.sgxReveal || el.closest('[data-sgx-reveal="pending"]')) return;
        if (getComputedStyle(el).position === 'fixed') return;
        const parent = el.parentElement as Element;
        const i = perParent.get(parent) || 0;
        perParent.set(parent, i + 1);
        el.style.setProperty('--sgx-i', String(Math.min(i, 8)));
        el.dataset.sgxReveal = 'pending';
        io.observe(el);
      });
    };

    const t = window.setTimeout(scan, 60);
    const main = document.getElementById('summit-main-tab-content');
    const mo = main ? new MutationObserver(() => scan()) : null;
    if (main && mo) mo.observe(main, { childList: true, subtree: true });
    return () => {
      window.clearTimeout(t);
      mo?.disconnect();
      io.disconnect();
      // Never leave content hidden if the effect stops mid-way.
      document.querySelectorAll<HTMLElement>('[data-sgx-reveal="pending"]').forEach((el) => { el.dataset.sgxReveal = 'in'; });
    };
  }, [enabled, routeKey]);
}
