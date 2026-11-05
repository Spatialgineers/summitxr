/* Spatialgineers Summit service worker: installable app + offline SGX Pass.
   - Pages: network first, cached shell when offline (the pass and its QR live
     on the device, so they open without signal at Chroma on Day 3).
   - Hashed build files (/assets/*): cache first, they never change. Only real
     JS/CSS/media is cached, never an HTML fallback.
   - Same-origin images and Google Fonts: stale-while-revalidate.
   - Never touched: the live engine (/api, /ws), Firebase and other origins.

   First load is never slowed down: install caches only the shell (the page,
   its entry script and style, the manifest and icons). The rest of the app's
   small chunks and the pass art are cached later, when the page says it is
   idle (message SGX_PRECACHE, sent by src/lib/swRegister.ts), a few at a time,
   from the list the build writes to /sw-precache.json.

   A new deploy never disturbs an open page: the first worker activates at
   once, but an update waits until every window of the app is closed (no
   skipWaiting, no clients.claim), and old caches are only deleted then.
   __SGX_BUILD__ is replaced at build time, so every deploy installs fresh. */
const BUILD = '__SGX_BUILD__';
const SHELL = `sgx-shell-${BUILD}`;
const RUNTIME = `sgx-runtime-${BUILD}`;
const RUNTIME_MAX = 200;
const SHELL_FILES = ['/', '/manifest.webmanifest', '/brand/sgx-bolt.svg', '/icons/sgx-192.png', '/icons/sgx-512.png', '/icons/apple-touch-icon.png'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(SHELL_FILES.map((u) => cache.add(new Request(u, { cache: 'no-cache' })).catch(() => {})));
    // The entry script and style this build's page points at (already in the HTTP cache).
    try {
      const html = await (await cache.match('/'))?.text() || '';
      const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map((m) => m[1]);
      await Promise.all(assets.map((u) => cache.add(u).catch(() => {})));
    } catch { /* offline install: runtime cache fills in later */ }
    // Only the very first worker takes over right away; an update waits for a clean start.
    if (!self.registration.active) await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, RUNTIME]);
    for (const k of await caches.keys()) if (k.startsWith('sgx-') && !keep.has(k)) await caches.delete(k);
  })());
});

/* Warm the offline copy when the page is idle: a few files at a time, skipping what is cached. */
let warming = null;
async function precacheIdle() {
  let list = [];
  try {
    const res = await fetch('/sw-precache.json', { cache: 'no-cache' });
    if (res.ok) list = (await res.json()).files || [];
  } catch { return; }
  const cache = await caches.open(RUNTIME);
  const todo = [];
  for (const u of list) if (!(await caches.match(u))) todo.push(u);
  const next = async () => {
    const u = todo.shift();
    if (!u) return;
    try {
      const res = await fetch(u);
      if (cacheable(res)) await cache.put(u, res);
    } catch { /* offline: try another time */ }
    await next();
  };
  await Promise.all([next(), next()]);
}

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SGX_PRECACHE' && !warming) {
    warming = precacheIdle().finally(() => { warming = null; });
    event.waitUntil(warming);
  }
});

/** A real file: never an error, and never an HTML page where a script or asset was expected. */
function cacheable(res) {
  if (!res || !res.ok) return false;
  const type = res.headers.get('content-type') || '';
  return !type.includes('text/html');
}

async function trim(cache) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - RUNTIME_MAX; i++) await cache.delete(keys[i]);
}

async function networkFirstPage(request) {
  try {
    const res = await fetch(request);
    if (res.ok) (await caches.open(SHELL)).put('/', res.clone());
    return res;
  } catch {
    return (await caches.match('/')) || new Response('<h1>Sin conexión</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (cacheable(res)) { const c = await caches.open(RUNTIME); c.put(request, res.clone()); trim(c); }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const net = fetch(request).then((res) => {
    if (cacheable(res) || res.type === 'opaque') { cache.put(request, res.clone()); trim(cache); }
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin) {
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || url.pathname === '/sw.js' || url.pathname === '/sw-precache.json') return;
    if (request.mode === 'navigate') { event.respondWith(networkFirstPage(request)); return; }
    if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(request)); return; }
    if (/\.(png|jpe?g|webp|svg|gif|woff2?|webmanifest|json)$/i.test(url.pathname)) { event.respondWith(staleWhileRevalidate(request)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
