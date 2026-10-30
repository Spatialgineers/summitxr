import { pillarIcon } from '../../lib/sgxPillars';
import { SGX_YOUTUBE } from '../../lib/sgxLinks';
import { PILLAR_BY_KEY, type PillarKey, findPillar, bi } from '../../lib/sgxPillars';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VisitCounterChip } from './VisitCounterChip';
import { navigateToSection, navigateToPillar } from '../../immersion/navigation';
import { createPilotOrbit, type PilotCardInfo, type PilotOrbit } from '../../identity/pilotOrbit3D';
import { configFromSeed } from '../../identity/pilotAvatar';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import { renderPassCardImage } from '../../identity/passCardImage';
import { useChromaCheckins } from './visitRadarStore';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { DOME_ENERGY_FRAG, HOLO_PILLAR_FRAG, HOLO_PILLAR_VERT } from '../../immersion/shaders/effects';
import { fxPair } from '../../immersion/shaders/pillarFx';
import { createBeam, createCoreShell, createCorePost, createFloor } from '../../immersion/shaders/coreFx';
import {
  Pause,
  Play,
  Zap,
  Compass,
  Maximize2,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Eye,
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
import { SgxHeroOverlay } from './SgxHeroOverlay';
import { SgxClocksBanner } from './SgxClocksBanner';
import './sgx-kit.css';
import './SgxCoreDrawer.css';
import { explore, startCalm } from '../../immersion/calmMode';

export type SgxCorePillarId = 'STORY' | 'SHOWCASE' | 'SPARK' | 'STAGE' | 'SYSTEM' | 'SYNTHESIZE';

export interface SgxOrbitalPillarNode {
  id: SgxCorePillarId;
  code: string;
  title: string;
  shortRole: string;
  titleEn?: string;
  physicsLabelEn?: string;
  colorHex: string;
  threeColor: number;
  iconUrl: string;
  glbUrl: string;
  moduleCount: number;
  physicsLabel: string;
}

export const SGX_CORE_LOGO_GLB_URL = 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb';
const SGX_GUILD_GLB_URL = 'https://cdn.spatialgineers.com/3D%20Branding/Sgxgs%201.glb';
const GUILD_EGG_KEY = 'sgx_guild_egg_v1';
const CORE_INTRO_KEY = 'sgx_core_intro_v1';

// Official v2026.10 Pillar Order: 1. Story, 2. Showcase, 3. Spark, 4. Stage, 5. System, 6. Synthesize
// Official v2026.10 Palette: #32527B, #FDCC0D, #B87000, #00DDFF, #FFBB00
// Module list per pillar comes from the single source (lib/sgxPillars), so the
// core never lists a module under the wrong pillar.
function pillarModulesLine(key: PillarKey): string {
  return PILLAR_BY_KEY[key].modules.map((m) => m.label.es).join(' • ');
}

export const SGX_ORBITAL_PILLARS: SgxOrbitalPillarNode[] = [
  {
    id: 'STORY',
    code: 'SGX.STORY',
    title: 'Historias que mueven ideas',
    titleEn: 'Stories that move ideas',
    shortRole: pillarModulesLine('STORY'),
    colorHex: PILLAR_BY_KEY['STORY'].color,
    threeColor: parseInt(PILLAR_BY_KEY['STORY'].color.slice(1), 16),
    iconUrl: pillarIcon('STORY'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Story%20opt.glb',
    moduleCount: PILLAR_BY_KEY['STORY'].modules.length,
    physicsLabel: 'Pilar 01 • Brasas Ascendentes 432Hz',
    physicsLabelEn: 'Pillar 01 • Rising Embers 432Hz',
  },
  {
    id: 'SHOWCASE',
    code: 'SGX.SHOWCASE',
    title: 'Visuales que comunican innovación',
    titleEn: 'Visuals that communicate innovation',
    shortRole: pillarModulesLine('SHOWCASE'),
    colorHex: PILLAR_BY_KEY['SHOWCASE'].color,
    threeColor: parseInt(PILLAR_BY_KEY['SHOWCASE'].color.slice(1), 16),
    iconUrl: pillarIcon('SHOWCASE'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Showcase%20opt.glb',
    moduleCount: PILLAR_BY_KEY['SHOWCASE'].modules.length,
    physicsLabel: 'Pilar 02 • Galería Holográfica Cian',
    physicsLabelEn: 'Pillar 02 • Cyan Holographic Gallery',
  },
  {
    id: 'SPARK',
    code: 'SGX.SPARK',
    title: 'Experiencias que activan la conexión',
    titleEn: 'Experiences that spark connection',
    shortRole: pillarModulesLine('SPARK'),
    colorHex: PILLAR_BY_KEY['SPARK'].color,
    threeColor: parseInt(PILLAR_BY_KEY['SPARK'].color.slice(1), 16),
    iconUrl: pillarIcon('SPARK'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Spark%20Opt.glb',
    moduleCount: PILLAR_BY_KEY['SPARK'].modules.length,
    physicsLabel: 'Pilar 03 • Vórtice Cinético Ignis',
    physicsLabelEn: 'Pillar 03 • Ignis Kinetic Vortex',
  },
  {
    id: 'STAGE',
    code: 'SGX.STAGE',
    title: 'Creatividad en tiempo real',
    titleEn: 'Creativity in real time',
    shortRole: pillarModulesLine('STAGE'),
    colorHex: PILLAR_BY_KEY['STAGE'].color,
    threeColor: parseInt(PILLAR_BY_KEY['STAGE'].color.slice(1), 16),
    iconUrl: pillarIcon('STAGE'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Stage%20opt.glb',
    moduleCount: PILLAR_BY_KEY['STAGE'].modules.length,
    physicsLabel: 'Pilar 04 • Ondas Acústicas en Vivo',
    physicsLabelEn: 'Pillar 04 • Live Acoustic Waves',
  },
  {
    id: 'SYSTEM',
    code: 'SGX.SYSTEM',
    title: 'Tecnología que soluciona',
    titleEn: 'Technology that solves',
    shortRole: pillarModulesLine('SYSTEM'),
    colorHex: PILLAR_BY_KEY['SYSTEM'].color,
    threeColor: parseInt(PILLAR_BY_KEY['SYSTEM'].color.slice(1), 16),
    iconUrl: pillarIcon('SYSTEM'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/System%20opt.glb',
    moduleCount: PILLAR_BY_KEY['SYSTEM'].modules.length,
    physicsLabel: 'Pilar 05 • Retícula Cuántica Cloud',
    physicsLabelEn: 'Pillar 05 • Cloud Quantum Grid',
  },
  {
    id: 'SYNTHESIZE',
    code: 'SGX.SYNTHESIZE',
    title: 'Innovación que une disciplinas',
    titleEn: 'Innovation that unites disciplines',
    shortRole: pillarModulesLine('SYNTHESIZE'),
    colorHex: PILLAR_BY_KEY['SYNTHESIZE'].color,
    threeColor: parseInt(PILLAR_BY_KEY['SYNTHESIZE'].color.slice(1), 16),
    iconUrl: pillarIcon('SYNTHESIZE'),
    glbUrl: 'https://cdn.spatialgineers.com/3D%20Branding/Pilares/Opt/Synthesize%20opt.glb',
    moduleCount: PILLAR_BY_KEY['SYNTHESIZE'].modules.length,
    physicsLabel: 'Pilar 06 • Convergencia Armónica SGX',
    physicsLabelEn: 'Pillar 06 • SGX Harmonic Convergence',
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
  /** Nothing picked yet: no pillar is highlighted, labeled or docked. */
  noSelection?: boolean;
  onSelectPillar: (pillarId: SgxCorePillarId) => void;
  activePillarModules?: HolographicDrawerModule[];
  onQuickLaunchPrimaryModule?: (pillarId: SgxCorePillarId) => void;
  onSelectSection?: (section: any) => void;
  onOpenTickets?: () => void;
  onOpenCredential?: () => void;
  onOpen360Tour?: () => void;
}

export interface SgxSponsorStationData {
  id: string;
  tierId: string;
  name: string;
  nameEn?: string;
  tierLabel: string;
  tierLabelEn?: string;
  tierNumber: number;
  roleSubtitle: string;
  roleSubtitleEn?: string;
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
    tierLabel: 'TIER 5 · SEDE DEL DÍA 3',
    tierLabelEn: 'TIER 5 · DAY 3 VENUE',
    tierNumber: 5,
    roleSubtitle: 'San Juan · SGX Showcase',
    colorHex: '#FDCC0D',
    threeColor: 0xFDCC0D,
    angle: Math.PI * 0.22,
    radius: 94,
    yPos: 5,
    websiteUrl: '',
  },
  {
    id: 'roblox',
    tierId: 'tier_4',
    name: 'Tu marca aquí',
    nameEn: 'Your brand here',
    tierLabel: 'TIER 4 · SIGNATURE EXPERIENCE',
    tierNumber: 4,
    roleSubtitle: '"Experience by [Marca]" · 3 cupos',
    roleSubtitleEn: '"Experience by [Brand]" · 3 slots',
    colorHex: '#00DDFF',
    threeColor: 0x00DDFF,
    angle: Math.PI * 0.72,
    radius: 94,
    yPos: -6,
    websiteUrl: 'https://summit.spatialgineers.com',
  },
  {
    id: 'losmismos',
    tierId: 'media_partner',
    name: 'Los Mismos TV',
    tierLabel: 'ALIADO DE TRANSMISIÓN',
    tierLabelEn: 'BROADCAST PARTNER',
    tierNumber: 0,
    roleSubtitle: 'Transmite el Summit junto a nosotros',
    roleSubtitleEn: 'Streams the Summit alongside us',
    colorHex: '#FFBB00',
    threeColor: 0xFFBB00,
    angle: Math.PI * 1.22,
    radius: 94,
    yPos: 6,
    websiteUrl: '',
  },
  {
    id: 'sgxaudio',
    tierId: 'tier_3',
    name: 'Tu marca aquí',
    nameEn: 'Your brand here',
    tierLabel: 'TIER 3 · EXPERIENCE',
    tierNumber: 3,
    roleSubtitle: '"[Pilar] powered by [Marca]" · 6 cupos',
    roleSubtitleEn: '"[Pillar] powered by [Brand]" · 6 slots',
    colorHex: '#B87000',
    threeColor: 0xB87000,
    angle: Math.PI * 1.72,
    radius: 94,
    yPos: -5,
    websiteUrl: 'https://summit.spatialgineers.com',
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
  colorHex: string, lang: string = 'es'): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Obsidian glass gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 512, 256);
    bgGrad.addColorStop(0, '#111111');
    bgGrad.addColorStop(1, '#080808');
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
    ctx.fillText(lang === 'es' ? '▲ ESTACIÓN DE PATROCINIO 3D · TOCAR PARA ACTIVAR' : '▲ 3D SPONSOR STATION · TAP TO ACTIVATE', 24, 202);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '11px "Orbitron", sans-serif';
    ctx.fillText(lang === 'es' ? 'SPATIALGINEERS SUMMIT 2026 · ÁREA OFICIAL' : 'SPATIALGINEERS SUMMIT 2026 · OFFICIAL AREA', 24, 228);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Dome: the energy field (domain-warped smoke in the active pillar's colors, see immersion/shaders/effects.ts)
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


export const SgxOrbitalCore3D: React.FC<SgxOrbitalCore3DProps> = ({
  activePillarId,
  noSelection = false,
  onSelectPillar,
  activePillarModules = [],
  onSelectSection,
  onOpenTickets,
  onOpenCredential,
  onOpen360Tour,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const viewportRef = useRef<HTMLDivElement>(null);
  const nodeMarkerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const { recordActivity, liteMode, setLiteMode } = usePilotProfile();

  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [cameraFocusedOnPillar, setCameraFocusedOnPillar] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
  const drawerOpenRef = useRef(false);
  drawerOpenRef.current = drawerOpen;
  const drawerRef = useRef<HTMLElement>(null);
  const isPhoneDrawer = typeof window !== 'undefined' && window.innerWidth < 768;
  // Pillar panel: focus moves in when it opens, Escape closes it, focus returns where it was.
  useEffect(() => {
    if (!drawerOpen) return;
    const before = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => drawerRef.current?.querySelector<HTMLElement>('button')?.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setDrawerOpen(false); } };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, [drawerOpen]);
  const [zenImmersionMode, setZenImmersionMode] = useState<boolean>(false);
  const [optionsMenuOpen, setOptionsMenuOpen] = useState<boolean>(false);
  const [orbitSpeedMultiplier, setOrbitSpeedMultiplier] = useState<number>(1.0);
  const [loadedModelsCount, setLoadedModelsCount] = useState<number>(0);
  const [xpOrbsCollected, setXpOrbsCollected] = useState<number>(0);
  const [floatingXpNotice, setFloatingXpNotice] = useState<string | null>(null);
  const [focusedSponsorId, setFocusedSponsorId] = useState<string | null>(null);
  const sponsorMarkerRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // Live 4-Clock Circular Countdown State (Target: Dec 11, 2026 10:00 AM AST per Run of Show v2026.10)
  const [countdown, setCountdown] = useState(() => {
    const diff = Math.max(0, new Date('2026-12-11T10:00:00-04:00').getTime() - Date.now());
    return { days: Math.floor(diff / 86400000), hours: Math.floor((diff % 86400000) / 3600000), minutes: Math.floor((diff % 3600000) / 60000), seconds: Math.floor((diff % 60000) / 1000) };
  });
  // First screen: the hero over the core; the HUD comes in on the first interaction.
  useLayoutEffect(() => startCalm(), []);

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
  const noSelectionRef = useRef(noSelection);
  noSelectionRef.current = noSelection;

  // Piloto en órbita: your Holo Card / SGX Pass flies around the core, and
  // Day 3 check-ins at Chroma join the orbit.
  const sgxId = useOptionalSgxIdentity();
  const checkins = useChromaCheckins();
  const pilotOrbitRef = useRef<PilotOrbit | null>(null);
  // The orbit card is the pass itself (same drawing as the Holo Card), or the last exported Holo Card.
  const [passImage, setPassImage] = useState<string | null>(null);
  const idForCard = sgxId?.identity;
  const passCardKey = idForCard?.pass ? [idForCard.pass.code, idForCard.pass.fullName, idForCard.callsign, idForCard.affinity, idForCard.avatar.png?.length || 0, JSON.stringify(idForCard.avatar.pilot || idForCard.avatar.seed), Object.keys(idForCard.stamps).length, language].join('|') : '';
  useEffect(() => {
    if (!passCardKey || !idForCard) { setPassImage(null); return; }
    let alive = true;
    renderPassCardImage(idForCard, { es: language === 'es' }).then((img) => { if (alive) setPassImage(img); }).catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [passCardKey]);
  const pilotInfo: PilotCardInfo = {
    forged: !!sgxId?.isForged,
    image: sgxId?.identity.holo?.image || passImage,
    name: sgxId?.identity.pass?.fullName,
    callsign: sgxId?.identity.callsign,
    serial: sgxId?.identity.pass?.serial,
    accent: sgxId?.identity.affinity ? PILLAR_ACCENT[sgxId.identity.affinity] : '#FDCC0D',
  };
  const pilotInfoRef = useRef(pilotInfo);
  pilotInfoRef.current = pilotInfo;
  const crowdRef = useRef(0);
  crowdRef.current = checkins?.length || 0;
  const pilotKey = `${pilotInfo.forged}|${pilotInfo.image?.length || 0}|${pilotInfo.name}|${pilotInfo.callsign}|${pilotInfo.accent}`;
  useEffect(() => { pilotOrbitRef.current?.setCard(pilotInfoRef.current); }, [pilotKey]);
  useEffect(() => { pilotOrbitRef.current?.setCrowd(crowdRef.current); }, [checkins?.length]);
  // The 3D avatar flies with the card once the visitor has a pass.
  const avatarCfg = sgxId?.isForged ? (sgxId.identity.avatar.pilot || configFromSeed(sgxId.identity.avatar.seed, pilotInfo.accent || '#FDCC0D')) : null;
  const avatarCfgRef = useRef(avatarCfg);
  avatarCfgRef.current = avatarCfg;
  const avatarCfgKey = avatarCfg ? JSON.stringify(avatarCfg) : '';
  useEffect(() => { pilotOrbitRef.current?.setAvatar(avatarCfgRef.current); }, [avatarCfgKey]);
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
      renderer.toneMappingExposure = 1.0;
      container.appendChild(renderer.domElement);
    } catch (e) {
      console.warn('WebGL unavailable for SgxOrbitalCore3D:', e);
      return;
    }

    // 1. TRUE 3D VOLUMETRIC SPATIAL SHADER DOME (Replaces flat CSS gradient)
    const domeGeo = new THREE.SphereGeometry(340, 48, 32);
    const initialPillar = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarRef.current) || SGX_ORBITAL_PILLARS[0];
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
    const [initA, initB] = fxPair(initialPillar.id);
    const drawSize = renderer.getDrawingBufferSize(new THREE.Vector2());
    // Bloom + grade + adaptive quality. Custom shaders then output linear color (SGX_LINEAR).
    const post = createCorePost(renderer, scene, camera, width, height, { coarse: coarsePointer, reduceMotion });
    const linear = !!post;
    const linDefine = linear ? { SGX_LINEAR: 1 } : {};
    const domeUniforms = {
      uTime: { value: 0 },
      uPulse: { value: 0 },
      uColorA: { value: new THREE.Vector3(...initA) },
      uColorB: { value: new THREE.Vector3(...initB) },
      uRes: { value: new THREE.Vector2(drawSize.x, drawSize.y) },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uDrift: { value: 0 },
      uMotion: { value: reduceMotion ? 0 : 1 },
      uGain: { value: 0.85 },
    };
    const domeMat = new THREE.ShaderMaterial({
      vertexShader: VOLUMETRIC_DOME_VERTEX_SHADER,
      fragmentShader: DOME_ENERGY_FRAG,
      defines: { ...(coarsePointer ? { SGX_LITE: 1 } : {}), ...linDefine },
      uniforms: domeUniforms,
      side: THREE.BackSide,
      depthWrite: false,
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    scene.add(domeMesh);

    // Holographic pillar: one additive overlay material, shown only on the active pillar's .glb meshes.
    const holoUniforms = {
      uTime: { value: 0 },
      uGlitch: { value: 0 },
      uHolo: { value: 0 },
      uScan: { value: 0 },
      uColorA: { value: new THREE.Vector3(...initA) },
      uColorB: { value: new THREE.Vector3(...initB) },
    };
    const holoMat = new THREE.ShaderMaterial({
      vertexShader: HOLO_PILLAR_VERT,
      fragmentShader: HOLO_PILLAR_FRAG,
      defines: linDefine,
      uniforms: holoUniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthFunc: THREE.LessEqualDepth,
    });
    let holoPillarId: SgxCorePillarId | null = null;

    // 2. 3D ARCHITECTURAL CYBER FLOOR & CEILING HORIZON RINGS (True 3D Perspective Depth)
    const environmentArchitectureGroup = new THREE.Group();
    scene.add(environmentArchitectureGroup);

    // Shader floor (pillar colors, ripples on dock and XP) and a faint ceiling grid.
    const floorFx = createFloor(domeUniforms.uColorA, domeUniforms.uColorB, -34, 1, linear);
    scene.add(floorFx.mesh);
    const ceilingFx = createFloor(domeUniforms.uColorA, domeUniforms.uColorB, 54, 0.12, linear);
    scene.add(ceilingFx.mesh);
    const onXpRipple = () => floorFx.ripple(0, 0, 0.8);
    window.addEventListener('sgx:xp_sparks', onXpRipple);

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
      size: 1.7,
      map: circleParticleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
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
      size: 2.0,
      map: circleParticleTexture,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const innerSwarmPoints = new THREE.Points(innerSwarmGeo, innerSwarmMat);
    scene.add(innerSwarmPoints);

    // 4. Pure Neutral White Studio Lighting so GLB models preserve 100% of their original native colors & materials
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 0.9);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xFFF9E2, 0x1A2233, 1.1);
    hemiLight.position.set(0, 90, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xFFFFFF, 2.6);
    keyLight.position.set(55, 85, 80);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xFFFFFF, 1.1);
    fillLight.position.set(-70, 30, 60);
    scene.add(fillLight);

    const backRimLight = new THREE.DirectionalLight(0x9FEFFF, 1.8);
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
      opacity: 0.035,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const centralColumnMesh = new THREE.Mesh(centralColumnGeo, centralColumnMat);
    centralColumnMesh.position.y = -12;

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

    // Energy shell around the SGX core (fresnel rim + flowing plasma bands).
    const coreShell = createCoreShell(17.5, domeUniforms.uColorA, linear);
    scene.add(coreShell.mesh);

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

    // Easter egg: the SGX Guild logo on a slow, high orbit. First click is worth XP.
    const guildEgg = new THREE.Group();
    guildEgg.userData = { type: 'GUILD_EGG' };
    scene.add(guildEgg);
    const attachGuild = (raw: THREE.Group) => guildEgg.add(normalizeGlbScene(raw, 9));
    if (glbTemplateCache.has(SGX_GUILD_GLB_URL)) attachGuild(glbTemplateCache.get(SGX_GUILD_GLB_URL)!);
    else gltfLoader.load(SGX_GUILD_GLB_URL, (g) => { glbTemplateCache.set(SGX_GUILD_GLB_URL, g.scene); attachGuild(g.scene); }, undefined, () => {});

    // Gyroscopic Energy Rings around the SGX Logo Core (Official SGX Gold #FDCC0D & SGX Blue #32527B)
    const ringGeo1 = new THREE.TorusGeometry(20, 0.3, 16, 96);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0xFDCC0D,
      transparent: true,
      opacity: 0.72,
    });
    const gyroRing1 = new THREE.Mesh(ringGeo1, ringMat1);

    const ringGeo2 = new THREE.TorusGeometry(24, 0.24, 16, 96);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x32527B,
      transparent: true,
      opacity: 0.65,
    });
    const gyroRing2 = new THREE.Mesh(ringGeo2, ringMat2);
    gyroRing2.rotation.x = Math.PI / 3;

    // Pillars orbit at ORBIT_RADIUS (no drawn track: they stand on their own podiums).
    const ORBIT_RADIUS = 68;

    // Orbiting 6 Pillars Group
    const pillarsOrbitGroup = new THREE.Group();
    scene.add(pillarsOrbitGroup);

    const pillarMeshes: {
      id: SgxCorePillarId;
      colorHex: number;
      group: THREE.Group;
      modelContainer: THREE.Group;
      fallbackMesh: THREE.Mesh;
      holoMeshes: THREE.Mesh[];
      podiumGlow: THREE.MeshBasicMaterial;
      podiumRim: THREE.MeshBasicMaterial;
      beamLine: THREE.Mesh;
      baseAngle: number;
    }[] = [];

    const nodeSphereGeo = new THREE.OctahedronGeometry(5.5, 1);
    // Podium under each pillar: a dark hex plinth, a lit rim in the pillar color and a glow pad.
    const podiumBaseGeo = new THREE.CylinderGeometry(7.4, 8.8, 2.4, 6);
    const podiumTopGeo = new THREE.CylinderGeometry(6.4, 7.1, 0.7, 6);
    const podiumRimGeo = new THREE.CylinderGeometry(7.18, 7.18, 0.32, 6, 1, true);
    const podiumPadGeo = new THREE.CircleGeometry(5.4, 6);
    const podiumBaseMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.85, roughness: 0.38, flatShading: true });
    const podiumTopMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.6, roughness: 0.55, flatShading: true });
    // Just under the pillar's feet at its largest (docked) scale; it floats with the pillar.
    const PODIUM_Y = -12.8;

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

      // The loading crystal gets the hologram too (it hides with its parent once the .glb arrives).
      const fallbackHolo = new THREE.Mesh(nodeSphereGeo, holoMat);
      fallbackHolo.visible = false;
      fallbackHolo.renderOrder = 2;
      fallbackMesh.add(fallbackHolo);
      const holoMeshes: THREE.Mesh[] = [fallbackHolo];
      const attachPillarGlb = (rawScene: THREE.Group) => {
        const normalized = normalizeGlbScene(rawScene, 15.0);
        fallbackMesh.visible = false;
        modelContainer.add(normalized);
        const meshes: THREE.Mesh[] = [];
        normalized.traverse((o) => { if ((o as THREE.Mesh).isMesh && !(o as THREE.SkinnedMesh).isSkinnedMesh) meshes.push(o as THREE.Mesh); });
        meshes.forEach((m) => {
          const overlay = new THREE.Mesh(m.geometry, holoMat);
          overlay.visible = false;
          overlay.renderOrder = 2;
          m.add(overlay);
          holoMeshes.push(overlay);
        });
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

      const podium = new THREE.Group();
      podium.position.y = PODIUM_Y;
      podium.rotation.y = Math.PI / 6;
      podium.add(new THREE.Mesh(podiumBaseGeo, podiumBaseMat));
      const top = new THREE.Mesh(podiumTopGeo, podiumTopMat);
      top.position.y = 1.55;
      podium.add(top);
      const podiumRim = new THREE.MeshBasicMaterial({ color: p.threeColor, transparent: true, opacity: 0.55 });
      const rim = new THREE.Mesh(podiumRimGeo, podiumRim);
      rim.position.y = 0.9;
      podium.add(rim);
      const podiumGlow = new THREE.MeshBasicMaterial({ color: p.threeColor, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
      const pad = new THREE.Mesh(podiumPadGeo, podiumGlow);
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 1.95;
      podium.add(pad);
      pGroup.add(podium);

      // Energy Beam connecting Central SGX Logo to this Pillar GLB
      const beam = createBeam(new THREE.Vector3(0, 0, 0), new THREE.Vector3(x, 0, z), p.threeColor, linear);
      const beamLine = beam.mesh;
      pillarsOrbitGroup.add(beamLine);

      pillarsOrbitGroup.add(pGroup);
      pillarMeshes.push({
        id: p.id,
        colorHex: p.threeColor,
        group: pGroup,
        modelContainer,
        fallbackMesh,
        holoMeshes,
        podiumGlow,
        podiumRim,
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
    // (no rail: the old orbit rings read as clutter)

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

      // Floating upper halo ring
      const haloGeo = new THREE.TorusGeometry(12.5, 0.22, 16, 48);
      const haloMat = new THREE.MeshBasicMaterial({
        color: s.threeColor,
        transparent: true,
        opacity: 0.45,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.rotation.x = Math.PI / 4;

      // Rotating Billboard Assembly
      const billboardPivot = new THREE.Group();
      const billboardTexture = createSponsorBillboardTexture(
        loc(s, 'name', language),
        loc(s, 'tierLabel', language),
        loc(s, 'roleSubtitle', language),
        s.colorHex,
        language
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
        opacity: 1,
      });
      // Clean glass on the sponsor screens: just a cyan edge glow (scan and glitch stay on the selected pillar).
      faceMat.onBeforeCompile = (shader) => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          `#include <dithering_fragment>
          vec2 sgxE = min(vMapUv, 1.0 - vMapUv);
          float sgxEdge = exp(-min(sgxE.x, sgxE.y) * 48.0);
          gl_FragColor.rgb = gl_FragColor.rgb + vec3(0.0, 0.5, 0.7) * sgxEdge * 0.3;
          gl_FragColor.a *= 0.97;`
        );
      };
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
    const pilotOrbit = createPilotOrbit(scene);
    pilotOrbitRef.current = pilotOrbit;
    pilotOrbit.setCard(pilotInfoRef.current);
    pilotOrbit.setCrowd(crowdRef.current);
    pilotOrbit.setAvatar(avatarCfgRef.current);

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
          setFloatingXpNotice((es ? '+25 XP • ORBE CUÁNTICO RECOLECTADO' : '+25 XP • QUANTUM ORB COLLECTED'));
          setTimeout(() => setFloatingXpNotice(null), 2200);
          recordActivity('easter_egg', 'Orbe Cuántico 3D Recolectado', 'Núcleo SGX', 25);
          return;
        }
      }

      // 1b. Your own card in orbit opens your Studio (or the Forge).
      if (pilotOrbit.hit(raycaster)) {
        const wp = pilotOrbit.worldPosition(new THREE.Vector3());
        spawnShockwave(wp, 0xFDCC0D);
        playScanSuccessSound();
        window.dispatchEvent(new CustomEvent(pilotInfoRef.current.forged ? 'sgx:open_hangar' : 'sgx:open_forge', { detail: { tab: 'pass' } }));
        return;
      }

      // 2. Check 3D Sponsor Stations
      for (const sm of sponsorStationMeshes) {
        const hits = raycaster.intersectObject(sm.group, true);
        if (hits.length > 0) {
          const worldPos = new THREE.Vector3();
          sm.group.getWorldPosition(worldPos);
          spawnShockwave(worldPos, sm.threeColor);
          playScanSuccessSound();
          setFloatingXpNotice((es ? `+25 XP • ESTACIÓN 3D: ${sm.name.toUpperCase()}` : `+25 XP • 3D STATION: ${sm.name.toUpperCase()}`));
          setTimeout(() => setFloatingXpNotice(null), 2400);
          recordActivity('tour_complete', `Estación Sponsor 3D: ${sm.name}`, sm.tierLabel, 25);
          setFocusedSponsorId(sm.id);
          setCameraFocusedOnPillar(false);
          setAutoRotate(false);
          return;
        }
      }

      // 2b. SGX Guild easter egg
      if (guildEgg.children.length && raycaster.intersectObject(guildEgg, true).length > 0) {
        const wp = guildEgg.getWorldPosition(new THREE.Vector3());
        spawnShockwave(wp, 0xFDCC0D);
        playScanSuccessSound();
        let first = false;
        try { first = !localStorage.getItem(GUILD_EGG_KEY); localStorage.setItem(GUILD_EGG_KEY, '1'); } catch { /* ignore */ }
        if (first) {
          recordActivity('easter_egg', 'Logo del SGX Guild encontrado', 'Núcleo SGX', 50);
          setFloatingXpNotice(es ? '+50 XP • ENCONTRASTE EL SGX GUILD' : '+50 XP • YOU FOUND THE SGX GUILD');
        } else {
          setFloatingXpNotice(es ? 'SGX GUILD · YA LO ENCONTRASTE' : 'SGX GUILD · ALREADY FOUND');
        }
        setTimeout(() => setFloatingXpNotice(null), 2600);
        return;
      }

      // 3. Check Pillar GLB Groups
      for (const pm of pillarMeshes) {
        const hits = raycaster.intersectObject(pm.group, true);
        if (hits.length > 0) {
          const worldPos = new THREE.Vector3();
          pm.group.getWorldPosition(worldPos);
          spawnShockwave(worldPos, pm.colorHex);
          floorFx.ripple(worldPos.x, worldPos.z, 1.2);
          setAutoRotate(false);
          setFocusedSponsorId(null);
          setCameraFocusedOnPillar(true);
          explore();
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
      post?.setSize(w, h);
      renderer.getDrawingBufferSize(domeUniforms.uRes.value);
    };
    window.addEventListener('resize', handleResize);

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(container);

    // Intro flythrough: once per session, from deep space to the core, after the splash is gone.
    const introFrom = new THREE.Vector3(0, 230, 660);
    let introOn = (() => { try { return !reduceMotion && !sessionStorage.getItem(CORE_INTRO_KEY); } catch { return false; } })();
    let introT0 = -1;
    if (introOn) camera.position.copy(introFrom);
    const skipIntro = () => { introOn = false; };
    container.addEventListener('pointerdown', skipIntro);

    // Main Animation Loop
    let reqId: number | null = null;
    const timer = typeof (THREE as any).Timer === 'function' ? new (THREE as any).Timer() : null;
    let lastTime = performance.now();
    let accumulatedElapsed = 0;
    const tempVec = new THREE.Vector3();
    // Floating panels that can hide a pillar label behind them.
    const occluders: THREE.Object3D[] = sponsorStationMeshes.map((sm) => sm.billboardMesh);
    const occlusionRay = new THREE.Raycaster();
    const occlusionTarget = new THREE.Vector3();
    const occlusionDir = new THREE.Vector3();
    const fxTargetA = new THREE.Vector3();
    const fxTargetB = new THREE.Vector3();
    const fxMouse = new THREE.Vector2();

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
      const [fxA, fxB] = fxPair(activePillarRef.current);
      const pp = pointerParallaxRef.current;
      domeUniforms.uMouse.value.lerp(fxMouse.set(pp.x * 0.5 + 0.5, pp.y * 0.5 + 0.5), 0.08);
      domeUniforms.uDrift.value = currentOrbitAngleRef.current * 0.35;
      if (renderer) renderer.getDrawingBufferSize(domeUniforms.uRes.value);
      floorFx.update(elapsed);
      ceilingFx.update(elapsed);
      coreShell.uniforms.uTime.value = elapsed;
      coreShell.uniforms.uPulse.value = surge;
      coreShell.mesh.scale.setScalar(1 + surge * 0.18 + Math.sin(elapsed * 2.4) * 0.025);

      // Holographic active pillar: rim only while it orbits, full hologram once docked.
      if (holoPillarId !== activePillarRef.current) {
        holoPillarId = activePillarRef.current;
        holoUniforms.uHolo.value = 0;
        holoUniforms.uColorA.value.set(...fxA);
        holoUniforms.uColorB.value.set(...fxB);
      }
      const docked = cameraFocusedRef.current && !noSelectionRef.current;
      holoUniforms.uTime.value = elapsed;
      holoUniforms.uHolo.value += ((docked ? 1 : 0.55) - holoUniforms.uHolo.value) * 0.08;
      holoUniforms.uScan.value = docked && !reduceMotion ? 1 : 0;
      holoUniforms.uGlitch.value = docked && !reduceMotion ? 1 : 0;

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
      let frontId: SgxCorePillarId = activePillarRef.current;
      let frontZ = -Infinity;

      // Update each Pillar GLB satellite & 2D projected HUD tag
      pillarMeshes.forEach((pm, idx) => {
        const isActive = !noSelectionRef.current && pm.id === activePillarRef.current;
        for (const hm of pm.holoMeshes) hm.visible = isActive;
        const targetScale = isActive ? 1.42 + surge * 0.22 : 0.95;
        pm.modelContainer.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

        pm.group.position.y = Math.sin(elapsed * 2.0 + idx) * 2.5;
        pm.modelContainer.rotation.y = elapsed * (isActive ? 1.4 : 0.65) * orbitSpeedMultRef.current;

        pm.podiumGlow.opacity += ((isActive ? 0.3 : 0.07) - pm.podiumGlow.opacity) * 0.08;
        pm.podiumRim.opacity += ((isActive ? 1 : 0.55) - pm.podiumRim.opacity) * 0.08;

        const beamU = (pm.beamLine.material as THREE.ShaderMaterial).uniforms;
        beamU.uActive.value += ((isActive ? (cameraFocusedRef.current ? 1 : 0.6) : 0) - beamU.uActive.value) * 0.08;
        beamU.uTime.value = elapsed;

        pm.group.getWorldPosition(tempVec);
        if (isActive) {
          activeWorldPos.copy(tempVec);
        }
        if (tempVec.z > frontZ) { frontZ = tempVec.z; frontId = pm.id; }

        // Project 3D position to 2D container coordinates
        tempVec.project(camera);
        const screenX = (tempVec.x * 0.5 + 0.5) * cw;
        const screenY = (-(tempVec.y * 0.5) + 0.5) * ch;
        const isFarBack = tempVec.z > 0.915;

        const btnEl = nodeMarkerRefs.current[pm.id];
        if (btnEl) {
          // Depth-aware: a floating panel (sponsor screen, the pass card) in front of
          // this pillar hides its label, and so does reading a focused panel.
          pm.group.getWorldPosition(occlusionTarget);
          occlusionDir.subVectors(occlusionTarget, camera.position);
          const dist = occlusionDir.length();
          occlusionRay.set(camera.position, occlusionDir.normalize());
          occlusionRay.far = Math.max(0, dist - 4);
          const hidden = !!focusedSponsorRef.current
            || (drawerOpenRef.current && !isActive)
            || occlusionRay.intersectObjects(occluders, false).length > 0
            || pilotOrbit.hit(occlusionRay);
          btnEl.style.transform = `translate3d(${screenX}px, ${screenY + 38}px, 0) translate(-50%, -50%) scale(${
            isActive ? 1.04 : tempVec.z < 0.88 ? 0.9 : 0.76
          })`;
          btnEl.style.zIndex = isActive ? '24' : tempVec.z < 0.89 ? '16' : '10';
          // Fade out back-row labels when not active so labels never feel stacked or cluttered
          btnEl.style.opacity = hidden ? '0' : isActive ? '1' : isFarBack ? '0.18' : '0.78';
          btnEl.style.pointerEvents = hidden ? 'none' : 'auto';
        }
      });

      // Energy field colors: the pillar passing in front while the core orbits, the docked one once docked.
      const [domeA, domeB] = fxPair(docked ? activePillarRef.current : frontId);
      domeUniforms.uColorA.value.lerp(fxTargetA.set(...domeA), 0.025);
      domeUniforms.uColorB.value.lerp(fxTargetB.set(...domeB), 0.025);
      domeUniforms.uGain.value += ((docked ? 0.65 : 0.85) - domeUniforms.uGain.value) * 0.05;

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

      pilotOrbit.update(elapsed, camera, cameraFocusedRef.current ? activeWorldPos : null);

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

      if (introOn) {
        if (introT0 < 0 && !document.querySelector('.sgx-boot')) {
          introT0 = elapsed;
          try { sessionStorage.setItem(CORE_INTRO_KEY, '1'); } catch { /* ignore */ }
        }
        const k = introT0 < 0 ? 0 : Math.min(1, (elapsed - introT0) / 2.8);
        const ease = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        camera.position.lerpVectors(introFrom, targetCameraPos, ease);
        if (k >= 1) introOn = false;
      } else {
        camera.position.lerp(targetCameraPos, 0.06);
      }
      currentLookAt.lerp(targetLookAt, 0.08);

      // Guild egg orbit
      const ga = elapsed * 0.09 + 1.2;
      guildEgg.position.set(Math.cos(ga) * 122, 44 + Math.sin(elapsed * 0.7) * 3, Math.sin(ga) * 122);
      guildEgg.rotation.y = elapsed * 0.8;
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
        if (post) {
          post.tick(delta * 1000, elapsed);
          post.render();
        } else {
          renderer.render(scene, camera);
        }
      }
    };

    animate();

    return () => {
      if (reqId) cancelAnimationFrame(reqId);
      pilotOrbit.dispose();
      pilotOrbitRef.current = null;
      container.removeEventListener('pointerup', onDomPointerUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      dracoLoader.dispose();
      domeGeo.dispose();
      domeMat.dispose();
      holoMat.dispose();
      post?.dispose();
      floorFx.dispose();
      ceilingFx.dispose();
      coreShell.dispose();
      window.removeEventListener('sgx:xp_sparks', onXpRipple);
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
      [podiumBaseGeo, podiumTopGeo, podiumRimGeo, podiumPadGeo, podiumBaseMat, podiumTopMat].forEach((d) => d.dispose());
      pillarMeshes.forEach((pm) => {
        pm.beamLine.geometry.dispose();
        (pm.beamLine.material as THREE.Material).dispose();
        pm.podiumGlow.dispose();
        pm.podiumRim.dispose();
      });
      container.removeEventListener('pointerdown', skipIntro);
      fallbackCoreGeo.dispose();
      fallbackCoreMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      nodeSphereGeo.dispose();
      orbGeo.dispose();
      if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
        renderer.dispose();
      }
    };
  }, [liteMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Presses on the card or a button are theirs; bringing the HUD in here would re-layer the 3D canvas over the card mid-press.
    if (target && (target.closest('button') || target.closest('[data-holographic-drawer="true"]'))) {
      return;
    }
    explore(); // first touch on the core brings the HUD in
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
    // The "Visitar pilar" card is the way into the pillar's page, on every screen size.
    // Leave calm mode first, so the core doesn't resize under the card mid-tap.
    if (!zenImmersionMode) { explore(); setDrawerOpen(true); }
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
    playUiChirp(840);
    const station = SGX_3D_SPONSOR_STATIONS.find(s => s.id === sponsorId);
    if (triggerShockwaveRef.current) {
      triggerShockwaveRef.current(new THREE.Vector3(0, 0, 0), station?.threeColor || 0xFDCC0D);
    }
    if (station) {
      setFloatingXpNotice((es ? `🔭 ENFOCANDO EN ÁREA 3D: ${station.name.toUpperCase()}` : `🔭 FOCUSING ON 3D AREA: ${station.name.toUpperCase()}`));
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
    setFloatingXpNotice((es ? `⚡ FRECUENCIA ${label} EMITIDA EN EL NÚCLEO` : `⚡ FREQUENCY ${label} SENT TO THE CORE`));
    setTimeout(() => setFloatingXpNotice(null), 1800);
  };

  const activeNode = SGX_ORBITAL_PILLARS.find(p => p.id === activePillarId) || SGX_ORBITAL_PILLARS[0];
  const readableAccent = noSelection ? '#FDCC0D' : (activeNode.colorHex === '#32527B' ? '#00DDFF' : activeNode.colorHex);

  return (
    <div
      className="relative w-full h-full flex-1 min-h-0 bg-[#050505] overflow-hidden select-none flex flex-col"
      style={{
        minHeight: 'calc(100dvh - 54px)',
      }}
    >
      {/* Top Bar HUD Overlay: Clean, Uncluttered & Mobile-Responsive */}
      <div className="sgx-calm-collapse relative z-30 flex items-center justify-between gap-2 px-3 sm:px-5 py-2 bg-[#050505]/95 backdrop-blur-md border-b border-[#32527B]/60 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={noSelection ? '/holo/summitIcon.png' : activeNode.iconUrl}
            alt={noSelection ? 'SGX' : activeNode.code}
            referrerPolicy="no-referrer"
            className="w-6 h-6 sm:w-7 sm:h-7 object-contain shrink-0 filter drop-shadow-[0_0_8px_rgba(253,204,13,0.5)]"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] font-mono">
              <span className="font-extrabold tracking-wider" style={{ color: readableAccent }}>
                {noSelection ? (es ? '6 PILARES SGX' : '6 SGX PILLARS') : activeNode.code}
              </span>
              <span className="text-slate-500 hidden md:inline">·</span>
              <span className="text-slate-400 truncate hidden md:inline">{noSelection ? (es ? 'Toca un pilar para entrar' : 'Tap a pillar to enter') : loc(activeNode, 'title', language)}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-extrabold text-white font-['Orbitron',sans-serif] truncate">
              {es ? 'NÚCLEO 3D SPATIALGINEERS' : 'SPATIALGINEERS 3D CORE'}
            </h3>
          </div>
        </div>

        <div className="relative flex items-center gap-1 sm:gap-1.5 shrink-0 font-mono text-xs">
          {/* Public visit counter (SGX.System · Radar de visitas) */}
          <VisitCounterChip className="hidden md:inline-flex" onOpen={() => navigateToSection('VISITS')} />
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
              title={es ? 'Ver Run of Show y Agenda de 3 Días' : 'View the Run of Show and 3-Day Agenda'}
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
              title={es ? 'Tu SGX Pass: registro, Holo Card y credencial en uno' : 'Your SGX Pass: registration, Holo Card and credential in one'}
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>SGX Pass</span>
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
            title={autoRotate ? (es ? 'Pausar rotación' : 'Pause rotation') : (es ? 'Girar' : 'Rotate')}
          >
            {autoRotate ? <Pause className="w-3.5 h-3.5 text-[#00DDFF]" /> : <Play className="w-3.5 h-3.5 text-[#FDCC0D]" />}
            <span className="hidden sm:inline">{autoRotate ? (es ? 'Pausa' : 'Pause') : (es ? 'Girar' : 'Rotate')}</span>
          </button>

          {/* Primary Exploration Trigger Button (Roomy Inspection Modal) */}
          <button
            type="button"
            onClick={() => {
              playUiChirp(740);
              setOptionsMenuOpen(false);
              if (noSelection && !drawerOpen) {
                setFloatingXpNotice(es ? 'Toca un pilar en 3D o en la barra de abajo' : 'Tap a pillar in 3D or in the bar below');
                setTimeout(() => setFloatingXpNotice(null), 2200);
                return;
              }
              setDrawerOpen(prev => !prev);
            }}
            className="px-2.5 sm:px-3.5 py-1.5 bg-[#FDCC0D] hover:bg-[#FFBB00] text-[#050505] font-['Orbitron',sans-serif] font-black flex items-center gap-1 cursor-pointer text-xs transition-transform hover:scale-102"
            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
          >
            <Compass className="w-3.5 h-3.5 text-[#050505]" />
            <span>{drawerOpen ? (es ? 'Cerrar' : 'Close') : noSelection ? (es ? 'Elige un pilar' : 'Pick a pillar') : (es ? `Explorar ${activeNode.id}` : `Explore ${activeNode.id}`)}</span>
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
                : 'bg-[#1A1A1A] hover:bg-[#373737] text-slate-300 border-[#32527B]'
            }`}
            style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
            title={es ? 'Opciones avanzadas del Núcleo 3D' : 'Advanced 3D Core options'}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{es ? 'Ajustes' : 'Settings'}</span>
          </button>

          {/* Clean Options Dropdown Popover */}
          {optionsMenuOpen && (
            <div
              className="absolute top-full right-0 mt-2 z-50 w-64 p-2 bg-[#111111] border-2 border-[#32527B] shadow-[0_15px_40px_rgba(0,0,0,0.9)] space-y-1.5 font-mono text-xs"
              style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
            >
              <div className="px-2 py-1 text-[10px] font-bold text-slate-400 border-b border-[#32527B]/60 uppercase tracking-wider">
                {es ? 'Control de Cámara & Espacio 3D' : 'Camera & 3D Space Control'}
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
                  <span>{es ? 'Restablecer vista' : 'Reset view'}</span>
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
                  <span>{es ? 'Zoom a ' : 'Zoom to '}{activeNode.id} (.GLB)</span>
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
                <span>{es ? 'Navegar Sponsors 3D (4 Áreas)' : 'Browse 3D Sponsors (4 Areas)'}</span>
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
                    setFloatingXpNotice((es ? '🌌 MODO INMERSIÓN TOTAL ACTIVO' : '🌌 FULL IMMERSION MODE ON'));
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
                    : 'bg-[#1A1A1A] hover:bg-[#373737] text-white border-[#32527B]'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>{zenImmersionMode ? (es ? 'Salir Inmersión Total' : 'Exit Full Immersion') : (es ? 'Modo Inmersión Total 3D' : 'Full 3D Immersion Mode')}</span>
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
                    : 'bg-[#1A1A1A] hover:bg-[#373737] text-[#FFBB00] border-[#B87000]'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{liteMode ? (es ? 'Modo Ligero: Activo' : 'Lite Mode: On') : (es ? 'Activar Modo Ligero (Batería)' : 'Turn On Lite Mode (Battery)')}</span>
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
        className="sgx-core-viewport relative w-full flex-1 min-h-[440px] h-[calc(100dvh-126px)] cursor-grab active:cursor-grabbing overflow-hidden touch-none overscroll-contain bg-[#050505]"
        style={{
          height: 'calc(100dvh - 126px)',
          minHeight: '440px',
          touchAction: 'none',
        }}
      >
        <SgxHeroOverlay />

        {/* Official Brand & Tactical Guide Credit: "POWERED BY SPATIALGINEERS" at 40% opacity */}
        <div
          aria-hidden="true"
          className="sgx-calm-hide pointer-events-none absolute top-16 right-4 z-20 font-['Orbitron',sans-serif] text-[10px] sm:text-xs font-bold tracking-[0.2em] text-white opacity-40 uppercase"
        >
          POWERED BY SPATIALGINEERS
        </div>

        {/* SUMMIT CLOCKS: thin full-width band, hides to a small tab */}
        {!zenImmersionMode && (
          <SgxClocksBanner
            es={es}
            countdown={countdown}
            youtubeUrl={SGX_YOUTUBE}
            onDial={(hz, label) => handlePlayHarmonicNote(hz, label)}
          />
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
                const isSelected = !noSelection && p.id === activePillarId;

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
              <span>{es ? 'Modo Ligero Activo · Ahorro de GPU y Batería al 100% · Toca cualquier pilar para inspeccionar' : 'Lite Mode On · 100% GPU & Battery Saving · Tap any pillar to inspect'}</span>
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
            const isDocked = !noSelection && pillar.id === activePillarId;
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
                className={`sgx-calm-hide absolute left-0 top-0 pointer-events-auto cursor-pointer transition-shadow duration-200 px-2.5 py-1 backdrop-blur-md flex items-center gap-1.5 text-left ${
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

        {/* Pillar panel: bottom sheet over a scrim on phones, docked on the right of the 3D view on desktop. */}
        {drawerOpen && (() => {
          // Tapping a pillar offers its page; everything about the pillar lives there.
          const page = findPillar(activeNode.id);
          return (
            <div className="sgx-core-drawer__scrim" onClick={() => setDrawerOpen(false)}>
              <aside
                ref={drawerRef}
                data-holographic-drawer="true"
                role="dialog"
                aria-labelledby="sgx-core-drawer-title"
                tabIndex={-1}
                onClick={e => e.stopPropagation()}
                className="sgx-core-drawer sgx-core-drawer--visit"
                style={{ ['--drawer-accent' as string]: readableAccent }}
              >
                <header className="sgx-core-drawer__head">
                  <span className="sgx-avatar sgx-avatar--contain" style={{ ['--avatar-accent' as string]: readableAccent }}>
                    <img src={activeNode.iconUrl} alt="" referrerPolicy="no-referrer" />
                  </span>
                  <div className="sgx-core-drawer__title">
                    <p className="sgx-kicker">{activeNode.code}</p>
                    <h2 id="sgx-core-drawer-title">{loc(activeNode, 'title', language)}</h2>
                  </div>
                  <button
                    type="button"
                    className="sgx-iconbtn"
                    onClick={() => { playUiChirp(640); setDrawerOpen(false); }}
                    aria-label={es ? 'Cerrar y volver al 3D' : 'Close and go back to 3D'}
                  >
                    <X aria-hidden />
                  </button>
                </header>
                {page && <p className="sgx-copy sgx-core-drawer__line">{bi(page.scope, language)}</p>}
                <button
                  type="button"
                  className="sgx-btn is-wide"
                  onClick={() => { playUiChirp(820); setDrawerOpen(false); navigateToPillar(page?.slug || activeNode.id.toLowerCase()); }}
                >
                  {es ? 'Visitar pilar' : 'Visit pillar'}<ArrowRight aria-hidden />
                </button>
              </aside>
            </div>
          );
        })()}

        {/* Bottom Status Bar / Mobile Bottom Sheet Launcher inside 3D Viewport */}
        <div className="sgx-calm-hide absolute bottom-2.5 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto text-xs font-mono text-slate-200">
          <div className="px-3 py-1.5 bg-[#050505]/85 backdrop-blur-md border border-[#32527B]/70 pointer-events-none hidden sm:block">
            {es ? 'Toca un pilar 3D' : 'Tap a 3D pillar'}
          </div>

          {!drawerOpen && !noSelection && (
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
                <img src={activeNode.iconUrl} alt="" className="w-3.5 h-3.5 object-contain" />
                <span className="font-display text-[11px]">
                  {activeNode.code} ({activePillarModules.length})
                </span>
              </span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 bg-[var(--SGX_Yellow)] text-[var(--SGX_Black_Base)] text-[10px] font-hud font-bold uppercase">
                {es ? 'Explorar' : 'Explore'}<ChevronUp className="w-3 h-3" aria-hidden />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Direct 6-Pillar Quick Docking Strip (Bottom Bar — Sleek Horizontal Swipe Dock on Mobile, 6-Col Grid on Desktop) */}
      <div className="sgx-calm-collapse relative z-30 flex items-center gap-1.5 p-2 bg-[#050505] border-t border-[#32527B]/60 font-mono text-xs overflow-x-auto scroll-smooth no-scrollbar lg:grid lg:grid-cols-6">
        {SGX_ORBITAL_PILLARS.map((p, index) => {
          const isSelected = !noSelection && p.id === activePillarId;
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
