import React from 'react';
import { SponsorshipTier } from '../../types/summit';
import { SPONSORSHIP_TIERS } from '../../lib/summitData';
import { SponsorsHero } from './sponsors/SponsorsHero';
import { SponsorPlacements } from './sponsors/SponsorPlacements';
import { SponsorTiers } from './sponsors/SponsorTiers';
import { SponsorProcess } from './sponsors/SponsorProcess';
import './sgx-kit.css';
import './SummitSponsors.css';

interface SummitSponsorshipMatrixProps {
  tiers?: SponsorshipTier[];
  onOpenInquiryModal?: (tierId?: string) => void;
  /** The confirmed-partners wall, rendered right after the hero. */
  partners?: React.ReactNode;
}

/* The sponsors page (SGX.Showcase 02.2): sells the Summit's digital real
   estate. Hero → partners → where your brand shows up → tiers → process,
   FAQ and closing CTA. Every CTA opens the inquiry dialog. */
export const SummitSponsorshipMatrix: React.FC<SummitSponsorshipMatrixProps> = ({
  tiers = SPONSORSHIP_TIERS,
  onOpenInquiryModal,
  partners,
}) => {
  const apply = (tierId?: string) => onOpenInquiryModal?.(tierId);

  return (
    <div className="spx">
      <SponsorsHero tierCount={tiers.length} onApply={() => apply()} />
      {partners}
      <SponsorPlacements />
      <SponsorTiers tiers={tiers} onApply={apply} />
      <SponsorProcess onApply={() => apply()} />
    </div>
  );
};
