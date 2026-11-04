import { useSyncExternalStore } from 'react';

/* Whether the boot splash is covering the screen. The 3D core waits for it to
   end before it mounts (its first setup is the heaviest work of the page, and
   on a phone it would freeze the splash), and if it is already mounted (the
   "Ver intro" replay) it stops drawing meanwhile (body[data-sgx-splash]). */

let active = false;
const listeners = new Set<() => void>();

export function setSplashActive(on: boolean) {
  if (active === on) return;
  active = on;
  try {
    if (on) document.body.dataset.sgxSplash = '1';
    else delete document.body.dataset.sgxSplash;
  } catch { /* no DOM */ }
  listeners.forEach((l) => l());
}

export const isSplashActive = () => active;

export function useSplashActive(): boolean {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb); }; },
    () => active,
    () => false,
  );
}
