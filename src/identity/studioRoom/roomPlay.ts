import * as THREE from 'three';
import { playCyberBurstSound, playUiChirp } from '../../lib/cyberAudioEngine';
import { createDrone, disposeObject } from '../../components/summit/drone/droneScene';
import { loadSgxIcon } from '../sgxIcon3d';

/* The living part of Tu Estudio 3D: things to grab and throw, a holo hoop to
   score in, and the room's own motion (dust, a ring lamp, a small drone,
   ripples on the floor).

   The physics is a small sphere solver written for this room, so it adds no
   download. It follows the rules of the walkable-room guide we studied
   (docs/SKILLS_RESEARCH.md): props start asleep where they were placed and wake
   on touch, the Highbot shoves what it walks into, a throw takes the pointer's
   recent velocity, and a sound plays only when the prop was really moving into
   the contact. */

export interface RoomPlayDeps {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  dom: HTMLElement;
  keep: <T extends { dispose: () => void }>(x: T) => T;
  accent: THREE.Color;
  bot: THREE.Object3D;
  /** Furniture as circles on the floor: [x, z, radius]. */
  solids: Array<[number, number, number]>;
  shadowTex: THREE.Texture;
  room: { w: number; d: number; h: number; front: number };
  reduce: boolean;
  onScore: (total: number) => void;
}

export interface RoomPlay {
  update: (dt: number, t: number) => void;
  grab: (clientX: number, clientY: number) => boolean;
  dragTo: (clientX: number, clientY: number) => void;
  drop: () => void;
}

interface Prop {
  mesh: THREE.Object3D;
  shadow: THREE.Mesh;
  r: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  bounce: number;
  tone: number;
  asleep: boolean;
  lastSound: number;
  prevY: number;
}

const G = 9.8;
const HOOP = { x: 2.7, y: 1.95, z: -2.3, r: 0.7 };
const SOLID_TOP = 1.25; // furniture is treated as this tall

export function createRoomPlay(d: RoomPlayDeps): RoomPlay {
  const { scene, camera, keep, accent } = d;
  const std = (color: THREE.ColorRepresentation, rough: number, metal: number, emissive: THREE.ColorRepresentation = 0x000000, ei = 0) =>
    keep(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, emissive, emissiveIntensity: ei }));
  const glow = (color: THREE.ColorRepresentation, opacity = 1) =>
    keep(new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));

  /* ---- props ---- */
  const props: Prop[] = [];
  const shadowGeo = keep(new THREE.PlaneGeometry(1, 1));
  const addProp = (mesh: THREE.Object3D, r: number, x: number, z: number, bounce: number, tone: number) => {
    mesh.position.set(x, r, z);
    scene.add(mesh);
    const shadow = new THREE.Mesh(shadowGeo, keep(new THREE.MeshBasicMaterial({ map: d.shadowTex, transparent: true, depthWrite: false })));
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
    props.push({ mesh, shadow, r, pos: mesh.position, vel: new THREE.Vector3(), bounce, tone, asleep: true, lastSound: 0, prevY: r });
  };

  // a ball with a band in the Creador's color
  const ballTex = (base: string, band: string) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128;
    const x = c.getContext('2d')!;
    x.fillStyle = base; x.fillRect(0, 0, 256, 128);
    x.fillStyle = band; x.fillRect(0, 50, 256, 28);
    x.fillStyle = '#050505'; for (let i = 0; i < 8; i++) x.fillRect(i * 32 + 12, 58, 8, 12);
    const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; return t;
  };
  const sphere = keep(new THREE.SphereGeometry(1, 28, 20));
  const ball = (base: string, band: string, r: number) => {
    const m = new THREE.Mesh(sphere, keep(new THREE.MeshStandardMaterial({ map: ballTex(base, band), roughness: 0.45, metalness: 0.1 })));
    m.scale.setScalar(r);
    return m;
  };
  addProp(ball('#FDCC0D', '#' + accent.getHexString(), 0.3), 0.3, -1.7, 1.9, 0.72, 170);
  addProp(ball('#32527B', '#00DDFF', 0.24), 0.24, 2.3, 2.4, 0.78, 210);

  // data cubes: a dark shell with glowing edges
  const cubeGeo = keep(new THREE.BoxGeometry(1, 1, 1));
  const edgeGeo = keep(new THREE.EdgesGeometry(cubeGeo));
  const cube = (color: number, s: number) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(cubeGeo, std(0x10141b, 0.35, 0.8, color, 0.35)));
    g.add(new THREE.LineSegments(edgeGeo, keep(new THREE.LineBasicMaterial({ color }))));
    g.scale.setScalar(s);
    return g;
  };
  addProp(cube(0x00ddff, 0.4), 0.27, 1.5, 0.3, 0.42, 320);
  addProp(cube(0xb87000, 0.34), 0.23, -2.7, 0.3, 0.42, 380);

  // a loose gear
  const gear = new THREE.Group();
  const gearMat = std(0xfdcc0d, 0.35, 0.85);
  gear.add(new THREE.Mesh(keep(new THREE.TorusGeometry(0.19, 0.07, 10, 24)), gearMat));
  const tooth = keep(new THREE.BoxGeometry(0.09, 0.12, 0.12));
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(tooth, gearMat);
    const a = (i / 8) * Math.PI * 2;
    m.position.set(Math.cos(a) * 0.27, Math.sin(a) * 0.27, 0);
    m.rotation.z = a + Math.PI / 2;
    gear.add(m);
  }
  addProp(gear, 0.3, 0.9, 2.9, 0.5, 520);

  /* ---- the holo hoop ---- */
  const hoop = new THREE.Group();
  hoop.position.set(HOOP.x, HOOP.y, HOOP.z);
  const rimMat = glow(0xfdcc0d);
  const rim = new THREE.Mesh(keep(new THREE.TorusGeometry(HOOP.r, 0.035, 8, 40)), rimMat);
  rim.rotation.x = Math.PI / 2;
  hoop.add(rim);
  const net = new THREE.Mesh(keep(new THREE.CylinderGeometry(HOOP.r, HOOP.r * 0.55, 0.7, 20, 1, true)),
    keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false, wireframe: true })));
  net.position.y = -0.36;
  hoop.add(net);
  const beam = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, HOOP.y, 6)), glow(accent, 0.35));
  beam.position.set(0, -HOOP.y / 2, -HOOP.r - 0.05);
  hoop.add(beam);
  const hoopLight = new THREE.PointLight(0xfdcc0d, 1.2, 4, 1.8);
  hoop.add(hoopLight);
  scene.add(hoop);
  let score = 0, flash = 0;

  /* ---- room motion ---- */
  // a ring lamp turning under the ceiling
  const lamp = new THREE.Group();
  lamp.position.set(0, d.room.h - 0.75, -0.6);
  const ringA = new THREE.Mesh(keep(new THREE.TorusGeometry(0.7, 0.025, 8, 48)), glow(accent));
  const ringB = new THREE.Mesh(keep(new THREE.TorusGeometry(0.5, 0.02, 8, 40)), glow(0xfdcc0d));
  // the Spatialgineers logo floats in the middle of the rings
  const core = new THREE.Group();
  lamp.add(ringA, ringB, core);
  let logoAlive = true;
  keep({ dispose: () => { logoAlive = false; core.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); } });
  void loadSgxIcon().then((icon) => {
    if (!icon || !logoAlive) return;
    const gear = new THREE.Mesh(icon.gear.clone(), std(0x32527b, 0.3, 0.85, 0x32527b, 0.35));
    const bolt = new THREE.Mesh(icon.bolt.clone(), std(0xfdcc0d, 0.3, 0.6, 0xfdcc0d, 0.9));
    core.add(gear, bolt);
    core.scale.setScalar(0.85);
  });
  scene.add(lamp);

  // the SGX drone from the drone game patrols the room
  const rig = createDrone();
  const drone = rig.group;
  drone.scale.setScalar(0.24);
  rig.shield.visible = false;
  rig.glow.intensity = 1.5; rig.glow.distance = 4;
  keep({ dispose: () => disposeObject(drone) });
  scene.add(drone);

  // dust in the light
  const DUST = d.reduce ? 0 : 140;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * d.room.w;
    dustPos[i * 3 + 1] = Math.random() * d.room.h;
    dustPos[i * 3 + 2] = -d.room.d / 2 + Math.random() * (d.room.d / 2 + d.room.front);
  }
  const dustGeo = keep(new THREE.BufferGeometry());
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({ color: 0xbfe9ff, size: 0.03, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending })));
  if (DUST) scene.add(dust);

  // ripples where something lands
  const rippleGeo = keep(new THREE.RingGeometry(0.9, 1, 40));
  const ripples = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(rippleGeo, keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0, depthWrite: false })));
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.025;
    m.visible = false;
    scene.add(m);
    return { m, life: 0 };
  });
  let nextRipple = 0;
  const ripple = (x: number, z: number) => {
    const r = ripples[nextRipple++ % ripples.length];
    r.life = 1; r.m.visible = true; r.m.position.x = x; r.m.position.z = z;
  };

  /* ---- sound: only when the prop was moving into the contact ---- */
  let quietUntil = performance.now() + 1500;
  const thud = (p: Prop, speed: number) => {
    const now = performance.now();
    if (speed < 0.45 || p === held || now < quietUntil || now - p.lastSound < 150) return;
    p.lastSound = now;
    playUiChirp(p.tone * (0.9 + Math.min(speed, 8) * 0.03), 'triangle', 0.05);
  };

  /* ---- grab and throw ---- */
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const target = new THREE.Vector3();
  const handVel = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  let held: Prop | null = null;
  let heldAt = 0, heldMoved = 0;
  // where the pointer has been in the last moments: the throw comes from this, not from
  // the frame rate, so a slow phone throws as far as a fast one
  const trail: Array<{ t: number; p: THREE.Vector3 }> = [];
  const aim = (cx: number, cy: number) => {
    const b = d.dom.getBoundingClientRect();
    ndc.set(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
  };
  const clampInside = (p: Prop, v: THREE.Vector3) => {
    v.x = THREE.MathUtils.clamp(v.x, -d.room.w / 2 + p.r, d.room.w / 2 - p.r);
    v.y = THREE.MathUtils.clamp(v.y, p.r, d.room.h - 0.5);
    v.z = THREE.MathUtils.clamp(v.z, -d.room.d / 2 + p.r, d.room.front - p.r);
  };

  const grab = (cx: number, cy: number) => {
    aim(cx, cy);
    let best: Prop | null = null, bestT = Infinity;
    for (const p of props) {
      // a generous target: fingers are bigger than a pointer
      const hitR = p.r * 1.6;
      tmp.copy(p.pos).sub(ray.ray.origin);
      const along = tmp.dot(ray.ray.direction);
      if (along < 0) continue;
      const miss = tmp.lengthSq() - along * along;
      if (miss < hitR * hitR && along < bestT) { best = p; bestT = along; }
    }
    if (!best) return false;
    held = best; best.asleep = false; best.vel.set(0, 0, 0);
    heldAt = performance.now(); heldMoved = 0;
    handVel.set(0, 0, 0);
    trail.length = 0;
    camera.getWorldDirection(tmp);
    plane.setFromNormalAndCoplanarPoint(tmp, best.pos);
    target.copy(best.pos);
    return true;
  };
  const dragTo = (cx: number, cy: number) => {
    if (!held) return;
    aim(cx, cy);
    if (ray.ray.intersectPlane(plane, tmp)) { heldMoved += tmp.distanceTo(target); target.copy(tmp); clampInside(held, target);
      trail.push({ t: performance.now(), p: target.clone() });
      if (trail.length > 12) trail.shift();
    }
  };
  const drop = () => {
    if (!held) return;
    const p = held; held = null;
    if (performance.now() - heldAt < 240 && heldMoved < 0.15) {
      p.vel.set((Math.random() - 0.5) * 0.8, 3.4, -2.4); // a tap is a nudge
    } else {
      const now = performance.now();
      const recent = trail.filter((q) => now - q.t < 220);
      if (recent.length >= 2) {
        const a = recent[0], b = recent[recent.length - 1];
        handVel.subVectors(b.p, a.p).divideScalar(Math.max((b.t - a.t) / 1000, 0.016));
      } else handVel.set(0, 0, 0);
      p.pos.copy(target);
      p.vel.copy(handVel);
      const s = p.vel.length();
      if (s > 11) p.vel.multiplyScalar(11 / s);
      // the drag happens on a plane facing the camera: a flick upward also goes into the room
      if (s > 1.2) p.vel.z -= 0.5 + Math.max(0, p.vel.y) * 0.45;
      // Aim help: a flick that points at the hoop bends toward the arc that goes in.
      // The drag has no depth, so without this the hoop is a matter of luck.
      if (s > 2.5 && handVel.y > 1) {
        const T = 0.9;
        const ix = (HOOP.x - p.pos.x) / T, iz = (HOOP.z - p.pos.z) / T;
        const iy = (HOOP.y - p.pos.y + 0.5 * G * T * T) / T;
        // compare what the Creador drew (sideways and up) with the ideal arc
        const cos = (handVel.x * ix + handVel.y * iy) / (Math.hypot(handVel.x, handVel.y) * Math.hypot(ix, iy) || 1);
        const k = cos > 0.85 ? 1 : cos > 0.6 ? 0.5 : 0;
        p.vel.x += (ix - p.vel.x) * k; p.vel.y += (iy - p.vel.y) * k; p.vel.z += (iz - p.vel.z) * k;
      }
    }

  };

  /* ---- the solver ---- */
  const botPrev = new THREE.Vector3().copy(d.bot.position);
  const botVel = new THREE.Vector3();
  const step = (p: Prop, dt: number) => {
    p.prevY = p.pos.y;
    p.vel.y -= G * dt;
    p.pos.addScaledVector(p.vel, dt);
    // floor
    if (p.pos.y < p.r) {
      p.pos.y = p.r;
      if (p.vel.y < -0.45) { thud(p, -p.vel.y); if (p.vel.y < -1.6) ripple(p.pos.x, p.pos.z); }
      p.vel.y = p.vel.y < -0.6 ? -p.vel.y * p.bounce : 0;
      const f = Math.exp(-1.6 * dt);
      p.vel.x *= f; p.vel.z *= f;
      if (p.vel.lengthSq() < 0.0025) { p.vel.set(0, 0, 0); p.asleep = true; }
    }
    if (p.pos.y > d.room.h - p.r) { p.pos.y = d.room.h - p.r; p.vel.y = -Math.abs(p.vel.y) * p.bounce; }
    // walls (the open front is a wall you cannot see)
    const wx = d.room.w / 2 - p.r;
    if (Math.abs(p.pos.x) > wx) { thud(p, Math.abs(p.vel.x)); p.pos.x = Math.sign(p.pos.x) * wx; p.vel.x *= -p.bounce; }
    const zb = -d.room.d / 2 + p.r, zf = d.room.front - p.r;
    if (p.pos.z < zb) { thud(p, -p.vel.z); p.pos.z = zb; p.vel.z *= -p.bounce; }
    if (p.pos.z > zf) { p.pos.z = zf; p.vel.z *= -p.bounce; }
    // furniture
    if (p.pos.y < SOLID_TOP) {
      for (const [sx, sz, sr] of d.solids) {
        const dx = p.pos.x - sx, dz = p.pos.z - sz, dist = Math.hypot(dx, dz), min = sr + p.r;
        if (dist < min && dist > 1e-4) {
          const nx = dx / dist, nz = dz / dist;
          p.pos.x = sx + nx * min; p.pos.z = sz + nz * min;
          const vn = p.vel.x * nx + p.vel.z * nz;
          if (vn < 0) { thud(p, -vn); p.vel.x -= (1 + p.bounce) * vn * nx; p.vel.z -= (1 + p.bounce) * vn * nz; }
        }
      }
    }
    // a little help on the way down, so a near miss on a phone still goes in
    if (p.vel.y < 0 && p.pos.y > HOOP.y && p.pos.y < HOOP.y + 1.3) {
      const hx = HOOP.x - p.pos.x, hz = HOOP.z - p.pos.z;
      if (hx * hx + hz * hz < 1.7) { p.vel.x += hx * 5 * dt; p.vel.z += hz * 5 * dt; }
    }
    // through the hoop, from above
    if (p.prevY > HOOP.y && p.pos.y <= HOOP.y && Math.hypot(p.pos.x - HOOP.x, p.pos.z - HOOP.z) < HOOP.r - p.r * 0.4) {
      score++; flash = 1;
      playCyberBurstSound('kudos');
      d.onScore(score);
    }
  };

  const update = (dt: number, t: number) => {
    botVel.copy(d.bot.position).sub(botPrev).divideScalar(Math.max(dt, 1e-3));
    botPrev.copy(d.bot.position);

    // the prop in hand follows the pointer; its recent velocity is the throw
    if (held) {
      held.pos.lerp(target, Math.min(1, dt * 18));
    }

    // the Highbot shoves what it walks into, and wakes it
    for (const p of props) {
      if (p === held || p.pos.y > 2) continue;
      const dx = p.pos.x - d.bot.position.x, dz = p.pos.z - d.bot.position.z, dist = Math.hypot(dx, dz), min = 0.45 + p.r;
      if (dist < min) {
        const nx = dist > 1e-4 ? dx / dist : 0, nz = dist > 1e-4 ? dz / dist : 1;
        p.pos.x = d.bot.position.x + nx * min; p.pos.z = d.bot.position.z + nz * min;
        const push = botVel.length();
        if (push > 0.2 || !p.asleep) {
          p.asleep = false;
          p.vel.x = nx * (push * 1.25 + 0.6); p.vel.z = nz * (push * 1.25 + 0.6);
          p.vel.y = Math.max(p.vel.y, push * 0.45);
        }
      }
    }

    // props against each other
    for (let i = 0; i < props.length; i++) for (let j = i + 1; j < props.length; j++) {
      const a = props[i], b = props[j];
      if (a.asleep && b.asleep) continue;
      tmp.subVectors(b.pos, a.pos);
      const dist = tmp.length(), min = a.r + b.r;
      if (dist >= min || dist < 1e-4) continue;
      tmp.divideScalar(dist);
      const over = (min - dist) / 2;
      if (a !== held) a.pos.addScaledVector(tmp, -over);
      if (b !== held) b.pos.addScaledVector(tmp, over);
      const rel = (b.vel.x - a.vel.x) * tmp.x + (b.vel.y - a.vel.y) * tmp.y + (b.vel.z - a.vel.z) * tmp.z;
      if (rel < 0) {
        const k = -rel * 0.85;
        if (a !== held) a.vel.addScaledVector(tmp, -k);
        if (b !== held) b.vel.addScaledVector(tmp, k);
        thud(a, -rel);
        a.asleep = false; b.asleep = false;
      }
    }

    // two small steps are steadier than one big one
    const h = dt / 2;
    for (const p of props) {
      if (p !== held && !p.asleep) { step(p, h); step(p, h); }
      // roll with the motion
      const sp = Math.hypot(p.vel.x, p.vel.z);
      if (sp > 0.02 && !d.reduce) {
        tmp.set(p.vel.z, 0, -p.vel.x).normalize();
        p.mesh.rotateOnWorldAxis(tmp, (sp / p.r) * dt);
      }
      p.shadow.position.set(p.pos.x, 0.021, p.pos.z);
      const lift = Math.max(0, p.pos.y - p.r);
      p.shadow.scale.setScalar(p.r * (2.6 + lift * 0.8));
      (p.shadow.material as THREE.MeshBasicMaterial).opacity = Math.max(0.12, 0.85 - lift * 0.3);
    }

    // hoop
    flash = Math.max(0, flash - dt * 1.4);
    rim.scale.setScalar(1 + flash * 0.25);
    hoopLight.intensity = 1.2 + flash * 9;
    net.rotation.y = t * 0.4;
    hoop.position.y = HOOP.y + (d.reduce ? 0 : Math.sin(t * 1.3) * 0.03);

    // room motion
    if (!d.reduce) {
      ringA.rotation.set(t * 0.5, t * 0.3, 0);
      ringB.rotation.set(-t * 0.4, 0, t * 0.6 + flash * 6);
      core.rotation.set(0, Math.sin(t * 0.5) * 0.6, 0);
      core.position.y = Math.sin(t * 1.2) * 0.06;
      const a = t * 0.22;
      const px = Math.cos(a) * 4.2, pz = -0.4 + Math.sin(a) * 2.6;
      drone.rotation.y = Math.atan2(px - drone.position.x, pz - drone.position.z) + Math.PI; // its nose is -z
      drone.position.set(px, 3.15 + Math.sin(t * 1.7) * 0.12, pz);
      rig.body.rotation.z = Math.sin(t * 1.1) * 0.1;
      rig.body.rotation.x = 0.12;
      rig.rotors.forEach((r, i) => { r.rotation.y = t * (i % 2 ? -34 : 34); });
      for (let i = 0; i < DUST; i++) {
        let y = dustPos[i * 3 + 1] + dt * (0.04 + (i % 5) * 0.012);
        if (y > d.room.h) y = 0;
        dustPos[i * 3 + 1] = y;
        dustPos[i * 3] += Math.sin(t * 0.3 + i) * dt * 0.02;
      }
      if (DUST) dustGeo.attributes.position.needsUpdate = true;
    } else {
      drone.position.set(4.2, 3.15, -0.4);
    }
    for (const r of ripples) {
      if (r.life <= 0) continue;
      r.life -= dt * 1.8;
      const k = 1 - r.life;
      r.m.scale.setScalar(0.25 + k * 0.9);
      (r.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, r.life) * 0.7;
      if (r.life <= 0) r.m.visible = false;
    }
  };

  return { update, grab, dragTo, drop };
}
