const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const big = ['gear'].includes(process.argv[2]); const p = await b.newPage({ viewport: { width: 1600, height: big ? 1300 : 1000 } });
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.text().startsWith('LOG')) console.log(m.text().slice(0, 300)); });
  await p.goto('http://localhost:3200/manifest.webmanifest');
  const shots = process.argv[2] || 'presets';
  const res = await p.evaluate(async (mode) => {
    const THREE = await import('/node_modules/.vite/deps/three.js').catch(() => null) || await import('three');
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    document.body.innerHTML = ''; document.body.style.margin = '0'; document.body.style.background = '#0b0d12';
    const W = 1600, H = mode === 'gear' ? 1300 : 1000;
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.12;
    const scene = new THREE.Scene(); scene.background = new THREE.Color('#0b0d12');
    const pm = new THREE.PMREMGenerator(r); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.8;
    scene.add(new THREE.HemisphereLight(0xfff9e2, 0x0b0f16, 0.8)); const k = new THREE.DirectionalLight(0xffffff, 2.1); k.position.set(-3, 4, 5); scene.add(k);
    const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
    let configs;
    if (mode === 'presets') configs = av.HIGHBOT_PRESETS.map((x) => x.config);
    else if (mode === 'faces') configs = [...av.EYELIDS.map((e) => ({ ...av.HIGHBOT_PRESETS[0].config, eyelid: e.id })), ...av.MOUTHS.map((m) => ({ ...av.HIGHBOT_PRESETS[0].config, mouth: m.id }))];
    else if (mode === 'gear') { const base = av.HIGHBOT_PRESETS[1].config; configs = [...[1,2,3,4,5,6,7,8,9,10].map((h) => ({ ...base, pattern: 0, headgear: h })), ...[1,2,3,4,5,6,7,8].map((v) => ({ ...base, pattern: 0, visor: v }))]; }
    else if (mode === 'tiles') { const base = av.HIGHBOT_PRESETS[1].config; configs = [0,1,2,3].map((t) => ({ ...base, pattern: 11, tile: t })).concat(['#FF4040', '#FFF9E2', '#00DDFF', '#1A1A1A'].map((col) => ({ ...base, pattern: 3, tile: 1, colors: { ...base.colors, shell: col } }))); }
    else configs = [av.HIGHBOT_PRESETS[1].config, av.HIGHBOT_PRESETS[3].config, av.HIGHBOT_PRESETS[0].config, av.HIGHBOT_PRESETS[7].config];
    const n = configs.length; const cols = mode === 'faces' ? 5 : mode === 'gear' ? 6 : 4; const rows = Math.ceil(n / cols);
    const bots = [];
    for (let i = 0; i < n; i++) {
      const bot = await hb.buildHighbot3D(configs[i]);
      const col = i % cols, row = Math.floor(i / cols);
      bot.group.position.set((col - (cols - 1) / 2) * 2.6, -(row - (rows - 1) / 2) * 3.3, 0);
      if (mode === 'back') bot.group.rotation.y = i % 2 ? Math.PI : 0;
      scene.add(bot.group); bot.update(0.6); bots.push(bot);
    }
    if (mode === 'faces') { cam.position.set(0, 1.9, 9); cam.lookAt(0, 1.5, 0); }
    else { cam.position.set(0, 0.7, rows > 2 ? 18 : rows > 1 ? 13 : 8.5); cam.lookAt(0, 0.65, 0); }
    if (mode === 'faces') { // close-up heads: zoom on each face
      cam.position.set(0, 0, 14.5); cam.lookAt(0, 0, 0);
      bots.forEach((b2, i) => { const col = i % cols, row = Math.floor(i / cols); b2.group.position.set((col - 2) * 2.4, -(row - 0.5) * 2.4 - 1.35, 0); });
    }
    r.render(scene, cam);
    return n;
  }, shots);
  console.log('rendered', res);
  await p.screenshot({ path: `hb-${shots}.png` });
  await b.close();
})();
