import { GamificationReward, RedeemedPrize, LeaderboardEntry, RewardCategory } from '../types/gamification';
import { db } from './firebase';
import { withEnTwins } from './localize';
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, writeBatch, increment } from 'firebase/firestore';

export const INITIAL_REWARDS: GamificationReward[] = [
  {
    id: 'reward_sponsor_discount_coupon',
    title: 'Cupón de Descuento Oficial de Auspiciador',
    titleEn: 'Official Sponsor Discount Coupon',
    category: 'WEBAPP_SUBSCRIPTION',
    description: 'Cupón digital de descuento cortesía de un auspiciador del Spatialgineers Summit 2026 (depende de que haya auspiciadores), redimible desde el bloque de Networking del Día 3.',
    descriptionEn: 'Digital discount coupon courtesy of a Spatialgineers Summit 2026 sponsor (depends on sponsors signing on), redeemable from the Day 3 Networking block.',
    xpCost: 250,
    originalValueUsd: 'Beneficio Digital de Auspiciador',
    originalValueUsdEn: 'Digital Sponsor Benefit',
    inventoryCount: 0, // Depends on a closed sponsor: not redeemable until one is confirmed
    claimedCount: 0,
    badgeIcon: '🎟️',
    themeColor: '#00DDFF',
    active: false,
    accessUrl: 'https://summit.spatialgineers.com/sponsors',
    accessCodePrefix: 'SGX-SPONSOR-26-',
    features: [
      'Depende de que haya auspiciadores: se activa cuando se cierre uno',
      'Código digital verificable al instante en tu SGX Pass',
      'Válido para asistentes presenciales en San Juan y audiencia digital global'
    ],
    featuresEn: [
      'Depends on sponsors: it activates once one is signed',
      'Digital code verifiable instantly on your SGX Pass',
      'Valid for in-person attendees in San Juan and the global digital audience',
    ],
    sponsorName: 'Auspiciadores Oficiales Summit 2026',
    sponsorNameEn: 'Official Summit 2026 Sponsors',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now()
  },
  {
    id: 'reward_sgx_platform_3months',
    title: 'Suscripción de 3 Meses a Nuestras Plataformas',
    titleEn: '3-Month Subscription to Our Platforms',
    category: 'WEBAPP_SUBSCRIPTION',
    description: 'Suscripción de 3 meses a las plataformas digitales de Spatialgineers.',
    descriptionEn: 'A 3-month subscription to the Spatialgineers digital platforms.',
    xpCost: 500,
    originalValueUsd: 'Suscripción Digital 3 Meses',
    originalValueUsdEn: '3-Month Digital Subscription',
    inventoryCount: 40,
    claimedCount: 0,
    badgeIcon: '⚡',
    themeColor: '#FDCC0D',
    active: true,
    accessUrl: 'https://spatialgineers.com',
    accessCodePrefix: 'SGX-PLAT-3M-',
    features: [
      'Suscripción de 3 meses a nuestras plataformas',
      'Activación inmediata mediante código digital'
    ],
    featuresEn: ['3-month subscription to our platforms', 'Instant activation with a digital code'],
    sponsorName: 'Spatialgineers LLC',
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now()
  },
  {
    id: 'reward_grit_session_chroma',
    title: 'Sesión "Grit" con Artistas (por confirmar)',
    titleEn: '"Grit" Session with Artists (TBC)',
    category: 'SERVICE_CONSULTING',
    description: 'Experiencia "Grit" con artistas. Por confirmar. Se anuncia cuando esté confirmada; hasta entonces no se puede canjear.',
    descriptionEn: 'A "Grit" experience with artists. To be confirmed. It\'s announced once confirmed; until then it can\'t be redeemed.',
    xpCost: 1200,
    originalValueUsd: 'Experiencia (por confirmar)',
    originalValueUsdEn: 'Experience (TBC)',
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
    featuresEn: ['"Grit" session with artists: to be confirmed', 'Details are announced only once confirmed in writing'],
    sponsorName: 'Spatialgineers LLC',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now()
  },
  {
    id: 'reward_grand_prize_activate_event',
    title: 'Premio Mayor: "Spatialgineers Activa Tu Evento"',
    titleEn: 'Grand Prize: "Spatialgineers Activa Tu Evento" (Spatialgineers Activates Your Event)',
    category: 'SERVICE_CONSULTING',
    description: 'El premio mayor del Spatialgineers Summit 2026: un servicio de Spatialgineers para activar tu próximo evento.',
    descriptionEn: 'The Spatialgineers Summit 2026 grand prize: a Spatialgineers service to activate your next event.',
    xpCost: 2500,
    originalValueUsd: 'Servicio de Spatialgineers',
    originalValueUsdEn: 'Spatialgineers Service',
    inventoryCount: 1,
    claimedCount: 0,
    badgeIcon: '👑',
    themeColor: '#FDCC0D',
    active: true,
    accessUrl: 'https://spatialgineers.com',
    accessCodePrefix: 'SGX-ACTIVATE-',
    features: [
      'Un servicio de Spatialgineers para activar tu evento',
      'Anunciado oficialmente en el bloque de Cierre del Día 3 (3:30–4:00 p.m.)'
    ],
    featuresEn: [
      'A Spatialgineers service to activate your event',
      'Officially announced in the Day 3 Closing block (3:30–4:00 p.m.)',
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
      return withEnTwins(items, INITIAL_REWARDS);
    }
  } catch (err) {
    console.warn("Firestore rewards load fallback to local storage:", err);
  }

  // Local fallback
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REWARDS_KEY);
    if (saved) {
      return withEnTwins(JSON.parse(saved), INITIAL_REWARDS);
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

function readLocalRedeemed(): RedeemedPrize[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REDEEMED_KEY);
    if (saved) return JSON.parse(saved) as RedeemedPrize[];
  } catch {}
  return [];
}

/**
 * Load user's redeemed prizes.
 * With a userId: only that user's vouchers (`where userId == uid`), which is
 * all the rules let a non-admin read. Without one: the whole collection,
 * readable by admins only.
 */
export async function loadUserRedeemedPrizes(userId?: string): Promise<RedeemedPrize[]> {
  const local = readLocalRedeemed().filter(p => !userId || p.userId === userId);
  try {
    const ref = collection(db, 'redeemed_prizes');
    const snap = await getDocs(userId ? query(ref, where('userId', '==', userId)) : ref);
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }) as RedeemedPrize);
    // Keep any local-only voucher (e.g. issued while offline) next to the cloud ones.
    const ids = new Set(items.map(i => i.id));
    return [...items, ...local.filter(l => !ids.has(l.id))].sort((a, b) => (b.claimedAt || 0) - (a.claimedAt || 0));
  } catch (err) {
    console.warn("Firestore redeemed load fallback:", err);
  }
  return local;
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

  // One voucher per pilot per reward: the id is deterministic, and the rules
  // only allow creating `${rewardId}_${uid}` for your own uid.
  const redemptionId = `${reward.id}_${user.uid}`;
  if (readLocalRedeemed().some(p => p.id === redemptionId)) {
    return { success: false, error: 'Ya canjeaste este premio con tu SGX Pass.' };
  }
  const voucherCode = generateVoucherCode(reward.accessCodePrefix || 'SGX-REWARD-');

  const redeemedItem: RedeemedPrize = {
    id: redemptionId,
    rewardId: reward.id,
    rewardTitle: reward.title,
    category: reward.category,
    userId: user.uid,
    userEmail: user.email || '',
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

  // Voucher + inventory step in ONE batch: the rules accept the reward's
  // claimedCount +1 / inventoryCount -1 only together with the creation of
  // this pilot's own voucher (and vice versa).
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'redeemed_prizes', redemptionId), JSON.parse(JSON.stringify(redeemedItem)));
    batch.update(doc(db, 'gamification_rewards', reward.id), {
      claimedCount: increment(1),
      ...(reward.inventoryCount > 0 ? { inventoryCount: increment(-1) } : {}),
      lastClaimId: redemptionId,
      updatedAt: Date.now(),
    });
    await batch.commit();
  } catch (err: any) {
    console.warn("Firestore save redeemed prize fallback:", err);
    if (err?.code === 'permission-denied') {
      // Already claimed in the cloud, sold out, or reward not active.
      const mine = await loadUserRedeemedPrizes(user.uid);
      if (mine.some(p => p.id === redemptionId)) {
        return { success: false, error: 'Ya canjeaste este premio con tu SGX Pass.' };
      }
      return { success: false, error: 'No se pudo canjear este premio ahora mismo (agotado o no disponible).' };
    }
    if (err?.code === 'not-found') {
      return { success: false, error: 'Este premio todavía no está activo en la tienda.' };
    }
    // A voucher only counts once the server has it (staff verify against Firestore).
    return { success: false, error: 'Sin conexión: no se pudo canjear. Inténtalo de nuevo en un momento.' };
  }

  // Keep a local copy of the confirmed voucher (offline view of "Mis premios")
  try {
    const updated = [redeemedItem, ...readLocalRedeemed().filter(p => p.id !== redemptionId)];
    localStorage.setItem(LOCAL_STORAGE_REDEEMED_KEY, JSON.stringify(updated));
  } catch {}

  return { success: true, voucher: redeemedItem };
}

// The legacy `leaderboard_scores` collection is retired (it held hard-coded
// votes/quests and one shared guest row). The only leaderboard is
// `pilot_leaderboard`, written per pilot by PilotProfileContext.
