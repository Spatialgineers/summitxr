/* Agenda alerts: the ALERTAR menu downloads a real .ics with a 15-min VALARM,
   Google Calendar gets a proper template link, and "my agenda" exports all saved sessions. */
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('path').join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const APP = process.env.APP || 'http://localhost:3200';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };
(async () => {
  const b = await chromium.launch();
  for (const [name, vp] of [['desk', { width: 1366, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, acceptDownloads: true });
    await ctx.route((u) => !u.href.startsWith('http://localhost') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
    await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_dismissed', '1'); });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
    const gcal = []; await ctx.route(/calendar\.google\.com|accounts\.google\.com/, (r) => { gcal.push(r.request().url()); r.fulfill({ status: 200, body: 'ok' }); });
    await p.goto(APP + '/?tab=agenda', { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4000);
    await p.click('button:has-text("Mi Agenda & Alertas")');
    await p.waitForTimeout(800);
    const alertBtn = p.locator('button:has-text("ALERTAR")').first();
    check(`${name}: ALERTAR visible`, await alertBtn.isVisible());
    await alertBtn.click();
    await p.waitForTimeout(300);
    check(`${name}: alert menu opens`, await p.locator('[role=menu]').isVisible());
    await p.screenshot({ path: `${OUT}/agenda_${name}_menu.png` });
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('[role=menu] button >> nth=0')]);
    const ics = fs.readFileSync(await dl.path(), 'utf8');
    check(`${name}: .ics has one event`, (ics.match(/BEGIN:VEVENT/g) || []).length === 1);
    check(`${name}: .ics has a 15-min alarm`, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[^\r]+\r\nTRIGGER:-PT15M\r\nEND:VALARM/.test(ics));
    check(`${name}: .ics times are UTC`, /DTSTART:20261211T\d{4}00Z/.test(ics));
    check(`${name}: .ics lines folded at 75 octets`, ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75));
    check(`${name}: button shows it is in the calendar`, await p.locator('button:has-text("EN TU CALENDARIO")').first().isVisible());
    // Google
    await p.locator('button:has-text("ALERTAR")').first().click();
    await p.click('[role=menu] button:has-text("Google Calendar")');
    await p.waitForTimeout(1200);
    const gurl = gcal.find((u) => u.includes('calendar.google.com')) || '';
    check(`${name}: Google Calendar link`, /action=TEMPLATE/.test(gurl) && /dates=20261211T\d{6}Z%2F/.test(gurl), gurl.slice(0, 90));
    // whole agenda
    const [dl2] = await Promise.all([p.waitForEvent('download'), p.click('button:has-text("ALERTAS DE MI AGENDA")')]);
    const ics2 = fs.readFileSync(await dl2.path(), 'utf8');
    const n = (ics2.match(/BEGIN:VEVENT/g) || []).length;
    check(`${name}: my-agenda .ics has every saved session with alarms`, n >= 1 && (ics2.match(/TRIGGER:-PT15M/g) || []).length === n, `(${n} events)`);
    check(`${name}: alerts persist after reload`, await (async () => { await p.reload(); await p.waitForTimeout(3500); await p.click('button:has-text("Mi Agenda & Alertas")'); await p.waitForTimeout(600); return p.locator('button:has-text("EN TU CALENDARIO")').first().isVisible(); })());
    const ow = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    check(`${name}: no horizontal overflow`, ow <= 1, `(${ow}px)`);
    check(`${name}: no page errors`, errs.length === 0, errs.join(' | '));
    await ctx.close();
  }
  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
})();
