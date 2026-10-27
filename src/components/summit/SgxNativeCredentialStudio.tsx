import { pillarIcon } from '../../lib/sgxPillars';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Upload,
  Download,
  RotateCw,
  FlipHorizontal,
  Copy,
  Check,
  Share2,
  Camera,
  User,
  Layers,
  Sliders,
  Award,
  Ticket,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Maximize2
} from 'lucide-react';
import {
  playUiChirp,
  playHoloFocusSound,
  playScanSuccessSound,
  playCyberBurstSound
} from '../../lib/cyberAudioEngine';
import { HoloCardProfile, resolveStoredUserHoloProfile } from './SgxHoloCardGeneratorModal';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

export type CredentialRoleKey = 'visitante' | 'speaker' | 'initiate' | 'sponsor';
export type VisitorPassType = 'digital' | 'showcase' | 'vip';
export type PreviewFormatMode = 'badge3d' | 'post' | 'story';
export type MobileControlTab = 'identity' | 'photo' | 'pillars' | 'export';

interface PillarItem {
  id: string;
  name: string;
  tag: string;
  tagEn?: string;
  color: string;
  iconUrl: string;
}

const SGX_PILLARS: PillarItem[] = [
  {
    id: 'story',
    name: 'SGX.STORY',
    tag: 'Narrativa & Lore',
    tagEn: 'Narrative & Lore',
    color: '#FDCC0D',
    iconUrl: pillarIcon('STORY')
  },
  {
    id: 'showcase',
    name: 'SGX.SHOWCASE',
    tag: 'Expo & Demos XR',
    tagEn: 'Expo & XR Demos',
    color: '#00DDFF',
    iconUrl: pillarIcon('SHOWCASE')
  },
  {
    id: 'spark',
    name: 'SGX.SPARK',
    tag: 'Juegos & Retos',
    tagEn: 'Games & Challenges',
    color: '#FFBB00',
    iconUrl: pillarIcon('SPARK')
  },
  {
    id: 'stage',
    name: 'SGX.STAGE',
    tag: 'Keynotes & Show',
    color: '#38BDF8',
    iconUrl: pillarIcon('STAGE')
  },
  {
    id: 'systems',
    name: 'SGX.SYSTEM',
    tag: 'Ingeniería & IA',
    tagEn: 'Engineering & AI',
    color: '#5F86B4',
    iconUrl: pillarIcon('SYSTEM')
  },
  {
    id: 'synthesize',
    name: 'SGX.SYNTHESIZE',
    tag: 'Alianzas & Red',
    tagEn: 'Partnerships & Network',
    color: '#10B981',
    iconUrl: pillarIcon('SYNTHESIZE')
  }
];

const ROLE_META: Record<
  CredentialRoleKey,
  {
    label: string;
    labelEn?: string;
    badgeHeader: string;
    badgeHeaderEn?: string;
    subHeader: string;
    subHeaderEn?: string;
    accent: string;
    secondary: string;
    clearance: string;
  }
> = {
  visitante: {
    label: 'Visitante Summit',
    labelEn: 'Summit Visitor',
    badgeHeader: 'VISITANTE CON SGX PASS',
    badgeHeaderEn: 'VISITOR WITH SGX PASS',
    subHeader: 'ACREDITACIÓN OFICIAL · ACCESO DIGITAL & SGX SHOWCASE',
    subHeaderEn: 'OFFICIAL ACCREDITATION · DIGITAL ACCESS & SGX SHOWCASE',
    accent: '#00DDFF',
    secondary: '#FDCC0D',
    clearance: 'CLR-VISITOR-2026'
  },
  speaker: {
    label: 'Speaker / Artista',
    labelEn: 'Speaker / Artist',
    badgeHeader: 'SPEAKER OFICIAL · SGX STAGE',
    badgeHeaderEn: 'OFFICIAL SPEAKER · SGX STAGE',
    subHeader: 'PONENTE & CREADOR DESTACADO · SAN JUAN, PR',
    subHeaderEn: 'FEATURED SPEAKER & CREATOR · SAN JUAN, PR',
    accent: '#FDCC0D',
    secondary: '#00DDFF',
    clearance: 'CLR-STAGE-VIP'
  },
  initiate: {
    label: 'Guild Initiate',
    badgeHeader: 'SGX GUILD · RANKED INITIATE',
    subHeader: 'SGX GUILD RANKED TRIALS · COHORTE 2026',
    subHeaderEn: 'SGX GUILD RANKED TRIALS · 2026 COHORT',
    accent: '#38BDF8',
    secondary: '#FDCC0D',
    clearance: 'CLR-GUILD-GM8'
  },
  sponsor: {
    label: 'Sponsor / Aliado',
    labelEn: 'Sponsor / Partner',
    badgeHeader: 'SPONSOR OFICIAL · SUMMIT 2026',
    badgeHeaderEn: 'OFFICIAL SPONSOR · SUMMIT 2026',
    subHeader: 'ALIANZA DE INDUSTRIA & SHOWCASE CORPORATIVO',
    subHeaderEn: 'INDUSTRY PARTNERSHIP & CORPORATE SHOWCASE',
    accent: '#FFBB00',
    secondary: '#FDCC0D',
    clearance: 'CLR-PARTNER-EXEC'
  }
};

const PASS_TYPE_META: Record<
  VisitorPassType,
  { label: string; labelEn?: string; tag: string; tagEn?: string; color: string; days: string; daysEn?: string }
> = {
  digital: {
    label: 'Pase Digital',
    labelEn: 'Digital Pass',
    tag: 'YOUTUBE LIVE',
    color: '#00DDFF',
    days: 'DIC 11–13 · YOUTUBE LIVE',
    daysEn: 'DEC 11–13 · YOUTUBE LIVE',
  },
  showcase: {
    label: 'Pase SGX Showcase (Día 3)',
    labelEn: 'SGX Showcase Pass (Day 3)',
    tag: 'SAN JUAN, PR · POR INVITACIÓN',
    tagEn: 'SAN JUAN, PR · BY INVITATION',
    color: '#FDCC0D',
    days: 'DIC 13 · CHROMA SPACE STUDIOS',
    daysEn: 'DEC 13 · CHROMA SPACE STUDIOS',
  },
  vip: {
    label: 'Pase Invitado Especial',
    labelEn: 'Special Guest Pass',
    tag: 'POR INVITACIÓN + SGX.MATCH',
    tagEn: 'BY INVITATION + SGX.MATCH',
    color: '#FFBB00',
    days: 'DIC 11–13 · DIGITAL + DÍA 3 POR INVITACIÓN',
    daysEn: 'DEC 11–13 · DIGITAL + DAY 3 BY INVITATION',
  }
};

interface SgxNativeCredentialStudioProps {
  initialProfile?: HoloCardProfile | null;
  onOpenTicketModal?: () => void;
  hasRegisteredTicket?: boolean;
  isModal?: boolean;
  /** The SGX Pass QR: drawn on the back when the card carries the pass code. */
  passQr?: { code: string; url: string } | null;
}

const CARD_W = 1050;
const CARD_H = 660;

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawChamferRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  cut: number
) {
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h - cut);
  ctx.lineTo(x + w - cut, y + h);
  ctx.lineTo(x, y + h);
  ctx.lineTo(x, y + cut);
  ctx.closePath();
}

export const SgxNativeCredentialStudio: React.FC<SgxNativeCredentialStudioProps> = ({
  initialProfile,
  onOpenTicketModal,
  hasRegisteredTicket = false,
  isModal = false,
  passQr = null
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { profile: pilotProfile, recordActivity } = usePilotProfile();
  const { playerProfile, user } = useAuth();

  const resolvedDefault = resolveStoredUserHoloProfile(
    initialProfile,
    playerProfile?.nickname || user?.displayName || undefined,
    pilotProfile?.selectedRole,
    playerProfile?.avatar || (user as any)?.photoURL
  );

  // Credential Form State
  const [role, setRole] = useState<CredentialRoleKey>(() => {
    const r = (resolvedDefault.role || 'visitante').toLowerCase();
    if (r === 'speaker' || r === 'initiate' || r === 'sponsor') return r;
    return 'visitante';
  });

  const [passType, setPassType] = useState<VisitorPassType>(() => {
    const pt = (resolvedDefault.passType || 'digital').toLowerCase();
    if (pt === 'showcase' || pt === 'vip') return pt;
    return 'digital';
  });

  const [fullName, setFullName] = useState<string>(
    resolvedDefault.name || playerProfile?.nickname || (es ? 'PILOTO SPATIALGINEER' : 'SPATIALGINEER PILOT')
  );
  const [jobTitle, setJobTitle] = useState<string>(
    resolvedDefault.jobtitle ||
      resolvedDefault.title ||
      (es ? 'VISITANTE CON SGX PASS' : 'VISITOR WITH SGX PASS')
  );
  const [organization, setOrganization] = useState<string>(
    resolvedDefault.org || resolvedDefault.studio || 'SPATIALGINEERS SUMMIT 2026'
  );
  const [topicOrMission, setTopicOrMission] = useState<string>(
    resolvedDefault.topic ||
      resolvedDefault.portfolio ||
      (es ? 'EXPLORACIÓN DEL NÚCLEO 3D & 6 PILARES' : 'EXPLORING THE 3D CORE & 6 PILLARS')
  );
  const [socialHandle, setSocialHandle] = useState<string>(
    resolvedDefault.handle || '@spatialgineers'
  );
  const [ticketCode, setTicketCode] = useState<string>(
    resolvedDefault.ticketCode ||
      `SGX-26-${Math.floor(1000 + Math.random() * 9000)}`
  );

  // Selected Pillars (max 2)
  const [selectedPillars, setSelectedPillars] = useState<string[]>(() =>
    resolvedDefault.pillars?.length ? resolvedDefault.pillars.slice(0, 2) : ['showcase', 'spark']
  );

  // Photo & Framing State (100% Client-Side)
  const [userPhotoImg, setUserPhotoImg] = useState<HTMLImageElement | null>(
    null
  );
  const [photoScale, setPhotoScale] = useState<number>(1.08);
  const [photoOffsetX, setPhotoOffsetX] = useState<number>(0);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);

  // Holographic & 3D Preview State
  const [previewMode, setPreviewMode] = useState<PreviewFormatMode>('badge3d');
  const [isFlippedBack, setIsFlippedBack] = useState<boolean>(false);
  const [isSpinning360, setIsSpinning360] = useState<boolean>(false);
  const [foilIntensity, setFoilIntensity] = useState<number>(0.85);
  const [rotX, setRotX] = useState<number>(4);
  const [rotY, setRotY] = useState<number>(-8);
  const [glarePos, setGlarePos] = useState<{ x: number; y: number }>({
    x: 35,
    y: 30
  });
  const [isDraggingCard, setIsDraggingCard] = useState<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startRotX: number;
    startRotY: number;
  } | null>(null);

  // Mobile Active Control Tab
  const [mobileTab, setMobileTab] = useState<MobileControlTab>('identity');

  // Feedback & Export State
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);
  const [exportBanner, setExportBanner] = useState<string | null>(null);

  // Canvas & File Refs
  const frontCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const backCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const socialCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Preloaded Brand & Pillar Images
  const brandAssetsRef = useRef<{
    summitIcon?: HTMLImageElement;
    sgxLogo?: HTMLImageElement;
    pillars: Record<string, HTMLImageElement>;
  }>({ pillars: {} });
  const [assetsTick, setAssetsTick] = useState<number>(0);
  const passQrImgRef = useRef<HTMLImageElement | null>(null);

  // Real SGX Pass QR for the back of the card (same QR as the pass and the PDF).
  useEffect(() => {
    passQrImgRef.current = null;
    if (!passQr?.url) return;
    const img = new Image();
    img.onload = () => {
      passQrImgRef.current = img;
      setAssetsTick((t) => t + 1);
    };
    img.src = passQr.url;
  }, [passQr?.url]);

  // Sync external initialProfile changes
  useEffect(() => {
    if (!initialProfile) return;
    if (initialProfile.role) {
      const r = initialProfile.role.toLowerCase();
      if (
        r === 'visitante' ||
        r === 'speaker' ||
        r === 'initiate' ||
        r === 'sponsor'
      ) {
        setRole(r);
      } else if (r === 'visitor') {
        setRole('visitante');
      }
    }
    if (initialProfile.name) setFullName(initialProfile.name);
    if (initialProfile.jobtitle || initialProfile.title) {
      setJobTitle(initialProfile.jobtitle || initialProfile.title || '');
    }
    if (initialProfile.org || initialProfile.studio) {
      setOrganization(initialProfile.org || initialProfile.studio || '');
    }
    if (initialProfile.topic || initialProfile.portfolio) {
      setTopicOrMission(initialProfile.topic || initialProfile.portfolio || '');
    }
    if (initialProfile.handle) setSocialHandle(initialProfile.handle);
    if (initialProfile.ticketCode) setTicketCode(initialProfile.ticketCode);
    if (initialProfile.pillars?.length) setSelectedPillars(initialProfile.pillars.slice(0, 2));
    if (initialProfile.passType) {
      const pt = initialProfile.passType.toLowerCase();
      if (pt === 'digital' || pt === 'showcase' || pt === 'vip') {
        setPassType(pt);
      }
    }
  }, [initialProfile]);

  // Load official SGX brand logos & pillar icons for Canvas rendering
  useEffect(() => {
    const loadImg = (url: string, onLoad: (img: HTMLImageElement) => void) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        onLoad(img);
        setAssetsTick((t) => t + 1);
      };
      img.src = url;
    };

    loadImg(
      'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
      (img) => {
        brandAssetsRef.current.summitIcon = img;
      }
    );
    loadImg(
      'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
      (img) => {
        brandAssetsRef.current.sgxLogo = img;
      }
    );

    SGX_PILLARS.forEach((p) => {
      loadImg(p.iconUrl, (img) => {
        brandAssetsRef.current.pillars[p.id] = img;
      });
    });
  }, []);

  // Load initial avatar if available
  useEffect(() => {
    const savedAvatar =
      resolvedDefault.photoUrl ||
      localStorage.getItem('sgx_attendee_avatar_png');
    if (savedAvatar && !userPhotoImg) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => setUserPhotoImg(img);
      img.src = savedAvatar;
    }
  }, [resolvedDefault.photoUrl, userPhotoImg]);

  // Handle Client-Side File Upload (100% Local in Browser)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    playHoloFocusSound();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const img = new Image();
      img.onload = () => {
        setUserPhotoImg(img);
        setPhotoScale(1.08);
        setPhotoOffsetX(0);
        setPhotoOffsetY(0);
        playScanSuccessSound();
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const togglePillar = (pillarId: string) => {
    playUiChirp(740);
    setSelectedPillars((prev) => {
      if (prev.includes(pillarId)) {
        return prev.length > 1 ? prev.filter((id) => id !== pillarId) : prev;
      }
      if (prev.length >= 2) {
        return [prev[1], pillarId];
      }
      return [...prev, pillarId];
    });
  };

  // DeviceOrientation (Gyroscope) subtle tilt for mobile devices
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (isDraggingCard || e.gamma === null || e.beta === null) return;
      const clampedY = Math.max(-18, Math.min(18, e.gamma * 0.45));
      const clampedX = Math.max(-14, Math.min(14, (e.beta - 45) * 0.35));
      setRotY(clampedY);
      setRotX(-clampedX);
      setGlarePos({
        x: Math.max(5, Math.min(95, 50 + clampedY * 2.2)),
        y: Math.max(5, Math.min(95, 50 + clampedX * 2.2))
      });
    };
    window.addEventListener('deviceorientation', handleOrientation);
    return () =>
      window.removeEventListener('deviceorientation', handleOrientation);
  }, [isDraggingCard]);

  // Draw Front & Back Credential Canvases + Social Export Canvas
  const renderAllCanvases = useCallback(() => {
    const roleCfg = ROLE_META[role];
    const passCfg = PASS_TYPE_META[passType];
    const primaryAccent =
      role === 'visitante' ? passCfg.color : roleCfg.accent;

    // 1. FRONT CANVAS (1050 x 660)
    const frontCanvas = frontCanvasRef.current;
    if (frontCanvas) {
      const ctx = frontCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, CARD_W, CARD_H);

        // Deep Space Chassis Background
        const bgGrad = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
        bgGrad.addColorStop(0, '#0C0C0C');
        bgGrad.addColorStop(0.55, '#161616');
        bgGrad.addColorStop(1, '#0A0A0A');
        ctx.fillStyle = bgGrad;
        drawRoundedRect(ctx, 0, 0, CARD_W, CARD_H, 28);
        ctx.fill();

        // Ambient Radial Glows
        const rad1 = ctx.createRadialGradient(
          CARD_W * 0.22,
          CARD_H * 0.45,
          20,
          CARD_W * 0.22,
          CARD_H * 0.45,
          360
        );
        rad1.addColorStop(0, `${primaryAccent}33`);
        rad1.addColorStop(1, 'transparent');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, CARD_W, CARD_H);

        const rad2 = ctx.createRadialGradient(
          CARD_W * 0.85,
          CARD_H * 0.2,
          10,
          CARD_W * 0.85,
          CARD_H * 0.2,
          300
        );
        rad2.addColorStop(0, '#FDCC0D22');
        rad2.addColorStop(1, 'transparent');
        ctx.fillStyle = rad2;
        ctx.fillRect(0, 0, CARD_W, CARD_H);

        // Tactical Grid Lines
        ctx.strokeStyle = 'rgba(0, 221, 255, 0.06)';
        ctx.lineWidth = 1;
        for (let x = 0; x < CARD_W; x += 42) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CARD_H);
          ctx.stroke();
        }
        for (let y = 0; y < CARD_H; y += 42) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CARD_W, y);
          ctx.stroke();
        }

        // Top Header Banner
        ctx.fillStyle = '#141414';
        ctx.fillRect(0, 0, CARD_W, 92);
        ctx.fillStyle = primaryAccent;
        ctx.fillRect(0, 89, CARD_W, 4);

        // Lanyard Slot Cutout at top center
        ctx.fillStyle = '#050505';
        drawRoundedRect(ctx, CARD_W / 2 - 58, 16, 116, 22, 11);
        ctx.fill();
        ctx.strokeStyle = `${primaryAccent}88`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Top Left Brand Title
        if (brandAssetsRef.current.summitIcon) {
          ctx.drawImage(brandAssetsRef.current.summitIcon, 34, 18, 56, 56);
        }
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 22px Orbitron, sans-serif';
        ctx.fillText('SPATIALGINEERS SUMMIT 2026', 102, 46);
        ctx.fillStyle = primaryAccent;
        ctx.font = '700 13px monospace';
        ctx.fillText((es ? 'DIC 11–13, 2026 · YOUTUBE LIVE · DÍA 3 SAN JUAN, PR' : 'DEC 11–13, 2026 · YOUTUBE LIVE · DAY 3 SAN JUAN, PR'), 102, 68);

        // Top Right Role Clearance Pill
        const clearanceW = 285;
        ctx.fillStyle = `${primaryAccent}22`;
        drawChamferRect(ctx, CARD_W - clearanceW - 32, 22, clearanceW, 48, 10);
        ctx.fill();
        ctx.strokeStyle = primaryAccent;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = primaryAccent;
        ctx.font = '900 14px Orbitron, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          role === 'visitante' ? loc(passCfg, 'tag', language) : roleCfg.clearance,
          CARD_W - clearanceW / 2 - 32,
          51
        );
        ctx.textAlign = 'left';

        // Left Column: Portrait Frame (Hex/Chamfered Cyber Frame)
        const photoX = 44;
        const photoY = 124;
        const photoW = 310;
        const photoH = 380;

        ctx.save();
        drawChamferRect(ctx, photoX, photoY, photoW, photoH, 22);
        ctx.fillStyle = '#1A1A1A';
        ctx.fill();
        ctx.clip();

        if (userPhotoImg) {
          const imgRatio = userPhotoImg.width / userPhotoImg.height;
          const boxRatio = photoW / photoH;
          let drawW = photoW;
          let drawH = photoH;
          if (imgRatio > boxRatio) {
            drawH = photoH;
            drawW = photoH * imgRatio;
          } else {
            drawW = photoW;
            drawH = photoW / imgRatio;
          }
          drawW *= photoScale;
          drawH *= photoScale;
          const dx = photoX + (photoW - drawW) / 2 + photoOffsetX;
          const dy = photoY + (photoH - drawH) / 2 + photoOffsetY;
          ctx.drawImage(userPhotoImg, dx, dy, drawW, drawH);
        } else {
          // Stylized Cyber Silhouette Avatar Placeholder
          const phGrad = ctx.createLinearGradient(
            photoX,
            photoY,
            photoX + photoW,
            photoY + photoH
          );
          phGrad.addColorStop(0, '#212121');
          phGrad.addColorStop(1, '#101010');
          ctx.fillStyle = phGrad;
          ctx.fillRect(photoX, photoY, photoW, photoH);

          // Initials Monogram + Summit Emblem
          ctx.strokeStyle = `${primaryAccent}44`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(
            photoX + photoW / 2,
            photoY + photoH / 2 - 20,
            78,
            0,
            Math.PI * 2
          );
          ctx.stroke();

          const initials = (fullName || 'SGX')
            .trim()
            .split(/\s+/)
            .map((w) => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          ctx.fillStyle = primaryAccent;
          ctx.font = '900 68px Orbitron, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(
            initials || 'SG',
            photoX + photoW / 2,
            photoY + photoH / 2 + 4
          );
          ctx.fillStyle = '#94A3B8';
          ctx.font = '700 13px monospace';
          ctx.fillText(
            (es ? 'SUBE TU FOTO ARRIBA' : 'UPLOAD YOUR PHOTO ABOVE'),
            photoX + photoW / 2,
            photoY + photoH - 42
          );
          ctx.textAlign = 'left';
        }
        ctx.restore();

        // Portrait Frame Neon Border & Corner Brackets
        ctx.save();
        drawChamferRect(ctx, photoX, photoY, photoW, photoH, 22);
        ctx.strokeStyle = primaryAccent;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        // Status Pill below Portrait
        ctx.fillStyle = '#161616';
        drawChamferRect(ctx, photoX, photoY + photoH + 14, photoW, 44, 10);
        ctx.fill();
        ctx.strokeStyle = `${primaryAccent}88`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#10B981';
        ctx.beginPath();
        ctx.arc(photoX + 24, photoY + photoH + 36, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#E2E8F0';
        ctx.font = '700 14px monospace';
        ctx.fillText(
          `ID: ${ticketCode.toUpperCase()}`,
          photoX + 42,
          photoY + photoH + 41
        );

        // Right Column: Identity Details
        const rightX = 392;
        const rightW = CARD_W - rightX - 42;

        // Role / Visitor Passport Distinction Banner
        ctx.fillStyle = primaryAccent;
        drawChamferRect(ctx, rightX, 124, rightW, 50, 12);
        ctx.fill();

        ctx.fillStyle = '#0A0A0A';
        ctx.font = '900 20px Orbitron, sans-serif';
        ctx.fillText(loc(roleCfg, 'badgeHeader', language), rightX + 20, 156);

        // Subheader
        ctx.fillStyle = '#FDCC0D';
        ctx.font = '700 13px monospace';
        ctx.fillText(
          role === 'visitante' ? loc(passCfg, 'days', language) : loc(roleCfg, 'subHeader', language),
          rightX + 4,
          198
        );

        // Attendee Name (Auto-scaling font size for long names)
        const displayName = (fullName || (es ? 'TU NOMBRE AQUÍ' : 'YOUR NAME HERE')).toUpperCase();
        let nameFontSize = 44;
        if (displayName.length > 22) nameFontSize = 34;
        if (displayName.length > 30) nameFontSize = 28;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${nameFontSize}px Orbitron, sans-serif`;
        ctx.fillText(displayName.slice(0, 34), rightX, 252);

        // Job Title / Role Subtitle
        ctx.fillStyle = primaryAccent;
        ctx.font = '700 20px monospace';
        ctx.fillText(
          (jobTitle || (es ? 'VISITANTE CON SGX PASS' : 'VISITOR WITH SGX PASS'))
            .toUpperCase()
            .slice(0, 44),
          rightX,
          288
        );

        // Organization / Studio Box
        ctx.fillStyle = '#181818';
        drawChamferRect(ctx, rightX, 310, rightW, 64, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 11px monospace';
        ctx.fillText((es ? 'ORGANIZACIÓN / ESTUDIO / COMUNIDAD' : 'ORGANIZATION / STUDIO / COMMUNITY'), rightX + 16, 332);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '800 19px Orbitron, sans-serif';
        ctx.fillText(
          (organization || 'SPATIALGINEERS SUMMIT 2026')
            .toUpperCase()
            .slice(0, 38),
          rightX + 16,
          358
        );

        // Topic / Mission / Golden Master Box
        ctx.fillStyle = '#181818';
        drawChamferRect(ctx, rightX, 388, rightW, 64, 10);
        ctx.fill();
        ctx.strokeStyle = `${primaryAccent}55`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = primaryAccent;
        ctx.font = '700 11px monospace';
        ctx.fillText(
          role === 'speaker'
            ? (es ? 'PONENCIA / KEYNOTE OFICIAL' : 'OFFICIAL TALK / KEYNOTE')
            : role === 'initiate'
            ? 'SGX GUILD RANKED TRIALS PITCH SESSION'
            : (es ? 'MISIÓN ESPACIAL & RUTA ACTIVA' : 'SPATIAL MISSION & ACTIVE ROUTE'),
          rightX + 16,
          410
        );
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '700 16px monospace';
        ctx.fillText(
          (topicOrMission || (es ? 'EXPLORACIÓN DEL NÚCLEO 3D & 6 PILARES' : 'EXPLORING THE 3D CORE & 6 PILLARS'))
            .toUpperCase()
            .slice(0, 46),
          rightX + 16,
          436
        );

        // Active SGX Pillars Affinity Row
        const activePillarObjs = SGX_PILLARS.filter((p) =>
          selectedPillars.includes(p.id)
        );
        activePillarObjs.forEach((pillar, idx) => {
          const px = rightX + idx * 314;
          const py = 468;
          const pw = 298;
          const ph = 78;

          ctx.fillStyle = '#151515';
          drawChamferRect(ctx, px, py, pw, ph, 10);
          ctx.fill();
          ctx.strokeStyle = pillar.color;
          ctx.lineWidth = 2;
          ctx.stroke();

          const pIcon = brandAssetsRef.current.pillars[pillar.id];
          if (pIcon) {
            ctx.drawImage(pIcon, px + 14, py + 13, 52, 52);
          }

          ctx.fillStyle = pillar.color;
          ctx.font = '900 15px Orbitron, sans-serif';
          ctx.fillText(pillar.name, px + 78, py + 36);
          ctx.fillStyle = '#CBD5E1';
          ctx.font = '700 12px monospace';
          ctx.fillText(loc(pillar, 'tag', language).toUpperCase(), px + 78, py + 56);
        });

        // Bottom Telemetry Footer Bar
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, CARD_H - 64, CARD_W, 64);
        ctx.fillStyle = 'rgba(0, 221, 255, 0.25)';
        ctx.fillRect(0, CARD_H - 64, CARD_W, 1.5);

        ctx.fillStyle = '#FDCC0D';
        ctx.font = '700 15px monospace';
        ctx.fillText(
          `HANDLE: ${(socialHandle || '@spatialgineers').toUpperCase()}`,
          44,
          CARD_H - 26
        );

        ctx.fillStyle = '#94A3B8';
        ctx.font = '700 13px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(
          'VERIFIED HOLO-CREDENTIAL · SUMMIT.SPATIALGINEERS.COM',
          CARD_W - 44,
          CARD_H - 26
        );
        ctx.textAlign = 'left';

        // Outer Neon Border
        ctx.strokeStyle = primaryAccent;
        ctx.lineWidth = 4;
        drawRoundedRect(ctx, 2, 2, CARD_W - 4, CARD_H - 4, 28);
        ctx.stroke();
      }
    }

    // 2. BACK CANVAS (1050 x 660 — Reverso con Pasaporte 6 Pilares & QR Telemetría)
    const backCanvas = backCanvasRef.current;
    if (backCanvas) {
      const bctx = backCanvas.getContext('2d');
      if (bctx) {
        bctx.clearRect(0, 0, CARD_W, CARD_H);

        const bgGrad = bctx.createLinearGradient(0, 0, CARD_W, CARD_H);
        bgGrad.addColorStop(0, '#0B0B0B');
        bgGrad.addColorStop(0.5, '#171717');
        bgGrad.addColorStop(1, '#090909');
        bctx.fillStyle = bgGrad;
        drawRoundedRect(bctx, 0, 0, CARD_W, CARD_H, 28);
        bctx.fill();

        // Top Bar
        bctx.fillStyle = '#141414';
        bctx.fillRect(0, 0, CARD_W, 88);
        bctx.fillStyle = '#FDCC0D';
        bctx.fillRect(0, 86, CARD_W, 3);

        bctx.fillStyle = '#FFFFFF';
        bctx.font = '900 22px Orbitron, sans-serif';
        bctx.fillText(
          (es ? 'SGX PASS · MATRIZ DE 6 PILARES' : 'SGX PASS · 6-PILLAR MATRIX'),
          44,
          52
        );

        bctx.fillStyle = primaryAccent;
        bctx.font = '700 14px monospace';
        bctx.textAlign = 'right';
        bctx.fillText((es ? `CÓDIGO: ${ticketCode.toUpperCase()}` : `CODE: ${ticketCode.toUpperCase()}`), CARD_W - 44, 52);
        bctx.textAlign = 'left';

        // Left 6 Pillars Stamp Matrix (2x3 Grid)
        SGX_PILLARS.forEach((pillar, idx) => {
          const col = idx % 2;
          const row = Math.floor(idx / 2);
          const bx = 44 + col * 308;
          const by = 118 + row * 146;
          const bw = 290;
          const bh = 128;
          const isSelected = selectedPillars.includes(pillar.id);

          bctx.fillStyle = isSelected ? '#222222' : '#121212';
          drawChamferRect(bctx, bx, by, bw, bh, 12);
          bctx.fill();
          bctx.strokeStyle = isSelected
            ? pillar.color
            : 'rgba(148,163,184,0.2)';
          bctx.lineWidth = isSelected ? 3 : 1.5;
          bctx.stroke();

          const pIcon = brandAssetsRef.current.pillars[pillar.id];
          if (pIcon) {
            bctx.drawImage(pIcon, bx + 16, by + 26, 68, 68);
          }

          bctx.fillStyle = isSelected ? pillar.color : '#94A3B8';
          bctx.font = '900 16px Orbitron, sans-serif';
          bctx.fillText(pillar.name, bx + 98, by + 50);

          bctx.fillStyle = '#E2E8F0';
          bctx.font = '700 12px monospace';
          bctx.fillText(loc(pillar, 'tag', language).toUpperCase(), bx + 98, by + 74);

          bctx.fillStyle = isSelected ? '#10B981' : '#767676';
          bctx.font = '700 11px monospace';
          bctx.fillText(
            isSelected ? (es ? '★ AFINIDAD ACTIVA' : '★ ACTIVE AFFINITY') : (es ? '○ ESTACIÓN DISPONIBLE' : '○ STATION AVAILABLE'),
            bx + 98,
            by + 98
          );
        });

        // Right Verification QR & Clearance Box
        const qx = 678;
        const qy = 118;
        const qw = 328;
        const qh = 420;

        bctx.fillStyle = '#161616';
        drawChamferRect(bctx, qx, qy, qw, qh, 16);
        bctx.fill();
        bctx.strokeStyle = primaryAccent;
        bctx.lineWidth = 2.5;
        bctx.stroke();

        // Simulated Deterministic Cyber QR Matrix
        const qrBoxSize = 196;
        const qrX = qx + (qw - qrBoxSize) / 2;
        const qrY = qy + 28;
        bctx.fillStyle = '#FFFFFF';
        drawRoundedRect(bctx, qrX, qrY, qrBoxSize, qrBoxSize, 12);
        bctx.fill();

        const realQr =
          passQr && passQrImgRef.current && ticketCode.trim().toUpperCase() === passQr.code.toUpperCase()
            ? passQrImgRef.current
            : null;
        const cells = realQr ? 0 : 11;
        const cellS = (qrBoxSize - 28) / 11;
        const seedStr = `${fullName}-${ticketCode}-${role}`;
        if (realQr) bctx.drawImage(realQr, qrX + 8, qrY + 8, qrBoxSize - 16, qrBoxSize - 16);
        bctx.fillStyle = '#0B0B0B';
        for (let r = 0; r < cells; r++) {
          for (let c = 0; c < cells; c++) {
            const isCorner =
              (r < 3 && c < 3) ||
              (r < 3 && c >= cells - 3) ||
              (r >= cells - 3 && c < 3);
            const charCode = seedStr.charCodeAt((r * cells + c) % seedStr.length);
            if (isCorner || (charCode + r * 7 + c * 13) % 3 !== 0) {
              bctx.fillRect(
                qrX + 14 + c * cellS,
                qrY + 14 + r * cellS,
                cellS - 1.5,
                cellS - 1.5
              );
            }
          }
        }

        bctx.fillStyle = '#FFFFFF';
        bctx.font = '900 16px Orbitron, sans-serif';
        bctx.textAlign = 'center';
        bctx.fillText(realQr ? (es ? 'SGX PASS VERIFICADO' : 'SGX PASS VERIFIED') : (es ? 'ESCANEO WEBXR ACTIVO' : 'WEBXR SCAN ACTIVE'), qx + qw / 2, qrY + qrBoxSize + 36);

        bctx.fillStyle = primaryAccent;
        bctx.font = '700 13px monospace';
        bctx.fillText(
          loc(roleCfg, 'badgeHeader', language).slice(0, 28),
          qx + qw / 2,
          qrY + qrBoxSize + 62
        );

        bctx.fillStyle = '#94A3B8';
        bctx.font = '600 12px monospace';
        bctx.fillText('CHROMA SPACE STUDIOS · PR', qx + qw / 2, qrY + qrBoxSize + 92);
        bctx.fillText((es ? '11 · 12 · 13 DICIEMBRE 2026' : 'DECEMBER 11 · 12 · 13, 2026'), qx + qw / 2, qrY + qrBoxSize + 114);
        bctx.textAlign = 'left';

        // Footer
        bctx.fillStyle = '#0A0A0A';
        bctx.fillRect(0, CARD_H - 64, CARD_W, 64);
        bctx.fillStyle = '#FDCC0D';
        bctx.font = '700 14px monospace';
        bctx.fillText(
          (es ? 'REVERSO OFICIAL · PRESENTA ESTE QR EN EL ACCESO O EN NETWORKING' : 'OFFICIAL BACK · SHOW THIS QR AT THE ENTRANCE OR AT NETWORKING'),
          44,
          CARD_H - 26
        );

        bctx.strokeStyle = '#FDCC0D';
        bctx.lineWidth = 4;
        drawRoundedRect(bctx, 2, 2, CARD_W - 4, CARD_H - 4, 28);
        bctx.stroke();
      }
    }

    // 3. SOCIAL EXPORT CANVAS (Post 1080x1440 or Story 1080x1920)
    const socialCanvas = socialCanvasRef.current;
    if (socialCanvas && frontCanvas) {
      const sw = 1080;
      const sh = previewMode === 'story' ? 1920 : 1440;
      if (socialCanvas.width !== sw || socialCanvas.height !== sh) {
        socialCanvas.width = sw;
        socialCanvas.height = sh;
      }
      const sctx = socialCanvas.getContext('2d');
      if (sctx) {
        sctx.clearRect(0, 0, sw, sh);

        // Deep Space Vertical Poster Background
        const sbg = sctx.createLinearGradient(0, 0, 0, sh);
        sbg.addColorStop(0, '#090909');
        sbg.addColorStop(0.5, '#181818');
        sbg.addColorStop(1, '#070707');
        sctx.fillStyle = sbg;
        sctx.fillRect(0, 0, sw, sh);

        // Radial Spotlight behind badge
        const spot = sctx.createRadialGradient(
          sw / 2,
          sh * 0.52,
          40,
          sw / 2,
          sh * 0.52,
          560
        );
        spot.addColorStop(0, `${primaryAccent}44`);
        spot.addColorStop(1, 'transparent');
        sctx.fillStyle = spot;
        sctx.fillRect(0, 0, sw, sh);

        // Iconic Yellow SGX Lanyard Ribbons from top
        const cardScale = 0.88;
        const cw = CARD_W * cardScale;
        const ch = CARD_H * cardScale;
        const cx = (sw - cw) / 2;
        const cy = previewMode === 'story' ? 520 : 340;

        // Left & Right Lanyard Straps converging to badge slot
        sctx.save();
        sctx.fillStyle = '#EAB308';
        sctx.beginPath();
        sctx.moveTo(sw / 2 - 190, 0);
        sctx.lineTo(sw / 2 - 110, 0);
        sctx.lineTo(sw / 2 - 20, cy + 16);
        sctx.lineTo(sw / 2 - 85, cy + 16);
        sctx.closePath();
        sctx.fill();

        sctx.fillStyle = '#FDCC0D';
        sctx.beginPath();
        sctx.moveTo(sw / 2 + 110, 0);
        sctx.lineTo(sw / 2 + 190, 0);
        sctx.lineTo(sw / 2 + 85, cy + 16);
        sctx.lineTo(sw / 2 + 20, cy + 16);
        sctx.closePath();
        sctx.fill();

        // Metallic Clip
        sctx.fillStyle = '#434343';
        drawRoundedRect(sctx, sw / 2 - 46, cy - 12, 92, 34, 8);
        sctx.fill();
        sctx.restore();

        // Header Text Above Card
        sctx.fillStyle = '#FFFFFF';
        sctx.font = '900 38px Orbitron, sans-serif';
        sctx.textAlign = 'center';
        sctx.fillText(
          (es ? 'NOS VEMOS EN EL SPATIALGINEERS SUMMIT' : 'SEE YOU AT THE SPATIALGINEERS SUMMIT'),
          sw / 2,
          cy - 90
        );
        sctx.fillStyle = primaryAccent;
        sctx.font = '700 22px monospace';
        sctx.fillText(
          (es ? '11 · 12 · 13 DICIEMBRE 2026 · YOUTUBE LIVE · DÍA 3 SAN JUAN, PR' : 'DECEMBER 11 · 12 · 13, 2026 · YOUTUBE LIVE · DAY 3 SAN JUAN, PR'),
          sw / 2,
          cy - 48
        );

        // Draw Main Front or Back Badge with Drop Shadow
        sctx.save();
        sctx.shadowColor = 'rgba(0, 0, 0, 0.75)';
        sctx.shadowBlur = 45;
        sctx.shadowOffsetY = 24;
        sctx.drawImage(
          isFlippedBack && backCanvasRef.current
            ? backCanvasRef.current
            : frontCanvas,
          cx,
          cy,
          cw,
          ch
        );
        sctx.restore();

        // Bottom Callout Footer
        const footY = cy + ch + (previewMode === 'story' ? 120 : 85);
        sctx.fillStyle = '#FDCC0D';
        sctx.font = '900 30px Orbitron, sans-serif';
        sctx.fillText('#SpatialgineersSummit  ·  #SGX2026', sw / 2, footY);

        sctx.fillStyle = '#CBD5E1';
        sctx.font = '700 20px monospace';
        sctx.fillText(
          (es ? 'OBTÉN TU PASE Y CREDENCIAL HOLOGRÁFICA EN SUMMIT.SPATIALGINEERS.COM' : 'GET YOUR PASS AND HOLOGRAPHIC CREDENTIAL AT SUMMIT.SPATIALGINEERS.COM'),
          sw / 2,
          footY + 46
        );
        sctx.textAlign = 'left';
      }
    }
  }, [
    role,
    passType,
    fullName,
    jobTitle,
    organization,
    topicOrMission,
    socialHandle,
    ticketCode,
    selectedPillars,
    userPhotoImg,
    photoScale,
    photoOffsetX,
    photoOffsetY,
    previewMode,
    isFlippedBack,
    assetsTick
  ]);

  useEffect(() => {
    renderAllCanvases();
  }, [renderAllCanvases]);

  // Interactive 3D Pointer Drag / Tilt Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDraggingCard(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startRotX: rotX,
      startRotY: rotY
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    const relY = ((e.clientY - rect.top) / rect.height) * 100;
    setGlarePos({
      x: Math.max(0, Math.min(100, relX)),
      y: Math.max(0, Math.min(100, relY))
    });

    if (isDraggingCard && dragStartRef.current) {
      const dx = e.clientX - dragStartRef.current.clientX;
      const dy = e.clientY - dragStartRef.current.clientY;
      setRotY(
        Math.max(-35, Math.min(35, dragStartRef.current.startRotY + dx * 0.25))
      );
      setRotX(
        Math.max(-25, Math.min(25, dragStartRef.current.startRotX - dy * 0.22))
      );
    } else {
      // Hover tilt
      const tiltY = ((relX - 50) / 50) * 14;
      const tiltX = -((relY - 50) / 50) * 11;
      setRotY(tiltY);
      setRotX(tiltX);
    }
  };

  const handlePointerUpOrLeave = () => {
    setIsDraggingCard(false);
    dragStartRef.current = null;
    setRotX(4);
    setRotY(-6);
  };

  const trigger360Spin = () => {
    playCyberBurstSound();
    setIsSpinning360(true);
    setTimeout(() => setIsSpinning360(false), 900);
  };

  // Reward +150 XP & Dispatch Credential Export Event
  const notifyCredentialExported = () => {
    playScanSuccessSound();
    localStorage.setItem('sgx_holo_card_generated', 'true');
    recordActivity(
      'holo_card_export',
      'Credencial Holográfica SGX 3D Generada',
      `Credencial exportada (${role.toUpperCase()} - ${fullName})`,
      150
    );
    setExportBanner(
      (es ? '¡Credencial 3D descargada! +150 XP acreditados en tu SGX Pass' : '3D credential downloaded! +150 XP credited to your SGX Pass')
    );
    let image: string | undefined;
    try {
      image = frontCanvasRef.current?.toDataURL('image/jpeg', 0.82);
    } catch {
      image = undefined; // tainted canvas (remote image without CORS)
    }
    window.dispatchEvent(
      new CustomEvent('sgx:holo_card_exported', {
        detail: { role, name: fullName, passType, ticketCode, image }
      })
    );
  };

  // Download High-Res PNG
  const handleDownloadPng = () => {
    renderAllCanvases();
    let targetCanvas: HTMLCanvasElement | null = frontCanvasRef.current;
    let suffix = isFlippedBack ? 'reverso' : 'badge';

    if (previewMode === 'post' || previewMode === 'story') {
      targetCanvas = socialCanvasRef.current;
      suffix = previewMode;
    } else if (isFlippedBack && backCanvasRef.current) {
      targetCanvas = backCanvasRef.current;
    }

    if (!targetCanvas) return;
    const dataUrl = targetCanvas.toDataURL('image/png', 1.0);
    const cleanName = (fullName || 'spatialgineer')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `sgx-summit-2026-${role}-${cleanName}-${suffix}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    notifyCredentialExported();
  };

  // Native Mobile Share API
  const handleShareNative = async () => {
    renderAllCanvases();
    const targetCanvas =
      previewMode === 'badge3d'
        ? isFlippedBack
          ? backCanvasRef.current
          : frontCanvasRef.current
        : socialCanvasRef.current;
    if (!targetCanvas) return;

    try {
      const blob = await new Promise<Blob | null>((resolve) =>
        targetCanvas.toBlob(resolve, 'image/png', 1.0)
      );
      if (blob && navigator.share) {
        const file = new File([blob], 'sgx-credential-2026.png', {
          type: 'image/png'
        });
        await navigator.share({
          title: (es ? 'Mi Credencial Oficial — Spatialgineers Summit 2026' : 'My Official Credential — Spatialgineers Summit 2026'),
          text: socialCaptionText,
          files: [file]
        });
        notifyCredentialExported();
        return;
      }
    } catch {
      // Fallback to download
    }
    handleDownloadPng();
  };

  const socialCaptionText = (es ? `¡Acreditación lista como ${ROLE_META[role].badgeHeader} en el Spatialgineers Summit 2026! 🚀✨\n\n📍 Dic 11–13, 2026 · YouTube Live y SGX Showcase en Chroma Space Studios (San Juan, PR).\n🎫 Obtén tu pase y genera tu Holo Card 3D en summit.spatialgineers.com\n\n#SpatialgineersSummit #SGX2026 #SpatialComputing #PuertoRicoTech` : `Accredited as ${loc(ROLE_META[role], 'badgeHeader', language)} at the Spatialgineers Summit 2026! 🚀✨

📍 Dec 11–13, 2026 · YouTube Live and the SGX Showcase at Chroma Space Studios (San Juan, PR).
🎫 Get your pass and generate your 3D Holo Card at summit.spatialgineers.com

#SpatialgineersSummit #SGX2026 #SpatialComputing #PuertoRicoTech`);

  const applyQuickPreset = (targetRole: CredentialRoleKey) => {
    playUiChirp(820);
    setRole(targetRole);
    if (targetRole === 'visitante') {
      setJobTitle((es ? 'VISITANTE CON SGX PASS' : 'VISITOR WITH SGX PASS'));
      setTopicOrMission((es ? 'EXPLORACIÓN DEL NÚCLEO 3D & 6 PILARES' : 'EXPLORING THE 3D CORE & 6 PILLARS'));
    } else if (targetRole === 'speaker') {
      setJobTitle((es ? 'PONENTE OFICIAL · SGX STAGE' : 'OFFICIAL SPEAKER · SGX STAGE'));
      setTopicOrMission((es ? 'KEYNOTE: COMPUTACIÓN ESPACIAL' : 'KEYNOTE: SPATIAL COMPUTING'));
    } else if (targetRole === 'initiate') {
      setJobTitle((es ? 'INICIADO OFICIAL · SGX GUILD COHORT' : 'OFFICIAL INITIATE · SGX GUILD COHORT'));
      setTopicOrMission('SGX GUILD RANKED TRIALS PITCH SESSION');
    } else if (targetRole === 'sponsor') {
      setJobTitle((es ? 'PARTNER EJECUTIVO · SGX SHOWCASE' : 'EXECUTIVE PARTNER · SGX SHOWCASE'));
      setTopicOrMission((es ? 'ALIANZA TECNOLÓGICA 365 DÍAS' : '365-DAY TECHNOLOGY PARTNERSHIP'));
    }
  };

  return (
    <div className="w-full bg-[#0B0B0B] text-slate-100 font-mono select-none">
      {/* Hidden File Input for Client-Side Photo Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        className="hidden"
      />

      {/* XP Export Celebration Banner */}
      {exportBanner && (
        <div className="bg-emerald-950/95 border-b border-emerald-400 px-4 py-2 text-center text-xs font-mono text-emerald-300 font-bold flex items-center justify-center gap-2 animate-fadeIn">
          <Award className="w-4 h-4 text-[#FDCC0D] shrink-0" />
          <span>{exportBanner}</span>
        </div>
      )}

      {/* Main Responsive Grid: Sticky 3D Stage on Top (Mobile) / Left Column (Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 p-3 sm:p-5 max-w-[1650px] mx-auto">
        {/* =====================================================================
            COLUMN 1 (7 Cols Desktop): INTERACTIVE 3D HOLOGRAPHIC STAGE
           ===================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Stage Top Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#141414]/90 border border-cyan-500/35 px-3 py-2">
            {/* Format Switcher: 3D Badge vs Post 3:4 vs Story 9:16 */}
            <div className="flex items-center gap-1">
              {[
                { id: 'badge3d', label: (es ? 'TARJETA 3D INTERACTIVA' : 'INTERACTIVE 3D CARD') },
                { id: 'post', label: 'POST 3:4' },
                { id: 'story', label: 'STORY 9:16' }
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  type="button"
                  onClick={() => {
                    playUiChirp(760);
                    setPreviewMode(fmt.id as PreviewFormatMode);
                  }}
                  className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase transition-all cursor-pointer border ${
                    previewMode === fmt.id
                      ? 'bg-[#00DDFF] text-black border-[#00DDFF] shadow-[0_0_12px_rgba(0, 221, 255,0.4)]'
                      : 'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-cyan-400'
                  }`}
                >
                  {fmt.label}
                </button>
              ))}
            </div>

            {/* 3D Flip & Spin Controls */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  playHoloFocusSound();
                  setIsFlippedBack((f) => !f);
                }}
                className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold uppercase border flex items-center gap-1 transition-all cursor-pointer ${
                  isFlippedBack
                    ? 'bg-[#FDCC0D] text-black border-[#FDCC0D]'
                    : 'bg-slate-900 text-cyan-300 border-cyan-500/50 hover:bg-cyan-500 hover:text-black'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{isFlippedBack ? (es ? 'VER ANVERSO' : 'VIEW FRONT') : (es ? 'VER REVERSO QR' : 'VIEW QR BACK')}</span>
              </button>

              <button
                type="button"
                onClick={trigger360Spin}
                className="px-2.5 py-1 bg-slate-900 hover:bg-[#32527B] text-[#FDCC0D] border border-[#FDCC0D]/50 text-[10px] sm:text-[11px] font-bold uppercase flex items-center gap-1 transition-all cursor-pointer"
                title={es ? 'Giro Holográfico 360°' : '360° Holographic Flip'}
              >
                <RotateCw
                  className={`w-3.5 h-3.5 ${isSpinning360 ? 'animate-spin' : ''}`}
                />
                <span className="hidden sm:inline">{es ? 'GIRO 360°' : '360° FLIP'}</span>
              </button>
            </div>
          </div>

          {/* 3D Interactive Viewport */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUpOrLeave}
            onPointerLeave={handlePointerUpOrLeave}
            className="relative w-full min-h-[270px] sm:min-h-[380px] lg:min-h-[470px] bg-gradient-to-b from-[#0F0F0F] via-[#171717] to-[#0A0A0A] border border-cyan-500/40 flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden cursor-grab active:cursor-grabbing touch-none"
            style={{
              perspective: '1300px',
              boxShadow: 'inset 0 0 60px rgba(0, 221, 255, 0.08)'
            }}
          >
            {/* Background Ambient Cyber Grid */}
            <div
              className="absolute inset-0 pointer-events-none opacity-25"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 50%, rgba(0, 221, 255,0.22) 0%, transparent 65%), linear-gradient(rgba(0, 221, 255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 221, 255,0.06) 1px, transparent 1px)',
                backgroundSize: '100% 100%, 28px 28px, 28px 28px'
              }}
            />

            {/* Mode A: 3D Dual-Sided Flippable Badge */}
            <div
              className={`relative w-full max-w-[640px] aspect-[1050/660] transition-transform duration-200 ease-out ${
                previewMode === 'badge3d' ? 'block' : 'hidden'
              }`}
              style={{
                transformStyle: 'preserve-3d',
                transform: `rotateX(${rotX}deg) rotateY(${
                  rotY +
                  (isFlippedBack ? 180 : 0) +
                  (isSpinning360 ? 360 : 0)
                }deg)`
              }}
            >
              {/* FRONT FACE */}
              <div
                className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <canvas
                  ref={frontCanvasRef}
                  width={CARD_W}
                  height={CARD_H}
                  className="w-full h-full object-contain block"
                />
                {/* Iridescent Holographic Foil Overlay */}
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-screen transition-opacity duration-150"
                  style={{
                    opacity: foilIntensity * 0.55,
                    background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.55) 0%, rgba(0, 221, 255,0.28) 22%, rgba(253,204,13,0.22) 45%, rgba(168,85,247,0.18) 68%, transparent 85%)`
                  }}
                />
              </div>

              {/* BACK FACE */}
              <div
                className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.85)]"
                style={{
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)'
                }}
              >
                <canvas
                  ref={backCanvasRef}
                  width={CARD_W}
                  height={CARD_H}
                  className="w-full h-full object-contain block"
                />
                <div
                  className="absolute inset-0 pointer-events-none mix-blend-screen"
                  style={{
                    opacity: foilIntensity * 0.5,
                    background: `radial-gradient(circle at ${
                      100 - glarePos.x
                    }% ${glarePos.y}%, rgba(253,204,13,0.5) 0%, rgba(0, 221, 255,0.25) 35%, transparent 80%)`
                  }}
                />
              </div>
            </div>

            {/* Mode B: Social Poster (Post 3:4 or Story 9:16) */}
            <div
              className={`relative max-h-[420px] sm:max-h-[500px] flex items-center justify-center transition-transform duration-200 ${
                previewMode !== 'badge3d' ? 'block' : 'hidden'
              }`}
              style={{
                transform: `rotateX(${rotX * 0.5}deg) rotateY(${rotY * 0.5}deg)`
              }}
            >
              <canvas
                ref={socialCanvasRef}
                width={1080}
                height={1440}
                className="max-h-[400px] sm:max-h-[480px] w-auto object-contain rounded-xl border border-cyan-400/50 shadow-2xl"
              />
            </div>

            {/* Interactive Touch Hint Footer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 w-full text-[10px] text-slate-400 z-10 px-1">
              <span className="flex items-center gap-1 text-cyan-300 font-bold">
                <Smartphone className="w-3.5 h-3.5" />
                <span>
                  {es ? 'ARRASTRA PARA INCLINAR EN 3D · TOCA "VER REVERSO QR" PARA GIRAR' : 'DRAG TO TILT IN 3D · TAP "VIEW QR BACK" TO FLIP'}
                </span>
              </span>
              <span className="text-[#FDCC0D] font-bold">
                {es ? '100% PRIVADO EN TU NAVEGADOR' : '100% PRIVATE IN YOUR BROWSER'}
              </span>
            </div>
          </div>

          {/* Quick Primary Action Bar Directly Under the 3D Card */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-2.5 px-3 bg-[#1E1E1E] hover:bg-cyan-500 text-cyan-300 hover:text-black border border-cyan-400 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{userPhotoImg ? (es ? 'Cambiar Mi Foto' : 'Change My Photo') : (es ? 'Subir Mi Foto' : 'Upload My Photo')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="py-2.5 px-3 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-black text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_18px_rgba(253,204,13,0.4)]"
            >
              <Download className="w-4 h-4" />
              <span>{es ? 'Descargar PNG (+150 XP)' : 'Download PNG (+150 XP)'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareNative}
              className="col-span-2 sm:col-span-1 py-2.5 px-3 bg-cyan-500/20 hover:bg-cyan-400 text-cyan-200 hover:text-black border border-cyan-400/70 font-bold text-xs uppercase flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>{es ? 'Compartir Pase' : 'Share Pass'}</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            COLUMN 2 (5 Cols Desktop): ERGONOMIC MOBILE-FRIENDLY CONTROL STUDIO
           ===================================================================== */}
        <div className="lg:col-span-5 flex flex-col bg-[#121212] border border-slate-800">
          {/* Thumb-Friendly Tab Bar */}
          <div className="grid grid-cols-4 border-b border-slate-800 bg-[#0B0B0B]">
            {[
              { id: 'identity', label: (es ? '1. Datos' : '1. Details'), icon: User },
              { id: 'photo', label: (es ? '2. Foto' : '2. Photo'), icon: Camera },
              { id: 'pillars', label: (es ? '3. Pilares' : '3. Pillars'), icon: Layers },
              { id: 'export', label: (es ? '4. Redes' : '4. Social'), icon: Share2 }
            ].map((tab) => {
              const Icon = tab.icon;
              const active = mobileTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    playUiChirp(740);
                    setMobileTab(tab.id as MobileControlTab);
                  }}
                  className={`py-2.5 px-2 text-[11px] font-bold uppercase flex items-center justify-center gap-1.5 border-b-2 transition-all cursor-pointer ${
                    active
                      ? 'border-[#00DDFF] text-[#00DDFF] bg-[#1B1B1B]'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Body */}
          <div className="p-4 space-y-4 flex-1">
            {/* TAB 1: IDENTITY & ROLE */}
            {mobileTab === 'identity' && (
              <div className="space-y-3.5 animate-fadeIn">
                <div>
                  <label className="block text-[10px] font-bold text-cyan-300 uppercase mb-1.5">
                    {es ? 'ROL DE ACREDITACIÓN EN EL SUMMIT:' : 'SUMMIT ACCREDITATION ROLE:'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      ['visitante', 'speaker', 'initiate', 'sponsor'] as CredentialRoleKey[]
                    ).map((rKey) => {
                      const active = role === rKey;
                      return (
                        <button
                          key={rKey}
                          type="button"
                          onClick={() => applyQuickPreset(rKey)}
                          className={`p-2 text-left border text-xs font-bold transition-all cursor-pointer flex items-center justify-between ${
                            active
                              ? 'bg-cyan-500/20 border-[#00DDFF] text-white shadow-[0_0_12px_rgba(0, 221, 255,0.2)]'
                              : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600'
                          }`}
                        >
                          <span>{loc(ROLE_META[rKey], 'label', language)}</span>
                          {active && (
                            <span className="w-2 h-2 rounded-full bg-[#00DDFF]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Visitor Pass Type Selector */}
                {role === 'visitante' && (
                  <div>
                    <label className="block text-[10px] font-bold text-[#FDCC0D] uppercase mb-1.5">
                      {es ? 'MODALIDAD DEL SGX PASS:' : 'SGX PASS TYPE:'}
                    </label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['digital', 'showcase', 'vip'] as VisitorPassType[]).map(
                        (pt) => {
                          const active = passType === pt;
                          return (
                            <button
                              key={pt}
                              type="button"
                              onClick={() => {
                                playUiChirp(780);
                                setPassType(pt);
                              }}
                              className={`p-2 text-center border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                                active
                                  ? 'bg-[#FDCC0D]/20 border-[#FDCC0D] text-[#FDCC0D]'
                                  : 'bg-slate-950 border-slate-800 text-slate-400'
                              }`}
                            >
                              {loc(PASS_TYPE_META[pt], 'label', language).replace('Pase ', '')}
                            </button>
                          );
                        }
                      )}
                    </div>
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">
                      {es ? 'Nombre o Nickname en la Credencial' : 'Name or Nickname on the Credential'}
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={es ? 'Ej. Alex Rivera' : 'E.g. Alex Rivera'}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-[#00DDFF] text-white text-xs font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">
                      {es ? 'Distinción / Cargo / Especialidad' : 'Distinction / Title / Specialty'}
                    </label>
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder={es ? 'VISITANTE CON SGX PASS' : 'VISITOR WITH SGX PASS'}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-[#00DDFF] text-white text-xs outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        {es ? 'Organización / Universidad / Estudio' : 'Organization / University / Studio'}
                      </label>
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        placeholder="Spatialgineers"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-[#00DDFF] text-white text-xs outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase mb-1">
                        {es ? 'Usuario Social (@handle)' : 'Social Handle (@handle)'}
                      </label>
                      <input
                        type="text"
                        value={socialHandle}
                        onChange={(e) => setSocialHandle(e.target.value)}
                        placeholder="@tu_usuario"
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-[#00DDFF] text-white text-xs outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase mb-1">
                      {role === 'speaker'
                        ? (es ? 'Título de tu Charla / Panel' : 'Your Talk / Panel Title')
                        : role === 'initiate'
                        ? (es ? 'Proyecto Ranked Trials' : 'Ranked Trials Project')
                        : (es ? 'Misión o Interés en el Summit' : 'Mission or Interest at the Summit')}
                    </label>
                    <input
                      type="text"
                      value={topicOrMission}
                      onChange={(e) => setTopicOrMission(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-[#00DDFF] text-white text-xs outline-none"
                    />
                  </div>
                </div>

                {onOpenTicketModal && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">
                      {hasRegisteredTicket
                        ? (es ? '✓ Código sincronizado con tu SGX Pass' : '✓ Code synced with your SGX Pass')
                        : (es ? '¿Aún no tienes tu SGX Pass?' : 'Don\'t have your SGX Pass yet?')}
                    </span>
                    <button
                      type="button"
                      onClick={onOpenTicketModal}
                      className="px-2.5 py-1 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] text-[#FDCC0D] hover:text-black border border-[#FDCC0D]/60 text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1"
                    >
                      <Ticket className="w-3 h-3" />
                      <span>
                        {hasRegisteredTicket
                          ? (es ? 'Ver mi SGX Pass' : 'View my SGX Pass')
                          : (es ? 'Forjar SGX Pass (+120 XP)' : 'Forge SGX Pass (+120 XP)')}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PHOTO & FRAMING */}
            {mobileTab === 'photo' && (
              <div className="space-y-4 animate-fadeIn">
                <div className="p-4 bg-slate-950 border border-dashed border-cyan-500/60 text-center space-y-2.5">
                  <Camera className="w-8 h-8 text-[#00DDFF] mx-auto" />
                  <div className="text-xs font-bold text-white uppercase">
                    {es ? 'Fotografía de Retrato (100% Local y Privada)' : 'Portrait Photo (100% Local and Private)'}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {es ? 'Tu imagen se procesa directamente en el motor Canvas 3D de tu dispositivo sin subirse a ningún servidor externo.' : 'Your image is processed directly in your device\'s 3D Canvas engine without being uploaded to any external server.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-[#00DDFF] hover:bg-[#FDCC0D] text-black font-extrabold text-xs uppercase transition-colors cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{es ? 'Seleccionar Foto desde mi Dispositivo' : 'Select a Photo from my Device'}</span>
                  </button>
                </div>

                {/* Zoom & Pan Sliders */}
                <div className="space-y-3 bg-slate-950/80 p-3 border border-slate-800">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-bold">
                        {es ? 'Zoom de Retrato' : 'Portrait Zoom'}
                      </span>
                      <span className="text-cyan-400">
                        {Math.round(photoScale * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="2.4"
                      step="0.02"
                      value={photoScale}
                      onChange={(e) => setPhotoScale( parseFloat(e.target.value))}
                      className="w-full accent-[#00DDFF] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-bold">
                        {es ? 'Encuadre Horizontal (X)' : 'Horizontal Framing (X)'}
                      </span>
                      <span className="text-cyan-400">{photoOffsetX}px</span>
                    </div>
                    <input
                      type="range"
                      min="-160"
                      max="160"
                      step="2"
                      value={photoOffsetX}
                      onChange={(e) =>
                        setPhotoOffsetX(parseInt(e.target.value, 10))
                      }
                      className="w-full accent-[#00DDFF] cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-slate-300 font-bold">
                        {es ? 'Encuadre Vertical (Y)' : 'Vertical Framing (Y)'}
                      </span>
                      <span className="text-cyan-400">{photoOffsetY}px</span>
                    </div>
                    <input
                      type="range"
                      min="-160"
                      max="160"
                      step="2"
                      value={photoOffsetY}
                      onChange={(e) =>
                        setPhotoOffsetY(parseInt(e.target.value, 10))
                      }
                      className="w-full accent-[#00DDFF] cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setPhotoScale(1.08);
                      setPhotoOffsetX(0);
                      setPhotoOffsetY(0);
                    }}
                    className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-bold uppercase cursor-pointer"
                  >
                    {es ? 'Restablecer Encuadre' : 'Reset Framing'}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: SGX PILLARS & HOLOGRAPHIC SHEEN */}
            {mobileTab === 'pillars' && (
              <div className="space-y-4 animate-fadeIn">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-cyan-300 uppercase">
                      {es ? 'ELIGE HASTA 2 PILARES SGX DE AFINIDAD:' : 'PICK UP TO 2 SGX AFFINITY PILLARS:'}
                    </label>
                    <span className="text-[10px] text-[#FDCC0D] font-bold">
                      {selectedPillars.length}/2 ACTIVOS
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {SGX_PILLARS.map((pillar) => {
                      const isSel = selectedPillars.includes(pillar.id);
                      return (
                        <button
                          key={pillar.id}
                          type="button"
                          onClick={() => togglePillar(pillar.id)}
                          className={`p-2.5 border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                            isSel
                              ? 'bg-[#1F1F1F] border-[#00DDFF] shadow-[0_0_12px_rgba(0, 221, 255,0.2)]'
                              : 'bg-slate-950 border-slate-800 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={pillar.iconUrl}
                            alt={pillar.name}
                            className="w-7 h-7 object-contain shrink-0"
                          />
                          <div className="min-w-0">
                            <div
                              className="text-[11px] font-black font-['Orbitron',sans-serif] truncate"
                              style={{ color: pillar.color }}
                            >
                              {pillar.name}
                            </div>
                            <div className="text-[9px] text-slate-400 truncate">
                              {loc(pillar, 'tag', language)}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Holographic Foil Slider */}
                <div className="p-3 bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-white font-bold">
                      {es ? 'Intensidad de Foil Holográfico 3D' : '3D Holographic Foil Intensity'}
                    </span>
                    <span className="text-[#FDCC0D] font-bold">
                      {Math.round(foilIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={foilIntensity}
                    onChange={(e) =>
                      setFoilIntensity(parseFloat(e.target.value))
                    }
                    className="w-full accent-[#FDCC0D] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {/* TAB 4: EXPORT & SOCIAL CAPTION */}
            {mobileTab === 'export' && (
              <div className="space-y-3.5 animate-fadeIn">
                <div className="p-3 bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-cyan-300 uppercase">
                      {es ? 'CAPTION OFICIAL PARA INSTAGRAM / LINKEDIN / X:' : 'OFFICIAL CAPTION FOR INSTAGRAM / LINKEDIN / X:'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(socialCaptionText);
                        setCopiedCaption(true);
                        playUiChirp(880);
                        setTimeout(() => setCopiedCaption(false), 2200);
                      }}
                      className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-400 text-cyan-300 hover:text-black border border-cyan-400/50 text-[10px] font-bold uppercase flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCaption ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>{es ? 'COPIADO' : 'COPIED'}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>{es ? 'COPIAR TEXTO' : 'COPY TEXT'}</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-300 whitespace-pre-line leading-relaxed bg-[#0B0B0B] p-2.5 border border-slate-800/80">
                    {socialCaptionText}
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleDownloadPng}
                    className="w-full py-3 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-black text-xs uppercase flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {es ? 'DESCARGAR CREDENCIAL EN ALTA RESOLUCIÓN (+150 XP)' : 'DOWNLOAD HIGH-RESOLUTION CREDENTIAL (+150 XP)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareNative}
                    className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-400 text-cyan-200 hover:text-black border border-cyan-400 font-bold text-xs uppercase flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>{es ? 'COMPARTIR DIRECTO DESDE MÓVIL' : 'SHARE DIRECTLY FROM PHONE'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
