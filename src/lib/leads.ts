import { useEffect, useSyncExternalStore } from 'react';
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import type { PillarKey } from './sgxPillars';

/* POTENTIAL CLIENTS. The team marks a visitor, a sponsor application or a
   brand as a lead with one tap (the ⭐ next to them in Inscritos, Sponsors
   and the Rolodex), during the event or any time, and follows up after it
   from Admin → Personas → Clientes potenciales. One document per person or
   brand (leads/{kind_ref}), so tapping again un-marks the same one. Admins
   only: the rules keep everyone else out. */

export type LeadKind = 'visitor' | 'sponsor' | 'brand';
export type LeadStatus = 'NEW' | 'CONTACTED' | 'TALKING' | 'CLIENT' | 'DROPPED';
export type LeadSource = 'inscritos' | 'solicitud' | 'marca' | 'rolodex';

export const LEAD_STATUS: { id: LeadStatus; label: string; tone: string }[] = [
  { id: 'NEW', label: 'Nuevo', tone: '#FDCC0D' },
  { id: 'CONTACTED', label: 'Contactado', tone: '#00DDFF' },
  { id: 'TALKING', label: 'En conversación', tone: '#7FB2E5' },
  { id: 'CLIENT', label: 'Cliente', tone: '#4ade80' },
  { id: 'DROPPED', label: 'Descartado', tone: '#888888' },
];

export const LEAD_KIND_LABEL: Record<LeadKind, string> = { visitor: 'Visitante', sponsor: 'Solicitud de sponsor', brand: 'Marca' };

export interface LeadInput {
  kind: LeadKind;
  /** pass code, sponsor application id or brand id */
  ref: string;
  name: string;
  email?: string;
  organization?: string;
  role?: string;
  phone?: string;
  pillar?: PillarKey | null;
  source: LeadSource;
}

export interface Lead extends LeadInput {
  id: string;
  status: LeadStatus;
  note: string;
  interest: PillarKey[];
  flaggedBy: string;
  flaggedAt: number;
  updatedAt: number;
}

export const leadId = (kind: LeadKind, ref: string) => `${kind}_${ref}`.replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 120);

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
const ms = (v: unknown) => (v && typeof (v as { toMillis?: () => number }).toMillis === 'function' ? (v as { toMillis: () => number }).toMillis() : typeof v === 'number' ? v : 0);

/* One live list for the whole admin (Inscritos, Sponsors, the Rolodex and the
   leads panel all read the same snapshot). It only runs while someone uses it. */
let leads: Lead[] = [];
let users = 0;
let stop: (() => void) | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

function start() {
  if (stop) return;
  stop = onSnapshot(query(collection(db, 'leads'), orderBy('flaggedAt', 'desc')), (snap) => {
    leads = snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id, kind: v.kind, ref: str(v.ref, 120), name: str(v.name, 120), email: str(v.email, 160) || undefined,
        organization: str(v.organization, 150) || undefined, role: str(v.role, 100) || undefined, phone: str(v.phone, 40) || undefined,
        pillar: v.pillar || null, source: v.source, status: v.status || 'NEW', note: str(v.note, 2000),
        interest: Array.isArray(v.interest) ? v.interest : [], flaggedBy: str(v.flaggedBy, 160),
        flaggedAt: ms(v.flaggedAt), updatedAt: ms(v.updatedAt),
      } as Lead;
    });
    emit();
  }, () => { leads = []; emit(); });
}

/** Live list of leads (admins). */
export function useLeads(): Lead[] {
  useEffect(() => {
    users += 1;
    start();
    return () => {
      users -= 1;
      if (users <= 0 && stop) { stop(); stop = null; users = 0; }
    };
  }, []);
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => leads, () => leads);
}

const clean = <T extends Record<string, unknown>>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== '')) as T;

export async function flagLead(raw: LeadInput): Promise<void> {
  const input = { ...raw };
  // a visitor starred from the Rolodex has no email there: their registration (doc id = pass code) has it
  if (input.kind === 'visitor' && !input.email) {
    try {
      const reg = await getDoc(doc(db, 'ticket_inquiries', input.ref));
      const v = reg.exists() ? reg.data() : null;
      if (v) {
        input.email = typeof v.email === 'string' ? v.email : undefined;
        input.name = input.name || v.fullName;
        input.organization = input.organization || v.organization || undefined;
        input.role = input.role || v.roleTitle || undefined;
      }
    } catch { /* offline: the lead is saved with what we have */ }
  }
  const id = leadId(input.kind, input.ref);
  await setDoc(doc(db, 'leads', id), clean({
    kind: input.kind, ref: input.ref.slice(0, 120), name: input.name.slice(0, 120) || '—',
    email: input.email?.slice(0, 160), organization: input.organization?.slice(0, 150), role: input.role?.slice(0, 100),
    phone: input.phone?.slice(0, 40), pillar: input.pillar || undefined, source: input.source,
    status: 'NEW', note: '', interest: input.pillar ? [input.pillar] : [],
    flaggedBy: auth.currentUser?.email || auth.currentUser?.uid || 'admin',
    flaggedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }));
}

export const unflagLead = (id: string) => deleteDoc(doc(db, 'leads', id));

export const updateLead = (id: string, patch: Partial<Pick<Lead, 'status' | 'note' | 'interest' | 'email' | 'phone'>>) =>
  updateDoc(doc(db, 'leads', id), { ...patch, updatedAt: serverTimestamp() });

/** CSV for the follow-up (opens in Excel / Google Sheets). */
export function leadsCsv(list: Lead[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Nombre', 'Tipo', 'Estado', 'Email', 'Teléfono', 'Organización', 'Rol', 'Interés (pilares)', 'Nota', 'Origen', 'Referencia', 'Marcado por', 'Marcado el'];
  const rows = list.map((l) => [l.name, LEAD_KIND_LABEL[l.kind], LEAD_STATUS.find((s) => s.id === l.status)?.label, l.email, l.phone, l.organization, l.role,
    l.interest.join(' '), l.note, l.source, l.ref, l.flaggedBy, l.flaggedAt ? new Date(l.flaggedAt).toLocaleString('es-PR') : '']);
  return [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
}
