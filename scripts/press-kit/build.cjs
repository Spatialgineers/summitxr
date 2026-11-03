/* Builds the press kit served from /prensa (public/press/):
     logos/   the Summit and Spatialgineers logos (PNG, transparent)
     fotos/   the founders and the team (JPEG, from cdn.spatialgineers.com/Nosotros)
     app/     web app screenshots (JPEG 1440×900, taken from a dev server)
     thumbs/  small previews for the page
     spatialgineers-summit-2026-ficha-de-prensa.pdf   2-page fact sheet + bios (HTML → PDF with Playwright)
     spatialgineers-summit-2026-kit-de-prensa.zip     everything above + LEEME.txt
     kit.json  file sizes for the page
   The list of files, the facts and the bios live in src/lib/pressKit.ts.

   Run from the repo root:
     node scripts/press-kit/build.cjs              # reuses the screenshots already in public/press/app
     BASE=http://localhost:3300 node scripts/press-kit/build.cjs --shots
                                                   # retakes them from a dev server started with the
                                                   # Firebase emulators (VITE_USE_EMULATORS=1), never production
   Needs: playwright (Chromium), python3 with Pillow, curl and zip. */
const { execFileSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require('playwright');
const factSheetHtml = require('./factsheet.cjs');

const ROOT = path.resolve(__dirname, '..', '..');
const PUB = path.join(ROOT, 'public');
const OUT = path.join(PUB, 'press');
const CACHE = path.join(os.tmpdir(), 'sgx-press-kit-cache');
const STAGE = path.join(os.tmpdir(), 'sgx-press-kit-stage');
const BASE = process.env.BASE || '';
const SHOTS = process.argv.includes('--shots');
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const MAX_ZIP = 25 * 1024 * 1024;

for (const d of [OUT, CACHE, path.join(OUT, 'logos'), path.join(OUT, 'fotos'), path.join(OUT, 'app'), path.join(OUT, 'thumbs')]) fs.mkdirSync(d, { recursive: true });

const kit = JSON.parse(execFileSync('npx', ['tsx', path.join(__dirname, 'data.ts')], { cwd: ROOT, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }));
const pub = (p) => path.join(PUB, p.replace(/^\//, ''));
const log = (...a) => console.log('[press-kit]', ...a);

/* ---------- network: curl (proxy and CA aware), cached ---------- */

function fetchCached(url) {
  const key = crypto.createHash('sha1').update(url).digest('hex');
  const file = path.join(CACHE, key);
  const meta = `${file}.type`;
  if (fs.existsSync(file) && fs.existsSync(meta)) return { file, type: fs.readFileSync(meta, 'utf8') };
  const out = execFileSync('curl', ['-sS', '-L', '--fail', '--max-time', '40', '-A', UA, '-o', file, '-w', '%{content_type}', url], { encoding: 'utf8' });
  fs.writeFileSync(meta, out.trim() || 'application/octet-stream');
  return { file, type: out.trim() };
}

/* ---------- images: Pillow ---------- */

const PY = `
import sys
from PIL import Image
mode, src, dst, size, q = sys.argv[1], sys.argv[2], sys.argv[3], int(sys.argv[4]), int(sys.argv[5])
im = Image.open(src)
im.load()
if mode == 'png':
    im = im.convert('RGBA')
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst, 'PNG', optimize=True)
else:
    if im.mode in ('RGBA', 'LA', 'P'):
        im = im.convert('RGBA')
        bg = Image.new('RGB', im.size, (5, 5, 5))
        bg.paste(im, mask=im.split()[3])
        im = bg
    else:
        im = im.convert('RGB')
    im.thumbnail((size, size), Image.LANCZOS)
    im.save(dst, 'JPEG', quality=q, optimize=True, progressive=True)
`;
const image = (mode, src, dst, size, q = 84) => execFileSync('python3', ['-I', '-c', PY, mode, src, dst, String(size), String(q)]);

/* ---------- 1. logos and photos ---------- */

function buildImages() {
  for (const a of kit.PRESS_ASSETS.filter((x) => x.kind !== 'screenshot')) {
    const src = a.source.url ? fetchCached(a.source.url).file : pub(a.source.local);
    if (a.kind === 'logo') {
      image('png', src, pub(a.file), 1600);
      image('png', src, pub(a.thumb), 360);
    } else {
      image('jpg', src, pub(a.file), 2000, 86);
      image('jpg', src, pub(a.thumb), 640, 78);
    }
    log('image', a.file);
  }
}

/* ---------- 2. screenshots (dev server + emulators only) ---------- */

// A forged Creator, so the pass-gated screens show their real content.
const ID = { v: 1, pass: { code: 'SGX26-PRENSA-0007', serial: '0007', tier: 'DIGITAL', status: 'CONFIRMED', fullName: 'Nova Creadora', email: 'nova@example.com', roleTitle: 'Creadora 3D', organization: 'Estudio Nova', forgedAt: 1700000000000 }, callsign: 'NOVA-07', affinity: 'STAGE', avatar: { seed: 'nova' }, missions: {}, stamps: {}, contacts: [], xpSpent: 0, redemptions: [] };
const SCREENS = {
  'app-nucleo-3d': { url: '/', wait: 12000 },
  'app-holo-card': { url: '/pase', wait: 7000, focus: '.sgx-hstudio__preview' },
  'app-highbot': { url: '/avatar', wait: 8000 },
  'app-arena-en-vivo': { url: '/play', wait: 7000 },
  'app-agenda': { url: '/agenda', wait: 6000 },
};

async function routeOutside(ctx) {
  await ctx.route((u) => !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(u.href), async (route) => {
    const url = route.request().url();
    // Never production Firebase; no geolocation, analytics or video embeds in the shots.
    if (/firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo|googletagmanager|google-analytics|youtube|ytimg|instagram/.test(url) || route.request().method() !== 'GET') return route.abort();
    try {
      const { file, type } = fetchCached(url);
      await route.fulfill({ status: 200, contentType: type, body: fs.readFileSync(file), headers: { 'access-control-allow-origin': '*' } });
    } catch { await route.abort(); }
  });
}

async function takeShots() {
  if (!BASE) throw new Error('--shots needs BASE (a dev server running with VITE_USE_EMULATORS=1)');
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await routeOutside(ctx);
  await ctx.addInitScript((id) => {
    sessionStorage.setItem('sgx_splash_shown', '1');
    localStorage.setItem('sgx_forge_dismissed', '1');
    localStorage.setItem('sgx_seeded', '1');
    localStorage.setItem('sgx_identity_v1', JSON.stringify(id));
  }, ID);
  const p = await ctx.newPage();
  for (const [slug, s] of Object.entries(SCREENS)) {
    await p.goto(BASE + s.url, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(s.wait);
    await p.addStyleTag({ content: '.sgx-toast, .sgx-toasts, .sgx-push-toast, .sgx-reactor-toast, .sgx-nudge { display: none !important; }' });
    if (s.focus) await p.evaluate((sel) => { const el = document.querySelector(sel); if (el) { el.scrollIntoView({ block: 'center' }); } }, s.focus);
    await p.waitForTimeout(800);
    const file = pub(`/press/app/${slug}.jpg`);
    await p.screenshot({ path: file, type: 'jpeg', quality: 86 });
    log('screenshot', slug);
  }
  await b.close();
}

function buildShotThumbs() {
  for (const a of kit.PRESS_ASSETS.filter((x) => x.kind === 'screenshot')) {
    if (!fs.existsSync(pub(a.file))) throw new Error(`missing ${a.file}: run with BASE=… --shots once`);
    image('jpg', pub(a.file), pub(a.thumb), 640, 78);
  }
}

/* ---------- 3. fact sheet PDF ---------- */

function localFontCss() {
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;800&family=Chakra+Petch:wght@400;600&family=Exo+2:wght@400;600;700&family=Share+Tech+Mono&display=block';
  let css = fs.readFileSync(fetchCached(cssUrl).file, 'utf8');
  css = css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, u) => `url(file://${fetchCached(u).file})`);
  return css;
}

async function buildPdf() {
  const fileUrl = (p) => `file://${pub(p)}`;
  const pillars = Object.fromEntries(['STORY', 'SHOWCASE', 'SPARK', 'STAGE', 'SYSTEM', 'SYNTHESIZE'].map((k) => [k, fileUrl(`/holo/${k.toLowerCase()}.png`)]));
  const files = {
    summitLogo: fileUrl('/press/logos/spatialgineers-summit-2026-logo.png'),
    sgxLogo: fileUrl('/press/logos/spatialgineers-logo.png'),
    founders: Object.fromEntries(kit.PRESS_FOUNDERS.map((f) => [f.id, fileUrl(f.photo)])),
    pillars,
  };
  const html = factSheetHtml(kit, files, localFontCss());
  const htmlFile = path.join(CACHE, 'ficha.html');
  fs.writeFileSync(htmlFile, html);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(`file://${htmlFile}`, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: pub(kit.PRESS_FACT_SHEET_PDF), format: 'A4', printBackground: true, preferCSSPageSize: true });
  await p.setViewportSize({ width: 794, height: 1123 });
  await p.screenshot({ path: path.join(CACHE, 'ficha-preview.png'), fullPage: true });
  await b.close();
  log('pdf', kit.PRESS_FACT_SHEET_PDF, `(preview: ${path.join(CACHE, 'ficha-preview.png')})`);
}

/* ---------- 4. zip ---------- */

const LEEME = (k) => `SPATIALGINEERS SUMMIT 2026 · KIT DE PRENSA
11–13 de diciembre de 2026 · Días 1 y 2 gratis por YouTube Live · Día 3 en Chroma Space Studios, San Juan · En español

Contenido
- ficha-de-prensa.pdf: datos del Summit, los tres días, los seis pilares y las bios de los fundadores.
- logos/: logos del Spatialgineers Summit y de Spatialgineers (PNG con fondo transparente).
- fotos/: Danelson Maldonado González "The Highgineer", Ricardo A. Hernández Díaz "Lightning Fingers" y el equipo.
- capturas-de-la-app/: la webapp del Summit (núcleo 3D, Holo Card, Highbot, arena de votación en vivo y agenda).

Uso
Libre uso editorial para cubrir el Spatialgineers Summit 2026, con el crédito "Foto: Spatialgineers" o "Captura: Spatialgineers Summit 2026".
No modifiques los logos. Para otros usos, escríbenos.

Acreditación de prensa
${k.PRESS_RULES.deadline.es} en summit.spatialgineers.com/prensa. ${k.PRESS_RULES.slots.es}.
${k.PRESS_RULES.access.es}

Contacto de prensa
info@spatialgineers.com · +1 (787) 445-5284 · @spatialgineers (Instagram y YouTube)
summit.spatialgineers.com/prensa

© 2026 Spatialgineers LLC
`;

function buildZip() {
  const name = 'spatialgineers-summit-2026-kit-de-prensa';
  fs.rmSync(STAGE, { recursive: true, force: true });
  const dir = path.join(STAGE, name);
  const put = (from, to) => { fs.mkdirSync(path.dirname(path.join(dir, to)), { recursive: true }); fs.copyFileSync(from, path.join(dir, to)); };
  put(pub(kit.PRESS_FACT_SHEET_PDF), 'ficha-de-prensa.pdf');
  const folder = { logo: 'logos', photo: 'fotos', screenshot: 'capturas-de-la-app' };
  for (const a of kit.PRESS_ASSETS) put(pub(a.file), `${folder[a.kind]}/${path.basename(a.file)}`);
  fs.writeFileSync(path.join(dir, 'LEEME.txt'), LEEME(kit));
  const zip = pub(kit.PRESS_KIT_ZIP);
  fs.rmSync(zip, { force: true });
  execFileSync('zip', ['-r', '-X', '-q', '-9', zip, name], { cwd: STAGE });
  const size = fs.statSync(zip).size;
  if (size > MAX_ZIP) throw new Error(`the zip is ${(size / 1048576).toFixed(1)} MB (limit 25 MB)`);
  log('zip', kit.PRESS_KIT_ZIP, `${(size / 1048576).toFixed(1)} MB`);
}

function writeSizes() {
  const sizes = {};
  const files = [kit.PRESS_KIT_ZIP, kit.PRESS_FACT_SHEET_PDF, ...kit.PRESS_ASSETS.map((a) => a.file)];
  for (const f of files) sizes[path.basename(f)] = fs.statSync(pub(f)).size;
  fs.writeFileSync(path.join(OUT, 'kit.json'), JSON.stringify({ sizes }, null, 1) + '\n');
}

(async () => {
  buildImages();
  if (SHOTS) await takeShots();
  buildShotThumbs();
  await buildPdf();
  buildZip();
  writeSizes();
  log('done');
})().catch((err) => { console.error('[press-kit] failed:', err.message || err); process.exit(1); });
