/* RELOAD GUARD: the one gate every automatic page reload goes through.

   The app reloads itself in a few places: a chunk that failed after a deploy
   (vite:preloadError), the account-slot swap after a sign-in or sign-out
   (accountSlots.ts) and another tab switching accounts. Each one alone is
   right, but chained together they can bounce a phone through several reloads.

   Rule: at most ONE automatic reload per browser session, and none if another
   automatic reload happened in the last two minutes (iOS installed apps start a
   new session on every launch, so sessionStorage alone is not enough). A reload
   the visitor asked for (sign in, sign out) is allowed once more, but never
   twice inside two seconds. */

const SESSION_KEY = 'sgx_auto_reload_v1';
const RECENT_KEY = 'sgx_auto_reload_at';
const COOLDOWN_MS = 2 * 60 * 1000;
const USER_GAP_MS = 2000;

export type ReloadReason = 'chunk' | 'account_swap' | 'account_other_tab';

const now = () => Date.now();
const sget = (k: string) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const sset = (k: string, v: string) => { try { sessionStorage.setItem(k, v); } catch { /* blocked */ } };
const lget = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lset = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* blocked */ } };

/** True when an automatic reload is allowed right now. Does not reload. */
export function canAutoReload(opts: { userInitiated?: boolean } = {}): boolean {
  const last = Number(lget(RECENT_KEY) || 0);
  const t = now();
  if (opts.userInitiated) return !(last && t - last < USER_GAP_MS);
  if (sget(SESSION_KEY)) return false;
  if (last && t - last < COOLDOWN_MS) return false;
  return true;
}

/**
 * Reloads the page if the guard allows it and returns true; returns false (and
 * does nothing) when a reload already happened this session or very recently.
 */
export function guardedReload(reason: ReloadReason, opts: { userInitiated?: boolean } = {}): boolean {
  if (!canAutoReload(opts)) return false;
  sset(SESSION_KEY, `${reason}:${now()}`);
  lset(RECENT_KEY, String(now()));
  window.location.reload();
  return true;
}
