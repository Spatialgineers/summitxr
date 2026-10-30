/* Seeded randomness for the drone course. "Ruta del día" seeds from the
   Puerto Rico date (UTC−4, no DST), so everyone flies the same course that day. */

export type Rng = () => number;

/** mulberry32: tiny, fast and good enough for level layouts. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** YYYY-MM-DD in Puerto Rico. */
export function dayKey(now = Date.now()): string {
  return new Date(now - 4 * 3600 * 1000).toISOString().slice(0, 10);
}

export const dailySeed = (day = dayKey()) => hashString(`sgx-drone-${day}`);

export const randomSeed = () => (Math.random() * 4294967296) >>> 0;

/** Range helper. */
export const between = (rng: Rng, min: number, max: number) => min + rng() * (max - min);
