import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Gift, 
  Trophy, 
  Award, 
  X, 
  Zap, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Search, 
  Filter, 
  Flame, 
  ShieldCheck, 
  QrCode, 
  Plus, 
  Edit3, 
  Trash2,
  Tag,
  Gamepad2,
  Vote,
  ShoppingBag
} from 'lucide-react';
import { GamificationReward, RedeemedPrize, LeaderboardEntry, RewardCategory } from '../../types/gamification';
import {
  loadAllRewards,
  loadUserRedeemedPrizes,
  redeemPrize
} from '../../lib/rewardsStore';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { SgxPilotGlyph } from '../../identity/SgxPilotGlyph';

/** Podium avatar: the in-house pilot glyph (no stock photos). */
const PodiumAvatar: React.FC<{ seed: string; color?: string; size: number; ring: string }> = ({ seed, color, size, ring }) => (
  <div
    className={`rounded-full border-2 ${ring} bg-black overflow-hidden flex items-center justify-center mt-3 shadow-md`}
    style={{ width: size, height: size }}
  >
    <SgxPilotGlyph seed={seed} accent={color || '#00DDFF'} size={size * 0.8} />
  </div>
);

type StoreLeaderRow = LeaderboardEntry & { avatarSeed: string; avatarColor?: string };

interface SummitRewardsStoreModalProps {
  onClose: () => void;
  currentUserXp?: number;
  onXpChange?: (newXp: number) => void;
  onOpenAdminRewards?: () => void;
  isAdmin?: boolean;
}

export const SummitRewardsStoreModal: React.FC<SummitRewardsStoreModalProps> = ({
  onClose,
  currentUserXp = 0,
  onXpChange,
  onOpenAdminRewards,
  isAdmin = false
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'STORE' | 'LEADERBOARD' | 'MY_PRIZES'>('STORE');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  
  const [rewards, setRewards] = useState<GamificationReward[]>([]);
  const [redeemedPrizes, setRedeemedPrizes] = useState<RedeemedPrize[]>([]);
  // The one real leaderboard: pilot_leaderboard (live, from PilotProfileContext).
  const { leaderboard: pilotLeaderboard } = usePilotProfile();
  const leaderboard: StoreLeaderRow[] = pilotLeaderboard.map(p => ({
    id: p.uid,
    userId: p.uid,
    username: p.nickname,
    totalXp: p.totalXp,
    votesCount: p.votesCount || 0,
    questsCount: p.connectionsCount || 0,
    droneHighScore: p.droneHighScore || 0,
    rankTitle: p.rankTitle,
    streak: 0,
    lastActivity: p.updatedAt,
    avatarSeed: p.avatarSeed || p.uid,
    avatarColor: p.avatarColor,
  }));
const [loading, setLoading] = useState<boolean>(true);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemingReward, setRedeemingReward] = useState<GamificationReward | null>(null);
  const [latestVoucher, setLatestVoucher] = useState<RedeemedPrize | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // One XP for the whole Summit: the balance is the SGX Pass balance
  // (earned XP minus what was already spent), so rank never drops.
  const sgxIdentity = useOptionalSgxIdentity();
  const userXp = sgxIdentity ? sgxIdentity.xpBalance : currentUserXp;

  // Load initial data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [rewardsData, redeemedData] = await Promise.all([
          loadAllRewards(),
          loadUserRedeemedPrizes(user?.uid)
        ]);
        setRewards(rewardsData.filter(r => r.active));
        setRedeemedPrizes(redeemedData);
      } catch (err) {
        console.error("Error loading store data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    playUiChirp(880);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleConfirmRedeem = async (reward: GamificationReward) => {
    if (userXp < reward.xpCost) {
      setRedeemError(`Necesitas ${reward.xpCost - userXp} XP adicionales para canjear este premio.`);
      playUiChirp(220, 'sawtooth');
      return;
    }

    if (!user?.uid) {
      setRedeemError('Conectando tu pase… intenta de nuevo en unos segundos.');
      return;
    }
    setRedeemError(null);
    const currentUserObj = {
      uid: user.uid,
      email: user?.email || 'asistente@spatialgineers.com',
      displayName: user?.displayName || 'Asistente Summit'
    };

    const result = await redeemPrize(reward, currentUserObj);
    if (result.success && result.voucher) {
      const newXp = Math.max(0, userXp - reward.xpCost);
      sgxIdentity?.spendXp({ rewardId: reward.id, title: reward.title, cost: reward.xpCost, voucher: result.voucher.voucherCode });
      if (onXpChange) onXpChange(newXp);

      setRedeemedPrizes(prev => [result.voucher!, ...prev]);
      setLatestVoucher(result.voucher);
      setRedeemingReward(null);

      // Confetti & Celebration
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#00DDFF', '#FDCC0D', '#10B981', '#EC4899']
      });
      playUiChirp(1200);
    } else {
      setRedeemError(result.error || 'Error al procesar el canje.');
    }
  };

  const filteredRewards = rewards.filter(r => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.sponsorName && r.sponsorName.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categories: { key: string; label: string; icon: string }[] = [
    { key: 'ALL', label: 'Todos los Premios', icon: '✨' },
    { key: 'WEBAPP_SUBSCRIPTION', label: 'Suscripciones WebApps', icon: '💻' },
    { key: 'SERVICE_CONSULTING', label: 'Mentoría & Servicios', icon: '🚀' },
    { key: 'PHYSICAL_SWAG', label: 'Merchandising & Swag', icon: '🎁' },
    { key: 'EARLY_ACCESS', label: 'Pases VIP & Betas', icon: '👑' }
  ];

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md font-sans text-slate-100"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl bg-[#111111] border-2 border-[var(--sgx-neon)] shadow-[0_0_50px_rgba(0, 221, 255,0.2)] flex flex-col max-h-[94vh] relative overflow-hidden"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* Top Cyber Accent Strip */}
        <div className="h-1.5 bg-gradient-to-r from-[var(--sgx-neon)] via-[#FDCC0D] to-[#32527B] shrink-0" />

        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[var(--sgx-secondary)] bg-[#0D0D0D] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shrink-0">
          
          <div className="flex items-center space-x-3.5">
            <div 
              className="p-3 bg-gradient-to-br from-cyan-950 to-blue-900 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] shadow-lg shadow-cyan-500/20"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg sm:text-xl font-black font-['Orbitron',sans-serif] text-white tracking-wide uppercase">
                  TIENDA DE CANJE & LEADERBOARD
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] font-extrabold uppercase">
                  SUMMIT 2026
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Canjea tus puntos ganados por votos, misiones y minijuegos por servicios y suscripciones a nuestras webapps gratis.
              </p>
            </div>
          </div>

          {/* Right Side: XP Balance & Close */}
          <div className="flex items-center space-x-3 self-end md:self-center">
            
            {/* User XP Badge */}
            <div 
              className="px-3.5 py-2 bg-black/80 border border-[#FDCC0D] text-[#FDCC0D] flex items-center space-x-2 font-mono shadow-md"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <Zap className="w-4 h-4 fill-current animate-pulse" />
              <div>
                <div className="text-[10px] text-slate-400 leading-none">TU BALANCE DISPONIBLE:</div>
                <div className="text-sm font-black text-white">{userXp} <span className="text-[#FDCC0D]">XP</span></div>
              </div>
            </div>

            {isAdmin && onOpenAdminRewards && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAdminRewards();
                }}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-2 bg-[#191919] border border-[#FDCC0D] text-[#FDCC0D] hover:bg-[#FDCC0D] hover:text-black font-mono text-xs font-bold transition-colors"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>EDITAR PREMIOS (ADMIN)</span>
              </button>
            )}

            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white border border-transparent hover:border-[var(--sgx-secondary)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

        </div>

        {/* Navigation Tabs Bar */}
        <div className="bg-[#131313] border-b border-[var(--sgx-secondary)] px-4 sm:px-6 py-2 flex items-center justify-between overflow-x-auto gap-2 shrink-0">
          <div className="flex items-center space-x-2 font-mono text-xs">
            
            <button
              onClick={() => {
                setActiveTab('STORE');
                playUiChirp(600);
              }}
              className={`px-4 py-2 font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'STORE'
                  ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>CATÁLOGO DE CANJE ({rewards.length})</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('LEADERBOARD');
                playUiChirp(700);
              }}
              className={`px-4 py-2 font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'LEADERBOARD'
                  ? 'bg-[#FDCC0D] text-black font-extrabold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Trophy className="w-4 h-4" />
              <span>RANKING DEL FIN DE SEMANA</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('MY_PRIZES');
                playUiChirp(800);
              }}
              className={`px-4 py-2 font-bold transition-all flex items-center space-x-2 whitespace-nowrap ${
                activeTab === 'MY_PRIZES'
                  ? 'bg-[#32527B] text-white border border-[#FDCC0D] font-extrabold shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Award className="w-4 h-4" />
              <span>MIS PREMIOS CANJEADOS ({redeemedPrizes.length})</span>
            </button>

          </div>

          <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-slate-400">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Score final se consolida al cierre del Summit</span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[#0F0F0F]">
          
          {/* TAB 1: REWARDS STORE CATALOG */}
          {activeTab === 'STORE' && (
            <div className="space-y-6">
              
              {/* Filter Bar & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0D0D0D] p-3 border border-[var(--sgx-secondary)]">
                
                {/* Category Chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => {
                        setSelectedCategory(cat.key);
                        playUiChirp(500);
                      }}
                      className={`px-3 py-1.5 text-xs font-mono font-bold whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                        selectedCategory === cat.key
                          ? 'bg-[var(--sgx-neon)] text-black'
                          : 'bg-black/50 text-slate-300 hover:text-white border border-[var(--sgx-secondary)]'
                      }`}
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar webapp o servicio..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-black border border-[var(--sgx-secondary)] pl-9 pr-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 focus:border-[var(--sgx-neon)] outline-none"
                  />
                </div>

              </div>

              {/* Redeem Error Banner */}
              {redeemError && (
                <div className="p-3 bg-[#1A0A0A] border border-amber-600 text-amber-200 text-xs font-mono flex items-center justify-between">
                  <span>⚠️ {redeemError}</span>
                  <button onClick={() => setRedeemError(null)} className="text-slate-400 hover:text-white font-bold ml-2">
                    CERRAR
                  </button>
                </div>
              )}

              {/* Rewards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRewards.map((reward) => {
                  const canAfford = userXp >= reward.xpCost;
                  const isOutOfStock = reward.inventoryCount !== -1 && reward.inventoryCount <= 0;

                  return (
                    <div
                      key={reward.id}
                      className="bg-[#191919] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]/60 transition-all p-5 flex flex-col justify-between relative group shadow-lg"
                      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span className="text-2xl p-2 bg-black/60 border border-[var(--sgx-secondary)] rounded shrink-0">
                            {reward.badgeIcon || '⚡'}
                          </span>
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-slate-400 uppercase">VALOR OFICIAL:</div>
                            <div className="text-xs font-mono font-bold text-[#FDCC0D]">{reward.originalValueUsd}</div>
                          </div>
                        </div>

                        {/* Title & Category */}
                        <div className="text-[10px] font-mono font-extrabold uppercase text-[var(--sgx-neon)] tracking-wider">
                          {reward.category.replace('_', ' ')}
                        </div>
                        <h3 className="text-sm font-bold text-white font-['Orbitron',sans-serif] mt-1 leading-snug">
                          {reward.title}
                        </h3>

                        <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                          {reward.description}
                        </p>

                        {/* Features bullet list */}
                        {reward.features && reward.features.length > 0 && (
                          <div className="mt-3.5 space-y-1 pt-3 border-t border-slate-800">
                            {reward.features.slice(0, 3).map((feat, i) => (
                              <div key={i} className="flex items-start space-x-1.5 text-[11px] text-slate-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
                                <span className="line-clamp-1">{feat}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="mt-5 pt-4 border-t border-[var(--sgx-secondary)] space-y-3">
                        
                        <div className="flex items-center justify-between text-xs font-mono">
                          <div>
                            <span className="text-slate-400 text-[10px]">COSTO CANJE:</span>
                            <div className="font-extrabold text-[#FDCC0D] text-base flex items-center space-x-1">
                              <Zap className="w-4 h-4 fill-current" />
                              <span>{reward.xpCost} XP</span>
                            </div>
                          </div>

                          <div className="text-right text-[11px] font-mono">
                            <span className="text-slate-500">DISPONIBILIDAD:</span>
                            <div className="text-slate-300 font-bold">
                              {reward.inventoryCount === -1 ? 'Ilimitado' : `${reward.inventoryCount} cupos rest.`}
                            </div>
                          </div>
                        </div>

                        {/* Redeem Button */}
                        {isOutOfStock ? (
                          <button
                            disabled
                            className="w-full py-2.5 bg-slate-800 text-slate-500 text-xs font-mono font-bold cursor-not-allowed text-center uppercase"
                          >
                            AGOTADO TEMPORALMENTE
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setRedeemingReward(reward);
                              playUiChirp(700);
                            }}
                            className={`w-full py-2.5 text-xs font-mono font-black transition-all flex items-center justify-center space-x-2 ${
                              canAfford
                                ? 'bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black shadow-lg shadow-cyan-500/30 hover:scale-[1.02]'
                                : 'bg-slate-900 border border-[var(--sgx-secondary)] text-slate-400 hover:text-white hover:border-[#FDCC0D]'
                            }`}
                            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                          >
                            <Gift className="w-4 h-4" />
                            <span>
                              {canAfford ? 'CANJEAR PREMIO AHORA' : `NECESITAS ${reward.xpCost - userXp} XP MÁS`}
                            </span>
                          </button>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB 2: WEEKEND SCOREBOARD & LEADERBOARD */}
          {activeTab === 'LEADERBOARD' && (
            <div className="space-y-6">
              {leaderboard.length === 0 ? (
                <div className="p-8 text-center bg-[#0D0D0D] border border-[var(--sgx-secondary)] space-y-3">
                  <Trophy className="w-10 h-10 text-[var(--sgx-neon)] mx-auto opacity-60" />
                  <h3 className="text-sm font-bold text-white uppercase font-mono">Tabla de Clasificación Vacía</h3>
                  <p className="text-xs text-slate-400 font-mono max-w-md mx-auto">
                    Aún no hay participantes en la tabla de clasificación. ¡Sé el primero en ganar XP completando misiones del Reactor o participando en votaciones en vivo!
                  </p>
                </div>
              ) : (
                <>
                  {/* Podium Visualizer (Top 3) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                
                {/* 2nd Place */}
                {leaderboard[1] && (
                  <div 
                    className="bg-[#171717] border-2 border-slate-400/70 p-5 flex flex-col items-center text-center relative order-2 md:order-1"
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-slate-400 text-black font-black font-mono text-lg flex items-center justify-center -mt-8 shadow-lg border-2 border-white">
                      2
                    </div>
                    <PodiumAvatar seed={leaderboard[1].avatarSeed} color={leaderboard[1].avatarColor} size={64} ring="border-slate-400" />
                    <h4 className="text-sm font-bold text-white mt-2 truncate w-full">{leaderboard[1].username}</h4>
                    <span className="text-[11px] font-mono text-slate-400">{leaderboard[1].rankTitle}</span>
                    <div className="mt-3 px-3 py-1 bg-black/60 border border-slate-400/50 text-slate-200 font-mono font-extrabold text-sm">
                      {leaderboard[1].totalXp} XP
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-2 flex items-center space-x-2">
                      <span>🗳️ {leaderboard[1].votesCount} Votos</span>
                      <span>🎯 {leaderboard[1].questsCount} Conexiones</span>
                    </div>
                  </div>
                )}

                {/* 1st Place (Champion) */}
                {leaderboard[0] && (
                  <div 
                    className="bg-gradient-to-b from-amber-950/40 to-[#171717] border-2 border-[#FDCC0D] p-6 flex flex-col items-center text-center relative order-1 md:order-2 shadow-[0_0_30px_rgba(253,204,13,0.3)]"
                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FDCC0D] text-black font-black font-mono text-xl flex items-center justify-center -mt-10 shadow-xl border-2 border-white animate-bounce">
                      👑 1
                    </div>
                    <PodiumAvatar seed={leaderboard[0].avatarSeed} color={leaderboard[0].avatarColor} size={80} ring="border-[#FDCC0D]" />
                    <h4 className="text-base font-black text-white mt-2 truncate w-full">{leaderboard[0].username}</h4>
                    <span className="text-xs font-mono text-[#FDCC0D] font-bold">{leaderboard[0].rankTitle}</span>
                    <div className="mt-3 px-4 py-1.5 bg-[#FDCC0D] text-black font-mono font-black text-base shadow-lg">
                      {leaderboard[0].totalXp} XP
                    </div>
                    <div className="text-[11px] text-amber-200 font-mono mt-2 flex items-center space-x-3">
                      <span>🗳️ {leaderboard[0].votesCount} Votos</span>
                      <span>🎯 {leaderboard[0].questsCount} Conexiones</span>
                    </div>
                  </div>
                )}

                {/* 3rd Place */}
                {leaderboard[2] && (
                  <div 
                    className="bg-[#171717] border-2 border-amber-700/70 p-5 flex flex-col items-center text-center relative order-3"
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-700 text-white font-black font-mono text-lg flex items-center justify-center -mt-8 shadow-lg border-2 border-white">
                      3
                    </div>
                    <PodiumAvatar seed={leaderboard[2].avatarSeed} color={leaderboard[2].avatarColor} size={64} ring="border-amber-700" />
                    <h4 className="text-sm font-bold text-white mt-2 truncate w-full">{leaderboard[2].username}</h4>
                    <span className="text-[11px] font-mono text-amber-400">{leaderboard[2].rankTitle}</span>
                    <div className="mt-3 px-3 py-1 bg-black/60 border border-amber-700/50 text-amber-200 font-mono font-extrabold text-sm">
                      {leaderboard[2].totalXp} XP
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono mt-2 flex items-center space-x-2">
                      <span>🗳️ {leaderboard[2].votesCount} Votos</span>
                      <span>🎯 {leaderboard[2].questsCount} Conexiones</span>
                    </div>
                  </div>
                )}

              </div>

              {/* Full Ranking Table */}
              <div className="bg-[#0D0D0D] border border-[var(--sgx-secondary)] overflow-hidden">
                <div className="p-3 bg-black border-b border-[var(--sgx-secondary)] font-mono text-xs font-bold text-slate-300 flex items-center justify-between">
                  <span>TABLA COMPLETA DE PARTICIPACIÓN DEL FIN DE SEMANA</span>
                  <span className="text-cyan-400">Puntaje en Tiempo Real</span>
                </div>

                <div className="divide-y divide-slate-800 font-mono text-xs">
                  {leaderboard.map((entry, index) => {
                    const isTop3 = index < 3;
                    return (
                      <div 
                        key={entry.id || index}
                        className={`p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors ${
                          index === 0 ? 'bg-amber-950/20' : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <span className={`w-6 text-center font-bold text-sm ${
                            index === 0 ? 'text-[#FDCC0D]' : index === 1 ? 'text-slate-300' : index === 2 ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            #{index + 1}
                          </span>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white truncate">{entry.username}</span>
                              {entry.pillar && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-black border border-[var(--sgx-secondary)] text-[var(--sgx-neon)] uppercase">
                                  {entry.pillar.replace('SGX.', '')}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {entry.rankTitle} • {entry.votesCount} votos • {entry.questsCount} conexiones
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-black text-[#FDCC0D]">{entry.totalXp} XP</div>
                          {entry.droneHighScore > 0 && (
                            <div className="text-[10px] text-slate-500">Dron: {entry.droneHighScore} pts</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Current Position Banner */}
              <div 
                className="p-4 bg-cyan-950/40 border-2 border-[var(--sgx-neon)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[var(--sgx-neon)] text-black font-extrabold rounded">
                    TU SCORE
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">
                      {user?.displayName || user?.email || 'Asistente Summit'}
                    </div>
                    <div className="text-cyan-300 text-xs">
                      Participa en más votos y misiones para subir al podio final del domingo.
                    </div>
                  </div>
                </div>

                <div className="text-right font-extrabold text-base text-[#FDCC0D]">
                  {userXp} XP ACUMULADOS
                </div>
              </div>
            </>
          )}
        </div>
      )}

          {/* TAB 3: MY REDEEMED VOUCHERS & LICENSES */}
          {activeTab === 'MY_PRIZES' && (
            <div className="space-y-4">
              
              {redeemedPrizes.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-[var(--sgx-secondary)] bg-[#0D0D0D] space-y-3">
                  <Gift className="w-10 h-10 text-slate-600 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-300 font-mono">Aún no has canjeado premios</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Explora el catálogo de canje, acumula XP votando en las sesiones en vivo y canjea licencias de software, suscripciones y mentorías gratuitas.
                  </p>
                  <button
                    onClick={() => setActiveTab('STORE')}
                    className="px-4 py-2 bg-[var(--sgx-neon)] text-black font-mono font-bold text-xs hover:bg-cyan-300 transition-colors"
                  >
                    Ver Catálogo de Premios
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {redeemedPrizes.map((prize) => (
                    <div
                      key={prize.id}
                      className="bg-[#191919] border border-[#FDCC0D]/60 p-5 space-y-4 relative shadow-lg"
                      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-[#191919] border border-[#FDCC0D] text-[#FDCC0D] font-bold uppercase">
                            CANJEADO EXITOSAMENTE
                          </span>
                          <h4 className="text-sm font-bold text-white font-['Orbitron',sans-serif] mt-1.5">
                            {prize.rewardTitle}
                          </h4>
                        </div>
                        <div className="text-right text-[11px] font-mono text-slate-400">
                          {new Date(prize.claimedAt).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Code Box */}
                      <div className="p-3 bg-black border border-[var(--sgx-secondary)] space-y-1">
                        <div className="text-[10px] text-slate-400 font-mono">CÓDIGO DE LICENCIA / VOUCHER:</div>
                        <div className="flex items-center justify-between">
                          <code className="text-sm font-mono font-extrabold text-[#FDCC0D] tracking-wider">
                            {prize.voucherCode}
                          </code>
                          <button
                            onClick={() => handleCopyCode(prize.voucherCode)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono flex items-center space-x-1"
                          >
                            {copiedCode === prize.voucherCode ? <Check className="w-3.5 h-3.5 text-[#FDCC0D]" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCode === prize.voucherCode ? 'Copiado' : 'Copiar'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="flex items-center justify-between pt-1 text-xs font-mono">
                        <span className="text-slate-400 text-[11px]">Inversión: {prize.xpSpent} XP</span>
                        {prize.accessUrl && (
                          <a
                            href={prize.accessUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--sgx-neon)] hover:underline flex items-center space-x-1 font-bold"
                          >
                            <span>Abrir WebApp / Redimir</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

        </div>

        {/* Confirmation Modal Overlay when user clicks Redeem */}
        {redeemingReward && (
          <div className="fixed inset-0 z-[100000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div 
              className="w-full max-w-md bg-[#151515] border-2 border-[var(--sgx-neon)] p-6 space-y-5 text-slate-100 relative shadow-2xl"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)] pb-3">
                <div className="flex items-center space-x-2.5">
                  <span className="text-2xl">{redeemingReward.badgeIcon}</span>
                  <h3 className="text-base font-bold font-['Orbitron',sans-serif] text-white">
                    Confirmar Canje
                  </h3>
                </div>
                <button onClick={() => setRedeemingReward(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <p className="text-slate-300">
                  Estás a punto de canjear <strong className="text-white">{redeemingReward.title}</strong>.
                </p>

                <div className="p-3 bg-black border border-[var(--sgx-secondary)] space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Balance Actual:</span>
                    <span className="text-white font-bold">{userXp} XP</span>
                  </div>
                  <div className="flex justify-between text-[#FDCC0D]">
                    <span>Costo del Premio:</span>
                    <span className="font-extrabold">-{redeemingReward.xpCost} XP</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-800 pt-1.5 font-bold">
                    <span className="text-slate-300">Balance Restante:</span>
                    <span className="text-[var(--sgx-neon)]">{userXp - redeemingReward.xpCost} XP</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  Al confirmar, se generará tu voucher con código de licencia digital y acceso instantáneo.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  onClick={() => setRedeemingReward(null)}
                  className="px-4 py-2 bg-slate-900 border border-[var(--sgx-secondary)] hover:bg-slate-800 text-xs font-mono"
                >
                  CANCELAR
                </button>
                <button
                  onClick={() => handleConfirmRedeem(redeemingReward)}
                  className="px-5 py-2 bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black font-mono font-black text-xs shadow-lg"
                >
                  SÍ, CANJEAR AHORA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-[#0D0D0D] border-t border-[var(--sgx-secondary)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shrink-0">
          <span className="text-slate-400 text-[11px]">
            Spatialgineers Gamification Engine • Puntuaciones y licencias sincronizadas en la nube
          </span>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-white text-xs font-bold transition-colors"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            CERRAR TIENDA
          </button>
        </div>

      </div>
    </div>
  );
};
