/* /privacidad: the privacy policy as a plain, server-rendered page (no JavaScript needed),
   so Meta, Google and other platforms can read it from a privacy-policy URL. Same text as
   the in-app dialog (src/lib/privacyPolicy.ts). */
import { PRIVACY_SECTIONS, PRIVACY_LEAD, PRIVACY_UPDATED, type Bi } from '../lib/privacyPolicy';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function block(lang: 'es' | 'en') {
  const t = (b: Bi) => esc(b[lang]);
  return PRIVACY_SECTIONS.map((sec, i) => `
    <section id="${lang}-${sec.id}">
      <h2><span>0${i + 1}</span> ${t(sec.title)}</h2>
      ${sec.intro ? `<p>${t(sec.intro)}</p>` : ''}
      ${sec.items ? `<ul>${sec.items.map((it) => `<li>${t(it)}</li>`).join('')}</ul>` : ''}
      ${sec.outro ? `<p>${t(sec.outro)}</p>` : ''}
    </section>`).join('');
}

export function privacyPageHtml(): string {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Política de privacidad · Spatialgineers Summit 2026</title>
<meta name="description" content="Política de privacidad de la web app del Spatialgineers Summit 2026, operada por Spatialgineers LLC." />
<link rel="canonical" href="https://summit.spatialgineers.com/privacidad" />
<link rel="icon" href="/icons/sgx-192.png" />
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #050505; color: #e5e7eb; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 18px 64px; }
  header img { height: 56px; }
  h1 { color: #FDCC0D; font-size: 28px; margin: 16px 0 4px; letter-spacing: .02em; }
  .meta { color: #9ca3af; font-size: 14px; margin: 0 0 20px; }
  .lead { border-left: 3px solid #00DDFF; padding: 8px 14px; background: #0d1117; }
  h2 { color: #fff; font-size: 19px; margin: 28px 0 8px; }
  h2 span { color: #00DDFF; font-family: ui-monospace, monospace; margin-right: 6px; }
  ul { padding-left: 20px; } li { margin: 6px 0; }
  a { color: #00DDFF; }
  hr { border: 0; border-top: 1px solid #1f2937; margin: 48px 0 24px; }
  .back { display: inline-block; margin-top: 28px; padding: 10px 16px; border: 1px solid #FDCC0D; color: #FDCC0D; text-decoration: none; }
</style>
</head>
<body>
<main>
  <header><a href="/"><img src="/brand/summit-logo.png" alt="Spatialgineers Summit 2026" /></a></header>
  <h1>Política de privacidad</h1>
  <p class="meta">Spatialgineers LLC · ${esc(PRIVACY_UPDATED.es)} · summit.spatialgineers.com</p>
  <p class="lead">${esc(PRIVACY_LEAD.es)}</p>
  ${block('es')}
  <p>Contacto: <a href="mailto:info@spatialgineers.com">info@spatialgineers.com</a></p>
  <hr />
  <h1 id="en" lang="en">Privacy policy</h1>
  <div lang="en">
  <p class="meta">Spatialgineers LLC · ${esc(PRIVACY_UPDATED.en)}</p>
  <p class="lead">${esc(PRIVACY_LEAD.en)}</p>
  ${block('en')}
  <p>Contact: <a href="mailto:info@spatialgineers.com">info@spatialgineers.com</a></p>
  </div>
  <a class="back" href="/">← Volver al Summit</a>
</main>
</body>
</html>`;
}
