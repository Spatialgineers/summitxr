// Screenshots for the illustrated guide (docs/guia/Guia_WebApp_Spatialgineers_Summit_2026.pdf).
// Runs ONLY against a local dev server + the Firebase EMULATORS (never production):
//   emulators on FS_PORT / AUTH_PORT, server started with VITE_USE_EMULATORS=1 and the
//   matching VITE_EMULATOR_* ports (and COMPANION_MOCK=1 so the Highbot chat costs nothing).
//   APP_URL=http://localhost:3400 FS_PORT=8285 node scripts/guide-pdf/shots.cjs [only-prefix]
// Writes JPEGs to scripts/guide-pdf/out/shots/. Then run build.cjs.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:3400';
if (!/^http:\/\/(localhost|127\.0\.0\.1)/.test(APP)) throw new Error('APP_URL must be a local server with emulators');
const FS_PORT = process.env.FS_PORT || 8085;
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:${FS_PORT}/v1/projects/${PROJECT}/databases/${DB}/documents`;
const OUT = path.join(__dirname, 'out', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const ONLY = process.argv[2] || '';

/* ---------- emulator seeding (REST, owner token = emulator only) ---------- */
const val = (v) => {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, val(x)])) } };
};
const put = async (p, obj) => {
  const r = await fetch(`${REST}/${p}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: Object.fromEntries(Object.entries(obj).map(([k, x]) => [k, val(x)])) }) });
  if (!r.ok) console.log('seed failed', p, r.status, (await r.text()).slice(0, 200));
};

const now = Date.now();
const H = 3600e3;
async function seed() {
  await fetch(`http://127.0.0.1:${FS_PORT}/emulator/v1/projects/${PROJECT}/databases/${DB}/documents`, { method: 'DELETE' });
  const people = [
    ['Luis Ortiz', 'Isla Games', 'Founder', 'SGX26-LUIS-0101', 'SHOWCASE_PHYSICAL', 'INVITED', 'SPARK'],
    ['María Santos', 'Ola Media', 'Productora', 'SGX26-MARI-0102', 'DIGITAL', null, 'STAGE'],
    ['Jorge Vélez', 'Banco Caribe', 'Innovación', 'SGX26-JORG-0103', 'SHOWCASE_PHYSICAL', null, 'SYSTEM'],
    ['Camila Ríos', 'UPR Mayagüez', 'Estudiante', 'SGX26-CAMI-0104', 'DIGITAL', null, 'STORY'],
    ['Diego Marrero', 'Coquí Labs', 'CTO', 'SGX26-DIEG-0105', 'SHOWCASE_PHYSICAL', 'CONFIRMED', 'SYNTHESIZE'],
  ];
  for (const [i, [n, o, r, c, tt, st, aff]] of people.entries()) {
    const d = { email: `${n.split(' ')[0].toLowerCase()}.demo@example.com`, fullName: n, organization: o, roleTitle: r, referenceCode: c, ticketType: tt, userId: 'demo-' + i, affinity: aff, imageConsent: true, timestamp: new Date(now - (i + 2) * H) };
    if (st) d.status = st;
    await put(`ticket_inquiries/${c}`, d);
    await put(`pilot_leaderboard/demo-${i}`, { callsign: n.split(' ')[0].toUpperCase() + '-0' + (i + 1), totalXp: 2400 - i * 380, level: Math.floor((2400 - i * 380) / 500) + 1, rank: 'Creador', updatedAt: new Date(now - i * H) });
  }
  await put('sponsor_inquiries/inq_demo_cafe', { id: 'inq_demo_cafe', companyName: 'Café Montaña', contactName: 'Elena Torres', roleTitle: 'Mercadeo', email: 'elena.demo@example.com', phone: '787-555-0142', selectedTierId: 'tier_3', selectedTierName: 'Paquete 3 · Experience', status: 'PENDING_REVIEW', referenceCode: 'SGX-SPONSOR-2026-014', submittedAt: now - 5 * H, goals: ['Visibilidad', 'Leads'], customMessage: 'Queremos una estación en el núcleo 3D y un reto en el Reactor.' });
  await put('sponsor_inquiries/press_demo_1', { id: 'press_demo_1', companyName: 'Revista Isla Digital', contactName: 'Paola Méndez', roleTitle: 'Editora de tecnología', email: 'paola.demo@example.com', phone: '787-555-0190', websiteUrl: 'https://islatech.example.com', selectedTierId: 'PRESS', selectedTierName: 'Prensa · Digital', goals: ['TYPE:digital', 'DAY:1', 'DAY:3', 'CLIP:https://islatech.example.com/xr', 'PASS:SGX26-PAOL-0201', 'CONSENT:yes'], customMessage: 'Cobertura del keynote y una nota del SGX Showcase en Chroma.', submittedAt: now - 3 * H, status: 'PENDING_REVIEW', referenceCode: 'SGX-PRESS-2026-003' });
  await put('speaker_submissions/spk_demo_1', { id: 'spk_demo_1', name: 'Natalia Cruz', role: 'Directora de arte XR', organization: 'Estudio Brisa', handle: '@nataliaxr', bio: 'Diseña experiencias inmersivas para museos y marcas en el Caribe. Diez años creando mundos en tiempo real.', pillarId: 'SHOWCASE', day: 2, isKeynote: false, socialLinks: { linkedin: 'https://linkedin.com/in/nataliaxr' }, submittedAt: new Date(now - 6 * H) });
  await put('leads/sponsor_inq_demo_cafe', { kind: 'sponsor', ref: 'inq_demo_cafe', name: 'Café Montaña', email: 'elena.demo@example.com', organization: 'Café Montaña', source: 'solicitud', status: 'TALKING', note: 'Llamar el martes: quiere Paquete 3.', interest: ['SHOWCASE', 'SPARK'], flaggedBy: 'info@spatialgineers.com', flaggedAt: new Date(now - 4 * H), updatedAt: new Date(now - 2 * H) });
  await put('leads/visitor_SGX26-JORG-0103', { kind: 'visitor', ref: 'SGX26-JORG-0103', name: 'Jorge Vélez', email: 'jorge.demo@example.com', organization: 'Banco Caribe', role: 'Innovación', source: 'rolodex', status: 'NEW', note: 'Activación XR para un lanzamiento en marzo.', interest: ['SYSTEM'], flaggedBy: 'info@spatialgineers.com', flaggedAt: new Date(now - 7 * H), updatedAt: new Date(now - 7 * H) });
  await put('site_config/announcement', { title: 'Keynote en 15 minutos', message: 'Abre SGX Live y prepárate para votar desde tu teléfono.', priority: 'HIGH', actionUrl: '/play', actionLabel: 'Ir a SGX Live', active: false, updatedAt: new Date(now) });
  const regs = [['san_juan', 'San Juan', 18.3888, -66.0606, 412], ['bayamon', 'Bayamón', 18.3473, -66.1702, 188], ['mayaguez', 'Mayagüez', 18.2069, -67.1105, 164], ['ponce', 'Ponce', 18.0604, -66.62, 121], ['caguas', 'Caguas', 18.2186, -66.0537, 97], ['carolina', 'Carolina', 18.3778, -65.9618, 86]];
  for (const [id, name, lat, lon, n] of regs) await put(`summit_visit_regions/pr_${id}`, { name, kind: 'municipio', country: 'PR', lat, lon, totalVisits: n, uniqueVisitors: Math.round(n * 0.6), lastVisitAt: new Date(now - H) });
  for (const [id, name, cc, lat, lon, n] of [['us_florida', 'Florida, EE. UU.', 'US', 27.8, -81.7, 74], ['us_new_york', 'New York, EE. UU.', 'US', 42.9, -75.5, 52], ['cc_mx', 'México', 'MX', 23.6, -102.5, 31], ['cc_es', 'España', 'ES', 40.4, -3.7, 22], ['cc_co', 'Colombia', 'CO', 4.6, -74.1, 18]])
    await put(`summit_visit_regions/${id}`, { name, kind: cc === 'US' ? 'state' : 'country', country: cc, lat, lon, totalVisits: n, uniqueVisitors: Math.round(n * 0.6), lastVisitAt: new Date(now - 2 * H) });
  await put('summit_visit_stats/global', { totalVisits: 1275, uniqueVisitors: 768, updatedAt: new Date(now) });
}

/* ---------- browser helpers ---------- */
const MOB = { width: 390, height: 844 };
const DESK = { width: 1440, height: 900 };
const VISITOR_EMAIL = 'andrea.rivera@example.com';
const shots = [];
async function ctxFor(b, { desk = false, state } = {}) {
  const ctx = await b.newContext({
    viewport: desk ? DESK : MOB, deviceScaleFactor: desk ? 1.5 : 2, isMobile: !desk, hasTouch: !desk, locale: 'es-PR', storageState: state,
  });
  // Never reach the real Firebase project; no IP geolocation.
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => {
    sessionStorage.setItem('sgx_splash_shown', '1');
    sessionStorage.setItem('sgx_sponsor_pop_at', String(Date.now()));
    sessionStorage.setItem('sgx_hero_formed', '1');
    try { localStorage.setItem('sgx_lang', 'es'); } catch {}
  });
  return ctx;
}
const HIDE = '.sgx-nudge,.sgx-cell,.sgx-sponsorpop,.sgx-xp-toast,[class*="HudToast"],.sgx-hudtoasts{display:none!important} *{caret-color:transparent!important}';
async function tidy(p) {
  await p.addStyleTag({ content: HIDE }).catch(() => {});
  // The guide shows the public address, never the local one.
  await p.evaluate(() => {
    const re = /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/g, re2 = /(localhost|127\.0\.0\.1)(:\d+)?/g;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n; while ((n = w.nextNode())) if (/localhost|127\.0\.0\.1/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(re, 'https://summit.spatialgineers.com').replace(re2, 'summit.spatialgineers.com');
    document.querySelectorAll('input,textarea').forEach((el) => { if (/localhost|127\.0\.0\.1/.test(el.value)) el.value = el.value.replace(re, 'https://summit.spatialgineers.com').replace(re2, 'summit.spatialgineers.com'); });
  }).catch(() => {});
}
async function settle(p, ms = 2500) {
  await p.waitForTimeout(ms);
  // wait (up to 12 s) until no visible "Cargando…" / spinner text
  for (let i = 0; i < 24; i++) {
    const busy = await p.evaluate(() => /Cargando|Loading…|Conectando…/.test(document.body.innerText)).catch(() => false);
    if (!busy) break;
    await p.waitForTimeout(500);
  }
}
async function shot(p, name, opts = {}) {
  if (ONLY && !name.startsWith(ONLY)) return;
  await tidy(p);
  await p.waitForTimeout(400);
  const file = path.join(OUT, `${name}.jpg`);
  if (opts.el) await p.locator(opts.el).first().screenshot({ path: file, type: 'jpeg', quality: 82 });
  else await p.screenshot({ path: file, type: 'jpeg', quality: 82, fullPage: !!opts.full });
  shots.push(name);
  console.log('shot', name);
}
const tryDo = async (label, fn) => { try { await fn(); } catch (e) { console.log('SKIP', label, String(e.message).split('\n')[0].slice(0, 140)); } };
const toTop = (p) => p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop > 0) e.scrollTop = 0; }); }).catch(() => {});
async function go(p, route, wait = 4500) { await p.goto(APP + route, { waitUntil: 'domcontentloaded' }); await settle(p, wait); if (!route.includes('#')) { await toTop(p); await p.waitForTimeout(400); } }
async function googleSignIn(p, email, name, sub) {
  await p.evaluate(async ([email, name, sub]) => {
    const m = await import('/src/lib/firebase.ts');
    const idToken = JSON.stringify({ sub, email, email_verified: true, name });
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
  }, [email, name, sub]);
}
const openHangar = (p, tab) => p.evaluate((tab) => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab } })), tab);


/* ---------- a live question on the engine (dev server started with SGX_TEST_ADMIN_TOKEN) ---------- */
const TENANT = 'tenant_spatialgineers', EVENT = 'event_live_main';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'x';
function sock(userId, extra = '') {
  const ws = new WebSocket(`${APP.replace(/^http/, 'ws')}/ws?tenantId=${TENANT}&eventId=${EVENT}&userId=${userId}&nickname=${userId}${extra}`);
  const send = (type, payload = {}) => ws.send(JSON.stringify({ type, tenantId: TENANT, eventId: EVENT, payload }));
  return { ws, send, open: new Promise((r) => ws.addEventListener('open', r)) };
}
async function liveQuestion(index = 0) {
  const d = sock('guide_director', '&role=admin');
  await d.open; d.send('AUTH', { token: ADMIN_TOKEN });
  await new Promise((r) => setTimeout(r, 800));
  let q = null;
  d.ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.type === 'QUESTION_START') q = m.payload.question; });
  d.send('BROADCAST_QUESTION', { index });
  for (let i = 0; i < 20 && !q; i++) await new Promise((r) => setTimeout(r, 200));
  if (!q) { console.log('no live question'); return; }
  const names = ['LUIS-01', 'MARIA-02', 'JORGE-03', 'CAMILA-04', 'DIEGO-05', 'PAOLA-06', 'NATI-07', 'ELENA-08', 'ANA-09', 'RAUL-10', 'SOFIA-11'];
  for (const [i, n] of names.entries()) {
    const a = sock(n); await a.open;
    const opt = q.options[[0, 1, 0, 2, 0, 1, 0, 3, 1, 0, 2][i] % q.options.length];
    a.send('SUBMIT_VOTE', { questionId: q.id, optionId: opt.id, nickname: n });
  }
  await new Promise((r) => setTimeout(r, 1200));
}

(async () => {
  await seed();
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });

  /* ===== 1. First visit + the Forge (phone, no pass) ===== */
  let state;
  {
    const ctx = await ctxFor(b); const p = await ctx.newPage();
    await go(p, '/', 12000);
    await shot(p, 'v01-nucleo-hero');
    await tryDo('forge', async () => {
      await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
      await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(1200);
      await shot(p, 'v02-forja-intro');
      const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
      await p.waitForTimeout(700);
      const ins = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
      await ins[0].fill('Andrea Rivera');
      await p.fill('.sgx-forge input[type=email]', VISITOR_EMAIL);
      if (ins[1]) await ins[1].fill('Estudio Coquí');
      if (ins[2]) await ins[2].fill('Directora creativa');
      await p.click('.sgx-forge__tiers label:has(strong:text-matches("^(Día 3 presencial|Day 3 in person)$"))');
      await p.check('.sgx-forge__consent input');
      await p.evaluate(() => document.querySelector('.sgx-forge__tiers')?.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(500);
      await shot(p, 'v03-forja-datos');
      await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
      await p.waitForTimeout(1500);
      await p.click('.sgx-forge__pillars button >> nth=1');
      await p.waitForTimeout(800);
      await shot(p, 'v04-forja-pilar');
      await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
      await settle(p, 5000);
      await shot(p, 'v05-forja-highbot');
      await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
      await p.waitForTimeout(9000);
      await shot(p, 'v06-forja-lista');
    });
    // a couple of contacts for the Rolodex / Red tabs (as a real scan would leave them)
    await p.evaluate(() => {
      const id = JSON.parse(localStorage.getItem('sgx_identity_v1'));
      id.contacts = [
        { code: 'SGX26-LUIS-0101', name: 'Luis Ortiz', callsign: 'LUIS-01', pillar: 'SPARK', role: 'Founder', organization: 'Isla Games', via: 'scanned', at: Date.now() - 3600e3 },
        { code: 'SGX26-MARI-0102', name: 'María Santos', callsign: 'MARIA-02', pillar: 'STAGE', role: 'Productora', organization: 'Ola Media', via: 'received', at: Date.now() - 7200e3 },
        { code: 'SGX26-DIEG-0105', name: 'Diego Marrero', callsign: 'DIEGO-05', pillar: 'SYNTHESIZE', role: 'CTO', organization: 'Coquí Labs', via: 'scanned', at: Date.now() - 9000e3 },
      ];
      localStorage.setItem('sgx_identity_v1', JSON.stringify(id));
      localStorage.setItem('sgx_forge_dismissed', '1');
    });
    state = await ctx.storageState();
    await ctx.close();
  }

  /* ===== 2. Visitor with a pass (phone) ===== */
  {
    const ctx = await ctxFor(b, { state }); const p = await ctx.newPage();
    // Visit the modules (this also fills the Reactor with real progress).
    await go(p, '/agenda', 5000);
    await googleSignIn(p, VISITOR_EMAIL, 'Andrea Rivera', 'google-andrea-demo');
    await p.waitForTimeout(9000);
    await go(p, '/', 11000);
    await shot(p, 'v07-nucleo-pase');
    await tryDo('pillar sheet', async () => {
      await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /SHOWCASE/i.test(x.textContent || '') && /02/.test(x.textContent || ''))?.click());
      await p.waitForTimeout(6000); await shot(p, 'v08-nucleo-pilar');
    });
    await tryDo('menu', async () => { await go(p, '/agenda', 3000); await p.getByRole('button', { name: /men[uú]/i }).filter({ visible: true }).last().click(); await p.waitForTimeout(1500); await shot(p, 'v09-menu'); await p.keyboard.press('Escape'); });
    const pages = [
      ['m01-pilar-story', '/pilar/story'], ['m02-pilares', '/pilares'], ['m03-social', '/social'], ['m04-avatar', '/avatar'],
      ['m05-mapa', '/mapa'], ['m06-sponsors', '/sponsors'], ['m07-modelos', '/modelos-3d'], ['m08-patrocina', '/patrocina'],
      ['m09-juegos', '/juegos'], ['m10-tienda', '/tienda'], ['m11-agenda', '/agenda'], ['m12-broadcast', '/broadcast'],
      ['m13-speakers', '/speakers'], ['m14-portal-speakers', '/portal-speakers'], ['m15-prensa', '/prensa'], ['m16-visitas', '/visitas'],
      ['m17-escaner', '/escaner'], ['m18-terminal', '/terminal'], ['m19-match', '/match'], ['m20-networking', '/networking'], ['m21-guild', '/guild'],
    ];
    for (const [name, route] of pages) await tryDo(name, async () => { await go(p, route, 6000); await shot(p, name); });
    await tryDo('mi qr', async () => { await go(p, '/escaner', 5000); await p.click('text=/^\\s*MI QR\\s*$/i'); await p.waitForTimeout(2000); await shot(p, 'm17b-mi-qr'); });
    await tryDo('mapa 360', async () => { await go(p, '/mapa', 12000); await shot(p, 'm05b-mapa-360'); });
    await tryDo('terminos', async () => { await go(p, '/sponsors#terminos', 6000); await p.evaluate(() => document.getElementById('terminos')?.scrollIntoView()); await p.waitForTimeout(1500); await shot(p, 'm06b-terminos'); });
    await tryDo('paquetes', async () => { await go(p, '/sponsors', 5000); await p.evaluate(() => { const h = [...document.querySelectorAll('h2,h3')].find((x) => /Paquete/i.test(x.textContent || '')); h?.scrollIntoView(); }); await p.waitForTimeout(1500); await shot(p, 'm06c-paquetes'); });
    await tryDo('guia speaker', async () => { await go(p, '/portal-speakers', 5000); const g = p.locator('text=/Guía del speaker/i').first(); await g.click(); await p.waitForTimeout(1200); await g.scrollIntoViewIfNeeded(); await shot(p, 'm14b-guia-speaker'); });
    await tryDo('agenda mi', async () => { await go(p, '/agenda', 5000); await p.click('button:has-text("Mi Agenda")'); await p.waitForTimeout(2500); await shot(p, 'm11b-mi-agenda'); });
    // Tu Estudio
    await go(p, '/pase', 7000);
    await shot(p, 'e00-estudio-top');
    await p.evaluate(() => { const t = document.querySelector('[data-guide="estudio-pass"]'); t?.parentElement?.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(800);
    await shot(p, 'e01-estudio-pase');
    for (const [tab, name] of [['bot', 'e02-estudio-highbot'], ['reactor', 'e03-estudio-reactor'], ['stars', 'e04-estudio-red'], ['rolodex', 'e05-estudio-rolodex'], ['day3', 'e06-estudio-dia3'], ['log', 'e07-estudio-telemetria']]) {
      await tryDo(name, async () => { await p.click(`[data-guide="estudio-${tab}"]`); await settle(p, 3500); await p.evaluate(() => { const t = document.querySelector('[data-guide="estudio-pass"]'); t?.parentElement?.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(600); await shot(p, name); });
    }
    await tryDo('holo studio', async () => {
      await p.click('[data-guide="estudio-pass"]'); await p.waitForTimeout(1500);
      await p.evaluate(() => { const t = document.querySelector('[data-guide="estudio-pass"]'); t?.parentElement?.scrollIntoView({ block: 'start' }); });
      await p.getByRole('button', { name: /Post 4:5/ }).first().click(); await settle(p, 2500);
      await p.getByRole('button', { name: /Post 4:5/ }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }));
      await p.waitForTimeout(800); await shot(p, 'e08-holo-studio');
      await p.keyboard.press('Escape');
    });
    await tryDo('reactor popup', async () => { await go(p, '/agenda', 4000); await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_passport'))); await p.waitForTimeout(2500); await shot(p, 'r01-reactor'); await p.keyboard.press('Escape'); });
    // Live
    await tryDo('play', async () => { await go(p, '/play', 6000); await liveQuestion(0); await p.waitForTimeout(2500); await shot(p, 'l01-play'); });
    // Welcome portals
    for (const [name, route] of [['w01-bienvenida', '/bienvenida'], ['w02-bienvenida-speaker', '/bienvenida/speaker'], ['w03-bienvenida-sponsor', '/bienvenida/sponsor'], ['w04-bienvenida-prensa', '/bienvenida/prensa']])
      await tryDo(name, async () => { await go(p, route, 5000); await shot(p, name); });
    // Highbot companion (pass + Google)
    await tryDo('companion', async () => {
      await go(p, '/agenda', 5000);
      await p.click('.sgx-companion-head', { force: true }); await p.waitForTimeout(1500);
      await shot(p, 'h01-highbot-abierto');
      const ta = p.locator('.sgx-companion--pop textarea, .sgx-companion textarea').first();
      await ta.fill('¿Qué puedo hacer el Día 3?'); await p.keyboard.press('Enter'); await p.waitForTimeout(5000);
      await shot(p, 'h02-highbot-chat');
    });
    await ctx.close();
  }

  /* ===== 3. Desktop views ===== */
  {
    const ctx = await ctxFor(b, { desk: true, state }); const p = await ctx.newPage();
    await tryDo('nucleo desk', async () => { await go(p, '/', 12000); await shot(p, 'd01-nucleo-desktop'); });
    await tryDo('pilar desk', async () => { await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => /STAGE/i.test(x.textContent || '') && /04/.test(x.textContent || ''))?.click()); await p.waitForTimeout(6000); await shot(p, 'd02-nucleo-pilar-desktop'); });
    await tryDo('stage', async () => { await go(p, '/stage', 8000); await liveQuestion(1); await p.waitForTimeout(4000); await shot(p, 'l02-stage-desktop'); });
    await tryDo('agenda desk', async () => { await go(p, '/agenda', 6000); await shot(p, 'd03-agenda-desktop'); });
    await ctx.close();
  }

  /* ===== 4. Admin (desktop, emulated Google sign-in as info@) ===== */
  {
    const ctx = await ctxFor(b, { desk: true }); const p = await ctx.newPage();
    await p.addInitScript(() => localStorage.setItem('sgx_forge_dismissed', '1'));
    await go(p, '/?page=admin', 7000);
    await googleSignIn(p, 'info@spatialgineers.com', 'Equipo Spatialgineers', 'google-info-admin');
    await p.waitForTimeout(9000);
    await shot(p, 'a00-centro-de-mando');
    const sections = [
      'Consola del director', 'Anuncios', 'Encuestas del keynote', 'Errores en vivo',
      'Agenda / Run of Show', 'Speakers', 'Sponsors', 'Paquetes de auspicio', 'Guild Initiates', 'Mapa 360', 'Apps embebidas', 'Redes sociales', 'Pilares: casos y proyectos', 'Highbot: control y preguntas', 'Portal de bienvenida',
      'Inscritos y Día 3', 'Prensa', 'Clientes potenciales', 'Audiencia y leads', 'Entrepreneur Match',
      'Tienda del Reactor', 'Misiones', 'Preguntas en vivo',
      'Analítica', 'Marca y tenants', 'Efectos visuales', 'Funciones y QA', 'Admins', 'Respaldo y restauración',
    ];
    for (const [i, label] of sections.entries()) {
      const name = `a${String(i + 1).padStart(2, '0')}-` + label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');
      await tryDo(label, async () => {
        await p.click(`.sgx-admin__nav button:has-text("${label}")`);
        await settle(p, 3500);
        await p.evaluate(() => { window.scrollTo(0, 0); document.querySelectorAll('*').forEach((e) => { if (e.scrollTop > 0) e.scrollTop = 0; }); });
        await shot(p, name);
      });
    }
    await tryDo('checkin code', async () => {
      await p.click('.sgx-admin__nav button:has-text("Inscritos y Día 3")'); await settle(p, 3000);
      await p.evaluate(() => document.querySelector('input[placeholder="chroma-xxxxxxxx"]')?.scrollIntoView({ block: 'center' }));
      await p.waitForTimeout(800); await shot(p, 'a16b-checkin-dia3');
    });
    await ctx.close();
  }

  await b.close();
  console.log('DONE', shots.length, 'shots');
})();
