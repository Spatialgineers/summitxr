import * as THREE from 'three';
import { ROUTE_COLORS, TUNING, ZONES, type ZoneKey } from './droneConfig';
import { facadeMaterial, tileTexture } from './droneMaterials';
import { between, makeRng, type Rng } from './droneRng';
import { boltGeometry, gearGeometry, loadSgxIcon } from '../../../identity/sgxIcon3d';

/* Three.js world for the drone game: the drone, a seeded course per zone
   (rings on a smooth path, obstacles that always leave that path open, partner
   crates, mines), the instanced city around it, the SGX icon landmark and
   disposal. */

export interface ColliderVolume {
  box: THREE.Box3;
  label: { es: string; en: string };
  lastHitTime: number;
}

export interface RingItem { mesh: THREE.Group; passed: boolean; missed: boolean; z: number; colorIdx: number }
export interface CrateItem { mesh: THREE.Group; collected: boolean; z: number; sponsor: string }
export interface MineItem { mesh: THREE.Mesh; destroyed: boolean; z: number; spin: number }

export interface ZoneWorld {
  group: THREE.Group;
  colliders: ColliderVolume[];
  rings: RingItem[];
  crates: CrateItem[];
  mines: MineItem[];
  /** Isla Verde keeps the drone inside the arch tunnel. */
  tunnel: boolean;
  gateZ: number;
  facade: THREE.ShaderMaterial;
  mineMat: THREE.MeshStandardMaterial;
}

export interface CrateSkin { name: string; material: THREE.MeshStandardMaterial }

export const TUNNEL = { cx: 0, cy: 18, r: 21.5 } as const;

/** Free GPU memory under `root`; shared materials and textures stay. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const o = obj as THREE.Mesh;
    if (o.geometry && !o.geometry.userData.shared) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => {
      if (m.userData.shared) return;
      const map = (m as THREE.MeshBasicMaterial).map;
      if (map && !map.userData.shared) map.dispose();
      m.dispose();
    });
  });
}

/* ---------- Drone ---------- */

export interface DroneRig {
  group: THREE.Group;
  /** Tilts with banking; the group itself only moves. */
  body: THREE.Group;
  rotors: THREE.Object3D[];
  shield: THREE.Mesh;
  /** Trail emitters in body space. */
  tails: THREE.Object3D[];
  glow: THREE.PointLight;
}

export function createDrone(): DroneRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const graphite = new THREE.MeshStandardMaterial({ color: 0x1a1f27, roughness: 0.35, metalness: 0.85 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x32527b, roughness: 0.4, metalness: 0.7 });
  const cyan = new THREE.MeshStandardMaterial({ color: 0x00ddff, emissive: 0x00ddff, emissiveIntensity: 1.6 });
  const yellow = new THREE.MeshStandardMaterial({ color: 0xfdcc0d, emissive: 0xfdcc0d, emissiveIntensity: 1.4 });

  const hullGeo = new THREE.CapsuleGeometry(0.62, 1.5, 6, 14);
  hullGeo.rotateX(Math.PI / 2);
  hullGeo.scale(1.15, 0.62, 1);
  body.add(new THREE.Mesh(hullGeo, graphite));

  const canopy = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x0a3540, emissive: 0x00a8c4, emissiveIntensity: 0.6, roughness: 0.05, metalness: 0.3 }),
  );
  canopy.scale.set(1, 0.7, 1.5);
  canopy.position.set(0, 0.22, -0.35);
  body.add(canopy);

  // Front LED band and SGX bolt on the back.
  const band = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.08, 0.08), cyan);
  band.position.set(0, 0.02, -1.25);
  body.add(band);
  const bolt = new THREE.Mesh(boltGeometry(0.62, 0.06), yellow);
  bolt.rotation.x = -Math.PI / 2;
  bolt.position.set(0, 0.42, 0.45);
  body.add(bolt);

  const armGeo = new THREE.BoxGeometry(0.16, 0.1, 1.9);
  const podGeo = new THREE.CylinderGeometry(0.24, 0.2, 0.32, 14);
  const ringGeo = new THREE.TorusGeometry(0.72, 0.05, 6, 28);
  ringGeo.rotateX(Math.PI / 2);
  const discGeo = new THREE.CircleGeometry(0.68, 24);
  discGeo.rotateX(-Math.PI / 2);
  const discMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const bladeGeo = new THREE.BoxGeometry(1.25, 0.02, 0.12);
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.55 });
  const rotors: THREE.Object3D[] = [];
  const tails: THREE.Object3D[] = [];
  [[1, -1], [-1, -1], [1, 1], [-1, 1]].forEach(([sx, sz]) => {
    const x = sx * 1.25;
    const z = sz * 0.95;
    const arm = new THREE.Mesh(armGeo, trim);
    arm.position.set(x / 2, 0.05, z / 2);
    arm.rotation.y = Math.atan2(x, z);
    arm.scale.z = Math.hypot(x, z) / 1.9;
    body.add(arm);
    const pod = new THREE.Mesh(podGeo, graphite);
    pod.position.set(x, 0.12, z);
    body.add(pod);
    const guard = new THREE.Mesh(ringGeo, sz > 0 ? yellow : cyan);
    guard.position.set(x, 0.24, z);
    body.add(guard);
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.position.set(x, 0.26, z);
    body.add(disc);
    const rotor = new THREE.Group();
    rotor.position.set(x, 0.3, z);
    rotor.add(new THREE.Mesh(bladeGeo, bladeMat));
    const b2 = new THREE.Mesh(bladeGeo, bladeMat);
    b2.rotation.y = Math.PI / 2;
    rotor.add(b2);
    body.add(rotor);
    rotors.push(rotor);
    if (sz > 0) {
      const tail = new THREE.Object3D();
      tail.position.set(x, 0.12, z + 0.3);
      body.add(tail);
      tails.push(tail);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), yellow);
      lamp.position.copy(tail.position);
      body.add(lamp);
    }
  });

  const shield = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.5, 2),
    new THREE.MeshBasicMaterial({ color: 0x00ddff, wireframe: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(shield);

  const glow = new THREE.PointLight(0x00ddff, 18, 16, 2);
  glow.position.set(0, -0.8, 0);
  group.add(glow);
  return { group, body, rotors, shield, tails, glow };
}

/* ---------- Partner crates ---------- */

/* Crate face: dark tile, cyan frame, the partner logo and name. */
export function createCrateSkin(name: string, logoUrl: string): CrateSkin {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const paint = (img?: HTMLImageElement) => {
    if (!ctx) return;
    ctx.fillStyle = '#0b0d12';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#00DDFF';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(30, 5); ctx.lineTo(size - 5, 5); ctx.lineTo(size - 5, size - 30); ctx.lineTo(size - 30, size - 5); ctx.lineTo(5, size - 5); ctx.lineTo(5, 30);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = '#FDCC0D';
    ctx.fillRect(5, size - 14, size * 0.4, 9);
    if (img) {
      const box = 128;
      const r = Math.min(box / img.width, box / img.height);
      const w = img.width * r;
      const h = img.height * r;
      ctx.drawImage(img, (size - w) / 2, 34 + (box - h) / 2, w, h);
    }
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    let font = 26;
    ctx.font = `700 ${font}px Orbitron, Arial, sans-serif`;
    while (ctx.measureText(name).width > size - 36 && font > 12) {
      font -= 2;
      ctx.font = `700 ${font}px Orbitron, Arial, sans-serif`;
    }
    ctx.fillText(name, size / 2, img ? 206 : 140);
    texture.needsUpdate = true;
  };

  paint();
  if (logoUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => paint(img);
    img.src = logoUrl;
  }

  const material = new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.7, metalness: 0.3, roughness: 0.5 });
  material.userData.shared = true;
  return { name, material };
}

export function disposeCrateSkins(skins: CrateSkin[]) {
  skins.forEach((s) => {
    s.material.map?.dispose();
    s.material.dispose();
  });
}

/* ---------- SGX icon landmark ---------- */

/** The SGX icon (gear + bolt) as a huge beacon past the zone gate. Starts as the
    procedural mark and swaps in the brand .glb when it arrives. */
export function createLandmark(): { group: THREE.Group; dispose: () => void } {
  const group = new THREE.Group();
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x1b2635, emissive: 0x0a5f73, emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.3, fog: false });
  const boltMat = new THREE.MeshStandardMaterial({ color: 0xfdcc0d, emissive: 0xfdcc0d, emissiveIntensity: 1.3, metalness: 0.4, roughness: 0.3, fog: false });
  const gear = new THREE.Mesh(gearGeometry(0.5, 0.42, 12, 0.22, 0.12), gearMat);
  const bolt = new THREE.Mesh(boltGeometry(0.62, 0.16), boltMat);
  bolt.position.z = 0.05;
  group.add(gear, bolt);
  let alive = true;
  const owned = [gear.geometry, bolt.geometry];
  loadSgxIcon().then((icon) => {
    if (!alive || !icon) return;
    gear.geometry = icon.gear;
    bolt.geometry = icon.bolt;
    bolt.position.z = 0;
  });
  return {
    group,
    dispose: () => {
      alive = false;
      owned.forEach((g) => g.dispose());
      gearMat.dispose();
      boltMat.dispose();
    },
  };
}

/* ---------- Zone course ---------- */

interface BoxSpec { x: number; y: number; z: number; w: number; h: number; d: number; edge: number }

export interface ZoneOptions {
  crateSkins: CrateSkin[];
  seed: number;
  /** 0 for the first zone of a run, +1 for every zone after it. */
  level: number;
  /** Fewer side buildings on phones. */
  lite: boolean;
}

const RING_GEO = new THREE.TorusGeometry(TUNING.ringRadius, 0.38, 12, 40);
RING_GEO.userData.shared = true;
const RING_DISC = new THREE.CircleGeometry(TUNING.ringRadius - 0.3, 32);
RING_DISC.userData.shared = true;
const ringMats = ROUTE_COLORS.map((c) => {
  const col = new THREE.Color(c);
  // Bright pillars (Stage yellow, Synthesize white) glow less so bloom doesn't wash them out.
  const lum = col.r * 0.3 + col.g * 0.59 + col.b * 0.11;
  const m = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.05 - lum * 0.65, roughness: 0.3, metalness: 0.5 });
  m.userData.shared = true;
  return m;
});
const discMats = ROUTE_COLORS.map((c) => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(c), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  m.userData.shared = true;
  return m;
});

/** Smooth ring path for this zone. */
function makePath(rng: Rng, tunnel: boolean) {
  const p = [rng() * 6.28, rng() * 6.28, rng() * 6.28, rng() * 6.28];
  const f = [between(rng, 0.006, 0.01), between(rng, 0.014, 0.02), between(rng, 0.008, 0.013)];
  const ax = tunnel ? 9 : 17;
  const ay = tunnel ? 7 : 8;
  return (z: number) => ({
    x: Math.sin(z * f[0] + p[0]) * ax + Math.sin(z * f[1] + p[1]) * ax * 0.35,
    y: (tunnel ? TUNNEL.cy : 17) + Math.sin(z * f[2] + p[2]) * ay + Math.sin(z * f[1] * 1.7 + p[3]) * 2,
  });
}

export function buildZone(zone: ZoneKey, scene: THREE.Scene, sky: THREE.ShaderMaterial, opts: ZoneOptions): ZoneWorld {
  const cfg = ZONES[zone];
  const rng = makeRng(opts.seed);
  const tunnel = zone === 'ISLA_VERDE';
  const len = TUNING.zoneLength;
  const group = new THREE.Group();
  const facade = facadeMaterial(cfg.facadeTex, zone === 'VIEJO_SAN_JUAN' ? 0x3a3128 : 0x18202c, zone === 'VIEJO_SAN_JUAN' ? 0x1a1206 : 0x2a2206);
  const mineMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0xff5a00, emissiveIntensity: 1, roughness: 0.3, metalness: 0.7 });
  const world: ZoneWorld = { group, colliders: [], rings: [], crates: [], mines: [], tunnel, gateZ: -len + 30, facade, mineMat };

  scene.fog = new THREE.Fog(cfg.fog, 60, 520);
  (sky.uniforms.top.value as THREE.Color).setHex(cfg.skyTop);
  (sky.uniforms.horizon.value as THREE.Color).setHex(cfg.skyHorizon);
  (sky.uniforms.accent.value as THREE.Color).set(cfg.accent);

  const boxes: BoxSpec[] = [];
  const solid = (b: BoxSpec, label: ColliderVolume['label']) => {
    boxes.push(b);
    world.colliders.push({
      box: new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(b.x, b.y, b.z), new THREE.Vector3(b.w, b.h, b.d)),
      label,
      lastHitTime: 0,
    });
  };

  // Ground (water in Old San Juan), tiled with the SGX texture.
  const groundTex = tileTexture(cfg.groundTex);
  const groundMat = new THREE.MeshBasicMaterial({ color: cfg.groundTint, map: groundTex.clone() });
  groundMat.map!.repeat.set(260 / 9, (len + 500) / 9);
  groundMat.map!.needsUpdate = true;
  const groundGeo = new THREE.PlaneGeometry(260, len + 500);
  groundGeo.rotateX(-Math.PI / 2);
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.set(0, 0, -len / 2 + 50);
  group.add(ground);

  // Lane lights on the ground.
  const stripGeo = new THREE.PlaneGeometry(0.5, len + 400);
  stripGeo.rotateX(-Math.PI / 2);
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(cfg.accent), transparent: true, opacity: 0.55 });
  [-TUNING.laneX - 4, TUNING.laneX + 4].forEach((x) => {
    const s = new THREE.Mesh(stripGeo, stripMat);
    s.position.set(x, 0.05, -len / 2);
    group.add(s);
  });

  // City around the course: visual only, outside the lane.
  const sideStep = opts.lite ? 30 : 22;
  for (let z = 40; z > -len - 260; z -= sideStep) {
    for (const side of [-1, 1]) {
      const rows = opts.lite ? 1 : 2;
      for (let row = 0; row < rows; row++) {
        const low = zone === 'VIEJO_SAN_JUAN';
        const w = between(rng, 12, 20);
        const h = low ? between(rng, 8, 22) + row * 8 : between(rng, 24, 70) + row * 30;
        const d = between(rng, 12, sideStep - 2);
        const x = side * (TUNING.laneX + 16 + w / 2 + row * 28 + rng() * 6);
        const edge = cfg.edges[Math.floor(rng() * cfg.edges.length)];
        boxes.push({ x, y: h / 2, z: z + rng() * 4, w, h, d, edge });
      }
    }
  }
  if (zone === 'VIEJO_SAN_JUAN') {
    // The old city wall along both sides of the bay.
    [-1, 1].forEach((side) => boxes.push({ x: side * (TUNING.laneX + 9), y: 3, z: -len / 2, w: 3, h: 6, d: len + 300, edge: 0xffbb00 }));
  }

  // Rings on the path, obstacles between them.
  const path = makePath(rng, tunnel);
  const count = Math.floor((len - 100) / TUNING.ringGap);
  const offset = Math.max(8.5, 14 - opts.level * 1.2);
  const chance = Math.min(0.92, 0.5 + opts.level * 0.12);
  for (let i = 0; i < count; i++) {
    const z = -60 - i * TUNING.ringGap;
    const pt = path(z);
    const colorIdx = i % ROUTE_COLORS.length;
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(RING_GEO, ringMats[colorIdx]));
    ring.add(new THREE.Mesh(RING_DISC, discMats[colorIdx]));
    ring.position.set(pt.x, pt.y, z);
    group.add(ring);
    world.rings.push({ mesh: ring, passed: false, missed: false, z, colorIdx });

    if (i === 0 || i === count - 1) continue;
    const oz = z + TUNING.ringGap / 2;
    const op = path(oz);
    const passes = rng() < chance ? (rng() < opts.level * 0.15 ? 2 : 1) : 0;
    for (let k = 0; k < passes; k++) {
      const kind = rng();
      const sideSign = rng() < 0.5 ? -1 : 1;
      const dz = k * 8;
      if (zone === 'CHROMA') {
        if (kind < 0.6) {
          const w = between(rng, 7, 11);
          const h = between(rng, 26, 46);
          const x = THREE.MathUtils.clamp(op.x + sideSign * (offset + w / 2), -TUNING.laneX - 4, TUNING.laneX + 4);
          solid({ x, y: h / 2, z: oz - dz, w, h, d: 8, edge: 0xfdcc0d }, { es: 'Torre Chroma', en: 'Chroma tower' });
        } else {
          const over = op.y < 21;
          const y = over ? op.y + offset * 0.75 : op.y - offset * 0.75;
          solid({ x: 0, y, z: oz - dz, w: TUNING.laneX * 2 + 24, h: 3.6, d: 5, edge: 0xfdcc0d }, { es: 'Puente de luz', en: 'Light bridge' });
        }
      } else if (zone === 'VIEJO_SAN_JUAN') {
        if (kind < 0.55) {
          // Wall with a gate around the path.
          const gw = Math.max(12, 18 - opts.level * 1.5);
          const gh = Math.max(10, 14 - opts.level);
          const lw = op.x - gw / 2 + TUNING.laneX + 6;
          const rw = TUNING.laneX + 6 - (op.x + gw / 2);
          const top = 34;
          const label = { es: 'Muralla', en: 'City wall' };
          if (lw > 0.5) solid({ x: -TUNING.laneX - 6 + lw / 2, y: top / 2, z: oz, w: lw, h: top, d: 4, edge: 0xffbb00 }, label);
          if (rw > 0.5) solid({ x: TUNING.laneX + 6 - rw / 2, y: top / 2, z: oz, w: rw, h: top, d: 4, edge: 0xffbb00 }, label);
          const bottom = op.y - gh / 2;
          if (bottom > 0.5) solid({ x: op.x, y: bottom / 2, z: oz, w: gw, h: bottom, d: 4, edge: 0xffbb00 }, label);
          const lintel = top - (op.y + gh / 2);
          if (lintel > 0.5) solid({ x: op.x, y: top - lintel / 2, z: oz, w: gw, h: lintel, d: 4, edge: 0xfdcc0d }, label);
          break;
        }
        const w = between(rng, 5, 7);
        const x = THREE.MathUtils.clamp(op.x + sideSign * (offset + w / 2), -TUNING.laneX, TUNING.laneX);
        solid({ x, y: 15, z: oz - dz, w, h: 30, d: w, edge: 0x00ddff }, { es: 'Garita', en: 'Sentry box' });
      } else {
        const vertical = kind < 0.5;
        const t = 4.5;
        if (vertical) {
          solid({ x: op.x + sideSign * (offset * 0.8 + t / 2), y: TUNNEL.cy, z: oz - dz, w: t, h: TUNNEL.r * 2 + 4, d: 3, edge: 0xff7ad9 }, { es: 'Barrera de luz', en: 'Light barrier' });
        } else {
          const y = op.y + (op.y < TUNNEL.cy ? 1 : -1) * (offset * 0.7 + t / 2);
          solid({ x: 0, y, z: oz - dz, w: TUNNEL.r * 2 + 4, h: t, d: 3, edge: 0xfdcc0d }, { es: 'Barrera de luz', en: 'Light barrier' });
        }
      }
    }
  }

  // Facades: one instanced draw call for the whole zone.
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const blocks = new THREE.InstancedMesh(unit, facade, boxes.length);
  const m = new THREE.Matrix4();
  const c = new THREE.Color();
  boxes.forEach((b, i) => {
    m.makeScale(b.w, b.h, b.d).setPosition(b.x, b.y, b.z);
    blocks.setMatrixAt(i, m);
    blocks.setColorAt(i, c.setHex(b.edge));
  });
  blocks.computeBoundingSphere();
  group.add(blocks);

  if (tunnel) {
    // LED arches every 30 m: one instanced ring.
    const archGeo = new THREE.RingGeometry(TUNNEL.r + 2, TUNNEL.r + 3.4, 6);
    const archMat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const n = Math.ceil((len + 120) / 30);
    const arches = new THREE.InstancedMesh(archGeo, archMat, n);
    for (let i = 0; i < n; i++) {
      const z = -i * 30;
      m.makeRotationZ(z * 0.03).setPosition(TUNNEL.cx, TUNNEL.cy, z);
      arches.setMatrixAt(i, m);
      arches.setColorAt(i, c.setHex(i % 2 ? 0x00ddff : 0xfdcc0d));
    }
    arches.computeBoundingSphere();
    group.add(arches);
  }

  // Partner crates, beside the path.
  const crateGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
  for (let i = 1; i <= 7; i++) {
    const skin = opts.crateSkins[(i + opts.level) % opts.crateSkins.length];
    const z = -i * 105 - 20;
    const pt = path(z);
    const crate = new THREE.Group();
    crate.add(new THREE.Mesh(crateGeo, skin.material));
    crate.position.set(pt.x + (rng() < 0.5 ? -1 : 1) * between(rng, 4, 7), pt.y + between(rng, -2, 2), z);
    group.add(crate);
    world.crates.push({ mesh: crate, collected: false, z, sponsor: skin.name });
  }

  // Mines float near the path: dodge, shoot or pulse them.
  const mineGeo = new THREE.OctahedronGeometry(1.9, 0);
  const mines = 8 + opts.level * 3;
  for (let i = 0; i < mines; i++) {
    const z = -110 - rng() * (len - 200);
    const pt = path(z);
    const mine = new THREE.Mesh(mineGeo, mineMat);
    const a = rng() * Math.PI * 2;
    const r = between(rng, 2.5, 8);
    mine.position.set(pt.x + Math.cos(a) * r, Math.max(4, pt.y + Math.sin(a) * r), z);
    group.add(mine);
    world.mines.push({ mesh: mine, destroyed: false, z, spin: between(rng, 1.2, 2.6) });
  }

  // Zone gate.
  const gate = new THREE.Group();
  gate.add(new THREE.Mesh(new THREE.TorusGeometry(15, 1.1, 12, 48), new THREE.MeshBasicMaterial({ color: 0xfdcc0d })));
  gate.add(new THREE.Mesh(new THREE.CircleGeometry(14, 40), new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })));
  gate.position.set(0, tunnel ? TUNNEL.cy : 18, world.gateZ);
  group.add(gate);

  scene.add(group);
  return world;
}
