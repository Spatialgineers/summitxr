const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 800, height: 600 } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 160)); });
  await p.goto('http://localhost:3200/manifest.webmanifest');
  const info = await p.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const st = await import('/src/identity/highbotStudio.ts');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(800, 600); document.body.appendChild(r.domElement);
    st.studioRenderer(r, true);
    const s = new THREE.Scene(); s.background = new THREE.Color('#0b0d12'); s.environment = st.studioEnvironment(r); s.add(st.studioLights(true));
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(8, 8), new THREE.MeshStandardMaterial({ color: 0x808080, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.77; floor.receiveShadow = true; s.add(floor);
    const bot = await hb.buildHighbot3D(av.HIGHBOT_PRESETS[2].config); s.add(bot.group); bot.update(0.6);
    const cam = new THREE.PerspectiveCamera(35, 800 / 600, 0.1, 50); cam.position.set(3, 4, 7); cam.lookAt(0, 0.4, 0);
    r.render(s, cam);
    let casters = 0; bot.group.traverse((o) => { if (o.isMesh && o.castShadow) casters++; });
    return { enabled: r.shadowMap.enabled, casters };
  });
  console.log(JSON.stringify(info));
  await p.screenshot({ path: 'v5-shadowdbg.png' });
  await b.close();
})();
