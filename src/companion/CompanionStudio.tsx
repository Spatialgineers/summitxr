import React, { lazy, Suspense, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { configFromSeed } from '../identity/pilotAvatar';
import { PILLAR_ACCENT } from '../identity/sgxIdentity';
import { useSgxIdentity } from '../identity/SgxIdentityContext';
import { CompanionPanel } from './CompanionPanel';
import { useCompanion } from './companionStore';
import './companion.css';

const SgxPilot3D = lazy(() => import('../identity/SgxPilot3D').then((m) => ({ default: m.SgxPilot3D })));

/* Tu Estudio → Tu Highbot: your bot in 3D, reacting while it thinks, talks
   and points, next to the chat. While this is on screen the floating head
   stays out of the way. */

export const CompanionStudio: React.FC = () => {
  const { language } = useLanguage();
  const es = language !== 'en';
  const { identity } = useSgxIdentity();
  const { mood } = useCompanion();
  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const config = identity.avatar.pilot || configFromSeed(identity.avatar.seed, accent);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sgx:companion_inline', { detail: { on: true } }));
    return () => { window.dispatchEvent(new CustomEvent('sgx:companion_inline', { detail: { on: false } })); };
  }, []);

  return (
    <div className="sgx-companion-studio">
      <div className={`sgx-companion-studio__bot is-${mood}`}>
        <Suspense fallback={<div className="sgx-studio__wait">{es ? 'Cargando 3D…' : 'Loading 3D…'}</div>}>
          <SgxPilot3D config={config} height={340} mood={mood} label={es ? 'Tu Highbot en 3D' : 'Your Highbot in 3D'} />
        </Suspense>
        <span className="sgx-companion-studio__state" aria-hidden="true">
          {{ idle: es ? 'Listo' : 'Ready', thinking: es ? 'Pensando' : 'Thinking', talking: es ? 'Hablando' : 'Talking', pointing: es ? 'Mostrando' : 'Showing' }[mood]}
        </span>
      </div>
      <CompanionPanel variant="studio" />
    </div>
  );
};

export default CompanionStudio;
