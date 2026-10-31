import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buildHighbot3D } from './highbot3d';
import type { PilotConfig } from './pilotAvatar';

/* Portraits: the 3D Highbot rendered once per look into a transparent image
   (100:120, like the avatar slots), for every flat place: header chip, chat,
   Holo Card, pass PDF. One offscreen renderer for the whole app and a queue,
   so a long chat never opens more than one WebGL context. */

const W = 300;
const H = 360;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let queue: Promise<unknown> = Promise.resolve();

function setup(): boolean {
  if (renderer) return true;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  } catch {
    renderer = null;
    return false;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.12;
  scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  scene.add(new THREE.HemisphereLight(0xfff9e2, 0x0b0f16, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-3, 4, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.7); fill.position.set(4, 1, 3); scene.add(fill);
  // full figure, a touch from above, filling the 100:120 slot
  camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 50);
  camera.position.set(0, 1.45, 8.1);
  camera.lookAt(0, 0.92, 0);
  return true;
}

async function render(c: PilotConfig): Promise<string | null> {
  if (!setup() || !renderer || !scene || !camera) return null;
  const bot = await buildHighbot3D(c);
  await bot.ready;
  bot.group.rotation.y = -0.22;
  bot.update(0.6);
  scene.add(bot.group);
  renderer.render(scene, camera);
  const webp = renderer.domElement.toDataURL('image/webp', 0.9);
  const url = webp.startsWith('data:image/webp') ? webp : renderer.domElement.toDataURL('image/png');
  scene.remove(bot.group);
  bot.dispose();
  return url;
}

/** One at a time, in order. Resolves to a data URL, or null without WebGL. */
export function renderPortrait(c: PilotConfig): Promise<string | null> {
  const job = queue.then(() => render(c));
  queue = job.catch(() => undefined);
  return job;
}
