// Promo reel recorder (portrait 1080x1920). Drives the local app against the
// Firebase EMULATORS, in slow motion, and captures a CDP screencast. Each frame
// keeps its virtual timestamp so build.cjs can rebuild a smooth 30 fps video.
//
//   SCOUT=1 node scripts/promo/record.cjs   → normal speed, one screenshot per step
//   node scripts/promo/record.cjs           → slow-motion capture into out/frames
//
// Needs: the dev server on APP_URL (default http://localhost:3200, VITE_USE_EMULATORS=1)
// and the Firestore + Auth emulators. Never point it at production.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const APP = process.env.APP_URL || 'http://localhost:3200';
const SCOUT = !!process.env.SCOUT;
const K = SCOUT ? 1 : Number(process.env.SLOW || 0.08); // virtual seconds per real second
const OUT = path.join(__dirname, 'out');
const FRAMES = path.join(OUT, 'frames');

const CAPTION_CSS = `
/* keep the frame clean: no pass strip, toasts or push alerts during the take */
.sgx-passstrip, .sgx-toasts, .fixed.bottom-6.right-6.z-50 { display: none !important; }
#promo-shade { position: fixed; left: 0; right: 0; bottom: 0; height: 42%; z-index: 2147482999; pointer-events: none;
  background: linear-gradient(180deg, rgba(5,5,5,0), rgba(5,5,5,.78) 55%, rgba(5,5,5,.88)); transition: opacity .45s ease; }
#promo-shade.off { opacity: 0; }
#promo-cap { position: fixed; left: 0; right: 0; bottom: 104px; z-index: 2147483000; display: grid; justify-items: center;
  pointer-events: none; padding: 0 22px; text-align: center; }
#promo-cap .k { font: 600 11px/1.2 'Share Tech Mono', ui-monospace, monospace; letter-spacing: .3em; color: #00DDFF;
  text-transform: uppercase; margin-bottom: 8px; text-shadow: 0 0 12px rgba(0,221,255,.6); }
#promo-cap .t { font: 900 27px/1.05 Orbitron, 'Exo 2', sans-serif; color: #fff; text-transform: uppercase; letter-spacing: .02em;
  text-shadow: 0 2px 18px rgba(5,5,5,.95), 0 0 2px rgba(5,5,5,1); }
#promo-cap .t b { color: #FDCC0D; font-weight: 900; }
#promo-cap .s { margin-top: 8px; font: 500 14px/1.35 'Exo 2', system-ui, sans-serif; color: #e2e8f0; max-width: 330px;
  text-shadow: 0 1px 10px rgba(5,5,5,1); }
#promo-cap > div { transition: opacity .45s ease, transform .45s ease; }
#promo-cap.off > div { opacity: 0; transform: translateY(14px); }
#promo-end { position: fixed; inset: 0; z-index: 2147483001; display: grid; place-items: center; text-align: center;
  background: radial-gradient(ellipse at 50% 42%, rgba(18,20,26,.9), rgba(5,5,5,.98) 70%); opacity: 0; transition: opacity .8s ease; }
#promo-end.on { opacity: 1; }
#promo-end img { width: 92px; filter: drop-shadow(0 0 18px rgba(253,204,13,.55)); margin-bottom: 18px; }
#promo-end h1 { margin: 0; font: 900 30px/1.05 Orbitron, sans-serif; color: #fff; text-transform: uppercase; }
#promo-end h1 b { display: block; color: #FDCC0D; }
#promo-end p { margin: 14px 0 0; font: 600 13px/1.5 'Share Tech Mono', monospace; letter-spacing: .14em; color: #00DDFF; text-transform: uppercase; }
#promo-end .url { margin-top: 22px; display: inline-block; padding: 12px 18px; border: 1px solid #FDCC0D; color: #FDCC0D;
  font: 700 15px/1 Orbitron, sans-serif; letter-spacing: .04em; clip-path: polygon(10px 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%,0 10px); }
`;

(async () => {
  fs.mkdirSync(FRAMES, { recursive: true });
  fs.readdirSync(FRAMES).forEach((f) => fs.unlinkSync(path.join(FRAMES, f)));
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({
    viewport: { width: 432, height: 768 }, deviceScaleFactor: 2.5, isMobile: true, hasTouch: true,
    locale: 'es-PR', timezoneId: 'America/Puerto_Rico', permissions: ['notifications'],
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  // Never touch the real Firebase project or geo lookups.
  await ctx.route((u) => !u.href.startsWith('http://localhost') && !u.href.startsWith('http://127.0.0.1') && /firestore\.googleapis|identitytoolkit|securetoken|firebaseinstallations|firebase\.googleapis/.test(u.href), (r) => r.abort());
  await ctx.route((u) => /ipapi|geojs|ipinfo/.test(u.href), (r) => r.abort());
  await ctx.addInitScript(({ K }) => {
    try { localStorage.setItem('sgx_language', 'es'); } catch { /* ignore */ }
    if (K === 1) return;
    // Slow motion: the app's clocks, frames and timers all run at K.
    const realNow = performance.now.bind(performance);
    const t0 = realNow();
    performance.now = () => t0 + (realNow() - t0) * K;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => raf(() => cb(performance.now()));
    const st = window.setTimeout.bind(window);
    const si = window.setInterval.bind(window);
    window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) / K, ...a);
    window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) / K, ...a);
  }, { K });

  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Animation.enable');

  const vwait = (s) => p.waitForTimeout((s / K) * 1000);
  const marks = [];
  let startReal = 0;
  const mark = (name) => { marks.push({ name, t: (Date.now() - startReal) / 1000 * K }); console.log('mark', name, marks[marks.length - 1].t.toFixed(2)); };
  let shot = 0;
  const scout = async (name) => { if (SCOUT) await p.screenshot({ path: path.join(OUT, `scout_${String(++shot).padStart(2, '0')}_${name}.png`) }); };

  const caption = async (k, t, s) => {
    await p.evaluate(([k, t, s]) => {
      let el = document.getElementById('promo-cap');
      if (!el) {
        const st = document.createElement('style'); st.id = 'promo-style'; st.textContent = window.__promoCss; document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'promo-cap'; el.className = 'off'; document.body.appendChild(el);
        const sh = document.createElement('div'); sh.id = 'promo-shade'; sh.className = 'off'; document.body.appendChild(sh);
      }
      el.className = 'off';
      document.getElementById('promo-shade').className = t ? '' : 'off';
      setTimeout(() => {
        el.innerHTML = t ? `<div><div class="k">${k || ''}</div><div class="t">${t}</div>${s ? `<div class="s">${s}</div>` : ''}</div>` : '';
        requestAnimationFrame(() => { el.className = ''; });
      }, 300);
    }, [k, t, s]);
  };
  const tap = async (sel, opts = {}) => { const l = p.locator(sel).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); await l.tap({ timeout: 15000 / Math.max(K, 0.2), ...opts }); };

  // ---------- go ----------
  await p.addInitScript(() => {}); // keep order
  await p.goto(APP + '/', { waitUntil: 'domcontentloaded' });
  await p.evaluate((css) => { window.__promoCss = css; }, CAPTION_CSS);
  if (!SCOUT) await cdp.send('Animation.setPlaybackRate', { playbackRate: K });

  let frameN = 0;
  const frameLog = [];
  if (!SCOUT) {
    cdp.on('Page.screencastFrame', async (f) => {
      const n = ++frameN;
      const t = (f.metadata.timestamp * 1000 - startReal) / 1000 * K;
      fs.writeFileSync(path.join(FRAMES, `f${String(n).padStart(6, '0')}.jpg`), Buffer.from(f.data, 'base64'));
      frameLog.push({ n, t });
      cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
    });
    startReal = Date.now();
    await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  } else {
    startReal = Date.now();
  }

  // S1 splash (the boot sequence runs on a fresh session)
  await caption('', '');
  mark('splash');
  await vwait(5.6);
  await scout('splash');

  // S2 core: flythrough + hero
  mark('core');
  await vwait(2.6);
  await tap('button:has-text("Explorar el núcleo")').catch(() => {});
  await vwait(0.4);
  await tap('button:has-text("Volver al 3D")', { timeout: 4000 }).catch(() => {});
  await vwait(0.4);
  await caption('Spatialgineers Summit 2026', '6 pilares.<br><b>Un núcleo vivo.</b>', 'Del storytelling a la inteligencia artificial.');
  await vwait(5.0);
  await scout('core');

  // S3 the three days: agenda timeline (warp jump)
  mark('days');
  await caption('', '');
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section: 'AGENDA' } })));
  await vwait(0.9);
  await caption('Run of Show oficial', '3 días<br><b>11–13 DIC 2026</b>');
  await vwait(2.3);
  await p.evaluate(() => { const el = [...document.querySelectorAll('h3, h4, span, p')].find((e) => /^D[ÍI]A 1$/i.test(e.textContent.trim())); el?.scrollIntoView({ block: 'start', behavior: 'smooth' }); });
  await caption('Día 1 · Día 2', 'En vivo por<br><b>YouTube Live</b>', 'Gratis, desde donde estés.');
  await vwait(4.5);
  await scout('days12');
  await p.evaluate(() => { const el = [...document.querySelectorAll('h3, h4, span, p')].find((e) => /^D[ÍI]A 3$/i.test(e.textContent.trim())); el?.scrollIntoView({ block: 'center' }); });
  await caption('Día 3 · SGX Showcase', 'Chroma Space Studios<br><b>San Juan, PR</b>', 'Presencial, por invitación.');
  await vwait(5.4);
  await scout('day3');

  // S4 forge the SGX Pass
  mark('forge');
  await caption('', '');
  await p.evaluate(() => window.scrollTo({ top: 0 }));
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:open_forge')));
  await vwait(1.2);
  await caption('Paso 1', 'Forja tu <b>SGX Pass</b>');
  await tap('button:has-text("Seguir sin cuenta")');
  await vwait(0.8);
  const nameInput = p.locator('.sgx-forge input:not([type=checkbox]):not([type=radio]):not([type=email])').first();
  await nameInput.tap();
  await p.keyboard.type('Nova Rivera', { delay: (85 / K) });
  await p.locator('.sgx-forge input[type=email]').fill('nova.rivera@example.com');
  await p.locator('.sgx-forge__consent input').check();
  await vwait(0.5);
  await scout('forge_name');
  await p.$eval('.sgx-forge form', (f) => f.requestSubmit());
  await vwait(1.0);
  await tap('.sgx-forge__pillars button >> nth=1');
  await vwait(0.7);
  await scout('forge_pillar');
  await tap('.sgx-forge button.sgx-btn:not(.sgx-btn--ground):not([disabled])');
  await vwait(0.8);
  await caption('Paso 2', 'Diseña tu <b>piloto</b>', 'Pieza por pieza, colores incluidos.');
  for (let i = 0; i < 4; i++) { await tap('.sgx-pilotb__rolls button >> nth=0'); await vwait(0.45); }
  await scout('forge_pilot');
  await caption('', '');
  await tap('text=/Forjar mi SGX Pass/');
  await vwait(3.0);
  await caption('Tu Holo Card · tu QR · tu entrada', 'Pase <b>forjado</b>');
  await vwait(1.6);
  await scout('forge_done');

  // S5 prepare with the agenda
  mark('agenda');
  await caption('', '');
  await p.keyboard.press('Escape');
  await vwait(0.6);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section: 'AGENDA' } })));
  await vwait(0.6);
  await tap('button:has-text("Mi Agenda & Alertas")');
  await vwait(0.9);
  await caption('Paso 3', 'Arma tu <b>agenda</b>', 'Guarda las charlas y activa alertas.');
  await tap('button:has-text("+ MI AGENDA") >> nth=0');
  await vwait(0.9);
  await tap('button[title="Notificarme al iniciar"] >> nth=0').catch(() => {});
  await vwait(0.9);
  await tap('button:has-text("+ MI AGENDA") >> nth=0').catch(() => {});
  await vwait(1.6);
  await scout('agenda');

  // S6 explore + missions + XP
  mark('explore');
  await caption('', '');
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section: 'OVERVIEW' } })));
  await vwait(1.2);
  await tap('button:has-text("Explorar el núcleo")', { timeout: 4000 }).catch(() => {});
  await vwait(0.5);
  await p.evaluate(() => { const b = [...document.querySelectorAll('button.sgx-calm-hide')].find((x) => /SGX\.SHOWCASE/i.test(x.textContent || '')); b?.click(); });
  await vwait(1.0);
  await caption('Paso 4', 'Explora. Completa misiones.<br><b>Gana XP.</b>', 'Y canjéalo en la Tienda del Reactor.');
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:xp_sparks', { detail: { x: window.innerWidth / 2, y: window.innerHeight * 0.45 } })));
  await vwait(1.6);
  await p.evaluate(() => window.dispatchEvent(new CustomEvent('sgx:xp_sparks', { detail: { x: window.innerWidth * 0.7, y: window.innerHeight * 0.35 } })));
  await vwait(1.6);
  await scout('explore');

  // S7 end card
  mark('end');
  await caption('', '');
  await p.evaluate(() => {
    const el = document.createElement('div'); el.id = 'promo-end';
    el.innerHTML = '<div><img src="/brand/sgx-bolt.svg" alt=""><h1>Spatialgineers<b>Summit 2026</b></h1><p>11–13 dic · YouTube Live<br>+ Chroma Space Studios</p><div class="url">summit.spatialgineers.com</div></div>';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
  });
  await vwait(9.5);
  await scout('end');
  mark('done');

  if (!SCOUT) await cdp.send('Page.stopScreencast');
  fs.writeFileSync(path.join(OUT, 'frames.json'), JSON.stringify({ K, marks, frames: frameLog }, null, 1));
  console.log('frames', frameN, 'errors', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
