/* Publicador de redes (Instagram + Facebook), against the emulators and a dev
   server started with SOCIAL_PUBLISH_MOCK=1 (Meta is never called):
     VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 SOCIAL_PUBLISH_MOCK=1 SOCIAL_TICK_MS=3000 npx tsx server.ts
   Covers: /status is admin only;    a bad import is rejected whole; the admin imports a week (JSON) as drafts,
   "Aprobar la semana" approves them all, the due post is published to IG + FB
   with links, the future one stays approved; no sideways scroll at 390 px. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const APP = process.env.APP_URL || 'http://localhost:3200';
const FS = `http://127.0.0.1:${process.env.FS_PORT || 8085}`;
const AUTH = `http://127.0.0.1:${process.env.AUTH_PORT || 9099}`;
const REST = `${FS}/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents`;
// The super-admin email, read from the rules (emulated Google sign-in only).
const ADMIN_EMAIL = fs.readFileSync(path.join(__dirname, '..', '..', 'firestore.rules'), 'utf8').match(/in \['([^']+)'/)[1];
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const owner = { Authorization: 'Bearer owner' };

(async () => {
  const old = await fetch(`${REST}/social_posts?pageSize=300`, { headers: owner }).then((r) => r.json());
  for (const d of old.documents || []) await fetch(`${FS}/v1/${d.name}`, { method: 'DELETE', headers: owner });

  // A half-written doc (no publishAt, no media, unknown status) must not break the panel.
  await fetch(`${REST}/social_posts?documentId=roto`, { method: 'POST', headers: { ...owner, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { title: { stringValue: 'Doc roto' }, status: { stringValue: 'raro' } } }) });

  check('status without token → 401', (await fetch(`${APP}/api/social/publisher/status`)).status === 401);
  const su = await fetch(`${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `creador${Date.now()}@example.com`, password: 'secret123', returnSecureToken: true }),
  }).then((r) => r.json());
  const creator = { Authorization: `Bearer ${su.idToken}` };
  check('status with a Creador token → 401', (await fetch(`${APP}/api/social/publisher/status`, { headers: creator })).status === 401);
  // Note: the emulator does not enforce rules on this named database, so the
  // social_posts rules are checked by the rules publish, not here.

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebase|instagram|facebook/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /wixstatic|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); localStorage.setItem('sgx_seeded', '1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
  p.on('dialog', (d) => d.accept());
  await p.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(6000);
  await p.evaluate(async (email) => {
    const m = await import('/src/lib/firebase.ts');
    const idToken = JSON.stringify({ sub: 'google-info-admin', email, email_verified: true, name: 'SGX Admin' });
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
  }, ADMIN_EMAIL);
  await p.waitForSelector('.sgx-admin__nav', { timeout: 30000 }).catch(() => {});
  await p.click('.sgx-admin__nav button:has-text("Redes sociales")');
  await p.waitForSelector('.sgx-pub', { timeout: 20000 }).catch(() => {});
  await p.waitForFunction(() => /Instagram ✅/.test(document.querySelector('.sgx-pub__server')?.textContent || ''), null, { timeout: 15000 }).catch(() => {});
  const srv = await p.$eval('.sgx-pub__server', (e) => e.textContent).catch(() => '');
  check('panel: server ready in mock mode', /Instagram ✅ · Facebook ✅ · Base de datos ✅/.test(srv) && /modo de prueba/.test(srv), srv.slice(0, 120));

  const prNow = new Date(Date.now() - 4 * 3600e3 - 60e3).toISOString().slice(0, 16);
  const tags = '#SpatialgineersSummit #RoadToSummit #Spatialgineers';
  await p.click('.sgx-pub__import summary');
  await p.fill('.sgx-pub__import textarea', JSON.stringify([{ title: 'Sin hashtags', kind: 'REEL', publishAt: prNow, mediaUrls: ['https://video.wixstatic.com/x/file'], caption: 'hola' }]));
  await p.click('.sgx-pub__import button');
  await p.waitForTimeout(800);
  check('import: a caption without the hashtags is rejected', /No se importó nada/.test(await p.$eval('.sgx-pub__msg', (e) => e.textContent).catch(() => '')));

  const week = [
    { title: 'Teaser powered by', kind: 'REEL', publishAt: prNow, mediaUrls: ['https://video.wixstatic.com/video/teaser/file'], caption: `Powered by high vibes ⚡\n\n${tags}` },
    { title: 'Carrusel pase', kind: 'CAROUSEL', publishAt: '2030-01-07T19:00', mediaUrls: ['https://static.wixstatic.com/a.jpg', 'https://static.wixstatic.com/b.jpg'], caption: `Tu pase.\n\n${tags}` },
  ];
  await p.fill('.sgx-pub__import textarea', JSON.stringify(week));
  await p.click('.sgx-pub__import button');
  await p.waitForSelector('.sgx-pub__post', { timeout: 10000 }).catch(() => {});
  const drafts = await p.$$eval('.sgx-pub__post.is-draft', (l) => l.length);
  check('import: 2 posts in as drafts (+ the broken doc shown as a draft)', drafts === 3, String(drafts));
  check('broken doc listed under "Sin fecha" without crashing', /Sin fecha/.test(await p.$eval('.sgx-pub', (e) => e.textContent)));
  await p.click('.sgx-pub__post:has-text("Doc roto") button:has-text("Borrar")');
  await p.waitForTimeout(800);

  for (const btn of await p.$$('.sgx-pub__week header button')) await btn.click();
  await p.waitForTimeout(1000);
  const approved = await p.$$eval('.sgx-pub__post.is-approved, .sgx-pub__post.is-publishing, .sgx-pub__post.is-published', (l) => l.length);
  check('"Aprobar la semana" approves every draft', approved === 2, String(approved));

  await p.click('.sgx-pub__server button');
  await p.waitForSelector('.sgx-pub__post.is-published', { timeout: 20000 }).catch(() => {});
  const pub = await p.$$eval('.sgx-pub__post.is-published', (l) => l.map((x) => x.textContent));
  check('due post published to IG + FB with links', pub.length === 1 && /Teaser powered by/.test(pub[0]) && (pub[0].match(/ver post/g) || []).length === 2, pub.join('|').slice(0, 160));
  check('future post stays approved', (await p.$$eval('.sgx-pub__post.is-approved', (l) => l.length)) === 1);
  const docs = await fetch(`${REST}/social_posts`, { headers: owner }).then((r) => r.json());
  const teaser = (docs.documents || []).find((d) => d.fields.title.stringValue === 'Teaser powered by');
  check('Firestore: results.ig.id written by the server', /^mock_ig_/.test(teaser?.fields?.results?.mapValue?.fields?.ig?.mapValue?.fields?.id?.stringValue || ''));
  // Paquetes listos: pick the bundled test batch, load and approve in one go.
  await p.selectOption('.sgx-pub__batches select', 'test_powered_by.json');
  await p.waitForSelector('.sgx-pub__batches li', { timeout: 10000 }).catch(() => {});
  await p.click('.sgx-pub__batches button:has-text("Cargar y aprobar")');
  await p.waitForSelector('.sgx-pub__post:has-text("TEST · Teaser Powered by")', { timeout: 10000 }).catch(() => {});
  const testCls = await p.$eval('.sgx-pub__post:has-text("TEST · Teaser Powered by")', (e) => e.className).catch(() => '');
  check('paquete listo: cargado y aprobado de una', /is-(approved|publishing|published)/.test(testCls), testCls);
  await p.screenshot({ path: `${OUT}/publisher_admin.png`, fullPage: true });

  await p.setViewportSize({ width: 390, height: 844 });
  await p.waitForTimeout(500);
  check('390 px: no sideways scroll', !(await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)));
  await p.screenshot({ path: `${OUT}/publisher_mobile.png`, fullPage: false });

  check('no page errors', errs.length === 0, errs.join(' | '));
  check('zero production requests', prodHits.length === 0, prodHits.join(' '));
  await b.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
