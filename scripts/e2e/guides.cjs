// Guides end-to-end against the EMULATORS: the sponsors' "Términos y logística"
// (lib/sponsorTerms.ts) and the "Guía del speaker" (lib/speakerGuide.ts).
//   /sponsors#terminos: the block, its dates (30 nov, 4 días, licencia, reporte), no "Tier"/"nivel".
//   /bienvenida/sponsor and /bienvenida/speaker: the blocks and their shortcuts.
//   The sponsor form links to the terms; the Speaker portal shows the guide before and after sending.
//   Day 3 agenda: the 2:00–3:30 block is "Entrepreneurship Match".
// Screenshots in scripts/e2e/out/guides_*.png (390×844 and 1440×900).
//   APP_URL=http://localhost:3300 FS_PORT=8185 node scripts/e2e/guides.cjs
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const SIZES = { m: { width: 390, height: 844 }, d: { width: 1440, height: 900 } };
const RUN = Date.now().toString(36).slice(-5);

async function context(b, size = 'm') {
  const ctx = await b.newContext({ viewport: SIZES[size], ...(size === 'm' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  ctx.prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { ctx.prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); try { localStorage.setItem('sgx_forge_dismissed', '1'); } catch {} });
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
  // a plain DOM click: the forge animation can keep Playwright's pointer click waiting
  await p.$$eval('.sgx-forge button', (bs) => bs.find((x) => /Forjar mi SGX Pass|Forge my SGX Pass/.test(x.textContent || ''))?.click());
  await p.waitForTimeout(4500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
}

const open = async (p, path, wait = 7000) => { await p.goto(APP + path, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(wait); };
const text = (p, sel) => p.textContent(sel).catch(() => '');
/** Opens every <details> inside a block so the full-page screenshot shows the content. */
const expand = (p, sel) => p.$$eval(`${sel} details`, (ds) => ds.forEach((d) => { d.open = true; })).catch(() => {});
const shotBlock = async (p, sel, file) => {
  const el = await p.$(sel);
  if (el) await el.screenshot({ path: `${OUT}/${file}` });
};

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctxs = [];
  const errs = [];

  for (const size of ['m', 'd']) {
    const ctx = await context(b, size); ctxs.push(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));

    /* ---------- 1. /sponsors#terminos ---------- */
    await open(p, '/sponsors#terminos', 9000);
    const terms = await text(p, '[data-testid=sponsor-terms]');
    check(`[${size}] /sponsors: Términos y logística block`, !!terms && /Términos y logística/.test(terms));
    check(`[${size}] terms: payment by 30 nov, ATH Móvil, cheque, transfer`, /30 de noviembre/.test(terms) && /ATH Móvil Business/.test(terms) && /SpatialgineersLLC/.test(terms) && /Cheque/.test(terms) && /Transferencia/.test(terms));
    check(`[${size}] terms: no old dates (14 nov, 9 nov, 23 nov)`, !/14 de noviembre|9 de noviembre|23 de noviembre/.test(terms));
    check(`[${size}] terms: 4 días, licencia 1 nov 2026–31 oct 2027, reporte ~12 ene 2027`, /4 días/.test(terms) && /1 de noviembre de 2026/.test(terms) && /31 de octubre de 2027/.test(terms) && /12 de enero de 2027/.test(terms));
    check(`[${size}] terms: never "Tier" or "nivel"`, !/\bTier\b|\bnivel(es)?\b/i.test(terms));
    const inView = await p.$eval('#terminos', (el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }).catch(() => false);
    check(`[${size}] /sponsors#terminos lands on the block`, inView);
    const page = await p.evaluate(() => document.querySelector('.spx')?.innerText || '');
    check(`[${size}] sponsors page: no "nivel/niveles"`, !/\bnivel(es)?\b/i.test(page), (page.match(/.{20}\bnivel(es)?\b.{20}/i) || [''])[0]);
    await p.evaluate(() => document.getElementById('terminos')?.scrollIntoView());
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/guides_sponsor_terms_${size}.png` });
    await expand(p, '[data-testid=sponsor-terms]');
    await p.waitForTimeout(300);
    await shotBlock(p, '[data-testid=sponsor-terms]', `guides_sponsor_terms_full_${size}.png`);

    /* ---------- 2. Day 3 agenda: Entrepreneurship Match ---------- */
    await open(p, '/agenda?day=3', 8000);
    const agenda = await p.evaluate(() => document.body.innerText);
    check(`[${size}] agenda Day 3: Entrepreneurship Match, no "Interacción libre"`, /Entrepreneurship Match/.test(agenda) && !/Interacci[oó]n libre/i.test(agenda));

    /* ---------- 3. Welcome portal ---------- */
    await open(p, '/bienvenida/sponsor#terminos', 7000);
    check(`[${size}] /bienvenida/sponsor: terms block`, !!(await p.$('#terminos[data-testid=sponsor-terms]')));
    check(`[${size}] /bienvenida/sponsor: shortcut to the terms`, !!(await p.$('.sgx-wel-actions a[href="#terminos"]')));
    await p.screenshot({ path: `${OUT}/guides_welcome_sponsor_${size}.png` });

    await open(p, '/bienvenida/speaker#guia', 7000);
    const guide = await text(p, '#guia[data-testid=speaker-guide]');
    check(`[${size}] /bienvenida/speaker: speaker guide`, !!guide);
    check(`[${size}] guide: bio 50–80, 1500 px, 5/30/10, antes del 8 de diciembre, 30 minutos antes`, /50 a 80 palabras/.test(guide) && /1500 px/.test(guide) && /5 min/.test(guide) && /30 min/.test(guide) && /10 min/.test(guide) && /antes del 8 de diciembre/.test(guide) && /30 minutos antes/.test(guide));
    check(`[${size}] guide: tone rules (sin pitch, sin música con derechos)`, /Sin pitch de ventas/.test(guide) && /Sin música con derechos de autor/.test(guide));
    check(`[${size}] guide: no 4 nov confirmation date`, !/4 de noviembre/.test(guide));
    await p.screenshot({ path: `${OUT}/guides_welcome_speaker_${size}.png` });
    await expand(p, '#guia');
    await p.waitForTimeout(300);
    await shotBlock(p, '#guia', `guides_speaker_guide_full_${size}.png`);

    if (size !== 'm') continue;

    /* ---------- 4. With a pass: the form links and the portal guide ---------- */
    await open(p, '/summit', 8000);
    await forge(p, `guias.${RUN}@example.com`, 'Gabi Guías').catch(async (e) => { await p.screenshot({ path: `${OUT}/guides_forge_fail.png` }); throw e; });

    await open(p, '/patrocina', 7000);
    const link = await p.$('[data-testid=sponsor-terms-link]');
    check('sponsor form: link to Términos y logística', !!link);
    check('sponsor form: "Elige tu paquete" (not "nivel")', /Elige tu paquete/i.test(await p.evaluate(() => document.body.innerText)) && !/Elige tu nivel/i.test(await p.evaluate(() => document.body.innerText)));
    if (link) {
      await link.click();
      await p.waitForTimeout(4000);
      const landed = await p.$eval('#terminos', (el) => { const r = el.getBoundingClientRect(); return r.top < window.innerHeight && r.bottom > 0; }).catch(() => false);
      check('form link opens /sponsors on the terms', new URL(p.url()).pathname === '/sponsors' && landed, p.url());
    }

    await open(p, '/portal-speakers', 7000);
    check('speaker portal: guide toggle in the form', !!(await p.$('#sgx-speaker-form [data-testid=speaker-guide-toggle]')));
    check('speaker portal: bio word counter', /recomendado 50–80/.test(await text(p, '[data-testid=speaker-bio-words]')));
    await p.click('[data-testid=speaker-guide-toggle] > summary');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/guides_portal_before_m.png` });
    // send a profile → the guide in "review"
    await p.fill('#sgx-speaker-form input[autocomplete=organization]', 'Estudio Guías');
    const roleInput = await p.$$('#sgx-speaker-form input[required]');
    await roleInput[1].fill('Artista XR');
    await p.fill('#sgx-speaker-form textarea', 'Bio de prueba para la guía del speaker con algunas palabras.');
    await p.click('button[form=sgx-speaker-form][type=submit]');
    await p.waitForTimeout(5000);
    const after = await p.$('[data-testid=speaker-guide][data-stage=review]');
    check('speaker portal after sending: guide in "review"', !!after && await after.isVisible());
    if (after) { await after.scrollIntoViewIfNeeded(); await p.waitForTimeout(400); await after.screenshot({ path: `${OUT}/guides_portal_review_m.png` }); }
  }

  const prod = ctxs.flatMap((c) => c.prodHits);
  check('no requests to production Firebase', prod.length === 0, prod.slice(0, 3).join(' | '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
