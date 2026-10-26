import React, { useState, useRef, useEffect } from 'react';
import { 
  SummitSectionKey 
} from './SummitSectionsDropdown';
import { 
  SECTION_TO_SLUG, 
  copySectionLinkToClipboard,
  getShareableSectionUrl 
} from '../../lib/summitUrlSync';
import { 
  Sparkles, 
  Calendar, 
  Mic2, 
  Boxes, 
  Radio, 
  Users, 
  Flame, 
  Compass, 
  Gamepad2, 
  Building2, 
  MessageSquare, 
  Share2, 
  Check, 
  Copy,
  ExternalLink,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useSummitFeatures } from '../../context/SummitFeatureContext';

export interface TabItemMeta {
  key: SummitSectionKey;
  label: string;
  pillarBadge: string;
  icon: React.ElementType;
  iconUrl?: string;
  accentColor?: string;
}

export const SUMMIT_TABS: TabItemMeta[] = [
  {
    key: 'OVERVIEW',
    label: 'Resumen General',
    pillarBadge: 'SYNTHESIZE',
    icon: Sparkles,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
  },
  {
    key: 'AGENDA',
    label: 'Agenda 3 Días',
    pillarBadge: 'STAGE',
    icon: Calendar,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
  },
  {
    key: 'SPEAKERS',
    label: 'Speakers',
    pillarBadge: 'STAGE',
    icon: Mic2,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
  },
  {
    key: 'PILLARS_MANIFESTO',
    label: '6 Pilares & Manifiesto',
    pillarBadge: 'STORY',
    icon: Boxes,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
  },
  {
    key: 'BROADCAST_ROOMS',
    label: 'Salas Broadcast 4K',
    pillarBadge: 'STAGE',
    icon: Radio,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
  },
  {
    key: 'GUILD',
    label: 'Guild Initiates',
    pillarBadge: 'SYSTEM',
    icon: Users,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
  },
  {
    key: 'ENTREPRENEUR_MATCH',
    label: 'SGX.Match',
    pillarBadge: 'SHOWCASE',
    icon: Flame,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
  },
  {
    key: 'MAP_360',
    label: 'Recorrido 360° Chroma',
    pillarBadge: 'SHOWCASE',
    icon: Compass,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
  },
  {
    key: 'EMBEDS_GAMES',
    label: 'Dron & Simulador',
    pillarBadge: 'SPARK',
    icon: Gamepad2,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
  },
  {
    key: 'SPONSORS_HUB',
    label: 'Showcase Marcas',
    pillarBadge: 'SHOWCASE',
    icon: Building2,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
  },
  {
    key: 'NETWORKING',
    label: 'Foros & Red',
    pillarBadge: 'SYNTHESIZE',
    icon: MessageSquare,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
  },
  {
    key: 'SOCIAL_STREAM',
    label: 'Social Stream',
    pillarBadge: 'SHOWCASE',
    icon: Share2,
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
  },
];

interface SummitSectionTabBarProps {
  activeSection: SummitSectionKey;
  onSelectSection: (section: SummitSectionKey) => void;
  className?: string;
  onCopySuccess?: (section: SummitSectionKey) => void;
}

export const SummitSectionTabBar: React.FC<SummitSectionTabBarProps> = ({
  activeSection,
  onSelectSection,
  className = '',
  onCopySuccess,
}) => {
  const { tenant } = useTenantTheme();
  const { isSectionVisible, getSectionStatus } = useSummitFeatures();
  const [copiedSection, setCopiedSection] = useState<SummitSectionKey | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    }
  };

  useEffect(() => {
    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      playUiChirp(400);
    }
  };

  const handleCopyLink = async (e: React.MouseEvent, sec: SummitSectionKey) => {
    e.stopPropagation();
    const success = await copySectionLinkToClipboard(sec);
    if (success) {
      setCopiedSection(sec);
      playUiChirp(880);
      if (onCopySuccess) onCopySuccess(sec);
      setTimeout(() => {
        setCopiedSection(null);
      }, 2500);
    }
  };

  return (
    <div className={`relative bg-[#0F0F0F]/95 border-b border-[var(--sgx-secondary)] backdrop-blur-md ${className}`}>
      
      {/* Scroll indicator left */}
      {canScrollLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-0 top-0 bottom-0 z-20 px-1 bg-gradient-to-r from-[#0F0F0F] via-[#0F0F0F]/90 to-transparent flex items-center justify-center text-slate-300 hover:text-white transition-opacity"
          aria-label="Scroll Izquierda"
        >
          <div className="p-1 bg-[#1C1C1C] border border-[var(--sgx-secondary)] text-xs shadow-md">
            <ChevronLeft className="w-4 h-4 text-[var(--sgx-neon)]" />
          </div>
        </button>
      )}

      {/* Tabs Container */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex items-center space-x-1.5 sm:space-x-2 px-3 sm:px-6 py-2 overflow-x-auto no-scrollbar scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {SUMMIT_TABS.filter((tab) => isSectionVisible(tab.key)).map((tab) => {
          const isActive = activeSection === tab.key;
          const isCopied = copiedSection === tab.key;
          const isMaintenance = getSectionStatus(tab.key) === 'MAINTENANCE';
          const IconComp = tab.icon;

          return (
            <div
              key={tab.key}
              className="flex items-center shrink-0 group relative"
            >
              <button
                type="button"
                onClick={() => {
                  onSelectSection(tab.key);
                  playUiChirp(550);
                }}
                className={`flex items-center space-x-2 px-3 sm:px-3.5 py-1.5 sm:py-2 text-xs font-mono font-bold transition-all relative cursor-pointer ${
                  isActive
                    ? 'bg-[var(--sgx-card-bg)] text-white border-b-2 shadow-lg'
                    : 'bg-[#181818]/70 hover:bg-[#222222] text-slate-400 hover:text-slate-200 border-b-2 border-transparent'
                }`}
                style={{
                  clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                  borderBottomColor: isActive ? 'var(--sgx-primary)' : 'transparent',
                  boxShadow: isActive ? '0 0 16px rgba(var(--sgx-primary-rgb), 0.25)' : undefined,
                }}
                title={`Ir a la sección ${tab.label}`}
              >
                {/* Pillar Icon or fallback */}
                {tab.iconUrl ? (
                  <img
                    src={tab.iconUrl}
                    alt={tab.pillarBadge}
                    className="w-4 h-4 object-contain shrink-0 filter drop-shadow-[0_0_4px_rgba(0, 221, 255,0.4)]"
                  />
                ) : (
                  <IconComp
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-[var(--sgx-neon)]' : 'text-slate-400'
                    }`}
                  />
                )}

                <span className="whitespace-nowrap tracking-wide">
                  {tab.label}
                </span>

                {/* Micro badge indicator */}
                {isMaintenance ? (
                  <span className="text-[9px] uppercase px-1 py-0.2 rounded font-bold bg-[#FDCC0D]/20 text-[#FDCC0D] shrink-0">
                    PRÓX.
                  </span>
                ) : (
                  <span 
                    className={`text-[9px] uppercase px-1 py-0.2 rounded font-bold hidden md:inline shrink-0 ${
                      isActive
                        ? 'bg-[var(--sgx-primary)]/20 text-[var(--sgx-neon)]'
                        : 'text-slate-500'
                    }`}
                  >
                    {tab.pillarBadge}
                  </span>
                )}

                {/* Direct Share Link Button attached to tab */}
                <button
                  type="button"
                  onClick={(e) => handleCopyLink(e, tab.key)}
                  className={`ml-1 p-1 rounded hover:bg-slate-700/60 transition-all ${
                    isCopied
                      ? 'bg-emerald-500 text-black'
                      : isActive
                      ? 'text-slate-300 hover:text-[var(--sgx-neon)]'
                      : 'text-slate-500 hover:text-slate-300 opacity-60 hover:opacity-100'
                  }`}
                  title={`Copiar enlace directo a ${tab.label} (?section=${SECTION_TO_SLUG[tab.key]})`}
                  aria-label={`Copiar enlace directo a ${tab.label}`}
                >
                  {isCopied ? (
                    <Check className="w-3 h-3 text-black" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </button>

              {/* Tooltip feedback for link copying */}
              {isCopied && (
                <div 
                  className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-emerald-500 text-black text-[10px] font-bold font-mono whitespace-nowrap shadow-xl z-30 animate-bounce"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  ¡Enlace copiado!
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Scroll indicator right */}
      {canScrollRight && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-0 top-0 bottom-0 z-20 px-1 bg-gradient-to-l from-[#0F0F0F] via-[#0F0F0F]/90 to-transparent flex items-center justify-center text-slate-300 hover:text-white transition-opacity"
          aria-label="Scroll Derecha"
        >
          <div className="p-1 bg-[#1C1C1C] border border-[var(--sgx-secondary)] text-xs shadow-md">
            <ChevronRight className="w-4 h-4 text-[var(--sgx-neon)]" />
          </div>
        </button>
      )}

    </div>
  );
};
