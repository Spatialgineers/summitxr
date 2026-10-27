// Admin end-to-end against the EMULATORS: Google sign-in (emulated) as info@spatialgineers.com,
// then the real admin screens write to the emulated Firestore under the new rules.
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
const get = async (path) => (await fetch(`${REST}/${path}`, { headers: { Authorization: 'Bearer owner' } })).json();
const list = async (col) => ((await get(`${col}?pageSize=300`)).documents || []);
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const OUT = require('path').join(__dirname, 'out'); require('fs').mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } });
  const prodHits = [];
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => { prodHits.push(r.request().url().slice(0, 90)); r.abort(); });
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p = await ctx.newPage();
  const perm = []; const errs = [];
  p.on('console', (m) => { const t = m.text(); if (/permission|insufficient|PERMISSION_DENIED/i.test(t)) perm.push(t.slice(0, 220)); });
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 200)));

  await p.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(8000);
  // Emulated Google sign-in: the Auth emulator accepts an unsigned Google ID token.
  await p.evaluate(async () => {
    const m = await import('/src/lib/firebase.ts');
    const idToken = JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' });
    const cred = m.googleProvider.constructor.credential(idToken);
    await m.signInWithCredential(m.auth, cred);
  });
  await p.waitForTimeout(9000);
  const adminVisible = await p.evaluate(() => /INSCRITOS & DÍA 3|DIRECTOR CONSOLE/.test(document.body.innerText));
  check('admin console opens for info@ (Google)', adminVisible);
  await p.screenshot({ path: `${OUT}/admin1.png` });
  if (!adminVisible) { console.log(`DONE ${pass} pass ${fail} fail`); await b.close(); return; }

  // 1. Inscritos: the visitor registration shows up; invite them
  await p.click('button:has-text("INSCRITOS & DÍA 3")');
  await p.waitForTimeout(4000);
  const regs = await list('ticket_inquiries');
  const target = regs.find((d) => d.fields?.ticketType?.stringValue === 'SHOWCASE_PHYSICAL' && !d.fields?.status);
  const email = target?.fields?.email?.stringValue;
  check('registrations listed in the panel', !!email && (await p.evaluate((e) => document.body.innerText.includes(e), email)), email || 'none');
  if (email) {
    const row = p.locator('tr', { hasText: email });
    await row.locator('select').selectOption('INVITED');
    await p.waitForTimeout(2500);
    const doc = await get(target.name.split('/documents/')[1]);
    check('invitation status saved', doc.fields?.status?.stringValue === 'INVITED');
  }
  // 2. Day 3 check-in code
  await p.fill('input[placeholder="chroma-xxxxxxxx"]', 'chroma-e2etest01');
  await p.click('button:has-text("Guardar código")');
  await p.waitForTimeout(2500);
  check('check-in code saved (private)', (await get('summit_private/checkin')).fields?.code?.stringValue === 'chroma-e2etest01');
  await p.screenshot({ path: `${OUT}/admin2.png` });

  // 3. CMS: send an announcement
  await p.click('button:has-text("SUMMIT CMS")');
  await p.waitForTimeout(2500);
  const titleInput = await p.$('input[placeholder*="COMIENZA EL BLOQUE"]');
  const msgInput = titleInput ? await titleInput.evaluateHandle((el) => el.closest('form').querySelector('textarea')) : null;
  if (titleInput && msgInput) {
    await titleInput.fill('Prueba e2e');
    await msgInput.fill('Anuncio de prueba desde el CMS');
    await titleInput.evaluate((el) => el.closest('form').requestSubmit());
    await p.waitForTimeout(3000);
  }
  const ann = await get('site_config/announcement');
  check('announcement published', ann.fields?.title?.stringValue === 'Prueba e2e', `(form found: ${!!titleInput && !!msgInput})`);

  // 4. CMS: publish content (simulate an edit through the app's own save path)
  await p.evaluate(async () => {
    const m = await import('/src/lib/summitData.ts');
    const sp = m.loadAllSpeakers();
    m.saveAllSpeakers(sp.map((s, i) => (i === 0 ? { ...s, bio: s.bio + ' ' } : s)));
  });
  await p.waitForTimeout(3000);
  check('CMS content published live (summit_content/speakers)', !!(await get('summit_content/speakers')).fields?.items);

  check('no permission-denied in the console', perm.length === 0, perm.slice(0, 4).join(' | '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('zero requests to the real Firebase project', prodHits.length === 0, prodHits.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
