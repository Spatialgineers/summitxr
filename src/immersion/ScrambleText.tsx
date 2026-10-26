import React, { useEffect, useRef, useState } from 'react';

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/<>_+=';

/**
 * Decodes text like a HUD readout: random glyphs settle into the final string,
 * left to right. Renders the final text immediately for screen readers and
 * for reduced-motion users.
 */
export const ScrambleText: React.FC<{ text: string; durationMs?: number; className?: string }> = ({
  text, durationMs = 720, className,
}) => {
  const [shown, setShown] = useState(text);
  const rafRef = useRef(0);

  useEffect(() => {
    let reduce = false;
    try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch {}
    if (reduce || !text) { setShown(text); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const settled = Math.floor(t * text.length);
      let out = text.slice(0, settled);
      for (let i = settled; i < text.length; i++) {
        const ch = text[i];
        out += ch === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      setShown(out);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [text, durationMs]);

  return (
    <span className={className}>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{text}</span>
    </span>
  );
};
