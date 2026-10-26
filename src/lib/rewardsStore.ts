import { GamificationReward, RedeemedPrize, LeaderboardEntry, RewardCategory } from '../types/gamification';
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

export const INITIAL_REWARDS: GamificationReward[] = [
  {
    id: 'reward_sponsor_discount_coupon',
    title: 'Cupón de Descuento Oficial de Auspiciador',
    category: 'WEBAPP_SUBSCRIPTION',
    description: 'Cupón digital de descuento cortesía de un auspiciador del Spatialgineers Summit 2026 (depende de que haya auspiciadores), redimible desde el bloque de Networking del Día 3.',
    xpCost: 250,
    originalValueUsd: 'Beneficio Digital de Auspiciador',
    inventoryCount: -1, // Ilimitado para participantes activos
    claimedCount: 0,
    badgeIcon: '🎟️',
    themeColor: '#00DDFF',
    active: true,
    accessUrl: 'https://summit.spatialgineers.com/sponsors',
    accessCodePrefix: 'SGX-SPONSOR-26-',
    features: [
      'Gana XP votando tipo Kahoot (+25 XP), escaneando QR (+50 XP) o creando tu avatar (+200 XP)',
      'Descuento exclusivo en servicios y productos de marcas aliadas del Summit',
      'Código digital verificable al instante en tu Pasaporte SGX',
      'Válido para asistentes presenciales en San Juan y audiencia digital global'
    ],
    sponsorName: 'Auspiciadores Oficiales Summit 2026',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now()
  },
  {
    id: 'reward_sgx_platform_3months',
    title: 'Suscripción de 3 Meses a Nuestras Plataformas',
    category: 'WEBAPP_SUBSCRIPTION',
    description: 'Suscripción de 3 meses a las plataformas digitales de Spatialgineers.',
    xpCost: 500,
    originalValueUsd: 'Suscripción Digital 3 Meses',
    inventoryCount: 40,
    claimedCount: 0,
    badgeIcon: '⚡',
    themeColor: '#FDCC0D',
    active: true,
    accessUrl: 'https://spatialgineers.com',
    accessCodePrefix: 'SGX-PLAT-3M-',
    features: [
      'Acceso por 3 meses a las plataformas interactivas de Spatialgineers',
      'Creación de experiencias 3D, visualizadores de escenario y salas de votación',
      'Soporte técnico de la comunidad SGX Guild',
      'Activación inmediata mediante código digital'
    ],
    sponsorName: 'Spatialgineers LLC',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now()
  },
  {
    id: 'reward_grit_session_chroma',
    title: 'Sesión "Grit" con Artistas (por confirmar)',
    category: 'SERVICE_CONSULTING',
    description: 'Experiencia "Grit" con artistas. Por confirmar: todavía no hay acuerdo escrito, por lo que no se puede canjear hasta que se confirme.',
    xpCost: 1200,
    originalValueUsd: 'Experiencia (por confirmar)',
    inventoryCount: 0, // POR CONFIRMAR: not redeemable until confirmed in writing
    claimedCount: 0,
    badgeIcon: '🔥',
    themeColor: '#FFBB00',
    active: true,
    accessUrl: 'https://summit.spatialgineers.com',
    accessCodePrefix: 'SGX-GRIT-',
    features: [
      'Sesión "Grit" con artistas: por confirmar',
      'Los detalles se anuncian solo cuando haya confirmación por escrito'
    ],
    sponsorName: 'Spatialgineers LLC',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now()
  },
  {
    id: 'reward_grand_prize_activate_event',
    title: 'Premio Mayor: "Spatialgineers Activa Tu Evento"',
    category: 'SERVICE_CONSULTING',
    description: 'El premio mayor del Spatialgineers Summit 2026: un servicio de Spatialgineers para activar tu próximo evento.',
    xpCost: 2500,
    originalValueUsd: 'Servicio de Spatialgineers',
    inventoryCount: 1,
    claimedCount: 0,
    badgeIcon: '👑',
    themeColor: '#FDCC0D',
    active: true,
    accessUrl: 'https://spatialgineers.com',
    accessCodePrefix: 'SGX-ACTIVATE-',
    features: [
      'Un servicio de Spatialgineers para activar tu evento',
      'Anunciado oficialmente en el bloque de Cierre del Día 3 (3:30–4:00 p.m.)',
      'Sesión de planificación estratégica con Danelson ("The Highgineer") y Ricardo ("Lightning Fingers")'
    ],
    sponsorName: 'Spatialgineers LLC',
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now()
  }
];

export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [];

const LOCAL_STORAGE_REWARDS_KEY = 'sgx_gamification_rewards_v2026_10_1';
const LOCAL_STORAGE_REDEEMED_KEY = 'sgx_redeemed_prizes_v2026_10';
const LOCAL_STORAGE_USER_XP_KEY = 'sgx_user_current_xp';

/**
 * Load all gamification rewards (from Firestore with LocalStorage / Fallback sync)
 */
export async function loadAllRewards(): Promise<GamificationReward[]> {
  try {
    const snap = await getDocs(collection(db, 'gamification_rewards'));
    if (!snap.empty) {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GamificationReward);
      localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(items));
      return items;
    }
  } catch (err) {
    console.warn("Firestore rewards load fallback to local storage:", err);
  }

  // Local fallback
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REWARDS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {}

  // Defaults
  localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(INITIAL_REWARDS));
  return INITIAL_REWARDS;
}

/**
 * Save / Update a single reward
 */
export async function saveReward(reward: GamificationReward): Promise<void> {
  // Update local
  try {
    const current = await loadAllRewards();
    const idx = current.findIndex(r => r.id === reward.id);
    let updated: GamificationReward[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = reward;
    } else {
      updated = [reward, ...current];
    }
    localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(updated));
  } catch {}

  // Update Firestore
  try {
    await setDoc(doc(db, 'gamification_rewards', reward.id), {
      ...reward,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn("Firestore saveReward error (persisted locally):", err);
  }
}

/**
 * Delete a reward
 */
export async function deleteReward(rewardId: string): Promise<void> {
  // Update local
  try {
    const current = await loadAllRewards();
    const filtered = current.filter(r => r.id !== rewardId);
    localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(filtered));
  } catch {}

  // Delete from Firestore
  try {
    await deleteDoc(doc(db, 'gamification_rewards', rewardId));
  } catch (err) {
    console.warn("Firestore deleteReward error:", err);
  }
}

/**
 * Reset default rewards
 */
export async function resetDefaultRewards(): Promise<GamificationReward[]> {
  localStorage.setItem(LOCAL_STORAGE_REWARDS_KEY, JSON.stringify(INITIAL_REWARDS));
  for (const r of INITIAL_REWARDS) {
    try {
      await setDoc(doc(db, 'gamification_rewards', r.id), r);
    } catch {}
  }
  return INITIAL_REWARDS;
}

/**
 * Load user's redeemed prizes
 */
export async function loadUserRedeemedPrizes(userId?: string): Promise<RedeemedPrize[]> {
  try {
    const snap = await getDocs(collection(db, 'redeemed_prizes'));
    if (!snap.empty) {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as RedeemedPrize);
      if (userId) {
        return items.filter(p => p.userId === userId);
      }
      return items;
    }
  } catch (err) {
    console.warn("Firestore redeemed load fallback:", err);
  }

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REDEEMED_KEY);
    if (saved) {
      const items = JSON.parse(saved) as RedeemedPrize[];
      if (userId) {
        return items.filter(p => p.userId === userId);
      }
      return items;
    }
  } catch {}

  return [];
}

/**
 * Generate a random cyber voucher license code
 */
function generateVoucherCode(prefix: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${rand}`;
}

/**
 * Redeem a prize
 */
export async function redeemPrize(
  reward: GamificationReward, 
  user: { uid: string; email?: string; displayName?: string }
): Promise<{ success: boolean; voucher?: RedeemedPrize; error?: string }> {
  // Check inventory
  if (reward.inventoryCount !== -1 && reward.inventoryCount <= 0) {
    return { success: false, error: 'Premio agotado por el momento en este Summit.' };
  }

  const voucherCode = generateVoucherCode(reward.accessCodePrefix || 'SGX-REWARD-');
  const redemptionId = `claim_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const redeemedItem: RedeemedPrize = {
    id: redemptionId,
    rewardId: reward.id,
    rewardTitle: reward.title,
    category: reward.category,
    userId: user.uid,
    userEmail: user.email || 'attendee@spatialgineers.com',
    userName: user.displayName || user.email?.split('@')[0] || 'Asistente Summit',
    voucherCode,
    xpSpent: reward.xpCost,
    claimedAt: Date.now(),
    accessUrl: reward.accessUrl,
    qrPayload: JSON.stringify({
      code: voucherCode,
      reward: reward.title,
      user: user.email || user.uid,
      issuedAt: Date.now()
    }),
    status: 'ACTIVE'
  };

  // Update Reward claimed count & inventory
  const updatedReward: GamificationReward = {
    ...reward,
    claimedCount: reward.claimedCount + 1,
    inventoryCount: reward.inventoryCount > 0 ? reward.inventoryCount - 1 : reward.inventoryCount
  };
  await saveReward(updatedReward);

  // Save Redeemed Voucher in LocalStorage
  try {
    const current = await loadUserRedeemedPrizes();
    const updated = [redeemedItem, ...current];
    localStorage.setItem(LOCAL_STORAGE_REDEEMED_KEY, JSON.stringify(updated));
  } catch {}

  // Save to Firestore
  try {
    await setDoc(doc(db, 'redeemed_prizes', redemptionId), redeemedItem);
  } catch (err) {
    console.warn("Firestore save redeemed prize fallback:", err);
  }

  return { success: true, voucher: redeemedItem };
}

/**
 * Load Leaderboard (aggregates live scores and participants)
 */
export async function loadLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const snap = await getDocs(collection(db, 'leaderboard_scores'));
    if (!snap.empty) {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as LeaderboardEntry);
      return items.sort((a, b) => b.totalXp - a.totalXp);
    }
  } catch (err) {
    console.warn("Firestore leaderboard load fallback:", err);
  }

  return INITIAL_LEADERBOARD.sort((a, b) => b.totalXp - a.totalXp);
}

/**
 * Sync current user's score to the global leaderboard
 */
export async function syncUserScoreToLeaderboard(entry: {
  userId: string;
  username: string;
  totalXp: number;
  votesCount: number;
  questsCount: number;
  droneHighScore?: number;
  rankTitle?: string;
  streak?: number;
  pillar?: string;
}): Promise<void> {
  const docId = `score_${entry.userId.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  const record: LeaderboardEntry = {
    id: docId,
    userId: entry.userId,
    username: entry.username,
    totalXp: entry.totalXp,
    votesCount: entry.votesCount || 0,
    questsCount: entry.questsCount || 0,
    droneHighScore: entry.droneHighScore || 0,
    rankTitle: entry.rankTitle || 'Iniciado del Summit',
    streak: entry.streak || 1,
    pillar: entry.pillar || 'SGX.SYNTHESIZE',
    lastActivity: Date.now()
  };

  try {
    await setDoc(doc(db, 'leaderboard_scores', docId), record);
  } catch (err) {
    console.warn("Could not sync leaderboard to Firestore:", err);
  }
}
