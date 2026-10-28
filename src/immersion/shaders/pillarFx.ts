import type { PillarKey } from '../../lib/sgxPillars';
import { findPillar } from '../../lib/sgxPillars';
import { hexToVec3 } from './glslLib';

/* The two colors every shader effect uses for a pillar: A is the pillar's own
   color, lifted where the official one is too dark to glow on #050505 (Story,
   Spark, System); B is its brand accent. Same pairs as the visual concept. */

const PAIRS: Record<PillarKey, [string, string]> = {
  STORY: ['#5C87C7', '#00DDFF'],
  SHOWCASE: ['#00DDFF', '#FDCC0D'],
  SPARK: ['#E08A1F', '#FDCC0D'],
  STAGE: ['#FDCC0D', '#00DDFF'],
  SYSTEM: ['#99A3AD', '#00DDFF'],
  SYNTHESIZE: ['#FFFFFF', '#FDCC0D'],
};

export type Vec3 = [number, number, number];

export function fxPair(key: PillarKey | string | null | undefined): [Vec3, Vec3] {
  const k = (findPillar(key || '')?.key || 'STAGE') as PillarKey;
  const [a, b] = PAIRS[k];
  return [hexToVec3(a), hexToVec3(b)];
}

/* The pillar the visitor last docked or visited tints the global effects
   (sparks, holo glass). Kept for the session only. */
const KEY = 'sgx_fx_pillar_v1';
let current: PillarKey = (() => {
  try { return (findPillar(sessionStorage.getItem(KEY))?.key || 'STAGE') as PillarKey; } catch { return 'STAGE'; }
})();

export function setFxPillar(raw: string | null | undefined): void {
  const p = findPillar(raw || '');
  if (!p || p.key === current) return;
  current = p.key;
  try { sessionStorage.setItem(KEY, current); } catch { /* ignore */ }
}

export function getFxPillar(): PillarKey {
  return current;
}

if (typeof window !== 'undefined') {
  window.addEventListener('sgx:pillar_docked', (e) => setFxPillar((e as CustomEvent<{ pillarId?: string }>).detail?.pillarId));
}
