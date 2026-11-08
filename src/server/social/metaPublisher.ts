import { Router } from 'express';
import firebaseConfig from '../../../firebase-applet-config.json';
import { requireAdmin } from '../security/adminAuth';
import { FIRESTORE_DOCS, fromFirestore } from '../companion/knowledge';

/**
 * Publicador de redes · Instagram + Facebook (Meta Graph API).
 *
 * The team loads posts in Admin → Redes → Publicador (Firestore `social_posts`,
 * admin-only rules) and approves them, one by one or a whole week at once.
 * Every minute this loop picks the approved posts whose time has come and
 * publishes them to Instagram (Reel, image or carousel) and to the Facebook
 * Page, then writes the result back to the same doc.
 *
 * Firestore access (the collection is not public), first that works:
 *   1. SOCIAL_BOT_EMAIL + SOCIAL_BOT_PASSWORD: a Firebase email/password user
 *      listed in `admins/{uid}` (signs in through Identity Toolkit).
 *   2. The Cloud Run service account (metadata server token).
 *   3. The emulator (local tests).
 *
 * Meta env (server only): IG_GRAPH_TOKEN, IG_USER_ID (shared with the radar),
 * FB_PAGE_ID and optionally FB_PAGE_TOKEN (otherwise derived from the user
 * token). SOCIAL_PUBLISH_MOCK=1 fakes Meta outside production (tests).
 */

type Net = 'ig' | 'fb';
type Kind = 'REEL' | 'IMAGE' | 'CAROUSEL';

export interface SocialPost {
  id: string;
  kind: Kind;
  caption: string;
  mediaUrls: string[];
  publishAt: string;
  networks: Record<Net, boolean>;
  status: string;
  results: Partial<Record<Net, { id?: string; permalink?: string; error?: string; at?: string }>>;
}

const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v23.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const EMULATOR = FIRESTORE_DOCS.startsWith('http://');
const TICK_MS = Number(process.env.SOCIAL_TICK_MS) || 60_000;
const MAX_LATE_MS = 6 * 60 * 60 * 1000; // older than 6 h → not published, marked "missed"

const env = () => ({
  igToken: process.env.IG_GRAPH_TOKEN || '',
  igUser: process.env.IG_USER_ID || '',
  fbPage: process.env.FB_PAGE_ID || '',
  fbPageToken: process.env.FB_PAGE_TOKEN || '',
  botEmail: process.env.SOCIAL_BOT_EMAIL || '',
  botPassword: process.env.SOCIAL_BOT_PASSWORD || '',
  mock: process.env.SOCIAL_PUBLISH_MOCK === '1' && !IS_PRODUCTION,
});

const state = {
  lastTick: 0,
  lastError: null as string | null,
  dbAuth: 'none' as 'bot' | 'service' | 'emulator' | 'none' | 'denied',
  running: null as Promise<void> | null,
  published: 0,
};

/* ---------- Firestore auth + REST ---------- */

let tokenCache = { token: '', exp: 0 };
export async function dbToken(): Promise<string | null> {
  if (EMULATOR) { state.dbAuth = 'emulator'; return 'owner'; }
  if (tokenCache.token && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const e = env();
  if (e.botEmail && e.botPassword) {
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`, {
      // The web API key is usually restricted to the site's referrer: send it, as the browser would.
      method: 'POST', headers: { 'Content-Type': 'application/json', Referer: `${process.env.PUBLIC_SITE_URL || 'https://summit.spatialgineers.com'}/` },
      body: JSON.stringify({ email: e.botEmail, password: e.botPassword, returnSecureToken: true }),
      signal: AbortSignal.timeout(8000),
    }).catch(() => null);
    const b: any = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && b.idToken) {
      tokenCache = { token: b.idToken, exp: Date.now() + Number(b.expiresIn || 3600) * 1000 };
      state.dbAuth = 'bot';
      return tokenCache.token;
    }
    state.lastError = `El robot no pudo entrar: ${b?.error?.message || r?.status || 'sin red'} (revisa SOCIAL_BOT_EMAIL/PASSWORD y que Email/Password esté activo en Firebase Authentication)`;
    state.dbAuth = 'none';
    return null; // the bot is configured: don't fall back to the service account and hide this error
  }
  if (state.dbAuth === 'denied') return null; // the service account was refused: don't keep retrying it
  const m = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' }, signal: AbortSignal.timeout(3000),
  }).catch(() => null);
  if (m?.ok) {
    const b: any = await m.json().catch(() => ({}));
    if (b.access_token) {
      tokenCache = { token: b.access_token, exp: Date.now() + Number(b.expires_in || 3000) * 1000 };
      state.dbAuth = 'service';
      return tokenCache.token;
    }
  }
  state.dbAuth = 'none';
  return null;
}

function toFs(v: unknown): any {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toFs) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v as object).map(([k, x]) => [k, toFs(x)])) } };
}

export async function listPosts(token: string): Promise<SocialPost[]> {
  const out: SocialPost[] = [];
  let pageToken = '';
  for (let i = 0; i < 10; i++) {
    const qs = new URLSearchParams({ pageSize: '300', ...(pageToken ? { pageToken } : {}) });
    const r = await fetch(`${FIRESTORE_DOCS}/social_posts?${qs}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) { const t = await r.text().catch(() => ''); throw new Error(`firestore list ${r.status}${/PERMISSION_DENIED/.test(t) ? ' (sin permiso)' : ''}`); }
    const b: any = await r.json();
    for (const d of b.documents || []) {
      const f = fromFirestore({ mapValue: { fields: d.fields || {} } }) as any;
      out.push({
          id: String(d.name).split('/').pop() || '',
          kind: f.kind, caption: String(f.caption || ''),
          mediaUrls: Array.isArray(f.mediaUrls) ? f.mediaUrls.filter((u: unknown) => typeof u === 'string') : [],
          publishAt: String(f.publishAt || ''), networks: { ig: !!f.networks?.ig, fb: !!f.networks?.fb },
          status: String(f.status || 'draft'), results: f.results || {},
      });
    }
    if (!b.nextPageToken) break;
    pageToken = b.nextPageToken;
  }
  return out;
}

async function patchPost(token: string, id: string, data: Record<string, unknown>): Promise<boolean> {
  const qs = new URLSearchParams({ 'currentDocument.exists': 'true' });
  for (const k of Object.keys(data)) qs.append('updateMask.fieldPaths', k);
  const r = await fetch(`${FIRESTORE_DOCS}/social_posts/${encodeURIComponent(id)}?${qs}`, {
    method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toFs(v)])) }),
    signal: AbortSignal.timeout(8000),
  });
  return r.ok;
}

/* ---------- Meta Graph API ---------- */

async function graph(method: 'GET' | 'POST', path: string, params: Record<string, string>, token: string): Promise<any> {
  const body = new URLSearchParams({ ...params, access_token: token });
  const r = await fetch(method === 'GET' ? `${GRAPH}/${path}?${body}` : `${GRAPH}/${path}`, {
    method, ...(method === 'POST' ? { body } : {}), signal: AbortSignal.timeout(60_000),
  });
  const b: any = await r.json().catch(() => ({}));
  if (!r.ok || b.error) throw new Error(b?.error?.error_user_msg || b?.error?.message || `HTTP ${r.status}`);
  return b;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function igWaitReady(container: string, token: string) {
  for (let i = 0; i < 60; i++) { // up to ~10 min for video processing
    const s = await graph('GET', container, { fields: 'status_code,status' }, token);
    if (s.status_code === 'FINISHED') return;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram no pudo procesar el archivo (${s.status || s.status_code})`);
    await sleep(10_000);
  }
  throw new Error('Instagram tardó demasiado procesando el video');
}

async function publishInstagram(p: SocialPost) {
  const { igToken: t, igUser: u } = env();
  if (!t || !u) throw new Error('Falta IG_GRAPH_TOKEN o IG_USER_ID');
  let creation: string;
  if (p.kind === 'REEL') {
    creation = (await graph('POST', `${u}/media`, { media_type: 'REELS', video_url: p.mediaUrls[0], caption: p.caption, share_to_feed: 'true' }, t)).id;
    await igWaitReady(creation, t);
  } else if (p.kind === 'IMAGE') {
    creation = (await graph('POST', `${u}/media`, { image_url: p.mediaUrls[0], caption: p.caption }, t)).id;
    await igWaitReady(creation, t);
  } else {
    const children: string[] = [];
    for (const url of p.mediaUrls.slice(0, 10)) {
      const isVideo = /\.(mp4|mov)(\?|$)|\/video\//i.test(url);
      const c = (await graph('POST', `${u}/media`, isVideo ? { media_type: 'VIDEO', video_url: url, is_carousel_item: 'true' } : { image_url: url, is_carousel_item: 'true' }, t)).id;
      await igWaitReady(c, t);
      children.push(c);
    }
    creation = (await graph('POST', `${u}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption: p.caption }, t)).id;
    await igWaitReady(creation, t);
  }
  const id = (await graph('POST', `${u}/media_publish`, { creation_id: creation }, t)).id;
  const permalink = (await graph('GET', id, { fields: 'permalink' }, t).catch(() => ({}))).permalink || '';
  return { id, permalink };
}

let pageTokenCache = '';
async function fbToken(): Promise<string> {
  const e = env();
  if (e.fbPageToken) return e.fbPageToken;
  if (pageTokenCache) return pageTokenCache;
  if (!e.igToken || !e.fbPage) throw new Error('Falta FB_PAGE_ID (y el token de Meta)');
  pageTokenCache = (await graph('GET', e.fbPage, { fields: 'access_token' }, e.igToken)).access_token || '';
  if (!pageTokenCache) throw new Error('El token de Meta no da acceso a la página (falta pages_manage_posts)');
  return pageTokenCache;
}

async function publishFacebook(p: SocialPost) {
  const page = env().fbPage;
  if (!page) throw new Error('Falta FB_PAGE_ID');
  const t = await fbToken();
  let id: string;
  if (p.kind === 'REEL') {
    // Reels Publishing API (needs only pages_manage_posts): start → upload by URL → finish.
    const start = await graph('POST', `${page}/video_reels`, { upload_phase: 'start' }, t);
    const videoId = String(start.video_id || '');
    if (!videoId) throw new Error('Facebook no abrió la subida del reel');
    const up = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${videoId}`, {
      method: 'POST', headers: { Authorization: `OAuth ${t}`, file_url: p.mediaUrls[0] }, signal: AbortSignal.timeout(120_000),
    });
    const upBody: any = await up.json().catch(() => ({}));
    if (!up.ok || upBody?.error || upBody?.success === false) throw new Error(upBody?.error?.message || upBody?.debug_info?.message || `Subida del reel: HTTP ${up.status}`);
    await graph('POST', `${page}/video_reels`, { upload_phase: 'finish', video_id: videoId, video_state: 'PUBLISHED', description: p.caption }, t);
    id = videoId;
  } else if (p.kind === 'IMAGE') {
    id = (await graph('POST', `${page}/photos`, { url: p.mediaUrls[0], caption: p.caption }, t)).post_id;
  } else {
    const media: string[] = [];
    for (const url of p.mediaUrls.slice(0, 10)) {
      media.push((await graph('POST', `${page}/photos`, { url, published: 'false' }, t)).id);
    }
    const params: Record<string, string> = { message: p.caption };
    media.forEach((m, i) => { params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: m }); });
    id = (await graph('POST', `${page}/feed`, params, t)).id;
  }
  return { id, permalink: p.kind === 'REEL' ? `https://www.facebook.com/reel/${id}` : `https://www.facebook.com/${id}` };
}

/* ---------- the loop ---------- */

function validate(p: SocialPost): string | null {
  if (!['REEL', 'IMAGE', 'CAROUSEL'].includes(p.kind)) return 'Tipo inválido';
  if (!p.mediaUrls.length || !p.mediaUrls.every((u) => /^https:\/\//.test(u))) return 'Faltan los enlaces https de los archivos';
  if (p.kind === 'CAROUSEL' && p.mediaUrls.length < 2) return 'Un carrusel necesita 2 archivos o más';
  if (p.caption.length > 2200) return 'El caption pasa de 2200 caracteres';
  return null;
}

const inFlight = new Set<string>();

async function publishOne(token: string, post: SocialPost) {
  // Claim the post first. The service runs as one instance (docs/DEPLOY.md);
  // the in-memory set plus the "publishing" status keep a post from going out twice.
  if (inFlight.has(post.id)) return;
  inFlight.add(post.id);
  try {
    if (!(await patchPost(token, post.id, { status: 'publishing', claimedAt: new Date().toISOString() }))) return;
    await publishClaimed(token, post);
  } finally {
    inFlight.delete(post.id);
  }
}

async function publishClaimed(token: string, post: SocialPost) {
  const results = { ...post.results };
  const bad = validate(post);
  for (const net of ['ig', 'fb'] as Net[]) {
    if (!post.networks[net] || results[net]?.id) continue;
    try {
      if (bad) throw new Error(bad);
      const r = env().mock
        ? { id: `mock_${net}_${post.id}`, permalink: `https://example.com/${net}/${post.id}` }
        : await (net === 'ig' ? publishInstagram(post) : publishFacebook(post));
      results[net] = { ...r, at: new Date().toISOString() };
      state.published++;
    } catch (err) {
      results[net] = { error: String((err as Error)?.message || err).slice(0, 300), at: new Date().toISOString() };
    }
  }
  const wanted = (['ig', 'fb'] as Net[]).filter((n) => post.networks[n]);
  const ok = wanted.every((n) => results[n]?.id);
  await patchPost(token, post.id, { status: ok ? 'published' : 'failed', results });
}

async function tick() {
  state.lastTick = Date.now();
  const token = await dbToken();
  if (!token) return;
  try {
    const now = Date.now();
    for (const post of await listPosts(token)) {
      if (post.status !== 'approved') continue;
      const at = Date.parse(post.publishAt);
      if (!Number.isFinite(at) || at > now) continue;
      if (now - at > MAX_LATE_MS) {
        await patchPost(token, post.id, { status: 'missed' });
        continue;
      }
      await publishOne(token, post);
    }
    state.lastError = null;
  } catch (err) {
    state.lastError = String((err as Error)?.message || err);
    // Signed in but Firestore says no: the account has no access (e.g. the
    // Cloud Run service account belongs to another project). Use the bot user.
    if (/ 40[13]( \(sin permiso\))?$/.test(state.lastError)) {
      const wasBot = state.dbAuth === 'bot';
      state.dbAuth = wasBot ? 'none' : 'denied';
      state.lastError = wasBot
        ? 'La base de datos rechazó al robot (403): falta su doc en admins/{uid} o las reglas no están publicadas.'
        : 'La base de datos rechazó al servidor (403). Configura el usuario robot: SOCIAL_BOT_EMAIL y SOCIAL_BOT_PASSWORD (docs/PUBLICADOR_REDES.md, paso 3).';
      tokenCache = { token: '', exp: 0 };
    }
  }
}

function runSoon() {
  if (!state.running) state.running = tick().finally(() => { state.running = null; });
  return state.running;
}

/** Read-only state for the diagnostics endpoint. */
export function publisherSnapshot() {
  const e = env();
  return {
    mode: e.mock ? 'mock' : 'live', instagram: !!(e.igToken && e.igUser), facebook: !!(e.fbPage && (e.fbPageToken || e.igToken)),
    database: state.dbAuth, lastTick: state.lastTick ? new Date(state.lastTick).toISOString() : null,
    lastError: state.lastError, publishedSinceStart: state.published,
  };
}

let timer: NodeJS.Timeout | null = null;

export function createMetaPublisherRouter(): Router {
  const router = Router();
  if (!timer && process.env.SOCIAL_PUBLISHER !== 'off') {
    timer = setInterval(() => void runSoon(), TICK_MS);
    timer.unref?.();
    setTimeout(() => void runSoon(), 5_000).unref?.();
  }

  router.get('/status', requireAdmin, async (_req, res) => {
    const e = env();
    if (state.dbAuth === 'none') await dbToken().catch(() => null);
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      mode: e.mock ? 'mock' : 'live',
      instagram: e.mock || !!(e.igToken && e.igUser),
      facebook: e.mock || !!(e.fbPage && (e.fbPageToken || e.igToken)),
      database: state.dbAuth,
      lastTick: state.lastTick ? new Date(state.lastTick).toISOString() : null,
      lastError: state.lastError,
      publishedSinceStart: state.published,
    });
  });

  // "Revisar ahora": runs the loop at once (publishes whatever is due).
  router.post('/run', requireAdmin, async (_req, res) => {
    await runSoon();
    res.json({ ok: true, lastError: state.lastError });
  });

  // "Publicar ahora": the signed-in admin sends the post; the server publishes it to
  // Meta right away and returns the results (the panel saves them with the admin's
  // own session). No database access needed here, so no robot user.
  const nowBusy = new Set<string>();
  router.post('/publish-now', requireAdmin, async (req, res) => {
    const b = req.body || {};
    const post: SocialPost = {
      id: String(b.id || '').slice(0, 128), kind: b.kind, caption: String(b.caption || ''),
      mediaUrls: Array.isArray(b.mediaUrls) ? b.mediaUrls.filter((u: unknown) => typeof u === 'string').slice(0, 10) : [],
      publishAt: new Date().toISOString(),
      networks: { ig: !!b.networks?.ig, fb: !!b.networks?.fb },
      status: 'publishing', results: b.results && typeof b.results === 'object' ? b.results : {},
    };
    if (!/^[\w-]{1,128}$/.test(post.id)) { res.status(400).json({ error: 'BAD_ID' }); return; }
    const bad = validate(post);
    if (bad) { res.status(400).json({ error: bad }); return; }
    if (nowBusy.has(post.id)) { res.status(409).json({ error: 'Ya se está publicando' }); return; }
    nowBusy.add(post.id);
    try {
      const results: SocialPost['results'] = {};
      for (const net of ['ig', 'fb'] as Net[]) {
        if (!post.networks[net]) continue;
        const prev = (post.results as any)[net];
        if (prev?.id) { results[net] = prev; continue; } // already out on this network: never post twice
        try {
          const r = env().mock
            ? { id: `mock_${net}_${post.id}`, permalink: `https://example.com/${net}/${post.id}` }
            : await (net === 'ig' ? publishInstagram(post) : publishFacebook(post));
          results[net] = { ...r, at: new Date().toISOString() };
          state.published++;
        } catch (err) {
          results[net] = { error: String((err as Error)?.message || err).slice(0, 300), at: new Date().toISOString() };
        }
      }
      const ok = (['ig', 'fb'] as Net[]).filter((n) => post.networks[n]).every((n) => results[n]?.id);
      res.json({ status: ok ? 'published' : 'failed', results });
    } finally {
      nowBusy.delete(post.id);
    }
  });

  return router;
}
