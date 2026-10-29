import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { normalizePilot, pilotAssets3D, type PilotConfig } from './pilotAvatar';
import { buildHair3D } from './pilot3dHair';
import { boltGeometry, gearGeometry, loadSgxIcon, type SgxIconGeometry } from './sgxIcon3d';

/* The XR avatar as a real 3D figure, modelled from primitives: every choice
   of the Pilot Builder (head, hair, headset, interface, accessory, outfit,
   emblem, texture, colors) has its own 3D piece. The lens shows the chosen
   interface and glows; the outfit wears the chosen SGX tile. The SGX icon
   pieces use the real brand .glb (sgxIcon3d.ts), with a procedural stand-in
   until it arrives. Units: head radius ~0.6, the bust stands from y = -0.75
   to the top of the head (~2.1). */

export interface Pilot3D {
  group: THREE.Group;
  /** Idle life: head look-around, visor pulse, halo, LED. Call every frame. */
  update: (t: number) => void;
  dispose: () => void;
  /** Resolves once the SGX icon pieces (if any) have swapped in the real .glb. */
  ready: Promise<void>;
}

const HEAD_Y = 1.36;
// how far the face is from the head center, per head shape
const FACE_Z = [0.62, 0.6, 0.58, 0.56, 0.56, 0.62, 0.54, 0.62, 0.6, 0.6, 0.6, 0.62, 0.56];
// head half-width, top and half-depth per head shape (hair and earrings follow it)
const HEAD_DIM: [number, number, number][] = [
  [0.62, 0.62, 0.62], [0.57, 0.7, 0.6], [0.6, 0.6, 0.58], [0.64, 0.6, 0.62], [0.56, 0.76, 0.56], [0.64, 0.64, 0.64], [0.56, 0.6, 0.54],
  [0.62, 0.62, 0.62], [0.62, 0.62, 0.6], [0.61, 0.62, 0.6], [0.57, 0.7, 0.6], [0.63, 0.63, 0.63], [0.56, 0.62, 0.54],
];
// soft and heart heads: lathe profiles (radius, height)
const SOFT_HEAD: [number, number][] = [[0.001, -0.62], [0.3, -0.58], [0.48, -0.42], [0.6, -0.12], [0.62, 0.1], [0.57, 0.36], [0.41, 0.54], [0.2, 0.61], [0.001, 0.62]];
const HEART_HEAD: [number, number][] = [[0.001, -0.66], [0.16, -0.63], [0.37, -0.47], [0.56, -0.16], [0.61, 0.1], [0.57, 0.36], [0.41, 0.54], [0.2, 0.61], [0.001, 0.62]];

function loadTexture(url: string): Promise<THREE.Texture | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((res) => new THREE.TextureLoader().load(url, (t) => { t.colorSpace = THREE.SRGBColorSpace; res(t); }, undefined, () => res(null)));
}
function svgTexture(svg: string): Promise<THREE.Texture | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => { const t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace; t.needsUpdate = true; res(t); };
    img.onerror = () => res(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

/* ---------- outfit texture: one scale on every piece ----------
   The outfit is many primitives (torso, arms, hood, pocket, vest, cape) whose
   UVs span very different sizes, so a UV-mapped tile came out huge on the
   torso and tiny on the arms. Instead the tile is projected from three sides
   in the avatar's own space (triplanar), so it has the same size everywhere,
   matching the 2D avatar (about 4 tiles across the chest). Positions are baked
   per vertex at build time, so the print sticks to the body when it moves. */
const TILE = 0.5;

function triplanar(mat: THREE.MeshStandardMaterial, scale: number) {
  mat.customProgramCacheKey = () => 'sgx-triplanar';  // uTile is a uniform: one program for every scale
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
        // each side reads left-to-right from outside (no mirrored prints)
        vec4 tx = texture2D(map, vec2(-tp.z * (tn.x >= 0.0 ? 1.0 : -1.0), tp.y));
        vec4 ty = texture2D(map, vec2(tp.x, -tp.z * (tn.y >= 0.0 ? 1.0 : -1.0)));
        vec4 tz = texture2D(map, vec2(tp.x * (tn.z >= 0.0 ? 1.0 : -1.0), tp.y));
        diffuseColor *= tx * tw.x + ty * tw.y + tz * tw.z;
      `);
  };
}

/** Bakes avatar-space position and normal into every mesh that wears the outfit. */
function bakeTriplanar(root: THREE.Object3D, mat: THREE.Material) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert();
  const rel = new THREE.Matrix4();
  const nrm = new THREE.Matrix3();
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || m.material !== mat) return;
    rel.multiplyMatrices(toRoot, m.matrixWorld);
    nrm.getNormalMatrix(rel);
    const pos = m.geometry.getAttribute('position');
    const n = m.geometry.getAttribute('normal');
    const tp = new Float32Array(pos.count * 3);
    const tn = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(rel);
      tp.set([v.x, v.y, v.z], i * 3);
      if (n) v.fromBufferAttribute(n, i).applyMatrix3(nrm).normalize(); else v.set(0, 0, 1);
      tn.set([v.x, v.y, v.z], i * 3);
    }
    m.geometry.setAttribute('triPos', new THREE.BufferAttribute(tp, 3));
    m.geometry.setAttribute('triNrm', new THREE.BufferAttribute(tn, 3));
  });
}

export async function buildPilot3D(raw: PilotConfig): Promise<Pilot3D> {
  const c = normalizePilot(raw) as PilotConfig;
  const assets = pilotAssets3D(c);
  const [lensTex, tileTex, emblemTex] = await Promise.all([svgTexture(assets.lensSvg), loadTexture(assets.textureUrl), assets.emblemIcon ? null : loadTexture(assets.emblemUrl)]);

  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  [lensTex, tileTex, emblemTex].forEach((t) => t && keep(t));
  let disposed = false;

  /* SGX icon pieces: a procedural stand-in now, the real .glb when it arrives
     (shared, cached geometry: only the materials here are this avatar's). */
  const iconLoads: Promise<void>[] = [];
  const withIcon = (slot: THREE.Object3D, fallback: THREE.Object3D, build: (g: SgxIconGeometry) => THREE.Object3D) => {
    slot.add(fallback);
    iconLoads.push(loadSgxIcon().then((g) => {
      if (!g || disposed) return;
      slot.remove(fallback);
      slot.add(build(g));
    }));
  };

  /* ---------- materials ---------- */
  const shell = keep(new THREE.MeshPhysicalMaterial({ color: c.shell, roughness: 0.32, metalness: 0.25, clearcoat: 0.8, clearcoatRoughness: 0.22 }));
  const trim = keep(new THREE.MeshStandardMaterial({ color: c.primary, roughness: 0.3, metalness: 0.65, emissive: new THREE.Color(c.primary), emissiveIntensity: 0.12 }));
  const sec = keep(new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.45, metalness: 0.3 }));
  const dark = keep(new THREE.MeshStandardMaterial({ color: '#121417', roughness: 0.35, metalness: 0.6 }));
  const glow = keep(new THREE.MeshBasicMaterial({ color: c.glow, toneMapped: false }));
  const glowSoft = keep(new THREE.MeshBasicMaterial({ color: c.glow, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const lens = keep(new THREE.MeshBasicMaterial({ map: lensTex, color: lensTex ? '#ffffff' : c.glow, toneMapped: false, side: THREE.DoubleSide }));
  if (tileTex) {
    tileTex.wrapS = tileTex.wrapT = THREE.RepeatWrapping;
    tileTex.anisotropy = 4;
  }
  const outfit = keep(new THREE.MeshStandardMaterial({ map: tileTex, color: tileTex ? new THREE.Color().setScalar(Math.min(2.2, assets.textureGain)) : new THREE.Color(c.shell), roughness: 0.75, metalness: 0.08, side: THREE.DoubleSide }));
  if (tileTex) triplanar(outfit, assets.textureScale);
  const metal = keep(new THREE.MeshStandardMaterial({ color: '#8A9099', roughness: 0.28, metalness: 0.92 }));
  const hairMat = keep(new THREE.MeshPhysicalMaterial({ color: c.hairColor, roughness: 0.48, metalness: 0.1, sheen: 0.7, sheenRoughness: 0.35, sheenColor: new THREE.Color(c.hairColor).lerp(new THREE.Color('#ffffff'), 0.5), side: THREE.DoubleSide }));
  // the SGX icon, tinted to the avatar: bolt in the trim color, gear in the details color
  const boltMat = keep(new THREE.MeshStandardMaterial({ color: c.primary, roughness: 0.28, metalness: 0.55, emissive: new THREE.Color(c.primary), emissiveIntensity: 0.3 }));
  const gearMat = keep(new THREE.MeshStandardMaterial({ color: c.secondary, roughness: 0.35, metalness: 0.6, emissive: new THREE.Color(c.secondary), emissiveIntensity: 0.12 }));

  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    keep(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    return m;
  };
  /** The whole SGX icon (`size` across), facing +z: the real one, or gear + bolt shapes. */
  const sgxIcon = (slot: THREE.Object3D, size: number) => {
    const stand = new THREE.Group();
    stand.add(mesh(gearGeometry(size * 0.42, size * 0.33, 8, size * 0.18, size * 0.12), gearMat, size * 0.1, 0, -size * 0.04));
    stand.add(mesh(boltGeometry(size * 0.86, size * 0.1), boltMat, -size * 0.12, 0, size * 0.06));
    withIcon(slot, stand, (g) => {
      const icon = new THREE.Group();
      icon.add(new THREE.Mesh(g.gear, gearMat), new THREE.Mesh(g.bolt, boltMat));
      icon.scale.setScalar(size);
      return icon;
    });
  };
  /** The SGX bolt alone, `h` tall. */
  const sgxBolt = (slot: THREE.Object3D, h: number, mat: THREE.Material = boltMat) => {
    withIcon(slot, mesh(boltGeometry(h, h * 0.16), mat), (g) => {
      const b = new THREE.Mesh(g.boltAlone, mat);
      b.scale.setScalar(h);
      return b;
    });
  };

  const root = new THREE.Group();

  /* ---------- bust ---------- */
  const body = new THREE.Group();
  root.add(body);
  // a chest (tapering to the waist), shoulders and arms: a figure, not a blob
  const profile = [
    // [0.606, -0.735] keeps the hem's side normals horizontal (a clean print near the hem)
    [0.001, -0.75], [0.6, -0.75], [0.606, -0.735], [0.64, -0.55], [0.7, -0.2], [0.76, 0.18], [0.7, 0.42], [0.46, 0.58], [0.22, 0.64], [0.001, 0.65],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const clothMat = [0, 3, 4, 8, 12].includes(c.armor) ? outfit : shell;
  // cropped jacket and long coat: plain bodysuit, printed sleeves
  const sleeveMat = [7, 9].includes(c.armor) ? outfit : clothMat;
  const torso = mesh(new THREE.LatheGeometry(profile, 56), clothMat);
  torso.scale.z = 0.7;
  body.add(torso);
  for (const s of [-1, 1]) {
    if (c.armor === 11) { // android: exposed joints, slim segments and a piston
      body.add(mesh(new THREE.SphereGeometry(0.22, 24, 16), dark, 0.74 * s, 0.36, 0));
      const ring = mesh(new THREE.TorusGeometry(0.17, 0.022, 8, 32), glow, 0.92 * s, 0.38, 0);
      ring.rotation.y = Math.PI / 2;
      body.add(ring);
      const upper = mesh(new THREE.CapsuleGeometry(0.11, 0.3, 6, 16), metal, 0.84 * s, 0.08, 0);
      upper.rotation.z = 0.1 * s;
      body.add(upper);
      body.add(mesh(new THREE.SphereGeometry(0.13, 20, 14), dark, 0.88 * s, -0.17, 0));
      const elbow = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 28), glow, 0.99 * s, -0.17, 0);
      elbow.rotation.y = Math.PI / 2;
      body.add(elbow);
      const fore = mesh(new THREE.CapsuleGeometry(0.15, 0.24, 8, 18), shell, 0.91 * s, -0.42, 0);
      fore.rotation.z = 0.08 * s;
      body.add(fore);
      body.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.44, 8), trim, 0.84 * s, 0.05, 0.14));
    } else {
      body.add(mesh(new THREE.SphereGeometry(0.27, 24, 16), sleeveMat, 0.72 * s, 0.36, 0));
      const arm = mesh(new THREE.CapsuleGeometry(0.19, 0.62, 8, 20), sleeveMat, 0.86 * s, -0.12, 0);
      arm.rotation.z = 0.14 * s;
      body.add(arm);
    }
    body.add(mesh(new THREE.SphereGeometry(0.15, 20, 14), dark, 0.94 * s, -0.62, 0.02));
  }
  body.add(mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.42, 24), dark, 0, 0.82, 0));

  const chestZ = 0.54;
  const torsoRing = (y: number, r: number, mat: THREE.Material, tube = 0.035) => {
    const t = mesh(new THREE.TorusGeometry(r, tube, 10, 64), mat, 0, y, 0);
    t.rotation.x = Math.PI / 2;
    t.scale.y = 0.62;
    return t;
  };
  switch (c.armor) {
    case 0: { // hoodie: hood drape, drawstrings, pocket
      const drape = mesh(new THREE.TorusGeometry(0.42, 0.16, 16, 40), outfit, 0, 0.62, -0.12);
      drape.rotation.x = Math.PI / 2.4;
      body.add(drape);
      for (const x of [-0.12, 0.12]) body.add(mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.42, 8), sec, x, 0.32, chestZ + 0.02));
      const pocket = mesh(new RoundedBoxGeometry(0.7, 0.26, 0.06, 2, 0.03), outfit, 0, -0.45, 0.46);
      body.add(pocket);
      break;
    }
    case 1: { // techwear: collar, diagonal strap, pouch
      body.add(mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.24, 24, 1, true), shell, 0, 0.66, 0));
      const strap = mesh(new THREE.BoxGeometry(0.12, 1.6, 0.05), trim, 0.05, -0.05, chestZ + 0.04);
      strap.rotation.z = 0.75;
      body.add(strap);
      body.add(mesh(new RoundedBoxGeometry(0.26, 0.2, 0.12, 2, 0.03), sec, 0.38, -0.3, chestZ + 0.06));
      break;
    }
    case 2: { // haptic suit: glowing rings and nodes
      body.add(torsoRing(-0.15, 0.71, glow, 0.022), torsoRing(0.2, 0.76, glow, 0.022));
      for (const [x, y] of [[-0.35, 0.1], [0.35, 0.1], [0, -0.25], [-0.42, -0.4], [0.42, -0.4]]) body.add(mesh(new THREE.SphereGeometry(0.05, 12, 8), glow, x, y, chestZ + 0.02 - Math.abs(x) * 0.25));
      break;
    }
    case 3: { // esports jersey: shoulder pads, V collar
      for (const s of [-1, 1]) {
        const pad = mesh(new THREE.SphereGeometry(0.3, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), trim, 0.72 * s, 0.44, 0);
        pad.scale.set(1, 0.45, 0.85);
        body.add(pad);
      }
      const v = mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 24, Math.PI), sec, 0, 0.62, 0.26);
      v.rotation.z = Math.PI;
      v.rotation.x = -0.6;
      body.add(v);
      break;
    }
    case 4: { // bomber: collar, zipper, hem
      body.add(torsoRing(0.6, 0.36, sec, 0.07), torsoRing(-0.7, 0.62, sec, 0.06));
      body.add(mesh(new THREE.BoxGeometry(0.035, 1.25, 0.03), trim, 0, -0.08, chestZ + 0.03));
      break;
    }
    case 5: { // vest over a plain suit
      for (const s of [-1, 1]) {
        const panel = mesh(new RoundedBoxGeometry(0.42, 0.95, 0.1, 2, 0.05), outfit, 0.3 * s, -0.15, chestZ - 0.04);
        panel.rotation.y = -0.35 * s;
        body.add(panel);
        const edge = mesh(new THREE.BoxGeometry(0.04, 0.95, 0.11), trim, 0.1 * s, -0.15, chestZ + 0.03);
        body.add(edge);
      }
      break;
    }
    case 6: { // streamer cape
      const cape = mesh(new THREE.CylinderGeometry(0.7, 1.15, 1.5, 32, 1, true, Math.PI * 0.55, Math.PI * 0.9), outfit, 0, -0.1, -0.12);
      body.add(cape);
      body.add(torsoRing(0.6, 0.4, trim, 0.05));
      break;
    }
    case 7: { // cropped jacket, open at the front, over the bodysuit
      const jacket = mesh(new THREE.LatheGeometry([[0.75, -0.2], [0.8, 0.18], [0.74, 0.43], [0.5, 0.6], [0.3, 0.67]].map(([x, y]) => new THREE.Vector2(x, y)), 48, 0.42, Math.PI * 2 - 0.84), outfit);
      jacket.scale.z = 0.72;
      body.add(jacket);
      for (const s of [-1, 1]) {
        const lapel = mesh(new THREE.BoxGeometry(0.05, 0.62, 0.03), trim, 0.25 * s, 0.17, chestZ - 0.02);
        lapel.rotation.z = -0.3 * s;
        body.add(lapel);
      }
      body.add(torsoRing(-0.2, 0.76, sec, 0.03));
      break;
    }
    case 8: { // high-collar bodysuit with lit seams
      body.add(mesh(new THREE.CylinderGeometry(0.27, 0.32, 0.38, 28, 1, true), outfit, 0, 0.8, 0));
      body.add(torsoRing(0.98, 0.27, trim, 0.025));
      for (const s of [-1, 1]) {
        const seam = new THREE.CatmullRomCurve3([[0.2, 0.55, 0.37], [0.25, 0.1, 0.49], [0.3, -0.4, 0.42], [0.32, -0.7, 0.41]].map(([x, y, z]) => new THREE.Vector3(x * s, y, z)));
        body.add(mesh(new THREE.TubeGeometry(seam, 24, 0.014, 6), glow));
      }
      break;
    }
    case 9: { // long coat: flared, open front, standing collar
      const coat = mesh(new THREE.LatheGeometry([[0.3, 0.68], [0.5, 0.6], [0.75, 0.42], [0.81, 0.18], [0.8, -0.2], [0.92, -0.5], [1.04, -0.75]].map(([x, y]) => new THREE.Vector2(x, y)), 48, 0.3, Math.PI * 2 - 0.6), outfit);
      coat.scale.z = 0.76;
      body.add(coat);
      body.add(mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.3, 28, 1, true), outfit, 0, 0.78, 0));
      for (const s of [-1, 1]) {
        const edge = mesh(new THREE.BoxGeometry(0.04, 1.4, 0.03), trim, 0.18 * s, -0.08, 0.58);
        edge.rotation.z = -0.06 * s;
        edge.rotation.x = -0.12;
        body.add(edge);
      }
      break;
    }
    case 10: { // mech: angular pauldrons, chest plates, lit vents
      for (const s of [-1, 1]) {
        const pad = mesh(new RoundedBoxGeometry(0.58, 0.2, 0.66, 2, 0.05), trim, 0.76 * s, 0.62, 0);
        pad.rotation.z = -0.42 * s;
        body.add(pad);
        const under = mesh(new RoundedBoxGeometry(0.5, 0.14, 0.58, 2, 0.04), dark, 0.84 * s, 0.48, 0);
        under.rotation.z = -0.55 * s;
        body.add(under);
        const plate = mesh(new RoundedBoxGeometry(0.34, 0.3, 0.08, 2, 0.03), outfit, 0.38 * s, 0.3, chestZ - 0.1);
        plate.rotation.y = 0.4 * s;
        body.add(plate);
        body.add(mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), glow, 0.32 * s, -0.32, chestZ - 0.05));
        body.add(mesh(new THREE.BoxGeometry(0.22, 0.03, 0.02), glow, 0.32 * s, -0.42, chestZ - 0.06));
      }
      break;
    }
    case 11: { // android frame: panel lines, collar cables, core
      body.add(torsoRing(-0.05, 0.735, dark, 0.012), torsoRing(0.3, 0.745, dark, 0.012));
      for (const s of [-1, 1]) {
        const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(0.15 * s, 0.68, 0.18), new THREE.Vector3(0.38 * s, 0.6, 0.32), new THREE.Vector3(0.6 * s, 0.5, 0.2)]);
        body.add(mesh(new THREE.TubeGeometry(cable, 16, 0.022, 6), sec));
      }
      body.add(mesh(new THREE.TorusGeometry(0.06, 0.018, 8, 24), glow, 0, 0.42, 0.44));
      break;
    }
    default: { // SGX gear pauldrons
      for (const s of [-1, 1]) {
        const g = mesh(gearGeometry(0.34, 0.27, 9, 0.1, 0.08), trim, 0.74 * s, 0.62, 0);
        g.rotation.set(-Math.PI / 2, 0.38 * s, 0);
        body.add(g);
        const hub = mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 20), glow, 0.74 * s, 0.63, 0);
        hub.rotation.z = -0.38 * s;
        body.add(hub);
      }
      break;
    }
  }

  // suit trims: collar, belt, cuffs (reads as a designed suit, not a blob)
  body.add(torsoRing(0.6, 0.27, trim, 0.045));
  body.add(torsoRing(-0.52, 0.66, trim, 0.03));
  if (c.armor !== 11) {
    for (const s of [-1, 1]) {
      const cuff = mesh(new THREE.TorusGeometry(0.18, 0.035, 10, 28), trim, 0.92 * s, -0.48, 0.01);
      cuff.rotation.x = Math.PI / 2;
      cuff.rotation.y = 0.14 * s;
      body.add(cuff);
    }
  }

  // chest plate + emblem (the SGX icon one is the real 3D icon)
  if (assets.emblemUrl) {
    body.add(mesh(new RoundedBoxGeometry(0.46, 0.46, 0.06, 2, 0.04), trim, 0, 0.08, chestZ + 0.03));
    body.add(mesh(new RoundedBoxGeometry(0.4, 0.4, 0.07, 2, 0.035), dark, 0, 0.08, chestZ + 0.045));
    if (assets.emblemIcon) {
      const slot = new THREE.Group();
      slot.position.set(0, 0.08, chestZ + 0.12);
      body.add(slot);
      sgxIcon(slot, 0.34);
    } else if (emblemTex) body.add(mesh(new THREE.PlaneGeometry(0.32, 0.32), keep(new THREE.MeshBasicMaterial({ map: emblemTex, transparent: true, toneMapped: false })), 0, 0.08, chestZ + 0.085));
  }

  /* ---------- head ---------- */
  const head = new THREE.Group();
  head.position.y = HEAD_Y;
  root.add(head);
  const fz = FACE_Z[c.helmet] ?? 0.6;
  switch (c.helmet) {
    case 0: head.add(mesh(new THREE.SphereGeometry(0.62, 48, 32), shell)); break;
    case 1: { const h = mesh(new THREE.SphereGeometry(0.6, 48, 32), shell); h.scale.set(0.95, 1.16, 1); head.add(h); break; }
    case 2: head.add(mesh(new RoundedBoxGeometry(1.16, 1.16, 1.12, 5, 0.24), shell)); break;
    case 3: {
      const hx = mesh(new THREE.CylinderGeometry(0.64, 0.64, 1.16, 6), keep(shell.clone()));
      (hx.material as THREE.MeshPhysicalMaterial).flatShading = true;
      hx.rotation.y = Math.PI / 6;
      head.add(hx);
      head.add(mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.05, 6), trim, 0, 0.6, 0).rotateY(Math.PI / 6));
      break;
    }
    case 4: head.add(mesh(new THREE.CapsuleGeometry(0.55, 0.42, 10, 32), shell)); break;
    case 5: {
      const ico = mesh(new THREE.IcosahedronGeometry(0.66, 1), keep(shell.clone()));
      (ico.material as THREE.MeshPhysicalMaterial).flatShading = true;
      head.add(ico);
      break;
    }
    case 6: { // mecha: helmet + jaw + ear vents + crest fin
      head.add(mesh(new RoundedBoxGeometry(1.08, 0.98, 1.04, 4, 0.14), shell, 0, 0.06, 0));
      head.add(mesh(new RoundedBoxGeometry(0.78, 0.34, 0.72, 3, 0.08), dark, 0, -0.5, 0.12));
      for (const s of [-1, 1]) {
        const vent = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 6), trim, 0.58 * s, -0.02, 0);
        vent.rotation.z = Math.PI / 2;
        head.add(vent);
      }
      head.add(mesh(new RoundedBoxGeometry(0.08, 0.3, 0.7, 2, 0.03), trim, 0, 0.62, -0.05));
      break;
    }
    case 7: { // hologram: glass shell + wireframe + core
      head.add(mesh(new THREE.SphereGeometry(0.62, 40, 28), keep(new THREE.MeshStandardMaterial({ color: c.glow, emissive: new THREE.Color(c.glow), emissiveIntensity: 0.5, transparent: true, opacity: 0.22, depthWrite: false }))));
      head.add(mesh(new THREE.SphereGeometry(0.625, 16, 12), keep(new THREE.MeshBasicMaterial({ color: c.glow, wireframe: true, transparent: true, opacity: 0.45, toneMapped: false }))));
      head.add(mesh(new THREE.IcosahedronGeometry(0.16, 0), glow, 0, 0.05, 0));
      break;
    }
    case 8: case 9: { // soft and heart faces
      const h = mesh(new THREE.LatheGeometry((c.helmet === 8 ? SOFT_HEAD : HEART_HEAD).map(([x, y]) => new THREE.Vector2(x, y)), 48), shell);
      h.scale.z = 0.97;
      head.add(h);
      break;
    }
    case 10: { // android: oval shell, lighter faceplate, chin vents, ear discs
      const h = mesh(new THREE.SphereGeometry(0.6, 48, 32), shell);
      h.scale.set(0.95, 1.16, 1);
      head.add(h);
      const plateMat = keep(new THREE.MeshPhysicalMaterial({ color: new THREE.Color(c.shell).lerp(new THREE.Color('#ffffff'), 0.35), roughness: 0.25, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.15 }));
      const plate = mesh(new THREE.SphereGeometry(0.607, 40, 20, Math.PI / 2 - 1.0, 2.0, 1.45, 1.25), plateMat);
      plate.scale.set(0.95, 1.16, 1);
      head.add(plate);
      for (const y of [-0.5, -0.56]) head.add(mesh(new THREE.BoxGeometry(0.16, 0.018, 0.03), dark, 0, y, 0.47));
      for (const s of [-1, 1]) {
        const disc = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 28), dark, 0.58 * s, -0.05, 0);
        disc.rotation.z = Math.PI / 2;
        const ring = mesh(new THREE.TorusGeometry(0.1, 0.016, 8, 28), glow, 0.62 * s, -0.05, 0);
        ring.rotation.y = Math.PI / 2;
        head.add(disc, ring);
      }
      break;
    }
    case 11: { // cyborg: one half metal plate with a lit seam and bolts
      head.add(mesh(new THREE.SphereGeometry(0.62, 48, 32), shell));
      head.add(mesh(new THREE.SphereGeometry(0.632, 40, 28, Math.PI / 2, Math.PI, 0.25, Math.PI - 0.5), metal));
      const seam = mesh(new THREE.TorusGeometry(0.634, 0.012, 6, 64), glow);
      seam.rotation.y = Math.PI / 2;
      head.add(seam);
      for (const [y, a] of [[0.38, 0.4], [0.2, -0.9], [-0.3, -0.6], [-0.42, 0.5]]) {
        const r = Math.sqrt(0.64 * 0.64 - y * y);
        head.add(mesh(new THREE.SphereGeometry(0.025, 10, 8), dark, Math.cos(a) * r * 0.9, y, Math.sin(a) * r * 0.9 + 0.04));
      }
      break;
    }
    default: { // finned mech helmet: rounded block, crest ridge, side fins, chin guard
      head.add(mesh(new RoundedBoxGeometry(1.1, 1.02, 1.06, 4, 0.18), shell, 0, 0.04, 0));
      head.add(mesh(new RoundedBoxGeometry(0.1, 0.34, 0.86, 2, 0.04), trim, 0, 0.58, -0.04));
      head.add(mesh(new RoundedBoxGeometry(0.62, 0.22, 0.3, 2, 0.06), dark, 0, -0.5, 0.36));
      for (const s of [-1, 1]) {
        const fin = mesh(new RoundedBoxGeometry(0.06, 0.62, 0.32, 2, 0.025), trim, 0.66 * s, 0.42, -0.08);
        fin.rotation.z = -0.55 * s;
        fin.rotation.x = -0.25;
        head.add(fin);
        const edge = mesh(new THREE.BoxGeometry(0.02, 0.5, 0.025), glow, 0.69 * s, 0.42, 0.08);
        edge.rotation.copy(fin.rotation);
        head.add(edge);
      }
      break;
    }
  }

  // XR ear pods with a lit ring (heads without headphones or their own ears)
  const SIDE_X = [0.62, 0.57, 0.58, 0.62, 0.55, 0.64, 0, 0, 0.62, 0.6, 0, 0.62, 0];
  if (SIDE_X[c.helmet] && ![1, 2, 3, 10, 11, 16].includes(c.crest)) {
    for (const s of [-1, 1]) {
      const pod = mesh(new THREE.CylinderGeometry(0.15, 0.17, 0.12, 28), dark, (SIDE_X[c.helmet] + 0.01) * s, 0, -0.02);
      pod.rotation.z = Math.PI / 2;
      head.add(pod);
      const ringPod = mesh(new THREE.TorusGeometry(0.12, 0.022, 8, 28), glow, (SIDE_X[c.helmet] + 0.075) * s, 0, -0.02);
      ringPod.rotation.y = Math.PI / 2;
      head.add(ringPod);
    }
  }

  /* ---------- headset ---------- */
  const set = new THREE.Group();
  set.position.set(0, 0.02, fz);
  head.add(set);
  const lensPlane = (w: number, h: number, z: number, x = 0) => {
    const g = mesh(new THREE.PlaneGeometry(w, h), lens, x, 0, z);
    const halo = mesh(new THREE.PlaneGeometry(w * 1.25, h * 1.5), glowSoft, x, 0, z - 0.004);
    return [halo, g];
  };
  const strap = () => {
    const s = mesh(new THREE.TorusGeometry(fz * 1.02, 0.05, 8, 48), dark, 0, 0.02, -fz);
    s.rotation.x = Math.PI / 2;
    head.add(s);
  };
  switch (c.visor) {
    case 0:
      set.add(mesh(new RoundedBoxGeometry(1.32, 0.6, 0.38, 4, 0.13), trim, 0, 0, 0.05));
      set.add(mesh(new RoundedBoxGeometry(1.26, 0.56, 0.42, 4, 0.12), dark, 0, 0, 0.1));
      set.add(...lensPlane(1.08, 0.38, 0.315));
      strap();
      break;
    case 1:
      set.add(mesh(new RoundedBoxGeometry(1.2, 0.4, 0.28, 4, 0.1), trim, 0, 0, 0.04));
      set.add(mesh(new RoundedBoxGeometry(1.14, 0.36, 0.3, 4, 0.09), dark, 0, 0, 0.08));
      set.add(...lensPlane(1.0, 0.24, 0.235));
      strap();
      break;
    case 2: // AR glasses
      for (const s of [-1, 1]) {
        set.add(mesh(new RoundedBoxGeometry(0.46, 0.3, 0.06, 3, 0.05), trim, 0.27 * s, 0, 0.06));
        set.add(...lensPlane(0.38, 0.22, 0.095, 0.27 * s));
        const temple = mesh(new THREE.BoxGeometry(0.04, 0.04, fz + 0.1), trim, 0.5 * s, 0.05, -fz / 2 + 0.06);
        set.add(temple);
      }
      set.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), trim, 0, 0.06, 0.07));
      break;
    case 3: // MR visor with cameras
      set.add(mesh(new RoundedBoxGeometry(1.38, 0.68, 0.42, 4, 0.14), trim, 0, 0, 0.05));
      set.add(mesh(new RoundedBoxGeometry(1.32, 0.64, 0.46, 4, 0.13), dark, 0, 0, 0.1));
      set.add(...lensPlane(1.12, 0.44, 0.335));
      for (const s of [-1, 1]) {
        const cam = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.06, 16), dark, 0.42 * s, -0.25, 0.34);
        cam.rotation.x = Math.PI / 2;
        set.add(cam, mesh(new THREE.CircleGeometry(0.035, 16), glow, 0.42 * s, -0.25, 0.372));
      }
      strap();
      break;
    case 4: { // curved gaming visor
      const r = fz + 0.12;
      const arc = mesh(new THREE.CylinderGeometry(r, r, 0.4, 40, 1, true, -1.15, 2.3), lens, 0, 0, -fz);
      set.add(arc);
      for (const y of [-0.22, 0.22]) set.add(mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.05, 40, 1, true, -1.2, 2.4), trim, 0, y, -fz));
      break;
    }
    case 5: // goggles
      for (const s of [-1, 1]) {
        const tube = mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.2, 24), dark, 0.25 * s, 0, 0.06);
        tube.rotation.x = Math.PI / 2;
        set.add(tube);
        set.add(mesh(new THREE.TorusGeometry(0.2, 0.035, 10, 32), trim, 0.25 * s, 0, 0.17));
        const l = mesh(new THREE.CircleGeometry(0.17, 32), lens, 0.25 * s, 0, 0.165);
        set.add(l);
      }
      strap();
      break;
    case 6: { // holo monocle
      const tube = mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.16, 24), dark, 0.25, 0, 0.05);
      tube.rotation.x = Math.PI / 2;
      set.add(tube, mesh(new THREE.TorusGeometry(0.19, 0.03, 10, 32), trim, 0.25, 0, 0.13), mesh(new THREE.CircleGeometry(0.165, 32), lens, 0.25, 0, 0.135));
      const arm = mesh(new THREE.BoxGeometry(0.5, 0.04, 0.04), trim, 0.55, 0.02, -0.12);
      arm.rotation.y = 0.6;
      set.add(arm);
      break;
    }
    case 7: { // LED band around the front half of the head
      for (const [mat, tube] of [[glow, 0.045], [keep(new THREE.MeshBasicMaterial({ color: c.glow, transparent: true, opacity: 0.25, toneMapped: false, depthWrite: false })), 0.075]] as const) {
        const band = mesh(new THREE.TorusGeometry(fz + 0.03, tube, 10, 64, Math.PI), mat, 0, 0, -fz);
        band.rotation.x = Math.PI / 2;
        set.add(band);
      }
      break;
    }
    case 8: { // face shield: glass dome
      const dome = mesh(new THREE.SphereGeometry(fz + 0.1, 40, 24, Math.PI / 2 - 1.0, 2.0, 1.05, 0.95), keep(new THREE.MeshPhysicalMaterial({ map: lensTex, color: '#ffffff', transparent: true, opacity: 0.88, roughness: 0.1, metalness: 0, clearcoat: 1, emissive: new THREE.Color(c.glow), emissiveMap: lensTex, emissiveIntensity: 0.9, side: THREE.DoubleSide })), 0, 0, -fz);
      set.add(dome);
      break;
    }
    case 9: { // cat-eye AR frames: upswept outer corners
      const frame = new THREE.Shape([[-0.24, 0.17], [0.2, 0.08], [0.21, -0.06], [0.16, -0.13], [-0.15, -0.13], [-0.2, -0.06]].map(([x, y]) => new THREE.Vector2(x, y)));
      for (const s of [-1, 1]) {
        const f = mesh(new THREE.ExtrudeGeometry(frame, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 }), trim, 0.26 * s, 0, 0.04);
        f.scale.x = -s; // outer corner up on each side
        set.add(f);
        set.add(...lensPlane(0.32, 0.17, 0.105, 0.27 * s));
        set.add(mesh(new THREE.BoxGeometry(0.04, 0.04, fz + 0.1), trim, 0.5 * s, 0.08, -fz / 2 + 0.06));
      }
      set.add(mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), trim, 0, 0.04, 0.07));
      break;
    }
    case 10: { // android faceplate: dark mask over the lower face, lit eye slit
      const plate = mesh(new THREE.SphereGeometry(fz + 0.05, 40, 24, Math.PI / 2 - 1.05, 2.1, 1.25, 1.2), keep(new THREE.MeshPhysicalMaterial({ color: '#121417', roughness: 0.2, metalness: 0.5, clearcoat: 1, clearcoatRoughness: 0.1, side: THREE.DoubleSide })), 0, 0, -fz);
      set.add(plate);
      const r = fz + 0.07;
      set.add(mesh(new THREE.CylinderGeometry(r, r, 0.11, 40, 1, true, -0.95, 1.9), lens, 0, 0.06, -fz));
      for (const y of [0.13, -0.01]) set.add(mesh(new THREE.CylinderGeometry(r + 0.005, r + 0.005, 0.022, 40, 1, true, -1.0, 2.0), trim, 0, y, -fz));
      for (const y of [-0.3, -0.36]) set.add(mesh(new THREE.BoxGeometry(0.18, 0.016, 0.02), trim, 0, y, 0.06));
      break;
    }
    case 11: { // mech T-visor
      set.add(mesh(new RoundedBoxGeometry(1.3, 0.62, 0.36, 3, 0.08), trim, 0, -0.06, 0.04));
      set.add(mesh(new RoundedBoxGeometry(1.24, 0.58, 0.4, 3, 0.07), dark, 0, -0.06, 0.08));
      set.add(...lensPlane(0.96, 0.12, 0.285, 0).map((m) => { m.position.y = 0.06; return m; }));
      set.add(...lensPlane(0.13, 0.3, 0.286, 0).map((m) => { m.position.y = -0.14; return m; }));
      strap();
      break;
    }
    default: { // cyborg half-mask: plate and big lens on one side, an LED eye on the other
      set.add(mesh(new RoundedBoxGeometry(0.58, 0.62, 0.14, 3, 0.05), dark, -0.24, -0.04, 0.0));
      set.add(mesh(new RoundedBoxGeometry(0.6, 0.06, 0.16, 2, 0.02), trim, -0.24, 0.27, 0.0));
      const tube = mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 28), dark, -0.25, 0.02, 0.1);
      tube.rotation.x = Math.PI / 2;
      set.add(tube, mesh(new THREE.TorusGeometry(0.2, 0.03, 10, 32), trim, -0.25, 0.02, 0.18), mesh(new THREE.CircleGeometry(0.175, 32), lens, -0.25, 0.02, 0.185));
      set.add(mesh(new THREE.CapsuleGeometry(0.035, 0.12, 4, 12), glow, 0.26, 0.02, -0.02).rotateZ(Math.PI / 2));
      break;
    }
  }

  /* ---------- accessory ---------- */
  const cr = c.crest;
  const headphones = (withMic: boolean) => {
    const band = mesh(new THREE.TorusGeometry(fz + 0.12, 0.05, 10, 40, Math.PI), sec, 0, 0.02, 0);
    head.add(band);
    for (const s of [-1, 1]) {
      const cup = mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 28), trim, (fz + 0.08) * s, 0, 0);
      cup.rotation.z = Math.PI / 2;
      head.add(cup);
      const pad = mesh(new THREE.TorusGeometry(0.17, 0.05, 10, 24), dark, (fz + 0.17) * s, 0, 0);
      pad.rotation.y = Math.PI / 2;
      head.add(pad);
    }
    if (withMic) {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-(fz + 0.12), -0.05, 0.05), new THREE.Vector3(-(fz + 0.05), -0.35, 0.35), new THREE.Vector3(-0.2, -0.5, fz + 0.05)]);
      head.add(mesh(new THREE.TubeGeometry(curve, 24, 0.025, 8), sec));
      head.add(mesh(new THREE.SphereGeometry(0.06, 16, 12), glow, -0.2, -0.5, fz + 0.05));
    }
  };
  const [hw, ht, hd] = HEAD_DIM[c.helmet] ?? HEAD_DIM[0];
  let led: THREE.Object3D | null = null;
  let halo: THREE.Mesh | null = null;
  let floater: THREE.Group | null = null;
  switch (cr) {
    case 1: headphones(false); break;
    case 2: headphones(true); break;
    case 3: {
      headphones(false);
      for (const s of [-1, 1]) {
        const ear = mesh(new THREE.ConeGeometry(0.2, 0.4, 4), trim, 0.36 * s, 0.62, 0);
        ear.rotation.z = -0.35 * s;
        ear.rotation.y = Math.PI / 4;
        head.add(ear);
        const inner = mesh(new THREE.ConeGeometry(0.1, 0.24, 4), glow, 0.37 * s, 0.6, 0.08);
        inner.rotation.copy(ear.rotation);
        head.add(inner);
      }
      break;
    }
    case 4: {
      const rod = mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 8), sec, 0.32, 0.78, 0);
      rod.rotation.z = -0.35;
      head.add(rod);
      led = mesh(new THREE.SphereGeometry(0.07, 16, 12), glow, 0.42, 1.04, 0);
      head.add(led);
      break;
    }
    case 5: {
      halo = mesh(new THREE.TorusGeometry(0.42, 0.035, 12, 48), glow, 0, 0.92, 0);
      halo.rotation.x = Math.PI / 2;
      head.add(halo);
      break;
    }
    case 6: { // beanie
      head.add(mesh(new THREE.SphereGeometry(fz + 0.06, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2.1), sec, 0, 0.08, 0));
      const cuff = mesh(new THREE.TorusGeometry(fz + 0.06, 0.07, 12, 48), trim, 0, 0.12, 0);
      cuff.rotation.x = Math.PI / 2;
      head.add(cuff, mesh(new THREE.SphereGeometry(0.13, 20, 14), trim, 0, fz + 0.18, 0));
      break;
    }
    case 7: { // hood (open at the face)
      const hood = mesh(new THREE.SphereGeometry(fz + 0.2, 40, 24, Math.PI * 0.72, Math.PI * 1.56, 0, Math.PI * 0.72), outfit, 0, 0.04, -0.06);
      head.add(hood);
      break;
    }
    case 8: { // mohawk
      for (let i = 0; i < 6; i++) {
        const a = -0.9 + i * 0.36;
        const spike = mesh(new THREE.ConeGeometry(0.09, 0.32 + (i % 2) * 0.1, 6), sec, 0, Math.cos(a) * (fz + 0.06), Math.sin(a) * (fz + 0.06));
        spike.rotation.x = a;
        head.add(spike);
      }
      break;
    }
    case 9: { // spiky hair
      const spikes = 16;
      for (let i = 0; i < spikes; i++) {
        const phi = 0.25 + (i % 4) * 0.28;
        const th = (i / spikes) * Math.PI * 2;
        const dir = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th));
        if (dir.z > 0.55) continue; // keep the face clear
        const spike = mesh(new THREE.ConeGeometry(0.1, 0.36, 6), sec);
        spike.position.copy(dir.clone().multiplyScalar(fz + 0.02));
        spike.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        head.add(spike);
      }
      break;
    }
    case 10: // hoop earrings
      for (const s of [-1, 1]) {
        const hoop = mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 28), trim, (hw + 0.02) * s, -0.3, 0.04);
        hoop.rotation.y = Math.PI / 2;
        head.add(hoop, mesh(new THREE.SphereGeometry(0.026, 10, 8), glow, (hw + 0.02) * s, -0.385, 0.04));
      }
      break;
    case 11: { // LED ear cuffs on one ear, a lit stud on the other
      const cuff = mesh(new THREE.TorusGeometry(0.13, 0.022, 8, 24, Math.PI * 1.1), sec, -(hw + 0.015), -0.06, 0);
      cuff.rotation.y = Math.PI / 2;
      cuff.rotation.z = Math.PI * 0.45;
      head.add(cuff);
      for (const y of [0.04, -0.06, -0.16]) head.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), glow, -(hw + 0.05), y, 0.06));
      head.add(mesh(new THREE.SphereGeometry(0.035, 12, 10), glow, hw + 0.02, -0.18, 0.04));
      break;
    }
    case 12: { // tech headband with LEDs
      const band = new THREE.Group();
      band.add(mesh(new THREE.TorusGeometry(Math.max(hw, ht) + 0.05, 0.035, 10, 48, Math.PI), sec));
      for (let k = 0; k < 5; k++) {
        const a = 0.45 + k * 0.56;
        band.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), glow, Math.cos(a) * (Math.max(hw, ht) + 0.08), Math.sin(a) * (Math.max(hw, ht) + 0.08), 0.02));
      }
      band.rotation.x = 0.5;
      head.add(band);
      break;
    }
    case 13: { // LED hair clips (top right)
      const dir = new THREE.Vector3(0.62, 0.66, 0.25).normalize();
      const clips = new THREE.Group();
      clips.position.copy(dir.clone().multiplyScalar(Math.max(hw, ht) + 0.06));
      clips.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      [[trim, 0.07], [glow, 0], [sec, -0.07]].forEach(([mat, y], k) => {
        const clip = mesh(new RoundedBoxGeometry(0.22 - k * 0.03, 0.04, 0.035, 2, 0.015), mat as THREE.Material, 0, y as number, 0);
        clip.rotation.z = 0.5;
        clips.add(clip);
      });
      head.add(clips);
      break;
    }
    case 14: { // SGX gear halo behind the head
      halo = mesh(gearGeometry(1.0, 0.92, 16, 0.85, 0.06), trim, 0, 0.08, -0.55);
      head.add(halo, mesh(new THREE.TorusGeometry(0.83, 0.012, 6, 64), glow, 0, 0.08, -0.55));
      break;
    }
    case 15: { // SGX bolt antenna
      const slot = new THREE.Group();
      slot.position.set(0.28, ht + 0.24, -0.04);
      slot.rotation.z = -0.28;
      head.add(slot, mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.08, 16), dark, 0.22, ht - 0.03, -0.04));
      sgxBolt(slot, 0.5);
      break;
    }
    case 16: { // earpiece with an SGX bolt fin
      const pod = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.14, 28), trim, -(hw + 0.06), -0.02, 0);
      pod.rotation.z = Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(0.11, 0.02, 8, 28), glow, -(hw + 0.135), -0.02, 0);
      ring.rotation.y = Math.PI / 2;
      head.add(pod, ring);
      const slot = new THREE.Group();
      slot.position.set(-(hw + 0.1), 0.3, -0.04);
      slot.rotation.set(0, Math.PI / 2, 0.2);
      head.add(slot);
      sgxBolt(slot, 0.36, sec);
      break;
    }
    case 17: { // mech antenna fins on top
      for (const s of [-1, 1]) {
        const fin = mesh(new RoundedBoxGeometry(0.05, 0.5, 0.2, 2, 0.02), trim, 0.26 * s, ht + 0.12, -0.12);
        fin.rotation.set(-0.5, 0, -0.32 * s);
        const edge = mesh(new THREE.BoxGeometry(0.02, 0.42, 0.02), glow, 0.27 * s, ht + 0.14, -0.02);
        edge.rotation.copy(fin.rotation);
        head.add(fin, edge);
      }
      break;
    }
    case 18: { // the SGX icon floating by the shoulder, like a companion
      floater = new THREE.Group();
      floater.position.set(0.98, 2.12, -0.12);
      root.add(floater);
      const spin = new THREE.Group();
      floater.add(spin);
      sgxIcon(spin, 0.5);
      const pad = mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 40), glow, 0, -0.34, 0);
      pad.rotation.x = Math.PI / 2;
      floater.add(pad, mesh(new THREE.CircleGeometry(0.2, 32), glowSoft, 0, -0.345, 0).rotateX(-Math.PI / 2));
      break;
    }
    default: break;
  }

  /* ---------- hair (scaled to the head) ---------- */
  const hairGroup = buildHair3D(c.hair, { hair: hairMat, trim, sec, glow }, keep);
  if (hairGroup) {
    hairGroup.scale.set(hw / 0.62, ht / 0.62, hd / 0.62);
    head.add(hairGroup);
  }

  if (tileTex) bakeTriplanar(root, outfit);

  /* ---------- life ---------- */
  const update = (t: number) => {
    head.rotation.y = Math.sin(t * 0.55) * 0.22;
    head.rotation.x = Math.sin(t * 0.37) * 0.05;
    root.position.y = Math.sin(t * 1.4) * 0.025;
    const pulse = 0.82 + Math.sin(t * 2.4) * 0.18;
    lens.color.setScalar(lensTex ? pulse : 1);
    glowSoft.opacity = 0.22 + Math.sin(t * 2.4) * 0.12;
    if (halo) halo.rotation.z = t * (c.crest === 14 ? 0.35 : 0.8);
    if (led) led.scale.setScalar(Math.sin(t * 6) > 0 ? 1 : 0.55);
    if (floater) {
      floater.position.y = 2.12 + Math.sin(t * 1.6) * 0.05;
      floater.children[0].rotation.y = t * 0.9;
    }
    if (lensTex && c.eyes === 1) { lensTex.wrapT = THREE.RepeatWrapping; lensTex.offset.y = (t * 0.25) % 1; }
  };

  return {
    group: root,
    update,
    dispose: () => { disposed = true; disposables.forEach((d) => d.dispose()); },
    ready: Promise.all(iconLoads).then(() => undefined),
  };
}
