// Deadlines end-to-end against the EMULATORS (lib/summitDeadlines.ts). "Now" is moved with
// localStorage.sgx_now (ms), the test-only override the client helpers read.
//   Speaker portal: open (with the 21 nov note) before 2026-11-22T00:00-04:00, closed after.
//   Sponsor form:   open (with 28 nov / 30 nov) before 2026-11-29T00:00-04:00, closed after.
//   Welcome portal: the role pages and the server-rendered HTML carry the new dates (no 14 nov).
//   Admin: Inscritos shows the Day 3 invitation note, and a soft warning after 5 dic (CMS never blocked).
// Screenshots in scripts/e2e/out/deadline_*.png.
//   APP_URL=http://localhost:3300 FS_PORT=8185 node scripts/e2e/deadlines.cjs
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const at = (iso) => String(Date.parse(iso));
const SIZES = { m: { width: 390, height: 844 }, d: { width: 1440, height: 900 } };
const RUN = Date.now().toString(36).slice(-5);

async function context(b, size = 'm') {
  const ctx = await b.newContext({ viewport: SIZES[size], ...(size === 'm' ? { isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : {}) });
  ctx.prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { ctx.prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); });
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

/** Opens a path with "now" set to `now` (null = the real clock). */
async function openAt(p, path, now) {
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate((n) => { if (n) localStorage.setItem('sgx_now', n); else localStorage.removeItem('sgx_now'); localStorage.setItem('sgx_forge_dismissed', '1'); }, now);
  await p.goto(APP + path, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
}

const text = (p, sel) => p.textContent(sel).catch(() => '');

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctxs = [];
  const errs = [];

  /* ---------- 1. Creador with a pass: open before, closed after ---------- */
  const ctx = await context(b, 'm'); ctxs.push(ctx);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(APP + '/summit', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  await forge(p, `plazos.${RUN}@example.com`, 'Cami Plazos');

  // Speaker portal, the last minute of November 21
  await openAt(p, '/portal-speakers', at('2026-11-21T23:59:00-04:00'));
  check('speaker portal open on Nov 21 (form shows)', !!(await p.$('#sgx-speaker-form')) && !(await p.$('[data-testid=speaker-closed]')));
  check('speaker portal shows the 21 nov deadline before closing', /hasta el 21 de noviembre/.test(await text(p, '[data-testid=speaker-deadline]')), await text(p, '[data-testid=speaker-deadline]'));
  await p.screenshot({ path: `${OUT}/deadline_speaker_open_m.png` });

  // ...and right after midnight
  await openAt(p, '/portal-speakers', at('2026-11-22T00:00:01-04:00'));
  const spClosed = await text(p, '[data-testid=speaker-closed]');
  check('speaker portal closed on Nov 22 (no form)', !!spClosed && !(await p.$('#sgx-speaker-form')));
  check('speaker closed copy', /El portal de speakers cerró el 21 de noviembre\. Escríbenos a info@spatialgineers\.com/.test(spClosed), spClosed.slice(0, 160));
  check('speaker closed: mail link to info@', !!(await p.$('a[href^="mailto:info@spatialgineers.com"]')));
  await p.screenshot({ path: `${OUT}/deadline_speaker_closed_m.png` });

  // Sponsor form, the last minute of November 28
  await openAt(p, '/patrocina', at('2026-11-28T23:59:00-04:00'));
  const spnNote = await text(p, '[data-testid=sponsor-deadline]');
  check('sponsor form open on Nov 28 (form shows)', !!(await p.$('[data-guide=enviar-patrocinio]')) && !(await p.$('[data-testid=sponsor-closed]')));
  check('sponsor form shows 28 nov + 30 nov before closing', /28 de noviembre/.test(spnNote) && /30 de noviembre/.test(spnNote) && !/14 de noviembre/.test(spnNote), spnNote);
  await p.screenshot({ path: `${OUT}/deadline_sponsor_open_m.png` });

  await openAt(p, '/patrocina', at('2026-11-29T00:00:01-04:00'));
  const spnClosed = await text(p, '[data-testid=sponsor-closed]');
  check('sponsor form closed on Nov 29 (no submit)', !!spnClosed && !(await p.$('[data-guide=enviar-patrocinio]')));
  check('sponsor closed copy points to info@', /cerraron el 28 de noviembre/.test(spnClosed) && /info@spatialgineers\.com/.test(spnClosed), spnClosed.slice(0, 160));
  await p.screenshot({ path: `${OUT}/deadline_sponsor_closed_m.png` });

  // Real clock (today is before every deadline): both open
  await openAt(p, '/portal-speakers', null);
  const realOpen = Date.now() < Date.parse('2026-11-22T00:00:00-04:00');
  check('real clock: speaker portal matches the date', realOpen ? !!(await p.$('#sgx-speaker-form')) : !!(await p.$('[data-testid=speaker-closed]')));

  /* ---------- 2. No pass yet: the closed note shows without forging ---------- */
  const nctx = await context(b, 'd'); ctxs.push(nctx);
  const n = await nctx.newPage();
  n.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await openAt(n, '/portal-speakers', at('2026-11-23T12:00:00-04:00'));
  check('no pass + after deadline: speaker closed note (not the forge gate)', !!(await n.$('[data-testid=speaker-closed]')));
  await n.screenshot({ path: `${OUT}/deadline_speaker_closed_d.png` });
  await openAt(n, '/patrocina', at('2026-11-30T12:00:00-04:00'));
  check('no pass + after deadline: sponsor closed note', !!(await n.$('[data-testid=sponsor-closed]')));
  await n.screenshot({ path: `${OUT}/deadline_sponsor_closed_d.png` });

  // Sponsors page: hero tiles and steps
  await openAt(n, '/sponsors', null);
  const body = await n.evaluate(() => document.body.innerText);
  check('sponsors page: 28 nov and 30 nov, no 14 nov', /28 nov/i.test(body) && /30 nov/i.test(body) && !/14 nov|Nov 14/i.test(body));

  /* ---------- 3. Welcome portal (client + server HTML) ---------- */
  await openAt(n, '/bienvenida/speaker', null);
  check('/bienvenida/speaker: 21 nov in the key dates', /Hasta el 21 nov/i.test(await n.evaluate(() => document.body.innerText)));
  await openAt(n, '/bienvenida/sponsor', null);
  const wsp = await n.evaluate(() => document.body.innerText);
  check('/bienvenida/sponsor: 28 nov + 30 nov, no 14 nov', /Hasta el 28 nov/i.test(wsp) && /30 nov/i.test(wsp) && /a más tardar el 30 de noviembre/.test(wsp) && !/14 nov|14 de noviembre/i.test(wsp));
  await n.screenshot({ path: `${OUT}/deadline_welcome_sponsor_d.png`, fullPage: false });
  await openAt(n, '/bienvenida/visitante', null);
  check('/bienvenida/visitante: Day 3 invitations by 5 dic', /5 de diciembre/.test(await n.evaluate(() => document.body.innerText)));
  await openAt(n, '/bienvenida', null);
  check('/bienvenida hub: Day 3 invitations by 5 dic', /5 dic/.test(await n.evaluate(() => document.body.innerText)));

  // Server HTML (production-only middleware): rendered locally from index.html, no network.
  const html = JSON.parse(require('child_process').execFileSync('npx', ['tsx', require('path').join(__dirname, 'deadlinesHtml.ts')], { cwd: require('path').join(__dirname, '..', '..'), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
  const hSpeaker = html.speaker, hSponsor = html.sponsor, hHub = html.hub;
  check('server HTML speaker: meta + JSON-LD with 21 de noviembre', /<meta name="description"[^>]*21 de noviembre/.test(hSpeaker) && /application\/ld\+json[\s\S]*21 de noviembre/.test(hSpeaker));
  check('server HTML sponsor: 28 + 30 nov, no 14 de noviembre', /<meta name="description"[^>]*28 de noviembre[^>]*30 de noviembre/.test(hSponsor) && !/14 de noviembre/.test(hSponsor));
  check('server HTML hub: Day 3 invitations by 5 de diciembre', /5 de diciembre/.test(hHub));
  const hPress = html.press;
  check('server HTML visitante: Day 3 invitations in JSON-LD FAQ', /application\/ld\+json[\s\S]*a más tardar el 5 de diciembre/.test(html.visitante));
  check('server HTML press: 10 cupos de prensa, no outlet rule', /10 cupos de prensa/.test(hPress) && !/uno por medio/i.test(hPress));

  /* ---------- 4. Admin: Day 3 note + soft warning; CMS portal not blocked ---------- */
  const actx = await context(b, 'd'); ctxs.push(actx);
  const a = await actx.newPage();
  a.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  const adminAt = async (now) => {
    await openAt(a, '/?page=admin', now);
    await a.evaluate(async () => {
      const m = await import('/src/lib/firebase.ts');
      const idToken = JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' });
      await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
    });
    await a.waitForTimeout(8000);
  };
  await adminAt(at('2026-12-04T12:00:00-04:00'));
  await a.click('.sgx-admin__nav button:has-text("Inscritos y Día 3")');
  await a.waitForTimeout(3000);
  check('Inscritos: "Invitaciones al Día 3: a más tardar el 5 de diciembre"', /Invitaciones al Día 3: a más tardar el 5 de diciembre/.test(await text(a, '[data-testid=day3-invite-note]')));
  check('Inscritos: no warning before the date', !(await a.$('[data-testid=day3-invite-late]')));
  await adminAt(at('2026-12-06T09:00:00-04:00'));
  await a.click('.sgx-admin__nav button:has-text("Inscritos y Día 3")');
  await a.waitForTimeout(3000);
  check('Inscritos: soft warning after 5 dic', /Ya pasó el 5 de diciembre/.test(await text(a, '[data-testid=day3-invite-late]')));
  check('Inscritos: still editable after 5 dic (selects enabled)', await a.evaluate(() => [...document.querySelectorAll('[data-testid=day3-invite-late] ~ * select, table select')].every((s) => !s.disabled)));
  await a.screenshot({ path: `${OUT}/deadline_admin_day3_late_d.png` });
  // CMS: the team can still add a speaker after the portal closed
  await a.click('.sgx-admin__nav button:has-text("Speakers")');
  await a.waitForTimeout(2500);
  const cmsBtn = a.locator('button:has-text("PORTAL DE SPEAKER")').first();
  if (await cmsBtn.count()) {
    await cmsBtn.click();
    await a.waitForTimeout(1500);
    check('CMS speaker portal is not closed by the deadline', !(await a.$('[data-testid=speaker-closed]')));
  } else {
    check('CMS speaker portal button found', false);
  }

  const prod = ctxs.flatMap((c) => c.prodHits);
  check('no requests to production Firebase', prod.length === 0, prod.slice(0, 3).join(' | '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
