import React from 'react';
import { ArrowRight } from 'lucide-react';
import { ApprovedSponsor } from '../../types/summit';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { sponsorTierAccent } from './sponsorTierAccent';
import './sgx-kit.css';
import './SummitSponsors.css';

interface SummitSponsorsGridProps {
  sponsors: ApprovedSponsor[];
  onOpen: (sponsor: ApprovedSponsor) => void;
}

/* Approved sponsors and partners: one card each, opens the brand showcase dialog. */
export const SummitSponsorsGrid: React.FC<SummitSponsorsGridProps> = ({ sponsors, onOpen }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  return (
    <section className="sgx-card sgx-brands" aria-labelledby="sgx-brands-title">
      <header className="sgx-brands__head">
        <h3 id="sgx-brands-title" className="sgx-h">{es ? 'Patrocinadores y aliados' : 'Sponsors and partners'} <span>({sponsors.length})</span></h3>
        <p className="sgx-copy">
          {es
            ? 'Solo aparecen las marcas confirmadas por escrito. Toca una para ver su ficha y su participación en el Summit.'
            : 'Only brands confirmed in writing are listed. Tap one to see its profile and its part in the Summit.'}
        </p>
      </header>
      {sponsors.length === 0 ? (
        <p className="sgx-fine">{es ? 'Todavía no hay marcas confirmadas.' : 'No confirmed brands yet.'}</p>
      ) : (
        <ul className="sgx-brands__grid">
          {sponsors.map((sp) => {
            const accent = sponsorTierAccent(sp.tierId);
            const tier = loc(sp, 'tierName', language).split('(')[0].trim();
            return (
              <li key={sp.id}>
                <button
                  type="button"
                  data-brand-card
                  className="sgx-card sgx-card--stripe sgx-brands__card"
                  style={{ ['--card-accent' as string]: accent }}
                  onClick={() => onOpen(sp)}
                >
                  <span className="sgx-avatar sgx-avatar--contain" style={{ ['--avatar-accent' as string]: accent }}>
                    <img src={sp.logoUrl} alt="" onError={(e) => { (e.target as HTMLImageElement).src = '/brand/sgx-bolt.svg'; }} />
                  </span>
                  <span className="sgx-brands__info">
                    <strong>{loc(sp, 'companyName', language)}</strong>
                    {tier && <span className="sgx-chip" style={{ ['--chip' as string]: accent }}>{tier}</span>}
                    <small>{loc(sp, 'tagline', language)}</small>
                  </span>
                  <span className="sgx-brands__go">{es ? 'Ver ficha' : 'View profile'}<ArrowRight aria-hidden /></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
