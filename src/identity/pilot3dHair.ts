import * as THREE from 'three';

/* Hairstyles for the 3D avatar (pilot3d.ts), modelled for a round head of
   radius 0.62 centered at the origin; the caller scales the group to the
   chosen head. Same choices as the 2D avatar: hair reads around the XR
   headset (the face stays open) and over the shoulders. */

const R = 0.62;

export interface HairMats {
  hair: THREE.Material;
  trim: THREE.Material;
  sec: THREE.Material;
  glow: THREE.Material;
}

/** A tube whose radius tapers from r0 to r1 along the curve. */
function taperTube(curve: THREE.Curve<THREE.Vector3>, r0: number, r1: number, seg = 24, radial = 8): THREE.BufferGeometry {
  const g = new THREE.TubeGeometry(curve, seg, 1, radial, false);
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  const v = new THREE.Vector3();
  for (let i = 0; i <= seg; i++) {
    curve.getPointAt(i / seg, p);
    const r = r0 + (r1 - r0) * (i / seg);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(pos, k).sub(p).multiplyScalar(r).add(p);
      pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** A lathe shell around the back and sides (the front stays open for the face). */
function curtain(profile: [number, number][], open: number): THREE.BufferGeometry {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 48, open, Math.PI * 2 - open * 2);
}

/** Points spread evenly over a sphere (golden spiral), filtered by `keep`. */
function spherePoints(n: number, keep: (d: THREE.Vector3) => boolean): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const d = new THREE.Vector3(Math.cos(i * ga) * r, y, Math.sin(i * ga) * r);
    if (keep(d)) out.push(d);
  }
  return out;
}

/** Many small curls as one instanced mesh. */
function curlCloud(points: THREE.Vector3[], radius: number, size: number, mat: THREE.Material, keep: <T extends { dispose: () => void }>(x: T) => T, center = new THREE.Vector3()): THREE.InstancedMesh {
  const geo = keep(new THREE.IcosahedronGeometry(size, 1));
  const inst = keep(new THREE.InstancedMesh(geo, mat, points.length));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  points.forEach((d, i) => {
    const k = 0.8 + ((i * 37) % 10) / 22;
    s.setScalar(k);
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    m.compose(d.clone().multiplyScalar(radius).add(center), q, s);
    inst.setMatrixAt(i, m);
  });
  inst.instanceMatrix.needsUpdate = true;
  return inst;
}

/** Strands hanging from the scalp (braids, locs) at angles `a` around the head (0 = front). */
function hanging(angles: number[], thick: number, len: (k: number) => number, mats: HairMats, keep: <T extends { dispose: () => void }>(x: T) => T, cuffs: number): THREE.Object3D[] {
  const out: THREE.Object3D[] = [];
  angles.forEach((a, k) => {
    const sx = Math.sin(a), sz = Math.cos(a);
    const front = Math.abs(a) < 1.2;
    const bottom = -len(k);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sx * (R - 0.02), 0.32, sz * (R - 0.02)),
      new THREE.Vector3(sx * (R + 0.08), 0.0, sz * (R + 0.04)),
      new THREE.Vector3(sx * (R + 0.14), bottom * 0.55, sz * (front ? R * 0.7 : R + 0.1)),
      new THREE.Vector3(sx * (R + 0.18), bottom, sz * (front ? R * 0.62 : R + 0.14)),
    ]);
    const tube = new THREE.Mesh(keep(taperTube(curve, thick, thick * 0.8, 20, 6)), mats.hair);
    out.push(tube);
    for (let c = 0; c < cuffs; c++) {
      const t = 0.92 - c * 0.3;
      const p = curve.getPointAt(t);
      const tan = curve.getTangentAt(t);
      const cuff = new THREE.Mesh(keep(new THREE.CylinderGeometry(thick * 1.25, thick * 1.25, thick * 1.6, 10)), c ? mats.sec : mats.trim);
      cuff.position.copy(p);
      cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
      out.push(cuff);
    }
  });
  return out;
}

export function buildHair3D(i: number, mats: HairMats, keep: <T extends { dispose: () => void }>(x: T) => T): THREE.Group | null {
  if (!i) return null;
  const g = new THREE.Group();
  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(keep(geo), mat);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  // a cap tilted back: the hairline rises at the front, above the headset
  const cap = (tilt = -0.32, theta = 1.25, r = R + 0.035) => {
    const m = add(new THREE.SphereGeometry(r, 40, 20, 0, Math.PI * 2, 0, theta), mats.hair);
    m.rotation.x = tilt;
    return m;
  };
  const sideStrands = (wavy: boolean) => {
    for (const s of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 6; k++) {
        const y = 0.25 - k * 0.2;
        pts.push(new THREE.Vector3(s * (R - 0.02 + k * 0.025 + (wavy ? Math.sin(k * 1.7) * 0.05 : 0)), y, 0.3 - k * 0.02));
      }
      add(taperTube(new THREE.CatmullRomCurve3(pts), 0.085, 0.05, 28, 8), mats.hair);
    }
  };

  switch (i) {
    case 1: // long straight
      cap();
      add(curtain([[R + 0.03, 0.3], [R + 0.06, 0], [R + 0.1, -0.4], [R + 0.16, -0.85], [R + 0.12, -0.92]], 0.95), mats.hair);
      sideStrands(false);
      break;
    case 2: { // long wavy
      cap();
      const prof: [number, number][] = [];
      for (let k = 0; k <= 14; k++) {
        const y = 0.3 - k * 0.085;
        prof.push([R + 0.04 + (k / 14) * 0.16 + Math.sin(k * 1.3) * 0.035, y]);
      }
      add(curtain(prof, 0.95), mats.hair);
      sideStrands(true);
      break;
    }
    case 3: { // high ponytail
      cap(-0.12, 1.42);
      const tail = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.5, -0.36), new THREE.Vector3(0, 0.86, -0.56), new THREE.Vector3(0, 0.72, -0.95),
        new THREE.Vector3(0, 0.2, -1.02), new THREE.Vector3(0.04, -0.4, -0.86),
      ]);
      add(taperTube(tail, 0.15, 0.035, 32, 12), mats.hair);
      const band = add(new THREE.TorusGeometry(0.12, 0.035, 8, 24), mats.sec, 0, 0.56, -0.4);
      band.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tail.getTangentAt(0.04));
      add(new THREE.SphereGeometry(0.03, 10, 8), mats.glow, 0, 0.62, -0.35);
      break;
    }
    case 4: // double buns with LED rings
      cap(-0.12, 1.42);
      for (const s of [-1, 1]) {
        add(new THREE.SphereGeometry(0.22, 24, 16), mats.hair, 0.36 * s, 0.5, -0.12);
        const ring = add(new THREE.TorusGeometry(0.235, 0.014, 8, 40), mats.glow, 0.36 * s, 0.47, -0.12);
        ring.rotation.set(Math.PI / 2 - 0.3, 0.5 * s, 0);
      }
      break;
    case 5: { // box braids
      cap();
      const back = Array.from({ length: 14 }, (_, k) => Math.PI * 0.42 + (Math.PI * 1.16 * k) / 13);
      hanging([...back, -0.95, 0.95].map((a) => (a > Math.PI ? a - Math.PI * 2 : a)), 0.042, (k) => 0.9 + (k % 3) * 0.08, mats, keep, 1).forEach((o) => g.add(o));
      break;
    }
    case 6: { // curly afro: a cloud of curls around a soft volume, face open
      const c = new THREE.Vector3(0, 0.12, -0.1);
      const shell = add(new THREE.SphereGeometry(0.78, 40, 24, Math.PI * 0.78, Math.PI * 1.44, 0, Math.PI * 0.82), mats.hair, c.x, c.y, c.z);
      shell.rotation.x = -0.15;
      const pts = spherePoints(220, (d) => !(d.z > 0.35 && d.y < 0.62) && d.y > -0.55);
      g.add(curlCloud(pts, 0.8, 0.13, mats.hair, keep, c));
      break;
    }
    case 7: // bob with a straight fringe
      cap(0, 1.12, R + 0.05);
      add(curtain([[R + 0.05, 0.3], [R + 0.08, 0], [R + 0.11, -0.35], [R + 0.08, -0.52], [R + 0.03, -0.55]], 0.72), mats.hair);
      break;
    case 8: { // undercut: swept volume on one side, tech fade on the other
      const sweep = add(new THREE.SphereGeometry(0.5, 32, 16), mats.hair, -0.1, 0.46, 0.04);
      sweep.scale.set(1.25, 0.52, 1.36);
      sweep.rotation.z = 0.3;
      // the shaved side (x > 0): a close layer with two lit lines
      add(new THREE.SphereGeometry(R + 0.008, 32, 16, Math.PI - 0.7, 1.4, 0.45, 1.25), mats.hair);
      for (const y of [0.1, 0.2]) {
        const r = Math.sqrt(R * R - y * y) + 0.014;
        add(new THREE.TorusGeometry(r, 0.008, 6, 32, 0.9).rotateX(Math.PI / 2).rotateY(0.45), mats.glow, 0, y, 0);
      }
      break;
    }
    case 9: { // locs with SGX cuffs
      cap();
      const back = Array.from({ length: 10 }, (_, k) => Math.PI * 0.45 + (Math.PI * 1.1 * k) / 9);
      hanging([...back, -1.0, 1.0].map((a) => (a > Math.PI ? a - Math.PI * 2 : a)), 0.065, (k) => 0.82 + (k % 2) * 0.14, mats, keep, 2).forEach((o) => g.add(o));
      break;
    }
    default: { // short curls
      cap(-0.25, 1.15, R + 0.01);
      const pts = spherePoints(160, (d) => d.y > 0.22 && !(d.z > 0.62 && d.y < 0.62));
      g.add(curlCloud(pts, R + 0.05, 0.085, mats.hair, keep));
      break;
    }
  }
  return g;
}
