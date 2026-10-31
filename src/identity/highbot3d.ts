import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { EYELIDS, MOUTHS, PILOT_TEXTURES, normalizePilot, plateSrc, type ColorGroup, type Eyelid, type PilotConfig } from './pilotAvatar';

/* HIGHBOT 3D: the Nomad model (public/characters/highbot/highbot.glb, meshopt
   compressed, names and hierarchy intact) dressed from a PilotConfig.
   Every part is its own node, so recoloring is per part group, the eyelid and
   mouth variants are shown one at a time, and the two "Plane for logo or
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

/* ---------- triplanar SGX tile on the shell (same idea as the old avatar) ---------- */
const TILE = 0.42;
function triplanar(mat: THREE.MeshStandardMaterial, scale: number) {
  mat.customProgramCacheKey = () => 'sgx-hb-triplanar';
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTile = { value: TILE * scale };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec3 triPos;\nattribute vec3 triNrm;\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvTriPos = triPos;\nvTriNrm = triNrm;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uTile;\nvarying vec3 vTriPos;\nvarying vec3 vTriNrm;')
      .replace('#include <map_fragment>', `
        vec3 tn = normalize(vTriNrm);
        vec3 tw = pow(abs(tn), vec3(5.0));
        tw /= (tw.x + tw.y + tw.z + 1e-5);
        vec3 tp = vTriPos / uTile;
        vec4 tx = texture2D(map, vec2(-tp.z * (tn.x >= 0.0 ? 1.0 : -1.0), tp.y));
        vec4 ty = texture2D(map, vec2(tp.x, -tp.z * (tn.y >= 0.0 ? 1.0 : -1.0)));
        vec4 tz = texture2D(map, vec2(tp.x * (tn.z >= 0.0 ? 1.0 : -1.0), tp.y));
        diffuseColor *= tx * tw.x + ty * tw.y + tz * tw.z;
      `);
  };
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
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        // Nomad exports no normals: smooth ones, so the shell reads as the sculpt
        if (!m.geometry.getAttribute('normal')) m.geometry.computeVertexNormals();
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
      });
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

function loadTile(file: string): Promise<THREE.Texture | null> {
  if (!file) return Promise.resolve(null);
  return new Promise((res) => new THREE.TextureLoader().load(`/pilot/tex/${file}.png`, (t) => {
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    res(t);
  }, undefined, () => res(null)));
}

const FINISH: Record<PilotConfig['finish'], { roughness: number; metalness: number }> = {
  gloss: { roughness: 0.26, metalness: 0.12 },
  matte: { roughness: 0.8, metalness: 0.02 },
  metal: { roughness: 0.3, metalness: 0.85 },
};

export async function buildHighbot3D(raw: PilotConfig): Promise<Pilot3D> {
  const c = normalizePilot(raw) as PilotConfig;
  const base = await loadBase();
  const model = base.clone(true);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const fin = FINISH[c.finish];
  const std = (color: string, extra: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
    keep(new THREE.MeshStandardMaterial({ color, roughness: fin.roughness, metalness: fin.metalness, ...extra }));

  const tex = PILOT_TEXTURES[c.pattern];
  const tile = await loadTile(tex?.file || '');
  if (tile) keep(tile);
  const shell = tile
    ? std('#ffffff', { map: tile, color: new THREE.Color().setScalar(Math.min(2.2, tex.gain ?? 1)) })
    : std(c.colors.shell);
  if (tile) triplanar(shell, tex.scale ?? 1);
  // eyelids are the shell's skin, but always plain so the face reads
  const lids = std(c.colors.shell);
  const mats: Record<ColorGroup | 'pupil', THREE.Material> = {
    shell,
    trim: std(c.colors.trim),
    joints: std(c.colors.joints),
    mask: std(c.colors.mask, { roughness: Math.max(0.35, fin.roughness) }),
    iris: std(c.colors.iris, { emissive: new THREE.Color(c.colors.iris), emissiveIntensity: 0.35, roughness: 0.2, metalness: 0.05 }),
    shoes: std(c.colors.shoes),
    pupil: keep(new THREE.MeshBasicMaterial({ color: '#050505' })),
  };
  const mouthMat = keep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0 }));
  const [front, back] = await Promise.all([plateTexture(plateSrc(c.chest)), plateTexture(plateSrc(c.back))]);
  keep(front); keep(back);
  const plateMat = { front: keep(new THREE.MeshBasicMaterial({ map: front, toneMapped: false })), back: keep(new THREE.MeshBasicMaterial({ map: back, toneMapped: false })) };

  const eyelids: Record<string, THREE.Object3D[]> = {};
  const lidNode = EYELIDS.find((e) => e.id === c.eyelid)!.id;
  const mouthNode = MOUTHS.find((m) => m.id === c.mouth)!.id;
  const joints: Record<string, THREE.Object3D> = {};

  model.traverse((o) => {
    const name = baseName(o.name || '');
    if (['shoulder left', 'shoulder right', 'hip joint left', 'hip joint right', 'neck', 'body'].includes(name) && !(o as THREE.Mesh).isMesh && !joints[name]) joints[name] = o;
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const kind = m.userData.kind as Kind;
    switch (kind?.k) {
      case 'group': m.material = mats[kind.g]; break;
      case 'eyelid': m.material = lids; (eyelids[kind.v] ||= []).push(m); m.visible = kind.v === lidNode; break;
      case 'mouth': m.material = mouthMat; m.visible = kind.v === mouthNode; break;
      case 'plate': m.material = plateMat[kind.side]; break;
      default: m.material = mats.joints;
    }
  });

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
    // blinks: the lids drop to "chill" for a moment
    if (t > nextBlink && blinkUntil < 0) { blinkUntil = t + 0.13; showLid('chill'); }
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
