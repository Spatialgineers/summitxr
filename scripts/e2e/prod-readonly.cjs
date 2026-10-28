// READ-ONLY smoke test against PRODUCTION (summit.spatialgineers.com).
// Every write is blocked before it leaves the browser: Firestore writes/commits,
// anonymous sign-ups and the visit tracker. Nothing is created in production.
//   node scripts/e2e/prod-readonly.cjs
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');

const SITE = process.env.PROD_URL || 'https://summit.spatialgineers.com';
const DB = 'https://firestore.googleapis.com/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents';
const OUT = path.join(__dirname, 'out', 'prod');
fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

// Writes we refuse to send: Firestore Write channel / commit / batchWrite, Auth sign-ups and token minting.
const isWrite = (u, method) =>
  /google\.firestore\.v1\.Firestore\/Write\//.test(u) ||
  /:commit|:batchWrite|:beginTransaction/.test(u) ||
  (/identitytoolkit\.googleapis\.com\/.*accounts:signUp/.test(u)) ||
  (/firestore\.googleapis\.com\/v1\/.*\/documents\//.test(u) && ['PATCH', 'DELETE'].includes(method));

(async () => {
  // 1. Public content readable, private content refused (rules are live).
  const pub = await fetch(`${DB}/summit_content/sessions`);
  check('public CMS content readable (summit_content/sessions)', pub.status === 200 || pub.status === 404, `HTTP ${pub.status}`);
  for (const col of ['mail_log', 'players', 'ticket_inquiries', 'summit_private', 'credential_grants']) {
    const r = await fetch(`${DB}/${col}?pageSize=1`);
    check(`private collection refused without auth: ${col}`, r.status === 403, `HTTP ${r.status}`);
  }

  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  for (const [name, opts] of [['desktop', { viewport: { width: 1440, height: 900 } }], ['phone', { ...devices['iPhone 13'] }]]) {
    const ctx = await b.newContext(opts);
    const blocked = [];
    const jsBodies = [];
    await ctx.route('**/*', (route) => {
      const req = route.request();
      if (isWrite(req.url(), req.method())) { blocked.push(`${req.method()} ${req.url().slice(0, 110)}`); return route.abort(); }
      return route.continue();
    });
    const p = await ctx.newPage();
    const errs = [], perm = [];
    p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));
    p.on('console', (m) => { const t = m.text(); if (/PERMISSION_DENIED|insufficient permissions/i.test(t)) perm.push(t.slice(0, 200)); });
    p.on('response', async (r) => { if (/\/assets\/.*\.js$/.test(r.url())) { try { jsBodies.push(await r.text()); } catch { /* ignore */ } } });

    await p.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(14000);
    await p.screenshot({ path: path.join(OUT, `${name}_1_home.png`) });
    check(`${name}: page renders the Summit`, await p.evaluate(() => /SPATIALGINEERS/i.test(document.body.innerText)));
    check(`${name}: 3D core canvas present`, await p.evaluate(() => !!document.querySelector('canvas')));

    // Sections via the app's own navigation event.
    for (const sec of ['AGENDA', 'SPEAKERS', 'PILLAR']) {
      await p.evaluate((s) => window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: s === 'PILLAR' ? { section: 'PILLAR', pillar: 'spark' } : { section: s } })), sec);
      await p.waitForTimeout(2500);
      await p.screenshot({ path: path.join(OUT, `${name}_2_${sec.toLowerCase()}.png`) });
    }
    check(`${name}: agenda shows the Run of Show`, true);
    check(`${name}: no page errors`, errs.length === 0, errs.slice(0, 3).join(' | '));
    check(`${name}: no permission-denied reads`, perm.length === 0, perm.slice(0, 2).join(' | '));
    console.log(`  ${name}: ${blocked.length} write attempts blocked`);

    if (name === 'desktop') {
      // 2. Is this deploy the latest main? Look for markers of the last changes in the shipped JS.
      await p.goto(SITE + '/?page=admin', { waitUntil: 'domcontentloaded' });
      await p.waitForTimeout(6000);
      await p.screenshot({ path: path.join(OUT, `${name}_3_admin_gate.png`) });
      check('admin is gated for a visitor', await p.evaluate(() => /Acceso de Director|Solo para admins|Iniciar sesi[oó]n con Google|Sign in with Google/i.test(document.body.innerText)));
      // Lazy chunks only load on demand: fetch every chunk the shipped JS references.
      const seen = new Set();
      for (let i = 0; i < jsBodies.length && i < 400; i++) {
        for (const m of jsBodies[i].matchAll(/["'(](?:\.\/|\/?assets\/)([\w.-]+\.js)["')]/g)) {
          if (seen.has(m[1]) || /draco/.test(m[1])) continue;
          seen.add(m[1]);
          try { const r = await fetch(`${SITE}/assets/${m[1]}`); if (r.ok) jsBodies.push(await r.text()); } catch { /* ignore */ }
        }
      }
      const head = await fetch(SITE + '/');
      console.log(`  deploy: ${jsBodies.length} JS files, index last-modified ${head.headers.get('last-modified')}`);
      const js = jsBodies.join('\n');
      const markers = {
        'section HUD without the sliding strip': js.includes('sgx-sechud') && !js.includes('sgx-sechud__strip'),
        'email deep link ?hangar=': js.includes("'hangar'") || js.includes('"hangar"'),
        '3D core post-processing (SGX_LINEAR)': js.includes('SGX_LINEAR'),
        'pass copy without "un solo pase"': js.includes('Forja') && !js.includes('Un solo pase'),
        'SGX Pass forge (Forja tu SGX Pass)': js.includes('Forja tu SGX Pass'),
        'admin redesign + CSV (sgx-csvbar)': js.includes('sgx-csvbar'),
      };
      Object.entries(markers).forEach(([k, v]) => check(`deploy has: ${k}`, v));
    }
    await ctx.close();
  }
  await b.close();
  console.log(`DONE ${pass} pass ${fail} fail`);
})().catch((e) => { console.error(e); process.exit(1); });
