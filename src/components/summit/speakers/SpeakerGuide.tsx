import React, { useEffect } from 'react';
import { BadgeCheck, Clock3, Mail, Plus } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { SUMMIT_CONTACT_EMAIL } from '../../../lib/summitDeadlines';
import {
  SPEAKER_CONTACTS, SPEAKER_GUIDE_ANCHOR, SPEAKER_RECEIVE, SPEAKER_ROUTE, SPEAKER_RULES, SPEAKER_SEND, SPEAKER_SESSION, SPEAKER_TECH,
} from '../../../lib/speakerGuide';
import { hashIs, scrollToAnchorWhenReady } from '../../../lib/anchorScroll';
import '../sgxGuides.css';

export type SpeakerGuideStage = 'public' | 'before' | 'review' | 'official';

interface SpeakerGuideProps {
  /** Where the speaker is: the welcome page (public), the portal form (before), after sending (review) or approved (official). */
  stage?: SpeakerGuideStage;
  /** Smaller, for the Speaker portal dialog. */
  compact?: boolean;
  /** Anchor id; only the welcome page uses #guia. */
  anchorId?: string;
  idPrefix?: string;
}

type Block = 'send' | 'session' | 'tech' | 'rules' | 'receive' | 'route';

/* "Guía del speaker": what to send, the 5/30/10 session, the technical test
   and the tone rules, from the speaker kit (data in lib/speakerGuide.ts,
   dates in lib/summitDeadlines.ts). */
export const SpeakerGuide: React.FC<SpeakerGuideProps> = ({ stage = 'public', compact = false, anchorId, idPrefix = 'spk' }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (b: { es: string; en: string }) => (es ? b.es : b.en);
  const titleId = `${idPrefix}-guide-title`;

  useEffect(() => (anchorId && hashIs(anchorId) ? scrollToAnchorWhenReady(anchorId) : undefined), [anchorId]);

  // The block that matters most at each moment starts open.
  const openFirst: Block = stage === 'review' ? 'route' : stage === 'official' ? 'tech' : 'send';

  const blocks: { id: Block; title: string; body: React.ReactNode }[] = [
    {
      id: 'send',
      title: es ? 'Qué necesitamos de ti' : 'What we need from you',
      body: (
        <>
          <ul className="sgx-guide__lines">
            {SPEAKER_SEND.map((i) => (
              <li key={i.text.es}>
                {t(i.text)}
                <span className={`sgx-guide__tag ${i.where === 'email' ? 'is-email' : ''}`}>{i.where === 'email' ? (es ? 'por correo' : 'by email') : (es ? 'en el portal' : 'in the portal')}</span>
              </li>
            ))}
          </ul>
          <p className="sgx-guide__fine">
            {es ? 'Todo se envía en el formulario del portal. No necesitas foto: tu imagen en el Summit es tu Highbot.' : 'Everything goes in the portal form. No photo needed: your image at the Summit is your Highbot.'}
          </p>
        </>
      ),
    },
    {
      id: 'session',
      title: es ? 'Tu sesión: 45 minutos' : 'Your session: 45 minutes',
      body: (
        <>
          <div className="sgx-guide__bar" role="list" aria-label={es ? 'Estructura de la conversación' : 'Conversation structure'}>
            {SPEAKER_SESSION.parts.map((p) => (
              <div key={p.min} role="listitem"><b>{p.min} min</b><span>{t(p.label)}</span></div>
            ))}
          </div>
          <ul className="sgx-guide__lines">
            {SPEAKER_SESSION.lines.map((l) => <li key={l.es}>{t(l)}</li>)}
          </ul>
        </>
      ),
    },
    {
      id: 'tech',
      title: es ? 'Prueba técnica y conexión' : 'Technical test and connection',
      body: <ul className="sgx-guide__lines">{SPEAKER_TECH.map((l) => <li key={l.es}>{t(l)}</li>)}</ul>,
    },
    {
      id: 'rules',
      title: es ? 'Tono y reglas' : 'Tone and rules',
      body: <ul className="sgx-guide__lines">{SPEAKER_RULES.map((l) => <li key={l.es}>{t(l)}</li>)}</ul>,
    },
    {
      id: 'receive',
      title: es ? 'Qué recibes' : 'What you get',
      body: <ul className="sgx-guide__lines">{SPEAKER_RECEIVE.map((l) => <li key={l.es}>{t(l)}</li>)}</ul>,
    },
    {
      id: 'route',
      title: es ? 'Tu ruta hasta el 12 de diciembre' : 'Your route to December 12',
      body: (
        <ol className="sgx-guide__route">
          {SPEAKER_ROUTE.map((r) => <li key={r.when.es}><b>{t(r.when)}</b><span>{t(r.what)}</span></li>)}
        </ol>
      ),
    },
  ];

  return (
    <section id={anchorId} className={`sgx-guide sgx-guide--cyan ${compact ? 'sgx-guide--compact' : ''}`} aria-labelledby={titleId} tabIndex={anchorId ? -1 : undefined} data-testid="speaker-guide" data-stage={stage}>
      <div className="sgx-guide__head">
        <p className="sgx-guide__kicker">{es ? 'Guía del speaker' : 'Speaker guide'}</p>
        <h2 id={titleId} className="sgx-guide__h2">
          {stage === 'official' ? (es ? 'Ya eres speaker oficial: lo que sigue' : 'You are an official speaker: what comes next')
            : stage === 'review' ? (es ? 'Perfil enviado: lo que sigue' : 'Profile sent: what comes next')
              : (es ? 'Todo lo que necesitas para tu sesión' : 'Everything you need for your session')}
        </h2>
        {!compact && (
          <p className="sgx-guide__lead">
            {es
              ? 'Qué enviar, cómo es tu conversación, la prueba técnica y las reglas de tono, en un solo lugar. Lo mismo que dice el kit para speakers.'
              : 'What to send, how your conversation runs, the technical test and the tone rules, in one place. The same as the speaker kit.'}
          </p>
        )}
      </div>

      {stage === 'review' && (
        <p className="sgx-guide__status" role="status"><Clock3 aria-hidden /><span>{es ? 'El equipo revisa tu perfil y te escribe al confirmar tu participación por escrito. Mientras, prepara la foto y los datos técnicos.' : 'The team reviews your profile and writes to you once your participation is confirmed in writing. Meanwhile, get your photo and technical details ready.'}</span></p>
      )}
      {stage === 'official' && (
        <p className="sgx-guide__status is-ok" role="status"><BadgeCheck aria-hidden /><span>{es ? 'Tu participación está confirmada y tu pase ya es tu Holo Card de speaker. Coordina la prueba técnica y envía lo que falte.' : 'Your participation is confirmed and your pass is now your speaker Holo Card. Schedule the technical test and send anything missing.'}</span></p>
      )}

      <div className="sgx-guide__list">
        {blocks.map((b) => (
          <details key={b.id} className="sgx-guide__item" open={b.id === openFirst || (!compact && b.id === 'session')} data-block={b.id}>
            <summary><h3>{b.title}</h3><Plus aria-hidden /></summary>
            <div className="sgx-guide__body">{b.body}</div>
          </details>
        ))}
      </div>

      <div className="sgx-guide__fine">
        {SPEAKER_CONTACTS.map((c) => <p key={c.es}>{t(c)}</p>)}
        <p><Mail aria-hidden style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 4 }} /><a href={`mailto:${SUMMIT_CONTACT_EMAIL}`}>{SUMMIT_CONTACT_EMAIL}</a></p>
      </div>
    </section>
  );
};

export { SPEAKER_GUIDE_ANCHOR };
