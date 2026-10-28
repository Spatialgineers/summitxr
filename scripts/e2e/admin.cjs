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
  const adminVisible = await p.evaluate(() => /Centro de mando/i.test(document.body.innerText) && !!document.querySelector('.sgx-admin__nav'));
  check('admin console opens for info@ (Google)', adminVisible);
  await p.screenshot({ path: `${OUT}/admin1.png` });
  if (!adminVisible) { console.log(`DONE ${pass} pass ${fail} fail`); await b.close(); return; }

  // 1. Inscritos: the visitor registration shows up; invite them
  const nav = (label) => p.click(`.sgx-admin__nav button:has-text("${label}")`);
  await nav('Inscritos y Día 3');
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
  await nav('Anuncios');
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

  // 5. Every section opens
  const labels = await p.$$eval('.sgx-admin__nav button', (bs) => bs.map((b) => b.textContent.trim()));
  const errsBefore = errs.length;
  for (const l of labels) { await nav(l); await p.waitForTimeout(350); }
  check(`all ${labels.length} admin sections open without page errors`, labels.length >= 20 && errs.length === errsBefore, errs.slice(errsBefore, errsBefore + 3).join(' | '));

  // 6. CSV: export the agenda, edit it, import with preview, apply
  const fs = require('fs');
  await nav('Agenda / Run of Show');
  await p.waitForTimeout(800);
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('.sgx-asec__csv button:has-text("Exportar")')]);
  const csvText = fs.readFileSync(await dl.path(), 'utf8').replace(/^\uFEFF/, '');
  const lines = csvText.split('\n');
  check('agenda CSV export has the real columns', lines[0].startsWith('"id","day","startTime"') && lines[1].startsWith('"# '), lines[0].slice(0, 60));
  const header = lines[0];
  const firstRow = lines[2];
  const cols = header.split(',').map((h) => h.replace(/"/g, ''));
  const NEW_ID = `sess_e2e_${Date.now() % 1e7}`; // unique per run: the emulator keeps data between runs
  const newRow = cols.map((c) => ({ id: NEW_ID, day: '2', startTime: '3:15 PM', endTime: '3:45 PM', title: 'Sesión e2e', pillarId: 'spark', speakerIds: '', tags: 'e2e | csv' }[c] ?? '')).map((v) => `"${v}"`).join(',');
  const edited = [header, lines[1], firstRow.replace(/^("[^"]*","[^"]*","[^"]*","[^"]*",)"([^"]*)"/, '$1"$2 (editado)"'), newRow].join('\n');
  const tmp = require('path').join(OUT, 'agenda_edit.csv');
  fs.writeFileSync(tmp, edited);
  await p.setInputFiles('.sgx-asec__csv input[type=file]', tmp);
  await p.waitForTimeout(1200);
  const stats = await p.$$eval('.sgx-csvprev__stats b', (bs) => bs.map((b) => b.textContent));
  check('import preview counts 1 new + 1 updated, 0 errors', stats[0] === '1' && stats[1] === '1' && stats[4] === '0', stats.join('/'));
  await p.screenshot({ path: `${OUT}/admin_csv_preview.png` });
  await p.click('.sgx-csvprev footer .sgx-btn:not(.sgx-btn--ground)');
  await p.waitForTimeout(3000);
  const sessDoc = await get('summit_content/sessions');
  const items = sessDoc.fields?.items?.arrayValue?.values || [];
  const added = items.find((v) => v.mapValue.fields.id.stringValue === NEW_ID);
  check('imported session published with real fields', !!added && added.mapValue.fields.startMinutes?.integerValue == 915 && added.mapValue.fields.pillarId?.stringValue === 'SGX.SPARK' && added.mapValue.fields.tags?.arrayValue?.values?.length === 2,
    added ? JSON.stringify(Object.keys(added.mapValue.fields)).slice(0, 80) : 'missing');

  // 7. CSV with an invalid value is blocked
  const bad = [header, lines[1], newRow.replace('"2","3:15 PM"', '"7","3:15 PM"')].join('\n');
  const tmp2 = require('path').join(OUT, 'agenda_bad.csv');
  fs.writeFileSync(tmp2, bad);
  await p.setInputFiles('.sgx-asec__csv input[type=file]', tmp2);
  await p.waitForTimeout(1200);
  const blocked = await p.$eval('.sgx-csvprev footer .sgx-btn:not(.sgx-btn--ground)', (b) => b.disabled);
  const errText = await p.$eval('.sgx-csvprev__errors', (e) => e.textContent).catch(() => '');
  check('invalid CSV is blocked with a row error', blocked && /Fila 3/.test(errText) && /day/.test(errText), errText.slice(0, 90));
  await p.click('.sgx-csvprev footer .sgx-btn--ground');

  // 8. Polls (used to be hard-coded) import and publish
  await nav('Encuestas del keynote');
  await p.waitForTimeout(600);
  const pollsCsv = ['"id","sessionTitle","sessionTitleEn","speaker","speakerEn","question","questionEn","options","optionsEn"', '"poll_e2e","Día 2","Day 2","Equipo","Team","¿Te gusta el CSV?","Do you like CSV?","Sí | No","Yes | No"'].join('\n');
  const tmp3 = require('path').join(OUT, 'polls.csv');
  fs.writeFileSync(tmp3, pollsCsv);
  await p.setInputFiles('.sgx-asec__csv input[type=file]', tmp3);
  await p.waitForTimeout(1000);
  await p.click('.sgx-csvprev footer .sgx-btn:not(.sgx-btn--ground)');
  await p.waitForTimeout(2500);
  const polls = (await get('summit_content/polls')).fields?.items?.arrayValue?.values || [];
  check('polls CSV publishes to summit_content/polls', polls.some((v) => v.mapValue.fields.id.stringValue === 'poll_e2e'), `${polls.length} polls`);
  check('publish badge shows "Publicado"', await p.evaluate(() => /Publicado/.test(document.querySelector('.sgx-pub')?.textContent || '')));

  // 9. Admin roster is visible to the super admin
  await nav('Admins');
  await p.waitForTimeout(1500);
  check('admin roster panel loads', await p.evaluate(() => !!document.querySelector('.sgx-roster__add')));
  await p.screenshot({ path: `${OUT}/admin_roster.png` });

  check('no permission-denied in the console', perm.length === 0, perm.slice(0, 4).join(' | '));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));
  check('zero requests to the real Firebase project', prodHits.length === 0, prodHits.slice(0, 3).join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
