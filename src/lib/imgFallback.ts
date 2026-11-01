import type { SyntheticEvent } from 'react';

/** A broken image swaps to its fallback ONCE. Setting src again on every error
    loops forever when the fallback fails too (offline, CDN down): hundreds of
    requests a second. */
export function swapOnce(e: SyntheticEvent<HTMLImageElement>, url: string) {
  const img = e.currentTarget;
  if (img.dataset.fallback) return;
  img.dataset.fallback = '1';
  img.src = url;
}

/** The Summit icon shipped with the app (no network needed). */
export const LOCAL_SUMMIT_ICON = '/holo/summitIcon.png';
