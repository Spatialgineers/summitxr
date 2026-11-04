// End-to-end checks for three audit fixes, against a LOCAL dev server + the emulators (never production):
//   1. the 360° tour pays XP once per point (recordActivity with the real signature);
//   2. /play pays +25 XP per question voted, once per question id (a re-broadcast pays nothing),
//      and POST /api/vote takes the voter from the server-signed token, never from the body;
//   3. /studio and /estudio open Tu Estudio; the multiview stays at /multiview.
// The dev server needs SGX_TEST_ADMIN_TOKEN (non-production only) so this script can run the director:
//   SGX_TEST_ADMIN_TOKEN=fixes_local VITE_EMULATOR_FIRESTORE_PORT=8185 VITE_EMULATOR_AUTH_PORT=9199 \
//   VITE_USE_EMULATORS=1 DISABLE_HMR=true COMPANION_MOCK=1 PORT=3300 npx tsx server.ts
//   APP_URL=http://localhost:3300 ADMIN_TOKEN=fixes_local node scripts/e2e/fixes.cjs
const { chromium } = require('playwright');
const WebSocket = require('ws');
const APP = process.env.APP_URL || 'http://localhost:3200';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || process.env.SGX_TEST_ADMIN_TOKEN || '';
const TENANT = 'tenant_spatialgineers', EVENT = 'event_live_main';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const PASS = { v: 1, pass: { code: 'SGX26-FIX-0001', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Prueba Fixes', email: 'fixes.e2e@example.com', forgedAt: Date.now() - 86400000 }, callsign: 'FIXES-01', affinity: 'SPARK', avatar: { seed: 'fixes' }, missions: {}, stamps: {}, flags: { forged: true }, contacts: [], xpSpent: 0, redemptions: [] };

function director() {
  const ws = new WebSocket(`${APP.replace(/^http/, 'ws')}/ws?tenantId=${TENANT}&eventId=${EVENT}&userId=fixes_director&role=admin&nickname=Director`);
  const send = (type, payload = {}) => ws.send(JSON.stringify({ type, tenantId: TENANT, eventId: EVENT, payload }));
  const ready = new Promise((res, rej) => {
    ws.on('message', (d) => { const m = JSON.parse(d.toString()); if (m.type === 'AUTH_RESULT') res(m.payload?.isAdmin); });
    ws.on('open', () => send('AUTH', { token: ADMIN_TOKEN }));
    ws.on('error', rej);
  });
  return { ws, send, ready };
}

const ledger = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('sgx_xp_ledger_v1') || '[]'));

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript((pass) => {
    sessionStorage.setItem('sgx_splash_shown', '1');
    localStorage.setItem('sgx_forge_dismissed', '1');
    localStorage.setItem('sgx_forge_nudge_dismissed', '1');
    if (!localStorage.getItem('sgx_identity_v1')) localStorage.setItem('sgx_identity_v1', JSON.stringify(pass));
  }, PASS);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));

  // ---------- 3. routes ----------
  for (const path of ['/studio', '/estudio']) {
    await p.goto(APP + path, { waitUntil: 'domcontentloaded' });
    const ok = await p.waitForSelector('#sgx-studio-page', { timeout: 25000 }).then(() => true).catch(() => false);
    check(`${path} opens Tu Estudio`, ok, p.url().replace(APP, ''));
  }
  await p.goto(APP + '/multiview', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  check('/multiview is not Tu Estudio', !(await p.$('#sgx-studio-page')), p.url().replace(APP, ''));

  // ---------- 1. 360° tour XP ----------
  await p.goto(APP + '/mapa', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#summit-section-map', { timeout: 30000 });
  await p.waitForTimeout(1500);
  const nodeBtns = await p.$$('#summit-section-map button.shrink-0');
  check('360° tour shows its points', nodeBtns.length >= 2, `(${nodeBtns.length})`);
  const before360 = (await ledger(p)).filter((k) => k.startsWith('tour_complete|360|')).length;
  await nodeBtns[1].click(); await p.waitForTimeout(400);
  const after1 = (await ledger(p)).filter((k) => k.startsWith('tour_complete|360|'));
  check('360° point pays XP (ledger entry)', after1.length === before360 + 1, JSON.stringify(after1));
  await nodeBtns[0].click(); await p.waitForTimeout(300);
  await nodeBtns[1].click(); await p.waitForTimeout(300);
  const after2 = (await ledger(p)).filter((k) => k.startsWith('tour_complete|360|'));
  check('the same 360° point never pays twice', after2.filter((k) => k === after1[after1.length - 1]).length === 1 && after2.length === before360 + 2, JSON.stringify(after2));

  // ---------- 2. /play: +25 XP per question ----------
  if (!ADMIN_TOKEN) {
    check('ADMIN_TOKEN set for the director (dev server with SGX_TEST_ADMIN_TOKEN)', false);
  } else {
    const d = director();
    check('director authenticated (local test token)', await d.ready);
    await p.goto(APP + '/play', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    const xpOf = () => p.evaluate(() => JSON.parse(localStorage.getItem('sgx_pilot_profile_v2') || '{}').totalXp || 0);
    const voteFirst = async () => {
      const btn = await p.waitForSelector('main button:has-text("SELECCIONAR"), main button:has-text("SELECT")', { timeout: 15000 }).catch(() => null);
      if (!btn) return false;
      await btn.click(); await p.waitForTimeout(900);
      return true;
    };
    const liveKeys = async () => (await ledger(p)).filter((k) => k.startsWith('live_vote|'));

    d.send('BROADCAST_QUESTION', { index: 0 });
    const xp0 = await xpOf();
    check('voted on question 1', await voteFirst());
    await p.waitForTimeout(1200);
    const k1 = await liveKeys();
    const xp1 = await xpOf();
    check('question 1 pays +25 XP', k1.length === 1 && xp1 - xp0 === 25, `${JSON.stringify(k1)} xp ${xp0}→${xp1}`);

    // The same question again (re-broadcast) pays nothing.
    d.send('CLOSE_VOTING'); await sleep(800);
    d.send('BROADCAST_QUESTION', { index: 0 });
    await voteFirst(); await p.waitForTimeout(1200);
    const xp1b = await xpOf();
    check('re-voting the same question pays nothing', (await liveKeys()).length === 1 && xp1b === xp1, `xp ${xp1}→${xp1b}`);

    // Switch language, next question: pays once more.
    await p.evaluate(() => { try { localStorage.setItem('sgx_summit_language', 'en'); } catch {} });
    d.send('CLOSE_VOTING'); await sleep(800);
    d.send('BROADCAST_QUESTION', { index: 1 });
    await voteFirst(); await p.waitForTimeout(1200);
    const xp2 = await xpOf();
    check('question 2 pays another +25 XP', (await liveKeys()).length === 2 && xp2 - xp1b === 25, `xp ${xp1b}→${xp2}`);

    // REST fallback: identity comes from the server-signed voter token, never the body.
    d.send('CLOSE_VOTING'); await sleep(500);
    d.send('BROADCAST_QUESTION', { index: 2 });
    await sleep(800);
    const state = await (await fetch(`${APP}/api/state?tenantId=${TENANT}&eventId=${EVENT}`)).json().catch(() => ({}));
    const q = state.currentQuestion || {};
    const opt = (q.options || [])[0] || {};
    const body = { tenantId: TENANT, eventId: EVENT, userId: 'someone_else_123', optionId: opt.id, questionId: q.id };
    const noToken = await fetch(`${APP}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    check('POST /api/vote without a voter token is refused (body userId ignored)', noToken.status === 401, String(noToken.status));
    const forged = await fetch(`${APP}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SGX-Voter': 'someone_else_123.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' }, body: JSON.stringify(body) });
    check('POST /api/vote with a forged token is refused', forged.status === 401, String(forged.status));
    // A real socket gets its token in INIT_STATE and can vote once over REST.
    const token = await new Promise((res) => {
      const ws = new WebSocket(`${APP.replace(/^http/, 'ws')}/ws?tenantId=${TENANT}&eventId=${EVENT}&userId=fixes_rest_voter&nickname=Rest`);
      ws.on('message', (dd) => { const m = JSON.parse(dd.toString()); if (m.type === 'INIT_STATE') { res(m.payload?.voterToken || ''); ws.close(); } });
      ws.on('error', () => res(''));
    });
    check('INIT_STATE carries a signed voter token', /^fixes_rest_voter\.[A-Za-z0-9_-]{32}$/.test(token), token.slice(0, 40));
    const ok = await fetch(`${APP}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SGX-Voter': token }, body: JSON.stringify(body) });
    const okJson = await ok.json().catch(() => ({}));
    check('POST /api/vote with the token counts as that socket\'s voter', ok.status === 200 && okJson.user?.id === 'fixes_rest_voter', `${ok.status} ${okJson.user?.id}`);
    const dup = await fetch(`${APP}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SGX-Voter': token }, body: JSON.stringify(body) });
    check('a second REST vote by the same voter is a duplicate', dup.status === 409, String(dup.status));
    let limited = false;
    for (let i = 0; i < 12 && !limited; i++) {
      const r = await fetch(`${APP}/api/vote`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-SGX-Voter': token }, body: JSON.stringify(body) });
      if (r.status === 429) limited = true;
    }
    check('REST votes are rate-limited per voter', limited);
    d.send('CLOSE_VOTING'); await sleep(300);
    d.ws.close();
  }

  check('no page errors', errs.length === 0, errs.join(' | '));
  check('no requests to production Firebase', prodHits.length === 0, prodHits.join(' '));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
