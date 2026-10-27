// Safe wrapper for Anime.js (v4 API: animate(targets, params)).
// Callers keep the v3-style options object: { targets, duration, easing, update, ...props }.
import { animate } from 'animejs';

/** v3 easing names ("easeOutExpo", "easeOutElastic(1, .7)") → v4 ("outExpo", "outElastic(1, .7)"). */
function toV4Ease(easing: unknown): string | undefined {
  if (typeof easing !== 'string') return undefined;
  return easing.replace(/^easeInOut/, 'inOut').replace(/^easeIn/, 'in').replace(/^easeOut/, 'out');
}

export function runAnime(options: any) {
  try {
    if (!options || !options.targets) return;
    const { targets, easing, update, complete, ...params } = options;
    return animate(targets, {
      ...params,
      ...(easing ? { ease: toV4Ease(easing) } : {}),
      ...(typeof update === 'function' ? { onUpdate: update } : {}),
      ...(typeof complete === 'function' ? { onComplete: complete } : {}),
    });
  } catch {
    // An animation must never break the stage.
    return undefined;
  }
}
