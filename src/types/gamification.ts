export type RewardCategory = 
  | 'WEBAPP_SUBSCRIPTION' 
  | 'SERVICE_CONSULTING' 
  | 'VIP_PASS' 
  | 'DIGITAL_ASSET' 
  | 'PHYSICAL_SWAG' 
  | 'EARLY_ACCESS';

export interface GamificationReward {
  id: string;
  title: string;
  category: RewardCategory;
  description: string;
  xpCost: number;
  originalValueUsd: string; // e.g. "$180 / año", "$250", "$60"
  inventoryCount: number; // -1 for unlimited, or integer count
  claimedCount: number;
  badgeIcon: string; // Emoji or Lucide icon key
  themeColor: string;
  active: boolean;
  accessUrl: string;
  accessCodePrefix: string;
  features: string[];
  sponsorName?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RedeemedPrize {
  id: string;
  rewardId: string;
  rewardTitle: string;
  category: RewardCategory;
  userId: string;
  userEmail: string;
  userName: string;
  voucherCode: string;
  xpSpent: number;
  claimedAt: number;
  accessUrl?: string;
  qrPayload: string;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  username: string;
  avatarUrl?: string;
  totalXp: number;
  votesCount: number;
  questsCount: number;
  droneHighScore: number;
  rankTitle: string;
  streak: number;
  pillar?: string;
  isCurrentUser?: boolean;
  lastActivity: number;
}
