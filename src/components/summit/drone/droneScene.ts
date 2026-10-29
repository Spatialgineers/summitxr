import * as THREE from 'three';
import { RINGS_PER_ZONE, ROUTE_COLORS, ZONES, type ZoneKey } from './droneConfig';

/* Three.js world for the drone game: the drone mesh, the three zones with
   their box colliders, rings, partner crates and mines, plus disposal. */

export interface ColliderVolume {
  box: THREE.Box3;
  label: { es: string; en: string };
  lastHitTime: number;
}

export interface RingItem { mesh: THREE.Group; passed: boolean; rimHitTime: number; z: number; colorIdx: number }
export interface CrateItem { mesh: THREE.Group; collected: boolean; z: number; sponsor: string }
export interface MineItem { mesh: THREE.Mesh; destroyed: boolean; z: number; rotSpeed: number }

export interface ZoneWorld {
  group: THREE.Group;
  colliders: ColliderVolume[];
  rings: RingItem[];
  crates: CrateItem[];
  mines: MineItem[];
  /** Tunnel zone keeps the drone inside a cylinder. */
  tunnel: boolean;
}

export interface CrateSkin { name: string; material: THREE.MeshStandardMaterial }

/** Free GPU memory for everything under `root`, except materials marked shared. */
export function disposeObject(root: THREE.Object3D) {
  root.traverse((obj) => {
    const o = obj as THREE.Mesh;
    if (o.geometry) o.geometry.dispose();
    const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
    mats.forEach((m) => {
      if (m.userData.shared) return;
      (m as THREE.MeshStandardMaterial).map?.dispose();
      m.dispose();
    });
  });
}

export function createDroneMesh(): { group: THREE.Group; rotors: THREE.Mesh[]; shield: THREE.Mesh } {
  const group = new THREE.Group();
  const rotors: THREE.Mesh[] = [];

  const bodyGeo = new THREE.ConeGeometry(0.85, 2.3, 6);
  bodyGeo.rotateX(Math.PI / 2);
  group.add(new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x14181f, roughness: 0.25, metalness: 0.9 })));

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), new THREE.MeshBasicMaterial({ color: 0x00ddff }));
  core.position.set(0, 0.2, 0.2);
  group.add(core);

  const canopy = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.36, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x00ddff, roughness: 0.1, metalness: 0.9, transparent: true, opacity: 0.85 }),
  );
  canopy.position.set(0, 0.35, -0.4);
  group.add(canopy);

  const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.85, 8);
  const armMat = new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.8 });
  const motorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12);
  const motorMat = new THREE.MeshStandardMaterial({ color: 0x0c0e12, metalness: 0.9 });
  const bladeGeo = new THREE.BoxGeometry(1.35, 0.03, 0.15);
  const bladeMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.8 });
  [
    { x: 1.2, z: 0.8, rotZ: Math.PI / 4 },
    { x: -1.2, z: 0.8, rotZ: -Math.PI / 4 },
    { x: 1.2, z: -0.8, rotZ: Math.PI / 4 },
    { x: -1.2, z: -0.8, rotZ: -Math.PI / 4 },
  ].forEach((p) => {
    const arm = new THREE.Mesh(armGeo, armMat);
    arm.position.set(p.x * 0.5, 0.05, p.z * 0.5);
    arm.rotation.z = p.rotZ;
    group.add(arm);
    const motor = new THREE.Mesh(motorGeo, motorMat);
    motor.position.set(p.x, 0.15, p.z);
    group.add(motor);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.set(p.x, 0.3, p.z);
    group.add(blade);
    rotors.push(blade);
  });

  const gunGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
  gunGeo.rotateX(Math.PI / 2);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0xfdcc0d, metalness: 0.95 });
  [-0.7, 0.7].forEach((x) => {
    const gun = new THREE.Mesh(gunGeo, gunMat);
    gun.position.set(x, -0.1, -0.6);
    group.add(gun);
  });

  const shield = new THREE.Mesh(
    new THREE.IcosahedronGeometry(2.35, 2),
    new THREE.MeshBasicMaterial({ color: 0x00ddff, wireframe: true, transparent: true, opacity: 0 }),
  );
  group.add(shield);
  return { group, rotors, shield };
}

/* Partner crate face: dark tile, cyan frame, the partner logo and name. */
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

  const material = new THREE.MeshStandardMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture, emissiveIntensity: 0.55, metalness: 0.3, roughness: 0.5 });
  material.userData.shared = true;
  return { name, material };
}

export function disposeCrateSkins(skins: CrateSkin[]) {
  skins.forEach((s) => {
    s.material.map?.dispose();
    s.material.dispose();
  });
}

export function buildZone(zone: ZoneKey, scene: THREE.Scene, crateSkins: CrateSkin[]): ZoneWorld {
  const group = new THREE.Group();
  const world: ZoneWorld = { group, colliders: [], rings: [], crates: [], mines: [], tunnel: zone === 'ISLA_VERDE' };
  const cfg = ZONES[zone];
  scene.fog = new THREE.FogExp2(cfg.fogColor, zone === 'ISLA_VERDE' ? 0.0045 : 0.0055);
  scene.background = new THREE.Color(cfg.skyColor);

  const addCollider = (size: THREE.Vector3, center: THREE.Vector3, label: ColliderVolume['label']) => {
    world.colliders.push({ box: new THREE.Box3().setFromCenterAndSize(center, size), label, lastHitTime: 0 });
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);

  if (zone === 'CHROMA') {
    const floorGeo = new THREE.PlaneGeometry(240, 1000);
    floorGeo.rotateX(-Math.PI / 2);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x06090f, roughness: 0.4, metalness: 0.7 }));
    floor.position.set(0, 0, -450);
    group.add(floor);

    [-32, 0, 32].forEach((laneX, idx) => {
      const stripGeo = new THREE.PlaneGeometry(idx === 1 ? 0.8 : 0.45, 960);
      stripGeo.rotateX(-Math.PI / 2);
      const strip = new THREE.Mesh(stripGeo, new THREE.MeshBasicMaterial({ color: idx === 1 ? 0xfdcc0d : 0x00ddff, transparent: true, opacity: idx === 1 ? 0.45 : 0.65 }));
      strip.position.set(laneX, 0.05, -450);
      group.add(strip);
    });

    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x0d1118, roughness: 0.25, metalness: 0.85 });
    const edgeGeo = new THREE.EdgesGeometry(unitBox);
    const edgeCyan = new THREE.LineBasicMaterial({ color: 0x00ddff });
    const edgeYellow = new THREE.LineBasicMaterial({ color: 0xfdcc0d });

    // Towers along the sides and weaving into the lane.
    for (let i = 1; i <= 44; i++) {
      const inner = i % 3 === 0;
      const w = inner ? 10 + (i % 5) * 2 : 16 + (i % 4) * 4;
      const h = inner ? 24 + (i % 4) * 5 : 46 + (i % 6) * 10;
      const d = 14 + (i % 3) * 4;
      const z = -i * 20 - 30;
      const x = inner ? Math.sin(i * 1.9) * 18 : (i % 2 === 0 ? 1 : -1) * (32 + (i % 3) * 12);
      const mesh = new THREE.Mesh(unitBox, buildingMat);
      mesh.scale.set(w, h, d);
      mesh.position.set(x, h / 2, z);
      group.add(mesh);
      const edge = new THREE.LineSegments(edgeGeo, inner ? edgeYellow : edgeCyan);
      edge.scale.copy(mesh.scale);
      edge.position.copy(mesh.position);
      group.add(edge);
      addCollider(new THREE.Vector3(w, h, d), mesh.position.clone(), inner ? { es: 'Torre Chroma', en: 'Chroma tower' } : { es: 'Edificio', en: 'Building' });
    }

    // Light bridges: go under or over them.
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x1a2433, emissive: 0x002a33, metalness: 0.9, roughness: 0.2 });
    const bridgeEdge = new THREE.LineBasicMaterial({ color: 0xffbb00 });
    for (let j = 1; j <= 8; j++) {
      const y = j % 2 === 0 ? 14 : 24;
      const z = -j * 105 - 40;
      const mesh = new THREE.Mesh(unitBox, bridgeMat);
      mesh.scale.set(68, 4.2, 6);
      mesh.position.set(0, y, z);
      group.add(mesh);
      const edge = new THREE.LineSegments(edgeGeo, bridgeEdge);
      edge.scale.copy(mesh.scale);
      edge.position.copy(mesh.position);
      group.add(edge);
      addCollider(new THREE.Vector3(68, 4.2, 6), mesh.position.clone(), { es: 'Puente de luz', en: 'Light bridge' });
    }
  } else if (zone === 'VIEJO_SAN_JUAN') {
    // Bay water.
    const waterGeo = new THREE.PlaneGeometry(240, 1000);
    waterGeo.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ color: 0x07131c, roughness: 0.3, metalness: 0.6 }));
    water.position.set(0, 0, -450);
    group.add(water);

    // Wall blocks floating over the bay, each with a ring that shows its hitbox.
    const blockGeo = new THREE.DodecahedronGeometry(1, 1);
    const blockMat = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.8, metalness: 0.1 });
    const auraMat = new THREE.MeshBasicMaterial({ color: 0xffbb00, side: THREE.DoubleSide });
    for (let i = 1; i <= 32; i++) {
      const r = 8 + (i % 4) * 2.5;
      const mesh = new THREE.Mesh(blockGeo, blockMat);
      mesh.scale.set(r, r * 0.75, r);
      mesh.position.set(Math.sin(i * 1.65) * 24, 10 + Math.cos(i * 1.35) * 11, -i * 27 - 35);
      group.add(mesh);
      const aura = new THREE.Mesh(new THREE.RingGeometry(r * 0.95, r * 1.08, 24), auraMat);
      aura.position.copy(mesh.position);
      group.add(aura);
      addCollider(new THREE.Vector3(r * 1.75, r * 1.35, r * 1.75), mesh.position.clone(), { es: 'Muralla', en: 'City wall' });
    }
  } else {
    // LED arches with light barriers every 60 m.
    const archGeo = new THREE.RingGeometry(24, 27, 6);
    const archCyan = new THREE.MeshBasicMaterial({ color: 0x00ddff, side: THREE.DoubleSide });
    const archYellow = new THREE.MeshBasicMaterial({ color: 0xfdcc0d, side: THREE.DoubleSide });
    const gateMat = new THREE.MeshStandardMaterial({ color: 0xffbb00, emissive: 0x663f00, roughness: 0.2, metalness: 0.9 });
    for (let z = -30; z > -900; z -= 30) {
      const arch = new THREE.Mesh(archGeo, z % 60 === 0 ? archYellow : archCyan);
      arch.position.set(0, 18, z);
      arch.rotation.z = z * 0.04;
      group.add(arch);
      if (z % 60 === 0) {
        const vertical = (Math.abs(z) / 60) % 2 === 0;
        const w = vertical ? 6.5 : 38;
        const h = vertical ? 32 : 6.5;
        const x = vertical ? Math.sin(z * 0.03) * 10 : 0;
        const y = vertical ? 18 : 18 + Math.cos(z * 0.03) * 7;
        const gate = new THREE.Mesh(unitBox, gateMat);
        gate.scale.set(w, h, 3.5);
        gate.position.set(x, y, z);
        group.add(gate);
        addCollider(new THREE.Vector3(w, h, 3.5), gate.position.clone(), { es: 'Barrera de luz', en: 'Light barrier' });
      }
    }
  }

  // Rings in pillar order: 18 per zone, three full routes.
  const ringGeo = new THREE.TorusGeometry(5.6, 0.42, 14, 36);
  const ringMats = ROUTE_COLORS.map((c) => {
    const col = new THREE.Color(c);
    return new THREE.MeshStandardMaterial({ color: col, emissive: col.clone().multiplyScalar(0.55), roughness: 0.2, metalness: 0.6 });
  });
  for (let i = 0; i < RINGS_PER_ZONE; i++) {
    const colorIdx = i % ROUTE_COLORS.length;
    const ring = new THREE.Group();
    ring.add(new THREE.Mesh(ringGeo, ringMats[colorIdx]));
    const z = -(i + 1) * 46 - 12;
    ring.position.set(Math.cos((i + 1) * 1.1) * 14, 14 + Math.sin((i + 1) * 1.4) * 6, z);
    group.add(ring);
    world.rings.push({ mesh: ring, passed: false, rimHitTime: 0, z, colorIdx });
  }

  // Partner crates.
  const crateGeo = new THREE.BoxGeometry(2.6, 2.6, 2.6);
  for (let i = 1; i <= 12; i++) {
    const skin = crateSkins[i % crateSkins.length];
    const crate = new THREE.Group();
    crate.add(new THREE.Mesh(crateGeo, skin.material));
    const z = -i * 68;
    crate.position.set(Math.sin(i * 2.1) * 16, 12 + Math.cos(i * 1.7) * 7, z);
    group.add(crate);
    world.crates.push({ mesh: crate, collected: false, z, sponsor: skin.name });
  }

  // Mines.
  const mineGeo = new THREE.OctahedronGeometry(2.4, 0);
  const mineMat = new THREE.MeshStandardMaterial({ color: 0xff7a00, emissive: 0x5a2000, roughness: 0.25, metalness: 0.8 });
  for (let i = 1; i <= 20; i++) {
    const mine = new THREE.Mesh(mineGeo, mineMat);
    const z = -i * 42 - 18;
    mine.position.set(Math.sin(i * 2.5) * 19, 11 + Math.cos(i * 2.2) * 8, z);
    group.add(mine);
    world.mines.push({ mesh: mine, destroyed: false, z, rotSpeed: 0.025 + Math.random() * 0.03 });
  }

  // Zone gate at the end of the run.
  const gate = new THREE.Group();
  gate.add(new THREE.Mesh(new THREE.TorusGeometry(12, 1.2, 16, 40), new THREE.MeshBasicMaterial({ color: 0xfdcc0d })));
  gate.add(new THREE.Mesh(new THREE.CircleGeometry(11, 32), new THREE.MeshBasicMaterial({ color: 0x1a1404, transparent: true, opacity: 0.8, side: THREE.DoubleSide })));
  gate.position.set(0, 16, -880);
  group.add(gate);

  scene.add(group);
  return world;
}
