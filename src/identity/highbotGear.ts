import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { boltGeometry, gearGeometry } from './sgxIcon3d';

/* HIGHBOT GEAR: the headgear and visors of the old XR avatar (pilot3d.ts, now
   retired), refitted to the Highbot's boxy head. Everything is built around
   the head center in model units: HEAD gives the half width/height/depth and
   where the face is. Gear hangs from a socket that follows the neck, so it
   moves with the head. Colors: trim for frames, joints for bands and cups,
   the eye color for every light and lens. */

export const HEAD = {
  /** head center in model space */
  center: new THREE.Vector3(0, 1.303, -0.04),
  hw: 0.52,
  ht: 0.42,
  hd: 0.43,
  /** front of the face (with the mask) and eye height, relative to the center */
  face: 0.5,
  eyeY: 0.03,
};

export interface GearMats {
  trim: THREE.Material;
  joints: THREE.Material;
  dark: THREE.Material;
  glow: THREE.MeshBasicMaterial;
  lens: THREE.MeshBasicMaterial;
  glowSoft: THREE.MeshBasicMaterial;
}

export interface Gear {
  head: THREE.Group;
  /** pieces that float next to the body (model space, not head space) */
  body: THREE.Group;
  /** a visor covers the eyes */
  coversEyes: boolean;
  update: (t: number) => void;
  geometries: THREE.BufferGeometry[];
}

export function buildGear(headgear: number, visor: number, m: GearMats, wideHead: boolean): Gear {
  const head = new THREE.Group();
  const body = new THREE.Group();
  const geometries: THREE.BufferGeometry[] = [];
  const mesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    geometries.push(geo);
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    return o;
  };
  const { hw, ht, hd, face, eyeY } = HEAD;
  // ears or side discs make the head wider: cups and bands clear them
  const sideX = hw + (wideHead ? 0.12 : 0.05);
  let halo: THREE.Object3D | null = null;
  let led: THREE.Object3D | null = null;
  let floater: THREE.Group | null = null;

  /* ---------- headgear ---------- */
  const headphones = (withMic: boolean) => {
    const band = mesh(new THREE.TorusGeometry(sideX + 0.02, 0.035, 10, 40, Math.PI), m.joints, 0, 0.04, -0.02);
    band.scale.y = (ht + 0.12) / (sideX + 0.02);
    head.add(band);
    for (const s of [-1, 1]) {
      const cup = mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.13, 28), m.trim, sideX * s, 0, -0.02);
      cup.rotation.z = Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(0.115, 0.018, 8, 28), m.glow, (sideX + 0.068) * s, 0, -0.02);
      ring.rotation.y = Math.PI / 2;
      head.add(cup, ring);
    }
    if (withMic) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-(sideX + 0.04), -0.05, 0.04), new THREE.Vector3(-(hw + 0.02), -0.3, 0.3), new THREE.Vector3(-0.14, -0.32, face + 0.02),
      ]);
      head.add(mesh(new THREE.TubeGeometry(curve, 24, 0.018, 8), m.joints), mesh(new THREE.SphereGeometry(0.045, 16, 12), m.glow, -0.14, -0.32, face + 0.02));
    }
  };

  switch (headgear) {
    case 1: headphones(false); break;
    case 2: headphones(true); break;
    case 3: { // antenna with a blinking tip
      const rod = mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.42, 8), m.joints, 0.2, ht + 0.19, -0.05);
      rod.rotation.z = -0.3;
      head.add(rod, mesh(new THREE.CylinderGeometry(0.05, 0.065, 0.05, 16), m.trim, 0.14, ht + 0.01, -0.05));
      led = mesh(new THREE.SphereGeometry(0.055, 16, 12), m.glow, 0.27, ht + 0.4, -0.05);
      head.add(led);
      break;
    }
    case 4: { // SGX bolt antenna
      head.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.07, 16), m.trim, 0.18, ht + 0.01, -0.05));
      const bolt = mesh(boltGeometry(0.42, 0.06), m.glow, 0.24, ht + 0.27, -0.08);
      bolt.rotation.z = -0.25;
      head.add(bolt);
      break;
    }
    case 5: { // halo
      halo = mesh(new THREE.TorusGeometry(0.34, 0.028, 12, 48), m.glow, 0, ht + 0.24, -0.04);
      halo.rotation.x = Math.PI / 2;
      head.add(halo);
      break;
    }
    case 6: { // SGX gear halo behind the head
      halo = mesh(gearGeometry(0.72, 0.64, 16, 0.58, 0.05), m.trim, 0, 0.06, -(hd + 0.1));
      head.add(halo, mesh(new THREE.TorusGeometry(0.56, 0.012, 6, 64), m.glow, 0, 0.06, -(hd + 0.1)));
      break;
    }
    case 7: { // mech fins on top
      for (const s of [-1, 1]) {
        const fin = mesh(new RoundedBoxGeometry(0.05, 0.42, 0.2, 2, 0.02), m.trim, 0.24 * s, ht + 0.12, -0.12);
        fin.rotation.set(-0.5, 0, -0.32 * s);
        const edge = mesh(new THREE.BoxGeometry(0.02, 0.36, 0.02), m.glow, 0.25 * s, ht + 0.14, -0.02);
        edge.rotation.copy(fin.rotation);
        head.add(fin, edge);
      }
      break;
    }
    case 8: { // LED headband over the top, tilted forward
      const band = new THREE.Group();
      const r = sideX + 0.01;
      const arc = mesh(new THREE.TorusGeometry(r, 0.03, 10, 48, Math.PI), m.joints);
      arc.scale.y = (ht + 0.06) / r;
      band.add(arc);
      for (let k = 0; k < 5; k++) {
        const a = 0.45 + k * 0.56;
        band.add(mesh(new THREE.SphereGeometry(0.028, 10, 8), m.glow, Math.cos(a) * (r + 0.02), Math.sin(a) * (ht + 0.08), 0.02));
      }
      band.position.set(0, 0.04, 0.05);
      band.rotation.x = 0.35;
      head.add(band);
      break;
    }
    case 9: { // earpiece with an SGX bolt fin
      const pod = mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.12, 28), m.trim, -sideX, -0.02, -0.02);
      pod.rotation.z = Math.PI / 2;
      const ring = mesh(new THREE.TorusGeometry(0.1, 0.018, 8, 28), m.glow, -(sideX + 0.062), -0.02, -0.02);
      ring.rotation.y = Math.PI / 2;
      const fin = mesh(boltGeometry(0.34, 0.05), m.glow, -(sideX + 0.02), 0.26, -0.06);
      fin.rotation.set(0, Math.PI / 2, 0.2);
      head.add(pod, ring, fin);
      break;
    }
    case 10: { // the SGX icon floating by the shoulder, like a companion
      floater = new THREE.Group();
      floater.position.set(0.68, 1.42, -0.05);
      const spin = new THREE.Group();
      spin.add(mesh(gearGeometry(0.15, 0.115, 8, 0.06, 0.04), m.trim, 0.03, 0, -0.02));
      spin.add(mesh(boltGeometry(0.28, 0.035), m.glow, -0.04, 0, 0.02));
      const pad = mesh(new THREE.TorusGeometry(0.11, 0.008, 6, 40), m.glow, 0, -0.2, 0);
      pad.rotation.x = Math.PI / 2;
      floater.add(spin, pad);
      body.add(floater);
      break;
    }
    default: break;
  }

  /* ---------- visor (in front of the face) ---------- */
  const set = new THREE.Group();
  set.position.set(0, eyeY, face);
  head.add(set);
  const lensPlane = (w: number, h: number, z: number, x = 0) => {
    const g = mesh(new THREE.PlaneGeometry(w, h), m.lens, x, 0, z);
    const soft = mesh(new THREE.PlaneGeometry(w * 1.2, h * 1.45), m.glowSoft, x, 0, z - 0.004);
    return [soft, g];
  };
  const strap = () => {
    const s = mesh(new THREE.TorusGeometry(1, 0.03, 8, 48), m.dark, 0, eyeY + 0.02, 0.0);
    s.rotation.x = Math.PI / 2;
    s.scale.set(hw + 0.03, hd + 0.06, 1);
    head.add(s);
  };
  switch (visor) {
    case 1: // classic VR
      set.add(mesh(new RoundedBoxGeometry(1.0, 0.44, 0.26, 4, 0.1), m.trim, 0, 0, 0.1));
      set.add(mesh(new RoundedBoxGeometry(0.95, 0.4, 0.28, 4, 0.09), m.dark, 0, 0, 0.14));
      set.add(...lensPlane(0.82, 0.28, 0.285));
      strap();
      break;
    case 2: // slim VR
      set.add(mesh(new RoundedBoxGeometry(0.94, 0.3, 0.2, 4, 0.08), m.trim, 0, 0, 0.08));
      set.add(mesh(new RoundedBoxGeometry(0.9, 0.27, 0.22, 4, 0.07), m.dark, 0, 0, 0.11));
      set.add(...lensPlane(0.78, 0.18, 0.225));
      strap();
      break;
    case 3: // AR glasses
      for (const s of [-1, 1]) {
        set.add(mesh(new RoundedBoxGeometry(0.4, 0.26, 0.05, 3, 0.04), m.trim, 0.23 * s, 0, 0.05));
        set.add(...lensPlane(0.33, 0.19, 0.08, 0.23 * s));
        set.add(mesh(new THREE.BoxGeometry(0.035, 0.035, face + 0.05), m.trim, 0.44 * s, 0.05, -face / 2 + 0.04));
      }
      set.add(mesh(new THREE.BoxGeometry(0.1, 0.035, 0.035), m.trim, 0, 0.05, 0.06));
      break;
    case 4: // MR visor with cameras
      set.add(mesh(new RoundedBoxGeometry(1.06, 0.5, 0.3, 4, 0.11), m.trim, 0, 0, 0.1));
      set.add(mesh(new RoundedBoxGeometry(1.0, 0.46, 0.32, 4, 0.1), m.dark, 0, 0, 0.14));
      set.add(...lensPlane(0.86, 0.32, 0.305));
      for (const s of [-1, 1]) {
        const cam = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 16), m.dark, 0.33 * s, -0.18, 0.3);
        cam.rotation.x = Math.PI / 2;
        set.add(cam, mesh(new THREE.CircleGeometry(0.026, 16), m.glow, 0.33 * s, -0.18, 0.327));
      }
      strap();
      break;
    case 5: { // curved gaming visor wrapping the front
      const r = face + 0.08;
      const arc = mesh(new THREE.CylinderGeometry(r, r, 0.3, 40, 1, true, -1.05, 2.1), m.lens, 0, 0, -face);
      arc.scale.x = (hw + 0.1) / r;
      set.add(arc);
      for (const y of [-0.165, 0.165]) {
        const rim = mesh(new THREE.CylinderGeometry(r + 0.01, r + 0.01, 0.04, 40, 1, true, -1.1, 2.2), m.trim, 0, y, -face);
        rim.scale.x = (hw + 0.1) / r;
        set.add(rim);
      }
      break;
    }
    case 6: // goggles
      for (const s of [-1, 1]) {
        const tube = mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.16, 24), m.dark, 0.22 * s, 0, 0.06);
        tube.rotation.x = Math.PI / 2;
        set.add(tube, mesh(new THREE.TorusGeometry(0.17, 0.03, 10, 32), m.trim, 0.22 * s, 0, 0.15), mesh(new THREE.CircleGeometry(0.145, 32), m.lens, 0.22 * s, 0, 0.146));
      }
      strap();
      break;
    case 7: { // LED band around the front half of the head
      for (const [mat, tube] of [[m.glow, 0.035], [m.glowSoft, 0.06]] as const) {
        const band = mesh(new THREE.TorusGeometry(1, tube, 10, 64, Math.PI), mat, 0, 0, -face);
        band.rotation.x = Math.PI / 2;
        band.scale.set(hw + 0.04, face + 0.03, 1);
        set.add(band);
      }
      break;
    }
    case 8: // mech T-visor
      set.add(mesh(new RoundedBoxGeometry(1.02, 0.5, 0.26, 3, 0.07), m.trim, 0, -0.06, 0.08));
      set.add(mesh(new RoundedBoxGeometry(0.97, 0.46, 0.28, 3, 0.06), m.dark, 0, -0.06, 0.11));
      set.add(...lensPlane(0.76, 0.1, 0.255, 0).map((o) => { o.position.y = 0.05; return o; }));
      set.add(...lensPlane(0.1, 0.24, 0.256, 0).map((o) => { o.position.y = -0.12; return o; }));
      strap();
      break;
    default: break;
  }

  const update = (t: number) => {
    if (halo) halo.rotation.z = t * (headgear === 6 ? 0.35 : 0.8);
    if (led) led.scale.setScalar(Math.sin(t * 6) > 0 ? 1 : 0.55);
    if (floater) {
      floater.position.y = 1.42 + Math.sin(t * 1.6) * 0.03;
      floater.children[0].rotation.y = t * 0.9;
    }
    m.glowSoft.opacity = 0.2 + Math.sin(t * 2.4) * 0.1;
  };

  // visors that wrap the eyes (all but the LED band and AR glasses) hide them
  return { head, body, coversEyes: [1, 2, 4, 5, 6, 8].includes(visor), update, geometries };
}
