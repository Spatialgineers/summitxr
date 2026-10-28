import { normalizePilot, type PilotConfig } from './pilotAvatar';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { useImmersion } from '../immersion/ImmersionContext';
import { findPillar, PILLAR_BY_KEY, type PillarKey } from '../lib/sgxPillars';
import { getAppRouteAndSectionFromUrl } from '../lib/summitUrlSync';
import { loadAllApprovedSponsors } from '../lib/summitData';
import { getMyRegion } from '../lib/visitTracker';
import {
  callsignFromName, IDENTITY_EVENT, IDENTITY_KEY, loadIdentity, newPassCode, PILLAR_ACCENT, saveIdentity,
  serialFromCode, STORAGE_FULL_EVENT, type PassContact, type PassQrPayload, type PassTier, type Redemption, type SgxIdentity,
} from './sgxIdentity';
import {
  REACTOR_MISSIONS, sponsorMissions, isPillarComplete, isDay3Open, type IdentityFlag, type ReactorMission,
} from './reactor';
import { hasServerCheckin, payloadToCard, publishConstellation, recordCheckin, registerPass, sendExchange, subscribeExchanges } from './passNetwork';
import { constellationPillars } from './constellation';

export interface ForgeInput {
  fullName: string;
  email: string;
  tier: PassTier;
  affinity: PillarKey;
  roleTitle?: string;
  organization?: string;
  avatarSeed: string;
  avatarPng?: string;
  avatarPilot?: PilotConfig;
  imageConsent: boolean;
}

export type CheckinResult = 'ok' | 'already' | 'closed' | 'no_pass' | 'need_code' | 'invalid';

/** The code from the entrance QR (?checkin=…), kept for this browser session. */
export const CHECKIN_CODE_KEY = 'sgx_checkin_code';

interface SgxIdentityValue {
  identity: SgxIdentity;
  isForged: boolean;
  /** Lifetime XP (rank, leaderboard). */
  xpEarned: number;
  /** What the Reactor store can still spend. */
  xpBalance: number;
  missions: ReactorMission[];
  isDone: (missionId: string) => boolean;
  forge: (input: ForgeInput) => void;
  setAvatar: (png: string | undefined, seed: string, affinity?: PillarKey) => void;
  setAffinity: (affinity: PillarKey) => void;
  addContact: (payload: PassQrPayload) => 'added' | 'self' | 'known';
  spendXp: (r: Omit<Redemption, 'at'>) => boolean;
  /** rehearsal: stamps locally only, outside the Day 3 window, never written to Firestore. */
  checkIn: (rehearsal?: boolean) => Promise<CheckinResult>;
  myUid: string | null;
}

const Ctx = createContext<SgxIdentityValue | null>(null);

function currentVisitKey(): string {
  const parsed = getAppRouteAndSectionFromUrl();
  if (parsed.page !== 'summit') return `PAGE_${parsed.page.toUpperCase()}`;
  if (parsed.summitSection === 'PILLAR') return `PILLAR:${findPillar(new URLSearchParams(window.location.search).get('subtab'))?.slug || 'story'}`;
  return parsed.summitSection || 'OVERVIEW';
}

export const SgxIdentityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { profile, recordActivity, updateProfileName, updateAvatar } = usePilotProfile();
  const { language } = useLanguage();
  const { pushToast, questProgress } = useImmersion();
  const [identity, setIdentity] = useState<SgxIdentity>(() => loadIdentity());
  const idRef = useRef(identity);
  idRef.current = identity;
  const langRef = useRef(language);
  langRef.current = language;
  const myUid = user?.uid || null;

  // Sponsor missions follow the published sponsor list.
  const [sponsorRev, setSponsorRev] = useState(0);
  const missions = useMemo(() => [...REACTOR_MISSIONS, ...sponsorMissions(loadAllApprovedSponsors())], [sponsorRev]);
  const missionsRef = useRef(missions);
  missionsRef.current = missions;

  const commit = useCallback((mutate: (draft: SgxIdentity) => void) => {
    const next: SgxIdentity = JSON.parse(JSON.stringify(idRef.current));
    mutate(next);
    idRef.current = next;
    saveIdentity(next);
    setIdentity(next);
  }, []);

  // Other tabs, and legacy modules that write the avatar PNG, stay in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === IDENTITY_KEY) setIdentity(loadIdentity());
      if (!e.key) setSponsorRev((r) => r + 1);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Browser storage full: tell the pilot once instead of losing progress silently.
  useEffect(() => {
    const onFull = (e: Event) => {
      const es = langRef.current === 'es';
      const saved = !!(e as CustomEvent).detail?.saved;
      pushToast({
        tag: es ? 'ALMACENAMIENTO' : 'STORAGE',
        title: es ? 'Tu navegador está sin espacio' : 'Your browser is out of space',
        detail: saved
          ? (es ? 'Guardamos tu pase sin la imagen de la Holo Card. Libera espacio o expórtala de nuevo.' : 'We saved your pass without the Holo Card image. Free some space or export it again.')
          : (es ? 'No pudimos guardar tu pase en este navegador. Libera espacio (o sal del modo privado) y vuelve a intentarlo.' : "We couldn't save your pass in this browser. Free some space (or leave private mode) and try again."),
        tone: 'telemetry',
      });
    };
    window.addEventListener(STORAGE_FULL_EVENT, onFull);
    return () => window.removeEventListener(STORAGE_FULL_EVENT, onFull);
  }, [pushToast]);

  /** Pays a mission once, then stamps its pillar when the pillar is complete. */
  const completeMission = useCallback((m: ReactorMission) => {
    if (idRef.current.missions[m.id]) return;
    const es = langRef.current === 'es';
    const copy = es ? m.es : m.en;
    const pillar = PILLAR_BY_KEY[m.pillar];
    let stamped = false;
    commit((d) => {
      d.missions[m.id] = Date.now();
      if ('sponsor' in m.trigger) d.stamps[`sponsor:${m.trigger.sponsor}`] = Date.now();
      if (!d.stamps[`pillar:${m.pillar}`] && isPillarComplete(missionsRef.current, m.pillar, d.missions)) {
        d.stamps[`pillar:${m.pillar}`] = Date.now();
        stamped = true;
      }
    });
    // Missions mirrored from a platform quest were already paid and announced
    // by that quest: one action, one reward, one toast.
    if (!('quest' in m.trigger)) {
      recordActivity('quest_complete', `Reactor · ${pillar.name} · ${copy.title}`, copy.hint, m.xp, PILLAR_ACCENT[m.pillar]);
      pushToast({ tag: `REACTOR · ${pillar.name.toUpperCase()}`, title: copy.title, detail: copy.hint, xp: m.xp, tone: 'action' });
    }
    if (stamped) {
      window.setTimeout(() => pushToast({
        tag: es ? 'SELLO IMPRESO' : 'STAMP PRINTED',
        title: es ? `${pillar.name} sellado en tu SGX Pass` : `${pillar.name} stamped on your SGX Pass`,
        detail: es ? 'Abre el Hangar para verlo.' : 'Open the Hangar to see it.',
        tone: 'telemetry',
      }), 900);
    }
    window.dispatchEvent(new CustomEvent('sgx:reactor_mission', { detail: { missionId: m.id, pillar: m.pillar, stamped } }));
  }, [commit, pushToast, recordActivity]);

  const completeWhere = useCallback((pred: (m: ReactorMission) => boolean) => {
    missionsRef.current.filter(pred).forEach(completeMission);
  }, [completeMission]);

  const flag = useCallback((f: IdentityFlag) => {
    completeWhere((m) => 'flag' in m.trigger && m.trigger.flag === f);
  }, [completeWhere]);

  // Visits: every navigation source ends in a URL sync or the section bus.
  useEffect(() => {
    const visit = (key: string) => completeWhere((m) => 'visit' in m.trigger && m.trigger.visit.includes(key));
    const onRoute = () => visit(currentVisitKey());
    const onSwitch = (e: Event) => {
      const s = (e as CustomEvent<{ section?: string }>).detail?.section;
      if (s && s !== 'PILLAR') visit(s);
    };
    const onPage = (e: Event) => {
      const p = (e as CustomEvent<{ page?: string }>).detail?.page;
      if (p) visit(`PAGE_${p.toUpperCase()}`);
    };
    const onQuest = (e: Event) => {
      const q = (e as CustomEvent<{ questId?: string }>).detail?.questId;
      if (q) completeWhere((m) => 'quest' in m.trigger && m.trigger.quest === q);
    };
    const onSponsor = (e: Event) => {
      const sp = (e as CustomEvent<{ sponsor?: { id?: string } }>).detail?.sponsor;
      if (sp?.id) completeWhere((m) => 'sponsor' in m.trigger && m.trigger.sponsor === sp.id);
    };
    const onAvatar = (e: Event) => {
      const d = (e as CustomEvent<{ png?: string; seed?: string; pillar?: string; pilot?: PilotConfig; clearPhoto?: boolean }>).detail || {};
      const aff = findPillar(d.pillar || '')?.key;
      const pilot = normalizePilot(d.pilot);
      commit((draft) => {
        if (d.png) draft.avatar.png = d.png;
        if (d.clearPhoto) delete draft.avatar.png;
        if (d.seed) draft.avatar.seed = d.seed;
        if (pilot) draft.avatar.pilot = pilot;
        if (aff && !draft.affinity) draft.affinity = aff;
      });
      flag('avatar');
    };
    onRoute();
    window.addEventListener('sgx:route_changed', onRoute);
    window.addEventListener('popstate', onRoute);
    window.addEventListener('sgx:switch_summit_section', onSwitch);
    window.addEventListener('sgx:navigate_page', onPage);
    window.addEventListener('sgx:quest_complete', onQuest);
    window.addEventListener('sgx:open_brand_showcase', onSponsor);
    window.addEventListener('sgx:avatar_saved', onAvatar);
    // Holo Card Studio export: the card lives in the Hangar next to the pass.
    const onHolo = (e: Event) => {
      const d = (e as CustomEvent<{ role?: string; image?: string }>).detail || {};
      commit((draft) => {
        draft.holo = {
          role: d.role || 'visitante',
          image: d.image && d.image.length < 700_000 ? d.image : draft.holo?.image,
          at: Date.now(),
        };
      });
      flag('holo');
    };
    window.addEventListener('sgx:holo_card_exported', onHolo);
    return () => {
      window.removeEventListener('sgx:route_changed', onRoute);
      window.removeEventListener('popstate', onRoute);
      window.removeEventListener('sgx:switch_summit_section', onSwitch);
      window.removeEventListener('sgx:navigate_page', onPage);
      window.removeEventListener('sgx:quest_complete', onQuest);
      window.removeEventListener('sgx:open_brand_showcase', onSponsor);
      window.removeEventListener('sgx:avatar_saved', onAvatar);
      window.removeEventListener('sgx:holo_card_exported', onHolo);
    };
  }, [commit, completeWhere, flag]);

  // Quests finished before the Reactor existed still count, a moment after load.
  useEffect(() => {
    const t = window.setTimeout(() => {
      completeWhere((m) => 'quest' in m.trigger && questProgress(m.trigger.quest).done);
      if (idRef.current.pass) flag('forged');
      if (idRef.current.avatar.png) flag('avatar');
      if (idRef.current.contacts.length) flag('contact');
      if (idRef.current.holo) flag('holo');
    }, 3500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The pilot profile (leaderboard, /play, telemetry) always wears the pass name and callsign.
  useEffect(() => {
    const pass = identity.pass;
    if (!pass || !identity.callsign) return;
    const first = pass.fullName.trim().split(/\s+/)[0] || pass.fullName;
    if (profile.nickname !== first || profile.callsign !== identity.callsign) updateProfileName(first, identity.callsign);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.pass?.fullName, identity.callsign, profile.nickname, profile.callsign]);

  // Constellation: the Rolodex as stars. All 6 pillars linked = secret stamp;
  // the public board only gets counts (stars, pillars), never names of contacts.
  const contactsKey = identity.contacts.map((c) => c.code).join('|');
  useEffect(() => {
    const mine = idRef.current;
    const pillars = constellationPillars(mine);
    if (pillars.length === 6 && !mine.stamps['constellation:six']) {
      commit((d) => { d.stamps['constellation:six'] = Date.now(); });
      const es = langRef.current === 'es';
      pushToast({ tag: es ? 'SECRETO' : 'SECRET', title: es ? 'Constelación completa' : 'Full constellation', detail: es ? 'Tu Rolodex conecta los 6 pilares.' : 'Your Rolodex links all 6 pillars.', tone: 'alert' });
      flag('constellation');
    }
    if (!myUid || !mine.pass || !mine.contacts.length) return;
    const t = window.setTimeout(() => {
      publishConstellation(myUid, {
        callsign: mine.callsign, name: mine.pass!.fullName.split(/\s+/)[0] || mine.callsign,
        affinity: mine.affinity, stars: mine.contacts.length, pillars,
      });
    }, 2500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactsKey, myUid, identity.pass?.code]);

  // Mutual exchange: whoever scanned my pass lands in my Rolodex too.
  useEffect(() => {
    if (!myUid) return;
    return subscribeExchanges(myUid, (cards) => {
      const known = new Set(idRef.current.contacts.map((c) => c.code));
      const fresh = cards.filter((c) => c.c && !known.has(c.c) && c.c !== idRef.current.pass?.code);
      if (!fresh.length) return;
      commit((d) => {
        fresh.forEach((c) => d.contacts.unshift({ code: c.c, name: c.n, callsign: c.s, pillar: c.p, role: c.r, organization: c.o, via: 'received', at: c.at }));
      });
      const es = langRef.current === 'es';
      pushToast({
        tag: es ? 'ROLODEX' : 'ROLODEX',
        title: es ? `${fresh[0].n} escaneó tu pase` : `${fresh[0].n} scanned your pass`,
        detail: es ? 'Ya está en tu Rolodex.' : 'Already in your Rolodex.',
        tone: 'telemetry',
      });
      flag('contact');
    });
  }, [myUid, commit, pushToast, flag]);

  const forge = useCallback((input: ForgeInput) => {
    const code = idRef.current.pass?.code || newPassCode();
    const callsign = idRef.current.callsign || callsignFromName(input.fullName);
    const pass = {
      code,
      serial: serialFromCode(code),
      tier: input.tier,
      status: input.tier === 'DIGITAL' ? 'CONFIRMED' as const : 'PENDING' as const,
      fullName: input.fullName.trim(),
      email: input.email.trim(),
      roleTitle: input.roleTitle?.trim() || undefined,
      organization: input.organization?.trim() || undefined,
      forgedAt: Date.now(),
      imageConsent: input.imageConsent === true,
      consentAt: input.imageConsent ? Date.now() : undefined,
    };
    commit((d) => {
      d.pass = pass;
      d.callsign = callsign;
      d.affinity = input.affinity;
      d.avatar = { seed: input.avatarSeed, png: input.avatarPng || d.avatar.png, pilot: input.avatarPilot || d.avatar.pilot };
    });
    updateProfileName(input.fullName.trim().split(/\s+/)[0] || input.fullName, callsign);
    updateAvatar(input.avatarSeed, PILLAR_ACCENT[input.affinity]);
    registerPass(pass, myUid);
    flag('forged');
    window.dispatchEvent(new CustomEvent('sgx:pass_forged', { detail: { code } }));
  }, [commit, flag, myUid, updateAvatar, updateProfileName]);

  const setAvatar = useCallback((png: string | undefined, seed: string, affinity?: PillarKey) => {
    commit((d) => {
      d.avatar = { seed, png: png || d.avatar.png };
      if (affinity) d.affinity = affinity;
    });
    if (png) flag('avatar');
  }, [commit, flag]);

  const setAffinity = useCallback((affinity: PillarKey) => {
    commit((d) => { d.affinity = affinity; });
  }, [commit]);

  const addContact = useCallback((p: PassQrPayload): 'added' | 'self' | 'known' => {
    if (p.c === idRef.current.pass?.code) return 'self';
    if (idRef.current.contacts.some((c) => c.code === p.c)) return 'known';
    const contact: PassContact = { code: p.c, name: p.n, callsign: p.s, pillar: p.p, role: p.r, organization: p.o, via: 'scanned', at: Date.now() };
    commit((d) => { d.contacts.unshift(contact); });
    recordActivity('match_connection', `Rolodex · ${p.n}`, p.o || p.r || 'SGX Pass', 50, '#00DDFF');
    const mine = idRef.current;
    if (p.u && myUid && mine.pass) {
      sendExchange(p.u, myUid, { c: mine.pass.code, n: mine.pass.fullName, s: mine.callsign, p: mine.affinity, r: mine.pass.roleTitle, o: mine.pass.organization });
    }
    flag('contact');
    return 'added';
  }, [commit, flag, myUid, recordActivity]);

  const spendXp = useCallback((r: Omit<Redemption, 'at'>): boolean => {
    const balance = profile.totalXp - idRef.current.xpSpent;
    if (r.cost > balance) return false;
    commit((d) => {
      d.xpSpent += r.cost;
      d.redemptions.unshift({ ...r, at: Date.now() });
    });
    flag('redeem');
    return true;
  }, [commit, flag, profile.totalXp]);

  const checkinBusy = useRef(false);
  const checkIn = useCallback(async (rehearsal = false): Promise<CheckinResult> => {
    const mine = idRef.current;
    if (!mine.pass) return 'no_pass';
    if (mine.stamps['chroma:checkin']) return 'already';
    if (!isDay3Open(Date.now(), rehearsal)) return 'closed';
    // Rehearsals only show the flow (no stamp, no XP); the real day needs the door code and the server's OK.
    if (rehearsal) return 'ok';
    {
      let code = '';
      try { code = sessionStorage.getItem(CHECKIN_CODE_KEY) || ''; } catch { /* ignore */ }
      if (!code) return 'need_code';
      if (!myUid) return 'invalid';
      if (checkinBusy.current) return 'invalid';
      checkinBusy.current = true;
      try {
        const accepted = await recordCheckin(myUid, getMyRegion(), code);
        if (!accepted) {
          // Already on the server (browser cleared, second device tap): it counts.
          if (await hasServerCheckin(myUid)) {
            commit((d) => { d.stamps['chroma:checkin'] = d.stamps['chroma:checkin'] || Date.now(); });
            return 'already';
          }
          return 'invalid';
        }
      } finally {
        checkinBusy.current = false;
      }
    }
    commit((d) => { d.stamps['chroma:checkin'] = Date.now(); });
    flag('checkin');
    return 'ok';
  }, [commit, flag, myUid]);

  const value = useMemo<SgxIdentityValue>(() => ({
    identity,
    isForged: !!identity.pass,
    xpEarned: profile.totalXp,
    xpBalance: Math.max(0, profile.totalXp - identity.xpSpent),
    missions,
    isDone: (id) => !!identity.missions[id],
    forge, setAvatar, setAffinity, addContact, spendXp, checkIn, myUid,
  }), [identity, profile.totalXp, missions, forge, setAvatar, setAffinity, addContact, spendXp, checkIn, myUid]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export function useSgxIdentity(): SgxIdentityValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSgxIdentity must be used inside SgxIdentityProvider');
  return v;
}

/** Safe variant for components that can render outside the provider. */
export function useOptionalSgxIdentity(): SgxIdentityValue | null {
  return useContext(Ctx);
}

export { IDENTITY_EVENT };
