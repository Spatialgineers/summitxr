const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.route(/ipapi|geojs|ipinfo/, (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown','1'); localStorage.setItem('sgx_forge_dismissed','1'); localStorage.setItem('sgx_seeded','1'); localStorage.setItem('sgx_identity_v1', JSON.stringify({ v: 1, pass: { code: 'SGX26-TEST-0001', serial: '0001', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Prueba', email: 'nova@example.com', forgedAt: 1700000000000 }, callsign: 'NOVA-01', affinity: 'SPARK', avatar: { seed: 'x' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] })); });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('ERR', e.message));
  await p.goto('http://localhost:3200/'); await p.waitForTimeout(6000);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_avatar')));
  await p.waitForSelector('.sgx-pilotb-modal .sgx-pilotb'); await p.waitForTimeout(1000);
  const state = async (tag) => console.log(tag, await p.$$eval('.sgx-pilotb-modal .sgx-pilotb__grid button', (bs) => bs.map((x, i) => (x.classList.contains('is-on') ? '*' : '') + x.title).join(', ')),
    '| preview:', (await p.$eval('.sgx-pilotb-modal .sgx-pilotb__preview', (e) => e.innerHTML.length)));
  await state('before');
  await p.click('.sgx-pilotb-modal .sgx-pilotb__hint'); await p.waitForTimeout(600); await state('after hint click');
  const hit = await p.evaluate(() => { const bt = document.querySelectorAll('.sgx-pilotb-modal .sgx-pilotb__grid button')[5]; const r = bt.getBoundingClientRect(); const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { rect: [r.x, r.y, r.width, r.height].map(Math.round), top: top && (top.className?.baseVal ?? top.className) + ' <' + top.tagName + '>', inside: bt.contains(top) }; });
  console.log('hit test', JSON.stringify(hit));
  await p.evaluate(() => document.querySelectorAll('.sgx-pilotb-modal .sgx-pilotb__grid button')[5].click());
  await p.waitForTimeout(800);
  await state('after');
  await p.click('.sgx-pilotb-modal .sgx-pilotb__tabs button:has-text("Pilares")');
  await p.waitForTimeout(300);
  console.log('chest plate on:', await p.$$eval('.sgx-pilotb-modal .sgx-pilotb__plates >> nth=0', () => ''), await p.$$eval('.sgx-pilotb-modal .sgx-pilotb__plates button.is-on', (bs) => bs.map((x) => x.title || x.textContent).join(', ')));
  await b.close();
})();
