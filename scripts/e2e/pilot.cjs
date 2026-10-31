const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  for (const [name, vp] of [['desk', { width: 1366, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp });
    await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
    await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    await p.goto('http://localhost:3200/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(7000);
    await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
    await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
    const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
    await p.waitForTimeout(400);
    await p.fill('.sgx-forge input[type=email]', `pilot.${Date.now() % 1e6}@example.com`);
    const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
    await inputs[0].fill('Nova Prueba');
    await p.check('.sgx-forge__consent input');
    await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
    await p.waitForTimeout(500);
    await p.click('.sgx-forge__pillars button >> nth=1');
    await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
    await p.waitForTimeout(700);
    check(`${name}: builder in forge`, !!(await p.$('.sgx-forge .sgx-pilotb')));
    await p.screenshot({ path: `${OUT}/p_${name}_forge.png` });
    // build a Highbot: a bot, eyelids and mouth, the chest pillar, eye color; 2D view to compare looks
    await p.click('.sgx-forge .sgx-pilotb__view button:has-text("2D")');
    await p.click('.sgx-pilotb__grid button >> nth=2');
    await p.click('.sgx-pilotb__tabs button:has-text("Cara")');
    await p.click('.sgx-pilotb__grid >> nth=0 >> button >> nth=3');
    await p.click('.sgx-pilotb__grid >> nth=1 >> button >> nth=1');
    await p.click('.sgx-pilotb__tabs button:has-text("Pilares")');
    await p.click('.sgx-pilotb__plates >> nth=0 >> button >> nth=2');
    await p.click('.sgx-pilotb__tabs button:has-text("Colores")');
    await p.click('.sgx-pilotb__colorrow >> nth=4 >> .sgx-pilotb__swatches > button >> nth=11');
    await p.waitForTimeout(300);
    const before = await p.$eval('.sgx-pilotb__preview', (e) => e.innerHTML.length);
    const shots = new Set();
    for (let i = 0; i < 8; i++) { await p.click('.sgx-pilotb__rolls button >> nth=0'); await p.waitForTimeout(120); shots.add(await p.$eval('.sgx-pilotb__preview', (e) => e.innerHTML.replace(/hb\d+/g, ''))); }
    check(`${name}: Sorpresa gives a new bot every time`, shots.size === 8, `(${shots.size}/8 distinct)`);
    await p.click('.sgx-pilotb__rolls button >> nth=2'); // undo
    await p.screenshot({ path: `${OUT}/p_${name}_built.png` });
    const chosen = await p.$eval('.sgx-pilotb__preview', (e) => e.innerHTML.replace(/hb\d+/g, ''));
    await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
    await p.waitForTimeout(4500);
    const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').avatar?.pilot || null);
    check(`${name}: Highbot saved with the pass`, !!stored && stored.v === 2 && typeof stored.eyelid === 'string' && !!stored.colors, JSON.stringify(stored).slice(0, 80));
    await p.screenshot({ path: `${OUT}/p_${name}_pass.png` });
    await p.keyboard.press('Escape');
    await p.waitForTimeout(500);
    // Avatar Studio from the event
    await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_avatar')));
    await p.waitForSelector(".sgx-pilotb-modal .sgx-pilotb", { timeout: 20000 }).catch(() => {});
    check(`${name}: Avatar Studio opens the builder`, !!(await p.$('.sgx-pilotb-modal .sgx-pilotb')));
    await p.click('.sgx-pilotb-modal .sgx-pilotb__rolls button >> nth=1'); // vary
    await p.click('.sgx-pilotb-modal button:has-text("Guardar avatar")');
    await p.waitForTimeout(600);
    const stored2 = await p.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').avatar?.pilot || null);
    check(`${name}: saving from Avatar Studio updates the pass`, JSON.stringify(stored2) !== JSON.stringify(stored));
    await p.waitForTimeout(2500);
    await p.screenshot({ path: `${OUT}/p_${name}_core.png` });
    check(`${name}: no horizontal overflow`, await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    check(`${name}: no page errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
