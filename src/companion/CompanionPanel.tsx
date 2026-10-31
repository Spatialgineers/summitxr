import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GoogleSignInButton } from '../components/common/GoogleSignInButton';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';
import { PILLAR_BY_KEY } from '../lib/sgxPillars';
import { companionStatus, type CompanionMode } from './companionApi';
import { askHighbot, clearCompanion, sampleAnswer, setCompanionOwner, useCompanion, type ChatTurn } from './companionStore';
import { currentPlace, guideTargets } from './guide';

/* The chat with your Highbot. Same conversation in Tu Estudio and in the
   floating head's popover. With a forged SGX Pass you can ask anything about
   the Summit and Spatialgineers, and it can take you to a page or point at
   a button; without one, three sample answers and the way to forge. */

const SAMPLES = {
  es: [
    { q: '¿Cuándo y dónde es el Summit?', a: 'Del 11 al 13 de diciembre de 2026. Los Días 1 y 2 son gratis por YouTube Live, con Los Mismos TV transmitiendo junto a nosotros. El Día 3 es el SGX Showcase presencial en Chroma Space Studios, San Juan, por invitación.' },
    { q: '¿Qué es el SGX Pass?', a: 'Tu credencial gratis del Summit, que también es tu Holo Card: te da tu QR de networking, la entrada del Día 3, las misiones y el XP. Se forja en un minuto, y con él despierto yo para contestarte lo que quieras.' },
    { q: '¿Qué son los seis pilares?', a: 'El SGX Framework de Spatialgineers: Story, Showcase, Spark, Stage, System y Synthesize. Cada pilar tiene su bloque el Día 1 y su conversación de industria el Día 2.' },
  ],
  en: [
    { q: 'When and where is the Summit?', a: 'December 11 to 13, 2026. Days 1 and 2 are free on YouTube Live, with Los Mismos TV streaming alongside us. Day 3 is the in-person SGX Showcase at Chroma Space Studios, San Juan, by invitation.' },
    { q: 'What is the SGX Pass?', a: 'Your free Summit credential, which is also your Holo Card: it gives you your networking QR, your Day 3 entrance, missions and XP. It takes a minute to forge, and with it I wake up to answer anything you ask.' },
    { q: 'What are the six pillars?', a: 'The Spatialgineers SGX Framework: Story, Showcase, Spark, Stage, System and Synthesize. Each pillar has its block on Day 1 and its industry conversation on Day 2.' },
  ],
};

const STARTERS = {
  es: ['¿Qué pasa el Día 1?', 'Llévame a la agenda', '¿Quiénes son Spatialgineers?', '¿Cómo gano XP?'],
  en: ['What happens on Day 1?', 'Take me to the agenda', 'Who are Spatialgineers?', 'How do I earn XP?'],
};

/** Plain text with links, emails and **bold**; no HTML from the model. */
function Rich({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+|[\w.+-]+@[\w-]+\.[\w.]+|\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^https?:\/\//.test(p)) return <a key={i} href={p} target="_blank" rel="noopener noreferrer">{p.replace(/^https?:\/\/(www\.)?/, '')}</a>;
        if (/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(p)) return <a key={i} href={`mailto:${p}`}>{p}</a>;
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i}>{p.slice(2, -2)}</strong>;
        return <React.Fragment key={i}>{p}</React.Fragment>;
      })}
    </>
  );
}

interface Props {
  variant: 'studio' | 'pop';
  onClose?: () => void;
  /** Small portrait for the header (the pop-up). */
  head?: React.ReactNode;
}

export const CompanionPanel: React.FC<Props> = ({ variant, onClose, head }) => {
  const { language } = useLanguage();
  const lang: 'es' | 'en' = language === 'en' ? 'en' : 'es';
  const es = lang === 'es';
  const sgx = useOptionalSgxIdentity();
  const pass = sgx?.isForged ? sgx.identity.pass : null;
  const { turns, busy } = useCompanion();
  const { user } = useAuth();
  const withGoogle = !!user && !user.isAnonymous && !!user.email;
  const [mode, setMode] = useState<CompanionMode | null>(null);
  const [draft, setDraft] = useState('');
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setCompanionOwner(pass?.code || ''); }, [pass?.code]);
  useEffect(() => { let alive = true; companionStatus().then((m) => { if (alive) setMode(m); }); return () => { alive = false; }; }, []);
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [turns]);
  useEffect(() => { if (variant === 'pop' && pass && mode && mode !== 'off') inputRef.current?.focus(); }, [variant, pass, mode]);

  const live = mode === 'live' || mode === 'mock';
  // a forged pass and a Google account: guests can read the samples, not chat
  const canTalk = !!pass && live && withGoogle;
  const needGoogle = !!pass && live && !withGoogle;
  const name = pass ? (pass.fullName.split(/\s+/)[0] || sgx?.identity.callsign || '') : '';
  const affinity = sgx?.identity.affinity ? PILLAR_BY_KEY[sgx.identity.affinity].name : '';

  const send = (text: string) => {
    if (!pass || !canTalk) return;
    const q = text.trim();
    if (!q || busy) return;
    setDraft('');
    const place = currentPlace();
    askHighbot(q, { ...place, lang, name, pillar: affinity, targets: guideTargets() }, { email: pass.email, code: pass.code });
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(draft); }
  };

  const greeting = useMemo(() => {
    if (!pass) return es ? 'Soy tu Highbot. Forja tu SGX Pass y despierto para contestarte todo del Summit y llevarte por la app. Mientras, pruébame:' : 'I am your Highbot. Forge your SGX Pass and I wake up to answer everything about the Summit and walk you through the app. Meanwhile, try me:';
    if (mode === 'off') return es ? `¡Hola${name ? `, ${name}` : ''}! Todavía estoy despertando; muy pronto podrás hablar conmigo. Mientras, esto ya me lo sé:` : `Hi${name ? `, ${name}` : ''}! I am still waking up; very soon you will be able to talk to me. Meanwhile, I already know this:`;
    if (mode === 'paused') return es ? `¡Hola${name ? `, ${name}` : ''}! Estoy descansando un rato y vuelvo pronto. Mientras, esto ya me lo sé:` : `Hi${name ? `, ${name}` : ''}! I am taking a short break and will be back soon. Meanwhile, I already know this:`;
    if (!withGoogle) return es ? `¡Hola${name ? `, ${name}` : ''}! Soy tu Highbot. Para hablar conmigo conecta tu cuenta de Google: así sé que eres tú y tu progreso queda guardado. Mientras, esto ya me lo sé:` : `Hi${name ? `, ${name}` : ''}! I am your Highbot. To talk to me, connect your Google account: that way I know it is you and your progress is saved. Meanwhile, I already know this:`;
    return es ? `¡Hola${name ? `, ${name}` : ''}! Soy tu Highbot. Pregúntame lo que quieras del Summit o de Spatialgineers, o pídeme que te lleve a cualquier página.` : `Hi${name ? `, ${name}` : ''}! I am your Highbot. Ask me anything about the Summit or Spatialgineers, or ask me to take you to any page.`;
  }, [pass, mode, name, es, withGoogle]);

  const visible = turns.filter((t: ChatTurn) => t.text || (busy && t.role === 'assistant'));
  const last = visible[visible.length - 1];
  const chips = canTalk ? STARTERS[lang] : SAMPLES[lang].map((s) => s.q);

  return (
    <section className={`sgx-companion sgx-companion--${variant}`} aria-label={es ? 'Chat con tu Highbot' : 'Chat with your Highbot'}>
      {variant === 'pop' && (
        <header className="sgx-companion__head">
          {head}
          <div className="sgx-companion__title">
            <strong>{es ? 'Tu Highbot' : 'Your Highbot'}</strong>
            <span>{canTalk ? (busy ? (es ? 'pensando…' : 'thinking…') : (es ? 'en línea' : 'online')) : mode === 'paused' ? (es ? 'en pausa' : 'paused') : (es ? 'modo muestra' : 'sample mode')}</span>
          </div>
          {turns.length > 0 && <button type="button" className="sgx-companion__icon" onClick={clearCompanion} aria-label={es ? 'Borrar conversación' : 'Clear conversation'} title={es ? 'Borrar conversación' : 'Clear conversation'}>↺</button>}
          {onClose && <button type="button" className="sgx-companion__icon" onClick={onClose} aria-label={es ? 'Cerrar chat' : 'Close chat'}>×</button>}
        </header>
      )}

      <div className="sgx-companion__log" ref={logRef} role="log" aria-live="polite" aria-busy={busy}>
        <p className="sgx-companion__msg is-bot">{greeting}</p>
        {visible.map((t) => (
          <p key={t.id} className={`sgx-companion__msg ${t.role === 'user' ? 'is-me' : 'is-bot'} ${t.error ? 'is-error' : ''}`}>
            {t.text ? <Rich text={t.text} /> : <span className="sgx-companion__dots" aria-label={es ? 'Escribiendo' : 'Typing'}><i /><i /><i /></span>}
          </p>
        ))}
      </div>

      {(!last || last.role === 'assistant') && !busy && (
        <div className="sgx-companion__chips">
          {chips.map((q, i) => (
            <button
              key={q}
              type="button"
              className="sgx-companion__chip"
              onClick={() => (canTalk ? send(q) : sampleAnswer(q, SAMPLES[lang][i].a))}
            >{q}</button>
          ))}
        </div>
      )}

      {canTalk ? (
        <form className="sgx-companion__form" onSubmit={(e) => { e.preventDefault(); send(draft); }}>
          <textarea
            ref={inputRef}
            rows={1}
            value={draft}
            maxLength={600}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            placeholder={es ? 'Pregúntale a tu Highbot…' : 'Ask your Highbot…'}
            aria-label={es ? 'Tu pregunta' : 'Your question'}
          />
          <button type="submit" className="sgx-btn sgx-btn--sm" disabled={busy || !draft.trim()}>{es ? 'Enviar' : 'Send'}</button>
        </form>
      ) : needGoogle ? (
        <div className="sgx-companion__cta">
          <GoogleSignInButton variant="compact" buttonText={es ? 'Conectar con Google' : 'Connect with Google'} />
        </div>
      ) : !pass ? (
        <div className="sgx-companion__cta">
          <span className="sgx-glow"><button type="button" className="sgx-btn sgx-btn--sm" onClick={() => window.dispatchEvent(new CustomEvent('sgx:open_forge'))}>⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'}</button></span>
        </div>
      ) : null}
      {variant === 'studio' && canTalk && (
        <p className="sgx-companion__fine">{es ? 'Tu Highbot usa Claude y solo sabe del Summit, de Spatialgineers y de esta app. Puede equivocarse: lo oficial está en la agenda.' : 'Your Highbot runs on Claude and only knows the Summit, Spatialgineers and this app. It can make mistakes: the agenda is the official source.'}</p>
      )}
    </section>
  );
};

export default CompanionPanel;
