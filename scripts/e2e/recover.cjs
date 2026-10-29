// A pass forged as a GUEST with an email comes back on another device when the person
// signs in with Google with that same (verified) email; the Forge never hangs on "Verificando".
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const run = Date.now().toString(36);
const EMAIL = `dan.${run}@example.com`;
const block = (ctx) => ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
const pass1 = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').pass || null);

(async () => {
  const b = await chromium.launch();
  const errs = [];
  // Device 1: a guest forges with EMAIL.
  const c1 = await b.newContext({ viewport: { width: 1366, height: 900 } }); await block(c1);
  await c1.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p1 = await c1.newPage(); p1.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p1.goto(APP + '/', { waitUntil: 'domcontentloaded' }); await p1.waitForTimeout(7000);
  await p1.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p1.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p1.waitForTimeout(300);
  const start = await p1.$('.sgx-forge button.sgx-btn'); if (start) await start.click(); await p1.waitForTimeout(500);
  await p1.fill('.sgx-forge input[type=email]', EMAIL);
  const inputs = await p1.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Dan Prueba');
  await p1.check('.sgx-forge__consent input');
  await p1.$eval('.sgx-forge form', (f) => f.requestSubmit()); await p1.waitForTimeout(1200);
  await p1.click('.sgx-forge__pillars button >> nth=3');
  await p1.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])'); await p1.waitForTimeout(800);
  await p1.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/'); await p1.waitForTimeout(5000);
  const guestPass = await pass1(p1);
  check('guest forged a pass', guestPass?.email === EMAIL, JSON.stringify(guestPass)?.slice(0, 80));
  await c1.close();

  // Device 2: fresh browser, Google sign-in with the same verified email.
  const c2 = await b.newContext({ viewport: { width: 1366, height: 900 } }); await block(c2);
  await c2.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p2 = await c2.newPage(); p2.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p2.goto(APP + '/', { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(7000);
  await p2.evaluate(async (email) => {
    const m = await import('/src/lib/firebase.ts');
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(JSON.stringify({ sub: 'google-' + email, email, email_verified: true, name: 'Dan' })));
  }, EMAIL);
  await p2.waitForTimeout(5000);
  await p2.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p2.waitForSelector('.sgx-forge', { timeout: 20000 }); await p2.waitForTimeout(3000);
  const restoreBtn = await p2.$('text=/Recuperar mi pase|Restore my pass/');
  check('Forge offers the guest pass back to the Google account', !!restoreBtn);
  if (restoreBtn) { await restoreBtn.click(); await p2.waitForTimeout(4000); }
  const back = await pass1(p2);
  check('restored pass keeps the same code', back?.code === guestPass?.code, `${back?.code} vs ${guestPass?.code}`);

  // The account menu offers Studio and sign-out.
  for (let i = 0; i < 3 && await p2.$('.sgx-hangar, .sgx-forge'); i++) { await p2.keyboard.press('Escape'); await p2.waitForTimeout(500); }
  await p2.screenshot({ path: require('path').join(__dirname, 'out', 'recover_before_menu.png') });
  await p2.click('.sgx-passchip', { timeout: 8000 }); await p2.waitForTimeout(400);
  await p2.screenshot({ path: require('path').join(__dirname, 'out', 'recover_menu.png') });
  const items = await p2.$$eval('.sgx-acct [role=menuitem]', (els) => els.map((e) => e.textContent));
  check('account menu: Estudio + Cerrar sesión', items.some((t) => /Estudio|Studio/.test(t)) && items.some((t) => /Cerrar sesión|Sign out/.test(t)), JSON.stringify(items));
  await c2.close();

  // Device 3: typing that email by hand while signed in with it never hits "already has a pass".
  const c3 = await b.newContext({ viewport: { width: 1366, height: 900 } }); await block(c3);
  await c3.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p3 = await c3.newPage();
  await p3.goto(APP + '/', { waitUntil: 'domcontentloaded' }); await p3.waitForTimeout(7000);
  await p3.evaluate(async (email) => {
    const m = await import('/src/lib/firebase.ts');
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(JSON.stringify({ sub: 'google-other-' + email, email: 'x' + email, email_verified: true, name: 'X' })));
  }, EMAIL);
  await p3.waitForTimeout(4000);
  await p3.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p3.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p3.waitForTimeout(500);
  const s3 = await p3.$('.sgx-forge button.sgx-btn'); if (s3) await s3.click(); await p3.waitForTimeout(500);
  await p3.fill('.sgx-forge input[type=email]', EMAIL);
  const in3 = await p3.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await in3[0].fill('Otra Persona');
  await p3.check('.sgx-forge__consent input');
  const t0 = Date.now();
  await p3.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p3.waitForFunction(() => !/Verificando|Checking/.test(document.querySelector('.sgx-forge')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const msg = await p3.$eval('.sgx-forge', (e) => e.textContent || '');
  check('someone else typing that email gets the clear "already has a pass" message', /ya tiene un SGX Pass|already has an SGX Pass/.test(msg), `${Date.now() - t0} ms`);
  await c3.close();

  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
