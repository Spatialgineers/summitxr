import { Router } from 'express';
import { requireAdmin } from '../security/adminAuth';
import { FIRESTORE_DOCS, fromFirestore } from '../companion/knowledge';

/**
 * Radar social · Instagram.
 *
 * Finds Instagram posts with the Summit hashtags (and posts that tag the
 * @spatialgineers business account) through the Instagram Graph API, keeps
 * them in memory, and lets the team moderate them: the approved / hidden ids
 * live in Firestore `site_config/social` ({ approvedIg, hiddenIg }), written by
 * the admin panel (client SDK, admin rules). The server only reads that doc.
 *
 * Server-only env: IG_GRAPH_TOKEN, IG_USER_ID, IG_HASHTAGS (default
 * "SpatialgineersSummit,RoadToSummit"), IG_GRAPH_VERSION (pinned default).
 * Without token + user id the feature reports `disabled`. IG_RADAR_MOCK=1
 * serves fixture candidates outside production (tests; never calls Instagram).
 */

export interface IgPost {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  username: string | null;
  source: string; // "#hashtag" or "tag"
}

type Status = 'disabled' | 'mock' | 'ok' | 'error' | 'syncing';

const GRAPH_VERSION = process.env.IG_GRAPH_VERSION || 'v23.0';
const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const SYNC_MS = 15 * 60 * 1000;
const ON_DEMAND_MIN_MS = 2 * 60 * 1000;
const CONFIG_TTL_MS = Number(process.env.IG_CONFIG_TTL_MS) || 5 * 60_000; // 1 Firestore read per refresh: keep it rare
const MAX_POSTS = 200;
const HASHTAG_FIELDS = 'id,caption,media_type,media_url,permalink,timestamp';
const TAG_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,username';

const env = () => ({
  token: process.env.IG_GRAPH_TOKEN || '',
  userId: process.env.IG_USER_ID || '',
  hashtags: (process.env.IG_HASHTAGS || 'SpatialgineersSummit,RoadToSummit')
    .split(',').map((h) => h.trim().replace(/^#/, '')).filter((h) => /^[\p{L}\p{N}_]{1,100}$/u.test(h)).slice(0, 10),
  mock: process.env.IG_RADAR_MOCK === '1' && process.env.NODE_ENV !== 'production',
});

const state = {
  posts: new Map<string, IgPost>(),
  status: 'disabled' as Status,
  lastSync: 0,
  lastError: null as string | null,
  backoffUntil: 0,
  failures: 0,
  syncing: null as Promise<void> | null,
};

// Hashtag ids never change; caching them keeps us well under the
// 30-unique-hashtags-per-7-days limit of ig_hashtag_search.
const hashtagIds = new Map<string, string>();

const MOCK: IgPost[] = [1, 2, 3, 4].map((n) => ({
  id: `mock_ig_${n}`,
  caption: `Post de prueba ${n} rumbo al #SpatialgineersSummit`,
  mediaType: n === 3 ? 'VIDEO' : 'IMAGE',
  mediaUrl: `/favicon-64.png?ig=${n}`,
  thumbnailUrl: `/favicon-64.png?ig=${n}`,
  permalink: `https://www.instagram.com/p/MOCK${n}/`,
  timestamp: new Date(Date.UTC(2026, 10, n)).toISOString(),
  username: n % 2 ? `creador_${n}` : null,
  source: n === 4 ? 'tag' : '#SpatialgineersSummit',
}));

async function graph(path: string, params: Record<string, string>): Promise<any> {
  const qs = new URLSearchParams({ ...params, access_token: env().token });
  const r = await fetch(`${GRAPH}/${path}?${qs}`, { signal: AbortSignal.timeout(10_000) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok || body?.error) {
    const e = body?.error || {};
    // Never echo the token: only code + message.
    throw new Error(`Graph ${r.status} ${e.code ?? ''}${e.error_subcode ? '/' + e.error_subcode : ''}: ${String(e.message || 'error').slice(0, 160)}`);
  }
  return body;
}

function toPost(m: any, source: string): IgPost | null {
  if (!m || typeof m.id !== 'string' || typeof m.permalink !== 'string') return null;
  if (!/^https:\/\/(www\.)?instagram\.com\//.test(m.permalink)) return null;
  return {
    id: m.id,
    caption: typeof m.caption === 'string' ? m.caption.slice(0, 2200) : '',
    mediaType: typeof m.media_type === 'string' ? m.media_type : 'IMAGE',
    mediaUrl: typeof m.media_url === 'string' ? m.media_url : null,
    thumbnailUrl: typeof m.thumbnail_url === 'string' ? m.thumbnail_url : null,
    permalink: m.permalink,
    timestamp: typeof m.timestamp === 'string' ? m.timestamp : '',
    username: typeof m.username === 'string' ? m.username : null, // absent for hashtag media
    source,
  };
}

async function fetchAll(): Promise<IgPost[]> {
  const { userId, hashtags } = env();
  const out: IgPost[] = [];
  for (const tag of hashtags) {
    let hid = hashtagIds.get(tag);
    if (!hid) {
      const s = await graph('ig_hashtag_search', { user_id: userId, q: tag });
      hid = s?.data?.[0]?.id;
      if (!hid) continue;
      hashtagIds.set(tag, hid);
    }
    for (const edge of ['recent_media', 'top_media']) {
      const r = await graph(`${hid}/${edge}`, { user_id: userId, fields: HASHTAG_FIELDS, limit: '50' });
      for (const m of r?.data || []) { const p = toPost(m, `#${tag}`); if (p) out.push(p); }
    }
  }
  const t = await graph(`${userId}/tags`, { fields: TAG_FIELDS, limit: '50' });
  for (const m of t?.data || []) { const p = toPost(m, 'tag'); if (p) out.push(p); }
  return out;
}

async function sync(): Promise<void> {
  const e = env();
  if (e.mock) {
    for (const p of MOCK) state.posts.set(p.id, p);
    state.status = 'mock'; state.lastSync = Date.now(); state.lastError = null;
    return;
  }
  if (!e.token || !e.userId) { state.status = 'disabled'; return; }
  if (Date.now() < state.backoffUntil) return;
  state.status = state.lastSync ? state.status : 'syncing';
  try {
    const fresh = await fetchAll();
    // Media URLs expire: replace the whole set every cycle (no long-term storage).
    const next = new Map<string, IgPost>();
    for (const p of fresh.sort((a, b) => b.timestamp.localeCompare(a.timestamp))) {
      if (next.size >= MAX_POSTS) break;
      if (!next.has(p.id)) next.set(p.id, p);
    }
    // Approved posts that dropped out of the 24 h hashtag window: keep the
    // permalink / caption, but drop the (expiring) media URLs.
    const cfg = await moderation();
    for (const id of cfg.approved) {
      const old = state.posts.get(id);
      if (old && !next.has(id)) next.set(id, { ...old, mediaUrl: null, thumbnailUrl: null });
    }
    state.posts = next;
    state.status = 'ok'; state.lastSync = Date.now(); state.lastError = null; state.failures = 0;
  } catch (err) {
    state.failures += 1;
    // Exponential back-off: 1, 2, 4 … up to 60 min.
    state.backoffUntil = Date.now() + Math.min(60, 2 ** (state.failures - 1)) * 60_000;
    state.status = 'error';
    state.lastError = (err as Error)?.message || String(err);
    console.warn('[IG Radar] sync failed:', state.lastError);
  }
}

function syncSoon(force = false) {
  if (state.syncing) return state.syncing;
  if (!force && Date.now() - state.lastSync < ON_DEMAND_MIN_MS) return Promise.resolve();
  state.syncing = sync().finally(() => { state.syncing = null; });
  return state.syncing;
}

/* site_config/social, read through the public REST endpoint, cached. */
let cfgCache = { approved: [] as string[], hidden: [] as string[], at: 0 };
async function moderation() {
  if (Date.now() - cfgCache.at < CONFIG_TTL_MS) return cfgCache;
  try {
    const r = await fetch(`${FIRESTORE_DOCS}/site_config/social`, { signal: AbortSignal.timeout(6000) });
    if (r.ok) {
      const f = (await r.json())?.fields || {};
      const list = (v: any) => (Array.isArray(fromFirestore(v)) ? fromFirestore(v).filter((x: unknown) => typeof x === 'string') : []);
      cfgCache = { approved: list(f.approvedIg), hidden: list(f.hiddenIg), at: Date.now() };
    } else if (r.status === 404) {
      cfgCache = { approved: [], hidden: [], at: Date.now() };
    }
  } catch { /* keep the last list */ }
  return cfgCache;
}

const publicPost = (p: IgPost) => ({
  id: p.id,
  permalink: p.permalink,
  mediaType: p.mediaType,
  imageUrl: p.mediaType === 'VIDEO' ? p.thumbnailUrl : (p.mediaUrl || p.thumbnailUrl),
  caption: p.caption.length > 280 ? p.caption.slice(0, 277) + '…' : p.caption,
  timestamp: p.timestamp,
  username: p.username,
});

/** Read-only state for the diagnostics endpoint (counts only, no posts). */
export function radarSnapshot() {
  return { status: state.status, lastSync: state.lastSync ? new Date(state.lastSync).toISOString() : null, lastError: state.lastError, candidates: state.posts.size, failures: state.failures };
}

let timer: NodeJS.Timeout | null = null;

export function createInstagramRadarRouter(): Router {
  const router = Router();
  if (!timer) {
    void syncSoon(true);
    timer = setInterval(() => void syncSoon(true), SYNC_MS);
    timer.unref?.();
  }

  router.get('/candidates', requireAdmin, async (_req, res) => {
    await syncSoon();
    const cfg = await moderation();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      status: state.status,
      lastSync: state.lastSync ? new Date(state.lastSync).toISOString() : null,
      error: state.lastError,
      hashtags: env().hashtags,
      approved: cfg.approved,
      hidden: cfg.hidden,
      candidates: [...state.posts.values()].map((p) => ({ ...p, caption: p.caption.slice(0, 600) })),
    });
  });

  let pub: { at: number; body: unknown } = { at: 0, body: null };
  const PUBLIC_TTL_MS = Math.min(CONFIG_TTL_MS, 60_000);
  router.get('/approved', async (_req, res) => {
    if (!pub.body || Date.now() - pub.at > PUBLIC_TTL_MS) {
      void syncSoon();
      const cfg = await moderation();
      const hidden = new Set(cfg.hidden);
      const posts = cfg.approved.filter((id) => !hidden.has(id)).map((id) => state.posts.get(id)).filter(Boolean).map((p) => publicPost(p as IgPost));
      pub = { at: Date.now(), body: { status: state.status === 'disabled' ? 'disabled' : 'ok', posts } };
    }
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.json(pub.body);
  });

  return router;
}
