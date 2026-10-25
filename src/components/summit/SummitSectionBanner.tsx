import React, { useState } from 'react';
import { SummitSectionKey } from './SummitSectionsDropdown';
import { 
  SECTION_TO_SLUG, 
  copySectionLinkToClipboard, 
  getShareableSectionUrl 
} from '../../lib/summitUrlSync';
import { 
  Link, 
  Share2, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Info
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';

interface SummitSectionBannerProps {
  sectionKey: SummitSectionKey;
  title: string;
  subtitle: string;
  pillarBadge: string;
  pillarIconUrl?: string;
  children?: React.ReactNode;
  additionalParams?: Record<string, string | number | undefined>;
}

export const SummitSectionBanner: React.FC<SummitSectionBannerProps> = ({
  sectionKey,
  title,
  subtitle,
  pillarBadge,
  pillarIconUrl,
  children,
  additionalParams,
}) => {
  const { tenant } = useTenantTheme();
  const [copied, setCopied] = useState(false);

  const slug = SECTION_TO_SLUG[sectionKey] || sectionKey.toLowerCase();
  const shareUrl = getShareableSectionUrl(sectionKey, additionalParams);

  const getPillarColor = (badge: string) => {
    const b = badge.toUpperCase();
    if (b.includes('STORY')) return { border: '#FDCC0D', bg: '#FDCC0D25', text: '#FDCC0D', glow: 'rgba(253, 204, 13, 0.45)' };
    if (b.includes('SPARK')) return { border: '#FF6B00', bg: '#FF6B0025', text: '#FF6B00', glow: 'rgba(255, 107, 0, 0.45)' };
    if (b.includes('SHOWCASE')) return { border: '#00FFFF', bg: '#00FFFF25', text: '#00FFFF', glow: 'rgba(0, 255, 255, 0.45)' };
    if (b.includes('STAGE')) return { border: '#FFFFFF', bg: '#FFFFFF20', text: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.45)' };
    if (b.includes('SYSTEM')) return { border: '#32527B', bg: '#32527B35', text: '#60A5FA', glow: 'rgba(50, 82, 123, 0.55)' };
    if (b.includes('SYNTHESIZE')) return { border: '#FDCC0D', bg: '#FDCC0D25', text: '#FDCC0D', glow: 'rgba(253, 204, 13, 0.45)' };
    return { border: 'var(--sgx-primary)', bg: 'var(--sgx-primary)/15', text: 'var(--sgx-neon)', glow: 'rgba(0, 255, 255, 0.3)' };
  };

  const pCol = getPillarColor(pillarBadge);

  const handleCopy = async () => {
    const success = await copySectionLinkToClipboard(sectionKey, additionalParams);
    if (success) {
      setCopied(true);
      playUiChirp(880);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Spatialgineers Summit 2026 — ${title}`,
          text: subtitle,
          url: shareUrl,
        });
        playUiChirp(750);
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopy();
  };

  return (
    <div 
      className="p-4 sm:p-5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] shadow-xl relative overflow-hidden mb-6"
      style={{
        clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
        borderLeft: `4px solid ${pCol.border}`,
        boxShadow: `0 8px 24px rgba(0,0,0,0.5), 0 0 15px ${pCol.glow}`,
      }}
    >
      {/* Background Subtle Gradient */}
      <div 
        className="absolute top-0 right-0 w-80 h-32 opacity-15 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${pCol.border}, transparent 70%)`
        }}
      />

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
        
        {/* Left Side: Pillar Emblem, Title & Subtitle */}
        <div className="flex items-start space-x-3.5 min-w-0">
          {pillarIconUrl ? (
            <img 
              src={pillarIconUrl} 
              alt={pillarBadge} 
              className="w-8 h-8 sm:w-10 sm:h-10 object-contain shrink-0 mt-0.5" 
            />
          ) : (
            <div className="w-9 h-9 bg-[#101827] border flex items-center justify-center shrink-0" style={{ borderColor: pCol.border }}>
              <Sparkles className="w-4 h-4" style={{ color: pCol.text }} />
            </div>
          )}

          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center space-x-2 flex-wrap">
              <span 
                className="text-[10px] font-mono font-bold px-2 py-0.5 border uppercase tracking-wider rounded-xs"
                style={{
                  backgroundColor: pCol.bg,
                  borderColor: pCol.border,
                  color: pCol.text,
                }}
              >
                {pillarBadge}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                #/{slug}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wide break-words">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-mono line-clamp-2">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right Side: Quick Action Deep Link Buttons & Custom Slot */}
        <div className="flex items-center flex-wrap gap-2 shrink-0 self-start md:self-center">
          {children}

          {/* Direct Link Share Button */}
          <button
            type="button"
            onClick={handleShare}
            className="px-2.5 sm:px-3 py-1.5 bg-[#0C1524] hover:bg-[#15223A] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-primary)] text-slate-200 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            title="Compartir enlace directo a esta sección"
          >
            <Share2 className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
            <span className="hidden sm:inline">COMPARTIR</span>
          </button>

          {/* Copy URL Link Button with Animation */}
          <button
            type="button"
            onClick={handleCopy}
            className={`px-3 py-1.5 text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-md ${
              copied
                ? 'bg-emerald-500 text-black border border-emerald-400'
                : 'bg-[var(--sgx-primary)]/15 hover:bg-[var(--sgx-primary)] hover:text-black border border-[var(--sgx-primary)] text-[var(--sgx-primary)]'
            }`}
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            title={`Copiar enlace directo: ${shareUrl}`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span>¡ENLACE COPIADO!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>COPIAR ENLACE</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
