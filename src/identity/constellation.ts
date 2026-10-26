import type { PillarKey } from '../lib/sgxPillars';
import type { PassContact, SgxIdentity } from './sgxIdentity';

/* Networking constellation: every Rolodex contact is a star in the sector
   of its pillar; your own pillar counts as the first link. */

export const CONSTELLATION_ORDER: PillarKey[] = ['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'];

export function constellationPillars(id: SgxIdentity): PillarKey[] {
  const set = new Set<PillarKey>();
  if (id.affinity) set.add(id.affinity);
  id.contacts.forEach((c) => { if (c.pillar) set.add(c.pillar); });
  return CONSTELLATION_ORDER.filter((p) => set.has(p));
}

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

export interface Star {
  contact: PassContact;
  x: number;
  y: number;
  sector: number; // -1 = no pillar (outer ring)
}

/** Stable star positions in a 0..1000 square, me at the center. */
export function layoutStars(contacts: PassContact[]): Star[] {
  const perSector = new Map<number, number>();
  return contacts.map((c) => {
    const sector = c.pillar ? CONSTELLATION_ORDER.indexOf(c.pillar) : -1;
    const n = perSector.get(sector) || 0;
    perSector.set(sector, n + 1);
    const jitter = hash(c.code);
    const angle = sector >= 0
      ? ((sector + 0.18 + 0.64 * jitter) / 6) * Math.PI * 2 - Math.PI / 2
      : jitter * Math.PI * 2;
    const radius = sector >= 0 ? 150 + ((n * 61) % 200) + jitter * 30 : 380 + jitter * 20;
    return { contact: c, sector, x: 500 + Math.cos(angle) * radius, y: 500 + Math.sin(angle) * radius };
  });
}
