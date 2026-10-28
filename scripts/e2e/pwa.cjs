// PWA: manifest + icons, service worker, and the SGX Pass opening with NO network.
// Builds the app with the emulators wired in (never production Firebase), serves it
// like production on :3400, forges a pass online, then goes offline.
const { chromium } = require('playwright');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');
const ROOT = path.resolve(__dirname, '..', '..');
const DIST = path.join(__dirname, 'out', 'dist-pwa');
const APP = 'http://localhost:3400';
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

(async () => {
  if (!process.env.SKIP_BUILD) {
    console.log('building (emulator wiring)…');
    execSync(`npx vite build --outDir ${DIST} --emptyOutDir`, { cwd: ROOT, env: { ...process.env, VITE_USE_EMULATORS: '1' }, stdio: 'ignore' });
  }
  const app = express();
  app.use(express.static(DIST));
  app.get('*', (q, r) => r.sendFile(path.join(DIST, 'index.html')));
  const server = app.listen(3400);

  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis|ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(() => { sessionStorage.setItem('sgx_splash_shown', '1'); localStorage.setItem('sgx_forge_nudge_dismissed', '1'); });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));

  // 1. Manifest and icons
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  const mf = await p.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]')?.getAttribute('href');
    const m = await (await fetch(href)).json();
    const icons = await Promise.all(m.icons.map(async (i) => (await fetch(i.src)).ok));
    return { href, m, icons };
  });
  check('manifest linked and valid', mf.href === '/manifest.webmanifest' && mf.m.display === 'standalone' && mf.m.start_url && mf.m.theme_color === '#050505');
  check('icons 192/512/maskable load', mf.icons.length === 3 && mf.icons.every(Boolean) && mf.m.icons.some((i) => i.purpose === 'maskable'));
  check('Mi SGX Pass shortcut', mf.m.shortcuts.some((s) => s.url.includes('hangar=pass')));

  // 2. Service worker takes control
  await p.waitForTimeout(6000);
  const sw = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
  check('service worker active', sw);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(5000);
  check('page controlled by the worker', await p.evaluate(() => !!navigator.serviceWorker.controller));

  // 3. Forge a pass online
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'SHOWCASE' } })));
  await p.waitForSelector('.sgx-forge button', { timeout: 20000 }); await p.waitForTimeout(300);
  await p.click('.sgx-forge button:has-text("Seguir sin cuenta"), .sgx-forge button:has-text("Continue without")');
  await p.waitForTimeout(400);
  await p.fill('.sgx-forge input[type=email]', `pwa.${Date.now() % 1e7}@example.com`);
  const inputs = await p.$$('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])');
  await inputs[0].fill('Paula Offline');
  await p.check('.sgx-forge__consent input');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await p.waitForTimeout(1500);
  await p.click('.sgx-forge__pillars button');
  await p.click('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await p.waitForTimeout(600);
  await p.click('text=/Forjar mi SGX Pass|Forge my SGX Pass/');
  await p.waitForTimeout(5000);
  const code = await p.evaluate(() => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').pass?.code);
  check('pass forged online', !!code, code);
  // open the pass once while online, so its pieces are cached
  await p.goto(APP + '/?hangar=pass', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('.sgx-hangar', { timeout: 20000 }).catch(() => {});
  await p.waitForTimeout(4000);

  // 4. No signal (Chroma, Day 3)
  await ctx.setOffline(true);
  await p.goto(APP + '/?hangar=pass', { waitUntil: 'domcontentloaded' }).catch(() => {});
  const opened = await p.waitForSelector('.sgx-hangar', { timeout: 20000 }).then(() => true).catch(() => false);
  check('offline: app opens from the cache', await p.evaluate(() => !!document.getElementById('root')?.children.length));
  check('offline: the pass (Hangar) opens', opened);
  await p.waitForTimeout(2500);
  check('offline: pass still on the device', await p.evaluate((c) => JSON.parse(localStorage.getItem('sgx_identity_v1') || '{}').pass?.code === c, code), code);
  // the QR is on the back of the Holo Card
  await p.click('.sgx-hangar button:has-text("Reverso")').catch(() => {});
  await p.waitForTimeout(1500);
  const qr = await p.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('.sgx-hangar img')).filter((i) => /^data:image/.test(i.src) && i.naturalWidth > 50);
    const canv = Array.from(document.querySelectorAll('.sgx-hangar canvas')).filter((c) => c.width > 50);
    return imgs.length + canv.length;
  });
  check('offline: QR / card drawn', qr > 0, `(${qr})`);
  await p.screenshot({ path: path.join(__dirname, 'out', 'pwa_offline_pass.png') });
  await p.goto(APP + '/?tab=agenda', { waitUntil: 'domcontentloaded' }).catch(() => {});
  await p.waitForTimeout(5000);
  check('offline: agenda readable', /Apertura|Agenda/i.test(await p.evaluate(() => document.body.innerText)));
  check('no page errors', errs.length === 0, errs.slice(0, 3).join(' | '));

  console.log(`DONE ${pass} pass ${fail} fail`);
  await b.close();
  server.close();
})();
