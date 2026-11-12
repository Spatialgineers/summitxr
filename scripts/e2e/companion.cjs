/* Highbot companion (and the pillar pages' Day 1 block), against the emulators
   and a dev server started with COMPANION_MOCK=1, so no Claude call is made:
     VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 COMPANION_MOCK=1 npx tsx server.ts
   (COMPANION_SETTINGS_TTL_MS=1000 makes the admin switch test quick.)
   Covers: sample answers without a pass (no server call), the floating head,
   a pass holder as a guest being asked to connect Google (and the server
   refusing guests), the same pass after an (emulated) Google sign-in: the
   question streams back, "take me to the agenda" moves the page, "where is…"
   points at something, the Studio tab hides the head, a wrong pass code is
   refused; the admin switch pauses it; /stats is admin only. */
const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || 'http://localhost:3200';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

const REST = `http://127.0.0.1:${process.env.FS_PORT || 8085}/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents`;
const setSwitch = (enabled) => fetch(`${REST}/site_config/companion`, {
  method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner' },
  body: JSON.stringify({ fields: { enabled: { booleanValue: enabled } } }),
});
const modeIs = async (want) => {
  for (let i = 0; i < 80; i++) {
    const m = await fetch(`${APP}/api/companion/status`).then((r) => r.json()).then((j) => j.mode).catch(() => '');
    if (m === want) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
};
const googleSignIn = (p, who) => p.evaluate(async (who) => {
  const m = await import('/src/lib/firebase.ts');
  const idToken = JSON.stringify({ sub: who.sub, email: who.email, email_verified: true, name: who.name });
  await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
}, who);

const identity = (email) => ({
  v: 1,
  pass: { code: `SGX26-E2E-${Date.now() % 1e6}`, serial: '0099', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Prueba', email, forgedAt: Date.now() },
  callsign: 'NOVA-99', affinity: 'SPARK', avatar: { seed: 'nova' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [],
});

async function context(b, vp, id) {
  const ctx = await b.newContext({ viewport: vp });
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript((idJson) => {
    sessionStorage.setItem('sgx_splash_shown', '1');
    localStorage.setItem('sgx_forge_dismissed', '1');
    localStorage.setItem('sgx_seeded', '1');
    if (idJson) localStorage.setItem('sgx_identity_v1', idJson);
  }, id ? JSON.stringify(id) : '');
  return ctx;
}

(async () => {
  await setSwitch(true);
  check('server runs the companion in mock mode', await modeIs('mock'));
  const bad = await fetch(`${APP}/api/companion/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  check('a request without pass is refused', bad.status === 400, String(bad.status));

  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

  /* ---------- a visitor without a pass ---------- */
  {
    const ctx = await context(b, { width: 1366, height: 900 }, null);
    const p = await ctx.newPage();
    const calls = []; p.on('request', (r) => { if (r.url().includes('/api/companion/chat')) calls.push(r.url()); });
    await p.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.sgx-companion-head', { timeout: 25000 }).catch(() => {});
    check('visitor: the floating head is there', !!(await p.$('.sgx-companion-head')));
    await p.click('.sgx-companion-head');
    await p.waitForSelector('.sgx-companion--pop', { timeout: 5000 }).catch(() => {});
    check('visitor: can type to the backup brain without a pass', /Pregúntame del Summit/.test(await p.$eval('.sgx-companion--pop textarea', (t) => t.placeholder).catch(() => '')));
    check('visitor: the pop-up offers to forge the pass', !!(await p.$('.sgx-companion__cta button')));
    await p.click('.sgx-companion__chip >> nth=0');
    await p.waitForTimeout(2500);
    const answer = await p.$$eval('.sgx-companion__msg.is-bot', (els) => els.map((e) => e.textContent).join(' | '));
    check('visitor: a sample question gets its answer', /11 al 13 de diciembre/.test(answer), answer.slice(-80));
    await p.fill('.sgx-companion--pop textarea', '¿Qué juegos hay?');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => /Torre de Pilares/.test(document.querySelector('.sgx-companion--pop .sgx-companion__log')?.textContent || ''), null, { timeout: 8000 }).catch(() => {});
    const local = await p.$$eval('.sgx-companion__msg.is-bot', (els) => els.map((e) => e.textContent).join(' | '));
    check('visitor: a typed question gets a local answer', /Torre de Pilares/.test(local), local.slice(-90));
    check('visitor: samples and local answers never call the server', calls.length === 0, String(calls.length));
    await p.keyboard.press('Escape');
    await ctx.close();
  }

  /* ---------- a Creador with a forged pass ---------- */
  for (const [name, vp] of [['desk', { width: 1366, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const id = identity(`companion.${name}.${Date.now() % 1e7}@example.com`);
    const ctx = await context(b, vp, id);
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    await p.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.sgx-companion-head', { timeout: 25000 }).catch(() => {});
    // anonymous sign-in, then the pass email claim (the Forge writes it; an injected pass gets it a moment later)
    let claimed = false;
    for (let i = 0; i < 60 && !claimed; i++) {
      claimed = await p.evaluate(async (email) => {
        try {
          const { auth } = await import('/src/lib/firebase.ts');
          const { checkEmailClaim } = await import('/src/identity/passNetwork.ts');
          return !!auth.currentUser && (await checkEmailClaim(email, auth.currentUser.uid)).state === 'mine';
        } catch { return false; }
      }, id.pass.email);
      if (!claimed) await p.waitForTimeout(1000);
    }
    check(`${name}: the pass is registered for this account`, claimed);

    // as a guest: a Google button (the box only reaches the backup brain); the server refuses guests too
    await p.click('.sgx-companion-head');
    await p.waitForSelector('.sgx-companion--pop', { timeout: 8000 }).catch(() => {});
    check(`${name}: a guest is asked to connect Google`, !!(await p.$('.sgx-companion--pop .sgx-companion__cta button')));
    const guest = await p.evaluate(async (pass) => {
      const { auth } = await import('/src/lib/firebase.ts');
      const idToken = await auth.currentUser.getIdToken();
      const r = await fetch('/api/companion/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, email: pass.email, code: pass.code, messages: [{ role: 'user', text: 'hola' }], context: {} }) });
      return `${r.status} ${(await r.json().catch(() => ({}))).error}`;
    }, id.pass);
    check(`${name}: the server refuses a guest`, guest === '403 NEED_GOOGLE', guest);
    await p.keyboard.press('Escape');

    // the same person connects Google with the pass email (a guest who signs in keeps the pass)
    await googleSignIn(p, { sub: `google-${name}-${Date.now() % 1e7}`, email: id.pass.email, name: 'Nova Prueba' });
    await p.waitForTimeout(6000);
    await p.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForSelector('.sgx-companion-head', { timeout: 25000 }).catch(() => {});
    await p.waitForTimeout(3000);
    await p.click('.sgx-companion-head');
    await p.waitForFunction(() => /Pregúntale a tu Highbot/.test(document.querySelector('.sgx-companion--pop textarea')?.placeholder || ''), null, { timeout: 15000 }).catch(() => {});
    check(`${name}: with Google, the pass holder can type to the Highbot`, /Pregúntale a tu Highbot/.test(await p.$eval('.sgx-companion--pop textarea', (t) => t.placeholder).catch(() => '')));
    await p.fill('.sgx-companion--pop textarea', 'Llévame a la agenda');
    await p.keyboard.press('Enter');
    await p.waitForFunction(() => location.pathname === '/agenda', null, { timeout: 8000 }).catch(() => {});
    const said = await p.$$eval('.sgx-companion__msg.is-bot', (els) => els.map((e) => e.textContent).join(' | '));
    check(`${name}: the answer streams in`, /Highbot de prueba/.test(said), said.slice(-90));
    check(`${name}: "take me to the agenda" opens the agenda`, new URL(p.url()).pathname === '/agenda', p.url());
    await p.waitForTimeout(1200);
    await p.fill('.sgx-companion--pop textarea', '¿Dónde están las alertas?');
    await p.keyboard.press('Enter');
    await p.waitForSelector('.sgx-guide-spot', { timeout: 6000 }).catch(() => {});
    check(`${name}: "where is…" points at something on the page`, !!(await p.$('.sgx-guide-spot')));
    await p.screenshot({ path: `${OUT}/companion_${name}_spot.png` });
    await p.keyboard.press('Escape');

    // the server refuses a pass code that is not this account's
    const refused = await p.evaluate(async (email) => {
      const { auth } = await import('/src/lib/firebase.ts');
      const idToken = await auth.currentUser.getIdToken();
      const r = await fetch('/api/companion/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken, email, code: 'SGX26-NOT-MINE', messages: [{ role: 'user', text: 'hola' }], context: {} }) });
      return r.status;
    }, id.pass.email);
    check(`${name}: a wrong pass code is refused`, refused === 403, String(refused));

    // Tu Estudio → Tu Highbot: the chat lives there and the floating head steps aside
    await p.goto(`${APP}/pase`, { waitUntil: 'domcontentloaded' });
    // Tu Estudio is the 3D room: the Highbot capsule (or its classic tab in Lite Mode) opens the chat
    await p.waitForSelector('#sgx-studio-page', { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(800);
    await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:studio_tab', { detail: { tab: 'bot' } })));
    await p.waitForSelector('.sgx-companion-studio', { timeout: 15000 }).catch(() => {});
    check(`${name}: Studio tab shows your Highbot and the chat`, !!(await p.$('.sgx-companion-studio .sgx-companion--studio')));
    check(`${name}: the conversation carries over`, (await p.$$('.sgx-companion--studio .sgx-companion__msg.is-me')).length >= 2);
    check(`${name}: no floating head on the Studio tab`, !(await p.$('.sgx-companion-head')));
    await p.screenshot({ path: `${OUT}/companion_${name}_studio.png` });
    check(`${name}: no page errors`, errs.length === 0, errs.join(' / '));
    await ctx.close();
  }

  /* ---------- pillar pages: Day 1 use cases and the Highcoon band ---------- */
  {
    const ctx = await context(b, { width: 1366, height: 900 }, null);
    const p = await ctx.newPage();
    await p.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    await p.evaluate(async () => { const { navigateToPillar } = await import('/src/immersion/navigation.ts'); navigateToPillar('story'); });
    await p.waitForSelector('.sgx-station__day1', { timeout: 15000 }).catch(() => {});
    check('Story page has its Day 1 use cases', (await p.$$('.sgx-station__day1 .sgx-portfolio__item')).length >= 1);
    check('Story page has the Highcoon band with its links', (await p.$$('.sgx-highcoon__links a')).length === 3);
    check('no links to Spatial (it closed)', !(await p.$('a[href*="spatial.io"]')));
    await p.evaluate(async () => { const { navigateToPillar } = await import('/src/immersion/navigation.ts'); navigateToPillar('stage'); });
    await p.waitForTimeout(1500);
    check('Stage page lists its Day 1 use cases', (await p.$$('.sgx-station__day1 .sgx-portfolio__item')).length >= 2);
    check('Highcoon band only on Story', !(await p.$('.sgx-highcoon')));
    await p.evaluate(() => document.querySelector('.sgx-station__day1')?.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/companion_stage_day1.png` });
    await ctx.close();
  }

  /* ---------- the admin switch and the numbers ---------- */
  {
    const r401 = await fetch(`${APP}/api/companion/stats`);
    check('stats are for admins only', r401.status === 401, String(r401.status));
    const ctx = await context(b, { width: 1366, height: 900 }, null);
    const p = await ctx.newPage();
    await p.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(5000);
    await googleSignIn(p, { sub: 'google-info-admin', email: 'info@spatialgineers.com', name: 'SGX Admin' });
    await p.waitForTimeout(3000);
    const st = await p.evaluate(async () => {
      const { auth } = await import('/src/lib/firebase.ts');
      const r = await fetch('/api/companion/stats', { headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` } });
      return { status: r.status, body: await r.json().catch(() => ({})) };
    });
    check('an admin sees today\'s numbers', st.status === 200 && typeof st.body.spentUsd === 'number' && st.body.messages >= 2 && st.body.blocked?.need_google >= 1, JSON.stringify(st.body).slice(0, 160));
    await ctx.close();

    await setSwitch(false);
    check('switching it off in the admin pauses it', await modeIs('paused'));
    const paused = await fetch(`${APP}/api/companion/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    check('a paused Highbot answers nothing', paused.status === 503, String(paused.status));
    const ctx2 = await context(b, { width: 1366, height: 900 }, identity(`paused.${Date.now() % 1e7}@example.com`));
    const p2 = await ctx2.newPage();
    await p2.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await p2.waitForTimeout(9000);
    check('no floating head while paused', !(await p2.$('.sgx-companion-head')));
    await ctx2.close();
    await setSwitch(true);
    check('switching it back on', await modeIs('mock'));
  }

  await b.close();
  console.log(`DONE ${pass} pass ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
