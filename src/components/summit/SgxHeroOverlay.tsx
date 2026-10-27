import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { explore, useCalm } from '../../immersion/calmMode';

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

  return (
    <div className={`sgx-corehero ${calm ? '' : 'is-gone'}`} aria-hidden={!calm}>
      <div className="sgx-corehero__scrim" aria-hidden="true" />
      <div className="sgx-corehero__copy">
        <p className="sgx-corehero__badge sgx-corehero__in" style={{ ['--i' as string]: 0 }}>
          <span className="sgx-corehero__dot" aria-hidden="true" />
          {es ? 'Regresa el Spatialgineers Summit · segunda edición' : 'The Spatialgineers Summit returns · second edition'}
        </p>
        <h1 className="sgx-corehero__title sgx-corehero__in" style={{ ['--i' as string]: 1 }}>
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
