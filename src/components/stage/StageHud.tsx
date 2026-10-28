import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import type { EventSession, Question, ReactionBurst, VoteSummary } from '../../types/engine';
import { useLanguage } from '../../context/LanguageContext';
import './stage.css';

/* What the room sees on the venue screen: brand, the live decision with its
   results, a countdown, a QR to vote from the phone, and the audience's
   reactions floating up. Read-only: nothing here changes the visual. */

interface StageHudProps {
  session: EventSession;
  question?: Question | null;
  summary?: VoteSummary | null;
  reactions: ReactionBurst[];
}

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const StageHud: React.FC<StageHudProps> = ({ session, question, summary, reactions }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [qr, setQr] = useState<string | null>(null);
  const joinUrl = `${window.location.origin}/play`;
  const joinLabel = `${window.location.host}/play`;

  useEffect(() => {
    QRCode.toDataURL(joinUrl, { margin: 1, width: 360, color: { dark: '#050505', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [joinUrl]);

  const status = session.status;
  const live = !!question && (status === 'VOTING_ACTIVE' || status === 'VOTING_CLOSED' || status === 'RESULT_REVEALED');
  const revealed = status === 'RESULT_REVEALED' && !!summary?.winningOptionId;
  const total = summary?.totalVotes ?? 0;
  const duration = question?.durationSeconds || 30;
  const remaining = Math.max(0, Math.round(session.timeRemaining ?? 0));
  const frac = Math.min(1, remaining / duration);

  const statusLabel = {
    IDLE: es ? 'En espera' : 'Standing by',
    VOTING_ACTIVE: es ? 'Votación abierta' : 'Voting open',
    VOTING_CLOSED: es ? 'Contando votos' : 'Counting votes',
    RESULT_REVEALED: es ? 'Resultado' : 'Result',
    EVENT_ENDED: es ? 'Sesión cerrada' : 'Session closed',
  }[status];

  // Reactions float up for a few seconds; keep only the recent ones on screen.
  const floating = useMemo(() => {
    const now = Date.now();
    return reactions.filter((r) => now - r.timestamp < 4500).slice(-24);
  }, [reactions]);

  return (
    <div className="sgx-stage-hud" aria-live="polite">
      <header className="sgx-stage-hud__brand">
        <span className="sgx-stage-hud__live">SGX LIVE</span>
        <span className="sgx-stage-hud__event">Spatialgineers Summit 2026</span>
        <span className={`sgx-stage-hud__status is-${status.toLowerCase()}`}>
          <i aria-hidden="true" />
          {statusLabel}
        </span>
      </header>

      {status === 'VOTING_ACTIVE' && question && (
        <div className="sgx-stage-hud__timer" role="timer" aria-label={es ? `${remaining} segundos` : `${remaining} seconds`}>
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="52" className="track" />
            <circle cx="60" cy="60" r="52" className="fill" style={{ strokeDashoffset: `${(1 - frac) * 326.7}` }} />
          </svg>
          <strong>{remaining}</strong>
          <span>{es ? 'seg' : 'sec'}</span>
        </div>
      )}

      <section className={`sgx-stage-hud__panel ${live ? 'is-live' : 'is-idle'}`}>
        <div className="sgx-stage-hud__main">
          {live && question ? (
            <>
              <p className="sgx-stage-hud__kicker">
                {status === 'VOTING_CLOSED'
                  ? (es ? 'Votación cerrada · contando' : 'Voting closed · counting')
                  : revealed
                    ? (es ? 'La audiencia decidió' : 'The audience decided')
                    : (es ? 'Decisión en vivo' : 'Live decision')}
                {total > 0 && <span> · {total} {es ? (total === 1 ? 'voto' : 'votos') : (total === 1 ? 'vote' : 'votes')}</span>}
              </p>
              <h1 className="sgx-stage-hud__question">{question.prompt}</h1>
              <ol className="sgx-stage-hud__options" style={{ ['--cols' as string]: Math.min(question.options.length, 4) }}>
                {question.options.map((opt, i) => {
                  const pct = Math.round(summary?.optionPercentages[opt.id] ?? 0);
                  const isWinner = revealed && summary?.winningOptionId === opt.id;
                  return (
                    <li
                      key={opt.id}
                      className={`sgx-stage-hud__option${isWinner ? ' is-winner' : ''}${revealed && !isWinner ? ' is-dim' : ''}`}
                      style={{ ['--opt' as string]: opt.color }}
                    >
                      <span className="sgx-stage-hud__letter">{LETTERS[i] ?? i + 1}</span>
                      <span className="sgx-stage-hud__label">{opt.label}</span>
                      <span className="sgx-stage-hud__pct">{pct}%</span>
                      <span className="sgx-stage-hud__bar"><span style={{ width: `${pct}%` }} /></span>
                      {isWinner && <span className="sgx-stage-hud__win">{es ? 'Ganadora' : 'Winner'}</span>}
                    </li>
                  );
                })}
              </ol>
            </>
          ) : (
            <>
              <p className="sgx-stage-hud__kicker">{status === 'EVENT_ENDED' ? (es ? 'Gracias por dirigir' : 'Thanks for directing') : 'SGX Live'}</p>
              <h1 className="sgx-stage-hud__question">
                {status === 'EVENT_ENDED'
                  ? (es ? 'Esta sesión terminó. Nos vemos en la próxima.' : 'This session is over. See you at the next one.')
                  : (es ? 'La audiencia dirige el escenario' : 'The audience directs the stage')}
              </h1>
              {status !== 'EVENT_ENDED' && (
                <p className="sgx-stage-hud__sub">
                  {es
                    ? 'Escanea el código, entra con tu SGX Pass y vota cuando abra la próxima decisión. Cada voto cambia lo que ves aquí.'
                    : 'Scan the code, sign in with your SGX Pass and vote when the next decision opens. Every vote changes what you see here.'}
                </p>
              )}
            </>
          )}
        </div>

        {qr && status !== 'EVENT_ENDED' && (
          <a className="sgx-stage-hud__join" href="/play">
            <img src={qr} alt="" width={180} height={180} />
            <strong>{es ? 'Vota desde tu teléfono' : 'Vote from your phone'}</strong>
            <span>{joinLabel}</span>
          </a>
        )}
      </section>

      <div className="sgx-stage-hud__reactions" aria-hidden="true">
        {floating.map((r, i) => (
          <span key={r.id} style={{ ['--x' as string]: `${(i * 37) % 100}%`, ['--c' as string]: r.color }}>{r.emoji}</span>
        ))}
      </div>
    </div>
  );
};
