import React from 'react';
import { ApprovedSponsor } from '../../types/summit';
import { Award } from 'lucide-react';
import { loadAllApprovedSponsors } from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';

interface SummitSponsorTickerProps {
  sponsors?: ApprovedSponsor[];
  onSelectSponsor: (sponsor: ApprovedSponsor) => void;
  className?: string;
}

export const SummitSponsorTicker: React.FC<SummitSponsorTickerProps> = ({
  sponsors,
  onSelectSponsor,
  className = '',
}) => {
  const { t } = useLanguage();
  const sponsorList = sponsors && sponsors.length > 0 ? sponsors : loadAllApprovedSponsors();
  const activeSponsors = (sponsorList || []).filter(s => s && s.activeInAppTicker !== false);

  if (activeSponsors.length === 0) return null;

  // Duplicate sponsors list to make the loop seamless and endless
  const marqueeSponsors = [...activeSponsors, ...activeSponsors, ...activeSponsors, ...activeSponsors];

  return (
    <div id="summit-sponsor-ticker" className={`w-full bg-[#121212]/95 border-y border-[var(--sgx-secondary)]/60 backdrop-blur-md overflow-hidden py-2.5 px-4 ${className}`}>
      <style>{`
        @keyframes ticker-scroll {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .animate-ticker-belt {
          display: flex;
          align-items: center;
          gap: 10px;
          width: max-content;
          animation: ticker-scroll 35s linear infinite;
        }
        .animate-ticker-belt:hover {
          animation-play-state: paused;
        }
      `}</style>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Label */}
        <div className="flex items-center space-x-2 shrink-0 z-10 bg-[#121212]/95 pr-4">
          <span 
            className="w-2 h-2 bg-[var(--sgx-accent)] animate-ping" 
            style={{ clipPath: 'polygon(1px 0, 100% 0, 100% calc(100% - 1px), calc(100% - 1px) 100%, 0 100%, 0 1px)' }}
          />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--sgx-accent)] flex items-center space-x-1">
            <Award className="w-3.5 h-3.5 animate-pulse" />
            <span>{t('tab_sponsors', 'PATROCINADORES & PARTNERS')}:</span>
          </span>
        </div>

        {/* Sponsor Infinite Track */}
        <div className="flex-1 overflow-hidden relative py-1" style={{ maskImage: 'linear-gradient(to right, transparent, white 20px, white 95%, transparent)', WebkitMaskImage: 'linear-gradient(to right, transparent, white 20px, white 95%, transparent)' }}>
          <div className="animate-ticker-belt">
            {marqueeSponsors.map((sponsor, idx) => (
              <button
                key={`${sponsor.id}-${idx}`}
                onClick={() => onSelectSponsor(sponsor)}
                className="flex items-center space-x-2.5 px-3 py-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/70 hover:border-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)]/10 transition-all text-left shrink-0 group active:scale-95"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <div 
                  className="w-6 h-6 bg-[#121212] border border-[var(--sgx-secondary)]/60 overflow-hidden flex items-center justify-center p-0.5 shrink-0"
                  style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                >
                  <img 
                    src={sponsor.logoUrl} 
                    alt={sponsor.companyName} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
                    }}
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white group-hover:text-[var(--sgx-neon)] font-['Orbitron',sans-serif] tracking-wide transition-colors">
                    {sponsor.companyName}
                  </span>
                  <span className="text-[9px] font-mono text-slate-400 truncate max-w-[150px]">
                    {sponsor.tierName.split('(')[0]}
                  </span>
                </div>
                <span className="text-[10px] text-[var(--sgx-neon)] opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                  ↗
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
