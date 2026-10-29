/* One accent per sponsorship tier, shared by the tier matrix, the brand cards
   and the brand showcase dialog. */
const TIER_ACCENT: Record<string, string> = {
  tier_1: '#00DDFF',
  tier_2: '#FDCC0D',
  tier_3: '#FFBB00',
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
