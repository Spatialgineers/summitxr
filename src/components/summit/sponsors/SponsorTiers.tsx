import React from 'react';
import { Check, ArrowRight, Info } from 'lucide-react';
import type { SponsorshipTier } from '../../../types/summit';
import { useLanguage } from '../../../context/LanguageContext';
import { loc } from '../../../lib/localize';
import { sponsorTierAccent } from '../sponsorTierAccent';

interface SponsorTiersProps {
  tiers: SponsorshipTier[];
  onApply: (tierId: string) => void;
}

type TierFlags = [boolean, boolean, boolean, boolean, boolean];

/* The five tiers: cards (a swipe rail on phones) with their own CTA, then the
   side-by-side comparison on wide screens. Contents come from the tier data. */
export const SponsorTiers: React.FC<SponsorTiersProps> = ({ tiers, onApply }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  // What each tier includes (Dossier de Auspicio v2026.10.1). Each tier includes the one before it.
  const comparison: { feature: string; on: TierFlags; key?: boolean }[] = [
    { feature: es ? 'Logo en la webapp del Summit (Días 1–3)' : 'Logo on the Summit web app (Days 1–3)', on: [true, true, true, true, true] },
    { feature: es ? 'Overlays en la transmisión de YouTube Live' : 'Overlays on the YouTube Live broadcast', on: [true, true, true, true, true] },
    { feature: es ? 'Marca en el minijuego 3D del dron (cajas de entrega, zonas o drops)' : 'Brand in the 3D drone mini-game (crates, zones or drops)', on: [false, true, true, true, true] },
    { feature: es ? 'Pregunta de trivia de marca en vivo (+25 XP)' : 'Live brand trivia question (+25 XP)', on: [false, true, true, true, true] },
    { feature: es ? 'Segmento con el nombre de su marca ("The [Marca] Showcase")' : 'Segment named after your brand ("The [Brand] Showcase")', on: [false, false, true, true, true] },
    { feature: es ? 'Video de presentación de 30 a 60 segundos' : '30- to 60-second intro video', on: [false, false, true, true, true] },
    { feature: es ? 'Reto de marca en el Reactor del SGX Pass' : 'Brand challenge in the SGX Pass Reactor', on: [false, false, true, true, true] },
    { feature: es ? 'Marca en los minijuegos, el visualizador y la votación' : 'Brand in the mini-games, the visualizer and voting', on: [false, false, false, true, true] },
    { feature: es ? 'Exclusividad por categoría' : 'Category exclusivity', on: [false, false, false, true, true] },
    { feature: es ? 'Documental y minijuego a medida (el minijuego se cotiza aparte)' : 'Documentary and custom mini-game (the mini-game is quoted separately)', on: [false, false, false, true, true] },
    { feature: es ? 'Reporte final a los 30 días, sin datos personales' : 'Final report at 30 days, with no personal data', on: [false, false, false, true, true] },
    { feature: es ? 'Licencia de acceso a la webapp por 365 días desde noviembre' : '365-day web app access license starting in November', on: [false, false, false, true, true], key: true },
    { feature: es ? 'Aporte de servicios esenciales (venue, internet, comida u otros)' : 'Essential services contribution (venue, internet, food or others)', on: [false, false, false, false, true] },
  ];

  return (
    <section id="spx-tiers" className="spx-section" aria-labelledby="spx-tiers-title" tabIndex={-1}>
      <div className="spx-head">
        <p className="spx-kicker">{es ? 'Niveles de auspicio' : 'Sponsorship tiers'}</p>
        <h2 id="spx-tiers-title" className="spx-h2">{es ? 'Elige cuánto espacio ocupa tu marca' : 'Choose how much room your brand takes'}</h2>
        <p className="spx-lead">
          {es
            ? 'Cada nivel incluye todo lo del anterior. El precio exacto dentro de cada rango se acuerda según el presupuesto del sponsor.'
            : "Each tier includes everything in the one before it. The exact price within each range is agreed based on the sponsor's budget."}
        </p>
      </div>

      <ol className="spx-tiers" aria-label={es ? 'Niveles' : 'Tiers'}>
        {tiers.map((tier) => {
          const accent = sponsorTierAccent(tier.id);
          const name = loc(tier, 'name', language);
          return (
            <li key={tier.id} className="spx-tier" style={{ ['--tier' as string]: accent }}>
              <div className="spx-tier__top">
                <span className="spx-tier__num">Tier {tier.tierNumber}</span>
                {tier.yearLongLicense && <span className="sgx-chip sgx-chip--solid" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>{es ? '365 días' : '365 days'}</span>}
              </div>
              <h3 className="spx-tier__name">{name}</h3>
              <p className="spx-tier__price">{loc(tier, 'priceRange', language)}</p>
              <p className="spx-tier__key">{loc(tier, 'keyBenefit', language)}</p>
              <ul className="spx-tier__list">
                {loc(tier, 'features', language).map((feat, i) => (
                  <li key={i}><Check aria-hidden />{feat}</li>
                ))}
              </ul>
              {tier.sponsors.length > 0 && (
                <p className="spx-tier__who">{es ? 'Aliado: ' : 'Partner: '}{tier.sponsors.map((s) => s.name).join(', ')}</p>
              )}
              <button type="button" className="sgx-btn sgx-btn--sm is-wide is-wrap spx-tier__cta" onClick={() => onApply(tier.id)}>
                {es ? `Solicitar ${name}` : `Request ${name}`}<ArrowRight aria-hidden />
              </button>
            </li>
          );
        })}
      </ol>
      <p className="spx-swipe" aria-hidden="true">{es ? 'Desliza para ver los 5 niveles →' : 'Swipe to see all 5 tiers →'}</p>

      <div className="spx-compare">
        <table>
          <caption>{es ? 'Comparativa de niveles' : 'Tier comparison'}</caption>
          <thead>
            <tr>
              <th scope="col">{es ? 'Beneficio' : 'Benefit'}</th>
              {tiers.map((tier) => (
                <th key={tier.id} scope="col" style={{ ['--tier' as string]: sponsorTierAccent(tier.id) }}>
                  <span>Tier {tier.tierNumber}</span>
                  <small>{loc(tier, 'name', language)}</small>
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
                      ? <Check role="img" aria-label={es ? 'Incluido' : 'Included'} style={{ color: sponsorTierAccent(tier.id) }} />
                      : <span aria-label={es ? 'No incluido' : 'Not included'}>—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="spx-note">
        <Info aria-hidden />
        <span>
          <b>{es ? 'Tiers 4 y 5: 365 días. ' : 'Tiers 4 and 5: 365 days. '}</b>
          {es
            ? 'Mantienen su acceso a la webapp y a sus espacios de promoción por 365 días desde noviembre, y reciben un reporte final a los 30 días. Spatialgineers no garantiza un número de vistas, asistentes ni clics.'
            : 'They keep their access to the web app and its promotion spaces for 365 days starting in November, and receive a final report at 30 days. Spatialgineers does not guarantee a number of views, attendees or clicks.'}
        </span>
      </p>
    </section>
  );
};
