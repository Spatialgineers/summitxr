import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Gift, Trophy, Award, CheckCircle2, ExternalLink, Copy, Check, Search, Edit3, AlertTriangle, ShoppingBag } from 'lucide-react';
import { GamificationReward, RedeemedPrize, LeaderboardEntry, RewardCategory } from '../../types/gamification';
import { loadAllRewards, loadUserRedeemedPrizes, redeemPrize } from '../../lib/rewardsStore';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { calculateRankAndLevel, rankLabel, usePilotProfile } from '../../context/PilotProfileContext';
import { SgxPilotGlyph } from '../../identity/SgxPilotGlyph';
import { SgxBolt } from '../../immersion/SgxSymbols';
import { SgxDialog } from '../common/SgxDialog';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import './sgxModals.css';

/* REWARDS STORE: spend Summit XP (the SGX Pass balance) on prizes, see the
   weekend ranking and your vouchers. Each category wears an SGX mark. */

type StoreLeaderRow = LeaderboardEntry & { avatarSeed: string; avatarColor?: string };
type Tab = 'STORE' | 'LEADERBOARD' | 'MY_PRIZES';

const CATEGORY: Record<RewardCategory | 'ALL', { es: string; en: string; mark: string }> = {
  ALL: { es: 'Todos', en: 'All', mark: '/holo/summitIcon.png' },
  WEBAPP_SUBSCRIPTION: { es: 'Suscripciones', en: 'Subscriptions', mark: '/holo/system.png' },
  SERVICE_CONSULTING: { es: 'Mentoría y servicios', en: 'Mentoring & services', mark: '/holo/synthesize.png' },
  PHYSICAL_SWAG: { es: 'Mercancía', en: 'Merch', mark: '/holo/showcase.png' },
  EARLY_ACCESS: { es: 'Acceso anticipado', en: 'Early access', mark: '/holo/guild.png' },
  VIP_PASS: { es: 'Pases VIP', en: 'VIP passes', mark: '/holo/stage.png' },
  DIGITAL_ASSET: { es: 'Activos digitales', en: 'Digital assets', mark: '/holo/spark.png' },
};
const FILTERS: (RewardCategory | 'ALL')[] = ['ALL', 'WEBAPP_SUBSCRIPTION', 'SERVICE_CONSULTING', 'PHYSICAL_SWAG', 'EARLY_ACCESS'];
const PLACE_COLOR = ['var(--SGX_Yellow)', 'var(--SGX_Cyan)', '#B87000'];

interface SummitRewardsStoreModalProps {
  onClose: () => void;
  currentUserXp?: number;
  onXpChange?: (newXp: number) => void;
  onOpenAdminRewards?: () => void;
  isAdmin?: boolean;
}

const Face: React.FC<{ row: StoreLeaderRow; place: number; size?: number }> = ({ row, place, size = 64 }) => (
  <span className="sgx-rw__face" style={{ width: size, height: size, ['--place' as string]: PLACE_COLOR[place] }}>
    <SgxPilotGlyph seed={row.avatarSeed} accent={row.avatarColor || '#00DDFF'} size={size * 0.8} />
  </span>
);

export const SummitRewardsStoreModal: React.FC<SummitRewardsStoreModalProps> = ({
  onClose,
  currentUserXp = 0,
  onXpChange,
  onOpenAdminRewards,
  isAdmin = false
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('STORE');
  const [selectedCategory, setSelectedCategory] = useState<RewardCategory | 'ALL'>('ALL');

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
    rankTitle: rankLabel(p.level || calculateRankAndLevel(p.totalXp || 0).level, es),
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
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    playUiChirp(880);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handleConfirmRedeem = async (reward: GamificationReward) => {
    if (userXp < reward.xpCost) {
      setRedeemError((es ? `Necesitas ${reward.xpCost - userXp} XP adicionales para canjear este premio.` : `You need ${reward.xpCost - userXp} more XP to redeem this prize.`));
      setRedeemingReward(null);
      playUiChirp(220, 'sawtooth');
      return;
    }

    if (!user?.uid) {
      setRedeemError(es ? 'Conectando tu pase… intenta de nuevo en unos segundos.' : 'Connecting your pass… try again in a few seconds.');
      setRedeemingReward(null);
      return;
    }
    setRedeemError(null);
    const currentUserObj = {
      uid: user.uid,
      email: user?.email || 'asistente@spatialgineers.com',
      displayName: user?.displayName || (es ? 'Asistente Summit' : 'Summit Attendee')
    };

    const result = await redeemPrize(reward, currentUserObj);
    if (result.success && result.voucher) {
      const newXp = Math.max(0, userXp - reward.xpCost);
      sgxIdentity?.spendXp({ rewardId: reward.id, title: loc(reward, 'title', language), cost: reward.xpCost, voucher: result.voucher.voucherCode });
      if (onXpChange) onXpChange(newXp);

      setRedeemedPrizes(prev => [result.voucher!, ...prev]);
      setLatestVoucher(result.voucher);
      setRedeemingReward(null);

      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#00DDFF', '#FDCC0D', '#FFBB00', '#32527B'],
        disableForReducedMotion: true,
      });
      playUiChirp(1200);
    } else {
      setRedeemingReward(null);
      setRedeemError(result.error || (es ? 'Error al procesar el canje.' : 'Error processing the redemption.'));
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredRewards = rewards.filter(r => {
    const matchesCategory = selectedCategory === 'ALL' || r.category === selectedCategory;
    const matchesSearch = q === '' ||
      loc(r, 'title', language).toLowerCase().includes(q) ||
      loc(r, 'description', language).toLowerCase().includes(q) ||
      (r.sponsorName && r.sponsorName.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const catLabel = (c: RewardCategory | 'ALL') => (CATEGORY[c] ? (es ? CATEGORY[c].es : CATEGORY[c].en) : c);
  const catMark = (c: RewardCategory) => CATEGORY[c]?.mark || '/holo/bolt.png';

  const tabs: { key: Tab; icon: React.ReactNode; label: string; count?: number }[] = [
    { key: 'STORE', icon: <ShoppingBag size={16} aria-hidden />, label: es ? 'Catálogo' : 'Catalog', count: rewards.length },
    { key: 'LEADERBOARD', icon: <Trophy size={16} aria-hidden />, label: es ? 'Ranking del fin de semana' : 'Weekend ranking' },
    { key: 'MY_PRIZES', icon: <Award size={16} aria-hidden />, label: es ? 'Mis premios' : 'My prizes', count: redeemedPrizes.length },
  ];

  const balance = (
    <div className="sgx-rw__balance" aria-live="polite">
      <span>{es ? 'Tu balance' : 'Your balance'}</span>
      <b><SgxBolt size={16} /> {userXp} XP</b>
    </div>
  );

  return (
    <>
      <SgxDialog
        onClose={() => { if (!redeemingReward) onClose(); }}
        title={es ? 'Tienda de canje' : 'Rewards store'}
        kicker={es ? 'Canjea el XP de votos, misiones y minijuegos por premios reales.' : 'Spend the XP from votes, missions and mini-games on real prizes.'}
        icon={<img src="/holo/bolt.png" alt="" />}
        headerExtra={balance}
        size="lg"
        toolbar={
          <div className="sgx-m-tabs" role="tablist" aria-label={es ? 'Secciones de la tienda' : 'Store sections'}>
            {tabs.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={activeTab === t.key} onClick={() => { setActiveTab(t.key); playUiChirp(600); }}>
                {t.icon}<span>{t.label}</span>{t.count !== undefined && <b>{t.count}</b>}
              </button>
            ))}
          </div>
        }
        footer={
          <>
            <p className="sgx-m-fine sgx-m-footnote">
              {es ? 'El ranking final se cierra al terminar el Summit (13 dic).' : 'The final ranking locks when the Summit ends (Dec 13).'}
            </p>
            {isAdmin && onOpenAdminRewards && (
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { onClose(); onOpenAdminRewards(); }}>
                <Edit3 size={14} aria-hidden /> {es ? 'Editar premios' : 'Edit prizes'}
              </button>
            )}
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>
          </>
        }
      >
        <div className="sgx-m sgx-m-stack">
          {activeTab === 'STORE' && (
            <>
              <div className="sgx-m-row">
                <div className="sgx-m-chips" style={{ flex: '1 1 320px', minWidth: 0 }} role="group" aria-label={es ? 'Filtrar por categoría' : 'Filter by category'}>
                  {FILTERS.map((key) => (
                    <button key={key} type="button" className="sgx-m-chip" aria-pressed={selectedCategory === key} onClick={() => { setSelectedCategory(key); playUiChirp(500); }}>
                      <img src={CATEGORY[key].mark} alt="" />
                      {catLabel(key)}
                    </button>
                  ))}
                </div>
                <label className="sgx-m-search">
                  <Search size={16} aria-hidden />
                  <input
                    type="search"
                    className="sgx-m-input"
                    aria-label={es ? 'Buscar premio' : 'Search prizes'}
                    placeholder={es ? 'Buscar premio o servicio…' : 'Search prize or service…'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </label>
              </div>

              {latestVoucher && (
                <div className="sgx-m-note sgx-m-note--ok" role="status">
                  <CheckCircle2 size={18} aria-hidden />
                  <div>
                    <strong>{es ? 'Canje listo: ' : 'Redeemed: '}{latestVoucher.rewardTitle}</strong>
                    <p className="sgx-m-fine">{es ? 'Tu código: ' : 'Your code: '}<code>{latestVoucher.voucherCode}</code>{es ? ' · También está en «Mis premios».' : ' · It is also in “My prizes”.'}</p>
                  </div>
                  <button type="button" className="sgx-m-iconbtn" aria-label={es ? 'Cerrar aviso' : 'Dismiss'} onClick={() => setLatestVoucher(null)}>✕</button>
                </div>
              )}

              {redeemError && (
                <div className="sgx-m-note sgx-m-note--warn" role="alert">
                  <AlertTriangle size={18} aria-hidden />
                  <div>{redeemError}</div>
                  <button type="button" className="sgx-m-iconbtn" aria-label={es ? 'Cerrar aviso' : 'Dismiss'} onClick={() => setRedeemError(null)}>✕</button>
                </div>
              )}

              {loading ? (
                <p className="sgx-m-fine">{es ? 'Cargando premios…' : 'Loading prizes…'}</p>
              ) : filteredRewards.length === 0 ? (
                <div className="sgx-m-empty">
                  <img src="/holo/gear.png" alt="" />
                  <p className="sgx-m-p">{es ? 'No hay premios con ese filtro.' : 'No prizes match that filter.'}</p>
                </div>
              ) : (
                <div className="sgx-m-grid">
                  {filteredRewards.map((reward) => {
                    const canAfford = userXp >= reward.xpCost;
                    const isOutOfStock = reward.inventoryCount !== -1 && reward.inventoryCount <= 0;
                    const features = loc(reward, 'features', language) || [];
                    return (
                      <article key={reward.id} className={`sgx-m-card ${canAfford && !isOutOfStock ? 'sgx-m-card--cyan' : ''}`}>
                        <div className="sgx-rw__card-top">
                          <img className="sgx-m-mark sgx-m-mark--lg" src={catMark(reward.category)} alt="" />
                          <div className="sgx-m-readout" style={{ alignItems: 'flex-end', textAlign: 'right' }}>
                            <span>{es ? 'Valor' : 'Value'}</span>
                            <b style={{ fontSize: '0.85rem', color: 'var(--SGX_Yellow)' }}>{loc(reward, 'originalValueUsd', language)}</b>
                          </div>
                        </div>
                        <p className="sgx-m-kicker">{catLabel(reward.category)}</p>
                        <h3 className="sgx-m-h">{loc(reward, 'title', language)}</h3>
                        <p className="sgx-m-p sgx-m-clamp3">{loc(reward, 'description', language)}</p>
                        {features.length > 0 && (
                          <ul className="sgx-m-bullets">
                            {features.slice(0, 3).map((feat, i) => <li key={i}>{feat}</li>)}
                          </ul>
                        )}
                        <div className="sgx-rw__card-foot">
                          <div className="sgx-m-readout">
                            <span>{es ? 'Costo' : 'Cost'}</span>
                            <span className="sgx-m-xp"><SgxBolt size={16} />{reward.xpCost} XP</span>
                          </div>
                          <div className="sgx-m-readout" style={{ alignItems: 'flex-end' }}>
                            <span>{es ? 'Disponibles' : 'Available'}</span>
                            <b style={{ fontSize: '0.85rem' }}>{reward.inventoryCount === -1 ? (es ? 'Sin límite' : 'Unlimited') : reward.inventoryCount}</b>
                          </div>
                        </div>
                        {isOutOfStock ? (
                          <button type="button" className="sgx-btn sgx-btn--sm sgx-m-btnfull" disabled>{es ? 'Agotado' : 'Sold out'}</button>
                        ) : canAfford ? (
                          <button type="button" className="sgx-btn sgx-btn--sm sgx-m-btnfull" onClick={() => { setRedeemingReward(reward); playUiChirp(700); }}>
                            <Gift size={16} aria-hidden /> {es ? 'Canjear' : 'Redeem'}
                          </button>
                        ) : (
                          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground sgx-m-btnfull" disabled>
                            {es ? `Te faltan ${reward.xpCost - userXp} XP` : `${reward.xpCost - userXp} XP to go`}
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {activeTab === 'LEADERBOARD' && (
            leaderboard.length === 0 ? (
              <div className="sgx-m-empty">
                <img src="/holo/stage.png" alt="" />
                <h3 className="sgx-m-h">{es ? 'El ranking está vacío' : 'The ranking is empty'}</h3>
                <p className="sgx-m-p">{es ? 'Aún no hay participantes. Gana XP con las misiones del Reactor o votando en vivo y aparece aquí.' : 'No one is here yet. Earn XP with Reactor missions or live votes and show up here.'}</p>
              </div>
            ) : (
              <>
                <div className="sgx-rw__podium">
                  {leaderboard.slice(0, 3).map((row, i) => (
                    <div key={row.id} className={`sgx-m-card ${i === 0 ? 'sgx-m-card--gold is-first' : i === 1 ? 'sgx-m-card--cyan is-second' : 'is-third'}`} style={{ ['--place' as string]: PLACE_COLOR[i] }}>
                      <span className="sgx-rw__place">#{i + 1}</span>
                      <Face row={row} place={i} size={i === 0 ? 76 : 60} />
                      <span className="sgx-rw__name">{row.username}</span>
                      <span className="sgx-m-fine">{row.rankTitle}</span>
                      <span className="sgx-m-xp">{row.totalXp} XP</span>
                      <span className="sgx-m-fine">{row.votesCount} {es ? 'votos' : 'votes'} · {row.questsCount} {es ? 'conexiones' : 'connections'}</span>
                    </div>
                  ))}
                </div>

                <div className="sgx-rw__table">
                  <header><span>{es ? 'Tabla completa' : 'Full table'}</span><span>XP</span></header>
                  {leaderboard.map((entry, index) => (
                    <div key={entry.id || index} className={`sgx-rw__row ${index < 3 ? 'is-top' : ''}`}>
                      <div className="sgx-rw__who">
                        <span className="sgx-rw__pos">#{index + 1}</span>
                        <div>
                          <div className="sgx-rw__name">{entry.username}</div>
                          <p className="sgx-m-fine">{entry.rankTitle} · {entry.votesCount} {es ? 'votos' : 'votes'} · {entry.questsCount} {es ? 'conexiones' : 'connections'}</p>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className="sgx-m-xp">{entry.totalXp}</span>
                        {entry.droneHighScore > 0 && <p className="sgx-m-fine">{es ? 'Dron' : 'Drone'}: {entry.droneHighScore}</p>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="sgx-m-card sgx-m-card--cyan">
                  <div className="sgx-m-row sgx-m-row--between">
                    <div>
                      <p className="sgx-m-kicker">{es ? 'Tu puntaje' : 'Your score'}</p>
                      <p className="sgx-m-p">{es ? 'Vota y completa misiones para subir al podio final del domingo 13.' : 'Vote and complete missions to reach the final podium on Sunday the 13th.'}</p>
                    </div>
                    <span className="sgx-m-xp" style={{ fontSize: '1.2rem' }}><SgxBolt size={18} />{userXp} XP</span>
                  </div>
                </div>
              </>
            )
          )}

          {activeTab === 'MY_PRIZES' && (
            redeemedPrizes.length === 0 ? (
              <div className="sgx-m-empty">
                <img src="/holo/showcase.png" alt="" />
                <h3 className="sgx-m-h">{es ? 'Aún no has canjeado premios' : "You haven't redeemed any prizes yet"}</h3>
                <p className="sgx-m-p">{es ? 'Acumula XP votando en las sesiones en vivo y canjéalo por suscripciones, mentorías y más.' : 'Earn XP by voting in the live sessions and spend it on subscriptions, mentoring and more.'}</p>
                <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setActiveTab('STORE')}>{es ? 'Ver catálogo' : 'View catalog'}</button>
              </div>
            ) : (
              <div className="sgx-m-grid">
                {redeemedPrizes.map((prize) => (
                  <article key={prize.id} className="sgx-m-card sgx-m-card--gold">
                    <div className="sgx-m-row sgx-m-row--between">
                      <span className="sgx-m-tag sgx-m-tag--gold"><Check size={12} aria-hidden /> {es ? 'Canjeado' : 'Redeemed'}</span>
                      <span className="sgx-m-fine">{new Date(prize.claimedAt).toLocaleDateString(es ? 'es-PR' : 'en-US')}</span>
                    </div>
                    <h3 className="sgx-m-h">{prize.rewardTitle}</h3>
                    <div className="sgx-m-code">
                      <code>{prize.voucherCode}</code>
                      <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => handleCopyCode(prize.voucherCode)}>
                        {copiedCode === prize.voucherCode ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}
                        {copiedCode === prize.voucherCode ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}
                      </button>
                    </div>
                    <div className="sgx-m-row sgx-m-row--between">
                      <span className="sgx-m-fine">{es ? 'Costo: ' : 'Cost: '}{prize.xpSpent} XP</span>
                      {prize.accessUrl && (
                        <a className="sgx-btn sgx-btn--sm" href={prize.accessUrl} target="_blank" rel="noopener noreferrer">
                          {es ? 'Abrir y canjear' : 'Open and redeem'} <ExternalLink size={14} aria-hidden />
                        </a>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          )}
        </div>
      </SgxDialog>

      {redeemingReward && (
        <SgxDialog
          onClose={() => setRedeemingReward(null)}
          title={es ? 'Confirmar canje' : 'Confirm redemption'}
          kicker={loc(redeemingReward, 'title', language)}
          icon={<img src={catMark(redeemingReward.category)} alt="" />}
          size="sm"
          footer={
            <>
              <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setRedeemingReward(null)}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => handleConfirmRedeem(redeemingReward)}>{es ? 'Sí, canjear' : 'Yes, redeem'}</button>
            </>
          }
        >
          <div className="sgx-m sgx-m-stack">
            <div className="sgx-rw__table">
              <div className="sgx-rw__row"><span className="sgx-m-fine">{es ? 'Balance actual' : 'Current balance'}</span><b>{userXp} XP</b></div>
              <div className="sgx-rw__row"><span className="sgx-m-fine">{es ? 'Costo del premio' : 'Prize cost'}</span><span className="sgx-m-xp">−{redeemingReward.xpCost} XP</span></div>
              <div className="sgx-rw__row"><span className="sgx-m-fine">{es ? 'Te quedan' : 'Remaining'}</span><b style={{ color: 'var(--SGX_Cyan)' }}>{userXp - redeemingReward.xpCost} XP</b></div>
            </div>
            <p className="sgx-m-p">{es ? 'Al confirmar se genera tu código de canje. Lo verás aquí y en «Mis premios».' : 'Confirming generates your redemption code. You will see it here and in “My prizes”.'}</p>
          </div>
        </SgxDialog>
      )}
    </>
  );
};
