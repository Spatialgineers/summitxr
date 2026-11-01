const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const W = 1600, H = 520;
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:3200/manifest.webmanifest');
  await p.evaluate(async ({ W, H }) => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const st = await import('/src/identity/highbotStudio.ts');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
    st.studioRenderer(r, true); const env = st.studioEnvironment(r);
    r.setScissorTest(true); r.autoClear = false; r.clear();
    const cfg = av.HIGHBOT_PRESETS[6].config; // conector, white
    const smooth = (geo, it) => {
      const idx = geo.index; const n = geo.getAttribute('normal'); if (!idx) return;
      let cur = Float32Array.from(n.array);
      for (let k = 0; k < it; k++) {
        const acc = new Float32Array(cur.length);
        for (let i = 0; i < idx.count; i += 3) {
          const a = idx.getX(i) * 3, b = idx.getX(i + 1) * 3, c = idx.getX(i + 2) * 3;
          for (let d = 0; d < 3; d++) { const s = cur[a + d] + cur[b + d] + cur[c + d]; acc[a + d] += s; acc[b + d] += s; acc[c + d] += s; }
        }
        for (let v = 0; v < acc.length; v += 3) { const l = Math.hypot(acc[v], acc[v + 1], acc[v + 2]) || 1; acc[v] /= l; acc[v + 1] /= l; acc[v + 2] /= l; }
        cur = acc;
      }
      return cur;
    };
    const variants = ['current', 'no brush', 'smooth x3', 'smooth x3 + brush'];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Scene(); s.background = new THREE.Color('#0b0d12'); s.environment = env; s.add(st.studioLights(true));
      const bot = await hb.buildHighbot3D(cfg);
      const saved = [];
      bot.group.traverse((o) => {
        if (!o.isMesh) return;
        if (i === 1 || i === 2) { const m = o.material; if (m && m.isMeshStandardMaterial) { m.onBeforeCompile = () => {}; m.customProgramCacheKey = () => 'plain' + i; m.needsUpdate = true; } }
        if (i >= 2 && o.geometry.index && !o.geometry.userData.sm) { const nn = smooth(o.geometry, 3); saved.push([o.geometry, Float32Array.from(o.geometry.getAttribute('normal').array)]); o.geometry.getAttribute('normal').array.set(nn); o.geometry.getAttribute('normal').needsUpdate = true; o.geometry.userData.sm = 1; }
      });
      bot.group.rotation.y = -0.45; bot.update(0.6); s.add(bot.group);
      const cw = W / 4; const cam = new THREE.PerspectiveCamera(22, cw / H, 0.1, 50); cam.position.set(0, 1.9, 6.4); cam.lookAt(0, 1.3, 0);
      r.setViewport(i * cw, 0, cw, H); r.setScissor(i * cw, 0, cw, H); r.render(s, cam);
      saved.forEach(([g, arr]) => { g.getAttribute('normal').array.set(arr); g.getAttribute('normal').needsUpdate = true; delete g.userData.sm; });
    }
  }, { W, H });
  await p.screenshot({ path: 'v5-ab.png' });
  await b.close();
})();
