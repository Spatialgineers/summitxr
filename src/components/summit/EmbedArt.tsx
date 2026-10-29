import React, { useId } from 'react';

/* Generated preview art for the games hub cards: one small SGX-colored scene per
   kind of experience, so each card shows what it is instead of a reused pillar mark. */

export type EmbedArtKind = 'drone' | 'stream' | 'shader' | 'synth' | 'world' | 'board' | 'code' | 'game';

const Y = '#FDCC0D';
const C = '#00DDFF';
const B = '#32527B';
const O = '#B87000';

export const EmbedArt: React.FC<{ kind: EmbedArtKind; className?: string }> = ({ kind, className }) => {
  const uid = useId().replace(/:/g, '');
  const glow = `sgx-art-glow-${uid}`;
  const blur = `sgx-art-blur-${uid}`;
  return (
    <svg viewBox="0 0 160 90" className={className} aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id={glow} cx="50%" cy="55%" r="65%">
          <stop offset="0" stopColor={B} stopOpacity="0.55" />
          <stop offset="1" stopColor="#050505" stopOpacity="1" />
        </radialGradient>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" /></filter>
      </defs>
      <rect width="160" height="90" fill={`url(#${glow})`} />
      <g stroke={B} strokeOpacity="0.35" strokeWidth="0.5">
        {[20, 40, 60, 80, 100, 120, 140].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="90" />)}
        {[22.5, 45, 67.5].map((y) => <line key={y} x1="0" y1={y} x2="160" y2={y} />)}
      </g>
      {kind === 'drone' && (
        <g fill="none">
          <rect x="6" y="30" width="16" height="60" fill={B} fillOpacity="0.5" />
          <rect x="138" y="22" width="18" height="68" fill={B} fillOpacity="0.5" />
          {[34, 24, 15, 8].map((r, i) => (
            <ellipse key={r} cx="88" cy="44" rx={r} ry={r * 0.82} stroke={C} strokeOpacity={0.35 + i * 0.18} strokeWidth={2.2 - i * 0.4} />
          ))}
          <g transform="translate(58 62)" stroke={Y} strokeWidth="2">
            <line x1="-11" y1="-6" x2="11" y2="6" />
            <line x1="-11" y1="6" x2="11" y2="-6" />
            {[[-11, -6], [11, 6], [-11, 6], [11, -6]].map(([x, y]) => <ellipse key={`${x}${y}`} cx={x} cy={y} rx="6" ry="2" />)}
            <rect x="-3.5" y="-2.5" width="7" height="5" fill={Y} />
          </g>
          <rect x="112" y="60" width="9" height="9" stroke={Y} strokeWidth="1.2" fill={Y} fillOpacity="0.2" transform="rotate(12 116 64)" />
        </g>
      )}
      {kind === 'stream' && (
        <g>
          <rect x="34" y="14" width="92" height="56" fill="#050505" stroke={C} strokeOpacity="0.7" />
          {[20, 26, 32, 38, 44, 50, 56, 62].map((y) => <line key={y} x1="35" y1={y} x2="125" y2={y} stroke={B} strokeOpacity="0.5" strokeWidth="0.6" />)}
          <path d="M72 30 L94 42 L72 54 Z" fill={Y} />
          <circle cx="44" cy="22" r="2.5" fill={C} />
          <rect x="49" y="20" width="18" height="4" fill={C} fillOpacity="0.6" />
          <rect x="62" y="74" width="36" height="3" fill={B} />
          <rect x="62" y="74" width="20" height="3" fill={Y} />
        </g>
      )}
      {kind === 'shader' && (
        <g>
          <g filter={`url(#${blur})`}>
            <circle cx="56" cy="40" r="24" fill={C} fillOpacity="0.75" />
            <circle cx="98" cy="54" r="22" fill={Y} fillOpacity="0.7" />
            <circle cx="112" cy="26" r="16" fill={B} />
            <circle cx="40" cy="70" r="14" fill={O} fillOpacity="0.6" />
          </g>
          <g stroke={C} strokeOpacity="0.25" strokeWidth="0.5">
            {[10, 30, 50, 70, 90, 110, 130, 150].map((x) => <line key={x} x1={x} y1="0" x2={x} y2="90" />)}
          </g>
        </g>
      )}
      {kind === 'synth' && (
        <g>
          {Array.from({ length: 26 }, (_, i) => {
            const h = 6 + Math.abs(Math.sin(i * 0.7) * 22) * (1 - i / 34);
            return <rect key={i} x={8 + i * 5.6} y={82 - h} width="4" height={h} fill={Y} fillOpacity="0.3" />;
          })}
          <path
            d={`M4 40 ${Array.from({ length: 38 }, (_, i) => `L${4 + i * 4.2} ${40 - Math.sin(i * 0.9) * 18 * Math.exp(-i / 60)}`).join(' ')}`}
            fill="none" stroke={C} strokeWidth="2"
          />
        </g>
      )}
      {kind === 'world' && (
        <g strokeWidth="1.2" strokeLinejoin="round">
          {[[80, 30], [62, 46], [98, 46], [80, 62]].map(([x, y], i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <path d="M0 -12 L16 -4 L0 4 L-16 -4 Z" fill={i === 0 ? Y : C} fillOpacity={i === 0 ? 0.85 : 0.35} stroke={i === 0 ? Y : C} />
              <path d="M-16 -4 L0 4 L0 20 L-16 12 Z" fill={B} stroke={C} strokeOpacity="0.6" />
              <path d="M16 -4 L0 4 L0 20 L16 12 Z" fill="#1a2a40" stroke={C} strokeOpacity="0.6" />
            </g>
          ))}
        </g>
      )}
      {kind === 'board' && (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="18" y="18" width="40" height="26" stroke="#FFFFFF" strokeOpacity="0.85" strokeWidth="1.6" transform="rotate(-2 38 31)" />
          <circle cx="114" cy="30" r="14" stroke={C} strokeWidth="1.6" />
          <path d="M60 34 C76 30, 86 30, 98 31" stroke={Y} strokeWidth="1.6" />
          <path d="M93 27 L99 31 L93 35" stroke={Y} strokeWidth="1.6" />
          <path d="M34 50 L34 66 L96 66" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="1.4" strokeDasharray="3 3" />
          <path d="M104 58 q8 -10 16 0 t16 0" stroke={Y} strokeWidth="1.6" />
          <path d="M22 76 l10 -6 l10 6 l10 -6" stroke={C} strokeWidth="1.4" />
        </g>
      )}
      {kind === 'code' && (
        <g fill="none" strokeWidth="3" strokeLinecap="square">
          <path d="M60 28 L44 45 L60 62" stroke={C} />
          <path d="M100 28 L116 45 L100 62" stroke={C} />
          <path d="M86 24 L74 66" stroke={Y} />
        </g>
      )}
      {kind === 'game' && (
        <g>
          <path d="M44 36 h10 v-10 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 Z" fill={C} fillOpacity="0.8" />
          <circle cx="104" cy="34" r="6" fill={Y} />
          <circle cx="118" cy="46" r="6" fill={Y} fillOpacity="0.6" />
          <circle cx="104" cy="58" r="6" fill={O} />
          <circle cx="90" cy="46" r="6" fill={C} fillOpacity="0.5" />
        </g>
      )}
    </svg>
  );
};
