import type { Request, Response, NextFunction } from 'express';
import firebaseConfig from '../../../firebase-applet-config.json';

/**
 * Director/admin verification for the live engine.
 *
 * The browser sends its Firebase ID token; we check it against Google's
 * Identity Toolkit `accounts:lookup` endpoint (no firebase-admin needed) and
 * accept it as admin only when the account's email is in the allowlist AND the
 * email is verified (or the account signed in with Google).
 *
 * Tests: when NODE_ENV !== 'production', the literal value of
 * SGX_TEST_ADMIN_TOKEN is accepted as an admin token, and setAdminVerifier()
 * can replace the verifier entirely. Neither works in production.
 */

export interface AdminIdentity {
  uid: string;
  email: string;
}

export type AdminVerifier = (idToken: string) => Promise<AdminIdentity | null>;

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const LOOKUP_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:lookup';
const MAX_TOKEN_LENGTH = 4096;
const NEGATIVE_CACHE_MS = 60_000;
const MAX_CACHE_ENTRIES = 1000;

function adminAllowlist(): Set<string> {
  const raw = process.env.SGX_ADMIN_EMAILS || 'info@spatialgineers.com,support@spatialgineers.com';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
  );
}

function decodeJwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

const cache = new Map<string, { identity: AdminIdentity | null; expiresAt: number }>();

function cacheSet(token: string, identity: AdminIdentity | null, expiresAt: number) {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (v.expiresAt <= now) cache.delete(k);
    }
    // Still full: drop the oldest entries (Map preserves insertion order).
    while (cache.size >= MAX_CACHE_ENTRIES) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }
  cache.set(token, { identity, expiresAt });
}

async function identityToolkitVerifier(idToken: string): Promise<AdminIdentity | null> {
  const claims = decodeJwtPayload(idToken);
  if (!claims || typeof claims.exp !== 'number') return null;
  const expMs = claims.exp * 1000;
  if (expMs <= Date.now()) return null;
  // Cheap pre-filter: token must be minted for this Firebase project.
  if (firebaseConfig.projectId && claims.aud !== firebaseConfig.projectId) return null;

  const apiKey = process.env.FIREBASE_API_KEY || firebaseConfig.apiKey;
  const res = await fetch(`${LOOKUP_URL}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;
  const data: any = await res.json();
  const user = Array.isArray(data?.users) ? data.users[0] : null;
  if (!user || user.disabled) return null;

  const email = typeof user.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!email || !adminAllowlist().has(email)) return null;

  const viaGoogle = Array.isArray(user.providerUserInfo)
    && user.providerUserInfo.some((p: any) => p?.providerId === 'google.com');
  if (user.emailVerified !== true && !viaGoogle) return null;

  return { uid: String(user.localId || claims.sub || ''), email };
}

let verifierOverride: AdminVerifier | null = null;

/** Test hook: replace the token verifier. Ignored in production. */
export function setAdminVerifier(fn: AdminVerifier | null) {
  if (IS_PRODUCTION) return;
  verifierOverride = fn;
  cache.clear();
}

/** Returns the admin identity for a Firebase ID token, or null. Never throws. */
export async function verifyAdminToken(token: unknown): Promise<AdminIdentity | null> {
  if (typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

  if (!IS_PRODUCTION) {
    const testToken = process.env.SGX_TEST_ADMIN_TOKEN;
    if (testToken && token === testToken) return { uid: 'test_admin', email: 'test-admin@localhost' };
  }

  const now = Date.now();
  const hit = cache.get(token);
  if (hit && hit.expiresAt > now) return hit.identity;

  try {
    const identity = await (verifierOverride || identityToolkitVerifier)(token);
    const claims = decodeJwtPayload(token);
    const tokenExp = claims && typeof claims.exp === 'number' ? claims.exp * 1000 : now + NEGATIVE_CACHE_MS;
    cacheSet(token, identity, identity ? tokenExp : Math.min(tokenExp, now + NEGATIVE_CACHE_MS));
    return identity;
  } catch (err) {
    // Network/timeout: do not cache, so the next attempt retries.
    console.warn('[SGX Auth] token verification failed:', (err as Error)?.message || err);
    return null;
  }
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

/** Express middleware: 401 unless the request carries a verified admin token. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'AUTH_REQUIRED' });
    return;
  }
  const identity = await verifyAdminToken(token);
  if (!identity) {
    res.status(401).json({ error: 'NOT_AUTHORIZED' });
    return;
  }
  (res.locals as any).admin = identity;
  next();
}
