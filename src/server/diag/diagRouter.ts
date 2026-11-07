import { Router } from 'express';
import { createHash, timingSafeEqual } from 'crypto';
import { TokenBucket } from '../security/rateLimit';
import { FIRESTORE_DOCS, fromFirestore } from '../companion/knowledge';
import { companionSnapshot } from '../companion/companionRouter';
import { radarSnapshot } from '../social/instagramRadar';
import { dbToken, listPosts, publisherSnapshot } from '../social/metaPublisher';

/**
 * Diagnóstico de solo lectura para Claude (GET /api/diag).
 *
 * - Llave: CLAUDE_DIAG_TOKEN (secreto del servidor, 32+ caracteres). Sin la
 *   variable, o con una llave equivocada, la ruta responde 404 como si no
 *   existiera.
 * - Solo GET, solo lectura: no hay ninguna ruta que escriba ni que dispare
 *   acciones. Quien encuentre la llave solo puede leer esto.
 * - Sin datos personales: nada de correos, uid, nombres ni contenido de chats.
 *   Errores de la app: mensaje, componente, ruta y navegador (recortados).
 */

const MIN_TOKEN = 32;
const bucket = new TokenBucket(10, 1 / 6); // 10 de golpe, luego 1 cada 6 s
const startedAt = Date.now();

function tokenOk(header: unknown): boolean {
  const want = process.env.CLAUDE_DIAG_TOKEN || '';
  if (want.length < MIN_TOKEN || typeof header !== 'string') return false;
  const got = header.replace(/^Bearer\s+/i, '').trim();
  const a = createHash('sha256').update(got).digest();
  const b = createHash('sha256').update(want).digest();
  return timingSafeEqual(a, b);
}

async function recentErrors(token: string, limit = 40) {
  const base = FIRESTORE_DOCS.replace(/\/documents$/, '/documents:runQuery');
  const r = await fetch(base, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'client_errors' }], orderBy: [{ field: { fieldPath: 'at' }, direction: 'DESCENDING' }], limit } }),
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new Error(`client_errors ${r.status}`);
  const rows: any[] = await r.json();
  return rows.filter((x) => x.document).map((x) => {
    const f = fromFirestore({ mapValue: { fields: x.document.fields || {} } }) as any;
    return {
      at: f.at, kind: f.kind, message: String(f.message || '').slice(0, 300), component: f.component || null,
      path: String(f.path || '').split('?')[0].slice(0, 120), ua: String(f.ua || '').slice(0, 120),
      viewport: f.viewport || null, build: f.build || null, stack: String(f.stack || '').split('\n').slice(0, 6).join('\n'),
    };
  });
}

export function createDiagRouter(): Router {
  const router = Router();
  router.all('*', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex');
    if (req.method !== 'GET' || !tokenOk(req.headers.authorization)) { res.status(404).end(); return; }
    if (!bucket.take()) { res.status(429).json({ error: 'SLOW_DOWN' }); return; }

    const out: Record<string, unknown> = {
      at: new Date().toISOString(),
      uptimeMin: Math.round((Date.now() - startedAt) / 60000),
      node: process.version,
      memoryMb: Math.round(process.memoryUsage().rss / 1048576),
      companion: companionSnapshot(),
      radar: radarSnapshot(),
      publisher: publisherSnapshot(),
    };
    const token = await dbToken().catch(() => null);
    if (!token) {
      out.database = 'sin acceso (configura SOCIAL_BOT_EMAIL/PASSWORD o la cuenta de servicio)';
    } else {
      out.database = 'ok';
      try { out.clientErrors = await recentErrors(token); } catch (e) { out.clientErrors = { error: String((e as Error).message) }; }
      try {
        out.socialPosts = (await listPosts(token)).map((p) => ({
          id: p.id, kind: p.kind, status: p.status, publishAt: p.publishAt, networks: p.networks,
          results: Object.fromEntries(Object.entries(p.results || {}).map(([n, r]) => [n, { ok: !!r?.id, permalink: r?.permalink || null, error: r?.error || null }])),
        }));
      } catch (e) { out.socialPosts = { error: String((e as Error).message) }; }
    }
    res.json(out);
  });
  return router;
}
