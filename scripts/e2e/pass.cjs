// SGX Pass: edit is one form (same pass, no ceremony) and one email = one pass. Emulators only.
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const REST = 'http://127.0.0.1:8085/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents';
const list = async (col) => (((await (await fetch(`${REST}/${col}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } })).json()).documents) || []);
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const EMAIL = `dup.${Date.now() % 1e7}@example.com`;

async function newContext(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => r.abort());
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_nudge_dismissed', '1'); });
  return ctx;
}
async function openForgeToName(p) {
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  await p.click('.sgx-forge button:has-text("Seguir sin cuenta"), .sgx-forge button:has-text("Continue without")');
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', EMAIL);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Dana Dup');
  await p.check('.sgx-forge__consent input');
}

(async () => {
  const b = await chromium.launch();
  // 1. forge a pass
  const ctxA = await newContext(b);
  const a = await ctxA.newPage();
  const errs = [];
  a.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  a.on('console', (m) => { if (/SGX Pass]|permission/i.test(m.text())) console.log('  console:', m.text().slice(0, 200)); });
  await openForgeToName(a);
  await a.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await a.waitForTimeout(1500);
  await a.click('.sgx-forge__pillars button');
  await a.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await a.waitForTimeout(500);
  await a.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await a.waitForTimeout(5000);
  const code = await a.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').pass?.code);
  check('pass forged', !!code, code);
  await a.waitForTimeout(2500);
  check('email claimed (one pass per email)', (await list('pass_emails')).some((d) => d.fields?.code?.stringValue === code));
  await a.keyboard.press('Escape');
  // 2. edit details: one form, no ceremony, same code
  await a.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } })));
  await a.waitForSelector(".sgx-hangar", { timeout: 20000 }); await a.waitForTimeout(1200);
  await a.click('.sgx-hangar button:has-text("Editar datos")');
  await a.waitForTimeout(800);
  check('edit opens one form', await a.evaluate(() => /Edita tus datos/i.test(document.querySelector('.sgx-forge')?.innerText || '')));
  check('edit shows no step-by-step forge', !(await a.$('.sgx-forge__pillars')) && !(await a.$('.sgx-forge__steps:not([hidden])')));
  const org = a.locator('.sgx-forge input[autocomplete=organization]');
  await org.fill('Estudio Editado');
  await a.click('.sgx-forge button:has-text("Guardar cambios")');
  await a.waitForTimeout(2500);
  const after = await a.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').pass);
  check('edit keeps the same pass code', after?.code === code, after?.code);
  check('edit saved the new organization', after?.organization === 'Estudio Editado');
  check('edit lands back in the Hangar', !!(await a.$('.sgx-hangar')) && !(await a.$('.sgx-forge')));
  const regs = (await list('ticket_inquiries')).filter((d) => d.fields?.email?.stringValue === EMAIL);
  check('one registration for the email', regs.length === 1, String(regs.length));
  // 3. another device / person, same email: refused
  const ctxB = await newContext(b);
  const bp = await ctxB.newPage();
  await openForgeToName(bp);
  await bp.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await bp.waitForTimeout(2500);
  const msg = await bp.evaluate(() => document.querySelector('.sgx-forge__error')?.textContent || '');
  check('second pass with the same email is refused', /ya tiene un SGX Pass/.test(msg), msg.slice(0, 80));
  check('stays on the details step', !(await bp.$('.sgx-forge__pillars')));
  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
