import * as THREE from 'three';
import { buildHighbot3D } from './highbot3d';
import { studioEnvironment, studioLights, studioRenderer } from './highbotStudio';
import type { PilotConfig } from './pilotAvatar';

/* Portraits: the 3D Highbot rendered once per look into a transparent image
   (100:120, like the avatar slots), for every flat place: header chip, chat,
   Holo Card, pass PDF. One offscreen renderer for the whole app and a queue,
   so a long chat never opens more than one WebGL context. Same studio as the
   editor (highbotStudio.ts), soft shadows included. The flat version is
   drawn like a cartoon: toon materials with three hard light steps and a
   black outline around every piece (inverted hull). The 3D views keep the
   brushed metal. */

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
  studioRenderer(renderer, true);
  scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.add(studioLights(true));
  // full figure, a touch from above, filling the 100:120 slot
  camera = new THREE.PerspectiveCamera(26, W / H, 0.1, 50);
  camera.position.set(0, 1.45, 8.1);
  camera.lookAt(0, 0.92, 0);
  return true;
}

const INK = new THREE.Color('#0B0C0F');
let ramp: THREE.DataTexture | null = null;
/** Three hard steps of light: shadow, mid, lit. */
function toonRamp(): THREE.DataTexture {
  if (ramp) return ramp;
  const d = new Uint8Array([115, 115, 115, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  ramp = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  ramp.minFilter = THREE.NearestFilter;
  ramp.magFilter = THREE.NearestFilter;
  ramp.generateMipmaps = false;
  ramp.needsUpdate = true;
  return ramp;
}

/** Black back-face shell pushed out along the normals, in view space (constant width). */
function outlineMaterial(): THREE.MeshBasicMaterial {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace(
      '#include <project_vertex>',
      `#include <project_vertex>
      vec3 sgxN = normalize(normalMatrix * normal);
      mvPosition.xyz += sgxN * 0.024;
      gl_Position = projectionMatrix * mvPosition;`,
    );
  };
  return m;
}

/** The raccoon mask, nose and inner ears: always black. */
function isFace(o: THREE.Object3D): boolean {
  if (o.userData.earInner) return true;
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (/mask|nose/i.test(p.name || '')) return true;
  return false;
}

/** Swaps the bot's materials for toon ones and adds the outlines; returns what to dispose. */
function toonify(root: THREE.Object3D, c: PilotConfig): THREE.Material[] {
  // only the body colors get lifted when very dark; the raccoon mask and the visors stay black
  const body = new Set([c.colors.shell, c.colors.joints, c.colors.shoes, c.colors.trim].map((h) => new THREE.Color(h).getHexString()));
  const made: THREE.Material[] = [];
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh); });
  const outline = outlineMaterial();
  made.push(outline);
  meshes.forEach((mesh) => {
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    if (!src || !src.isMeshStandardMaterial) return;
    // glows, glass and lights keep their look and get no outline
    const see = src.transparent || src.blending === THREE.AdditiveBlending;
    if (!see) {
      // a black part would vanish into its own outline: very dark colors are lifted to a readable charcoal
      const color = src.color.clone();
      const hsl = { h: 0, s: 0, l: 0 };
      color.getHSL(hsl);
      if (hsl.l < 0.08 && body.has(src.color.getHexString()) && !isFace(mesh)) color.setHSL(hsl.h, hsl.s, 0.08 + hsl.l * 0.5);
      const toon = new THREE.MeshToonMaterial({
        color, map: src.map, gradientMap: toonRamp(),
        emissive: src.emissive, emissiveMap: src.emissiveMap, emissiveIntensity: src.emissiveIntensity,
        alphaTest: src.alphaTest, side: src.side,
      });
      // textured parts carry their color in the texture: a dark one gets a charcoal base light instead
      if (src.map && src.emissive.getHex() === 0) toon.emissive.set('#1a1d24');
      mesh.material = toon;
      made.push(toon);
      const shell = (mesh as THREE.SkinnedMesh).isSkinnedMesh
        ? (() => { const sk = new THREE.SkinnedMesh(mesh.geometry, outline); sk.bind((mesh as THREE.SkinnedMesh).skeleton, (mesh as THREE.SkinnedMesh).bindMatrix); return sk; })()
        : new THREE.Mesh(mesh.geometry, outline);
      shell.castShadow = false;
      shell.receiveShadow = false;
      mesh.add(shell);
    }
  });
  return made;
}

async function render(c: PilotConfig): Promise<string | null> {
  if (!setup() || !renderer || !scene || !camera) return null;
  const bot = await buildHighbot3D(c);
  await bot.ready;
  bot.group.rotation.y = -0.22;
  bot.update(0.6);
  const toonMats = toonify(bot.group, c);
  scene.add(bot.group);
  renderer.render(scene, camera);
  const webp = renderer.domElement.toDataURL('image/webp', 0.9);
  const url = webp.startsWith('data:image/webp') ? webp : renderer.domElement.toDataURL('image/png');
  scene.remove(bot.group);
  bot.dispose();
  toonMats.forEach((m) => m.dispose());
  return url;
}

/** One at a time, in order. Resolves to a data URL, or null without WebGL. */
export function renderPortrait(c: PilotConfig): Promise<string | null> {
  const job = queue.then(() => render(c));
  queue = job.catch(() => undefined);
  return job;
}
