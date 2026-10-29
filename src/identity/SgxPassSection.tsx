import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SGX_PILLARS } from '../lib/sgxPillars';
import { useSgxIdentity } from './SgxIdentityContext';
import { missionsOfPillar } from './reactor';
import { SgxHoloStudio } from './SgxHoloStudio';

/* The SGX Pass as a page section (SGX.System → SGX Pass). One card: the
   Holo Card IS the pass (front: you; back: the program and your QR), with the
   share formats, the pillar stamps and the pass actions. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxPassSection: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { isForged } = useSgxIdentity();

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
              ? 'Tu Holo Card, tu QR de networking y tu acceso al Summit. Forja tu SGX Pass en un minuto: nombre, pilar, avatar y listo.'
              : 'Your Holo Card, your networking QR and your access to the Summit. Forge your SGX Pass in a minute: name, pillar, avatar, done.'}
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
    <SgxPassBoard
      actions={(
        <>
          <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => fire('sgx:open_hangar', { tab: 'pass' })}>{es ? 'Abrir Estudio' : 'Open Studio'}</button></span>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'reactor' })}>Reactor</button>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_qr_scanner')}>{es ? 'Escanear pase' : 'Scan pass'}</button>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => fire('sgx:open_hangar', { tab: 'day3' })}>{es ? 'Día 3' : 'Day 3'}</button>
        </>
      )}
    />
  );
};

/* The forged pass: Holo Card studio, pillar stamps and the actions of the
   place it lives in (this section or the Pass tab of your Studio). */
export const SgxPassBoard: React.FC<{ actions: React.ReactNode; onClose?: () => void }> = ({ actions, onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity, missions, isDone } = useSgxIdentity();
  return (
    <div className="sgx-pass-section sgx-pass-section--one">
      <div className="sgx-pass-section__card">
        <SgxHoloStudio onClose={onClose} />
      </div>
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
        <div className="sgx-forge__actions">{actions}</div>
      </div>
    </div>
  );
};

export default SgxPassSection;
