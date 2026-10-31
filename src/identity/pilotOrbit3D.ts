import * as THREE from 'three';
import { buildHighbot3D, type Pilot3D } from './highbot3d';
import { studioEnvironment } from './highbotStudio';
import type { PilotConfig } from './pilotAvatar';

/* PILOTO EN ÓRBITA: your Holo Card (or your SGX Pass when you haven't
   exported one) flies around the 3D core and drifts toward the pillar you
   are visiting. On Day 3, every SGX Pass checked in at Chroma joins the
   orbit as a small card: the core becomes the room. */

export interface PilotCardInfo {
  image?: string | null; // Holo Card export (JPEG data URL)
  name?: string;
  callsign?: string;
  serial?: string;
  accent?: string;
  forged: boolean;
}

const CARD_W = 26;
const CARD_H = CARD_W * (660 / 1050);
const MAX_CROWD = 60;

function passTexture(info: PilotCardInfo): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1050;
  c.height = 660;
  const ctx = c.getContext('2d')!;
  const accent = info.accent || '#FDCC0D';
  const g = ctx.createLinearGradient(0, 0, 1050, 660);
  g.addColorStop(0, '#15181e');
  g.addColorStop(0.5, '#1a1a1a');
  g.addColorStop(1, '#050505');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(48, 0); ctx.lineTo(1050, 0); ctx.lineTo(1050, 612); ctx.lineTo(1002, 660); ctx.lineTo(0, 660); ctx.lineTo(0, 48);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.fillStyle = '#FDCC0D';
  ctx.font = '800 64px Orbitron, sans-serif';
  ctx.fillText('SGX PASS', 60, 120);
  ctx.fillStyle = accent;
  ctx.font = '700 72px "Share Tech Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(info.forged ? `#${info.serial || '----'}` : '#----', 990, 120);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 84px Orbitron, sans-serif';
  const name = info.forged ? (info.name || '').toUpperCase() : 'FORJA TU PASE';
  ctx.fillText(name.length > 18 ? `${name.slice(0, 17)}…` : name, 60, 330);
  ctx.fillStyle = '#00DDFF';
  ctx.font = '600 56px "Share Tech Mono", monospace';
  ctx.fillText(info.forged ? info.callsign || '' : 'TOCA PARA EMPEZAR', 60, 420);
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '500 34px "Share Tech Mono", monospace';
  ctx.fillText('SPATIALGINEERS SUMMIT 2026 · 11–13 DIC', 60, 590);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function crowdTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#111317';
  ctx.fillRect(0, 0, 256, 160);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 154);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 30px Orbitron, sans-serif';
  ctx.fillText('SGX PASS', 18, 52);
  ctx.font = '600 22px monospace';
  ctx.fillText('PRESENTE', 18, 104);
  ctx.fillText('CHROMA', 18, 134);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createPilotOrbit(scene: THREE.Scene, renderer?: THREE.WebGLRenderer) {
  const group = new THREE.Group();
  scene.add(group);
  // the core has no environment of its own: the figure brings the studio's reflections
  let studio: THREE.Texture | null = null;

  // The pilot's own card
  const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
  const cardMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const card = new THREE.Mesh(cardGeo, cardMat);
  card.userData = { type: 'PILOT_CARD' };
  const glowGeo = new THREE.PlaneGeometry(CARD_W * 1.18, CARD_H * 1.3);
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const glow = new THREE.Mesh(glowGeo, glowMat);
  glow.position.z = -0.2;
  const cardRig = new THREE.Group();
  cardRig.add(glow, card);
  group.add(cardRig);

  // The pilot's 3D avatar flies next to the card.
  const avatarRig = new THREE.Group();
  avatarRig.position.set(CARD_W / 2 + 6, -2.5, 2);
  avatarRig.scale.setScalar(5);
  avatarRig.userData = { type: 'PILOT_CARD' };
  cardRig.add(avatarRig);
  let avatar: Pilot3D | null = null;
  let avatarKey = '';

  // Tether from the core to the card, like a pillar beam
  const tetherGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const tetherMat = new THREE.LineBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.35 });
  const tether = new THREE.Line(tetherGeo, tetherMat);
  group.add(tether);

  // Day 3 crowd: one small card per check-in
  const crowdTex = crowdTexture();
  const crowdGeo = new THREE.PlaneGeometry(5.2, 3.25);
  const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  const crowd = new THREE.InstancedMesh(crowdGeo, crowdMat, MAX_CROWD);
  crowd.count = 0;
  const palette = [0xfdcc0d, 0x00ddff, 0xffbb00];
  for (let i = 0; i < MAX_CROWD; i++) crowd.setColorAt(i, new THREE.Color(palette[i % 3]));
  group.add(crowd);

  let texture: THREE.Texture | null = null;
  let crowdCount = 0;
  const pos = new THREE.Vector3(0, 14, 40);
  const target = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  let disposed = false;

  const setTexture = (t: THREE.Texture) => {
    texture?.dispose();
    texture = t;
    cardMat.map = t;
    cardMat.needsUpdate = true;
  };

  return {
    setCard(info: PilotCardInfo) {
      setTexture(passTexture(info));
      glowMat.color.set(info.accent || '#FDCC0D');
      tetherMat.color.set(info.accent || '#FDCC0D');
      if (info.image) {
        new THREE.TextureLoader().load(info.image, (t) => {
          if (disposed) { t.dispose(); return; }
          t.colorSpace = THREE.SRGBColorSpace;
          setTexture(t);
        });
      }
    },
    /** The visitor's avatar (null: no pass yet, no figure). */
    setAvatar(cfg: PilotConfig | null) {
      const k = cfg ? JSON.stringify(cfg) : '';
      if (k === avatarKey) return;
      avatarKey = k;
      if (avatar) { avatarRig.remove(avatar.group); avatar.dispose(); avatar = null; }
      if (!cfg) return;
      if (!studio && renderer) studio = studioEnvironment(renderer);
      buildHighbot3D(cfg, { envMap: studio }).then((p) => {
        if (disposed || avatarKey !== k) { p.dispose(); return; }
        avatar = p;
        avatarRig.add(p.group);
      }).catch(() => undefined);
    },
    setCrowd(n: number) {
      crowdCount = Math.max(0, Math.min(MAX_CROWD, n));
      crowd.count = crowdCount;
    },
    /** activePillar: world position of the pillar being visited (or null at the core). */
    update(elapsed: number, camera: THREE.Camera, activePillar: THREE.Vector3 | null) {
      // Own orbit around the core; pulled toward the active pillar.
      const a = elapsed * 0.32;
      target.set(Math.cos(a) * 34, 16 + Math.sin(elapsed * 1.3) * 2.2, Math.sin(a) * 34);
      if (activePillar && activePillar.lengthSq() > 1) {
        target.lerp(new THREE.Vector3(activePillar.x * 0.78, activePillar.y + 15, activePillar.z * 0.78), 0.72);
      }
      pos.lerp(target, 0.035);
      cardRig.position.copy(pos);
      cardRig.lookAt(camera.position);
      // Phones (portrait): a smaller card so it never covers the pillars.
      const aspect = (camera as THREE.PerspectiveCamera).aspect || 1.6;
      cardRig.scale.setScalar(aspect < 0.8 ? 0.55 : 1);
      cardRig.rotateZ(Math.sin(elapsed * 0.9) * 0.05);
      glowMat.opacity = 0.14 + Math.sin(elapsed * 2.4) * 0.06;
      if (avatar) {
        avatar.update(elapsed);
        avatarRig.rotation.y = -0.35 + Math.sin(elapsed * 0.5) * 0.35;
      }
      const p = tetherGeo.attributes.position as THREE.BufferAttribute;
      p.setXYZ(1, pos.x, pos.y - CARD_H / 2, pos.z);
      p.needsUpdate = true;

      // Crowd on an outer, slower ring, facing the camera.
      for (let i = 0; i < crowdCount; i++) {
        const ang = (i / Math.max(crowdCount, 1)) * Math.PI * 2 - elapsed * 0.06;
        const r = 92 + (i % 3) * 7;
        dummy.position.set(Math.cos(ang) * r, 24 + Math.sin(elapsed * 0.8 + i) * 3 + (i % 4) * 2, Math.sin(ang) * r);
        dummy.lookAt(camera.position);
        dummy.updateMatrix();
        crowd.setMatrixAt(i, dummy.matrix);
      }
      if (crowdCount) crowd.instanceMatrix.needsUpdate = true;
    },
    hit(raycaster: THREE.Raycaster): boolean {
      return raycaster.intersectObject(card, false).length > 0 || (!!avatar && raycaster.intersectObject(avatarRig, true).length > 0);
    },
    worldPosition(out: THREE.Vector3) {
      return out.copy(pos);
    },
    dispose() {
      disposed = true;
      avatar?.dispose();
      studio?.dispose();
      scene.remove(group);
      texture?.dispose();
      cardGeo.dispose(); cardMat.dispose(); glowGeo.dispose(); glowMat.dispose();
      tetherGeo.dispose(); tetherMat.dispose();
      crowdTex.dispose(); crowdGeo.dispose(); crowdMat.dispose(); crowd.dispose();
    },
  };
}

export type PilotOrbit = ReturnType<typeof createPilotOrbit>;
