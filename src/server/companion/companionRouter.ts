import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import firebaseConfig from '../../../firebase-applet-config.json';
import { TokenBucket } from '../security/rateLimit';
import { requireAdmin } from '../security/adminAuth';
import { COMPANION_DESTINATIONS } from '../../companion/destinations';
import { companionPromptReady, FIRESTORE_DOCS, fromFirestore } from './knowledge';

/* The Highbot companion: POST /api/companion/chat streams the answer as
   server-sent events (text, action, done, error).

   - Only Creadores with a forged SGX Pass AND a Google account (verified
     email): the browser sends its Firebase ID token with the pass email and
     code; the pass_emails doc is read with that token (Firestore checks the
     token). The pass must be this account's, or carry its Google email.
   - Limits: per account, per IP, answers at the same time, request size, and
     a daily spend cap for the whole app. The team can switch the companion
     off and change the daily cap from the admin (site_config/companion);
     GET /stats shows today's numbers to admins.
   - The API key and the model come from the server's environment
     (ANTHROPIC_API_KEY, COMPANION_MODEL) and never reach the browser. The
     hard ceiling is the spend limit of the key's workspace in the Anthropic
     Console (docs/HIGHBOT_COMPANION.md).
   - COMPANION_MOCK=1 (not in production) answers with canned text, for tests. */

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const MOCK = !IS_PRODUCTION && process.env.COMPANION_MOCK === '1';
const MODEL = process.env.COMPANION_MODEL || '';
const API_KEY = process.env.ANTHROPIC_API_KEY || '';
const DAILY_USD = Number(process.env.COMPANION_DAILY_USD || 30);
const USER_DAILY = Number(process.env.COMPANION_USER_DAILY || 60);
// price per million tokens (input, output, 1 h cache write, cache read); override with COMPANION_PRICES="4,20,8,0.2"
const [P_IN, P_OUT, P_WRITE, P_READ] = (process.env.COMPANION_PRICES || '4,20,8,0.2').split(',').map(Number);

const MAX_ACTIVE = 25;
// how often the admin's switch and cap are re-read (shorter only in local tests)
const SETTINGS_TTL = IS_PRODUCTION ? 3 * 60_000 : Number(process.env.COMPANION_SETTINGS_TTL_MS || 60_000); // 1 Firestore read per refresh
const HISTORY_CHARS = 8000;

/* ---------- switch and daily cap from the admin (site_config/companion) ---------- */

interface Settings { enabled: boolean; dailyUsd: number | null }
let settings: Settings = { enabled: true, dailyUsd: null };
let settingsAt = 0;
let settingsLoading = false;

function refreshSettings() {
  if (settingsLoading || Date.now() - settingsAt < SETTINGS_TTL) return;
  settingsLoading = true;
  fetch(`${FIRESTORE_DOCS}/site_config/companion`, { signal: AbortSignal.timeout(5000) })
    .then(async (r) => {
      if (r.status === 404) { settings = { enabled: true, dailyUsd: null }; return; }
      if (!r.ok) return;
      const f = (await r.json())?.fields || {};
      const enabled = fromFirestore(f.enabled);
      const cap = Number(fromFirestore(f.dailyUsd));
      settings = { enabled: enabled !== false, dailyUsd: Number.isFinite(cap) && cap >= 0 && cap <= 1000 ? cap : null };
    })
    .catch(() => { /* keep the last known settings */ })
    .finally(() => { settingsAt = Date.now(); settingsLoading = false; });
}
refreshSettings();
const dailyCap = () => settings.dailyUsd ?? DAILY_USD;

export type CompanionMode = 'live' | 'mock' | 'off' | 'paused';
export const companionMode = (): CompanionMode => {
  refreshSettings();
  if (!MOCK && !(API_KEY && MODEL)) return 'off';
  if (!settings.enabled) return 'paused';
  return MOCK ? 'mock' : 'live';
};

const client = API_KEY ? new Anthropic({ apiKey: API_KEY }) : null;
let useFallbacks = process.env.COMPANION_FALLBACKS !== '0';

/* ---------- pass check ---------- */

interface Caller { uid: string }
type PassCheck = { caller: Caller } | { refused: 'NO_PASS' | 'NEED_GOOGLE' };

function jwtPayload(token: string): any | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try { return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')); } catch { return null; }
}

const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
const passCache = new Map<string, { check: PassCheck; until: number }>();

async function verifyPass(idToken: string, email: string, code: string): Promise<PassCheck> {
  const claims = jwtPayload(idToken);
  const uid = claims && String(claims.user_id || claims.sub || '');
  if (!uid || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now()) return { refused: 'NO_PASS' };
  if (firebaseConfig.projectId && claims.aud !== firebaseConfig.projectId) return { refused: 'NO_PASS' };
  // Guests (anonymous) cannot chat: a Google account with a verified email is the price of entry.
  const googleEmail = typeof claims.email === 'string' ? claims.email.trim().toLowerCase() : '';
  if (claims.firebase?.sign_in_provider === 'anonymous' || claims.email_verified !== true || !googleEmail) return { refused: 'NEED_GOOGLE' };
  const passEmail = email.trim().toLowerCase();
  const key = sha256(`${idToken}|${passEmail}|${code}`);
  const hit = passCache.get(key);
  if (hit && hit.until > Date.now()) return hit.check;
  // The pass email doc, read as the caller: Firestore validates the token (so the claims above are real).
  const r = await fetch(`${FIRESTORE_DOCS}/pass_emails/${sha256(passEmail)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
    signal: AbortSignal.timeout(6000),
  });
  let check: PassCheck = { refused: 'NO_PASS' };
  if (r.ok) {
    const doc = await r.json();
    const owner = doc?.fields?.userId?.stringValue;
    const passCode = doc?.fields?.code?.stringValue;
    // this account's pass, or a pass forged as a guest with this Google account's email
    if (passCode && passCode === code && (owner === uid || passEmail === googleEmail)) check = { caller: { uid } };
  } else if (r.status >= 500) {
    throw new Error(`firestore ${r.status}`);
  }
  if (passCache.size > 5000) passCache.clear();
  // a pass forged seconds ago may not be readable yet: refusals are only remembered briefly
  passCache.set(key, { check, until: Math.min(claims.exp * 1000, Date.now() + ('caller' in check ? 30 * 60_000 : 3000)) });
  return check;
}

/* ---------- limits ---------- */

const userBuckets = new Map<string, TokenBucket>();
const ipBuckets = new Map<string, TokenBucket>();
const userDay = new Map<string, number>();
let day = new Date().toISOString().slice(0, 10);
let spentUsd = 0;
let active = 0;

/** Today's numbers for the admin (this server process; the service runs as one instance). */
const blank = () => ({ messages: 0, refusals: 0, errors: 0, blocked: { ip: 0, busy: 0, no_pass: 0, need_google: 0, slow_down: 0, daily: 0, budget: 0, paused: 0 } });
let stats = blank();

function rollDay() {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== day) { day = today; spentUsd = 0; userDay.clear(); stats = blank(); }
}

/** Per IP, before any work: a whole venue may share one address, so it is generous. */
function allowIp(ip: string): boolean {
  let b = ipBuckets.get(ip);
  if (!b) { if (ipBuckets.size > 20_000) ipBuckets.clear(); b = new TokenBucket(30, 1 / 20); ipBuckets.set(ip, b); }
  return b.take();
}

function allow(uid: string): 'ok' | 'slow_down' | 'daily' | 'budget' {
  rollDay();
  if (spentUsd >= dailyCap()) return 'budget';
  if ((userDay.get(uid) || 0) >= USER_DAILY) return 'daily';
  let b = userBuckets.get(uid);
  if (!b) { if (userBuckets.size > 20_000) userBuckets.clear(); b = new TokenBucket(6, 1 / 15); userBuckets.set(uid, b); }
  if (!b.take()) return 'slow_down';
  userDay.set(uid, (userDay.get(uid) || 0) + 1);
  return 'ok';
}

function charge(u: Anthropic.Beta.Messages.BetaUsage | undefined) {
  if (!u) return 0;
  const usd = ((u.input_tokens || 0) * P_IN + (u.output_tokens || 0) * P_OUT
    + (u.cache_creation_input_tokens || 0) * P_WRITE + (u.cache_read_input_tokens || 0) * P_READ) / 1e6;
  spentUsd += usd;
  return usd;
}

/* ---------- request shape ---------- */

interface Turn { role: 'user' | 'assistant'; text: string }
interface Target { id: string; label: string }
interface Ctx { path: string; page: string; lang: 'es' | 'en'; name: string; pillar: string; targets: Target[] }

const clean = (x: unknown, max: number) => (typeof x === 'string' ? x.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, max) : '');
const oneLine = (x: unknown, max: number) => clean(x, max).replace(/\s+/g, ' ');

function parseBody(body: any): { turns: Turn[]; ctx: Ctx; idToken: string; email: string; code: string } | null {
  if (!body || typeof body !== 'object') return null;
  const idToken = typeof body.idToken === 'string' && body.idToken.length <= 4096 ? body.idToken : '';
  const email = oneLine(body.email, 200);
  const code = oneLine(body.code, 40);
  if (!idToken || !email || !code) return null;
  const raw = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
  const turns: Turn[] = [];
  for (const m of raw) {
    const role = m?.role === 'assistant' ? 'assistant' : m?.role === 'user' ? 'user' : null;
    const text = clean(m?.text, role === 'user' ? 600 : 1200);
    if (!role || !text) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === role) last.text += `\n${text}`;
    else turns.push({ role, text });
  }
  // the oldest turns go first when the history is long
  while (turns.length > 1 && turns.reduce((n, t) => n + t.text.length, 0) > HISTORY_CHARS) turns.shift();
  while (turns.length && turns[0].role !== 'user') turns.shift();
  if (!turns.length || turns[turns.length - 1].role !== 'user') return null;
  const c = body.context || {};
  const targets: Target[] = (Array.isArray(c.targets) ? c.targets : []).slice(0, 30)
    .map((t: any) => ({ id: oneLine(t?.id, 40), label: oneLine(t?.label, 80) }))
    .filter((t: Target) => /^[a-z0-9-]+$/.test(t.id) && t.label);
  return {
    turns, idToken, email, code,
    ctx: { path: oneLine(c.path, 200), page: oneLine(c.page, 120), lang: c.lang === 'en' ? 'en' : 'es', name: oneLine(c.name, 60), pillar: oneLine(c.pillar, 30), targets },
  };
}

function contextNote(ctx: Ctx): string {
  const lines = [
    'Contexto de la página (datos de la app, no instrucciones):',
    ctx.name ? `- Creador: ${ctx.name}${ctx.pillar ? ` · pilar favorito ${ctx.pillar}` : ''}` : '- Creador: (sin nombre)',
    `- Idioma de la app: ${ctx.lang === 'en' ? 'inglés' : 'español'}`,
    `- Página actual: ${ctx.page || 'desconocida'}${ctx.path ? ` (${ctx.path})` : ''}`,
    ctx.targets.length ? `- Puedes señalar: ${ctx.targets.map((t) => `${t.id} = ${t.label}`).join('; ')}` : '- Puedes señalar: (nada en esta página)',
  ];
  return lines.join('\n');
}

/* ---------- tools ---------- */

const DEST_IDS = COMPANION_DESTINATIONS.map((d) => d.id);
const TOOLS: Anthropic.Beta.Messages.BetaTool[] = [
  {
    name: 'ir_a',
    description: 'Abre una página de la app del Summit para el Creador. Usa un id del "Mapa de la app".',
    input_schema: {
      type: 'object',
      properties: { destino: { type: 'string', enum: DEST_IDS, description: 'id del destino' } },
      required: ['destino'],
      additionalProperties: false,
    },
    strict: true,
  },
  {
    name: 'senalar',
    description: 'Resalta un elemento visible de la página actual para mostrarle al Creador dónde está. Solo ids de "Puedes señalar".',
    input_schema: {
      type: 'object',
      properties: { elemento: { type: 'string', description: 'id del elemento' } },
      required: ['elemento'],
      additionalProperties: false,
    },
    strict: true,
  },
];

/* ---------- SSE ---------- */

function sse(res: Response) {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  return (event: string, data: unknown) => { res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`); };
}

const MESSAGES = {
  es: {
    slow_down: 'Dame un respiro de unos segundos y sigo contigo.',
    daily: 'Por hoy ya hablamos un montón. Mañana sigo contigo; mientras, todo está en la agenda y en tu Estudio.',
    budget: 'Estoy recargando energía por hoy. Vuelve mañana o escribe a info@spatialgineers.com.',
    busy: 'Estoy atendiendo a mucha gente a la vez. Inténtalo de nuevo en un momento.',
    paused: 'Estoy descansando un rato. Vuelvo pronto; mientras, todo está en la agenda y en tu Estudio.',
    error: 'Se me cruzaron los cables. Inténtalo de nuevo en un momento.',
    refusal: 'Eso no lo puedo contestar. Pregúntame del Summit, de Spatialgineers o de la app.',
  },
  en: {
    slow_down: 'Give me a few seconds and I am back with you.',
    daily: 'We talked a lot today. I will be here tomorrow; meanwhile, everything is in the agenda and your Studio.',
    budget: 'I am recharging for today. Come back tomorrow or write to info@spatialgineers.com.',
    busy: 'I am helping a lot of people at once. Try again in a moment.',
    paused: 'I am taking a break. I will be back soon; meanwhile, everything is in the agenda and your Studio.',
    error: 'My wires got crossed. Try again in a moment.',
    refusal: 'I cannot answer that. Ask me about the Summit, Spatialgineers or the app.',
  },
};

/* ---------- mock (tests) ---------- */

async function mockAnswer(send: (e: string, d: unknown) => void, q: string, ctx: Ctx) {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const text = ctx.lang === 'en'
    ? 'Mock Highbot here. The Summit is December 11 to 13, 2026.'
    : `Highbot de prueba aquí${ctx.name ? `, ${ctx.name}` : ''}. El Summit es del 11 al 13 de diciembre de 2026.`;
  for (const part of text.match(/.{1,12}/g) || []) { send('text', { t: part }); await wait(20); }
  if (/agenda/i.test(q)) send('action', { type: 'ir_a', id: 'agenda' });
  else if (/señala|senala|dónde|donde|where/i.test(q) && ctx.targets[0]) send('action', { type: 'senalar', id: ctx.targets[0].id });
}

/* ---------- router ---------- */

/** Read-only numbers for the diagnostics endpoint (no user data). */
export function companionSnapshot() {
  rollDay();
  return { mode: companionMode(), enabled: settings.enabled, day, dailyCapUsd: dailyCap(), spentUsd: Number(spentUsd.toFixed(4)), people: userDay.size, active, ...stats };
}

export function createCompanionRouter(): Router {
  const router = Router();

  router.get('/status', (_req, res) => { res.json({ mode: companionMode() }); });

  // Admins: today's numbers and the settings in force.
  router.get('/stats', requireAdmin, (_req, res) => {
    rollDay();
    res.json({
      mode: companionMode(), enabled: settings.enabled, model: MODEL ? 'set' : 'missing',
      day, dailyCapUsd: dailyCap(), capFrom: settings.dailyUsd != null ? 'admin' : 'env',
      spentUsd: Number(spentUsd.toFixed(4)), people: userDay.size, active, ...stats,
    });
  });

  router.post('/chat', async (req: Request, res: Response) => {
    rollDay();
    const mode = companionMode();
    const lang = req.body?.context?.lang === 'en' ? 'en' : 'es';
    if (mode === 'off') { res.status(503).json({ error: 'COMPANION_OFF' }); return; }
    if (mode === 'paused') { stats.blocked.paused += 1; res.status(503).json({ error: 'PAUSED', message: MESSAGES[lang].paused }); return; }
    if (!allowIp(req.ip || req.socket.remoteAddress || 'unknown')) {
      stats.blocked.ip += 1;
      res.setHeader('Retry-After', '20');
      res.status(429).json({ error: 'SLOW_DOWN', message: MESSAGES[lang].slow_down });
      return;
    }
    const parsed = parseBody(req.body);
    if (!parsed) { res.status(400).json({ error: 'BAD_REQUEST' }); return; }
    const { turns, ctx, idToken, email, code } = parsed;
    const msg = MESSAGES[ctx.lang];

    let check: PassCheck;
    try {
      check = await verifyPass(idToken, email, code);
    } catch {
      res.status(503).json({ error: 'PASS_CHECK_UNAVAILABLE' });
      return;
    }
    if ('refused' in check) {
      stats.blocked[check.refused === 'NEED_GOOGLE' ? 'need_google' : 'no_pass'] += 1;
      res.status(403).json({ error: check.refused });
      return;
    }
    const caller = check.caller;
    if (active >= MAX_ACTIVE) { stats.blocked.busy += 1; res.status(503).json({ error: 'BUSY', message: msg.busy }); return; }
    const gate = allow(caller.uid);
    if (gate !== 'ok') { stats.blocked[gate] += 1; res.status(429).json({ error: gate.toUpperCase(), message: msg[gate] }); return; }
    stats.messages += 1;

    const send = sse(res);
    const abort = new AbortController();
    res.on('close', () => abort.abort());
    active += 1;
    let released = false;
    const release = () => { if (!released) { released = true; active -= 1; } };

    if (mode === 'mock') {
      await mockAnswer(send, turns[turns.length - 1].text, ctx);
      send('done', {});
      release();
      res.end();
      return;
    }

    const system = await companionPromptReady();
    const messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
      ...turns.map((t) => ({ role: t.role, content: t.text })),
      { role: 'system', content: contextNote(ctx) },
    ];
    const targetIds = new Set(ctx.targets.map((t) => t.id));
    let navigated = false;
    let usd = 0;

    try {
      for (let round = 0; round < 3; round += 1) {
        const params: any = {
          model: MODEL,
          max_tokens: 2000,
          thinking: { type: 'adaptive' },
          output_config: { effort: 'low' },
          system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral', ttl: '1h' } }],
          tools: TOOLS,
          messages,
        };
        if (useFallbacks) { params.fallbacks = 'default'; params.betas = ['server-side-fallback-2026-07-01']; }
        let final: Anthropic.Beta.Messages.BetaMessage;
        try {
          const stream = client!.beta.messages.stream(params, { signal: abort.signal });
          stream.on('text', (t: string) => send('text', { t }));
          final = await stream.finalMessage();
        } catch (err) {
          // A rejected fallback setting must not take the companion down: retry once without it.
          if (useFallbacks && err instanceof Anthropic.BadRequestError && /fallback/i.test(String(err.message))) {
            useFallbacks = false;
            round -= 1;
            continue;
          }
          throw err;
        }
        usd += charge(final.usage);

        if (final.stop_reason === 'refusal') { stats.refusals += 1; send('text', { t: msg.refusal }); break; }
        if (final.stop_reason !== 'tool_use') break;

        const results: Anthropic.Beta.Messages.BetaToolResultBlockParam[] = [];
        for (const block of final.content) {
          if (block.type !== 'tool_use') continue;
          const input = (block.input || {}) as Record<string, unknown>;
          let ok = false;
          let note = 'listo';
          if (block.name === 'ir_a' && typeof input.destino === 'string' && DEST_IDS.includes(input.destino)) {
            if (navigated) note = 'una sola página por respuesta';
            else { navigated = true; ok = true; send('action', { type: 'ir_a', id: input.destino }); }
          } else if (block.name === 'senalar' && typeof input.elemento === 'string' && targetIds.has(input.elemento)) {
            ok = true;
            send('action', { type: 'senalar', id: input.elemento });
          } else {
            note = 'destino o elemento no válido';
          }
          results.push({ type: 'tool_result', tool_use_id: block.id, content: ok ? 'listo' : note, ...(ok ? {} : { is_error: true }) });
        }
        messages.push({ role: 'assistant', content: final.content as any });
        messages.push({ role: 'user', content: results });
      }
      send('done', {});
    } catch (err) {
      if (!abort.signal.aborted) {
        stats.errors += 1;
        console.warn('[companion] answer failed:', err instanceof Error ? err.message.slice(0, 200) : err);
        send('error', { message: msg.error });
      }
    } finally {
      release();
      if (usd) console.info(`[companion] ${sha256(caller.uid).slice(0, 8)} $${usd.toFixed(4)} · today $${spentUsd.toFixed(2)}`);
      res.end();
    }
  });

  return router;
}
