const { chromium } = require('playwright');
const mode = process.argv[2] || 'presets';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--ignore-gpu-blocklist','--enable-unsafe-swiftshader'] });
  const W = 1600, H = mode.startsWith('presets') || mode === 'full' ? 1000 : mode === 'torso' || mode === 'sizes' || mode === 'torsoBack' ? 760 : 1200;
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
    const st = await import('/src/identity/highbotStudio.ts');
    st.studioRenderer(r, true);
    const env = st.studioEnvironment(r);
    const mkScene = () => {
      const s = new THREE.Scene(); s.background = new THREE.Color('#0b0d12'); s.environment = env; s.add(st.studioLights(true));
      const floor = new THREE.Mesh(new THREE.CircleGeometry(1.3, 48), new THREE.MeshStandardMaterial({ color: 0x121418, metalness: 0.15, roughness: 0.75 }));
      floor.rotation.x = -Math.PI / 2; floor.position.y = -0.77; floor.receiveShadow = true; s.add(floor);
      return s;
    };
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
    const gray = { ...plain, colors: { ...plain.colors, shell: '#5A5F66', trim: '#FDCC0D', iris: '#00DDFF' } };
    const T = { cam: 'torso', rotY: -0.4 };
    if (mode === 'torso') { cols = 6; cells = av.PILOT_TEXTURES.map((t) => ({ ...T, cfg: { ...gray, pattern: t.id, ink: 'trim', tile: 1 } })); }
    if (mode === 'inks') { cols = 6; const shells = ['#1A1A1A', '#FFF9E2', '#32527B', '#B87000']; cells = shells.flatMap((sh) => ['tone','trim','glow'].map((ink) => ({ ...T, cfg: { ...gray, colors: { ...gray.colors, shell: sh }, pattern: sh === '#FFF9E2' ? 'engranajes' : sh === '#B87000' ? 'rayos' : 'circuito', ink, tile: 1 } }))); }
    if (mode === 'torsoBack') { cols = 4; cells = av.HIGHBOT_PRESETS.filter((x) => x.config.pattern).map((x) => ({ cam: 'torso', rotY: Math.PI, cfg: x.config })); }
    if (mode === 'eyes') { cols = 3; cells = av.HIGHBOT_PRESETS.filter((x) => ![5, 8].includes(x.config.visor)).map((x) => ({ cfg: x.config, rotY: -0.25, cam: 'head' })); }
    if (mode === 'sizes') { cols = 4; cells = ['escudo-hex', 'engranajes'].flatMap((id) => [0,1,2,3].map((tile) => ({ ...T, cfg: { ...gray, pattern: id, ink: 'trim', tile } }))); }
    if (mode === 'chests') { cols = 4; cells = av.HIGHBOT_PRESETS.map((x) => ({ cfg: x.config, rotY: 0, cam: 'torso' })); }
    if (mode === 'backs2') { cols = 4; cells = av.HIGHBOT_PRESETS.map((x) => ({ cfg: x.config, rotY: Math.PI, cam: 'torso' })); }
    if (mode === 'acc') { cols = 4; cells = [{h:2,v:0,r:-0.9},{h:2,v:0,r:0},{h:7,v:0,r:-0.6},{h:7,v:0,r:-1.6},{h:0,v:5,r:-0.6},{h:0,v:5,r:-1.2},{h:0,v:7,r:-0.6},{h:2,v:7,r:-0.9}].map((o) => ({ cfg: { ...plain, headgear: o.h, visor: o.v }, rotY: o.r, cam: 'head' })); }
    if (mode === 'plates') { cols = 4; cells = ['SGX','STORY','SPARK','SYSTEM'].map((pl) => ({ cfg: { ...plain, chest: pl, back: pl, relic: 'none', chestStyle: 'gear' }, rotY: 0, cam: 'gear' })).concat(['SGX','STORY','SPARK','SYSTEM'].map((pl) => ({ cfg: { ...plain, chest: pl, back: pl, relic: 'none', chestStyle: 'gear' }, rotY: Math.PI, cam: 'backgear' }))); }
    if (mode === 'big') { cols = 4; cells = ['STORY','SPARK','STAGE','SGX'].map((pl) => ({ cfg: { ...plain, chest: pl, chestStyle: 'big', relic: 'none' }, rotY: -0.3, cam: 'torso' })).concat([{ cfg: { ...plain, chest: 'STAGE', relic: 'back' }, rotY: Math.PI * 0.85, cam: 'torso' }, { cfg: { ...plain, chest: 'SPARK', relic: 'orbit' }, rotY: -0.3 }, { cfg: { ...plain, chest: 'SYSTEM', relic: 'antenna' }, rotY: -0.3 }, { cfg: { ...plain, chest: 'STORY', chestStyle: 'big', relic: 'orbit' }, rotY: -0.3 }]); }
    if (mode === 'full') { cols = 4; cells = av.HIGHBOT_PRESETS.filter((x) => x.config.pattern).map((x) => ({ cfg: x.config, rotY: 0 })).concat(av.HIGHBOT_PRESETS.filter((x) => x.config.pattern).map((x) => ({ cfg: x.config, rotY: Math.PI * 0.8 }))); }
    const rows = Math.ceil(cells.length / cols);
    const cw = W / cols, ch = H / rows;
    r.setScissorTest(true); r.autoClear = false; r.clear();
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i]; const scene = mkScene();
      const bot = await hb.buildHighbot3D(cell.cfg);
      bot.group.rotation.y = cell.rotY || 0; scene.add(bot.group); bot.update(0.6);
      const cam = new THREE.PerspectiveCamera(cell.cam === 'head' ? 24 : cell.cam === 'torso' ? 20 : 30, cw / ch, 0.1, 50);
      if (cell.cam === 'gear') { cam.fov = 12; cam.updateProjectionMatrix(); cam.position.set(-0.22, 0.37, 3.2); cam.lookAt(-0.22, 0.37, 0); } else if (cell.cam === 'backgear') { cam.fov = 12; cam.updateProjectionMatrix(); cam.position.set(0, 0.25, 3.2); cam.lookAt(0, 0.25, 0); } else if (cell.cam === 'torso') { cam.position.set(0, 0.7, 6.4); cam.lookAt(0, 0.3, 0); } else if (cell.cam === 'head') { cam.position.set(0, 1.9, 7.2); cam.lookAt(0, 1.45, 0); } else { cam.position.set(0, 0.8, 7.6); cam.lookAt(0, 0.7, 0); }
      const col = i % cols, row = Math.floor(i / cols);
      const x = col * cw, y = H - (row + 1) * ch;
      r.setViewport(x, y, cw, ch); r.setScissor(x, y, cw, ch);
      r.render(scene, cam);
    }
  }, { mode, W, H });
  await p.screenshot({ path: `v6-${mode}.png` });
  await b.close();
})();
