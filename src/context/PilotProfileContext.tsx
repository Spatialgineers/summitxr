import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { 
  PilotProfile, 
  WeekendActivityItem, 
  WeekendActivityCategory, 
  DroneTrickType, 
  DroneStats, 
  PilotAchievement,
  LeaderboardEntry 
} from '../types/pilot';
import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { isAccountSwitching } from '../identity/accountSlots';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { recordEvent } from '../lib/telemetry';
import { useLanguage } from './LanguageContext';

// Default initial achievements
const DEFAULT_ACHIEVEMENTS: PilotAchievement[] = [
  {
    id: 'ach_first_flight',
    title: 'Primer vuelo de dron',
    description: 'Completa tu primer vuelo en el simulador de drones.',
    category: 'flight',
    icon: '🚁',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 150,
    badgeColor: '#00DDFF',
  },
  {
    id: 'ach_trick_master',
    title: 'Maestro de Poderes',
    description: 'Usa 10 poderes en el Dron SGX (Turbo, Escudo, Pulso o Láser).',
    category: 'flight',
    icon: '🌪️',
    unlocked: false,
    progress: 0,
    maxProgress: 10,
    xpReward: 300,
    badgeColor: '#FDCC0D',
  },
  {
    id: 'ach_match_networker',
    title: 'Conector Serial',
    description: 'Haz 3 conexiones o matches en la red del summit.',
    category: 'networking',
    icon: '🤝',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    xpReward: 250,
    badgeColor: '#FFBB00',
  },
  {
    id: 'ach_stage_cyoa',
    title: 'Codirector del Escenario',
    description: 'Vota en al menos 3 decisiones del Choose-Your-Own-Adventure 3D.',
    category: 'stage',
    icon: '🎭',
    unlocked: false,
    progress: 0,
    maxProgress: 3,
    xpReward: 350,
    badgeColor: '#00DDFF',
  },
  {
    id: 'ach_tour_explorer',
    title: 'Explorador SGX',
    description: 'Completa el tour interactivo de los 3 hubs del summit.',
    category: 'summit',
    icon: '🧭',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 200,
    badgeColor: '#32527B',
  },
];

// ---------------------------------------------------------------------------
// Firestore write shapes. firestore.rules only accept these keys (owner-only,
// bounded numbers, capped strings), so we never send stale localStorage keys.
// ---------------------------------------------------------------------------
const MAX_XP = 100000;
const clampNum = (v: unknown, max = MAX_XP) => {
  const n = typeof v === 'number' && isFinite(v) ? Math.floor(v) : 0;
  return Math.max(0, Math.min(max, n));
};
const capStr = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

const PROFILE_KEYS = [
  'uid', 'nickname', 'callsign', 'avatarSeed', 'avatarColor', 'level', 'totalXp', 'rankTitle',
  'createdAt', 'lastActive', 'weekendStats', 'weekendActivity', 'droneStats', 'achievements',
  'selectedRole', 'unlockedCapsules', 'matchBio', 'matchRoles', 'matchIndustries',
] as const;

function toCloudProfile(prof: PilotProfile, uid: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of PROFILE_KEYS) {
    const v = (prof as any)[k];
    if (v !== undefined) out[k] = v;
  }
  out.uid = uid;
  out.nickname = capStr(prof.nickname, 60) || 'Creador';
  if (prof.callsign !== undefined) out.callsign = capStr(prof.callsign, 30);
  out.avatarSeed = capStr(prof.avatarSeed, 80);
  out.avatarColor = capStr(prof.avatarColor, 20);
  out.rankTitle = capStr(prof.rankTitle, 60);
  out.totalXp = clampNum(prof.totalXp);
  out.level = clampNum(prof.level, 1000);
  out.weekendActivity = (prof.weekendActivity || []).slice(0, 50);
  out.achievements = (prof.achievements || []).slice(0, 40);
  if (prof.unlockedCapsules) out.unlockedCapsules = prof.unlockedCapsules.slice(0, 50);
  if (prof.matchBio !== undefined) out.matchBio = capStr(prof.matchBio, 500);
  if (prof.matchRoles) out.matchRoles = prof.matchRoles.slice(0, 20);
  if (prof.matchIndustries) out.matchIndustries = prof.matchIndustries.slice(0, 20);
  out.updatedAt = Date.now();
  // Firestore rejects undefined anywhere (e.g. achievements[].unlockedAt): drop them.
  return JSON.parse(JSON.stringify(out));
}

/**
 * Cloud vs local: the most recently active copy wins, and progress never goes
 * backwards (XP, level, drone record and counters keep the higher value).
 */
function mergeProgress(local: PilotProfile, cloud: Partial<PilotProfile>): PilotProfile {
  const newer = (cloud.lastActive || 0) > (local.lastActive || 0);
  const base: PilotProfile = newer ? { ...local, ...cloud } as PilotProfile : { ...local };
  const max = (a?: number, b?: number) => Math.max(Number(a) || 0, Number(b) || 0);
  base.totalXp = max(local.totalXp, cloud.totalXp);
  base.level = max(local.level, cloud.level) || 1;
  if (local.droneStats || cloud.droneStats) {
    const ld: any = local.droneStats || {}; const cd: any = cloud.droneStats || {};
    base.droneStats = { ...ld, ...(newer ? cd : {}), highScore: max(ld.highScore, cd.highScore), totalFlights: max(ld.totalFlights, cd.totalFlights), totalTricks: max(ld.totalTricks, cd.totalTricks) } as any;
  }
  if (local.weekendStats || cloud.weekendStats) {
    const lw: any = local.weekendStats || {}; const cw: any = cloud.weekendStats || {};
    const ws: any = { ...lw };
    for (const k of new Set([...Object.keys(lw), ...Object.keys(cw)])) ws[k] = max(lw[k], cw[k]);
    base.weekendStats = ws;
  }
  return base;
}

// Calculate Level and Rank from XP
export function calculateRankAndLevel(xp: number): { level: number; rankTitle: string; nextLevelXp: number; currentLevelBaseXp: number } {
  const XP_PER_LEVEL = 500;
  const level = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
  const currentLevelBaseXp = (level - 1) * XP_PER_LEVEL;
  const nextLevelXp = level * XP_PER_LEVEL;

  return { level, rankTitle: rankLabel(level, true), nextLevelXp, currentLevelBaseXp };
}

/** Creator rank for a level, in the visitor's language. Derived from the level
    (not the stored rankTitle) so profiles saved with older rank names show the
    current ones. */
export function rankLabel(level: number, es: boolean): string {
  if (level >= 10) return 'Visionario';
  if (level >= 7) return es ? 'Director Creativo' : 'Creative Director';
  if (level >= 5) return es ? 'Creador Pro' : 'Pro Creator';
  if (level >= 3) return es ? 'Creador' : 'Creator';
  if (level >= 2) return es ? 'Explorador XR' : 'XR Explorer';
  return es ? 'Visitante' : 'Visitor';
}

// Determine current weekend day
function getCurrentWeekendDay(): 'Viernes' | 'Sábado' | 'Domingo' {
  const day = new Date().getDay();
  if (day === 5) return 'Viernes';
  if (day === 6) return 'Sábado';
  if (day === 0) return 'Domingo';
  return 'Sábado'; // Summit default
}

interface PilotProfileContextType {
  profile: PilotProfile;
  leaderboard: LeaderboardEntry[];
  isLoading: boolean;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  liteMode: boolean;
  setLiteMode: (enabled: boolean | ((prev: boolean) => boolean)) => void;
  selectPilotRole: (role: 'CREATOR' | 'SPONSOR' | 'STUDENT' | 'VISIONARY') => void;
  recordActivity: (category: WeekendActivityCategory, title: string, details: string, xpEarned: number, highlightColor?: string) => void;
  recordDroneTrick: (trick: DroneTrickType) => number; // returns XP earned
  recordDroneFlight: (score: number, packages: number, tricks: number) => void;
  updateProfileName: (nickname: string, callsign?: string) => void;
  updateAvatar: (avatarSeed: string, avatarColor: string) => void;
  syncMatchDetails: (bio: string, roles: string[], industries: string[]) => void;
  claimAchievement: (achievementId: string) => void;
  refreshLeaderboard: () => Promise<void>;
}

const PilotProfileContext = createContext<PilotProfileContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'sgx_pilot_profile_v2';
const LITE_MODE_STORAGE_KEY = 'sgx_lite_mode';

export const PilotProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [liteMode, setLiteModeState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(LITE_MODE_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const setLiteMode = useCallback((val: boolean | ((prev: boolean) => boolean)) => {
    setLiteModeState(prev => {
      const next = typeof val === 'function' ? val(prev) : val;
      try {
        localStorage.setItem(LITE_MODE_STORAGE_KEY, String(next));
      } catch (e) {
        console.warn('Failed to save lite mode', e);
      }
      return next;
    });
  }, []);

  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize Profile from localStorage or Defaults
  const [profile, setProfile] = useState<PilotProfile>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading pilot profile from local storage', e);
    }

    const defaultUid = 'pilot_' + Math.random().toString(36).substring(2, 9);
    const initialProfile: PilotProfile = {
      uid: defaultUid,
      nickname: 'Creador ' + Math.floor(100 + Math.random() * 900),
      callsign: 'SGX-01',
      avatarSeed: 'pilot-avatar-' + Math.floor(Math.random() * 100),
      avatarColor: '#00DDFF',
      level: 1,
      totalXp: 150,
      rankTitle: 'Visitante',
      createdAt: Date.now(),
      lastActive: Date.now(),
      weekendStats: {
        totalInteractions: 0,
        votesSubmitted: 0,
        connectionsMade: 0,
        dronesDelivered: 0,
        tricksPerformed: 0,
        reactionsSent: 0,
        keynotesAttended: 0,
      },
      weekendActivity: [
        {
          id: 'act_init_' + Date.now(),
          category: 'tour_complete',
          title: (es ? 'Perfil de creador activado' : 'Creator profile activated'),
          details: (es ? 'Bienvenido al Spatialgineers Summit 2026. Tu perfil de creador está enlazado.' : 'Welcome to the Spatialgineers Summit 2026. Your creator profile is linked.'),
          xpEarned: 150,
          day: getCurrentWeekendDay(),
          timestamp: Date.now(),
          highlightColor: '#00DDFF',
        }
      ],
      droneStats: {
        highScore: 0,
        packagesDelivered: 0,
        totalFlights: 0,
        totalTricks: 0,
        tricksBreakdown: {
          barrelRoll: 0,
          flip360: 0,
          speedDash: 0,
          precisionHover: 0,
          empPulse: 0,
        },
        highestCombo: 0,
        favoriteChassis: 'Chroma Raptor',
        unlockedChassis: ['Chroma Raptor'],
      },
      achievements: DEFAULT_ACHIEVEMENTS,
    };
    return initialProfile;
  });

  // Sync to localStorage
  useEffect(() => {
    if (isAccountSwitching()) return;
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Failed to persist profile to localStorage', e);
    }
  }, [profile]);

  // Firestore Sync & Auth Linking. The cloud doc is keyed by the Firebase
  // auth uid (rules: owner-only), so wait until auth (anonymous or Google)
  // has a user before touching Firestore.
  const { user: authUser } = useAuth();
  const authUid = authUser?.uid || null;
  const [cloudReady, setCloudReady] = useState(false);
  useEffect(() => {
    let unsubscribeUser: (() => void) | undefined;
    if (!authUid) return;

    const initFirebaseProfile = async () => {
      try {
        const targetUid = authUid;

        // Listen or Fetch from Firestore
        const userDocRef = doc(db, 'pilot_profiles', targetUid);
        const snap = await getDoc(userDocRef);

        if (snap.exists()) {
          const cloudData = snap.data() as Partial<PilotProfile>;
          setProfile(prev => ({ ...mergeProgress(prev, cloudData), uid: targetUid }));
        } else {
          // Push initial profile to Firestore (local progress carries over)
          setProfile(prev => ({ ...prev, uid: targetUid }));
          await setDoc(userDocRef, toCloudProfile(profile, targetUid));
        }

        // Realtime sync
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as Partial<PilotProfile>;
            setProfile(prev => ({ ...mergeProgress(prev, data), uid: prev.uid }));
          }
        });
      } catch (err) {
        console.warn('Firestore sync optional fallback to local:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initFirebaseProfile().then(() => setCloudReady(true));

    return () => {
      if (unsubscribeUser) unsubscribeUser();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUid]);

  // Keep the cloud copy current (debounced), so a reload never loses progress.
  const lastCloudWrite = useRef<string>('');
  useEffect(() => {
    if (!authUid || !cloudReady) return;
    const payload = toCloudProfile(profile, authUid);
    const { updatedAt: _u, ...comparable } = payload as Record<string, unknown>;
    const key = JSON.stringify(comparable);
    if (key === lastCloudWrite.current) return;
    const t = window.setTimeout(() => {
      lastCloudWrite.current = key;
      setDoc(doc(db, 'pilot_profiles', authUid), payload).catch((err) => {
        lastCloudWrite.current = '';
        console.warn('Pilot profile cloud save kept local:', err?.message || err);
      });
    }, 3000);
    return () => window.clearTimeout(t);
  }, [profile, authUid, cloudReady]);

  // Leaderboard listener
  useEffect(() => {
    let unsubscribeLeaderboard: (() => void) | undefined;

    try {
      const q = query(
        collection(db, 'pilot_leaderboard'),
        orderBy('totalXp', 'desc'),
        limit(25)
      );

      unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const list: LeaderboardEntry[] = [];
          snapshot.forEach((d) => {
            list.push(d.data() as LeaderboardEntry);
          });
          setLeaderboard(list);
        }
      }, (err) => {
        console.warn('Leaderboard realtime fetch fallback:', err);
      });
    } catch (e) {
      console.warn('Leaderboard initial setup fallback:', e);
    }

    return () => {
      if (unsubscribeLeaderboard) unsubscribeLeaderboard();
    };
  }, []);

  // Sync profile to global leaderboard (throttled & silent fallback)
  const pushToLeaderboard = useCallback(async (prof: PilotProfile) => {
    try {
      // Only your own row (rules: doc id == auth uid), real counters only.
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      const entry: LeaderboardEntry = {
        uid,
        nickname: capStr(prof.nickname, 60) || 'Creador',
        avatarSeed: capStr(prof.avatarSeed, 80),
        avatarColor: capStr(prof.avatarColor, 20),
        rankTitle: capStr(prof.rankTitle, 60),
        level: clampNum(prof.level, 1000),
        totalXp: clampNum(prof.totalXp),
        droneHighScore: clampNum(prof.droneStats?.highScore),
        totalTricks: clampNum(prof.droneStats?.totalTricks),
        connectionsCount: clampNum(prof.weekendStats?.connectionsMade),
        votesCount: clampNum(prof.weekendStats?.votesSubmitted),
        updatedAt: Date.now(),
      };
      await setDoc(doc(db, 'pilot_leaderboard', uid), entry);
    } catch {
      // Gracefully keep local state if Firestore write is offline or restricted
    }
  }, []);

  // Record Activity in Weekend Breakdown
  const recordActivity = useCallback((
    category: WeekendActivityCategory, 
    title: string, 
    details: string, 
    xpEarned: number,
    highlightColor: string = '#00DDFF'
  ) => {
    setProfile(prev => {
      const newXp = prev.totalXp + xpEarned;
      const { level, rankTitle } = calculateRankAndLevel(newXp);
      
      const newActivityItem: WeekendActivityItem = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        category,
        title,
        details,
        xpEarned,
        day: getCurrentWeekendDay(),
        timestamp: Date.now(),
        highlightColor,
      };

      const updatedInteractions = prev.weekendStats.totalInteractions + 1;
      const updatedVotes = category === 'trivia_vote' || category === 'stage_cyoa' 
        ? prev.weekendStats.votesSubmitted + 1 
        : prev.weekendStats.votesSubmitted;
      const updatedConnections = category === 'match_connection' 
        ? prev.weekendStats.connectionsMade + 1 
        : prev.weekendStats.connectionsMade;
      const updatedReactions = category === 'keynote_reaction' 
        ? prev.weekendStats.reactionsSent + 1 
        : prev.weekendStats.reactionsSent;
      const updatedKeynotes = category === 'keynote_chat' 
        ? prev.weekendStats.keynotesAttended + 1 
        : prev.weekendStats.keynotesAttended;

      // Update achievements progress
      const updatedAchievements = prev.achievements.map(ach => {
        let prog = ach.progress;
        if (ach.id === 'ach_match_networker' && category === 'match_connection') {
          prog = Math.min(ach.maxProgress, prog + 1);
        }
        if (ach.id === 'ach_stage_cyoa' && category === 'stage_cyoa') {
          prog = Math.min(ach.maxProgress, prog + 1);
        }
        if (ach.id === 'ach_tour_explorer' && category === 'tour_complete') {
          prog = Math.min(ach.maxProgress, prog + 1);
        }
        const isNowUnlocked = prog >= ach.maxProgress;
        return {
          ...ach,
          progress: prog,
          unlocked: isNowUnlocked || ach.unlocked,
          unlockedAt: (isNowUnlocked && !ach.unlocked) ? Date.now() : ach.unlockedAt,
        };
      });

      const nextProf: PilotProfile = {
        ...prev,
        totalXp: newXp,
        level,
        rankTitle,
        lastActive: Date.now(),
        weekendStats: {
          ...prev.weekendStats,
          totalInteractions: updatedInteractions,
          votesSubmitted: updatedVotes,
          connectionsMade: updatedConnections,
          reactionsSent: updatedReactions,
          keynotesAttended: updatedKeynotes,
        },
        weekendActivity: [newActivityItem, ...prev.weekendActivity.slice(0, 49)],
        achievements: updatedAchievements,
      };

      pushToLeaderboard(nextProf);
      return nextProf;
    });

    // Also emit to live session telemetry so Analytics Dashboard updates in real time
    const telemetryCat =
      category === 'drone_flight' || category === 'drone_trick'
        ? 'game'
        : category === 'trivia_vote' || category === 'stage_cyoa'
        ? 'vote'
        : category === 'match_connection' || category === 'keynote_chat'
        ? 'social'
        : 'navigation';
    recordEvent(telemetryCat, category, { title, details, xpEarned });
  }, [pushToLeaderboard]);

  // Record Drone Trick and award instant XP
  const recordDroneTrick = useCallback((trick: DroneTrickType): number => {
    let xpAward = 35;
    let trickName = 'Acrobacia';
    let trickColor = '#00DDFF';

    switch (trick) {
      case 'barrel_roll':
        xpAward = 40;
        trickName = es ? 'Giro 360°' : '360° roll';
        trickColor = '#00DDFF';
        break;
      case 'flip_360':
        xpAward = 50;
        trickName = es ? 'Salto vertical 360°' : '360° vertical flip';
        trickColor = '#FFFFFF';
        break;
      case 'speed_dash':
        xpAward = 30;
        trickName = es ? 'Arrancada turbo' : 'Turbo dash';
        trickColor = '#FDCC0D';
        break;
      case 'precision_hover':
        xpAward = 45;
        trickName = es ? 'Freno de precisión' : 'Precision brake';
        trickColor = '#32527B';
        break;
      case 'emp_pulse':
        xpAward = 60;
        trickName = es ? 'Pulso SGX' : 'SGX pulse';
        trickColor = '#FFBB00';
        break;
    }

    setProfile(prev => {
      const newXp = prev.totalXp + xpAward;
      const { level, rankTitle } = calculateRankAndLevel(newXp);
      const updatedTotalTricks = prev.droneStats.totalTricks + 1;
      
      const updatedTricksBreakdown = {
        ...prev.droneStats.tricksBreakdown,
        barrelRoll: trick === 'barrel_roll' ? prev.droneStats.tricksBreakdown.barrelRoll + 1 : prev.droneStats.tricksBreakdown.barrelRoll,
        flip360: trick === 'flip_360' ? prev.droneStats.tricksBreakdown.flip360 + 1 : prev.droneStats.tricksBreakdown.flip360,
        speedDash: trick === 'speed_dash' ? prev.droneStats.tricksBreakdown.speedDash + 1 : prev.droneStats.tricksBreakdown.speedDash,
        precisionHover: trick === 'precision_hover' ? prev.droneStats.tricksBreakdown.precisionHover + 1 : prev.droneStats.tricksBreakdown.precisionHover,
        empPulse: trick === 'emp_pulse' ? prev.droneStats.tricksBreakdown.empPulse + 1 : prev.droneStats.tricksBreakdown.empPulse,
      };

      const newActivityItem: WeekendActivityItem = {
        id: 'act_trick_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        category: 'drone_trick',
        title: (es ? `Movimiento: ${trickName}` : `Move: ${trickName}`),
        details: (es ? `Usaste ${trickName} en el Dron SGX.` : `You used ${trickName} in the SGX Drone.`),
        xpEarned: xpAward,
        day: getCurrentWeekendDay(),
        timestamp: Date.now(),
        highlightColor: trickColor,
      };

      // Check trick achievements
      const updatedAchievements = prev.achievements.map(ach => {
        if (ach.id === 'ach_trick_master') {
          const prog = Math.min(ach.maxProgress, updatedTotalTricks);
          const isNowUnlocked = prog >= ach.maxProgress;
          return {
            ...ach,
            progress: prog,
            unlocked: isNowUnlocked || ach.unlocked,
            unlockedAt: (isNowUnlocked && !ach.unlocked) ? Date.now() : ach.unlockedAt,
          };
        }
        return ach;
      });

      const nextProf: PilotProfile = {
        ...prev,
        totalXp: newXp,
        level,
        rankTitle,
        lastActive: Date.now(),
        weekendStats: {
          ...prev.weekendStats,
          tricksPerformed: prev.weekendStats.tricksPerformed + 1,
          totalInteractions: prev.weekendStats.totalInteractions + 1,
        },
        droneStats: {
          ...prev.droneStats,
          totalTricks: updatedTotalTricks,
          tricksBreakdown: updatedTricksBreakdown,
        },
        weekendActivity: [newActivityItem, ...prev.weekendActivity.slice(0, 49)],
        achievements: updatedAchievements,
      };

      pushToLeaderboard(nextProf);
      return nextProf;
    });

    return xpAward;
  }, [pushToLeaderboard]);

  // Record complete drone flight
  const recordDroneFlight = useCallback((score: number, packages: number, tricks: number) => {
    // Same 40–150 XP band as the other Spark games, so a long run can't be farmed.
    const flightXp = Math.min(150, 40 + Math.floor(score / 200) + packages * 5 + tricks * 2);
    
    setProfile(prev => {
      const newHighScore = Math.max(prev.droneStats.highScore, score);
      const newXp = prev.totalXp + flightXp;
      const { level, rankTitle } = calculateRankAndLevel(newXp);
      const updatedFlights = prev.droneStats.totalFlights + 1;
      const updatedPackages = prev.droneStats.packagesDelivered + packages;

      const newActivityItem: WeekendActivityItem = {
        id: 'act_flight_' + Date.now(),
        category: 'drone_flight',
        title: (es ? `Partida de Dron SGX` : `SGX Drone run`),
        details: (es ? `Puntaje: ${score} pts • ${packages} cajas • ${tricks} poderes.` : `Score: ${score} pts • ${packages} crates • ${tricks} powers.`),
        xpEarned: flightXp,
        day: getCurrentWeekendDay(),
        timestamp: Date.now(),
        highlightColor: '#10B981',
      };

      const updatedAchievements = prev.achievements.map(ach => {
        if (ach.id === 'ach_first_flight') {
          return {
            ...ach,
            progress: 1,
            unlocked: true,
            unlockedAt: ach.unlockedAt || Date.now(),
          };
        }
        return ach;
      });

      const nextProf: PilotProfile = {
        ...prev,
        totalXp: newXp,
        level,
        rankTitle,
        lastActive: Date.now(),
        weekendStats: {
          ...prev.weekendStats,
          dronesDelivered: prev.weekendStats.dronesDelivered + packages,
          totalInteractions: prev.weekendStats.totalInteractions + 1,
        },
        droneStats: {
          ...prev.droneStats,
          highScore: newHighScore,
          packagesDelivered: updatedPackages,
          totalFlights: updatedFlights,
        },
        weekendActivity: [newActivityItem, ...prev.weekendActivity.slice(0, 49)],
        achievements: updatedAchievements,
      };

      pushToLeaderboard(nextProf);
      return nextProf;
    });
  }, [pushToLeaderboard]);

  // Update Nickname and Callsign
  const updateProfileName = useCallback((nickname: string, callsign?: string) => {
    playUiChirp(520);
    setProfile(prev => {
      const nextProf = {
        ...prev,
        nickname: nickname.trim() || prev.nickname,
        callsign: callsign ? callsign.trim() : prev.callsign,
        lastActive: Date.now(),
      };
      pushToLeaderboard(nextProf);
      return nextProf;
    });
  }, [pushToLeaderboard]);

  // Update Avatar seed and color
  const updateAvatar = useCallback((avatarSeed: string, avatarColor: string) => {
    playUiChirp(640);
    setProfile(prev => {
      const nextProf = {
        ...prev,
        avatarSeed,
        avatarColor,
        lastActive: Date.now(),
      };
      pushToLeaderboard(nextProf);
      return nextProf;
    });
  }, [pushToLeaderboard]);

  // Sync Match Details
  const syncMatchDetails = useCallback((bio: string, roles: string[], industries: string[]) => {
    setProfile(prev => {
      const nextProf = {
        ...prev,
        matchBio: bio,
        matchRoles: roles,
        matchIndustries: industries,
        lastActive: Date.now(),
      };
      return nextProf;
    });
  }, []);

  // Claim Achievement
  const claimAchievement = useCallback((achievementId: string) => {
    playUiChirp(780);
    setProfile(prev => {
      const target = prev.achievements.find(a => a.id === achievementId);
      if (!target || !target.unlocked) return prev;

      const newXp = prev.totalXp + target.xpReward;
      const { level, rankTitle } = calculateRankAndLevel(newXp);

      const activityItem: WeekendActivityItem = {
        id: 'act_ach_' + Date.now(),
        category: 'rewards_claim',
        title: (es ? `Logro Reclamado: ${target.title}` : `Achievement Claimed: ${target.title}`),
        details: (es ? `Completaste "${target.description}" y ganaste +${target.xpReward} XP.` : `You completed "${target.description}" and earned +${target.xpReward} XP.`),
        xpEarned: target.xpReward,
        day: getCurrentWeekendDay(),
        timestamp: Date.now(),
        highlightColor: target.badgeColor,
      };

      const nextProf = {
        ...prev,
        totalXp: newXp,
        level,
        rankTitle,
        weekendActivity: [activityItem, ...prev.weekendActivity.slice(0, 49)],
      };
      pushToLeaderboard(nextProf);
      return nextProf;
    });
  }, [pushToLeaderboard]);

  // Select Pilot Role with Astronaut Guide
  const selectPilotRole = useCallback((role: 'CREATOR' | 'SPONSOR' | 'STUDENT' | 'VISIONARY') => {
    playUiChirp(840);
    setProfile(prev => {
      const isFirstTime = !prev.selectedRole;
      const xpReward = isFirstTime ? 50 : 15;
      const newXp = prev.totalXp + xpReward;
      const { level, rankTitle } = calculateRankAndLevel(newXp);

      const roleLabels: Record<string, string> = {
        CREATOR: 'Creador & Dev XR',
        SPONSOR: 'Empresa & Inversionista',
        STUDENT: 'Estudiante & Aprendiz',
        VISIONARY: 'Curioso & Visionario',
      };

      const activityItem: WeekendActivityItem = {
        id: 'act_role_' + Date.now(),
        category: 'avatar_customized',
        title: (es ? `Ruta de Creador: ${roleLabels[role] || role}` : `Creator Route: ${roleLabels[role] || role}`),
        details: isFirstTime
          ? (es ? `Has sintonizado tu sendero táctico en el Summit. +${xpReward} XP otorgados.` : `You've tuned in your tactical path at the Summit. +${xpReward} XP awarded.`)
          : (es ? `Has recalibrado tu ruta de exploración a ${roleLabels[role] || role}. +${xpReward} XP.` : `You've recalibrated your exploration route to ${roleLabels[role] || role}. +${xpReward} XP.`),
        xpEarned: xpReward,
        day: getCurrentWeekendDay(),
        timestamp: Date.now(),
        highlightColor: role === 'CREATOR' ? '#00DDFF' : role === 'SPONSOR' ? '#FDCC0D' : role === 'STUDENT' ? '#FFBB00' : '#32527B',
      };

      const nextProf: PilotProfile = {
        ...prev,
        selectedRole: role,
        totalXp: newXp,
        level,
        rankTitle,
        weekendActivity: [activityItem, ...prev.weekendActivity.slice(0, 49)],
        lastActive: Date.now(),
      };
      pushToLeaderboard(nextProf);
      return nextProf;
    });
  }, [pushToLeaderboard]);


  // Refresh Leaderboard
  const refreshLeaderboard = useCallback(async () => {
    try {
      const q = query(
        collection(db, 'pilot_leaderboard'),
        orderBy('totalXp', 'desc'),
        limit(25)
      );
      const snapshot = await getDoc(doc(db, 'pilot_leaderboard', profile.uid));
      if (snapshot.exists()) {
        pushToLeaderboard(profile);
      }
    } catch (e) {
      console.warn('Leaderboard refresh notice:', e);
    }
  }, [profile, pushToLeaderboard]);

  return (
    <PilotProfileContext.Provider value={{
      profile,
      leaderboard,
      isLoading,
      isProfileModalOpen,
      setIsProfileModalOpen,
      isRoleModalOpen,
      setIsRoleModalOpen,
      liteMode,
      setLiteMode,
      selectPilotRole,
      recordActivity,
      recordDroneTrick,
      recordDroneFlight,
      updateProfileName,
      updateAvatar,
      syncMatchDetails,
      claimAchievement,
      refreshLeaderboard,
    }}>
      {children}
    </PilotProfileContext.Provider>
  );
};

export const usePilotProfile = () => {
  const context = useContext(PilotProfileContext);
  if (!context) {
    throw new Error('usePilotProfile must be used within a PilotProfileProvider');
  }
  return context;
};
