#!/usr/bin/env node
/**
 * SGX Live Engine — prueba de carga WebSocket (solo local).
 *
 * Simula N teléfonos de audiencia contra una instancia LOCAL del servidor
 * (server.ts empaquetado igual que `npm run build`) y un director que abre y
 * cierra votaciones. Usa exactamente los mensajes que envían los clientes
 * reales (src/App.tsx): SUBMIT_VOTE JSON con questionId y reacciones
 * SEND_REACTION por WS (REST solo con --rest, como cuando el socket se cae), y
 * para el director BROADCAST_QUESTION / TRIGGER_PRESET / CLOSE_VOTING por WS
 * + copia REST (--no-admin-rest la quita) para comprobar que el duplicado no
 * borra votos.
 *
 * No toca el código de la app: no hay simulador ni hooks dentro del servidor.
 * Ver scripts/loadtest/README.md.
 */
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { spawn, execFileSync, execSync } from 'node:child_process';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import net from 'node:net';
import path from 'node:path';
import crypto from 'node:crypto';
import WebSocket from 'ws';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..', '..');
const hrnow = () => performance.timeOrigin + performance.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const TYPE_RE = /^\{"type":"([A-Z_]+)"/;
const TS_RE = /"timestamp":(\d{10,})/;
const QID_RE = /"questionId":"([^"]+)"/;
const HIST_MAX_MS = 60_000;

const REACTIONS = [
  { emoji: '🔥', type: 'fire', color: '#ff4500' },
  { emoji: '⚡', type: 'lightning', color: '#fdcc0d' },
  { emoji: '🚀', type: 'rocket', color: '#00ddff' },
  { emoji: '❤️', type: 'heart', color: '#ff2d55' },
];
// Opinion poll with a skewed but deterministic-ish distribution.
const OPTION_WEIGHTS = [0.4, 0.3, 0.2, 0.1];
const ROUND_PRESETS = ['preset_story_float', 'preset_synthesize_chaos', 'preset_glitch_cyber', 'preset_sgx_icon_3d', 'preset_guild_logo_3d'];

// ---------------------------------------------------------------- histograms
function newHist() { return new Uint32Array(HIST_MAX_MS + 2); }
function histAdd(h, ms) {
  const i = ms < 0 ? HIST_MAX_MS + 1 : ms > HIST_MAX_MS ? HIST_MAX_MS : Math.round(ms);
  h[i]++;
}
function histMerge(into, from) { for (let i = 0; i < into.length; i++) into[i] += from[i]; }
function histStats(h) {
  let n = 0; for (let i = 0; i <= HIST_MAX_MS; i++) n += h[i];
  const neg = h[HIST_MAX_MS + 1];
  if (!n) return { n: 0, negative: neg };
  const at = (p) => { const target = Math.ceil(n * p); let acc = 0; for (let i = 0; i <= HIST_MAX_MS; i++) { acc += h[i]; if (acc >= target) return i; } return HIST_MAX_MS; };
  let max = 0; for (let i = HIST_MAX_MS; i >= 0; i--) if (h[i]) { max = i; break; }
  return { n, p50: at(0.5), p95: at(0.95), p99: at(0.99), max, negative: neg };
}
function pct(arr) {
  if (!arr.length) return { n: 0 };
  const s = Float64Array.from(arr).sort();
  const q = (p) => s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)];
  const r = (x) => Math.round(x * 10) / 10;
  return { n: s.length, p50: r(q(0.5)), p95: r(q(0.95)), p99: r(q(0.99)), max: r(s[s.length - 1]), min: r(s[0]) };
}

// ================================================================== WORKER

function runWorker() {
  const cfg = workerData;
  const clients = [];
  const stats = {
    msgsIn: 0, bytesIn: 0, msgsOut: 0, bytesOut: 0,
    typeCount: {}, typeBytes: {}, perSecond: {},
    connectMs: [], initMs: [], connectFail: 0, connectFailReasons: {},
    unexpectedClose: 0, closeCodes: {}, errorsReceived: {},
    restStatus: {}, restStatusByPath: {}, restErrors: 0, restErrorKinds: {}, restCalls: 0,
    reactionsSent: 0, votesSent: 0,
  };
  const fanout = {}; // type -> hist (receive - server timestamp)
  const receipts = {}; // actionKey -> [hi-res first receipt per client]
  const dupReceipts = {}; // actionKey -> number of extra (duplicate) receipts
  const tallies = {}; // qid -> { voters, sentByOption, wsAccepted, restAccepted, doubleAccepted }
  const elDelay = monitorEventLoopDelay({ resolution: 10 }); elDelay.enable();
  let reactionsOn = false;
  let closing = false;

  const httpBase = cfg.httpBase;
  const tally = (qid) => (tallies[qid] ||= { voters: 0, sentByOption: {}, wsAccepted: 0, restAccepted: 0, doubleAccepted: 0, notActive: 0 });
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

  function rest(c, p, body) {
    stats.restCalls++;
    const headers = { 'Content-Type': 'application/json' };
    if (c.ip) headers['X-Forwarded-For'] = c.ip;
    return fetch(httpBase + p, { method: 'POST', headers, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) })
      .then(async (r) => { bump(stats.restStatus, r.status); bump(stats.restStatusByPath, `${p}:${r.status}`); await r.arrayBuffer().catch(() => {}); return r.status; })
      .catch((e) => { stats.restErrors++; bump(stats.restErrorKinds, `${p}:${e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code || e?.name || 'error')}`); return 0; });
  }

  function send(c, data) {
    if (c.ws.readyState !== WebSocket.OPEN) return false;
    c.ws.send(data);
    stats.msgsOut++; stats.bytesOut += typeof data === 'string' ? Buffer.byteLength(data) : data.length;
    return true;
  }

  function castVote(c, q) {
    if (c.voted.has(q.id) || c.ws.readyState !== WebSocket.OPEN) return;
    c.voted.add(q.id);
    let r = Math.random(), opt = q.options[q.options.length - 1];
    for (let i = 0; i < q.options.length; i++) { r -= OPTION_WEIGHTS[i] ?? 0; if (r <= 0) { opt = q.options[i]; break; } }
    // Same as handleCastVote in src/App.tsx: JSON with the question id.
    send(c, JSON.stringify({
      type: 'SUBMIT_VOTE',
      payload: { optionId: opt.id, optionCode: opt.code, questionId: q.id, userId: c.userId, user: { id: c.userId, nickname: c.nick, avatar: '🚀' } },
      tenantId: cfg.tenantId, eventId: cfg.eventId,
    }));
    stats.votesSent++;
    const t = tally(q.id); t.voters++; bump(t.sentByOption, opt.id);
    c.lastVoteQ = q.id;
    if (cfg.rest) {
      rest(c, '/api/vote', { tenantId: cfg.tenantId, eventId: cfg.eventId, userId: c.userId, optionId: opt.id, optionCode: opt.code, questionId: q.id, user: { id: c.userId, nickname: c.nick } })
        .then((s) => { if (s === 200) { t.restAccepted++; c.acceptedCount.set(q.id, (c.acceptedCount.get(q.id) || 0) + 1); if (c.acceptedCount.get(q.id) > 1) t.doubleAccepted++; } });
    }
  }

  function sendReaction(c) {
    const rx = REACTIONS[(Math.random() * REACTIONS.length) | 0];
    if (!send(c, JSON.stringify({ type: 'SEND_REACTION', payload: { emoji: rx.emoji, type: rx.type, color: rx.color, userId: c.userId, userName: c.nick }, tenantId: cfg.tenantId, eventId: cfg.eventId }))) return;
    stats.reactionsSent++;
    if (cfg.rest) rest(c, '/api/reaction', { tenantId: cfg.tenantId, eventId: cfg.eventId, userId: c.userId, emoji: rx.emoji, color: rx.color });
  }

  function recordReceipt(c, key, hr) {
    if (c.slow) return; // paused readers only see messages when resumed at the end; keep them out of latency stats
    if (c.seen.has(key)) { bump(dupReceipts, key); return; }
    c.seen.add(key);
    (receipts[key] ||= []).push(hr);
  }

  function onMessage(c, data, isBinary) {
    const now = Date.now();
    const hr = hrnow();
    const buf = Array.isArray(data) ? Buffer.concat(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
    const len = buf.length;
    stats.msgsIn++; stats.bytesIn += len;
    const sec = Math.floor(now / 1000);
    const ps = (stats.perSecond[sec] ||= [0, 0]); ps[0]++; ps[1] += len;
    if (isBinary) { bump(stats.typeCount, 'BINARY'); return; }
    const head = buf.toString('latin1', 0, Math.min(len, 600));
    const m = TYPE_RE.exec(head);
    const type = m ? m[1] : 'UNKNOWN';
    bump(stats.typeCount, type); bump(stats.typeBytes, type, len);
    const ts = TS_RE.exec(head);
    if (ts && !c.slow) histAdd(fanout[type] ||= newHist(), now - Number(ts[1]));

    switch (type) {
      case 'INIT_STATE':
        if (c.tInit == null) { c.tInit = hr; if (!c.slow) stats.initMs.push(hr - c.tStart); }
        break;
      case 'QUESTION_START': {
        const msg = JSON.parse(buf.toString('utf8'));
        const q = msg.payload?.question;
        if (!q?.id) break;
        recordReceipt(c, 'QUESTION_START|' + q.id, hr);
        c.currentQ = q.id;
        // Each person decides once per question (the dual-path director sends QUESTION_START twice).
        if (closing || c.decided.has(q.id) || c.pendingVote) break;
        c.decided.add(q.id);
        if (Math.random() >= cfg.voteRate) break;
        const delay = cfg.voteMinMs + Math.random() * Math.max(0, cfg.voteWindowMs - cfg.voteMinMs);
        c.pendingVote = setTimeout(() => { c.pendingVote = null; castVote(c, q); }, delay);
        break;
      }
      case 'SCORE_UPDATE': {
        const qid = c.lastVoteQ;
        if (!qid) break;
        const t = tally(qid); t.wsAccepted++;
        const n = (c.acceptedCount.get(qid) || 0) + 1; c.acceptedCount.set(qid, n);
        if (n > 1) t.doubleAccepted++;
        break;
      }
      case 'VOTING_CLOSED':
      case 'VOTE_SUMMARY': {
        const q = QID_RE.exec(head);
        if (q) recordReceipt(c, type + '|' + q[1], hr);
        break;
      }
      case 'VISUALIZER_TRIGGER':
      case 'PRESET_TRIGGER': {
        const msg = JSON.parse(buf.toString('utf8'));
        if (msg.payload?.source === 'MANUAL_DIRECTOR') recordReceipt(c, 'PRESET_TRIGGER|' + msg.payload.presetId, hr);
        break;
      }
      case 'ERROR': {
        const msg = JSON.parse(buf.toString('utf8'));
        bump(stats.errorsReceived, `${msg.payload?.error}:${msg.payload?.for || ''}`);
        break;
      }
    }
  }

  function connect(spec) {
    const c = {
      idx: spec.idx, userId: spec.userId, nick: spec.nick, ip: spec.ip, slow: spec.slow,
      tStart: hrnow(), tOpen: null, tInit: null, settled: false, ws: null,
      voted: new Set(), decided: new Set(), seen: new Set(), acceptedCount: new Map(), pendingVote: null, currentQ: null, lastVoteQ: null,
    };
    clients.push(c);
    const url = `${cfg.wsBase}?tenantId=${encodeURIComponent(cfg.tenantId)}&eventId=${encodeURIComponent(cfg.eventId)}&userId=${encodeURIComponent(c.userId)}&nickname=${encodeURIComponent(c.nick)}`;
    const headers = c.ip ? { 'X-Forwarded-For': c.ip } : {};
    const ws = new WebSocket(url, { headers, perMessageDeflate: false, handshakeTimeout: cfg.handshakeTimeoutMs });
    c.ws = ws;
    const settle = (ok, reason) => {
      if (c.settled) return; c.settled = true;
      if (ok) { c.tOpen = hrnow(); stats.connectMs.push(c.tOpen - c.tStart); }
      else { stats.connectFail++; bump(stats.connectFailReasons, reason); }
      parentPort.postMessage({ kind: 'progress', ok });
    };
    ws.on('open', () => {
      settle(true);
      // A phone that stops reading (bad Wi-Fi / backgrounded tab): the server keeps buffering for it.
      if (c.slow) ws._socket?.pause();
    });
    ws.on('unexpected-response', (_req, res) => { settle(false, 'HTTP_' + res.statusCode); try { ws.terminate(); } catch {} });
    ws.on('error', (err) => { settle(false, err.code || err.message || 'error'); });
    ws.on('message', (d, isBinary) => onMessage(c, d, isBinary));
    ws.on('close', (code) => {
      if (!c.settled) settle(false, 'CLOSE_' + code);
      else if (!closing && c.tOpen != null) { stats.unexpectedClose++; bump(stats.closeCodes, code); }
      if (c.pendingVote) { clearTimeout(c.pendingVote); c.pendingVote = null; }
      c.closedAt = hrnow();
      if (closing) parentPort.postMessage({ kind: 'closed' });
    });
  }

  // Reactions: each open client taps with probability rate/s, checked every 250 ms.
  const TICK = 250;
  const reactionTimer = setInterval(() => {
    if (!reactionsOn || closing) return;
    const p = cfg.reactionRate * (TICK / 1000);
    for (const c of clients) if (!c.slow && c.ws?.readyState === WebSocket.OPEN && Math.random() < p) sendReaction(c);
  }, TICK);

  parentPort.on('message', async (cmd) => {
    switch (cmd.kind) {
      case 'connect':
        for (const spec of cmd.specs) setTimeout(() => connect(spec), spec.delay);
        break;
      case 'reactions':
        reactionsOn = cmd.on;
        break;
      case 'tally':
        parentPort.postMessage({ kind: 'tally', qid: cmd.qid, tally: tallies[cmd.qid] || tally(cmd.qid) });
        break;
      case 'close': {
        closing = true;
        clearInterval(reactionTimer);
        let n = 0;
        for (const c of clients) {
          if (c.pendingVote) clearTimeout(c.pendingVote);
          if (c.ws && (c.ws.readyState === WebSocket.OPEN || c.ws.readyState === WebSocket.CONNECTING)) {
            n++;
            if (c.slow) c.ws._socket?.resume();
            c.ws.close(1000, 'loadtest done');
            // Paused sockets may never complete the closing handshake.
            setTimeout(() => { if (c.ws.readyState !== WebSocket.CLOSED) c.ws.terminate(); }, 10000).unref();
          }
        }
        parentPort.postMessage({ kind: 'closing', count: n });
        break;
      }
      case 'final': {
        elDelay.disable();
        const fanoutOut = {};
        for (const [k, h] of Object.entries(fanout)) fanoutOut[k] = h;
        parentPort.postMessage({
          kind: 'final',
          stats,
          fanout: fanoutOut,
          receipts,
          dupReceipts,
          tallies,
          eventLoop: { p50: elDelay.percentile(50) / 1e6, p99: elDelay.percentile(99) / 1e6, max: elDelay.max / 1e6 },
          slowClients: clients.filter((c) => c.slow).length,
        });
        break;
      }
    }
  });
  parentPort.postMessage({ kind: 'ready' });
}

// ==================================================================== MAIN
let serverChild = null;
function cleanupAndExit(code) {
  if (serverChild && serverChild.exitCode == null) { try { serverChild.kill('SIGTERM'); } catch {} }
  process.exit(code);
}
process.on('SIGINT', () => cleanupAndExit(130));

function parseArgs(argv) {
  const a = {
    url: null, clients: 1000, rampMs: 10000, workers: Math.max(1, Math.min(3, os.cpus().length - 1)),
    rounds: 3, roundMs: 12000, voteMinMs: 300, voteWindowMs: 8000, voteRate: 0.9, reactionRate: 0.03,
    rest: false, adminDualPath: true, adminRestDelayMs: 0, clientsPerIp: 1, slow: 0,
    tenant: 'tenant_spatialgineers', event: 'event_live_main', port: 0, serverJs: false,
    adminToken: process.env.SGX_TEST_ADMIN_TOKEN || null, out: path.join(HERE, 'out'), label: '',
    allowRemote: false, settleMs: 3000, handshakeTimeoutMs: 15000, serverPid: null,
  };
  const num = (v, k) => { const n = Number(v); if (!Number.isFinite(n)) throw new Error(`--${k} needs a number`); return n; };
  for (let i = 0; i < argv.length; i++) {
    const [k0, inline] = argv[i].replace(/^--/, '').split('=');
    const next = () => (inline !== undefined ? inline : argv[++i]);
    switch (k0) {
      case 'url': a.url = next(); break;
      case 'clients': a.clients = num(next(), k0); break;
      case 'ramp-ms': a.rampMs = num(next(), k0); break;
      case 'workers': a.workers = num(next(), k0); break;
      case 'rounds': a.rounds = num(next(), k0); break;
      case 'round-ms': a.roundMs = num(next(), k0); break;
      case 'vote-min-ms': a.voteMinMs = num(next(), k0); break;
      case 'vote-window-ms': a.voteWindowMs = num(next(), k0); break;
      case 'vote-rate': a.voteRate = num(next(), k0); break;
      case 'reaction-rate': a.reactionRate = num(next(), k0); break;
      case 'no-rest': a.rest = false; break;
      case 'rest': a.rest = true; break;
      case 'no-admin-rest': a.adminDualPath = false; break;
      case 'admin-rest-delay-ms': a.adminRestDelayMs = num(next(), k0); break;
      case 'clients-per-ip': a.clientsPerIp = num(next(), k0); break;
      case 'slow': a.slow = num(next(), k0); break;
      case 'tenant': a.tenant = next(); break;
      case 'event': a.event = next(); break;
      case 'port': a.port = num(next(), k0); break;
      case 'server-js': a.serverJs = true; break;
      case 'admin-token': a.adminToken = next(); break;
      case 'server-pid': a.serverPid = num(next(), k0); break;
      case 'out': a.out = path.resolve(next()); break;
      case 'label': a.label = next(); break;
      case 'settle-ms': a.settleMs = num(next(), k0); break;
      case 'allow-remote-i-am-sure-this-is-not-production': a.allowRemote = true; break;
      case 'help': case 'h':
        console.log(fs.readFileSync(path.join(HERE, 'README.md'), 'utf8')); process.exit(0);
      default: throw new Error(`Unknown option --${k0} (see --help)`);
    }
  }
  return a;
}

function freePort() {
  return new Promise((res, rej) => {
    const s = net.createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
    s.on('error', rej);
  });
}

async function waitHealthy(base, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { const r = await fetch(base + '/healthz', { signal: AbortSignal.timeout(1000) }); if (r.ok) return true; } catch {}
    await sleep(250);
  }
  return false;
}

async function startLocalServer(args, stamp) {
  fs.mkdirSync(args.out, { recursive: true });
  let entry = path.join(REPO, 'server.js');
  if (!args.serverJs) {
    // Same esbuild flags as `npm run build`, but written to out/ so the tracked server.js is never touched.
    entry = path.join(args.out, 'server.bundle.mjs');
    execFileSync(path.join(REPO, 'node_modules', '.bin', 'esbuild'),
      ['server.ts', '--bundle', '--platform=node', '--format=esm', '--packages=external', `--outfile=${entry}`, '--log-level=warning'],
      { cwd: REPO, stdio: 'inherit' });
  }
  const port = args.port || (await freePort());
  const token = args.adminToken || 'loadtest_' + crypto.randomBytes(12).toString('hex');
  const logPath = path.join(args.out, `server-${stamp}.log`);
  const log = fs.openSync(logPath, 'w');
  const env = {
    ...process.env,
    PORT: String(port),
    // Not 'production': the local test admin token is only honoured outside production.
    // This also means Vite runs in middleware mode (no HMR, no file watching).
    NODE_ENV: 'development',
    DISABLE_HMR: 'true',
    SGX_TEST_ADMIN_TOKEN: token,
    // Belt and braces: if anything ever tried a real Firebase token lookup it fails against an invalid key.
    FIREBASE_API_KEY: 'loadtest-invalid-key',
    SGX_ADMIN_EMAILS: 'nobody@loadtest.invalid',
  };
  serverChild = spawn(process.execPath, [entry], { cwd: REPO, env, stdio: ['ignore', log, log] });
  serverChild.on('exit', (code, sig) => { if (!shuttingDown) console.error(`[loadtest] server exited unexpectedly code=${code} sig=${sig} (see ${logPath})`); });
  const httpBase = `http://127.0.0.1:${port}`;
  if (!(await waitHealthy(httpBase, 60000))) throw new Error(`server did not become healthy on ${httpBase} (see ${logPath})`);
  return { httpBase, wsBase: `ws://127.0.0.1:${port}/ws`, pid: serverChild.pid, token, logPath, entry };
}
let shuttingDown = false;

// ---------------------------------------------------------- server sampler
function makeSampler(pid, httpBase) {
  const samples = [];
  const probes = [];
  let clk = 100;
  try { clk = Number(execSync('getconf CLK_TCK').toString().trim()) || 100; } catch {}
  const hasProc = pid && fs.existsSync(`/proc/${pid}/stat`);
  let last = null;
  let phase = 'boot';
  const readProc = () => {
    const stat = fs.readFileSync(`/proc/${pid}/stat`, 'utf8');
    const f = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
    const cpuTicks = Number(f[11]) + Number(f[12]); // utime + stime
    const status = fs.readFileSync(`/proc/${pid}/status`, 'utf8');
    const rssKb = Number(/VmRSS:\s+(\d+)/.exec(status)?.[1] || 0);
    const fds = fs.readdirSync(`/proc/${pid}/fd`).length;
    return { cpuTicks, rssKb, fds };
  };
  const readPs = () => {
    const out = execSync(`ps -o rss=,%cpu= -p ${pid}`).toString().trim().split(/\s+/);
    return { rssKb: Number(out[0]), psCpu: Number(out[1]) };
  };
  const t1 = pid ? setInterval(() => {
    try {
      const t = Date.now();
      if (hasProc) {
        const r = readProc();
        const cpuPct = last ? ((r.cpuTicks - last.cpuTicks) / clk) / ((t - last.t) / 1000) * 100 : 0;
        last = { t, cpuTicks: r.cpuTicks };
        samples.push({ t, phase, rssMb: Math.round(r.rssKb / 102.4) / 10, cpuPct: Math.round(cpuPct), fds: r.fds });
      } else {
        const r = readPs();
        samples.push({ t, phase, rssMb: Math.round(r.rssKb / 102.4) / 10, cpuPct: r.psCpu, note: 'ps %cpu is lifetime average' });
      }
    } catch {}
  }, 500) : null;
  // /healthz round-trip = how responsive the server event loop is while under load.
  let probing = false;
  const t2 = setInterval(async () => {
    if (probing) return; probing = true;
    const s = hrnow(); const p = phase;
    try { const r = await fetch(httpBase + '/healthz', { signal: AbortSignal.timeout(10000) }); await r.text(); probes.push({ phase: p, ms: hrnow() - s, ok: r.ok }); }
    catch { probes.push({ phase: p, ms: hrnow() - s, ok: false }); }
    probing = false;
  }, 500);
  return {
    setPhase(p) { phase = p; },
    stop() { if (t1) clearInterval(t1); clearInterval(t2); },
    samples, probes, mode: hasProc ? '/proc' : 'ps',
  };
}

// ------------------------------------------------------------------ admin
async function connectAdmin(args, target) {
  const url = `${target.wsBase}?tenantId=${args.tenant}&eventId=${args.event}&userId=lt_director&role=admin&nickname=Director`;
  const ws = new WebSocket(url, { headers: { 'X-Forwarded-For': '10.255.255.254' }, perMessageDeflate: false });
  const state = { ws, closed: {}, closedCount: {}, questionStartCount: {}, errors: [], isAdmin: false, lastSync: null, waiters: [] };
  ws.on('message', (d) => {
    let msg; try { msg = JSON.parse(d.toString()); } catch { return; }
    if (msg.type === 'AUTH_RESULT') state.isAdmin = !!msg.payload?.isAdmin;
    if (msg.type === 'VOTING_CLOSED') {
      const qid = msg.payload?.summary?.questionId;
      state.closedCount[qid] = (state.closedCount[qid] || 0) + 1;
      (state.closed[qid] ||= []).push({ summary: msg.payload.summary, usersInPayload: msg.payload.users?.length, bytes: d.length });
    }
    if (msg.type === 'QUESTION_START') { const q = msg.payload?.question?.id; state.questionStartCount[q] = (state.questionStartCount[q] || 0) + 1; }
    if (msg.type === 'ROOM_STATE_SYNC') state.lastSync = msg.payload;
    if (msg.type === 'ERROR') state.errors.push(msg.payload);
    state.waiters = state.waiters.filter((w) => !w(msg));
  });
  await new Promise((res, rej) => { ws.once('open', res); ws.once('error', rej); });
  state.waitFor = (pred, ms = 10000) => new Promise((res) => {
    const timer = setTimeout(() => res(null), ms);
    state.waiters.push((m) => { if (pred(m)) { clearTimeout(timer); res(m); return true; } return false; });
  });
  if (target.token) {
    const auth = state.waitFor((m) => m.type === 'AUTH_RESULT', 10000);
    ws.send(JSON.stringify({ type: 'AUTH', payload: { token: target.token } }));
    await auth;
  }
  return state;
}

// ------------------------------------------------------------------- main
async function main() {
  const args = parseArgs(process.argv.slice(2));
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(args.out, { recursive: true });
  const ulimit = (() => { try { return execSync('ulimit -n', { shell: '/bin/bash' }).toString().trim(); } catch { return 'unknown'; } })();

  // ---- target
  let target;
  if (args.url) {
    const u = new URL(args.url);
    const loopback = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(u.hostname) || u.hostname.startsWith('127.');
    if (!loopback && !args.allowRemote) {
      throw new Error(`Refusing non-local target ${u.hostname}. This tool is for LOCAL instances only.`);
    }
    const httpBase = `${u.protocol === 'wss:' ? 'https:' : 'http:'}//${u.host}`;
    target = { httpBase, wsBase: `${u.protocol}//${u.host}/ws`, pid: args.serverPid, token: args.adminToken, logPath: null, entry: 'external' };
    if (!(await waitHealthy(httpBase, 10000))) throw new Error(`${httpBase}/healthz not responding`);
  } else {
    console.log('[loadtest] building server bundle + starting local server…');
    target = await startLocalServer(args, stamp);
  }
  console.log(`[loadtest] target ${target.wsBase} pid=${target.pid ?? 'n/a'} clients=${args.clients} workers=${args.workers} ulimit -n=${ulimit}`);
  if (ulimit !== 'unlimited' && Number(ulimit) < args.clients * 2 + 200) {
    console.warn(`[loadtest] WARNING: ulimit -n (${ulimit}) is low for ${args.clients} clients + REST sockets; raise it with "ulimit -n 65535".`);
  }

  const sampler = makeSampler(target.pid, target.httpBase);
  const phases = [];
  let curPhase = null;
  const setPhase = (name) => { const t = Date.now(); if (curPhase) curPhase.end = t; curPhase = { name, start: t }; phases.push(curPhase); sampler.setPhase(name); };
  setPhase('boot');
  await sleep(1500);

  // ---- admin
  const admin = await connectAdmin(args, target);
  const canDirect = admin.isAdmin;
  if (!canDirect) console.warn('[loadtest] admin socket is NOT verified: running connections + reactions only (no polls).');
  const actions = [];
  const adminFetch = (p, body) => fetch(target.httpBase + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${target.token}`, 'X-Forwarded-For': '10.255.255.254' },
    body: JSON.stringify({ tenantId: args.tenant, eventId: args.event, ...body }),
  }).then((r) => r.status).catch(() => 0);
  const adminRestStatus = {};
  function adminAction(type, payload, restPath, restBody, key) {
    const t0 = hrnow();
    admin.ws.send(JSON.stringify({ type, payload, tenantId: args.tenant, eventId: args.event }));
    actions.push({ type, key, t0 });
    if (args.adminDualPath && restPath) {
      // The director console fires the same action over REST right after the WS message (src/App.tsx).
      setTimeout(() => adminFetch(restPath, restBody).then((s) => { adminRestStatus[s] = (adminRestStatus[s] || 0) + 1; }), args.adminRestDelayMs);
    }
    return t0;
  }

  const questions = [];
  if (canDirect) {
    for (let r = 0; r < args.rounds; r++) {
      questions.push({
        id: `lt_q_${r}`,
        prompt: `Pregunta de carga #${r + 1}: ¿qué pilar activamos?`,
        answerType: 'OPINION_CYOA',
        // Longer than the round so the director (not the timer) closes it, like a live show.
        durationSeconds: Math.ceil(args.roundMs / 1000) + 30,
        options: ['Story', 'Spark', 'Signal', 'Space'].map((label, i) => ({ id: `lt_opt_${i + 1}`, label, presetId: ROUND_PRESETS[i % ROUND_PRESETS.length] })),
      });
    }
    const synced = admin.waitFor((m) => m.type === 'ROOM_STATE_SYNC' && m.payload?.questions?.[0]?.id === 'lt_q_0');
    // Same as handleBulkCreateQuestions(…, 'replace').
    admin.ws.send(JSON.stringify({ type: 'UPDATE_QUESTIONS', payload: questions, tenantId: args.tenant, eventId: args.event }));
    if (!(await synced)) throw new Error('UPDATE_QUESTIONS was not applied: ' + JSON.stringify(admin.errors));
  }

  // ---- workers
  const workers = [];
  const finals = [];
  let progress = { ok: 0, fail: 0 };
  let closedCount = 0;
  const tallyWaiters = [];
  for (let w = 0; w < args.workers; w++) {
    const worker = new Worker(fileURLToPath(import.meta.url), {
      workerData: {
        wsBase: target.wsBase, httpBase: target.httpBase, tenantId: args.tenant, eventId: args.event,
        rest: args.rest, voteRate: args.voteRate, voteMinMs: args.voteMinMs, voteWindowMs: args.voteWindowMs,
        reactionRate: args.reactionRate, handshakeTimeoutMs: args.handshakeTimeoutMs,
      },
    });
    worker.on('message', (m) => {
      if (m.kind === 'progress') m.ok ? progress.ok++ : progress.fail++;
      else if (m.kind === 'closed') closedCount++;
      else if (m.kind === 'final') finals.push(m);
      else if (m.kind === 'tally') tallyWaiters.forEach((f) => f(m));
    });
    worker.on('error', (e) => console.error('[loadtest] worker error', e));
    await new Promise((res) => worker.once('message', (m) => m.kind === 'ready' && res()));
    workers.push(worker);
  }

  // ---- ramp
  setPhase('ramp');
  const runId = crypto.randomBytes(3).toString('hex');
  const specs = Array.from({ length: args.workers }, () => []);
  for (let i = 0; i < args.clients; i++) {
    const g = args.clientsPerIp > 0 ? Math.floor(i / args.clientsPerIp) + 1 : 0;
    specs[i % args.workers].push({
      idx: i,
      userId: `lt_${runId}_${i}`,
      nick: `Carga ${i}`,
      ip: g ? `10.${(g >> 16) & 255}.${(g >> 8) & 255}.${g & 255}` : null,
      slow: args.slow > 0 && (i % Math.round(1 / args.slow) === 0),
      delay: Math.round((i / args.clients) * args.rampMs),
    });
  }
  const rampStart = hrnow();
  workers.forEach((w, i) => w.postMessage({ kind: 'connect', specs: specs[i] }));
  const rampDeadline = Date.now() + args.rampMs + args.handshakeTimeoutMs + 15000;
  let lastLog = 0;
  while (progress.ok + progress.fail < args.clients && Date.now() < rampDeadline) {
    await sleep(200);
    if (Date.now() - lastLog > 2000) { lastLog = Date.now(); process.stdout.write(`\r[loadtest] connected ${progress.ok}/${args.clients} (fail ${progress.fail})   `); }
  }
  const rampElapsed = hrnow() - rampStart;
  console.log(`\r[loadtest] connected ${progress.ok}/${args.clients} (fail ${progress.fail}) in ${(rampElapsed / 1000).toFixed(1)}s`);

  setPhase('settle');
  await sleep(args.settleMs);

  // ---- rounds
  setPhase('rounds');
  workers.forEach((w) => w.postMessage({ kind: 'reactions', on: true }));
  const roundResults = [];
  if (canDirect) {
    for (let r = 0; r < args.rounds; r++) {
      const q = questions[r];
      console.log(`[loadtest] round ${r + 1}/${args.rounds}: START_VOTING ${q.id}`);
      // BROADCAST_QUESTION is what the director console sends (START_VOTING is handled identically).
      adminAction('BROADCAST_QUESTION', { index: r, questionIndex: r }, '/api/action/broadcast-question', { questionIndex: r }, 'QUESTION_START|' + q.id);
      await sleep(args.roundMs / 2);
      const preset = ROUND_PRESETS[r % ROUND_PRESETS.length];
      adminAction('TRIGGER_PRESET', { presetId: preset }, '/api/action/trigger-preset', { presetId: preset }, 'PRESET_TRIGGER|' + preset);
      await sleep(args.roundMs / 2);
      const closed = admin.waitFor((m) => m.type === 'VOTING_CLOSED' && m.payload?.summary?.questionId === q.id, 30000);
      adminAction('CLOSE_VOTING', undefined, '/api/action/close-voting', {}, 'VOTING_CLOSED|' + q.id);
      await closed;
      await sleep(3000); // let REST fallbacks, duplicate closes and broadcasts drain
      const tallies = await new Promise((res) => {
        const got = [];
        const f = (m) => { if (m.qid === q.id) { got.push(m.tally); if (got.length === workers.length) { tallyWaiters.splice(tallyWaiters.indexOf(f), 1); res(got); } } };
        tallyWaiters.push(f);
        workers.forEach((w) => w.postMessage({ kind: 'tally', qid: q.id }));
      });
      const sent = { voters: 0, sentByOption: {}, wsAccepted: 0, restAccepted: 0, doubleAccepted: 0 };
      for (const t of tallies) {
        sent.voters += t.voters; sent.wsAccepted += t.wsAccepted; sent.restAccepted += t.restAccepted; sent.doubleAccepted += t.doubleAccepted;
        for (const [k, v] of Object.entries(t.sentByOption)) sent.sentByOption[k] = (sent.sentByOption[k] || 0) + v;
      }
      const closes = admin.closed[q.id] || [];
      const first = closes[0]?.summary;
      const optionMismatch = {};
      for (const opt of q.options) {
        const s = sent.sentByOption[opt.id] || 0; const g = first?.optionCounts?.[opt.id] ?? null;
        if (s !== g) optionMismatch[opt.id] = { sent: s, server: g };
      }
      const rr = {
        questionId: q.id,
        votersSent: sent.voters,
        serverTotalVotes: first?.totalVotes ?? null,
        acceptedWs: sent.wsAccepted,
        acceptedRest: sent.restAccepted,
        doubleAccepted: sent.doubleAccepted,
        sentByOption: sent.sentByOption,
        serverOptionCounts: first?.optionCounts ?? null,
        match: !!first && first.totalVotes === sent.voters && Object.keys(optionMismatch).length === 0 && sent.doubleAccepted === 0,
        optionMismatch,
        votingClosedBroadcasts: admin.closedCount[q.id] || 0,
        questionStartBroadcasts: admin.questionStartCount[q.id] || 0,
        votingClosedBytes: closes[0]?.bytes ?? null,
        usersInVotingClosed: closes[0]?.usersInPayload ?? null,
        laterCloseTotals: closes.slice(1).map((c) => c.summary.totalVotes),
      };
      roundResults.push(rr);
      console.log(`[loadtest]   votes sent=${rr.votersSent} server=${rr.serverTotalVotes} wsAccepted=${rr.acceptedWs} restAccepted=${rr.acceptedRest} match=${rr.match}`);
    }
  } else {
    await sleep(args.rounds * args.roundMs);
  }
  workers.forEach((w) => w.postMessage({ kind: 'reactions', on: false }));
  await sleep(2000);

  // ---- disconnect storm
  setPhase('disconnect');
  const toClose = await new Promise((res) => {
    let n = 0, got = 0;
    const f = (m) => { if (m.kind === 'closing') { n += m.count; if (++got === workers.length) { workers.forEach((w) => w.off('message', f)); res(n); } } };
    workers.forEach((w) => w.on('message', f));
    workers.forEach((w) => w.postMessage({ kind: 'close' }));
  });
  const dStart = hrnow();
  const admin0 = Date.now() + 30000;
  while (closedCount < toClose && Date.now() < admin0) await sleep(100);
  const disconnectMs = hrnow() - dStart;
  // wait until server responds quickly again
  await sleep(2000);
  setPhase('done');
  await sleep(1000);
  admin.ws.close();

  // ---- collect
  await new Promise((res) => {
    const check = setInterval(() => { if (finals.length === workers.length) { clearInterval(check); res(); } }, 50);
    workers.forEach((w) => w.postMessage({ kind: 'final' }));
  });
  sampler.stop();
  if (curPhase) curPhase.end = Date.now();
  await Promise.all(workers.map((w) => w.terminate()));

  const result = buildResult({ args, target, ulimit, stamp, phases, sampler, finals, actions, roundResults, progress, rampElapsed, disconnectMs, toClose, closedCount, adminRestStatus, adminErrors: admin.errors, canDirect });
  const file = path.join(args.out, `ws-load-${args.clients}c${args.label ? '-' + args.label : ''}-${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(result, null, 2));
  printSummary(result);
  console.log(`\n[loadtest] JSON: ${file}`);
  if (target.logPath) console.log(`[loadtest] server log: ${target.logPath}`);

  shuttingDown = true;
  if (serverChild) { serverChild.kill('SIGTERM'); await sleep(300); }
  process.exit(0);
}

function buildResult(ctx) {
  const { args, finals, actions, sampler, phases } = ctx;
  const sum = (k) => finals.reduce((n, f) => n + f.stats[k], 0);
  const mergeObj = (k) => { const o = {}; for (const f of finals) for (const [kk, v] of Object.entries(f.stats[k])) o[kk] = (o[kk] || 0) + v; return o; };
  const fanout = {}; const fanAll = newHist();
  for (const f of finals) for (const [t, h] of Object.entries(f.fanout)) { (fanout[t] ||= newHist()); histMerge(fanout[t], h); histMerge(fanAll, h); }
  const perSecond = {};
  for (const f of finals) for (const [s, [n, b]] of Object.entries(f.stats.perSecond)) { const p = (perSecond[s] ||= [0, 0]); p[0] += n; p[1] += b; }
  const secs = Object.keys(perSecond).map(Number).sort((a, b) => a - b);
  const inPhase = (name) => { const ph = phases.filter((p) => p.name === name); return (tSec) => ph.some((p) => tSec * 1000 >= p.start - 999 && tSec * 1000 <= (p.end ?? Infinity)); };
  const thr = (name) => {
    const f = inPhase(name); const xs = secs.filter(f).map((s) => perSecond[s]);
    if (!xs.length) return null;
    return { seconds: xs.length, avgMsgsPerSec: Math.round(xs.reduce((n, x) => n + x[0], 0) / xs.length), peakMsgsPerSec: Math.max(...xs.map((x) => x[0])), avgMBPerSec: Math.round(xs.reduce((n, x) => n + x[1], 0) / xs.length / 1e4) / 100, peakMBPerSec: Math.round(Math.max(...xs.map((x) => x[1])) / 1e4) / 100 };
  };

  // admin action -> client receipt latency
  const actionLatency = {};
  for (const a of actions) {
    const times = finals.flatMap((f) => f.receipts[a.key] || []);
    const dups = finals.reduce((n, f) => n + (f.dupReceipts[a.key] || 0), 0);
    actionLatency[a.key] = { action: a.type, received: times.length, duplicateReceipts: dups, ...pct(times.map((t) => t - a.t0)) };
  }
  const byAction = {};
  for (const v of Object.values(actionLatency)) { (byAction[v.action] ||= []).push(v); }
  const actionSummary = {};
  for (const [k, list] of Object.entries(byAction)) {
    actionSummary[k] = {
      rounds: list.length,
      receivedMin: Math.min(...list.map((x) => x.received)),
      p50: Math.max(...list.map((x) => x.p50 ?? 0)), p95: Math.max(...list.map((x) => x.p95 ?? 0)), p99: Math.max(...list.map((x) => x.p99 ?? 0)), max: Math.max(...list.map((x) => x.max ?? 0)),
      duplicateReceipts: list.reduce((n, x) => n + x.duplicateReceipts, 0),
    };
  }

  const phaseRes = {};
  for (const p of phases) {
    const ss = sampler.samples.filter((s) => s.phase === p.name);
    const pr = sampler.probes.filter((s) => s.phase === p.name);
    phaseRes[p.name] = {
      durationS: Math.round(((p.end ?? Date.now()) - p.start) / 100) / 10,
      rssMaxMb: ss.length ? Math.max(...ss.map((s) => s.rssMb)) : null,
      rssEndMb: ss.length ? ss[ss.length - 1].rssMb : null,
      cpuAvgPct: ss.length ? Math.round(ss.reduce((n, s) => n + s.cpuPct, 0) / ss.length) : null,
      cpuMaxPct: ss.length ? Math.max(...ss.map((s) => s.cpuPct)) : null,
      fdsMax: ss.length && ss[0].fds != null ? Math.max(...ss.map((s) => s.fds)) : null,
      healthz: { ...pct(pr.map((x) => x.ms)), failed: pr.filter((x) => !x.ok).length },
    };
  }

  const typeCount = mergeObj('typeCount'); const typeBytes = mergeObj('typeBytes');
  const types = {};
  for (const [t, n] of Object.entries(typeCount).sort((a, b) => b[1] - a[1])) {
    types[t] = { count: n, bytes: typeBytes[t] || 0, avgBytes: Math.round((typeBytes[t] || 0) / n), fanoutLagMs: fanout[t] ? histStats(fanout[t]) : null };
  }

  return {
    meta: {
      when: new Date().toISOString(), node: process.version, host: os.hostname(), cpus: os.cpus().length, cpuModel: os.cpus()[0]?.model,
      memGb: Math.round(os.totalmem() / 1e9), ulimitN: ctx.ulimit, target: ctx.target.wsBase, serverEntry: ctx.target.entry,
      samplerMode: sampler.mode, canDirect: ctx.canDirect,
      gitHead: (() => { try { return execSync('git rev-parse --short HEAD', { cwd: REPO }).toString().trim(); } catch { return null; } })(),
    },
    config: { ...args, adminToken: args.adminToken ? '(set)' : '(generated)' },
    connections: {
      requested: args.clients, ok: ctx.progress.ok, failed: ctx.progress.fail, failReasons: mergeObj('connectFailReasons'),
      rampSeconds: Math.round(ctx.rampElapsed / 100) / 10,
      handshakeMs: pct(finals.flatMap((f) => f.stats.connectMs)),
      initStateMs: pct(finals.flatMap((f) => f.stats.initMs)),
      unexpectedCloses: sum('unexpectedClose'), closeCodes: mergeObj('closeCodes'),
      slowClients: finals.reduce((n, f) => n + f.slowClients, 0),
      disconnectStorm: { sockets: ctx.toClose, closed: ctx.closedCount, ms: Math.round(ctx.disconnectMs) },
    },
    broadcastLatency: { byAction: actionSummary, perRound: actionLatency },
    fanoutLagAllMs: histStats(fanAll),
    throughput: {
      msgsIn: sum('msgsIn'), MBIn: Math.round(sum('bytesIn') / 1e4) / 100, msgsOut: sum('msgsOut'), KBOut: Math.round(sum('bytesOut') / 1e1) / 100,
      votesSent: sum('votesSent'), reactionsSent: sum('reactionsSent'),
      ramp: thr('ramp'), rounds: thr('rounds'), disconnect: thr('disconnect'),
    },
    messageTypes: types,
    rest: { calls: sum('restCalls'), status: mergeObj('restStatus'), statusByPath: mergeObj('restStatusByPath'), networkErrors: sum('restErrors'), errorKinds: mergeObj('restErrorKinds'), adminRestStatus: ctx.adminRestStatus },
    errorsReceivedByClients: mergeObj('errorsReceived'),
    adminErrors: ctx.adminErrors,
    votes: ctx.roundResults,
    server: { phases: phaseRes, samples: sampler.samples },
    loadGenerator: { workerEventLoopMs: finals.map((f) => f.eventLoop), mainCpu: process.cpuUsage() },
  };
}

function printSummary(r) {
  const line = (k, v) => console.log('  ' + String(k).padEnd(34) + v);
  const fmtP = (x) => (x && x.n ? `p50 ${x.p50}  p95 ${x.p95}  p99 ${x.p99}  max ${x.max}  (n=${x.n})` : 'n/a');
  console.log('\n================ SGX WS LOAD TEST SUMMARY ================');
  line('target', `${r.meta.target}  (git ${r.meta.gitHead})`);
  line('clients requested / ok / failed', `${r.connections.requested} / ${r.connections.ok} / ${r.connections.failed} ${Object.keys(r.connections.failReasons).length ? JSON.stringify(r.connections.failReasons) : ''}`);
  line('ramp', `${r.connections.rampSeconds}s`);
  line('handshake ms', fmtP(r.connections.handshakeMs));
  line('connect->INIT_STATE ms', fmtP(r.connections.initStateMs));
  line('unexpected closes', `${r.connections.unexpectedCloses} ${JSON.stringify(r.connections.closeCodes)}`);
  line('disconnect storm', `${r.connections.disconnectStorm.closed}/${r.connections.disconnectStorm.sockets} closed in ${r.connections.disconnectStorm.ms} ms`);
  console.log('  -- admin action -> client receipt (ms, worst round) --');
  for (const [k, v] of Object.entries(r.broadcastLatency.byAction)) line(k, `p50 ${v.p50}  p95 ${v.p95}  p99 ${v.p99}  max ${v.max}  recv>=${v.receivedMin}  dupRecv ${v.duplicateReceipts}`);
  const fo = r.fanoutLagAllMs;
  line('server ts -> client (all msgs) ms', fo.n ? `p50 ${fo.p50}  p95 ${fo.p95}  p99 ${fo.p99}  max ${fo.max}` : 'n/a');
  console.log('  -- throughput (received by all clients) --');
  line('total msgs in / MB', `${r.throughput.msgsIn} / ${r.throughput.MBIn}`);
  for (const ph of ['ramp', 'rounds', 'disconnect']) { const t = r.throughput[ph]; if (t) line(`${ph} msgs/s avg | peak`, `${t.avgMsgsPerSec} | ${t.peakMsgsPerSec}   (MB/s ${t.avgMBPerSec} | ${t.peakMBPerSec})`); }
  line('votes sent / reactions sent', `${r.throughput.votesSent} / ${r.throughput.reactionsSent}`);
  line('REST calls / status', `${r.rest.calls} ${JSON.stringify(r.rest.statusByPath)}`);
  if (r.rest.networkErrors) line('REST network errors', `${r.rest.networkErrors} ${JSON.stringify(r.rest.errorKinds)}`);
  line('director REST status', JSON.stringify(r.rest.adminRestStatus));
  const top = Object.entries(r.messageTypes).slice(0, 8).map(([t, v]) => `${t}:${v.count}`).join(' ');
  line('top message types', top);
  console.log('  -- server process --');
  for (const [p, v] of Object.entries(r.server.phases)) line(p, `RSS max ${v.rssMaxMb} MB  CPU avg ${v.cpuAvgPct}% max ${v.cpuMaxPct}%  fds ${v.fdsMax ?? '-'}  healthz p50 ${v.healthz.p50 ?? '-'} p99 ${v.healthz.p99 ?? '-'} max ${v.healthz.max ?? '-'} ms fail ${v.healthz.failed}`);
  console.log('  -- vote integrity --');
  for (const v of r.votes) line(v.questionId, `sent ${v.votersSent}  server ${v.serverTotalVotes}  wsAcc ${v.acceptedWs}  restAcc ${v.acceptedRest}  double ${v.doubleAccepted}  ${v.match ? 'MATCH' : 'MISMATCH ' + JSON.stringify(v.optionMismatch)}  closes ${v.votingClosedBroadcasts}  starts ${v.questionStartBroadcasts}  VOTING_CLOSED ${Math.round((v.votingClosedBytes || 0) / 1024)} KB`);
  if (Object.keys(r.errorsReceivedByClients).length) line('ERROR msgs to clients', JSON.stringify(r.errorsReceivedByClients));
  line('generator worker loop p99/max ms', r.loadGenerator.workerEventLoopMs.map((e) => `${e.p99.toFixed(0)}/${e.max.toFixed(0)}`).join(' '));
  console.log('==========================================================');
}

// ================================================================ dispatch
if (!isMainThread) runWorker();
else main().catch((err) => { console.error('[loadtest] fatal:', err); cleanupAndExit(1); });
