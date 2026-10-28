import { auth } from '../lib/firebase';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { bi, SGX_PILLARS, type PillarKey } from '../lib/sgxPillars';
import { playCyberBurstSound, playScanSuccessSound, playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT, type PassTier } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { PilotBuilder } from './PilotBuilder';
import { randomPilot, type PilotConfig } from './pilotAvatar';
import { SgxPassCard } from './SgxPassCard';

/* FORJA DE IDENTIDAD: one ~60 second ceremony replaces the taquilla form, the
   Holo Card generator, the role selector and both tours. Name → pillar →
   pilot → the bolt prints your SGX Pass. Whoever finished it never sees a
   registration form again. */

type Step = 'intro' | 'name' | 'pillar' | 'pilot' | 'print' | 'done';
const ORDER: Step[] = ['intro', 'name', 'pillar', 'pilot', 'print', 'done'];


interface Props {
  onClose: () => void;
  onOpenHangar: () => void;
  initialTier?: PassTier;
}

export const SgxForge: React.FC<Props> = ({ onClose, onOpenHangar, initialTier = 'DIGITAL' }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user, signInWithGoogle, authError, loading: authLoading } = useAuth();
  const googleUser = user && !user.isAnonymous ? user : null;
  const [signingIn, setSigningIn] = useState(false);
  const { forge, identity } = useSgxIdentity();
  const [step, setStep] = useState<Step>('intro');
  const [fullName, setFullName] = useState(identity.pass?.fullName || user?.displayName || '');
  const [email, setEmail] = useState(identity.pass?.email || user?.email || '');
  const [organization, setOrganization] = useState(identity.pass?.organization || '');
  const [roleTitle, setRoleTitle] = useState(identity.pass?.roleTitle || '');
  const [tier, setTier] = useState<PassTier>(identity.pass?.tier || initialTier);
  const [affinity, setAffinity] = useState<PillarKey | null>(identity.affinity);
  const seed = identity.avatar.seed;
  // Re-forging keeps your pilot; a new pass starts from a random one you then make your own.
  const [pilot, setPilot] = useState<PilotConfig>(() => identity.avatar.pilot || randomPilot(identity.affinity ? PILLAR_ACCENT[identity.affinity] : undefined));
  const [imageConsent, setImageConsent] = useState<boolean>(identity.pass?.imageConsent === true);
  const [error, setError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  const accent = affinity ? PILLAR_ACCENT[affinity] : '#FDCC0D';
  const stepIndex = ORDER.indexOf(step);

  useEffect(() => {
    if (step === 'name') window.setTimeout(() => nameRef.current?.focus(), 60);
  }, [step]);

  // Signed in with Google: the pass starts with your name and email.
  useEffect(() => {
    if (!googleUser) return;
    setFullName((v) => v || googleUser.displayName || '');
    setEmail((v) => v || googleUser.email || '');
  }, [googleUser]);

  const continueWithGoogle = async () => {
    playUiChirp(880);
    setSigningIn(true);
    try { await signInWithGoogle(); } finally { setSigningIn(false); }
    if (auth.currentUser && !auth.currentUser.isAnonymous) go('name');
  };

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
    if (!imageConsent) { setError(es ? 'Para registrarte, acepta el consentimiento de imagen.' : 'To register, accept the image consent.'); return; }
    setError('');
    go('pillar');
  };

  const print = () => {
    if (!affinity) return;
    setStep('print');
    playCyberBurstSound('kudos');
    forge({ fullName, email, tier, affinity, roleTitle, organization, avatarSeed: seed, avatarPilot: pilot, imageConsent });
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
              <li>{es ? 'Día 3: si recibes invitación por correo, este mismo QR es tu entrada en Chroma Space Studios.' : 'Day 3: if you receive an email invitation, this same QR is your entrance at Chroma Space Studios.'}</li>
              <li>{es ? 'Cada pilar completado deja un sello en tu pase.' : 'Every pillar you complete leaves a stamp on your pass.'}</li>
            </ul>
            {googleUser ? (
              <div className="sgx-forge__actions">
                <p className="sgx-forge__account">{es ? 'Conectado como' : 'Signed in as'} <strong>{googleUser.email}</strong></p>
                <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={() => go('name')}>[ {es ? 'Comenzar la forja' : 'Start the forge'} ]</button></span>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Ahora no' : 'Not now'}</button>
              </div>
            ) : (
              <>
                <div className="sgx-forge__login">
                  <button type="button" className="sgx-forge__google" onClick={continueWithGoogle} disabled={signingIn || authLoading}>
                    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.97 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15C6.23 6.86 8.88 4.75 12 4.75z" />
                    </svg>
                    <span>{signingIn ? (es ? 'Conectando con Google…' : 'Connecting to Google…') : (es ? 'Continuar con Google' : 'Continue with Google')}</span>
                  </button>
                  <p>{es ? 'Recomendado: tu nombre y correo se llenan solos y tu pase te sigue a cualquier dispositivo.' : 'Recommended: your name and email fill in by themselves and your pass follows you to any device.'}</p>
                  {authError && !signingIn && <p className="sgx-forge__error" role="alert">{authError === 'POPUP_BLOCKED' ? (es ? 'El navegador bloqueó la ventana de Google. Permite ventanas emergentes e inténtalo otra vez.' : 'The browser blocked the Google window. Allow pop-ups and try again.') : authError}</p>}
                </div>
                <div className="sgx-forge__actions">
                  <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => go('name')}>{es ? 'Seguir sin cuenta' : 'Continue without an account'}</button>
                  <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Ahora no' : 'Not now'}</button>
                </div>
              </>
            )}
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
                <span>{es ? 'Los 3 días por YouTube Live, en español. Gratis y confirmado al instante.' : 'All 3 days on YouTube Live, in Spanish. Free and confirmed instantly.'}</span>
              </label>
              <label className={tier === 'SHOWCASE' ? 'is-on' : ''}>
                <input type="radio" name="tier" checked={tier === 'SHOWCASE'} onChange={() => setTier('SHOWCASE')} />
                <strong>{es ? 'Día 3 presencial' : 'Day 3 in person'}</strong>
                <span>{es ? 'Chroma Space Studios, San Juan. Por invitación y cupo limitado: recibes la invitación por correo. Último llamado: 1 de diciembre.' : 'Chroma Space Studios, San Juan. By invitation, limited capacity: invitations arrive by email. Last call: December 1.'}</span>
              </label>
            </fieldset>
            <label className="sgx-forge__consent">
              <input type="checkbox" checked={imageConsent} onChange={(e) => setImageConsent(e.target.checked)} required />
              <span>{es
                ? 'Acepto que Spatialgineers use fotos y video en los que aparezca durante el Summit (transmisión, redes y materiales del evento).'
                : 'I agree that Spatialgineers may use photos and video in which I appear during the Summit (broadcast, social media and event materials).'}</span>
            </label>
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
            <h2>{es ? 'Construye tu piloto' : 'Build your pilot'}</h2>
            <PilotBuilder value={pilot} onChange={setPilot} accent={accent} compact />
            <div className="sgx-forge__actions">
              <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => go('pillar')}>{es ? 'Atrás' : 'Back'}</button>
              <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={print}>[ ⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'} ]</button></span>
            </div>
            <p className="sgx-forge__fine">{es ? 'Lo puedes cambiar cuando quieras desde tu Hangar.' : 'You can change it any time from your Hangar.'}</p>
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
                  <a className="sgx-btn sgx-btn--ground" href="https://www.youtube.com/@spatialgineers" target="_blank" rel="noopener noreferrer">{es ? 'Canal de YouTube' : 'YouTube channel'}</a>
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
