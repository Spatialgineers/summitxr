import React, { useState } from 'react';
import { ArrowRight, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';

/* SUMMIT CLOCKS as a thin full-width band over the 3D core: date, the
   one-line format, four small dials. One tap hides
   it to a small tab (remembered on this device). */

const KEY = 'sgx_clockbar_hidden_v1';

interface Props {
  es: boolean;
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  youtubeUrl: string;
  onDial?: (hz: number, label: string) => void;
}

export const SgxClocksBanner: React.FC<Props> = ({ es, countdown, youtubeUrl, onDial }) => {
  const [hidden, setHidden] = useState(() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } });
  const toggle = (v: boolean) => {
    playUiChirp(v ? 520 : 760);
    setHidden(v);
    try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ }
  };

  const dials = [
    { label: es ? 'DÍAS' : 'DAYS', value: countdown.days, color: '#00DDFF', p: Math.min(1, countdown.days / 120), hz: 1.0 },
    { label: es ? 'HORAS' : 'HRS', value: countdown.hours, color: '#FDCC0D', p: countdown.hours / 24, hz: 1.25 },
    { label: 'MIN', value: countdown.minutes, color: '#FFBB00', p: countdown.minutes / 60, hz: 1.5 },
    { label: es ? 'SEG' : 'SEC', value: countdown.seconds, color: '#B87000', p: countdown.seconds / 60, hz: 1.75 },
  ];

  if (hidden) {
    return (
      <button type="button" className="sgx-clockbar-tab sgx-calm-hide" data-holographic-drawer="true" onClick={(e) => { e.stopPropagation(); toggle(false); }} title={es ? 'Mostrar relojes del Summit' : 'Show the Summit clocks'}>
        <Clock className="w-3.5 h-3.5" />
        <span>{countdown.days}D · {countdown.hours}H · {countdown.minutes}M</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
    );
  }

  return (
    <div className="sgx-clockbar sgx-calm-hide" data-holographic-drawer="true" onClick={(e) => e.stopPropagation()} role="region" aria-label={es ? 'Relojes del Summit' : 'Summit clocks'}>
      <div className="sgx-clockbar__who">
        <span className="sgx-clockbar__date">{es ? '11–13 DIC 2026 · 10:00 AM AST' : 'DEC 11–13, 2026 · 10:00 AM AST'}</span>
        <span className="sgx-clockbar__title">{es ? 'Relojes del Summit' : 'Summit clocks'}</span>
      </div>
      <p className="sgx-clockbar__info">
        {es ? 'Días 1–2 por ' : 'Days 1–2 on '}<a href={youtubeUrl} target="_blank" rel="noopener noreferrer">YouTube Live</a>
        {es ? ' · Día 3 en Chroma Space Studios (por invitación) · Gratis · En español' : ' · Day 3 at Chroma Space Studios (by invitation) · Free · In Spanish'}
      </p>
      <div className="sgx-clockbar__dials">
        {dials.map((d) => {
          const c = 2 * Math.PI * 16;
          return (
            <button key={d.label} type="button" className="sgx-clockbar__dial" onClick={() => onDial?.(d.hz, d.label)} title={es ? `Pulso armónico (${d.label})` : `Harmonic pulse (${d.label})`}>
              <svg viewBox="0 0 40 40" aria-hidden="true">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(50,82,123,0.45)" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none" stroke={d.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - Math.max(0.05, d.p) * c} transform="rotate(-90 20 20)" style={{ transition: 'stroke-dashoffset 0.4s ease-out' }} />
              </svg>
              <b>{String(d.value).padStart(2, '0')}</b>
              <small style={{ color: d.color }}>{d.label}</small>
            </button>
          );
        })}
      </div>
      <button type="button" className="sgx-clockbar__hide" onClick={() => toggle(true)} aria-label={es ? 'Esconder relojes' : 'Hide clocks'} title={es ? 'Esconder' : 'Hide'}>
        <ChevronUp className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SgxClocksBanner;
