const { chromium } = require('playwright');
const mode = process.argv[2] || 'presets';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const W = 1600, H = mode.startsWith('presets') ? 1000 : 1200;
  const p = await b.newPage({ viewport: { width: W, height: H } });
  p.on('pageerror', e => console.log('ERR', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log(m.type(), m.text().slice(0, 200)); });
  await p.goto('http://localhost:3200/manifest.webmanifest');
  await p.evaluate(async ({ mode, W, H }) => {
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const hb = await import('/src/identity/highbot3d.ts');
    const av = await import('/src/identity/pilotAvatar.ts');
    const { RoomEnvironment } = await import('/node_modules/three/examples/jsm/environments/RoomEnvironment.js');
    document.body.innerHTML = ''; document.body.style.margin = '0';
    const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); document.body.appendChild(r.domElement);
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.NeutralToneMapping; r.toneMappingExposure = 1.12;
    const pm = new THREE.PMREMGenerator(r); const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    const mkScene = () => { const s = new THREE.Scene(); s.background = new THREE.Color('#0b0d12'); s.environment = env; s.environmentIntensity = 0.8; s.add(new THREE.HemisphereLight(0xfff9e2, 0x0b0f16, 0.8)); const k = new THREE.DirectionalLight(0xffffff, 2.1); k.position.set(-3, 4, 5); s.add(k); return s; };
    const base = av.HIGHBOT_PRESETS[0].config;
    const plain = { ...base, parts: { ears: false, mask: false, nose: false, headDecor: true, sideDiscs: true, chestDecor: true }, colors: { ...base.colors, shell: '#32527B', trim: '#FDCC0D', iris: '#00DDFF' } };
    let cells = []; // {cfg, rotY, cam:'full'|'head'}
    let cols = 4;
    if (mode === 'presets') cells = av.HIGHBOT_PRESETS.map((x) => ({ cfg: x.config, rotY: 0 }));
    if (mode === 'presets34') cells = av.HIGHBOT_PRESETS.map((x) => ({ cfg: x.config, rotY: x.config.relic === 'back' ? Math.PI * 0.78 : -0.55 }));
    if (mode === 'headgear') { cols = 5; cells = [1,2,3,4,5,6,7,8,9,10].map((h) => ({ cfg: { ...plain, headgear: h }, rotY: -0.38, cam: 'head' })); }
    if (mode === 'headgearEars') { cols = 5; cells = [1,2,3,4,5,6,7,8,9,10].map((h) => ({ cfg: { ...base, headgear: h }, rotY: -0.38, cam: 'head' })); }
    if (mode === 'sockets') { cols = 3; cells = [{ h: 1 }, { h: 2 }, { h: 9 }, { v: 1 }, { v: 3 }, { h: 10 }].map((o) => ({ cfg: { ...plain, headgear: o.h || 0, visor: o.v || 0 }, rotY: -0.7, cam: 'head' })); }
    if (mode === 'backs') { cols = 4; const perf = av.HIGHBOT_PRESETS.find((x) => x.id === 'performer').config; cells = [
      { cfg: perf, rotY: Math.PI * 0.85, cam: 'head' }, { cfg: { ...perf, parts: { ...perf.parts, mask: false } }, rotY: Math.PI * 0.85, cam: 'head' },
      { cfg: { ...perf, pattern: 0, colors: { ...perf.colors, shell: '#888888' } }, rotY: Math.PI * 0.85, cam: 'head' }, { cfg: { ...perf, pattern: 0, colors: { ...perf.colors, shell: '#888888' }, parts: { ...perf.parts, mask: false } }, rotY: Math.PI * 0.85, cam: 'head' } ]; }
    if (mode === 'visors') { cols = 4; cells = [1,2,3,4,5,6,7,8].map((v) => ({ cfg: { ...plain, visor: v }, rotY: -0.5, cam: 'head' })); }
    if (mode === 'relics') { cols = 5; cells = ['chest','back','hand','orbit','antenna'].map((m, i) => ({ cfg: { ...plain, chest: 'SPARK', relic: m }, rotY: m === 'back' ? Math.PI * 0.8 : -0.5 })).concat(['STORY','SHOWCASE','SPARK','STAGE','SYSTEM'].map((pl) => ({ cfg: { ...plain, chest: pl, relic: 'chest' }, rotY: -0.2 }))); }
    const rows = Math.ceil(cells.length / cols);
    const cw = W / cols, ch = H / rows;
    r.setScissorTest(true); r.autoClear = false; r.clear();
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]; const scene = mkScene();
      const bot = await hb.buildHighbot3D(cell.cfg);
      bot.group.rotation.y = cell.rotY || 0; scene.add(bot.group); bot.update(0.6);
      const cam = new THREE.PerspectiveCamera(cell.cam === 'head' ? 24 : 30, cw / ch, 0.1, 50);
      if (cell.cam === 'head') { cam.position.set(0, 1.9, 7.2); cam.lookAt(0, 1.45, 0); } else { cam.position.set(0, 0.8, 7.6); cam.lookAt(0, 0.7, 0); }
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cw, y = H - (row + 1) * ch;
      r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch);
      r.render(scene, cam);
    }
  }, { mode, W, H });
  await p.screenshot({ path: `v3-${mode}.png` });
  await b.close();
})();
