const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:3200/manifest.webmanifest');
  const out = await p.evaluate(async () => {
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const cfg = av.HIGHBOT_PRESETS.find((x) => x.id === 'performer').config;
    const bot = await hb.buildHighbot3D(cfg);
    const rows = [];
    bot.group.traverse((o) => { if (o.isMesh && o.visible) { o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox; const w = new (o.matrixWorld.constructor)(); rows.push([o.name, o.parent && o.parent.name, o.userData.earInner ? 'EAR' : '', o.geometry.index ? o.geometry.index.count / 3 : 0, o.material.color && o.material.color.getHexString()].join(' | ')); } });
    return rows;
  });
  console.log(out.filter((r) => /mask|ear|Mask|whisk|decor/i.test(r)).join('\n'));
  await b.close();
})();
