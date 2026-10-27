import { useEffect, useState } from 'react';

/* CALM, THEN EXPLORE. A first look at the Summit shows one thing: the 3D
   core with the hero message. The HUD (clocks, missions, docks, hints)
   arrives the moment the visitor touches, drags, scrolls or presses a key,
   or taps "Explorar el núcleo". Once per session. */

const KEY = 'sgx_explored_v1';
const EVENT = 'sgx:explore';
const CLASS = 'sgx-calm';

function explored(): boolean {
  try { return sessionStorage.getItem(KEY) === '1'; } catch { return true; }
}

export function isCalm(): boolean {
  return typeof document !== 'undefined' && document.documentElement.classList.contains(CLASS);
}

export function explore() {
  if (!isCalm()) return;
  try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  document.documentElement.classList.remove(CLASS);
  window.dispatchEvent(new Event(EVENT));
}

/** Call once on the landing: enters calm mode unless this session already explored. */
export function startCalm(): () => void {
  if (explored() || new URLSearchParams(window.location.search).get('embed') === 'true') return () => undefined;
  document.documentElement.classList.add(CLASS);
  window.dispatchEvent(new Event(EVENT));
  const onKey = (e: KeyboardEvent) => { if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'Tab' && e.key !== 'Shift') explore(); };
  const onWheel = () => explore();
  // Any touch or click anywhere (the core, the nav, a link) counts; the hero's
  // own "Forjar mi pase" too, so the HUD is there when the Forge closes.
  const onPointer = () => explore();
  window.addEventListener('keydown', onKey);
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('pointerdown', onPointer, { passive: true });
  return () => {
    window.removeEventListener('keydown', onKey);
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('pointerdown', onPointer);
    document.documentElement.classList.remove(CLASS);
    window.dispatchEvent(new Event(EVENT));
  };
}

export function useCalm(): boolean {
  const [calm, setCalm] = useState(isCalm);
  useEffect(() => {
    const sync = () => setCalm(isCalm());
    window.addEventListener(EVENT, sync);
    sync();
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  return calm;
}
