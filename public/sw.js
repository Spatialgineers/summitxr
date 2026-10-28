/* SGX Summit service worker: installable app + offline SGX Pass.
   - Pages: network first, cached shell when offline (the pass and its QR live
     on the device, so they open without signal at Chroma on Day 3).
   - Hashed build files (/assets/*): cache first, they never change.
   - Same-origin images and Google Fonts: stale-while-revalidate.
   - Never touched: the live engine (/api, /ws), Firebase and other origins.
   __SGX_BUILD__ is replaced at build time, so every deploy installs fresh. */
const BUILD = '__SGX_BUILD__';
const SHELL = `sgx-shell-${BUILD}`;
const RUNTIME = `sgx-runtime-${BUILD}`;
const RUNTIME_MAX = 160;
const PRECACHE = [
  '/', '/manifest.webmanifest', '/brand/sgx-bolt.svg',
  '/icons/sgx-192.png', '/icons/sgx-512.png', '/icons/apple-touch-icon.png',
  // the Holo Card / pass art
  '/holo/bolt.png', '/holo/gear.png', '/holo/gearG.png', '/holo/guild.png', '/holo/sgxLogo.png',
  '/holo/summitIcon.png', '/holo/summitType.png', '/holo/story.png', '/holo/showcase.png',
  '/holo/spark.png', '/holo/stage.png', '/holo/system.png', '/holo/synthesize.png',
  // build chunks under 300 KB (filled in at build time)
  '__SGX_PRECACHE_ASSETS__',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(PRECACHE.filter((u) => !u.startsWith('__')).map((u) => cache.add(new Request(u, { cache: 'reload' })).catch(() => {})));
    // The entry scripts and styles this build's index.html points at.
    try {
      const html = await (await cache.match('/'))?.text() || '';
      const assets = Array.from(html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)).map((m) => m[1]);
      await Promise.all(assets.map((u) => cache.add(u).catch(() => {})));
    } catch { /* offline install: runtime cache fills in later */ }
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, RUNTIME]);
    for (const k of await caches.keys()) if (k.startsWith('sgx-') && !keep.has(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

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
  if (res.ok) { const c = await caches.open(RUNTIME); c.put(request, res.clone()); trim(c); }
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME);
  const hit = await cache.match(request);
  const net = fetch(request).then((res) => {
    if (res.ok || res.type === 'opaque') { cache.put(request, res.clone()); trim(cache); }
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
    if (url.pathname.startsWith('/api') || url.pathname.startsWith('/ws') || url.pathname === '/sw.js') return;
    if (request.mode === 'navigate') { event.respondWith(networkFirstPage(request)); return; }
    if (url.pathname.startsWith('/assets/')) { event.respondWith(cacheFirst(request)); return; }
    if (/\.(png|jpe?g|webp|svg|gif|woff2?|webmanifest|json)$/i.test(url.pathname)) { event.respondWith(staleWhileRevalidate(request)); return; }
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(request));
  }
});
