import type { ApprovedSponsor } from '../types/summit';
import { loadAllApprovedSponsors, SPONSORSHIP_TIERS } from '../lib/summitData';

/* The splash's sponsor row: Tier 3+ partners (approved in the CMS) first,
   then the confirmed venue and media partner, then open "your brand here"
   slots for Tier 3 and Tier 4. Four at a time, shuffled per visit. */

// Official Confirmed Partners & Sponsor Induction Slots (Strictly Canon)
export const TIER_3_PLUS_FALLBACKS: ApprovedSponsor[] = [
  {
    id: 'sp_splash_chroma',
    companyName: 'Chroma Space Studios',
    brandSlug: 'chroma-space-studios',
    tierId: 'tier_5',
    tierName: 'Tier 5 · Venue del Día 3',
    tierNameEn: 'Tier 5 · Day 3 Venue',
    tagline: 'Venue del Día 3 (SGX Showcase) • San Juan, Puerto Rico',
    taglineEn: 'Day 3 venue (SGX Showcase) • San Juan, Puerto Rico',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: '',
    description: 'Estudio de producción en San Juan, venue del Día 3.',
    descriptionEn: 'Production studio in San Juan, the Day 3 venue.',
    highlights: ['Venue del Día 3', 'Estudio de producción en San Juan'],
    highlightsEn: ['Day 3 venue', 'Production studio in San Juan'],
    ctaButtonText: 'CONOCE MÁS',
    ctaButtonTextEn: 'LEARN MORE',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_los_mismos',
    companyName: 'Los Mismos TV',
    brandSlug: 'los-mismos-tv',
    tierId: 'media_partner',
    tierName: 'Transmite junto a nosotros',
    tierNameEn: 'Streams alongside us',
    tagline: 'Transmite el Summit desde su canal, junto al de Spatialgineers',
    taglineEn: 'Streams the Summit from its channel, alongside the Spatialgineers channel',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: '',
    description: 'Los Mismos TV transmite junto a nosotros desde su canal.',
    descriptionEn: 'Los Mismos TV streams alongside us from its channel.',
    highlights: ['Transmite junto a nosotros', 'YouTube Live'],
    highlightsEn: ['Streams alongside us', 'YouTube Live'],
    ctaButtonText: 'CONOCE MÁS',
    ctaButtonTextEn: 'LEARN MORE',
    activeInVisualizer: true,
    activeInMiniGame: false,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_induction_1',
    companyName: 'Tu Marca Aquí (Tier 3)',
    companyNameEn: 'Your Brand Here (Tier 3)',
    brandSlug: 'tu-marca-tier-3',
    tierId: 'tier_3',
    tierName: 'Experience (Tier 3)',
    tagline: 'Presencia destacada en streaming y escenario virtual',
    taglineEn: 'Featured presence on the stream and the virtual stage',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Espacio disponible para empresas y patrocinadores del Summit.',
    descriptionEn: 'Space available for Summit companies and sponsors.',
    highlights: ['Menciones en vivo', 'Presencia interactiva'],
    highlightsEn: ['Live mentions', 'Interactive presence'],
    ctaButtonText: 'POSTULAR MARCA',
    ctaButtonTextEn: 'APPLY YOUR BRAND',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_induction_2',
    companyName: 'Tu Marca Aquí (Tier 4)',
    companyNameEn: 'Your Brand Here (Tier 4)',
    brandSlug: 'tu-marca-tier-4',
    tierId: 'tier_4',
    tierName: 'Signature Experience (Tier 4)',
    tagline: 'Patrocinio titular de segmento y activación inmersiva',
    taglineEn: 'Title sponsorship of a segment and an immersive activation',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Espacio de patrocinio Signature Experience (3 cupos).',
    descriptionEn: 'Signature Experience sponsorship space (3 slots).',
    highlights: ['"Experience by [Marca]"', 'Licencia de 365 días desde noviembre'],
    highlightsEn: ['"Experience by [Brand]"', '365-day license starting in November'],
    ctaButtonText: 'POSTULAR MARCA',
    ctaButtonTextEn: 'APPLY YOUR BRAND',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  }
];

export function sponsorTierLevel(sp: ApprovedSponsor): number {
  if (sp.tierId === 'tier_5') return 5;
  if (sp.tierId === 'media_partner') return 3; // streams with us; shown with the partners, not a paid tier
  if (sp.tierId === 'tier_4') return 4;
  if (sp.tierId === 'tier_3') return 3;
  return SPONSORSHIP_TIERS.find((t) => t.id === sp.tierId)?.tierNumber || 1;
}

/** Fallback entries without a real logo or a paid slot show as text, never as a fake logo. */
export const isOpenSlot = (sp: ApprovedSponsor) => sp.id.startsWith('sp_splash_induction');
export const isFallback = (sp: ApprovedSponsor) => sp.id.startsWith('sp_splash_');

export function pickSplashSponsors(count = 4): ApprovedSponsor[] {
  const real = loadAllApprovedSponsors().filter((s) => sponsorTierLevel(s) >= 3);
  const combined = [...real];
  for (const fb of TIER_3_PLUS_FALLBACKS) {
    if (!combined.some((c) => c.companyName.toLowerCase() === fb.companyName.toLowerCase())) combined.push(fb);
  }
  // Paying partners always make the row; open slots fill what is left.
  const paid = combined.filter((s) => !isOpenSlot(s)).sort(() => Math.random() - 0.5);
  const open = combined.filter(isOpenSlot);
  return [...paid, ...open].slice(0, count);
}
