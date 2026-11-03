import { FIRESTORE_DOCS, fromFirestore } from './companion/knowledge';
import { SGX_EMAIL, SGX_PHONE, SGX_SOCIAL } from '../lib/sgxLinks';
import {
  WELCOME_EXTRA_VIDEOS, WELCOME_FACTS, WELCOME_PUBLIC_ROLES, WELCOME_ROLE_COPY,
  resolveWelcomeRole, welcomeHead, welcomeIdsFromDoc, welcomeJsonLd, welcomeUrlFor, youTubeWatchUrl,
  type WelcomeVideoIds, type WelcomeVideoKey,
} from '../lib/welcomePortal';

/* Server-side head for /bienvenida and /bienvenida/<rol>: per-route title,
   description, canonical, Open Graph / Twitter, JSON-LD (Event + VideoObject
   + FAQPage) and a plain-text copy of the page in <noscript>, so crawlers and
   answer engines that do not run JavaScript still read it. Video ids come
   from site_config/welcome (Firestore REST, public read), cached 60 s. */

const TTL = 60_000;
interface WelcomeConfig { ids: WelcomeVideoIds; dates: Partial<Record<WelcomeVideoKey, string>> }
let cache: WelcomeConfig = { ids: {}, dates: {} };
let cacheAt = 0;
let loading: Promise<void> | null = null;

function refresh(): Promise<void> {
  if (loading) return loading;
  loading = fetch(`${FIRESTORE_DOCS}/site_config/welcome`, { signal: AbortSignal.timeout(2500) })
    .then(async (r) => {
      if (r.status === 404) { cache = { ids: {}, dates: {} }; return; }
      if (!r.ok) return;
      const fields = (await r.json())?.fields || {};
      const doc: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(fields)) doc[k] = fromFirestore(v);
      const rawDates = (doc.dates && typeof doc.dates === 'object') ? doc.dates as Record<string, unknown> : {};
      const dates: WelcomeConfig['dates'] = {};
      for (const [k, v] of Object.entries(rawDates)) if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) dates[k as WelcomeVideoKey] = v.slice(0, 10);
      cache = { ids: welcomeIdsFromDoc(doc), dates };
    })
    .catch(() => { /* keep the last known ids */ })
    .finally(() => { cacheAt = Date.now(); loading = null; });
  return loading;
}

/** The ids, refreshed at most once a minute; the first request waits (bounded) for the first read. */
async function welcomeConfig(): Promise<WelcomeConfig> {
  if (Date.now() - cacheAt > TTL) {
    const p = refresh();
    if (!cacheAt) await p;
  }
  return cache;
}

/** /bienvenida → { role: null }, /bienvenida/sponsor → { role: 'sponsor' }; anything else → null. */
export function matchWelcomePath(reqPath: string): { role: ReturnType<typeof resolveWelcomeRole>; known: boolean } | null {
  const m = /^\/(?:bienvenida|welcome)(?:\/([^/]+))?\/?$/i.exec(reqPath);
  if (!m) return null;
  const role = resolveWelcomeRole(m[1]);
  return { role, known: !m[1] || !!role };
}

export const escapeHtml = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** JSON for a <script> tag: nothing in it can close the tag or break the line. */
const safeJson = (v: unknown) => JSON.stringify(v)
  .replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
  .replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');

const reEsc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Replaces the content of <meta {attr}="{key}" content="…"> or adds the tag before </head>. */
function setMeta(html: string, attr: 'name' | 'property', key: string, value: string): string {
  const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
  const re = new RegExp(`<meta\\s+${attr}=["']${reEsc(key)}["'][^>]*>`, 'i');
  return re.test(html) ? html.replace(re, () => tag) : html.replace('</head>', () => `    ${tag}\n  </head>`);
}

/** index.html with the head and the no-JS copy of a welcome page. */
export function renderWelcomeHtml(indexHtml: string, reqPath: string, cfg: WelcomeConfig, hasQuery = false): string | null {
  const match = matchWelcomePath(reqPath);
  if (!match) return null;
  const head = welcomeHead(match.role, cfg.ids);
  const title = head.title;
  let html = indexHtml;

  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name', 'description', head.description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', head.description);
  html = setMeta(html, 'property', 'og:url', head.canonical);
  html = setMeta(html, 'property', 'og:type', head.videoId ? 'video.other' : 'website');
  html = setMeta(html, 'property', 'og:image', head.image);
  html = setMeta(html, 'property', 'og:image:width', String(head.imageWidth));
  html = setMeta(html, 'property', 'og:image:height', String(head.imageHeight));
  html = setMeta(html, 'property', 'og:image:alt', head.heading);
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', head.description);
  html = setMeta(html, 'name', 'twitter:image', head.image);

  const extra: string[] = [`<link rel="canonical" href="${escapeHtml(head.canonical)}" />`];
  if (head.videoId) extra.push(`<meta property="og:video" content="${escapeHtml(youTubeWatchUrl(head.videoId))}" />`);
  // Personal links (?n=…&s=…) stay out of the index; their names never reach the head.
  if (head.noindex || hasQuery) extra.push('<meta name="robots" content="noindex, follow" />');
  const ld = welcomeJsonLd(head, cfg.dates[head.videoKey] || null);
  const ldTag = `<script type="application/ld+json">${safeJson(ld)}</script>`;
  // Our graph carries the Event, so it replaces the generic one instead of repeating it.
  if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, () => ldTag);
  } else {
    extra.push(ldTag);
  }
  html = html.replace('</head>', () => `    ${extra.join('\n    ')}\n  </head>`);

  // The page as plain text for readers without JavaScript (React replaces #root on load).
  const li = (s: string) => `<li>${escapeHtml(s)}</li>`;
  const parts: string[] = [
    `<h1>${escapeHtml(head.heading)}</h1>`,
    `<p>${escapeHtml(head.intro)}</p>`,
    `<ul>${[WELCOME_FACTS.dates.es, WELCOME_FACTS.days12.es, WELCOME_FACTS.day3.es, WELCOME_FACTS.language.es].map(li).join('')}</ul>`,
  ];
  if (head.videoId) parts.push(`<p><a href="${escapeHtml(youTubeWatchUrl(head.videoId))}">Ver el video en YouTube</a></p>`);
  if (head.steps.length) {
    parts.push('<h2>Fechas y pasos clave</h2>');
    parts.push(`<ol>${head.steps.map((s) => `<li><strong>${escapeHtml(s.when.es)} · ${escapeHtml(s.title.es)}</strong>: ${escapeHtml(s.body.es)}</li>`).join('')}</ol>`);
  }
  if (!match.role) {
    parts.push('<h2>Elige tu rol</h2>');
    parts.push(`<ul>${WELCOME_PUBLIC_ROLES.map((r) => `<li><a href="${escapeHtml(welcomeUrlFor(r))}">${escapeHtml(WELCOME_ROLE_COPY[r].label.es)}</a>: ${escapeHtml(WELCOME_ROLE_COPY[r].description.es)}</li>`).join('')}</ul>`);
    parts.push(`<p>${escapeHtml(WELCOME_EXTRA_VIDEOS.tour.title.es)}: ${escapeHtml(WELCOME_EXTRA_VIDEOS.tour.body.es)}</p>`);
  }
  if (head.faq.length) {
    parts.push('<h2>Preguntas frecuentes</h2>');
    parts.push(head.faq.map((f) => `<h3>${escapeHtml(f.q.es)}</h3><p>${escapeHtml(f.a.es)}</p>`).join(''));
  }
  parts.push(`<p>${escapeHtml(WELCOME_FACTS.press.es)} Contacto: ${escapeHtml(SGX_EMAIL)} · ${escapeHtml(SGX_PHONE)} · YouTube e Instagram ${escapeHtml(SGX_SOCIAL)}.</p>`);
  parts.push('<p>© 2026 Spatialgineers LLC.</p>');
  const noscript = `<noscript>\n        <div style="padding: 2.5rem; max-width: 800px; margin: 0 auto; color: #ffffff; background: #1A1A1A; font-family: sans-serif; line-height: 1.6;">${parts.join('')}</div>\n      </noscript>`;
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, () => noscript);
  return html;
}

/** For the server: the welcome page html, or null when the path is not one (or anything fails). */
export async function welcomeHtmlFor(readIndex: () => string, reqPath: string, hasQuery = false): Promise<string | null> {
  if (!matchWelcomePath(reqPath)) return null;
  try {
    return renderWelcomeHtml(readIndex(), reqPath, await welcomeConfig(), hasQuery);
  } catch {
    return null;
  }
}

