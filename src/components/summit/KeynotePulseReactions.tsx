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

const DEFAULT_POLLS: KeynotePoll[] = [
  {
    id: 'poll_keynote_1',
    sessionTitle: 'Opening Keynote: The Spatial Revolution',
    speaker: 'Dr. Aris Thorne & Alex Rivera',
    question: '¿Qué tecnología acelerará más la adopción masiva de Computación Espacial en 2026-2027?',
    options: [
      { id: 'opt_1', label: 'WebGPU & Shaders en Navegador', votes: 0, color: '#00FFFF' },
      { id: 'opt_2', label: 'Agentes IA Multimodales en Tiempo Real', votes: 0, color: '#A855F7' },
      { id: 'opt_3', label: 'Visores Ligeros Micro-OLED Passthrough', votes: 0, color: '#10B981' },
      { id: 'opt_4', label: 'Motores CYOA & Broadcast Interactivos', votes: 0, color: '#FDCC0D' }
    ]
  },
  {
    id: 'poll_keynote_2',
    sessionTitle: 'System Architectures for 100k Simultaneous Users',
    speaker: 'Elena Vance & SGX Core Team',
    question: '¿Cuál es el principal reto de sincronización en eventos WebXR multijugador?',
    options: [
      { id: 'opt_1', label: 'Latencia y Consenso de Red (<20ms)', votes: 0, color: '#F43F5E' },
      { id: 'opt_2', label: 'Presupuesto de Polígonos & Texturas', votes: 0, color: '#3B82F6' },
      { id: 'opt_3', label: 'Audio Espacial Acústico Concurrente', votes: 0, color: '#10B981' },
      { id: 'opt_4', label: 'Orquestación de Servidores Edge Regionales', votes: 0, color: '#FDCC0D' }
    ]
  },
  {
    id: 'poll_keynote_3',
    sessionTitle: 'Spatialgineers 6 Pillars Roadmap',
    speaker: 'Consejo de Fundadores Spatialgineers',
    question: '¿En qué pilar planeas enfocar tu proyecto o empresa este fin de semana?',
    options: [
      { id: 'opt_1', label: 'SGX.SYNTHESIZE (IA Generativa & Shaders)', votes: 0, color: '#00FFFF' },
      { id: 'opt_2', label: 'SGX.STAGE (Live Broadcast & CYOA Engine)', votes: 0, color: '#FDCC0D' },
      { id: 'opt_3', label: 'SGX.SYSTEM (Infraestructura Distribuida)', votes: 0, color: '#10B981' },
      { id: 'opt_4', label: 'SGX.SHOWCASE (Experiencias Comerciales & Marcas)', votes: 0, color: '#A855F7' }
    ]
  }
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
  const { playerProfile, savePlayerProfile } = useAuth();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'REACTIONS' | 'POLL'>('REACTIONS');
  const [selectedPollIndex, setSelectedPollIndex] = useState<number>(0);
  const [polls, setPolls] = useState<KeynotePoll[]>(DEFAULT_POLLS);
  const [userVotedPolls, setUserVotedPolls] = useState<Record<string, string>>({});
  const [pulseEnergy, setPulseEnergy] = useState<number>(98.4);
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

  // Animate pulse energy fluctuations naturally
  useEffect(() => {
    const interval = setInterval(() => {
      setPulseEnergy(prev => {
        const drift = (Math.random() - 0.48) * 0.4;
        return Math.min(100, Math.max(88, Number((prev + drift).toFixed(1))));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

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
    setPulseEnergy(prev => Math.min(100, Number((prev + 0.3).toFixed(1))));

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

    addFloatingReaction(emoji, '#00FFFF', label);

    // Canvas confetti particle burst
    if (type === 'FIREWORKS') {
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#00FFFF', '#10B981', '#FDCC0D', '#A855F7', '#F43F5E', '#3B82F6'],
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
        colors: ['#EC4899', '#F43F5E', '#A855F7'],
        scalar: 1.0
      });
    } else if (type === 'QUANTUM') {
      confetti({
        particleCount: 45,
        spread: 120,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#00FFFF', '#38BDF8', '#818CF8', '#C084FC'],
        startVelocity: 25,
        scalar: 0.8
      });
    } else {
      confetti({
        particleCount: 40,
        spread: 70,
        origin: { x: 0.85, y: 0.8 },
        colors: ['#A855F7', '#F43F5E', '#FDCC0D'],
        scalar: 1.0
      });
    }
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    if (userVotedPolls[pollId]) return;

    // Register vote
    const updatedUserVotes = { ...userVotedPolls, [pollId]: optionId };
    setUserVotedPolls(updatedUserVotes);
    try {
      localStorage.setItem('sgx_keynote_poll_votes', JSON.stringify(updatedUserVotes));
    } catch {}

    // Increment option votes
    setPolls(prevPolls =>
      prevPolls.map(p => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          options: p.options.map(opt =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          )
        };
      })
    );

    // Audio & Confetti burst
    playCyberBurstSound('kudos');
    confetti({
      particleCount: 55,
      spread: 75,
      origin: { x: 0.85, y: 0.75 },
      colors: ['#10B981', '#00FFFF', '#FDCC0D']
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
      <div className={`fixed bottom-5 right-5 z-40 ${className}`}>
        {!isExpanded ? (
          <div className="flex items-center space-x-2">
            {/* Main Trigger Button */}
            <button
              onClick={() => {
                setIsExpanded(true);
                playUiChirp(780);
              }}
              className="group relative px-3.5 py-2.5 bg-gradient-to-r from-cyan-500/25 via-[#121212] to-amber-500/25 border-2 border-[var(--sgx-neon)] hover:border-[var(--sgx-accent)] text-white font-mono text-xs font-black shadow-2xl flex items-center space-x-2 transition-all hover:scale-105"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <div className="relative flex items-center justify-center">
                <Radio className="w-4 h-4 text-[var(--sgx-neon)] animate-pulse" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#FDCC0D] rounded-full animate-ping" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-400 font-normal leading-none">KEYNOTE PULSE</span>
                <span className="text-xs font-black tracking-wide text-cyan-300 group-hover:text-amber-300">
                  REACCIONES & ENCUESTA
                </span>
              </div>
              <span className="px-1.5 py-0.5 bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono">
                {pulseEnergy}%
              </span>
            </button>
          </div>
        ) : (
          /* Expanded Floating Cyber Console */
          <div 
            className="w-96 max-w-[calc(100vw-2rem)] bg-[#0c0d12]/95 border-2 border-[var(--sgx-neon)] backdrop-blur-xl shadow-2xl flex flex-col font-mono text-xs overflow-hidden"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            {/* Header */}
            <div className="p-3 bg-gradient-to-r from-cyan-950/60 via-[#161822] to-black border-b border-[var(--sgx-secondary)] flex items-center justify-between">
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
                  <span>Energía Colectiva:</span>
                </span>
                <span className="font-bold text-cyan-300">
                  {pulseEnergy}% • {totalReactionsCount.toLocaleString()} pulsos
                </span>
              </div>
              <div className="w-full bg-slate-900 h-2 border border-slate-700 overflow-hidden relative">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 via-amber-400 to-rose-500 transition-all duration-500"
                  style={{ width: `${pulseEnergy}%` }}
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
            <div className="grid grid-cols-2 bg-[#12141c] border-b border-[var(--sgx-secondary)] text-[11px]">
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
                    className="p-2.5 bg-[#171924] border border-cyan-500/40 hover:border-cyan-400 text-left hover:bg-cyan-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🎆</span>
                    <div>
                      <div className="font-bold text-cyan-300 text-[11px]">Fuegos Digitales</div>
                      <div className="text-[9px] text-slate-400">Pirotecnia 6 Pilares</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('FLAME', 'Cyber Flame', '🔥')}
                    className="p-2.5 bg-[#171924] border border-orange-500/40 hover:border-orange-400 text-left hover:bg-orange-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🔥</span>
                    <div>
                      <div className="font-bold text-orange-300 text-[11px]">Llama Volcánica</div>
                      <div className="text-[9px] text-slate-400">Erupción de Brasas</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('KUDOS', 'Spatial Kudos', '🏆')}
                    className="p-2.5 bg-[#171924] border border-amber-500/40 hover:border-amber-400 text-left hover:bg-amber-950/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🏆</span>
                    <div>
                      <div className="font-bold text-amber-300 text-[11px]">Spatial Kudos</div>
                      <div className="text-[9px] text-slate-400">Lluvia de Oro</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('QUANTUM', 'Pulso Cuántico', '⚡')}
                    className="p-2.5 bg-[#171924] border border-[#32527B] hover:border-[#FDCC0D] text-left hover:bg-[#32527B]/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="font-bold text-[#FDCC0D] text-[11px]">Shockwave</div>
                      <div className="text-[9px] text-slate-400">Onda de Energía</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('HEART', 'Hologram Love', '💛')}
                    className="p-2.5 bg-[#171924] border border-[#FDCC0D]/40 hover:border-[#FDCC0D] text-left hover:bg-[#FDCC0D]/10 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">💛</span>
                    <div>
                      <div className="font-bold text-[#FDCC0D] text-[11px]">Holo Love</div>
                      <div className="text-[9px] text-slate-400">Resonancia Oro</div>
                    </div>
                  </button>

                  <button
                    onClick={() => handleTriggerReaction('MIND_BLOWN', 'Mind Blown', '🤯')}
                    className="p-2.5 bg-[#171924] border border-[#32527B] hover:border-[#FDCC0D] text-left hover:bg-[#32527B]/30 transition-all flex items-center space-x-2 active:scale-95 group"
                  >
                    <span className="text-xl">🤯</span>
                    <div>
                      <div className="font-bold text-slate-200 text-[11px]">Mind Blown</div>
                      <div className="text-[9px] text-slate-400">Galaxia Cósmica</div>
                    </div>
                  </button>
                </div>

                <div className="p-2 bg-slate-900/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Todas las reacciones se sincronizan con la pantalla principal.</span>
                  <button
                    onClick={() => {
                      setPulseEnergy(100);
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
                            : 'border-slate-700 hover:border-amber-400 bg-[#151722] hover:bg-[#1a1d2c] text-white active:scale-[0.99]'
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

                {/* Voting Status / Reward Note */}
                <div className="p-2 bg-[#12141d] border border-[var(--sgx-secondary)] text-[10px] flex items-center justify-between">
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
