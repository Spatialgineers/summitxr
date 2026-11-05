import type { User } from 'firebase/auth';
import { checkEmailClaim, findMyRegistration, type EmailClaim } from './passNetwork';
import { canAutoReload, guardedReload } from '../lib/reloadGuard';

/* ACCOUNT SLOTS: the pass, XP, avatar, Rolodex and agenda live in this
   browser's localStorage, so they must follow the Google account that made
   them. Each account gets its own slot; signing in with another account (or
   signing out) parks the current data under its owner and loads the other
   slot, then reloads so every context starts from the right data.

   A guest (anonymous) who signs in keeps their progress: that is what "sign
   in to save your progress" promises. The one exception is an account that
   already has its own pass on the server; then the guest pass is parked and
   the Forge offers to bring that account's pass back. */

const OWNER_KEY = 'sgx_account_owner';
const SLOT_PREFIX = 'sgx_slot:';
const GUEST = 'guest';
/** Set while the device still holds data from before slots existed (owner unknown). */
const LEGACY_KEY = 'sgx_account_legacy';
/** This device's anonymous uid: a pass it claimed is this device's own guest pass. */
const GUEST_UID_KEY = 'sgx_account_guest_uid';
/** Set right before the reload when the account we switched to has no pass yet. */
export const FORGE_AFTER_SWITCH = 'sgx_forge_after_switch';
/** Fired after a user-initiated Google sign-in that did not need a reload. */
export const SIGNED_IN_EVENT = 'sgx:signed_in';

/** Everything that says "who you are". Device settings (language, audio, lite mode) stay shared. */
const ACCOUNT_KEYS = [
  'sgx_identity_v1',
  'sgx_pilot_profile_v2',
  'sgx_player_profile',
  'sgx_attendee_avatar_png',
  'sgx_attendee_custom_avatar',
  'sgx_summit_registered_pass',
  'sgx_summit_contacts_book',
  'sgx_immersion_v1',
  'sgx_my_agenda_sessions_v2026_10',
  'sgx_agenda_alerts_v1',
  'sgx_redeemed_prizes_v2026_10',
  'sgx_user_current_xp',
  'sgx_holo_style_v1',
  'sgx_holo_card_generated',
  'sgx_pending_credentials_v1',
];

/** When the visitor last pressed sign in / sign out (ms), so that swap counts as one they asked for. */
const ACTION_KEY = 'sgx_account_action_at';
const ACTION_WINDOW_MS = 2 * 60 * 1000;
/** Call right before a sign-in or sign-out the visitor started. */
export function markAccountAction() {
  try { sessionStorage.setItem(ACTION_KEY, String(Date.now())); } catch { /* blocked */ }
}
function userAskedForSwitch(): boolean {
  try { return Date.now() - Number(sessionStorage.getItem(ACTION_KEY) || 0) < ACTION_WINDOW_MS; } catch { return false; }
}

let switching = false;
/** True while the slots are being swapped: stores must not write until the reload. */
export const isAccountSwitching = () => switching;

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); return true; } catch { return false; } };
const del = (k: string) => { try { localStorage.removeItem(k); } catch { /* ignore */ } };

function currentPass(): { code?: string; email?: string } | null {
  try { return JSON.parse(get('sgx_identity_v1') || '{}')?.pass || null; } catch { return null; }
}

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => window.setTimeout(() => r(fallback), ms))]);
}

/** Swaps the slots and reloads. Returns false (and changes nothing) when the reload guard
    says no: an automatic swap never adds a second reload to the same session. */
function swapTo(owner: string, target: string): boolean {
  const userInitiated = userAskedForSwitch();
  if (!canAutoReload({ userInitiated })) return false;
  switching = true;
  const parked: Record<string, string> = {};
  ACCOUNT_KEYS.forEach((k) => { const v = get(k); if (v !== null) parked[k] = v; });
  if (Object.keys(parked).length) set(SLOT_PREFIX + owner, JSON.stringify(parked));

  let incoming: Record<string, string> = {};
  try { incoming = JSON.parse(get(SLOT_PREFIX + target) || '{}') || {}; } catch { /* corrupt slot: start clean */ }
  ACCOUNT_KEYS.forEach(del);
  Object.entries(incoming).forEach(([k, v]) => { if (ACCOUNT_KEYS.includes(k)) set(k, v); });
  del(SLOT_PREFIX + target);
  set(OWNER_KEY, target);

  if (target !== GUEST && !currentPass()) {
    try { sessionStorage.setItem(FORGE_AFTER_SWITCH, '1'); } catch { /* ignore */ }
  }
  try { sessionStorage.removeItem(ACTION_KEY); } catch { /* ignore */ }
  guardedReload('account_swap', { userInitiated });
  return true;
}

let inflight: { target: string; p: Promise<boolean> } | null = null;

/**
 * Makes the local data match the signed-in account. Resolves true when it
 * swapped slots and the page is reloading: the caller must stop there.
 */
export function syncAccountOwner(user: User | null): Promise<boolean> {
  if (switching) return Promise.resolve(true);
  const target = user && !user.isAnonymous ? user.uid : GUEST;
  if (inflight && inflight.target === target) return inflight.p;
  if (user?.isAnonymous) set(GUEST_UID_KEY, user.uid);
  const p = decide(target, user?.email || '').finally(() => { if (inflight?.p === p) inflight = null; });
  inflight = { target, p };
  return p;
}

async function decide(target: string, email: string): Promise<boolean> {
  let owner = get(OWNER_KEY);
  if (owner === target) return false;

  // First run with slots: we don't know who made the data already here.
  if (owner === null) {
    if (currentPass()?.code) set(LEGACY_KEY, '1');
    if (target === GUEST) { set(OWNER_KEY, GUEST); return false; }
    owner = GUEST;
  }

  if (owner === GUEST && target !== GUEST && !get(SLOT_PREFIX + target)) {
    const legacy = get(LEGACY_KEY) === '1';
    del(LEGACY_KEY);
    const pass = currentPass();
    if (!pass?.code) { set(OWNER_KEY, target); return false; }
    const sameEmail = !!pass.email && pass.email.trim().toLowerCase() === email.trim().toLowerCase();
    let parkAs: string | null = null;
    if (legacy && !sameEmail && pass.email) {
      // Data from before slots, under another email that a different account claimed:
      // someone else signed out on this device. Park it under them. (A slow answer
      // would hand their pass to whoever signs in, so wait as long as the read itself.)
      const claim = await withTimeout(checkEmailClaim(pass.email, target), 8000, { state: 'unknown' } as EmailClaim);
      if (claim.state === 'taken' && claim.userId !== get(GUEST_UID_KEY)) parkAs = claim.userId || 'unclaimed';
    }
    if (!parkAs && !sameEmail) {
      // This account already has its own pass on the server: keep the guest one aside.
      const reg = await withTimeout(findMyRegistration(target), 4000, null);
      if (reg && reg.code !== pass.code) parkAs = GUEST;
    }
    if (!parkAs) { set(OWNER_KEY, target); return false; }
    owner = parkAs;
  }

  return swapTo(owner, target);
}

/** Another tab switched accounts: this tab's in-memory data belongs to the old one. */
export function watchAccountOwner() {
  window.addEventListener('storage', (e) => {
    if (e.key !== OWNER_KEY || switching) return;
    // The other tab's first run only records "guest" (nothing was swapped): no reload needed.
    if (e.oldValue === null && e.newValue === GUEST) return;
    // From here this tab's in-memory data belongs to the old account: stop its writes,
    // then reload once (the shared guard keeps it to one).
    switching = true;
    guardedReload('account_other_tab');
  });
}
