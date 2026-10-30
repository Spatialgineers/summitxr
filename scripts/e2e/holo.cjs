const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const REST = 'http://127.0.0.1:8085/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents';
const put = (path, fields) => fetch(`${REST}/${path}`, { method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) }).then((r) => r.json());
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const S = (v) => ({ stringValue: v });
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true });
  const prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); });
  const p = await ctx.newPage();
  const errs = []; const perm = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('console', (m) => { if (/PERMISSION_DENIED|insufficient permissions/i.test(m.text())) perm.push(m.text().slice(0, 200)); });
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);
  // forge
  if (!(await p.$('.sgx-forge'))) await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'SHOWCASE' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', `holo.${Date.now() % 1e6}@example.com`);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Gabriela Prueba');
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(500);
  await p.click('.sgx-forge__pillars button');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(500);
  await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(4500);
  await p.keyboard.press('Escape');
  await p.evaluate(() => localStorage.setItem('sgx_forge_dismissed', '1'));
  await p.waitForTimeout(500);
  // hangar pass for comparison
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } })));
  await p.waitForSelector("#sgx-studio-page", { timeout: 20000 }); await p.waitForTimeout(1200);
  // the Holo Card lives in the Studio: drawn, and it turns over to the event + QR
  const inkOf = () => p.evaluate(() => { const c = document.querySelector('#sgx-studio-page .sgx-hstudio__preview canvas'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++; return n; });
  check('hangar shows the Holo Card', (await inkOf()) > 50);
  await (await p.$('#sgx-studio-page .sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_hangar_front.png` });
  await p.click('#sgx-studio-page .sgx-hstudio__preview canvas'); await p.waitForTimeout(900);
  check('hangar card flips to the back', !!(await p.$('#sgx-studio-page .sgx-hstudio__flip:has-text("Frente"), #sgx-studio-page .sgx-hstudio__flip:has-text("Front")')));
  await (await p.$('#sgx-studio-page .sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_hangar_back.png` });
  
  // studio: the pass IS the Holo Card (one card, on the Studio page)
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_credential_generator')));
  await p.waitForSelector('#sgx-studio-page .sgx-hstudio__preview canvas', { timeout: 20000 }); await p.waitForTimeout(2500);
  const Q = '#sgx-studio-page';
  const filled = await p.evaluate((q) => { const c = document.querySelector(`${q} .sgx-hstudio__preview canvas`); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++; return n; }, Q);
  check('Holo Card links open the pass on the Studio page (no popup)', filled > 50 && !(await p.$('[role=dialog] .sgx-hstudio')), `(samples ${filled})`);
  await p.screenshot({ path: `${OUT}/c_studio.png` });
  check('one card: no role tabs', !(await p.$(`${Q} .sgx-hstudio__roles`)));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click(`${Q} .sgx-hstudio__actions .sgx-btn:not(.sgx-btn--ground)`)]);
  check('PNG download works', !!dl, dl ? dl.suggestedFilename() : '');
  for (const f of ['Post 4:5', 'Story 9:16']) {
    await p.click(`${Q} .sgx-hstudio__formats button:has-text("${f}")`); await p.waitForTimeout(800);
    await (await p.$(`${Q} .sgx-hstudio__preview canvas`)).screenshot({ path: `${OUT}/c_${f.split(' ')[0].toLowerCase()}.png` });
  }
  await p.click(`${Q} .sgx-hstudio__formats button:has-text("Tarjeta 3D"), ${Q} .sgx-hstudio__formats button:has-text("3D card")`).catch(() => {});
  const roles = () => p.$$eval(`${Q} .sgx-roles__item`, (els) => els.map((e) => e.textContent || ''));
  const r0 = await roles();
  check('the pass offers Speaker, Initiate and Sponsor requests', r0.length === 3 && r0.every((t) => /Solicitar|Apply/.test(t)), JSON.stringify(r0));
  // initiate request from the pass -> in review
  await p.click(`${Q} .sgx-roles__item:has-text("Initiate") button`);
  await p.waitForSelector('#sgx-initiate-form', { timeout: 8000 });
  await p.fill('#sgx-initiate-form textarea', 'Hago shaders en vivo y visuales para conciertos.');
  await p.click('button[form="sgx-initiate-form"]'); await p.waitForTimeout(2500);
  await p.click('[role=dialog] button:has-text("Listo"), [role=dialog] button:has-text("Done")').catch(() => {});
  await p.waitForTimeout(800);
  const r1 = await roles();
  check('initiate request shows "En revisión"', r1.some((t) => /Initiate/.test(t) && /revisi|review/i.test(t)), JSON.stringify(r1));
  // speaker submits -> in review; the card still says CREADOR
  await p.evaluate(async () => { const m = await import('/src/identity/credentials.ts'); m.savePendingCredential('speaker', { name: 'Gabriela Prueba', title: 'Shader Artist', org: 'Estudio G', topic: 'Día 2', pillar: 'STAGE' }); });
  await p.waitForTimeout(1200);
  check('pending role does not change the card yet', !!(await p.$(`${Q} .sgx-hstudio__review`)) && /CREADOR|CREATOR/.test(await p.$eval(`${Q} .sgx-roles`, (e) => e.textContent || '')));
  // admin approves -> the same pass switches to SPEAKER
  const uid = await p.evaluate(async () => (await import('/src/lib/firebase.ts')).auth.currentUser?.uid);
  await put(`credential_grants/${uid}`, { speaker: { mapValue: { fields: { name: S('Gabriela Prueba'), title: S('Shader Artist'), org: S('Estudio G'), topic: S('Día 2'), pillar: S('STAGE'), grantedAt: { integerValue: '1' } } } } });
  await p.waitForTimeout(3000);
  const r2 = await p.$eval(`${Q} .sgx-roles`, (e) => e.textContent || '');
  check('after approval the same pass says SPEAKER', /SPEAKER/.test(r2) && /Aprobado|Approved/.test(r2), r2.slice(0, 160));
  await (await p.$(`${Q} .sgx-hstudio__preview canvas`)).screenshot({ path: `${OUT}/c_speaker_official.png` });
  // speaker portal and sponsor form need the pass (they have it here): the portal opens prefilled
  await p.evaluate(() => window.dispatchEvent(new Event('sgx:open_speaker_portal'))); await p.waitForTimeout(1500);
  const prefilled = await p.$eval('[role=dialog] input', (i) => i.value).catch(() => '');
  check('speaker portal opens prefilled from the pass', /Gabriela/.test(prefilled), prefilled);
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // viewer: someone else's initiate card from the Guild
  await p.evaluate(async () => { const m = await import('/src/identity/credentials.ts'); window.dispatchEvent(new CustomEvent('sgx:view_holo_card', { detail: m.initiateCredential('init_1') })); });
  await p.waitForTimeout(2000);
  check('viewer opens an initiate card', !!(await p.$('.sgx-holoview canvas.is-ready')));
  await (await p.$('.sgx-holoview')).screenshot({ path: `${OUT}/c_viewer.png` });
  await p.keyboard.press('Escape');
  // mobile
  await p.setViewportSize({ width: 390, height: 844 });
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_credential_generator')));
  await p.waitForTimeout(2500);
  check('mobile: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await p.screenshot({ path: `${OUT}/c_mobile.png` });
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('no permission errors', perm.length === 0, perm.slice(0, 3).join(' | '));
  check('zero prod Firebase', prodHits.length === 0);
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
