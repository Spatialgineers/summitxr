// SGX Entrepreneur Match (SGX.MATCH) - Core Type Definitions

export type MatchPillar = 'story' | 'showcase' | 'spark' | 'stage' | 'systems' | 'synthesize';

export type MatchBringChip =
  | 'capital'
  | 'technical'
  | 'design'
  | '3d_xr'
  | 'audio'
  | 'content'
  | 'sales'
  | 'network'
  | 'mentorship'
  | 'legal_ops'
  | 'hardware'
  | 'community'
  | string;

export type MatchSeekingChip =
  | 'cofounder'
  | 'investor'
  | 'client'
  | 'collaborator'
  | 'sponsor'
  | 'vendor'
  | 'mentor'
  | 'talent';

export type MatchOpenToTag =
  | 'collab'
  | 'hire'
  | 'invest'
  | 'get_funded'
  | 'partner';

export interface MatchProfile {
  pitch: string;              // 1–80 chars
  brings: MatchBringChip[];   // 1–5 chips + optional custom string
  seeking: MatchSeekingChip[];// 1–3 chips (drives matching)
  pillar: MatchPillar;        // one of 6 pillars (drives accent color)
  openTo: MatchOpenToTag[];   // 0–5 tags (vibe tie-breaker)
  visible: boolean;           // default true
  createdAt: string;
  updatedAt: string;
  receivedIntentCount: number;// for newcomer fairness nudge (+5)
  customBringsText?: string;  // optional "other" free text (60 char max)
}

export interface MatchCandidate {
  uid: string;
  displayName: string;
  email?: string;
  organization?: string;
  roleTitle?: string;
  avatarUrl?: string;
  avatarSvg?: string;
  avatarSeed?: string;
  xp: number;
  profile: MatchProfile;
  score?: number;             // computed 0-100 fit score
  matchReason?: string;       // human readable 1-line reason
}

export interface MatchIntent {
  id: string;                 // `${fromUid}_${toUid}`
  fromUid: string;
  toUid: string;
  createdAt: string;
}

export interface MutualMatch {
  id: string;                 // `${minUid}__${maxUid}`
  userA: string;
  userB: string;
  createdAt: string;
  xpAwarded: boolean;
  notes: Record<string, string>; // [uid]: private note
  candidateA?: MatchCandidate;
  candidateB?: MatchCandidate;
}

export interface MatchPass {
  id: string;                 // `${fromUid}_${toUid}`
  fromUid: string;
  toUid: string;
  createdAt: string;
}

export interface MatchReport {
  id: string;
  fromUid: string;
  targetUid: string;
  reason: 'spam' | 'inappropriate' | 'not-an-entrepreneur' | string;
  createdAt: string;
}

export interface MatchStats {
  totalProfiles: number;
  totalIntents: number;
  totalMutualMatches: number;
  topConnectors: Array<{ uid: string; name: string; matchCount: number; xp: number }>;
}
