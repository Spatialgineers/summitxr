/* Radar social · Instagram, against the emulators and a dev server started with
   IG_RADAR_MOCK=1 (fixture posts; Instagram is never called):
     VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 IG_RADAR_MOCK=1 IG_CONFIG_TTL_MS=500 npx tsx server.ts
   Covers: /candidates is admin only (401 without a token and for a signed-in
   non-admin); the admin (info@, emulated Google) sees the candidates in
   Contenido → Redes sociales; "Aprobar" puts a post in the public mural
   (/social) with its Instagram badge and permalink; "Ocultar" takes it out. */
const { chromium } = require('playwright');
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || 'http://localhost:3200';
const AUTH = `http://127.0.0.1:${process.env.AUTH_PORT || 9099}`;
const REST = `http://127.0.0.1:${process.env.FS_PORT || 8085}/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents`;
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function context(b) {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|instagram|fbcdn|facebook/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); localStorage.setItem('sgx_seeded', '1'); });
  ctx.prodHits = prodHits;
  return ctx;
}

/** The public mural: the ids of the Instagram cards it shows. */
async function publicIds(b) {
  const ctx = await context(b);
  const p = await ctx.newPage();
  const early = [];
  p.on('request', (r) => { if (r.url().includes('/api/social/instagram/approved')) early.push(r.url()); });
  await p.goto(`${APP}/social`, { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.sgx-igradar', { state: 'attached', timeout: 30000 }).catch(() => {});
  await p.$eval('.sgx-igradar', (el) => el.scrollIntoView()).catch(() => {});
  await p.waitForTimeout(2500);
  const hrefs = await p.$$eval('.sgx-igradar__card a', (as) => as.map((a) => a.getAttribute('href')));
  const badge = await p.$$eval('.sgx-igradar__card', (cs) => cs.every((c) => /Instagram/.test(c.textContent))).catch(() => false);
  const lazy = await p.$$eval('.sgx-igradar__card img', (is) => is.every((i) => i.getAttribute('loading') === 'lazy')).catch(() => false);
  await p.screenshot({ path: `${OUT}/igradar_public.png`, fullPage: false });
  await ctx.close();
  return { hrefs, badge, lazy, requested: early.length, prodHits: ctx.prodHits };
}

(async () => {
  // Clean slate for the moderation doc.
  await fetch(`${REST}/site_config/social`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });

  /* ---------- /candidates is admin only ---------- */
  const anon = await fetch(`${APP}/api/social/instagram/candidates`);
  check('non-admin: /candidates without a token → 401', anon.status === 401, String(anon.status));
  const su = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `creador${Date.now()}@example.com`, password: 'secret123', returnSecureToken: true }),
  }).then((r) => r.json());
  const nonAdmin = await fetch(`${APP}/api/social/instagram/candidates`, { headers: { Authorization: `Bearer ${su.idToken}` } });
  check('non-admin: /candidates with a Creador token → 401', nonAdmin.status === 401, String(nonAdmin.status));
  const pub0 = await fetch(`${APP}/api/social/instagram/approved`).then((r) => r.json());
  check('public /approved answers with no posts at first', Array.isArray(pub0.posts) && pub0.posts.length === 0, JSON.stringify(pub0).slice(0, 80));

  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

  /* ---------- admin sees candidates ---------- */
  const actx = await context(b);
  const p = await actx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  await p.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  await p.evaluate(async () => {
    const m = await import('/src/lib/firebase.ts');
    const idToken = JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' });
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
  });
  await p.waitForSelector('.sgx-admin__nav', { timeout: 30000 }).catch(() => {});
  await p.click('.sgx-admin__nav button:has-text("Redes sociales")');
  await p.waitForSelector('.sgx-igradar-admin__card', { timeout: 20000 }).catch(() => {});
  const cards = await p.$$eval('.sgx-igradar-admin__card', (cs) => cs.map((c) => c.getAttribute('data-id')));
  check('admin: sees the candidates', cards.length === 4 && cards.includes('mock_ig_1'), cards.join(','));
  const status = await p.$eval('.sgx-igradar-admin__status', (e) => e.getAttribute('data-status') + ' ' + e.textContent).catch(() => '');
  check('admin: status line shows the mode and last sync', /^mock /.test(status) && /Última sincronización/.test(status), status.slice(0, 120));
  await p.screenshot({ path: `${OUT}/igradar_admin.png` });

  /* ---------- approve → in the public mural ---------- */
  await p.click('.sgx-igradar-admin__card[data-id="mock_ig_1"] .sgx-igradar-admin__approve');
  await p.click('.sgx-igradar-admin__card[data-id="mock_ig_3"] .sgx-igradar-admin__approve');
  await sleep(1500);
  let pub = await publicIds(b);
  check('approve: the posts show in the public mural', pub.hrefs.includes('https://www.instagram.com/p/MOCK1/') && pub.hrefs.includes('https://www.instagram.com/p/MOCK3/') && pub.hrefs.length === 2, pub.hrefs.join(','));
  check('public: each card has the Instagram badge and lazy images', pub.badge && pub.lazy);
  check('public: no request to Firebase production or Instagram', pub.prodHits.length === 0, pub.prodHits.join(' '));

  /* ---------- hide → gone ---------- */
  await p.click('button[aria-pressed]:has-text("Aprobadas")');
  await p.waitForSelector('.sgx-igradar-admin__card[data-id="mock_ig_1"] .sgx-igradar-admin__hide', { timeout: 5000 });
  await p.click('.sgx-igradar-admin__card[data-id="mock_ig_1"] .sgx-igradar-admin__hide');
  await sleep(1500);
  pub = await publicIds(b);
  check('hide: the post leaves the public mural', !pub.hrefs.includes('https://www.instagram.com/p/MOCK1/') && pub.hrefs.includes('https://www.instagram.com/p/MOCK3/'), pub.hrefs.join(','));
  const raw = await fetch(`${APP}/api/social/instagram/approved`).then((r) => r.json());
  check('public /approved returns only safe fields', raw.posts.every((x) => !('source' in x) && !('mediaUrl' in x) && x.caption.length <= 280));
  check('admin: no page errors', errs.length === 0, errs.join(' | '));
  check('admin: no request to Firebase production or Instagram', actx.prodHits.length === 0, actx.prodHits.join(' '));

  /* ---------- lazy: nothing requested until the section is visible ---------- */
  {
    const ctx = await context(b);
    const q = await ctx.newPage();
    const calls = []; q.on('request', (r) => { if (r.url().includes('/api/social/instagram')) calls.push(r.url()); });
    await q.goto(`${APP}/`, { waitUntil: 'domcontentloaded' });
    await q.waitForTimeout(6000);
    check('home page: no Instagram radar request', calls.length === 0, calls.join(','));
    await ctx.close();
  }

  await b.close();
  await fetch(`${REST}/site_config/social`, { method: 'DELETE', headers: { Authorization: 'Bearer owner' } });
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
