import { pillarInk, type PillarKey } from '../lib/sgxPillars';

/* =========================================================================
   SGX IDENTITY: one store for everything that says "who you are" in the
   Summit. Pass (ticket + Holo Card + credential + networking QR are the same
   object now), avatar, pillar affinity, Reactor missions, stamps, contacts
   and spent XP live under ONE localStorage key.

   Earned XP stays in PilotProfileContext (it already syncs to Firestore and
   the leaderboard). The spendable balance is `profile.totalXp - xpSpent`, so
   buying something never lowers your rank.

   Older modules still read their own keys (sgx_summit_registered_pass,
   sgx_attendee_avatar_png…). We migrate from them once and keep mirroring the
   pass to them, so nothing that still reads them breaks.
   ========================================================================= */

export const IDENTITY_KEY = 'sgx_identity_v1';
export const IDENTITY_EVENT = 'sgx:identity_changed';

export type PassTier = 'DIGITAL' | 'SHOWCASE';

export interface SgxPass {
  /** Public pass code, printed on the card and inside its QR. */
  code: string;
  /** Short serial shown big on the card, e.g. 0427. */
  serial: string;
  tier: PassTier;
  /** DIGITAL is confirmed on forge; a Day 3 request stays PENDING until invited. */
  status: 'CONFIRMED' | 'PENDING';
  fullName: string;
  email: string;
  roleTitle?: string;
  organization?: string;
  forgedAt: number;
}

export interface PassContact {
  code: string;
  name: string;
  callsign: string;
  pillar: PillarKey | null;
  role?: string;
  organization?: string;
  linkedin?: string;
  /** 'scanned' = I scanned them; 'received' = they scanned me (mutual exchange). */
  via: 'scanned' | 'received';
  at: number;
}

export interface Redemption {
  rewardId: string;
  title: string;
  cost: number;
  voucher: string;
  at: number;
}

export interface SgxIdentity {
  v: 1;
  pass: SgxPass | null;
  callsign: string;
  affinity: PillarKey | null;
  avatar: { seed: string; png?: string };
  /** missionId → completedAt */
  missions: Record<string, number>;
  /** stampId → stampedAt. pillar:<KEY>, sponsor:<id>, chroma:checkin… */
  stamps: Record<string, number>;
  contacts: PassContact[];
  xpSpent: number;
  redemptions: Redemption[];
  /** Last Holo Card exported from the Holo Card Studio (front, JPEG). */
  holo?: { image?: string; role: string; at: number };
}

/** Prefill for the Holo Card Studio from the SGX Pass: same name, code and portrait. */
export function passHoloProfile(id: SgxIdentity, pillarName?: string) {
  const pass = id.pass;
  if (!pass) return null;
  return {
    role: 'visitante' as const,
    name: pass.fullName,
    jobtitle: (pass.roleTitle || 'VISITANTE CON SGX PASS').toUpperCase(),
    org: (pass.organization || 'SPATIALGINEERS SUMMIT 2026').toUpperCase(),
    topic: pillarName ? `AFINIDAD ${pillarName.toUpperCase()}` : undefined,
    handle: id.callsign,
    passType: pass.tier === 'SHOWCASE' ? 'showcase' : 'digital',
    ticketCode: pass.code,
    photoUrl: id.avatar.png,
    // The pass affinity leads the card's pillars.
    pillars: id.affinity ? [id.affinity.toLowerCase()] : undefined,
  };
}

const AFFINITY_BY_LEGACY: Record<string, PillarKey> = {
  'SGX.STORY': 'STORY', 'SGX.SHOWCASE': 'SHOWCASE', 'SGX.SPARK': 'SPARK',
  'SGX.STAGE': 'STAGE', 'SGX.SYSTEM': 'SYSTEM', 'SGX.SYNTHESIZE': 'SYNTHESIZE',
};

/** DS accent per pillar, alternating warm and cool so neighbours never match. */
/** Text-safe pillar color (official brand color per pillar, lifted where needed). */
export const PILLAR_ACCENT: Record<PillarKey, string> = {
  STORY: pillarInk('STORY'), SHOWCASE: pillarInk('SHOWCASE'), SPARK: pillarInk('SPARK'),
  STAGE: pillarInk('STAGE'), SYSTEM: pillarInk('SYSTEM'), SYNTHESIZE: pillarInk('SYNTHESIZE'),
};

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* storage full or blocked */ }
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChunk(len: number): string {
  let out = '';
  const bytes = new Uint8Array(len);
  try { crypto.getRandomValues(bytes); } catch { for (let i = 0; i < len; i++) bytes[i] = Math.floor(Math.random() * 256); }
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

export function newPassCode(): string {
  return `SGX26-${randomChunk(4)}-${randomChunk(4)}`;
}

export function serialFromCode(code: string): string {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
  return String(h % 10000).padStart(4, '0');
}

export function callsignFromName(name: string): string {
  const first = name.trim().split(/\s+/)[0] || 'PILOTO';
  const base = first.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'PILOTO';
  return `${base}-${randomChunk(2)}`;
}

function emptyIdentity(): SgxIdentity {
  return { v: 1, pass: null, callsign: '', affinity: null, avatar: { seed: randomChunk(6) }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] };
}

interface LegacyPass {
  referenceCode?: string; ticketType?: string; fullName?: string; email?: string;
  roleTitle?: string; organization?: string; registeredAt?: number; status?: 'CONFIRMED' | 'PENDING';
}

/** One-time import of everything the old modules stored separately. */
function migrateLegacy(): SgxIdentity {
  const id = emptyIdentity();
  const legacy = readJson<LegacyPass>('sgx_summit_registered_pass');
  if (legacy?.referenceCode && legacy.fullName) {
    id.pass = {
      code: legacy.referenceCode,
      serial: serialFromCode(legacy.referenceCode),
      tier: legacy.ticketType === 'SHOWCASE_PHYSICAL' ? 'SHOWCASE' : 'DIGITAL',
      status: legacy.status || 'CONFIRMED',
      fullName: legacy.fullName,
      email: legacy.email || '',
      roleTitle: legacy.roleTitle,
      organization: legacy.organization,
      forgedAt: legacy.registeredAt || Date.now(),
    };
    id.callsign = callsignFromName(legacy.fullName);
  }
  const avatarCfg = readJson<{ pillar?: string; seed?: string }>('sgx_attendee_custom_avatar');
  if (avatarCfg?.pillar) id.affinity = AFFINITY_BY_LEGACY[avatarCfg.pillar] || null;
  if (avatarCfg?.seed) id.avatar.seed = avatarCfg.seed;
  try {
    const png = localStorage.getItem('sgx_attendee_avatar_png');
    if (png && png.startsWith('data:image')) id.avatar.png = png;
  } catch { /* ignore */ }
  const contacts = readJson<Array<{ id?: string; name?: string; role?: string; company?: string; pillar?: string; linkedin?: string; email?: string }>>('sgx_summit_contacts_book');
  if (Array.isArray(contacts)) {
    // The old Rolodex seeded a demo contact; only real scans move over.
    id.contacts = contacts
      .filter((c) => c?.name && !(c.email || '').endsWith('demo.example'))
      .slice(0, 200)
      .map((c) => ({
        code: c.id || `legacy_${randomChunk(6)}`, name: c.name as string, callsign: '', pillar: c.pillar ? AFFINITY_BY_LEGACY[c.pillar.toUpperCase()] || null : null,
        role: c.role, organization: c.company, linkedin: c.linkedin, via: 'scanned' as const, at: Date.now(),
      }));
  }
  // The rewards store used to keep its own XP balance; whatever it already spent stays spent.
  return id;
}

export function loadIdentity(): SgxIdentity {
  const saved = readJson<SgxIdentity>(IDENTITY_KEY);
  if (saved && saved.v === 1) return { ...emptyIdentity(), ...saved };
  const migrated = migrateLegacy();
  saveIdentity(migrated);
  return migrated;
}

/** Persist, mirror the pass for legacy readers, and tell every listener. */
export function saveIdentity(id: SgxIdentity) {
  write(IDENTITY_KEY, JSON.stringify(id));
  if (id.pass) {
    write('sgx_summit_registered_pass', JSON.stringify({
      id: `pass_${id.pass.code}`,
      referenceCode: id.pass.code,
      ticketType: id.pass.tier === 'SHOWCASE' ? 'SHOWCASE_PHYSICAL' : 'DIGITAL',
      fullName: id.pass.fullName,
      email: id.pass.email,
      roleTitle: id.pass.roleTitle,
      organization: id.pass.organization,
      registeredAt: id.pass.forgedAt,
      status: id.pass.status,
    }));
    write('sgx_summit_pass_registered', 'true');
    // Whoever forged a pass already had the welcome; the old tours never auto-open again.
    write('sgx_onboarding_completed', 'true');
  }
  if (id.avatar.png) write('sgx_attendee_avatar_png', id.avatar.png);
  try { window.dispatchEvent(new CustomEvent(IDENTITY_EVENT)); } catch { /* SSR */ }
}

/* ---------- The pass QR: one payload for check-in, contacts and staff ---------- */

export interface PassQrPayload {
  c: string; // code
  n: string; // name
  s: string; // callsign
  p: PillarKey | null;
  r?: string; // role
  o?: string; // organization
  u?: string; // owner's Firebase uid, so the exchange can land in their Rolodex too
}

function toBase64Url(s: string): string {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b = s.replace(/-/g, '+').replace(/_/g, '/');
  return decodeURIComponent(escape(atob(b + '==='.slice((b.length + 3) % 4))));
}

/** A URL, so any phone camera opens the Summit straight onto "add this pilot". */
export function passQrUrl(payload: PassQrPayload): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://summit.spatialgineers.com';
  return `${origin}/?pase=${toBase64Url(JSON.stringify(payload))}`;
}

export function parsePassQr(raw: string): PassQrPayload | null {
  try {
    const m = raw.match(/[?&]pase=([A-Za-z0-9_-]+)/);
    const token = m ? m[1] : raw.startsWith('sgx:pass:') ? raw.slice(9) : null;
    if (!token) return null;
    const data = JSON.parse(fromBase64Url(token));
    if (!data || typeof data.c !== 'string' || typeof data.n !== 'string') return null;
    return {
      c: data.c.slice(0, 40), n: data.n.slice(0, 80), s: String(data.s || '').slice(0, 20),
      p: AFFINITY_BY_LEGACY[`SGX.${String(data.p || '').toUpperCase()}`] || null,
      r: data.r ? String(data.r).slice(0, 80) : undefined,
      o: data.o ? String(data.o).slice(0, 80) : undefined,
      u: typeof data.u === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(data.u) ? data.u : undefined,
    };
  } catch {
    return null;
  }
}
