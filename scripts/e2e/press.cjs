// Press room end-to-end against the EMULATORS: /prensa gate → forge → accreditation form →
// tracking code; admin (emulated Google info@) approves in Personas → Prensa (counter, same-outlet
// warning, CSV); the pass becomes PRENSA and is invited to Day 3; /bienvenida/prensa; closed state.
// Screenshots at 390×844 and 1440×900 in scripts/e2e/out/press_*.png.
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
const get = async (path) => (await fetch(`${REST}/${path}`, { headers: { Authorization: 'Bearer owner' } })).json();
const put = (path, fields) => fetch(`${REST}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }).then((r) => r.json());
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const S = (v) => ({ stringValue: v });
const SIZES = { m: { width: 390, height: 844 }, d: { width: 1440, height: 900 } };
const RUN = Date.now().toString(36).slice(-5).toUpperCase();
const OUTLET = `Medio Prueba ${RUN}`;

async function context(b, size, extra) {
  const ctx = await b.newContext({ viewport: SIZES[size], acceptDownloads: true, ...(size === 'm' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  ctx.prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { ctx.prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); });
  if (extra) await ctx.addInitScript(extra);
  return ctx;
}

async function forge(p, email, name) {
  if (!(await p.$('.sgx-forge'))) await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', email);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill(name);
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(500);
  await p.click('.sgx-forge__pillars button');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(500);
  await p.click('.sgx-forge >> text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(4500);
  await p.keyboard.press('Escape');
  await p.evaluate(() => localStorage.setItem('sgx_forge_dismissed', '1'));
  await p.waitForTimeout(500);
}

const shot = (p, name, full = false) => p.screenshot({ path: `${OUT}/press_${name}.png`, fullPage: full });
const toSection = (p, id) => p.evaluate((i) => document.getElementById(i)?.scrollIntoView({ block: 'start' }), id);

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const prod = [];

  /* ---------- 1. visitor (390): gate, forge, form, submit ---------- */
  const vctx = await context(b, 'm');
  const v = await vctx.newPage();
  const errs = [];
  v.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await v.goto(APP + '/press', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(8000);
  await v.keyboard.press('Escape');
  check('/press alias opens the press room on /prensa', !!(await v.$('#summit-section-prensa')) && new URL(v.url()).pathname === '/prensa', v.url());
  await toSection(v, 'acreditacion'); await v.waitForTimeout(400);
  check('without a pass: "Forja tu pase primero"', await v.isVisible('text=Forja tu pase primero'));
  await shot(v, 'm_gate');
  check('kit links: ZIP and PDF', !!(await v.$('a[href="/press/spatialgineers-summit-2026-kit-de-prensa.zip"]')) && !!(await v.$('a[href="/press/spatialgineers-summit-2026-ficha-de-prensa.pdf"]')));
  const zipOk = await v.evaluate(async () => (await fetch('/press/spatialgineers-summit-2026-kit-de-prensa.zip', { method: 'HEAD' })).ok);
  check('ZIP is served', zipOk);
  check('bios of both founders on the page', await v.evaluate(() => /Danelson Maldonado González/.test(document.body.innerText) && /Ricardo A\. Hernández Díaz/.test(document.body.innerText)));

  await forge(v, `prensa.${RUN.toLowerCase()}@example.com`, 'Pat Prensa');
  await v.goto(APP + '/prensa', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(7000);
  await toSection(v, 'acreditacion'); await v.waitForTimeout(400);
  check('with a pass: the form shows', !!(await v.$('.sgx-press-form')));
  await shot(v, 'm_form');
  // empty submit → errors
  await v.$eval('.sgx-press-form', (f) => f.requestSubmit());
  await v.waitForTimeout(300);
  check('validation errors on an empty form', (await v.$$('.sgx-press-form .sgx-m-err')).length >= 4);
  const f = (name, val) => v.fill(`.sgx-press-form input[name=${name}]`, val);
  await f('outlet', OUTLET);
  await f('title', 'Periodista');
  await f('phone', '787-555-0100');
  await f('outletUrl', 'medioprueba.example.com');
  await v.click('.sgx-press-chips label:has-text("TV")');
  await v.fill('.sgx-press-form input[aria-label="Enlace de cobertura previa 1"]', 'https://medioprueba.example.com/nota-1');
  await v.fill('.sgx-press-form textarea', 'Nota y entrevista a los fundadores; reels del Día 3 en Chroma.');
  await v.check('.sgx-press-form > label.sgx-m-check input');
  await v.$eval('.sgx-press-form', (f) => f.requestSubmit());
  await v.waitForSelector('.sgx-press-receipt code', { timeout: 15000 }).catch(() => null);
  const code = await v.$eval('.sgx-press-receipt code', (e) => e.textContent).catch(() => '');
  check('tracking code shown', /^SGX-PRENSA-2026-\d{4}$/.test(code), code);
  await v.evaluate(() => document.querySelector('.sgx-press-receipt')?.scrollIntoView({ block: 'start' })); await v.waitForTimeout(400);
  await shot(v, 'm_submitted');

  const inq = ((await get('sponsor_inquiries?pageSize=300')).documents || []).find((d) => d.fields?.referenceCode?.stringValue === code);
  const fields = inq?.fields || {};
  const goals = (fields.goals?.arrayValue?.values || []).map((x) => x.stringValue);
  check('request stored as a PRESS sponsor inquiry', fields.selectedTierId?.stringValue === 'PRESS' && fields.companyName?.stringValue === OUTLET && fields.status?.stringValue === 'PENDING_REVIEW');
  check('request carries type, days, clip, pass and consent', goals.includes('TYPE:tv') && goals.includes('DAY:3') && goals.some((g) => g.startsWith('CLIP:https://medioprueba')) && goals.some((g) => g.startsWith('PASS:')) && goals.includes('CONSENT:yes'), goals.join(' '));
  const uid = fields.submittedBy?.stringValue;
  const passCode = (goals.find((g) => g.startsWith('PASS:')) || '').slice(5);
  check('request linked to the visitor account', !!uid);

  // a second request from the same outlet (another person) to exercise the one-per-outlet warning
  const otherId = `press_e2e_${RUN}`;
  await put(`sponsor_inquiries/${otherId}`, { id: S(otherId), companyName: S(OUTLET.toUpperCase()), contactName: S(`Alex Otro ${RUN}`), roleTitle: S('Camarógrafo'), email: S(`alex.${RUN.toLowerCase()}@example.com`), phone: S('787-555-0199'), websiteUrl: S('https://medioprueba.example.com'), selectedTierId: S('PRESS'), selectedTierName: S('Prensa · TV'), goals: { arrayValue: { values: [S('TYPE:tv'), S('DAY:1'), S('CONSENT:yes')] } }, customMessage: S('Cámara'), submittedAt: { integerValue: String(Date.now() - 1000) }, status: S('PENDING_REVIEW'), referenceCode: S(`SGX-PRENSA-2026-E2E${RUN.slice(0, 1)}`) });

  /* ---------- 2. admin (1440 + 390): approve ---------- */
  for (const size of ['d', 'm']) {
    const actx = await context(b, size, () => { localStorage.setItem('sgx_forge_dismissed', '1'); });
    const a = await actx.newPage();
    await a.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' });
    await a.waitForTimeout(8000);
    await a.evaluate(async () => {
      const m = await import('/src/lib/firebase.ts');
      const idToken = JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' });
      await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
    });
    await a.waitForTimeout(8000);
    const navBtn = a.locator('.sgx-admin__nav button:has-text("Prensa")');
    if (size === 'm' && !(await navBtn.isVisible().catch(() => false))) {
      const menu = a.locator('.sgx-admin button[aria-expanded], .sgx-admin__navtoggle').first();
      if (await menu.count()) await menu.click().catch(() => undefined);
      await a.waitForTimeout(500);
    }
    await navBtn.click();
    await a.waitForSelector('[data-testid=press-row]', { timeout: 15000 }).catch(() => null);
    await a.waitForTimeout(1000);
    if (size === 'd') {
      check('admin lists the press requests', await a.locator('[data-testid=press-row]', { hasText: code }).count() === 1);
      check('counter shows aprobados X/6', /aprobados \d+\/6/.test(await a.textContent('[data-testid=press-approved]')));
      a.on('dialog', (d) => d.accept());
      await a.locator('[data-testid=press-row]', { hasText: code }).locator('button:text-is("Aprobar")').click();
      await a.waitForTimeout(4000);
      const msg = await a.textContent('[role=status]').catch(() => '');
      check('approval message: card + Day 3', /PRENSA/.test(msg) && /Día 3/.test(msg), msg);
      const doc = await get(`sponsor_inquiries/${inq.name.split('/').pop()}`);
      check('request APPROVED and marked day3ByPress', doc.fields?.status?.stringValue === 'APPROVED' && doc.fields?.day3ByPress?.booleanValue === true);
      const grant = await get(`credential_grants/${uid}`);
      check('credential_grants press written', grant.fields?.press?.mapValue?.fields?.org?.stringValue === OUTLET);
      const reg = await get(`ticket_inquiries/${passCode}`);
      check('their pass is INVITED to Day 3 (Inscritos)', reg.fields?.status?.stringValue === 'INVITED');
      // same outlet: approving the second shows the warning
      await a.locator('[data-testid=press-row]', { hasText: `Alex Otro ${RUN}` }).locator('button:text-is("Aprobar")').click();
      await a.waitForTimeout(3000);
      check('same-outlet warning after a second approval', await a.isVisible('[data-testid=press-dupe]'));
      await a.screenshot({ path: `${OUT}/press_d_admin.png` });
      const [dl] = await Promise.all([a.waitForEvent('download', { timeout: 8000 }).catch(() => null), a.click('button:has-text("Exportar CSV")')]);
      const csv = dl ? require('fs').readFileSync(await dl.path(), 'utf8') : '';
      check('CSV export has both rows', csv.includes('Pat Prensa') && csv.includes(`Alex Otro ${RUN}`));
      // back to pending: the second loses PRENSA (it had no account) and nothing else changes
      await a.locator('[data-testid=press-row]', { hasText: `Alex Otro ${RUN}` }).locator('button:has-text("Pendiente")').click();
      await a.waitForTimeout(2500);
      check('back to pending clears the warning', !(await a.isVisible('[data-testid=press-dupe]')));
    } else {
      await a.screenshot({ path: `${OUT}/press_m_admin.png` });
    }
    prod.push(...actx.prodHits);
    await actx.close();
  }

  /* ---------- 3. visitor: PRENSA Holo Card, approved state ---------- */
  await v.goto(APP + '/pase', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(8000);
  const roleLine = await v.textContent('.sgx-roles').catch(() => '');
  check('Studio says the pass is PRENSA', /PRENSA/.test(roleLine || ''), (roleLine || '').slice(0, 80));
  await v.evaluate(() => document.querySelector('.sgx-hstudio__preview')?.scrollIntoView({ block: 'center' }));
  await v.waitForTimeout(1200);
  await shot(v, 'm_holo');
  await (await v.$('.sgx-hstudio__preview canvas'))?.screenshot({ path: `${OUT}/press_holo_card.png` });
  await v.goto(APP + '/prensa#acreditacion', { waitUntil: 'domcontentloaded' });
  await v.waitForTimeout(7000);
  check('press room shows the approved state', await v.isVisible('text=Acreditación aprobada.'));

  // same visitor on desktop (same storage): form/receipt + Holo Card
  const state = await vctx.storageState();
  const dctx = await b.newContext({ viewport: SIZES.d, storageState: state });
  await dctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { prod.push(r.request().url()); r.abort(); });
  await dctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); });
  const d = await dctx.newPage();
  await d.goto(APP + '/prensa', { waitUntil: 'domcontentloaded' });
  await d.waitForTimeout(8000);
  await shot(d, 'd_top');
  await d.evaluate(() => document.querySelector('.sgx-press-receipt, .sgx-press-panel')?.scrollIntoView({ block: 'center' })); await d.waitForTimeout(500);
  await shot(d, 'd_submitted');
  await toSection(d, 'kit'); await d.waitForTimeout(800);
  await shot(d, 'd_kit');
  await toSection(d, 'ficha'); await d.waitForTimeout(800);
  await shot(d, 'd_ficha');
  await d.goto(APP + '/pase', { waitUntil: 'domcontentloaded' });
  await d.waitForTimeout(8000);
  await d.evaluate(() => document.querySelector('.sgx-hstudio__preview')?.scrollIntoView({ block: 'center' }));
  await d.waitForTimeout(1200);
  await shot(d, 'd_holo');
  await dctx.close();

  /* ---------- 4. desktop: form for a forged visitor who has not applied ---------- */
  const fctx = await context(b, 'd');
  const fp = await fctx.newPage();
  await fp.goto(APP + '/prensa', { waitUntil: 'domcontentloaded' });
  await fp.waitForTimeout(7000);
  await forge(fp, `prensa.form.${RUN.toLowerCase()}@example.com`, 'Rita Reportera');
  await fp.goto(APP + '/prensa', { waitUntil: 'domcontentloaded' });
  await fp.waitForTimeout(7000);
  await toSection(fp, 'acreditacion'); await fp.waitForTimeout(500);
  await shot(fp, 'd_form');
  prod.push(...fctx.prodHits);
  await fctx.close();

  /* ---------- 5. welcome portal ---------- */
  for (const size of ['m', 'd']) {
    const wctx = await context(b, size, () => { localStorage.setItem('sgx_forge_dismissed', '1'); });
    const w = await wctx.newPage();
    await w.goto(APP + '/bienvenida/periodista', { waitUntil: 'domcontentloaded' });
    await w.waitForTimeout(7000);
    if (size === 'd') {
      check('/bienvenida/periodista settles on /bienvenida/prensa', new URL(w.url()).pathname === '/bienvenida/prensa', w.url());
      check('prensa shortcuts', await w.isVisible('.sgx-wel-actions a:has-text("Solicitar acreditación")') && await w.isVisible('.sgx-wel-actions a:has-text("Kit de prensa")') && await w.isVisible('.sgx-wel-actions a:has-text("Agenda")'));
    }
    await shot(w, `${size}_bienvenida`);
    await w.goto(APP + '/bienvenida', { waitUntil: 'domcontentloaded' });
    await w.waitForTimeout(6000);
    if (size === 'd') check('hub has the press card', await w.isVisible('a.sgx-wel-role.is-prensa'));
    await w.evaluate(() => document.querySelector('.sgx-wel-roles')?.scrollIntoView({ block: 'center' }));
    await w.waitForTimeout(600);
    await shot(w, `${size}_hub`);
    if (size === 'd') {
      await w.click('.sgx-wel-role.is-prensa');
      await w.waitForTimeout(1500);
      await w.click('.sgx-wel-actions a:has-text("Solicitar acreditación")');
      await w.waitForTimeout(4000);
      check('welcome shortcut opens /prensa', new URL(w.url()).pathname === '/prensa' && !!(await w.$('#summit-section-prensa')), w.url());
    }
    prod.push(...wctx.prodHits);
    await wctx.close();
  }

  /* ---------- 6. after December 1: closed ---------- */
  const cctx = await context(b, 'm', () => { const t = Date.parse('2026-12-02T12:00:00-04:00'); const R = Date; Date.now = () => t; });
  const c = await cctx.newPage();
  await c.goto(APP + '/prensa', { waitUntil: 'domcontentloaded' });
  await c.waitForTimeout(7000);
  await c.keyboard.press('Escape');
  await toSection(c, 'acreditacion'); await c.waitForTimeout(400);
  check('closed state after the deadline', await c.isVisible('text=Las acreditaciones de prensa cerraron'));
  await shot(c, 'm_closed');
  prod.push(...cctx.prodHits);
  await cctx.close();

  prod.push(...vctx.prodHits);
  check('no request reached production Firebase', prod.length === 0, prod.slice(0, 3).join(' '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
