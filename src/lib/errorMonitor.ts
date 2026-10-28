import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

/* Error monitoring for the live: every visitor's phone reports uncaught
   errors, failed promises and React crashes to Firestore `client_errors`,
   and the admin dashboard ("Errores en vivo") shows them as they arrive.
   No third-party service. Per session: duplicates collapse into one report and
   at most MAX_REPORTS are sent, so a broken loop can't flood the database. */

export type ErrorKind = 'error' | 'promise' | 'react' | 'chunk' | 'webgl' | 'manual';

const MAX_REPORTS = 15;
const COLLECTION = 'client_errors';
const sessionId = (() => {
  try {
    const k = 'sgx_err_session';
    const v = sessionStorage.getItem(k) || Math.random().toString(36).slice(2, 12);
    sessionStorage.setItem(k, v);
    return v;
  } catch { return Math.random().toString(36).slice(2, 12); }
})();
const seen = new Map<string, number>();
let sent = 0;
let installed = false;

const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i, // cross-origin, no details to act on
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /AbortError|The user aborted a request/i,
  /Non-Error promise rejection captured with value: undefined/i,
];

const CHUNK = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i;

function enabled(): boolean {
  if (typeof window === 'undefined') return false;
  const local = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  // Local runs only report when pointed at the emulators (the e2e tests).
  return !local || (import.meta as any).env?.VITE_USE_EMULATORS === '1';
}

const clip = (v: unknown, n: number) => String(v ?? '').slice(0, n);

/** Report one error. Safe to call from anywhere; never throws. */
export function reportError(kind: ErrorKind, err: unknown, extra?: { component?: string }) {
  try {
    const message = clip(err instanceof Error ? `${err.name}: ${err.message}` : typeof err === 'string' ? err : JSON.stringify(err), 500) || '(sin mensaje)';
    if (NOISE.some((r) => r.test(message))) return;
    const stack = clip(err instanceof Error ? err.stack : '', 4000);
    const firstFrame = (stack.split('\n').find((l) => /at |@/.test(l)) || '').trim().slice(0, 160);
    const fingerprint = clip(`${kind}|${message.slice(0, 160)}|${firstFrame}`, 400);
    const n = (seen.get(fingerprint) || 0) + 1;
    seen.set(fingerprint, n);
    if (n > 1 || sent >= MAX_REPORTS || !enabled()) return;
    sent++;
    addDoc(collection(db, COLLECTION), {
      kind,
      message,
      stack,
      fingerprint,
      component: clip(extra?.component, 120),
      path: clip(window.location.pathname + window.location.search, 300),
      ua: clip(navigator.userAgent, 300),
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      online: navigator.onLine,
      sessionId,
      uid: auth.currentUser?.uid || null,
      build: clip((import.meta as any).env?.VITE_BUILD_ID || '', 40),
      at: serverTimestamp(),
    }).catch(() => { /* offline or blocked: nothing else to do */ });
  } catch { /* the monitor must never break the app */ }
}

export function installErrorMonitor() {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  window.addEventListener('error', (e) => {
    const msg = e.error instanceof Error ? e.error.message : e.message || '';
    if (CHUNK.test(msg)) { reportError('chunk', e.error || msg); return; }
    reportError('error', e.error || msg);
  });
  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    const msg = r instanceof Error ? r.message : String(r ?? '');
    if (CHUNK.test(msg)) { reportError('chunk', r); return; }
    reportError('promise', r);
  });
}
