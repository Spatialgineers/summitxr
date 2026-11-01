const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1500, height: 560 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  await p.goto('http://localhost:3200/manifest.webmanifest');
  await p.evaluate(async () => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const W = 1500, H = 560;
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0d12');
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight(0xfff9e2, 0x0b0f16, 0.8)); const k = new THREE.DirectionalLight(0xffffff, 2.1); k.position.set(-3, 4, 5); scene.add(k);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100); cam.position.set(0, 0.7, 7.4); cam.lookAt(0, 0.65, 0);
    // 5 bots at different moments: idle t=0.3, idle t=1.4 (arms swing, head turn), wave start, wave peak, wave end
    const times = [0.3, 2.3, 10.3, 10.55, 10.8];
    for (let i = 0; i < 5; i++) {
      const bot = await hb.buildHighbot3D(av.HIGHBOT_PRESETS[3].config);
      bot.group.position.x = (i - 2) * 2.7; bot.group.rotation.y = -0.35;
      scene.add(bot.group);
      bot.update(10); if (i >= 2) bot.wave(); bot.update(times[i]);
    }
    r.render(scene, cam);
  });
  await p.screenshot({ path: 'hb-anim.png' });
  await b.close();
})();
