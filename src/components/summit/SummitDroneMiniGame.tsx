import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import {
  Play,
  RotateCcw,
  Trophy,
  Zap,
  Shield,
  Crosshair,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Volume2,
  VolumeX,
  HelpCircle,
  Wind,
  Radio,
  Activity,
  Camera,
  Clock,
  Target,
  Boxes,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { QuickGuideModal, GuideStep } from '../common/QuickGuideModal';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { TransientSponsorSlot } from './TransientSponsorSlot';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

// Exotic Sectors Taxonomy
export type ExoticSector = 'CYBERPUNK_CHROMA' | 'TROPICAL_ARCHIPELAGO' | 'QUANTUM_TUNNEL';

interface SectorConfig {
  id: ExoticSector;
  name: string;
  nameEn?: string;
  code: string;
  subtitle: string;
  subtitleEn?: string;
  fogColor: number;
  skyColor: number;
  ambientColor: number;
  laneColor: number;
  accentColor: string;
  description: string;
  descriptionEn?: string;
}

const EXOTIC_SECTORS: Record<ExoticSector, SectorConfig> = {
  CYBERPUNK_CHROMA: {
    id: 'CYBERPUNK_CHROMA',
    name: 'Sector Alpha • Chroma Cyberpunk 2026',
    nameEn: 'Sector Alpha • Chroma Cyberpunk 2026',
    code: 'SEC-A // CHROMA_PR',
    subtitle: 'Rascacielos con colisión real Box3, puentes de neón y anillos sobre San Juan',
    subtitleEn: 'Skyscrapers with real Box3 collision, neon bridges and rings over San Juan',
    fogColor: 0x070b16,
    skyColor: 0x05070e,
    ambientColor: 0x243552,
    laneColor: 0x00ffff,
    accentColor: '#00DDFF',
    description:
      'Vuelo urbano de alta precisión entre las torres y puentes aéreos de Chroma Space Studios con colisiones físicas reales.',
    descriptionEn: 'High-precision urban flight between the towers and skybridges of Chroma Space Studios with real physical collisions.',
  },
  TROPICAL_ARCHIPELAGO: {
    id: 'TROPICAL_ARCHIPELAGO',
    name: 'Sector Beta • Archipiélago Espacial Tropical',
    nameEn: 'Sector Beta • Tropical Space Archipelago',
    code: 'SEC-B // CARIBBEAN_ORBIT',
    subtitle: 'Islas flotantes macizas, obeliscos de cristal y campos gravitacionales',
    subtitleEn: 'Massive floating islands, crystal obelisks and gravity fields',
    fogColor: 0x061923,
    skyColor: 0x031018,
    ambientColor: 0x1d4d5e,
    laneColor: 0x00ffaa,
    accentColor: '#00FFAA',
    description:
      'Esquiva islas flotantes y monolitos bioluminiscentes con rebote físico vectorial en tiempo real.',
    descriptionEn: 'Dodge floating islands and bioluminescent monoliths with real-time vector physics bounce.',
  },
  QUANTUM_TUNNEL: {
    id: 'QUANTUM_TUNNEL',
    name: 'Sector Gamma • Túnel Hiperespacial Cuántico',
    nameEn: 'Sector Gamma • Quantum Hyperspace Tunnel',
    code: 'SEC-G // WARP_HEX_CORRIDOR',
    subtitle: 'Corredor hexagonal con compuertas físicas de iris y barreras láser',
    subtitleEn: 'Hexagonal corridor with physical iris gates and laser barriers',
    fogColor: 0x16002c,
    skyColor: 0x0d001a,
    ambientColor: 0x48116b,
    laneColor: 0xff00bb,
    accentColor: '#FF00BB',
    description:
      'Corredor dimensional de aceleración taquiónica con paredes cilíndricas y compuertas de colisión activa.',
    descriptionEn: 'Dimensional tachyon-acceleration corridor with cylindrical walls and active collision gates.',
  },
};

interface FloatingXpToast {
  id: string;
  text: string;
  color: string;
  time: number;
}

interface DroneColliderVolume {
  box: THREE.Box3;
  type: 'BUILDING' | 'SKYBRIDGE' | 'ISLAND' | 'TUNNEL_GATE';
  label: string;
  mesh: THREE.Object3D;
  lastHitTime: number;
}

interface ImpactSparkBurst {
  points: THREE.Points;
  velocities: Float32Array;
  life: number;
}

const DRONE_GUIDE_STEPS: GuideStep[] = [
  {
    badge: 'GUÍA 1/3 • MOTOR DE COLISIONES 3D BOX3 & BARREL ROLL',
    title: 'Física de Colisiones Reales y Maniobras Evasivas',
    subtitle: 'Edificios, islas, puentes aéreos y bordes de anillos con impacto físico',
    description:
      'Cada edificio, puente aéreo, isla flotante y borde metálico de anillo posee volumen físico real (THREE.Box3). Si chocas sin escudo, tu dron rebotará físicamente con chispas 3D y sacudida de cámara. Usa "Q" para ejecutar un Barrel Roll evasivo.',
    icon: Crosshair,
    keyControls: [
      { key: 'W / S / ↑ / ↓', action: 'Ascender / Descender en altitud' },
      { key: 'A / D / ← / →', action: 'Giro lateral / Alabeo aerodinámico' },
      { key: 'Q / Botón Roll', action: 'Barrel Roll Evasivo 360° (+40 XP & Evasión)', xpBadge: '+40 XP' },
      { key: 'V / Botón Cam', action: 'Alternar Chase 3D <-> Cockpit FPV' },
    ],
    tips: [
      'Apunta al centro limpio de los anillos de neón: rozar el borde metálico exterior provocará un rebote físico.',
      'Observa el radar de proximidad superior: te avisará cuando un edificio o isla esté en tu trayectoria directa.',
    ],
  },
  {
    badge: 'GUÍA 2/3 • SUITE DE 6 PODERES TÁCTICOS',
    title: 'Armamento Fotónico, Escudo y Dilatación Temporal',
    subtitle: 'Hyper Turbo, Escudo de Plasma, Pulso EMP, Bullet Time, Barrel Roll y Láser',
    description:
      'Combina tus poderes para sobrevivir a los corredores de rascacielos y destruir minas cuánticas antes del impacto.',
    icon: Wind,
    keyControls: [
      { key: 'SPACE / Turbo', action: 'Hyper Turbo Boost (Velocidad 2.6x)', xpBadge: '+30 XP' },
      { key: 'E / Escudo', action: 'Escudo de Plasma (Rebota sin daño en edificios/minas)', xpBadge: '+35 XP' },
      { key: 'X / EMP', action: 'Pulso EMP Cuántico (Vaporiza minas cercanas)', xpBadge: '+60 XP' },
      { key: 'C / Bullet Time', action: 'Dilatación Temporal (Cámara lenta de precisión)', xpBadge: '+45 XP' },
      { key: 'F / Click / Láser', action: 'Láser Twin-Blaster (Destruye obstáculos)', xpBadge: '+25 XP' },
    ],
    tips: [
      'Activa el Escudo de Plasma (E) antes de atravesar zonas densas de edificios o compuertas estrechas.',
      'Usa Bullet Time (C) para alinear tu dron con el centro exacto de los anillos en curvas cerradas.',
    ],
  },
  {
    badge: 'GUÍA 3/3 • 3 SECTORES EXÓTICOS & TELEMETRÍA XP',
    title: 'Exploración de Mundos & Sincronización en Vivo',
    subtitle: 'Sector Chroma Cyberpunk, Archipiélago Tropical y Túnel Hiperespacial',
    description:
      'Cruza el portal estelar al final de cada corredor (-860m) para saltar al siguiente mundo exótico con +100 XP de bonificación.',
    icon: Trophy,
    tips: [
      'Las cajas doradas de sponsors restauran +25% de batería al instante.',
      'Mantén una racha de anillos limpios sin colisiones para multiplicar tu puntaje final.',
    ],
  },
];

const DRONE_GUIDE_STEPS_EN: GuideStep[] = [
  {
    badge: 'GUIDE 1/3 • BOX3 3D COLLISION ENGINE & BARREL ROLL',
    title: 'Real Collision Physics and Evasive Maneuvers',
    subtitle: 'Buildings, islands, skybridges and ring edges with physical impact',
    description:
      'Every building, skybridge, floating island and metal ring edge has real physical volume (THREE.Box3). If you crash without a shield, your drone bounces back physically with 3D sparks and camera shake. Press "Q" for an evasive Barrel Roll.',
    icon: Crosshair,
    keyControls: [
      { key: 'W / S / ↑ / ↓', action: 'Climb / Descend' },
      { key: 'A / D / ← / →', action: 'Lateral turn / Aerodynamic roll' },
      { key: 'Q / Roll Button', action: '360° Evasive Barrel Roll (+40 XP & Evasion)', xpBadge: '+40 XP' },
      { key: 'V / Cam Button', action: 'Toggle 3D Chase <-> FPV Cockpit' },
    ],
    tips: [
      'Aim for the clean center of the neon rings: grazing the outer metal edge causes a physical bounce.',
      'Watch the proximity radar at the top: it warns you when a building or island is directly in your path.',
    ],
  },
  {
    badge: 'GUIDE 2/3 • SUITE OF 6 TACTICAL POWERS',
    title: 'Photon Weapons, Shield and Time Dilation',
    subtitle: 'Hyper Turbo, Plasma Shield, EMP Pulse, Bullet Time, Barrel Roll and Laser',
    description:
      'Combine your powers to survive the skyscraper corridors and destroy quantum mines before impact.',
    icon: Wind,
    keyControls: [
      { key: 'SPACE / Turbo', action: 'Hyper Turbo Boost (2.6x speed)', xpBadge: '+30 XP' },
      { key: 'E / Shield', action: 'Plasma Shield (Bounce off buildings/mines unharmed)', xpBadge: '+35 XP' },
      { key: 'X / EMP', action: 'Quantum EMP Pulse (Vaporizes nearby mines)', xpBadge: '+60 XP' },
      { key: 'C / Bullet Time', action: 'Time Dilation (Precision slow motion)', xpBadge: '+45 XP' },
      { key: 'F / Click / Laser', action: 'Twin-Blaster Laser (Destroys obstacles)', xpBadge: '+25 XP' },
    ],
    tips: [
      'Turn on the Plasma Shield (E) before flying through dense building zones or narrow gates.',
      'Use Bullet Time (C) to line your drone up with the exact center of the rings on tight curves.',
    ],
  },
  {
    badge: 'GUIDE 3/3 • 3 EXOTIC SECTORS & XP TELEMETRY',
    title: 'World Exploration & Live Sync',
    subtitle: 'Chroma Cyberpunk Sector, Tropical Archipelago and Hyperspace Tunnel',
    description:
      'Cross the stellar portal at the end of each corridor (-860m) to jump to the next exotic world with a +100 XP bonus.',
    icon: Trophy,
    tips: [
      'Golden sponsor crates instantly restore +25% battery.',
      'Keep a streak of clean rings with no collisions to multiply your final score.',
    ],
  },
];

export const SummitDroneMiniGame: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const { recordDroneTrick, recordDroneFlight, recordActivity, setIsProfileModalOpen } = usePilotProfile();
  useTenantTheme();

  // Core Game State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  // Tells global shortcuts (immersion layer) to stand down while the pilot flies.
  useEffect(() => {
    document.body.toggleAttribute('data-sgx-game', isPlaying);
    return () => document.body.removeAttribute('data-sgx-game');
  }, [isPlaying]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [energy, setEnergy] = useState<number>(100);
  const [speedKmh, setSpeedKmh] = useState<number>(0);
  const [altitudeM, setAltitudeM] = useState<number>(16);
  const [packagesCollected, setPackagesCollected] = useState<number>(0);
  const [ringsPassed, setRingsPassed] = useState<number>(0);
  const [collisionsCount, setCollisionsCount] = useState<number>(0);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isGuideOpen, setIsGuideOpen] = useState<boolean>(false);
  const [floatingToasts, setFloatingToasts] = useState<FloatingXpToast[]>([]);
  const [proximityWarning, setProximityWarning] = useState<string | null>(null);
  const [collisionBanner, setCollisionBanner] = useState<string | null>(null);

  // Camera & Sector Modes
  const [cameraMode, setCameraMode] = useState<'CHASE' | 'FPV'>('CHASE');
  const [currentSector, setCurrentSector] = useState<ExoticSector>('CYBERPUNK_CHROMA');

  // Powers Cooldown & Active States
  const [turboActive, setTurboActive] = useState<boolean>(false);
  const [shieldActive, setShieldActive] = useState<boolean>(false);
  const [slowmoActive, setSlowmoActive] = useState<boolean>(false);
  const [cooldowns, setCooldowns] = useState<{
    turbo: number;
    shield: number;
    emp: number;
    slowmo: number;
    laser: number;
    roll: number;
  }>({
    turbo: 0,
    shield: 0,
    emp: 0,
    slowmo: 0,
    laser: 0,
    roll: 0,
  });

  // Reference container for 3D simulation & real collision engine
  const simRef = useRef({
    scene: null as THREE.Scene | null,
    camera: null as THREE.PerspectiveCamera | null,
    renderer: null as THREE.WebGLRenderer | null,
    droneGroup: null as THREE.Group | null,
    shieldMesh: null as THREE.Mesh | null,
    rotors: [] as THREE.Mesh[],

    // World & Volumetric Colliders
    environmentGroup: null as THREE.Group | null,
    colliderBoxes: [] as DroneColliderVolume[],
    rings: [] as Array<{ mesh: THREE.Group; passed: boolean; rimHitTime: number; z: number }>,
    crates: [] as Array<{ mesh: THREE.Group; collected: boolean; z: number; sponsor: string }>,
    obstacles: [] as Array<{ mesh: THREE.Mesh; destroyed: boolean; z: number; rotSpeed: number }>,
    lasers: [] as Array<{ mesh: THREE.Mesh; dir: THREE.Vector3; life: number }>,
    empRings: [] as Array<{ mesh: THREE.Mesh; scale: number; maxScale: number; life: number }>,
    impactBursts: [] as ImpactSparkBurst[],
    warpPortal: null as THREE.Group | null,

    // Drone Kinematics & Rebound Physics
    pos: new THREE.Vector3(0, 16, 0),
    vel: new THREE.Vector3(0, 0, -48),
    reboundVel: new THREE.Vector3(0, 0, 0),
    targetRoll: 0,
    targetPitch: 0,
    targetYaw: 0,
    barrelRollAngle: 0,
    barrelRollDir: 1,
    isBarrelRolling: false,
    cameraShake: 0,

    // Controls
    keys: {
      KeyW: false,
      KeyS: false,
      KeyA: false,
      KeyD: false,
      KeyR: false,
      KeyF: false,
      ArrowUp: false,
      ArrowDown: false,
      ArrowLeft: false,
      ArrowRight: false,
      Space: false,
      KeyE: false,
      KeyX: false,
      KeyC: false,
      KeyV: false,
      KeyQ: false,
    },

    // Power timers
    turboEndTime: 0,
    shieldEndTime: 0,
    slowmoEndTime: 0,
    lastEmpTime: 0,
    lastLaserTime: 0,
    lastTurboTime: 0,
    lastShieldTime: 0,
    lastSlowmoTime: 0,
    lastRollTime: 0,

    // Runtime
    scoreVal: 0,
    energyVal: 100,
    packagesVal: 0,
    ringsVal: 0,
    collisionsVal: 0,
    currentSectorKey: 'CYBERPUNK_CHROMA' as ExoticSector,
    camModeKey: 'CHASE' as 'CHASE' | 'FPV',
    isGameActive: false,
  });

  const animFrameIdRef = useRef<number | null>(null);

  const addXpToast = useCallback((text: string, color: string = '#00DDFF') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setFloatingToasts(prev => [...prev.slice(-3), { id, text, color, time: Date.now() }]);
    setTimeout(() => {
      setFloatingToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  const triggerCollisionBanner = useCallback((msg: string) => {
    setCollisionBanner(msg);
    setTimeout(() => {
      setCollisionBanner(prev => (prev === msg ? null : prev));
    }, 1400);
  }, []);

  // Web Audio Synth for Exotic SFX
  const playCyberSfx = useCallback(
    (type: 'laser' | 'emp' | 'shield' | 'turbo' | 'ring' | 'hit' | 'warp' | 'roll') => {
      if (!soundEnabled) return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;

        if (type === 'laser') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'emp') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.exponentialRampToValueAtTime(40, now + 0.6);
          gain.gain.setValueAtTime(0.35, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.6);
        } else if (type === 'turbo' || type === 'roll') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(type === 'roll' ? 320 : 220, now);
          osc.frequency.exponentialRampToValueAtTime(type === 'roll' ? 740 : 660, now + 0.3);
          gain.gain.setValueAtTime(0.22, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'ring') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(523.25, now);
          osc.frequency.setValueAtTime(659.25, now + 0.08);
          osc.frequency.setValueAtTime(783.99, now + 0.16);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.3);
        } else if (type === 'hit') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, now);
          osc.frequency.linearRampToValueAtTime(42, now + 0.28);
          gain.gain.setValueAtTime(0.32, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.28);
        } else if (type === 'warp') {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(200, now);
          osc.frequency.exponentialRampToValueAtTime(1200, now + 0.5);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.5);
        }
      } catch {
        // Silent fallback
      }
    },
    [soundEnabled]
  );

  // Spawn 3D Impact Spark Particles at collision point
  const spawnImpactSparks = useCallback((contactPos: THREE.Vector3, colorHex: number = 0xff5500) => {
    const scene = simRef.current.scene;
    if (!scene) return;

    const count = 26;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = contactPos.x;
      positions[i * 3 + 1] = contactPos.y;
      positions[i * 3 + 2] = contactPos.z;

      velocities[i * 3] = (Math.random() - 0.5) * 32;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 32;
      velocities[i * 3 + 2] = (Math.random() - 0.2) * 35;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.75,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(geo, mat);
    scene.add(points);
    simRef.current.impactBursts.push({ points, velocities, life: 0.65 });
  }, []);

  // Build Procedural 3D Drone Model
  const createDroneMesh = (accentColorHex: number): THREE.Group => {
    const group = new THREE.Group();

    const bodyGeo = new THREE.ConeGeometry(0.85, 2.3, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x101829,
      roughness: 0.2,
      metalness: 0.9,
    });
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(bodyMesh);

    const coreGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({
      color: accentColorHex,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 0.2, 0.2);
    group.add(coreMesh);

    const canopyGeo = new THREE.BoxGeometry(0.52, 0.36, 0.85);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00f0ff,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const canopyMesh = new THREE.Mesh(canopyGeo, canopyMat);
    canopyMesh.position.set(0, 0.35, -0.4);
    group.add(canopyMesh);

    const armGeo = new THREE.CylinderGeometry(0.06, 0.08, 1.85, 8);
    const armMat = new THREE.MeshStandardMaterial({ color: 0x242d42, metalness: 0.8 });

    const armPositions = [
      { x: 1.2, z: 0.8, rotZ: Math.PI / 4 },
      { x: -1.2, z: 0.8, rotZ: -Math.PI / 4 },
      { x: 1.2, z: -0.8, rotZ: Math.PI / 4 },
      { x: -1.2, z: -0.8, rotZ: -Math.PI / 4 },
    ];

    simRef.current.rotors = [];

    armPositions.forEach(pos => {
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.position.set(pos.x * 0.5, 0.05, pos.z * 0.5);
      arm.rotation.z = pos.rotZ;
      group.add(arm);

      const motorGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.25, 12);
      const motorMat = new THREE.MeshStandardMaterial({ color: 0x0a0f1c, metalness: 0.9 });
      const motor = new THREE.Mesh(motorGeo, motorMat);
      motor.position.set(pos.x, 0.15, pos.z);
      group.add(motor);

      const bladeGeo = new THREE.BoxGeometry(1.35, 0.03, 0.15);
      const bladeMat = new THREE.MeshBasicMaterial({
        color: accentColorHex,
        transparent: true,
        opacity: 0.8,
      });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(pos.x, 0.3, pos.z);
      group.add(blade);
      simRef.current.rotors.push(blade);
    });

    const gunGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
    gunGeo.rotateX(Math.PI / 2);
    const gunMat = new THREE.MeshStandardMaterial({ color: 0xFDCC0D, metalness: 0.95 });

    const leftGun = new THREE.Mesh(gunGeo, gunMat);
    leftGun.position.set(-0.7, -0.1, -0.6);
    group.add(leftGun);

    const rightGun = new THREE.Mesh(gunGeo, gunMat);
    rightGun.position.set(0.7, -0.1, -0.6);
    group.add(rightGun);

    const shieldGeo = new THREE.IcosahedronGeometry(2.35, 2);
    const shieldMat = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    const shieldMesh = new THREE.Mesh(shieldGeo, shieldMat);
    group.add(shieldMesh);
    simRef.current.shieldMesh = shieldMesh;

    return group;
  };

  // Build Sector Environment + Register Real Box3 Colliders
  const buildSectorEnvironment = (sectorKey: ExoticSector, scene: THREE.Scene) => {
    if (simRef.current.environmentGroup) {
      scene.remove(simRef.current.environmentGroup);
      simRef.current.environmentGroup = null;
    }

    const envGroup = new THREE.Group();
    simRef.current.environmentGroup = envGroup;
    simRef.current.colliderBoxes = [];
    simRef.current.rings = [];
    simRef.current.crates = [];
    simRef.current.obstacles = [];

    const sector = EXOTIC_SECTORS[sectorKey];
    scene.fog = new THREE.FogExp2(sector.fogColor, sectorKey === 'QUANTUM_TUNNEL' ? 0.0045 : 0.0055);
    scene.background = new THREE.Color(sector.skyColor);

    const registerCollider = (
      mesh: THREE.Object3D,
      sizeVec: THREE.Vector3,
      centerPos: THREE.Vector3,
      type: DroneColliderVolume['type'],
      label: string
    ) => {
      const box = new THREE.Box3().setFromCenterAndSize(centerPos, sizeVec);
      simRef.current.colliderBoxes.push({
        box,
        type,
        label,
        mesh,
        lastHitTime: 0,
      });
    };

    if (sectorKey === 'CYBERPUNK_CHROMA') {
      // Sleek Volumetric Runway Lanes (No wireframe grid!)
      const floorGeo = new THREE.PlaneGeometry(240, 1000);
      floorGeo.rotateX(-Math.PI / 2);
      const floorMat = new THREE.MeshStandardMaterial({
        color: 0x050914,
        roughness: 0.4,
        metalness: 0.7,
      });
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.position.set(0, 0, -450);
      envGroup.add(floorMesh);

      // Glowing Highway Guide Strips
      [-32, 0, 32].forEach((laneX, idx) => {
        const stripGeo = new THREE.PlaneGeometry(idx === 1 ? 0.8 : 0.45, 960);
        stripGeo.rotateX(-Math.PI / 2);
        const stripMat = new THREE.MeshBasicMaterial({
          color: idx === 1 ? 0xFDCC0D : 0x00ffff,
          transparent: true,
          opacity: idx === 1 ? 0.45 : 0.65,
        });
        const strip = new THREE.Mesh(stripGeo, stripMat);
        strip.position.set(laneX, 0.05, -450);
        envGroup.add(strip);
      });

      const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
      const buildingMat = new THREE.MeshStandardMaterial({
        color: 0x0b1324,
        roughness: 0.25,
        metalness: 0.85,
      });

      // 1) Corridor Skyscrapers (Placed both along the sides AND weaving inside the flight lane for real dodging!)
      for (let i = 1; i <= 44; i++) {
        const isInnerObstacle = i % 3 === 0;
        const w = isInnerObstacle ? 10 + (i % 5) * 2 : 16 + (i % 4) * 4;
        const h = isInnerObstacle ? 24 + (i % 4) * 5 : 46 + (i % 6) * 10;
        const d = 14 + (i % 3) * 4;

        const bMesh = new THREE.Mesh(buildingGeo, buildingMat);
        bMesh.scale.set(w, h, d);

        const z = -i * 20 - 30;
        const x = isInnerObstacle
          ? Math.sin(i * 1.9) * 18
          : (i % 2 === 0 ? 1 : -1) * (32 + (i % 3) * 12);
        const centerY = h / 2;

        bMesh.position.set(x, centerY, z);
        envGroup.add(bMesh);

        // Neon architectural trim
        const edgeGeo = new THREE.EdgesGeometry(buildingGeo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: isInnerObstacle ? 0xFDCC0D : 0x00ffff,
        });
        const edge = new THREE.LineSegments(edgeGeo, edgeMat);
        edge.scale.copy(bMesh.scale);
        edge.position.copy(bMesh.position);
        envGroup.add(edge);

        registerCollider(
          bMesh,
          new THREE.Vector3(w, h, d),
          new THREE.Vector3(x, centerY, z),
          'BUILDING',
          isInnerObstacle ? (es ? 'Torre Central Chroma' : 'Chroma Central Tower') : (es ? 'Rascacielos San Juan' : 'San Juan Skyscraper')
        );
      }

      // 2) Elevated Neon Skybridges (Fly under or over them!)
      for (let j = 1; j <= 8; j++) {
        const bridgeW = 68;
        const bridgeH = 4.2;
        const bridgeD = 6;
        const bridgeY = j % 2 === 0 ? 14 : 24;
        const bridgeZ = -j * 105 - 40;

        const bridgeMesh = new THREE.Mesh(
          buildingGeo,
          new THREE.MeshStandardMaterial({
            color: 0x172542,
            emissive: 0x003344,
            metalness: 0.9,
            roughness: 0.2,
          })
        );
        bridgeMesh.scale.set(bridgeW, bridgeH, bridgeD);
        bridgeMesh.position.set(0, bridgeY, bridgeZ);
        envGroup.add(bridgeMesh);

        const edge = new THREE.LineSegments(
          new THREE.EdgesGeometry(buildingGeo),
          new THREE.LineBasicMaterial({ color: 0xff0055 })
        );
        edge.scale.copy(bridgeMesh.scale);
        edge.position.copy(bridgeMesh.position);
        envGroup.add(edge);

        registerCollider(
          bridgeMesh,
          new THREE.Vector3(bridgeW, bridgeH, bridgeD),
          new THREE.Vector3(0, bridgeY, bridgeZ),
          'SKYBRIDGE',
          (es ? 'Puente Aéreo Holográfico' : 'Holographic Skybridge')
        );
      }
    } else if (sectorKey === 'TROPICAL_ARCHIPELAGO') {
      const islandGeo = new THREE.DodecahedronGeometry(1, 1);
      const islandMat = new THREE.MeshStandardMaterial({
        color: 0x13383c,
        roughness: 0.65,
        metalness: 0.25,
      });

      for (let i = 1; i <= 32; i++) {
        const radius = 8 + (i % 4) * 2.5;
        const island = new THREE.Mesh(islandGeo, islandMat);
        island.scale.set(radius, radius * 0.75, radius);

        const x = Math.sin(i * 1.65) * 24;
        const y = 10 + Math.cos(i * 1.35) * 11;
        const z = -i * 27 - 35;

        island.position.set(x, y, z);
        envGroup.add(island);

        // Glowing Plasma Ring around each floating island so its hitbox is clearly visible
        const auraGeo = new THREE.RingGeometry(radius * 0.95, radius * 1.08, 24);
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0x00ffaa,
          side: THREE.DoubleSide,
        });
        const aura = new THREE.Mesh(auraGeo, auraMat);
        aura.position.copy(island.position);
        envGroup.add(aura);

        registerCollider(
          island,
          new THREE.Vector3(radius * 1.75, radius * 1.35, radius * 1.75),
          island.position.clone(),
          'ISLAND',
          (es ? 'Isla Flotante Caribeña' : 'Floating Caribbean Island')
        );
      }
    } else if (sectorKey === 'QUANTUM_TUNNEL') {
      // Hexagonal Warp Tunnel Rings + Physical Iris Barrier Gates
      for (let z = -30; z > -900; z -= 30) {
        const hexGeo = new THREE.RingGeometry(24, 27, 6);
        const hexMat = new THREE.MeshBasicMaterial({
          color: z % 60 === 0 ? 0xff00bb : 0x00ffff,
          side: THREE.DoubleSide,
        });
        const hex = new THREE.Mesh(hexGeo, hexMat);
        hex.position.set(0, 18, z);
        hex.rotation.z = z * 0.04;
        envGroup.add(hex);

        // Physical Laser Barrier Beam across part of the tunnel every 60m
        if (z % 60 === 0) {
          const gateGeo = new THREE.BoxGeometry(1, 1, 1);
          const gateMat = new THREE.MeshStandardMaterial({
            color: 0xff0066,
            emissive: 0x880033,
            roughness: 0.2,
            metalness: 0.9,
          });
          const gateMesh = new THREE.Mesh(gateGeo, gateMat);
          const isVertical = (Math.abs(z) / 60) % 2 === 0;
          const gW = isVertical ? 6.5 : 38;
          const gH = isVertical ? 32 : 6.5;
          const gD = 3.5;
          const gX = isVertical ? Math.sin(z * 0.03) * 10 : 0;
          const gY = isVertical ? 18 : 18 + Math.cos(z * 0.03) * 7;

          gateMesh.scale.set(gW, gH, gD);
          gateMesh.position.set(gX, gY, z);
          envGroup.add(gateMesh);

          registerCollider(
            gateMesh,
            new THREE.Vector3(gW, gH, gD),
            new THREE.Vector3(gX, gY, z),
            'TUNNEL_GATE',
            (es ? 'Compuerta Cuántica de Iris' : 'Quantum Iris Gate')
          );
        }
      }
    }

    // Spawn 16 Acceleration Rings (Clear of building colliders)
    for (let i = 1; i <= 16; i++) {
      const ringGroup = new THREE.Group();
      const ringGeo = new THREE.TorusGeometry(5.6, 0.42, 14, 36);
      const ringMat = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x0088aa,
        roughness: 0.15,
        metalness: 0.9,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringGroup.add(ringMesh);

      const rX = Math.cos(i * 1.1) * 14;
      const rY = 14 + Math.sin(i * 1.4) * 6;
      const rZ = -i * 52 - 12;

      ringGroup.position.set(rX, rY, rZ);
      envGroup.add(ringGroup);
      simRef.current.rings.push({ mesh: ringGroup, passed: false, rimHitTime: 0, z: rZ });
    }

    // Spawn Official Partner Suministro Crates (Canonical Partners Only)
    const sponsors = ['Spatialgineers SGX', (es ? 'Tu Marca Aquí (Tier 2+)' : 'Your Brand Here (Tier 2+)'), 'Spatialgineers Summit 2026'];
    for (let i = 1; i <= 12; i++) {
      const crateGroup = new THREE.Group();
      const crateGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
      const crateMat = new THREE.MeshStandardMaterial({
        color: 0xFDCC0D,
        emissive: 0x553b00,
        metalness: 0.9,
        roughness: 0.15,
      });
      const crateMesh = new THREE.Mesh(crateGeo, crateMat);
      crateGroup.add(crateMesh);

      const wireGeo = new THREE.EdgesGeometry(crateGeo);
      const wireMat = new THREE.LineBasicMaterial({ color: 0xffffff });
      crateGroup.add(new THREE.LineSegments(wireGeo, wireMat));

      const cX = Math.sin(i * 2.1) * 16;
      const cY = 12 + Math.cos(i * 1.7) * 7;
      const cZ = -i * 68;

      crateGroup.position.set(cX, cY, cZ);
      envGroup.add(crateGroup);
      simRef.current.crates.push({
        mesh: crateGroup,
        collected: false,
        z: cZ,
        sponsor: sponsors[i % sponsors.length],
      });
    }

    // Spawn Destructible Hazard Mines
    for (let i = 1; i <= 20; i++) {
      const obsGeo = new THREE.DodecahedronGeometry(2.6, 0);
      const obsMat = new THREE.MeshStandardMaterial({
        color: 0xff0055,
        emissive: 0x660022,
        roughness: 0.2,
        metalness: 0.85,
      });
      const obs = new THREE.Mesh(obsGeo, obsMat);

      const oX = Math.sin(i * 2.5) * 19;
      const oY = 11 + Math.cos(i * 2.2) * 8;
      const oZ = -i * 42 - 18;

      obs.position.set(oX, oY, oZ);
      envGroup.add(obs);
      simRef.current.obstacles.push({
        mesh: obs,
        destroyed: false,
        z: oZ,
        rotSpeed: 0.025 + Math.random() * 0.03,
      });
    }

    // End-of-Run Quantum Warp Gate Portal
    const warpGroup = new THREE.Group();
    const portalGeo = new THREE.TorusGeometry(12, 1.2, 16, 40);
    const portalMat = new THREE.MeshBasicMaterial({ color: 0xff00ff });
    warpGroup.add(new THREE.Mesh(portalGeo, portalMat));

    const innerGeo = new THREE.CircleGeometry(11, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x3b0066,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    warpGroup.add(new THREE.Mesh(innerGeo, innerMat));

    warpGroup.position.set(0, 16, -880);
    envGroup.add(warpGroup);
    simRef.current.warpPortal = warpGroup;

    scene.add(envGroup);
  };

  // Switch Sector Functionality
  const changeSector = useCallback(
    (newSector: ExoticSector) => {
      setCurrentSector(newSector);
      simRef.current.currentSectorKey = newSector;
      if (simRef.current.scene) {
        buildSectorEnvironment(newSector, simRef.current.scene);
        playCyberSfx('warp');
        addXpToast((es ? `⚡ SALTO AL ${EXOTIC_SECTORS[newSector].name.toUpperCase()}` : `⚡ JUMP TO ${loc(EXOTIC_SECTORS[newSector], 'name', language).toUpperCase()}`), EXOTIC_SECTORS[newSector].accentColor);
      }
    },
    [addXpToast, playCyberSfx]
  );

  // Execute Evasive Barrel Roll Maneuver (Q)
  const triggerBarrelRoll = useCallback(() => {
    const now = performance.now();
    const s = simRef.current;
    if (now - s.lastRollTime < 3500) return; // 3.5s cooldown
    s.lastRollTime = now;
    s.isBarrelRolling = true;
    s.barrelRollAngle = 0;
    s.barrelRollDir = s.keys.KeyA || s.keys.ArrowLeft ? -1 : 1;
    // Lateral dodge impulse
    s.reboundVel.x += s.barrelRollDir * -26;
    playCyberSfx('roll');
    recordDroneTrick('barrel_roll');
    addXpToast((es ? '+40 XP • BARREL ROLL EVASIVO 360°!' : '+40 XP • 360° EVASIVE BARREL ROLL!'), '#00DDFF');
  }, [addXpToast, playCyberSfx, recordDroneTrick]);

  const triggerTurbo = useCallback(() => {
    const now = performance.now();
    if (now - simRef.current.lastTurboTime < 8000) return;
    simRef.current.lastTurboTime = now;
    simRef.current.turboEndTime = now + 3500;
    setTurboActive(true);
    playCyberSfx('turbo');
    recordDroneTrick('speed_dash');
    addXpToast((es ? '+30 XP • HYPER TURBO ACTIVADO!' : '+30 XP • HYPER TURBO ON!'), '#FDCC0D');
  }, [addXpToast, playCyberSfx, recordDroneTrick]);

  const triggerShield = useCallback(() => {
    const now = performance.now();
    if (now - simRef.current.lastShieldTime < 12000) return;
    simRef.current.lastShieldTime = now;
    simRef.current.shieldEndTime = now + 6000;
    setShieldActive(true);
    if (simRef.current.shieldMesh) {
      (simRef.current.shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.65;
    }
    playCyberSfx('shield');
    recordActivity('drone_flight', 'Escudo de Plasma Activado', 'Defensa cuántica contra impactos 3D', 35);
    addXpToast((es ? '+35 XP • ESCUDO DE PLASMA!' : '+35 XP • PLASMA SHIELD!'), '#00DDFF');
  }, [addXpToast, playCyberSfx, recordActivity]);

  const triggerEmp = useCallback(() => {
    const now = performance.now();
    if (now - simRef.current.lastEmpTime < 14000) return;
    simRef.current.lastEmpTime = now;

    if (simRef.current.scene && simRef.current.droneGroup) {
      const ringGeo = new THREE.RingGeometry(1, 2, 32);
      ringGeo.rotateX(Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      });
      const empMesh = new THREE.Mesh(ringGeo, ringMat);
      empMesh.position.copy(simRef.current.pos);
      simRef.current.scene.add(empMesh);
      simRef.current.empRings.push({ mesh: empMesh, scale: 1, maxScale: 55, life: 1 });
    }

    let destroyedCount = 0;
    simRef.current.obstacles.forEach(obs => {
      if (!obs.destroyed && obs.mesh.position.distanceTo(simRef.current.pos) < 55) {
        obs.destroyed = true;
        obs.mesh.visible = false;
        spawnImpactSparks(obs.mesh.position, 0x00ffff);
        destroyedCount++;
      }
    });

    playCyberSfx('emp');
    recordDroneTrick('emp_pulse');
    const xpBonus = 60 + destroyedCount * 15;
    simRef.current.scoreVal += 200 + destroyedCount * 150;
    setScore(simRef.current.scoreVal);
    addXpToast((es ? `+${xpBonus} XP • PULSO EMP (${destroyedCount} VAPORIZADOS)` : `+${xpBonus} XP • EMP PULSE (${destroyedCount} VAPORIZED)`), '#00DDFF');
  }, [addXpToast, playCyberSfx, recordDroneTrick, spawnImpactSparks]);

  const triggerSlowmo = useCallback(() => {
    const now = performance.now();
    if (now - simRef.current.lastSlowmoTime < 15000) return;
    simRef.current.lastSlowmoTime = now;
    simRef.current.slowmoEndTime = now + 5000;
    setSlowmoActive(true);
    playCyberSfx('laser');
    recordDroneTrick('precision_hover');
    addXpToast((es ? '+45 XP • BULLET TIME (DILATACIÓN TEMPORAL)' : '+45 XP • BULLET TIME (TIME DILATION)'), '#FF00BB');
  }, [addXpToast, playCyberSfx, recordDroneTrick]);

  const triggerLaser = useCallback(() => {
    const now = performance.now();
    if (now - simRef.current.lastLaserTime < 320) return;
    simRef.current.lastLaserTime = now;

    if (simRef.current.scene && simRef.current.droneGroup) {
      const laserGeo = new THREE.CylinderGeometry(0.12, 0.12, 4.5, 8);
      laserGeo.rotateX(Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({ color: 0xFDCC0D });

      [-0.7, 0.7].forEach(offX => {
        const laser = new THREE.Mesh(laserGeo, laserMat);
        laser.position.copy(simRef.current.pos).add(new THREE.Vector3(offX, 0, -1));
        simRef.current.scene!.add(laser);
        simRef.current.lasers.push({
          mesh: laser,
          dir: new THREE.Vector3(0, 0, -170),
          life: 1.2,
        });
      });

      playCyberSfx('laser');
    }
  }, [playCyberSfx]);

  // Main Three.js Lifecycle & Real Collision Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    simRef.current.renderer = renderer;

    const scene = new THREE.Scene();
    simRef.current.scene = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1200
    );
    simRef.current.camera = camera;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.35);
    dirLight.position.set(25, 60, 25);
    scene.add(dirLight);

    const drone = createDroneMesh(0x00ffff);
    scene.add(drone);
    simRef.current.droneGroup = drone;

    buildSectorEnvironment(simRef.current.currentSectorKey, scene);

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!simRef.current.isGameActive) return;
      const k = e.code;
      if (k in simRef.current.keys) {
        (simRef.current.keys as Record<string, boolean>)[k] = true;
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) {
        e.preventDefault();
      }
      if (k === 'Space') {
        triggerTurbo();
      } else if (k === 'KeyE') {
        triggerShield();
      } else if (k === 'KeyX') {
        triggerEmp();
      } else if (k === 'KeyC') {
        triggerSlowmo();
      } else if (k === 'KeyF') {
        triggerLaser();
      } else if (k === 'KeyQ') {
        triggerBarrelRoll();
      } else if (k === 'KeyV') {
        setCameraMode(prev => {
          const next = prev === 'CHASE' ? 'FPV' : 'CHASE';
          simRef.current.camModeKey = next;
          playUiChirp(next === 'FPV' ? 880 : 660);
          return next;
        });
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = e.code;
      if (k in simRef.current.keys) {
        (simRef.current.keys as Record<string, boolean>)[k] = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    let lastTick = performance.now();
    const droneSphere = new THREE.Sphere(new THREE.Vector3(), 1.65);
    const lookAheadBoxPoint = new THREE.Vector3();
    const closestPoint = new THREE.Vector3();

    const loop = (time: number) => {
      const rawDt = Math.min((time - lastTick) / 1000, 0.1);
      lastTick = time;

      const isSlowmo = time < simRef.current.slowmoEndTime;
      const dt = isSlowmo ? rawDt * 0.3 : rawDt;

      if (simRef.current.isGameActive) {
        const s = simRef.current;
        const keys = s.keys;

        const isTurbo = time < s.turboEndTime;
        const isShield = time < s.shieldEndTime;

        setTurboActive(isTurbo);
        setShieldActive(isShield);
        setSlowmoActive(isSlowmo);

        setCooldowns({
          turbo: Math.max(0, 1 - (time - s.lastTurboTime) / 8000),
          shield: Math.max(0, 1 - (time - s.lastShieldTime) / 12000),
          emp: Math.max(0, 1 - (time - s.lastEmpTime) / 14000),
          slowmo: Math.max(0, 1 - (time - s.lastSlowmoTime) / 15000),
          laser: Math.max(0, 1 - (time - s.lastLaserTime) / 320),
          roll: Math.max(0, 1 - (time - s.lastRollTime) / 3500),
        });

        const baseSpeed = 48;
        const currentSpeed = isTurbo ? baseSpeed * 2.4 : baseSpeed;
        s.vel.z = -currentSpeed;

        // Lateral Steering
        const turnSpeed = 25;
        if (keys.KeyA || keys.ArrowLeft) {
          s.vel.x = -turnSpeed;
          s.targetRoll = 0.48;
          s.targetYaw += 0.012;
        } else if (keys.KeyD || keys.ArrowRight) {
          s.vel.x = turnSpeed;
          s.targetRoll = -0.48;
          s.targetYaw -= 0.012;
        } else {
          s.vel.x *= 0.88;
          s.targetRoll *= 0.85;
          s.targetYaw *= 0.92;
        }

        // Elevation Steering
        const vertSpeed = 21;
        if (keys.KeyW || keys.ArrowUp || keys.KeyR) {
          s.vel.y = vertSpeed;
          s.targetPitch = 0.28;
        } else if (keys.KeyS || keys.ArrowDown) {
          s.vel.y = -vertSpeed;
          s.targetPitch = -0.28;
        } else {
          s.vel.y *= 0.88;
          s.targetPitch *= 0.85;
        }

        // Apply velocities + elastic rebound velocity from physical collisions
        s.pos.x += (s.vel.x + s.reboundVel.x) * dt;
        s.pos.y += (s.vel.y + s.reboundVel.y) * dt;
        s.pos.z += (s.vel.z + s.reboundVel.z) * dt;

        // Dampen rebound velocity smoothly
        s.reboundVel.multiplyScalar(Math.pow(0.04, dt));

        // Ground & Ceiling Collision Check
        if (s.pos.y < 2.2) {
          s.pos.y = 2.2;
          s.reboundVel.y = 18;
          s.cameraShake = Math.max(s.cameraShake, 0.7);
          spawnImpactSparks(s.pos, 0x00ffff);
          playCyberSfx('hit');
          triggerCollisionBanner((es ? 'IMPACTO CONTRA SUELO DEL SECTOR • REBOTE ACTIVO' : 'SECTOR GROUND IMPACT • BOUNCE ACTIVE'));
        } else if (s.pos.y > 42) {
          s.pos.y = 42;
          s.reboundVel.y = -12;
        }

        // Quantum Tunnel Cylindrical Wall Collision Check
        if (s.currentSectorKey === 'QUANTUM_TUNNEL') {
          const radialOffset = new THREE.Vector2(s.pos.x, s.pos.y - 18);
          if (radialOffset.length() > 21.5) {
            radialOffset.normalize();
            s.pos.x = radialOffset.x * 21.2;
            s.pos.y = 18 + radialOffset.y * 21.2;
            s.reboundVel.x = -radialOffset.x * 26;
            s.reboundVel.y = -radialOffset.y * 26;
            s.cameraShake = 1.1;
            spawnImpactSparks(s.pos, 0xff00bb);
            playCyberSfx('hit');
            triggerCollisionBanner((es ? 'REBOTE EN PARED HEXAGONAL DEL TÚNEL' : 'BOUNCE OFF THE TUNNEL\'S HEX WALL'));
          }
        } else {
          s.pos.x = THREE.MathUtils.clamp(s.pos.x, -44, 44);
        }

        // Update volumetric sphere for drone
        droneSphere.center.copy(s.pos);

        // Check Volumetric Box3 Collisions (Buildings, Skybridges, Islands, Tunnel Iris Gates)
        let detectedAheadWarning: string | null = null;
        lookAheadBoxPoint.set(s.pos.x, s.pos.y, s.pos.z - 22);

        for (let i = 0; i < s.colliderBoxes.length; i++) {
          const col = s.colliderBoxes[i];
          // Broadphase Z check
          if (col.box.max.z < s.pos.z - 35 || col.box.min.z > s.pos.z + 10) continue;

          // Check ahead proximity radar warning
          if (!detectedAheadWarning && col.box. distanceToPoint(lookAheadBoxPoint) < 5.5) {
            detectedAheadWarning = (es ? `ALERTA DE PROXIMIDAD: ${col.label.toUpperCase()} A <20M` : `PROXIMITY ALERT: ${col.label.toUpperCase()} AT <20M`);
          }

          // Exact Sphere-Box3 Volumetric Collision
          if (col.box.intersectsSphere(droneSphere) && time - col.lastHitTime > 420) {
            col.lastHitTime = time;
            col.box.clampPoint(s.pos, closestPoint);
            const normal = s.pos.clone().sub(closestPoint);
            if (normal.lengthSq() < 0.001) {
              normal.set(s.pos.x >= 0 ? 1 : -1, 0.4, 1).normalize();
            } else {
              normal.normalize();
            }

            // Push drone outside the building/island surface + apply elastic rebound
            s.pos.addScaledVector(normal, 2.4);
            s.reboundVel.set(normal.x * 34, normal.y * 26 + 6, Math.max(28, normal.z * 38));
            s.cameraShake = 1.45;
            spawnImpactSparks(closestPoint, isShield || s.isBarrelRolling ? 0x00ffff : 0xff3355);

            if (isShield || s.isBarrelRolling) {
              playCyberSfx('shield');
              addXpToast((es ? `ESCUDO / ROLL DEFLECTÓ ${col.label.toUpperCase()}!` : `SHIELD / ROLL DEFLECTED ${col.label.toUpperCase()}!`), '#00DDFF');
            } else {
              s.collisionsVal += 1;
              setCollisionsCount(s.collisionsVal);
              s.energyVal = Math.max(0, s.energyVal - 18);
              setEnergy(s.energyVal);
              playCyberSfx('hit');
              triggerCollisionBanner((es ? `COLISIÓN FÍSICA: ${col.label.toUpperCase()} (-18% BATERÍA)` : `PHYSICAL COLLISION: ${col.label.toUpperCase()} (-18% BATTERY)`));
              addXpToast((es ? `-18% BATERÍA • CHOQUE EN ${col.label.toUpperCase()}` : `-18% BATTERY • CRASH AT ${col.label.toUpperCase()}`), '#FF3366');

              if (s.energyVal <= 0) {
                s.isGameActive = false;
                setIsPlaying(false);
                setGameOver(true);
                recordDroneFlight(s.scoreVal, s.packagesVal, s.ringsVal);
              }
            }
          }
        }

        setProximityWarning(detectedAheadWarning);

        // Update Telemetry HUD
        setSpeedKmh(Math.round(currentSpeed * 3.6));
        setAltitudeM(Math.round(s.pos.y));

        // Update Barrel Roll Animation
        if (s.isBarrelRolling) {
          s.barrelRollAngle += dt * Math.PI * 4.5;
          if (s.barrelRollAngle >= Math.PI * 2) {
            s.barrelRollAngle = 0;
            s.isBarrelRolling = false;
          }
        }

        // Update Drone Mesh Transform
        if (s.droneGroup) {
          s.droneGroup.position.copy(s.pos);
          const baseRoll = THREE.MathUtils.lerp(s.droneGroup.rotation.z, s.targetRoll, 0.15);
          s.droneGroup.rotation.z = s.isBarrelRolling
            ? baseRoll + s.barrelRollAngle * s.barrelRollDir
            : baseRoll;
          s.droneGroup.rotation.x = THREE.MathUtils.lerp(s.droneGroup.rotation.x, s.targetPitch, 0.15);
          s.droneGroup.rotation.y = s.targetYaw;

          const rotorSpeed = isTurbo ? 0.65 : 0.35;
          s.rotors.forEach(r => {
            r.rotation.y += rotorSpeed;
          });

          if (s.shieldMesh) {
            (s.shieldMesh.material as THREE.MeshBasicMaterial).opacity =
              isShield || s.isBarrelRolling ? 0.65 : 0;
            s.shieldMesh.rotation.y += 0.04;
          }
        }

        // Check Acceleration Rings (Inner Aperture Pass vs Physical Rim Impact)
        s.rings.forEach(ring => {
          const dz = Math.abs(s.pos.z - ring.z);
          if (dz < 3.2) {
            const radialDist = new THREE.Vector2(
              s.pos.x - ring.mesh.position.x,
              s.pos.y - ring.mesh.position.y
            ).length();

            if (!ring.passed && radialDist < 4.7) {
              // Clean pass through the ring center!
              ring.passed = true;
              s.ringsVal += 1;
              s.scoreVal += 250;
              setRingsPassed(s.ringsVal);
              setScore(s.scoreVal);
              playCyberSfx('ring');
              addXpToast((es ? '+25 XP • ANILLO DE VELOCIDAD LIMPIO!' : '+25 XP • CLEAN SPEED RING!'), '#00DDFF');
              (ring.mesh.children[0] as THREE.Mesh).scale.set(1.35, 1.35, 1.35);
            } else if (radialDist >= 4.7 && radialDist <= 6.6 && time - ring.rimHitTime > 500) {
              // Clipped the metallic Torus Rim of the ring!
              ring.rimHitTime = time;
              const rimNormal = new THREE.Vector3(
                s.pos.x - ring.mesh.position.x,
                s.pos.y - ring.mesh.position.y,
                0.8
              ).normalize();
              s.reboundVel.copy(rimNormal.multiplyScalar(24));
              s.cameraShake = 0.95;
              spawnImpactSparks(s.pos, 0xFDCC0D);
              playCyberSfx('hit');
              triggerCollisionBanner((es ? 'ROCE FÍSICO EN EL BORDE DEL ANILLO' : 'PHYSICAL GRAZE ON THE RING EDGE'));
            }
          }
        });

        // Check Sponsor Crate Collisions
        s.crates.forEach(crate => {
          if (!crate.collected && Math.abs(s.pos.z - crate.z) < 3.5) {
            const dist = crate.mesh.position.distanceTo(s.pos);
            if (dist < 4.5) {
              crate.collected = true;
              crate.mesh.visible = false;
              s.packagesVal += 1;
              s.scoreVal += 400;
              s.energyVal = Math.min(100, s.energyVal + 25);
              setPackagesCollected(s.packagesVal);
              setScore(s.scoreVal);
              setEnergy(s.energyVal);
              playCyberSfx('ring');
              addXpToast((es ? `+50 XP • SUMINISTRO ${crate.sponsor.toUpperCase()}!` : `+50 XP • SUPPLY ${crate.sponsor.toUpperCase()}!`), '#FDCC0D');
            }
          }
          if (!crate.collected) {
            crate.mesh.rotation.y += 0.025;
          }
        });

        // Check Hazard Mine Collisions
        s.obstacles.forEach(obs => {
          if (!obs.destroyed) {
            obs.mesh.rotation.y += obs.rotSpeed;
            obs.mesh.rotation.x += obs.rotSpeed * 0.5;

            if (Math.abs(s.pos.z - obs.z) < 3.2) {
              const dist = obs.mesh.position.distanceTo(s.pos);
              if (dist < 3.8) {
                obs.destroyed = true;
                obs.mesh.visible = false;
                spawnImpactSparks(obs.mesh.position, 0xff0055);

                if (isShield || s.isBarrelRolling) {
                  playCyberSfx('shield');
                  addXpToast((es ? 'ESCUDO / ROLL DEFLECTÓ MINA!' : 'SHIELD / ROLL DEFLECTED A MINE!'), '#00DDFF');
                } else {
                  s.collisionsVal += 1;
                  setCollisionsCount(s.collisionsVal);
                  s.energyVal = Math.max(0, s.energyVal - 22);
                  setEnergy(s.energyVal);
                  s.cameraShake = 1.3;
                  s.reboundVel.set((Math.random() - 0.5) * 28, 12, 26);
                  playCyberSfx('hit');
                  triggerCollisionBanner((es ? 'IMPACTO CON MINA CUÁNTICA (-22% BATERÍA)' : 'QUANTUM MINE IMPACT (-22% BATTERY)'));

                  if (s.energyVal <= 0) {
                    s.isGameActive = false;
                    setIsPlaying(false);
                    setGameOver(true);
                    recordDroneFlight(s.scoreVal, s.packagesVal, s.ringsVal);
                  }
                }
              }
            }
          }
        });

        // Update Photon Lasers (Collide with Mines AND Buildings)
        for (let i = s.lasers.length - 1; i >= 0; i--) {
          const l = s.lasers[i];
          l.mesh.position.z += l.dir.z * dt;
          l.life -= dt;

          s.obstacles.forEach(obs => {
            if (!obs.destroyed && obs.mesh.position.distanceTo(l.mesh.position) < 4.2) {
              obs.destroyed = true;
              obs.mesh.visible = false;
              l.life = 0;
              s.scoreVal += 150;
              setScore(s.scoreVal);
              spawnImpactSparks(obs.mesh.position, 0xFDCC0D);
              playCyberSfx('hit');
              addXpToast((es ? '+20 XP • MINA VAPORIZADA!' : '+20 XP • MINE VAPORIZED!'), '#FDCC0D');
            }
          });

          // Laser sparks when hitting buildings/islands
          for (let c = 0; c < s.colliderBoxes.length; c++) {
            if (s.colliderBoxes[c].box.containsPoint(l.mesh.position)) {
              spawnImpactSparks(l.mesh.position, 0x00ffff);
              l.life = 0;
              break;
            }
          }

          if (l.life <= 0) {
            scene.remove(l.mesh);
            s.lasers.splice(i, 1);
          }
        }

        // Update EMP Shockwaves
        for (let i = s.empRings.length - 1; i >= 0; i--) {
          const emp = s.empRings[i];
          emp.scale += 60 * dt;
          emp.mesh.scale.set(emp.scale, emp.scale, emp.scale);
          emp.life -= dt * 1.5;
          (emp.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, emp.life);

          if (emp.life <= 0) {
            scene.remove(emp.mesh);
            s.empRings.splice(i, 1);
          }
        }

        // Update 3D Impact Spark Bursts
        for (let i = s.impactBursts.length - 1; i >= 0; i--) {
          const b = s.impactBursts[i];
          b.life -= rawDt;
          const posAttr = b.points.geometry.getAttribute('position') as THREE.BufferAttribute;
          const arr = posAttr.array as Float32Array;
          for (let p = 0; p < arr.length; p += 3) {
            arr[p] += b.velocities[p] * rawDt;
            arr[p + 1] += b.velocities[p + 1] * rawDt;
            arr[p + 2] += b.velocities[p + 2] * rawDt;
          }
          posAttr.needsUpdate = true;
          (b.points.material as THREE.PointsMaterial).opacity = Math.max(0, b.life / 0.65);

          if (b.life <= 0) {
            scene.remove(b.points);
            b.points.geometry.dispose();
            (b.points.material as THREE.PointsMaterial).dispose();
            s.impactBursts.splice(i, 1);
          }
        }

        // Check Warp Portal Entry
        if (s.warpPortal && s.pos.z < -860) {
          const sectorKeys: ExoticSector[] = ['CYBERPUNK_CHROMA', 'TROPICAL_ARCHIPELAGO', 'QUANTUM_TUNNEL'];
          const nextIdx = (sectorKeys.indexOf(s.currentSectorKey) + 1) % sectorKeys.length;
          const nextSector = sectorKeys[nextIdx];

          s.pos.set(0, 16, 0);
          s.reboundVel.set(0, 0, 0);
          changeSector(nextSector);
          s.scoreVal += 1000;
          setScore(s.scoreVal);
          addXpToast((es ? `+100 XP • SALTO CUÁNTICO A ${nextSector}!` : `+100 XP • QUANTUM JUMP TO ${nextSector}!`), '#00FFBB');
        }

        // Camera Positioning + Damped Physical Shake
        if (camera) {
          s.cameraShake = Math.max(0, s.cameraShake - rawDt * 3.2);
          const shakeX = (Math.random() - 0.5) * s.cameraShake * 1.4;
          const shakeY = (Math.random() - 0.5) * s.cameraShake * 1.4;

          if (s.camModeKey === 'FPV') {
            camera.position.set(s.pos.x + shakeX, s.pos.y + 0.35 + shakeY, s.pos.z - 0.4);
            camera.rotation.set(s.targetPitch * 0.5, s.targetYaw, -s.targetRoll * 0.3);
            camera.fov = isTurbo ? 82 : isSlowmo ? 54 : 68;
          } else {
            const targetCamPos = new THREE.Vector3(
              s.pos.x * 0.85 + shakeX,
              s.pos.y + 3.2 + shakeY,
              s.pos.z + 8.5
            );
            camera.position.lerp(targetCamPos, 0.14);
            camera.lookAt(s.pos.x, s.pos.y + 0.5, s.pos.z - 15);
            camera.fov = isTurbo ? 84 : isSlowmo ? 56 : 60;
          }
          camera.updateProjectionMatrix();
        }
      }

      renderer.render(scene, camera);
      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
    };
  }, [
    addXpToast,
    changeSector,
    playCyberSfx,
    recordDroneFlight,
    spawnImpactSparks,
    triggerBarrelRoll,
    triggerCollisionBanner,
    triggerEmp,
    triggerLaser,
    triggerShield,
    triggerSlowmo,
    triggerTurbo,
  ]);

  const startGame = () => {
    setIsPlaying(true);
    setGameOver(false);
    simRef.current.isGameActive = true;
    simRef.current.pos.set(0, 16, 0);
    simRef.current.vel.set(0, 0, -48);
    simRef.current.reboundVel.set(0, 0, 0);
    simRef.current.scoreVal = 0;
    simRef.current.energyVal = 100;
    simRef.current.packagesVal = 0;
    simRef.current.ringsVal = 0;
    simRef.current.collisionsVal = 0;
    setScore(0);
    setEnergy(100);
    setPackagesCollected(0);
    setRingsPassed(0);
    setCollisionsCount(0);
    setProximityWarning(null);
    setCollisionBanner(null);
    if (simRef.current.scene) {
      buildSectorEnvironment(simRef.current.currentSectorKey, simRef.current.scene);
    }
    playCyberSfx('warp');
  };

  const handleTouchControl = (key: string, pressed: boolean) => {
    if (key in simRef.current.keys) {
      (simRef.current.keys as Record<string, boolean>)[key] = pressed;
    }
  };

  const activeSectorConfig = EXOTIC_SECTORS[currentSector];

  return (
    <div className="relative w-full overflow-hidden sgx-glass-relief text-white font-['Orbitron',sans-serif] select-none">
      {/* 1. Header Toolbar: Sector Selector, Camera Toggle, Audio, Tutorial */}
      <div className="p-3 md:p-4 bg-slate-950/90 backdrop-blur-md border-b border-cyan-400/40 flex flex-wrap items-center justify-between gap-3 font-mono text-xs z-20 relative">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-950/90 border border-cyan-400 flex items-center justify-center text-cyan-400 shadow-md">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
              <span>{es ? 'SIMULADOR DE DRON 3D' : '3D DRONE SIMULATOR'}</span>
              <span>•</span>
              <span className="text-[#FDCC0D]">{es ? 'MOTOR DE COLISIONES BOX3 ACTIVO' : 'BOX3 COLLISION ENGINE ACTIVE'}</span>
            </div>
            <h2 className="text-sm md:text-base font-bold text-white tracking-wide uppercase">
              {loc(activeSectorConfig, 'name', language)}
            </h2>
          </div>
        </div>

        {/* Right Action Island */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center bg-black/60 border border-slate-800 p-0.5">
            {(['CYBERPUNK_CHROMA', 'TROPICAL_ARCHIPELAGO', 'QUANTUM_TUNNEL'] as ExoticSector[]).map(secKey => (
              <button
                key={secKey}
                type="button"
                onClick={() => changeSector(secKey)}
                className={`px-2.5 py-1 text-[10px] font-bold transition-all cursor-pointer ${
                  currentSector === secKey
                    ? 'bg-cyan-400 text-black font-extrabold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {secKey === 'CYBERPUNK_CHROMA'
                  ? 'Chroma'
                  : secKey === 'TROPICAL_ARCHIPELAGO'
                  ? (es ? 'Archipiélago' : 'Archipelago')
                  : (es ? 'Túnel' : 'Tunnel')}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              setCameraMode(prev => {
                const next = prev === 'CHASE' ? 'FPV' : 'CHASE';
                simRef.current.camModeKey = next;
                playUiChirp(next === 'FPV' ? 880 : 660);
                return next;
              });
            }}
            className="px-2.5 py-1.5 bg-slate-900 border border-cyan-400/80 hover:bg-cyan-400 hover:text-black text-cyan-300 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{cameraMode === 'CHASE' ? (es ? '3RA PERSONA' : '3RD PERSON') : 'COCKPIT FPV'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            aria-label={soundEnabled ? (es ? 'Silenciar' : 'Mute') : (es ? 'Activar sonido' : 'Unmute')}
            aria-pressed={soundEnabled}
            className="p-1.5 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => setIsGuideOpen(true)}
            aria-label={es ? 'Cómo se juega' : 'How to play'}
            className="p-1.5 bg-slate-900 border border-slate-700 text-cyan-400 hover:bg-cyan-950 cursor-pointer"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main 3D WebGL Viewport Container (Full-width corner-to-corner, zero scroll) */}
      <div
        ref={containerRef}
        className="relative w-full h-[500px] sm:h-[540px] lg:h-[580px] bg-black overflow-hidden touch-none overscroll-contain"
        style={{ touchAction: 'none' }}
      >
        <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair touch-none" />

        {/* Proximity Radar & Physical Impact Alert Banners */}
        {isPlaying && (proximityWarning || collisionBanner) && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 pointer-events-none">
            {collisionBanner && (
              <div className="px-4 py-1.5 bg-rose-950/95 border-2 border-rose-500 text-rose-200 text-xs font-mono font-extrabold flex items-center gap-2 shadow-xl">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{collisionBanner}</span>
              </div>
            )}
            {!collisionBanner && proximityWarning && (
              <div className="px-3.5 py-1 bg-amber-950/90 border border-[#FDCC0D] text-[#FDCC0D] text-[11px] font-mono font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{proximityWarning}</span>
              </div>
            )}
          </div>
        )}

        {/* Floating XP Gain Toasts */}
        <div className="absolute top-20 right-4 flex flex-col items-end gap-1 pointer-events-none z-30">
          {floatingToasts.map(toast => (
            <div
              key={toast.id}
              className="px-3 py-1 bg-black/85 border border-[#00DDFF] text-xs font-mono font-bold shadow-lg"
              style={{ color: toast.color }}
            >
              {toast.text}
            </div>
          ))}
        </div>

        {/* Tactical Cockpit HUD Overlay */}
        {isPlaying && (
          <>
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none font-mono text-xs z-20">
              {/* Left Island: Speed, Altitude, Battery */}
              <div className="bg-black/75 backdrop-blur-md border border-[#32527B] p-2.5 space-y-1.5 min-w-[175px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">{es ? 'VELOCIDAD:' : 'SPEED:'}</span>
                  <span className="text-[#00DDFF] font-bold tabular-nums">{speedKmh} KM/H</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 text-[10px]">{es ? 'ALTITUD:' : 'ALTITUDE:'}</span>
                  <span className="text-[#FDCC0D] font-bold tabular-nums">{altitudeM} M</span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{es ? 'INTEGRIDAD / BATERÍA:' : 'INTEGRITY / BATTERY:'}</span>
                    <span className={energy > 30 ? 'text-[#00DDFF] font-bold' : 'text-rose-400 font-bold animate-pulse'}>
                      {energy}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${energy > 30 ? 'bg-[#00DDFF]' : 'bg-rose-500'}`}
                      style={{ width: `${energy}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Right Island: Score, Rings, Collisions */}
              <div className="bg-black/75 backdrop-blur-md border border-[#32527B] p-2.5 space-y-1.5 min-w-[175px] text-right">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 text-[10px]">{es ? 'PUNTOS:' : 'POINTS:'}</span>
                  <span className="text-[#FDCC0D] font-bold text-sm tabular-nums">{score} PTS</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 text-[10px]">{es ? 'ANILLOS LIMPIOS:' : 'CLEAN RINGS:'}</span>
                  <span className="text-[#00DDFF] font-bold tabular-nums">{ringsPassed} / 16</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-400 text-[10px]">{es ? 'IMPACTOS 3D:' : '3D IMPACTS:'}</span>
                  <span className="text-rose-400 font-bold tabular-nums">{collisionsCount}</span>
                </div>
              </div>
            </div>

            {/* Bottom Floating Suite of 6 Tactical Powers (Added Barrel Roll [Q]) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap items-center justify-center gap-1.5 md:gap-2.5 bg-black/85 backdrop-blur-md border border-[#32527B] p-2 z-20">
              {/* Power 1: Barrel Roll Evasivo [Q] */}
              <button
                type="button"
                onClick={triggerBarrelRoll}
                disabled={cooldowns.roll > 0}
                className={`relative px-2.5 py-2 border flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer ${
                  cooldowns.roll > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 border-[#00DDFF]/70 text-[#00DDFF] hover:bg-[#00DDFF] hover:text-black'
                }`}
              >
                <RefreshCw className="w-4 h-4" />
                <span className="font-bold">ROLL [Q]</span>
                {cooldowns.roll > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white text-[11px]">
                    {Math.ceil(cooldowns.roll * 3.5)}s
                  </div>
                )}
              </button>

              {/* Power 2: Hyper Turbo */}
              <button
                type="button"
                onClick={triggerTurbo}
                disabled={cooldowns.turbo > 0}
                className={`relative px-2.5 py-2 border flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer ${
                  turboActive
                    ? 'bg-[#FDCC0D] text-black border-[#FDCC0D] font-extrabold'
                    : cooldowns.turbo > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 border-[#FDCC0D]/60 text-[#FDCC0D] hover:bg-[#FDCC0D] hover:text-black'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span className="font-bold">TURBO [SPC]</span>
                {cooldowns.turbo > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white text-[11px]">
                    {Math.ceil(cooldowns.turbo * 8)}s
                  </div>
                )}
              </button>

              {/* Power 3: Escudo de Plasma */}
              <button
                type="button"
                onClick={triggerShield}
                disabled={cooldowns.shield > 0}
                className={`relative px-2.5 py-2 border flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer ${
                  shieldActive
                    ? 'bg-[#00DDFF] text-black border-[#00DDFF] font-extrabold'
                    : cooldowns.shield > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 border-[#00DDFF]/60 text-[#00DDFF] hover:bg-[#00DDFF] hover:text-black'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span className="font-bold">{es ? 'ESCUDO [E]' : 'SHIELD [E]'}</span>
                {cooldowns.shield > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white text-[11px]">
                    {Math.ceil(cooldowns.shield * 12)}s
                  </div>
                )}
              </button>

              {/* Power 4: Pulso EMP */}
              <button
                type="button"
                onClick={triggerEmp}
                disabled={cooldowns.emp > 0}
                className={`relative px-2.5 py-2 border flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer ${
                  cooldowns.emp > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 border-[#32527B] text-[#00DDFF] hover:bg-[#32527B] hover:text-white'
                }`}
              >
                <Wind className="w-4 h-4" />
                <span className="font-bold">EMP [X]</span>
                {cooldowns.emp > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white text-[11px]">
                    {Math.ceil(cooldowns.emp * 14)}s
                  </div>
                )}
              </button>

              {/* Power 5: Bullet Time */}
              <button
                type="button"
                onClick={triggerSlowmo}
                disabled={cooldowns.slowmo > 0}
                className={`relative px-2.5 py-2 border flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer ${
                  slowmoActive
                    ? 'bg-[#FFBB00] text-black border-[#FFBB00] font-extrabold'
                    : cooldowns.slowmo > 0
                    ? 'bg-slate-900/60 border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-slate-900 border-[#FFBB00]/60 text-[#FFBB00] hover:bg-[#FFBB00] hover:text-black'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span className="font-bold">TIME [C]</span>
                {cooldowns.slowmo > 0 && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center font-bold text-white text-[11px]">
                    {Math.ceil(cooldowns.slowmo * 15)}s
                  </div>
                )}
              </button>

              {/* Power 6: Láser Twin-Blaster */}
              <button
                type="button"
                onClick={triggerLaser}
                disabled={cooldowns.laser > 0}
                className="relative px-2.5 py-2 border bg-slate-900 border-[#FDCC0D]/60 text-[#FDCC0D] hover:bg-[#FDCC0D] hover:text-black flex flex-col items-center gap-1 font-mono text-[10px] transition-all cursor-pointer"
              >
                <Target className="w-4 h-4" />
                <span className="font-bold">{es ? 'LÁSER [F]' : 'LASER [F]'}</span>
              </button>
            </div>
          </>
        )}

        {/* Start Game Modal Overlay (Calibrated to fit 100% without scroll) */}
        {!isPlaying && !gameOver && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 sm:p-5 text-center z-30 overflow-hidden">
            <div className="w-12 h-12 bg-[#32527B]/40 border border-[#00DDFF] flex items-center justify-center text-[#00DDFF] shadow-xl mb-2.5">
              <Boxes className="w-6 h-6" />
            </div>

            <span className="text-[10px] font-mono text-[#FDCC0D] font-bold uppercase tracking-widest">
              SPATIALGINEERS SUMMIT 2026 · SGX.SPARK
            </span>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white tracking-wider uppercase mt-0.5 mb-1.5">
              {es ? 'QUANTUM DRONE 3D · MOTOR DE COLISIONES BOX3' : 'QUANTUM DRONE 3D · BOX3 COLLISION ENGINE'}
            </h1>
            <p className="text-xs text-slate-300 font-mono max-w-xl mb-4 leading-relaxed">
              {es ? 'Esquiva rascacielos de San Juan, puentes holográficos, islas flotantes y compuertas cuánticas con colisiones físicas reales (`THREE.Box3`), rebote vectorial, chispas 3D y maniobras Barrel Roll (`Q`).' : 'Dodge San Juan skyscrapers, holographic bridges, floating islands and quantum gates with real physical collisions (`THREE.Box3`), vector bounce, 3D sparks and Barrel Roll maneuvers (`Q`).'}
            </p>

            {/* Sector Selector Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full max-w-xl mb-4">
              {(['CYBERPUNK_CHROMA', 'TROPICAL_ARCHIPELAGO', 'QUANTUM_TUNNEL'] as ExoticSector[]).map(secKey => {
                const cfg = EXOTIC_SECTORS[secKey];
                const isSel = currentSector === secKey;
                return (
                  <button
                    key={secKey}
                    type="button"
                    onClick={() => changeSector(secKey)}
                    className={`p-2.5 border text-left transition-all cursor-pointer ${
                      isSel
                        ? 'bg-[#32527B]/60 border-[#FDCC0D] shadow-md'
                        : 'bg-slate-900/60 border-[#32527B]/50 hover:border-[#00DDFF] text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-mono font-bold text-[#FDCC0D]">{cfg.code}</div>
                    <div className="text-xs font-bold text-white truncate mt-0.5">
                      {loc(cfg, 'name', language).split('•')[1] || loc(cfg, 'name', language)}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={startGame}
                className="px-7 py-3 bg-[#FDCC0D] hover:bg-[#FFE566] text-black font-extrabold text-xs sm:text-sm flex items-center space-x-2 shadow-xl transition-all hover:scale-105 cursor-pointer uppercase tracking-wider"
              >
                <Play className="w-4 h-4 fill-black" />
                <span>{es ? 'INICIAR VUELO CON COLISIONES 3D' : 'START FLIGHT WITH 3D COLLISIONS'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsGuideOpen(true)}
                className="px-4 py-3 bg-slate-900 hover:bg-[#32527B] border border-[#32527B] text-slate-200 text-xs font-mono font-bold flex items-center space-x-2 transition-all cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-[#00DDFF]" />
                <span>{es ? 'CONTROLES & FÍSICA' : 'CONTROLS & PHYSICS'}</span>
              </button>
            </div>

            <div className="w-full max-w-md pt-2.5">
              <TransientSponsorSlot slotId="drone_preflight" variant="hud" showSubtitleLink={true} />
            </div>
          </div>
        )}

        {/* Game Over Screen Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30">
            <div className="w-16 h-16 bg-rose-950/80 border border-rose-500 flex items-center justify-center text-rose-400 shadow-xl mb-4">
              <Activity className="w-8 h-8" />
            </div>

            <h2 className="text-2xl font-extrabold text-white uppercase tracking-wider mb-1">
              {es ? 'INTEGRIDAD AGOTADA • VUELO FINALIZADO' : 'INTEGRITY DEPLETED • FLIGHT OVER'}
            </h2>
            <p className="text-xs text-slate-400 font-mono mb-6">
              {es ? 'Telemetría de vuelo y colisiones registrada en tu Bitácora de Piloto SGX.' : 'Flight and collision telemetry saved to your SGX Pilot Log.'}
            </p>

            <div className="grid grid-cols-4 gap-2.5 w-full max-w-md bg-slate-950/80 border border-slate-800 p-4 mb-6 font-mono text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">{es ? 'PUNTOS' : 'POINTS'}</span>
                <span className="text-lg font-bold text-[#FDCC0D] tabular-nums">{score}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">{es ? 'SUMINISTROS' : 'SUPPLIES'}</span>
                <span className="text-lg font-bold text-emerald-400 tabular-nums">{packagesCollected}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">{es ? 'ANILLOS' : 'RINGS'}</span>
                <span className="text-lg font-bold text-cyan-400 tabular-nums">{ringsPassed}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">{es ? 'IMPACTOS' : 'IMPACTS'}</span>
                <span className="text-lg font-bold text-rose-400 tabular-nums">{collisionsCount}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={startGame}
                className="px-6 py-3 bg-cyan-400 text-black font-extrabold text-xs font-mono flex items-center space-x-2 shadow-lg hover:scale-105 transition-all cursor-pointer uppercase"
              >
                <RotateCcw className="w-4 h-4" />
                <span>{es ? 'VOLAR DE NUEVO' : 'FLY AGAIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProfileModalOpen(true)}
                className="px-5 py-3 bg-slate-900 border border-cyan-400/60 text-cyan-300 text-xs font-mono font-bold flex items-center space-x-2 hover:bg-cyan-950 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-[#FDCC0D]" />
                <span>{es ? 'VER MI RANKING XP' : 'VIEW MY XP RANKING'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 3. Mobile Touch Virtual Controls Bar */}
      {isPlaying && (
        <div className="lg:hidden p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onMouseDown={() => handleTouchControl('KeyA', true)}
              onMouseUp={() => handleTouchControl('KeyA', false)}
              onTouchStart={e => {
                e.preventDefault();
                handleTouchControl('KeyA', true);
              }}
              onTouchEnd={e => {
                e.preventDefault();
                handleTouchControl('KeyA', false);
              }}
              className="p-3 bg-slate-900 border border-slate-700 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onMouseDown={() => handleTouchControl('KeyW', true)}
                onMouseUp={() => handleTouchControl('KeyW', false)}
                onTouchStart={e => {
                  e.preventDefault();
                  handleTouchControl('KeyW', true);
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  handleTouchControl('KeyW', false);
                }}
                className="p-3 bg-slate-900 border border-slate-700 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onMouseDown={() => handleTouchControl('KeyS', true)}
                onMouseUp={() => handleTouchControl('KeyS', false)}
                onTouchStart={e => {
                  e.preventDefault();
                  handleTouchControl('KeyS', true);
                }}
                onTouchEnd={e => {
                  e.preventDefault();
                  handleTouchControl('KeyS', false);
                }}
                className="p-3 bg-slate-900 border border-slate-700 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
            </div>
            <button
              type="button"
              onMouseDown={() => handleTouchControl('KeyD', true)}
              onMouseUp={() => handleTouchControl('KeyD', false)}
              onTouchStart={e => {
                e.preventDefault();
                handleTouchControl('KeyD', true);
              }}
              onTouchEnd={e => {
                e.preventDefault();
                handleTouchControl('KeyD', false);
              }}
              className="p-3 bg-slate-900 border border-slate-700 text-cyan-400 active:bg-cyan-500 active:text-black flex items-center justify-center font-bold"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerBarrelRoll}
              className="p-3 bg-emerald-950 border border-emerald-500 text-emerald-300 active:bg-emerald-400 active:text-black"
              title={es ? 'Barrel Roll Evasivo' : 'Evasive Barrel Roll'}
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={triggerLaser}
              className="p-3 bg-rose-950 border border-rose-500 text-rose-300 active:bg-rose-500 active:text-black"
              title={es ? 'Disparar Láser' : 'Fire Laser'}
            >
              <Target className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={triggerTurbo}
              className="p-3 bg-amber-950 border border-amber-500 text-amber-300 active:bg-amber-400 active:text-black"
              title="Turbo Boost"
            >
              <Zap className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Mini Tutorial Modal */}
      <QuickGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        guideTitle={es ? 'Simulador 3D de Drones • Motor de Colisiones Box3' : '3D Drone Simulator • Box3 Collision Engine'}
        guideCategory={es ? 'FÍSICA DE VUELO & PODERES' : 'FLIGHT PHYSICS & POWERS'}
        steps={language === 'es' ? DRONE_GUIDE_STEPS : DRONE_GUIDE_STEPS_EN}
        onPrimaryAction={startGame}
        primaryActionLabel={es ? '¡Despegar en 3D Ahora!' : 'Take Off in 3D Now!'}
      />
    </div>
  );
};
