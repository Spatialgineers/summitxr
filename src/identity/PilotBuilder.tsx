import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import {
  HAIR_CRESTS, HAIR_SWATCHES, PART_COUNTS, PART_NAMES, PILOT_SWATCHES, SHELL_SWATCHES,
  normalizePilot, pilotSvg, randomPilot, varyPilot, type PilotConfig, type PilotPart,
} from './pilotAvatar';

// three.js only loads when someone opens the 3D view.
const SgxPilot3D = lazy(() => import('./SgxPilot3D').then((m) => ({ default: m.SgxPilot3D })));

/* PILOT BUILDER: the visitor builds their XR avatar part by part. Every part
   has a visual picker, colors come only from the official SGX palette,
   "Sorpresa" rolls a whole new avatar and "Variar" nudges one or two parts. */

type Tab = PilotPart | 'colors';
const TABS: Tab[] = ['helmet', 'hair', 'visor', 'eyes', 'crest', 'armor', 'emblem', 'pattern', 'colors'];
const TAB_LABEL: Record<Tab, [string, string]> = {
  helmet: ['Cabeza', 'Head'], hair: ['Cabello', 'Hair'], visor: ['Visor XR', 'XR headset'], eyes: ['Interfaz', 'Interface'], crest: ['Accesorio', 'Gear'],
  armor: ['Ropa', 'Outfit'], emblem: ['Emblema', 'Emblem'], pattern: ['Textura', 'Texture'], colors: ['Colores', 'Colors'],
};
const COLOR_ROWS: { key: 'primary' | 'secondary' | 'glow' | 'shell' | 'hairColor'; label: [string, string]; swatches: string[] }[] = [
  { key: 'primary', label: ['Trazo y emblema', 'Trim and emblem'], swatches: PILOT_SWATCHES },
  { key: 'secondary', label: ['Detalles', 'Details'], swatches: PILOT_SWATCHES },
  { key: 'glow', label: ['Luz del visor', 'Visor light'], swatches: PILOT_SWATCHES },
  { key: 'shell', label: ['Cabeza y ropa', 'Head and outfit'], swatches: SHELL_SWATCHES },
  { key: 'hairColor', label: ['Cabello', 'Hair'], swatches: HAIR_SWATCHES },
];
const HAIR_TONE_NAMES: Record<string, [string, string]> = {
  '#121212': ['Negro', 'Black'], '#2E1D14': ['Castaño oscuro', 'Dark brown'], '#5A3622': ['Castaño', 'Brown'], '#8A4A24': ['Cobrizo', 'Auburn'],
  '#B87000': ['Cobre SGX', 'SGX copper'], '#D9D4C7': ['Canoso', 'Silver gray'], '#FDCC0D': ['Amarillo SGX', 'SGX yellow'], '#00DDFF': ['Cian SGX', 'SGX cyan'],
  '#5D86C6': ['Azul SGX', 'SGX blue'], '#FFF9E2': ['Platino', 'Platinum'],
};

interface Props {
  value: PilotConfig;
  onChange: (next: PilotConfig) => void;
  accent: string;
  callsign?: string;
  /** Inside the Forge: a shorter layout. */
  compact?: boolean;
}

const Svg: React.FC<{ c: PilotConfig; size: number; className?: string; animate?: boolean }> = ({ c, size, className, animate }) => {
  const html = useMemo(() => pilotSvg(c, { size, animate }), [c, size, animate]);
  return <span className={className} style={{ display: 'block', width: size, height: size * 1.2, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
};

export const PilotBuilder: React.FC<Props> = ({ value: raw, onChange, accent, callsign, compact = false }) => {
  // avatars saved before a part existed (hair) get its default here
  const value = useMemo(() => normalizePilot(raw, accent) || raw, [raw, accent]);
  const { language } = useLanguage();
  const es = language === 'es';
  const L = (pair: [string, string]) => pair[es ? 0 : 1];
  const [tab, setTab] = useState<Tab>('helmet');
  const history = useRef<PilotConfig[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [view3d, setView3d] = useState(false);

  const set = (next: PilotConfig, sound = 760) => {
    history.current = [...history.current.slice(-24), value];
    setCanUndo(true);
    playUiChirp(sound);
    onChange(next);
  };
  const undo = () => {
    const prev = history.current.pop();
    setCanUndo(history.current.length > 0);
    if (prev) { playUiChirp(420); onChange(prev); }
  };
  // a hairstyle and a hair-like accessory (mohawk, spikes) never stack: the newest wins
  const withPart = (part: PilotPart, i: number): PilotConfig => {
    const next = { ...value, [part]: i };
    if (part === 'hair' && i && HAIR_CRESTS.includes(next.crest)) next.crest = 0;
    if (part === 'crest' && HAIR_CRESTS.includes(i)) next.hair = 0;
    return next;
  };
  const step = (part: PilotPart, dir: 1 | -1) => {
    const n = PART_COUNTS[part];
    set(withPart(part, (value[part] + dir + n) % n));
  };
  const surprise = () => {
    setRolling(true);
    window.setTimeout(() => setRolling(false), 420);
    set(randomPilot(accent), 980);
  };

  // keyboard: ← → step the open part
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tab === 'colors' || (e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') step(tab, 1);
      if (e.key === 'ArrowLeft') step(tab, -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const thumbSize = compact ? 52 : 60;

  return (
    <div className={`sgx-pilotb ${compact ? 'sgx-pilotb--compact' : ''}`} style={{ ['--pilot-accent' as string]: value.primary }}>
      <div className="sgx-pilotb__stage">
        <div className="sgx-pilotb__view" role="group" aria-label={es ? 'Vista' : 'View'}>
          <button type="button" aria-pressed={!view3d} className={!view3d ? 'is-on' : ''} onClick={() => setView3d(false)}>2D</button>
          <button type="button" aria-pressed={view3d} className={view3d ? 'is-on' : ''} onClick={() => { playUiChirp(700); setView3d(true); }}>3D</button>
        </div>
        {view3d ? (
          <div className="sgx-pilotb__preview sgx-pilotb__preview--3d">
            <Suspense fallback={<span className="sgx-pilotb__loading">{es ? 'Cargando 3D…' : 'Loading 3D…'}</span>}>
              <SgxPilot3D config={value} height={compact ? 200 : 270} label={es ? 'Tu avatar XR en 3D. Arrastra para girarlo.' : 'Your XR avatar in 3D. Drag to turn it.'} />
            </Suspense>
          </div>
        ) : (
          <div className={`sgx-pilotb__preview ${rolling ? 'is-rolling' : ''}`}>
            <Svg c={value} size={compact ? 150 : 210} animate />
            <span className="sgx-pilotb__floor" aria-hidden="true" />
          </div>
        )}
        {callsign && <p className="sgx-pilotb__callsign">{callsign}</p>}
        <div className="sgx-pilotb__rolls">
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={surprise}>⚄ {es ? 'Sorpresa' : 'Surprise me'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => set(varyPilot(value), 860)}>↻ {es ? 'Variar' : 'Vary'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={undo} disabled={!canUndo}>↶ {es ? 'Deshacer' : 'Undo'}</button>
        </div>
      </div>

      <div className="sgx-pilotb__panel">
        <div className="sgx-pilotb__tabs" role="tablist" aria-label={es ? 'Piezas del avatar' : 'Avatar parts'}>
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => { playUiChirp(640); setTab(t); }}>
              {L(TAB_LABEL[t])}
            </button>
          ))}
        </div>

        {tab !== 'colors' ? (
          <div className="sgx-pilotb__part">
            <div className="sgx-pilotb__stepper">
              <button type="button" onClick={() => step(tab, -1)} aria-label={es ? 'Anterior' : 'Previous'}>◀</button>
              <span>{PART_NAMES[tab][es ? 'es' : 'en'][value[tab]]} <small>{value[tab] + 1}/{PART_COUNTS[tab]}</small></span>
              <button type="button" onClick={() => step(tab, 1)} aria-label={es ? 'Siguiente' : 'Next'}>▶</button>
            </div>
            <div className="sgx-pilotb__grid" role="listbox" aria-label={L(TAB_LABEL[tab])}>
              {Array.from({ length: PART_COUNTS[tab] }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  role="option"
                  aria-selected={value[tab] === i}
                  title={PART_NAMES[tab][es ? 'es' : 'en'][i]}
                  className={value[tab] === i ? 'is-on' : ''}
                  onClick={() => set(withPart(tab, i))}
                >
                  <Svg c={withPart(tab, i)} size={thumbSize} />
                  <span>{PART_NAMES[tab][es ? 'es' : 'en'][i]}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="sgx-pilotb__colors">
            {COLOR_ROWS.map((row) => (
              <div key={row.key} className="sgx-pilotb__colorrow">
                <span className="sgx-pilotb__colorlabel">{L(row.label)}</span>
                <div className="sgx-pilotb__swatches">
                  {row.swatches.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={value[row.key].toUpperCase() === hex.toUpperCase() ? 'is-on' : ''}
                      style={{ background: hex }}
                      aria-label={row.key === 'hairColor' && HAIR_TONE_NAMES[hex] ? L(HAIR_TONE_NAMES[hex]) : hex}
                      aria-pressed={value[row.key].toUpperCase() === hex.toUpperCase()}
                      onClick={() => set({ ...value, [row.key]: hex })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PilotBuilder;
