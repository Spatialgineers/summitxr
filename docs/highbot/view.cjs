const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const THREE_DIR = '/home/user/summitxr/node_modules/three';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  p.on('console', m => console.log('PAGE', m.text()));
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.route('http://local/**', (route) => {
    const u = new URL(route.request().url()).pathname;
    let file;
    if (u.startsWith('/three/')) file = path.join(THREE_DIR, u.slice(7));
    else file = path.join(__dirname, u.slice(1));
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream';
    route.fulfill({ status: 200, body: fs.readFileSync(file), contentType: type });
  });
  await p.goto('http://local/view.html?glb=' + (process.argv[2] || 'mo.glb'));
  await p.waitForFunction(() => window.__done === true, null, { timeout: 120000 });
  for (const v of ['front', 'side', 'back']) { await p.evaluate((v) => window.__shot(v), v); await p.waitForTimeout(300); await p.screenshot({ path: `view-${v}.png` }); }
  await b.close();
})();
