import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { sponsorTierAccent } from '../sponsorTierAccent';
import { SPONSOR_PLACEMENTS, placementImage, type TierNumber } from './sponsorPlacements';

const TIERS: TierNumber[] = [1, 2, 3, 4, 5];

/* "Dónde aparece tu marca": every real spot a sponsor buys, with a screenshot
   from the app and the tiers that include it. Picking a tier dims the rest. */
export const SponsorPlacements: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [tier, setTier] = useState<TierNumber | null>(null);

  const included = tier ? SPONSOR_PLACEMENTS.filter((p) => p.tiers.includes(tier)).length : SPONSOR_PLACEMENTS.length;
  const tierList = (tiers: TierNumber[]) => (tiers.length === 5
    ? (es ? 'todos los niveles' : 'every tier')
    : `Tier ${tiers.join(', ')}`);

  return (
    <section className="spx-section" aria-labelledby="spx-place-title">
      <div className="spx-head">
        <p className="spx-kicker">{es ? 'Inventario digital del Summit' : "The Summit's digital real estate"}</p>
        <h2 id="spx-place-title" className="spx-h2">{es ? 'Dónde aparece tu marca' : 'Your brand, everywhere'}</h2>
        <p className="spx-lead">
          {es
            ? 'Estos espacios existen hoy en la webapp y en la transmisión. Los "Tu marca aquí" que ves en el núcleo 3D y en la intro son los cupos abiertos.'
            : 'These spaces exist today in the web app and on the broadcast. The "Your brand here" slots you see in the 3D core and the intro are the open inventory.'}
        </p>
      </div>

      <div className="spx-filter">
        <div className="sgx-chip-row" role="group" aria-label={es ? 'Ver por nivel' : 'View by tier'}>
          <button type="button" className="sgx-chip" aria-pressed={tier === null} onClick={() => setTier(null)}>
            {es ? 'Todos' : 'All'}
          </button>
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              className="sgx-chip"
              style={{ ['--chip' as string]: sponsorTierAccent(`tier_${t}`) }}
              aria-pressed={tier === t}
              onClick={() => setTier(tier === t ? null : t)}
            >
              Tier {t}
            </button>
          ))}
        </div>
        <p className="spx-filter__note" aria-live="polite">
          {tier
            ? (es ? `Tier ${tier} incluye ${included} de ${SPONSOR_PLACEMENTS.length} espacios.` : `Tier ${tier} includes ${included} of ${SPONSOR_PLACEMENTS.length} spaces.`)
            : (es ? `${SPONSOR_PLACEMENTS.length} espacios en total.` : `${SPONSOR_PLACEMENTS.length} spaces in all.`)}
        </p>
      </div>

      <ul className="spx-place">
        {SPONSOR_PLACEMENTS.map((p, i) => {
          const copy = es ? p.es : p.en;
          const src = placementImage(p, es);
          const off = tier !== null && !p.tiers.includes(tier);
          return (
            <li key={p.id} className={`spx-place__card ${p.feature ? 'is-feature' : ''} ${off ? 'is-off' : ''}`}>
              <div className={`spx-place__media ${src ? '' : 'is-live'}`}>
                {src ? (
                  <img src={src} alt={es ? `Captura: ${copy.title}` : `Screenshot: ${copy.title}`} loading="lazy" decoding="async" width={800} height={500} />
                ) : (
                  <div className="spx-place__live" aria-hidden="true">
                    <img src={p.mark} alt="" />
                    <span>{es ? 'Fuera de la pantalla' : 'Off screen'}</span>
                  </div>
                )}
                <span className="spx-place__n" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="spx-place__body">
                <p className="spx-place__where">{copy.where}</p>
                <h3 className="spx-place__title">{copy.title}</h3>
                <p className="spx-place__text">{copy.body}</p>
                <div className="spx-ladder" role="img" aria-label={es ? `Incluido en ${tierList(p.tiers)}` : `Included in ${tierList(p.tiers)}`}>
                  {TIERS.map((t) => (
                    <span key={t} className={p.tiers.includes(t) ? 'is-on' : ''} style={{ ['--tier' as string]: sponsorTierAccent(`tier_${t}`) }}>T{t}</span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
