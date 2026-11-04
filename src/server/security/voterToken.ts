import crypto from 'crypto';
import { isValidId } from './validation';

/**
 * Voter identity for the REST fallback (`POST /api/vote`, `POST /api/reaction`).
 *
 * The voter id is fixed when the WebSocket connects. The server signs it
 * (HMAC) and hands the token to that socket in INIT_STATE. When the socket
 * drops, the client sends the token with the REST call, and the server takes
 * the voter id from the token, never from the request body. A token can't be
 * forged without the server secret, so one browser can't vote as another id.
 *
 * The secret is SGX_VOTER_SECRET or, if unset, random per process. The live
 * state is in memory too (one Cloud Run instance), so a restart losing old
 * tokens costs nothing: the phone reconnects and gets a new one.
 */
const SECRET: Buffer = process.env.SGX_VOTER_SECRET
  ? Buffer.from(process.env.SGX_VOTER_SECRET)
  : crypto.randomBytes(32);

function mac(userId: string): string {
  return crypto.createHmac('sha256', SECRET).update(`voter:${userId}`).digest('base64url').slice(0, 32);
}

export function signVoterToken(userId: string): string {
  return `${userId}.${mac(userId)}`;
}

/** The voter id inside a valid token, or null. */
export function verifyVoterToken(token: unknown): string | null {
  if (typeof token !== 'string' || token.length > 200) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const userId = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!isValidId(userId)) return null;
  const want = mac(userId);
  if (sig.length !== want.length) return null;
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want)) ? userId : null;
}

/** Reads the token from the `X-SGX-Voter` header (preferred) or `voterToken` in the body. */
export function voterIdFromRequest(req: { headers: Record<string, unknown>; body?: any }): string | null {
  const h = req.headers['x-sgx-voter'];
  const fromHeader = Array.isArray(h) ? h[0] : h;
  return verifyVoterToken(fromHeader ?? req.body?.voterToken);
}
