import { AnswerType, PrizeTier, UserProfile } from '../types/engine';

export const PRIZE_TIERS: PrizeTier[] = [
  {
    id: 'tier_bronze',
    tier: 'BRONZE',
    name: 'Explorer Initiate',
    description: 'Awarded for active participation in the live event stream.',
    minPoints: 100,
    minInteractions: 1,
    badgeIcon: '🥉',
    perkReward: 'Recompensa por anunciar',
    couponCode: 'SGX-INITIATE-2026',
    color: '#cd7f32',
  },
  {
    id: 'tier_silver',
    tier: 'SILVER',
    name: 'Tactical Director',
    description: 'Consistent voting with high speed and sharp accuracy.',
    minPoints: 350,
    minInteractions: 2,
    badgeIcon: '🥈',
    perkReward: 'Beneficio nivel plata por anunciar',
    couponCode: 'SGX-SILVER-15OFF',
    color: '#94a3b8',
  },
  {
    id: 'tier_gold',
    tier: 'GOLD',
    name: 'Master Co-Producer',
    description: 'Exceptional instincts shaping the course of the live stage.',
    minPoints: 750,
    minInteractions: 3,
    badgeIcon: '🥇',
    perkReward: 'Beneficio exclusivo por anunciar',
    couponCode: 'SGX-GOLD-VIP30',
    color: '#eab308',
  },
  {
    id: 'tier_platinum',
    tier: 'PLATINUM',
    name: 'Grand Architect',
    description: 'Top-tier event influencer with unmatched streak mastery.',
    minPoints: 1200,
    minInteractions: 4,
    badgeIcon: '💎',
    perkReward: 'Premio sorpresa nivel platino',
    couponCode: 'SGX-PLATINUM-HOLO',
    color: '#38bdf8',
  },
  {
    id: 'tier_vip',
    tier: 'VIP_BACKSTAGE',
    name: 'Spatial Sovereign',
    description: 'Ultimate broadcast co-creator with legendary performance.',
    minPoints: 1600,
    minInteractions: 5,
    badgeIcon: '👑',
    perkReward: 'Recompensa VIP máxima por anunciar',
    couponCode: 'SGX-VIP-ALLACCESS',
    color: '#a855f7',
  },
];

export interface PointCalculationResult {
  accuracyFactor: number;
  basePointsEarned: number;
  speedRatio: number;
  rawSpeedBonus: number;
  participationWeight: number;
  streakMultiplier: number;
  totalPointsEarned: number;
  isCorrect: boolean;
  newStreak: number;
}

export function calculatePoints(
  answerType: AnswerType,
  isCorrectOption: boolean,
  responseTimeMs: number,
  totalDurationMs: number,
  basePoints: number = 200,
  maxSpeedBonus: number = 150,
  participationWeight: number = 50,
  currentStreak: number = 0
): PointCalculationResult {
  // Accuracy evaluation
  const isCorrect = answerType === 'OPINION_CYOA' ? true : isCorrectOption;
  const accuracyFactor = isCorrect ? 1 : 0;
  const basePointsEarned = accuracyFactor * basePoints;

  // Speed Bonus evaluation (faster response = higher bonus)
  const clampedResponseTime = Math.max(0, Math.min(responseTimeMs, totalDurationMs));
  const speedRatio = Math.max(0, 1 - clampedResponseTime / Math.max(1, totalDurationMs));
  const rawSpeedBonus = Math.floor(speedRatio * maxSpeedBonus);

  // Participation weight is always awarded for participating actively
  const participationBonus = participationWeight;

  // Streak calculation
  let newStreak = currentStreak;
  if (isCorrect) {
    newStreak += 1;
  } else {
    newStreak = 0;
  }

  // Streak Multipliers: 1x, 1.25x, 1.5x, 1.75x, 2.0x max
  let streakMultiplier = 1.0;
  if (newStreak >= 5) streakMultiplier = 2.0;
  else if (newStreak === 4) streakMultiplier = 1.75;
  else if (newStreak === 3) streakMultiplier = 1.5;
  else if (newStreak === 2) streakMultiplier = 1.25;

  const preMultiplierTotal = basePointsEarned + rawSpeedBonus + participationBonus;
  const totalPointsEarned = Math.round(preMultiplierTotal * streakMultiplier);

  return {
    accuracyFactor,
    basePointsEarned,
    speedRatio,
    rawSpeedBonus,
    participationWeight: participationBonus,
    streakMultiplier,
    totalPointsEarned,
    isCorrect,
    newStreak,
  };
}

export function evaluateUnlockedPrizes(user: UserProfile, tiers: PrizeTier[] = PRIZE_TIERS): PrizeTier[] {
  return tiers.filter((tier) => {
    return (
      user.totalScore >= tier.minPoints &&
      user.totalInteractions >= tier.minInteractions
    );
  });
}
