import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { explore, useCalm } from '../../immersion/calmMode';
import { ParticleForm, canRunParticles, paintLines } from '../../immersion/ParticleForm';

/* The first screen's message, over the 3D core: what it is, when, and one
   clear action. It steps aside (with the rest of the calm layer) as soon
   as the visitor starts exploring. */

const DAY1 = Date.UTC(2026, 11, 11, 14, 0, 0); // Dec 11, 10:00 AST

function useCountdown() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(t);
  }, []);
  const ms = Math.max(0, DAY1 - now);
  return { d: Math.floor(ms / 86_400_000), h: Math.floor(ms / 3_600_000) % 24, m: Math.floor(ms / 60_000) % 60, live: ms === 0 };
}

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxHeroOverlay: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const calm = useCalm();
  const sgx = useOptionalSgxIdentity();
  const forged = !!sgx?.isForged;
  const { d, h, m, live } = useCountdown();

  // The title is first drawn by particles leaving the core (once per session).
  const rootRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [form, setForm] = useState<null | { left: number; top: number; w: number; h: number; fonts: string[]; origin: { x: number; y: number } }>(null);
  const [forming, setForming] = useState(() => {
    try { return canRunParticles() && sessionStorage.getItem('sgx_hero_formed') !== '1' && window.innerWidth >= 360; } catch { return false; }
  });
  useEffect(() => {
    if (!forming || !calm) return;
    let alive = true;
    (document.fonts?.ready || Promise.resolve()).then(() => {
      const root = rootRef.current, title = titleRef.current;
      if (!alive || !root || !title) return;
      const rr = root.getBoundingClientRect(), tr = title.getBoundingClientRect();
      const fonts = Array.from(title.children).map((el) => {
        const cs = getComputedStyle(el as HTMLElement);
        return `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      });
      setForm({
        left: tr.left - rr.left - 8, top: tr.top - rr.top - 8, w: tr.width + 16, h: tr.height + 16, fonts,
        origin: { x: rr.width * 0.55 - (tr.left - rr.left), y: rr.height * 0.42 - (tr.top - rr.top) },
      });
      try { sessionStorage.setItem('sgx_hero_formed', '1'); } catch { /* ignore */ }
    });
    return () => { alive = false; };
  }, [forming, calm]);

  return (
    <div ref={rootRef} className={`sgx-corehero ${calm ? '' : 'is-gone'}`} aria-hidden={!calm}>
      {form && (
        <ParticleForm
          className="sgx-corehero__swarm"
          style={{ left: form.left, top: form.top }}
          width={form.w}
          height={form.h}
          origin={form.origin}
          duration={1500}
          hold={350}
          paint={paintLines([{ text: 'SPATIALGINEERS', font: form.fonts[0] || '600 64px Orbitron' }, { text: 'SUMMIT 2026', font: form.fonts[1] || form.fonts[0] || '600 64px Orbitron' }], 'left', 0.98)}
          onSettled={() => setForming(false)}
          onDone={() => setForm(null)}
        />
      )}
      <div className="sgx-corehero__scrim" aria-hidden="true" />
      <div className="sgx-corehero__copy">
        <p className="sgx-corehero__badge sgx-corehero__in" style={{ ['--i' as string]: 0 }}>
          <span className="sgx-corehero__dot" aria-hidden="true" />
          {es ? 'Regresa el Spatialgineers Summit · segunda edición' : 'The Spatialgineers Summit returns · second edition'}
        </p>
        <h1 ref={titleRef} className={`sgx-corehero__title ${forming ? 'is-forming' : 'sgx-corehero__in'}`} style={{ ['--i' as string]: 1 }}>
          <span>Spatialgineers</span>
          <span className="sgx-corehero__accent">Summit 2026</span>
        </h1>
        <p className="sgx-corehero__dates sgx-corehero__in" style={{ ['--i' as string]: 2 }}>
          {es ? '11–13 dic 2026 · YouTube Live + San Juan, PR' : 'Dec 11–13, 2026 · YouTube Live + San Juan, PR'}
        </p>
        <p className="sgx-corehero__sub sgx-corehero__in" style={{ ['--i' as string]: 3 }}>
          {es
            ? 'Tres días de spatial computing, artistas invitados y producción virtual en vivo. Días 1 y 2 gratis por YouTube Live; el Día 3, en Chroma Space Studios, por invitación.'
            : 'Three days of spatial computing, guest artists and live virtual production. Days 1 and 2 free on YouTube Live; Day 3 at Chroma Space Studios, by invitation.'}
        </p>
        <div className="sgx-corehero__ctas sgx-corehero__in" style={{ ['--i' as string]: 4 }}>
          <span className="sgx-glow">
            <button
              type="button"
              className="sgx-btn"
              tabIndex={calm ? 0 : -1}
              onClick={() => { playUiChirp(880); fire(forged ? 'sgx:open_hangar' : 'sgx:open_forge', forged ? { tab: 'pass' } : undefined); }}
            >
              [ ⚡ {forged ? (es ? 'Ver mi pase' : 'See my pass') : (es ? 'Forjar mi pase' : 'Forge my pass')} ]
            </button>
          </span>
          <button type="button" className="sgx-btn sgx-btn--ground" tabIndex={calm ? 0 : -1} onClick={() => { playUiChirp(640); explore(); }}>
            {es ? 'Explorar el núcleo' : 'Explore the core'}
          </button>
        </div>
        <p className="sgx-corehero__strip sgx-corehero__in" style={{ ['--i' as string]: 5 }}>
          {live
            ? (es ? 'En vivo ahora' : 'Live now')
            : (
              <>
                <b>{d}</b> {es ? 'días' : 'days'} <i>·</i> <b>{h}</b> h <i>·</i> <b>{m}</b> min <span>{es ? 'para el Día 1' : 'to Day 1'}</span>
              </>
            )}
        </p>
      </div>
    </div>
  );
};

export default SgxHeroOverlay;
