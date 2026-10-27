import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SGX_PILLARS } from '../lib/sgxPillars';
import { useSgxIdentity } from './SgxIdentityContext';
import { SgxPassCard } from './SgxPassCard';
import { missionsOfPillar } from './reactor';
import { SgxHoloStudio } from './SgxHoloStudio';

/* The SGX Pass as a page section (SGX.System → SGX Pass). Same card the Hangar
   shows, with the per-pillar progress next to it. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxPassSection: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity, isForged, missions, isDone } = useSgxIdentity();
  const [flipped, setFlipped] = useState(false);

  if (!isForged) {
    return (
      <div className="sgx-pass-section sgx-pass-section--empty sgx-panel">
        <div className="sgx-pass-section__ghost" aria-hidden="true">
          <img src="/brand/sgx-bolt.svg" alt="" />
          <span>SGX PASS</span>
          <code>#----</code>
        </div>
        <div>
          <h3 className="sgx-panel__title">{es ? 'Todavía no tienes pase' : "You don't have a pass yet"}</h3>
          <p className="sgx-panel__body">
            {es
              ? 'La taquilla, la Holo Card y la credencial ahora son una sola cosa. Forja tu SGX Pass en un minuto: nombre, pilar, piloto y listo.'
              : 'The ticket desk, the Holo Card and the credential are one thing now. Forge your SGX Pass in a minute: name, pillar, pilot, done.'}
          </p>
          <div className="sgx-forge__actions">
            <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => fire('sgx:open_forge')}>[ ⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'} ]</button></span>
            <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_forge', { tier: 'SHOWCASE' })}>{es ? 'Solicitar Día 3 presencial' : 'Request Day 3 in person'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sgx-pass-section">
      <SgxPassCard flipped={flipped} onFlip={() => setFlipped((f) => !f)} />
      <div className="sgx-pass-section__side">
        <div className="sgx-panel">
          <h3 className="sgx-panel__title">{es ? 'Sellos por pilar' : 'Pillar stamps'}</h3>
          <ul className="sgx-pass-section__bars">
            {SGX_PILLARS.map((p) => {
              const list = missionsOfPillar(missions, p.key);
              const n = list.filter((m) => isDone(m.id)).length;
              const stamped = !!identity.stamps[`pillar:${p.key}`];
              return (
                <li key={p.key} className={stamped ? 'is-on' : ''}>
                  <span>{p.name}</span>
                  <i style={{ ['--fill' as string]: `${list.length ? (n / list.length) * 100 : 0}%` }} />
                  <b>{stamped ? '◆' : `${n}/${list.length}`}</b>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="sgx-forge__actions">
          <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => fire('sgx:open_hangar', { tab: 'pass' })}>{es ? 'Abrir Hangar' : 'Open Hangar'}</button></span>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'reactor' })}>Reactor</button>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_qr_scanner')}>{es ? 'Escanear pase' : 'Scan pass'}</button>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'day3' })}>{es ? 'Día 3' : 'Day 3'}</button>
        </div>
      </div>
    </div>
  );
};

/* Holo Card Studio on the page: your SGX Pass in share formats, plus the
   role cards you really hold (speaker, initiate, sponsor). */
export const SgxHoloStudioPanel: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity } = useSgxIdentity();

  return (
    <section className="sgx-holo-panel" aria-labelledby="sgx-holo-title">
      <header className="sgx-holo-panel__head">
        <div>
          <p className="sgx-forge__kicker">SGX Credentials · Holo Card Studio</p>
          <h3 id="sgx-holo-title">{es ? 'Tu Holo Card' : 'Your Holo Card'}</h3>
          <p>
            {es
              ? 'Tu Holo Card es tu SGX Pass, lista para compartir como tarjeta 3D, post o story. Si eres speaker, sponsor o initiate, esa tarjeta aparece aquí cuando el equipo confirma tu registro.'
              : 'Your Holo Card is your SGX Pass, ready to share as a 3D card, post or story. If you are a speaker, sponsor or initiate, that card shows up here once the team confirms your registration.'}
          </p>
        </div>
        <div className="sgx-forge__actions">
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_credential_generator')}>{es ? 'Pantalla completa' : 'Full screen'}</button>
          {identity.holo?.image && (
            <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'pass' })}>{es ? 'Ver en mi Hangar' : 'See in my Hangar'}</button>
          )}
        </div>
      </header>
      <div className="sgx-holo-panel__studio">
        <SgxHoloStudio />
      </div>
    </section>
  );
};

export default SgxPassSection;
