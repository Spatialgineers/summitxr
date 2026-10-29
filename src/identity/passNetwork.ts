import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, Timestamp, where, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PassQrPayload, SgxPass } from './sgxIdentity';
import type { PillarKey } from '../lib/sgxPillars';

/* Firestore side of the SGX Pass. Every call degrades quietly: if the rules
   are not deployed yet or the device is offline, the pass keeps working
   locally and only the shared parts (mutual Rolodex, Chroma check-ins) wait. */

/** Registration lands where the old taquilla wrote, so the admin views keep working. */
export async function registerPass(pass: SgxPass, uid: string | null, affinity?: PillarKey | null): Promise<void> {
  // One registration per pass (doc id = pass code). Editing the pass updates it in place;
  // the status is never sent from the browser, so an invitation set by the team survives.
  try {
    await setDoc(doc(db, 'ticket_inquiries', pass.code), {
      email: pass.email,
      fullName: pass.fullName,
      ticketType: pass.tier === 'SHOWCASE' ? 'SHOWCASE_PHYSICAL' : 'DIGITAL',
      referenceCode: pass.code,
      roleTitle: pass.roleTitle || '',
      organization: pass.organization || '',
      imageConsent: pass.imageConsent === true,
      ...(pass.consentAt ? { consentAt: pass.consentAt } : {}),
      ...(affinity ? { affinity } : {}),
      userId: uid,
      timestamp: serverTimestamp(),
    }, { merge: true });
  } catch (err) {
    console.warn('[SGX Pass] registration kept local:', err instanceof Error ? err.message : err);
  }
}

export interface MyRegistration {
  code: string;
  fullName: string;
  email: string;
  tier: 'DIGITAL' | 'SHOWCASE';
  roleTitle?: string;
  organization?: string;
  imageConsent?: boolean;
  affinity?: PillarKey | null;
}

/** A pass forged on another device while signed in with this Google account (rules: owner can read it). */
export async function findMyRegistration(uid: string): Promise<MyRegistration | null> {
  try {
    const snap = await getDocs(query(collection(db, 'ticket_inquiries'), where('userId', '==', uid), limit(1)));
    const d = snap.docs[0];
    if (!d) return null;
    const v = d.data();
    return {
      code: String(v.referenceCode || d.id),
      fullName: String(v.fullName || ''),
      email: String(v.email || ''),
      tier: v.ticketType === 'SHOWCASE_PHYSICAL' ? 'SHOWCASE' : 'DIGITAL',
      roleTitle: v.roleTitle || undefined,
      organization: v.organization || undefined,
      imageConsent: v.imageConsent === true,
      affinity: (['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'] as PillarKey[]).includes(v.affinity) ? v.affinity : null,
    };
  } catch (err) {
    console.warn('[SGX Pass] could not look up an earlier pass:', err instanceof Error ? err.message : err);
    return null;
  }
}

/* ---------- one SGX Pass per email ----------
   pass_emails/{sha256(email)} → { code, userId }. Created with the pass; a
   second pass with the same email is refused unless it is the same account,
   which gets its own pass back instead. The email itself is never stored. */

async function emailKey(email: string): Promise<string> {
  const bytes = new TextEncoder().encode(email.trim().toLowerCase());
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type EmailClaim = { state: 'free' } | { state: 'mine'; code: string } | { state: 'taken'; userId?: string } | { state: 'unknown' };

export async function checkEmailClaim(email: string, uid: string | null): Promise<EmailClaim> {
  try {
    const snap = await getDoc(doc(db, 'pass_emails', await emailKey(email)));
    if (!snap.exists()) return { state: 'free' };
    const v = snap.data();
    return uid && v.userId === uid ? { state: 'mine', code: String(v.code) } : { state: 'taken', userId: v.userId ? String(v.userId) : undefined };
  } catch {
    // Offline or rules not deployed yet: do not block the forge.
    return { state: 'unknown' };
  }
}

export async function claimEmail(email: string, code: string, uid: string | null): Promise<void> {
  if (!uid) return;
  try {
    await setDoc(doc(db, 'pass_emails', await emailKey(email)), { code, userId: uid, at: serverTimestamp() });
  } catch (err) {
    console.warn('[SGX Pass] email claim kept local:', err instanceof Error ? err.message : err);
  }
}

export interface ExchangeCard {
  c: string; n: string; s: string; p: PillarKey | null; r?: string; o?: string;
}

/**
 * I scanned someone: drop my card in their inbox so I land in their Rolodex
 * too. One doc per pair (id = to_from), create-only.
 */
export async function sendExchange(toUid: string, fromUid: string, card: ExchangeCard): Promise<boolean> {
  if (!toUid || !fromUid || toUid === fromUid) return false;
  try {
    await setDoc(doc(db, 'summit_pass_exchanges', `${toUid}_${fromUid}`), {
      toUid,
      fromUid,
      card: {
        c: card.c.slice(0, 40), n: card.n.slice(0, 80), s: (card.s || '').slice(0, 20), p: card.p || '',
        r: (card.r || '').slice(0, 80), o: (card.o || '').slice(0, 80),
      },
      at: serverTimestamp(),
    });
    return true;
  } catch (err) {
    // Already exchanged (update denied) or rules not deployed.
    console.warn('[SGX Pass] exchange not sent:', err instanceof Error ? err.message : err);
    return false;
  }
}

export function subscribeExchanges(myUid: string, cb: (cards: Array<ExchangeCard & { at: number }>) => void): () => void {
  const q = query(collection(db, 'summit_pass_exchanges'), where('toUid', '==', myUid), limit(300));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const v = d.data();
      const card = v.card || {};
      return {
        c: String(card.c || d.id), n: String(card.n || '—'), s: String(card.s || ''),
        p: (card.p || null) as PillarKey | null, r: card.r || undefined, o: card.o || undefined,
        at: v.at instanceof Timestamp ? v.at.toMillis() : Date.now(),
      };
    }));
  }, () => { /* rules not deployed: no mutual exchange yet */ });
}

export interface ChromaCheckin {
  id: string;
  regionId: string;
  regionName: string;
  at: number;
}

/**
 * Day 3 entrance: one check-in per device, only inside the Day 3 window and
 * only with the code printed at the door (enforced by the rules: the code is
 * compared against `summit_private/checkin`, which no visitor can read). The
 * code goes in a private proof doc; the public check-in only carries the region.
 */
export async function recordCheckin(uid: string, region: { id: string; name: string } | null, code: string): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'summit_checkin_proofs', uid), { code: code.slice(0, 40), at: serverTimestamp() });
    batch.set(doc(db, 'summit_checkins', uid), {
      regionId: (region?.id || 'desconocido').slice(0, 64),
      regionName: (region?.name || 'Ubicación desconocida').slice(0, 80),
      at: serverTimestamp(),
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.warn('[SGX Pass] check-in refused:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** True when this uid already has a Day 3 check-in on the server (e.g. after clearing the browser). */
export async function hasServerCheckin(uid: string): Promise<boolean> {
  try {
    return (await getDoc(doc(db, 'summit_checkins', uid))).exists();
  } catch {
    return false;
  }
}

export function subscribeCheckins(cb: (list: ChromaCheckin[] | null) => void): () => void {
  const q = query(collection(db, 'summit_checkins'), limit(1000));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const v = d.data();
      return { id: d.id, regionId: v.regionId || 'desconocido', regionName: v.regionName || '', at: v.at instanceof Timestamp ? v.at.toMillis() : 0 };
    }));
  }, () => cb(null));
}

export function payloadToCard(p: PassQrPayload): ExchangeCard {
  return { c: p.c, n: p.n, s: p.s, p: p.p, r: p.r, o: p.o };
}

/* ---------- Constellations: the public face of the Rolodex ----------
   Only counts travel (how many stars, which pillars), never who they are. */

export interface ConstellationEntry {
  uid: string;
  callsign: string;
  name: string;
  affinity: PillarKey | null;
  stars: number;
  pillars: PillarKey[];
  updatedAt: number;
}

const PILLAR_KEYS: PillarKey[] = ['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'];

export async function publishConstellation(uid: string, e: Omit<ConstellationEntry, 'uid' | 'updatedAt'>): Promise<void> {
  try {
    await setDoc(doc(db, 'summit_constellations', uid), {
      callsign: e.callsign.slice(0, 20),
      name: e.name.slice(0, 40),
      affinity: e.affinity || '',
      stars: Math.max(0, Math.min(500, Math.floor(e.stars))),
      pillars: e.pillars.filter((p) => PILLAR_KEYS.includes(p)).slice(0, 6),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[SGX Pass] constellation kept local:', err instanceof Error ? err.message : err);
  }
}

export function subscribeConstellationBoard(cb: (list: ConstellationEntry[] | null) => void): () => void {
  const q = query(collection(db, 'summit_constellations'), orderBy('stars', 'desc'), limit(10));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => {
      const v = d.data();
      return {
        uid: d.id, callsign: v.callsign || '', name: v.name || '', affinity: (v.affinity || null) as PillarKey | null,
        stars: v.stars || 0, pillars: Array.isArray(v.pillars) ? v.pillars : [],
        updatedAt: v.updatedAt instanceof Timestamp ? v.updatedAt.toMillis() : 0,
      };
    }));
  }, () => cb(null));
}
