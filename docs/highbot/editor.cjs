const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  for (const [n, vp] of [['desk', { width: 1366, height: 900 }], ['mob', { width: 390, height: 844 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: n === 'mob' ? 2 : 1 });
    await ctx.route(/ipapi|geojs|ipinfo/, (r) => r.abort());
    await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown','1'); localStorage.setItem('sgx_forge_dismissed','1'); localStorage.setItem('sgx_seeded','1'); localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX26-TEST-0001', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Prueba', email: 'nova@example.com', forgedAt: 1700000000000 }, callsign: 'NOVA-01', affinity: 'SPARK', avatar: { seed: 'x' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] })); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('ERR', e.message));
    await p.goto('http://localhost:3200/'); await p.waitForTimeout(6000);
    await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_avatar')));
    await p.waitForSelector('.sgx-pilotb-modal .sgx-pilotb'); await p.waitForTimeout(1000);
    await p.click('.sgx-pilotb-modal .sgx-pilotb__grid button >> nth=4'); // Performer
    await p.click('.sgx-pilotb-modal .sgx-pilotb__tabs button:has-text("Piezas")');
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `ed-${n}-parts.png` });
    await p.click('.sgx-pilotb-modal .sgx-pilotb__tabs button:has-text("Pilares")');
    await p.waitForTimeout(3000);
    await p.screenshot({ path: `ed-${n}-pillars.png` });
    await ctx.close();
  }
  await b.close();
})();
