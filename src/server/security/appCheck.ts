import crypto from 'crypto';
import firebaseConfig from '../../../firebase-applet-config.json';

/**
 * Firebase App Check for the live engine (SGX Live votes and reactions).
 *
 * Firestore (chat, poll votes, sponsor form) is protected by App Check in the
 * Firebase console. The WebSocket is ours, so the socket sends its App Check
 * token and we verify it here: RS256 against Google's public keys, issuer and
 * audience of this project, not expired. No firebase-admin needed.
 *
 * Mode (env SGX_APPCHECK):
 *   off      no checks
 *   monitor  (default) verify and count, never block
 *   enforce  votes and reactions need a verified token
 */

export type AppCheckMode = 'off' | 'monitor' | 'enforce';

const GOOGLE_JWKS_URL = 'https://firebaseappcheck.googleapis.com/v1/jwks';
// Tests can point at a local key set; production always uses Google's.
const JWKS_URL = process.env.NODE_ENV !== 'production' && process.env.SGX_APPCHECK_JWKS_URL ? process.env.SGX_APPCHECK_JWKS_URL : GOOGLE_JWKS_URL;
const JWKS_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_TOKEN_LENGTH = 4096;
const PROJECT_NUMBER = String((firebaseConfig as { messagingSenderId?: string }).messagingSenderId || '');
const PROJECT_ID = String(firebaseConfig.projectId || '');

export function appCheckMode(): AppCheckMode {
  const m = (process.env.SGX_APPCHECK || '').toLowerCase();
  return m === 'off' || m === 'enforce' ? m : 'monitor';
}

let jwks: { keys: Map<string, crypto.KeyObject>; fetchedAt: number } | null = null;
let jwksPending: Promise<void> | null = null;

async function loadJwks(force = false): Promise<void> {
  if (!force && jwks && Date.now() - jwks.fetchedAt < JWKS_TTL_MS) return;
  if (jwksPending) return jwksPending;
  jwksPending = (async () => {
    try {
      const res = await fetch(JWKS_URL, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`jwks ${res.status}`);
      const data: any = await res.json();
      const keys = new Map<string, crypto.KeyObject>();
      for (const k of Array.isArray(data?.keys) ? data.keys : []) {
        if (k?.kid && k?.kty === 'RSA') keys.set(k.kid, crypto.createPublicKey({ key: k, format: 'jwk' }));
      }
      jwks = { keys, fetchedAt: Date.now() };
    } finally {
      jwksPending = null;
    }
  })();
  return jwksPending;
}

type Verifier = (token: string) => Promise<boolean>;

async function jwtVerifier(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  let header: any; let claims: any;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch { return false; }
  if (header?.alg !== 'RS256' || header?.typ !== 'JWT' || typeof header?.kid !== 'string') return false;

  await loadJwks();
  let key = jwks?.keys.get(header.kid);
  if (!key) { await loadJwks(true); key = jwks?.keys.get(header.kid); }
  if (!key) return false;

  const ok = crypto.verify('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), key, Buffer.from(parts[2], 'base64url'));
  if (!ok) return false;

  if (typeof claims?.exp !== 'number' || claims.exp * 1000 <= Date.now()) return false;
  if (claims.iss !== `https://firebaseappcheck.googleapis.com/${PROJECT_NUMBER}`) return false;
  const aud: string[] = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return aud.includes(`projects/${PROJECT_NUMBER}`) || aud.includes(`projects/${PROJECT_ID}`);
}

let override: Verifier | null = null;

/** Test hook: replace the verifier. Ignored in production. */
export function setAppCheckVerifier(fn: Verifier | null) {
  if (process.env.NODE_ENV === 'production') return;
  override = fn;
}

const stats = { verified: 0, rejected: 0, missing: 0 };
export function appCheckStats() { return { mode: appCheckMode(), ...stats }; }
export function noteMissingAppCheck() { stats.missing++; }

/** True when the token is a valid App Check token for this project. Never throws. */
export async function verifyAppCheckToken(token: unknown): Promise<boolean> {
  if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) { stats.rejected++; return false; }
  try {
    const ok = await (override || jwtVerifier)(token);
    ok ? stats.verified++ : stats.rejected++;
    return ok;
  } catch (err) {
    console.warn('[SGX AppCheck] verification error:', (err as Error)?.message || err);
    stats.rejected++;
    return false;
  }
}

/** Express middleware for the audience HTTP endpoints (X-Firebase-AppCheck header). */
export async function appCheckGuard(req: { headers: Record<string, unknown> }, res: { status: (n: number) => { json: (b: unknown) => void } }, next: () => void) {
  const mode = appCheckMode();
  if (mode === 'off') return next();
  const token = req.headers['x-firebase-appcheck'];
  if (!token) noteMissingAppCheck();
  const ok = token ? await verifyAppCheckToken(token) : false;
  if (!ok && mode === 'enforce') { res.status(401).json({ error: 'APP_CHECK_REQUIRED' }); return; }
  next();
}
