import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, Pause, RotateCcw, Trophy, Share2, HelpCircle, Volume2, VolumeX, Video, Square } from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { QuickGuideModal } from '../common/QuickGuideModal';
import { TransientSponsorSlot } from './TransientSponsorSlot';
import { loadAllApprovedSponsors } from '../../lib/summitData';
import {
  POINTS, POWERS, POWER_ORDER, RINGS_PER_ZONE, ROUTE_BONUS, ROUTE_COLORS, ROUTE_NAMES, ROUTE_EVENT, ZONES, ZONE_ORDER,
  droneGuideSteps, runXp, zoneName, type PowerKey, type ZoneKey,
} from './drone/droneConfig';
import { buildZone, createCrateSkin, createDroneMesh, disposeCrateSkins, disposeObject, type CrateSkin, type ZoneWorld } from './drone/droneScene';
import { playDroneSfx, closeDroneAudio, type DroneSfx } from './drone/droneSfx';
import { DroneRankingDialog, useDroneRanking } from './drone/DroneRanking';
import { DroneTouchControls } from './drone/DroneTouchControls';
import { PowerButton, type PowerState } from './drone/PowerButton';
import './drone/drone.css';

/* Dron SGX (SGX.Spark 03.1): a three-zone drone run over San Juan with box
   colliders, six powers, partner crates and the 6 Pillars Route. */

type Phase = 'start' | 'playing' | 'paused' | 'over';
type Tone = 'cyan' | 'yellow' | 'alert';

interface Hud {
  score: number;
  energy: number;
  rings: number;
  speed: number;
  alt: number;
  routeIdx: number;
  warning: string | null;
  powers: Record<PowerKey, PowerState>;
}

interface RunResult {
  score: number;
  rings: number;
  crates: number;
  xp: number;
  best: number;
  newRecord: boolean;
  routes: number;
  battery: boolean;
}

interface Toast { id: number; text: string; tone: Tone }

interface Burst { points: THREE.Points; velocities: Float32Array; life: number }

const idlePowers = (): Record<PowerKey, PowerState> =>
  Object.fromEntries(POWER_ORDER.map((k) => [k, { cooldown: 0, active: false }])) as Record<PowerKey, PowerState>;

const EMPTY_HUD: Hud = { score: 0, energy: 100, rings: 0, speed: 0, alt: 16, routeIdx: 0, warning: null, powers: idlePowers() };
const NEVER = -1e9;
const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');

export const SummitDroneMiniGame: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile, recordDroneTrick, recordDroneFlight, recordActivity } = usePilotProfile();
  const savedBest = profile.droneStats?.highScore || 0;

  const rootRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stickRef = useRef({ x: 0, y: 0 });

  const [phase, setPhase] = useState<Phase>('start');
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [zone, setZone] = useState<ZoneKey>('CHROMA');
  const [cameraMode, setCameraMode] = useState<'CHASE' | 'FPV'>('CHASE');
  const [soundOn, setSoundOn] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [shareNote, setShareNote] = useState('');

  const myBest = Math.max(savedBest, result?.score || 0);
  const ranking = useDroneRanking(rankingOpen || phase === 'over', myBest);

  // Mutable game state read by the render loop.
  const sim = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    drone: null as THREE.Group | null,
    rotors: [] as THREE.Mesh[],
    shield: null as THREE.Mesh | null,
    world: null as ZoneWorld | null,
    crateSkins: [] as CrateSkin[],
    laserGeo: null as THREE.BufferGeometry | null,
    laserMat: null as THREE.Material | null,
    lasers: [] as Array<{ mesh: THREE.Mesh; life: number }>,
    pulses: [] as Array<{ mesh: THREE.Mesh; scale: number; life: number }>,
    bursts: [] as Burst[],

    pos: new THREE.Vector3(0, 16, 0),
    vel: new THREE.Vector3(0, 0, -48),
    rebound: new THREE.Vector3(),
    targetRoll: 0,
    targetPitch: 0,
    targetYaw: 0,
    rollAngle: 0,
    rollDir: 1,
    rolling: false,
    shake: 0,
    keys: new Set<string>(),

    turboEnd: 0,
    shieldEnd: 0,
    slowmoEnd: 0,
    last: Object.fromEntries(POWER_ORDER.map((k) => [k, NEVER])) as Record<PowerKey, number>,

    score: 0,
    energy: 100,
    crates: 0,
    rings: 0,
    trickXp: 0,
    routeIdx: 0,
    routes: 0,
    questFired: false,

    zone: 'CHROMA' as ZoneKey,
    cam: 'CHASE' as 'CHASE' | 'FPV',
    phase: 'start' as Phase,
    pausedAt: 0,
    lastHud: 0,
    idleFrame: 0,
    needsRender: true,
  });

  // Latest values for callbacks that the loop holds on to.
  const live = useRef({ es, soundOn, savedBest, dialogs: false, recordDroneTrick, recordDroneFlight, recordActivity, reloadRanking: ranking.reload });
  live.current = { es, soundOn, savedBest, dialogs: guideOpen || rankingOpen, recordDroneTrick, recordDroneFlight, recordActivity, reloadRanking: ranking.reload };

  const sponsors = useMemo(() => loadAllApprovedSponsors().filter((s) => s.activeInMiniGame && s.companyName), []);

  // Global shortcuts (immersion layer) stand down while a run is live.
  useEffect(() => {
    document.body.toggleAttribute('data-sgx-game', phase === 'playing');
    return () => document.body.removeAttribute('data-sgx-game');
  }, [phase]);

  const sfx = useCallback((type: DroneSfx) => { if (live.current.soundOn) playDroneSfx(type); }, []);

  const toastSeq = useRef(0);
  const addToast = useCallback((text: string, tone: Tone = 'cyan') => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2000);
  }, []);

  const flashBanner = useCallback((msg: string) => {
    setBanner(msg);
    window.setTimeout(() => setBanner((prev) => (prev === msg ? null : prev)), 1400);
  }, []);

  const spawnSparks = useCallback((at: THREE.Vector3, color: number) => {
    const s = sim.current;
    if (!s.scene) return;
    const count = 26;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions.set([at.x, at.y, at.z], i * 3);
      velocities.set([(Math.random() - 0.5) * 32, (Math.random() - 0.5) * 32, (Math.random() - 0.2) * 35], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.75, transparent: true, opacity: 1, blending: THREE.AdditiveBlending }));
    s.scene.add(points);
    s.bursts.push({ points, velocities, life: 0.65 });
  }, []);

  const loadZone = useCallback((key: ZoneKey) => {
    const s = sim.current;
    if (!s.scene) return;
    if (s.world) {
      s.scene.remove(s.world.group);
      disposeObject(s.world.group);
    }
    s.world = buildZone(key, s.scene, s.crateSkins);
    s.zone = key;
    s.needsRender = true;
  }, []);

  const clearEffects = useCallback(() => {
    const s = sim.current;
    if (!s.scene) return;
    s.lasers.forEach((l) => s.scene!.remove(l.mesh));
    s.pulses.forEach((p) => { s.scene!.remove(p.mesh); disposeObject(p.mesh); });
    s.bursts.forEach((b) => { s.scene!.remove(b.points); disposeObject(b.points); });
    s.lasers = [];
    s.pulses = [];
    s.bursts = [];
  }, []);

  const endRun = useCallback((battery: boolean) => {
    const s = sim.current;
    if (s.phase !== 'playing' && s.phase !== 'paused') return;
    s.phase = 'over';
    s.keys.clear();
    const prevBest = live.current.savedBest;
    live.current.recordDroneFlight(s.score, s.crates, s.rings);
    setResult({
      score: s.score,
      rings: s.rings,
      crates: s.crates,
      xp: s.trickXp + runXp(s.score, s.crates, s.rings),
      best: Math.max(prevBest, s.score),
      newRecord: s.score > prevBest && s.score > 0,
      routes: s.routes,
      battery,
    });
    setShareNote('');
    setPhase('over');
    // The leaderboard row is written async; read the ranking again once it lands.
    window.setTimeout(() => live.current.reloadRanking(), 2500);
  }, []);

  const toggleCamera = useCallback(() => {
    const s = sim.current;
    s.cam = s.cam === 'CHASE' ? 'FPV' : 'CHASE';
    setCameraMode(s.cam);
  }, []);

  const firePower = useCallback((key: PowerKey) => {
    const s = sim.current;
    if (s.phase !== 'playing' || !s.scene) return;
    const now = performance.now();
    if (now - s.last[key] < POWERS[key].cooldown) return;
    s.last[key] = now;
    const { es: e, recordDroneTrick: trick, recordActivity: activity } = live.current;

    if (key === 'roll') {
      s.rolling = true;
      s.rollAngle = 0;
      const ax = (s.keys.has('KeyD') || s.keys.has('ArrowRight') ? 1 : 0) - (s.keys.has('KeyA') || s.keys.has('ArrowLeft') ? 1 : 0) + stickRef.current.x;
      s.rollDir = ax < 0 ? -1 : 1;
      s.rebound.x += s.rollDir * 26;
      sfx('roll');
      const xp = trick('barrel_roll');
      s.trickXp += xp;
      addToast(`+${xp} XP · ${e ? 'Giro 360°' : '360° roll'}`);
    } else if (key === 'turbo') {
      s.turboEnd = now + 3500;
      sfx('turbo');
      const xp = trick('speed_dash');
      s.trickXp += xp;
      addToast(`+${xp} XP · Turbo`, 'yellow');
    } else if (key === 'shield') {
      s.shieldEnd = now + 6000;
      sfx('shield');
      activity('drone_flight', e ? 'Escudo del dron' : 'Drone shield', e ? 'Activaste el escudo en el Dron SGX.' : 'You turned on the shield in the SGX Drone.', 35);
      s.trickXp += 35;
      addToast(`+35 XP · ${e ? 'Escudo' : 'Shield'}`);
    } else if (key === 'emp') {
      const geo = new THREE.RingGeometry(1, 2, 32);
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x00ddff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
      mesh.position.copy(s.pos);
      s.scene.add(mesh);
      s.pulses.push({ mesh, scale: 1, life: 1 });
      let cleared = 0;
      s.world?.mines.forEach((m) => {
        if (!m.destroyed && m.mesh.position.distanceTo(s.pos) < 55) {
          m.destroyed = true;
          m.mesh.visible = false;
          spawnSparks(m.mesh.position, 0x00ddff);
          cleared++;
        }
      });
      sfx('emp');
      const xp = trick('emp_pulse');
      s.trickXp += xp;
      s.score += POINTS.empBase + cleared * POINTS.empPerMine;
      addToast(`+${xp} XP · ${e ? `Pulso (${cleared} minas)` : `Pulse (${cleared} mines)`}`);
    } else if (key === 'slowmo') {
      s.slowmoEnd = now + 5000;
      sfx('shield');
      const xp = trick('precision_hover');
      s.trickXp += xp;
      addToast(`+${xp} XP · ${e ? 'Cámara lenta' : 'Slow-mo'}`, 'yellow');
    } else if (key === 'laser' && s.laserGeo && s.laserMat) {
      [-0.7, 0.7].forEach((offX) => {
        const mesh = new THREE.Mesh(s.laserGeo!, s.laserMat!);
        mesh.position.set(s.pos.x + offX, s.pos.y, s.pos.z - 1);
        s.scene!.add(mesh);
        s.lasers.push({ mesh, life: 1.2 });
      });
      sfx('laser');
    }
  }, [addToast, sfx, spawnSparks]);

  const pause = useCallback(() => {
    const s = sim.current;
    if (s.phase !== 'playing') return;
    s.phase = 'paused';
    s.pausedAt = performance.now();
    s.keys.clear();
    stickRef.current = { x: 0, y: 0 };
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    const s = sim.current;
    if (s.phase !== 'paused') return;
    // Timers stand still while paused.
    const delta = performance.now() - s.pausedAt;
    s.turboEnd += delta;
    s.shieldEnd += delta;
    s.slowmoEnd += delta;
    POWER_ORDER.forEach((k) => { s.last[k] += delta; });
    s.phase = 'playing';
    setPhase('playing');
  }, []);

  const startRun = useCallback(() => {
    const s = sim.current;
    clearEffects();
    loadZone(s.zone);
    s.pos.set(0, 16, 0);
    s.vel.set(0, 0, -48);
    s.rebound.set(0, 0, 0);
    s.targetRoll = s.targetPitch = s.targetYaw = 0;
    s.rolling = false;
    s.shake = 0;
    s.keys.clear();
    s.turboEnd = s.shieldEnd = s.slowmoEnd = 0;
    POWER_ORDER.forEach((k) => { s.last[k] = NEVER; });
    s.score = 0;
    s.energy = 100;
    s.crates = 0;
    s.rings = 0;
    s.trickXp = 0;
    s.routeIdx = 0;
    s.routes = 0;
    s.questFired = false;
    s.phase = 'playing';
    setHud(EMPTY_HUD);
    setToasts([]);
    setBanner(null);
    setResult(null);
    setPhase('playing');
    sfx('gate');
    // Keep the whole stage under the sticky header.
    const r = rootRef.current?.getBoundingClientRect();
    if (r && (r.top < 90 || r.bottom > window.innerHeight)) rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [clearEffects, loadZone, sfx]);

  const pickZone = useCallback((key: ZoneKey) => {
    setZone(key);
    loadZone(key);
  }, [loadZone]);

  // Three.js lifecycle: built once, disposed on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const s = sim.current;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2));
    renderer.setSize(container.clientWidth, container.clientHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 1200);
    camera.position.set(0, 19.2, 8.5);
    camera.lookAt(0, 16.5, -15);
    s.scene = scene;
    s.camera = camera;
    scene.add(new THREE.AmbientLight(0xffffff, 0.95));
    const sun = new THREE.DirectionalLight(0xffffff, 1.35);
    sun.position.set(25, 60, 25);
    scene.add(sun);

    const drone = createDroneMesh();
    scene.add(drone.group);
    drone.group.position.copy(s.pos);
    s.drone = drone.group;
    s.rotors = drone.rotors;
    s.shield = drone.shield;

    const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8);
    laserGeo.rotateX(Math.PI / 2);
    s.laserGeo = laserGeo;
    s.laserMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d });

    s.crateSkins = sponsors.length
      ? sponsors.map((sp) => createCrateSkin(live.current.es ? sp.companyName : sp.companyNameEn || sp.companyName, sp.logoUrl))
      : [createCrateSkin('SGX', '/holo/sgxLogo.png')];
    loadZone(s.zone);

    const onResize = () => {
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      s.needsRender = true;
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const onKeyDown = (e: KeyboardEvent) => {
      if (live.current.dialogs) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      const k = e.code;
      if (k === 'KeyP' || k === 'Escape') {
        if (s.phase === 'playing') { e.preventDefault(); pause(); }
        else if (s.phase === 'paused') { e.preventDefault(); resume(); }
        return;
      }
      if (s.phase !== 'playing') return;
      s.keys.add(k);
      if (k.startsWith('Arrow') || k === 'Space') e.preventDefault();
      if (e.repeat) return;
      if (k === 'Space') firePower('turbo');
      else if (k === 'KeyE') firePower('shield');
      else if (k === 'KeyX') firePower('emp');
      else if (k === 'KeyC') firePower('slowmo');
      else if (k === 'KeyF') firePower('laser');
      else if (k === 'KeyQ') firePower('roll');
      else if (k === 'KeyV') toggleCamera();
    };
    const onKeyUp = (e: KeyboardEvent) => { s.keys.delete(e.code); };
    const onBlur = () => { s.keys.clear(); if (s.phase === 'playing') pause(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    const sphere = new THREE.Sphere(new THREE.Vector3(), 1.65);
    const ahead = new THREE.Vector3();
    const closest = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    let lastTick = performance.now();
    let raf = 0;

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      const rawDt = Math.min((time - lastTick) / 1000, 0.1);
      lastTick = time;

      if (s.phase !== 'playing') {
        // Idle: a slow hover behind the start screen, frozen frame otherwise.
        if (s.phase === 'start') {
          s.idleFrame++;
          if (!s.needsRender && s.idleFrame % 3 !== 0) return;
          drone.group.position.set(s.pos.x, s.pos.y + Math.sin(time / 600) * 0.3, s.pos.z);
          s.rotors.forEach((r) => { r.rotation.y += 0.3; });
        } else if (!s.needsRender) {
          return;
        }
        s.needsRender = false;
        renderer.render(scene, camera);
        return;
      }

      const world = s.world;
      if (!world) return;
      const slowmo = time < s.slowmoEnd;
      const turbo = time < s.turboEnd;
      const shielded = time < s.shieldEnd || s.rolling;
      const dt = slowmo ? rawDt * 0.3 : rawDt;
      const e = live.current.es;

      // Steering: keys and the touch pad add up.
      const keys = s.keys;
      const ax = THREE.MathUtils.clamp((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stickRef.current.x, -1, 1);
      const ay = THREE.MathUtils.clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + stickRef.current.y, -1, 1);
      const speed = turbo ? 48 * 2.4 : 48;
      s.vel.z = -speed;
      if (Math.abs(ax) > 0.08) {
        s.vel.x = 25 * ax;
        s.targetRoll = -0.48 * ax;
        s.targetYaw = THREE.MathUtils.clamp(s.targetYaw - 0.012 * ax, -0.35, 0.35);
      } else {
        s.vel.x *= 0.88;
        s.targetRoll *= 0.85;
        s.targetYaw *= 0.92;
      }
      if (Math.abs(ay) > 0.08) {
        s.vel.y = 21 * ay;
        s.targetPitch = 0.28 * ay;
      } else {
        s.vel.y *= 0.88;
        s.targetPitch *= 0.85;
      }

      s.pos.x += (s.vel.x + s.rebound.x) * dt;
      s.pos.y += (s.vel.y + s.rebound.y) * dt;
      s.pos.z += (s.vel.z + s.rebound.z) * dt;
      s.rebound.multiplyScalar(Math.pow(0.04, dt));

      const crash = (energyLoss: number, msg: string) => {
        s.energy = Math.max(0, s.energy - energyLoss);
        sfx('hit');
        flashBanner(msg);
        if (s.energy <= 0) endRun(true);
      };

      if (s.pos.y < 2.2) {
        s.pos.y = 2.2;
        s.rebound.y = 18;
        s.shake = Math.max(s.shake, 0.7);
        spawnSparks(s.pos, 0x00ddff);
        sfx('hit');
        flashBanner(e ? 'Rozaste el suelo' : 'You grazed the ground');
      } else if (s.pos.y > 42) {
        s.pos.y = 42;
        s.rebound.y = -12;
      }

      if (world.tunnel) {
        const dx = s.pos.x;
        const dy = s.pos.y - 18;
        const len = Math.hypot(dx, dy);
        if (len > 21.5) {
          s.pos.x = (dx / len) * 21.2;
          s.pos.y = 18 + (dy / len) * 21.2;
          s.rebound.x = -(dx / len) * 26;
          s.rebound.y = -(dy / len) * 26;
          s.shake = 1.1;
          spawnSparks(s.pos, 0xfdcc0d);
          sfx('hit');
          flashBanner(e ? 'Rebote en los arcos' : 'Bounced off the arches');
        }
      } else {
        s.pos.x = THREE.MathUtils.clamp(s.pos.x, -44, 44);
      }

      // Box colliders with a look-ahead warning.
      sphere.center.copy(s.pos);
      ahead.set(s.pos.x, s.pos.y, s.pos.z - 22);
      let warning: string | null = null;
      for (const col of world.colliders) {
        if (col.box.max.z < s.pos.z - 35 || col.box.min.z > s.pos.z + 10) continue;
        if (!warning && col.box.distanceToPoint(ahead) < 5.5) warning = e ? `${col.label.es} adelante` : `${col.label.en} ahead`;
        if (!col.box.intersectsSphere(sphere) || time - col.lastHitTime < 420) continue;
        col.lastHitTime = time;
        col.box.clampPoint(s.pos, closest);
        normal.copy(s.pos).sub(closest);
        if (normal.lengthSq() < 0.001) normal.set(s.pos.x >= 0 ? 1 : -1, 0.4, 1);
        normal.normalize();
        s.pos.addScaledVector(normal, 2.4);
        s.rebound.set(normal.x * 34, normal.y * 26 + 6, Math.max(28, normal.z * 38));
        s.shake = 1.45;
        spawnSparks(closest, shielded ? 0x00ddff : 0xff7a00);
        if (shielded) {
          sfx('shield');
          addToast(e ? 'Escudo: sin daño' : 'Shield: no damage');
        } else {
          crash(18, e ? `Choque: ${col.label.es} · −18% batería` : `Crash: ${col.label.en} · −18% battery`);
          if (s.phase !== 'playing') return;
        }
      }

      if (s.rolling) {
        s.rollAngle += dt * Math.PI * 4.5;
        if (s.rollAngle >= Math.PI * 2) { s.rollAngle = 0; s.rolling = false; }
      }

      const d = drone.group;
      d.position.copy(s.pos);
      const baseRoll = THREE.MathUtils.lerp(d.rotation.z, s.targetRoll, 0.15);
      d.rotation.z = s.rolling ? baseRoll + s.rollAngle * s.rollDir : baseRoll;
      d.rotation.x = THREE.MathUtils.lerp(d.rotation.x, s.targetPitch, 0.15);
      d.rotation.y = s.targetYaw;
      const rotorSpeed = turbo ? 0.65 : 0.35;
      s.rotors.forEach((r) => { r.rotation.y += rotorSpeed; });
      if (s.shield) {
        (s.shield.material as THREE.MeshBasicMaterial).opacity = shielded ? 0.65 : 0;
        s.shield.rotation.y += 0.04;
      }

      // Rings: clean pass through the center, or a bounce off the rim.
      for (const ring of world.rings) {
        if (Math.abs(s.pos.z - ring.z) >= 3.2) continue;
        const radial = Math.hypot(s.pos.x - ring.mesh.position.x, s.pos.y - ring.mesh.position.y);
        if (!ring.passed && radial < 4.7) {
          ring.passed = true;
          s.rings += 1;
          s.score += POINTS.ring;
          ring.mesh.children[0].scale.setScalar(1.35);
          sfx('ring');
          // 6 Pillars Route: rings must be cleared in pillar order, back to back.
          s.routeIdx = ring.colorIdx === s.routeIdx ? s.routeIdx + 1 : ring.colorIdx === 0 ? 1 : 0;
          if (s.routeIdx === ROUTE_COLORS.length) {
            s.routeIdx = 0;
            s.routes += 1;
            s.score += ROUTE_BONUS;
            sfx('route');
            addToast(`+${fmt(ROUTE_BONUS, e)} pts · ${e ? 'Ruta de los 6 pilares' : '6 Pillars Route'}`, 'yellow');
            if (!s.questFired) {
              s.questFired = true;
              window.dispatchEvent(new Event(ROUTE_EVENT));
            }
          } else {
            addToast(`+${POINTS.ring} pts · ${ROUTE_NAMES[ring.colorIdx]}`);
          }
        } else if (radial >= 4.7 && radial <= 6.6 && time - ring.rimHitTime > 500) {
          ring.rimHitTime = time;
          normal.set(s.pos.x - ring.mesh.position.x, s.pos.y - ring.mesh.position.y, 0.8).normalize();
          s.rebound.copy(normal).multiplyScalar(24);
          s.shake = 0.95;
          spawnSparks(s.pos, 0xfdcc0d);
          sfx('hit');
          flashBanner(e ? 'Rozaste el borde del anillo' : 'You grazed the ring edge');
        }
      }

      for (const crate of world.crates) {
        if (crate.collected) continue;
        crate.mesh.rotation.y += 0.025;
        if (Math.abs(s.pos.z - crate.z) < 3.5 && crate.mesh.position.distanceTo(s.pos) < 4.5) {
          crate.collected = true;
          crate.mesh.visible = false;
          s.crates += 1;
          s.score += POINTS.crate;
          s.energy = Math.min(100, s.energy + 25);
          sfx('ring');
          addToast(`+${POINTS.crate} pts · ${crate.sponsor} · +25%`, 'yellow');
        }
      }

      for (const mine of world.mines) {
        if (mine.destroyed) continue;
        mine.mesh.rotation.y += mine.rotSpeed;
        mine.mesh.rotation.x += mine.rotSpeed * 0.5;
        if (Math.abs(s.pos.z - mine.z) < 3.2 && mine.mesh.position.distanceTo(s.pos) < 3.8) {
          mine.destroyed = true;
          mine.mesh.visible = false;
          spawnSparks(mine.mesh.position, 0xff7a00);
          if (shielded) {
            sfx('shield');
            addToast(e ? 'Escudo: mina sin daño' : 'Shield: mine blocked');
          } else {
            s.shake = 1.3;
            s.rebound.set((Math.random() - 0.5) * 28, 12, 26);
            crash(22, e ? 'Mina · −22% batería' : 'Mine · −22% battery');
            if (s.phase !== 'playing') return;
          }
        }
      }

      for (let i = s.lasers.length - 1; i >= 0; i--) {
        const l = s.lasers[i];
        l.mesh.position.z -= 170 * dt;
        l.life -= dt;
        for (const mine of world.mines) {
          if (!mine.destroyed && mine.mesh.position.distanceTo(l.mesh.position) < 4.2) {
            mine.destroyed = true;
            mine.mesh.visible = false;
            l.life = 0;
            s.score += POINTS.mine;
            spawnSparks(mine.mesh.position, 0xfdcc0d);
            sfx('hit');
            addToast(`+${POINTS.mine} pts · ${e ? 'Mina destruida' : 'Mine destroyed'}`, 'yellow');
          }
        }
        if (l.life > 0 && world.colliders.some((c) => c.box.containsPoint(l.mesh.position))) {
          spawnSparks(l.mesh.position, 0x00ddff);
          l.life = 0;
        }
        if (l.life <= 0) {
          scene.remove(l.mesh);
          s.lasers.splice(i, 1);
        }
      }

      for (let i = s.pulses.length - 1; i >= 0; i--) {
        const p = s.pulses[i];
        p.scale += 60 * dt;
        p.mesh.scale.setScalar(p.scale);
        p.life -= dt * 1.5;
        (p.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, p.life);
        if (p.life <= 0) {
          scene.remove(p.mesh);
          disposeObject(p.mesh);
          s.pulses.splice(i, 1);
        }
      }

      for (let i = s.bursts.length - 1; i >= 0; i--) {
        const b = s.bursts[i];
        b.life -= rawDt;
        const attr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let p = 0; p < arr.length; p++) arr[p] += b.velocities[p] * rawDt;
        attr.needsUpdate = true;
        (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / 0.65);
        if (b.life <= 0) {
          scene.remove(b.points);
          disposeObject(b.points);
          s.bursts.splice(i, 1);
        }
      }

      // Zone gate: on to the next zone.
      if (s.pos.z < -860) {
        const next = ZONE_ORDER[(ZONE_ORDER.indexOf(s.zone) + 1) % ZONE_ORDER.length];
        s.pos.set(0, 16, 0);
        s.rebound.set(0, 0, 0);
        clearEffects();
        loadZone(next);
        setZone(next);
        s.score += POINTS.gate;
        sfx('gate');
        addToast(`+${fmt(POINTS.gate, e)} pts · ${zoneName(next, e)}`, 'yellow');
      }

      s.shake = Math.max(0, s.shake - rawDt * 3.2);
      const shakeX = (Math.random() - 0.5) * s.shake * 1.4;
      const shakeY = (Math.random() - 0.5) * s.shake * 1.4;
      if (s.cam === 'FPV') {
        camera.position.set(s.pos.x + shakeX, s.pos.y + 0.35 + shakeY, s.pos.z - 0.4);
        camera.rotation.set(s.targetPitch * 0.5, s.targetYaw, -s.targetRoll * 0.3);
        camera.fov = turbo ? 82 : slowmo ? 54 : 68;
      } else {
        camTarget.set(s.pos.x * 0.85 + shakeX, s.pos.y + 3.2 + shakeY, s.pos.z + 8.5);
        camera.position.lerp(camTarget, 0.14);
        camera.lookAt(s.pos.x, s.pos.y + 0.5, s.pos.z - 15);
        camera.fov = turbo ? 84 : slowmo ? 56 : 60;
      }
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);

      // HUD at 10 Hz: React does not need every frame.
      if (time - s.lastHud > 100) {
        s.lastHud = time;
        const powers = {} as Record<PowerKey, PowerState>;
        POWER_ORDER.forEach((k) => {
          powers[k] = {
            cooldown: Math.max(0, 1 - (time - s.last[k]) / POWERS[k].cooldown),
            active: k === 'turbo' ? turbo : k === 'shield' ? time < s.shieldEnd : k === 'slowmo' ? slowmo : k === 'roll' ? s.rolling : false,
          };
        });
        setHud({ score: s.score, energy: s.energy, rings: s.rings, speed: Math.round(speed * 3.6), alt: Math.round(s.pos.y), routeIdx: s.routeIdx, warning, powers });
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      disposeObject(scene);
      disposeCrateSkins(s.crateSkins);
      laserGeo.dispose();
      s.laserMat?.dispose();
      // No forceContextLoss: StrictMode remounts on the same canvas.
      renderer.dispose();
      closeDroneAudio();
      s.scene = null;
      s.camera = null;
      s.world = null;
      s.lasers = [];
      s.pulses = [];
      s.bursts = [];
      s.phase = 'start';
    };
    // Built once; callbacks read the latest values through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openGuide = () => { pause(); setGuideOpen(true); };
  const openRanking = () => { pause(); setRankingOpen(true); };

  const share = async () => {
    const url = `${window.location.origin}/?section=games`;
    const pts = fmt(result?.score || 0, es);
    const text = es
      ? `Hice ${pts} pts en el Dron SGX del Spatialgineers Summit 2026. ¿Me superas?`
      : `I scored ${pts} pts in the SGX Drone at Spatialgineers Summit 2026. Can you beat me?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Dron SGX', text, url });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareNote(es ? 'Enlace copiado.' : 'Link copied.');
    } catch {
      setShareNote(url);
    }
  };

  const soundButton = (
    <button type="button" className="sgx-drone__icon" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} aria-label={soundOn ? (es ? 'Silenciar' : 'Mute') : (es ? 'Activar sonido' : 'Unmute')}>
      {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </button>
  );
  const cameraLabel = cameraMode === 'CHASE' ? (es ? 'Cámara: 3ª persona' : 'Camera: chase') : (es ? 'Cámara: 1ª persona' : 'Camera: first person');
  const pillarBar = <div className="sgx-drone__pillarbar" aria-hidden>{ROUTE_COLORS.map((c) => <i key={c} style={{ background: c }} />)}</div>;
  const inRun = phase === 'playing' || phase === 'paused';

  return (
    <section ref={rootRef} className="sgx-drone" data-drone-game aria-label={es ? 'Dron SGX' : 'SGX Drone'}>
      <div ref={containerRef} className="sgx-drone__stage">
        <canvas
          ref={canvasRef}
          className="sgx-drone__canvas"
          onPointerDown={(ev) => { if (ev.pointerType === 'mouse' && phase === 'playing') firePower('laser'); }}
        />

        {inRun && (
          <div className="sgx-drone__hud">
            <div className="sgx-drone__cell sgx-drone__cell--battery">
              <span className="sgx-drone__lbl">{es ? 'Batería' : 'Battery'}</span>
              <span className={`sgx-drone__meter ${hud.energy <= 30 ? 'is-low' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={hud.energy} aria-label={es ? 'Batería' : 'Battery'}>
                <i style={{ transform: `scaleX(${hud.energy / 100})` }} />
              </span>
              <b className={hud.energy <= 30 ? 'is-alert' : ''}>{hud.energy}%</b>
            </div>
            <div className="sgx-drone__cell">
              <span className="sgx-drone__lbl">{es ? 'Puntos' : 'Points'}</span>
              <b className="is-yellow" data-drone-score>{fmt(hud.score, es)}</b>
            </div>
            <div className="sgx-drone__cell">
              <span className="sgx-drone__lbl">{es ? 'Anillos' : 'Rings'}</span>
              <b>{hud.rings}</b>
            </div>
            <div className="sgx-drone__cell sgx-drone__route" title={es ? 'Ruta de los 6 pilares' : '6 Pillars Route'}>
              <span className="sgx-drone__lbl">{es ? 'Ruta' : 'Route'}</span>
              <span className="sgx-drone__route-dots" aria-label={es ? `Ruta de los 6 pilares: ${hud.routeIdx} de 6` : `6 Pillars Route: ${hud.routeIdx} of 6`}>
                {ROUTE_COLORS.map((c, i) => (
                  <i key={c} style={{ ['--dot' as string]: c }} className={i < hud.routeIdx ? 'is-done' : i === hud.routeIdx ? 'is-next' : ''} />
                ))}
              </span>
            </div>
            <div className="sgx-drone__cell is-wide">
              <span className="sgx-drone__lbl">km/h</span>
              <b>{hud.speed}</b>
            </div>
            <div className="sgx-drone__cell is-wide">
              <span className="sgx-drone__lbl">{es ? 'Altura' : 'Height'}</span>
              <b>{hud.alt} m</b>
            </div>
            <div className="sgx-drone__tools">
              <button type="button" className="sgx-drone__icon" onClick={toggleCamera} aria-label={cameraLabel} title={cameraLabel}><Video aria-hidden /></button>
              {soundButton}
              <button type="button" className="sgx-drone__icon is-primary" onClick={phase === 'paused' ? resume : pause} aria-label={phase === 'paused' ? (es ? 'Continuar' : 'Resume') : (es ? 'Pausa' : 'Pause')}>
                {phase === 'paused' ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <>
            <div className="sgx-drone__alerts" aria-live="polite">
              {(banner || hud.warning) && <span className={banner ? 'is-crash' : ''}>{banner || hud.warning}</span>}
            </div>
            <div className="sgx-drone__toasts" aria-live="polite">
              {toasts.map((t) => <span key={t.id} className={`is-${t.tone}`}>{t.text}</span>)}
            </div>
            <div className="sgx-drone__powers">
              {POWER_ORDER.map((k) => <PowerButton key={k} def={POWERS[k]} state={hud.powers[k]} es={es} onPress={() => firePower(k)} />)}
            </div>
            <DroneTouchControls es={es} stick={stickRef} powers={hud.powers} onPower={firePower} />
          </>
        )}

        {phase === 'start' && (
          <div className="sgx-drone__overlay">
            <div className="sgx-drone__panel">
              {pillarBar}
              <p className="sgx-drone__kicker"><img src="/holo/spark.png" alt="" /> SGX.Spark · 03.1</p>
              <h2>{es ? 'Dron SGX' : 'SGX Drone'}</h2>
              <p className="sgx-drone__lead">
                {es
                  ? 'Recorre tres zonas de San Juan, pasa por los anillos y recoge las cajas de los partners del Summit. Cuida tu batería.'
                  : 'Ride through three San Juan zones, go through the rings and collect the Summit partner crates. Watch your battery.'}
              </p>
              <div className="sgx-drone__zones" role="radiogroup" aria-label={es ? 'Zona de inicio' : 'Starting zone'}>
                {ZONE_ORDER.map((k, i) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={zone === k}
                    className={`sgx-drone__zone ${zone === k ? 'is-on' : ''}`}
                    style={{ ['--zone' as string]: ZONES[k].accent }}
                    onClick={() => pickZone(k)}
                  >
                    <span>{es ? 'Zona' : 'Zone'} {i + 1}</span>
                    <strong>{zoneName(k, es)}</strong>
                    <small>{es ? ZONES[k].line.es : ZONES[k].line.en}</small>
                  </button>
                ))}
              </div>
              <div className="sgx-drone__route-hint">
                <span className="sgx-drone__route-dots" aria-hidden>{ROUTE_COLORS.map((c) => <i key={c} style={{ ['--dot' as string]: c }} className="is-done" />)}</span>
                <p>
                  <b>{es ? 'Ruta de los 6 pilares' : '6 Pillars Route'}</b>{' '}
                  {es ? `Pasa seis anillos seguidos en el orden de los pilares: +${fmt(ROUTE_BONUS, es)} pts.` : `Clear six rings in a row in pillar order: +${fmt(ROUTE_BONUS, es)} pts.`}
                </p>
              </div>
              <div className="sgx-drone__buttons">
                <button type="button" className="sgx-btn" onClick={startRun} data-drone-start><Play className="w-4 h-4" aria-hidden />{es ? 'Jugar' : 'Play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openGuide} data-drone-guide><HelpCircle className="w-4 h-4" aria-hidden />{es ? 'Cómo se juega' : 'How to play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openRanking} data-drone-ranking><Trophy className="w-4 h-4" aria-hidden />Ranking</button>
                {soundButton}
              </div>
              {savedBest > 0 && <p className="sgx-drone__best">{es ? 'Tu mejor puntaje' : 'Your best score'}: <b>{fmt(savedBest, es)} pts</b></p>}
            </div>
            <div className="sgx-drone__sponsor">
              <TransientSponsorSlot slotId="drone_preflight" variant="hud" showSubtitleLink />
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div className="sgx-drone__overlay">
            <div className="sgx-drone__panel is-sm" role="group" aria-label={es ? 'Pausa' : 'Paused'}>
              {pillarBar}
              <p className="sgx-drone__kicker">{zoneName(zone, es)}</p>
              <h2>{es ? 'Pausa' : 'Paused'}</h2>
              <div className="sgx-drone__buttons is-stack">
                <button type="button" className="sgx-btn" onClick={resume} autoFocus><Play className="w-4 h-4" aria-hidden />{es ? 'Continuar' : 'Resume'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={startRun}><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Empezar de nuevo' : 'Restart'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setGuideOpen(true)}><HelpCircle className="w-4 h-4" aria-hidden />{es ? 'Cómo se juega' : 'How to play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => endRun(false)} data-drone-end><Square className="w-4 h-4" aria-hidden />{es ? 'Terminar partida' : 'End run'}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="sgx-drone__overlay" data-drone-over>
            <div className="sgx-drone__panel">
              {pillarBar}
              <p className="sgx-drone__kicker">{result.battery ? (es ? 'Sin batería' : 'Out of battery') : zoneName(zone, es)}</p>
              <h2>{result.newRecord ? (es ? '¡Nuevo récord!' : 'New best!') : (es ? 'Partida terminada' : 'Run over')}</h2>
              <dl className="sgx-drone__stats">
                <div><dt>{es ? 'Puntos' : 'Points'}</dt><dd className="is-yellow">{fmt(result.score, es)}</dd></div>
                <div><dt>{es ? 'Anillos' : 'Rings'}</dt><dd>{result.rings}</dd></div>
                <div><dt>{es ? 'XP ganada' : 'XP earned'}</dt><dd>+{fmt(result.xp, es)}</dd></div>
                <div><dt>{es ? 'Tu mejor' : 'Your best'}</dt><dd>{fmt(result.best, es)}</dd></div>
              </dl>
              <p className="sgx-drone__rankline" role="status">
                {result.routes > 0 && <span>{es ? `Rutas de 6 pilares: ${result.routes}` : `6 Pillars Routes: ${result.routes}`} · </span>}
                {result.crates > 0 && <span>{es ? `Cajas: ${result.crates}` : `Crates: ${result.crates}`} · </span>}
                {ranking.status === 'loading'
                  ? (es ? 'Buscando tu puesto…' : 'Finding your place…')
                  : ranking.status === 'error'
                    ? (es ? 'Ranking no disponible ahora' : 'Ranking unavailable right now')
                    : ranking.myRank
                      ? (es ? `Puesto #${ranking.myRank} en el ranking del dron` : `#${ranking.myRank} in the drone ranking`)
                      : (es ? 'Suma puntos para entrar al ranking' : 'Score points to enter the ranking')}
              </p>
              <div className="sgx-drone__buttons">
                <button type="button" className="sgx-btn" onClick={startRun} data-drone-start autoFocus><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Jugar otra vez' : 'Play again'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setRankingOpen(true)} data-drone-ranking><Trophy className="w-4 h-4" aria-hidden />{es ? 'Ver ranking' : 'View ranking'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={share}><Share2 className="w-4 h-4" aria-hidden />{es ? 'Compartir' : 'Share'}</button>
              </div>
              {shareNote && <p className="sgx-drone__best" role="status">{shareNote}</p>}
            </div>
          </div>
        )}
      </div>

      <QuickGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        guideTitle={es ? 'Cómo se juega' : 'How to play'}
        guideCategory={es ? 'Dron SGX' : 'SGX Drone'}
        steps={droneGuideSteps(es)}
        onPrimaryAction={phase === 'start' ? startRun : undefined}
        primaryActionLabel={phase === 'start' ? (es ? 'Jugar' : 'Play') : (es ? 'Entendido' : 'Got it')}
        accent="#B87000"
      />
      <DroneRankingDialog
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        onPlay={() => { if (phase === 'paused') resume(); else startRun(); }}
        ranking={ranking}
        es={es}
        myBest={myBest}
      />
    </section>
  );
};
