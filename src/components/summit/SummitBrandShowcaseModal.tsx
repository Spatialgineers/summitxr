import React, { useState } from 'react';
import { swapOnce, LOCAL_SUMMIT_ICON } from '../../lib/imgFallback';
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
  // seed data uses Spatialgineers brand art as a stand-in banner: only a brand's own image goes behind the hero
  const banner = isRealBanner(sponsor.bannerUrl) && !/cdn\.spatialgineers\.com\/Branding\//i.test(sponsor.bannerUrl || '') ? sponsor.bannerUrl : '';
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
      title={es ? 'Showcase de marca' : 'Brand showcase'}
      kicker={es ? 'Partner del Spatialgineers Summit 2026' : 'Spatialgineers Summit 2026 partner'}
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
        {/* Hero: the logo on a holo plinth, the brand's own banner faint behind it */}
        <header className={`sgx-brand__hero ${banner ? 'has-banner' : ''}`} style={banner ? { ['--hero-img' as string]: `url("${banner}")` } : undefined}>
          <span className="sgx-brand__corner is-tl" aria-hidden="true" />
          <span className="sgx-brand__corner is-br" aria-hidden="true" />
          <div className="sgx-brand__plinth">
            <img src={sponsor.logoUrl || FALLBACK_LOGO} alt="" onError={(e) => { swapOnce(e, LOCAL_SUMMIT_ICON); }} />
          </div>
          <div className="sgx-brand__id">
            <span className="sgx-brand__tier">{tierName}</span>
            <h3 className="sgx-brand__name">{name}</h3>
            {loc(sponsor, 'tagline', language) && <p className="sgx-brand__tagline">{loc(sponsor, 'tagline', language)}</p>}
            <span className="sgx-brand__ok"><ShieldCheck aria-hidden />{es ? 'Aliado confirmado' : 'Confirmed partner'}</span>
          </div>
        </header>

        {(location || website || email) && (
          <dl className="sgx-brand__stats">
            {location && <div><dt><MapPin aria-hidden />{es ? 'Dónde' : 'Where'}</dt><dd>{location}</dd></div>}
            {website && <div><dt><Globe aria-hidden />{es ? 'Sitio web' : 'Website'}</dt><dd><a href={website} target="_blank" rel="noopener noreferrer">{website.replace(/^https?:\/\//, '').replace(/\/$/, '')}</a></dd></div>}
            {email && <div><dt><Mail aria-hidden />{es ? 'Contacto' : 'Contact'}</dt><dd><a href={`mailto:${email}`}>{email}</a></dd></div>}
          </dl>
        )}

        {loc(sponsor, 'description', language) && (
          <section className="sgx-brand__about">
            <p className="sgx-brand__k">{es ? 'Sobre la marca' : 'About the brand'}</p>
            <p className="sgx-brand__text">{loc(sponsor, 'description', language)}</p>
          </section>
        )}

        {highlights.length > 0 && (
          <section>
            <p className="sgx-brand__k">{es ? 'En el Summit 2026' : 'At Summit 2026'}</p>
            <ol className="sgx-brand__rows">
              {highlights.map((item, idx) => (
                <li key={idx}><span>{String(idx + 1).padStart(2, '0')}</span><b>{item}</b></li>
              ))}
            </ol>
          </section>
        )}

        {(offer || sponsor.specialOfferCode) && (
          <section className="sgx-brand__coupon">
            <p className="sgx-brand__k"><Tag aria-hidden />{es ? 'Para quienes asisten' : 'For attendees'}</p>
            {offer && <p className="sgx-brand__text">{offer}</p>}
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
          <div className="sgx-brand__presence">
            <span>{es ? 'Vive en' : 'Lives in'}</span>
            {presence.map((p) => <em key={p}>{p}</em>)}
          </div>
        )}
      </div>
    </SgxDialog>
  );
};
