import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EYELIDS, PILOT_TEXTURES, TILE_SIZES, etchInk, etchSrc, normalizePilot, plateSrc, type ColorGroup, type Eyelid, type PartId, type PilotConfig } from './pilotAvatar';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { ANATOMY, buildGear } from './highbotGear';
import { loadSgxIcon } from './sgxIcon3d';
import type { Plate } from './pilotAvatar';

/* HIGHBOT 3D: the Nomad model (public/characters/highbot/highbot.glb, meshopt
   compressed, names and hierarchy intact) dressed from a PilotConfig.
   Every part is its own node, so recoloring is per part group, the eyelid and
   the eyes are lights (no mouth: its variants stay hidden), and the two "Plane for logo or
   pillars" discs on the gears get the chosen pillar / Summit logo.
   Rig: the model has no skin. Each joint (shoulders, hips, neck) is a node whose
   origin is the center of its sphere, so the limbs are rigid pieces turned
   about those pivots: breathing, arm swing, weight shift, a look-around, blinks
   and a wave. Units: the figure stands from y = -0.77 to ~2.08 (same frame as
   the old bust avatar), so viewers and the orbit card need no changes. */

export interface Pilot3D {
  group: THREE.Group;
  /** Idle life. Call every frame with seconds. */
  update: (t: number) => void;
  dispose: () => void;
  /** Resolves once the plate images are on. */
  ready: Promise<void>;
  /** A friendly wave with the right arm (next frames). */
  wave?: () => void;
}

export const HIGHBOT_URL = '/characters/highbot/highbot.glb';
const SCALE = 1.6;
const FLOOR = -0.77;

/** Node names in the .glb are sanitized by three (spaces → _) and de-duplicated (_1, _2…). */
const baseName = (n: string) => n.toLowerCase().replace(/_\d+$/, '').replace(/[_\s]+/g, ' ').trim().replace(/ \d+$/, '');

const GROUP_OF: Record<string, ColorGroup | 'pupil'> = {
  body: 'shell', 'body up': 'shell', head: 'shell', 'head decor': 'shell', 'ears and whiskers': 'shell', arm: 'shell', leg: 'shell',
  'head decor accent': 'trim', 'body decor': 'trim', 'shoe decor': 'trim', 'gear front': 'trim', 'gear back': 'trim',
  neck: 'joints', 'shoulder left': 'joints', 'shoulder right': 'joints', 'hip joint left': 'joints', 'hip joint right': 'joints', pelvis: 'joints', hand: 'joints',
  mask: 'mask', nose: 'mask',
  iris: 'iris', pupil: 'pupil',
  shoe: 'shoes',
};

type Kind =
  | { k: 'group'; g: ColorGroup | 'pupil' }
  | { k: 'eyelid'; v: Eyelid }
  | { k: 'mouth'; v: string }
  | { k: 'plate'; side: 'front' | 'back' }
  | { k: 'other' };

function chain(o: THREE.Object3D): string[] {
  const out: string[] = [];
  for (let p: THREE.Object3D | null = o; p; p = p.parent) out.push(baseName(p.name || ''));
  return out;
}

function classify(m: THREE.Object3D): Kind {
  const names = chain(m);
  const lidAt = names.indexOf('eyelid variants');
  if (lidAt > 0) {
    const v = names[lidAt - 1] as Eyelid; // "Low 1", "HIGH 1"… → low, high
    return { k: 'eyelid', v };
  }
  const mouthAt = names.indexOf('mouth variants');
  if (mouthAt > 0) return { k: 'mouth', v: names[mouthAt - 1] };
  if (names.includes('plane for logo or pillars')) return { k: 'plate', side: names.includes('gear back') ? 'back' : 'front' };
  for (const n of names.slice(0, 2)) if (GROUP_OF[n]) return { k: 'group', g: GROUP_OF[n] };
  return { k: 'other' };
}

/* ---------- surface: brushed metal everywhere, the SGX motif etched into the torso ----------
   Both are projected from three sides in model space (triplanar), so they keep
   one size on every face. The brush only breaks up the roughness (the base
   stays 0.2). The motif is a mask (public/pilot/tex/etch) cut at 0.5 with a
   one-pixel soft edge, so it stays crisp at any zoom; it takes the bot's own
   ink (body tone, trim or the eyes' light) and a satin finish, like an etch. */
const BRUSH_TILE = 0.3;
/** The middle of the chest: the motif is centered on it. */
const CHEST = new THREE.Vector3(0, 0.635, -0.04);
const TRI = `
vec4 sgxTri(sampler2D t, vec3 p, vec3 n) {
  vec3 w = pow(abs(n), vec3(10.0));
  w /= (w.x + w.y + w.z + 1e-5);
  vec4 a = texture2D(t, vec2(-p.z * (n.x >= 0.0 ? 1.0 : -1.0), p.y));
  vec4 b = texture2D(t, vec2(p.x, -p.z * (n.y >= 0.0 ? 1.0 : -1.0)));
  vec4 c = texture2D(t, vec2(p.x * (n.z >= 0.0 ? 1.0 : -1.0), p.y));
  return a * w.x + b * w.y + c * w.z;
}`;
/** clear: circles (x, y, radius) the motif stays out of: on the chest front the gear and the marks (or a
    chest emblem), on the back the back gear. */
interface Etch { map: THREE.Texture; size: number; ink: THREE.Color; glow: number; satin: number; clear: [THREE.Vector3, THREE.Vector3, THREE.Vector3] }
function sgxSurface(mat: THREE.MeshStandardMaterial, brush: THREE.Texture | null, etch: Etch | null = null) {
  if (!brush && !etch) return;
  mat.customProgramCacheKey = () => `sgx-hb-${etch ? 'e' : ''}${brush ? 'b' : ''}`;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uBrush = { value: brush };
    sh.uniforms.uBrushTile = { value: BRUSH_TILE };
    sh.uniforms.uEtch = { value: etch?.map ?? null };
    sh.uniforms.uEtchSize = { value: etch?.size ?? 1 };
    sh.uniforms.uEtchCenter = { value: CHEST };
    sh.uniforms.uInk = { value: etch?.ink ?? new THREE.Color() };
    sh.uniforms.uGlow = { value: etch?.glow ?? 0 };
    sh.uniforms.uSatin = { value: etch?.satin ?? 0 };
    sh.uniforms.uClearA = { value: etch?.clear[0] ?? new THREE.Vector3() };
    sh.uniforms.uClearB = { value: etch?.clear[1] ?? new THREE.Vector3() };
    sh.uniforms.uClearC = { value: etch?.clear[2] ?? new THREE.Vector3() };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 triPos;\nattribute vec3 triNrm;\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriPos = triPos;\nvTriNrm = triNrm;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uBrushTile;
${brush ? 'uniform sampler2D uBrush;' : ''}
${etch ? 'uniform sampler2D uEtch; uniform float uEtchSize; uniform vec3 uEtchCenter; uniform vec3 uInk; uniform float uGlow; uniform float uSatin; uniform vec3 uClearA; uniform vec3 uClearB; uniform vec3 uClearC;' : ''}
varying vec3 vTriPos; varying vec3 vTriNrm;
${TRI}`)
      .replace('#include <map_fragment>', etch ? `#include <map_fragment>
  float sgxEtch;
  {
    float a = sgxTri(uEtch, (vTriPos - uEtchCenter) / uEtchSize + 0.5, normalize(vTriNrm)).a;
    float w = max(fwidth(a), 1e-4) * 0.75;
    sgxEtch = smoothstep(0.5 - w, 0.5 + w, a);
    // a clean margin around what sits on the chest front
    float cA = uClearA.z > 0.0 ? smoothstep(uClearA.z, uClearA.z + 0.01, distance(vTriPos.xy, uClearA.xy)) : 1.0;
    float cB = uClearB.z > 0.0 ? smoothstep(uClearB.z, uClearB.z + 0.01, distance(vTriPos.xy, uClearB.xy)) : 1.0;
    float cC = smoothstep(uClearC.z, uClearC.z + 0.01, distance(vTriPos.xy, uClearC.xy));
    sgxEtch *= mix(1.0, cA * cB, step(0.12, vTriPos.z)) * mix(1.0, cC, step(0.2, -vTriPos.z));
    diffuseColor.rgb = mix(diffuseColor.rgb, uInk, sgxEtch);
  }` : '#include <map_fragment>')
      .replace('#include <roughnessmap_fragment>', `float roughnessFactor = roughness;
  ${brush ? 'roughnessFactor *= mix(0.6, 1.45, sgxTri(uBrush, vTriPos / uBrushTile, normalize(vTriNrm)).g);' : ''}
  ${etch ? 'roughnessFactor = mix(roughnessFactor, 0.55, sgxEtch * uSatin);' : ''}`)
      .replace('#include <emissivemap_fragment>', etch ? `#include <emissivemap_fragment>
  totalEmissiveRadiance += uInk * sgxEtch * uGlow;` : '#include <emissivemap_fragment>');
  };
}

/* ---------- lit eyes ----------
   The iris is a light in its exact color: emissive and outside tone mapping,
   so a red eye stays red (not pink) and a cyan one stays cyan. It breathes
   a little, never past full brightness. No halo: the light is the iris. */
const IRIS_GLOW = 0.9;
function irisMaterial(color: string): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color).multiplyScalar(0.15), emissive: new THREE.Color(color), emissiveIntensity: IRIS_GLOW,
    roughness: 0.12, metalness: 0, toneMapped: false,
  });
}

/** Lacquered brushed metal: the bot's 0.4 metal / 0.2 roughness under a clear coat, like a collectible figure. */
const LACQUER = { metalness: 0.4, roughness: 0.2, clearcoat: 0.5, clearcoatRoughness: 0.2 };

let brushPromise: Promise<THREE.Texture | null> | null = null;
/** The brushed-metal grain (shared by every bot, never disposed). */
const brushTexture = () => (brushPromise ||= loadTex('/pilot/tex/metal-cepillado.png', true));

/** Relax the normals over their triangle neighbors (shape untouched, split edges kept): the
    compressed sculpt's small ripples stop showing as wobbly highlights under the lacquer. */
function relaxNormals(geo: THREE.BufferGeometry, rounds = 3) {
  const idx = geo.index;
  const attr = geo.getAttribute('normal') as THREE.BufferAttribute;
  if (!idx || !attr) return;
  let cur = Float32Array.from(attr.array as Float32Array);
  for (let k = 0; k < rounds; k++) {
    const acc = new Float32Array(cur.length);
    for (let i = 0; i < idx.count; i += 3) {
      const a = idx.getX(i) * 3, b = idx.getX(i + 1) * 3, c = idx.getX(i + 2) * 3;
      for (let d = 0; d < 3; d++) {
        const sum = cur[a + d] + cur[b + d] + cur[c + d];
        acc[a + d] += sum; acc[b + d] += sum; acc[c + d] += sum;
      }
    }
    for (let v = 0; v < acc.length; v += 3) {
      const l = Math.hypot(acc[v], acc[v + 1], acc[v + 2]) || 1;
      acc[v] /= l; acc[v + 1] /= l; acc[v + 2] /= l;
    }
    cur = acc;
  }
  attr.array.set(cur);
  attr.needsUpdate = true;
}

/* ---------- the shared model (loaded once, normals and triplanar baked once) ---------- */
let basePromise: Promise<THREE.Group> | null = null;

function loadBase(): Promise<THREE.Group> {
  if (basePromise) return basePromise;
  basePromise = new Promise<THREE.Group>((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(HIGHBOT_URL, (gltf) => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const toRoot = root.matrixWorld.clone().invert();
      const rel = new THREE.Matrix4();
      const nrm = new THREE.Matrix3();
      const v = new THREE.Vector3();
      const splits: { m: THREE.Mesh; tp: Float32Array }[] = [];
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // Nomad exports no normals: smooth ones, so the shell reads as the sculpt
        if (!m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
        relaxNormals(m.geometry);
        m.userData.kind = classify(m);
        // model-space position and normal for the triplanar tile (one scale on every piece)
        rel.multiplyMatrices(toRoot, m.matrixWorld);
        nrm.getNormalMatrix(rel);
        const pos = m.geometry.getAttribute('position');
        const n = m.geometry.getAttribute('normal');
        const tp = new Float32Array(pos.count * 3);
        const tn = new Float32Array(pos.count * 3);
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(rel);
          tp.set([v.x, v.y, v.z], i * 3);
          v.fromBufferAttribute(n, i).applyMatrix3(nrm).normalize();
          tn.set([v.x, v.y, v.z], i * 3);
        }
        m.geometry.setAttribute('triPos', new THREE.BufferAttribute(tp, 3));
        m.geometry.setAttribute('triNrm', new THREE.BufferAttribute(tn, 3));
        // The mask mesh also carries the black inside of the ears. Split it off, so a
        // bot without ears keeps its mask but no floating ear patches.
        if (baseName(m.name || '') === 'mask' && m.geometry.index) splits.push({ m, tp });
      });
      for (const { m, tp } of splits) {
        const idx = m.geometry.index!;
        const face: number[] = [];
        const ear: number[] = [];
        for (let i = 0; i < idx.count; i += 3) {
          const a = idx.getX(i), b = idx.getX(i + 1), c = idx.getX(i + 2);
          const y = (tp[a * 3 + 1] + tp[b * 3 + 1] + tp[c * 3 + 1]) / 3;
          const z = (tp[a * 3 + 2] + tp[b * 3 + 2] + tp[c * 3 + 2]) / 3;
          (y > 1.55 && z < -0.1 ? ear : face).push(a, b, c);
        }
        if (!ear.length) continue;
        const earGeo = new THREE.BufferGeometry();
        for (const [k, attr] of Object.entries(m.geometry.attributes)) earGeo.setAttribute(k, attr);
        earGeo.setIndex(ear);
        m.geometry.setIndex(face);
        const earMesh = new THREE.Mesh(earGeo, m.material);
        earMesh.name = 'Mask ear inner';
        earMesh.position.copy(m.position); earMesh.quaternion.copy(m.quaternion); earMesh.scale.copy(m.scale);
        earMesh.userData.kind = m.userData.kind;
        earMesh.userData.earInner = true;
        m.parent!.add(earMesh);
      }
      resolve(root);
    }, undefined, (e) => { basePromise = null; reject(e); });
  });
  return basePromise;
}

/** Preload the model (e.g. when the editor opens). */
export const preloadHighbot = () => loadBase().then(() => undefined).catch(() => undefined);

/** A plate image (pillar or Summit logo) on a dark disc, as a texture. */
function plateTexture(src: string): Promise<THREE.Texture> {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => {
      const s = 196;
      const r = Math.min(s / img.width, s / img.height);
      ctx.drawImage(img, 128 - (img.width * r) / 2, 128 - (img.height * r) / 2, img.width * r, img.height * r);
      tex.needsUpdate = true;
      res(tex);
    };
    img.onerror = () => res(tex);
    img.src = src;
  });
}

/** A repeating texture: the brush grain (color) or a motif mask (data, read from alpha). */
function loadTex(url: string, srgb: boolean): Promise<THREE.Texture | null> {
  return new Promise((res) => new THREE.TextureLoader().load(url, (t) => {
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    res(t);
  }, undefined, () => res(null)));
}

/* ---------- the pillar's 3D emblem (the same .glb as the core's pillars) ----------
   Two pieces each: the SGX-blue body and the SGX-yellow mark. Baked, centered
   and sized to 1 unit across, cached per pillar and shared by every bot. */
const PILLAR_GLB: Record<Exclude<Plate, 'SGX'>, string> = {
  STORY: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Story%20opt.glb',
  SHOWCASE: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Showcase%20opt.glb',
  SPARK: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Spark%20Opt.glb',
  STAGE: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Stage%20opt.glb',
  SYSTEM: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/System%20opt.glb',
  SYNTHESIZE: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Synthesize%20opt.glb',
};
interface EmblemParts { blue: THREE.BufferGeometry[]; yellow: THREE.BufferGeometry[] }
const emblemCache = new Map<Plate, Promise<EmblemParts | null>>();
let draco: DRACOLoader | null = null;

function normalizeParts(parts: EmblemParts): EmblemParts {
  const box = new THREE.Box3();
  [...parts.blue, ...parts.yellow].forEach((g) => { g.computeBoundingBox(); box.union(g.boundingBox!); });
  const c = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const k = 1 / Math.max(size.x, size.y, 1e-6);
  [...parts.blue, ...parts.yellow].forEach((g) => { g.translate(-c.x, -c.y, -c.z); g.scale(k, k, k); g.computeVertexNormals(); g.computeBoundingSphere(); });
  return parts;
}

function loadEmblem(plate: Plate): Promise<EmblemParts | null> {
  const have = emblemCache.get(plate);
  if (have) return have;
  let job: Promise<EmblemParts | null>;
  if (plate === 'SGX') {
    // the SGX icon: gear (blue) + bolt (yellow)
    job = loadSgxIcon().then((g) => (g ? normalizeParts({ blue: [g.gear.clone()], yellow: [g.bolt.clone()] }) : null));
  } else {
    job = new Promise((resolve) => {
      const loader = new GLTFLoader();
      draco ||= new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      loader.load(PILLAR_GLB[plate], (gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const parts: EmblemParts = { blue: [], yellow: [] };
        gltf.scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const g = m.geometry.clone().applyMatrix4(m.matrixWorld);
          const col = (m.material as THREE.MeshStandardMaterial).color;
          (col && col.r > 0.5 ? parts.yellow : parts.blue).push(g);
        });
        resolve(parts.blue.length + parts.yellow.length ? normalizeParts(parts) : null);
      }, undefined, () => resolve(null));
    });
  }
  job = job.catch(() => null);
  emblemCache.set(plate, job);
  return job;
}

/** A model-space frame hung from a rig node: children use model coordinates and follow the node. */
function modelFrame(node: THREE.Object3D, model: THREE.Object3D): THREE.Group {
  model.updateMatrixWorld(true);
  const frame = new THREE.Group();
  const toModel = model.matrixWorld.clone().invert().multiply(node.matrixWorld);
  toModel.invert().decompose(frame.position, frame.quaternion, frame.scale);
  node.add(frame);
  return frame;
}

export interface Highbot3DOptions {
  /** Reflections for scenes without their own environment (the core): see highbotStudio.ts. */
  envMap?: THREE.Texture | null;
}

export async function buildHighbot3D(raw: PilotConfig, opts: Highbot3DOptions = {}): Promise<Pilot3D> {
  const c = normalizePilot(raw) as PilotConfig;
  const base = await loadBase();
  const model = base.clone(true);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  // every bot is brushed metal (metalness 0.4, roughness 0.2, the brush grain in the roughness) under a clear coat
  const motif = PILOT_TEXTURES.find((t) => t.id === c.pattern && t.id);
  const [brush, mask] = await Promise.all([brushTexture(), motif ? loadTex(etchSrc(motif.id), false) : Promise.resolve(null)]);
  if (mask) keep(mask);
  const metal = (color: string, etch: Etch | null = null) => {
    const mat = keep(new THREE.MeshPhysicalMaterial({ color, ...LACQUER }));
    sgxSurface(mat, brush, etch);
    return mat;
  };
  // the motif goes on the torso only, in the bot's own colors
  const chestRelic = c.relic === 'chest';
  const chestAt = ANATOMY.chest;
  const backGear = new THREE.Vector3(ANATOMY.back.gear.x, ANATOMY.back.gear.y, ANATOMY.back.r + 0.025);
  const clear: [THREE.Vector3, THREE.Vector3, THREE.Vector3] = chestRelic
    ? [new THREE.Vector3(chestAt.center.x, chestAt.center.y, 0.215), new THREE.Vector3(), backGear]
    : [new THREE.Vector3(chestAt.gear.x, chestAt.gear.y, 0.1), new THREE.Vector3(0.15, 0.72, c.parts.chestDecor ? 0.08 : 0), backGear];
  const torso = mask && motif
    ? metal(c.colors.shell, { clear, map: mask, size: TILE_SIZES[c.tile].size * (motif.per ?? 4), ink: new THREE.Color(etchInk(c)), glow: c.ink === 'glow' ? 1.2 : 0, satin: c.ink === 'tone' ? 1 : c.ink === 'trim' ? 0.6 : 0.35 })
    : null;
  // eyelids are the shell's skin, but plain so the face reads
  const lids = metal(c.colors.shell);
  const mats: Record<ColorGroup | 'pupil', THREE.Material> = {
    shell: metal(c.colors.shell),
    trim: metal(c.colors.trim),
    joints: metal(c.colors.joints),
    mask: metal(c.colors.mask),
    iris: keep(irisMaterial(c.colors.iris)),
    shoes: metal(c.colors.shoes),
    pupil: keep(new THREE.MeshBasicMaterial({ color: '#050505' })),
  };
  const [front, back] = await Promise.all([plateTexture(plateSrc(c.chest)), plateTexture(plateSrc(c.back))]);
  keep(front); keep(back);
  const plateMat = { front: keep(new THREE.MeshBasicMaterial({ map: front, toneMapped: false })), back: keep(new THREE.MeshBasicMaterial({ map: back, toneMapped: false })) };

  const eyelids: Record<string, THREE.Object3D[]> = {};
  const lidNode = EYELIDS.find((e) => e.id === c.eyelid)!.id;
  const joints: Record<string, THREE.Object3D> = {};
  const PART_OF: Record<string, PartId> = { 'ears and whiskers': 'ears', mask: 'mask', nose: 'nose', 'head decor': 'headDecor', 'head decor accent': 'sideDiscs', 'body decor': 'chestDecor' };

  /* ---------- gear: headgear and visor, fitted to the anatomy (highbotGear.ts) ----------
     Same lacquered metal; plain materials (procedural pieces carry no triplanar data). */
  const plainMetal = (color: string, extra: Partial<THREE.MeshPhysicalMaterialParameters> = {}) =>
    keep(new THREE.MeshPhysicalMaterial({ color, ...LACQUER, ...extra }));
  const gearMats = {
    trim: plainMetal(c.colors.trim),
    joints: plainMetal(c.colors.joints),
    dark: plainMetal('#121417'),
    glow: keep(new THREE.MeshBasicMaterial({ color: c.colors.iris, toneMapped: false })),
    // smoked glass: near black and glossy, it only catches the studio (the lights are the LEDs, never the glass)
    lens: keep(new THREE.MeshStandardMaterial({ color: '#07090c', metalness: 0.9, roughness: 0.04, transparent: true, opacity: 0.97, side: THREE.DoubleSide })),
    glassTint: keep(new THREE.MeshBasicMaterial({ color: c.colors.iris, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })),
  };
  const gear = buildGear(c.headgear, c.visor, gearMats, { ears: c.parts.ears, antennaForRelic: c.relic === 'antenna' });
  gear.geometries.forEach(keep);
  const eyesHidden = gear.coversEyes;
  // a chest emblem replaces the flat chest gear, its disc and the marks (chestRelic, above)

  model.traverse((o) => {
    const name = baseName(o.name || '');
    if (['shoulder left', 'shoulder right', 'hip joint left', 'hip joint right', 'neck', 'body'].includes(name) && !(o as THREE.Mesh).isMesh && !joints[name]) joints[name] = o;
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const kind = m.userData.kind as Kind;
    const names = chain(m).slice(0, 2);
    const part = names.map((n) => PART_OF[n]).find(Boolean);
    if (part && !c.parts[part]) m.visible = false;
    if (m.userData.earInner && !c.parts.ears) m.visible = false;
    if (chestRelic && (names.includes('gear front') || part === 'chestDecor' || (kind?.k === 'plate' && kind.side === 'front'))) m.visible = false;
    if (c.relic === 'back' && kind?.k === 'plate' && kind.side === 'back') m.visible = false;
    switch (kind?.k) {
      // the torso is the Body node's own mesh (an unnamed node: three names it after its mesh, "Body")
      case 'group': m.material = torso && names[0] === 'body' && names[1] === 'body' ? torso : mats[kind.g]; break;
      case 'eyelid': m.material = lids; (eyelids[kind.v] ||= []).push(m); m.visible = !eyesHidden && kind.v === lidNode; break;
      case 'mouth': m.visible = false; break;
      case 'plate': m.material = plateMat[kind.side]; break;
      default: m.material = mats.joints;
    }
    if (eyesHidden && kind?.k === 'group' && (kind.g === 'iris' || kind.g === 'pupil')) m.visible = false;
  });

  // rig frames in model coordinates: the head (gear), the torso (cores), the left hand (held emblem)
  const findNode = (name: string, under?: string) => {
    let hit: THREE.Object3D | null = null;
    model.traverse((o) => {
      if (hit || (o as THREE.Mesh).isMesh || baseName(o.name || '') !== name) return;
      if (under && !chain(o).includes(under)) return;
      hit = o;
    });
    return hit as THREE.Object3D | null;
  };
  const headNode = findNode('head');
  const headFrame = headNode ? modelFrame(headNode, model) : model;
  headFrame.add(gear.head);
  model.add(gear.free);


  /* ---------- the pillar's 3D emblem ---------- */
  let relicSpin: THREE.Object3D | null = null;
  let relicOrbit: THREE.Object3D | null = null;
  let relicSway: THREE.Object3D | null = null;
  if (c.relic !== 'none') {
    const parts = await loadEmblem(c.chest);
    if (parts) {
      const blue = plainMetal('#32527B');
      const yellow = plainMetal('#FDCC0D', { emissive: new THREE.Color('#FDCC0D'), emissiveIntensity: 0.22 });
      const emblem = (width: number) => {
        const g = new THREE.Group();
        parts.blue.forEach((geo) => g.add(new THREE.Mesh(geo, blue)));
        parts.yellow.forEach((geo) => g.add(new THREE.Mesh(geo, yellow)));
        g.scale.setScalar(width);
        return g;
      };
      const A = ANATOMY;
      const bodyNode = joints.body || findNode('body');
      if (c.relic === 'chest' && bodyNode) {
        // set on a dark round plate, so it reads on any body color
        const f = modelFrame(bodyNode, model);
        const plate = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.175, 0.175, 0.022, 40)), gearMats.dark);
        plate.rotation.x = Math.PI / 2;
        plate.position.set(A.chest.center.x, A.chest.center.y, A.chest.front + 0.006);
        const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.175, 0.012, 8, 48)), gearMats.trim);
        ring.position.copy(plate.position).setZ(A.chest.front + 0.016);
        const e = emblem(0.27);
        e.position.set(A.chest.center.x, A.chest.center.y, A.chest.front + 0.035);
        f.add(plate, ring, e);
      } else if (c.relic === 'back' && bodyNode) {
        // a power core set into the back gear, turning slowly
        const holder = new THREE.Group();
        holder.position.set(A.back.gear.x, A.back.gear.y, A.back.gear.z - 0.035);
        holder.rotation.y = Math.PI;
        const e = emblem(0.25);
        holder.add(e);
        relicSpin = e;
        modelFrame(bodyNode, model).add(holder);
      } else if (c.relic === 'hand') {
        // held in the left hook like a badge, slightly turned out; it swings with the arm
        // the hand is a leaf mesh: the arm node carries it, so the frame hangs from the arm
        const arm = findNode('arm', 'shoulder left');
        if (arm) {
          const f = modelFrame(arm, model);
          const e = emblem(0.28);
          e.position.set(A.handL.x + 0.05, A.handL.y + 0.06, A.handL.z + 0.15);
          e.rotation.y = 0.4;
          const grip = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 10)), gearMats.joints);
          grip.position.set(A.handL.x + 0.025, A.handL.y + 0.01, A.handL.z + 0.07);
          grip.rotation.x = Math.PI / 2;
          f.add(grip, e);
        }
      } else if (c.relic === 'orbit') {
        const pivot = new THREE.Group();
        // orbits clear of the head and any cups on the sockets
        pivot.position.set(0, 1.55, -0.04);
        const e = emblem(0.22);
        pivot.add(e);
        relicOrbit = pivot;
        model.add(pivot);
      } else if (c.relic === 'antenna' && gear.antennaTip) {
        const e = emblem(0.22);
        e.position.copy(gear.antennaTip);
        relicSway = e;
        headFrame.add(e);
      }
    }
  }

  // rest pose of every joint, so the animation adds to it in the parent's frame
  const rest = new Map<THREE.Object3D, { q: THREE.Quaternion; p: THREE.Vector3 }>();
  Object.values(joints).forEach((j) => rest.set(j, { q: j.quaternion.clone(), p: j.position.clone() }));
  const e = new THREE.Euler();
  const dq = new THREE.Quaternion();
  const pose = (j: THREE.Object3D | undefined, x: number, y: number, z: number) => {
    if (!j) return;
    const r = rest.get(j)!;
    dq.setFromEuler(e.set(x, y, z, 'XYZ'));
    j.quaternion.copy(dq).multiply(r.q);
  };

  // every piece casts and takes the studio's soft shadows (only where the renderer has them on)
  model.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = m.receiveShadow = true;
    if (opts.envMap) {
      const list = Array.isArray(m.material) ? m.material : [m.material];
      list.forEach((mat) => { if ((mat as THREE.MeshStandardMaterial).isMeshStandardMaterial) (mat as THREE.MeshStandardMaterial).envMap = opts.envMap!; });
    }
  });

  const group = new THREE.Group();
  model.scale.setScalar(SCALE);
  model.position.y = FLOOR;
  group.add(model);
  group.userData = { type: 'HIGHBOT' };

  let waveAt = -1;
  let blinkUntil = -1;
  let nextBlink = 2 + Math.random() * 3;
  let shownLid: string = lidNode;
  const showLid = (id: string) => {
    if (id === shownLid) return;
    (eyelids[shownLid] || []).forEach((m) => { m.visible = false; });
    (eyelids[id] || []).forEach((m) => { m.visible = true; });
    shownLid = id;
  };
  let clock = 0;

  const update = (t: number) => {
    clock = t;
    const body = joints.body;
    if (body) body.position.y = rest.get(body)!.p.y + Math.sin(t * 2.1) * 0.012;
    // arms swing gently in opposition; the right one waves when asked
    const swing = Math.sin(t * 1.5) * 0.1;
    pose(joints['shoulder left'], swing, 0, 0.05 + Math.sin(t * 1.1) * 0.03);
    const w = waveAt < 0 ? -1 : t - waveAt;
    if (w >= 0 && w < 2.2) {
      const up = Math.min(1, w / 0.35) * Math.min(1, (2.2 - w) / 0.4);
      // the head is big: the arm comes forward and out, so the wave reads in front of it
      pose(joints['shoulder right'], -0.75 * up, 0, -0.05 - up * (1.55 + Math.sin(w * 13) * 0.32));
    } else {
      if (w >= 2.2) waveAt = -1;
      pose(joints['shoulder right'], -swing, 0, -0.05 - Math.sin(t * 1.1) * 0.03);
    }
    // weight shift on the hips, look-around from the neck
    pose(joints['hip joint left'], Math.sin(t * 1.5 + Math.PI) * 0.04, 0, 0);
    pose(joints['hip joint right'], Math.sin(t * 1.5) * 0.04, 0, 0);
    pose(joints.neck, Math.sin(t * 0.9) * 0.06, Math.sin(t * 0.6) * 0.32, Math.sin(t * 0.75) * 0.06);
    gear.update(t);
    // the eyes breathe, a little
    (mats.iris as THREE.MeshStandardMaterial).emissiveIntensity = IRIS_GLOW + Math.sin(t * 1.6) * 0.08;
    if (relicSpin) relicSpin.rotation.z = t * 0.6;
    if (relicSway) relicSway.rotation.z = Math.sin(t * 1.3) * 0.12;
    if (relicOrbit) {
      const e = relicOrbit.children[0];
      const a = t * 0.8 + 0.24;
      e.position.set(Math.cos(a) * 0.98, Math.sin(t * 1.7) * 0.05, Math.sin(a) * 0.98);
      e.rotation.y = -a + Math.PI / 2;
    }
    // blinks: the lids drop to "chill" for a moment
    if (!eyesHidden && t > nextBlink && blinkUntil < 0) { blinkUntil = t + 0.13; showLid('chill'); }
    if (blinkUntil > 0 && t > blinkUntil) { blinkUntil = -1; nextBlink = t + 2.8 + Math.random() * 3.2; showLid(lidNode); }
  };

  return {
    group,
    update,
    ready: Promise.resolve(),
    wave: () => { waveAt = clock; },
    dispose: () => {
      group.remove(model);
      disposables.forEach((d) => d.dispose());
    },
  };
}
