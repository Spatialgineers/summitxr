import React, { useEffect, useRef } from 'react';
import { ChevronLeft, HelpCircle, Share2 } from 'lucide-react';
import type { SummitSectionKey } from './SummitSectionsDropdown';
import { useImmersion } from '../../immersion/ImmersionContext';
import { SgxBolt } from '../../immersion/SgxSymbols';
import { SGX_PILLARS, findPillar, moduleCode } from '../../lib/sgxPillars';
import { navigateToPillar } from '../../immersion/navigation';
import { VisitCounterChip } from './SummitVisitRadar';

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
  /** Set while a pillar station is open. */
  stationSlug?: string;
}

// Official order: Story, Showcase, Spark, Stage, System, Synthesize.
const PILLAR_ORDER: string[] = SGX_PILLARS.map((p) => p.id);

function pillarShort(id: string) {
  return id.replace('SGX.', '');
}

/**
 * Single-row tactical HUD for sub-pages: back to the core, pillar breadcrumb with
 * section index, and a pillar-grouped section strip that shows which stations you
 * already visited (cyan LED) and where you collected the energy cell (bolt).
 */
export const SgxSectionHudBar: React.FC<SgxSectionHudBarProps> = ({
  activeSection, chips, pillarLabel, pillarIconUrl, onSelect, onBack, onTour, onShare, dropdown, stationSlug,
}) => {
  const { state } = useImmersion();
  const stripRef = useRef<HTMLDivElement>(null);

  const ordered = [...chips].sort((a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar));
  const activeIndex = ordered.findIndex((c) => c.key === activeSection);
  const active = ordered[activeIndex];
  const station = stationSlug ? findPillar(stationSlug) : undefined;
  const code = moduleCode(activeSection) || '00';

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
          {station ? (
            <>
              <span className="sgx-sechud__index">0{station.index}</span>
              <span className="sgx-sechud__name">Estación</span>
            </>
          ) : (
            <>
              <span className="sgx-sechud__index">{code}</span>
              <span className="sgx-sechud__name">{active?.label || activeSection.replace(/_/g, ' ')}</span>
            </>
          )}
        </div>

        <div className="sgx-sechud__strip no-scrollbar" ref={stripRef} data-tour="interactive-modules-bar">
          {!station && dropdown}
          {ordered.map((chip, i) => {
            const Icon = chip.icon;
            const isActive = chip.key === activeSection;
            const visited = state.visited.includes(chip.key);
            const cell = state.cells.includes(chip.key);
            const newGroup = i === 0 || ordered[i - 1].pillar !== chip.pillar;
            return (
              <React.Fragment key={chip.key}>
                {newGroup && (
                  <button
                    type="button"
                    className={`sgx-sechud__group ${station?.id === chip.pillar ? 'is-active' : ''}`}
                    onClick={() => { const p = findPillar(chip.pillar); if (p) navigateToPillar(p.slug); }}
                    title="Abrir la estación del pilar"
                    data-sgx-hover
                  >
                    {String(PILLAR_ORDER.indexOf(chip.pillar) + 1).padStart(2, '0')} {pillarShort(chip.pillar)}
                  </button>
                )}
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
          <VisitCounterChip className="hidden xl:inline-flex" onOpen={() => onSelect('VISITS')} />
          <span className="sgx-readout sgx-sechud__meter" title="Estaciones visitadas">
            <span className="sgx-readout__k">SYNC</span>
            {ordered.filter((c) => state.visited.includes(c.key)).length}/{ordered.length}
          </span>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onTour} title="Reactor: misiones por pilar de tu SGX Pass">
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reactor</span>
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
