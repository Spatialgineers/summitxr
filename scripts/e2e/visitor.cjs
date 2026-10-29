// End-to-end: the real app talking to the Firestore + Auth EMULATORS (never production).
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;

async function list(col) {
  const r = await fetch(`${REST}/${col}?pageSize=300`, { headers: { Authorization: 'Bearer owner' } });
  const j = await r.json();
  return j.documents || [];
}
let pass = 0, fail = 0;
const RUN = String(Date.now()).slice(-6);
const PASS_EMAIL = `piloto.${RUN}@example.com`;
const SPONSOR_EMAIL = `ana.${RUN}@acme.example`;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

(async () => {
  // First suite of the run: start from an empty emulator database (EMULATOR ONLY), so
  // admin.cjs (which reads what this suite writes) never sees old runs' data.
  await fetch(`http://127.0.0.1:8085/emulator/v1/projects/${PROJECT}/databases/${DB}/documents`, { method: 'DELETE' });
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const prodHits = [];
  // Any request to the real Firebase project is aborted AND recorded: there must be none.
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); });
  const p = await ctx.newPage();
  const perm = []; const errs = [];
  p.on('console', (m) => { const t = m.text(); if (/permission|insufficient|PERMISSION_DENIED/i.test(t)) perm.push(t.slice(0, 220)); });
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));

  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);

  // 1. Forge a pass (registration + consent)
  if (!(await p.$('.sgx-forge'))) await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'SHOWCASE' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', PASS_EMAIL);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Piloto Prueba');
  await p.click('.sgx-forge__tiers label:has-text("Día 3")');
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(500);
  await p.click('.sgx-forge__pillars button');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(500);
  await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(5000);
  const regs = await list('ticket_inquiries');
  const mine = regs.find((d) => d.fields?.email?.stringValue === PASS_EMAIL);
  check('registration reached Firestore', !!mine);
  check('registration id = pass code', !!mine && mine.name.endsWith(mine.fields.referenceCode.stringValue));
  check('consent stored', mine?.fields?.imageConsent?.booleanValue === true);
  check('no status sent from browser (team sets it)', !mine?.fields?.status);
  check('Day 3 interest recorded', mine?.fields?.ticketType?.stringValue === 'SHOWCASE_PHYSICAL');
  await p.keyboard.press('Escape');
  await p.evaluate(() => localStorage.setItem('sgx_forge_dismissed', '1'));
  await p.waitForTimeout(500);

  // 2. Pilot profile + leaderboard
  await p.waitForTimeout(4000);
  check('pilot profile saved', (await list('pilot_profiles')).length >= 1);
  check('leaderboard row saved', (await list('pilot_leaderboard')).length >= 1);

  // A live announcement (e.g. left by admin.cjs) sits bottom-right: close it like a visitor would.
  await p.evaluate(() => document.querySelector('.fixed.bottom-6.right-6 button')?.click());
  await p.waitForTimeout(300);

  // 3. Keynote poll vote
  const votesBefore = (await list('summit_poll_votes')).length;
  const pollOk = await p.evaluate(async () => {
    const btn = [...document.querySelectorAll('button')].find((b) => /KEYNOTE|REACCIONES|REACTIONS|Pulse/i.test(b.textContent || '') || b.querySelector('.lucide-radio'));
    return !!btn;
  });
  // Open the widget, go to the poll tab, vote the first option.
  const pulseBtn = await p.$('.sgx-kpulse__fab');
  if (pulseBtn) {
    await pulseBtn.click(); await p.waitForTimeout(600);
    const pollTab = await p.$('[role=tab] >> text=/Encuesta|Poll/i'); if (pollTab) { await pollTab.click(); await p.waitForTimeout(400); }
    // Polls start closed (the team opens them live from Admin → Encuestas): no vote may go through.
    const closedNote = await p.$('text=/Encuesta cerrada|Poll closed/');
    const enabled = await p.$('.sgx-kpulse__opt:not([disabled])');
    check('closed poll says so and its options are disabled', !!closedNote && !enabled, `(widget found: ${!!pulseBtn || pollOk})`);
    const opt = await p.$('.sgx-kpulse__opt'); if (opt) { await opt.click({ force: true }).catch(() => {}); await p.waitForTimeout(1500); }
  }
  check('no vote reaches Firestore while the poll is closed', (await list('summit_poll_votes')).length === votesBefore);

  // 4. Networking chat message + reaction
  await p.goto(APP + '/?tab=networking', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  const box = await p.$('input[placeholder*="(público)"], input[placeholder*="(public)"]');
  if (box) { await box.fill('Hola desde la prueba e2e'); await box.press('Enter'); await p.waitForTimeout(2500); }
  const msgs = await list('chat_messages');
  const myMsg = msgs.find((d) => d.fields?.text?.stringValue === 'Hola desde la prueba e2e');
  check('chat message reached Firestore', !!myMsg, `(input found: ${!!box})`);
  check('chat message signed by its author', !!myMsg && myMsg.fields.authorUid?.stringValue === myMsg.fields.senderId?.stringValue);

  // 5. Sponsor inquiry form
  await p.goto(APP + '/?tab=sponsors', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_sponsor_modal')));
  await p.waitForTimeout(1500);
  const form = await p.$('input[autocomplete="email"][type="email"]');
  if (form) {
    await p.fill('input[autocomplete="organization"]', 'ACME Prueba');
    await p.fill('input[autocomplete="name"]', 'Ana Prueba');
    await p.fill('input[autocomplete="email"][type="email"]', SPONSOR_EMAIL);
    await p.fill('input[autocomplete="tel"]', '7875550000');
    await p.$eval('input[autocomplete="email"][type="email"]', (e) => e.closest('form').requestSubmit());
    await p.waitForTimeout(3500);
  }
  const inq = await list('sponsor_inquiries');
  check('sponsor inquiry reached Firestore', inq.some((d) => d.fields?.email?.stringValue === SPONSOR_EMAIL), `(form found: ${!!form})`);

  // 6. Visit counter
  check('visit counted', (await list('summit_visit_stats')).length >= 1);

  // 7. Sweep every section: no permission errors anywhere
  for (const t of ['overview', 'pillars', 'agenda', 'speakers', 'map', 'broadcast', 'social', 'guild', 'match', 'games', 'pase', 'visitas']) {
    await p.goto(APP + '/?tab=' + t, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(3500);
  }
  check('no permission-denied in the console', perm.length === 0, perm.slice(0, 5).join(' | '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('zero requests to the real Firebase project', prodHits.length === 0, prodHits.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
