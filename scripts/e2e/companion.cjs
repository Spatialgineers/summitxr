/* Highbot companion (and the pillar pages' Day 1 block), against the emulators
   and a dev server started with COMPANION_MOCK=1, so no Claude call is made:
     VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 COMPANION_MOCK=1 npx tsx server.ts
   Covers: sample answers without a pass (no server call), the floating head,
   a pass holder's question streaming back, "take me to the agenda" moving the
   page, "where is…" pointing at something, the Studio tab hiding the head,
   and the server refusing a wrong pass code. */
const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || 'http://localhost:3200';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

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
  const status = await fetch(`${APP}/api/companion/status`).then((r) => r.json()).catch(() => ({}));
  check('server runs the companion in mock mode', status.mode === 'mock', JSON.stringify(status));
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
    check('visitor: no question box without a pass', !(await p.$('.sgx-companion--pop textarea')));
    check('visitor: the pop-up offers to forge the pass', !!(await p.$('.sgx-companion__cta button')));
    await p.click('.sgx-companion__chip >> nth=0');
    await p.waitForTimeout(2500);
    const answer = await p.$$eval('.sgx-companion__msg.is-bot', (els) => els.map((e) => e.textContent).join(' | '));
    check('visitor: a sample question gets its answer', /11 al 13 de diciembre/.test(answer), answer.slice(-80));
    check('visitor: samples never call the server', calls.length === 0, String(calls.length));
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
    for (let i = 0; i < 30 && !claimed; i++) {
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
    await p.click('.sgx-companion-head');
    await p.waitForSelector('.sgx-companion--pop textarea', { timeout: 8000 }).catch(() => {});
    check(`${name}: pass holder can type to the Highbot`, !!(await p.$('.sgx-companion--pop textarea')));
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
    await p.waitForSelector('[data-guide="estudio-bot"]', { timeout: 20000 }).catch(() => {});
    await p.click('[data-guide="estudio-bot"]');
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
    check('Story page has the Highcoon band with its links', (await p.$$('.sgx-highcoon__links a')).length === 4);
    await p.evaluate(async () => { const { navigateToPillar } = await import('/src/immersion/navigation.ts'); navigateToPillar('stage'); });
    await p.waitForTimeout(1500);
    check('Stage page lists its Day 1 use cases', (await p.$$('.sgx-station__day1 .sgx-portfolio__item')).length >= 2);
    check('Highcoon band only on Story', !(await p.$('.sgx-highcoon')));
    await p.evaluate(() => document.querySelector('.sgx-station__day1')?.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/companion_stage_day1.png` });
    await ctx.close();
  }

  await b.close();
  console.log(`DONE ${pass} pass ${fail} fail`);
  process.exit(fail ? 1 : 0);
})();
