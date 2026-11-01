const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:3200/manifest.webmanifest');
  const out = await p.evaluate(async () => {
    const av = await import('/src/identity/pilotAvatar.ts');
    const base = { ...av.HIGHBOT_PRESETS[0].config }; delete base.ink;
    const rows = [1, 7, 11, 12, 17, 19, 20, 0, 99].map((n) => { const c = av.normalizePilot({ ...base, pattern: n }); return `${n} -> '${c.pattern}' ink=${c.ink}`; });
    rows.push('v1 pattern 18 -> ' + av.normalizePilot({ shell: '#333', pattern: 18 }).pattern);
    rows.push('string bogus -> ' + JSON.stringify(av.normalizePilot({ ...base, pattern: 'sgx-story', ink: 'x' })).match(/"pattern":"[^"]*","ink":"[^"]*"/)[0]);
    rows.push('keeps -> ' + JSON.stringify(av.normalizePilot({ ...base, pattern: 'zigzag', ink: 'tone' })).match(/"pattern":"[^"]*","ink":"[^"]*"/)[0]);
    return rows;
  });
  console.log(out.join('\n')); await b.close();
})();
