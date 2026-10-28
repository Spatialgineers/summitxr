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
  await p.waitForSelector(".sgx-hangar", { timeout: 20000 }); await p.waitForTimeout(1200);
  // the Holo Card lives in the Hangar: drawn, and it turns over to the event + QR
  const inkOf = () => p.evaluate(() => { const c = document.querySelector('.sgx-hangar .sgx-hstudio__preview canvas'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++; return n; });
  check('hangar shows the Holo Card', (await inkOf()) > 50);
  await (await p.$('.sgx-hangar .sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_hangar_front.png` });
  await p.click('.sgx-hangar .sgx-hstudio__preview canvas'); await p.waitForTimeout(900);
  check('hangar card flips to the back', !!(await p.$('.sgx-hangar .sgx-hstudio__flip:has-text("Frente"), .sgx-hangar .sgx-hstudio__flip:has-text("Front")')));
  await (await p.$('.sgx-hangar .sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_hangar_back.png` });
  await p.click('.sgx-hangar__close'); await p.waitForTimeout(400);
  // studio
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_credential_generator')));
  await p.waitForTimeout(3500);
  const filled = await p.evaluate(() => { const c = document.querySelector('.sgx-hstudio__preview canvas'); if (!c) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4000) if (d[i] > 0) n++; return n; });
  check('studio draws the pass card', filled > 50, `(samples ${filled})`);
  await p.screenshot({ path: `${OUT}/c_studio.png` });
  await (await p.$('.sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_card_canvas.png` });
  check('visitor sees no role picker', !(await p.$('.sgx-hstudio__roles')));
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('.sgx-hstudio__actions .sgx-btn:not(.sgx-btn--ground)')]);
  check('PNG download works', !!dl, dl ? dl.suggestedFilename() : '');
  for (const f of ['Post 4:5', 'Story 9:16']) {
    await p.click(`.sgx-hstudio__formats button:has-text("${f}")`); await p.waitForTimeout(800);
    await (await p.$('.sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_${f.split(' ')[0].toLowerCase()}.png` });
  }
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // speaker submits -> in review
  await p.evaluate(async () => { const m = await import('/src/identity/credentials.ts'); m.savePendingCredential('speaker', { name: 'Gabriela Prueba', title: 'Shader Artist', org: 'Estudio G', topic: 'Día 2', pillar: 'STAGE' }); });
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_holo_card', { detail: { role: 'speaker' } })));
  await p.waitForTimeout(2500);
  const rev = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.sgx-hstudio__roles button')].map((b) => b.textContent), disabled: document.querySelector('.sgx-hstudio__actions .sgx-btn:not(.sgx-btn--ground)')?.disabled }));
  check('speaker tab shows in review', rev.tabs.some((t) => /Speaker.*revisi/i.test(t)), JSON.stringify(rev.tabs));
  check('in-review card cannot be downloaded', rev.disabled === true);
  await (await p.$('.sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_speaker_review.png` });
  // admin approves -> grant
  const uid = await p.evaluate(async () => (await import('/src/lib/firebase.ts')).auth.currentUser?.uid);
  await put(`credential_grants/${uid}`, { speaker: { mapValue: { fields: { name: S('Gabriela Prueba'), title: S('Shader Artist'), org: S('Estudio G'), topic: S('Día 2'), pillar: S('STAGE'), grantedAt: { integerValue: '1' } } } } });
  await p.waitForTimeout(2500);
  const off = await p.evaluate(() => ({ tabs: [...document.querySelectorAll('.sgx-hstudio__roles button')].map((b) => b.textContent), disabled: document.querySelector('.sgx-hstudio__actions .sgx-btn:not(.sgx-btn--ground)')?.disabled }));
  check('after approval the speaker card is official', off.tabs.some((t) => /^Speaker$/i.test(t.trim())) && off.disabled === false, JSON.stringify(off));
  await (await p.$('.sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_speaker_official.png` });
  await p.keyboard.press('Escape'); await p.waitForTimeout(400);
  // initiate by Google email
  await put('initiate_claims/gabriela.guild@example.com', { initiateId: S('init_3') });
  await p.evaluate(async () => {
    const m = await import('/src/lib/firebase.ts');
    const cred = m.googleProvider.constructor.credential(JSON.stringify({ sub: 'google-gaby', email: 'gabriela.guild@example.com', email_verified: true, name: 'Gabriela' }));
    await m.signInWithCredential(m.auth, cred);
  });
  await p.waitForTimeout(3000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_holo_card', { detail: { role: 'initiate' } })));
  await p.waitForTimeout(2500);
  const ini = await p.evaluate(() => [...document.querySelectorAll('.sgx-hstudio__roles button')].map((b) => b.textContent));
  check('Google sign-in with the registered email unlocks the Initiate card', ini.some((t) => /Initiate/.test(t)), JSON.stringify(ini));
  await (await p.$('.sgx-hstudio__preview canvas')).screenshot({ path: `${OUT}/c_initiate.png` });
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
