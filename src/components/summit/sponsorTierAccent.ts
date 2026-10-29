/* One accent per sponsorship tier, shared by the sponsors page, the brand
   cards and the brand showcase dialog: a ladder from cyan to cream. */
const TIER_ACCENT: Record<string, string> = {
  tier_1: '#00DDFF',
  tier_2: '#7FB2E5',
  tier_3: '#F29A1D',
  tier_4: '#FDCC0D',
  tier_5: '#FFF9E2',
  media_partner: '#00DDFF',
};

export function sponsorTierAccent(tierId?: string): string {
  return (tierId && TIER_ACCENT[tierId]) || '#FDCC0D';
}

/** A real banner image (not the flat placeholder the seed data ships with). */
export function isRealBanner(url?: string): boolean {
  return !!url && /^https:\/\//.test(url);
}
