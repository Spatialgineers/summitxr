import React, { useEffect, useRef, useState } from 'react';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import type { ApprovedSponsor } from '../types/summit';
import { navigateToSection } from './navigation';
import { isFallback, isOpenSlot, pickSplashSponsors } from './splashSponsors';
import { SgxBolt } from './SgxSymbols';

/* "Presented by": when a Creador earns XP, a sponsor rides along with it for
   a few seconds, in the toast style. At most once every 5 minutes; the
   sponsors take turns in a shuffled order (open "your brand here" slots
   included, on purpose). Tapping it keeps it open, with a link to the brand. */

const EVERY_MS = 5 * 60 * 1000;
const SHOW_MS = 4500;
const LAST_KEY = 'sgx_sponsor_pop_at';
const ORDER_KEY = 'sgx_sponsor_pop_order';

const read = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* private mode */ } };

/** The next sponsor in a shuffled rotation that survives page changes. */
function nextSponsor(): ApprovedSponsor | null {
  const all = pickSplashSponsors(12);
  if (!all.length) return null;
  let order: string[] = [];
  try { order = JSON.parse(read(ORDER_KEY) || '[]'); } catch { order = []; }
  order = order.filter((id) => all.some((s) => s.id === id));
  if (!order.length) order = all.map((s) => s.id).sort(() => Math.random() - 0.5);
  const id = order.shift()!;
  write(ORDER_KEY, JSON.stringify(order));
  return all.find((s) => s.id === id) || null;
}

export const SponsorXpPop: React.FC = () => {
  const { profile } = usePilotProfile();
  const { language } = useLanguage();
  const es = language !== 'en';
  const [pop, setPop] = useState<{ sponsor: ApprovedSponsor; xp: number; key: number } | null>(null);
  const [pinned, setPinned] = useState(false);
  const lastXp = useRef<number | null>(null);
  // the saved profile hydrates a moment after mount: that jump is not an XP gain
  const readyAt = useRef(Date.now() + 3000);
  const timer = useRef(0);

  useEffect(() => {
    const xp = profile.totalXp;
    const gained = lastXp.current !== null ? xp - lastXp.current : 0;
    lastXp.current = xp;
    if (gained <= 0 || Date.now() < readyAt.current) return;
    if (Date.now() - Number(read(LAST_KEY) || 0) < EVERY_MS) return;
    const sponsor = nextSponsor();
    if (!sponsor) return;
    write(LAST_KEY, String(Date.now()));
    // after the XP float, and never over a dialog (the Forge, the Reactor…): it waits until it is clear
    let tries = 0;
    const show = () => {
      if (document.querySelector('[aria-modal="true"], .sgx-forge') && tries++ < 60) { window.setTimeout(show, 500); return; }
      setPinned(false);
      setPop({ sponsor, xp: gained, key: Date.now() });
    };
    window.setTimeout(show, 900);
  }, [profile.totalXp]);

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (!pop || pinned) return;
    timer.current = window.setTimeout(() => setPop(null), SHOW_MS);
    return () => window.clearTimeout(timer.current);
  }, [pop, pinned]);

  if (!pop) return null;
  const sp = pop.sponsor;
  const open = isOpenSlot(sp);
  const name = (es ? sp.companyName : sp.companyNameEn || sp.companyName) || '';
  const line = (es ? sp.tagline : sp.taglineEn || sp.tagline) || '';
  const showLogo = !!sp.logoUrl && !isFallback(sp);

  const go = () => {
    playUiChirp(760);
    setPop(null);
    if (open) navigateToSection('SPONSOR');
    else window.dispatchEvent(new CustomEvent('sgx:open_brand_showcase', { detail: { sponsor: sp } }));
  };

  return (
    <div className={`sgx-sponsorpop ${pinned ? 'is-pinned' : ''}`} key={pop.key} role="status" aria-live="polite">
      <button
        type="button"
        className="sgx-sponsorpop__card"
        onClick={() => { if (!pinned) { playUiChirp(620); setPinned(true); } else go(); }}
        aria-label={pinned ? (es ? `Ver ${name}` : `Open ${name}`) : (es ? `Presentado por ${name}. Toca para fijarlo` : `Presented by ${name}. Tap to keep it`)}
      >
        <span className="sgx-sponsorpop__tag"><SgxBolt size={11} />+{pop.xp} XP · {es ? 'presentado por' : 'presented by'}</span>
        <span className="sgx-sponsorpop__brand">
          {showLogo
            ? <img src={sp.logoUrl} alt="" />
            : <span className="sgx-sponsorpop__mono" aria-hidden="true">{open ? '+' : name.slice(0, 1)}</span>}
          <span className="sgx-sponsorpop__text">
            <strong>{open ? (es ? 'Tu marca aquí' : 'Your brand here') : name}</strong>
            <small>{open ? (es ? 'Patrocina el Summit y aparece cada vez que alguien gana XP.' : 'Sponsor the Summit and show up every time someone earns XP.') : line}</small>
          </span>
        </span>
        {pinned && <span className="sgx-sponsorpop__cta">{open ? (es ? 'Ver paquetes →' : 'See packages →') : (es ? 'Ver la marca →' : 'See the brand →')}</span>}
        {!pinned && <span className="sgx-sponsorpop__timer" aria-hidden="true" style={{ animationDuration: `${SHOW_MS}ms` }} />}
      </button>
      {pinned && <button type="button" className="sgx-sponsorpop__x" onClick={() => setPop(null)} aria-label={es ? 'Cerrar' : 'Close'}>×</button>}
    </div>
  );
};

export default SponsorXpPop;
