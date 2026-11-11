import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { navigateToPillar, navigateToSection } from '../immersion/navigation';
import { PILLAR_ACCENT } from '../identity/sgxIdentity';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';
import { SgxPilotGlyph } from '../identity/SgxPilotGlyph';
import { getAppRouteAndSectionFromUrl } from '../lib/summitUrlSync';
import './quickTour.css';

/* The 60-second tour: on a first visit the Highbot offers to walk the Creador
   through five places (12 seconds each) and ends at "Forja tu pase". It never
   blocks the page, and it can be started again with the event `sgx:start_tour60`. */

const DONE_KEY = 'sgx_tour60_done';
const STEP_MS = 12000;

interface Step { go: () => void; es: [string, string]; en: [string, string] }

const STEPS: Step[] = [
  { go: () => navigateToSection('OVERVIEW'),
    es: ['El núcleo', 'Aquí empieza todo. Los seis pilares SGX ordenan el Spatialgineers Summit: Story, Showcase, Spark, Stage, System y Synthesize. Toca uno para entrar.'],
    en: ['The core', 'Everything starts here. The six SGX pillars organize the Spatialgineers Summit: Story, Showcase, Spark, Stage, System and Synthesize. Tap one to enter.'] },
  { go: () => navigateToSection('AGENDA'),
    es: ['El programa', 'El 11 y 12 de diciembre son gratis por YouTube Live, junto a Los Mismos TV. El Día 3 es presencial en Chroma Space Studios, por invitación. Marca con ☆ lo que quieras ver y queda en Mi agenda.'],
    en: ['The program', 'December 11 and 12 are free on YouTube Live, with Los Mismos TV. Day 3 is in person at Chroma Space Studios, by invitation. Mark what you want to see with ☆ and it goes to My agenda.'] },
  { go: () => navigateToPillar('spark'),
    es: ['Los pilares', 'Cada pilar tiene su página, con sus módulos y sus misiones. Cada misión que completas te da XP.'],
    en: ['The pillars', 'Each pillar has its own page, with its modules and missions. Every mission you complete gives you XP.'] },
  { go: () => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'room' } })),
    es: ['Tu Estudio 3D', 'Este es mi cuarto. Camina conmigo hasta la computadora, los sellos de los pilares y la pared de Holo Cards de los Creadores con los que conectes.'],
    en: ['Your 3D Studio', 'This is my room. Walk with me to the computer, the pillar stamps and the wall of Holo Cards from the Creators you connect with.'] },
  { go: () => navigateToSection('OVERVIEW'),
    es: ['Forja tu pase', 'Con tu SGX Pass guardas tu XP, recibes tu Holo Card y hablas conmigo cuando quieras. Es gratis y toma un minuto.'],
    en: ['Forge your pass', 'Your SGX Pass keeps your XP, gives you your Holo Card and lets you talk to me any time. It is free and takes a minute.'] },
];

const done = () => { try { return localStorage.getItem(DONE_KEY) === '1'; } catch { return true; } };
const markDone = () => { try { localStorage.setItem(DONE_KEY, '1'); } catch { /* storage blocked */ } };

export const SgxQuickTour: React.FC = () => {
  const { language } = useLanguage();
  const es = language !== 'en';
  const sgx = useOptionalSgxIdentity();
  const [offer, setOffer] = useState(false);
  const [step, setStep] = useState<number | null>(null);

  // First visit, on the core, without a pass: offer the tour after the page settles.
  useEffect(() => {
    if (done() || sgx?.isForged) return;
    const t = window.setTimeout(() => {
      const { page, summitSection } = getAppRouteAndSectionFromUrl();
      if (page === 'summit' && (!summitSection || summitSection === 'OVERVIEW') && !done()) setOffer(true);
    }, 6000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const start = () => { setOffer(false); setStep(0); };
    window.addEventListener('sgx:start_tour60', start);
    return () => window.removeEventListener('sgx:start_tour60', start);
  }, []);

  // Each step opens its place and moves on by itself; the last one waits for the Creador.
  useEffect(() => {
    if (step === null) return;
    STEPS[step].go();
    if (step === STEPS.length - 1) return;
    const t = window.setTimeout(() => setStep((s) => (s === null ? s : s + 1)), STEP_MS);
    return () => window.clearTimeout(t);
  }, [step]);

  const close = () => { markDone(); setOffer(false); setStep(null); };
  const forge = () => { close(); window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })); };

  if (!offer && step === null) return null;

  const accent = sgx?.identity.affinity ? PILLAR_ACCENT[sgx.identity.affinity] : '#FDCC0D';
  const face = (
    <span className="sgx-tour60__face" aria-hidden="true">
      <SgxPilotGlyph seed={sgx?.identity.avatar.seed || 'sgx'} accent={accent} size={56} config={sgx?.identity.avatar.pilot as any} />
    </span>
  );

  if (step === null) {
    return (
      <aside className="sgx-tour60" aria-label={es ? 'Recorrido de 60 segundos' : '60-second tour'}>
        {face}
        <div className="sgx-tour60__body">
          <strong>{es ? '¿Primera vez aquí?' : 'First time here?'}</strong>
          <p>{es ? 'Soy tu Highbot. Te enseño el Summit en 60 segundos.' : 'I am your Highbot. I can show you the Summit in 60 seconds.'}</p>
          <div className="sgx-tour60__actions">
            <button type="button" className="sgx-btn" onClick={() => { setOffer(false); setStep(0); }}>{es ? 'Empezar' : 'Start'}</button>
            <button type="button" className="sgx-btn sgx-btn--ground" onClick={close}>{es ? 'Ahora no' : 'Not now'}</button>
          </div>
        </div>
      </aside>
    );
  }

  const last = step === STEPS.length - 1;
  const [title, text] = es ? STEPS[step].es : STEPS[step].en;
  return (
    <aside className="sgx-tour60 sgx-tour60--run" aria-label={es ? 'Recorrido de 60 segundos' : '60-second tour'}>
      {face}
      <div className="sgx-tour60__body" aria-live="polite">
        <span className="sgx-tour60__count">{step + 1}/{STEPS.length}</span>
        <strong>{title}</strong>
        <p>{text}</p>
        <div className="sgx-tour60__actions">
          {last
            ? (sgx?.isForged
              ? <button type="button" className="sgx-btn" onClick={close}>{es ? 'Listo' : 'Done'}</button>
              : <button type="button" className="sgx-btn" onClick={forge}>{es ? 'Forjar mi pase' : 'Forge my pass'}</button>)
            : <button type="button" className="sgx-btn" onClick={() => setStep(step + 1)}>{es ? 'Siguiente' : 'Next'}</button>}
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={close}>{last ? (es ? 'Cerrar' : 'Close') : (es ? 'Saltar' : 'Skip')}</button>
        </div>
        {!last && <i key={step} className="sgx-tour60__bar" style={{ animationDuration: `${STEP_MS}ms` }} aria-hidden="true" />}
      </div>
    </aside>
  );
};

export default SgxQuickTour;
