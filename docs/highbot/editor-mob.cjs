const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.route(/ipapi|geojs|ipinfo/, (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown','1'); localStorage.setItem('sgx_forge_dismissed','1'); localStorage.setItem('sgx_seeded','1'); localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX26-TEST-0001', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Prueba', email: 'nova@example.com', forgedAt: 1700000000000 }, callsign: 'NOVA-01', affinity: 'SPARK', avatar: { seed: 'x' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] })); });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost:3200/'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_avatar')));
  await p.waitForSelector('.sgx-pilotb-modal .sgx-pilotb'); await p.waitForTimeout(1000);
  await p.click('.sgx-pilotb-modal .sgx-pilotb__grid button >> nth=5'); // Ingeniero
  await p.waitForTimeout(7000);
  await p.screenshot({ path: 'mob-1-vista.png' });
  const tabs = [['Bots', 'mob-2-bots'], ['Piezas', 'mob-3-piezas'], ['Cara', 'mob-4-cara'], ['Pilares', 'mob-5-pilares'], ['Colores', 'mob-6-colores'], ['Textura', 'mob-7-textura']];
  for (const [t, name] of tabs) {
    await p.click(`.sgx-pilotb-modal .sgx-pilotb__tabs button:has-text("${t}")`);
    await p.waitForTimeout(600);
    await p.$eval('.sgx-pilotb-modal .sgx-pilotb__tabs', (e) => e.scrollIntoView({ block: 'start' }));
    await p.waitForTimeout(1500);
    await p.screenshot({ path: `${name}.png` });
  }
  console.log('page errors:', errs.length, errs.slice(0, 2).join(' | '));
  await b.close();
})();
