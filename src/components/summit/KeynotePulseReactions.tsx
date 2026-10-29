import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import confetti from 'canvas-confetti';
import { CheckCircle2, Minimize2, Radio, Sparkles, Vote } from 'lucide-react';
import { playCyberBurstSound, playUiChirp } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { SgxBolt } from '../../immersion/SgxSymbols';
import './sgxModals.css';

import { POLLS, useLiveList } from '../../lib/content/liveLists';
export type { KeynotePoll, KeynotePollOption } from '../../lib/content/liveLists';

/* KEYNOTE PULSE: a small floating console (not a modal) with reactions that
   play on your own screen and the live poll, whose votes are shared through
   Firestore. It sits left of the Missions rail so it never covers it. */

type ReactionType = 'FIREWORKS' | 'QUANTUM' | 'FLAME' | 'HEART' | 'MIND_BLOWN' | 'KUDOS';

interface FloatingReactionParticle {
  id: string;
  type: ReactionType;
  color: string;
  label: string;
}

interface KeynotePulseReactionsProps {
  onAwardXp?: (amount: number, reason: string) => void;
  className?: string;
  currentSessionTitle?: string;
}

/* SGX reaction marks: monoline, drawn on a 24 grid, colored by currentColor. */
const ReactionIcon: React.FC<{ type: ReactionType; size?: number }> = ({ type, size = 26 }) => {
  if (type === 'QUANTUM') return <SgxBolt size={size} />;
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {type === 'FIREWORKS' && (<g {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8" /><rect x="10" y="10" width="4" height="4" transform="rotate(45 12 12)" fill="currentColor" /></g>)}
      {type === 'FLAME' && (<g {...p}><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.4-5.4 3.6-8.3.4 1.9 1.4 3 2.6 3.6C11.6 7 12.7 4.6 14.6 3c.2 3.1 3.9 5.4 3.9 10.2C18.5 17.9 16 21 12 21z" /><path d="M12 21c-1.6 0-2.7-1.2-2.7-2.8 0-1.8 1.6-2.6 2.2-4.2 1 1 3.2 2.1 3.2 4.2 0 1.6-1.1 2.8-2.7 2.8z" /></g>)}
      {type === 'KUDOS' && (<g {...p}><path d="M7 4h10v4.5a5 5 0 0 1-10 0z" /><path d="M7 6H4.5v1.5A3 3 0 0 0 7.5 10.5M17 6h2.5v1.5a3 3 0 0 1-3 3M12 13.5V17M8.5 20h7l-1-3h-5z" /></g>)}
      {type === 'HEART' && (<g {...p}><path d="M12 20 4.2 12.2a4.6 4.6 0 0 1 6.5-6.5L12 7l1.3-1.3a4.6 4.6 0 0 1 6.5 6.5z" /><path d="M9 11h6M12 8v6" /></g>)}
      {type === 'MIND_BLOWN' && (<g {...p}><circle cx="12" cy="13" r="5" /><path d="M12 2v3M5.2 4.6l1.9 2.3M18.8 4.6l-1.9 2.3M2.5 11h2.8M18.7 11h2.8" /><path d="M10 13h.01M14 13h.01M10.5 15.5h3" /></g>)}
    </svg>
  );
};

export const KeynotePulseReactions: React.FC<KeynotePulseReactionsProps> = ({
  onAwardXp,
  className = '',
  currentSessionTitle,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { playerProfile, savePlayerProfile, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'REACTIONS' | 'POLL'>('REACTIONS');
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);
  const basePolls = useLiveList(POLLS);
  const [voteCounts, setVoteCounts] = useState<Record<string, Record<string, number>>>({});
  const polls = React.useMemo(() => basePolls.map((p) => ({
    ...p,
    options: p.options.map((o) => ({ ...o, votes: voteCounts[p.id]?.[o.id] || 0 })),
  })), [basePolls, voteCounts]);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, string>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [totalReactionsCount, setTotalReactionsCount] = useState<number>(0);
  const [floatingParticles, setFloatingParticles] = useState<FloatingReactionParticle[]>([]);
  const [justEarnedXp, setJustEarnedXp] = useState<string | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const REACTIONS: { type: ReactionType; color: string; name: [string, string]; sub: [string, string] }[] = [
    { type: 'FIREWORKS', color: '#00DDFF', name: ['Fuegos digitales', 'Digital fireworks'], sub: ['Los 6 pilares', 'All 6 pillars'] },
    { type: 'FLAME', color: '#FFBB00', name: ['Llamarada', 'Flare'], sub: ['Lluvia de brasas', 'Ember shower'] },
    { type: 'KUDOS', color: '#FDCC0D', name: ['Aplausos', 'Kudos'], sub: ['Lluvia dorada', 'Golden rain'] },
    { type: 'QUANTUM', color: '#FDCC0D', name: ['Onda de choque', 'Shockwave'], sub: ['Onda de energía', 'Energy wave'] },
    { type: 'HEART', color: '#5D86C6', name: ['Me encanta', 'Love it'], sub: ['Resonancia', 'Resonance'] },
    { type: 'MIND_BLOWN', color: '#00DDFF', name: ['Impresionante', 'Mind blown'], sub: ['Lluvia holográfica', 'Holo rain'] },
  ];
  const L = (pair: [string, string]) => pair[es ? 0 : 1];

  // Load user vote history from local storage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sgx_keynote_poll_votes');
      if (saved) {
        setUserVotedPolls(JSON.parse(saved));
      }
    } catch {}
  }, []);

  // Live counts: one Firestore doc per pilot per poll (`summit_poll_votes`), shared by everyone.
  useEffect(() => {
    // Firestore 'in' takes up to 30 ids.
    const pollIds = basePolls.map((p) => p.id).slice(0, 30);
    if (!pollIds.length) return undefined;
    try {
      const q = query(collection(db, 'summit_poll_votes'), where('pollId', 'in', pollIds), limit(5000));
      return onSnapshot(q, (snap) => {
        const counts: Record<string, Record<string, number>> = {};
        const mine: Record<string, string> = {};
        snap.forEach((d) => {
          const v = d.data() as { pollId: string; optionId: string; uid: string };
          counts[v.pollId] = counts[v.pollId] || {};
          counts[v.pollId][v.optionId] = (counts[v.pollId][v.optionId] || 0) + 1;
          if (user?.uid && v.uid === user.uid) mine[v.pollId] = v.optionId;
        });
        setVoteCounts(counts);
        if (Object.keys(mine).length) setUserVotedPolls((prev) => ({ ...prev, ...mine }));
      }, () => { /* offline: local view only */ });
    } catch {
      return undefined;
    }
  }, [user?.uid, basePolls]);

  // Clean up floating particles
  useEffect(() => {
    if (floatingParticles.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingParticles(prev => prev.slice(1));
    }, 1800);
    return () => clearTimeout(timer);
  }, [floatingParticles]);

  // Escape minimizes the console and gives focus back to its button.
  useEffect(() => {
    if (!isExpanded) return undefined;
    const t = window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      setIsExpanded(false);
      window.setTimeout(() => fabRef.current?.focus({ preventScroll: true }), 0);
    };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [isExpanded]);

  const minimize = () => {
    setIsExpanded(false);
    window.setTimeout(() => fabRef.current?.focus({ preventScroll: true }), 0);
  };

  const addFloatingReaction = (type: ReactionType, color: string, label: string) => {
    const newP: FloatingReactionParticle = { id: `${Date.now()}_${Math.random()}`, type, color, label };
    setFloatingParticles(prev => [...prev.slice(-8), newP]);
  };

  const handleTriggerReaction = (type: ReactionType, label: string, color: string) => {
    setTotalReactionsCount(prev => prev + 1);

    if (type === 'FIREWORKS') {
      playCyberBurstSound('spark');
    } else if (type === 'QUANTUM') {
      playCyberBurstSound('quantum');
    } else if (type === 'FLAME') {
      playCyberBurstSound('flame');
    } else if (type === 'KUDOS') {
      playCyberBurstSound('kudos');
    } else {
      playUiChirp(960);
    }

    addFloatingReaction(type, color, label);

    const origin = { x: 0.85, y: 0.8 };
    const burst: Record<ReactionType, confetti.Options> = {
      FIREWORKS: { particleCount: 50, spread: 80, colors: ['#00DDFF', '#FDCC0D', '#FFBB00', '#5D86C6', '#32527B', '#B87000'], shapes: ['circle', 'square'], scalar: 1.1 },
      FLAME: { particleCount: 40, spread: 45, colors: ['#FF5500', '#FFBB00', '#FDCC0D', '#B87000'], startVelocity: 35, scalar: 0.9 },
      KUDOS: { particleCount: 65, spread: 90, colors: ['#FDCC0D', '#FFBB00', '#FFF9E2', '#FFFFFF'], scalar: 1.2 },
      HEART: { particleCount: 35, spread: 60, colors: ['#5D86C6', '#00DDFF', '#FDCC0D'], scalar: 1.0 },
      QUANTUM: { particleCount: 45, spread: 120, colors: ['#00DDFF', '#5D86C6', '#FDCC0D'], startVelocity: 25, scalar: 0.8 },
      MIND_BLOWN: { particleCount: 40, spread: 70, colors: ['#5D86C6', '#00DDFF', '#FDCC0D'], scalar: 1.0 },
    };
    confetti({ ...burst[type], origin, disableForReducedMotion: true });
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (userVotedPolls[pollId]) return;
    if (!polls.find((p) => p.id === pollId)?.open) return;
    if (!user?.uid) {
      setVoteError(es ? 'Conectando tu pase… inténtalo en unos segundos.' : 'Connecting your pass… try again in a few seconds.');
      return;
    }
    setVoteError(null);

    // Optimistic: mark it voted; the live counts arrive from Firestore.
    const updatedUserVotes = { ...userVotedPolls, [pollId]: optionId };
    setUserVotedPolls(updatedUserVotes);
    try {
      localStorage.setItem('sgx_keynote_poll_votes', JSON.stringify(updatedUserVotes));
    } catch {}
    try {
      await setDoc(doc(db, 'summit_poll_votes', `${pollId}_${user.uid}`), { pollId, optionId, uid: user.uid, at: serverTimestamp() });
    } catch (err) {
      console.warn('[Keynote Poll] vote not recorded:', err);
      const reverted = { ...updatedUserVotes };
      delete reverted[pollId];
      setUserVotedPolls(reverted);
      try { localStorage.setItem('sgx_keynote_poll_votes', JSON.stringify(reverted)); } catch {}
      setVoteError(es ? 'No se pudo registrar tu voto. Revisa tu conexión e inténtalo de nuevo.' : "Your vote couldn't be recorded. Check your connection and try again.");
      return;
    }

    playCyberBurstSound('kudos');
    confetti({
      particleCount: 55,
      spread: 75,
      origin: { x: 0.85, y: 0.75 },
      colors: ['#FDCC0D', '#00DDFF', '#FFBB00'],
      disableForReducedMotion: true,
    });

    const earnedXp = 25;
    if (onAwardXp) {
      onAwardXp(earnedXp, (es ? 'Voto en Encuesta de Keynote' : 'Keynote Poll Vote'));
    }
    if (savePlayerProfile && playerProfile) {
      savePlayerProfile({
        totalScore: (playerProfile.totalScore || 0) + earnedXp,
        totalInteractions: (playerProfile.totalInteractions || 0) + 1
      });
    }

    setJustEarnedXp((es ? `+${earnedXp} XP · voto registrado` : `+${earnedXp} XP · vote recorded`));
    setTimeout(() => setJustEarnedXp(null), 3200);
  };

  const currentPoll = polls[selectedPollIndex] || polls[0];
  const totalPollVotes = currentPoll ? currentPoll.options.reduce((acc, o) => acc + o.votes, 0) : 0;
  const allPollVotes = polls.reduce((acc, p) => acc + p.options.reduce((a, o) => a + o.votes, 0), 0);
  // The bar shows how far ahead the leading option of the current poll is (real votes only).
  const leadingShare = totalPollVotes && currentPoll ? Math.round((Math.max(...currentPoll.options.map((o) => o.votes)) / totalPollVotes) * 100) : 0;
  const userVoteForCurrent = currentPoll ? userVotedPolls[currentPoll.id] : undefined;
  const title = es ? 'Pulso en vivo' : 'Live pulse';
  const fabLabel = es ? 'Keynote Pulse: reacciones y encuesta en vivo' : 'Keynote Pulse: live reactions and poll';

  // Portaled to <body> so the page's stacking contexts can't bury it.
  return createPortal(
    <>
      <div className="sgx-kpulse__floats" aria-hidden="true">
        {floatingParticles.map(p => (
          <span key={p.id} className="sgx-kpulse__float" style={{ ['--r' as string]: p.color }}>
            <ReactionIcon type={p.type} size={16} />{p.label}
          </span>
        ))}
      </div>

      <div className={`sgx-kpulse ${isExpanded ? 'is-open' : ''} ${className}`}>
        {!isExpanded ? (
          <button ref={fabRef} type="button" className="sgx-kpulse__fab" onClick={() => { setIsExpanded(true); playUiChirp(780); }} title={fabLabel} aria-label={fabLabel} aria-expanded={false}>
            <Radio size={18} color="var(--SGX_Cyan)" aria-hidden />
            <span className="sgx-kpulse__fab-label">Keynote Pulse<b>{es ? 'Reacciones y encuesta' : 'Reactions & poll'}</b></span>
          </button>
        ) : (
          <section ref={panelRef} className="sgx-kpulse__panel" role="region" aria-label={`Keynote Pulse: ${title}`}>
            <header className="sgx-kpulse__head">
              <img className="sgx-m-mark" src="/holo/stage.png" alt="" />
              <div>
                <h2>{title}</h2>
                <p className="sgx-m-clamp2">{currentSessionTitle || (es ? 'Reacciones y encuesta de la keynote' : 'Keynote reactions and poll')}</p>
              </div>
              <button type="button" className="sgx-m-iconbtn" onClick={minimize} aria-label={es ? 'Minimizar' : 'Minimize'} title={es ? 'Minimizar (Esc)' : 'Minimize (Esc)'}>
                <Minimize2 size={16} aria-hidden />
              </button>
            </header>

            <div className="sgx-kpulse__meter">
              <div className="sgx-m-row sgx-m-row--between">
                <span className="sgx-m-fine">{es ? 'Votos de la audiencia' : 'Audience votes'}: <b style={{ color: 'var(--SGX_Cyan)' }}>{allPollVotes.toLocaleString()}</b></span>
                <span className="sgx-m-fine">{es ? 'Tus reacciones' : 'Your reactions'}: <b style={{ color: 'var(--SGX_Yellow)' }}>{totalReactionsCount}</b></span>
              </div>
              <div className="sgx-kpulse__bar" aria-hidden="true"><span style={{ width: `${leadingShare}%` }} /></div>
              {justEarnedXp && <p className="sgx-m-tag sgx-m-tag--solid" role="status" style={{ marginTop: 8 }}>{justEarnedXp}</p>}
            </div>

            <div className="sgx-m-tabs" role="tablist" aria-label={title}>
              <button type="button" role="tab" aria-selected={activeTab === 'REACTIONS'} onClick={() => { setActiveTab('REACTIONS'); playUiChirp(600); }}>
                <Sparkles size={14} aria-hidden />{es ? 'Reacciones' : 'Reactions'}
              </button>
              <button type="button" role="tab" aria-selected={activeTab === 'POLL'} onClick={() => { setActiveTab('POLL'); playUiChirp(600); }}>
                <Vote size={14} aria-hidden />{es ? 'Encuesta · +25 XP' : 'Poll · +25 XP'}
              </button>
            </div>

            <div className="sgx-kpulse__body sgx-m">
              {activeTab === 'REACTIONS' && (
                <>
                  <div className="sgx-kpulse__reactions">
                    {REACTIONS.map((r) => (
                      <button key={r.type} type="button" className="sgx-kpulse__react" style={{ ['--r' as string]: r.color }} onClick={() => handleTriggerReaction(r.type, L(r.name), r.color)}>
                        <ReactionIcon type={r.type} />
                        <span><b>{L(r.name)}</b><small>{L(r.sub)}</small></span>
                      </button>
                    ))}
                  </div>
                  <p className="sgx-m-fine">{es ? 'Tus reacciones se ven en tu pantalla. Los votos de la encuesta se suman en vivo para toda la audiencia.' : 'Your reactions show on your screen. Poll votes add up live for the whole audience.'}</p>
                </>
              )}

              {activeTab === 'POLL' && currentPoll && (
                <>
                  <div className="sgx-m-row sgx-m-row--between">
                    <span className="sgx-m-fine">{es ? `Pregunta ${selectedPollIndex + 1} de ${polls.length}` : `Question ${selectedPollIndex + 1} of ${polls.length}`}</span>
                    <div className="sgx-kpulse__qnav">
                      {polls.map((p, idx) => (
                        <button key={p.id} type="button" aria-pressed={selectedPollIndex === idx} aria-label={es ? `Pregunta ${idx + 1}` : `Question ${idx + 1}`} onClick={() => setSelectedPollIndex(idx)}>{idx + 1}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="sgx-m-kicker" style={{ color: 'var(--SGX_Yellow)' }}>{loc(currentPoll, 'sessionTitle', language)}</p>
                    <h3 className="sgx-m-h" style={{ textTransform: 'none', fontSize: '0.95rem', marginTop: 4 }}>{loc(currentPoll, 'question', language)}</h3>
                  </div>
                  {!currentPoll.open && (
                    <p className="sgx-m-tag" role="status">{es ? 'Encuesta cerrada · se abre en vivo durante la sesión' : 'Poll closed · it opens live during the session'}</p>
                  )}
                  <div className="sgx-m-stack" style={{ gap: 6 }}>
                    {currentPoll.options.map((opt) => {
                      const pct = totalPollVotes > 0 ? Math.round((opt.votes / totalPollVotes) * 100) : 0;
                      const hasVoted = Boolean(userVoteForCurrent);
                      const closed = !currentPoll.open;
                      const isSelected = userVoteForCurrent === opt.id;
                      return (
                        <button key={opt.id} type="button" className={`sgx-kpulse__opt ${isSelected ? 'is-mine' : ''}`} onClick={() => handleVotePoll(currentPoll.id, opt.id)} disabled={hasVoted || closed} aria-pressed={isSelected}>
                          {hasVoted && <i style={{ width: `${pct}%`, background: opt.color }} />}
                          <span>
                            {isSelected ? <CheckCircle2 size={14} color="var(--SGX_Yellow)" aria-hidden /> : <span className="sgx-kpulse__dot" style={{ background: opt.color }} />}
                            {loc(opt, 'label', language)}
                          </span>
                          {hasVoted && <span className="sgx-m-fine">{pct}% ({opt.votes})</span>}
                        </button>
                      );
                    })}
                  </div>
                  {voteError && <p role="alert" className="sgx-m-err">{voteError}</p>}
                  <div className="sgx-m-row sgx-m-row--between">
                    <span className="sgx-m-fine">
                      {userVoteForCurrent
                        ? (es ? 'Tu voto ya cuenta en vivo.' : 'Your vote counts live.')
                        : (es ? 'Vota y gana +25 XP.' : 'Vote and earn +25 XP.')}
                    </span>
                    <span className="sgx-m-fine">{totalPollVotes.toLocaleString()} {es ? 'votos' : 'votes'}</span>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </>,
    document.body,
  );
};
