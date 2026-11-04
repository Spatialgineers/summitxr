import { collection, deleteField, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { PRESS_SLOTS, mediaTypeLabel, type PressMediaType } from './pressKit';
import { grantCredential, revokeCredential, savePendingCredential } from '../identity/credentials';

/* PRESS ACCREDITATION REQUESTS. They ride on the sponsor inquiry collection
   (`sponsor_inquiries`) so no Firestore rule had to change for them: anyone
   can create one (validated shape, `submittedBy` = own uid), only admins read
   and update. A press request is the inquiry whose selectedTierId is 'PRESS':
     companyName  = medio            contactName = nombre       roleTitle = cargo
     email, phone                    websiteUrl  = medio / redes
     selectedTierName = "Prensa · <tipo de medio>"
     customMessage    = qué planea cubrir
     goals            = tagged strings: TYPE:<tipo>, DAY:<1|2|3>, CLIP:<url>, PASS:<código>, CONSENT:yes
   The sponsor lists in the admin skip them; the Prensa panel (Personas)
   reads only them. Approving: status APPROVED, the PRENSA Holo Card
   (credential_grants/{uid}.press) and the Day 3 invitation on their pass
   (ticket_inquiries/{passCode}.status = INVITED, the same as Inscritos). */

export const PRESS_TIER_ID = 'PRESS';
export type PressStatus = 'PENDING_REVIEW' | 'APPROVED' | 'DECLINED';

export interface PressRequest {
  id: string;
  name: string;
  outlet: string;
  title: string;
  email: string;
  phone: string;
  outletUrl: string;
  mediaType: PressMediaType | string;
  clips: string[];
  plan: string;
  days: (1 | 2 | 3)[];
  consent: boolean;
  passCode: string;
  referenceCode: string;
  submittedAt: number;
  submittedBy?: string;
  status: PressStatus;
  /** Set when the approval invited them to Day 3 (so a reversal can undo just that). */
  day3ByPress?: boolean;
}

export type PressRequestInput = Omit<PressRequest, 'id' | 'referenceCode' | 'submittedAt' | 'status' | 'day3ByPress'>;

const cap = (v: string | undefined, n: number) => (v || '').trim().slice(0, n);

/** The request as the sponsor inquiry document the rules accept. */
function toInquiry(r: PressRequest): Record<string, unknown> {
  const goals = [
    `TYPE:${r.mediaType}`,
    ...r.days.map((d) => `DAY:${d}`),
    ...r.clips.filter(Boolean).slice(0, 3).map((u) => `CLIP:${cap(u, 300)}`),
    ...(r.passCode ? [`PASS:${cap(r.passCode, 40)}`] : []),
    ...(r.consent ? ['CONSENT:yes'] : []),
  ].slice(0, 12);
  const out: Record<string, unknown> = {
    id: r.id,
    companyName: cap(r.outlet, 120),
    contactName: cap(r.name, 100),
    roleTitle: cap(r.title, 100),
    email: cap(r.email, 150),
    phone: cap(r.phone, 40),
    websiteUrl: cap(r.outletUrl, 300),
    selectedTierId: PRESS_TIER_ID,
    selectedTierName: cap(`Prensa · ${mediaTypeLabel(r.mediaType)}`, 150),
    goals,
    customMessage: cap(r.plan, 2000),
    submittedAt: r.submittedAt,
    status: 'PENDING_REVIEW',
    referenceCode: r.referenceCode,
  };
  if (r.submittedBy) out.submittedBy = r.submittedBy;
  return out;
}

/** A sponsor inquiry document read back as a press request (null when it is a sponsor's). */
export function fromInquiry(id: string, d: Record<string, any>): PressRequest | null {
  if (d?.selectedTierId !== PRESS_TIER_ID) return null;
  const goals: string[] = Array.isArray(d.goals) ? d.goals.filter((g: unknown) => typeof g === 'string') : [];
  const tagged = (tag: string) => goals.filter((g) => g.startsWith(`${tag}:`)).map((g) => g.slice(tag.length + 1));
  const days = tagged('DAY').map(Number).filter((n): n is 1 | 2 | 3 => n === 1 || n === 2 || n === 3);
  const status: PressStatus = d.status === 'APPROVED' || d.status === 'DECLINED' ? d.status : 'PENDING_REVIEW';
  return {
    id,
    name: String(d.contactName || ''),
    outlet: String(d.companyName || ''),
    title: String(d.roleTitle || ''),
    email: String(d.email || ''),
    phone: String(d.phone || ''),
    outletUrl: String(d.websiteUrl || ''),
    mediaType: tagged('TYPE')[0] || '',
    clips: tagged('CLIP'),
    plan: String(d.customMessage || ''),
    days,
    consent: tagged('CONSENT')[0] === 'yes',
    passCode: tagged('PASS')[0] || '',
    referenceCode: String(d.referenceCode || ''),
    submittedAt: typeof d.submittedAt === 'number' ? d.submittedAt : 0,
    submittedBy: typeof d.submittedBy === 'string' ? d.submittedBy : undefined,
    status,
    day3ByPress: d.day3ByPress === true,
  };
}


/* ---------- the visitor's receipt (this device) ---------- */

const RECEIPT_KEY = 'sgx_press_request_v1';

export function loadPressReceipt(): PressRequest | null {
  try {
    const r = JSON.parse(localStorage.getItem(RECEIPT_KEY) || 'null');
    return r && typeof r.referenceCode === 'string' ? (r as PressRequest) : null;
  } catch { return null; }
}

export function clearPressReceipt() {
  try { localStorage.removeItem(RECEIPT_KEY); } catch { /* ignore */ }
}

/** Sends the request. Throws when it could not be sent; returns it with its tracking code. */
export async function submitPressRequest(input: PressRequestInput): Promise<PressRequest> {
  const rand = Math.random().toString(36).slice(2, 6);
  const num = Math.floor(1000 + Math.random() * 9000);
  const req: PressRequest = {
    ...input,
    id: `press_${Date.now()}_${rand}`,
    referenceCode: `SGX-PRENSA-2026-${num}`,
    submittedAt: Date.now(),
    status: 'PENDING_REVIEW',
  };
  await setDoc(doc(db, 'sponsor_inquiries', req.id), toInquiry(req));
  try { localStorage.setItem(RECEIPT_KEY, JSON.stringify(req)); } catch { /* the code is on screen */ }
  savePendingCredential('press', { name: req.name, title: req.title, org: req.outlet, topic: mediaTypeLabel(req.mediaType) });
  return req;
}

/* ---------- admin ---------- */

/** Admin: every press request, live. */
export function subscribePressRequests(onRows: (rows: PressRequest[]) => void, onError: (err: Error) => void): () => void {
  const q = query(collection(db, 'sponsor_inquiries'), where('selectedTierId', '==', PRESS_TIER_ID));
  return onSnapshot(q, (snap) => {
    const rows = snap.docs.map((d) => fromInquiry(d.id, d.data())).filter(Boolean) as PressRequest[];
    rows.sort((a, b) => b.submittedAt - a.submittedAt);
    onRows(rows);
  }, onError);
}

export const approvedCount = (rows: PressRequest[]) => rows.filter((r) => r.status === 'APPROVED').length;
export { PRESS_SLOTS };

/** The pass registration (Inscritos) of the request: by its pass code, else by the sender's uid. */
async function findRegistration(r: PressRequest): Promise<{ id: string; status: string } | null> {
  if (r.passCode) {
    const one = await getDoc(doc(db, 'ticket_inquiries', r.passCode)).catch(() => null);
    if (one?.exists()) return { id: one.id, status: String(one.data().status || 'PENDING') };
  }
  if (r.submittedBy) {
    const snap = await getDocs(query(collection(db, 'ticket_inquiries'), where('userId', '==', r.submittedBy), limit(1))).catch(() => null);
    const d = snap?.docs[0];
    if (d) return { id: d.id, status: String(d.data().status || 'PENDING') };
  }
  return null;
}

export interface DecisionResult { card: 'ok' | 'failed' | 'no-uid' | 'skipped'; day3: 'invited' | 'already' | 'reverted' | 'kept' | 'no-pass' | 'failed' | 'skipped' }

/** Admin decision: approve, decline or back to pending. Each side effect reports its own outcome. */
export async function decidePressRequest(r: PressRequest, status: PressStatus): Promise<DecisionResult> {
  const result: DecisionResult = { card: 'skipped', day3: 'skipped' };
  let day3ByPress = !!r.day3ByPress;

  if (status === 'APPROVED') {
    // 1. Day 3 invitation on their pass, the same mechanism as Inscritos.
    try {
      const reg = await findRegistration(r);
      if (!reg) result.day3 = 'no-pass';
      else if (reg.status === 'INVITED' || reg.status === 'CONFIRMED') result.day3 = 'already';
      else {
        await updateDoc(doc(db, 'ticket_inquiries', reg.id), { status: 'INVITED', invitedAt: serverTimestamp() });
        result.day3 = 'invited';
        day3ByPress = true;
      }
    } catch { result.day3 = 'failed'; }
    // 2. Their pass switches to PRENSA.
    if (!r.submittedBy) result.card = 'no-uid';
    else {
      try {
        await grantCredential(r.submittedBy, 'press', { name: r.name, title: r.title, org: r.outlet, topic: mediaTypeLabel(r.mediaType) });
        result.card = 'ok';
      } catch { result.card = 'failed'; }
    }
  } else if (r.status === 'APPROVED') {
    // Undo what the approval did (and only that).
    if (r.submittedBy) {
      try { await revokeCredential(r.submittedBy, 'press'); result.card = 'ok'; } catch { result.card = 'failed'; }
    }
    if (day3ByPress) {
      try {
        const reg = await findRegistration(r);
        if (reg && reg.status === 'INVITED') {
          await updateDoc(doc(db, 'ticket_inquiries', reg.id), { status: 'PENDING' });
          result.day3 = 'reverted';
        } else result.day3 = 'kept';
        day3ByPress = false;
      } catch { result.day3 = 'failed'; }
    }
  }

  await updateDoc(doc(db, 'sponsor_inquiries', r.id), {
    status,
    day3ByPress: day3ByPress ? true : deleteField(),
    reviewedAt: Date.now(),
  });
  return result;
}

/* ---------- CSV ---------- */

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const PRESS_STATUS_LABEL: Record<PressStatus, string> = {
  PENDING_REVIEW: 'Pendiente',
  APPROVED: 'Aprobado',
  DECLINED: 'No aprobado',
};

export function pressCsv(rows: PressRequest[]): string {
  const header = ['Código', 'Estado', 'Nombre', 'Medio', 'Cargo', 'Tipo de medio', 'Correo', 'Teléfono', 'Medio / redes', 'Coberturas previas', 'Qué planea cubrir', 'Días', 'Pase SGX', 'Invitado Día 3 por prensa', 'Consentimiento', 'Fecha'];
  const lines = rows.map((r) => [
    r.referenceCode, PRESS_STATUS_LABEL[r.status], r.name, r.outlet, r.title, mediaTypeLabel(r.mediaType), r.email, r.phone, r.outletUrl,
    r.clips.join(' | '), r.plan, r.days.map((d) => `Día ${d}`).join(', '), r.passCode, r.day3ByPress ? 'Sí' : 'No', r.consent ? 'Sí' : 'No',
    r.submittedAt ? new Date(r.submittedAt).toISOString() : '',
  ].map(csvCell).join(','));
  return '﻿' + [header.join(','), ...lines].join('\n');
}
