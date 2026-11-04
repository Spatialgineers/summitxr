/* In-page anchors that live inside lazy sections (/sponsors#terminos,
   /bienvenida/speaker#guia): wait until the block is on the page, then
   scroll to it (smoothly unless the visitor prefers reduced motion). */

import type { SummitSectionKey } from '../components/summit/sectionKeys';

/** Scrolls to `id` once it exists (polls up to `timeoutMs`). Returns a cancel function. */
export function scrollToAnchorWhenReady(id: string, { delayMs = 450, timeoutMs = 5000 } = {}): () => void {
  let done = false;
  const started = Date.now();
  let timer: number | undefined;
  const tick = () => {
    if (done) return;
    const el = document.getElementById(id);
    if (el) {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
      if (el.tabIndex >= 0 || el.hasAttribute('tabindex')) el.focus({ preventScroll: true });
      done = true;
      return;
    }
    if (Date.now() - started < timeoutMs) timer = window.setTimeout(tick, 150);
  };
  timer = window.setTimeout(tick, delayMs);
  return () => { done = true; if (timer) window.clearTimeout(timer); };
}

/** True when the address bar points at this anchor (#terminos). */
export const hashIs = (id: string) => typeof window !== 'undefined' && window.location.hash.replace('#', '').toLowerCase() === id;

/** Goes to a Summit section and lands on one of its anchors, keeping #anchor in the address bar. */
export function goToSectionAnchor(section: SummitSectionKey, anchor: string) {
  window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section } }));
  // the section switch rewrites the URL; put the anchor back once it has
  window.setTimeout(() => {
    const { pathname, search } = window.location;
    window.history.replaceState(window.history.state, '', `${pathname}${search}#${anchor}`);
  }, 250);
  scrollToAnchorWhenReady(anchor, { delayMs: 500 });
}
