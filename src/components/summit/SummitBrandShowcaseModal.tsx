import React, { useState } from 'react';
import { ExternalLink, MapPin, Globe, Mail, Tag, Copy, Check, Share2, ShieldCheck } from 'lucide-react';
import { ApprovedSponsor } from '../../types/summit';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { copyUnifiedLinkToClipboard } from '../../lib/summitUrlSync';
import { SgxDialog } from '../common/SgxDialog';
import { sponsorTierAccent, isRealBanner } from './sponsorTierAccent';
import './sgx-kit.css';
import './SummitBrandShowcase.css';

interface SummitBrandShowcaseModalProps {
  sponsor: ApprovedSponsor | null;
  onClose: () => void;
}

const FALLBACK_LOGO = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';

export const SummitBrandShowcaseModal: React.FC<SummitBrandShowcaseModalProps> = ({ sponsor, onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!sponsor) return null;

  const accent = sponsorTierAccent(sponsor.tierId);
  const name = loc(sponsor, 'companyName', language);
  const tierName = loc(sponsor, 'tierName', language);
  const location = loc(sponsor, 'boothLocation', language);
  const highlights = loc(sponsor, 'highlights', language) || [];
  const offer = loc(sponsor, 'specialOfferText', language);
  const website = sponsor.websiteUrl?.trim();
  const email = sponsor.contactEmail?.trim();
  const presence = [
    sponsor.activeInVisualizer && (es ? 'Visualizador 3D' : '3D visualizer'),
    sponsor.activeInMiniGame && (es ? 'Minijuego del dron' : 'Drone mini-game'),
    sponsor.activeInAppTicker && (es ? 'Ticker de la webapp' : 'Web app ticker'),
  ].filter(Boolean) as string[];

  const handleCopyCode = () => {
    if (!sponsor.specialOfferCode) return;
    navigator.clipboard?.writeText(sponsor.specialOfferCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2200);
  };

  const handleShare = async () => {
    if (await copyUnifiedLinkToClipboard({ section: 'SPONSORS_HUB' })) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  return (
    <SgxDialog
      onClose={onClose}
      size="md"
      accent={accent}
      className="sgx-brand sgx-dialog--fit"
      title={name}
      kicker={loc(sponsor, 'tagline', language)}
      icon={
        <span className="sgx-avatar sgx-avatar--contain" style={{ ['--avatar-accent' as string]: accent }}>
          <img src={sponsor.logoUrl || FALLBACK_LOGO} alt="" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_LOGO; }} />
        </span>
      }
      footer={
        <>
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={handleShare}>
            {copiedLink ? <Check aria-hidden /> : <Share2 aria-hidden />}
            {copiedLink ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Compartir' : 'Share')}
          </button>
          {website && (
            <a className="sgx-btn sgx-btn--sm is-wrap" href={website} target="_blank" rel="noopener noreferrer">
              {loc(sponsor, 'ctaButtonText', language) || (es ? 'Visitar sitio web' : 'Visit website')}
              <ExternalLink aria-hidden />
            </a>
          )}
        </>
      }
    >
      <div className="sgx-brand__body" style={{ ['--brand-accent' as string]: accent }}>
        {isRealBanner(sponsor.bannerUrl) && (
          <div className="sgx-brand__banner"><img src={sponsor.bannerUrl} alt="" /></div>
        )}

        <div className="sgx-chip-row">
          <span className="sgx-chip" style={{ ['--chip' as string]: accent }}>{tierName}</span>
          <span className="sgx-chip sgx-chip--ghost"><ShieldCheck aria-hidden />{es ? 'Aliado confirmado' : 'Confirmed partner'}</span>
        </div>

        <section className="sgx-card sgx-card--stripe" style={{ ['--card-accent' as string]: accent }}>
          <p className="sgx-kicker">{es ? 'Sobre la marca' : 'About the brand'}</p>
          <p className="sgx-copy">{loc(sponsor, 'description', language)}</p>
        </section>

        {(location || website || email) && (
          <dl className="sgx-brand__facts">
            {location && (
              <div className="sgx-card sgx-card--sm">
                <MapPin aria-hidden />
                <dt>{es ? 'Dónde' : 'Where'}</dt>
                <dd>{location}</dd>
              </div>
            )}
            {website && (
              <div className="sgx-card sgx-card--sm">
                <Globe aria-hidden />
                <dt>{es ? 'Sitio web' : 'Website'}</dt>
                <dd><a href={website} target="_blank" rel="noopener noreferrer">{website.replace(/^https?:\/\//, '')}</a></dd>
              </div>
            )}
            {email && (
              <div className="sgx-card sgx-card--sm">
                <Mail aria-hidden />
                <dt>{es ? 'Contacto' : 'Contact'}</dt>
                <dd><a href={`mailto:${email}`}>{email}</a></dd>
              </div>
            )}
          </dl>
        )}

        {highlights.length > 0 && (
          <section>
            <p className="sgx-kicker">{es ? 'En el Summit 2026' : 'At Summit 2026'}</p>
            <ol className="sgx-brand__list">
              {highlights.map((item, idx) => (
                <li key={idx}><span>{String(idx + 1).padStart(2, '0')}</span>{item}</li>
              ))}
            </ol>
          </section>
        )}

        {(offer || sponsor.specialOfferCode) && (
          <section className="sgx-card sgx-brand__offer" style={{ ['--card-accent' as string]: accent }}>
            <p className="sgx-kicker"><Tag aria-hidden />{es ? 'Para quienes asisten' : 'For attendees'}</p>
            {offer && <p className="sgx-copy">{offer}</p>}
            {sponsor.specialOfferCode && (
              <div className="sgx-brand__code">
                <code>{sponsor.specialOfferCode}</code>
                <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleCopyCode}>
                  {copiedCode ? <Check aria-hidden /> : <Copy aria-hidden />}
                  {copiedCode ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar código' : 'Copy code')}
                </button>
              </div>
            )}
          </section>
        )}

        {presence.length > 0 && (
          <p className="sgx-fine">{es ? 'Presente en: ' : 'Featured in: '}{presence.join(' · ')}</p>
        )}
      </div>
    </SgxDialog>
  );
};
