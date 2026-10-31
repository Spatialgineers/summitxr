import * as THREE from 'three';

/* HIGHBOT STUDIO: one photo studio for every place the 3D Highbot is shown
   (the editor, the rendered portraits, the orbit around the core), so a bot
   looks the same everywhere. Neutral light only: the bot's own colors stay
   true. The reflections come from a small studio built here (dark room, a big
   softbox above the camera, two tall strip lights behind the figure, a dim
   floor bounce): the strips draw the clean highlight lines along the rounded
   head and torso that make a lacquered figure read as a real object. */

/** A prefiltered studio environment for scene.environment or material.envMap. Dispose it with the viewer. */
export function studioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const scene = new THREE.Scene();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const add = (geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, k: number, at: [number, number, number], side: THREE.Side = THREE.FrontSide) => {
    const mat = new THREE.MeshBasicMaterial({ color, side });
    mat.color.multiplyScalar(k);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...at);
    if (at.some((v) => v !== 0)) m.lookAt(0, 0, 0); // panels face the figure
    geos.push(geo); mats.push(mat);
    scene.add(m);
    return m;
  };
  // the room: near black, a touch of blue
  add(new THREE.BoxGeometry(40, 40, 40), 0x0c0e13, 1, [0, 0, 0], THREE.BackSide);
  // key softbox, high and to the left of the camera
  add(new THREE.PlaneGeometry(9, 6), 0xffffff, 5.5, [-5, 8, 7]);
  // a wide soft top light
  add(new THREE.PlaneGeometry(12, 12), 0xffffff, 1.6, [0, 14, 0]);
  // two tall strips behind the figure: the rim lines
  add(new THREE.PlaneGeometry(1.4, 16), 0xf2f6ff, 7, [-10, 3, -7]);
  add(new THREE.PlaneGeometry(1.4, 16), 0xf2f6ff, 7, [10, 3, -7]);
  // a low fill in front, and a dim warm bounce from the floor
  add(new THREE.PlaneGeometry(8, 3), 0xffffff, 1.1, [4, 1, 11]);
  add(new THREE.PlaneGeometry(26, 26), 0x2a2622, 1, [0, -9, 0]);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  geos.forEach((g) => g.dispose());
  mats.forEach((m) => m.dispose());
  return env;
}

/** The renderer settings the studio is tuned for. */
export function studioRenderer(renderer: THREE.WebGLRenderer, shadows: boolean) {
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = shadows;
  renderer.shadowMap.type = THREE.PCFShadowMap;
}

/** Key, fill and rim, all neutral. The key casts the soft shadows (head on body, arms on torso, figure on podium). */
export function studioLights(shadows: boolean): THREE.Group {
  const g = new THREE.Group();
  g.add(new THREE.HemisphereLight(0xffffff, 0x101318, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-2.2, 7, 3.6);
  key.target.position.set(0, 0.5, 0);
  if (shadows) {
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    const c = key.shadow.camera;
    c.left = -2.4; c.right = 2.4; c.top = 2.8; c.bottom = -2.2; c.near = 0.5; c.far = 20;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    key.shadow.radius = 3;
  }
  const fill = new THREE.DirectionalLight(0xffffff, 0.45);
  fill.position.set(4, 1.5, 4);
  const rim = new THREE.DirectionalLight(0xe6f0ff, 1.5);
  rim.position.set(0.5, 3, -5);
  g.add(key, key.target, fill, rim);
  return g;
}
