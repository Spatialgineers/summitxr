import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ExternalLink, ShieldCheck, ArrowRight, Building2, Zap } from 'lucide-react';
import { ApprovedSponsor, SponsorshipTier } from '../../types/summit';
import { loadAllApprovedSponsors, SPONSORSHIP_TIERS } from '../../lib/summitData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

export interface TransientSponsorSlotProps {
  slotId?: string;
  variant?: 'compact' | 'badge' | 'banner' | 'card' | 'hud';
  filterMinTier?: number; // 1 to 5
  className?: string;
  showSubtitleLink?: boolean;
  onOpenSponsorshipModal?: () => void;
}

// Canonical Confirmed Partners & Open Sponsor Induction Slots
const DEFAULT_PARTNERS: ApprovedSponsor[] = [
  {
    id: 'sp_default_chroma',
    companyName: 'Chroma Space Studios',
    brandSlug: 'chroma-space-studios',
    tierId: 'tier_5',
    tierName: 'Tier 5 · Venue del Día 3',
    tierNameEn: 'Tier 5 · Day 3 Venue',
    tagline: 'Venue del Día 3 (SGX Showcase) • San Juan, Puerto Rico',
    taglineEn: 'Day 3 venue (SGX Showcase) • San Juan, Puerto Rico',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: '',
    description: 'Estudio de producción en San Juan, venue del Día 3.',
    descriptionEn: 'Production studio in San Juan, the Day 3 venue.',
    highlights: ['Venue del Día 3', 'Estudio de producción en San Juan'],
    highlightsEn: ['Day 3 venue', 'Production studio in San Juan'],
    ctaButtonText: 'CONOCE MÁS',
    ctaButtonTextEn: 'LEARN MORE',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_default_los_mismos',
    companyName: 'Los Mismos TV',
    brandSlug: 'los-mismos-tv',
    tierId: 'media_partner',
    tierName: 'Transmite junto a nosotros',
    tierNameEn: 'Streams alongside us',
    tagline: 'Transmite el Summit desde su canal, junto al de Spatialgineers',
    taglineEn: 'Streams the Summit from its channel, alongside the Spatialgineers channel',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: '',
    description: 'Los Mismos TV transmite el Spatialgineers Summit 2026 junto a nosotros.',
    descriptionEn: 'Los Mismos TV streams the Spatialgineers Summit 2026 alongside us.',
    highlights: ['Transmite junto a nosotros', 'YouTube Live'],
    highlightsEn: ['Streams alongside us', 'YouTube Live'],
    ctaButtonText: 'CONOCE MÁS',
    ctaButtonTextEn: 'LEARN MORE',
    activeInVisualizer: true,
    activeInMiniGame: false,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_default_induction_1',
    companyName: 'Tu Marca Aquí (Tier 3)',
    companyNameEn: 'Your Brand Here (Tier 3)',
    brandSlug: 'tu-marca-tier-3',
    tierId: 'tier_3',
    tierName: 'Experience (Tier 3)',
    tagline: 'Presencia de Marca en Consola de Audiencia & Streaming',
    taglineEn: 'Brand Presence on the Audience Console & Streaming',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Posición destacada para patrocinadores y empresas del sector XR.',
    descriptionEn: 'A featured spot for sponsors and companies in the XR sector.',
    highlights: ['Logo en webapp y transmisión', 'Exposición interactiva'],
    highlightsEn: ['Logo on the web app and broadcast', 'Interactive exposure'],
    ctaButtonText: 'POSTULAR MARCA',
    ctaButtonTextEn: 'APPLY YOUR BRAND',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  },
  {
    id: 'sp_default_induction_2',
    companyName: 'Tu Marca Aquí (Tier 4)',
    companyNameEn: 'Your Brand Here (Tier 4)',
    brandSlug: 'tu-marca-tier-4',
    tierId: 'tier_4',
    tierName: 'Signature Experience (Tier 4)',
    tagline: 'Experience by [Marca] · activación híbrida',
    taglineEn: 'Experience by [Brand] · hybrid activation',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: 'https://summit.spatialgineers.com',
    description: 'Activación principal "Experience by [Marca]" y licencia de acceso de 365 días desde noviembre.',
    descriptionEn: 'Main "Experience by [Brand]" activation and a 365-day access license starting in November.',
    highlights: ['"Experience by [Marca]"', 'Exclusividad por categoría'],
    highlightsEn: ['"Experience by [Brand]"', 'Category exclusivity'],
    ctaButtonText: 'POSTULAR MARCA',
    ctaButtonTextEn: 'APPLY YOUR BRAND',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    publishedAt: 1700000000000,
    updatedAt: 1700000000000,
  }
];

export const TransientSponsorSlot: React.FC<TransientSponsorSlotProps> = ({
  slotId = 'default',
  variant = 'compact',
  filterMinTier = 1,
  className = '',
  showSubtitleLink = true,
  onOpenSponsorshipModal,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [sponsorsList, setSponsorsList] = useState<ApprovedSponsor[]>(() => {
    const loaded = loadAllApprovedSponsors();
    return loaded.length > 0 ? loaded : DEFAULT_PARTNERS;
  });

  // Calculate tier level helper
  const getTierLevel = (sp: ApprovedSponsor): number => {
    if (sp.tierId === 'tier_5') return 5;
    if (sp.tierId === 'media_partner') return 3;
    if (sp.tierId === 'tier_4') return 4;
    if (sp.tierId === 'tier_3') return 3;
    if (sp.tierId === 'tier_2') return 2;
    if (sp.tierId === 'tier_1') return 1;
    // Look up in matrix if available
    const matrixTier = SPONSORSHIP_TIERS.find(t => t.id === sp.tierId);
    return matrixTier?.tierNumber || 1;
  };

  // Filter sponsors by minimum tier
  const filteredSponsors = useMemo(() => {
    const matched = sponsorsList.filter(s => getTierLevel(s) >= filterMinTier);
    if (matched.length > 0) return matched;
    // Fallback if none match
    return DEFAULT_PARTNERS.filter(s => getTierLevel(s) >= filterMinTier);
  }, [sponsorsList, filterMinTier]);

  // Pseudo-random offset based on slotId string hash so multiple slots don't match exactly
  const initialOffset = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < slotId.length; i++) {
      hash = (hash << 5) - hash + slotId.charCodeAt(i);
      hash |= 0;
    }
    const rand = Math.floor(Math.random() * 100);
    return Math.abs(hash + rand);
  }, [slotId]);

  // Active sponsor index & transition state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState<boolean>(false);

  // Initialize random starting point
  useEffect(() => {
    if (filteredSponsors.length > 0) {
      setCurrentIndex(initialOffset % filteredSponsors.length);
    }
  }, [filteredSponsors.length, initialOffset]);

  // Listen to local storage updates if admin approves/changes sponsors
  useEffect(() => {
    const handleStorage = () => {
      const updated = loadAllApprovedSponsors();
      if (updated.length > 0) {
        setSponsorsList(updated);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 10-second transient rotation interval
  useEffect(() => {
    if (filteredSponsors.length <= 1) return;

    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % filteredSponsors.length);
        setIsTransitioning(false);
      }, 400); // Wait for fade-out before switching sponsor
    }, 10000); // Exactly every 10 seconds

    return () => clearInterval(interval);
  }, [filteredSponsors.length]);

  const activeSponsor = filteredSponsors[currentIndex] || filteredSponsors[0] || DEFAULT_PARTNERS[0];

  const handleOpenSponsorship = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    playUiChirp(840);

    if (onOpenSponsorshipModal) {
      onOpenSponsorshipModal();
      return;
    }

    // Global event dispatched to open the sponsorship inquiry flow
    window.dispatchEvent(new CustomEvent('sgx:open_sponsorships', {
      detail: {
        preferredTier: activeSponsor?.tierId || 'tier_2',
        sourceSlot: slotId
      }
    }));

    // Also switch to summit landing and navigate to SPONSORS_HUB if not in modal
    window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', {
      detail: { section: 'SPONSORS_HUB' }
    }));
  };

  const handleSponsorClick = () => {
    playUiChirp(700);
    if (activeSponsor) {
      // Trigger global modal or direct brand landing
      window.dispatchEvent(new CustomEvent('sgx:open_brand_showcase', {
        detail: { sponsor: activeSponsor }
      }));
    }
  };

  const subtitleText = language === 'en' 
    ? '(your brand could be here)' 
    : '(tu marca podría estar aquí)';

  // RENDER VARIANTS

  // 1. COMPACT VARIANT (Navbars, header islands, small utility bars)
  if (variant === 'compact') {
    return (
      <div 
        className={`inline-flex items-center gap-2 px-2.5 py-1 bg-[#0F0F0F]/90 border border-slate-800 hover:border-cyan-400/80 transition-all group backdrop-blur-md relative ${className}`}
        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
      >
        {/* Rotation indicator dot */}
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" title="Rotación dinámica cada 10s" />

        {/* Sponsor content with fade transition */}
        <div 
          onClick={handleSponsorClick}
          className={`flex items-center gap-1.5 cursor-pointer transition-opacity duration-300 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
        >
          <div className="w-5 h-5 rounded bg-black/60 border border-slate-700 p-0.5 overflow-hidden flex items-center justify-center shrink-0">
            <img 
              src={activeSponsor.logoUrl} 
              alt={loc(activeSponsor, 'companyName', language)} 
              className="w-full h-full object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
              }}
            />
          </div>
          <span className="text-[11px] font-bold text-white tracking-wide truncate max-w-[110px] sm:max-w-[140px] font-mono">
            {loc(activeSponsor, 'companyName', language)}
          </span>
        </div>

        {/* Subtitle Hyperlink */}
        {showSubtitleLink && (
          <button
            onClick={handleOpenSponsorship}
            className="text-[10px] font-mono text-[#FDCC0D] hover:text-white underline decoration-dotted hover:decoration-solid hover:scale-105 transition-all cursor-pointer whitespace-nowrap pl-1 border-l border-slate-800"
            title="Conviértete en patrocinador oficial de Spatialgineers Summit 2026"
          >
            {subtitleText}
          </button>
        )}
      </div>
    );
  }

  // 2. BADGE / HUD VARIANT (For Audience Console, Drone Simulator HUD, Cards)
  if (variant === 'badge' || variant === 'hud') {
    return (
      <div 
        className={`p-2 bg-gradient-to-r from-[#0d0d0d]/95 to-[#191919]/95 border border-cyan-500/40 rounded-lg shadow-lg relative overflow-hidden backdrop-blur-md ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Main Sponsor Badge */}
          <div 
            onClick={handleSponsorClick}
            className={`flex items-center gap-2 cursor-pointer transition-all duration-300 flex-1 min-w-0 ${isTransitioning ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'}`}
          >
            <div className="w-7 h-7 rounded bg-black border border-cyan-400/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_8px_rgba(0, 221, 255,0.25)]">
              <img 
                src={activeSponsor.logoUrl} 
                alt={loc(activeSponsor, 'companyName', language)} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono px-1 py-0.2 bg-cyan-950 text-cyan-300 border border-cyan-800 rounded">
                  SPONSOR
                </span>
                <span className="text-[9px] font-mono text-slate-400 hidden sm:inline">10s ROTATION</span>
              </div>
              <h4 className="text-xs font-bold text-white truncate font-['Orbitron',sans-serif]">
                {loc(activeSponsor, 'companyName', language)}
              </h4>
            </div>
          </div>

          {/* Clickable Subtitle Link */}
          {showSubtitleLink && (
            <button
              onClick={handleOpenSponsorship}
              className="text-[10px] font-mono font-bold text-[#FDCC0D] hover:text-white bg-[#FDCC0D]/10 hover:bg-[#FDCC0D]/20 px-2 py-1 rounded border border-[#FDCC0D]/40 transition-all flex items-center gap-1 shrink-0 animate-pulse hover:animate-none"
            >
              <Zap className="w-3 h-3 text-[#FDCC0D]" />
              <span>{subtitleText}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // 3. BANNER VARIANT (Full width agenda dividers, bottom bars, live stream overlays)
  if (variant === 'banner') {
    return (
      <div 
        className={`w-full p-3 bg-gradient-to-r from-[#0F0F0F] via-[#1D1D1D] to-[#0F0F0F] border border-[var(--sgx-secondary)] shadow-xl relative overflow-hidden ${className}`}
        style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Left: Sponsor Identity with smooth crossfade */}
          <div 
            onClick={handleSponsorClick}
            className={`flex items-center gap-3 cursor-pointer transition-all duration-400 flex-1 ${isTransitioning ? 'opacity-0 scale-98' : 'opacity-100 scale-100'}`}
          >
            <div className="w-10 h-10 rounded-lg bg-black/80 border border-cyan-400 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-[0_0_12px_rgba(0, 221, 255,0.2)]">
              <img 
                src={activeSponsor.logoUrl} 
                alt={loc(activeSponsor, 'companyName', language)} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-cyan-950 text-cyan-300 border border-cyan-700/60 rounded">
                  PARTNER DESTACADO
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {loc(activeSponsor, 'tierName', language).split('(')[0]}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-white font-['Orbitron',sans-serif] tracking-wide">
                {loc(activeSponsor, 'companyName', language)}
              </h3>
              <p className="text-[11px] text-slate-300 font-mono line-clamp-1">
                {loc(activeSponsor, 'tagline', language) || loc(activeSponsor, 'description', language)}
              </p>
            </div>
          </div>

          {/* Right: Subtitle Hyperlink CTA */}
          {showSubtitleLink && (
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenSponsorship}
                className="px-3 py-1.5 bg-[#FDCC0D]/15 hover:bg-[#FDCC0D] border border-[#FDCC0D] text-[#FDCC0D] hover:text-black text-xs font-mono font-bold transition-all flex items-center gap-1.5 group cursor-pointer shadow-lg shadow-[#FDCC0D]/10"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
                <span className="uppercase">{subtitleText}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. CARD VARIANT (Default standalone block with 3D crystal depth)
  return (
    <div 
      className={`p-3 sgx-crystal-card hover:border-[#FDCC0D]/70 transition-all shadow-xl relative group ${className}`}
    >
      <div 
        onClick={handleSponsorClick}
        className={`flex items-center gap-2.5 cursor-pointer transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="w-8 h-8 rounded-lg bg-black border border-slate-700 p-1 flex items-center justify-center shrink-0">
          <img 
            src={activeSponsor.logoUrl} 
            alt={loc(activeSponsor, 'companyName', language)} 
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
            }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-bold text-white truncate font-['Orbitron',sans-serif]">
            {loc(activeSponsor, 'companyName', language)}
          </h4>
          <span className="text-[10px] text-cyan-400 font-mono block truncate">
            {loc(activeSponsor, 'tagline', language) || (es ? 'Patrocinador Oficial' : 'Official Sponsor')}
          </span>
        </div>
      </div>

      {showSubtitleLink && (
        <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={handleOpenSponsorship}
            className="text-[10px] font-mono text-[#FDCC0D] hover:text-white underline decoration-dotted transition-colors cursor-pointer"
          >
            {subtitleText}
          </button>
          <span className="text-[9px] font-mono text-slate-500">
            10s ROTACIÓN
          </span>
        </div>
      )}
    </div>
  );
};
