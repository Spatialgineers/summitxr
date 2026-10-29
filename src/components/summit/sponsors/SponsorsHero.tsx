import React from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { scrollToSection } from './scrollToSection';

interface SponsorsHeroProps {
  tierCount: number;
  onApply: () => void;
}

/* Opening pitch: what the Summit is, what a brand gets, and the two dates
   that matter to a sponsor. The collage shows real placements from the app. */
export const SponsorsHero: React.FC<SponsorsHeroProps> = ({ tierCount, onApply }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const lang = es ? 'es' : 'en';

  const facts = [
    { k: es ? '11–13 dic' : 'Dec 11–13', v: '2026 · YouTube Live + San Juan' },
    { k: es ? '14 nov' : 'Nov 14', v: es ? 'Pago total' : 'Full payment' },
    { k: es ? '30 nov' : 'Nov 30', v: es ? 'Entrega de materiales' : 'Materials due' },
    { k: es ? `${tierCount} niveles` : `${tierCount} tiers`, v: es ? 'Precios en USD' : 'Prices in USD' },
  ];

  return (
    <header className="spx-hero" aria-labelledby="spx-hero-title">
      <div className="spx-hero__copy">
        <p className="spx-eyebrow">
          <img src="/holo/showcase.png" alt="" />
          <span>SGX.Showcase · {es ? 'Auspicios Summit 2026' : 'Summit 2026 sponsorships'}</span>
        </p>
        <h1 id="spx-hero-title" className="spx-hero__title">
          {es ? <>Tu marca, <em>dentro</em> del Summit.</> : <>Your brand, <em>inside</em> the Summit.</>}
        </h1>
        <p className="spx-hero__lead">
          {es
            ? 'El Spatialgineers Summit 2026 se vive en una webapp con núcleo 3D, minijuegos y misiones. Días 1 y 2 gratis por YouTube Live junto a Los Mismos TV; Día 3 presencial en Chroma Space Studios, San Juan. Auspiciar es ocupar esos espacios con tu marca.'
            : 'Spatialgineers Summit 2026 happens in a web app with a 3D core, mini-games and missions. Days 1 and 2 are free on YouTube Live with Los Mismos TV; Day 3 is in person at Chroma Space Studios, San Juan. Sponsoring means your brand fills those spaces.'}
        </p>
        <div className="spx-hero__cta">
          <button type="button" className="sgx-btn" onClick={onApply}>
            {es ? 'Solicitar auspicio' : 'Request sponsorship'}<ArrowRight aria-hidden />
          </button>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => scrollToSection('spx-tiers')}>
            {es ? 'Ver niveles' : 'See tiers'}<ArrowDown aria-hidden />
          </button>
        </div>
        <dl className="spx-facts">
          {facts.map((f) => (
            <div key={f.v}>
              <dt>{f.v}</dt>
              <dd>{f.k}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="spx-hero__art" aria-hidden="true">
        <figure className="spx-shot spx-shot--main">
          <img src={`/sponsors/placements/core-3d-${lang}.webp`} alt="" width={800} height={500} />
          <figcaption>{es ? 'Núcleo 3D · Tier 3–5' : '3D core · Tier 3–5'}</figcaption>
        </figure>
        <figure className="spx-shot spx-shot--a">
          <img src={`/sponsors/placements/splash-${lang}.webp`} alt="" width={800} height={500} />
          <figcaption>{es ? 'Intro' : 'Intro'}</figcaption>
        </figure>
        <figure className="spx-shot spx-shot--b">
          <img src={`/sponsors/placements/drone-crates-${lang}.webp`} alt="" width={800} height={472} />
          <figcaption>{es ? 'Dron SGX' : 'SGX Drone'}</figcaption>
        </figure>
      </div>
    </header>
  );
};
