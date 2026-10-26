import React, { useEffect, useRef } from 'react';
import { ChevronLeft, HelpCircle, Share2 } from 'lucide-react';
import type { SummitSectionKey } from './SummitSectionsDropdown';
import { useImmersion } from '../../immersion/ImmersionContext';
import { SgxBolt } from '../../immersion/SgxSymbols';
import { SECTION_META } from '../../immersion/sections';

export interface HudSectionChip {
  key: SummitSectionKey;
  label: string;
  pillar: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SgxSectionHudBarProps {
  activeSection: SummitSectionKey;
  chips: HudSectionChip[];
  pillarLabel?: string;
  pillarIconUrl?: string;
  onSelect: (key: SummitSectionKey) => void;
  onBack: () => void;
  onTour: () => void;
  onShare: () => void;
  /** The grouped pillar dropdown, rendered at the start of the strip. */
  dropdown?: React.ReactNode;
}

const PILLAR_ORDER = ['SGX.SPARK', 'SGX.STAGE', 'SGX.SHOWCASE', 'SGX.STORY', 'SGX.SYSTEM', 'SGX.SYNTHESIZE'];

function pillarShort(id: string) {
  return id.replace('SGX.', '');
}

/**
 * Single-row tactical HUD for sub-pages: back to the core, pillar breadcrumb with
 * section index, and a pillar-grouped section strip that shows which stations you
 * already visited (cyan LED) and where you collected the energy cell (bolt).
 */
export const SgxSectionHudBar: React.FC<SgxSectionHudBarProps> = ({
  activeSection, chips, pillarLabel, pillarIconUrl, onSelect, onBack, onTour, onShare, dropdown,
}) => {
  const { state } = useImmersion();
  const stripRef = useRef<HTMLDivElement>(null);

  const ordered = [...chips].sort((a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar));
  const activeIndex = ordered.findIndex((c) => c.key === activeSection);
  const active = ordered[activeIndex];
  const stationNumber = Math.max(0, SECTION_META.findIndex((m) => m.key === activeSection)) + 1;

  // Keep the active station in view on narrow screens.
  useEffect(() => {
    // Scroll only the strip; scrollIntoView would also shift the page sideways.
    const strip = stripRef.current;
    const el = strip?.querySelector<HTMLElement>('[data-active="true"]');
    if (strip && el) {
      strip.scrollTo({ left: el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [activeSection]);

  return (
    <div className="sgx-sechud">
      <div className="sgx-sechud__inner">
        <button type="button" className="sgx-sechud__back" onClick={onBack} data-sgx-hover>
          <ChevronLeft className="w-4 h-4" />
          <span>Núcleo</span>
        </button>

        <div className="sgx-sechud__crumb" aria-live="polite">
          {pillarIconUrl && <img src={pillarIconUrl} alt="" referrerPolicy="no-referrer" />}
          <span className="sgx-sechud__pillar">{pillarLabel || active?.pillar}</span>
          <span className="sgx-sechud__sep">//</span>
          <span className="sgx-sechud__index">{String(stationNumber).padStart(2, '0')}</span>
          <span className="sgx-sechud__name">{active?.label || activeSection.replace(/_/g, ' ')}</span>
        </div>

        <div className="sgx-sechud__strip no-scrollbar" ref={stripRef} data-tour="interactive-modules-bar">
          {dropdown}
          {ordered.map((chip, i) => {
            const Icon = chip.icon;
            const isActive = chip.key === activeSection;
            const visited = state.visited.includes(chip.key);
            const cell = state.cells.includes(chip.key);
            const newGroup = i === 0 || ordered[i - 1].pillar !== chip.pillar;
            return (
              <React.Fragment key={chip.key}>
                {newGroup && <span className="sgx-sechud__group">{pillarShort(chip.pillar)}</span>}
                <button
                  type="button"
                  className={`sgx-sechud__tab ${isActive ? 'is-active' : ''}`}
                  data-active={isActive}
                  onClick={() => onSelect(chip.key)}
                  aria-current={isActive ? 'page' : undefined}
                  data-sgx-hover
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{chip.label}</span>
                  {cell ? <SgxBolt size={10} /> : visited ? <span className="sgx-sechud__dot" aria-hidden="true" /> : null}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="sgx-sechud__tools">
          <span className="sgx-readout sgx-sechud__meter" title="Estaciones visitadas">
            <span className="sgx-readout__k">SYNC</span>
            {ordered.filter((c) => state.visited.includes(c.key)).length}/{ordered.length}
          </span>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onTour} title="Tour guiado">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Tour</span>
          </button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onShare} title="Copiar enlace directo">
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Link</span>
          </button>
        </div>
      </div>
      <div className="sgx-sechud__scan" aria-hidden="true" />
    </div>
  );
};
