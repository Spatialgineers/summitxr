// Pilot Profile, Weekend Breakdown, and Gamification Type Definitions

export type WeekendActivityCategory = 
  | 'drone_flight'
  | 'drone_trick'
  | 'match_connection'
  | 'match_swipe'
  | 'keynote_reaction'
  | 'keynote_chat'
  | 'trivia_vote'
  | 'stage_cyoa'
  | 'rewards_claim'
  | 'tour_complete'
  | 'avatar_customized'
  | 'quest_complete'
  | 'energy_cell';

export type DroneTrickType = 
  | 'barrel_roll'
  | 'flip_360'
  | 'speed_dash'
  | 'precision_hover'
  | 'emp_pulse';

export interface WeekendActivityItem {
  id: string;
  category: WeekendActivityCategory;
  title: string;
  details: string;
  xpEarned: number;
  day: 'Viernes' | 'Sábado' | 'Domingo';
  timestamp: number;
  iconName?: string;
  highlightColor?: string;
}

export interface DroneStats {
  highScore: number;
  packagesDelivered: number;
  totalFlights: number;
  totalTricks: number;
  tricksBreakdown: {
    barrelRoll: number;
    flip360: number;
    speedDash: number;
    precisionHover: number;
    empPulse: number;
  };
  highestCombo: number;
  favoriteChassis: string;
  unlockedChassis: string[];
}

export interface PilotAchievement {
  id: string;
  title: string;
  description: string;
  category: 'flight' | 'networking' | 'summit' | 'stage';
  icon: string;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number;
  maxProgress: number;
  xpReward: number;
  badgeColor: string;
}

export interface PilotProfile {
  uid: string;
  nickname: string;
  callsign?: string;
  avatarSeed: string;
  avatarColor: string;
  email?: string;
  level: number;
  totalXp: number;
  rankTitle: string;
  createdAt: number;
  lastActive: number;
  
  // Weekend Summary Metrics
  weekendStats: {
    totalInteractions: number;
    votesSubmitted: number;
    connectionsMade: number;
    dronesDelivered: number;
    tricksPerformed: number;
    reactionsSent: number;
    keynotesAttended: number;
  };

  // Chronological Activity Log
  weekendActivity: WeekendActivityItem[];

  // Minigame & Drone Specs
  droneStats: DroneStats;

  // Unlocked Badges & Achievements
  achievements: PilotAchievement[];

  // Role Path & Weekly Capsules
  selectedRole?: 'CREATOR' | 'SPONSOR' | 'STUDENT' | 'VISIONARY';
  unlockedCapsules?: string[];

  // Matchmaking Profile Sync
  matchBio?: string;
  matchRoles?: string[];
  matchIndustries?: string[];
}

export interface LeaderboardEntry {
  uid: string;
  nickname: string;
  avatarSeed: string;
  avatarColor: string;
  rankTitle: string;
  level: number;
  totalXp: number;
  droneHighScore: number;
  totalTricks: number;
  connectionsCount: number;
  votesCount: number;
  updatedAt: number;
}
