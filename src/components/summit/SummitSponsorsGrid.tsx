import React from 'react';
import { ArrowRight, Plus } from 'lucide-react';
import { ApprovedSponsor } from '../../types/summit';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { sponsorTierAccent } from './sponsorTierAccent';
import './sgx-kit.css';
import './SummitSponsors.css';

interface SummitSponsorsGridProps {
  sponsors: ApprovedSponsor[];
  onOpen: (sponsor: ApprovedSponsor) => void;
  onApply?: () => void;
}

/* Confirmed sponsors and partners as a logo wall; each tile opens the brand
   showcase dialog. The last tile is the open slot. */
export const SummitSponsorsGrid: React.FC<SummitSponsorsGridProps> = ({ sponsors, onOpen, onApply }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  return (
    <section className="spx-section" aria-labelledby="spx-partners-title">
      <div className="spx-head">
        <p className="spx-kicker">{es ? 'Ya están dentro' : 'Already on board'} · {sponsors.length}</p>
        <h2 id="spx-partners-title" className="spx-h2">{es ? 'Partners confirmados' : 'Confirmed partners'}</h2>
        <p className="spx-lead">
          {es
            ? 'Solo aparecen las marcas confirmadas por escrito. Toca una para ver su ficha.'
            : 'Only brands confirmed in writing are listed. Tap one to see its profile.'}
        </p>
      </div>
      <ul className="spx-wall">
        {sponsors.map((sp) => {
          const accent = sponsorTierAccent(sp.tierId);
          const tier = loc(sp, 'tierName', language).split('(')[0].trim();
          const name = loc(sp, 'companyName', language);
          return (
            <li key={sp.id}>
              <button
                type="button"
                data-brand-card
                className="spx-wall__tile"
                style={{ ['--tier' as string]: accent }}
                onClick={() => onOpen(sp)}
                aria-label={es ? `Ver ficha de ${name}` : `View ${name} profile`}
              >
                <span className="spx-wall__logo">
                  <img src={sp.logoUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/brand/sgx-bolt.svg'; }} />
                </span>
                <span className="spx-wall__info">
                  <strong>{name}</strong>
                  {tier && <span className="spx-wall__tier">{tier}</span>}
                  <small>{loc(sp, 'tagline', language)}</small>
                </span>
                <span className="spx-wall__go" aria-hidden="true">{es ? 'Ver ficha' : 'View profile'}<ArrowRight /></span>
              </button>
            </li>
          );
        })}
        {onApply && (
          <li>
            <button type="button" className="spx-wall__tile spx-wall__tile--open" onClick={onApply}>
              <span className="spx-wall__logo"><Plus aria-hidden /></span>
              <span className="spx-wall__info">
                <strong>{es ? 'Tu marca aquí' : 'Your brand here'}</strong>
                <small>{es ? 'Cada nivel tiene cupos limitados.' : 'Every tier has limited slots.'}</small>
              </span>
              <span className="spx-wall__go">{es ? 'Solicitar auspicio' : 'Request sponsorship'}<ArrowRight aria-hidden /></span>
            </button>
          </li>
        )}
      </ul>
    </section>
  );
};
