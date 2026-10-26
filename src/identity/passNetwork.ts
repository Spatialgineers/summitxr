import {
  addDoc, collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, Timestamp, where,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PassQrPayload, SgxPass } from './sgxIdentity';
import type { PillarKey } from '../lib/sgxPillars';

/* Firestore side of the SGX Pass. Every call degrades quietly: if the rules
   are not deployed yet or the device is offline, the pass keeps working
   locally and only the shared parts (mutual Rolodex, Chroma check-ins) wait. */

/** Registration lands where the old taquilla wrote, so the admin views keep working. */
export async function registerPass(pass: SgxPass, uid: string | null): Promise<void> {
  try {
    await addDoc(collection(db, 'ticket_inquiries'), {
      email: pass.email,
      fullName: pass.fullName,
      ticketType: pass.tier === 'SHOWCASE' ? 'SHOWCASE_PHYSICAL' : 'DIGITAL',
      referenceCode: pass.code,
      roleTitle: pass.roleTitle || '',
      organization: pass.organization || '',
      status: pass.status,
      userId: uid,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.warn('[SGX Pass] registration kept local:', err instanceof Error ? err.message : err);
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

/** Day 3 entrance: one check-in per device, only inside the Day 3 window (enforced by the rules). */
export async function recordCheckin(uid: string, region: { id: string; name: string } | null): Promise<boolean> {
  try {
    await setDoc(doc(db, 'summit_checkins', uid), {
      regionId: (region?.id || 'desconocido').slice(0, 64),
      regionName: (region?.name || 'Ubicación desconocida').slice(0, 80),
      at: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.warn('[SGX Pass] check-in kept local:', err instanceof Error ? err.message : err);
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
