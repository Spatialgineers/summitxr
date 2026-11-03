import { FIRESTORE_DOCS, fromFirestore } from './companion/knowledge';
import { SGX_EMAIL, SGX_PHONE, SGX_SOCIAL } from '../lib/sgxLinks';
import {
  SGX_ORGANIZER_LD, WELCOME_EXTRA_VIDEOS, WELCOME_FACTS, WELCOME_ORIGIN, WELCOME_PUBLIC_ROLES, WELCOME_ROLE_COPY,
  resolveWelcomeRole, summitEventLd, welcomeHead, welcomeIdsFromDoc, welcomeJsonLd, welcomeUrlFor, youTubeWatchUrl,
  type WelcomeVideoIds, type WelcomeVideoKey,
} from '../lib/welcomePortal';
import {
  PRESS_ABOUT, PRESS_ASSETS, PRESS_FACTS, PRESS_FACT_SHEET_PDF, PRESS_FAQ, PRESS_FOUNDERS, PRESS_KIT_ZIP, PRESS_META, PRESS_RULES, PRESS_URL,
} from '../lib/pressKit';

/* Server-side head for /bienvenida, /bienvenida/<rol> and /prensa: per-route title,
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

/* ---------- /prensa (sala de prensa): head, JSON-LD and the fact sheet as plain HTML ---------- */

/** /prensa and its aliases (/press, /media, /sala-de-prensa…). */
export const matchPressPath = (reqPath: string) => /^\/(?:prensa|press|media|sala-de-prensa|kit-de-prensa|press-kit)\/?$/i.test(reqPath);

export function renderPressHtml(indexHtml: string, hasQuery = false): string {
  const title = PRESS_META.title.es;
  const description = PRESS_META.description.es;
  let html = indexHtml;
  html = html.replace(/<title>[\s\S]*?<\/title>/i, () => `<title>${escapeHtml(title)}</title>`);
  html = setMeta(html, 'name', 'description', description);
  html = setMeta(html, 'property', 'og:title', title);
  html = setMeta(html, 'property', 'og:description', description);
  html = setMeta(html, 'property', 'og:url', PRESS_URL);
  html = setMeta(html, 'property', 'og:type', 'website');
  html = setMeta(html, 'property', 'og:image', `${WELCOME_ORIGIN}/og-image.jpg`);
  html = setMeta(html, 'property', 'og:image:width', '1200');
  html = setMeta(html, 'property', 'og:image:height', '630');
  html = setMeta(html, 'property', 'og:image:alt', 'Spatialgineers Summit 2026');
  html = setMeta(html, 'name', 'twitter:title', title);
  html = setMeta(html, 'name', 'twitter:description', description);
  html = setMeta(html, 'name', 'twitter:image', `${WELCOME_ORIGIN}/og-image.jpg`);

  const extra: string[] = [`<link rel="canonical" href="${escapeHtml(PRESS_URL)}" />`];
  if (hasQuery) extra.push('<meta name="robots" content="noindex, follow" />');
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      summitEventLd(),
      { '@type': 'WebPage', '@id': PRESS_URL, url: PRESS_URL, name: title, description, inLanguage: 'es', about: { '@id': `${WELCOME_ORIGIN}/#event` }, isPartOf: { '@type': 'WebSite', name: 'Spatialgineers Summit 2026', url: WELCOME_ORIGIN } },
      ...PRESS_FOUNDERS.map((f) => ({ '@type': 'Person', name: f.name, alternateName: f.alias, jobTitle: f.role.es, worksFor: SGX_ORGANIZER_LD, alumniOf: { '@type': 'CollegeOrUniversity', name: 'Universidad de Puerto Rico, Recinto Universitario de Mayagüez' }, image: `${WELCOME_ORIGIN}${f.photo}`, description: f.bio.es })),
      { '@type': 'FAQPage', mainEntity: PRESS_FAQ.map((f) => ({ '@type': 'Question', name: f.q.es, acceptedAnswer: { '@type': 'Answer', text: f.a.es } })) },
    ],
  };
  const ldTag = `<script type="application/ld+json">${safeJson(ld)}</script>`;
  if (/<script type="application\/ld\+json">[\s\S]*?<\/script>/i.test(html)) {
    html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/i, () => ldTag);
  } else {
    extra.push(ldTag);
  }
  html = html.replace('</head>', () => `    ${extra.join('\n    ')}\n  </head>`);

  const li = (s: string) => `<li>${escapeHtml(s)}</li>`;
  const link = (href: string, text: string) => `<a href="${escapeHtml(href)}">${escapeHtml(text)}</a>`;
  const parts: string[] = [
    '<h1>Sala de prensa · Spatialgineers Summit 2026</h1>',
    `<p>${escapeHtml(PRESS_RULES.deadline.es)}. ${escapeHtml(PRESS_RULES.slots.es)}. ${escapeHtml(PRESS_RULES.access.es)}</p>`,
    '<h2>Kit de prensa</h2>',
    `<ul>${[`<li>${link(PRESS_KIT_ZIP, 'Kit de prensa completo (ZIP)')}</li>`, `<li>${link(PRESS_FACT_SHEET_PDF, 'Ficha de prensa (PDF)')}</li>`, ...PRESS_ASSETS.map((a) => `<li>${link(a.file, a.title.es)} · ${escapeHtml(a.credit)}</li>`)].join('')}</ul>`,
    '<h2>Ficha del evento</h2>',
    `<p>${escapeHtml(PRESS_ABOUT.summit.es)}</p>`,
    `<p>${escapeHtml(PRESS_ABOUT.studio.es)}</p>`,
    `<ul>${PRESS_FACTS.map((f) => li(`${f.k.es}: ${f.v.es}`)).join('')}</ul>`,
    '<h2>Los fundadores</h2>',
    PRESS_FOUNDERS.map((f) => `<h3>${escapeHtml(f.name)} "${escapeHtml(f.alias)}" · ${escapeHtml(f.role.es)}</h3><p>${escapeHtml(f.bio.es)}</p>`).join(''),
    '<h2>Preguntas frecuentes</h2>',
    PRESS_FAQ.map((f) => `<h3>${escapeHtml(f.q.es)}</h3><p>${escapeHtml(f.a.es)}</p>`).join(''),
    `<p>Contacto de prensa: ${escapeHtml(SGX_EMAIL)} · ${escapeHtml(SGX_PHONE)} · ${escapeHtml(SGX_SOCIAL)}.</p>`,
    '<p>© 2026 Spatialgineers LLC.</p>',
  ];
  const noscript = `<noscript>\n        <div style="padding: 2.5rem; max-width: 800px; margin: 0 auto; color: #ffffff; background: #1A1A1A; font-family: sans-serif; line-height: 1.6;">${parts.join('')}</div>\n      </noscript>`;
  html = html.replace(/<noscript>[\s\S]*?<\/noscript>/i, () => noscript);
  return html;
}

/** For the server: the welcome (or press room) page html, or null when the path is not one (or anything fails). */
export async function welcomeHtmlFor(readIndex: () => string, reqPath: string, hasQuery = false): Promise<string | null> {
  if (matchPressPath(reqPath)) {
    try { return renderPressHtml(readIndex(), hasQuery); } catch { return null; }
  }
  if (!matchWelcomePath(reqPath)) return null;
  try {
    return renderWelcomeHtml(readIndex(), reqPath, await welcomeConfig(), hasQuery);
  } catch {
    return null;
  }
}

