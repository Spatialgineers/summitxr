import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SGX_PILLARS, pillarInk } from '../../lib/sgxPillars';
import { SGX_EMAIL, SGX_PHONE, SGX_YOUTUBE } from '../../lib/sgxLinks';
import { navigateToPillar } from '../../immersion/navigation';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import './summitFooter.css';

/* The Summit footer: brand, the six pillars, the event facts, contact and
   privacy, each said once. SummitCoreFooterBar is the slim version under
   the 3D core, so privacy and contact are one tap away from home too. */

const SGX_INSTAGRAM = 'https://instagram.com/spatialgineers';
const TEL = `tel:${SGX_PHONE.replace(/[^+\d]/g, '')}`;

const replayIntro = () => {
  playUiChirp(840);
  window.dispatchEvent(new CustomEvent('sgx:replay_splash'));
};

interface SummitFooterProps {
  onOpenPrivacy: () => void;
  onOpenSponsors: () => void;
}

export const SummitFooter: React.FC<SummitFooterProps> = ({ onOpenPrivacy, onOpenSponsors }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  return (
    <footer className="sgx-foot" aria-labelledby="sgx-foot-title">
      <div className="sgx-foot__grid">
        <div className="sgx-foot__brand">
          <img src="/holo/sgxLogo.png" alt="Spatialgineers" width={72} height={69} loading="lazy" />
          <div>
            <h2 id="sgx-foot-title" className="sgx-foot__title">Spatialgineers Summit 2026</h2>
            <p className="sgx-foot__tag">{es ? 'Ingeniando Imaginación, Construyendo Realidades' : 'Engineering Imagination, Building Realities'}</p>
          </div>
        </div>

        <nav className="sgx-foot__col" aria-label={es ? 'Los seis pilares' : 'The six pillars'}>
          <h3 className="sgx-foot__head">{es ? 'Pilares' : 'Pillars'}</h3>
          <ul className="sgx-foot__pillars">
            {SGX_PILLARS.map((p) => (
              <li key={p.key}>
                <button
                  type="button"
                  className="sgx-foot__pillar"
                  style={{ ['--pillar' as string]: pillarInk(p.key) }}
                  onClick={() => { playUiChirp(700); navigateToPillar(p.slug); }}
                >
                  <span className="sgx-foot__idx">0{p.index}</span>
                  <span>{p.name.replace('SGX.', '')}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sgx-foot__col">
          <h3 className="sgx-foot__head">{es ? 'El evento' : 'The event'}</h3>
          <ul className="sgx-foot__facts">
            <li><strong>{es ? '11–13 de diciembre de 2026' : 'December 11–13, 2026'}</strong></li>
            <li>{es ? 'Días 1 y 2: gratis por YouTube Live, con Los Mismos TV transmitiendo junto a nosotros.' : 'Days 1 and 2: free on YouTube Live, with Los Mismos TV streaming alongside us.'}</li>
            <li>{es ? 'Día 3: Chroma Space Studios, San Juan. Por invitación.' : 'Day 3: Chroma Space Studios, San Juan. By invitation.'}</li>
            <li>{es ? 'En español.' : 'In Spanish.'}</li>
          </ul>
        </div>

        <div className="sgx-foot__col">
          <h3 className="sgx-foot__head">{es ? 'Contacto' : 'Contact'}</h3>
          <ul className="sgx-foot__facts">
            <li><a href={`mailto:${SGX_EMAIL}`}>{SGX_EMAIL}</a></li>
            <li><a href={TEL}>{SGX_PHONE}</a></li>
            <li>{es ? 'Prensa: pide tu acreditación antes del 1 de diciembre (6 cupos, uno por medio).' : 'Press: request accreditation before December 1 (6 slots, one per outlet).'}</li>
            <li>
              <button type="button" className="sgx-foot__link" onClick={onOpenSponsors}>
                {es ? 'Patrocina el Summit' : 'Sponsor the Summit'}
              </button>
            </li>
          </ul>
          <div className="sgx-foot__social">
            <a href={SGX_YOUTUBE} target="_blank" rel="noopener noreferrer" aria-label="YouTube @spatialgineers">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z" /></svg>
              <span>YouTube</span>
            </a>
            <a href={SGX_INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram @spatialgineers">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm5.2-9.6a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2.2c-2.7 0-3 0-4 .1-3.6.2-5.6 2.2-5.8 5.8-.1 1-.1 1.4-.1 4s0 3 .1 4c.2 3.6 2.2 5.6 5.8 5.8 1 .1 1.4.1 4 .1s3 0 4-.1c3.6-.2 5.6-2.2 5.8-5.8.1-1 .1-1.4.1-4s0-3-.1-4c-.2-3.6-2.2-5.6-5.8-5.8-1-.1-1.3-.1-4-.1Zm0 1.8c2.6 0 2.9 0 4 .1 2.5.1 3.8 1.3 3.9 3.9.1 1 .1 1.3.1 4s0 2.9-.1 4c-.1 2.5-1.4 3.8-3.9 3.9-1 .1-1.3.1-4 .1s-2.9 0-4-.1c-2.6-.1-3.8-1.4-3.9-3.9-.1-1-.1-1.3-.1-4s0-2.9.1-4C4.2 5.4 5.4 4.2 8 4.1c1-.1 1.3-.1 4-.1Z" /></svg>
              <span>Instagram</span>
            </a>
            <span className="sgx-foot__hash">#SpatialgineersSummit</span>
          </div>
        </div>
      </div>

      <div className="sgx-foot__base">
        <p className="sgx-foot__legal">
          © 2026 Spatialgineers LLC.{' '}
          {es
            ? 'Tu SGX Pass guarda tu nombre y tu correo para el evento. Nunca vendemos tus datos.'
            : 'Your SGX Pass keeps your name and email for the event. We never sell your data.'}
        </p>
        <div className="sgx-foot__actions">
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={replayIntro}>
            {es ? 'Ver intro' : 'Watch intro'}
          </button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { playUiChirp(820); onOpenPrivacy(); }}>
            {es ? 'Política de privacidad' : 'Privacy policy'}
          </button>
        </div>
      </div>
    </footer>
  );
};

/** Slim bar under the 3D core: the footer's essentials without leaving home. */
export const SummitCoreFooterBar: React.FC<{ onOpenPrivacy: () => void }> = ({ onOpenPrivacy }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  return (
    <footer className="sgx-corefoot">
      <span className="sgx-corefoot__copy">© 2026 Spatialgineers LLC</span>
      <a className="sgx-corefoot__link" href={`mailto:${SGX_EMAIL}`}>{SGX_EMAIL}</a>
      <button type="button" className="sgx-corefoot__link" onClick={() => { playUiChirp(820); onOpenPrivacy(); }}>
        {es ? 'Privacidad' : 'Privacy'}
      </button>
    </footer>
  );
};

export default SummitFooter;
