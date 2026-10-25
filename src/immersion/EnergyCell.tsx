import React, { useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { useImmersion } from './ImmersionContext';
import { useLanguage } from '../context/LanguageContext';
import { SgxBolt } from './SgxSymbols';

const BOLT_SHAPE_PATH = 'M1665 62 L121 1265 L763 1266 L382 1987 L1925 784 L1284 782 Z';

let boltShape: confetti.Shape | null = null;
function getBoltShape(): confetti.Shape | null {
  if (boltShape) return boltShape;
  try {
    boltShape = confetti.shapeFromPath({ path: BOLT_SHAPE_PATH });
  } catch {
    boltShape = null;
  }
  return boltShape;
}

export function boltBurst(x: number, y: number, particleCount = 36) {
  const shape = getBoltShape();
  try {
    confetti({
      particleCount,
      spread: 360,
      startVelocity: 22,
      gravity: 0.6,
      ticks: 120,
      scalar: shape ? 1.4 : 0.9,
      origin: { x: x / window.innerWidth, y: y / window.innerHeight },
      colors: ['#FDCC0D', '#00DDFF', '#FFBB00'],
      shapes: shape ? [shape, 'square'] : ['square'],
      disableForReducedMotion: true,
      zIndex: 9990,
    });
  } catch {}
}

/** Cheap deterministic hash so each section hides its cell in its own spot. */
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The hidden SGX Bolt for one section. It appears near a screen edge a few
 * seconds after you arrive, idles for a while, then fades out until the next
 * visit. Never in the center of vision.
 */
export const EnergyCell: React.FC<{ sectionKey: string }> = ({ sectionKey }) => {
  const { state, settings, collectCell, overdrive } = useImmersion();
  const { language } = useLanguage();
  const collected = state.cells.includes(sectionKey);
  const [phase, setPhase] = useState<'hidden' | 'idle' | 'leaving' | 'collected'>('hidden');

  const spot = useMemo(() => {
    const h = hashString(sectionKey);
    const left = h % 2 === 0;
    // Hug the screen edges and skip the vertical middle on the right, where the mission rail lives.
    const x = left ? 2.5 + (h % 3) : 94 + (h % 3);
    const upper = ((h >>> 3) & 1) === 0;
    const y = upper ? 20 + ((h >>> 4) % 16) : 64 + ((h >>> 4) % 14);
    const delay = 3200 + ((h >>> 8) % 4800);
    return { x, y, delay };
  }, [sectionKey]);

  useEffect(() => {
    if (collected || !settings.fx) return;
    setPhase('hidden');
    const show = window.setTimeout(() => setPhase('idle'), spot.delay);
    const leave = window.setTimeout(() => setPhase((p) => (p === 'idle' ? 'leaving' : p)), spot.delay + 24000);
    const gone = window.setTimeout(() => setPhase((p) => (p === 'leaving' ? 'hidden' : p)), spot.delay + 25200);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(leave);
      window.clearTimeout(gone);
    };
  }, [sectionKey, collected, settings.fx, spot.delay]);

  if (!settings.fx || phase === 'hidden' || (collected && phase !== 'collected')) return null;

  const handleCollect = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    if (collectCell(sectionKey)) {
      boltBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, overdrive ? 60 : 36);
      setPhase('collected');
      window.setTimeout(() => setPhase('hidden'), 700);
    }
  };

  return (
    <button
      type="button"
      className={`sgx-cell sgx-cell--${phase}`}
      style={{ left: `clamp(34px, ${spot.x}%, calc(100% - 34px))`, top: `${spot.y}%` }}
      onClick={handleCollect}
      aria-label={language === 'es' ? 'Recoger celda de energía SGX' : 'Collect SGX energy cell'}
      data-sgx-hover
    >
      <span className="sgx-cell__halo" aria-hidden="true" />
      <SgxBolt size={30} className="sgx-cell__bolt" />
    </button>
  );
};
