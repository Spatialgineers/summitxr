import React, { useMemo } from 'react';

/* A pilot portrait generated from a seed: helmet, visor, crest and an SGX bolt
   on the chest, drawn in the pass accent. Same seed, same pilot, everywhere. */

function rng(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

interface Props {
  seed: string;
  accent: string;
  size?: number;
  className?: string;
}

export const SgxPilotGlyph: React.FC<Props> = ({ seed, accent, size = 160, className }) => {
  const g = useMemo(() => {
    const r = rng(seed || 'sgx');
    return {
      helmet: Math.floor(r() * 4),
      visor: Math.floor(r() * 4),
      crest: Math.floor(r() * 4),
      tilt: (r() - 0.5) * 6,
      hue: r() > 0.5 ? '#00DDFF' : '#FDCC0D',
    };
  }, [seed]);
  const second = g.hue === accent ? '#32527B' : g.hue;
  const uid = useMemo(() => `pg${Math.abs([...seed].reduce((a, c) => a * 31 + c.charCodeAt(0), 7)) % 1e6}`, [seed]);

  const helmets = [
    'M50 22 C30 22 22 40 22 58 L22 80 L36 92 L64 92 L78 80 L78 58 C78 40 70 22 50 22 Z',
    'M50 18 L74 30 L80 60 L70 90 L30 90 L20 60 L26 30 Z',
    'M30 26 L70 26 L80 40 L80 82 L68 94 L32 94 L20 82 L20 40 Z',
    'M50 20 C34 20 24 32 22 50 L18 70 L30 92 L70 92 L82 70 L78 50 C76 32 66 20 50 20 Z',
  ];
  const visors = [
    <rect key="v" x="30" y="46" width="40" height="14" rx="2" />,
    <path key="v" d="M28 48 L72 48 L66 62 L34 62 Z" />,
    <path key="v" d="M30 44 L70 44 L70 54 L56 62 L44 62 L30 54 Z" />,
    <ellipse key="v" cx="50" cy="53" rx="21" ry="9" />,
  ];

  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} className={className} role="img" aria-label="Pilot avatar">
      <defs>
        <linearGradient id={`${uid}-v`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={accent} stopOpacity="0.95" />
          <stop offset="1" stopColor={second} stopOpacity="0.7" />
        </linearGradient>
        <pattern id={`${uid}-scan`} width="4" height="4" patternUnits="userSpaceOnUse">
          <rect width="4" height="1" fill="#000" opacity="0.35" />
        </pattern>
      </defs>
      <g transform={`rotate(${g.tilt} 50 60)`}>
        {/* shoulders */}
        <path d="M14 120 L20 100 L38 92 L62 92 L80 100 L86 120 Z" fill="#1a1a1a" stroke={accent} strokeWidth="1.2" />
        <path d="M46 100 L54 100 L50 108 L56 108 L46 118 L49 110 L44 110 Z" fill={accent} />
        {/* crest */}
        {g.crest === 1 && <path d="M50 8 L54 22 L46 22 Z" fill={accent} />}
        {g.crest === 2 && <g stroke={second} strokeWidth="1.5"><line x1="70" y1="28" x2="80" y2="10" /><circle cx="80" cy="9" r="2.4" fill={second} /></g>}
        {g.crest === 3 && <ellipse cx="50" cy="16" rx="22" ry="4" fill="none" stroke={second} strokeWidth="1.2" opacity="0.8" />}
        {/* helmet */}
        <path d={helmets[g.helmet]} fill="#0b0d12" stroke={accent} strokeWidth="1.6" />
        <path d={helmets[g.helmet]} fill={`url(#${uid}-scan)`} opacity="0.5" />
        {/* visor */}
        <g fill={`url(#${uid}-v)`}>{visors[g.visor]}</g>
        <g fill={`url(#${uid}-scan)`}>{visors[g.visor]}</g>
        <line x1="34" y1="50" x2="46" y2="50" stroke="#fff" strokeOpacity="0.6" strokeWidth="1" />
        {/* jaw vents */}
        <g stroke={accent} strokeOpacity="0.6" strokeWidth="1">
          <line x1="40" y1="74" x2="40" y2="82" /><line x1="45" y1="74" x2="45" y2="84" />
          <line x1="55" y1="74" x2="55" y2="84" /><line x1="60" y1="74" x2="60" y2="82" />
        </g>
      </g>
    </svg>
  );
};

export default SgxPilotGlyph;
