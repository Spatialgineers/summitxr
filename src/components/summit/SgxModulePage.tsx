import React from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { SGX_PILLARS, pillarOfSection } from '../../lib/sgxPillars';
import { SECTION_TO_SLUG } from '../../lib/summitUrlSync';
import { SgxPageModeContext } from '../common/SgxPageMode';
import { SummitSectionBanner } from './SummitSectionBanner';
import type { SummitSectionKey } from './sectionKeys';

/* A menu module as its own page: the section banner (the module's name and
   line from lib/sgxPillars, its pillar badge) over the module itself, which
   renders inline (SgxDialog in page mode: no overlay, no close X). */

const PAGE_MODE = { page: true } as const;

export const SgxModulePage: React.FC<{ sectionKey: SummitSectionKey; children: React.ReactNode }> = ({ sectionKey, children }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const pillar = pillarOfSection(sectionKey);
  const mod = SGX_PILLARS.flatMap((p) => p.modules).find((m) => m.kind === 'section' && m.key === sectionKey);
  return (
    <div id={`summit-section-${SECTION_TO_SLUG[sectionKey]}`} className="w-full space-y-6 sgx-modpage-wrap">
      <SummitSectionBanner
        sectionKey={sectionKey}
        title={mod ? mod.label[es ? 'es' : 'en'] : ''}
        subtitle={mod ? mod.desc[es ? 'es' : 'en'] : ''}
        pillarBadge={pillar?.id || 'SGX'}
        pillarIconUrl={pillar?.iconUrl}
      />
      <SgxPageModeContext.Provider value={PAGE_MODE}>{children}</SgxPageModeContext.Provider>
    </div>
  );
};

export default SgxModulePage;
