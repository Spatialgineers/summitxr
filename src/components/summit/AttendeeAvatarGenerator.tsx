import React, { useState, useRef, useEffect } from 'react';
import { 
  Dices, 
  Download, 
  Save, 
  Sparkles, 
  Check, 
  Copy, 
  RotateCcw, 
  Layers, 
  Palette, 
  Shield, 
  Radio,
  Eye,
  Award,
  X
} from 'lucide-react';
import { playUiChirp, playDiceRollSound, playCyberBurstSound } from '../../lib/cyberAudioEngine';
import { useAuth } from '../../context/AuthContext';

export interface AvatarConfig {
  pillar: 'SGX.SYNTHESIZE' | 'SGX.SYSTEM' | 'SGX.STAGE' | 'SGX.SHOWCASE' | 'SGX.SPARK' | 'SGX.STORY';
  style: 'pixel' | 'lowpoly';
  helmet: 'bubble' | 'cyber_visor' | 'lowpoly_facet' | 'mecha_crown' | 'holo_dome' | 'orbital_pilot';
  suit: 'eva_flight' | 'cyber_jacket' | 'heavy_exo' | 'synthetic_pilot' | 'san_juan_linen';
  visorFx: 'scanline' | 'matrix_grid' | 'reticle' | 'solar_glare' | 'void_stealth';
  accessory: 'none' | 'comms_antenna' | 'holo_halo' | 'dj_cans' | 'neural_horns';
  backdrop: 'grid' | 'sunset' | 'starfield' | 'hex' | 'transparent';
  rankTag: string;
  seed: string;
}

export const PILLAR_COLORS = {
  'SGX.STORY': { primary: '#3B82F6', secondary: '#1D4ED8', bg: '#0c1d3b', name: 'SGX.STORY', desc: 'Narrativa & Worldbuilding' },
  'SGX.SHOWCASE': { primary: '#00DDFF', secondary: '#0088FF', bg: '#042338', name: 'SGX.SHOWCASE', desc: 'Marcas & Experiencias' },
  'SGX.SPARK': { primary: '#F59E0B', secondary: '#B87000', bg: '#2e1b00', name: 'SGX.SPARK', desc: 'Hardware & WebXR Devices' },
  'SGX.STAGE': { primary: '#FDCC0D', secondary: '#D97706', bg: '#332600', name: 'SGX.STAGE', desc: 'Live Broadcast & CYOA' },
  'SGX.SYSTEM': { primary: '#38BDF8', secondary: '#0284C7', bg: '#032536', name: 'SGX.SYSTEM', desc: 'Infraestructura & Edge' },
  'SGX.SYNTHESIZE': { primary: '#00DDFF', secondary: '#0088FF', bg: '#002233', name: 'SGX.SYNTHESIZE', desc: 'IA Generativa & Shaders' },
};

const DEFAULT_AVATAR: AvatarConfig = {
  pillar: 'SGX.STAGE',
  style: 'lowpoly',
  helmet: 'lowpoly_facet',
  suit: 'eva_flight',
  visorFx: 'scanline',
  accessory: 'holo_halo',
  backdrop: 'grid',
  rankTag: 'SPATIALGINEER',
  seed: 'sgx_initial_01'
};

interface AttendeeAvatarGeneratorProps {
  onClose?: () => void;
  onApplyAvatar?: (avatarDataUrl: string, config: AvatarConfig) => void;
}

export const AttendeeAvatarGenerator: React.FC<AttendeeAvatarGeneratorProps> = ({
  onClose,
  onApplyAvatar
}) => {
  const { playerProfile, savePlayerProfile } = useAuth();
  const [config, setConfig] = useState<AvatarConfig>(() => {
    try {
      const saved = localStorage.getItem('sgx_attendee_custom_avatar');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_AVATAR;
  });

  const [activeCategory, setActiveCategory] = useState<'PILLAR' | 'HELMET' | 'SUIT' | 'VISOR' | 'ACCESSORY' | 'BADGE'>('PILLAR');
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [copiedSvg, setCopiedSvg] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const colors = PILLAR_COLORS[config.pillar];

  const handleRandomize = () => {
    playDiceRollSound();
    const pillars: AvatarConfig['pillar'][] = ['SGX.SYNTHESIZE', 'SGX.SYSTEM', 'SGX.STAGE', 'SGX.SHOWCASE', 'SGX.SPARK', 'SGX.STORY'];
    const helmets: AvatarConfig['helmet'][] = ['bubble', 'cyber_visor', 'lowpoly_facet', 'mecha_crown', 'holo_dome', 'orbital_pilot'];
    const suits: AvatarConfig['suit'][] = ['eva_flight', 'cyber_jacket', 'heavy_exo', 'synthetic_pilot', 'san_juan_linen'];
    const visors: AvatarConfig['visorFx'][] = ['scanline', 'matrix_grid', 'reticle', 'solar_glare', 'void_stealth'];
    const accessories: AvatarConfig['accessory'][] = ['none', 'comms_antenna', 'holo_halo', 'dj_cans', 'neural_horns'];
    const backdrops: AvatarConfig['backdrop'][] = ['grid', 'sunset', 'starfield', 'hex'];
    const styles: AvatarConfig['style'][] = ['pixel', 'lowpoly'];
    const tags = ['SPATIALGINEER', 'ARCHITECT', 'CREATIVE PRODUCER', 'AI FOUNDER', 'DEV GUILD', 'VIP GUEST'];

    const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

    setConfig({
      pillar: pick(pillars),
      style: pick(styles),
      helmet: pick(helmets),
      suit: pick(suits),
      visorFx: pick(visors),
      accessory: pick(accessories),
      backdrop: pick(backdrops),
      rankTag: pick(tags),
      seed: Math.random().toString(36).substring(2, 8)
    });
  };

  const handleSaveAndApply = async () => {
    playCyberBurstSound('kudos');
    try {
      localStorage.setItem('sgx_attendee_custom_avatar', JSON.stringify(config));
    } catch {}

    // Generate raster data URL via off-screen canvas
    if (svgRef.current) {
      const svgString = new XMLSerializer().serializeToString(svgRef.current);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const blobURL = window.URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, 400, 400);
          const dataUrl = canvas.toDataURL('image/png');
          
          if (onApplyAvatar) {
            onApplyAvatar(dataUrl, config);
          }
          if (savePlayerProfile) {
            savePlayerProfile({
              avatar: dataUrl,
              avatarSeed: config.seed
            });
          }
        }
        window.URL.revokeObjectURL(blobURL);
      };
      img.src = blobURL;
    }

    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  const handleDownloadPng = () => {
    playUiChirp(840);
    if (!svgRef.current) return;

    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = window.URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = config.style !== 'pixel';
        ctx.drawImage(img, 0, 0, 512, 512);
        const a = document.createElement('a');
        a.download = `spatialgineer_avatar_${config.pillar.toLowerCase()}_${config.seed}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
      }
      window.URL.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  };

  const handleCopySvg = () => {
    playUiChirp(920);
    if (!svgRef.current) return;
    const svgString = new XMLSerializer().serializeToString(svgRef.current);
    navigator.clipboard.writeText(svgString);
    setCopiedSvg(true);
    setTimeout(() => setCopiedSvg(false), 2000);
  };

  // Render SVG layers dynamically
  const renderBackdrop = () => {
    if (config.backdrop === 'transparent') return null;
    if (config.backdrop === 'sunset') {
      return (
        <>
          <defs>
            <linearGradient id="sunsetGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2b0e38" />
              <stop offset="50%" stopColor="#BE123C" />
              <stop offset="100%" stopColor="#FDCC0D" />
            </linearGradient>
          </defs>
          <rect width="200" height="200" fill="url(#sunsetGrad)" />
          <circle cx="100" cy="140" r="45" fill="#FDCC0D" opacity="0.8" />
        </>
      );
    }
    if (config.backdrop === 'starfield') {
      return (
        <>
          <rect width="200" height="200" fill="#090909" />
          <circle cx="30" cy="40" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="160" cy="30" r="2" fill={colors.primary} opacity="0.9" />
          <circle cx="170" cy="140" r="1" fill="#ffffff" opacity="0.6" />
          <circle cx="45" cy="165" r="2.5" fill={colors.primary} opacity="0.7" />
          <circle cx="110" cy="20" r="1" fill="#ffffff" opacity="0.5" />
          <circle cx="85" cy="60" r="1.5" fill="#ffffff" opacity="0.9" />
        </>
      );
    }
    if (config.backdrop === 'hex') {
      return (
        <>
          <rect width="200" height="200" fill="#0f0f0f" />
          <polygon points="100,15 170,55 170,145 100,185 30,145 30,55" fill="none" stroke={colors.primary} strokeWidth="2" opacity="0.4" />
          <polygon points="100,35 150,65 150,135 100,165 50,135 50,65" fill="none" stroke={colors.secondary} strokeWidth="1.5" opacity="0.3" strokeDasharray="4 2" />
        </>
      );
    }
    // Default cyber grid
    return (
      <>
        <rect width="200" height="200" fill="#0b0b0b" />
        <line x1="0" y1="50" x2="200" y2="50" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
        <line x1="0" y1="100" x2="200" y2="100" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
        <line x1="0" y1="150" x2="200" y2="150" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
        <line x1="50" y1="0" x2="50" y2="200" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
        <line x1="100" y1="0" x2="100" y2="200" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
        <line x1="150" y1="0" x2="150" y2="200" stroke={colors.primary} strokeWidth="0.5" opacity="0.2" />
      </>
    );
  };

  const renderSuit = () => {
    const isPixel = config.style === 'pixel';
    if (config.suit === 'heavy_exo') {
      return (
        <g>
          {/* Heavy Exo Armor Body */}
          <path d="M 40 155 L 70 140 L 130 140 L 160 155 L 170 200 L 30 200 Z" fill="#222222" stroke={colors.secondary} strokeWidth="2" />
          {/* Shoulder Plates */}
          <polygon points="30,150 60,140 50,175 25,170" fill={colors.primary} opacity="0.8" />
          <polygon points="170,150 140,140 150,175 175,170" fill={colors.primary} opacity="0.8" />
          {/* Chest Reactor Core */}
          <circle cx="100" cy="175" r="10" fill="#000000" stroke={colors.primary} strokeWidth="2" />
          <circle cx="100" cy="175" r="6" fill={colors.primary} className="animate-pulse" />
        </g>
      );
    }
    if (config.suit === 'cyber_jacket') {
      return (
        <g>
          <path d="M 45 155 L 75 142 L 125 142 L 155 155 L 165 200 L 35 200 Z" fill="#1A1A1A" />
          {/* Cyber Collar */}
          <polygon points="65,142 85,175 100,175 75,142" fill={colors.secondary} />
          <polygon points="135,142 115,175 100,175 125,142" fill={colors.secondary} />
          {/* Neon Trim */}
          <line x1="100" y1="175" x2="100" y2="200" stroke={colors.primary} strokeWidth="3" />
          <line x1="50" y1="165" x2="65" y2="200" stroke={colors.primary} strokeWidth="1.5" />
          <line x1="150" y1="165" x2="135" y2="200" stroke={colors.primary} strokeWidth="1.5" />
        </g>
      );
    }
    if (config.suit === 'san_juan_linen') {
      return (
        <g>
          {/* San Juan Spatial Linen Suit */}
          <path d="M 45 155 L 75 145 L 125 145 L 155 155 L 165 200 L 35 200 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          <polygon points="60,150 100,185 140,150 100,165" fill={colors.primary} opacity="0.75" />
          <circle cx="100" cy="180" r="4" fill="#FDCC0D" />
        </g>
      );
    }
    // Default EVA Flight suit
    return (
      <g>
        <path d="M 40 155 L 70 145 L 130 145 L 160 155 L 170 200 L 30 200 Z" fill="#2B2B2B" stroke="#434343" strokeWidth="1.5" />
        {/* Harness Straps */}
        <line x1="68" y1="145" x2="68" y2="200" stroke={colors.primary} strokeWidth="4" />
        <line x1="132" y1="145" x2="132" y2="200" stroke={colors.primary} strokeWidth="4" />
        <rect x="85" y="165" width="30" height="20" fill="#1b1b1b" stroke={colors.secondary} strokeWidth="1.5" />
        <circle cx="94" cy="175" r="2.5" fill="#10B981" />
        <circle cx="106" cy="175" r="2.5" fill={colors.primary} />
      </g>
    );
  };

  const renderHelmet = () => {
    const isPixel = config.style === 'pixel';

    if (config.helmet === 'lowpoly_facet') {
      return (
        <g>
          {/* Faceted Low-Poly Helmet */}
          <polygon points="100,30 145,50 160,95 140,140 100,150 60,140 40,95 55,50" fill="#1e1e1e" stroke={colors.primary} strokeWidth="2" />
          {/* Facet lines */}
          <line x1="100" y1="30" x2="100" y2="65" stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="55" y1="50" x2="100" y2="65" stroke={colors.secondary} strokeWidth="1.5" />
          <line x1="145" y1="50" x2="100" y2="65" stroke={colors.secondary} strokeWidth="1.5" />
          {/* Center Visor Hexagon */}
          <polygon points="100,65 140,75 140,115 100,125 60,115 60,75" fill="#080808" stroke={colors.primary} strokeWidth="2.5" />
        </g>
      );
    }

    if (config.helmet === 'cyber_visor') {
      return (
        <g>
          {/* Cyber Slim Helmet */}
          <ellipse cx="100" cy="95" rx="55" ry="50" fill="#171717" stroke="#434343" strokeWidth="2" />
          {/* Long Horizontal Cyber Visor */}
          <rect x="42" y="78" width="116" height="34" rx="6" fill="#090909" stroke={colors.primary} strokeWidth="2.5" />
          <line x1="42" y1="95" x2="158" y2="95" stroke={colors.secondary} strokeWidth="1" strokeDasharray="3 2" />
        </g>
      );
    }

    if (config.helmet === 'mecha_crown') {
      return (
        <g>
          {/* Crown Horns */}
          <polygon points="50,60 30,20 60,45" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
          <polygon points="150,60 170,20 140,45" fill={colors.secondary} stroke={colors.primary} strokeWidth="1.5" />
          {/* Base */}
          <polygon points="100,35 150,60 155,110 135,145 65,145 45,110 50,60" fill="#222222" stroke={colors.primary} strokeWidth="2" />
          {/* Visor Area */}
          <path d="M 60 80 Q 100 65 140 80 L 135 115 Q 100 130 65 115 Z" fill="#0f0f0f" stroke={colors.primary} strokeWidth="2" />
        </g>
      );
    }

    if (config.helmet === 'holo_dome') {
      return (
        <g>
          {/* Holographic transparent dome */}
          <circle cx="100" cy="95" r="54" fill="none" stroke={colors.primary} strokeWidth="2.5" />
          <circle cx="100" cy="95" r="50" fill={colors.bg} opacity="0.5" />
          {/* Inner skull contour */}
          <ellipse cx="100" cy="95" rx="36" ry="40" fill="#292929" opacity="0.8" />
          {/* Glowing Eyes */}
          <circle cx="85" cy="92" r="4" fill={colors.primary} />
          <circle cx="115" cy="92" r="4" fill={colors.primary} />
        </g>
      );
    }

    if (config.helmet === 'orbital_pilot') {
      return (
        <g>
          <path d="M 48 95 C 48 55, 152 55, 152 95 C 152 135, 125 150, 100 150 C 75 150, 48 135, 48 95 Z" fill="#2b2b2b" stroke="#575757" strokeWidth="2" />
          {/* Gold Polarized Pilot Shield */}
          <path d="M 58 92 C 58 70, 142 70, 142 92 C 142 120, 120 128, 100 128 C 80 128, 58 120, 58 92 Z" fill="#0A0A0A" stroke="#FDCC0D" strokeWidth="2.5" />
        </g>
      );
    }

    // Default Astro Bubble
    return (
      <g>
        <circle cx="100" cy="95" r="52" fill="#222222" stroke="#575757" strokeWidth="2" />
        <ellipse cx="100" cy="95" rx="42" ry="34" fill="#090909" stroke={colors.primary} strokeWidth="2.5" />
      </g>
    );
  };

  const renderVisorFx = () => {
    if (config.visorFx === 'scanline') {
      return (
        <g>
          <line x1="62" y1="92" x2="138" y2="92" stroke={colors.primary} strokeWidth="2" opacity="0.9" />
          <line x1="66" y1="98" x2="134" y2="98" stroke={colors.secondary} strokeWidth="1" opacity="0.6" />
        </g>
      );
    }
    if (config.visorFx === 'matrix_grid') {
      return (
        <g opacity="0.7">
          <line x1="75" y1="80" x2="75" y2="115" stroke={colors.primary} strokeWidth="1" strokeDasharray="2 2" />
          <line x1="100" y1="80" x2="100" y2="115" stroke={colors.primary} strokeWidth="1" strokeDasharray="2 2" />
          <line x1="125" y1="80" x2="125" y2="115" stroke={colors.primary} strokeWidth="1" strokeDasharray="2 2" />
          <line x1="65" y1="95" x2="135" y2="95" stroke={colors.primary} strokeWidth="1" strokeDasharray="2 2" />
        </g>
      );
    }
    if (config.visorFx === 'reticle') {
      return (
        <g>
          <circle cx="100" cy="95" r="14" fill="none" stroke={colors.primary} strokeWidth="1.5" strokeDasharray="4 2" />
          <line x1="100" y1="75" x2="100" y2="115" stroke={colors.primary} strokeWidth="1" />
          <line x1="80" y1="95" x2="120" y2="95" stroke={colors.primary} strokeWidth="1" />
          <circle cx="100" cy="95" r="2" fill="#FDCC0D" />
        </g>
      );
    }
    if (config.visorFx === 'solar_glare') {
      return (
        <g opacity="0.85">
          <polygon points="70,82 110,80 85,110 65,105" fill="#ffffff" opacity="0.6" />
          <line x1="60" y1="82" x2="130" y2="110" stroke="#FDCC0D" strokeWidth="2" opacity="0.7" />
        </g>
      );
    }
    // Void stealth (clean minimal)
    return null;
  };

  const renderAccessory = () => {
    if (config.accessory === 'comms_antenna') {
      return (
        <g>
          <line x1="48" y1="70" x2="35" y2="25" stroke={colors.primary} strokeWidth="2" />
          <circle cx="35" cy="25" r="3.5" fill={colors.primary} />
          <line x1="152" y1="70" x2="165" y2="25" stroke={colors.primary} strokeWidth="2" />
          <circle cx="165" cy="25" r="3.5" fill={colors.primary} />
        </g>
      );
    }
    if (config.accessory === 'holo_halo') {
      return (
        <g>
          <ellipse cx="100" cy="35" rx="42" ry="12" fill="none" stroke={colors.primary} strokeWidth="2.5" strokeDasharray="6 3" opacity="0.9" />
          <circle cx="65" cy="35" r="2" fill="#ffffff" />
          <circle cx="135" cy="35" r="2" fill="#ffffff" />
        </g>
      );
    }
    if (config.accessory === 'dj_cans') {
      return (
        <g>
          <path d="M 42 95 C 42 40, 158 40, 158 95" fill="none" stroke="#767676" strokeWidth="4" />
          <rect x="34" y="80" width="12" height="32" rx="3" fill={colors.primary} />
          <rect x="154" y="80" width="12" height="32" rx="3" fill={colors.primary} />
        </g>
      );
    }
    if (config.accessory === 'neural_horns') {
      return (
        <g>
          <polygon points="65,45 55,10 75,35" fill={colors.primary} opacity="0.9" />
          <polygon points="135,45 145,10 125,35" fill={colors.primary} opacity="0.9" />
        </g>
      );
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md font-mono">
      <div 
        className="w-full max-w-4xl max-h-[92vh] bg-[#101010] border-2 border-[var(--sgx-secondary)] shadow-2xl flex flex-col overflow-hidden text-xs"
        style={{ 
          clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
          borderColor: colors.primary
        }}
      >
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-slate-950 via-[#1B1B1B] to-black border-b border-[var(--sgx-secondary)] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <div>
              <div className="text-sm font-black text-white flex items-center space-x-2">
                <span>AVATAR STUDIO DE ASISTENTE</span>
                <span 
                  className="px-2 py-0.5 text-[10px] font-bold border"
                  style={{ color: colors.primary, borderColor: colors.primary, backgroundColor: `${colors.primary}15` }}
                >
                  {config.pillar}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-sans">
                Personaliza tu astronauta y credencial oficial para el Summit San Juan 2026
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleRandomize}
              className="px-2.5 py-1.5 bg-[#242424] hover:bg-[#313131] border border-slate-700 hover:border-amber-400 text-amber-300 font-bold flex items-center space-x-1 transition-colors"
              title="Generar combinación aleatoria"
            >
              <Dices className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ALEATORIO</span>
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-y-auto">
          {/* Left Column: Avatar & Badge Preview (5 cols) */}
          <div className="md:col-span-5 p-4 bg-gradient-to-b from-black/80 to-[#111111] border-b md:border-b-0 md:border-r border-[var(--sgx-secondary)] flex flex-col items-center justify-between space-y-4">
            {/* SVG Visualizer Canvas */}
            <div className="flex flex-col items-center">
              <div 
                className="relative w-56 h-56 sm:w-64 sm:h-64 border-2 shadow-2xl overflow-hidden bg-black transition-all"
                style={{ 
                  borderColor: colors.primary,
                  boxShadow: `0 0 25px ${colors.primary}33`
                }}
              >
                <svg
                  ref={svgRef}
                  viewBox="0 0 200 200"
                  className="w-full h-full"
                  style={{ imageRendering: config.style === 'pixel' ? 'pixelated' : 'auto' }}
                >
                  {renderBackdrop()}
                  {renderAccessory()}
                  {renderSuit()}
                  {renderHelmet()}
                  {renderVisorFx()}
                </svg>

                {/* Pillar Tag in Corner */}
                <div 
                  className="absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-mono font-black bg-black/85 border"
                  style={{ color: colors.primary, borderColor: colors.primary }}
                >
                  {config.rankTag}
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-400 flex items-center space-x-2 font-mono">
                <span>Estilo: <strong className="text-white uppercase">{config.style}</strong></span>
                <span>•</span>
                <span>Semilla: <strong className="text-cyan-400 font-mono">{config.seed}</strong></span>
              </div>
            </div>

            {/* Summit Badge Preview Simulation */}
            <div className="w-full bg-[#1B1B1B] border border-slate-700 p-3 relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r"
                style={{ backgroundImage: `linear-gradient(to right, ${colors.primary}, ${colors.secondary})` }}
              />
              <div className="flex items-center space-x-3">
                <div 
                  className="w-12 h-12 rounded border overflow-hidden shrink-0 bg-black"
                  style={{ borderColor: colors.primary }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {renderBackdrop()}
                    {renderAccessory()}
                    {renderSuit()}
                    {renderHelmet()}
                    {renderVisorFx()}
                  </svg>
                </div>
                <div className="overflow-hidden">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                    CREDENCIAL SPATIALGINEERS
                  </div>
                  <div className="text-xs font-black text-white break-words">
                    {playerProfile?.nickname || 'ASISTENTE_SGX'}
                  </div>
                  <div 
                    className="text-[9px] font-bold break-words mt-0.5"
                    style={{ color: colors.primary }}
                  >
                    {config.rankTag} • {colors.name}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={handleDownloadPng}
                className="p-2 bg-[#242424] hover:bg-[#313131] border border-slate-700 hover:border-cyan-400 text-cyan-300 font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>BAJAR PNG</span>
              </button>

              <button
                onClick={handleCopySvg}
                className="p-2 bg-[#242424] hover:bg-[#313131] border border-slate-700 hover:border-amber-400 text-amber-300 font-bold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSvg ? '¡COPIADO!' : 'COPIAR SVG'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Customization Controls (7 cols) */}
          <div className="md:col-span-7 p-4 space-y-4 flex flex-col justify-between">
            {/* Category Navigation Tabs */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 bg-black/60 p-1 border border-slate-800 text-[10px]">
              {[
                { key: 'PILLAR' as const, label: 'Pilar', icon: Palette },
                { key: 'HELMET' as const, label: 'Casco', icon: Shield },
                { key: 'SUIT' as const, label: 'Traje', icon: Layers },
                { key: 'VISOR' as const, label: 'Visor FX', icon: Eye },
                { key: 'ACCESSORY' as const, label: 'Antena', icon: Radio },
                { key: 'BADGE' as const, label: 'Rango', icon: Award }
              ].map(cat => {
                const Icon = cat.icon;
                const isActive = activeCategory === cat.key;
                return (
                  <button
                    key={cat.key}
                    onClick={() => {
                      setActiveCategory(cat.key);
                      playUiChirp(700);
                    }}
                    className={`py-1.5 px-2 flex flex-col sm:flex-row items-center justify-center space-x-1 border transition-colors ${
                      isActive
                        ? 'border-[var(--sgx-neon)] text-[var(--sgx-neon)] bg-cyan-950/40 font-bold'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    <span className="mt-0.5 sm:mt-0">{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Active Category Content */}
            <div className="flex-1 space-y-3">
              {/* Category 1: Pillars */}
              {activeCategory === 'PILLAR' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Elige el Pilar de Spatialgineers que define tu misión:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(PILLAR_COLORS) as Array<keyof typeof PILLAR_COLORS>).map(pilKey => {
                      const p = PILLAR_COLORS[pilKey];
                      const isSelected = config.pillar === pilKey;
                      return (
                        <button
                          key={pilKey}
                          onClick={() => {
                            setConfig(prev => ({ ...prev, pillar: pilKey }));
                            playUiChirp(800);
                          }}
                          className={`p-2 text-left border transition-all flex items-start space-x-2 ${
                            isSelected
                              ? 'border-white bg-[#272727] shadow-md'
                              : 'border-slate-800 bg-[#181818] hover:border-slate-600'
                          }`}
                        >
                          <div 
                            className="w-3.5 h-3.5 rounded-full mt-0.5 shrink-0" 
                            style={{ backgroundColor: p.primary }}
                          />
                          <div>
                            <div className="font-black text-[11px]" style={{ color: p.primary }}>
                              {p.name}
                            </div>
                            <div className="text-[9px] text-slate-400">
                              {p.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Render Style Toggle */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] text-slate-400 mb-1.5">Estilo Gráfico:</div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, style: 'lowpoly' }))}
                        className={`p-2 border text-center font-bold ${
                          config.style === 'lowpoly' 
                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' 
                            : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        📐 LOW-POLY GEOMÉTRICO
                      </button>
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, style: 'pixel' }))}
                        className={`p-2 border text-center font-bold ${
                          config.style === 'pixel' 
                            ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30' 
                            : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        👾 PIXEL 8-BIT RETRO
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Category 2: Helmets */}
              {activeCategory === 'HELMET' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Modelo de Casco Espacial:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'lowpoly_facet' as const, name: 'Low-Poly Facetado', desc: 'Aristas de sigilo y malla hexagonal' },
                      { id: 'cyber_visor' as const, name: 'Cyber Visor Táctico', desc: 'Banda horizontal de escaneo óptico' },
                      { id: 'bubble' as const, name: 'Astro Bubble Clásico', desc: 'Bóveda esférica presurizada' },
                      { id: 'mecha_crown' as const, name: 'Corona Mecha', desc: 'Chasis reforzado con sensores cornamenta' },
                      { id: 'holo_dome' as const, name: 'Domo Holográfico', desc: 'Cristal transparente con ojos de energía' },
                      { id: 'orbital_pilot' as const, name: 'Piloto Orbital Gold', desc: 'Escudo polarizado dorado anti-radiación' }
                    ].map(h => (
                      <button
                        key={h.id}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, helmet: h.id }));
                          playUiChirp(780);
                        }}
                        className={`p-2.5 text-left border transition-all ${
                          config.helmet === h.id
                            ? 'border-[var(--sgx-neon)] bg-cyan-950/40 text-white'
                            : 'border-slate-800 bg-[#181818] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{h.name}</div>
                        <div className="text-[9px] text-slate-400">{h.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 3: Suits */}
              {activeCategory === 'SUIT' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Traje de Presión y Exoesqueleto:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'eva_flight' as const, name: 'EVA Flight Suit', desc: 'Arnés de gravedad cero con soporte vital' },
                      { id: 'cyber_jacket' as const, name: 'Chaqueta Cyber Táctica', desc: 'Cuellos altos de neón y fibra de carbono' },
                      { id: 'heavy_exo' as const, name: 'Exo-Armadura de Asalto', desc: 'Placas de titanio y reactor en el pecho' },
                      { id: 'san_juan_linen' as const, name: 'Spatial Linen San Juan', desc: 'Traje blanco tropical con bordes dorados' }
                    ].map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, suit: s.id }));
                          playUiChirp(750);
                        }}
                        className={`p-2.5 text-left border transition-all ${
                          config.suit === s.id
                            ? 'border-amber-400 bg-amber-950/40 text-white'
                            : 'border-slate-800 bg-[#181818] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{s.name}</div>
                        <div className="text-[9px] text-slate-400">{s.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 4: Visor Effects */}
              {activeCategory === 'VISOR' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Efecto de HUD y Reflejo en Visera:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'scanline' as const, name: 'Barrido Láser Scanline', desc: 'Haz horizontal continuo de telemetría' },
                      { id: 'matrix_grid' as const, name: 'Malla Holográfica Matrix', desc: 'Coordenadas espaciales de realidad mixta' },
                      { id: 'reticle' as const, name: 'Mira de Puntería Táctica', desc: 'Círculo de enfoque y punto focal' },
                      { id: 'solar_glare' as const, name: 'Destello Solar San Juan', desc: 'Reflejo de luz solar ultravioleta' },
                      { id: 'void_stealth' as const, name: 'Void Negro Sigiloso', desc: 'Superficie de absorción pura sin reflejos' }
                    ].map(v => (
                      <button
                        key={v.id}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, visorFx: v.id }));
                          playUiChirp(820);
                        }}
                        className={`p-2.5 text-left border transition-all ${
                          config.visorFx === v.id
                            ? 'border-cyan-400 bg-cyan-950/40 text-white'
                            : 'border-slate-800 bg-[#181818] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{v.name}</div>
                        <div className="text-[9px] text-slate-400">{v.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 5: Accessories & Antennas */}
              {activeCategory === 'ACCESSORY' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Antenas y Accesorios de Cabeza:
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'holo_halo' as const, name: 'Halo de Energía Cuántica', desc: 'Aura elíptica orbital sobre el casco' },
                      { id: 'comms_antenna' as const, name: 'Antenas Satelitales Gemelas', desc: 'Enlace bidireccional de baja latencia' },
                      { id: 'dj_cans' as const, name: 'Audífonos DJ Espaciales', desc: 'Monitores acústicos con LEDs luminosos' },
                      { id: 'neural_horns' as const, name: 'Espigas Neuronales Horns', desc: 'Receptores de interfaz cerebro-máquina' },
                      { id: 'none' as const, name: 'Ninguno / Chasis Limpio', desc: 'Sin protuberancias adicionales' }
                    ].map(a => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, accessory: a.id }));
                          playUiChirp(800);
                        }}
                        className={`p-2.5 text-left border transition-all ${
                          config.accessory === a.id
                            ? 'border-amber-400 bg-amber-950/40 text-white'
                            : 'border-slate-800 bg-[#181818] text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <div className="font-bold text-[11px]">{a.name}</div>
                        <div className="text-[9px] text-slate-400">{a.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Category 6: Badge & Ranks */}
              {activeCategory === 'BADGE' && (
                <div className="space-y-2">
                  <div className="text-[11px] text-slate-300 font-bold">
                    Rango y Fondo de la Credencial:
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {['SPATIALGINEER', 'ARCHITECT', 'CREATIVE PRODUCER', 'AI FOUNDER', 'DEV GUILD', 'VIP GUEST'].map(rank => (
                      <button
                        key={rank}
                        onClick={() => {
                          setConfig(prev => ({ ...prev, rankTag: rank }));
                          playUiChirp(840);
                        }}
                        className={`p-2 border text-center font-bold text-[10px] ${
                          config.rankTag === rank
                            ? 'border-amber-400 text-amber-300 bg-amber-950/40'
                            : 'border-slate-800 bg-[#181818] text-slate-400 hover:text-white'
                        }`}
                      >
                        {rank}
                      </button>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] text-slate-400 mb-1.5">Fondo de Avatar:</div>
                    <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                      {[
                        { id: 'grid' as const, label: 'Cyber Grid' },
                        { id: 'sunset' as const, label: 'San Juan Sunset' },
                        { id: 'starfield' as const, label: 'Starfield' },
                        { id: 'hex' as const, label: 'Hex Shield' }
                      ].map(bg => (
                        <button
                          key={bg.id}
                          onClick={() => setConfig(prev => ({ ...prev, backdrop: bg.id }))}
                          className={`p-1.5 border text-center ${
                            config.backdrop === bg.id
                              ? 'border-white text-white font-bold'
                              : 'border-slate-800 text-slate-400'
                          }`}
                        >
                          {bg.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Save & Apply CTA */}
            <div className="pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-[10px] text-slate-400">
                {appliedSuccess ? (
                  <span className="text-[#FDCC0D] font-bold flex items-center space-x-1">
                    <Check className="w-3.5 h-3.5 inline" />
                    <span>¡Avatar aplicado a tu Credencial & Pasaporte!</span>
                  </span>
                ) : (
                  <span>Se actualizará en tu pasaporte, ranking y libreta de contactos.</span>
                )}
              </div>

              <button
                onClick={handleSaveAndApply}
                className="w-full sm:w-auto px-5 py-2.5 bg-[#FDCC0D] hover:bg-[#E5B80B] text-black font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-transform hover:scale-105"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <Save className="w-4 h-4" />
                <span>APLICAR A MI CREDENCIAL & PASAPORTE</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
