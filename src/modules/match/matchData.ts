// SGX Entrepreneur Match - Data & Storage Integration Layer

import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  MatchProfile, 
  MatchCandidate, 
  MatchIntent, 
  MutualMatch, 
  MatchPass, 
  MatchReport,
  MatchStats 
} from './match.types';

// Curated seed attendees matching the 6 SGX pillars to guarantee an immediate, rich deck
export const INITIAL_MATCH_CANDIDATES: MatchCandidate[] = [
  {
    uid: 'candidate_maya_lin',
    displayName: 'Maya Lin',
    email: 'maya.lin@spatialxr.io',
    organization: 'SpatialXR Labs (perfil de muestra)',
    roleTitle: 'WebXR Architect & Founder',
    avatarUrl: '',
    avatarSeed: 'maya_spark_84',
    xp: 1420,
    profile: {
      pitch: 'Building a WebXR onboarding and multiplayer workspace tool for spatial teams.',
      brings: ['3d_xr', 'technical', 'design'],
      seeking: ['investor', 'cofounder'],
      pillar: 'spark',
      openTo: ['get_funded', 'partner', 'collab'],
      visible: true,
      createdAt: '2026-09-20T10:00:00Z',
      updatedAt: '2026-09-20T10:00:00Z',
      receivedIntentCount: 3,
    }
  },
  {
    uid: 'candidate_carlos_rivera',
    displayName: 'Carlos Rivera',
    email: 'carlos@boricua.audio',
    organization: 'Sonido Espacial PR (perfil de muestra)',
    roleTitle: 'Spatial Audio Director',
    avatarUrl: '',
    avatarSeed: 'carlos_story_19',
    xp: 980,
    profile: {
      pitch: 'Diseño sonoro binaural y música reactiva procedural para experiencias inmersivas.',
      brings: ['audio', 'content', 'creative'],
      seeking: ['collaborator', 'client'],
      pillar: 'story',
      openTo: ['collab', 'partner'],
      visible: true,
      createdAt: '2026-09-20T11:30:00Z',
      updatedAt: '2026-09-20T11:30:00Z',
      receivedIntentCount: 1,
    }
  },
  {
    uid: 'candidate_elena_voss',
    displayName: 'Elena Voss',
    email: 'elena@caribbeancapital.vc',
    organization: 'Caribbean Horizon Ventures (perfil de muestra)',
    roleTitle: 'Managing Partner & Angel Investor',
    avatarUrl: '',
    avatarSeed: 'elena_systems_55',
    xp: 1850,
    profile: {
      pitch: 'Invirtiendo en startups caribeñas de WebXR, gaming y robótica espacial.',
      brings: ['capital', 'network', 'mentorship'],
      seeking: ['talent', 'cofounder'],
      pillar: 'systems',
      openTo: ['invest', 'partner'],
      visible: true,
      createdAt: '2026-09-20T12:00:00Z',
      updatedAt: '2026-09-20T12:00:00Z',
      receivedIntentCount: 8,
    }
  },
  {
    uid: 'candidate_mateo_ramos',
    displayName: 'Mateo Ramos',
    email: 'mateo@shaderforge.studio',
    organization: 'ShaderForge Studio (perfil de muestra)',
    roleTitle: 'Lead GLSL Graphics Engineer',
    avatarUrl: '',
    avatarSeed: 'mateo_showcase_02',
    xp: 1120,
    profile: {
      pitch: 'Especialista en WebGL y UberShaders de alta densidad optimizados para móvil.',
      brings: ['technical', '3d_xr', 'hardware'],
      seeking: ['client', 'collaborator'],
      pillar: 'showcase',
      openTo: ['hire', 'collab'],
      visible: true,
      createdAt: '2026-09-20T14:15:00Z',
      updatedAt: '2026-09-20T14:15:00Z',
      receivedIntentCount: 2,
    }
  },
  {
    uid: 'candidate_sofia_chen',
    displayName: 'Sofía Chen',
    email: 'sofia@synthesize.ai',
    organization: 'Synthesize Intelligence (perfil de muestra)',
    roleTitle: 'AI Prompt & LLM Systems Architect',
    avatarUrl: '',
    avatarSeed: 'sofia_synth_99',
    xp: 1650,
    profile: {
      pitch: 'Agentes autónomos de Gemini y pipelines de generación 3D en tiempo real.',
      brings: ['technical', 'sales', 'mentorship'],
      seeking: ['cofounder', 'sponsor'],
      pillar: 'synthesize',
      openTo: ['partner', 'get_funded', 'collab'],
      visible: true,
      createdAt: '2026-09-20T15:00:00Z',
      updatedAt: '2026-09-20T15:00:00Z',
      receivedIntentCount: 4,
    }
  },
  {
    uid: 'candidate_marcus_cruz',
    displayName: 'Marcus Cruz',
    email: 'marcus@chromaevents.com',
    organization: 'Stage Ops Collective (perfil de muestra)',
    roleTitle: 'Live Visuals & Stage Director',
    avatarUrl: '',
    avatarSeed: 'marcus_stage_33',
    xp: 1300,
    profile: {
      pitch: 'Montaje escénico con pantallas LED volumétricas y tracking de drones en vivo.',
      brings: ['hardware', 'network', 'legal_ops'],
      seeking: ['vendor', 'collaborator'],
      pillar: 'stage',
      openTo: ['hire', 'partner'],
      visible: true,
      createdAt: '2026-09-20T16:20:00Z',
      updatedAt: '2026-09-20T16:20:00Z',
      receivedIntentCount: 0,
    }
  },
  {
    uid: 'candidate_andrea_ortiz',
    displayName: 'Andrea Ortiz',
    email: 'andrea@techpr.org',
    organization: 'Tech Puerto Rico Guild (perfil de muestra)',
    roleTitle: 'Community & Growth Lead',
    avatarUrl: '',
    avatarSeed: 'andrea_spark_12',
    xp: 1190,
    profile: {
      pitch: 'Conectando fundadores locales con aceleradoras globales y fondos seed.',
      brings: ['community', 'network', 'sales'],
      seeking: ['sponsor', 'mentor'],
      pillar: 'spark',
      openTo: ['partner', 'collab'],
      visible: true,
      createdAt: '2026-09-20T17:00:00Z',
      updatedAt: '2026-09-20T17:00:00Z',
      receivedIntentCount: 1,
    }
  }
];

// Helper: Get storage keys
const STORAGE_KEYS = {
  MY_PROFILE: 'sgx_match_my_profile',
  XP_AWARDED: 'sgx_match_profile_xp_awarded',
  INTENTS: 'sgx_match_sent_intents',
  PASSES: 'sgx_match_recorded_passes',
  MATCHES: 'sgx_match_mutual_list',
  KILL_SWITCH: 'sgx_match_module_enabled',
  MISSION_PROGRESS: 'sgx_match_mission_progress',
  LOCAL_PROFILES_POOL: 'sgx_match_local_profiles_pool',
  REPORTS: 'sgx_match_reports_list'
};

/**
 * Load user's Match Profile from Firestore with LocalStorage fallback
 */
export async function loadUserMatchProfile(uid: string): Promise<MatchProfile | null> {
  if (!uid) return null;

  // 1. Try Firestore
  try {
    if (db) {
      const userRef = doc(db, 'players', uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.matchProfile) {
          localStorage.setItem(STORAGE_KEYS.MY_PROFILE, JSON.stringify(data.matchProfile));
          return data.matchProfile as MatchProfile;
        }
      }
    }
  } catch (err) {
    console.warn('Firestore loadUserMatchProfile note:', err);
  }

  // 2. LocalStorage Fallback
  try {
    const local = localStorage.getItem(STORAGE_KEYS.MY_PROFILE);
    if (local) return JSON.parse(local);
  } catch {}

  return null;
}

/**
 * Save user's Match Profile to Firestore and LocalStorage
 */
export async function saveUserMatchProfile(
  uid: string, 
  profile: MatchProfile
): Promise<{ isFirstPublish: boolean }> {
  let isFirstPublish = false;
  try {
    const alreadyAwarded = localStorage.getItem(STORAGE_KEYS.XP_AWARDED) === 'true';
    if (!alreadyAwarded) {
      isFirstPublish = true;
      localStorage.setItem(STORAGE_KEYS.XP_AWARDED, 'true');
    }
  } catch {}

  // Save to LocalStorage
  try {
    localStorage.setItem(STORAGE_KEYS.MY_PROFILE, JSON.stringify(profile));
  } catch {}

  // Public, email-free directory card that other attendees can see in the deck.
  try {
    if (db && uid && uid !== 'local_player') {
      let pass: any = null;
      try { pass = JSON.parse(localStorage.getItem('sgx_identity_v1') || 'null')?.pass || null; } catch {}
      await setDoc(doc(db, 'match_profiles', uid), {
        uid,
        displayName: String(pass?.fullName || pass?.callsign || 'Piloto SGX').slice(0, 80),
        organization: String(pass?.organization || '').slice(0, 120),
        roleTitle: String(pass?.roleTitle || '').slice(0, 80),
        avatarSeed: String(pass?.avatarSeed || uid).slice(0, 80),
        profile: {
          pitch: String(profile.pitch || '').slice(0, 120),
          brings: (profile.brings || []).slice(0, 8).map((b) => String(b).slice(0, 40)),
          seeking: (profile.seeking || []).slice(0, 5),
          pillar: profile.pillar,
          openTo: (profile.openTo || []).slice(0, 6),
          visible: profile.visible !== false,
          customBringsText: String(profile.customBringsText || '').slice(0, 60),
          createdAt: profile.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          receivedIntentCount: 0,
        },
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('Firestore match card note:', err);
  }

  // Save to Firestore
  try {
    if (db && uid) {
      const userRef = doc(db, 'players', uid);
      await setDoc(userRef, {
        matchProfile: {
          ...profile,
          updatedAt: new Date().toISOString(),
        },
        matchProfileXpAwarded: true
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Firestore saveUserMatchProfile note:', err);
  }

  return { isFirstPublish };
}

/**
 * Get all sent intents for current user
 */
export function getSentIntents(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INTENTS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Get all passed candidate UIDs for current user
 */
export function getPassedUids(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PASSES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Record a pass action
 */
export async function recordMatchPass(fromUid: string, toUid: string): Promise<void> {
  // Update local
  try {
    const passes = getPassedUids();
    if (!passes.includes(toUid)) {
      passes.push(toUid);
      localStorage.setItem(STORAGE_KEYS.PASSES, JSON.stringify(passes));
    }
  } catch {}

  // Write to Firestore /match_passes
  try {
    if (db && fromUid) {
      const passId = `${fromUid}_${toUid}`;
      await setDoc(doc(db, 'match_passes', passId), {
        id: passId,
        fromUid,
        toUid,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Firestore recordMatchPass note:', err);
  }
}

/**
 * Send Connect Intent & Check for Reciprocal Mutual Match
 */
export async function sendMatchConnectIntent(
  fromCandidate: MatchCandidate,
  toCandidate: MatchCandidate
): Promise<{ isMatch: boolean; mutualMatch?: MutualMatch }> {
  const fromUid = fromCandidate.uid;
  const toUid = toCandidate.uid;

  // 1. Record sent intent locally
  const intents = getSentIntents();
  if (!intents.includes(toUid)) {
    intents.push(toUid);
    try {
      localStorage.setItem(STORAGE_KEYS.INTENTS, JSON.stringify(intents));
    } catch {}
  }

  // 2. Write intent to Firestore
  try {
    if (db) {
      const intentId = `${fromUid}_${toUid}`;
      await setDoc(doc(db, 'match_intents', intentId), {
        id: intentId,
        fromUid,
        toUid,
        createdAt: new Date().toISOString()
      });
    }
  } catch (err) {
    console.warn('Firestore sendMatchConnectIntent note:', err);
  }

  // 3. Reciprocity check: did toUid already connect with fromUid?
  let isReciprocal = false;

  // Check in Firestore
  try {
    if (db) {
      const reverseIntentId = `${toUid}_${fromUid}`;
      const reverseSnap = await getDoc(doc(db, 'match_intents', reverseIntentId));
      if (reverseSnap.exists()) {
        isReciprocal = true;
      }
    }
  } catch (err) {
    console.warn('Firestore reciprocity check note:', err);
  }


  if (isReciprocal) {
    // Generate deterministic sorted pair ID
    const sortedIds = [fromUid, toUid].sort();
    const matchId = `${sortedIds[0]}__${sortedIds[1]}`;

    const newMatch: MutualMatch = {
      id: matchId,
      userA: sortedIds[0],
      userB: sortedIds[1],
      createdAt: new Date().toISOString(),
      xpAwarded: true,
      notes: {},
      candidateA: fromUid === sortedIds[0] ? fromCandidate : toCandidate,
      candidateB: fromUid === sortedIds[1] ? fromCandidate : toCandidate
    };

    // Save to LocalStorage
    try {
      const existingMatches = getLocalMatches();
      if (!existingMatches.some(m => m.id === matchId)) {
        existingMatches.unshift(newMatch);
        localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(existingMatches));
      }
    } catch {}

    // Save to Firestore /matches
    try {
      if (db) {
        await setDoc(doc(db, 'matches', matchId), {
          id: matchId,
          userA: sortedIds[0],
          userB: sortedIds[1],
          createdAt: new Date().toISOString(),
          xpAwarded: true,
          notes: {}
        }, { merge: true });
      }
    } catch (err) {
      console.warn('Firestore create match doc note:', err);
    }

    return { isMatch: true, mutualMatch: newMatch };
  }

  return { isMatch: false };
}

/**
 * The person who connected first only learns about the match when the other side
 * connects back. On load, check each intent we sent for a match doc (members can
 * read it) and add the ones we don't have yet. Returns the newly found matches.
 */
export async function syncRemoteMatches(myUid: string): Promise<MutualMatch[]> {
  if (!db || !myUid || myUid === 'local_player') return [];
  const known = new Set(getLocalMatches().map((m) => m.id));
  const found: MutualMatch[] = [];
  for (const toUid of getSentIntents()) {
    const [a, b] = [myUid, toUid].sort();
    const matchId = `${a}__${b}`;
    if (known.has(matchId)) continue;
    try {
      const snap = await getDoc(doc(db, 'matches', matchId));
      if (!snap.exists()) continue;
      const card = await getDoc(doc(db, 'match_profiles', toUid));
      const c = card.exists() ? (card.data() as any) : {};
      const other: MatchCandidate = {
        uid: toUid,
        displayName: c.displayName || 'Piloto SGX',
        organization: c.organization || '',
        roleTitle: c.roleTitle || '',
        avatarUrl: '',
        avatarSeed: c.avatarSeed || toUid,
        xp: 0,
        profile: c.profile as MatchProfile,
      };
      found.push({
        id: matchId, userA: a, userB: b,
        createdAt: (snap.data() as any).createdAt || new Date().toISOString(),
        xpAwarded: true, notes: {},
        candidateA: a === toUid ? other : undefined,
        candidateB: b === toUid ? other : undefined,
      });
    } catch {
      /* offline or not a member: skip */
    }
  }
  if (found.length) {
    try {
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify([...found, ...getLocalMatches()]));
    } catch { /* ignore */ }
  }
  return found;
}

/**
 * Load all mutual matches for user
 */
export function getLocalMatches(): MutualMatch[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MATCHES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Fetch candidates pool, filtering out passed, matched, and sent intents
 */
export async function fetchCandidatesDeck(
  myUid: string,
  myProfile: MatchProfile
): Promise<MatchCandidate[]> {
  const passedUids = getPassedUids();
  const sentIntents = getSentIntents();
  const matchedUids = getLocalMatches().map(m => m.userA === myUid ? m.userB : m.userA);

  const excluded = new Set([myUid, ...passedUids, ...sentIntents, ...matchedUids]);

  // Real attendees only: the public, email-free cards in `match_profiles`.
  // (The seed profiles above are kept for the admin preview, never shown in the deck.)
  const pool: MatchCandidate[] = [];
  try {
    if (db) {
      const snap = await getDocs(query(collection(db, 'match_profiles'), limit(300)));
      snap.forEach(d => {
        const data = d.data() as any;
        if (!data?.profile || typeof data.profile.pitch !== 'string' || !data.profile.pitch || data.profile.visible === false || d.id === myUid) return;
        pool.push({
          uid: d.id,
          displayName: data.displayName || 'Piloto SGX',
          organization: data.organization || '',
          roleTitle: data.roleTitle || '',
          avatarUrl: '',
          avatarSeed: data.avatarSeed || d.id,
          xp: 0,
          profile: data.profile as MatchProfile,
        });
      });
    }
  } catch (err) {
    console.warn('Firestore fetchCandidatesDeck note:', err);
  }

  // Filter pool
  return pool.filter(c => !excluded.has(c.uid) && c.profile.visible !== false);
}

/**
 * Save private note on a mutual match
 */
export async function saveMatchPrivateNote(
  matchId: string, 
  myUid: string, 
  note: string
): Promise<void> {
  // 1. Update local
  try {
    const matches = getLocalMatches();
    const target = matches.find(m => m.id === matchId);
    if (target) {
      target.notes = target.notes || {};
      target.notes[myUid] = note;
      localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
    }
  } catch {}

  // Private notes stay on this device: the other person can never read them.
}

/**
 * Report a match profile for moderation
 */
export async function reportMatchProfile(
  fromUid: string,
  targetUid: string,
  reason: string
): Promise<void> {
  const reportId = `report_${Date.now()}_${fromUid}`;
  const report: MatchReport = {
    id: reportId,
    fromUid,
    targetUid,
    reason,
    createdAt: new Date().toISOString()
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS);
    const reports = raw ? JSON.parse(raw) : [];
    reports.push(report);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
  } catch {}

  try {
    if (db) {
      await setDoc(doc(db, 'match_reports', reportId), report);
    }
  } catch (err) {
    console.warn('Firestore reportMatchProfile note:', err);
  }
}

/**
 * Admin: Get all profiles
 */
export async function getAllProfilesForAdmin(): Promise<MatchCandidate[]> {
  const list: MatchCandidate[] = [...INITIAL_MATCH_CANDIDATES];

  try {
    if (db) {
      const q = query(collection(db, 'players'), limit(100));
      const snap = await getDocs(q);
      snap.forEach(d => {
        const data = d.data();
        if (data.matchProfile) {
          const existingIdx = list.findIndex(c => c.uid === d.id);
          const candidate: MatchCandidate = {
            uid: d.id,
            displayName: data.username || data.nickname || `Founder_${d.id.slice(0, 4)}`,
            email: data.email || '',
            organization: data.organization || 'Attendee',
            roleTitle: data.roleTitle || 'Builder',
            avatarUrl: data.avatar || '',
            avatarSeed: data.avatarSeed || d.id,
            xp: data.totalScore || 100,
            profile: data.matchProfile
          };
          if (existingIdx >= 0) {
            list[existingIdx] = candidate;
          } else {
            list.push(candidate);
          }
        }
      });
    }
  } catch (err) {
    console.warn('Firestore getAllProfilesForAdmin note:', err);
  }

  return list;
}

/**
 * Admin: Toggle profile visibility (soft moderation)
 */
export async function toggleProfileVisibilityAdmin(uid: string, visible: boolean): Promise<void> {
  const seed = INITIAL_MATCH_CANDIDATES.find(c => c.uid === uid);
  if (seed) {
    seed.profile.visible = visible;
  }

  try {
    if (db) {
      await setDoc(doc(db, 'players', uid), {
        matchProfile: { visible }
      }, { merge: true });
      // Only touch an existing public card; never create a partial one.
      const cardRef = doc(db, 'match_profiles', uid);
      const card = await getDoc(cardRef).catch(() => null);
      if (card?.exists()) await setDoc(cardRef, { profile: { visible } }, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore toggleProfileVisibilityAdmin note:', err);
  }
}

/**
 * Admin: Delete profile
 */
export async function deleteProfileAdmin(uid: string): Promise<void> {
  const seedIdx = INITIAL_MATCH_CANDIDATES.findIndex(c => c.uid === uid);
  if (seedIdx >= 0) {
    INITIAL_MATCH_CANDIDATES.splice(seedIdx, 1);
  }

  try {
    if (db) {
      await setDoc(doc(db, 'players', uid), {
        matchProfile: null
      }, { merge: true });
      await deleteDoc(doc(db, 'match_profiles', uid)).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore deleteProfileAdmin note:', err);
  }
}

/**
 * Admin: Global Kill Switch
 */
export function getMatchModuleKillSwitch(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.KILL_SWITCH);
    return saved !== null ? saved === 'true' : true; // default enabled
  } catch {
    return true;
  }
}

export function setMatchModuleKillSwitch(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.KILL_SWITCH, String(enabled));
  } catch {}
}

/**
 * Export a match contact to standard vCard 3.0 (.vcf)
 */
export function exportContactAsVCard(candidate: MatchCandidate): void {
  const name = candidate.displayName || 'Spatialgineer Contact';
  const org = candidate.organization || 'Spatialgineers Summit 2026';
  const role = candidate.roleTitle || candidate.profile?.pitch || 'Builder';
  const email = candidate.email || '';
  const note = `SGX Match at Spatialgineers Summit 2026. Pitch: ${candidate.profile?.pitch || ''}. Brings: ${candidate.profile?.brings.join(', ')}. Seeking: ${candidate.profile?.seeking.join(', ')}.`;

  const vcard = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${name}`,
    `N:;${name};;;`,
    `ORG:${org}`,
    `TITLE:${role}`,
    email ? `EMAIL;TYPE=INTERNET:${email}` : '',
    `NOTE:${note.replace(/\n/g, '\\n')}`,
    'URL:https://summit.spatialgineers.com',
    'END:VCARD'
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([vcard], { type: 'text/vcard;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${name.replace(/\s+/g, '_')}_SGX_Match.vcf`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export all mutual matches to CSV
 */
export function exportMatchesAsCSV(matches: MutualMatch[], myUid: string): void {
  const headers = ['Name', 'Organization', 'Role', 'Email', 'Pillar', 'Pitch', 'Brings', 'Seeking', 'Private Note', 'Matched At'];
  const rows = matches.map(m => {
    const other = m.userA === myUid ? (m.candidateB || m.candidateA) : (m.candidateA || m.candidateB);
    const myNote = (m.notes && m.notes[myUid]) || '';
    return [
      `"${(other?.displayName || 'Attendee').replace(/"/g, '""')}"`,
      `"${(other?.organization || 'SGX 2026').replace(/"/g, '""')}"`,
      `"${(other?.roleTitle || '').replace(/"/g, '""')}"`,
      `"${(other?.email || '').replace(/"/g, '""')}"`,
      `"${(other?.profile?.pillar || '').toUpperCase()}"`,
      `"${(other?.profile?.pitch || '').replace(/"/g, '""')}"`,
      `"${(other?.profile?.brings.join(', ') || '').replace(/"/g, '""')}"`,
      `"${(other?.profile?.seeking.join(', ') || '').replace(/"/g, '""')}"`,
      `"${myNote.replace(/"/g, '""')}"`,
      `"${m.createdAt || ''}"`
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `SGX_Matches_Export_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
