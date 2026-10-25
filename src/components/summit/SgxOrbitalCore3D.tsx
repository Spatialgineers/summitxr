import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import {
  Pause,
  Play,
  Zap,
  Compass,
  Maximize2,
  Sliders,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Eye,
  Volume2,
  ChevronDown,
  ChevronUp,
  Clock,
  Building2,
  Settings,
  X,
  Ticket,
  Calendar,
  Globe,
} from 'lucide-react';
import {
  playPillarDockSound,
  playUiChirp,
  playCyberBurstSound,
  playScanSuccessSound,
} from '../../lib/cyberAudioEngine';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { SPONSORSHIP_TIERS } from '../../lib/summitData';

export type SgxCorePillarId = 'STORY' | 'SHOWCASE' | 'SPARK' | 'STAGE' | 'SYSTEM' | 'SYNTHESIZE';

export interface SgxOrbitalPillarNode {
  id: SgxCorePillarId;
  code: string;
  title: string;
  shortRole: string;
  colorHex: string;
  threeColor: number;
  iconUrl: string;
  glbUrl: string;
  moduleCount: number;
  physicsLabel: string;
}

export const SGX_CORE_LOGO_GLB_URL = 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb';

// Official v2026.10 Pillar Order: 1. Story, 2. Showcase, 3. Spark, 4. Stage, 5. System, 6. Synthesize
// Official v2026.10 Palette: #32527B, #FDCC0D, #B87000, #00DDFF, #FFBB00
export const SGX_ORBITAL_PILLARS: SgxOrbitalPillarNode[] = [
  {
    id: 'STORY',
    code: 'SGX.STORY',
    title: 'Identidad & Narrativa',
    shortRole: 'Manifiesto • Avatar 3D • Pasaporte XP',
    colorHex: '#FDCC0D',
    threeColor: 0xFDCC0D,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Story%20opt.glb',
    moduleCount: 5,
    physicsLabel: 'Pilar 01 • Brasas Ascendentes 432Hz',
  },
  {
    id: 'SHOWCASE',
    code: 'SGX.SHOWCASE',
    title: 'Exposición XR & Alianzas',
    shortRole: 'Tour 360° • SGX.Match • Sponsors • QR',
    colorHex: '#00DDFF',
    threeColor: 0x00DDFF,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Showcase%20opt.glb',
    moduleCount: 6,
    physicsLabel: 'Pilar 02 • Galería Holográfica Cian',
  },
  {
    id: 'SPARK',
    code: 'SGX.SPARK',
    title: 'Simulación & Gamificación',
    shortRole: 'Dron 3D Colisiones • Tienda XP • Retos',
    colorHex: '#FFBB00',
    threeColor: 0xFFBB00,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Spark%20Opt.glb',
    moduleCount: 4,
    physicsLabel: 'Pilar 03 • Vórtice Cinético Ignis',
  },
  {
    id: 'STAGE',
    code: 'SGX.STAGE',
    title: 'Escenario & Broadcast 4K',
    shortRole: 'Run of Show • Salas 4K • Speakers 3D',
    colorHex: '#B87000',
    threeColor: 0xB87000,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Stage%20opt.glb',
    moduleCount: 5,
    physicsLabel: 'Pilar 04 • Ondas Acústicas en Vivo',
  },
  {
    id: 'SYSTEM',
    code: 'SGX.SYSTEM',
    title: 'Telemetría & Ranked Trials',
    shortRole: '8 Guild Initiates • Consola /play • Ranking',
    colorHex: '#32527B',
    threeColor: 0x32527B,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/System%20opt.glb',
    moduleCount: 5,
    physicsLabel: 'Pilar 05 • Retícula Cuántica Cloud',
  },
  {
    id: 'SYNTHESIZE',
    code: 'SGX.SYNTHESIZE',
    title: 'Convergencia & Ecosistema',
    shortRole: 'Foros Chat • Taquilla PDF • Tour Guía',
    colorHex: '#FDCC0D',
    threeColor: 0xFDCC0D,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Synthesize%20opt.glb',
    moduleCount: 4,
    physicsLabel: 'Pilar 06 • Convergencia Armónica SGX',
  },
];

// In-memory cache of loaded & normalized GLTF scenes so switching views never reloads over network
const glbTemplateCache = new Map<string, THREE.Group>();

export interface HolographicDrawerModule {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  xpReward?: string;
  actionLabel: string;
  icon: React.ElementType;
  onLaunch: () => void;
}

interface SgxOrbitalCore3DProps {
  activePillarId: SgxCorePillarId;
  onSelectPillar: (pillarId: SgxCorePillarId) => void;
  activePillarModules?: HolographicDrawerModule[];
  onQuickLaunchPrimaryModule?: (pillarId: SgxCorePillarId) => void;
  onOpenTimeCapsules?: () => void;
  onSelectSection?: (section: any) => void;
  onOpenTickets?: () => void;
  onOpenCredential?: () => void;
  onOpen360Tour?: () => void;
}

export interface SgxSponsorStationData {
  id: string;
  tierId: string;
  name: string;
  tierLabel: string;
  tierNumber: number;
  roleSubtitle: string;
  colorHex: string;
  threeColor: number;
  angle: number;
  radius: number;
  yPos: number;
  websiteUrl: string;
}

export const SGX_3D_SPONSOR_STATIONS: SgxSponsorStationData[] = [
  {
    id: 'chroma',
    tierId: 'tier_5',
    name: 'Chroma Space Studios',
    tierLabel: 'TIER 5 · CO-PRODUCTOR IN-KIND',
    tierNumber: 5,
    roleSubtitle: 'Sede Oficial San Juan Día 3 · Vyze & Ericson',
    colorHex: '#FDCC0D',
    threeColor: 0xFDCC0D,
    angle: Math.PI * 0.22,
    radius: 94,
    yPos: 5,
    websiteUrl: 'https://chromaspace.pr',
  },
  {
    id: 'roblox',
    tierId: 'tier_4',
    name: 'Roblox Creator Guild LATAM',
    tierLabel: 'TIER 4 · SIGNATURE PARTNER',
    tierNumber: 4,
    roleSubtitle: '6 Artistas en Vivo · Construcción Roblox 3D',
    colorHex: '#00DDFF',
    threeColor: 0x00DDFF,
    angle: Math.PI * 0.72,
    radius: 94,
    yPos: -6,
    websiteUrl: 'https://example.com',
  },
  {
    id: 'losmismos',
    tierId: 'tier_5',
    name: 'Los Mismos TV',
    tierLabel: 'TIER 5 · MEDIA PARTNER',
    tierNumber: 5,
    roleSubtitle: 'Bucolov & Bluecider · Broadcast YouTube Live',
    colorHex: '#FFBB00',
    threeColor: 0xFFBB00,
    angle: Math.PI * 1.22,
    radius: 94,
    yPos: 6,
    websiteUrl: 'https://youtube.com',
  },
  {
    id: 'sgxaudio',
    tierId: 'tier_3',
    name: 'SGX Audio & Media Labs',
    tierLabel: 'TIER 3 · EXPERIENCE SPONSOR',
    tierNumber: 3,
    roleSubtitle: 'Sintetizador 432Hz & Desafío Gamificado',
    colorHex: '#B87000',
    threeColor: 0xB87000,
    angle: Math.PI * 1.72,
    radius: 94,
    yPos: -5,
    websiteUrl: 'https://example.com',
  },
];

// Generates procedural circular particle sprite texture with soft radial glow (eliminates square pixels)
function createCircularParticleTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.25, 'rgba(255, 255, 255, 0.9)');
    grad.addColorStop(0.52, 'rgba(255, 255, 255, 0.38)');
    grad.addColorStop(0.82, 'rgba(255, 255, 255, 0.08)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Generates high-res double-sided holographic cyber billboard texture for 3D rotating sponsor stations
function createSponsorBillboardTexture(
  name: string,
  tierLabel: string,
  roleSubtitle: string,
  colorHex: string
): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Obsidian glass gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 256);
    bgGrad.addColorStop(0, '#0c1018');
    bgGrad.addColorStop(1, '#05070b');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Subtle tactical matrix lines
    ctx.strokeStyle = 'rgba(50, 82, 123, 0.28)';
    ctx.lineWidth = 1;
    for (let x = 20; x < 512; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    for (let y = 20; y < 256; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }

    // Outer 45-degree chamfer border
    const chamfer = 24;
    ctx.strokeStyle = colorHex;
    ctx.lineWidth = 4;
    ctx.shadowColor = colorHex;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(chamfer, 4);
    ctx.lineTo(512 - 4, 4);
    ctx.lineTo(512 - 4, 256 - chamfer);
    ctx.lineTo(512 - chamfer, 256 - 4);
    ctx.lineTo(4, 256 - 4);
    ctx.lineTo(4, chamfer);
    ctx.closePath();
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Header Tier Badge
    ctx.fillStyle = colorHex;
    ctx.fillRect(24, 22, 280, 28);
    ctx.fillStyle = '#050505';
    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.fillText(`★ ${tierLabel}`, 34, 41);

    // Sponsor Name in Orbitron
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 23px "Orbitron", sans-serif';
    ctx.fillText(name.toUpperCase(), 24, 98);

    // Role Subtitle
    ctx.fillStyle = '#CBD5E1';
    ctx.font = '500 15px "Exo 2", sans-serif';
    ctx.fillText(roleSubtitle, 24, 136);

    // Dividing accent bar
    ctx.strokeStyle = `${colorHex}80`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(24, 166);
    ctx.lineTo(488, 166);
    ctx.stroke();

    // Footer Interactive Telemetry
    ctx.fillStyle = colorHex;
    ctx.font = 'bold 12px "Share Tech Mono", monospace';
    ctx.fillText('▲ ESTACIÓN DE PATROCINIO 3D · TOCAR PARA ACTIVAR', 24, 202);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '11px "Orbitron", sans-serif';
    ctx.fillText('SPATIALGINEERS SUMMIT 2026 · ÁREA OFICIAL', 24, 228);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Custom GLSL Volumetric Spatial Dome Shader (replaces flat CSS gradient with real 3D WebGL atmosphere)
const VOLUMETRIC_DOME_VERTEX_SHADER = `
  varying vec3 vWorldDirection;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldDirection = normalize(worldPosition.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const VOLUMETRIC_DOME_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uPulse;
  uniform vec3 uActiveColor;
  varying vec3 vWorldDirection;
  varying vec2 vUv;

  // Lightweight 3D trigonometric FBM for volumetric spatial plasma
  float waveNoise(vec3 p) {
    return sin(p.x * 2.4 + uTime * 0.35) * cos(p.y * 2.8 - uTime * 0.25) * sin(p.z * 2.4 + uTime * 0.2);
  }

  void main() {
    vec3 dir = normalize(vWorldDirection);
    float y = dir.y;

    // Deep obsidian void at zenith & nadir (#050505) with metallic blue (#32527B) horizon band
    vec3 deepVoid = vec3(0.02, 0.024, 0.035);
    vec3 sgxBlue = vec3(0.196, 0.322, 0.482); // #32527B
    vec3 sgxCyan = vec3(0.0, 0.867, 1.0);     // #00DDFF
    vec3 sgxGold = vec3(0.992, 0.8, 0.051);   // #FDCC0D

    // Horizon glow band
    float horizonBand = exp(-abs(y + 0.06) * 4.2);

    // Volumetric 3D nebula waves
    float n1 = waveNoise(dir * 2.2 + vec3(uTime * 0.08));
    float n2 = waveNoise(dir * 4.5 - vec3(uTime * 0.12));
    float nebula = smoothstep(-0.2, 0.75, n1 * 0.6 + n2 * 0.4);

    // 3D Spherical Coordinate Architectural Lat/Lon Grid Lines
    float latLines = smoothstep(0.975, 0.995, abs(sin(y * 28.0 - uTime * 0.4)));
    float angle = atan(dir.z, dir.x);
    float lonLines = smoothstep(0.985, 0.998, abs(sin(angle * 18.0)));
    float spatialGrid = (latLines * 0.45 + lonLines * 0.35) * exp(-abs(y) * 2.2);

    //Sonar pulse ring traveling vertically through the 3D dome
    float sonarWave = exp(-pow((y - mod(uTime * 0.22, 1.6) + 0.8) * 14.0, 2.0)) * 0.35;

    vec3 col = deepVoid;
    col = mix(col, sgxBlue * 0.65, horizonBand * 0.85);
    col += uActiveColor * nebula * horizonBand * (0.28 + uPulse * 0.25);
    col += mix(sgxBlue, sgxCyan, 0.5) * spatialGrid * 0.35;
    col += sgxGold * sonarWave * 0.22;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export const SgxOrbitalCore3D: React.FC<SgxOrbitalCore3DProps> = ({
  activePillarId,
  onSelectPillar,
  activePillarModules = [],
  onOpenTimeCapsules,
  onSelectSection,
  onOpenTickets,
  onOpenCredential,
  onOpen360Tour,
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const nodeMarkerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { recordActivity, liteMode, setLiteMode } = usePilotProfile();

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [cameraFocusedOnPillar, setCameraFocusedOnPillar] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const [zenImmersionMode, setZenImmersionMode] = useState<boolean>(false);
  const [clocksCollapsedMobile, setClocksCollapsedMobile] = useState<boolean>(true);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState<boolean>(false);
  const [activeDrawerTab, setActiveDrawerTab] = useState<'MODULES' | 'INTERACTIVE_LAB' | 'SPONSORS'>('MODULES');
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState<number>(1.0);
  const [loadedModelsCount, setLoadedModelsCount] = useState<number>(0);
  const [xpOrbsCollected, setXpOrbsCollected] = useState<number>(0);
  const [floatingXpNotice, setFloatingXpNotice] = useState<string | null>(null);
  const [focusedSponsorId, setFocusedSponsorId] = useState<string | null>(null);
  const sponsorMarkerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Live 4-Clock Circular Countdown State (Target: Dec 11, 2026 10:00 AM AST per Run of Show v2026.10)
  const [countdown, setCountdown] = useState({ days: 48, hours: 10, minutes: 38, seconds: 20 });
  useEffect(() => {
    const targetMs = new Date('2026-12-11T10:00:00-04:00').getTime();
    const updateClock = () => {
      const diff = Math.max(0, targetMs - Date.now());
      setCountdown({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    updateClock();
    const timerId = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const activePillarRef = useRef<SgxCorePillarId>(activePillarId);
  const autoRotateRef = useRef<boolean>(autoRotate);
  const cameraFocusedRef = useRef<boolean>(cameraFocusedOnPillar);
  const focusedSponsorRef = useRef<string | null>(focusedSponsorId);
  const orbitSpeedMultRef = useRef(orbitSpeedMultiplier);

  const pulseSurgeRef = useRef<number>(0);
  const targetOrbitAngleRef = useRef<number>(0);
  const currentOrbitAngleRef = useRef<number>(0);
  const pointerParallaxRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDraggingRef = useRef<boolean>(false);
  const pointerDownPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragDistanceRef = useRef<number>(0);
  const triggerShockwaveRef = useRef<((worldPos: THREE.Vector3, colorHex: number) => void) | null>(null);

  // Immersion layer: SGX pulses and overdrive ripple through the 3D core.
  useEffect(() => {
    const ring = (delay: number, color: number) =>
      window.setTimeout(() => triggerShockwaveRef.current?.(new THREE.Vector3(0, 0, 0), color), delay);
    const onPulse = () => { ring(0, 0xFDCC0D); ring(140, 0x00DDFF); };
    const onOverdrive = () => { [0, 220, 440, 660, 880].forEach((d, i) => ring(d, i % 2 ? 0x00DDFF : 0xFFBB00)); };
    window.addEventListener('sgx:pulse', onPulse);
    window.addEventListener('sgx:overdrive', onOverdrive);
    return () => {
      window.removeEventListener('sgx:pulse', onPulse);
      window.removeEventListener('sgx:overdrive', onOverdrive);
    };
  }, []);

  useEffect(() => {
    focusedSponsorRef.current = focusedSponsorId;
  }, [focusedSponsorId]);

  useEffect(() => {
    activePillarRef.current = activePillarId;
    const idx = SGX_ORBITAL_PILLARS.findIndex(p => p.id === activePillarId);
    if (idx !== -1) {
      const baseAngle = (idx / SGX_ORBITAL_PILLARS.length) * Math.PI * 2;
      targetOrbitAngleRef.current = Math.PI * 0.56 - baseAngle;
      pulseSurgeRef.current = 1.25;
    }
  }, [activePillarId]);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    cameraFocusedRef.current = cameraFocusedOnPillar;
  }, [cameraFocusedOnPillar]);

  useEffect(() => {
    orbitSpeedMultRef.current = orbitSpeedMultiplier;
  }, [orbitSpeedMultiplier]);

  // Lock native touchscroll / wheel scroll inside the 3D viewport while allowing smooth scrolling inside the Holographic Drawer
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const preventTouchScroll = (e: TouchEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('[data-holographic-drawer="true"]')) {
        return;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    const preventWheelScroll = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.closest('[data-holographic-drawer="true"]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      currentOrbitAngleRef.current += e.deltaY * 0.0018;
      targetOrbitAngleRef.current = currentOrbitAngleRef.current;
    };

    el.addEventListener('touchmove', preventTouchScroll, { passive: false });
    el.addEventListener('wheel', preventWheelScroll, { passive: false });
    return () => {
      el.removeEventListener('touchmove', preventTouchScroll);
      el.removeEventListener('wheel', preventWheelScroll);
    };
  }, []);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container || liteMode) return;

    const width = container.clientWidth || (typeof window !== 'undefined' ? Math.max(window.innerWidth, 320) : 960);
    const height = Math.max(container.clientHeight || 0, typeof window !== 'undefined' ? Math.max(window.innerHeight - 126, 440) : 560);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050505, 0.0022);

    // Wide, generous camera distance so the 7 .GLB sculptures never feel stacked or cramped
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 800);
    camera.position.set(0, 38, 152);
    const currentLookAt = new THREE.Vector3(0, 0, 0);
    const targetCameraPos = new THREE.Vector3(0, 38, 152);
    const targetLookAt = new THREE.Vector3(0, 0, 0);

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        alpha: false,
        antialias: true,
        powerPreference: 'high-performance',
      });
      renderer.setClearColor(0x050505, 1);
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.NeutralToneMapping;
      renderer.toneMappingExposure = 1.18;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL unavailable for SgxOrbitalCore3D:', e);
      return;
    }

    // 1. TRUE 3D VOLUMETRIC SPATIAL SHADER DOME (Replaces flat CSS gradient)
    const domeGeo = new THREE.SphereGeometry(340, 48, 32);
    const initialPillar = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarRef.current) || SGX_ORBITAL_PILLARS[0];
    const domeUniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uActiveColor: { value: new THREE.Color(initialPillar.threeColor) },
    };
    const domeMat = new THREE.ShaderMaterial({
      vertexShader: VOLUMETRIC_DOME_VERTEX_SHADER,
      fragmentShader: VOLUMETRIC_DOME_FRAGMENT_SHADER,
      uniforms: domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    scene.add(domeMesh);

    // 2. 3D ARCHITECTURAL CYBER FLOOR & CEILING HORIZON RINGS (True 3D Perspective Depth)
    const environmentArchitectureGroup = new THREE.Group();
    scene.add(environmentArchitectureGroup);

    const floorGrid = new THREE.GridHelper(320, 44, 0x00DDFF, 0x32527B);
    floorGrid.position.y = -34;
    const floorGridMat = floorGrid.material as THREE.Material;
    floorGridMat.transparent = true;
    floorGridMat.opacity = 0.28;
    environmentArchitectureGroup.add(floorGrid);

    // Upper ceiling telemetry grid for full 3D cockpit enclosure
    const ceilingGrid = new THREE.GridHelper(320, 32, 0xFDCC0D, 0x32527B);
    ceilingGrid.position.y = 54;
    const ceilingGridMat = ceilingGrid.material as THREE.Material;
    ceilingGridMat.transparent = true;
    ceilingGridMat.opacity = 0.12;
    environmentArchitectureGroup.add(ceilingGrid);

    // Concentric 3D Floor Reactor Rings
    const floorRingRadii = [34, 68, 108];
    const floorRings: THREE.Mesh[] = [];
    floorRingRadii.forEach((radius, rIdx) => {
      const rGeo = new THREE.RingGeometry(radius - 0.35, radius + 0.35, 96);
      const rMat = new THREE.MeshBasicMaterial({
        color: rIdx === 1 ? 0xFDCC0D : rIdx === 0 ? 0x00DDFF : 0x32527B,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: rIdx === 1 ? 0.45 : 0.28,
      });
      const rMesh = new THREE.Mesh(rGeo, rMat);
      rMesh.rotation.x = Math.PI / 2;
      rMesh.position.y = -33.8;
      environmentArchitectureGroup.add(rMesh);
      floorRings.push(rMesh);
    });

    // 3. MULTI-LAYER 3D VOLUMETRIC QUANTUM STARFIELD (1,100 3D Particles across depth)
    const particleCount = 1100;
    const particlePositions = new Float32Array(particleCount * 3);
    const particleColors = new Float32Array(particleCount * 3);
    const paletteColors = [
      new THREE.Color(0xFDCC0D), // Amarillo oro
      new THREE.Color(0x00DDFF), // Cian
      new THREE.Color(0x32527B), // Azul metálico
      new THREE.Color(0xFFBB00), // Ámbar
      new THREE.Color(0xFFFFFF), // Blanco
    ];

    for (let i = 0; i < particleCount; i++) {
      const r = 42 + Math.random() * 210;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      particlePositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      particlePositions[i * 3 + 1] = (Math.random() - 0.45) * 140;
      particlePositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const c = paletteColors[i % paletteColors.length];
      particleColors[i * 3] = c.r;
      particleColors[i * 3 + 1] = c.g;
      particleColors[i * 3 + 2] = c.b;
    }

    // Generate procedural soft circular alpha sprite texture (eliminates square pixels)
    const circleParticleTexture = createCircularParticleTexture();

    const starfieldGeo = new THREE.BufferGeometry();
    starfieldGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    starfieldGeo.setAttribute('color', new THREE.BufferAttribute(particleColors, 3));
    const starfieldMat = new THREE.PointsMaterial({
      size: 2.2,
      map: circleParticleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starfieldPoints = new THREE.Points(starfieldGeo, starfieldMat);
    scene.add(starfieldPoints);

    // Inner Core Swarm of Circular Quantum Sparks (450 circular glowing particles swirling in the core & orbits)
    const innerSwarmCount = 450;
    const innerSwarmPositions = new Float32Array(innerSwarmCount * 3);
    const innerSwarmColors = new Float32Array(innerSwarmCount * 3);
    for (let i = 0; i < innerSwarmCount; i++) {
      const r = 12 + Math.random() * 52;
      const theta = Math.random() * Math.PI * 2;
      innerSwarmPositions[i * 3] = Math.cos(theta) * r;
      innerSwarmPositions[i * 3 + 1] = (Math.random() - 0.5) * 38;
      innerSwarmPositions[i * 3 + 2] = Math.sin(theta) * r;

      const c = paletteColors[i % paletteColors.length];
      innerSwarmColors[i * 3] = c.r;
      innerSwarmColors[i * 3 + 1] = c.g;
      innerSwarmColors[i * 3 + 2] = c.b;
    }
    const innerSwarmGeo = new THREE.BufferGeometry();
    innerSwarmGeo.setAttribute('position', new THREE.BufferAttribute(innerSwarmPositions, 3));
    innerSwarmGeo.setAttribute('color', new THREE.BufferAttribute(innerSwarmColors, 3));
    const innerSwarmMat = new THREE.PointsMaterial({
      size: 2.6,
      map: circleParticleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerSwarmPoints = new THREE.Points(innerSwarmGeo, innerSwarmMat);
    scene.add(innerSwarmPoints);

    // 4. Pure Neutral White Studio Lighting so GLB models preserve 100% of their original native colors & materials
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 2.3);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xFFFFFF, 0xE2E8F0, 1.55);
    hemiLight.position.set(0, 90, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 2.85);
    keyLight.position.set(55, 85, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xFFFFFF, 1.95);
    fillLight.position.set(-70, 30, 60);
    scene.add(fillLight);

    const backRimLight = new THREE.DirectionalLight(0xFFFFFF, 1.65);
    backRimLight.position.set(0, 50, -80);
    scene.add(backRimLight);

    // GLTF + DRACO Loader Setup
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    const normalizeGlbScene = (rawScene: THREE.Group, targetMaxDim: number): THREE.Group => {
      const wrapper = new THREE.Group();
      const cloned = rawScene.clone(true);

      const box = new THREE.Box3().setFromObject(cloned);
      const size = new THREE.Vector3();
      const center = new THREE.Vector3();
      box.getSize(size);
      box.getCenter(center);

      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const scaleFactor = targetMaxDim / maxDim;

      cloned.position.set(-center.x * scaleFactor, -center.y * scaleFactor, -center.z * scaleFactor);
      cloned.scale.setScalar(scaleFactor);

      wrapper.add(cloned);
      return wrapper;
    };

    // Central SGX Core Reactor Group
    const coreGroup = new THREE.Group();
    coreGroup.userData = { type: 'CENTRAL_CORE' };
    scene.add(coreGroup);

    // Central vertical volumetric beam grounding the core to the 3D floor
    const centralColumnGeo = new THREE.CylinderGeometry(8, 18, 68, 32, 1, true);
    const centralColumnMat = new THREE.MeshBasicMaterial({
      color: 0xFDCC0D,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const centralColumnMesh = new THREE.Mesh(centralColumnGeo, centralColumnMat);
    centralColumnMesh.position.y = -12;
    scene.add(centralColumnMesh);

    // Fallback core crystal while SGX Icon.glb loads
    const fallbackCoreGeo = new THREE.OctahedronGeometry(11.5, 1);
    const fallbackCoreMat = new THREE.MeshStandardMaterial({
      color: 0xFDCC0D,
      metalness: 0.75,
      roughness: 0.25,
      flatShading: true,
    });
    const fallbackCoreMesh = new THREE.Mesh(fallbackCoreGeo, fallbackCoreMat);
    coreGroup.add(fallbackCoreMesh);

    const loadCentralLogoGlb = () => {
      if (glbTemplateCache.has(SGX_CORE_LOGO_GLB_URL)) {
        const normalized = normalizeGlbScene(glbTemplateCache.get(SGX_CORE_LOGO_GLB_URL)!, 25);
        fallbackCoreMesh.visible = false;
        coreGroup.add(normalized);
        setLoadedModelsCount(c => c + 1);
        return;
      }
      gltfLoader.load(
        SGX_CORE_LOGO_GLB_URL,
        gltf => {
          glbTemplateCache.set(SGX_CORE_LOGO_GLB_URL, gltf.scene);
          const normalized = normalizeGlbScene(gltf.scene, 25);
          fallbackCoreMesh.visible = false;
          coreGroup.add(normalized);
          setLoadedModelsCount(c => c + 1);
        },
        undefined,
        () => {}
      );
    };
    loadCentralLogoGlb();

    // Gyroscopic Energy Rings around the SGX Logo Core (Official SGX Gold #FDCC0D & SGX Blue #32527B)
    const ringGeo1 = new THREE.TorusGeometry(20, 0.3, 16, 96);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xFDCC0D,
      transparent: true,
      opacity: 0.72,
    });
    const gyroRing1 = new THREE.Mesh(ringGeo1, ringMat1);
    coreGroup.add(gyroRing1);

    const ringGeo2 = new THREE.TorusGeometry(24, 0.24, 16, 96);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x32527B,
      transparent: true,
      opacity: 0.65,
    });
    const gyroRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    gyroRing2.rotation.x = Math.PI / 3;
    coreGroup.add(gyroRing2);

    // Expanded Planetary Orbit Track (ORBIT_RADIUS = 68 so the 6 Pillar GLBs have generous spatial breathing room)
    const ORBIT_RADIUS = 68;
    const orbitTrackGeo = new THREE.TorusGeometry(ORBIT_RADIUS, 0.24, 16, 128);
    const orbitTrackMat = new THREE.MeshBasicMaterial({
      color: 0x32527B,
      transparent: true,
      opacity: 0.55,
    });
    const orbitTrackMesh = new THREE.Mesh(orbitTrackGeo, orbitTrackMat);
    orbitTrackMesh.rotation.x = Math.PI / 2;
    scene.add(orbitTrackMesh);

    // Orbiting 6 Pillars Group
    const pillarsOrbitGroup = new THREE.Group();
    scene.add(pillarsOrbitGroup);

    const pillarMeshes: {
      id: SgxCorePillarId;
      colorHex: number;
      group: THREE.Group;
      modelContainer: THREE.Group;
      fallbackMesh: THREE.Mesh;
      haloMesh: THREE.Mesh;
      pedestalCone: THREE.Mesh;
      beamLine: THREE.Line;
      baseAngle: number;
    }[] = [];

    const nodeSphereGeo = new THREE.OctahedronGeometry(5.5, 1);
    const nodeHaloGeo = new THREE.TorusGeometry(9.2, 0.25, 12, 48);
    const pedestalConeGeo = new THREE.CylinderGeometry(3.2, 8.5, 32, 24, 1, true);

    SGX_ORBITAL_PILLARS.forEach((p, idx) => {
      const baseAngle = (idx / SGX_ORBITAL_PILLARS.length) * Math.PI * 2;
      const x = Math.cos(baseAngle) * ORBIT_RADIUS;
      const z = Math.sin(baseAngle) * ORBIT_RADIUS;

      const pGroup = new THREE.Group();
      pGroup.position.set(x, 0, z);
      pGroup.userData = { type: 'PILLAR_NODE', pillarId: p.id };

      const modelContainer = new THREE.Group();
      pGroup.add(modelContainer);

      const pMat = new THREE.MeshStandardMaterial({
        color: p.threeColor,
        metalness: 0.7,
        roughness: 0.25,
        flatShading: true,
      });
      const fallbackMesh = new THREE.Mesh(nodeSphereGeo, pMat);
      modelContainer.add(fallbackMesh);

      const attachPillarGlb = (rawScene: THREE.Group) => {
        const normalized = normalizeGlbScene(rawScene, 15.0);
        fallbackMesh.visible = false;
        modelContainer.add(normalized);
        setLoadedModelsCount(c => c + 1);
      };

      if (glbTemplateCache.has(p.glbUrl)) {
        attachPillarGlb(glbTemplateCache.get(p.glbUrl)!);
      } else {
        gltfLoader.load(
          p.glbUrl,
          gltf => {
            glbTemplateCache.set(p.glbUrl, gltf.scene);
            attachPillarGlb(gltf.scene);
          },
          undefined,
          () => {}
        );
      }

      const haloMat = new THREE.MeshBasicMaterial({
        color: p.threeColor,
        transparent: true,
        opacity: 0.65,
      });
      const haloMesh = new THREE.Mesh(nodeHaloGeo, haloMat);
      haloMesh.rotation.x = Math.PI / 2.3;
      pGroup.add(haloMesh);

      // 3D Volumetric Pedestal Light Cone grounding each Pillar GLB to the 3D floor grid
      const coneMat = new THREE.MeshBasicMaterial({
        color: p.threeColor,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pedestalCone = new THREE.Mesh(pedestalConeGeo, coneMat);
      pedestalCone.position.y = -17;
      pGroup.add(pedestalCone);

      // Energy Beam connecting Central SGX Logo to this Pillar GLB
      const beamPoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0, z)];
      const beamGeo = new THREE.BufferGeometry().setFromPoints(beamPoints);
      const beamMat = new THREE.LineBasicMaterial({
        color: p.threeColor,
        transparent: true,
        opacity: 0.28,
      });
      const beamLine = new THREE.Line(beamGeo, beamMat);
      pillarsOrbitGroup.add(beamLine);

      pillarsOrbitGroup.add(pGroup);
      pillarMeshes.push({
        id: p.id,
        colorHex: p.threeColor,
        group: pGroup,
        modelContainer,
        fallbackMesh,
        haloMesh,
        pedestalCone,
        beamLine,
        baseAngle,
      });
    });

    // Collectible 3D XP Energy Orbs floating in intermediate orbit
    const xpOrbs: { mesh: THREE.Mesh; angle: number; radius: number; yOffset: number; active: boolean; cooldown: number }[] = [];
    const orbGeo = new THREE.IcosahedronGeometry(2.2, 1);
    for (let i = 0; i < 6; i++) {
      const orbMat = new THREE.MeshStandardMaterial({
        color: i % 2 === 0 ? 0xFDCC0D : 0x00DDFF,
        emissive: i % 2 === 0 ? 0xFDCC0D : 0x32527B,
        emissiveIntensity: 0.85,
        metalness: 0.9,
        roughness: 0.1,
      });
      const orbMesh = new THREE.Mesh(orbGeo, orbMat);
      const angle = ((i + 0.5) / 6) * Math.PI * 2;
      const radius = 44;
      orbMesh.position.set(Math.cos(angle) * radius, (i % 2 === 0 ? 1 : -1) * 5.5, Math.sin(angle) * radius);
      orbMesh.userData = { type: 'XP_ORB', orbIndex: i };
      pillarsOrbitGroup.add(orbMesh);
      xpOrbs.push({ mesh: orbMesh, angle, radius, yOffset: orbMesh.position.y, active: true, cooldown: 0 });
    }

    // Outer Sponsor Orbital Guide Rail at radius = 94
    const sponsorRailGeo = new THREE.TorusGeometry(94, 0.22, 16, 128);
    const sponsorRailMat = new THREE.MeshBasicMaterial({
      color: 0x32527B,
      transparent: true,
      opacity: 0.35,
    });
    const sponsorRailMesh = new THREE.Mesh(sponsorRailGeo, sponsorRailMat);
    sponsorRailMesh.rotation.x = Math.PI / 2;
    scene.add(sponsorRailMesh);

    // 4 ROTATING 3D SPONSOR STATIONS & ARCHITECTURAL AREAS
    const sponsorStationMeshes: {
      id: string;
      name: string;
      tierLabel: string;
      threeColor: number;
      group: THREE.Group;
      billboardPivot: THREE.Group;
      billboardMesh: THREE.Mesh;
      baseY: number;
      billboardTexture: THREE.Texture;
      billboardGeo: THREE.BufferGeometry;
      borderMat: THREE.Material;
      faceMat: THREE.Material;
      baseRingGeo: THREE.BufferGeometry;
      baseRingMat: THREE.Material;
      beaconGeo: THREE.BufferGeometry;
      beaconMat: THREE.Material;
      haloGeo: THREE.BufferGeometry;
      haloMat: THREE.Material;
      bracketGeo: THREE.BufferGeometry;
      bracketMat: THREE.Material;
    }[] = [];

    SGX_3D_SPONSOR_STATIONS.forEach((s, idx) => {
      const stationGroup = new THREE.Group();
      stationGroup.position.set(
        Math.cos(s.angle) * s.radius,
        s.yPos,
        Math.sin(s.angle) * s.radius
      );
      stationGroup.userData = { type: 'SPONSOR_STATION', sponsorId: s.id };

      // Base concentric ring on the 3D floor
      const baseRingGeo = new THREE.RingGeometry(6.5, 7.4, 36);
      const baseRingMat = new THREE.MeshBasicMaterial({
        color: s.threeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
      });
      const baseRing = new THREE.Mesh(baseRingGeo, baseRingMat);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = -33.8 - s.yPos;
      stationGroup.add(baseRing);

      // Upward vertical light beacon column from floor
      const beaconGeo = new THREE.CylinderGeometry(2.0, 6.5, 34, 24, 1, true);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: s.threeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = -17 - s.yPos / 2;
      stationGroup.add(beacon);

      // Floating upper halo ring
      const haloGeo = new THREE.TorusGeometry(12.5, 0.22, 16, 48);
      const haloMat = new THREE.MeshBasicMaterial({
        color: s.threeColor,
        transparent: true,
        opacity: 0.45,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 4;
      stationGroup.add(halo);

      // Rotating Billboard Assembly
      const billboardPivot = new THREE.Group();
      const billboardTexture = createSponsorBillboardTexture(
        s.name,
        s.tierLabel,
        s.roleSubtitle,
        s.colorHex
      );
      const billboardGeo = new THREE.BoxGeometry(20, 10.5, 0.45);
      const borderMat = new THREE.MeshStandardMaterial({
        color: 0x1A1E29,
        metalness: 0.85,
        roughness: 0.2,
      });
      const faceMat = new THREE.MeshBasicMaterial({
        map: billboardTexture,
        transparent: true,
        opacity: 0.96,
      });
      const billboardMesh = new THREE.Mesh(billboardGeo, [
        borderMat,
        borderMat,
        borderMat,
        borderMat,
        faceMat,
        faceMat,
      ]);
      billboardMesh.userData = { type: 'SPONSOR_STATION', sponsorId: s.id };
      billboardPivot.add(billboardMesh);

      // Top and bottom cyber rail trims
      const bracketGeo = new THREE.BoxGeometry(20.8, 0.4, 0.8);
      const bracketMat = new THREE.MeshBasicMaterial({ color: s.threeColor });
      const topBracket = new THREE.Mesh(bracketGeo, bracketMat);
      topBracket.position.y = 5.4;
      billboardPivot.add(topBracket);

      const btmBracket = new THREE.Mesh(bracketGeo, bracketMat);
      btmBracket.position.y = -5.4;
      billboardPivot.add(btmBracket);

      stationGroup.add(billboardPivot);
      scene.add(stationGroup);

      sponsorStationMeshes.push({
        id: s.id,
        name: s.name,
        tierLabel: s.tierLabel,
        threeColor: s.threeColor,
        group: stationGroup,
        billboardPivot,
        billboardMesh,
        baseY: s.yPos,
        billboardTexture,
        billboardGeo,
        borderMat,
        faceMat,
        baseRingGeo,
        baseRingMat,
        beaconGeo,
        beaconMat,
        haloGeo,
        haloMat,
        bracketGeo,
        bracketMat,
      });
    });

    // Expanding 3D Holographic Shockwave Rings Pool
    const shockwaves: { mesh: THREE.Mesh; life: number; maxScale: number }[] = [];
    const spawnShockwave = (worldPos: THREE.Vector3, colorHex: number) => {
      const swGeo = new THREE.RingGeometry(1.5, 2.8, 48);
      const swMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.95,
      });
      const swMesh = new THREE.Mesh(swGeo, swMat);
      swMesh.position.copy(worldPos);
      swMesh.lookAt(camera.position);
      scene.add(swMesh);
      shockwaves.push({ mesh: swMesh, life: 1.0, maxScale: 26 });
    };
    triggerShockwaveRef.current = spawnShockwave;

    // 3D Raycaster for direct GLB, Sponsor & XP Orb interaction
    const raycaster = new THREE.Raycaster();
    const pointerNdc = new THREE.Vector2();

    const handleCanvasClick = (clientX: number, clientY: number) => {
      if (!container) return;
      const rect = container.getBoundingClientRect();
      pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointerNdc, camera);

      // 1. Check Collectible XP Orbs first
      const orbMeshes = xpOrbs.filter(o => o.active).map(o => o.mesh);
      const orbHits = raycaster.intersectObjects(orbMeshes, false);
      if (orbHits.length > 0) {
        const hitMesh = orbHits[0].object as THREE.Mesh;
        const orbIdx = hitMesh.userData?.orbIndex;
        if (typeof orbIdx === 'number' && xpOrbs[orbIdx]?.active) {
          const orb = xpOrbs[orbIdx];
          orb.active = false;
          orb.cooldown = 8.0;
          orb.mesh.visible = false;
          const worldPos = new THREE.Vector3();
          orb.mesh.getWorldPosition(worldPos);
          spawnShockwave(worldPos, 0xFDCC0D);
          playScanSuccessSound();
          setXpOrbsCollected(c => c + 1);
          setFloatingXpNotice('+25 XP • ORBE CUÁNTICO RECOLECTADO');
          setTimeout(() => setFloatingXpNotice(null), 2200);
          recordActivity('easter_egg', 'Orbe Cuántico 3D Recolectado', 'Núcleo Orbital SGX', 25);
          return;
        }
      }

      // 2. Check 3D Sponsor Stations
      for (const sm of sponsorStationMeshes) {
        const hits = raycaster.intersectObject(sm.group, true);
        if (hits.length > 0) {
          const worldPos = new THREE.Vector3();
          sm.group.getWorldPosition(worldPos);
          spawnShockwave(worldPos, sm.threeColor);
          playScanSuccessSound();
          setFloatingXpNotice(`+25 XP • ESTACIÓN 3D: ${sm.name.toUpperCase()}`);
          setTimeout(() => setFloatingXpNotice(null), 2400);
          recordActivity('tour_complete', `Estación Sponsor 3D: ${sm.name}`, sm.tierLabel, 25);
          setFocusedSponsorId(sm.id);
          setCameraFocusedOnPillar(false);
          setAutoRotate(false);
          setActiveDrawerTab('SPONSORS');
          setDrawerOpen(true);
          return;
        }
      }

      // 3. Check Pillar GLB Groups
      for (const pm of pillarMeshes) {
        const hits = raycaster.intersectObject(pm.group, true);
        if (hits.length > 0) {
          const worldPos = new THREE.Vector3();
          pm.group.getWorldPosition(worldPos);
          spawnShockwave(worldPos, pm.colorHex);
          setAutoRotate(false);
          setFocusedSponsorId(null);
          setCameraFocusedOnPillar(true);
          setDrawerOpen(true);
          playPillarDockSound(pm.id);
          window.dispatchEvent(new CustomEvent('sgx:pillar_docked', { detail: { pillarId: pm.id } }));
          onSelectPillar(pm.id);
          return;
        }
      }

      // 4. Check Central SGX Icon.glb Core
      const coreHits = raycaster.intersectObject(coreGroup, true);
      if (coreHits.length > 0) {
        spawnShockwave(new THREE.Vector3(0, 0, 0), 0xFDCC0D);
        playCyberBurstSound('quantum');
        setFocusedSponsorId(null);
        setCameraFocusedOnPillar(false);
        setAutoRotate(true);
      }
    };

    const onDomPointerUp = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.closest('button') || target.closest('[data-holographic-drawer="true"]'))) {
        return;
      }
      if (dragDistanceRef.current < 6) {
        handleCanvasClick(e.clientX, e.clientY);
      }
    };
    container.addEventListener('pointerup', onDomPointerUp);

    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth || (typeof window !== 'undefined' ? Math.max(window.innerWidth, 320) : 960);
      const h = Math.max(container.clientHeight || 0, typeof window !== 'undefined' ? Math.max(window.innerHeight - 126, 440) : 560);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Main Animation Loop
    let reqId: number | null = null;
    const timer = typeof (THREE as any).Timer === 'function' ? new (THREE as any).Timer() : null;
    let lastTime = performance.now();
    let accumulatedElapsed = 0;
    const tempVec = new THREE.Vector3();
    const targetColorObj = new THREE.Color();

    const animate = (timestamp?: number) => {
      reqId = requestAnimationFrame(animate);
      let delta = 0.016;
      let elapsed = 0;

      if (timer) {
        timer.update(timestamp);
        delta = Math.min(timer.getDelta(), 0.1);
        elapsed = timer.getElapsed();
      } else {
        const now = timestamp ?? performance.now();
        delta = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        accumulatedElapsed += delta;
        elapsed = accumulatedElapsed;
      }

      pulseSurgeRef.current = Math.max(0, pulseSurgeRef.current - delta * 1.8);
      const surge = pulseSurgeRef.current;

      // Update 3D Volumetric Shader Dome Uniforms
      domeUniforms.uTime.value = elapsed;
      domeUniforms.uPulse.value = surge;
      const activePillarObj = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarRef.current) || SGX_ORBITAL_PILLARS[0];
      targetColorObj.setHex(activePillarObj.threeColor);
      domeUniforms.uActiveColor.value.lerp(targetColorObj, 0.06);

      // Rotate 3D Starfield & Architectural Horizon
      starfieldPoints.rotation.y = elapsed * 0.035;
      starfieldPoints.rotation.x = Math.sin(elapsed * 0.12) * 0.04;
      innerSwarmPoints.rotation.y = -elapsed * 0.16 * orbitSpeedMultRef.current;
      innerSwarmPoints.rotation.x = Math.sin(elapsed * 0.3) * 0.05;
      environmentArchitectureGroup.rotation.y = -elapsed * 0.04;

      // Central Core animation
      const coreScale = 1 + surge * 0.22 + Math.sin(elapsed * 2.4) * 0.04;
      coreGroup.scale.setScalar(coreScale);
      coreGroup.rotation.y = elapsed * 0.55 * orbitSpeedMultRef.current;
      gyroRing1.rotation.x = elapsed * 0.75;
      gyroRing1.rotation.y = elapsed * 0.45;
      gyroRing2.rotation.y = -elapsed * 0.6;
      gyroRing2.rotation.z = elapsed * 0.35;

      // Orbital rotation
      if (!isDraggingRef.current) {
        if (autoRotateRef.current && !cameraFocusedRef.current && !focusedSponsorRef.current) {
          targetOrbitAngleRef.current += delta * 0.18 * orbitSpeedMultRef.current;
        }
        currentOrbitAngleRef.current +=
          (targetOrbitAngleRef.current - currentOrbitAngleRef.current) * 0.07;
      }
      pillarsOrbitGroup.rotation.y = currentOrbitAngleRef.current;

      const cw = container.clientWidth || 960;
      const ch = container.clientHeight || 560;

      let activeWorldPos = new THREE.Vector3(0, 0, 0);

      // Update each Pillar GLB satellite & 2D projected HUD tag
      pillarMeshes.forEach((pm, idx) => {
        const isActive = pm.id === activePillarRef.current;
        const targetScale = isActive ? 1.42 + surge * 0.22 : 0.95;
        pm.modelContainer.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        pm.group.position.y = Math.sin(elapsed * 2.0 + idx) * 2.5;
        pm.modelContainer.rotation.y = elapsed * (isActive ? 1.4 : 0.65) * orbitSpeedMultRef.current;
        pm.haloMesh.rotation.z = -elapsed * (isActive ? 2.1 : 0.85);

        const coneMat = pm.pedestalCone.material as THREE.MeshBasicMaterial;
        coneMat.opacity = isActive ? 0.26 : 0.07;

        const beamMat = pm.beamLine.material as THREE.LineBasicMaterial;
        beamMat.opacity = isActive ? 0.88 : 0.22;

        pm.group.getWorldPosition(tempVec);
        if (isActive) {
          activeWorldPos.copy(tempVec);
        }

        // Project 3D position to 2D container coordinates
        tempVec.project(camera);
        const screenX = (tempVec.x * 0.5 + 0.5) * cw;
        const screenY = (-(tempVec.y * 0.5) + 0.5) * ch;
        const isFarBack = tempVec.z > 0.915;

        const btnEl = nodeMarkerRefs.current[pm.id];
        if (btnEl) {
          btnEl.style.transform = `translate3d(${screenX}px, ${screenY + 38}px, 0) translate(-50%, -50%) scale(${
            isActive ? 1.04 : tempVec.z < 0.88 ? 0.9 : 0.76
          })`;
          btnEl.style.zIndex = isActive ? '24' : tempVec.z < 0.89 ? '16' : '10';
          // Fade out back-row labels when not active so labels never feel stacked or cluttered
          btnEl.style.opacity = isActive ? '1' : isFarBack ? '0.18' : '0.78';
        }
      });

      // Update 3D Sponsor Billboard Stations (Stable & Facing the Camera — NO spinning so sponsors are 100% readable!)
      sponsorStationMeshes.forEach((sm, idx) => {
        // Billboard plane stays locked facing the camera directly
        sm.billboardPivot.quaternion.copy(camera.quaternion);
        // Gentle spatial levitation floating without spinning
        sm.group.position.y = sm.baseY + Math.sin(elapsed * 1.2 + idx * 1.4) * 0.9;

        sm.group.getWorldPosition(tempVec);
        tempVec.project(camera);
        const screenX = (tempVec.x * 0.5 + 0.5) * cw;
        const screenY = (-(tempVec.y * 0.5) + 0.5) * ch;
        const isFarBack = tempVec.z > 0.93;

        const sponsorBtn = sponsorMarkerRefs.current[sm.id];
        if (sponsorBtn) {
          const isFocused = focusedSponsorRef.current === sm.id;
          sponsorBtn.style.transform = `translate3d(${screenX}px, ${screenY - 32}px, 0) translate(-50%, -50%) scale(${
            isFocused ? 1.05 : tempVec.z < 0.88 ? 0.9 : 0.75
          })`;
          sponsorBtn.style.zIndex = isFocused ? '25' : '12';
          sponsorBtn.style.opacity = isFocused ? '1' : isFarBack ? '0.2' : '0.85';
        }
      });

      // Camera Flight Interpolation with 3D mouse parallax
      const px = pointerParallaxRef.current.x;
      const py = pointerParallaxRef.current.y;

      if (focusedSponsorRef.current) {
        const targetStation = sponsorStationMeshes.find(s => s.id === focusedSponsorRef.current);
        if (targetStation) {
          targetStation.group.getWorldPosition(tempVec);
          const dirFromCenter = tempVec.clone().normalize();
          targetCameraPos.set(
            tempVec.x + dirFromCenter.x * 24 + px * 4,
            tempVec.y + 6 + py * 3,
            tempVec.z + dirFromCenter.z * 24
          );
          targetLookAt.set(tempVec.x, tempVec.y, tempVec.z);
        }
      } else if (cameraFocusedRef.current) {
        const dirFromCenter = activeWorldPos.clone().normalize();
        targetCameraPos.set(
          activeWorldPos.x + dirFromCenter.x * 38 + 16 + px * 6,
          activeWorldPos.y + 15 + py * 4,
          activeWorldPos.z + dirFromCenter.z * 42 + 20
        );
        targetLookAt.set(activeWorldPos.x + 10, activeWorldPos.y, activeWorldPos.z);
      } else {
        targetCameraPos.set(px * 12, 38 + py * 8, 152);
        targetLookAt.set(6, -2, 0);
      }

      camera.position.lerp(targetCameraPos, 0.06);
      currentLookAt.lerp(targetLookAt, 0.08);
      camera.lookAt(currentLookAt);

      // Animate Collectible XP Orbs
      xpOrbs.forEach((orb, i) => {
        if (!orb.active) {
          orb.cooldown -= delta;
          if (orb.cooldown <= 0) {
            orb.active = true;
            orb.mesh.visible = true;
          }
          return;
        }
        orb.angle += delta * 0.42 * (i % 2 === 0 ? 1 : -1);
        orb.mesh.position.x = Math.cos(orb.angle) * orb.radius;
        orb.mesh.position.z = Math.sin(orb.angle) * orb.radius;
        orb.mesh.position.y = orb.yOffset + Math.sin(elapsed * 2.8 + i) * 2.2;
        orb.mesh.rotation.y += delta * 2.0;
        orb.mesh.rotation.x += delta * 1.3;
      });

      // Update Shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.life -= delta * 1.6;
        const scale = 1 + (1 - sw.life) * sw.maxScale;
        sw.mesh.scale.setScalar(scale);
        sw.mesh.lookAt(camera.position);
        (sw.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sw.life);
        if (sw.life <= 0) {
          scene.remove(sw.mesh);
          sw.mesh.geometry.dispose();
          (sw.mesh.material as THREE.Material).dispose();
          shockwaves.splice(i, 1);
        }
      }

      if (renderer) {
        renderer.render(scene, camera);
      }
    };

    animate();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      container.removeEventListener('pointerup', onDomPointerUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      dracoLoader.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      circleParticleTexture.dispose();
      starfieldGeo.dispose();
      starfieldMat.dispose();
      innerSwarmGeo.dispose();
      innerSwarmMat.dispose();
      sponsorRailGeo.dispose();
      sponsorRailMat.dispose();
      sponsorStationMeshes.forEach(sm => {
        sm.billboardTexture.dispose();
        sm.billboardGeo.dispose();
        sm.borderMat.dispose();
        sm.faceMat.dispose();
        sm.baseRingGeo.dispose();
        sm.baseRingMat.dispose();
        sm.beaconGeo.dispose();
        sm.beaconMat.dispose();
        sm.haloGeo.dispose();
        sm.haloMat.dispose();
        sm.bracketGeo.dispose();
        sm.bracketMat.dispose();
      });
      centralColumnGeo.dispose();
      centralColumnMat.dispose();
      pedestalConeGeo.dispose();
      fallbackCoreGeo.dispose();
      fallbackCoreMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      orbitTrackGeo.dispose();
      orbitTrackMat.dispose();
      nodeSphereGeo.dispose();
      nodeHaloGeo.dispose();
      orbGeo.dispose();
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [liteMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target && (target.closest('button') || target.closest('[data-holographic-drawer="true"]'))) {
      return;
    }
    isDraggingRef.current = true;
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    dragDistanceRef.current = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (viewportRef.current) {
      const rect = viewportRef.current.getBoundingClientRect();
      pointerParallaxRef.current = {
        x: ((e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5) * 2,
        y: (0.5 - (e.clientY - rect.top) / Math.max(rect.height, 1)) * 2,
      };
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - pointerDownPosRef.current.x;
    const dy = e.clientY - pointerDownPosRef.current.y;
    dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };

    if (cameraFocusedOnPillar) {
      setCameraFocusedOnPillar(false);
    }
    if (focusedSponsorId) {
      setFocusedSponsorId(null);
    }
    currentOrbitAngleRef.current += dx * 0.0075;
    targetOrbitAngleRef.current = currentOrbitAngleRef.current;
  };

  const handlePointerUp = () => {
    isDraggingRef.current = false;
  };

  const handleDockPillar = (pillarId: SgxCorePillarId, flyCamera: boolean = true) => {
    setAutoRotate(false);
    setFocusedSponsorId(null);
    setCameraFocusedOnPillar(flyCamera);
    if (!zenImmersionMode && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setDrawerOpen(true);
    }
    playPillarDockSound(pillarId);
    if (triggerShockwaveRef.current) {
      const pNode = SGX_ORBITAL_PILLARS.find(p => p.id === pillarId);
      triggerShockwaveRef.current(new THREE.Vector3(0, 0, 0), pNode?.threeColor || 0xFDCC0D);
    }
    window.dispatchEvent(new CustomEvent('sgx:pillar_docked', { detail: { pillarId } }));
    onSelectPillar(pillarId);
  };

  const handleFocusSponsor = (sponsorId: string | null) => {
    if (!sponsorId) {
      setFocusedSponsorId(null);
      setAutoRotate(true);
      return;
    }
    setFocusedSponsorId(sponsorId);
    setCameraFocusedOnPillar(false);
    setAutoRotate(false);
    setActiveDrawerTab('SPONSORS');
    if (!zenImmersionMode && typeof window !== 'undefined' && window.innerWidth >= 768) {
      setDrawerOpen(true);
    }
    playUiChirp(840);
    const station = SGX_3D_SPONSOR_STATIONS.find(s => s.id === sponsorId);
    if (triggerShockwaveRef.current) {
      triggerShockwaveRef.current(new THREE.Vector3(0, 0, 0), station?.threeColor || 0xFDCC0D);
    }
    if (station) {
      setFloatingXpNotice(`🔭 ENFOCANDO EN ÁREA 3D: ${station.name.toUpperCase()}`);
      setTimeout(() => setFloatingXpNotice(null), 2000);
    }
  };

  const handlePlayHarmonicNote = (freqMultiplier: number, label: string) => {
    playUiChirp(432 * freqMultiplier);
    if (triggerShockwaveRef.current) {
      const pNode = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarId);
      triggerShockwaveRef.current(new THREE.Vector3(0, 0, 0), pNode?.threeColor || 0x00DDFF);
    }
    pulseSurgeRef.current = 1.4;
    setFloatingXpNotice(`⚡ FRECUENCIA ${label} EMITIDA EN EL NÚCLEO`);
    setTimeout(() => setFloatingXpNotice(null), 1800);
  };

  const activeNode = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarId) || SGX_ORBITAL_PILLARS[0];
  const readableAccent = activeNode.colorHex === '#32527B' ? '#00DDFF' : activeNode.colorHex;

  return (
    <div
      className="relative w-full h-full flex-1 min-h-0 bg-[#050505] overflow-hidden select-none flex flex-col"
      style={{
        minHeight: 'calc(100dvh - 54px)',
      }}
    >
      {/* Top Bar HUD Overlay: Clean, Uncluttered & Mobile-Responsive */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#050505]/95 backdrop-blur-md border-b border-[#32527B]/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={activeNode.iconUrl}
            alt={activeNode.code}
            referrerPolicy="no-referrer"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(253,204,13,0.5)]"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono">
              <span className="font-extrabold tracking-wider" style={{ color: readableAccent }}>
                {activeNode.code}
              </span>
              <span className="text-slate-500 hidden md:inline">·</span>
              <span className="text-slate-400 truncate hidden md:inline">{activeNode.title}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white font-['Orbitron',sans-serif] truncate">
              NÚCLEO 3D SPATIALGINEERS
            </h3>
          </div>
        </div>

        <div className="relative flex items-center gap-1 sm:gap-1.5 shrink-0 font-mono text-xs">
          {/* Quick 1-Click Boleto Trigger */}
          {onOpenTickets && (
            <button
              type="button"
              onClick={() => {
                playUiChirp(880);
                onOpenTickets();
              }}
              className="px-2 sm:px-2.5 py-1.5 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-extrabold flex items-center gap-1 cursor-pointer text-xs"
              style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
              title="Obtener o ver Boleto Oficial en PDF"
            >
              <Ticket className="w-3.5 h-3.5 fill-black shrink-0" />
              <span className="hidden sm:inline">Boleto PDF</span>
            </button>
          )}

          {/* Quick 1-Click Agenda Trigger */}
          {onSelectSection && (
            <button
              type="button"
              onClick={() => {
                playUiChirp(750);
                onSelectSection('AGENDA');
              }}
              className="hidden md:flex px-2 sm:px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#32527B] border border-[#32527B] text-slate-200 hover:text-white items-center gap-1 cursor-pointer text-xs font-bold"
              style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
              title="Ver Run of Show y Agenda de 3 Días"
            >
              <Calendar className="w-3.5 h-3.5 text-[#00DDFF] shrink-0" />
              <span>Agenda</span>
            </button>
          )}

          {/* Quick 1-Click Credential Generator Trigger */}
          {onOpenCredential && (
            <button
              type="button"
              onClick={() => {
                playUiChirp(840);
                onOpenCredential();
              }}
              className="hidden lg:flex px-2 sm:px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#32527B] border border-cyan-500/50 text-cyan-300 hover:text-white items-center gap-1 cursor-pointer text-xs font-bold"
              style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
              title="Diseñar Credencial Holográfica 3D"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Credencial 3D</span>
            </button>
          )}

          {/* Orbit Auto-Rotate Toggle (Compact on mobile) */}
          <button
            type="button"
            onClick={() => {
              playUiChirp(680);
              setAutoRotate(prev => !prev);
              if (!autoRotate) {
                setCameraFocusedOnPillar(false);
                setFocusedSponsorId(null);
              }
            }}
            className="px-2 py-1.5 bg-[#1A1A1A] hover:bg-[#32527B]/60 border border-[#32527B] text-white flex items-center gap-1 cursor-pointer text-xs font-bold"
            style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
            title={autoRotate ? 'Pausar rotación de órbita' : 'Girar órbita'}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#00DDFF]" /> : <Play className="w-3.5 h-3.5 text-[#FDCC0D]" />}
            <span className="hidden sm:inline">{autoRotate ? 'Pausa' : 'Girar'}</span>
          </button>

          {/* Primary Exploration Trigger Button (Roomy Inspection Modal) */}
          <button
            type="button"
            onClick={() => {
              playUiChirp(740);
              setDrawerOpen(prev => !prev);
              setOptionsMenuOpen(false);
            }}
            className="px-2.5 sm:px-3.5 py-1.5 bg-[#FDCC0D] hover:bg-[#FFBB00] text-[#050505] font-['Orbitron',sans-serif] font-black flex items-center gap-1 cursor-pointer text-xs transition-transform hover:scale-102"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Compass className="w-3.5 h-3.5 text-[#050505]" />
            <span>{drawerOpen ? 'Cerrar' : `Explorar ${activeNode.id}`}</span>
          </button>

          {/* Sleek Options Popover Button (De-clutters secondary controls) */}
          <button
            type="button"
            onClick={() => {
              playUiChirp(640);
              setOptionsMenuOpen(prev => !prev);
            }}
            className={`p-1.5 sm:px-2 sm:py-1.5 border flex items-center gap-1 transition-colors cursor-pointer text-xs font-bold ${
              optionsMenuOpen
                ? 'bg-[#00DDFF] text-black border-[#00DDFF]'
                : 'bg-[#1A1A1A] hover:bg-[#2A3448] text-slate-300 border-[#32527B]'
            }`}
            style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
            title="Opciones avanzadas del Núcleo 3D"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ajustes</span>
          </button>

          {/* Clean Options Dropdown Popover */}
          {optionsMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 z-50 w-64 p-2 bg-[#0D1017] border-2 border-[#32527B] shadow-[0_15px_40px_rgba(0,0,0,0.9)] space-y-1.5 font-mono text-xs"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-[#32527B]/60 uppercase tracking-wider">
                Control de Cámara & Espacio 3D
              </div>

              {cameraFocusedOnPillar || focusedSponsorId ? (
                <button
                  type="button"
                  onClick={() => {
                    playUiChirp(620);
                    setCameraFocusedOnPillar(false);
                    setFocusedSponsorId(null);
                    setAutoRotate(true);
                    setOptionsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#FDCC0D] hover:text-black border border-[#32527B] flex items-center gap-2 text-left transition-colors cursor-pointer text-xs text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-[#FDCC0D]" />
                  <span>Restablecer Vista Orbital</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    playUiChirp(780);
                    setCameraFocusedOnPillar(true);
                    setAutoRotate(false);
                    setOptionsMenuOpen(false);
                  }}
                  className="w-full px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#00DDFF] hover:text-black border border-[#32527B] flex items-center gap-2 text-left transition-colors cursor-pointer text-xs text-white"
                >
                  <Eye className="w-3.5 h-3.5 text-[#00DDFF]" />
                  <span>Zoom a {activeNode.id} (.GLB)</span>
                </button>
              )}

              {/* Cycle Sponsor 3D Areas */}
              <button
                type="button"
                onClick={() => {
                  playUiChirp(720);
                  const curIdx = SGX_3D_SPONSOR_STATIONS.findIndex(s => s.id === focusedSponsorId);
                  const nextSponsor = SGX_3D_SPONSOR_STATIONS[(curIdx + 1) % SGX_3D_SPONSOR_STATIONS.length];
                  handleFocusSponsor(nextSponsor.id);
                  setOptionsMenuOpen(false);
                }}
                className="w-full px-2.5 py-1.5 bg-[#1A1A1A] hover:bg-[#FFBB00] hover:text-black border border-[#32527B] flex items-center gap-2 text-left transition-colors cursor-pointer text-xs text-white"
              >
                <Building2 className="w-3.5 h-3.5 text-[#FFBB00]" />
                <span>Navegar Sponsors 3D (4 Áreas)</span>
              </button>

              {/* Zen Immersion */}
              <button
                type="button"
                onClick={() => {
                  playCyberBurstSound('quantum');
                  const nextZen = !zenImmersionMode;
                  setZenImmersionMode(nextZen);
                  if (nextZen) {
                    setDrawerOpen(false);
                    setCameraFocusedOnPillar(true);
                    setOrbitSpeedMultiplier(1.8);
                    setFloatingXpNotice('🌌 MODO INMERSIÓN TOTAL ACTIVO');
                    setTimeout(() => setFloatingXpNotice(null), 2400);
                  } else {
                    setCameraFocusedOnPillar(false);
                    setOrbitSpeedMultiplier(1.0);
                  }
                  setOptionsMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 border flex items-center gap-2 text-left transition-colors cursor-pointer text-xs ${
                  zenImmersionMode
                    ? 'bg-[#00DDFF] text-black border-[#00DDFF]'
                    : 'bg-[#1A1A1A] hover:bg-[#2A3448] text-white border-[#32527B]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{zenImmersionMode ? 'Salir Inmersión Total' : 'Modo Inmersión Total 3D'}</span>
              </button>

              {/* Lite Mode */}
              <button
                type="button"
                onClick={() => {
                  playUiChirp(820);
                  setLiteMode(prev => !prev);
                  setOptionsMenuOpen(false);
                }}
                className={`w-full px-2.5 py-1.5 border flex items-center gap-2 text-left transition-colors cursor-pointer text-xs ${
                  liteMode
                    ? 'bg-[#FFBB00] text-black border-[#FFBB00]'
                    : 'bg-[#1A1A1A] hover:bg-[#2A3448] text-[#FFBB00] border-[#B87000]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{liteMode ? 'Modo Ligero: Activo' : 'Activar Modo Ligero (Batería)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Scroll-Locked Full-Bleed Interactive 3D Viewport with Volumetric GLSL Dome & Architectural Grids */}
      <div
        ref={viewportRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="relative w-full flex-1 min-h-[440px] h-[calc(100dvh-126px)] cursor-grab active:cursor-grabbing overflow-hidden touch-none overscroll-contain bg-[#050505]"
        style={{
          height: 'calc(100dvh - 126px)',
          minHeight: '440px',
          touchAction: 'none',
        }}
      >
        {/* Official Brand & Tactical Guide Credit: "POWERED BY SPATIALGINEERS" at 40% opacity */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-3 right-4 z-20 font-['Orbitron',sans-serif] text-[10px] sm:text-xs font-bold tracking-[0.2em] text-white opacity-40 uppercase"
        >
          POWERED BY SPATIALGINEERS
        </div>

        {/* LEFT 3D COCKPIT WING: THE 4 CIRCULAR COUNTDOWN CLOCKS ("LOS RELOJES") — Sleek on Desktop & Compact Pill on Mobile */}
        {!zenImmersionMode && (
          <div className="absolute top-2.5 left-2.5 sm:top-4 sm:left-4 z-25 pointer-events-auto">
            {/* Mobile Compact Pill (when collapsed) */}
            {clocksCollapsedMobile && (
              <button
                type="button"
                onClick={() => setClocksCollapsedMobile(false)}
                className="sm:hidden px-2.5 py-1.5 bg-[#050505]/95 border border-[#FDCC0D] text-white font-mono text-[11px] font-bold flex items-center gap-2 shadow-2xl cursor-pointer"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                title="Expandir relojes del Summit"
              >
                <Clock className="w-3.5 h-3.5 text-[#FDCC0D]" />
                <span className="tabular-nums tracking-wide">{countdown.days}D : {countdown.hours}H : {countdown.minutes}M</span>
                <span className="text-[#00DDFF] text-[9px]">▼</span>
              </button>
            )}

            {/* Full Clocks Panel (Always visible on desktop sm:block, on mobile only when expanded) */}
            <div
              data-holographic-drawer="true"
              onClick={e => e.stopPropagation()}
              className={`${clocksCollapsedMobile ? 'hidden sm:block' : 'block'} w-[216px] sm:w-[238px] bg-[#1A1A1A]/95 backdrop-blur-xl border border-[#32527B] p-2.5 sm:p-3.5 shadow-[0_18px_45px_rgba(0,0,0,0.88)] transition-all duration-300`}
              style={{
                clipPath: 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)',
              }}
            >
              <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#32527B]/50">
                <div className="min-w-0">
                  <div className="text-[9px] font-mono font-bold text-[#FDCC0D] tracking-widest uppercase">
                    11–13 DIC 2026 · 10:00 AM
                  </div>
                  <div className="text-xs font-black text-white font-['Orbitron',sans-serif] tracking-wide truncate">
                    RELOJES DEL SUMMIT
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClocksCollapsedMobile(true)}
                  className="sm:hidden px-1.5 py-0.5 bg-[#050505] border border-[#32527B] text-[10px] font-mono text-[#00DDFF] cursor-pointer"
                  title="Minimizar relojes"
                >
                  ▲
                </button>
                <span className="hidden sm:inline-block px-1.5 py-0.5 bg-[#00DDFF]/15 border border-[#00DDFF]/50 text-[9px] font-mono font-bold text-[#00DDFF] shrink-0">
                  EN VIVO
                </span>
              </div>

              {/* 4 Circular Radial SVG Countdown Clocks */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  {
                    label: 'DÍAS',
                    value: String(countdown.days).padStart(2, '0'),
                    color: '#00DDFF',
                    progress: Math.min(1, countdown.days / 120),
                    hz: 1.0,
                  },
                  {
                    label: 'HORAS',
                    value: String(countdown.hours).padStart(2, '0'),
                    color: '#FDCC0D',
                    progress: countdown.hours / 24,
                    hz: 1.25,
                  },
                  {
                    label: 'MIN',
                    value: String(countdown.minutes).padStart(2, '0'),
                    color: '#FFBB00',
                    progress: countdown.minutes / 60,
                    hz: 1.5,
                  },
                  {
                    label: 'SEG',
                    value: String(countdown.seconds).padStart(2, '0'),
                    color: '#B87000',
                    progress: countdown.seconds / 60,
                    hz: 1.75,
                  },
                ].map(dial => {
                  const circumference = 251.2;
                  const dashOffset = circumference - Math.max(0.05, dial.progress) * circumference;
                  return (
                    <button
                      key={dial.label}
                      type="button"
                      onClick={() => handlePlayHarmonicNote(dial.hz, dial.label)}
                      className="group relative flex flex-col items-center justify-center p-1.5 bg-[#050505]/90 hover:bg-[#32527B]/30 border border-[#32527B]/60 hover:border-[#FDCC0D] transition-all cursor-pointer hover:scale-105"
                      style={{
                        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                      }}
                      title={`Emitir pulso armónico 432Hz (${dial.label})`}
                    >
                      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="rgba(5, 5, 5, 0.85)"
                            stroke="rgba(50, 82, 123, 0.35)"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50"
                            cy="50"
                            r="40"
                            fill="transparent"
                            stroke={dial.color}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            strokeDashoffset={dashOffset}
                            style={{
                              filter: `drop-shadow(0 0 6px ${dial.color})`,
                              transition: 'stroke-dashoffset 0.4s ease-out',
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                          <span
                            className="text-xs sm:text-sm font-black font-mono tabular-nums tracking-tight text-white group-hover:scale-110 transition-transform"
                            style={{ textShadow: `0 0 10px ${dial.color}90` }}
                          >
                            {dial.value}
                          </span>
                          <span
                            className="text-[8px] font-['Orbitron',sans-serif] font-extrabold tracking-widest mt-0.5"
                            style={{ color: dial.color }}
                          >
                            {dial.label}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* 1-Click Trigger for Weekly Lore & Playable Time Capsules */}
              {onOpenTimeCapsules && (
                <button
                  type="button"
                  onClick={() => {
                    playUiChirp(820);
                    onOpenTimeCapsules();
                  }}
                  className="sgx-btn mt-2.5 w-full py-1.5 px-2.5 flex items-center justify-between gap-1.5 text-[11px]"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Cápsulas & Retos</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Lite Mode 2D Spatial Schematic (High Performance · Zero GPU Load) */}
        {liteMode && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 bg-[#050505] select-none pointer-events-auto">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#00DDFF]/30 animate-pulse" />
              <div className="absolute inset-6 rounded-full border border-dashed border-[#FDCC0D]/30" />
              <div className="absolute inset-14 rounded-full border border-[#32527B]/60" />

              <div
                onClick={() => {
                  playCyberBurstSound('quantum');
                  setCameraFocusedOnPillar(false);
                }}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#32527B] to-[#FDCC0D] border-2 border-white flex flex-col items-center justify-center cursor-pointer shadow-lg shadow-yellow-500/30 hover:scale-105 transition-transform z-20"
              >
                <img
                  src="https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png"
                  alt="SGX Core"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-contain"
                />
                <span className="text-[8px] font-mono font-bold text-black bg-white/90 px-1 mt-0.5">CORE</span>
              </div>

              {SGX_ORBITAL_PILLARS.map((p, idx) => {
                const angle = (idx / SGX_ORBITAL_PILLARS.length) * Math.PI * 2 - Math.PI / 2;
                const r = 112;
                const x = Math.cos(angle) * r;
                const y = Math.sin(angle) * r;
                const isSelected = p.id === activePillarId;

                return (
                  <button
                    key={p.id}
                    onClick={() => handleDockPillar(p.id, true)}
                    className={`absolute flex flex-col items-center justify-center transition-all cursor-pointer z-20 ${
                      isSelected ? 'scale-110 z-30' : 'hover:scale-105 opacity-85 hover:opacity-100'
                    }`}
                    style={{
                      transform: `translate(${x}px, ${y}px)`,
                    }}
                  >
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center border-2 bg-[#1A1A1A] shadow-md"
                      style={{
                        borderColor: p.colorHex,
                        boxShadow: isSelected ? `0 0 15px ${p.colorHex}` : undefined,
                      }}
                    >
                      <img src={p.iconUrl} alt={p.id} className="w-5 h-5 object-contain" />
                    </div>
                    <span
                      className="text-[9px] font-['Orbitron',sans-serif] font-bold mt-1 px-1.5 py-0.5 bg-[#050505] border whitespace-nowrap"
                      style={{ borderColor: p.colorHex, color: p.colorHex === '#32527B' ? '#00DDFF' : p.colorHex }}
                    >
                      {p.id}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 px-3.5 py-2 bg-[#1A1A1A] border border-[#FFBB00]/50 text-[#FFBB00] font-body text-xs flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#FFBB00] shrink-0" />
              <span>Modo Ligero Activo · Ahorro de GPU y Batería al 100% · Toca cualquier pilar para inspeccionar</span>
            </div>
          </div>
        )}

        {/* Floating XP / Telemetry Toast inside 3D Visor */}
        {floatingXpNotice && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 px-4 py-2 bg-[#1A1A1A]/95 border border-[#FDCC0D] text-[#FDCC0D] font-['Orbitron',sans-serif] text-xs font-bold shadow-lg pointer-events-none animate-bounce whitespace-nowrap">
            {floatingXpNotice}
          </div>
        )}

        {/* 6 Orbiting Semantic DOM Tags synchronized with the 3D .GLB Pillar Positions */}
        {!liteMode &&
          SGX_ORBITAL_PILLARS.map(pillar => {
            const isDocked = pillar.id === activePillarId;
            const tagColor = pillar.colorHex === '#32527B' ? '#00DDFF' : pillar.colorHex;
            return (
              <button
                key={pillar.id}
                ref={el => {
                  nodeMarkerRefs.current[pillar.id] = el;
                }}
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  handleDockPillar(pillar.id, true);
                }}
                className={`absolute left-0 top-0 pointer-events-auto cursor-pointer transition-shadow duration-200 px-2.5 py-1 backdrop-blur-md flex items-center gap-1.5 text-left ${
                  isDocked
                    ? 'bg-[#1A1A1A]/95 border-2 shadow-2xl'
                    : 'bg-[#050505]/75 hover:bg-[#1A1A1A]/95 border border-[#32527B]/70'
                }`}
                style={{
                  borderColor: isDocked ? tagColor : undefined,
                  boxShadow: isDocked ? `0 0 20px ${tagColor}70` : '0 4px 12px rgba(0,0,0,0.75)',
                  clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                }}
              >
                <img
                  src={pillar.iconUrl}
                  alt={pillar.code}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span
                  className="text-[11px] font-extrabold font-['Orbitron',sans-serif] tracking-wide whitespace-nowrap"
                  style={{ color: isDocked ? tagColor : '#FFFFFF' }}
                >
                  {pillar.code}
                </span>
              </button>
            );
          })}

        {/* ROOMY & COMFORTABLE INSPECTION MODAL/SHEET (Responsive: Fixed backdrop sheet on mobile, sleek right dock on desktop) */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-end md:static md:contents"
            onClick={() => setDrawerOpen(false)}
          >
            <aside
              data-holographic-drawer="true"
              onClick={e => e.stopPropagation()}
              className="relative w-full h-[90vh] max-h-[90vh] md:h-auto md:max-h-none md:absolute md:top-4 md:bottom-14 md:left-auto md:right-4 md:w-[490px] lg:w-[520px] bg-[#0c1018] border-t-4 md:border-2 border-[#FDCC0D] flex flex-col overflow-hidden shadow-[0_25px_80px_rgba(0,0,0,0.98)] pointer-events-auto transition-all duration-300"
              style={{
                borderColor: readableAccent,
                clipPath: typeof window !== 'undefined' && window.innerWidth >= 768
                  ? 'polygon(15px 0, 100% 0, 100% calc(100% - 15px), calc(100% - 15px) 100%, 0 100%, 0 15px)'
                  : undefined,
              }}
            >
              {/* Mobile Top Grabber & Quick Close Bar */}
              <div className="md:hidden flex items-center justify-between px-4 py-2.5 bg-[#050505] border-b border-[#32527B]/60 shrink-0">
                <span className="text-[11px] font-mono font-bold text-[#FDCC0D] uppercase tracking-wider">
                  MODAL DE INSPECCIÓN NÚCLEO 3D
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playUiChirp(680);
                    setDrawerOpen(false);
                  }}
                  className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#FDCC0D] hover:text-black border border-[#FDCC0D]/60 text-xs font-['Orbitron',sans-serif] font-bold text-[#FDCC0D] transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Volver al 3D</span>
                </button>
              </div>

              {/* Modal Header & Navigation Tabs */}
              <div className="p-3.5 sm:p-5 border-b border-[#32527B]/60 bg-[#050505]/95 space-y-3 shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 sm:w-11 sm:h-11 bg-[#1A1A1A] border flex items-center justify-center p-1.5 shrink-0"
                      style={{
                        borderColor: readableAccent,
                        clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                      }}
                    >
                      <img
                        src={activeNode.iconUrl}
                        alt={activeNode.code}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="text-[11px] font-mono font-bold uppercase tracking-wider"
                        style={{ color: readableAccent }}
                      >
                        ESTACIÓN ACOPLADA · {activeNode.code}
                      </div>
                      <h4
                        className="font-black text-white font-['Orbitron',sans-serif] truncate"
                        style={{ fontSize: 'clamp(1rem, 1.4vw, 1.25rem)' }}
                      >
                        {activeNode.title}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(640);
                      setDrawerOpen(false);
                    }}
                    className="hidden md:flex px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#FDCC0D] hover:text-[#050505] border border-[#32527B] text-xs font-['Orbitron',sans-serif] font-bold text-white transition-colors cursor-pointer shrink-0 items-center gap-1.5"
                    style={{
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    }}
                    title="Cerrar panel y despejar vista 3D"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cerrar</span>
                  </button>
                </div>

                {/* 3 Main Navigation Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#050505] border border-[#32527B]/60 font-['Orbitron',sans-serif] text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(680);
                      setActiveDrawerTab('MODULES');
                    }}
                    className={`py-2 px-1 font-bold transition-colors cursor-pointer text-center truncate ${
                      activeDrawerTab === 'MODULES'
                        ? 'bg-[#FDCC0D] text-[#050505]'
                        : 'text-slate-300 hover:text-white hover:bg-[#1A1A1A]'
                    }`}
                  >
                    Módulos ({activePillarModules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(760);
                      setActiveDrawerTab('SPONSORS');
                    }}
                    className={`py-2 px-1 font-bold transition-colors cursor-pointer text-center truncate ${
                      activeDrawerTab === 'SPONSORS'
                        ? 'bg-[#FFBB00] text-[#050505]'
                        : 'text-slate-300 hover:text-white hover:bg-[#1A1A1A]'
                    }`}
                  >
                    Sponsors 3D
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(760);
                      setActiveDrawerTab('INTERACTIVE_LAB');
                    }}
                    className={`py-2 px-1 font-bold transition-colors cursor-pointer text-center truncate ${
                      activeDrawerTab === 'INTERACTIVE_LAB'
                        ? 'bg-[#00DDFF] text-[#050505]'
                        : 'text-slate-300 hover:text-white hover:bg-[#1A1A1A]'
                    }`}
                  >
                    Lab 3D
                  </button>
                </div>
              </div>

              {/* Scrollable Content Body with Plenty of Reading Space (Space Grotesk Prose & High Contrast) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar bg-[#0D1017]">
                {/* TAB 1: MODULES & EXPERIENCES */}
                {activeDrawerTab === 'MODULES' &&
                  activePillarModules.map((mod, idx) => {
                    const ModIcon = mod.icon;
                    return (
                      <div
                        key={mod.id}
                        onClick={() => {
                          playUiChirp(780);
                          mod.onLaunch();
                        }}
                        className="w-full p-4 sm:p-4.5 bg-[#161B26] hover:bg-[#202738] border border-[#32527B]/80 hover:border-[#FDCC0D] text-left transition-all cursor-pointer group flex flex-col gap-3 shadow-lg"
                        style={{
                          clipPath:
                            'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                        }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-8 h-8 bg-[#050505] border flex items-center justify-center shrink-0"
                              style={{ borderColor: readableAccent }}
                            >
                              <ModIcon className="w-4 h-4" style={{ color: readableAccent }} />
                            </div>
                            <h5
                              className="font-extrabold text-white font-['Orbitron',sans-serif] group-hover:text-[#FDCC0D] leading-snug"
                              style={{ fontSize: 'clamp(0.95rem, 1.2vw, 1.08rem)' }}
                            >
                              0{idx + 1}. {mod.title}
                            </h5>
                          </div>
                          {mod.xpReward && (
                            <span
                              className="px-2.5 py-0.5 bg-[#050505] border font-mono font-bold tabular-nums shrink-0"
                              style={{
                                fontSize: 'clamp(0.75rem, 0.9vw, 0.85rem)',
                                color: readableAccent,
                                borderColor: `${readableAccent}60`,
                              }}
                            >
                              {mod.xpReward}
                            </span>
                          )}
                        </div>

                        <p
                          className="text-slate-100 font-body leading-relaxed text-sm sm:text-base"
                        >
                          {mod.description}
                        </p>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#32527B]/40">
                          <span className="text-xs font-mono text-slate-300 truncate">
                            {mod.subtitle}
                          </span>
                          <span className="sgx-btn px-3 py-1.5 text-xs flex items-center gap-1.5 shrink-0">
                            <span>{mod.actionLabel}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}

                {/* TAB 2: SPONSORS 3D ROTATING STATIONS */}
                {activeDrawerTab === 'SPONSORS' && (
                  <div className="space-y-4">
                    <div
                      className="p-4 bg-[#161B26] border border-[#FDCC0D] space-y-2 shadow-lg"
                      style={{
                        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[#FDCC0D] font-['Orbitron',sans-serif] font-bold text-xs sm:text-sm">
                        <span className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-[#FDCC0D]" />
                          <span>4 ÁREAS DE PATROCINIO 3D EN EL NÚCLEO</span>
                        </span>
                        <span className="font-mono text-xs text-[#00DDFF]">+25 XP / VISITA</span>
                      </div>
                      <p className="text-slate-200 font-body text-xs sm:text-sm leading-relaxed">
                        Toca cualquier monolito rotando en la arena 3D o pulsa <strong className="text-[#FDCC0D]">"Enfocar en 3D"</strong> para volar la cámara hacia esa estación de patrocinio oficial.
                      </p>
                    </div>

                    {/* The 4 Rotating 3D Sponsor Stations */}
                    <div className="space-y-3">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
                        Estaciones 3D Activas en el Espacio:
                      </div>

                      {SGX_3D_SPONSOR_STATIONS.map((station, sIdx) => {
                        const isFocused = focusedSponsorId === station.id;
                        return (
                          <div
                            key={station.id}
                            className={`p-4 bg-[#161B26] border transition-all space-y-2.5 ${
                              isFocused ? 'border-[#FDCC0D] shadow-[0_0_20px_rgba(253,204,13,0.3)]' : 'border-[#32527B] hover:border-slate-400'
                            }`}
                            style={{
                              clipPath:
                                'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase"
                                style={{
                                  backgroundColor: `${station.colorHex}18`,
                                  color: station.colorHex,
                                  border: `1px solid ${station.colorHex}60`,
                                }}
                              >
                                {station.tierLabel}
                              </span>
                              {isFocused && (
                                <span className="px-2 py-0.5 bg-[#FDCC0D] text-black font-['Orbitron',sans-serif] font-black text-[10px]">
                                  ENFOCADO EN 3D ⚡
                                </span>
                              )}
                            </div>

                            <div className="text-white font-extrabold text-base font-['Orbitron',sans-serif]">
                              0{sIdx + 1}. {station.name}
                            </div>

                            <p className="text-slate-200 font-body text-sm leading-relaxed">
                              {station.roleSubtitle}
                            </p>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#32527B]/40">
                              <button
                                type="button"
                                onClick={() => {
                                  setDrawerOpen(false);
                                  handleFocusSponsor(station.id);
                                }}
                                className="sgx-btn px-3 py-1.5 text-xs flex items-center gap-1.5 font-bold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Enfocar en Órbita 3D 🔭</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  playUiChirp(840);
                                  setFloatingXpNotice(`+25 XP · ESTACIÓN ${station.name.toUpperCase()} REGISTRADA`);
                                  setTimeout(() => setFloatingXpNotice(null), 2000);
                                  recordActivity('tour_complete', `Estación Sponsor 3D: ${station.name}`, station.tierLabel, 25);
                                }}
                                className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#00DDFF] hover:text-black border border-[#00DDFF]/60 text-xs font-mono text-[#00DDFF] font-bold cursor-pointer transition-colors"
                              >
                                +25 XP Descubrir
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Official Sponsorship Packages (Tiers 1–5) */}
                    <div className="space-y-3 pt-3 border-t border-[#32527B]/60">
                      <div className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider px-1">
                        Paquetes Oficiales de Alianza (Tiers 1 al 5):
                      </div>

                      {SPONSORSHIP_TIERS.map(tier => {
                        const tierColor =
                          tier.tierNumber === 1
                            ? '#00DDFF'
                            : tier.tierNumber === 2
                            ? '#FDCC0D'
                            : tier.tierNumber === 3
                            ? '#FFBB00'
                            : '#FDCC0D';

                        const primarySponsor = tier.sponsors && tier.sponsors[0];
                        const sponsorName = primarySponsor ? primarySponsor.name : `Tier ${tier.tierNumber} · ${tier.name}`;

                        return (
                          <div
                            key={tier.id}
                            className="p-4 bg-[#161B26] border border-[#32527B] hover:border-[#FDCC0D] space-y-2.5"
                            style={{
                              clipPath:
                                'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span
                                className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase"
                                style={{
                                  backgroundColor: `${tierColor}18`,
                                  color: tierColor,
                                  border: `1px solid ${tierColor}60`,
                                }}
                              >
                                TIER {tier.tierNumber} · {tier.priceRange}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  playUiChirp(840);
                                  setFloatingXpNotice(`+15 XP · BALIZA ${tier.name.toUpperCase()} ESCANEADA`);
                                  setTimeout(() => setFloatingXpNotice(null), 2000);
                                  recordActivity('tour_complete', `Baliza Sponsor: ${tier.name}`, tier.priceRange, 15);
                                }}
                                className="text-xs font-mono font-bold text-[#00DDFF] hover:text-[#FDCC0D] underline cursor-pointer"
                              >
                                Escanear (+15 XP)
                              </button>
                            </div>

                            <div className="text-white font-bold text-sm font-['Orbitron',sans-serif]">
                              {sponsorName}
                            </div>

                            <p className="text-slate-200 font-body text-xs sm:text-sm leading-relaxed">
                              {tier.keyBenefit}
                            </p>

                            <button
                              type="button"
                              onClick={() => {
                                playUiChirp(700);
                                window.dispatchEvent(new CustomEvent('sgx:open_sponsor_modal'));
                              }}
                              className="sgx-btn w-full py-2 text-xs flex items-center justify-center gap-1.5 font-bold"
                            >
                              <span>Ver Detalles Completos de Tier {tier.tierNumber}</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: INTERACTIVE 3D LAB */}
                {activeDrawerTab === 'INTERACTIVE_LAB' && (
                  <div className="space-y-4">
                    <div
                      className="p-4 bg-[#161B26] border border-[#32527B] space-y-2"
                      style={{
                        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[#00DDFF] font-['Orbitron',sans-serif] font-bold text-xs sm:text-sm">
                        <span className="flex items-center gap-2">
                          <Sliders className="w-4 h-4" />
                          <span>FIDELIDAD .GLB & SHADER 3D</span>
                        </span>
                        <span className="font-mono text-xs text-[#FDCC0D]">
                          {loadedModelsCount}/7 GLBs Activos
                        </span>
                      </div>
                      <p className="text-slate-200 font-body text-xs sm:text-sm leading-relaxed">
                        El domo volumétrico GLSL, las partículas cuánticas circulares y las 4 áreas de sponsors giran en tiempo real respetando los materiales nativos PBR de cada escultura <strong className="text-[#FDCC0D]">.glb</strong>.
                      </p>
                    </div>

                    {/* Live 432Hz Harmonic Synthesizer Pad */}
                    <div
                      className="p-4 bg-[#161B26] border border-[#32527B] space-y-3"
                      style={{
                        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                      }}
                    >
                      <div className="flex items-center justify-between text-[#FDCC0D] font-['Orbitron',sans-serif] font-bold text-xs sm:text-sm">
                        <span className="flex items-center gap-2">
                          <Volume2 className="w-4 h-4" />
                          <span>SINTETIZADOR ARMÓNICO 432Hz</span>
                        </span>
                        <span className="font-mono text-xs text-slate-300">Ondas 3D</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { mult: 0.5, label: '216Hz' },
                          { mult: 1.0, label: '432Hz' },
                          { mult: 1.25, label: '540Hz' },
                          { mult: 1.5, label: '648Hz' },
                        ].map(pad => (
                          <button
                            key={pad.label}
                            type="button"
                            onClick={() => handlePlayHarmonicNote(pad.mult, pad.label)}
                            className="sgx-btn py-2.5 text-xs font-bold"
                          >
                            {pad.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Orbital Velocity Overdrive Slider */}
                    <div
                      className="p-4 bg-[#161B26] border border-[#32527B] space-y-2.5"
                      style={{
                        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                      }}
                    >
                      <div className="flex items-center justify-between text-white font-['Orbitron',sans-serif] font-bold text-xs sm:text-sm">
                        <span>VELOCIDAD DE REACTOR ORBITAL</span>
                        <span className="font-mono text-[#00DDFF] tabular-nums">
                          {orbitSpeedMultiplier.toFixed(1)}x
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="3.5"
                        step="0.1"
                        value={orbitSpeedMultiplier}
                        onChange={e => setOrbitSpeedMultiplier(parseFloat(e.target.value))}
                        className="w-full accent-[#FDCC0D] cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Telemetry */}
              <div className="px-4 py-2.5 bg-[#050505] border-t border-[#32527B]/60 flex items-center justify-between text-xs font-mono text-slate-300 shrink-0">
                <span>
                  Orbes 3D: <strong className="text-[#FDCC0D] tabular-nums">{xpOrbsCollected}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playUiChirp(680);
                    setDrawerOpen(false);
                  }}
                  className="text-xs text-[#00DDFF] hover:text-[#FDCC0D] font-bold underline cursor-pointer"
                >
                  Volver al Visor 3D ✕
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Bottom Status Bar / Mobile Bottom Sheet Launcher inside 3D Viewport */}
        <div className="absolute bottom-2.5 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto text-xs font-mono text-slate-200">
          <div className="px-3 py-1.5 bg-[#050505]/85 backdrop-blur-md border border-[#32527B]/70 pointer-events-none hidden sm:block">
            Toca cualquier escultura <strong className="text-[#FDCC0D]">.GLB</strong> o los orbes en 3D · Arrastra para orbitar el espacio
          </div>

          {!drawerOpen && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                playUiChirp(760);
                setDrawerOpen(true);
              }}
              className="w-auto mx-auto sm:mx-0 px-3 py-1.5 bg-[#050505]/90 hover:bg-[#1A1A1A] border border-[#FDCC0D]/70 text-white font-bold flex items-center justify-between sm:justify-center gap-2 shadow-xl cursor-pointer transition-colors text-xs backdrop-blur-md"
              style={{
                borderColor: readableAccent,
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <span className="flex items-center gap-1.5">
                <img src={activeNode.iconUrl} alt={activeNode.code} className="w-3.5 h-3.5 object-contain" />
                <span className="font-['Orbitron',sans-serif] text-[11px]">
                  PANEL {activeNode.code} ({activePillarModules.length})
                </span>
              </span>
              <span className="px-1.5 py-0.5 bg-[#FDCC0D] text-[#050505] text-[9px] font-['Orbitron',sans-serif] font-extrabold">
                EXPLORAR ↑
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Direct 6-Pillar Quick Docking Strip (Bottom Bar — Sleek Horizontal Swipe Dock on Mobile, 6-Col Grid on Desktop) */}
      <div className="relative z-30 flex items-center gap-1.5 p-2 bg-[#050505] border-t border-[#32527B]/60 font-mono text-xs overflow-x-auto scroll-smooth no-scrollbar lg:grid lg:grid-cols-6">
        {SGX_ORBITAL_PILLARS.map((p, index) => {
          const isSelected = p.id === activePillarId;
          const pillAccent = p.colorHex === '#32527B' ? '#00DDFF' : p.colorHex;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleDockPillar(p.id, true)}
              className={`px-3 py-2 flex items-center justify-between gap-2 transition-all cursor-pointer border shrink-0 min-w-[138px] lg:min-w-0 ${
                isSelected
                  ? 'bg-[#1A1A1A] text-white font-bold shadow-md'
                  : 'bg-[#050505] text-slate-300 hover:text-white border-[#32527B]/50 hover:bg-[#1A1A1A]/70'
              }`}
              style={{
                borderColor: isSelected ? pillAccent : undefined,
                boxShadow: isSelected ? `0 0 16px ${pillAccent}35` : undefined,
                clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={p.iconUrl}
                  alt={p.code}
                  referrerPolicy="no-referrer"
                  className="w-4 h-4 object-contain shrink-0"
                />
                <span className="truncate whitespace-nowrap text-[11px] font-['Orbitron',sans-serif]">
                  0{index + 1}. {p.id}
                </span>
              </div>
              <span
                className="text-[10px] tabular-nums shrink-0"
                style={{ color: isSelected ? pillAccent : '#888888' }}
              >
                .GLB
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
