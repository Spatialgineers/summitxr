import React from 'react';
import { formatCount, useVisitStats } from './visitRadarStore';

/* Lives apart from the radar so the HUD doesn't pull Leaflet into the first load. */

/** Compact public counter for the HUD bars. Click opens the radar. */
export const VisitCounterChip: React.FC<{ onOpen?: () => void; className?: string }> = ({ onOpen, className }) => {
  const stats = useVisitStats();
  if (!stats) return null;
  return (
    <button type="button" className={`sgx-visit-chip ${className || ''}`} onClick={onOpen} title="Radar de visitas" data-sgx-hover>
      <span className="sgx-led" aria-hidden="true" />
      <span className="sgx-readout"><span className="sgx-readout__k">VIS</span>{formatCount(stats.totalVisits)}</span>
      <span className="sgx-readout"><span className="sgx-readout__k">ÚNI</span>{formatCount(stats.uniqueVisitors)}</span>
    </button>
  );
};
