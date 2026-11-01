import { useSyncExternalStore } from 'react';

/* Lite mode, one switch for the whole app. On: no background 3D, no WebGL
   portraits or 3D Highbots (the toon 2D bot instead), no ambient shaders,
   particles, blurs or looping decorations. It turns itself on for phones
   that ask to save data or have little memory, until the person chooses.
   <html data-lite> lets CSS follow; 'sgx:lite' tells components that
   checked it once. */

const KEY = 'sgx_lite_mode';
const EVENT = 'sgx:lite';

function autoLite(): boolean {
  try {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    return nav.connection?.saveData === true || (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2);
  } catch { return false; }
}

/** The person's choice if there is one; otherwise on for save-data and low-memory devices. */
export function isLite(): boolean {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'true') return true;
    if (v === 'false') return false;
  } catch { /* private mode */ }
  return autoLite();
}

/** Remember the choice and tell the page. */
export function setLite(on: boolean) {
  try { localStorage.setItem(KEY, String(on)); } catch { /* private mode */ }
  applyLite(on);
}

/** Reflect the state on <html> and notify listeners (no storage write). */
export function applyLite(on: boolean) {
  if (typeof document !== 'undefined') document.documentElement.toggleAttribute('data-lite', on);
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(EVENT, { detail: { on } }));
}

export function useLite(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener(EVENT, cb);
      window.addEventListener('storage', cb);
      return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
    },
    isLite,
    () => false,
  );
}
