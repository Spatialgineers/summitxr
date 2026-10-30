import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Play, RotateCcw, Trophy, Share2, HelpCircle, Square, CalendarDays, Shuffle } from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useLanguage } from '../../context/LanguageContext';
import { QuickGuideModal } from '../common/QuickGuideModal';
import { TransientSponsorSlot } from './TransientSponsorSlot';
import { loadAllApprovedSponsors } from '../../lib/summitData';
import { getIsAudioMuted, toggleAudioMute } from '../../lib/cyberAudioEngine';
import {
  DAILY_KEY, POINTS, POWERS, POWER_ORDER, ROUTE_BONUS, ROUTE_COLORS, ROUTE_EVENT, ROUTE_NAMES, TUNING, TUTORIAL_KEY, ZONES, ZONE_ORDER,
  droneGuideSteps, runXp, zoneName, type PowerKey, type ZoneKey,
} from './drone/droneConfig';
import {
  TUNNEL, buildZone, createCrateSkin, createDrone, createLandmark, disposeCrateSkins, disposeObject, type CrateSkin, type ZoneWorld,
} from './drone/droneScene';
import { disposeTileTextures, setMaxAnisotropy, skyMaterial } from './drone/droneMaterials';
import { Particles, Shockwaves, Trail, createGuide } from './drone/droneFx';
import { dailySeed, dayKey, randomSeed } from './drone/droneRng';
import { playDroneSfx, playRingChime, setDroneHum, closeDroneAudio, type DroneSfx } from './drone/droneSfx';
import { DroneRankingDialog, useDroneRanking } from './drone/DroneRanking';
import { DroneTouchControls } from './drone/DroneTouchControls';
import { DroneHud, RouteChips, type HudState } from './drone/DroneHud';
import { PowerButton, type PowerState } from './drone/PowerButton';
import './drone/drone.css';

/* Dron SGX (SGX.Spark 03.1): a 60–90 s run through three San Juan zones.
   Seeded courses ("Ruta del día" is the same for everyone that day), rings in
   the colors of the 6 pillars with a combo multiplier, partner crates, mines,
   four powers and a battery that drains while you play. */

type Phase = 'start' | 'tutorial' | 'playing' | 'paused' | 'over';
type Mode = 'daily' | 'free';
type Tone = 'cyan' | 'yellow' | 'alert';
type Flash = 'hit' | 'gate' | 'route';

interface RunResult {
  score: number;
  rings: number;
  crates: number;
  xp: number;
  best: number;
  newRecord: boolean;
  routes: number;
  battery: boolean;
  time: number;
  bestCombo: number;
  zones: number;
  mode: Mode;
  dailyBest: number;
}

interface Toast { id: number; text: string; tone: Tone }
interface Pop { id: number; text: string; color: string }

const idlePowers = (): Record<PowerKey, PowerState> =>
  Object.fromEntries(POWER_ORDER.map((k) => [k, { cooldown: 0, active: false }])) as Record<PowerKey, PowerState>;

const EMPTY_HUD: HudState = { score: 0, energy: 100, mult: 1, combo: 0, routeIdx: 0, routes: 0, time: 0, speed: 0, countdown: 0, warning: null };
const NEVER = -1e9;
const COUNTDOWN = 2.4;
const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');
const multFor = (combo: number) => Math.min(TUNING.maxCombo, 1 + Math.floor(combo / 3));

function readDaily(): { day: string; best: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null') as { day: string; best: number } | null;
    if (raw && raw.day === dayKey()) return raw;
  } catch {
    // Storage can be unavailable; the run still works.
  }
  return { day: dayKey(), best: 0 };
}

function storageFlag(key: string): boolean {
  try { return localStorage.getItem(key) === '1'; } catch { return true; }
}

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
  const [hud, setHud] = useState<HudState>(EMPTY_HUD);
  const [powers, setPowers] = useState<Record<PowerKey, PowerState>>(idlePowers);
  const [mode, setMode] = useState<Mode>('daily');
  const [zone, setZone] = useState<ZoneKey>('CHROMA');
  const [cameraMode, setCameraMode] = useState<'CHASE' | 'FPV'>('CHASE');
  const [muted, setMuted] = useState(getIsAudioMuted);
  const [guideOpen, setGuideOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pop, setPop] = useState<Pop | null>(null);
  const [flash, setFlash] = useState<{ id: number; kind: Flash } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [shareNote, setShareNote] = useState('');
  const [daily, setDaily] = useState(readDaily);

  const myBest = Math.max(savedBest, result?.score || 0);
  const ranking = useDroneRanking(rankingOpen || phase === 'over', myBest);

  // Mutable game state read by the render loop.
  const sim = useRef({
    scene: null as THREE.Scene | null,
    sky: null as THREE.ShaderMaterial | null,
    world: null as ZoneWorld | null,
    landmark: null as THREE.Group | null,
    crateSkins: [] as CrateSkin[],
    particles: null as Particles | null,
    waves: null as Shockwaves | null,
    trails: [] as Trail[],
    laserGeo: null as THREE.BufferGeometry | null,
    laserMat: null as THREE.Material | null,
    lasers: [] as Array<{ mesh: THREE.Mesh; life: number }>,

    pos: new THREE.Vector3(0, 17, 0),
    vel: new THREE.Vector3(),
    knock: new THREE.Vector3(),
    keys: new Set<string>(),
    shake: 0,
    fovKick: 0,
    invulnUntil: 0,

    turboEnd: 0,
    shieldEnd: 0,
    last: Object.fromEntries(POWER_ORDER.map((k) => [k, NEVER])) as Record<PowerKey, number>,
    usedPowers: new Set<PowerKey>(),

    score: 0,
    energy: 100,
    crates: 0,
    rings: 0,
    combo: 0,
    bestCombo: 0,
    trickXp: 0,
    routeIdx: 0,
    routes: 0,
    questFired: false,
    runTime: 0,
    countdown: 0,
    level: 0,
    seed: 0,

    mode: 'daily' as Mode,
    zone: 'CHROMA' as ZoneKey,
    cam: 'CHASE' as 'CHASE' | 'FPV',
    phase: 'start' as Phase,
    pausedAt: 0,
    lastHud: 0,
    needsRender: true,
    visible: true,
  });

  // Latest values for callbacks that the loop holds on to.
  const live = useRef({ es, savedBest, dialogs: false, recordDroneTrick, recordDroneFlight, recordActivity, reloadRanking: ranking.reload });
  live.current = { es, savedBest, dialogs: guideOpen || rankingOpen, recordDroneTrick, recordDroneFlight, recordActivity, reloadRanking: ranking.reload };

  const sponsors = useMemo(() => loadAllApprovedSponsors().filter((s) => s.activeInMiniGame && s.companyName), []);
  const reducedMotion = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  // Global shortcuts (immersion layer) stand down while a run is live.
  useEffect(() => {
    document.body.toggleAttribute('data-sgx-game', phase === 'playing');
    return () => document.body.removeAttribute('data-sgx-game');
  }, [phase]);

  // Follow the Summit-wide mute.
  useEffect(() => {
    const onMute = () => setMuted(getIsAudioMuted());
    window.addEventListener('sgx:audio_mute_changed', onMute);
    return () => window.removeEventListener('sgx:audio_mute_changed', onMute);
  }, []);
  useEffect(() => {
    if (muted) setDroneHum(false);
  }, [muted]);

  const sfx = useCallback((type: DroneSfx) => playDroneSfx(type), []);

  const toastSeq = useRef(0);
  const addToast = useCallback((text: string, tone: Tone = 'cyan') => {
    const id = ++toastSeq.current;
    setToasts((prev) => [...prev.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 1800);
  }, []);

  const showPop = useCallback((text: string, color: string) => {
    const id = ++toastSeq.current;
    setPop({ id, text, color });
    window.setTimeout(() => setPop((p) => (p?.id === id ? null : p)), 750);
  }, []);

  const flashScreen = useCallback((kind: Flash) => setFlash({ id: ++toastSeq.current, kind }), []);

  const flashBanner = useCallback((msg: string, ms = 1300) => {
    setBanner(msg);
    window.setTimeout(() => setBanner((prev) => (prev === msg ? null : prev)), ms);
  }, []);

  const placeLandmark = useCallback(() => {
    const s = sim.current;
    if (!s.landmark || !s.world) return;
    s.landmark.position.set(0, 78, s.world.gateZ - 300);
  }, []);

  const loadZone = useCallback((key: ZoneKey, level: number) => {
    const s = sim.current;
    if (!s.scene || !s.sky) return;
    if (s.world) {
      s.scene.remove(s.world.group);
      disposeObject(s.world.group);
    }
    const lite = window.matchMedia('(pointer: coarse)').matches;
    s.world = buildZone(key, s.scene, s.sky, { crateSkins: s.crateSkins, seed: (s.seed + level * 7919) >>> 0, level, lite });
    s.zone = key;
    placeLandmark();
    s.needsRender = true;
  }, [placeLandmark]);

  const clearEffects = useCallback(() => {
    const s = sim.current;
    s.lasers.forEach((l) => s.scene?.remove(l.mesh));
    s.lasers = [];
    s.particles?.clear();
    s.waves?.clear();
  }, []);

  const endRun = useCallback((battery: boolean) => {
    const s = sim.current;
    if (s.phase !== 'playing' && s.phase !== 'paused') return;
    s.phase = 'over';
    s.keys.clear();
    setDroneHum(false);
    const prevBest = live.current.savedBest;
    live.current.recordDroneFlight(s.score, s.crates, s.rings);
    let dailyBest = 0;
    if (s.mode === 'daily') {
      const d = readDaily();
      dailyBest = Math.max(d.best, s.score);
      const next = { day: d.day, best: dailyBest };
      try { localStorage.setItem(DAILY_KEY, JSON.stringify(next)); } catch { /* optional */ }
      setDaily(next);
    }
    setResult({
      score: s.score,
      rings: s.rings,
      crates: s.crates,
      xp: s.trickXp + runXp(s.score, s.crates, s.rings),
      best: Math.max(prevBest, s.score),
      newRecord: s.score > prevBest && s.score > 0,
      routes: s.routes,
      battery,
      time: Math.round(s.runTime),
      bestCombo: s.bestCombo,
      zones: s.level + 1,
      mode: s.mode,
      dailyBest,
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
    if (s.phase !== 'playing' || !s.scene || s.countdown > 0) return;
    const now = performance.now();
    if (now - s.last[key] < POWERS[key].cooldown) return;
    s.last[key] = now;
    const { es: e, recordDroneTrick: trick, recordActivity: activity } = live.current;
    // XP only for the first use of each power in a run.
    const firstUse = !s.usedPowers.has(key);
    s.usedPowers.add(key);

    if (key === 'turbo') {
      s.turboEnd = now + POWERS.turbo.duration;
      s.fovKick += 6;
      sfx('turbo');
      if (firstUse) {
        const xp = trick('speed_dash');
        s.trickXp += xp;
        addToast(`+${xp} XP · Turbo`, 'yellow');
      }
    } else if (key === 'shield') {
      s.shieldEnd = now + POWERS.shield.duration;
      sfx('shield');
      if (firstUse) {
        activity('drone_flight', e ? 'Escudo del dron' : 'Drone shield', e ? 'Activaste el escudo en el Dron SGX.' : 'You turned on the shield in the SGX Drone.', 35);
        s.trickXp += 35;
        addToast(`+35 XP · ${e ? 'Escudo' : 'Shield'}`);
      }
    } else if (key === 'emp') {
      let cleared = 0;
      s.world?.mines.forEach((m) => {
        if (!m.destroyed && m.mesh.position.distanceTo(s.pos) < 70) {
          m.destroyed = true;
          m.mesh.visible = false;
          s.particles?.burst(m.mesh.position, 0x00ddff, 18, 22);
          cleared++;
        }
      });
      s.waves?.spawn(s.pos, 0x00ddff);
      s.particles?.burst(s.pos, 0x00ddff, 40, 40, true, 2);
      s.shake = Math.max(s.shake, 0.5);
      sfx('emp');
      s.score += POINTS.pulseBase + cleared * POINTS.pulsePerMine;
      if (firstUse) {
        const xp = trick('emp_pulse');
        s.trickXp += xp;
        addToast(`+${xp} XP · ${e ? `Pulso (${cleared} minas)` : `Pulse (${cleared} mines)`}`);
      } else {
        addToast(e ? `Pulso: ${cleared} minas` : `Pulse: ${cleared} mines`);
      }
    } else if (key === 'laser' && s.laserGeo && s.laserMat) {
      [-0.9, 0.9].forEach((offX) => {
        const mesh = new THREE.Mesh(s.laserGeo!, s.laserMat!);
        mesh.position.set(s.pos.x + offX, s.pos.y, s.pos.z - 1.5);
        s.scene!.add(mesh);
        s.lasers.push({ mesh, life: 0.9 });
      });
      sfx('laser');
    }
  }, [addToast, sfx]);

  const pause = useCallback(() => {
    const s = sim.current;
    if (s.phase !== 'playing') return;
    s.phase = 'paused';
    s.pausedAt = performance.now();
    s.keys.clear();
    stickRef.current = { x: 0, y: 0 };
    setDroneHum(false);
    setPhase('paused');
  }, []);

  const resume = useCallback(() => {
    const s = sim.current;
    if (s.phase !== 'paused') return;
    // Timers stand still while paused.
    const delta = performance.now() - s.pausedAt;
    s.turboEnd += delta;
    s.shieldEnd += delta;
    s.invulnUntil += delta;
    POWER_ORDER.forEach((k) => { s.last[k] += delta; });
    s.phase = 'playing';
    setPhase('playing');
  }, []);

  const startRun = useCallback(() => {
    const s = sim.current;
    if (!storageFlag(TUTORIAL_KEY) && s.phase !== 'tutorial') {
      s.phase = 'tutorial';
      setPhase('tutorial');
      return;
    }
    clearEffects();
    s.seed = s.mode === 'daily' ? dailySeed() : randomSeed();
    s.level = 0;
    const first = s.mode === 'daily' ? 'CHROMA' : s.zone;
    setZone(first);
    loadZone(first, 0);
    s.pos.set(0, first === 'ISLA_VERDE' ? TUNNEL.cy : 17, 0);
    s.vel.set(0, 0, 0);
    s.knock.set(0, 0, 0);
    s.shake = 0;
    s.fovKick = 0;
    s.invulnUntil = 0;
    s.keys.clear();
    s.turboEnd = s.shieldEnd = 0;
    POWER_ORDER.forEach((k) => { s.last[k] = NEVER; });
    s.usedPowers.clear();
    s.score = 0;
    s.energy = 100;
    s.crates = 0;
    s.rings = 0;
    s.combo = 0;
    s.bestCombo = 0;
    s.trickXp = 0;
    s.routeIdx = 0;
    s.routes = 0;
    s.questFired = false;
    s.runTime = 0;
    s.countdown = COUNTDOWN;
    s.trails.forEach((t) => t.reset(s.pos));
    s.phase = 'playing';
    setHud(EMPTY_HUD);
    setPowers(idlePowers());
    setToasts([]);
    setBanner(null);
    setPop(null);
    setResult(null);
    setPhase('playing');
    sfx('gate');
    // Keep the whole stage under the sticky header.
    const r = rootRef.current?.getBoundingClientRect();
    if (r && (r.top < 90 || r.bottom > window.innerHeight)) rootRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [clearEffects, loadZone, sfx]);

  const finishTutorial = () => {
    try { localStorage.setItem(TUTORIAL_KEY, '1'); } catch { /* optional */ }
    startRun();
  };

  const pickZone = useCallback((key: ZoneKey) => {
    setZone(key);
    sim.current.zone = key;
    loadZone(key, 0);
  }, [loadZone]);

  const pickMode = useCallback((m: Mode) => {
    const s = sim.current;
    setMode(m);
    s.mode = m;
    s.seed = m === 'daily' ? dailySeed() : randomSeed();
    const z = m === 'daily' ? 'CHROMA' : s.zone;
    setZone(z);
    loadZone(z, 0);
  }, [loadZone]);

  // Three.js lifecycle: built once, disposed on unmount.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const s = sim.current;
    const coarse = window.matchMedia('(pointer: coarse)').matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
    let pixelRatio = Math.min(window.devicePixelRatio, coarse ? 1.5 : 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(62, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 1600);
    s.scene = scene;

    const sky = skyMaterial();
    s.sky = sky;
    const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(1000, 32, 16), sky);
    skyMesh.renderOrder = -1;
    skyMesh.frustumCulled = false;
    scene.add(skyMesh);
    scene.add(new THREE.HemisphereLight(0x9fdfff, 0x1a1208, 1.4));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6);
    sun.position.set(30, 60, 20);
    scene.add(sun);

    const drone = createDrone();
    scene.add(drone.group);
    drone.group.position.copy(s.pos);

    const landmark = createLandmark();
    landmark.group.scale.setScalar(120);
    scene.add(landmark.group);
    s.landmark = landmark.group;

    const particles = new Particles(reducedMotion ? 300 : 700);
    scene.add(particles.points);
    s.particles = particles;
    const waves = new Shockwaves();
    scene.add(waves.group);
    s.waves = waves;
    s.trails = [new Trail(0xfdcc0d), new Trail(0x00ddff)];
    s.trails.forEach((t) => { t.reset(s.pos); scene.add(t.mesh); });
    const guide = createGuide();
    guide.visible = false;
    scene.add(guide);

    const laserGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);
    laserGeo.rotateX(Math.PI / 2);
    s.laserGeo = laserGeo;
    s.laserMat = new THREE.MeshBasicMaterial({ color: 0xfdcc0d });

    s.crateSkins = sponsors.length
      ? sponsors.map((sp) => createCrateSkin(live.current.es ? sp.companyName : sp.companyNameEn || sp.companyName, sp.logoUrl))
      : [createCrateSkin('SGX', '/holo/sgxLogo.png')];
    s.seed = s.mode === 'daily' ? dailySeed() : randomSeed();
    loadZone(s.zone, 0);

    // Bloom on desktop only; phones get the same neon from emissive colors.
    let composer: { render: () => void; setSize: (w: number, h: number) => void; setPixelRatio: (r: number) => void; dispose: () => void } | null = null;
    let disposed = false;
    if (!coarse && !reducedMotion) {
      Promise.all([
        import('three/examples/jsm/postprocessing/EffectComposer.js'),
        import('three/examples/jsm/postprocessing/RenderPass.js'),
        import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
        import('three/examples/jsm/postprocessing/OutputPass.js'),
      ]).then(([{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }]) => {
        if (disposed) return;
        const c = new EffectComposer(renderer);
        c.setPixelRatio(pixelRatio);
        c.setSize(container.clientWidth, container.clientHeight);
        c.addPass(new RenderPass(scene, camera));
        c.addPass(new UnrealBloomPass(new THREE.Vector2(container.clientWidth / 2, container.clientHeight / 2), 0.55, 0.4, 0.72));
        c.addPass(new OutputPass());
        composer = c;
        s.needsRender = true;
      }).catch(() => {});
    }
    const draw = () => (composer ? composer.render() : renderer.render(scene, camera));

    const onResize = () => {
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer?.setSize(w, h);
      particles.setScale(h * pixelRatio);
      s.needsRender = true;
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const io = new IntersectionObserver(([entry]) => { s.visible = entry.isIntersecting; }, { threshold: 0.05 });
    io.observe(container);

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
      else if (k === 'KeyF') firePower('laser');
      else if (k === 'KeyV') toggleCamera();
    };
    const onKeyUp = (e: KeyboardEvent) => { s.keys.delete(e.code); };
    const onBlur = () => { s.keys.clear(); if (s.phase === 'playing') pause(); };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);

    const sphere = new THREE.Sphere(new THREE.Vector3(), 1.5);
    const ahead = new THREE.Vector3();
    const closest = new THREE.Vector3();
    const normal = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const look = new THREE.Vector3();
    const smoothLook = new THREE.Vector3(0, 17, -20);
    const tailPos = new THREE.Vector3();
    const toRing = new THREE.Vector3();
    const accentCol = new THREE.Color();
    let bank = 0;
    let lastTick = performance.now();
    let raf = 0;
    let frame = 0;
    let slowFrames = 0;

    const updateCamera = (dt: number, turbo: boolean) => {
      const k = 1 - Math.exp(-6 * dt);
      s.shake = Math.max(0, s.shake - dt * 2.8);
      s.fovKick = Math.max(0, s.fovKick - dt * 10);
      const amp = reducedMotion ? 0 : s.shake * 1.2;
      const shakeX = (Math.random() - 0.5) * amp;
      const shakeY = (Math.random() - 0.5) * amp;
      // Portrait screens get a wider lens and a longer boom so the lane still fits.
      const portrait = Math.max(0, 1 - camera.aspect);
      const targetFov = (s.cam === 'FPV' ? 72 : 62) + portrait * 22 + (turbo ? 14 : 0) + (reducedMotion ? 0 : s.fovKick);
      camera.fov += (targetFov - camera.fov) * (1 - Math.exp(-5 * dt));
      if (s.cam === 'FPV') {
        camera.position.set(s.pos.x + shakeX, s.pos.y + 0.4 + shakeY, s.pos.z - 1.4);
        look.set(s.pos.x + s.vel.x * 0.4, s.pos.y + s.vel.y * 0.3, s.pos.z - 30);
        camera.lookAt(look);
        camera.rotateZ(-bank * 0.5);
      } else {
        camTarget.set(s.pos.x * 0.88 - s.vel.x * 0.06, s.pos.y + 3.1 + portrait * 1.5 - s.vel.y * 0.05, 0);
        camera.position.x += (camTarget.x - camera.position.x) * k;
        camera.position.y += (camTarget.y - camera.position.y) * k;
        camera.position.z = s.pos.z + 9.5 + portrait * 7 + (turbo ? 1.6 : 0);
        camera.position.x += shakeX;
        camera.position.y += shakeY;
        // Look ahead of the drone, toward where it is heading.
        look.set(s.pos.x + s.vel.x * 0.35, s.pos.y + 0.8 + s.vel.y * 0.2, s.pos.z - 20);
        smoothLook.x += (look.x - smoothLook.x) * k;
        smoothLook.y += (look.y - smoothLook.y) * k;
        smoothLook.z = look.z;
        camera.lookAt(smoothLook);
        if (!reducedMotion) camera.rotateZ(-bank * 0.12);
      }
      camera.updateProjectionMatrix();
      skyMesh.position.copy(camera.position);
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);
      const rawDt = Math.min((time - lastTick) / 1000, 0.05);
      lastTick = time;
      frame++;
      const world = s.world;
      if (!world) return;

      if (s.phase !== 'playing') {
        // Idle: a slow orbit around the hovering drone behind the start screen; frozen frame otherwise.
        if (s.phase !== 'start' && s.phase !== 'tutorial' && !s.needsRender) return;
        if (!s.visible || document.hidden) return;
        if (!s.needsRender && frame % 2) return;
        s.needsRender = false;
        if (s.phase === 'start' || s.phase === 'tutorial') {
          const a = time / 4000;
          drone.group.position.set(0, (s.zone === 'ISLA_VERDE' ? TUNNEL.cy : 17) + Math.sin(time / 600) * 0.35, 0);
          drone.body.rotation.set(0, 0, Math.sin(time / 900) * 0.06);
          drone.rotors.forEach((r) => { r.rotation.y += 0.5; });
          const portrait = Math.max(0, 1 - camera.aspect);
          camera.position.set(Math.sin(a) * 9, drone.group.position.y + 2.5, 9 + portrait * 7 + Math.cos(a) * 3);
          camera.lookAt(0, drone.group.position.y, -14);
          camera.fov = 62 + portrait * 22;
          camera.updateProjectionMatrix();
          skyMesh.position.copy(camera.position);
          smoothLook.set(0, drone.group.position.y, -20);
          world.facade.uniforms.time.value = time / 1000;
          landmark.group.rotation.y = time / 6000;
        }
        draw();
        return;
      }

      const e = live.current.es;
      const turbo = time < s.turboEnd;
      const shielded = time < s.shieldEnd;
      const dt = rawDt;
      world.facade.uniforms.time.value = time / 1000;
      landmark.group.rotation.y = time / 6000;

      // Countdown: the drone hovers while the camera settles in behind it.
      if (s.countdown > 0) {
        const before = Math.ceil(s.countdown);
        s.countdown -= dt;
        if (Math.ceil(s.countdown) !== before && s.countdown > 0) sfx('miss');
        drone.group.position.copy(s.pos);
        drone.group.position.y += Math.sin(time / 300) * 0.15;
        drone.rotors.forEach((r) => { r.rotation.y += 0.6; });
        updateCamera(dt, false);
        particles.update(dt);
        draw();
        if (time - s.lastHud > 100) {
          s.lastHud = time;
          setHud((h) => ({ ...h, countdown: Math.max(0, Math.ceil(s.countdown)) }));
        }
        if (s.countdown <= 0) { sfx('gate'); setDroneHum(true, 0); }
        return;
      }
      s.runTime += dt;

      // Steering: keys and the touch stick add up; velocity eases toward the target.
      const keys = s.keys;
      const ax = THREE.MathUtils.clamp((keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) + stickRef.current.x, -1, 1);
      const ay = THREE.MathUtils.clamp((keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + stickRef.current.y, -1, 1);
      const cruise = Math.min(TUNING.maxSpeed, TUNING.baseSpeed + TUNING.speedRamp * s.runTime);
      const speed = cruise * (turbo ? TUNING.turboMul : 1) * (time < s.invulnUntil - 400 ? 0.7 : 1);
      const resp = 1 - Math.exp(-7 * dt);
      s.vel.x += (TUNING.lateral * ax - s.vel.x) * resp;
      s.vel.y += (TUNING.vertical * ay - s.vel.y) * resp;
      s.vel.z = -speed;

      const prevZ = s.pos.z;
      s.pos.x += (s.vel.x + s.knock.x) * dt;
      s.pos.y += (s.vel.y + s.knock.y) * dt;
      s.pos.z += (s.vel.z + s.knock.z) * dt;
      s.knock.multiplyScalar(Math.pow(0.02, dt));

      const hurt = (loss: number, msg: string) => {
        s.energy = Math.max(0, s.energy - loss);
        s.combo = 0;
        s.invulnUntil = time + 900;
        s.shake = 1.3;
        sfx('hit');
        flashScreen('hit');
        flashBanner(msg);
        if (s.energy <= 0) endRun(true);
      };

      // Bounds: soft floor, ceiling and lane walls (or the arch tunnel).
      if (world.tunnel) {
        const dx = s.pos.x - TUNNEL.cx;
        const dy = s.pos.y - TUNNEL.cy;
        const len = Math.hypot(dx, dy);
        if (len > TUNNEL.r) {
          s.pos.x = TUNNEL.cx + (dx / len) * TUNNEL.r;
          s.pos.y = TUNNEL.cy + (dy / len) * TUNNEL.r;
          s.vel.x *= 0.3;
          s.vel.y *= 0.3;
          if (s.shake < 0.3) {
            s.shake = 0.4;
            particles.burst(s.pos, 0xfdcc0d, 8, 14);
          }
        }
      } else {
        if (Math.abs(s.pos.x) > TUNING.laneX) { s.pos.x = Math.sign(s.pos.x) * TUNING.laneX; s.vel.x *= 0.3; }
        if (s.pos.y < TUNING.minY) {
          s.pos.y = TUNING.minY;
          s.vel.y = Math.max(0, s.vel.y);
          if (frame % 4 === 0) particles.emit(s.pos.x, 0.3, s.pos.z, (Math.random() - 0.5) * 8, 4, 10, 0x00ddff, 0.8, 0.4);
        }
        if (s.pos.y > TUNING.maxY) { s.pos.y = TUNING.maxY; s.vel.y = Math.min(0, s.vel.y); }
      }

      // Box colliders with a look-ahead warning.
      sphere.center.copy(s.pos);
      ahead.set(s.pos.x, s.pos.y, s.pos.z - speed * 0.55);
      let warning: string | null = null;
      for (const col of world.colliders) {
        if (col.box.max.z < s.pos.z - speed * 0.7 || col.box.min.z > s.pos.z + 4) continue;
        if (!warning && col.box.distanceToPoint(ahead) < 2.5) warning = e ? `${col.label.es} adelante` : `${col.label.en} ahead`;
        if (!col.box.intersectsSphere(sphere) || time - col.lastHitTime < 500) continue;
        col.lastHitTime = time;
        col.box.clampPoint(s.pos, closest);
        normal.copy(s.pos).sub(closest);
        if (normal.lengthSq() < 0.001) normal.set(s.pos.x >= 0 ? 1 : -1, 0.3, 0.6);
        normal.z = Math.max(normal.z, 0);
        normal.normalize();
        s.pos.addScaledVector(normal, 1.6);
        s.knock.set(normal.x * 30, normal.y * 24 + 4, 0);
        particles.burst(closest, shielded ? 0x00ddff : 0xff7a00, 30, 26);
        if (shielded || time < s.invulnUntil) {
          if (shielded) { sfx('shield'); addToast(e ? 'Escudo: sin daño' : 'Shield: no damage'); }
        } else {
          hurt(TUNING.hitLoss, e ? `${col.label.es} · −${TUNING.hitLoss}% batería` : `${col.label.en} · −${TUNING.hitLoss}% battery`);
          if (s.phase !== 'playing') return;
        }
      }

      // Rings: judged when the drone crosses their plane.
      let nextRing: (typeof world.rings)[number] | null = null;
      for (const ring of world.rings) {
        if (ring.passed || ring.missed) continue;
        if (prevZ > ring.z && s.pos.z <= ring.z) {
          const radial = Math.hypot(s.pos.x - ring.mesh.position.x, s.pos.y - ring.mesh.position.y);
          if (radial < TUNING.catchRadius) {
            ring.passed = true;
            ring.mesh.visible = false;
            const perfect = radial < TUNING.perfectRadius;
            s.rings += 1;
            s.combo += 1;
            s.bestCombo = Math.max(s.bestCombo, s.combo);
            const mult = multFor(s.combo);
            const pts = (POINTS.ring + (perfect ? POINTS.perfect : 0)) * mult * (turbo ? 2 : 1);
            s.score += pts;
            s.energy = Math.min(100, s.energy + TUNING.ringCharge + (perfect ? 1 : 0));
            const color = ROUTE_COLORS[ring.colorIdx];
            waves.spawn(ring.mesh.position, color);
            particles.burst(ring.mesh.position, color, reducedMotion ? 14 : 36, 18, true, TUNING.ringRadius);
            s.fovKick += 3;
            playRingChime(Math.min(s.combo - 1, 7), perfect);
            showPop(`+${pts}${mult > 1 ? ` ×${mult}` : ''}${perfect ? (e ? ' · Perfecto' : ' · Perfect') : ''}`, color);
            if (mult > multFor(s.combo - 1)) addToast(e ? `Multiplicador ×${mult}` : `Multiplier ×${mult}`, 'yellow');
            // 6 Pillars Route: rings in pillar order, back to back.
            s.routeIdx = ring.colorIdx === s.routeIdx ? s.routeIdx + 1 : ring.colorIdx === 0 ? 1 : 0;
            if (s.routeIdx === ROUTE_COLORS.length) {
              s.routeIdx = 0;
              s.routes += 1;
              s.score += ROUTE_BONUS;
              s.energy = Math.min(100, s.energy + 5);
              sfx('route');
              flashScreen('route');
              flashBanner(e ? `Ruta de los 6 pilares enlazada · +${fmt(ROUTE_BONUS, e)}` : `6 Pillars Route linked · +${fmt(ROUTE_BONUS, e)}`, 1800);
              ROUTE_COLORS.forEach((c, i) => particles.burst(s.pos, c, 10, 16 + i * 2));
              if (!s.questFired) {
                s.questFired = true;
                window.dispatchEvent(new Event(ROUTE_EVENT));
              }
            }
          } else {
            ring.missed = true;
            if (s.combo > 0 || s.routeIdx > 0) {
              sfx('miss');
              addToast(e ? `Anillo ${ROUTE_NAMES[ring.colorIdx]} perdido · combo a 0` : `Missed ${ROUTE_NAMES[ring.colorIdx]} ring · combo reset`, 'alert');
            }
            s.combo = 0;
            s.routeIdx = 0;
          }
          continue;
        }
        if (!nextRing && ring.z < s.pos.z) nextRing = ring;
      }

      // Guide chevron toward the next ring, and a pulse on that ring.
      if (nextRing && nextRing.z > s.pos.z - 260 && s.cam === 'CHASE') {
        toRing.copy(nextRing.mesh.position).sub(s.pos).normalize();
        guide.position.copy(s.pos).addScaledVector(toRing, 4.5);
        guide.position.y += 0.6;
        guide.lookAt(nextRing.mesh.position);
        (guide.material as THREE.MeshBasicMaterial).color.set(ROUTE_COLORS[nextRing.colorIdx]);
        (guide.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(time / 120) * 0.25;
        guide.visible = true;
        nextRing.mesh.scale.setScalar(1 + Math.sin(time / 140) * 0.06);
      } else {
        guide.visible = false;
      }

      for (const crate of world.crates) {
        if (crate.collected) continue;
        crate.mesh.rotation.y += dt * 1.6;
        crate.mesh.position.y += Math.sin(time / 400 + crate.z) * 0.01;
        if (Math.abs(s.pos.z - crate.z) < 3.5 && crate.mesh.position.distanceTo(s.pos) < 4.2) {
          crate.collected = true;
          crate.mesh.visible = false;
          s.crates += 1;
          s.score += POINTS.crate;
          s.energy = Math.min(100, s.energy + TUNING.crateCharge);
          particles.burst(crate.mesh.position, 0xfdcc0d, 30, 20);
          sfx('crate');
          addToast(`+${POINTS.crate} pts · ${crate.sponsor} · +${TUNING.crateCharge}%`, 'yellow');
        }
      }

      world.mineMat.emissiveIntensity = 0.8 + Math.sin(time / 150) * 0.5;
      for (const mine of world.mines) {
        if (mine.destroyed) continue;
        mine.mesh.rotation.y += mine.spin * dt;
        mine.mesh.rotation.x += mine.spin * 0.5 * dt;
        if (Math.abs(s.pos.z - mine.z) < 3 && mine.mesh.position.distanceTo(s.pos) < 3.3) {
          mine.destroyed = true;
          mine.mesh.visible = false;
          particles.burst(mine.mesh.position, 0xff7a00, 40, 30);
          sfx('mine');
          if (shielded || time < s.invulnUntil) {
            if (shielded) addToast(e ? 'Escudo: mina sin daño' : 'Shield: mine blocked');
          } else {
            s.knock.set((Math.random() - 0.5) * 24, 10, 0);
            hurt(TUNING.mineLoss, e ? `Mina · −${TUNING.mineLoss}% batería` : `Mine · −${TUNING.mineLoss}% battery`);
            if (s.phase !== 'playing') return;
          }
        }
      }

      for (let i = s.lasers.length - 1; i >= 0; i--) {
        const l = s.lasers[i];
        l.mesh.position.z -= (speed + 160) * dt;
        l.life -= dt;
        for (const mine of world.mines) {
          if (!mine.destroyed && mine.mesh.position.distanceTo(l.mesh.position) < 4.5) {
            mine.destroyed = true;
            mine.mesh.visible = false;
            l.life = 0;
            s.score += POINTS.mine;
            particles.burst(mine.mesh.position, 0xfdcc0d, 30, 26);
            sfx('mine');
            showPop(`+${POINTS.mine} · ${e ? 'Mina' : 'Mine'}`, '#FF7A00');
          }
        }
        if (l.life > 0 && world.colliders.some((c) => c.box.containsPoint(l.mesh.position))) {
          particles.burst(l.mesh.position, 0x00ddff, 8, 12);
          l.life = 0;
        }
        if (l.life <= 0) {
          scene.remove(l.mesh);
          s.lasers.splice(i, 1);
        }
      }

      // Battery drains faster the longer the run lasts.
      s.energy -= (TUNING.drainBase + TUNING.drainRamp * s.runTime) * dt;
      if (s.energy <= 0) {
        s.energy = 0;
        endRun(true);
        return;
      }

      // Zone gate: on to the next zone, a little harder.
      if (s.pos.z < world.gateZ) {
        s.level += 1;
        const next = ZONE_ORDER[(ZONE_ORDER.indexOf(s.zone) + 1) % ZONE_ORDER.length];
        clearEffects();
        loadZone(next, s.level);
        setZone(next);
        s.pos.z = 0;
        if (next === 'ISLA_VERDE') { s.pos.x *= 0.5; s.pos.y = TUNNEL.cy + (s.pos.y - TUNNEL.cy) * 0.5; }
        s.trails.forEach((t) => t.reset(s.pos));
        s.score += POINTS.gate;
        sfx('gate');
        flashScreen('gate');
        flashBanner(`${zoneName(next, e)} · +${fmt(POINTS.gate, e)}`, 1600);
        return;
      }

      // Drone pose: bank into turns, pitch with climbs, spin the rotors.
      const d = drone.group;
      d.position.copy(s.pos);
      bank += (s.vel.x / TUNING.lateral - bank) * (1 - Math.exp(-8 * dt));
      drone.body.rotation.z = -bank * 0.65;
      drone.body.rotation.x = (s.vel.y / TUNING.vertical) * 0.28 - 0.12 - (turbo ? 0.1 : 0);
      drone.body.rotation.y = -bank * 0.12;
      drone.rotors.forEach((r, i) => { r.rotation.y += (turbo ? 0.9 : 0.55) * (i % 2 ? 1 : -1); });
      const shieldMat = drone.shield.material as THREE.MeshBasicMaterial;
      const blink = time < s.invulnUntil && !shielded ? (Math.floor(time / 80) % 2 ? 0.25 : 0) : 0;
      shieldMat.opacity = shielded ? 0.55 : blink;
      shieldMat.color.setHex(shielded ? 0x00ddff : 0xff7a00);
      drone.shield.rotation.y += dt * 1.5;
      drone.glow.intensity = turbo ? 30 : 18;

      // Trails, speed dust and pooled effects.
      d.updateMatrixWorld();
      drone.tails.forEach((tail, i) => {
        tail.getWorldPosition(tailPos);
        s.trails[i]?.update(tailPos, camera.position, turbo ? 1 : 0);
      });
      const motes = reducedMotion ? 0 : turbo ? 4 : 1;
      accentCol.set(ZONES[s.zone].accent);
      for (let m = 0; m < motes; m++) {
        const a = Math.random() * Math.PI * 2;
        const r = 9 + Math.random() * 18;
        particles.emit(s.pos.x + Math.cos(a) * r, s.pos.y + Math.sin(a) * r * 0.7, s.pos.z - 70 - Math.random() * 30, 0, 0, 0, accentCol, turbo ? 0.22 : 0.14, 1.6);
      }
      particles.update(dt);
      waves.update(dt);

      updateCamera(dt, turbo);
      draw();

      // Drop quality if the device can't keep up.
      if (rawDt > 0.026) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 90 && (composer || pixelRatio > 1)) {
        slowFrames = 0;
        if (composer) { composer.dispose(); composer = null; }
        else {
          pixelRatio = 1;
          renderer.setPixelRatio(1);
          onResize();
        }
      }

      // HUD at 10 Hz: React does not need every frame.
      if (time - s.lastHud > 100) {
        s.lastHud = time;
        const nextPowers = {} as Record<PowerKey, PowerState>;
        POWER_ORDER.forEach((k) => {
          nextPowers[k] = {
            cooldown: Math.max(0, 1 - (time - s.last[k]) / POWERS[k].cooldown),
            active: k === 'turbo' ? turbo : k === 'shield' ? shielded : false,
          };
        });
        setPowers(nextPowers);
        setDroneHum(true, (speed - TUNING.baseSpeed) / (TUNING.maxSpeed * TUNING.turboMul - TUNING.baseSpeed));
        setHud({
          score: s.score, energy: s.energy, mult: multFor(s.combo), combo: s.combo, routeIdx: s.routeIdx, routes: s.routes,
          time: s.runTime, speed: Math.round(speed * 3.6), countdown: 0, warning,
        });
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      s.trails.forEach((t) => { scene.remove(t.mesh); t.dispose(); });
      particles.dispose();
      waves.dispose();
      landmark.dispose();
      scene.remove(landmark.group, particles.points, waves.group);
      disposeObject(scene);
      disposeCrateSkins(s.crateSkins);
      disposeTileTextures();
      laserGeo.dispose();
      s.laserMat?.dispose();
      composer?.dispose();
      // No forceContextLoss: StrictMode remounts on the same canvas.
      renderer.dispose();
      setDroneHum(false);
      closeDroneAudio();
      s.scene = null;
      s.sky = null;
      s.world = null;
      s.landmark = null;
      s.particles = null;
      s.waves = null;
      s.trails = [];
      s.lasers = [];
      s.phase = 'start';
    };
    // Built once; callbacks read the latest values through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const backToMenu = () => {
    const s = sim.current;
    s.phase = 'start';
    setResult(null);
    setPhase('start');
    pickMode(s.mode);
  };

  const openGuide = () => { pause(); setGuideOpen(true); };
  const openRanking = () => { pause(); setRankingOpen(true); };
  const toggleSound = () => { setMuted(toggleAudioMute()); };

  const share = async () => {
    const url = `${window.location.origin}/juegos`;
    const pts = fmt(result?.score || 0, es);
    const daily = result?.mode === 'daily';
    const text = es
      ? `Hice ${pts} pts en ${daily ? 'la Ruta del día del' : 'el'} Dron SGX del Spatialgineers Summit 2026. ¿Me superas?`
      : `I scored ${pts} pts ${daily ? "on today's route of" : 'in'} the SGX Drone at Spatialgineers Summit 2026. Can you beat me?`;
    if (navigator.share) {
      try {
        await navigator.share({ title: es ? 'Dron SGX' : 'SGX Drone', text, url });
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

  const cameraLabel = cameraMode === 'CHASE' ? (es ? 'Cámara: 3ª persona' : 'Camera: chase') : (es ? 'Cámara: 1ª persona' : 'Camera: first person');
  const pillarBar = <div className="sgx-drone__pillarbar" aria-hidden>{ROUTE_COLORS.map((c) => <i key={c} style={{ background: c }} />)}</div>;
  const inRun = phase === 'playing' || phase === 'paused';
  const todayLabel = new Date(`${daily.day}T12:00:00`).toLocaleDateString(es ? 'es-PR' : 'en-US', { day: 'numeric', month: 'short' });

  return (
    <section ref={rootRef} className="sgx-drone" data-drone-game aria-label={es ? 'Dron SGX' : 'SGX Drone'}>
      <div ref={containerRef} className="sgx-drone__stage">
        <canvas
          ref={canvasRef}
          className="sgx-drone__canvas"
          onPointerDown={(ev) => { if (ev.pointerType === 'mouse' && phase === 'playing') firePower('laser'); }}
        />
        {flash && <div key={flash.id} className={`sgx-drone__flash is-${flash.kind}`} aria-hidden />}

        {inRun && (
          <DroneHud
            es={es}
            hud={hud}
            paused={phase === 'paused'}
            muted={muted}
            cameraLabel={cameraLabel}
            zoneLabel={zoneName(zone, es)}
            onCamera={toggleCamera}
            onSound={toggleSound}
            onPause={phase === 'paused' ? resume : pause}
          />
        )}

        {phase === 'playing' && (
          <>
            {hud.countdown > 0 && <div className="sgx-drone__countdown" key={hud.countdown} aria-live="assertive">{hud.countdown}</div>}
            <div className="sgx-drone__alerts" aria-live="polite">
              {(banner || hud.warning) && <span className={banner ? 'is-crash' : ''}>{banner || hud.warning}</span>}
            </div>
            {pop && <div key={pop.id} className="sgx-drone__pop" style={{ color: pop.color }} aria-hidden>{pop.text}</div>}
            <div className="sgx-drone__toasts" aria-live="polite">
              {toasts.map((t) => <span key={t.id} className={`is-${t.tone}`}>{t.text}</span>)}
            </div>
            <div className="sgx-drone__powers">
              {POWER_ORDER.map((k) => <PowerButton key={k} def={POWERS[k]} state={powers[k]} es={es} onPress={() => firePower(k)} />)}
            </div>
            <DroneTouchControls es={es} stick={stickRef} powers={powers} onPower={firePower} />
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
                  ? 'Cruza San Juan a toda velocidad: pasa los anillos de los 6 pilares en orden, encadena combos y recoge las cajas de los partners antes de que se acabe la batería.'
                  : 'Race across San Juan: clear the 6 pillar rings in order, chain combos and grab the partner crates before the battery runs out.'}
              </p>
              <div className="sgx-drone__modes" role="radiogroup" aria-label={es ? 'Modo de juego' : 'Game mode'}>
                <button type="button" role="radio" aria-checked={mode === 'daily'} className={`sgx-drone__mode ${mode === 'daily' ? 'is-on' : ''}`} onClick={() => pickMode('daily')} data-drone-mode="daily">
                  <CalendarDays aria-hidden />
                  <span>
                    <strong>{es ? 'Ruta del día' : "Today's route"} · {todayLabel}</strong>
                    <small>{es ? 'El mismo recorrido para todos hoy.' : 'The same course for everyone today.'}{daily.best > 0 && <> {es ? 'Tu mejor hoy' : 'Your best today'}: <b>{fmt(daily.best, es)}</b></>}</small>
                  </span>
                </button>
                <button type="button" role="radio" aria-checked={mode === 'free'} className={`sgx-drone__mode ${mode === 'free' ? 'is-on' : ''}`} onClick={() => pickMode('free')} data-drone-mode="free">
                  <Shuffle aria-hidden />
                  <span>
                    <strong>{es ? 'Libre' : 'Free run'}</strong>
                    <small>{es ? 'Recorrido nuevo cada partida; tú eliges la zona.' : 'A new course every run; you pick the zone.'}</small>
                  </span>
                </button>
              </div>
              {mode === 'free' && (
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
              )}
              <div className="sgx-drone__route-hint">
                <RouteChips linked={6} es={es} />
                <p>
                  <b>{es ? 'Ruta de los 6 pilares' : '6 Pillars Route'}</b>{' '}
                  {es ? `Seis anillos seguidos en orden: +${fmt(ROUTE_BONUS, es)} pts.` : `Six rings in a row, in order: +${fmt(ROUTE_BONUS, es)} pts.`}
                </p>
              </div>
              <div className="sgx-drone__buttons">
                <button type="button" className="sgx-btn" onClick={startRun} data-drone-start><Play className="w-4 h-4" aria-hidden />{es ? 'Jugar' : 'Play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openGuide} data-drone-guide><HelpCircle className="w-4 h-4" aria-hidden />{es ? 'Cómo se juega' : 'How to play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openRanking} data-drone-ranking><Trophy className="w-4 h-4" aria-hidden />Ranking</button>
              </div>
              {savedBest > 0 && <p className="sgx-drone__best">{es ? 'Tu mejor puntaje' : 'Your best score'}: <b>{fmt(savedBest, es)} pts</b></p>}
            </div>
            <div className="sgx-drone__sponsor">
              <TransientSponsorSlot slotId="drone_preflight" variant="hud" showSubtitleLink />
            </div>
          </div>
        )}

        {phase === 'tutorial' && (
          <div className="sgx-drone__overlay">
            <div className="sgx-drone__panel" role="group" aria-label={es ? 'Antes de empezar' : 'Before you start'}>
              {pillarBar}
              <p className="sgx-drone__kicker">{es ? 'Antes de empezar · 20 s' : 'Before you start · 20 s'}</p>
              <h2>{es ? 'Así se juega' : 'How it works'}</h2>
              <ol className="sgx-drone__tut">
                <li>
                  <span className="sgx-drone__tut-art is-move" aria-hidden><i /></span>
                  <div>
                    <strong>{es ? 'Muévete' : 'Steer'}</strong>
                    <p>{es ? 'Pon el pulgar a la izquierda y arrastra. En teclado: WASD o flechas.' : 'Thumb down on the left and drag. On a keyboard: WASD or arrows.'}</p>
                  </div>
                </li>
                <li>
                  <span className="sgx-drone__tut-art" aria-hidden><RouteChips linked={3} es={es} /></span>
                  <div>
                    <strong>{es ? 'Anillos en orden' : 'Rings in order'}</strong>
                    <p>{es ? 'Sigue la flecha. Cada anillo seguido sube el combo; seis en orden enlazan la Ruta de los 6 pilares.' : 'Follow the arrow. Every ring in a row raises the combo; six in order link the 6 Pillars Route.'}</p>
                  </div>
                </li>
                <li>
                  <span className="sgx-drone__tut-art is-battery" aria-hidden><i /></span>
                  <div>
                    <strong>{es ? 'Cuida la batería' : 'Mind the battery'}</strong>
                    <p>{es ? 'Baja con el tiempo y con cada choque. Los anillos y las cajas de los partners la recargan.' : 'It drains over time and with every crash. Rings and partner crates recharge it.'}</p>
                  </div>
                </li>
              </ol>
              <div className="sgx-drone__buttons">
                <button type="button" className="sgx-btn" onClick={finishTutorial} data-drone-tutorial-go autoFocus><Play className="w-4 h-4" aria-hidden />{es ? '¡A jugar!' : "Let's go!"}</button>
              </div>
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
              <p className="sgx-drone__kicker">
                {result.mode === 'daily' ? `${es ? 'Ruta del día' : "Today's route"} · ${todayLabel}` : (es ? 'Libre' : 'Free run')}
                {' · '}{result.battery ? (es ? 'Sin batería' : 'Out of battery') : zoneName(zone, es)}
              </p>
              <h2>{result.newRecord ? (es ? '¡Nuevo récord!' : 'New best!') : (es ? 'Partida terminada' : 'Run over')}</h2>
              <dl className="sgx-drone__stats">
                <div><dt>{es ? 'Puntos' : 'Points'}</dt><dd className="is-yellow">{fmt(result.score, es)}</dd></div>
                <div><dt>{es ? 'Anillos' : 'Rings'}</dt><dd>{result.rings}</dd></div>
                <div><dt>{es ? 'Mejor combo' : 'Best combo'}</dt><dd>{result.bestCombo}</dd></div>
                <div><dt>{es ? 'Tiempo' : 'Time'}</dt><dd>{result.time} s</dd></div>
                <div><dt>{es ? 'XP ganada' : 'XP earned'}</dt><dd>+{fmt(result.xp, es)}</dd></div>
                <div><dt>{es ? 'Tu mejor' : 'Your best'}</dt><dd className="is-yellow">{fmt(result.best, es)}</dd></div>
              </dl>
              <div className="sgx-drone__route-hint">
                <RouteChips linked={result.routes > 0 ? 6 : 0} es={es} />
                <p>
                  <b>{es ? 'Ruta de los 6 pilares' : '6 Pillars Route'}</b>{' '}
                  {result.routes > 0
                    ? (es ? `enlazada ${result.routes} ${result.routes === 1 ? 'vez' : 'veces'}.` : `linked ${result.routes} ${result.routes === 1 ? 'time' : 'times'}.`)
                    : (es ? 'sin enlazar esta vez: seis anillos seguidos en orden.' : 'not linked this time: six rings in a row, in order.')}
                </p>
              </div>
              <p className="sgx-drone__rankline" role="status">
                {result.mode === 'daily' && <span>{es ? `Tu mejor hoy: ${fmt(result.dailyBest, es)}` : `Your best today: ${fmt(result.dailyBest, es)}`} · </span>}
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
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={backToMenu} data-drone-menu>{es ? 'Menú' : 'Menu'}</button>
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
