import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import {
  PART_COUNTS, PART_NAMES, PILOT_SWATCHES, SHELL_SWATCHES,
  pilotSvg, randomPilot, varyPilot, type PilotConfig, type PilotPart,
} from './pilotAvatar';

/* PILOT BUILDER: the visitor builds their pilot part by part. Every part
   has a visual picker, colors are free, "Sorpresa" rolls a whole new pilot
   and "Variar" nudges one or two parts of the current one. */

type Tab = PilotPart | 'colors';
const TABS: Tab[] = ['helmet', 'visor', 'eyes', 'crest', 'armor', 'emblem', 'pattern', 'colors'];
const TAB_LABEL: Record<Tab, [string, string]> = {
  helmet: ['Casco', 'Helmet'], visor: ['Visor', 'Visor'], eyes: ['Ojos', 'Eyes'], crest: ['Cresta', 'Crest'],
  armor: ['Armadura', 'Armor'], emblem: ['Emblema', 'Emblem'], pattern: ['Patrón', 'Pattern'], colors: ['Colores', 'Colors'],
};
const COLOR_ROWS: { key: 'primary' | 'secondary' | 'glow' | 'shell'; label: [string, string] }[] = [
  { key: 'primary', label: ['Trazo y emblema', 'Trim and emblem'] },
  { key: 'secondary', label: ['Detalles', 'Details'] },
  { key: 'glow', label: ['Luz del visor', 'Visor light'] },
  { key: 'shell', label: ['Casco y armadura', 'Helmet and armor'] },
];

interface Props {
  value: PilotConfig;
  onChange: (next: PilotConfig) => void;
  accent: string;
  callsign?: string;
  /** Inside the Forge: a shorter layout. */
  compact?: boolean;
}

const Svg: React.FC<{ c: PilotConfig; size: number; className?: string }> = ({ c, size, className }) => {
  const html = useMemo(() => pilotSvg(c, { size }), [c, size]);
  return <span className={className} style={{ display: 'block', width: size, height: size * 1.2, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
};

export const PilotBuilder: React.FC<Props> = ({ value, onChange, accent, callsign, compact = false }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const L = (pair: [string, string]) => pair[es ? 0 : 1];
  const [tab, setTab] = useState<Tab>('helmet');
  const history = useRef<PilotConfig[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [rolling, setRolling] = useState(false);

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
  const step = (part: PilotPart, dir: 1 | -1) => {
    const n = PART_COUNTS[part];
    set({ ...value, [part]: (value[part] + dir + n) % n });
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
        <div className={`sgx-pilotb__preview ${rolling ? 'is-rolling' : ''}`}>
          <Svg c={value} size={compact ? 150 : 210} />
          <span className="sgx-pilotb__floor" aria-hidden="true" />
        </div>
        {callsign && <p className="sgx-pilotb__callsign">{callsign}</p>}
        <div className="sgx-pilotb__rolls">
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={surprise}>⚄ {es ? 'Sorpresa' : 'Surprise me'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => set(varyPilot(value), 860)}>↻ {es ? 'Variar' : 'Vary'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={undo} disabled={!canUndo}>↶ {es ? 'Deshacer' : 'Undo'}</button>
        </div>
      </div>

      <div className="sgx-pilotb__panel">
        <div className="sgx-pilotb__tabs" role="tablist" aria-label={es ? 'Piezas del piloto' : 'Pilot parts'}>
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
                  onClick={() => set({ ...value, [tab]: i })}
                >
                  <Svg c={{ ...value, [tab]: i }} size={thumbSize} />
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
                  {(row.key === 'shell' ? SHELL_SWATCHES : PILOT_SWATCHES).map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      className={value[row.key].toUpperCase() === hex.toUpperCase() ? 'is-on' : ''}
                      style={{ background: hex }}
                      aria-label={hex}
                      onClick={() => set({ ...value, [row.key]: hex })}
                    />
                  ))}
                  <label className="sgx-pilotb__picker" title={es ? 'Cualquier color' : 'Any color'}>
                    <input type="color" value={value[row.key].length === 7 ? value[row.key] : '#FDCC0D'} onChange={(e) => onChange({ ...value, [row.key]: e.target.value.toUpperCase() })} />
                    <span aria-hidden="true">+</span>
                  </label>
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
