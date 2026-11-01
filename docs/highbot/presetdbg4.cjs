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
  await p.evaluate(() => {
    window.__mut = [];
    const grid = document.querySelector('.sgx-pilotb-modal .sgx-pilotb__grid');
    new MutationObserver((ms) => ms.forEach((m) => window.__mut.push(m.type + ':' + (m.target.className?.baseVal ?? m.target.className) + ':' + m.addedNodes.length + '/' + m.removedNodes.length))).observe(grid, { subtree: true, childList: true, attributes: true });
    const ids = () => Array.from(document.querySelectorAll('.sgx-pilotb-modal .sgx-pilotb__grid svg')).map((s) => s.id).join(',');
    window.__mut.push('ids0 ' + ids());
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach((t) => document.addEventListener(t, (e) => window.__mut.push('EV ' + t + ' ' + (e.target.tagName) + ' ids ' + ids().slice(0, 30) + ' connected=' + e.target.isConnected), true));
    window.__ids = ids;
  });
  await p.click('.sgx-pilotb-modal .sgx-pilotb__grid button >> nth=5');
  await p.waitForTimeout(300);
  console.log((await p.evaluate(() => window.__mut)).slice(0, 30).join('\n'));
  console.log('ids1', await p.evaluate(() => window.__ids()));
  await p.waitForTimeout(800);
  await state('after');
  await p.click('.sgx-pilotb-modal .sgx-pilotb__tabs button:has-text("Pilares")');
  await p.waitForTimeout(300);
  console.log('chest plate on:', await p.$$eval('.sgx-pilotb-modal .sgx-pilotb__plates >> nth=0', () => ''), await p.$$eval('.sgx-pilotb-modal .sgx-pilotb__plates button.is-on', (bs) => bs.map((x) => x.title || x.textContent).join(', ')));
  await b.close();
})();
