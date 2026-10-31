/* Module previews for the pillar pages: a real screenshot of each module,
   saved as public/previews/<module>.webp (640x360). Run against a dev server
   with the Firestore emulator (never production data):
     BASE=http://localhost:3200 node scripts/make-previews.cjs
   Needs python3 with Pillow for the WebP conversion. */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE = process.env.BASE || 'http://localhost:3200';
const OUT = path.join(__dirname, '..', 'public', 'previews');
const TMP = path.join(require('os').tmpdir(), 'sgx-previews');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

// a forged visitor, so the pass-gated modules show their real content
const ID = { v: 1, pass: { code: 'SGX26-DEMO-0042', serial: '0042', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Creadora', email: 'nova@example.com', forgedAt: 1700000000000 }, callsign: 'NOVA-42', affinity: 'SPARK', avatar: { seed: 'nova' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] };

/** file name for a module key (section key, page or event) */
const fileOf = (key) => key.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.route(/ipapi|geojs|ipinfo/, (r) => r.abort());
  await ctx.addInitScript((id) => {
    sessionStorage.setItem('sgx_splash_shown', '1');
    localStorage.setItem('sgx_forge_dismissed', '1');
    localStorage.setItem('sgx_seeded', '1');
    localStorage.setItem('sgx_identity_v1', JSON.stringify(id));
  }, ID);
  const p = await ctx.newPage();
  await p.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(4000);
  const mods = await p.evaluate(async () => {
    const { SGX_PILLARS } = await import('/src/lib/sgxPillars.ts');
    const { SECTION_TO_SLUG } = await import('/src/lib/summitUrlSync.ts');
    return SGX_PILLARS.flatMap((pl) => pl.modules.map((m) => {
      if (m.kind === 'section') return { key: m.key, url: '/' + SECTION_TO_SLUG[m.key] };
      if (m.kind === 'page') return { key: m.page, url: '/' + m.page };
      return { key: m.event, url: '/pase', event: m.event };
    }));
  });
  for (const m of mods) {
    await p.goto(BASE + m.url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(4500);
    if (m.event) { await p.evaluate((e) => window.dispatchEvent(new CustomEvent(e)), m.event); await p.waitForTimeout(2500); }
    // the module's own content: skip the header, the section banner and the floating UI
    // only the module itself: no sponsor strip, no section banner, no floating UI
    await p.addStyleTag({ content: '#summit-sponsor-ticker, .sgx-hero, .sgx-toast, .sgx-toasts, [class*="mission-rail"], .sgx-rail, .sgx-dock, .sgx-nudge, .sgx-push-toast, .sgx-reactor-toast { display: none !important; }' });
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      const wrap = document.querySelector('[id^="summit-section-"], #sgx-studio-page');
      if (wrap) wrap.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -110);
    });
    await p.waitForTimeout(1200);
    const png = path.join(TMP, fileOf(m.key) + '.png');
    await p.screenshot({ path: png, clip: { x: 0, y: 100, width: 1280, height: 720 } });
    const webp = path.join(OUT, fileOf(m.key) + '.webp');
    execFileSync('python3', ['-c', `from PIL import Image; im = Image.open(${JSON.stringify(png)}).convert('RGB').resize((640, 360), Image.LANCZOS); im.save(${JSON.stringify(webp)}, 'WEBP', quality=72, method=6)`]);
    console.log(m.key, '->', path.relative(process.cwd(), webp));
  }
  await b.close();
})();
