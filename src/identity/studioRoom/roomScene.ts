import * as THREE from 'three';
import { createRoomPlay } from './roomPlay';
import { loadSgxIcon } from '../sgxIcon3d';
import { WALK_LEG } from '../highbot3d';
import { buildHighbot3D, type Pilot3D } from '../highbot3d';
import { studioEnvironment, studioRenderer } from '../highbotStudio';
import type { PilotConfig } from '../pilotAvatar';

/* Tu Estudio 3D: the Creador's own room. Their Highbot walks around a small
   studio with a workstation (the monitor shows their pass numbers), a wall of
   the Holo Cards of the Creadores they connected with, a shelf with the six
   pillar stamps and a portal back to the core. Plain three.js, no physics:
   the room is a box and the furniture is a handful of circles to walk around. */

export type StationId = 'computer' | 'wall' | 'shelf' | 'capsule' | 'pass' | 'portal';
/** The Creador's role on the Summit, as their pass shows it. */
export type RoomRole = 'visitor' | 'speaker' | 'sponsor' | 'press' | 'initiate';

export interface RoomCard {
  name: string;
  callsign: string;
  org?: string;
  color: string;
}

export interface RoomData {
  pilot: PilotConfig;
  accent: string;
  callsign: string;
  xp: number;
  missionsDone: number;
  missionsTotal: number;
  /** Pillar colors in official order, with whether its stamp is earned. */
  stamps: Array<{ label: string; color: string; earned: boolean }>;
  cards: RoomCard[];
  myHolo?: string;
  es: boolean;
  /** Official role: it puts its own object in the room. */
  role?: RoomRole;
  /** Creador level: the room gets brighter and more colorful as it climbs. */
  level?: number;
}

export interface StudioRoom {
  /** Joystick vector, each axis -1..1 (x right, y forward). */
  setMove: (x: number, y: number) => void;
  /** Pick up the prop under the pointer. False when there is none there. */
  grab: (clientX: number, clientY: number) => boolean;
  dragTo: (clientX: number, clientY: number) => void;
  drop: () => void;
  /** The Holo Card under the pointer: -1 is your own, 0+ a contact, null none. */
  pickCard: (clientX: number, clientY: number) => number | null;
  dispose: () => void;
}

const W = 12, D = 9, H = 4.2;
const SPEED = 2.7;
const STATIONS: Array<{ id: StationId; x: number; z: number; r: number }> = [
  { id: 'computer', x: -4.1, z: -1.4, r: 1.7 },
  { id: 'wall', x: 0, z: -3.3, r: 1.9 },
  { id: 'shelf', x: 4.7, z: 0.6, r: 1.6 },
  { id: 'portal', x: 4.3, z: -3.2, r: 1.35 },
  { id: 'capsule', x: -4.6, z: 0.6, r: 1.2 },
  { id: 'pass', x: 4.0, z: 3.0, r: 1.25 },
];
/** Things the Highbot walks around: [x, z, radius]. */
const SOLIDS: Array<[number, number, number]> = [[-5.1, -1.4, 1.15], [-3.7, -1.4, 0.45], [5.5, 0.6, 0.75], [4.5, -3.6, 0.6], [-5.3, 2.6, 0.7], [-5.3, 0.6, 0.5], [4.6, 3.0, 0.45]];

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, max?: number) {
  ctx.font = font; ctx.fillStyle = color;
  let t = s;
  if (max) while (t.length > 3 && ctx.measureText(t).width > max) t = t.slice(0, -2);
  ctx.fillText(t === s ? s : t + '…', x, y);
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d');
  if (c) draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export function createStudioRoom(host: HTMLElement, data: RoomData, onNear: (s: StationId | null) => void, onReady?: () => void, onScore?: (total: number) => void): StudioRoom | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch {
    return null;
  }
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
  studioRenderer(renderer, false);
  renderer.setClearColor(0x050505, 1);
  host.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';

  // furniture as circles on the floor; the role object adds one, so each room gets its own copy
  const solids: Array<[number, number, number]> = SOLIDS.map((c) => [...c] as [number, number, number]);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x050505, 14, 30);
  const env = studioEnvironment(renderer);
  scene.environment = env;
  scene.environmentIntensity = 0.5;
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 80);

  const trash: Array<{ dispose: () => void }> = [env];
  const keep = <T extends { dispose: () => void }>(x: T): T => { trash.push(x); return x; };
  const accent = new THREE.Color(data.accent);
  const std = (color: THREE.ColorRepresentation, rough = 0.6, metal = 0.3) => keep(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }));
  const glow = (color: THREE.ColorRepresentation, opacity = 1) => keep(new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity }));
  const box = (w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = scene) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };

  /* ---- shell: floor with a grid, three walls, light strips in the Creador's color ---- */
  const floorTex = keep(canvasTex(512, 512, (c) => {
    c.fillStyle = '#0b0d11'; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = 'rgba(0,221,255,0.16)'; c.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.moveTo(0, i); c.lineTo(512, i); c.stroke(); }
  }));
  floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(W / 2, (D + 6) / 2);
  const floor = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D + 6)), keep(new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.35, metalness: 0.55 })));
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = 3;
  scene.add(floor);
  const wallTex = keep(canvasTex(512, 512, (c) => {
    c.fillStyle = '#1b212b'; c.fillRect(0, 0, 512, 512);
    c.fillStyle = '#161b24'; c.fillRect(0, 0, 512, 90);
    c.strokeStyle = 'rgba(255,255,255,0.07)'; c.lineWidth = 3;
    for (let i = 0; i <= 512; i += 128) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 512); c.stroke(); }
    c.strokeStyle = 'rgba(0,221,255,0.18)'; c.beginPath(); c.moveTo(0, 90); c.lineTo(512, 90); c.stroke();
  }));
  wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping;
  wallTex.repeat.set(4, 1);
  const wallMat = keep(new THREE.MeshStandardMaterial({ map: wallTex, roughness: 0.8, metalness: 0.15 }));
  box(W, H, 0.2, wallMat, 0, H / 2, -D / 2 - 0.1);
  box(0.2, H, D + 6, wallMat, -W / 2 - 0.1, H / 2, 3);
  box(0.2, H, D + 6, wallMat, W / 2 + 0.1, H / 2, 3);
  box(W, 0.1, D + 6, std(0x0d1016, 0.9, 0.1), 0, H + 0.05, 3);
  const strip = glow(accent);
  box(W, 0.05, 0.05, strip, 0, H - 0.25, -D / 2 + 0.03);
  box(W, 0.05, 0.05, strip, 0, 0.06, -D / 2 + 0.03);
  box(0.05, 0.05, D, strip, -W / 2 + 0.03, 0.06, 0);
  box(0.05, 0.05, D, strip, W / 2 - 0.03, 0.06, 0);
  box(0.05, 0.05, D, glow(0x00ddff), -W / 2 + 0.03, H - 0.25, 0);
  box(0.05, 0.05, D, glow(0x00ddff), W / 2 - 0.03, H - 0.25, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x2a3344, 2.4));
  const ceilingBar = glow(0xdfeaff);
  [-3, 0, 3].forEach((x) => {
    box(0.18, 0.04, 5.5, ceilingBar, x, H - 0.02, -1);
    const l = new THREE.PointLight(0xdfeaff, 9, 9, 1.4);
    l.position.set(x, H - 0.5, -1);
    scene.add(l);
  });
  // spawn pad: a hex plate with a ring in the Creador's color
  const pad = new THREE.Mesh(keep(new THREE.CylinderGeometry(1.25, 1.35, 0.06, 6)), std(0x161a21, 0.5, 0.7));
  pad.position.set(0, 0.03, 1.2);
  scene.add(pad);
  const padRing = new THREE.Mesh(keep(new THREE.TorusGeometry(1.28, 0.025, 6, 6)), glow(accent));
  padRing.rotation.x = Math.PI / 2;
  padRing.rotation.z = Math.PI / 6;
  padRing.position.set(0, 0.07, 1.2);
  scene.add(padRing);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 7, 6);
  scene.add(key);

  /* ---- workstation: desk, monitor with the pass numbers, keyboard, chair, lamp ---- */
  const desk = new THREE.Group();
  desk.position.set(-5.1, 0, -1.4);
  scene.add(desk);
  const dark = std(0x1b1f27, 0.5, 0.6);
  box(1.1, 0.08, 2.6, dark, 0, 0.95, 0, desk);
  box(0.08, 0.95, 0.08, dark, 0.45, 0.47, 1.2, desk);
  box(0.08, 0.95, 0.08, dark, 0.45, 0.47, -1.2, desk);
  box(0.9, 0.95, 0.08, dark, -0.1, 0.47, 1.26, desk);
  box(0.9, 0.95, 0.08, dark, -0.1, 0.47, -1.26, desk);
  const es = data.es;
  const screenTex = keep(canvasTex(640, 400, (c) => {
    c.fillStyle = '#05080f'; c.fillRect(0, 0, 640, 400);
    c.strokeStyle = data.accent; c.lineWidth = 6; c.strokeRect(10, 10, 620, 380);
    text(c, es ? 'TU ESTUDIO' : 'YOUR STUDIO', 34, 62, '700 26px monospace', '#00DDFF');
    text(c, (data.callsign || (es ? 'CREADOR' : 'CREATOR')).toUpperCase(), 34, 128, '900 52px sans-serif', '#ffffff', 570);
    text(c, `${data.xp} XP`, 34, 218, '900 76px sans-serif', data.accent);
    text(c, `${es ? 'MISIONES' : 'MISSIONS'}  ${data.missionsDone}/${data.missionsTotal}`, 34, 282, '700 30px monospace', '#e5e7eb');
    c.fillStyle = '#1f2937'; c.fillRect(34, 306, 572, 18);
    c.fillStyle = data.accent; c.fillRect(34, 306, 572 * (data.missionsTotal ? data.missionsDone / data.missionsTotal : 0), 18);
    text(c, 'SPATIALGINEERS SUMMIT 2026 · 11–13 DIC', 34, 366, '400 22px monospace', '#9ca3af');
  }));
  const monitor = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 0.94)), keep(new THREE.MeshBasicMaterial({ map: screenTex })));
  monitor.position.set(-0.22, 1.68, 0);
  monitor.rotation.y = Math.PI / 2;
  desk.add(monitor);
  box(0.06, 1.02, 1.6, std(0x0a0c10, 0.4, 0.7), -0.26, 1.68, 0, desk);
  box(0.1, 0.3, 0.12, dark, -0.26, 1.13, 0, desk);
  box(0.3, 0.03, 0.5, dark, -0.22, 1.0, 0, desk);
  box(0.24, 0.03, 0.8, std(0x2a2f3a, 0.6, 0.3), 0.2, 1.0, 0, desk);
  box(0.1, 0.03, 0.14, glow(accent), 0.22, 1.0, 0.62, desk);
  const lampPole = box(0.04, 0.6, 0.04, dark, -0.3, 1.29, -1.0, desk);
  lampPole.rotation.z = -0.25;
  box(0.3, 0.05, 0.12, glow(0xfff2c4), -0.18, 1.6, -1.0, desk);
  const screenLight = new THREE.PointLight(accent, 2.5, 5, 1.8);
  screenLight.position.set(0.9, 1.7, 0);
  desk.add(screenLight);
  // chair, turned to the desk
  const chair = new THREE.Group();
  chair.position.set(-3.7, 0, -1.4);
  scene.add(chair);
  box(0.55, 0.08, 0.55, std(0x20252e, 0.7, 0.2), 0, 0.5, 0, chair);
  box(0.08, 0.7, 0.55, std(0x20252e, 0.7, 0.2), 0.27, 0.86, 0, chair);
  box(0.08, 0.5, 0.08, dark, 0, 0.25, 0, chair);
  box(0.5, 0.04, 0.5, dark, 0, 0.03, 0, chair);
  box(0.02, 0.5, 0.3, glow(accent), 0.32, 0.9, 0, chair);

  const poster = new THREE.Mesh(keep(new THREE.PlaneGeometry(2.6, 1.5)), keep(new THREE.MeshBasicMaterial({ map: keep(canvasTex(780, 450, (c) => {
    c.fillStyle = '#05080f'; c.fillRect(0, 0, 780, 450);
    c.strokeStyle = '#FDCC0D'; c.lineWidth = 6; c.strokeRect(8, 8, 764, 434);
    text(c, 'SPATIALGINEERS', 44, 150, '900 74px sans-serif', '#ffffff');
    text(c, 'SUMMIT 2026', 44, 240, '900 74px sans-serif', '#FDCC0D');
    text(c, es ? '11–13 DIC · YOUTUBE LIVE' : 'DEC 11–13 · YOUTUBE LIVE', 44, 316, '700 34px monospace', '#00DDFF');
    text(c, 'CHROMA SPACE STUDIOS · SAN JUAN', 44, 372, '400 28px monospace', '#9ca3af');
  })) })));
  poster.rotation.y = Math.PI / 2;
  poster.position.set(-W / 2 + 0.03, 2.5, 2.6);
  scene.add(poster);
  const sofaMat = std(0x232a36, 0.9, 0.05);
  box(0.9, 0.42, 2.2, sofaMat, -5.4, 0.21, 2.6);
  box(0.25, 0.75, 2.2, sofaMat, -5.8, 0.6, 2.6);
  box(0.9, 0.6, 0.22, sofaMat, -5.4, 0.3, 1.45);
  box(0.9, 0.6, 0.22, sofaMat, -5.4, 0.3, 3.75);
  box(0.04, 0.04, 2.2, glow(accent), -4.94, 0.06, 2.6);

  /* ---- back wall: Holo Cards of the Creadores you connected with ---- */
  const cardGeo = keep(new THREE.PlaneGeometry(1.5, 0.94));
  const cardHits: Array<{ m: THREE.Mesh; index: number }> = [];
  const slots = 8;
  const loader = new THREE.TextureLoader();
  for (let i = 0; i < slots; i++) {
    const col = i % 4, row = Math.floor(i / 4);
    const x = -2.7 + col * 1.8, y = 2.75 - row * 1.15;
    const card = i === 0 ? null : data.cards[i - 1];
    let mat: THREE.Material;
    if (i === 0 && data.myHolo) {
      const t = keep(loader.load(data.myHolo));
      t.colorSpace = THREE.SRGBColorSpace;
      mat = keep(new THREE.MeshBasicMaterial({ map: t }));
    } else if (i === 0 || card) {
      const c0 = card || { name: data.callsign || (es ? 'Tu Holo Card' : 'Your Holo Card'), callsign: es ? 'TU PASE' : 'YOUR PASS', color: data.accent, org: '' };
      mat = keep(new THREE.MeshBasicMaterial({ map: keep(canvasTex(480, 300, (c) => {
        c.fillStyle = '#0a0d13'; c.fillRect(0, 0, 480, 300);
        c.fillStyle = c0.color; c.fillRect(0, 0, 480, 14); c.fillRect(0, 0, 14, 300);
        c.strokeStyle = c0.color; c.lineWidth = 3; c.strokeRect(2, 2, 476, 296);
        text(c, 'HOLO CARD', 40, 62, '700 20px monospace', '#00DDFF');
        text(c, c0.name || c0.callsign, 40, 138, '900 40px sans-serif', '#ffffff', 410);
        text(c, c0.callsign, 40, 186, '700 26px monospace', c0.color, 410);
        if (c0.org) text(c, c0.org, 40, 230, '400 22px sans-serif', '#cbd5e1', 410);
        text(c, 'SPATIALGINEERS SUMMIT 2026', 40, 274, '400 16px monospace', '#6b7280');
      })) }));
    } else {
      mat = keep(new THREE.MeshBasicMaterial({ map: keep(canvasTex(480, 300, (c) => {
        c.strokeStyle = 'rgba(148,163,184,0.5)'; c.lineWidth = 4; c.setLineDash([18, 14]); c.strokeRect(10, 10, 460, 280);
        c.textAlign = 'center';
        text(c, '+', 240, 150, '300 90px sans-serif', 'rgba(148,163,184,0.6)');
        text(c, es ? 'Conecta con un Creador' : 'Connect with a Creator', 240, 215, '400 22px sans-serif', 'rgba(148,163,184,0.8)');
      })), transparent: true }));
    }
    const m = new THREE.Mesh(cardGeo, mat);
    m.position.set(x, y, -D / 2 + 0.03);
    scene.add(m);
    if (i === 0) cardHits.push({ m, index: -1 });
    else if (card) cardHits.push({ m, index: i - 1 });
  }
  const wallTitle = new THREE.Mesh(keep(new THREE.PlaneGeometry(5, 0.4)), keep(new THREE.MeshBasicMaterial({ transparent: true, map: keep(canvasTex(1000, 80, (c) => {
    c.textAlign = 'center';
    text(c, es ? 'CREADORES CON LOS QUE CONECTASTE' : 'CREATORS YOU CONNECTED WITH', 500, 56, '700 40px monospace', data.accent);
  })) })));
  wallTitle.position.set(0, 3.6, -D / 2 + 0.03);
  scene.add(wallTitle);

  /* ---- right wall: the six pillar stamps ---- */
  const hexGeo = keep(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 6));
  data.stamps.forEach((s, i) => {
    const mat = s.earned ? keep(new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.9, roughness: 0.4, metalness: 0.4 })) : std(0x23272f, 0.8, 0.2);
    const hex = new THREE.Mesh(hexGeo, mat);
    hex.rotation.z = Math.PI / 2;
    hex.position.set(W / 2 - 0.08, 2.9 - Math.floor(i / 3) * 0.95, -0.3 + (i % 3) * 0.9);
    scene.add(hex);
  });
  box(0.5, 0.06, 3.2, dark, W / 2 - 0.3, 1.1, 0.6);
  box(0.5, 1.1, 0.06, dark, W / 2 - 0.3, 0.55, -0.9);
  box(0.5, 1.1, 0.06, dark, W / 2 - 0.3, 0.55, 2.1);
  const shelfTitle = new THREE.Mesh(keep(new THREE.PlaneGeometry(3, 0.34)), keep(new THREE.MeshBasicMaterial({ transparent: true, map: keep(canvasTex(720, 80, (c) => {
    c.textAlign = 'center';
    text(c, es ? 'SELLOS DE LOS 6 PILARES' : 'THE 6 PILLAR STAMPS', 360, 56, '700 38px monospace', '#00DDFF');
  })) })));
  shelfTitle.rotation.y = -Math.PI / 2;
  shelfTitle.position.set(W / 2 - 0.03, 3.6, 0.6);
  scene.add(shelfTitle);

  /* ---- portal back to the core ---- */
  const portal = new THREE.Group();
  portal.position.set(4.5, 0, -3.6);
  scene.add(portal);
  const ring = new THREE.Mesh(keep(new THREE.TorusGeometry(0.95, 0.06, 10, 48)), glow(0xfdcc0d));
  ring.position.y = 1.25;
  portal.add(ring);
  const veil = new THREE.Mesh(keep(new THREE.CircleGeometry(0.9, 40)), keep(new THREE.MeshBasicMaterial({ color: 0xfdcc0d, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })));
  veil.position.y = 1.25;
  portal.add(veil);
  box(0.7, 0.1, 0.7, dark, 0, 0.05, 0, portal);
  portal.rotation.y = -0.7;
  const portalLabel = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.7, 0.3)), keep(new THREE.MeshBasicMaterial({ transparent: true, map: keep(canvasTex(510, 90, (c) => {
    c.textAlign = 'center';
    text(c, es ? 'AL NÚCLEO' : 'TO THE CORE', 255, 62, '700 44px monospace', '#FDCC0D');
  })) })));
  portalLabel.position.y = 2.5;
  portal.add(portalLabel);

  /* ---- things that move every frame (capsule scan, pass card) ---- */
  const anims: Array<(t: number) => void> = [];
  const label = (s: string, color: string, w = 1.7) => new THREE.Mesh(keep(new THREE.PlaneGeometry(w, w * 0.18)), keep(new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, map: keep(canvasTex(510, 92, (c) => {
    c.textAlign = 'center';
    text(c, s, 255, 64, '700 42px monospace', color, 490);
  })) })));

  /* ---- left wall: the Highbot's capsule (chat and editor) ---- */
  const capsule = new THREE.Group();
  capsule.position.set(-5.3, 0, 0.6);
  scene.add(capsule);
  const cBase = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.62, 0.7, 0.16, 32)), std(0x161a21, 0.4, 0.8));
  cBase.position.y = 0.08;
  const cTop = cBase.clone();
  cTop.position.y = 2.42;
  const glass = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.55, 0.55, 2.2, 32, 1, true)), keep(new THREE.MeshStandardMaterial({ color: 0x9fe8ff, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0.2, side: THREE.DoubleSide, depthWrite: false })));
  glass.position.y = 1.26;
  const cRing = new THREE.Mesh(keep(new THREE.TorusGeometry(0.58, 0.02, 6, 40)), glow(accent));
  cRing.rotation.x = Math.PI / 2;
  // a hologram of the SGX bolt turns inside the capsule
  const holo = new THREE.Group();
  holo.position.y = 1.3;
  void loadSgxIcon().then((icon) => {
    if (!icon || !alive) return;
    const g = icon.boltAlone.clone();
    keep(g);
    const m = new THREE.Mesh(g, keep(new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.75 })));
    m.scale.setScalar(0.7);
    holo.add(m);
  });
  const capLabel = label(es ? 'TU HIGHBOT' : 'YOUR HIGHBOT', '#00DDFF', 1.3);
  capLabel.position.set(0.05, 2.75, 0);
  capLabel.rotation.y = Math.PI / 2;
  capsule.add(cBase, cTop, glass, cRing, holo, capLabel);
  const capLight = new THREE.PointLight(accent, 1.4, 3, 1.8);
  capLight.position.y = 1.3;
  capsule.add(capLight);
  anims.push((t) => {
    cRing.position.y = 0.25 + ((t * 0.45) % 1) * 2.05;
    holo.rotation.set(0, t * 0.9, 0);
  });

  /* ---- front right: the pedestal with your SGX Pass ---- */
  const ped = new THREE.Group();
  ped.position.set(4.6, 0, 3.0);
  scene.add(ped);
  box(0.75, 0.95, 0.75, dark, 0, 0.475, 0, ped);
  box(0.8, 0.04, 0.8, glow(accent), 0, 0.97, 0, ped);
  const passMat = (() => {
    if (data.myHolo) {
      const t = keep(new THREE.TextureLoader().load(data.myHolo));
      t.colorSpace = THREE.SRGBColorSpace;
      return keep(new THREE.MeshBasicMaterial({ map: t, side: THREE.DoubleSide }));
    }
    return keep(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: keep(canvasTex(480, 300, (c) => {
      c.fillStyle = '#0a0d13'; c.fillRect(0, 0, 480, 300);
      c.strokeStyle = data.accent; c.lineWidth = 6; c.strokeRect(3, 3, 474, 294);
      text(c, 'SGX PASS', 36, 70, '900 44px sans-serif', '#FDCC0D');
      text(c, (data.callsign || (es ? 'CREADOR' : 'CREATOR')).toUpperCase(), 36, 160, '900 40px sans-serif', '#ffffff', 410);
      text(c, 'SPATIALGINEERS SUMMIT 2026', 36, 262, '400 18px monospace', '#9ca3af');
    })) }));
  })();
  const passCard = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.95, 0.6)), passMat);
  passCard.position.y = 1.55;
  ped.add(passCard);
  const pedLabel = label(es ? 'MI SGX PASS' : 'MY SGX PASS', '#FDCC0D', 1.3);
  pedLabel.position.y = 2.15;
  ped.add(pedLabel);
  anims.push((t) => {
    passCard.rotation.y = Math.sin(t * 0.7) * 0.6 - 0.4;
    passCard.position.y = 1.55 + Math.sin(t * 1.4) * 0.05;
    pedLabel.rotation.y = -0.4;
  });

  /* ---- your progress, in the room ---- */
  // a trophy on the shelf for every pillar you stamped; an empty plinth for the rest
  data.stamps.forEach((s, i) => {
    const z = -0.5 + i * 0.44;
    const plinth = box(0.22, 0.08, 0.22, dark, W / 2 - 0.3, 1.17, z);
    if (!s.earned) { plinth.scale.y = 0.6; return; }
    const mat = keep(new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.6, roughness: 0.3, metalness: 0.9 }));
    const cup = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.11, 0.05, 0.2, 14)), mat);
    cup.position.set(W / 2 - 0.3, 1.36, z);
    const stem = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.025, 0.025, 0.1, 8)), mat);
    stem.position.set(W / 2 - 0.3, 1.24, z);
    scene.add(cup, stem);
  });
  // one light on the baseboard for every mission you completed
  const ledGeo = keep(new THREE.BoxGeometry(0.16, 0.05, 0.03));
  const ledOn = glow(accent), ledOff = glow(0x1f2530);
  const total = Math.max(1, data.missionsTotal);
  for (let i = 0; i < total; i++) {
    const led = new THREE.Mesh(ledGeo, i < data.missionsDone ? ledOn : ledOff);
    led.position.set(-W / 2 + 0.5 + (i / Math.max(1, total - 1)) * (W - 1), 0.32, -D / 2 + 0.03);
    scene.add(led);
  }
  // your level: the higher it is, the more your color fills the room
  const lvl = Math.min(1, Math.max(0, (data.level || 0) / 8));
  const moodLight = new THREE.PointLight(accent, 1 + lvl * 7, 12, 1.6);
  moodLight.position.set(0, 0.6, -1);
  scene.add(moodLight);
  // your role brings its own object, next to your pass
  if (data.role && data.role !== 'visitor') {
    const prop = new THREE.Group();
    prop.position.set(3.4, 0, 3.7);
    scene.add(prop);
    solids.push([3.4, 3.7, 0.35]);
    const metal = std(0x2b313c, 0.35, 0.85);
    if (data.role === 'speaker') {
      box(0.04, 1.45, 0.04, metal, 0, 0.72, 0, prop);
      box(0.4, 0.03, 0.4, metal, 0, 0.015, 0, prop);
      const head = new THREE.Mesh(keep(new THREE.CapsuleGeometry(0.07, 0.12, 4, 12)), std(0x111318, 0.6, 0.6));
      head.position.y = 1.55; head.rotation.x = 0.5;
      prop.add(head);
      const spot = new THREE.SpotLight(0xfff2c4, 18, 6, 0.35, 0.6, 1.5);
      spot.position.set(0, 4, 0.5);
      spot.target = head;
      prop.add(spot);
    } else if (data.role === 'press') {
      [0, 2.1, 4.2].forEach((a) => {
        const leg = box(0.03, 1.3, 0.03, metal, Math.sin(a) * 0.25, 0.62, Math.cos(a) * 0.25, prop);
        leg.rotation.set(Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2);
      });
      box(0.34, 0.22, 0.2, std(0x15181e, 0.5, 0.6), 0, 1.36, 0, prop);
      const lens = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.08, 0.18, 16)), std(0x0b0d11, 0.2, 0.9));
      lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.36, -0.18);
      prop.add(lens);
      box(0.04, 0.04, 0.02, glow(0xdc2626), 0.12, 1.45, -0.1, prop);
    }
    // sponsors, press and Guild initiates also get a banner with their role
    const word = { speaker: 'SPEAKER', sponsor: 'SPONSOR', press: es ? 'PRENSA' : 'PRESS', initiate: 'SGX GUILD' }[data.role];
    const banner = new THREE.Mesh(keep(new THREE.PlaneGeometry(0.8, 2)), keep(new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, map: keep(canvasTex(240, 600, (c) => {
      c.fillStyle = '#05080f'; c.fillRect(0, 0, 240, 600);
      c.fillStyle = '#FDCC0D'; c.fillRect(0, 0, 240, 16); c.fillRect(0, 584, 240, 16);
      c.save(); c.translate(150, 300); c.rotate(-Math.PI / 2); c.textAlign = 'center';
      text(c, word, 0, 0, '900 82px sans-serif', '#FDCC0D');
      c.restore();
      text(c, 'SUMMIT 2026', 22, 560, '700 26px monospace', '#00DDFF');
    })) })));
    banner.position.set(data.role === 'speaker' || data.role === 'press' ? 0.75 : 0, 1.5, 0.2);
    banner.rotation.y = -0.5;
    prop.add(banner);
  }

  /* ---- the Highbot ---- */
  const bot = new THREE.Group();
  bot.position.set(0, 0, 1.2);
  scene.add(bot);
  const shadowTex = keep(canvasTex(128, 128, (c) => {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  }));
  const shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 1.5)), keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  bot.add(shadow);
  const body = new THREE.Group();
  bot.add(body);
  let avatar: Pilot3D | null = null;
  let legLen = 0.5;
  body.rotation.order = 'YXZ';
  let alive = true;
  buildHighbot3D(data.pilot, { envMap: env }).then((p) => {
    if (!alive) { p.dispose(); return; }
    // stand on the floor, about 1.7 units tall
    const bb = new THREE.Box3().setFromObject(p.group);
    const k = 1.95 / Math.max(bb.max.y - bb.min.y, 0.01);
    p.group.scale.setScalar(k);
    p.group.position.y = -bb.min.y * k;
    body.add(p.group);
    avatar = p;
    // the stride comes from the real leg: hip height above the floor
    const hip = p.group.getObjectByName('hip joint left');
    if (hip) { p.group.updateWorldMatrix(true, true); const hy = hip.getWorldPosition(new THREE.Vector3()).y; if (hy > 0.15 && hy < 1.5) legLen = hy; }
    p.wave?.();
    onReady?.();
  }).catch(() => onReady?.());

  /* ---- input: keyboard here, the joystick comes from the React layer ---- */
  const keys = new Set<string>();
  const joy = { x: 0, y: 0 };
  const kd = (e: KeyboardEvent) => {
    // typing in a panel over the room (the Highbot chat, a form) never walks the Highbot
    if ((e.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (/^(Arrow|Key[WASD])/.test(e.code)) { keys.add(e.code); e.preventDefault(); } };
  const ku = (e: KeyboardEvent) => keys.delete(e.code);
  const blur = () => keys.clear();
  window.addEventListener('keydown', kd);
  window.addEventListener('keyup', ku);
  window.addEventListener('blur', blur);

  const resize = () => {
    const w = host.clientWidth || 320, h = host.clientHeight || 480;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // portrait phones see less to the sides: pull the camera back a little
    camera.fov = w < h ? 64 : 52;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const play = createRoomPlay({
    scene, camera, dom: renderer.domElement, keep, accent, bot, solids, shadowTex,
    room: { w: W, d: D, h: H, front: 5.6 }, reduce, onScore: (n) => onScore?.(n),
  });
  const camPos = new THREE.Vector3(0, 2.7, 7);
  const look = new THREE.Vector3(0, 1.1, 0);
  camera.position.copy(camPos);
  let near: StationId | null = null;
  let heading = Math.PI;
  let walk = 0, walkAmt = 0;
  let last = performance.now();
  let raf = 0;
  const frame = (now: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = now / 1000;

    let mx = joy.x + (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    let mz = -joy.y + (keys.has('ArrowDown') || keys.has('KeyS') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('KeyW') ? 1 : 0);
    const len = Math.hypot(mx, mz);
    const moving = len > 0.12;
    if (moving) {
      const k = Math.min(len, 1) / len;
      mx *= k; mz *= k;
      let nx = bot.position.x + mx * SPEED * dt;
      let nz = bot.position.z + mz * SPEED * dt;
      nx = THREE.MathUtils.clamp(nx, -W / 2 + 0.6, W / 2 - 0.6);
      nz = THREE.MathUtils.clamp(nz, -D / 2 + 0.7, 5.2);
      for (const [sx, sz, r] of solids) {
        const dx = nx - sx, dz = nz - sz, d = Math.hypot(dx, dz), min = r + 0.42;
        if (d < min && d > 1e-4) { nx = sx + (dx / d) * min; nz = sz + (dz / d) * min; }
      }
      // the stride advances with the ground really covered (not with time), so a foot on
      // the floor stays put, and a Highbot pushing against a wall does not walk on the spot
      const covered = Math.hypot(nx - bot.position.x, nz - bot.position.z);
      walk += (covered * Math.PI * 2) / (4 * legLen * Math.sin(WALK_LEG));
      bot.position.x = nx; bot.position.z = nz;
      heading = Math.atan2(mx, mz);
    }
    // turn the short way round
    let dr = heading - body.rotation.y;
    dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    body.rotation.y += dr * Math.min(1, dt * 10);
    walkAmt += ((moving ? 1 : 0) - walkAmt) * Math.min(1, dt * 9);
    // standing still, the legs come back together instead of freezing mid-step
    if (!moving && walkAmt < 0.02) walk = 0;
    body.rotation.x = 0.07 * walkAmt;
    body.rotation.z = reduce ? 0 : Math.sin(walk) * 0.025 * walkAmt;
    avatar?.setWalk?.(walkAmt, walk);
    avatar?.update(t);
    for (const f of anims) f(t);
    play.update(dt, t);

    // which station is close
    let hit: StationId | null = null;
    for (const s of STATIONS) if (Math.hypot(bot.position.x - s.x, bot.position.z - s.z) < s.r) { hit = s.id; break; }
    if (hit !== near) { near = hit; onNear(hit); }

    ring.rotation.z = t * 0.6;
    veil.material.opacity = 0.14 + Math.sin(t * 2) * 0.05;

    camPos.set(THREE.MathUtils.clamp(bot.position.x * 0.8, -4, 4), 2.7, bot.position.z + (camera.aspect < 1 ? 6.6 : 5.2));
    camera.position.lerp(camPos, Math.min(1, dt * 4));
    look.lerp(new THREE.Vector3(bot.position.x, 1.35, bot.position.z - 1), Math.min(1, dt * 5));
    camera.lookAt(look);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  return {
    setMove: (x, y) => { joy.x = x; joy.y = y; },
    grab: play.grab, dragTo: play.dragTo, drop: play.drop,
    pickCard: (cx, cy) => {
      const b = renderer.domElement.getBoundingClientRect();
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(((cx - b.left) / b.width) * 2 - 1, -((cy - b.top) / b.height) * 2 + 1), camera);
      const hit = rc.intersectObjects(cardHits.map((c) => c.m), false)[0];
      return hit ? cardHits.find((c) => c.m === hit.object)!.index : null;
    },
    dispose: () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('blur', blur);
      avatar?.dispose();
      trash.forEach((x) => x.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
