import { reportError } from './errorMonitor';

/* Service worker registration (production builds only).

   First load comes first: the worker is registered after `load`, and the
   offline copy of the app's chunks (so the pass and any section open without
   signal at Chroma) is only asked for once the page is idle and the splash and
   the 3D core have had the network to themselves. On "Ahorro de datos" or a 2G
   link it is skipped (pages still cache as they are visited).

   The page never reloads because of the worker: a new worker waits until every
   window of the app is closed (see public/sw.js), and nothing here listens to
   `controllerchange`. */

const PRECACHE_DELAY_MS = 8000;

function slowOrSaving(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || /(^|-)2g$/.test(c.effectiveType || ''));
}

function whenIdle(fn: () => void) {
  const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
  window.setTimeout(() => (ric ? ric(fn, { timeout: 10000 }) : fn()), PRECACHE_DELAY_MS);
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const start = () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => reportError('manual', err));
    if (slowOrSaving()) return;
    whenIdle(() => {
      navigator.serviceWorker.ready
        .then((reg) => reg.active?.postMessage({ type: 'SGX_PRECACHE' }))
        .catch(() => { /* no worker: nothing to warm */ });
    });
  };
  if (document.readyState === 'complete') start();
  else window.addEventListener('load', start, { once: true });
}
