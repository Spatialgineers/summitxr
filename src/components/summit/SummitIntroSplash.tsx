import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, ArrowRight, X, ShieldCheck, Zap } from 'lucide-react';
import { ApprovedSponsor, SponsorshipTier } from '../../types/summit';
import { loadAllApprovedSponsors, SPONSORSHIP_TIERS } from '../../lib/summitData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';

export interface SummitIntroSplashProps {
  onComplete: () => void;
  durationMs?: number; // default 5000ms (5 seconds)
  forceShow?: boolean;
}

// Official Confirmed Partners & Sponsor Induction Slots (Strictly Canon)
const TIER_3_PLUS_FALLBACKS: ApprovedSponsor[] = [
  {
    id: 'sp_splash_chroma',
    companyName: 'Chroma Space Studios',
    brandSlug: 'chroma-space-studios',
    tierId: 'tier_5',
    tierName: 'Co-Productor & Sede Oficial Presencial (Tier 5)',
    tagline: 'Sede Física Oficial Híbrida Día 3 • San Juan, Puerto Rico',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: 'https://chromaspace.pr',
    description: 'Estudio de producción virtual LED broadcast en San Juan.',
    highlights: ['Sede física oficial', 'Estudios de producción inmersiva'],
    ctaButtonText: 'CONOCE MÁS',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_los_mismos',
    companyName: 'Los Mismos TV',
    brandSlug: 'los-mismos-tv',
    tierId: 'tier_4',
    tierName: 'Strategic Media Partner (Tier 4)',
    tagline: 'Transmisión Oficial YouTube Live 4K • Bucolov & Bluecider',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: 'https://youtube.com',
    description: 'Transmisión en vivo y media partner oficial.',
    highlights: ['YouTube Live 4K', 'Cobertura completa'],
    ctaButtonText: 'CONOCE MÁS',
    activeInVisualizer: true,
    activeInMiniGame: false,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_induction_1',
    companyName: 'Tu Marca Aquí (Tier 3)',
    brandSlug: 'tu-marca-tier-3',
    tierId: 'tier_3',
    tierName: 'Experience Sponsor (Tier 3)',
    tagline: 'Presencia destacada en streaming y escenario virtual',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Espacio disponible para empresas y patrocinadores del Summit.',
    highlights: ['Menciones en vivo', 'Presencia interactiva'],
    ctaButtonText: 'POSTULAR MARCA',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_splash_induction_2',
    companyName: 'Tu Marca Aquí (Tier 4)',
    brandSlug: 'tu-marca-tier-4',
    tierId: 'tier_4',
    tierName: 'Signature Experience (Tier 4)',
    tagline: 'Patrocinio titular de segmento y activación inmersiva',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Espacio de patrocinio de alto impacto para marcas líderes.',
    highlights: ['Activación WebXR', 'Presencia física en Chroma'],
    ctaButtonText: 'POSTULAR MARCA',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  }
];

export const SummitIntroSplash: React.FC<SummitIntroSplashProps> = ({
  onComplete,
  durationMs = 5000,
  forceShow = false
}) => {
  const { language } = useLanguage();
  const [progress, setProgress] = useState<number>(0);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);

  // Helper to determine tier level
  const getTierLevel = (sp: ApprovedSponsor): number => {
    if (sp.tierId === 'tier_5') return 5;
    if (sp.tierId === 'tier_4') return 4;
    if (sp.tierId === 'tier_3') return 3;
    const tier = SPONSORSHIP_TIERS.find(t => t.id === sp.tierId);
    return tier?.tierNumber || 1;
  };

  // Filter ONLY Tier 3 and above sponsors (tier >= 3)
  const qualifyingSponsors = useMemo(() => {
    const all = loadAllApprovedSponsors();
    const tier3Plus = all.filter(s => getTierLevel(s) >= 3);
    
    // Combine with fallbacks to guarantee at least 4 items
    const combined = [...tier3Plus];
    for (const fb of TIER_3_PLUS_FALLBACKS) {
      if (!combined.some(c => c.companyName.toLowerCase() === fb.companyName.toLowerCase())) {
        combined.push(fb);
      }
    }
    return combined;
  }, []);

  // Pick 4 sponsors randomly on entry for fair exposure
  const [selectedFourSponsors, setSelectedFourSponsors] = useState<ApprovedSponsor[]>(() => {
    const shuffled = [...qualifyingSponsors].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 4);
  });

  // Cycle sponsors if user pauses or interacts for more than 10 seconds
  useEffect(() => {
    if (qualifyingSponsors.length <= 4) return;

    const interval = setInterval(() => {
      setSelectedFourSponsors((prev) => {
        const available = qualifyingSponsors.filter(s => !prev.some(p => p.id === s.id));
        if (available.length === 0) return prev;
        const nextBatch = [...qualifyingSponsors].sort(() => Math.random() - 0.5).slice(0, 4);
        return nextBatch;
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [qualifyingSponsors]);

  const handleFinish = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    try {
      sessionStorage.setItem('sgx_splash_shown', 'true');
    } catch {}

    setTimeout(() => {
      onComplete();
    }, 280); // Smooth fadeout duration
  };

  // High-accuracy 2-second cybernetic progress animation
  useEffect(() => {
    startTimeRef.current = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setProgress(pct);

      if (elapsed >= durationMs) {
        handleFinish();
      } else {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [durationMs]);

  // Keyboard shortcut (ESC or Enter to bypass)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleFinish();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSponsorHyperlinkClick = (e: React.MouseEvent, tierId: string) => {
    e.stopPropagation();
    e.preventDefault();
    playUiChirp(840);
    handleFinish();

    // Open sponsorship modal & scroll to matrix
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('sgx:open_sponsorships', {
        detail: { preferredTier: tierId, source: 'splash_intro' }
      }));
      window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', {
        detail: { section: 'SPONSORS_HUB' }
      }));
    }, 300);
  };

  const subtitlePrompt = language === 'en'
    ? '(your brand could be here)'
    : '(tu marca podría estar aquí)';

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex flex-col justify-between bg-[#040711] text-white select-none transition-opacity duration-300 ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'radial-gradient(ellipse at 50% 30%, #0C1E38 0%, #040711 75%)',
      }}
    >
      {/* High-tech ambient scanlines & grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(to right, rgba(0,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      {/* Top Utility Island: Skip Button & Tech Status */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-4 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2 text-cyan-400">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="tracking-widest uppercase text-[10px] sm:text-xs">
            [SYS_INIT // 2026_SPATIAL_ENGINE]
          </span>
        </div>

        <button
          onClick={handleFinish}
          className="flex items-center space-x-1.5 px-3 py-1 bg-slate-900/80 hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 rounded font-mono text-[11px] font-bold transition-all cursor-pointer shadow-lg"
        >
          <span>SALTAR INTRO</span>
          <span className="text-[9px] opacity-70">[ESC]</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Center Branding Content: Official Presentation Text */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto my-auto space-y-4 sm:space-y-6">
        
        {/* Spatialgineers Dual Crest */}
        <div className="flex items-center justify-center gap-3 animate-pulse">
          <img 
            src="https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG" 
            alt="Spatialgineers Logo" 
            className="h-10 sm:h-14 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(0,255,255,0.6)]"
          />
          <img 
            src="https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png" 
            alt="Summit Crest" 
            className="h-9 sm:h-12 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(253,204,13,0.7)]"
          />
        </div>

        {/* 1. Spatialgineers LLC presenta: */}
        <p className="text-xs sm:text-sm md:text-base font-mono font-bold tracking-[0.25em] sm:tracking-[0.35em] text-cyan-300 uppercase drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]">
          Spatialgineers LLC presenta:
        </p>

        {/* 2. Spatialgineers Summit 2026 */}
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-wider font-['Orbitron',sans-serif] uppercase text-white drop-shadow-[0_0_25px_rgba(253,204,13,0.35)]">
          Spatialgineers <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FDCC0D] via-yellow-200 to-[#FF8800]">Summit 2026</span>
        </h1>

        {/* 3. El futuro, hoy. */}
        <p className="text-sm sm:text-lg md:text-xl font-['Rajdhani',sans-serif] font-bold italic tracking-wide text-cyan-200 max-w-xl">
          “El futuro, hoy.”
        </p>

        {/* 2-Second Cybernetic Progress Bar */}
        <div className="w-full max-w-md pt-2 sm:pt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span className="text-cyan-400 font-bold">SINCRONIZANDO EXPERIENCIA...</span>
            <span className="text-yellow-400 font-bold">{progress}%</span>
          </div>

          <div className="w-full h-2.5 bg-slate-950 border border-cyan-500/50 rounded-full overflow-hidden p-0.5 shadow-[0_0_15px_rgba(0,255,255,0.3)]">
            <div 
              className="h-full bg-gradient-to-r from-cyan-500 via-[#FDCC0D] to-amber-500 rounded-full transition-all duration-75 shadow-md"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
            <span>DICIEMBRE 11–13, 2026</span>
            <span>SAN JUAN • HYBRID WEBXR & LIVE</span>
          </div>
        </div>
      </div>

      {/* Bottom Area: 4 Transient Spots strictly for Tier 3+ Sponsors */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-8 pb-6 pt-2">
        <div className="border-t border-slate-800/80 pt-3">
          
          <div className="flex items-center justify-between mb-2.5 text-[11px] font-mono">
            <div className="flex items-center space-x-2 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-[#FDCC0D]" />
              <span className="font-bold text-white tracking-wider uppercase text-[10px] sm:text-xs">
                PATROCINADORES Y ALIADOS OFICIALES (TIER 3+)
              </span>
            </div>
            <span className="text-[10px] text-cyan-400 hidden sm:inline">
              EXPOSICIÓN DESTACADA EN VIVO
            </span>
          </div>

          {/* 4 Bottom Sponsor Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5">
            {selectedFourSponsors.map((sp, idx) => (
              <div
                key={`${sp.id}_${idx}`}
                className="group relative p-2.5 sm:p-3 bg-[#080E1C]/90 hover:bg-[#0E172E] border border-cyan-500/30 hover:border-[#FDCC0D] rounded-xl transition-all shadow-md backdrop-blur-md flex flex-col justify-between"
              >
                {/* Sponsor Logo and Tier info */}
                <div className="flex items-center space-x-2 sm:space-x-2.5 mb-2">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-black/90 border border-slate-700 group-hover:border-cyan-400 p-1 flex items-center justify-center shrink-0 overflow-hidden transition-colors">
                    <img
                      src={sp.logoUrl}
                      alt={sp.companyName}
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
                      }}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[8px] sm:text-[9px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded block truncate w-fit">
                      {sp.tierName.split('(')[0].trim()}
                    </span>
                    <h4 className="text-[11px] sm:text-xs font-bold text-white truncate font-['Orbitron',sans-serif] mt-0.5">
                      {sp.companyName}
                    </h4>
                  </div>
                </div>

                {/* Subtitle Hyperlink "(tu marca podría estar aquí)" */}
                <button
                  onClick={(e) => handleSponsorHyperlinkClick(e, sp.tierId)}
                  className="text-[9px] sm:text-[10px] font-mono font-bold text-[#FDCC0D] hover:text-white underline decoration-dotted hover:decoration-solid transition-colors text-left flex items-center gap-1 group/btn cursor-pointer mt-1 pt-1 border-t border-slate-800/80"
                  title="Haz clic para registrar tu marca en esta posición de patrocinio"
                >
                  <Sparkles className="w-2.5 h-2.5 text-[#FDCC0D] group-hover/btn:rotate-12 transition-transform" />
                  <span className="truncate">{subtitlePrompt}</span>
                </button>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};
