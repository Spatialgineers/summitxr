/* The press fact sheet (A4, 2 pages) as HTML, printed to PDF by build.cjs.
   Data comes from src/lib/pressKit.ts (via data.ts); images are local files. */

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * @param {object} kit       the exports of src/lib/pressKit.ts
 * @param {object} files     absolute file:// urls: { summitLogo, sgxLogo, founders: { danelson, ricardo }, pillars: { STORY: url, … } }
 * @param {string} fontCss   @font-face rules (local files) for Orbitron, Chakra Petch, Exo 2 and Share Tech Mono
 */
module.exports = function factSheetHtml(kit, files, fontCss) {
  const days = [
    { n: 'Día 1', d: 'Viernes 11 de diciembre', how: 'Digital · YouTube Live', what: 'Los seis pilares, artistas invitados y los Initiates del SGX Guild.' },
    { n: 'Día 2', d: 'Sábado 12 de diciembre', how: 'Digital · YouTube Live', what: 'Día de la Industria: una conversación con invitados por pilar.' },
    { n: 'Día 3', d: 'Domingo 13 de diciembre', how: 'Presencial · Chroma Space Studios', what: 'SGX Showcase en San Juan, por invitación: demos en vivo y networking.' },
  ];
  const pillars = [
    ['STORY', 'Story'], ['SHOWCASE', 'Showcase'], ['SPARK', 'Spark'], ['STAGE', 'Stage'], ['SYSTEM', 'System'], ['SYNTHESIZE', 'Synthesize'],
  ];
  const facts = kit.PRESS_FACTS.filter((f) => !['Prensa', 'Fundadores', 'Formato', 'Web del Summit'].includes(f.k.es));
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8" />
<title>Spatialgineers Summit 2026 · Ficha de prensa</title>
<style>
${fontCss}
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: 'Exo 2', 'Inter', sans-serif; color: #141414; font-size: 10.5pt; line-height: 1.5; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; background: #fff; }
.page:last-child { page-break-after: auto; }
.band { background: #050505; color: #fff; padding: 10mm 15mm 8mm; position: relative; }
.band::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 2.2mm; background: #FDCC0D; }
.band .row { display: flex; align-items: center; gap: 7mm; }
.band img { width: 30mm; height: 30mm; object-fit: contain; }
.kicker { font-family: 'Share Tech Mono', monospace; font-size: 9pt; letter-spacing: 0.18em; text-transform: uppercase; color: #FDCC0D; margin: 0 0 2mm; }
h1 { font-family: 'Orbitron', sans-serif; font-weight: 800; font-size: 24pt; line-height: 1.05; letter-spacing: 0.01em; text-transform: uppercase; margin: 0; }
.sub { font-family: 'Chakra Petch', sans-serif; font-size: 11.5pt; color: rgba(255,255,255,0.82); margin: 2.5mm 0 0; }
.body { padding: 7mm 15mm 0; }
h2 { font-family: 'Orbitron', sans-serif; font-weight: 700; font-size: 11.5pt; text-transform: uppercase; letter-spacing: 0.06em; margin: 0 0 3mm; padding-left: 3mm; border-left: 1.6mm solid #FDCC0D; }
p { margin: 0 0 3mm; }
.lead { font-size: 10pt; line-height: 1.45; }
table.facts { width: 100%; border-collapse: collapse; margin: 2mm 0 7mm; }
table.facts th { width: 33mm; text-align: left; vertical-align: top; font-family: 'Share Tech Mono', monospace; font-weight: 400; font-size: 8.5pt; letter-spacing: 0.12em; text-transform: uppercase; color: #7a6200; padding: 1.5mm 3mm 1.5mm 0; border-bottom: 0.3mm solid #e6e6e6; }
table.facts td { font-size: 9.8pt; padding: 1.5mm 0; border-bottom: 0.3mm solid #e6e6e6; }
.days { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4mm; margin: 1mm 0 5mm; }
.day { border: 0.35mm solid #1a1a1a; padding: 3mm; border-top: 1.6mm solid #FDCC0D; }
.day b { display: block; font-family: 'Orbitron', sans-serif; font-size: 11pt; text-transform: uppercase; }
.day .d { font-family: 'Chakra Petch', sans-serif; font-weight: 600; font-size: 9.5pt; }
.day .how { font-family: 'Share Tech Mono', monospace; font-size: 8.5pt; color: #006c80; text-transform: uppercase; letter-spacing: 0.06em; margin: 1mm 0 1.5mm; }
.day p { font-size: 9.5pt; margin: 0; }
.pillars { display: grid; grid-template-columns: repeat(6, 1fr); gap: 3mm; margin-top: 2mm; }
.pillar { background: #0b0b0b; color: #fff; text-align: center; padding: 3mm 1mm; }
.pillar img { width: 11mm; height: 11mm; object-fit: contain; display: block; margin: 0 auto 1.5mm; }
.pillar span { font-family: 'Chakra Petch', sans-serif; font-weight: 600; font-size: 8.5pt; letter-spacing: 0.04em; }
.pillar small { display: block; font-family: 'Share Tech Mono', monospace; font-size: 6.5pt; color: #FDCC0D; }
.foot { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; justify-content: space-between; font-family: 'Share Tech Mono', monospace; font-size: 8pt; color: #6a6a6a; border-top: 0.3mm solid #dcdcdc; padding-top: 2.5mm; }
.bios { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin: 2mm 0 6mm; }
.bio img { width: 100%; height: 46mm; object-fit: cover; display: block; }
.bio h3 { font-family: 'Orbitron', sans-serif; font-size: 10.5pt; text-transform: uppercase; margin: 3mm 0 0.5mm; }
.bio h3 em { font-style: normal; color: #7a6200; }
.bio .role { font-family: 'Share Tech Mono', monospace; font-size: 8pt; letter-spacing: 0.08em; text-transform: uppercase; color: #006c80; margin: 0 0 2mm; }
.bio p { font-size: 9.3pt; line-height: 1.45; }
.box { background: #050505; color: #fff; padding: 6mm 7mm; position: relative; }
.box::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 1.6mm; background: #FDCC0D; }
.box h2 { border: 0; padding: 0; color: #FDCC0D; }
.box ul { margin: 0; padding-left: 5mm; }
.box li { margin-bottom: 1.5mm; }
.contact { display: flex; gap: 8mm; margin-top: 3mm; font-family: 'Share Tech Mono', monospace; font-size: 9.5pt; color: #00DDFF; flex-wrap: wrap; }
.logos { display: flex; gap: 5mm; align-items: center; }
.logos img { height: 14mm; }
</style></head>
<body>
<section class="page">
  <header class="band">
    <div class="row">
      <img src="${files.summitLogo}" alt="" />
      <div>
        <p class="kicker">Ficha de prensa · Press fact sheet</p>
        <h1>Spatialgineers<br />Summit 2026</h1>
        <p class="sub">11–13 de diciembre de 2026 · Días 1 y 2 por YouTube Live · Día 3 en Chroma Space Studios, San Juan · En español</p>
      </div>
    </div>
  </header>
  <div class="body">
    <h2>Sobre el Summit</h2>
    <p class="lead">${esc(kit.PRESS_ABOUT.summit.es)}</p>
    <table class="facts">${facts.map((f) => `<tr><th>${esc(f.k.es)}</th><td>${esc(f.v.es)}</td></tr>`).join('')}</table>
    <h2>Los tres días</h2>
    <div class="days">${days.map((d) => `<div class="day"><b>${esc(d.n)}</b><span class="d">${esc(d.d)}</span><div class="how">${esc(d.how)}</div><p>${esc(d.what)}</p></div>`).join('')}</div>
    <h2>Los seis pilares del SGX Framework</h2>
    <div class="pillars">${pillars.map(([k, n]) => `<div class="pillar"><img src="${files.pillars[k]}" alt="" /><span>${esc(n)}</span><small>SGX.${esc(n)}</small></div>`).join('')}</div>
  </div>
  <footer class="foot"><span>summit.spatialgineers.com/prensa</span><span>info@spatialgineers.com · @spatialgineers</span><span>1 / 2</span></footer>
</section>
<section class="page">
  <div class="body" style="padding-top: 13mm;">
    <h2>Sobre Spatialgineers</h2>
    <p class="lead">${esc(kit.PRESS_ABOUT.studio.es)}</p>
    <h2 style="margin-top: 6mm;">Los fundadores</h2>
    <div class="bios">${kit.PRESS_FOUNDERS.map((f) => `<article class="bio"><img src="${files.founders[f.id]}" alt="" /><h3>${esc(f.name)} <em>"${esc(f.alias)}"</em></h3><p class="role">${esc(f.role.es)} · Spatialgineers LLC</p><p>${esc(f.bio.es)}</p></article>`).join('')}</div>
    <div class="box">
      <h2>Acreditación de prensa</h2>
      <ul>
        <li><b>${esc(kit.PRESS_RULES.deadline.es)}</b> en summit.spatialgineers.com/prensa (primero se forja el SGX Pass, gratis).</li>
        <li><b>${esc(kit.PRESS_RULES.slots.es)}.</b> El equipo de Spatialgineers revisa cada solicitud y confirma por escrito.</li>
        <li>${esc(kit.PRESS_RULES.access.es)}</li>
      </ul>
      <div class="contact"><span>info@spatialgineers.com</span><span>+1 (787) 445-5284</span><span>@spatialgineers</span></div>
    </div>
    <div class="logos" style="margin-top: 7mm;">
      <img src="${files.summitLogo}" alt="" style="background:#050505;padding:1.5mm;" />
      <img src="${files.sgxLogo}" alt="" style="background:#050505;padding:1.5mm;" />
      <p style="margin:0;font-size:9pt;color:#555;">Logos, fotos y capturas en alta resolución: kit de prensa en summit.spatialgineers.com/prensa. Fotos: Spatialgineers. Uso editorial libre para cubrir el Summit, con crédito.</p>
    </div>
  </div>
  <footer class="foot"><span>Spatialgineers LLC · Puerto Rico</span><span>"Ingeniando imaginación, construyendo realidades."</span><span>2 / 2</span></footer>
</section>
</body></html>`;
};
