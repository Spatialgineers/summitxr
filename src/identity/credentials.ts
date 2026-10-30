import { useEffect, useMemo, useState } from 'react';
import { deleteDoc, deleteField, doc, getDoc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { findPillar, type PillarKey } from '../lib/sgxPillars';
import { loadAllInitiates } from '../lib/summitData';
import { useAuth } from '../context/AuthContext';
import { useSgxIdentity } from './SgxIdentityContext';

/* HOLO CREDENTIALS. The Holo Card IS the SGX Pass: one card. Everyone forges
   a pass first, then can ask for a role from it; once the team approves,
   that same card switches to the role (its stub and band):
   - visitor: your SGX Pass (always, once forged): CREADOR.
   - speaker / sponsor / initiate: what you sent from your pass (speaker
     portal, sponsor form, initiate request). "In review" until the team
     approves it in the admin, which writes credential_grants/{uid}.
   - initiate: the team lists the Guild initiates (public card data) and
     their email (private). Signed in with Google with that email, your pass
     carries the Initiate card. */

export type CredentialRole = 'visitor' | 'speaker' | 'initiate' | 'sponsor';

export interface CredentialData {
  name: string;
  title?: string;
  org?: string;
  topic?: string;
  pillar?: PillarKey | null;
  photo?: string | null;
  handle?: string;
}

export interface HoloCredential extends CredentialData {
  role: CredentialRole;
  status: 'official' | 'review';
}

export const ROLE_COPY: Record<CredentialRole, { label: [string, string]; band: [string, string]; color: string }> = {
  visitor: { label: ['Creador', 'Creator'], band: ['', ''], color: '#FDCC0D' },
  speaker: { label: ['Speaker', 'Speaker'], band: ['SPEAKER OFICIAL · SGX STAGE', 'OFFICIAL SPEAKER · SGX STAGE'], color: '#FDCC0D' },
  initiate: { label: ['Initiate', 'Initiate'], band: ['SGX GUILD · INITIATE 2026', 'SGX GUILD · INITIATE 2026'], color: '#00DDFF' },
  sponsor: { label: ['Sponsor', 'Sponsor'], band: ['SPONSOR OFICIAL · SUMMIT 2026', 'OFFICIAL SPONSOR · SUMMIT 2026'], color: '#FFBB00' },
};

/* ---------- pending (sent, not yet approved): kept on this device ---------- */

const PENDING_KEY = 'sgx_pending_credentials_v1';
const CHANGED = 'sgx:credentials_changed';
type GrantRole = 'speaker' | 'sponsor' | 'initiate';
type PendingMap = Partial<Record<GrantRole, CredentialData & { at: number }>>;

function loadPending(): PendingMap {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '{}') || {}; } catch { return {}; }
}

/** Called by the speaker portal and the sponsor form after a successful send. */
export function savePendingCredential(role: GrantRole, data: CredentialData) {
  const next = { ...loadPending(), [role]: { ...data, photo: data.photo && data.photo.length < 400_000 ? data.photo : null, at: Date.now() } };
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(next)); } catch { /* storage full: still shown once granted */ }
  window.dispatchEvent(new Event(CHANGED));
}

/* ---------- grants (admin) ---------- */

/** Admin approval: the submitter's Holo Card for that role becomes official. */
export async function grantCredential(uid: string, role: GrantRole, data: CredentialData): Promise<void> {
  const clean = JSON.parse(JSON.stringify({ ...data, photo: data.photo && data.photo.length < 400_000 ? data.photo : null }));
  await setDoc(doc(db, 'credential_grants', uid), { [role]: { ...clean, grantedAt: Date.now() }, updatedAt: serverTimestamp() }, { merge: true });
}

export async function revokeCredential(uid: string, role: GrantRole): Promise<void> {
  await updateDoc(doc(db, 'credential_grants', uid), { [role]: deleteField(), updatedAt: serverTimestamp() });
}

/* ---------- initiates (admin) ---------- */

export const normEmail = (e: string) => e.trim().toLowerCase();

/** Admin: the private email list (initiateId → email) and the claim docs the initiates read. */
export async function loadInitiateEmails(): Promise<Record<string, string>> {
  const snap = await getDoc(doc(db, 'summit_private', 'initiate_emails'));
  return (snap.exists() ? (snap.data().emails as Record<string, string>) : null) || {};
}

export async function saveInitiateEmails(next: Record<string, string>, previous: Record<string, string>): Promise<void> {
  const clean: Record<string, string> = {};
  Object.entries(next).forEach(([id, e]) => { if (e && e.includes('@')) clean[id] = normEmail(e); });
  const live = new Set(Object.values(clean));
  // Old addresses no longer pointing to an initiate lose the claim.
  await Promise.all(Object.values(previous).filter((e) => e && !live.has(normEmail(e))).map((e) => deleteDoc(doc(db, 'initiate_claims', normEmail(e))).catch(() => undefined)));
  await Promise.all(Object.entries(clean).map(([initiateId, e]) => setDoc(doc(db, 'initiate_claims', e), { initiateId, updatedAt: serverTimestamp() })));
  await setDoc(doc(db, 'summit_private', 'initiate_emails'), { emails: clean, updatedAt: serverTimestamp() });
}

export function initiateCredential(id: string): HoloCredential | null {
  const init = loadAllInitiates().find((i) => i.id === id);
  if (!init) return null;
  return {
    role: 'initiate', status: 'official',
    name: init.name, handle: init.handle, title: init.role, org: 'SGX Guild Program 2026',
    topic: init.specialty, pillar: findPillar(init.pillar)?.key ?? null, photo: init.photoUrl || null,
  };
}

/* ---------- the hook ---------- */

export function useHoloCredentials(): { credentials: HoloCredential[]; googleEmail: string | null } {
  const { identity } = useSgxIdentity();
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingMap>(() => loadPending());
  const [grants, setGrants] = useState<Record<string, any> | null>(null);
  const [initiateId, setInitiateId] = useState<string | null>(null);
  const [rosterRev, setRosterRev] = useState(0);
  const googleEmail = user && !user.isAnonymous && user.email ? normEmail(user.email) : null;

  useEffect(() => {
    const reload = () => { setPending(loadPending()); setRosterRev((r) => r + 1); };
    window.addEventListener(CHANGED, reload);
    window.addEventListener('storage', reload);
    return () => { window.removeEventListener(CHANGED, reload); window.removeEventListener('storage', reload); };
  }, []);

  useEffect(() => {
    if (!user?.uid) { setGrants(null); return; }
    return onSnapshot(doc(db, 'credential_grants', user.uid), (s) => setGrants(s.exists() ? s.data() : null), () => setGrants(null));
  }, [user?.uid]);

  useEffect(() => {
    if (!googleEmail) { setInitiateId(null); return; }
    let alive = true;
    getDoc(doc(db, 'initiate_claims', googleEmail))
      .then((s) => { if (alive) setInitiateId(s.exists() ? String(s.data().initiateId || '') || null : null); })
      .catch(() => { if (alive) setInitiateId(null); });
    return () => { alive = false; };
  }, [googleEmail]);

  const credentials = useMemo(() => {
    const out: HoloCredential[] = [];
    const pass = identity.pass;
    if (pass) {
      out.push({
        role: 'visitor', status: 'official', name: pass.fullName, title: pass.roleTitle, org: pass.organization,
        pillar: identity.affinity, handle: identity.callsign,
      });
    }
    (['speaker', 'sponsor', 'initiate'] as const).forEach((role) => {
      const granted = grants?.[role];
      if (granted?.name) out.push({ ...(granted as CredentialData), role, status: 'official' });
      else if (pending[role]?.name) out.push({ ...(pending[role] as CredentialData), role, status: 'review' });
    });
    if (initiateId && !out.some((c) => c.role === 'initiate' && c.status === 'official')) {
      const c = initiateCredential(initiateId);
      if (c) out.push(c);
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.pass, identity.affinity, identity.callsign, pending, grants, initiateId, rosterRev]);

  return { credentials, googleEmail };
}

/* ---------- initiate requests (from your pass) ---------- */

export interface InitiateRequest {
  uid: string;
  name: string;
  email: string;
  passCode: string;
  pillar?: PillarKey | null;
  portfolio?: string;
  note?: string;
  at?: unknown;
}

/** A creator asks to join the SGX Guild as an Initiate. The team approves it in the admin. */
export async function submitInitiateRequest(req: InitiateRequest): Promise<void> {
  const clean = JSON.parse(JSON.stringify(req));
  await setDoc(doc(db, 'initiate_requests', req.uid), { ...clean, at: serverTimestamp() });
  savePendingCredential('initiate', { name: req.name, pillar: req.pillar ?? null, topic: req.note, org: 'SGX Guild Program 2026' });
}
