import React from 'react';
import { ChevronLeft, HelpCircle, Share2 } from 'lucide-react';
import type { SummitSectionKey } from './sectionKeys';
import { SGX_PILLARS, findPillar, moduleCode } from '../../lib/sgxPillars';
import { VisitCounterChip } from './VisitCounterChip';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

export interface HudSectionChip {
  key: SummitSectionKey;
  label: string;
  labelEn?: string;
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
  /** Set while a pillar station is open. */
  stationSlug?: string;
}

// Official order: Story, Showcase, Spark, Stage, System, Synthesize.
const PILLAR_ORDER: string[] = SGX_PILLARS.map((p) => p.id);

/**
 * Single-row tactical HUD for sub-pages: back to the core, the pillar breadcrumb
 * with the section name, the Reactor and the copy-link button. Moving between
 * sections is the top MENÚ's job.
 */
export const SgxSectionHudBar: React.FC<SgxSectionHudBarProps> = ({
  activeSection, chips, pillarLabel, pillarIconUrl, onSelect, onBack, onTour, onShare, stationSlug,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const sgx = useOptionalSgxIdentity();

  const ordered = [...chips].sort((a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar));
  const activeIndex = ordered.findIndex((c) => c.key === activeSection);
  const active = ordered[activeIndex];
  const station = stationSlug ? findPillar(stationSlug) : undefined;
  const code = moduleCode(activeSection) || '00';

  return (
    <div className="sgx-sechud">
      <div className="sgx-sechud__inner">
        <button type="button" className="sgx-sechud__back" onClick={onBack} data-sgx-hover>
          <ChevronLeft className="w-4 h-4" />
          <span>{es ? 'Núcleo' : 'Core'}</span>
        </button>

        <div className="sgx-sechud__crumb" aria-live="polite">
          {pillarIconUrl && <img src={pillarIconUrl} alt="" referrerPolicy="no-referrer" />}
          <span className="sgx-sechud__pillar">{pillarLabel || active?.pillar}</span>
          <span className="sgx-sechud__sep">//</span>
          {station ? (
            <>
              <span className="sgx-sechud__index">0{station.index}</span>
              <span className="sgx-sechud__name">{es ? 'Estación' : 'Station'}</span>
            </>
          ) : (
            <>
              <span className="sgx-sechud__index">{code}</span>
              <span className="sgx-sechud__name">{(active && loc(active, 'label', language)) || activeSection.replace(/_/g, ' ')}</span>
            </>
          )}
        </div>

        <div className="sgx-sechud__tools">
          <VisitCounterChip className="hidden xl:inline-flex" onOpen={() => onSelect('VISITS')} />
          {/* One progress counter in the whole app: the Reactor. */}
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onTour} title={es ? 'Reactor: misiones por pilar de tu SGX Pass' : 'Reactor: your SGX Pass missions by pillar'}>
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Reactor</span>
            {sgx && <span className="sgx-readout">{sgx.missions.filter((m) => sgx.isDone(m.id)).length}/{sgx.missions.length}</span>}
          </button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onShare} title={es ? 'Copiar enlace directo' : 'Copy direct link'}>
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Link</span>
          </button>
        </div>
      </div>
      <div className="sgx-sechud__scan" aria-hidden="true" />
    </div>
  );
};
