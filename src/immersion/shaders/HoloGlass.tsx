import React, { useEffect, useRef, useState } from 'react';
import { ShaderCanvas, canRunShaders } from './ShaderCanvas';
import { GLASS_FRAG } from './effects';
import { fxPair, getFxPillar } from './pillarFx';

/* Holo glass behind a big panel (Hangar, Forge, Studio, pilot builder).
   Drop it as the first child of the frame; the frame gets isolation so the
   glass (z-index -1) sits over its CSS background and under its content. It
   follows the frame's own scroll so it always fills the visible box. 30 fps;
   without WebGL2, in lite mode or with reduced motion the CSS background stays. */

export const HoloGlass: React.FC<{ pillar?: string | null }> = ({ pillar }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(() => canRunShaders());

  useEffect(() => {
    const el = ref.current;
    const frame = el?.parentElement;
    if (!el || !frame || !on) return;
    frame.classList.add('sgx-hologlass-host');
    const fit = () => {
      el.style.height = `${frame.clientHeight}px`;
      el.style.transform = `translateY(${frame.scrollTop}px)`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(frame);
    frame.addEventListener('scroll', fit, { passive: true });
    return () => {
      ro.disconnect();
      frame.removeEventListener('scroll', fit);
      frame.classList.remove('sgx-hologlass-host');
    };
  }, [on]);

  if (!on) return null;
  const [a, b] = fxPair(pillar || getFxPillar());
  return (
    <div ref={ref} className="sgx-hologlass" aria-hidden="true">
      <ShaderCanvas fragment={GLASS_FRAG} fps={30} maxDpr={1} uniforms={{ uA: a, uB: b }} onUnsupported={() => setOn(false)} />
    </div>
  );
};

export default HoloGlass;
