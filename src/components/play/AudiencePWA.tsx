import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Question, 
  QuestionOption, 
  UserProfile, 
  VoteSummary, 
  EventSession, 
  VisualizerPresetId 
} from '../../types/engine';
import { evaluateUnlockedPrizes, PointCalculationResult, PRIZE_TIERS as DEFAULT_TIERS } from '../../lib/gamification';
import { PrizeTier } from '../../types/engine';
import { db } from '../../lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { VISUALIZER_PRESETS } from '../../lib/presets';
import { 
  Flame, 
  Zap, 
  Trophy, 
  Award, 
  Clock, 
  QrCode, 
  CheckCircle2, 
  Sparkles, 
  Radio, 
  ChevronRight,
  Gift,
  Smartphone
} from 'lucide-react';

interface AudiencePWAProps {
  tenantId: string;
  eventId: string;
  user: UserProfile;
  session: EventSession;
  currentQuestion?: Question | null;
  voteSummary?: VoteSummary | null;
  lastCalcResult?: PointCalculationResult | null;
  onVoteSubmit: (optionId: string, optionCode: number, responseTimeMs: number) => void;
  onReactionSend: (emoji: '🔥' | '🚀' | '⚡' | '🎉' | '❤️' | '💎', color: string) => void;
  onUpdateNickname: (name: string) => void;
}

export const AudiencePWA: React.FC<AudiencePWAProps> = ({
  tenantId,
  eventId,
  user,
  session,
  currentQuestion,
  voteSummary,
  lastCalcResult,
  onVoteSubmit,
  onReactionSend,
  onUpdateNickname,
}) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteStartTime, setVoteStartTime] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<'VOTE' | 'REWARDS' | 'STATS'>('VOTE');
  const [selectedPrizeModal, setSelectedPrizeModal] = useState<any>(null);
  const [nicknameInput, setNicknameInput] = useState(user.nickname || 'CyberExplorer');
  const [tiers, setTiers] = useState<PrizeTier[]>(DEFAULT_TIERS);

  useEffect(() => {
    const loadTiers = async () => {
      try {
        const snap = await getDocs(collection(db, 'gamification_tiers'));
        if (!snap.empty) {
          const loaded = snap.docs.map(d => d.data() as PrizeTier);
          setTiers(loaded.sort((a, b) => a.minPoints - b.minPoints));
        }
      } catch (err) {
        console.warn("Failed to load tiers", err);
      }
    };
    loadTiers();
  }, []);

  // Reset voting state when a new question arrives or status transitions
  useEffect(() => {
    if (session.status === 'VOTING_ACTIVE') {
      setSelectedOptionId(null);
      setHasVoted(false);
      setVoteStartTime(Date.now());
    } else if (session.status === 'RESULT_REVEALED') {
      // Trigger confetti if user picked the winning option or was correct
      if (selectedOptionId && voteSummary?.winningOptionId === selectedOptionId) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#00ddff', '#ff007f', '#5f86b4', '#ffd700'],
        });
      }
    }
  }, [session.status, session.currentQuestionId]);

  const handleSelectOption = (opt: QuestionOption) => {
    if (hasVoted || session.status !== 'VOTING_ACTIVE') return;

    const responseTime = Date.now() - voteStartTime;
    setSelectedOptionId(opt.id);
    setHasVoted(true);

    // Call vote submission
    onVoteSubmit(opt.id, opt.code, responseTime);

    // Minor confetti pop on action
    confetti({
      particleCount: 25,
      spread: 45,
      origin: { y: 0.8 },
      colors: [opt.color || '#00ddff'],
    });
  };

  const unlockedPrizes = evaluateUnlockedPrizes(user, tiers);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between max-w-md mx-auto relative shadow-2xl border-x border-slate-800 font-sans select-none pb-20">
      
      {/* Mobile Top Header: Live Broadcast Status + Player Stats */}
      <div className="sticky top-0 z-20 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between">
          
          {/* Live Indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-xs font-mono font-bold tracking-wider text-cyan-400 uppercase">
              SGX Live PWA
            </span>
          </div>

          {/* User Score & Streak Pill */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 bg-amber-950/70 border border-amber-500/40 px-2.5 py-1 rounded-full text-amber-300 text-xs font-mono font-bold">
              <Trophy className="w-3.5 h-3.5" />
              <span>{user.totalScore} pts</span>
            </div>

            {user.currentStreak > 1 && (
              <div className="flex items-center space-x-1 bg-[#32527B]/70 border border-[#FDCC0D]/40 px-2 py-1 rounded-full text-[#FDCC0D] text-xs font-mono font-bold animate-pulse">
                <Flame className="w-3.5 h-3.5 fill-current" />
                <span>{user.currentStreak}x</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="flex-1 p-4 overflow-y-auto">
        
        {activeTab === 'VOTE' && (
          <div className="space-y-4">
            
            {/* Live Voting Window Card */}
            {session.status === 'VOTING_ACTIVE' && currentQuestion && (
              <div className="space-y-4">
                
                {/* Question Banner & Timer */}
                <div className="sgx-panel border border-cyan-500/40 p-5 shadow-xl space-y-3 relative overflow-hidden">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="bg-cyan-950 text-cyan-300 px-2 py-0.5 border border-cyan-800 font-bold uppercase">
                      {currentQuestion.category}
                    </span>
                    <div className="flex items-center space-x-1 text-red-400 font-bold animate-pulse">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{session.timeRemaining}s Left</span>
                    </div>
                  </div>

                  <h2 className="text-lg font-extrabold text-white leading-tight font-['Orbitron',sans-serif]">
                    {currentQuestion.prompt}
                  </h2>

                  {currentQuestion.subtitle && (
                    <p className="text-xs text-slate-300">{currentQuestion.subtitle}</p>
                  )}

                  {/* Progress Line */}
                  <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-cyan-400 transition-all duration-1000"
                      style={{
                        width: `${Math.max(0, ((session.timeRemaining || 0) / (currentQuestion.durationSeconds || 30)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Option Voting Cards (Tactile 2-4 Buttons) */}
                <div className="space-y-3">
                  {currentQuestion.options.map((opt) => {
                    const isSelected = selectedOptionId === opt.id;
                    const presetObj = VISUALIZER_PRESETS[opt.presetId];

                    return (
                      <button
                        key={opt.id}
                        disabled={hasVoted}
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full text-left p-4 border transition-all transform active:scale-95 shadow-md flex items-center justify-between sgx-card ${
                          isSelected
                            ? 'border-cyan-400 bg-cyan-950/60 ring-1 ring-cyan-400 shadow-cyan-500/20'
                            : hasVoted
                            ? 'border-slate-800 bg-[#121212]/60 opacity-60 cursor-not-allowed'
                            : 'border-[var(--sgx-secondary)] bg-[#121212] hover:border-cyan-400 hover:bg-[var(--sgx-bg)]'
                        }`}
                      >
                        <div className="flex items-start space-x-3.5">
                          <div
                            className="w-8 h-8 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 text-slate-950 shadow-inner"
                            style={{ backgroundColor: opt.color || presetObj?.themeColor || '#00ddff' }}
                          >
                            {opt.label.split(':')[0]}
                          </div>
                          <div>
                            <span className="font-bold text-sm text-white block">
                              {opt.label.split(':')[1] || opt.label}
                            </span>
                            {opt.description && (
                              <span className="text-xs text-slate-400 block mt-0.5 line-clamp-1">
                                {opt.description}
                              </span>
                            )}
                          </div>
                        </div>

                        {isSelected && (
                          <div className="p-1 bg-cyan-400 text-slate-950">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Voting Feedback Notice */}
                {hasVoted && (
                  <div className="p-3 bg-[#32527B]/60 border border-[#FDCC0D]/40 text-[#FDCC0D] text-xs font-mono text-center animate-fadeIn">
                    ✓ VOTE RECORDED • Watch OBS Stage Canvas for Live Tally!
                  </div>
                )}

              </div>
            )}

            {/* Results Reveal Mode */}
            {session.status === 'RESULT_REVEALED' && (
              <div className="sgx-panel border border-[var(--sgx-neon)]/40 p-5 shadow-2xl space-y-4 text-center animate-fadeIn">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 bg-cyan-950 border border-[var(--sgx-neon)]/30 text-[var(--sgx-neon)] text-xs font-mono font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>CONSENSUS REVEALED</span>
                </div>

                <h2 className="text-xl font-bold text-white font-['Orbitron',sans-serif]">
                  {currentQuestion?.storyPathOutcome?.stageTitle || 'STAGE MORPH INITIATED'}
                </h2>

                {currentQuestion?.storyPathOutcome?.narrative && (
                  <p className="text-sm text-slate-300 font-medium">
                    {currentQuestion.storyPathOutcome.narrative}
                  </p>
                )}

                {/* Points Earned Flash */}
                {lastCalcResult && (
                  <div className="bg-[#0A0A0A] border border-[var(--sgx-secondary)] p-3 text-xs font-mono space-y-1">
                    <div className="flex justify-between text-slate-400">
                      <span>Base Points:</span>
                      <span className="text-white font-bold">+{lastCalcResult.basePointsEarned}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Speed Bonus:</span>
                      <span className="text-cyan-400 font-bold">+{lastCalcResult.rawSpeedBonus}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Streak Bonus ({lastCalcResult.streakMultiplier}x):</span>
                      <span className="text-[#FDCC0D] font-bold">+{lastCalcResult.totalPointsEarned} Total</span>
                    </div>
                  </div>
                )}

                {/* Winning Percentage Card */}
                {voteSummary && (
                  <div className="grid grid-cols-2 gap-2 text-left pt-2">
                    {currentQuestion?.options.map((opt) => {
                      const pct = voteSummary.optionPercentages[opt.id] ?? 0;
                      const isWinner = voteSummary.winningOptionId === opt.id;
                      return (
                        <div
                          key={opt.id}
                          className={`p-2.5 border text-xs ${
                            isWinner
                              ? 'border-yellow-400 bg-yellow-950/40 font-bold text-yellow-300'
                              : 'border-[var(--sgx-secondary)] bg-[#0A0A0A]/50 text-slate-400'
                          }`}
                        >
                          <div className="flex justify-between">
                            <span>{opt.label.split(':')[0]}</span>
                            <span>{pct}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Standby / Idle Mode */}
            {session.status === 'IDLE' && (
              <div className="sgx-panel border border-[var(--sgx-secondary)] p-6 shadow-xl text-center space-y-4">
                <div className="w-14 h-14 mx-auto bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Smartphone className="w-7 h-7 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white font-['Orbitron',sans-serif]">Stage Standby</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Director is prepping the next live visual decision. Keep this screen open!
                  </p>
                </div>

                {/* Nickname Editor */}
                <div className="pt-3 border-t border-[var(--sgx-secondary)] space-y-2 text-left">
                  <label className="text-xs font-mono font-bold text-slate-400 block">
                    Your Stage Nickname:
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={nicknameInput}
                      onChange={(e) => setNicknameInput(e.target.value)}
                      className="flex-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <button
                      onClick={() => onUpdateNickname(nicknameInput)}
                      className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-3 py-2 uppercase font-mono"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Reaction Emojis Floating Bar */}
            <div className="sgx-panel border border-[var(--sgx-secondary)] p-3 shadow-lg">
              <span className="text-[10px] font-mono text-slate-400 block mb-2 font-bold uppercase tracking-wider text-center">
                Send Live Stage Visual Particle Bursts:
              </span>
              <div className="flex items-center justify-around">
                {[
                  { emoji: '🔥', color: '#ff3b30' },
                  { emoji: '🚀', color: '#00ddff' },
                  { emoji: '⚡', color: '#ffd700' },
                  { emoji: '🎉', color: '#5f86b4' },
                  { emoji: '❤️', color: '#ff007f' },
                  { emoji: '💎', color: '#38bdf8' },
                ].map((item) => (
                  <button
                    key={item.emoji}
                    onClick={() => onReactionSend(item.emoji as any, item.color)}
                    className="text-2xl transform active:scale-125 transition-transform p-1.5 hover:bg-[var(--sgx-bg)]"
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Prize Tiers & QR Locker Tab */}
        {activeTab === 'REWARDS' && (
          <div className="space-y-4">
            <div className="sgx-panel border border-[var(--sgx-secondary)] p-5 shadow-xl space-y-2">
              <div className="flex items-center space-x-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">Prize & Perk Locker</h3>
              </div>
              <p className="text-xs text-slate-400">
                Unlock exclusive digital badges, merch discounts, and VIP shoutouts as your score grows!
              </p>
            </div>

            <div className="space-y-3">
              {tiers.map((tier) => {
                const isUnlocked = user.totalScore >= tier.minPoints && user.totalInteractions >= tier.minInteractions;

                return (
                  <div
                    key={tier.id}
                    onClick={() => isUnlocked && setSelectedPrizeModal(tier)}
                    className={`p-4 border transition-all ${
                      isUnlocked
                        ? 'border-amber-500/50 bg-[#121212] hover:border-amber-400 cursor-pointer shadow-lg'
                        : 'border-[var(--sgx-secondary)]/60 bg-[#0A0A0A] opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{tier.badgeIcon}</span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-sm text-white">{tier.name}</span>
                            {isUnlocked ? (
                              <span className="text-[10px] font-mono font-bold text-[#FDCC0D] bg-[#32527B] px-1.5 py-0.5 border border-[#FDCC0D]">
                                UNLOCKED
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-slate-400">
                                {tier.minPoints} pts
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block mt-0.5">
                            {tier.perkReward}
                          </span>
                        </div>
                      </div>

                      {isUnlocked && <QrCode className="w-5 h-5 text-amber-400 flex-shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* User Stats & History Tab */}
        {activeTab === 'STATS' && (
          <div className="space-y-4">
            <div className="sgx-panel border border-[var(--sgx-secondary)] p-5 shadow-xl space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-bold text-cyan-300 text-lg">
                  {user.nickname.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">{user.nickname}</h3>
                  <span className="text-xs text-slate-400 font-mono">ID: {user.id}</span>
                </div>
              </div>

              {/* Stats Matrix */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-[#0A0A0A] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Points</span>
                  <span className="text-xl font-bold font-mono text-amber-400">{user.totalScore}</span>
                </div>
                <div className="p-3 bg-[#0A0A0A] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Highest Streak</span>
                  <span className="text-xl font-bold font-mono text-[#FDCC0D]">{user.highestStreak}x</span>
                </div>
                <div className="p-3 bg-[#0A0A0A] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Decisions</span>
                  <span className="text-xl font-bold font-mono text-cyan-400">{user.totalInteractions}</span>
                </div>
                <div className="p-3 bg-[#0A0A0A] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] font-mono text-slate-400 uppercase block">Prizes Earned</span>
                  <span className="text-xl font-bold font-mono text-[#FDCC0D]">{unlockedPrizes.length}</span>
                </div>
              </div>
            </div>

            {/* Voting History */}
            <div className="sgx-panel border border-[var(--sgx-secondary)] p-5 shadow-xl space-y-3">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase">Recent Choice History:</h4>
              {user.choiceHistory.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No choices recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {user.choiceHistory.slice(-4).reverse().map((ch, idx) => (
                    <div key={idx} className="p-2.5 bg-[#0A0A0A] border border-[var(--sgx-secondary)] text-xs font-mono flex justify-between items-center">
                      <span className="text-slate-300">Choice: {ch.selectedOptionId}</span>
                      <span className="text-amber-400 font-bold">+{ch.pointsEarned} pts</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Prize Redemption QR Modal */}
      {selectedPrizeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-amber-500/50 p-6 max-w-sm w-full space-y-4 shadow-2xl text-center font-mono">
            <span className="text-4xl">{selectedPrizeModal.badgeIcon}</span>
            <h3 className="text-xl font-bold text-white font-['Orbitron',sans-serif]">{selectedPrizeModal.name}</h3>
            <p className="text-xs text-slate-300">{selectedPrizeModal.perkReward}</p>

            {/* Mock QR Code Pattern */}
            <div className="bg-white p-4 w-44 h-44 mx-auto flex items-center justify-center shadow-inner">
              <div className="text-center">
                <QrCode className="w-32 h-32 text-slate-900 mx-auto" />
                <span className="text-[10px] font-mono text-slate-800 font-bold block mt-1">
                  {selectedPrizeModal.couponCode}
                </span>
              </div>
            </div>

            <div className="p-2.5 bg-[#0A0A0A] border border-[var(--sgx-secondary)] font-mono text-xs text-amber-300">
              VOUCHER: <span className="font-bold">{selectedPrizeModal.couponCode}</span>
            </div>

            <button
              onClick={() => setSelectedPrizeModal(null)}
              className="w-full py-2.5 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-secondary)] text-white text-xs font-bold border border-[var(--sgx-secondary)] transition-colors"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-900/95 backdrop-blur-md border-t border-slate-800 py-2 px-6 flex items-center justify-around z-30">
        <button
          onClick={() => setActiveTab('VOTE')}
          className={`flex flex-col items-center space-y-1 text-xs font-mono font-bold ${
            activeTab === 'VOTE' ? 'text-[#FDCC0D]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Radio className="w-5 h-5" />
          <span>Live Vote</span>
        </button>

        <button
          onClick={() => setActiveTab('REWARDS')}
          className={`flex flex-col items-center space-y-1 text-xs font-mono font-bold relative ${
            activeTab === 'REWARDS' ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span>Prizes</span>
          {unlockedPrizes.length > 0 && (
            <span className="absolute -top-1 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('STATS')}
          className={`flex flex-col items-center space-y-1 text-xs font-mono font-bold ${
            activeTab === 'STATS' ? 'text-[#FDCC0D]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-5 h-5" />
          <span>Stats</span>
        </button>
      </div>

    </div>
  );
};
