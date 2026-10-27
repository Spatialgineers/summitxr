import { PILLAR_BY_KEY } from '../../lib/sgxPillars';
import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  Zap, 
  Flame, 
  Sparkles, 
  Heart, 
  HelpCircle, 
  Trophy, 
  ChevronDown, 
  ChevronUp, 
  Radio, 
  CheckCircle2, 
  Vote, 
  Maximize2, 
  Minimize2,
  Share2
} from 'lucide-react';
import { playCyberBurstSound, playUiChirp } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';

export interface KeynotePollOption {
  id: string;
  label: string;
  votes: number;
  color: string;
}

export interface KeynotePoll {
  id: string;
  question: string;
  speaker: string;
  sessionTitle: string;
  options: KeynotePollOption[];
}

// Polls tied to the real Run of Show. Speakers are named only when confirmed in writing.
const PILLAR_OPTIONS = [
  { id: 'opt_story', label: 'SGX.Story (lore)', votes: 0, color: PILLAR_BY_KEY['STORY'].color },
  { id: 'opt_showcase', label: 'SGX.Showcase (inmersión)', votes: 0, color: PILLAR_BY_KEY['SHOWCASE'].color },
  { id: 'opt_spark', label: 'SGX.Spark (interactividad y juegos)', votes: 0, color: PILLAR_BY_KEY['SPARK'].color },
  { id: 'opt_stage', label: 'SGX.Stage (eventos)', votes: 0, color: PILLAR_BY_KEY['STAGE'].color },
  { id: 'opt_system', label: 'SGX.System (herramientas, IA y backend)', votes: 0, color: PILLAR_BY_KEY['SYSTEM'].color },
  { id: 'opt_synthesize', label: 'SGX.Synthesize (todo converge)', votes: 0, color: PILLAR_BY_KEY['SYNTHESIZE'].color },
];

const DEFAULT_POLLS: KeynotePoll[] = [
  {
    id: 'poll_day1_open',
    sessionTitle: 'Día 1 · Apertura',
    speaker: 'Danelson Maldonado González',
    question: '¿Qué pilar te mueve más?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day2_industry',
    sessionTitle: 'Día 2 · Día de la Industria',
    speaker: 'Personas invitadas (por anunciar)',
    question: '¿Qué conversación de industria quieres escuchar primero?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day3_showcase',
    sessionTitle: 'Día 3 · SGX Showcase',
    speaker: 'Initiates del SGX Guild',
    question: '¿En qué pilar quieres ver el próximo proyecto de un Initiate?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
];

interface FloatingReactionParticle {
  id: string;
  emoji: string;
  color: string;
  x: number;
  label: string;
}

interface KeynotePulseReactionsProps {
  onAwardXp?: (amount: number, reason: string) => void;
  className?: string;
}

export const KeynotePulseReactions: React.FC<KeynotePulseReactionsProps> = ({
  onAwardXp,
  className = ''
}) => {
  const { playerProfile, savePlayerProfile, user } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'REACTIONS' | 'POLL'>('REACTIONS');
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);
  const [polls, setPolls] = useState<KeynotePoll[]>(DEFAULT_POLLS);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, string>>({});
  const [voteError, setVoteError] = useState<string | null>(null);
  const [totalReactionsCount, setTotalReactionsCount] = useState<number>(0);
  const [floatingParticles, setFloatingParticles] = useState<FloatingReactionParticle[]>([]);
  const [justEarnedXp, setJustEarnedXp] = useState<string | null>(null);

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
    const pollIds = DEFAULT_POLLS.map((p) => p.id);
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
        setPolls(DEFAULT_POLLS.map((p) => ({
          ...p,
          options: p.options.map((o) => ({ ...o, votes: counts[p.id]?.[o.id] || 0 })),
        })));
        if (Object.keys(mine).length) setUserVotedPolls((prev) => ({ ...prev, ...mine }));
      }, () => { /* offline: local view only */ });
    } catch {
      return undefined;
    }
  }, [user?.uid]);

  // Clean up floating particles
  useEffect(() => {
    if (floatingParticles.length === 0) return;
    const timer = setTimeout(() => {
      setFloatingParticles(prev => prev.slice(1));
    }, 1800);
    return () => clearTimeout(timer);
  }, [floatingParticles]);

  const addFloatingReaction = (emoji: string, color: string, label: string) => {
    const newP: FloatingReactionParticle = {
      id: `${Date.now()}_${Math.random()}`,
      emoji,
      color,
      x: 70 + (Math.random() * 25 - 12.5), // near right edge
      label
    };
    setFloatingParticles(prev => [...prev.slice(-8), newP]);
  };

  const handleTriggerReaction = (
    type: 'FIREWORKS' | 'QUANTUM' | 'FLAME' | 'HEART' | 'MIND_BLOWN' | 'KUDOS',
    label: string,
    emoji: string
  ) => {
    setTotalReactionsCount(prev => prev + 1);

    // Trigger audio
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

    addFloatingReaction(emoji, '#00DDFF', label);

    // Canvas confetti particle burst
    if (type === 'FIREWORKS') {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#00DDFF', '#10B981', '#FDCC0D', '#5F86B4', '#F43F5E', '#3B82F6'],
        shapes: ['circle', 'square'],
        scalar: 1.1,
        disableForReducedMotion: true
      });
    } else if (type === 'FLAME') {
      confetti({
        particleCount: 40,
        spread: 45,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#F43F5E', '#FF5500', '#FDCC0D', '#FF0055'],
        startVelocity: 35,
        scalar: 0.9,
      });
    } else if (type === 'KUDOS') {
      confetti({
        particleCount: 65,
        spread: 90,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#FDCC0D', '#F59E0B', '#FBBF24', '#FFFFFF'],
        scalar: 1.2
      });
    } else if (type === 'HEART') {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#EC4899', '#F43F5E', '#5F86B4'],
        scalar: 1.0
      });
    } else if (type === 'QUANTUM') {
      confetti({
        particleCount: 45,
        spread: 120,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#00DDFF', '#38BDF8', '#818CF8', '#C084FC'],
        startVelocity: 25,
        scalar: 0.8
      });
    } else {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#5F86B4', '#F43F5E', '#FDCC0D'],
        scalar: 1.0
      });
    }
  };

  const handleVotePoll = async (pollId: string, optionId: string) => {
    if (userVotedPolls[pollId]) return;
    if (!user?.uid) {
      setVoteError('Conectando tu pase… inténtalo en unos segundos.');
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
      setVoteError('No se pudo registrar tu voto. Revisa tu conexión e inténtalo de nuevo.');
      return;
    }

    // Audio & Confetti burst
    playCyberBurstSound('kudos');
    confetti({
      particleCount: 55,
      spread: 75,
      origin: { x: 0.85, y: 0.75 },
      colors: ['#10B981', '#00DDFF', '#FDCC0D']
    });

    // Award +25 XP
    const earnedXp = 25;
    if (onAwardXp) {
      onAwardXp(earnedXp, 'Voto en Encuesta de Keynote');
    }
    if (savePlayerProfile && playerProfile) {
      savePlayerProfile({
        totalScore: (playerProfile.totalScore || 0) + earnedXp,
        totalInteractions: (playerProfile.totalInteractions || 0) + 1
      });
    }

    setJustEarnedXp(`+${earnedXp} XP Voto Registrado`);
    setTimeout(() => setJustEarnedXp(null), 3200);
  };

  const currentPoll = polls[selectedPollIndex] || polls[0];
  const totalPollVotes = currentPoll.options.reduce((acc, o) => acc + o.votes, 0);
  const allPollVotes = polls.reduce((acc, p) => acc + p.options.reduce((a, o) => a + o.votes, 0), 0);
  // The bar shows how far ahead the leading option of the current poll is (real votes only).
  const leadingShare = totalPollVotes ? Math.round((Math.max(...currentPoll.options.map((o) => o.votes)) / totalPollVotes) * 100) : 0;
  const userVoteForCurrent = userVotedPolls[currentPoll.id];

  return (
    <>
      {/* On-screen floating reaction bubbles */}
      <div className="fixed bottom-24 right-4 pointer-events-none z-50 flex flex-col items-end space-y-2">
        {floatingParticles.map(p => (
          <div
            key={p.id}
            className="animate-bounce font-mono text-xs font-black px-2.5 py-1 bg-black/80 border border-[var(--sgx-secondary)] text-white shadow-xl flex items-center space-x-1.5 backdrop-blur-md transition-opacity duration-1000"
            style={{
              clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              borderColor: p.color
            }}
          >
            <span className="text-base">{p.emoji}</span>
            <span className="text-[11px] font-bold text-slate-200">{p.label}</span>
          </div>
        ))}
      </div>

      {/* Persistent Floating Widget Button (Bottom Right) */}
      <div className={`sgx-pulse-widget fixed bottom-4 right-4 z-40 ${className}`}>
        {!isExpanded ? (
          <div className="flex items-center space-x-2">
            {/* Main Trigger Button */}
            <button
              onClick={() => {
                setIsExpanded(true);
                playUiChirp(780);
              }}
              className="group relative p-2.5 2xl:px-3.5 bg-[#121212]/95 border border-[var(--sgx-neon)] hover:border-[var(--sgx-accent)] text-white font-mono text-xs font-black shadow-2xl flex items-center space-x-2 transition-colors"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              title="Keynote Pulse: reacciones y encuesta en vivo"
              aria-label="Keynote Pulse: reacciones y encuesta en vivo"
            >
              <div className="relative flex items-center justify-center">
                <Radio className="w-4 h-4 text-[var(--sgx-neon)] animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FDCC0D] rounded-full animate-ping" />
              </div>
              {/* Compact by default so it never covers content; the label shows on very wide screens. */}
              <div className="hidden 2xl:flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-normal leading-none">KEYNOTE PULSE</span>
                <span className="text-xs font-black tracking-wide text-cyan-300 group-hover:text-amber-300">
                  REACCIONES & ENCUESTA
                </span>
              </div>
              <span className="hidden 2xl:inline px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono">
                {allPollVotes.toLocaleString()} votos
              </span>
            </button>
          </div>
        ) : (
          /* Expanded Floating Cyber Console */
          <div 
            className="w-96 max-w-[calc(100vw-2rem)] bg-[#0e0e0e]/95 border-2 border-[var(--sgx-neon)] backdrop-blur-xl shadow-2xl flex flex-col font-mono text-xs overflow-hidden"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-cyan-950/60 via-[#1B1B1B] to-black border-b border-[var(--sgx-secondary)] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-[var(--sgx-neon)] animate-spin" style={{ animationDuration: '6s' }} />
                <div>
                  <div className="text-[11px] font-black text-white tracking-wider flex items-center space-x-1.5">
                    <span>KEYNOTE LIVE PULSE</span>
                    <span className="px-1.5 py-0.2 bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/60 text-[9px] font-bold">EN VIVO</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">
                    Fuegos artificiales, reacciones y encuestas en tiempo real
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsExpanded(false)}
                className="p-1 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                title="Minimizar panel"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Audience Pulse Energy Meter */}
            <div className="p-3 bg-black/60 border-b border-[var(--sgx-secondary)]/60">
              <div className="flex items-center justify-between text-[11px] mb-1.5">
                <span className="text-slate-400 flex items-center space-x-1">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Audiencia en vivo:</span>
                </span>
                <span className="font-bold text-cyan-300">
                  {allPollVotes.toLocaleString()} votos • {totalReactionsCount.toLocaleString()} {totalReactionsCount === 1 ? 'pulso tuyo' : 'pulsos tuyos'}
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 border border-slate-700 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${leadingShare}%` }}
                />
              </div>

              {/* Toast alert when XP is earned */}
              {justEarnedXp && (
                <div className="mt-2 p-1.5 bg-amber-950/80 border border-[#FDCC0D] text-[#FDCC0D] text-center font-bold text-[10px] animate-pulse">
                  🎉 {justEarnedXp}
                </div>
              )}
            </div>

            {/* Tabs Selector */}
            <div className="grid grid-cols-2 bg-[#161616] border-b border-[var(--sgx-secondary)] text-[11px]">
              <button
                onClick={() => {
                  setActiveTab('REACTIONS');
                  playUiChirp(600);
                }}
                className={`py-2 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                  activeTab === 'REACTIONS'
                    ? 'border-[var(--sgx-neon)] text-[var(--sgx-neon)] bg-cyan-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>LANZAR REACCIONES</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('POLL');
                  playUiChirp(600);
                }}
                className={`py-2 text-center font-bold flex items-center justify-center space-x-1.5 border-b-2 transition-colors ${
                  activeTab === 'POLL'
                    ? 'border-amber-400 text-amber-300 bg-amber-950/20'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Vote className="w-3.5 h-3.5" />
                <span>ENCUESTA EN VIVO (+25 XP)</span>
              </button>
            </div>

            {/* Tab 1: Reactions Launcher */}
            {activeTab === 'REACTIONS' && (
              <div className="p-3 space-y-3">
                <div className="text-[11px] text-slate-300">
                  Haz clic para detonar partículas e interactuar con la pantalla de la keynote:
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleTriggerReaction('FIREWORKS', 'Fuegos Artificiales', '🎆')}
                    className="p-2.5 bg-[#1C1C1C] border border-cyan-500/40 hover:border-cyan-400 text-left hover:bg-cyan-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🎆</span>
                    <div>
                      <div className="font-bold text-cyan-300 text-[11px]">Fuegos Digitales</div>
                      <div className="text-[9px] text-slate-400">Pirotecnia 6 Pilares</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('FLAME', 'Cyber Flame', '🔥')}
                    className="p-2.5 bg-[#1C1C1C] border border-orange-500/40 hover:border-orange-400 text-left hover:bg-orange-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🔥</span>
                    <div>
                      <div className="font-bold text-orange-300 text-[11px]">Llama Volcánica</div>
                      <div className="text-[9px] text-slate-400">Erupción de Brasas</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('KUDOS', 'Spatial Kudos', '🏆')}
                    className="p-2.5 bg-[#1C1C1C] border border-amber-500/40 hover:border-amber-400 text-left hover:bg-amber-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🏆</span>
                    <div>
                      <div className="font-bold text-amber-300 text-[11px]">Spatial Kudos</div>
                      <div className="text-[9px] text-slate-400">Lluvia de Oro</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('QUANTUM', 'Pulso Cuántico', '⚡')}
                    className="p-2.5 bg-[#1C1C1C] border border-[#32527B] hover:border-[#FDCC0D] text-left hover:bg-[#32527B]/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="font-bold text-[#FDCC0D] text-[11px]">Shockwave</div>
                      <div className="text-[9px] text-slate-400">Onda de Energía</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('HEART', 'Hologram Love', '💛')}
                    className="p-2.5 bg-[#1C1C1C] border border-[#FDCC0D]/40 hover:border-[#FDCC0D] text-left hover:bg-[#FDCC0D]/10 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">💛</span>
                    <div>
                      <div className="font-bold text-[#FDCC0D] text-[11px]">Holo Love</div>
                      <div className="text-[9px] text-slate-400">Resonancia Oro</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('MIND_BLOWN', 'Mind Blown', '🤯')}
                    className="p-2.5 bg-[#1C1C1C] border border-[#32527B] hover:border-[#FDCC0D] text-left hover:bg-[#32527B]/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🤯</span>
                    <div>
                      <div className="font-bold text-slate-200 text-[11px]">Mind Blown</div>
                      <div className="text-[9px] text-slate-400">Galaxia Cósmica</div>
                    </div>
                  </button>
                </div>

                <div className="p-2 bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Tus reacciones se ven en tu pantalla. Los votos de la encuesta se suman en vivo para toda la audiencia.</span>
                  <button
                    onClick={() => {
                      handleTriggerReaction('FIREWORKS', 'Máximo Pulso', '🎆');
                    }}
                    className="text-cyan-400 hover:underline font-bold"
                  >
                    Sobrecargar
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Real-time Keynote Poll */}
            {activeTab === 'POLL' && (
              <div className="p-3 space-y-3">
                {/* Question Selector Carousel */}
                <div className="flex items-center justify-between bg-black/50 p-1.5 border border-[var(--sgx-secondary)]">
                  <div className="text-[10px] text-slate-400">
                    Pregunta {selectedPollIndex + 1} de {polls.length}
                  </div>
                  <div className="flex items-center space-x-1">
                    {polls.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPollIndex(idx)}
                        className={`w-5 h-5 text-[10px] font-bold border transition-colors ${
                          selectedPollIndex === idx
                            ? 'bg-amber-500 text-black border-amber-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question Info */}
                <div className="space-y-1">
                  <div className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                    {currentPoll.sessionTitle}
                  </div>
                  <div className="text-xs font-black text-white leading-snug">
                    {currentPoll.question}
                  </div>
                </div>

                {/* Options / Live Results */}
                <div className="space-y-2">
                  {currentPoll.options.map((opt) => {
                    const pct = totalPollVotes > 0 ? Math.round((opt.votes / totalPollVotes) * 100) : 0;
                    const hasVoted = Boolean(userVoteForCurrent);
                    const isSelected = userVoteForCurrent === opt.id;

                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleVotePoll(currentPoll.id, opt.id)}
                        disabled={hasVoted}
                        className={`w-full p-2 text-left border transition-all relative overflow-hidden group ${
                          isSelected
                            ? 'border-[#FDCC0D] bg-amber-950/40 text-white'
                            : hasVoted
                            ? 'border-slate-800 bg-slate-950/50 text-slate-300'
                            : 'border-slate-700 hover:border-amber-400 bg-[#1A1A1A] hover:bg-[#212121] text-white active:scale-[0.99]'
                        }`}
                      >
                        {/* Progress bar background when voted */}
                        {hasVoted && (
                          <div
                            className="absolute top-0 bottom-0 left-0 opacity-25 transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: opt.color }}
                          />
                        )}

                        <div className="relative z-10 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            {isSelected ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#FDCC0D] shrink-0" />
                            ) : (
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: opt.color }} 
                              />
                            )}
                            <span className="text-[11px] font-bold">{opt.label}</span>
                          </div>

                          {hasVoted && (
                            <span className="text-[11px] font-mono font-black text-slate-300 shrink-0 ml-2">
                              {pct}% <span className="text-[9px] text-slate-400 font-normal">({opt.votes})</span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {voteError && (
                  <p role="alert" className="p-2 text-[11px] text-red-300 border border-red-500/50 bg-red-950/40">{voteError}</p>
                )}

                {/* Voting Status / Reward Note */}
                <div className="p-2 bg-[#161616] border border-[var(--sgx-secondary)] text-[10px] flex items-center justify-between">
                  <div className="text-slate-400">
                    {userVoteForCurrent ? (
                      <span className="text-[#FDCC0D] font-bold flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 inline" />
                        <span>¡Tu voto está computado en vivo!</span>
                      </span>
                    ) : (
                      <span>Vota para recibir <strong className="text-amber-300">+25 XP</strong></span>
                    )}
                  </div>
                  <span className="text-slate-400 font-mono">
                    {totalPollVotes.toLocaleString()} votos totales
                  </span>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-2 bg-black border-t border-[var(--sgx-secondary)] flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center space-x-1">
                <Radio className="w-3 h-3 text-cyan-400" />
                <span>Spatialgineers Broadcast Audio-Visual Mesh</span>
              </span>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-slate-300 hover:text-white underline font-mono"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
