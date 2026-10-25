// Safe wrapper for Anime.js motion pipeline and hardware tweening
import * as animePkg from 'animejs';

export function runAnime(options: any) {
  try {
    if (!options || !options.targets) return;
    const fn = (animePkg as any).default || (animePkg as any).animate || animePkg;
    if (typeof fn === 'function') {
      return fn(options);
    }
  } catch (e) {
    // Suppress internal anime tween notices gracefully
  }
}
