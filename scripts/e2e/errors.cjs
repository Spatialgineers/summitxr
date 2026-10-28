// Error monitoring against the EMULATORS: a visitor's page throws, the report lands
// in client_errors (deduped, capped), and the admin sees it in "Errores en vivo".
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
const list = async (col) => ((await (await fetch(`${REST}/${col}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } })).json()).documents || []);
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const RUN = String(Date.now()).slice(-6);

(async () => {
  const b = await chromium.launch();
  const block = (ctx) => ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());

  // 1. Visitor phone
  const vctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await block(vctx);
  await vctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const v = await vctx.newPage();
  await v.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(6000);
  const before = (await list('client_errors')).length;
  await v.evaluate((run) => {
    for (let i = 0; i < 3; i++) setTimeout(() => { throw new TypeError(`e2e boom ${run}`); }, 10 * i);
    Promise.reject(new Error(`e2e rejected ${run}`));
    for (let i = 0; i < 30; i++) setTimeout(() => { throw new Error(`e2e flood ${run} ${i}`); }, 50 + i);
    setTimeout(() => { throw new Error('ResizeObserver loop completed with undelivered notifications.'); }, 5);
  }, RUN);
  await v.waitForTimeout(4000);
  const docs = (await list('client_errors')).filter((d) => (d.fields?.message?.stringValue || '').includes(RUN));
  const msgs = docs.map((d) => d.fields.message.stringValue);
  check('thrown error reported', msgs.some((m) => m === `TypeError: e2e boom ${RUN}`));
  check('repeated error reported once', msgs.filter((m) => m.includes(`boom ${RUN}`)).length === 1);
  check('unhandled promise reported', docs.some((d) => d.fields.kind.stringValue === 'promise'));
  check('at most 15 reports per visit', docs.length <= 15, `(${docs.length})`);
  check('noise (ResizeObserver) ignored', (await list('client_errors')).length - before === docs.length);
  const one = docs[0]?.fields || {};
  check('report has device, page and stack', /iPhone/.test(one.ua?.stringValue || '') && one.viewport?.stringValue === '390x844' && !!one.path && !!one.stack?.stringValue, one.viewport?.stringValue);
  await vctx.close();

  // 2. Admin sees it
  const actx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  await block(actx);
  await actx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p = await actx.newPage();
  const perm = []; p.on('console', (m) => { const t = m.text(); if (/permission|PERMISSION_DENIED/i.test(t)) perm.push(t.slice(0, 200)); });
  await p.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  await p.evaluate(async () => {
    const m = await import('/src/lib/firebase.ts');
    const cred = m.googleProvider.constructor.credential(JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' }));
    await m.signInWithCredential(m.auth, cred);
  });
  await p.waitForTimeout(9000);
  check('nav shows a live error badge', await p.locator('.sgx-admin__badge').first().isVisible().catch(() => false));
  await p.click('.sgx-admin__nav button:has-text("Errores en vivo")');
  await p.waitForTimeout(1500);
  const txt = await p.evaluate(() => document.querySelector('.sgx-admin__main')?.innerText || '');
  check('panel lists the error', txt.includes(`e2e boom ${RUN}`));
  check('panel shows device', /iPhone\/iPad Safari/.test(await (async () => { await p.click(`button:has-text("e2e boom ${RUN}")`); await p.waitForTimeout(400); return p.evaluate(() => document.querySelector('.sgx-admin__main')?.innerText || ''); })()));
  await p.screenshot({ path: `${OUT}/errors_admin.png` });
  p.on('dialog', (d) => d.accept());
  await p.click('button:has-text("Marcar resuelto")');
  await p.waitForTimeout(1500);
  check('resolve deletes that group', !(await list('client_errors')).some((d) => (d.fields?.message?.stringValue || '') === `TypeError: e2e boom ${RUN}`));
  check('no permission errors', perm.length === 0, perm.join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
