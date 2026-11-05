// Builds docs/guia/Guia_WebApp_Spatialgineers_Summit_2026.pdf from the screenshots taken by
// shots.cjs (scripts/guide-pdf/out/shots/*.jpg). Usage: node scripts/guide-pdf/build.cjs
// Fonts (Orbitron, Share Tech Mono, Exo 2) come from Google Fonts, cached in out/fonts.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const SHOTS = path.join(__dirname, 'out', 'shots');
const FONTS = path.join(__dirname, 'out', 'fonts');
const OUT_PDF = path.join(ROOT, 'docs', 'guia', 'Guia_WebApp_Spatialgineers_Summit_2026.pdf');
const { pages: CONTENT, DATES } = require('./content.cjs');

/* ---------- fonts, embedded so the PDF never depends on the network at render time ---------- */
function fontCss() {
  fs.mkdirSync(FONTS, { recursive: true });
  const cssFile = path.join(FONTS, 'fonts.css');
  if (!fs.existsSync(cssFile)) {
    const url = 'https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=Exo+2:ital,wght@0,400;0,600;0,700;1,400&family=Share+Tech+Mono&display=swap';
    let css = execFileSync('curl', ['-sS', '-A', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36', url]).toString();
    // keep only the latin subsets
    css = css.split('/*').filter((b) => /^\s*latin \*\//.test(b)).map((b) => '/*' + b).join('\n');
    let i = 0;
    css = css.replace(/url\((https:[^)]+)\)/g, (_, u) => {
      const f = path.join(FONTS, `f${i++}.woff2`);
      execFileSync('curl', ['-sS', '-o', f, u]);
      return `url(data:font/woff2;base64,${fs.readFileSync(f).toString('base64')})`;
    });
    fs.writeFileSync(cssFile, css);
  }
  return fs.readFileSync(cssFile, 'utf8');
}

const img = (name) => {
  const f = path.join(SHOTS, `${name}.jpg`);
  if (!fs.existsSync(f)) { console.log('missing shot', name); return null; }
  return `data:image/jpeg;base64,${fs.readFileSync(f).toString('base64')}`;
};
const logo = `data:image/png;base64,${fs.readFileSync(path.join(ROOT, 'public', 'brand', 'summit-logo.png')).toString('base64')}`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/* ---------- page renderers ---------- */
function phones(list) {
  const ok = list.filter((s) => img(s.img));
  return `<div class="phones n${ok.length}">${ok.map((s) => `<figure class="phone"><img src="${img(s.img)}"><figcaption>${md(s.cap || '')}</figcaption></figure>`).join('')}</div>`;
}
function desks(list) {
  const ok = list.filter((s) => img(s.img));
  return `<div class="desks n${ok.length}">${ok.map((s) => `<figure class="desk"><img src="${img(s.img)}"><figcaption>${md(s.cap || '')}</figcaption></figure>`).join('')}</div>`;
}
function body(pg) {
  let h = '';
  if (pg.kicker) h += `<p class="kicker">${esc(pg.kicker)}</p>`;
  if (pg.title) h += `<h1 style="${pg.accent ? `--acc:${pg.accent}` : ''}">${esc(pg.title)}</h1>`;
  if (pg.lead) h += `<p class="lead">${md(pg.lead)}</p>`;
  if (pg.bullets) h += `<ul class="bul${pg.bullets.length > 5 ? ' two' : ''}">${pg.bullets.map((b) => `<li>${md(b)}</li>`).join('')}</ul>`;
  if (pg.phones) h += phones(pg.phones);
  if (pg.desks) h += desks(pg.desks);
  if (pg.html) h += pg.html;
  if (pg.bullets2) h += `<ul class="bul${pg.bullets2.length > 4 ? ' two' : ''}">${pg.bullets2.map((b) => `<li>${md(b)}</li>`).join('')}</ul>`;
  if (pg.tip) h += `<p class="tip"><span>Beneficio</span>${md(pg.tip)}</p>`;
  return h;
}

function build() {
  // Number the pages: cover = 1, toc = 2, then content.
  const pages = [];
  pages.push({ kind: 'cover' });
  pages.push({ kind: 'toc' });
  for (const pg of CONTENT) pages.push(pg);
  pages.forEach((p, i) => { p.n = i + 1; });
  const toc = pages.filter((p) => p.toc).map((p) => ({ t: p.toc, n: p.n, sub: !!p.tocSub }));

  const html = pages.map((p) => {
    if (p.kind === 'cover') {
      return `<section class="page cover">
        <div class="grid"></div>
        <img class="logo" src="${logo}">
        <p class="kicker">Guía de la webapp</p>
        <h1 class="ctitle">Spatialgineers<br><span>Summit 2026</span></h1>
        <p class="cdate">11–13 dic 2026 · YouTube Live + Chroma Space Studios, San Juan</p>
        <p class="csub">Todo lo que puedes hacer en la app, página por página.<br>Para el equipo y para quien llega nuevo.</p>
        <p class="curl">summit.spatialgineers.com</p>
      </section>`;
    }
    if (p.kind === 'toc') {
      return `<section class="page"><div class="inner">
        <p class="kicker">Índice</p><h1>Contenido</h1>
        <ol class="toc">${toc.map((t) => `<li class="${t.sub ? 'sub' : ''}"><span>${esc(t.t)}</span><i></i><b>${t.n}</b></li>`).join('')}</ol>
      </div>${foot(p.n)}</section>`;
    }
    if (p.kind === 'dates') {
      return `<section class="page"><div class="inner">${body(p)}
        <table class="dates">${DATES.map(([d, what]) => `<tr><td>${esc(d)}</td><td>${md(what)}</td></tr>`).join('')}</table>
        <p class="note">Hora de Puerto Rico (AST, UTC-4). Los formularios se cierran solos al pasar su fecha.</p>
      </div>${foot(p.n)}</section>`;
    }
    if (p.kind === 'contact') {
      return `<section class="page cover contact">
        <div class="grid"></div>
        <img class="logo small" src="${logo}">
        <p class="kicker">Contacto</p>
        <h1 class="ctitle">Hablemos</h1>
        <div class="cards">
          <div><span>Correo</span><b>info@spatialgineers.com</b></div>
          <div><span>Webapp</span><b>summit.spatialgineers.com</b></div>
          <div><span>YouTube</span><b>@spatialgineers</b></div>
          <div><span>Instagram</span><b>@spatialgineers</b></div>
        </div>
        <p class="csub">Spatialgineers LLC · Puerto Rico<br>Fundadores: Danelson Maldonado González y Ricardo A. Hernández Díaz</p>
        <p class="curl">#SpatialgineersSummit · Ingeniando imaginación, construyendo realidades.</p>
        ${foot(p.n, true)}
      </section>`;
    }
    if (p.kind === 'divider') {
      return `<section class="page divider" style="--acc:${p.accent || '#FDCC0D'}"><div class="grid"></div>
        <p class="num">${esc(p.num || '')}</p><h1>${esc(p.title)}</h1><p class="lead">${md(p.lead || '')}</p>${foot(p.n)}</section>`;
    }
    return `<section class="page${p.dense ? ' dense' : ''}"><div class="inner">${body(p)}</div>${foot(p.n)}</section>`;
  }).join('\n');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>${fontCss()}${CSS}</style></head><body>${html}</body></html>`;
}
const foot = (n, light) => `<footer class="foot${light ? ' light' : ''}"><span>Spatialgineers Summit 2026 · Guía de la webapp</span><b>${String(n).padStart(2, '0')}</b></footer>`;

const CSS = `
@page { size: A4; margin: 0; }
:root { --bg:#050505; --y:#FDCC0D; --c:#00DDFF; --b:#32527B; --t:#E8EDF2; --m:#9AA6B2; }
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: var(--bg); color: var(--t); font-family: 'Exo 2', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; background:
  radial-gradient(120mm 80mm at 100% 0%, rgba(50,82,123,.35), transparent 70%),
  radial-gradient(90mm 70mm at 0% 100%, rgba(0,221,255,.08), transparent 70%), var(--bg); }
.page::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3mm; background: linear-gradient(var(--y), var(--b)); }
.inner { padding: 16mm 15mm 18mm 18mm; height: 100%; display: flex; flex-direction: column; }
.kicker { font-family: 'Share Tech Mono', monospace; color: var(--c); letter-spacing: .25em; text-transform: uppercase; font-size: 8.5pt; margin-bottom: 2mm; }
h1 { font-family: 'Orbitron', sans-serif; font-weight: 900; font-size: 21pt; line-height: 1.12; color: var(--acc, var(--y)); text-transform: uppercase; letter-spacing: .02em; margin-bottom: 4mm; }
.lead { font-size: 10.5pt; line-height: 1.5; color: var(--t); margin-bottom: 4mm; max-width: 172mm; }
strong { color: #fff; font-weight: 700; }
.bul { list-style: none; font-size: 9.5pt; line-height: 1.42; margin-bottom: 4mm; }
.bul.two { columns: 2; column-gap: 8mm; }
.bul li { position: relative; padding-left: 5mm; margin-bottom: 1.6mm; break-inside: avoid; }
.bul li::before { content: ''; position: absolute; left: 0; top: 1.9mm; width: 2mm; height: 2mm; background: var(--y); transform: rotate(45deg); }
.phones { display: flex; gap: 6mm; justify-content: center; margin: 2mm 0 4mm; flex: 1; min-height: 0; align-items: flex-start; }
.phone { flex: 0 1 auto; display: flex; flex-direction: column; align-items: center; }
.phone img { height: 128mm; border-radius: 4mm; border: .5mm solid #2a3a50; box-shadow: 0 0 0 1.2mm #0d1520, 0 3mm 8mm rgba(0,221,255,.12); }
.phones.n2 .phone img { height: 140mm; }
.phones.n1 .phone img { height: 150mm; }
.dense .phone img { height: 112mm; }
.phones.n4 .phone img { height: 92mm; }
.phone figcaption, .desk figcaption { font-family: 'Share Tech Mono', monospace; font-size: 7.5pt; color: var(--m); margin-top: 2.5mm; text-align: center; max-width: 56mm; line-height: 1.35; }
.phones.n4 figcaption { max-width: 38mm; }
.desks { display: flex; flex-direction: column; gap: 4mm; margin: 1mm 0 3mm; }
.desk { display: flex; flex-direction: column; align-items: center; }
.desk img { width: 172mm; border-radius: 2mm; border: .4mm solid #2a3a50; box-shadow: 0 2mm 6mm rgba(0,0,0,.6); }
.desks.n2 .desk img { width: auto; height: 100mm; max-width: 172mm; }
.desk figcaption { max-width: 165mm; font-size: 8pt; }
.tip { margin-top: auto; border: .3mm solid rgba(253,204,13,.45); background: rgba(253,204,13,.06); padding: 3mm 4mm; font-size: 9.5pt; line-height: 1.45; border-radius: 1.5mm; }
.tip span { font-family: 'Orbitron'; font-weight: 700; font-size: 7.5pt; color: var(--y); letter-spacing: .15em; text-transform: uppercase; margin-right: 3mm; }
.foot { position: absolute; left: 18mm; right: 15mm; bottom: 8mm; display: flex; justify-content: space-between; font-family: 'Share Tech Mono', monospace; font-size: 7.5pt; color: #5d6b7a; border-top: .2mm solid #1d2733; padding-top: 2mm; }
.foot b { color: var(--y); font-family: 'Orbitron'; font-size: 9pt; }
.grid { position: absolute; inset: 0; background-image: linear-gradient(rgba(0,221,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(0,221,255,.07) 1px, transparent 1px); background-size: 10mm 10mm; mask-image: radial-gradient(circle at 50% 40%, #000 30%, transparent 75%); }
.cover { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 20mm; }
.cover .logo { width: 82mm; position: relative; filter: drop-shadow(0 0 10mm rgba(253,204,13,.35)); margin-bottom: 8mm; }
.cover .logo.small { width: 46mm; }
.ctitle { font-size: 34pt; color: #fff; position: relative; }
.ctitle span { color: var(--y); }
.cdate { font-family: 'Share Tech Mono'; color: var(--c); font-size: 11pt; letter-spacing: .08em; margin: 3mm 0 10mm; position: relative; }
.csub { font-size: 11.5pt; line-height: 1.55; color: var(--t); position: relative; }
.curl { position: absolute; bottom: 16mm; font-family: 'Orbitron'; font-weight: 700; color: var(--y); letter-spacing: .12em; font-size: 9pt; }
.contact .cards { display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; width: 150mm; margin: 8mm 0 10mm; position: relative; }
.contact .cards div { border: .3mm solid #2a3a50; background: rgba(50,82,123,.18); padding: 5mm; border-radius: 2mm; text-align: left; }
.contact .cards span { display: block; font-family: 'Share Tech Mono'; color: var(--c); font-size: 8pt; letter-spacing: .2em; text-transform: uppercase; margin-bottom: 1.5mm; }
.contact .cards b { font-size: 11.5pt; }
.toc { list-style: none; margin-top: 4mm; font-size: 10.5pt; }
.toc li { display: flex; align-items: baseline; gap: 3mm; padding: 1.55mm 0; }
.toc li.sub { padding-left: 7mm; font-size: 9.5pt; color: var(--m); padding: .9mm 0 .9mm 7mm; }
.toc li i { flex: 1; border-bottom: .3mm dotted #34414f; }
.toc li b { font-family: 'Orbitron'; color: var(--y); font-size: 9.5pt; }
.divider { display: flex; flex-direction: column; justify-content: center; padding: 0 22mm; }
.divider .num { font-family: 'Orbitron'; font-weight: 900; font-size: 80pt; color: var(--acc); opacity: .9; position: relative; line-height: 1; }
.divider h1 { font-size: 30pt; color: #fff; position: relative; margin-top: 4mm; }
.divider .lead { font-size: 12.5pt; position: relative; }
.pillars { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3.5mm; margin: 2mm 0 4mm; }
.pillars div { border: .3mm solid var(--pc); border-left: 2mm solid var(--pc); padding: 2.6mm 3mm; background: rgba(255,255,255,.025); border-radius: 1mm; }
.pillars b { font-family: 'Orbitron'; font-size: 9pt; color: var(--pi, var(--pc)); display: block; margin-bottom: 1mm; }
.pillars span { font-size: 8.3pt; color: var(--m); line-height: 1.35; display: block; }
.feat { display: grid; grid-template-columns: 1fr 1fr; gap: 3.5mm; }
.feat div { border: .3mm solid #233244; background: rgba(50,82,123,.14); border-radius: 1.5mm; padding: 3.2mm 3.8mm; }
.feat b { font-family: 'Orbitron'; font-size: 8.6pt; color: var(--y); display: block; margin-bottom: 1.2mm; text-transform: uppercase; letter-spacing: .03em; }
.feat span { font-size: 8.8pt; line-height: 1.42; color: var(--t); }
.dates { width: 100%; border-collapse: collapse; margin-top: 4mm; font-size: 10.5pt; }
.dates td { padding: 3.2mm 3mm; border-bottom: .3mm solid #1f2b38; vertical-align: top; }
.dates td:first-child { font-family: 'Orbitron'; font-weight: 700; color: var(--y); width: 46mm; font-size: 10pt; }
.note { font-size: 9pt; color: var(--m); margin-top: 5mm; }
.areas { display: grid; grid-template-columns: repeat(5, 1fr); gap: 3mm; margin-top: 4mm; }
.areas div { border-top: 1mm solid var(--c); background: rgba(255,255,255,.03); padding: 3mm; font-size: 8.3pt; line-height: 1.4; }
.areas b { font-family: 'Orbitron'; font-size: 8.5pt; color: var(--c); display: block; margin-bottom: 1.5mm; }
`;

(async () => {
  const html = build();
  fs.mkdirSync(path.dirname(OUT_PDF), { recursive: true });
  const tmp = path.join(__dirname, 'out', 'guia.html');
  fs.writeFileSync(tmp, html);
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto('file://' + tmp, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.pdf({ path: OUT_PDF, format: 'A4', printBackground: true, preferCSSPageSize: true });
  await b.close();
  console.log('PDF', OUT_PDF, (fs.statSync(OUT_PDF).size / 1e6).toFixed(1), 'MB');
})();
