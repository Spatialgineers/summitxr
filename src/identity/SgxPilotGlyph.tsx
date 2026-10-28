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
}

export const SgxPilotGlyph: React.FC<Props> = ({ seed, accent, size = 160, className, config }) => {
  const html = useMemo(
    () => pilotSvg(config || configFromSeed(seed, accent), { size }),
    [config, seed, accent, size],
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
