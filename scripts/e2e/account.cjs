// Account switching against the EMULATORS: each Google account keeps its own
// pass, XP and avatar on this device. Signing out parks them; signing in with
// another account never inherits them and opens the Forge instead.
const { chromium } = require('playwright');
const crypto = require('crypto');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const run = Date.now().toString(36);

const signIn = (p, who) => p.evaluate(async (who) => {
  const m = await import('/src/lib/firebase.ts');
  const idToken = JSON.stringify({ sub: who.sub, email: who.email, email_verified: true, name: who.name });
  await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(idToken));
}, who);
const signOut = (p) => p.evaluate(async () => { const m = await import('/src/lib/firebase.ts'); await m.signOut(m.auth); });
const state = (p) => p.evaluate(() => {
  const id = JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}');
  const prof = JSON.parse(localStorage.getItem('sgx_pilot_profile_v2') || '{}');
  return {
    owner: localStorage.getItem('sgx_account_owner'),
    email: id.pass?.email || null,
    code: id.pass?.code || null,
    xp: prof.totalXp || 0,
    slots: Object.keys(localStorage).filter((k) => k.startsWith('sgx_slot:')),
  };
});
/** Waits for the reload a slot swap triggers (or a settle when there is none). */
async function settle(p, expectReload) {
  if (expectReload) await p.waitForEvent('load', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(expectReload ? 7000 : 5000);
}

async function forge(p, name, email) {
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  const start = await p.$('.sgx-forge button.sgx-btn'); if (start) await start.click();
  await p.waitForTimeout(500);
  await p.fill('.sgx-forge input[type=email]', email);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill(name);
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(900);
  await p.click('.sgx-forge__pillars button >> nth=2');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(800);
  await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(4500);
  await p.keyboard.press('Escape');
  await p.waitForTimeout(500);
}

(async () => {
  const b = await chromium.launch();
  const A = { sub: `acct-a-${run}`, email: `ana.${run}@example.com`, name: 'Ana Prueba' };
  const B = { sub: `acct-b-${run}`, email: `beto.${run}@example.com`, name: 'Beto Prueba' };

  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(7000);

  // 1. Guest signs in as A (nothing to conflict: the guest data becomes A's), then forges.
  await signIn(p, A); await settle(p, false);
  let s = await state(p);
  check('guest → A: no reload needed, A owns the device data', s.owner && s.owner !== 'guest', JSON.stringify(s));
  const uidA = s.owner;
  await forge(p, A.name, A.email);
  s = await state(p);
  check('A forged a pass', s.email === A.email, s.email);
  const codeA = s.code, xpA = s.xp;

  // 2. A signs out: A's data is parked, the guest view is clean.
  await signOut(p); await settle(p, true);
  s = await state(p);
  check('sign-out: owner is guest', s.owner === 'guest', s.owner);
  check('sign-out: A\'s pass is not shown', s.email === null, s.email);
  check('sign-out: A\'s data parked in its slot', s.slots.includes(`sgx_slot:${uidA}`), s.slots.join(','));

  // 3. B signs in: never inherits A's pass or XP.
  await signIn(p, B); await settle(p, false);
  s = await state(p);
  const uidB = s.owner;
  check('B signs in: owner is B', uidB && uidB !== uidA && uidB !== 'guest', uidB);
  check('B does not inherit A\'s pass', s.email === null && s.code !== codeA, JSON.stringify(s));
  check('B does not inherit A\'s XP', s.xp < xpA, `B ${s.xp} vs A ${xpA}`);

  // 4. Switch straight from B to A: A's pass and XP come back.
  await signIn(p, A); await settle(p, true);
  s = await state(p);
  check('back to A: pass restored', s.email === A.email && s.code === codeA, JSON.stringify(s));
  check('back to A: XP restored', s.xp >= xpA, `${s.xp} vs ${xpA}`);
  check('back to A: B parked in its slot', s.slots.includes(`sgx_slot:${uidB}`), s.slots.join(','));

  // 5. Switch to B (no pass): the Forge opens on its own after the reload.
  await signIn(p, B); await settle(p, true);
  const forgeOpen = await p.waitForSelector('.sgx-forge', { timeout: 8000 }).then(() => true).catch(() => false);
  s = await state(p);
  check('switch to an account without a pass opens the Forge', forgeOpen);
  check('…and still shows none of A\'s pass', s.email === null, s.email);
  await p.screenshot({ path: require('path').join(__dirname, 'out', 'account_forge.png') });
  await ctx.close();

  // 6. Legacy device (before slots): a pass under another email that a different account
  //    claimed is parked, not handed to whoever signs in now.
  const legacyEmail = `legacy.${run}@example.com`;
  const key = crypto.createHash('sha256').update(legacyEmail).digest('hex');
  await fetch(`${REST}/pass_emails/${key}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { code: { stringValue: 'SGX-LEGACY' }, userId: { stringValue: 'someone-else' }, at: { timestampValue: new Date().toISOString() } } }),
  });
  const ctx2 = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx2.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx2.addInitScript((email) => {
    sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1');
    if (!localStorage.getItem('sgx_seeded')) {
      localStorage.setItem('sgx_seeded', '1');
      localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX-LEGACY', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Otra Persona', email, forgedAt: Date.now() }, callsign: 'OTRA-01', affinity: 'STORY', avatar: { seed: 'x' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] }));
    }
  }, legacyEmail);
  const p2 = await ctx2.newPage();
  p2.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p2.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(7000);
  const C = { sub: `acct-c-${run}`, email: `carla.${run}@example.com`, name: 'Carla Prueba' };
  await signIn(p2, C); await settle(p2, true);
  s = await state(p2);
  check('legacy: someone else\'s claimed pass is parked', s.email === null && s.slots.includes('sgx_slot:someone-else'), JSON.stringify(s));
  await ctx2.close();

  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
