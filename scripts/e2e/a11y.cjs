// Accessibility audit (axe-core, WCAG 2.1 A/AA) of the main screens, desktop + phone,
// plus keyboard checks. Emulators only. Writes out/a11y.json.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const APP = process.env.APP_URL || 'http://localhost:3200';
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const STRICT = process.env.A11Y_STRICT === '1';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

const SCREENS = [
  ['inicio', '/', null],
  ['pilares', '/?tab=pillars', null],
  ['agenda', '/?tab=agenda', null],
  ['speakers', '/?tab=speakers', null],
  ['sponsors', '/?tab=sponsors', null],
  ['forja', '/', async (p) => { await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } }))); await p.waitForSelector('.sgx-forge', { timeout: 20000 }); }],
  ['sgx-live', '/?page=play', null],
  ['admin-login', '/?page=admin', null],
  // with a pass (forged once per viewport below)
  ['hangar', '/?hangar=pass', async (p) => { await p.waitForSelector('.sgx-hangar', { timeout: 20000 }); }],
  ['networking', '/?tab=networking', null],
  ['guild', '/?tab=guild', null],
  ['mapa-360', '/?tab=map', null],
  ['broadcast', '/?tab=broadcast', null],
  ['social', '/?tab=social', null],
  ['juegos', '/?tab=games', null],
  ['match', '/?tab=match', null],
];

async function forgePass(p) {
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  await p.click('.sgx-forge button:has-text("Seguir sin cuenta"), .sgx-forge button:has-text("Continue without")');
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', `a11y.${Date.now() % 1e7}@example.com`);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Ana Accesible');
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(1500);
  await p.click('.sgx-forge__pillars button');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(600);
  await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(5000);
  await p.keyboard.press('Escape');
}

async function keyboard(p, vpName) {
  await p.goto(APP + '/?tab=agenda', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  await p.keyboard.press('Tab');
  const skip = await p.evaluate(() => { const a = document.activeElement; const r = a?.getBoundingClientRect(); return { text: a?.textContent || '', visible: !!r && r.top >= 0 && r.height > 0 }; });
  check(`${vpName} keyboard: first Tab is a visible "Saltar al contenido"`, /Saltar al contenido/.test(skip.text) && skip.visible, JSON.stringify(skip));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(300);
  check(`${vpName} keyboard: skip link moves focus to the content`, await p.evaluate(() => document.activeElement?.id === 'summit-main-tab-content'));
  // the next stops are real, visible controls with a focus indicator
  const bad = [];
  for (let i = 0; i < 25; i++) {
    await p.keyboard.press('Tab');
    const info = await p.evaluate(() => {
      const a = document.activeElement; if (!a || a === document.body) return null;
      const r = a.getBoundingClientRect(); const cs = getComputedStyle(a);
      const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none');
      return { tag: a.tagName, label: (a.getAttribute('aria-label') || a.textContent || '').trim().slice(0, 30), visible: r.width > 0 && r.height > 0, ring };
    });
    if (info && (!info.visible || !info.ring)) bad.push(info);
  }
  check(`${vpName} keyboard: 25 Tab stops visible with a focus ring`, bad.length === 0, JSON.stringify(bad.slice(0, 4)));
  // modals close with Escape and take focus
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } })));
  await p.waitForSelector('.sgx-hangar', { timeout: 20000 }); await p.waitForTimeout(600);
  check(`${vpName} keyboard: Hangar takes focus`, await p.evaluate(() => !!document.querySelector('.sgx-hangar')?.contains(document.activeElement)));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  check(`${vpName} keyboard: Escape closes the Hangar`, !(await p.$('.sgx-hangar')));
}

(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const [vpName, vp] of [['desk', { width: 1366, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, reducedMotion: 'reduce' });
    await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
    await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
    const p = await ctx.newPage();
    await forgePass(p);
    for (const [name, url, prep] of SCREENS) {
      await p.goto(APP + url, { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(7000);
      if (prep) { await prep(p); await p.waitForTimeout(1200); }
      await p.addScriptTag({ content: AXE });
      const res = await p.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, resultTypes: ['violations'] });
        return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, count: v.nodes.length, sample: v.nodes.slice(0, 4).map((n) => ({ target: n.target.join(' '), html: n.html.slice(0, 160), summary: (n.failureSummary || '').slice(0, 220) })) }));
      });
      report[`${vpName}:${name}`] = res;
      const serious = res.filter((v) => v.impact === 'critical' || v.impact === 'serious');
      const line = res.map((v) => `${v.id}(${v.impact[0]}${v.count})`).join(' ');
      if (STRICT) check(`${vpName} ${name}: no critical/serious axe violations`, serious.length === 0, line);
      else console.log(`${vpName} ${name}: ${res.length ? line : 'clean'}`);
    }
    await keyboard(p, vpName);
    await ctx.close();
  }
  fs.writeFileSync(path.join(OUT, 'a11y.json'), JSON.stringify(report, null, 2));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
