import { PILLAR_BY_KEY, pillarInk, type PillarKey } from '../../../../lib/sgxPillars';

/* Tuning and content for "Rayo en tus manos". */

export type GlyphKind = 'pillar' | 'gear' | 'crystal' | 'glitch' | 'boss';

const ORDER: PillarKey[] = ['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'];

export const PILLARS = ORDER.map((key) => {
  const p = PILLAR_BY_KEY[key];
  return { key, slug: p.slug, name: p.name, color: p.color, glow: pillarInk(key) };
});

export const ROUND_SECONDS = 75;
/** the SGX boss shows up with this many seconds played */
export const BOSS_AT = 55;
export const BOSS_HP = 14;
/** charge (0..1) that turns a quick shot into a charged one */
export const CHARGE_MIN = 0.55;
/** seconds to charge fully */
export const CHARGE_TIME = 1.1;
export const SHOT_COST = { quick: 5, charged: 14 };
export const ENERGY_REGEN = 8;

export const POINTS = {
  pillar: 100,
  pillarInOrder: 100,
  sixPillars: 600,
  gear: 250,
  crystal: 150,
  glitch: 120,
  bossHit: 50,
  bossDown: 1500,
} as const;

/** XP for a run: modest, capped, only for real play. */
export function runXp(score: number, shots: number): number {
  if (shots < 3 || score <= 0) return 0;
  return Math.min(150, 40 + Math.floor(score / 120));
}
