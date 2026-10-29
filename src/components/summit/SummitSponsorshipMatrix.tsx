import React, { useState } from 'react';
import { Check, Sparkles, ArrowRight, Zap, Mail, LayoutGrid, Table2 } from 'lucide-react';
import { SponsorshipTier } from '../../types/summit';
import { SPONSORSHIP_TIERS } from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { sponsorTierAccent } from './sponsorTierAccent';
import './sgx-kit.css';
import './SummitSponsors.css';

interface SummitSponsorshipMatrixProps {
  tiers?: SponsorshipTier[];
  onOpenInquiryModal?: (tierId?: string) => void;
}

type TierFlags = [boolean, boolean, boolean, boolean, boolean];

export const SummitSponsorshipMatrix: React.FC<SummitSponsorshipMatrixProps> = ({
  tiers = SPONSORSHIP_TIERS,
  onOpenInquiryModal,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedTierId, setSelectedTierId] = useState<string>('tier_4');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // What each tier includes (Dossier de Auspicio v2026.10.1). Each tier includes the one before it.
  const comparison: { feature: string; on: TierFlags; key?: boolean }[] = [
    { feature: es ? 'Logo en la webapp del Summit (Días 1–3)' : 'Logo on the Summit web app (Days 1–3)', on: [true, true, true, true, true] },
    { feature: es ? 'Overlays en la transmisión de YouTube Live' : 'Overlays on the YouTube Live broadcast', on: [true, true, true, true, true] },
    { feature: es ? 'Marca en el minijuego 3D del dron (cajas de entrega, zonas o drops)' : 'Brand in the 3D drone mini-game (crates, zones or drops)', on: [false, true, true, true, true] },
    { feature: es ? 'Pregunta de trivia de marca en vivo (+25 XP)' : 'Live brand trivia question (+25 XP)', on: [false, true, true, true, true] },
    { feature: es ? 'Segmento con el nombre de su marca ("The [Marca] Showcase")' : 'Segment named after your brand ("The [Brand] Showcase")', on: [false, false, true, true, true] },
    { feature: es ? 'Video de presentación de 30 a 60 segundos' : '30- to 60-second intro video', on: [false, false, true, true, true] },
    { feature: es ? 'Marca en los minijuegos, el visualizador y la votación' : 'Brand in the mini-games, the visualizer and voting', on: [false, false, false, true, true] },
    { feature: es ? 'Exclusividad por categoría' : 'Category exclusivity', on: [false, false, false, true, true] },
    { feature: es ? 'Documental y minijuego a medida (el minijuego se cotiza aparte)' : 'Documentary and custom mini-game (the mini-game is quoted separately)', on: [false, false, false, true, true] },
    { feature: es ? 'Reporte final a los 30 días, sin datos personales' : 'Final report at 30 days, with no personal data', on: [false, false, false, true, true] },
    { feature: es ? 'Licencia de acceso a la webapp por 365 días desde noviembre' : '365-day web app access license starting in November', on: [false, false, false, true, true], key: true },
    { feature: es ? 'Aporte de servicios esenciales (venue, internet, comida u otros)' : 'Essential services contribution (venue, internet, food or others)', on: [false, false, false, false, true] },
  ];

  const apply = (tierId?: string) => onOpenInquiryModal?.(tierId);

  return (
    <div className="sgx-tiers">
      <header className="sgx-card sgx-tiers__head" style={{ ['--card-accent' as string]: 'rgba(253, 204, 13, 0.35)' }}>
        <div className="sgx-tiers__intro">
          <div className="sgx-chip-row">
            <span className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>{es ? 'Dossier de auspicio' : 'Sponsorship dossier'}</span>
            <span className="sgx-chip sgx-chip--ghost">{es ? 'Pago total antes del 14 de nov. · Materiales hasta el 30 de nov.' : 'Full payment by Nov 14 · Materials by Nov 30'}</span>
          </div>
          <h2 className="sgx-h sgx-tiers__title">{es ? 'Matriz de patrocinios' : 'Sponsorship matrix'}</h2>
          <p className="sgx-copy">
            {es
              ? 'Conecta tu marca con el Spatialgineers Summit 2026. El precio exacto dentro de cada rango se acuerda según el presupuesto del sponsor.'
              : "Connect your brand with the Spatialgineers Summit 2026. The exact price within each range is agreed based on the sponsor's budget."}
          </p>
        </div>
        <div className="sgx-tiers__actions">
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_sponsor_modal'))}>
            <Sparkles aria-hidden />{es ? 'Registrar mi marca' : 'Register my brand'}
          </button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => apply(selectedTierId)}>
            {es ? 'Solicitar auspicio' : 'Request sponsorship'}<ArrowRight aria-hidden />
          </button>
        </div>

        <p className="sgx-tiers__callout">
          <Zap aria-hidden />
          <span>
            <b>{es ? 'Tiers 4 y 5: 365 días. ' : 'Tiers 4 and 5: 365 days. '}</b>
            {es
              ? 'Mantienen su acceso a la webapp y a sus espacios de promoción por 365 días desde noviembre, y reciben un reporte final a los 30 días. Spatialgineers no garantiza un número de vistas, asistentes ni clics.'
              : 'They keep their access to the web app and its promotion spaces for 365 days starting in November, and receive a final report at 30 days. Spatialgineers does not guarantee a number of views, attendees or clicks.'}
          </span>
        </p>
      </header>

      <div className="sgx-chip-row sgx-tiers__view" role="group" aria-label={es ? 'Vista' : 'View'}>
        <button type="button" className="sgx-chip" aria-pressed={viewMode === 'CARDS'} onClick={() => setViewMode('CARDS')}>
          <LayoutGrid aria-hidden />{es ? 'Tarjetas' : 'Cards'}
        </button>
        <button type="button" className="sgx-chip" aria-pressed={viewMode === 'TABLE'} onClick={() => setViewMode('TABLE')}>
          <Table2 aria-hidden />{es ? 'Tabla comparativa' : 'Comparison table'}
        </button>
      </div>

      {viewMode === 'CARDS' ? (
        <div className="sgx-tiers__grid">
          {tiers.map((tier) => {
            const accent = sponsorTierAccent(tier.id);
            const isSelected = selectedTierId === tier.id;
            const name = loc(tier, 'name', language);
            return (
              <article
                key={tier.id}
                className={`sgx-card sgx-card--stripe sgx-tier ${isSelected ? 'is-on' : ''}`}
                style={{ ['--card-accent' as string]: isSelected ? accent : `color-mix(in srgb, ${accent} 40%, transparent)`, ['--tier-accent' as string]: accent }}
                onClick={() => setSelectedTierId(tier.id)}
              >
                <div className="sgx-chip-row">
                  <span className="sgx-chip" style={{ ['--chip' as string]: accent }}>Tier {tier.tierNumber}</span>
                  {tier.yearLongLicense && <span className="sgx-chip sgx-chip--solid" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>{es ? '365 días' : '365 days'}</span>}
                </div>
                <h3 className="sgx-h sgx-tier__name">{name}</h3>
                <p className="sgx-tier__price">{loc(tier, 'priceRange', language)}</p>
                <p className="sgx-tier__key">{loc(tier, 'keyBenefit', language)}</p>
                <ul className="sgx-tier__list">
                  {loc(tier, 'features', language).map((feat, i) => (
                    <li key={i}><Check aria-hidden />{feat}</li>
                  ))}
                </ul>
                {tier.sponsors.length > 0 && (
                  <p className="sgx-fine sgx-tier__who">{es ? 'Aliado: ' : 'Partner: '}{tier.sponsors.map((s) => s.name).join(', ')}</p>
                )}
                <button
                  type="button"
                  className={`sgx-btn sgx-btn--sm is-wide is-wrap ${isSelected ? 'is-active' : ''}`}
                  onClick={(e) => { e.stopPropagation(); apply(tier.id); }}
                >
                  {es ? `Postular a ${name}` : `Apply for ${name}`}
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="sgx-card sgx-tiers__table-wrap">
          <table className="sgx-tiers__table">
            <caption className="sr-only">{es ? 'Qué incluye cada tier' : 'What each tier includes'}</caption>
            <thead>
              <tr>
                <th scope="col">{es ? 'Beneficio' : 'Benefit'}</th>
                {tiers.map((tier) => (
                  <th key={tier.id} scope="col" style={{ color: sponsorTierAccent(tier.id) }}>
                    Tier {tier.tierNumber}
                    <small>{loc(tier, 'priceRange', language)}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.feature} className={row.key ? 'is-key' : ''}>
                  <th scope="row">{row.feature}</th>
                  {tiers.map((tier) => (
                    <td key={tier.id}>
                      {row.on[tier.tierNumber - 1]
                        ? <Check aria-label={es ? 'Incluido' : 'Included'} style={{ color: sponsorTierAccent(tier.id) }} />
                        : <span aria-label={es ? 'No incluido' : 'Not included'}>—</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="sgx-card sgx-card--sm sgx-tiers__foot">
        <p className="sgx-copy">{es ? '¿Necesitas una propuesta formal o el Media Kit completo en PDF?' : 'Need a formal proposal or the full Media Kit as a PDF?'}</p>
        <a className="sgx-btn sgx-btn--ground sgx-btn--sm is-wrap" href="mailto:info@spatialgineers.com?subject=Spatialgineers%20Summit%202026%20%C2%B7%20Auspicio">
          <Mail aria-hidden />info@spatialgineers.com
        </a>
      </div>
    </div>
  );
};
