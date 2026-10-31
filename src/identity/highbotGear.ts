import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { boltGeometry, gearGeometry, loadSgxIcon } from './sgxIcon3d';

/* HIGHBOT GEAR: headgear and visors fitted to the Highbot's real anatomy
   (measured from highbot.glb, model units: Y up, feet at 0, facing +Z).
   Everything is built in model coordinates and hung from a socket that
   follows its rig node (head gear from the Head node), so it moves with the
   animation and lands on the part it belongs to:
   - headphones, earpieces and visor arms clip onto the two SIDE SOCKETS
     (the round "Head decor" discs), not the middle of the head;
   - antennas grow from the TOP BUTTON (top left of the head);
   - visors sit in front of the EYES, which bulge out to z 0.537;
   - halos and fins stay between the ears; the gear halo clears them. */

export const ANATOMY = {
  head: { center: new THREE.Vector3(0, 1.303, -0.04), x: 0.518, yMin: 0.883, yMax: 1.724, zBack: -0.47, zFront: 0.391 },
  /** the round side sockets: center and radius; their outer face is at |x| 0.58 */
  socket: { x: 0.565, y: 1.383, z: -0.137, r: 0.185, outer: 0.58 },
  /** the small button on top of the head (left side of the character's head, -x) */
  topButton: new THREE.Vector3(-0.276, 1.745, -0.04),
  /** eye centers (x ±0.21), radius, and how far the eyeballs bulge */
  eyes: { x: 0.21, y: 1.33, r: 0.19, front: 0.537 },
  /** the mask's forehead edge (front) */
  forehead: { y: 1.605, z: 0.465 },
  mouth: new THREE.Vector3(0, 1.115, 0.4),
  /** ears: back-top corners of the head */
  ears: { zFront: -0.178, zBack: -0.583, yTop: 1.782 },
  chest: { gear: new THREE.Vector3(-0.14, 0.71, 0.205), front: 0.208, center: new THREE.Vector3(0, 0.66, 0.208) },
  back: { gear: new THREE.Vector3(0, 0.64, -0.285), r: 0.142 },
  /** the left hand (character's left, +x): a C-shaped hook */
  handL: new THREE.Vector3(0.374, 0.385, -0.04),
};

export interface GearMats {
  trim: THREE.Material;
  joints: THREE.Material;
  dark: THREE.Material;
  glow: THREE.MeshBasicMaterial;
  lens: THREE.MeshBasicMaterial;
  glassTint: THREE.MeshBasicMaterial;
  glowSoft: THREE.MeshBasicMaterial;
}

export interface Gear {
  /** model-space pieces that follow the head */
  head: THREE.Group;
  /** model-space pieces that float freely (companions) */
  free: THREE.Group;
  /** a visor covers the eyes */
  coversEyes: boolean;
  /** where an antenna tip is (model space, head-relative frame), when there is one */
  antennaTip: THREE.Vector3 | null;
  update: (t: number) => void;
  geometries: THREE.BufferGeometry[];
}

/** Headgear that takes the side sockets, and that grows from the top button (indices in HEADGEAR). */
const SOCKET_HEADGEAR = [1, 2, 9];
const TOP_HEADGEAR = [3, 4];

export function buildGear(headgear: number, visor: number, m: GearMats, opts: { ears: boolean; antennaForRelic: boolean }): Gear {
  const head = new THREE.Group();
  const free = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.push(geo);
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    return o;
  };
  /** A rod from a to b. */
  const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) => {
    const len = a.distanceTo(b);
    const o = mesh(new THREE.CylinderGeometry(r, r, len, 10), mat);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return o;
  };
  const A = ANATOMY;
  const S = A.socket;
  const usesSockets = SOCKET_HEADGEAR.includes(headgear);
  let halo: THREE.Object3D | null = null;
  let led: THREE.Object3D | null = null;
  let floater: THREE.Group | null = null;
  let antennaTip: THREE.Vector3 | null = null;

  /* ---------- side sockets ---------- */
  const cup = (side: -1 | 1, big = true) => {
    const r = big ? S.r + 0.025 : S.r - 0.02;
    const c = mesh(new THREE.CylinderGeometry(r, r * 0.94, 0.1, 32), m.trim, side * (S.outer + 0.05), S.y, S.z);
    c.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(r * 0.66, 0.018, 8, 32), m.glow, side * (S.outer + 0.102), S.y, S.z);
    ring.rotation.y = Math.PI / 2;
    head.add(c, ring);
  };
  const headphones = (withMic: boolean) => {
    cup(-1); cup(1);
    // the band arcs over the head in the sockets' plane, in front of the ears
    const rx = S.outer + 0.05;
    const ry = A.head.yMax + 0.07 - S.y;
    const band = mesh(new THREE.TorusGeometry(1, 0.032, 10, 48, Math.PI), m.joints, 0, S.y, S.z + 0.01);
    band.scale.set(rx, ry, 1);
    head.add(band);
    if (withMic) {
      // from the right cup (character's right, -x) to the mouth
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-(S.outer + 0.05), S.y - 0.09, S.z + 0.08),
        new THREE.Vector3(-(A.head.x + 0.05), A.mouth.y + 0.02, 0.22),
        new THREE.Vector3(-0.12, A.mouth.y - 0.01, A.mouth.z + 0.04),
      ]);
      head.add(mesh(new THREE.TubeGeometry(curve, 24, 0.016, 8), m.joints), mesh(new THREE.SphereGeometry(0.04, 16, 12), m.glow, -0.12, A.mouth.y - 0.01, A.mouth.z + 0.05));
    }
  };

  /* ---------- top button ---------- */
  const T = A.topButton;
  const collar = () => head.add(mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.05, 20), m.trim, T.x, T.y + 0.015, T.z));
  const antenna = (tipLed: boolean) => {
    collar();
    const top = new THREE.Vector3(T.x - 0.05, T.y + (tipLed ? 0.32 : 0.24), T.z);
    head.add(rod(new THREE.Vector3(T.x, T.y + 0.03, T.z), top, 0.014, m.joints));
    if (tipLed) {
      led = mesh(new THREE.SphereGeometry(0.045, 16, 12), m.glow, top.x, top.y + 0.02, top.z);
      head.add(led);
    }
    antennaTip = new THREE.Vector3(top.x, top.y + 0.11, top.z);
  };

  switch (headgear) {
    case 1: headphones(false); break;
    case 2: headphones(true); break;
    case 3: antenna(!opts.antennaForRelic); break;
    case 4: { // SGX bolt antenna: a short stem from the button, the bolt on top
      collar();
      head.add(rod(new THREE.Vector3(T.x, T.y + 0.03, T.z), new THREE.Vector3(T.x, T.y + 0.12, T.z), 0.016, m.joints));
      const bolt = mesh(boltGeometry(0.3, 0.05), m.glow, T.x, T.y + 0.28, T.z - 0.025);
      bolt.rotation.z = 0.12;
      head.add(bolt);
      break;
    }
    case 5: { // halo, between the ears
      halo = mesh(new THREE.TorusGeometry(0.3, 0.022, 12, 48), m.glow, 0, A.head.yMax + 0.22, A.head.center.z);
      halo.rotation.x = Math.PI / 2;
      head.add(halo);
      break;
    }
    case 6: { // SGX gear halo behind the head (clears the ears when there are ears)
      const z = (opts.ears ? A.ears.zBack : A.head.zBack) - 0.07;
      halo = mesh(gearGeometry(0.66, 0.59, 16, 0.53, 0.045), m.trim, 0, S.y, z);
      head.add(halo, mesh(new THREE.TorusGeometry(0.51, 0.011, 6, 64), m.glow, 0, S.y, z + 0.01));
      break;
    }
    case 7: { // mech fins on the flat top, raked back, between the ears
      for (const s of [-1, 1]) {
        const fin = mesh(new RoundedBoxGeometry(0.045, 0.34, 0.2, 2, 0.018), m.trim, 0.16 * s, A.head.yMax + 0.12, -0.12);
        fin.rotation.set(-0.55, 0, -0.22 * s);
        const edge = mesh(new THREE.BoxGeometry(0.018, 0.3, 0.018), m.glow, 0.165 * s, A.head.yMax + 0.13, -0.03);
        edge.rotation.copy(fin.rotation);
        head.add(fin, edge);
      }
      break;
    }
    case 8: { // LED tiara: from socket to socket across the forehead, above the mask
      const y = A.forehead.y + 0.05;
      const pts = [
        new THREE.Vector3(-S.outer, y, S.z), new THREE.Vector3(-A.head.x - 0.01, y, 0.18), new THREE.Vector3(-0.36, y, A.head.zFront + 0.02),
        new THREE.Vector3(0, y + 0.02, A.head.zFront + 0.035), new THREE.Vector3(0.36, y, A.head.zFront + 0.02), new THREE.Vector3(A.head.x + 0.01, y, 0.18), new THREE.Vector3(S.outer, y, S.z),
      ];
      const curve = new THREE.CatmullRomCurve3(pts);
      head.add(mesh(new THREE.TubeGeometry(curve, 48, 0.022, 8), m.joints));
      for (let k = 1; k < 8; k++) {
        const p = curve.getPoint(k / 8);
        head.add(mesh(new THREE.SphereGeometry(0.022, 10, 8), m.glow, p.x, p.y + 0.012, p.z + 0.012));
      }
      break;
    }
    case 9: { // earpiece on the left socket (the one a 3/4 view shows) with an SGX bolt fin
      cup(1, false);
      const fin = mesh(boltGeometry(0.28, 0.04), m.glow, S.outer + 0.07, S.y + 0.25, S.z - 0.04);
      fin.rotation.set(0, Math.PI / 2, 0.25);
      head.add(fin);
      break;
    }
    case 10: { // the real SGX icon floating by the shoulder, like a companion
      floater = new THREE.Group();
      floater.position.set(0.86, 1.72, -0.08);
      const spin = new THREE.Group();
      floater.add(spin);
      const pad = mesh(new THREE.TorusGeometry(0.1, 0.007, 6, 40), m.glow, 0, -0.17, 0);
      pad.rotation.x = Math.PI / 2;
      floater.add(pad);
      free.add(floater);
      void loadSgxIcon().then((g) => {
        if (!g) return;
        const s = 0.24;
        const gear = new THREE.Mesh(g.gear, m.dark); gear.scale.setScalar(s);
        const bolt = new THREE.Mesh(g.bolt, m.glow); bolt.scale.setScalar(s); bolt.position.z = 0.01;
        spin.add(gear, bolt);
      });
      break;
    }
    default: break;
  }
  // an emblem on the antenna needs the antenna
  if (opts.antennaForRelic && !antennaTip) antenna(false);

  /* ---------- visors: in front of the eyes, arms clip onto the side sockets ---------- */
  const E = A.eyes;
  const zBack = E.front + 0.015;
  const arms = (y: number, zFrom: number, xFrom: number) => {
    for (const s of [-1, 1]) {
      const end = new THREE.Vector3(s * (S.outer + 0.01), S.y, S.z + 0.09);
      head.add(rod(new THREE.Vector3(s * xFrom, y, zFrom), end, 0.022, m.trim));
      if (!usesSockets) {
        const clip = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 24), m.trim, s * (S.outer + 0.02), S.y, S.z);
        clip.rotation.z = Math.PI / 2;
        head.add(clip);
      }
    }
  };
  const lens = (w: number, h: number, z: number, x = 0, y = E.y) => {
    head.add(mesh(new THREE.PlaneGeometry(w * 1.18, h * 1.4), m.glowSoft, x, y, z - 0.004), mesh(new THREE.PlaneGeometry(w, h), m.lens, x, y, z));
  };
  const box = (w: number, h: number, d: number, y = E.y) => {
    head.add(mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(0.09, h * 0.3)), m.trim, 0, y, zBack + d / 2));
    head.add(mesh(new RoundedBoxGeometry(w - 0.05, h - 0.04, d + 0.02, 4, Math.min(0.08, h * 0.28)), m.dark, 0, y, zBack + d / 2 + 0.012));
    return zBack + d + 0.024;
  };
  let coversEyes = false;
  switch (visor) {
    case 1: { // classic VR
      const front = box(1.0, 0.46, 0.16);
      lens(0.84, 0.3, front);
      arms(E.y, zBack + 0.05, 0.49);
      coversEyes = true;
      break;
    }
    case 2: { // slim VR
      const front = box(0.96, 0.3, 0.11);
      lens(0.82, 0.17, front);
      arms(E.y, zBack + 0.04, 0.47);
      coversEyes = true;
      break;
    }
    case 3: { // AR glasses: rings around each eye, a tinted lens, temples to the sockets
      for (const s of [-1, 1]) {
        const ring = mesh(new THREE.TorusGeometry(E.r + 0.03, 0.022, 10, 40), m.trim, s * E.x, E.y, zBack + 0.01);
        head.add(ring, mesh(new THREE.CircleGeometry(E.r + 0.02, 40), m.glassTint, s * E.x, E.y, zBack + 0.008));
      }
      head.add(rod(new THREE.Vector3(-0.03, E.y + 0.06, zBack + 0.012), new THREE.Vector3(0.03, E.y + 0.06, zBack + 0.012), 0.018, m.trim));
      arms(E.y + 0.06, zBack, E.x + E.r + 0.03);
      break;
    }
    case 4: { // MR visor with cameras
      const front = box(1.04, 0.5, 0.18);
      lens(0.86, 0.32, front);
      for (const s of [-1, 1]) {
        const cam = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 16), m.dark, s * 0.33, E.y - 0.19, front + 0.01);
        cam.rotation.x = Math.PI / 2;
        head.add(cam, mesh(new THREE.CircleGeometry(0.024, 16), m.glow, s * 0.33, E.y - 0.19, front + 0.032));
      }
      arms(E.y, zBack + 0.06, 0.51);
      coversEyes = true;
      break;
    }
    case 5: { // gaming visor wrapping the front, from socket to socket
      const cz = A.head.center.z;
      const rz = E.front + 0.05 - cz;
      const rx = S.outer + 0.02;
      const arc = mesh(new THREE.CylinderGeometry(1, 1, 0.3, 48, 1, true, -1.25, 2.5), m.lens, 0, E.y, cz);
      arc.scale.set(rx, 1, rz);
      head.add(arc);
      for (const y of [-0.16, 0.16]) {
        const rim = mesh(new THREE.CylinderGeometry(1.01, 1.01, 0.035, 48, 1, true, -1.3, 2.6), m.trim, 0, E.y + y, cz);
        rim.scale.set(rx, 1, rz);
        head.add(rim);
      }
      coversEyes = true;
      break;
    }
    case 6: { // goggles: a tube on each eye
      for (const s of [-1, 1]) {
        const tube = mesh(new THREE.CylinderGeometry(E.r + 0.035, E.r + 0.05, 0.12, 28, 1, true), m.dark, s * E.x, E.y, zBack + 0.06);
        tube.rotation.x = Math.PI / 2;
        head.add(tube, mesh(new THREE.TorusGeometry(E.r + 0.035, 0.026, 10, 36), m.trim, s * E.x, E.y, zBack + 0.12), mesh(new THREE.CircleGeometry(E.r + 0.02, 36), m.lens, s * E.x, E.y, zBack + 0.118));
      }
      arms(E.y, zBack + 0.06, E.x + E.r + 0.05);
      coversEyes = true;
      break;
    }
    case 7: { // LED slit: a dark glass band with one light line across the eyes
      const cz = A.head.center.z;
      const rz = E.front + 0.035 - cz;
      const rx = S.outer + 0.005;
      const glass = mesh(new THREE.CylinderGeometry(1, 1, 0.36, 48, 1, true, -1.2, 2.4), m.dark, 0, E.y, cz);
      glass.scale.set(rx, 1, rz);
      const line = mesh(new THREE.CylinderGeometry(1.012, 1.012, 0.035, 48, 1, true, -1.05, 2.1), m.glow, 0, E.y, cz);
      line.scale.set(rx, 1, rz);
      head.add(glass, line);
      coversEyes = true;
      break;
    }
    case 8: { // mech T-visor
      const front = box(1.02, 0.5, 0.16, E.y - 0.04);
      lens(0.78, 0.08, front, 0, E.y + 0.06);
      lens(0.09, 0.24, front + 0.001, 0, E.y - 0.12);
      arms(E.y - 0.04, zBack + 0.05, 0.5);
      coversEyes = true;
      break;
    }
    default: break;
  }

  const update = (t: number) => {
    if (halo) halo.rotation.z = t * (headgear === 6 ? 0.35 : 0.8);
    if (led) led.scale.setScalar(Math.sin(t * 6) > 0 ? 1 : 0.55);
    if (floater) {
      floater.position.y = 1.72 + Math.sin(t * 1.6) * 0.03;
      floater.children[0].rotation.y = t * 0.9;
    }
    m.glowSoft.opacity = 0.2 + Math.sin(t * 2.4) * 0.1;
  };

  return { head, free, coversEyes, antennaTip, update, geometries };
}
