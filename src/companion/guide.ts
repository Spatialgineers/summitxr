import { navigateToPage, navigateToPillar, navigateToSection } from '../immersion/navigation';
import { openStudioPage } from '../identity/studioNav';
import { getAppRouteAndSectionFromUrl, getPillarSlugFromUrl } from '../lib/summitUrlSync';
import { COMPANION_DESTINATIONS, destinationById } from './destinations';

/* How the Highbot walks a Creador through the app: it opens pages (the same
   navigation the menu uses) and points at things. Any element can be pointed
   at by giving it data-guide="id" (and data-guide-label when its text is not
   a good name); the companion only sees the ones on screen right now. */

export function goTo(id: string): boolean {
  const d = destinationById(id);
  if (!d) return false;
  if (d.kind === 'section') {
    if (d.section === 'CREDENTIAL_GENERATOR') openStudioPage('pass');
    else navigateToSection(d.section);
  } else if (d.kind === 'pillar') navigateToPillar(d.pillar);
  else if (d.kind === 'page') navigateToPage(d.page);
  else openStudioPage(d.tab);
  return true;
}

/** Where the Creador is, in words the companion knows. */
export function currentPlace(): { path: string; page: string } {
  const { page, summitSection } = getAppRouteAndSectionFromUrl();
  const path = window.location.pathname + window.location.search;
  let dest;
  if (page !== 'summit') dest = COMPANION_DESTINATIONS.find((d) => d.kind === 'page' && d.page === page);
  else if (summitSection === 'PILLAR') dest = COMPANION_DESTINATIONS.find((d) => d.kind === 'pillar' && d.pillar === getPillarSlugFromUrl());
  else dest = COMPANION_DESTINATIONS.find((d) => d.kind === 'section' && d.section === (summitSection || 'OVERVIEW'));
  return { path, page: dest ? dest.label : (summitSection || page) };
}

const visible = (el: Element) => {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const s = getComputedStyle(el);
  return s.visibility !== 'hidden' && s.display !== 'none' && Number(s.opacity) > 0.05;
};

/** The pointable elements on screen now (ids and names), at most 30. */
export function guideTargets(): { id: string; label: string }[] {
  const out: { id: string; label: string }[] = [];
  const seen = new Set<string>();
  document.querySelectorAll<HTMLElement>('[data-guide]').forEach((el) => {
    if (out.length >= 30) return;
    const id = (el.dataset.guide || '').trim().toLowerCase();
    if (!/^[a-z0-9-]{1,40}$/.test(id) || seen.has(id) || el.closest('.sgx-companion') || !visible(el)) return;
    const label = (el.dataset.guideLabel || el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!label) return;
    seen.add(id);
    out.push({ id, label });
  });
  return out;
}

let clearSpot: (() => void) | null = null;

/** Scrolls to the element and rings it for a few seconds. */
export function pointAt(id: string, label = 'Aquí'): boolean {
  const el = Array.from(document.querySelectorAll<HTMLElement>('[data-guide]')).find((x) => x.dataset.guide === id && visible(x));
  if (!el) return false;
  clearSpot?.();
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  el.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' });
  const ring = document.createElement('div');
  ring.className = 'sgx-guide-spot';
  ring.setAttribute('aria-hidden', 'true');
  const tag = document.createElement('span');
  tag.className = 'sgx-guide-spot__tag';
  tag.textContent = label;
  ring.appendChild(tag);
  document.body.appendChild(ring);
  let raf = 0;
  const place = () => {
    const r = el.getBoundingClientRect();
    ring.style.transform = `translate(${Math.round(r.left - 6)}px, ${Math.round(r.top - 6)}px)`;
    ring.style.width = `${Math.round(r.width + 12)}px`;
    ring.style.height = `${Math.round(r.height + 12)}px`;
    // near the top of the screen the tag goes under the element
    ring.classList.toggle('is-below', r.top < 44);
    raf = requestAnimationFrame(place);
  };
  place();
  const stop = () => { cancelAnimationFrame(raf); ring.remove(); el.removeEventListener('click', stop); if (clearSpot === stop) clearSpot = null; window.clearTimeout(timer); };
  const timer = window.setTimeout(stop, 4500);
  el.addEventListener('click', stop);
  clearSpot = stop;
  return true;
}
