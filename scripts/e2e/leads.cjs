// Potential clients (leads) against the EMULATORS: an admin stars a visitor in Inscritos, a
// sponsor application and a contact in their Rolodex; the lead list follows up (status, note,
// pillars); a visitor never sees the star and the rules keep leads to admins.
const { chromium } = require('playwright');
const APP = process.env.APP_URL || 'http://localhost:3200';
const PROJECT = 'gen-lang-client-0564995587';
const DB = 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac';
const REST = `http://127.0.0.1:8085/v1/projects/${PROJECT}/databases/${DB}/documents`;
const H = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' };
const get = async (path) => (await fetch(`${REST}/${path}`, { headers: H })).json();
const put = (path, fields) => fetch(`${REST}/${path}`, { method: 'PATCH', headers: H, body: JSON.stringify({ fields }) });
const s = (v) => ({ stringValue: v });
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
const run = Date.now().toString(36).slice(-5).toUpperCase();
const block = (ctx) => ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
const waitFor = async (fn, ms = 12000) => { const t0 = Date.now(); let v; while (Date.now() - t0 < ms) { v = await fn(); if (v) return v; await new Promise((r) => setTimeout(r, 600)); } return v; };

(async () => {
  // Seed: a visitor registration, a sponsor application, a contact's registration (for the Rolodex).
  const visCode = `SGX26-LEAD-${run}`;
  const visEmail = `lead.${run.toLowerCase()}@example.com`;
  await put(`ticket_inquiries/${visCode}`, { email: s(visEmail), fullName: s(`Lead Visitante ${run}`), ticketType: s('DIGITAL'), referenceCode: s(visCode), organization: s('Estudio Uno'), roleTitle: s('Directora'), userId: s('u-lead'), imageConsent: { booleanValue: true }, timestamp: { timestampValue: new Date().toISOString() } });
  const contactCode = `SGX26-ROLO-${run}`;
  await put(`ticket_inquiries/${contactCode}`, { email: s(`rolo.${run.toLowerCase()}@example.com`), fullName: s(`Rolo Contacto ${run}`), ticketType: s('DIGITAL'), referenceCode: s(contactCode), organization: s('Marca Dos'), userId: s('u-rolo'), imageConsent: { booleanValue: true }, timestamp: { timestampValue: new Date(Date.now() - 1000).toISOString() } });
  const inqId = `inq_lead_${run}`;
  await put(`sponsor_inquiries/${inqId}`, { companyName: s(`Marca Lead ${run}`), contactName: s('Ana Prueba'), email: s(`ana.${run.toLowerCase()}@example.com`), phone: s('787-555-0101'), selectedTierId: s('tier_2'), selectedTierName: s('Paquete 2'), status: s('PENDING_REVIEW'), referenceCode: s(`SP-${run}`), submittedAt: { integerValue: String(Date.now()) }, goals: { arrayValue: { values: [] } } });

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 950 } }); await block(ctx);
  await ctx.addInitScript(([code, name]) => {
    sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1');
    if (!localStorage.getItem('sgx_seeded')) {
      localStorage.setItem('sgx_seeded', '1');
      localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX26-ADMN-0001', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'SGX Admin', email: 'info@spatialgineers.com', forgedAt: Date.now() }, callsign: 'ADMIN-01', affinity: 'SYSTEM', avatar: { seed: 'a' }, missions: {}, stamps: {}, contacts: [{ code, name, callsign: 'ROLO-1', pillar: 'SPARK', via: 'scanned', at: Date.now() }], xpSpent: 0, redemptions: [] }));
    }
  }, [contactCode, `Rolo Contacto ${run}`]);
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  await p.goto(APP + '/?page=admin', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(7000);
  await p.evaluate(async () => {
    const m = await import('/src/lib/firebase.ts');
    await m.signInWithCredential(m.auth, m.googleProvider.constructor.credential(JSON.stringify({ sub: 'google-info-admin', email: 'info@spatialgineers.com', email_verified: true, name: 'SGX Admin' })));
  });
  await p.waitForTimeout(8000);
  const nav = (label) => p.click(`.sgx-admin__nav button:has-text("${label}")`);

  // 1. Inscritos: star the visitor
  await nav('Inscritos y Día 3'); await p.waitForTimeout(3500);
  const row = p.locator('tr', { hasText: visEmail });
  check('Inscritos shows the ⭐ to admins', (await row.locator('.sgx-leadflag').count()) === 1);
  await row.locator('.sgx-leadflag').click();
  const lv = await waitFor(async () => { const d = await get(`leads/visitor_${visCode}`); return d.fields ? d : null; });
  check('starring a visitor saves the lead (with their email)', lv?.fields?.email?.stringValue === visEmail && lv?.fields?.status?.stringValue === 'NEW', JSON.stringify(lv?.fields || lv).slice(0, 160));
  check('the star stays lit', await waitFor(() => row.locator('.sgx-leadflag.is-on').count()) === 1);

  // 2. Sponsors: star the application
  await nav('Sponsors'); await p.waitForTimeout(4000);
  const card = p.locator('div.space-y-3 > div', { hasText: `Marca Lead ${run}` }).first();
  await card.locator('.sgx-leadflag').click();
  const ls = await waitFor(async () => { const d = await get(`leads/sponsor_${inqId}`); return d.fields ? d : null; });
  check('starring a sponsor application saves the lead (email + phone)', ls?.fields?.email?.stringValue === `ana.${run.toLowerCase()}@example.com` && ls?.fields?.phone?.stringValue === '787-555-0101');

  // 3. Clientes potenciales: follow up
  await nav('Clientes potenciales'); await p.waitForTimeout(3000);
  const item = p.locator('.sgx-leads__item', { hasText: `Lead Visitante ${run}` });
  check('the lead list shows the starred visitor', (await item.count()) === 1);
  await item.locator('select').selectOption('TALKING');
  await item.locator('textarea').fill('Le interesa una activación XR para su lanzamiento.');
  await item.locator('textarea').blur();
  await item.locator('.sgx-leads__pillars button', { hasText: 'Showcase' }).click();
  const lf = await waitFor(async () => { const d = await get(`leads/visitor_${visCode}`); return d.fields?.status?.stringValue === 'TALKING' && /activación XR/.test(d.fields?.note?.stringValue || '') && (d.fields?.interest?.arrayValue?.values || []).some((x) => x.stringValue === 'SHOWCASE') ? d : null; });
  check('status, note and pillar of interest are saved', !!lf);

  // 4. Rolodex (Tu Estudio): star a contact scanned at the event; the email comes from their registration
  await p.goto(APP + '/pase', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(6000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'rolodex' } })));
  await p.waitForTimeout(2500);
  const rolo = p.locator('.sgx-hangar__contacts li', { hasText: `Rolo Contacto ${run}` });
  check('the Rolodex shows the ⭐ to admins', (await rolo.locator('.sgx-leadflag').count()) === 1);
  await rolo.locator('.sgx-leadflag').click();
  const lr = await waitFor(async () => { const d = await get(`leads/visitor_${contactCode}`); return d.fields ? d : null; });
  check('starring a Rolodex contact saves the lead with the email from their registration', lr?.fields?.email?.stringValue === `rolo.${run.toLowerCase()}@example.com` && lr?.fields?.source?.stringValue === 'rolodex', JSON.stringify(lr?.fields || lr).slice(0, 160));
  await ctx.close();

  // 5. A visitor: no star anywhere, and the rules refuse the leads collection
  const c2 = await b.newContext({ viewport: { width: 1366, height: 900 } }); await block(c2);
  await c2.addInitScript(([code]) => {
    sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); localStorage.setItem('sgx_seeded', '1');
    localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX26-VIST-0001', serial: '0002', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Visitante', email: 'v@example.com', forgedAt: Date.now() }, callsign: 'VIS-01', affinity: 'STORY', avatar: { seed: 'v' }, missions: {}, stamps: {}, contacts: [{ code, name: 'Alguien', callsign: 'X', pillar: null, via: 'scanned', at: Date.now() }], xpSpent: 0, redemptions: [] }));
  }, [contactCode]);
  const p2 = await c2.newPage();
  await p2.goto(APP + '/pase', { waitUntil: 'domcontentloaded' }); await p2.waitForTimeout(7000);
  await p2.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'rolodex' } })));
  await p2.waitForTimeout(2500);
  check('a visitor never sees the ⭐', (await p2.locator('.sgx-leadflag').count()) === 0);
  const token = await p2.evaluate(async () => { const m = await import('/src/lib/firebase.ts'); for (let i = 0; i < 20 && !m.auth.currentUser; i++) await new Promise((r) => setTimeout(r, 500)); return m.auth.currentUser ? m.auth.currentUser.getIdToken() : ''; });
  const asVisitor = await fetch(`${REST}/leads/visitor_${visCode}`, { headers: { Authorization: `Bearer ${token}` } });
  const denied = !!token && asVisitor.status === 403;
  check('the rules refuse leads to non-admins', denied);
  await c2.close();

  check('no page errors', errs.length === 0, errs.join(' | '));
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
