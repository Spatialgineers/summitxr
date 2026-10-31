import React, { useEffect, useMemo, useState } from 'react';
import { PORTRAIT_EVENT, configFromSeed, pilotSvg, portraitKey, type PilotConfig } from './pilotAvatar';

/* A Highbot portrait: the one you built, or, for passes forged before the
   builder (and other people's QR), one derived from the seed. Same seed, same
   bot, everywhere. The vector Highbot shows until its 3D portrait is rendered. */

interface Props {
  seed: string;
  accent: string;
  size?: number;
  className?: string;
  config?: PilotConfig | null;
  /** Idle animation (a gentle bob). Off in lists and small chips. */
  animate?: boolean;
}

export const SgxPilotGlyph: React.FC<Props> = ({ seed, accent, size = 160, className, config, animate = false }) => {
  const cfg = useMemo(() => config || configFromSeed(seed, accent), [config, seed, accent]);
  const key = useMemo(() => portraitKey(cfg), [cfg]);
  // redraw when this bot's portrait lands
  const [rev, setRev] = useState(0);
  useEffect(() => {
    const onReady = (e: Event) => { if ((e as CustomEvent<{ key: string }>).detail?.key === key) setRev((n) => n + 1); };
    window.addEventListener(PORTRAIT_EVENT, onReady);
    return () => window.removeEventListener(PORTRAIT_EVENT, onReady);
  }, [key]);
  // a stable {__html}: React 19 rewrites innerHTML for every new object, which would swallow taps on the avatar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const inner = useMemo(() => ({ __html: pilotSvg(cfg, { size, animate }) }), [cfg, size, animate, rev]);
  return (
    <span
      className={`sgx-pilot-glyph ${className || ''}`}
      style={{ display: 'inline-block', width: size, height: size * 1.2, lineHeight: 0 }}
      role="img"
      aria-label="Avatar"
      dangerouslySetInnerHTML={inner}
    />
  );
};

export default SgxPilotGlyph;
