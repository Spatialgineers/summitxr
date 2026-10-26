import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bi, SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playCyberBurstSound, playScanSuccessSound, playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT, type PassTier } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { SgxPilotGlyph } from './SgxPilotGlyph';
import { SgxPassCard } from './SgxPassCard';

/* FORJA DE IDENTIDAD: one ~60 second ceremony replaces the taquilla form, the
   Holo Card generator, the role selector and both tours. Name → pillar →
   pilot → the bolt prints your SGX Pass. Whoever finished it never sees a
   registration form again. */

type Step = 'intro' | 'name' | 'pillar' | 'pilot' | 'print' | 'done';
const ORDER: Step[] = ['intro', 'name', 'pillar', 'pilot', 'print', 'done'];

const seeds = () => Array.from({ length: 3 }, () => Math.random().toString(36).slice(2, 8));

interface Props {
  onClose: () => void;
  onOpenHangar: () => void;
  initialTier?: PassTier;
}

export const SgxForge: React.FC<Props> = ({ onClose, onOpenHangar, initialTier = 'DIGITAL' }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user } = useAuth();
  const { forge, identity } = useSgxIdentity();
  const [step, setStep] = useState<Step>('intro');
  const [fullName, setFullName] = useState(identity.pass?.fullName || user?.displayName || '');
  const [email, setEmail] = useState(identity.pass?.email || user?.email || '');
  const [organization, setOrganization] = useState(identity.pass?.organization || '');
  const [roleTitle, setRoleTitle] = useState(identity.pass?.roleTitle || '');
  const [tier, setTier] = useState<PassTier>(identity.pass?.tier || initialTier);
  const [affinity, setAffinity] = useState<PillarKey | null>(identity.affinity);
  const [options, setOptions] = useState<string[]>(() => [identity.avatar.seed, ...seeds().slice(0, 2)]);
  const [seed, setSeed] = useState(identity.avatar.seed);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const accent = affinity ? PILLAR_ACCENT[affinity] : '#FDCC0D';
  const stepIndex = ORDER.indexOf(step);

  useEffect(() => {
    if (step === 'name') window.setTimeout(() => nameRef.current?.focus(), 60);
  }, [step]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && step !== 'print') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, step]);

  const go = (s: Step) => { playUiChirp(660); setStep(s); };

  const submitName = (e: React.FormEvent) => {
    e.preventDefault();
    if (fullName.trim().length < 2) { setError(es ? 'Escribe tu nombre.' : 'Type your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(es ? 'Escribe un correo válido.' : 'Type a valid email.'); return; }
    setError('');
    go('pillar');
  };

  const print = () => {
    if (!affinity) return;
    setStep('print');
    playCyberBurstSound('kudos');
    forge({ fullName, email, tier, affinity, roleTitle, organization, avatarSeed: seed });
    window.setTimeout(() => {
      playScanSuccessSound();
      try {
        confetti({ particleCount: 140, spread: 75, startVelocity: 38, origin: { y: 0.55 }, colors: ['#FDCC0D', '#00DDFF', '#FFBB00', '#ffffff'] });
      } catch { /* reduced environments */ }
      setStep('done');
    }, 2300);
  };

  const pillarCards = useMemo(() => SGX_PILLARS, []);

  return (
    <div className="sgx-forge" role="dialog" aria-modal="true" aria-label={es ? 'Forja de identidad' : 'Identity forge'} style={{ ['--pass-accent' as string]: accent }}>
      <div className="sgx-forge__grid" aria-hidden="true" />
      <div className="sgx-forge__frame">
        <header className="sgx-forge__head">
          <div className="sgx-forge__title">
            <img src="/brand/sgx-bolt.svg" alt="" />
            <span>{es ? 'Forja de identidad' : 'Identity forge'}</span>
          </div>
          <ol className="sgx-forge__steps" aria-hidden="true">
            {['name', 'pillar', 'pilot', 'print'].map((s, i) => (
              <li key={s} className={stepIndex > i + 1 || step === 'done' ? 'is-done' : stepIndex === i + 1 ? 'is-on' : ''}>{String(i + 1).padStart(2, '0')}</li>
            ))}
          </ol>
          {step !== 'print' && (
            <button type="button" className="sgx-forge__close" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
          )}
        </header>

        {step === 'intro' && (
          <section className="sgx-forge__stage sgx-forge__intro">
            <p className="sgx-forge__kicker">SPATIALGINEERS SUMMIT 2026</p>
            <h2>{es ? 'Un solo pase para todo el Summit' : 'One pass for the whole Summit'}</h2>
            <p>
              {es
                ? 'Tu registro, tu Holo Card, tu credencial y tu QR de networking ahora son el mismo objeto: el SGX Pass. Forjarlo toma un minuto y evoluciona con cada misión que completes.'
                : 'Your registration, Holo Card, credential and networking QR are now the same object: the SGX Pass. Forging it takes a minute and it evolves with every mission you complete.'}
            </p>
            <ul className="sgx-forge__bullets">
              <li>{es ? 'Días 1 y 2: lo usas por YouTube Live desde cualquier lugar.' : 'Days 1 and 2: use it on YouTube Live from anywhere.'}</li>
              <li>{es ? 'Día 3: el mismo QR es tu entrada en Chroma Space Studios.' : 'Day 3: the same QR is your entrance at Chroma Space Studios.'}</li>
              <li>{es ? 'Cada pilar completado deja un sello en tu pase.' : 'Every pillar you complete leaves a stamp on your pass.'}</li>
            </ul>
            <div className="sgx-forge__actions">
              <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => go('name')}>[ {es ? 'Comenzar la forja' : 'Start the forge'} ]</button></span>
              <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Ahora no' : 'Not now'}</button>
            </div>
          </section>
        )}

        {step === 'name' && (
          <form className="sgx-forge__stage" onSubmit={submitName}>
            <p className="sgx-forge__kicker">01 · {es ? 'Identifícate' : 'Identify yourself'}</p>
            <h2>{es ? '¿Cómo te llamas, piloto?' : 'What is your name, pilot?'}</h2>
            <div className="sgx-forge__fields">
              <label className="sgx-forge__field">
                <span>{es ? 'Nombre completo' : 'Full name'}</span>
                <input ref={nameRef} value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={80} autoComplete="name" required />
              </label>
              <label className="sgx-forge__field">
                <span>{es ? 'Correo' : 'Email'}</span>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={120} autoComplete="email" required />
              </label>
              <label className="sgx-forge__field">
                <span>{es ? 'Organización (opcional)' : 'Organization (optional)'}</span>
                <input value={organization} onChange={(e) => setOrganization(e.target.value)} maxLength={80} autoComplete="organization" />
              </label>
              <label className="sgx-forge__field">
                <span>{es ? 'Rol (opcional)' : 'Role (optional)'}</span>
                <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} maxLength={80} placeholder={es ? 'Creador, founder, estudiante…' : 'Creator, founder, student…'} />
              </label>
            </div>
            <fieldset className="sgx-forge__tiers">
              <legend>{es ? '¿Cómo vives el Summit?' : 'How will you join?'}</legend>
              <label className={tier === 'DIGITAL' ? 'is-on' : ''}>
                <input type="radio" name="tier" checked={tier === 'DIGITAL'} onChange={() => setTier('DIGITAL')} />
                <strong>{es ? 'Digital global' : 'Global digital'}</strong>
                <span>{es ? 'Los 3 días por YouTube Live. Confirmado al instante.' : 'All 3 days on YouTube Live. Confirmed instantly.'}</span>
              </label>
              <label className={tier === 'SHOWCASE' ? 'is-on' : ''}>
                <input type="radio" name="tier" checked={tier === 'SHOWCASE'} onChange={() => setTier('SHOWCASE')} />
                <strong>{es ? 'Día 3 presencial' : 'Day 3 in person'}</strong>
                <span>{es ? 'Chroma Space Studios, San Juan. Por invitación y cupo limitado: queda en revisión.' : 'Chroma Space Studios, San Juan. By invitation, limited capacity: goes to review.'}</span>
              </label>
            </fieldset>
            {error && <p className="sgx-forge__error" role="alert">{error}</p>}
            <p className="sgx-forge__fine">{es ? 'Usamos tu nombre y correo solo para el Summit. Tu correo no aparece en el QR.' : 'We use your name and email only for the Summit. Your email is not in the QR.'}</p>
            <div className="sgx-forge__actions">
              <span className="sgx-glow"><button type="submit" className="sgx-btn">[ {es ? 'Siguiente' : 'Next'} ]</button></span>
            </div>
          </form>
        )}

        {step === 'pillar' && (
          <section className="sgx-forge__stage">
            <p className="sgx-forge__kicker">02 · {es ? 'Afinidad' : 'Affinity'}</p>
            <h2>{es ? '¿Qué pilar te mueve?' : 'Which pillar moves you?'}</h2>
            <div className="sgx-forge__pillars">
              {pillarCards.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={`sgx-forge__pillar ${affinity === p.key ? 'is-on' : ''}`}
                  style={{ ['--pillar-accent' as string]: PILLAR_ACCENT[p.key] }}
                  onClick={() => { playUiChirp(520 + p.index * 60); setAffinity(p.key); }}
                  aria-pressed={affinity === p.key}
                >
                  <img src={p.iconUrl} alt="" />
                  <span className="sgx-forge__pillar-name">{p.name}</span>
                  <span className="sgx-forge__pillar-line">{bi(p.title, language)}</span>
                </button>
              ))}
            </div>
            <div className="sgx-forge__actions">
              <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => go('name')}>{es ? 'Atrás' : 'Back'}</button>
              <span className="sgx-glow"><button type="button" className="sgx-btn" disabled={!affinity} onClick={() => go('pilot')}>[ {es ? 'Siguiente' : 'Next'} ]</button></span>
            </div>
          </section>
        )}

        {step === 'pilot' && (
          <section className="sgx-forge__stage">
            <p className="sgx-forge__kicker">03 · {es ? 'Tu piloto' : 'Your pilot'}</p>
            <h2>{es ? 'Elige tu piloto' : 'Pick your pilot'}</h2>
            <div className="sgx-forge__pilots">
              {options.map((s) => (
                <button key={s} type="button" className={`sgx-forge__pilot ${seed === s ? 'is-on' : ''}`} onClick={() => { playUiChirp(780); setSeed(s); }} aria-pressed={seed === s}>
                  <SgxPilotGlyph seed={s} accent={accent} size={110} />
                </button>
              ))}
            </div>
            <div className="sgx-forge__actions">
              <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => { const n = seeds(); setOptions(n); setSeed(n[0]); playUiChirp(400); }}>
                ⟳ {es ? 'Otros pilotos' : 'More pilots'}
              </button>
              <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => go('pillar')}>{es ? 'Atrás' : 'Back'}</button>
              <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={print}>[ ⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'} ]</button></span>
            </div>
            <p className="sgx-forge__fine">{es ? 'Luego puedes diseñarlo a detalle en Avatar Studio, desde tu Hangar.' : 'You can design it in detail later in Avatar Studio, from your Hangar.'}</p>
          </section>
        )}

        {(step === 'print' || step === 'done') && (
          <section className="sgx-forge__stage sgx-forge__print">
            {step === 'print' && <div className="sgx-forge__strike" aria-hidden="true"><img src="/brand/sgx-bolt.svg" alt="" /></div>}
            <SgxPassCard printing={step === 'print'} />
            {step === 'done' && (
              <>
                <h2 className="sgx-forge__done">{es ? 'Pase forjado' : 'Pass forged'}</h2>
                <p className="sgx-forge__fine">
                  {es
                    ? 'Está guardado en este dispositivo y en tu Hangar. Completa misiones en los 6 pilares para llenarlo de sellos.'
                    : 'It lives on this device and in your Hangar. Complete missions across the 6 pillars to fill it with stamps.'}
                </p>
                <div className="sgx-forge__actions">
                  <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={onOpenHangar}>[ {es ? 'Abrir mi Hangar' : 'Open my Hangar'} ]</button></span>
                  <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Seguir explorando' : 'Keep exploring'}</button>
                </div>
              </>
            )}
          </section>
        )}
      </div>
    </div>
  );
};

export default SgxForge;
