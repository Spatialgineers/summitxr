import React, { useMemo } from 'react';
import { configFromSeed, pilotSvg, type PilotConfig } from './pilotAvatar';

/* A pilot portrait: the one you built in the Pilot Builder, or, for passes
   forged before it (and other people's QR), one derived from the seed.
   Same seed, same pilot, everywhere. */

interface Props {
  seed: string;
  accent: string;
  size?: number;
  className?: string;
  config?: PilotConfig | null;
  /** Idle animation (breathing, visor glow). Off in lists and small chips. */
  animate?: boolean;
}

export const SgxPilotGlyph: React.FC<Props> = ({ seed, accent, size = 160, className, config, animate = false }) => {
  const html = useMemo(
    () => pilotSvg(config || configFromSeed(seed, accent), { size, animate }),
    [config, seed, accent, size, animate],
  );
  return (
    <span
      className={`sgx-pilot-glyph ${className || ''}`}
      style={{ display: 'inline-block', width: size, height: size * 1.2, lineHeight: 0 }}
      role="img"
      aria-label="Pilot avatar"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

export default SgxPilotGlyph;
