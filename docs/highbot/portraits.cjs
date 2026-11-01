const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:3200/manifest.webmanifest');
  const urls = await p.evaluate(async () => {
    const av = await import('/src/identity/pilotAvatar.ts');
    const out = [];
    for (const x of av.HIGHBOT_PRESETS) out.push(await av.portraitFor(x.config));
    return out;
  });
  const html = `<body style="margin:0;background:#15181e;display:flex;flex-wrap:wrap;gap:8px;padding:8px">${urls.map((u) => `<img src="${u}" style="width:300px;background:#0b0d12">`).join('')}</body>`;
  const q = await b.newPage({ viewport: { width: 1250, height: 760 } });
  await q.setContent(html); await q.waitForTimeout(500);
  await q.screenshot({ path: 'v5-portraits.png' });
  console.log(urls.map((u) => (u || 'null').slice(0, 22)).join(' '));
  await b.close();
})();
