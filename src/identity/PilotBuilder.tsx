import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import {
  BOT_SWATCHES, COLOR_GROUPS, EYELIDS, HEADGEAR, HIGHBOT_PRESETS, MOUTHS, PARTS, PILOT_TEXTURES, PLATES, RELIC_MOUNTS, SOCKET_GEAR, TILE_SIZES, TOP_GEAR, VISORS,
  normalizePilot, pilotSvg, randomPilot, varyPilot, type PilotConfig,
} from './pilotAvatar';

// three.js only loads when the 3D view is on screen.
const SgxPilot3D = lazy(() => import('./SgxPilot3D').then((m) => ({ default: m.SgxPilot3D })));

/* HIGHBOT BUILDER: everyone's avatar is a Highbot. Start from a bot, then
   choose which parts it keeps (no ears, whiskers or mask: a plain bot), its
   headgear and visor, eyelids and mouth, the pillar on the chest gear and the
   logo on the back gear, colors per part group (official SGX palette) and an
   SGX tile mixed into the body color at one of four sizes. "Sorpresa" rolls a
   new bot and "Variar" nudges one or two things. */

type Tab = 'bots' | 'parts' | 'face' | 'plates' | 'colors' | 'texture';
const TABS: Tab[] = ['bots', 'parts', 'face', 'plates', 'colors', 'texture'];
const TAB_LABEL: Record<Tab, [string, string]> = {
  bots: ['Bots', 'Bots'], parts: ['Piezas', 'Parts'], face: ['Cara', 'Face'], plates: ['Pilares', 'Pillars'], colors: ['Colores', 'Colors'], texture: ['Textura', 'Texture'],
};
const SWATCH_NAMES: Record<string, [string, string]> = {
  '#050505': ['Negro SGX', 'SGX black'], '#1A1A1A': ['Grafito', 'Graphite'], '#333333': ['Gris oscuro', 'Dark gray'], '#5A5F66': ['Gris Highbot', 'Highbot gray'],
  '#888888': ['Plata', 'Silver'], '#FFF9E2': ['Marfil', 'Ivory'], '#FFFFFF': ['Blanco', 'White'], '#FDCC0D': ['Amarillo SGX', 'SGX yellow'],
  '#FFBB00': ['Ámbar', 'Amber'], '#B87000': ['Cobre SGX', 'SGX copper'], '#FF4040': ['Rojo Highbot', 'Highbot red'], '#00DDFF': ['Cian SGX', 'SGX cyan'],
  '#5D86C6': ['Azul SGX', 'SGX blue'], '#32527B': ['Azul profundo', 'Deep blue'],
};

interface Props {
  value: PilotConfig;
  onChange: (next: PilotConfig) => void;
  accent: string;
  callsign?: string;
  /** Inside the Forge: a shorter layout. */
  compact?: boolean;
}

const Svg: React.FC<{ c: PilotConfig; size: number; className?: string; animate?: boolean; vector?: boolean }> = ({ c, size, className, animate, vector }) => {
  const html = useMemo(() => pilotSvg(c, { size, animate, vector }), [c, size, animate, vector]);
  return <span className={className} style={{ display: 'block', width: size, height: size * 1.2, lineHeight: 0 }} dangerouslySetInnerHTML={{ __html: html }} />;
};

export const PilotBuilder: React.FC<Props> = ({ value: raw, onChange, accent, callsign, compact = false }) => {
  // old avatars (the XR pilot) come in as their Highbot here
  const value = useMemo(() => normalizePilot(raw, accent) as PilotConfig, [raw, accent]);
  const { language } = useLanguage();
  const es = language === 'es';
  const L = (pair: [string, string]) => pair[es ? 0 : 1];
  const N = (o: { es: string; en: string }) => (es ? o.es : o.en);
  const [tab, setTab] = useState<Tab>('bots');
  const history = useRef<PilotConfig[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [view3d, setView3d] = useState(true);
  const [preset, setPreset] = useState<string | null>(null);

  // the model starts loading as soon as the builder opens
  useEffect(() => { import('./highbot3d').then((m) => m.preloadHighbot()).catch(() => undefined); }, []);

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
  const surprise = () => {
    setRolling(true);
    window.setTimeout(() => setRolling(false), 420);
    setPreset(null);
    set(randomPilot(accent), 980);
  };
  const withColor = (g: keyof PilotConfig['colors'], hex: string): PilotConfig => ({ ...value, colors: { ...value.colors, [g]: hex } });

  const thumb = compact ? 52 : 60;
  const option = (key: string, on: boolean, label: string, c: PilotConfig, onPick: () => void) => (
    <button key={key} type="button" role="option" aria-selected={on} title={label} className={on ? 'is-on' : ''} onClick={onPick}>
      <Svg c={c} size={thumb} vector />
      <span>{label}</span>
    </button>
  );

  return (
    <div className={`sgx-pilotb ${compact ? 'sgx-pilotb--compact' : ''}`} style={{ ['--pilot-accent' as string]: value.colors.iris }}>
      <div className="sgx-pilotb__stage">
        <div className="sgx-pilotb__view" role="group" aria-label={es ? 'Vista' : 'View'}>
          <button type="button" aria-pressed={!view3d} className={!view3d ? 'is-on' : ''} onClick={() => setView3d(false)}>2D</button>
          <button type="button" aria-pressed={view3d} className={view3d ? 'is-on' : ''} onClick={() => { playUiChirp(700); setView3d(true); }}>3D</button>
        </div>
        {view3d ? (
          <div className="sgx-pilotb__preview sgx-pilotb__preview--3d">
            <Suspense fallback={<Svg c={value} size={compact ? 150 : 210} />}>
              <SgxPilot3D config={value} height={compact ? 230 : 300} label={es ? 'Tu Highbot en 3D. Arrastra para girarlo.' : 'Your Highbot in 3D. Drag to turn it.'} />
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
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => { setPreset(null); set(varyPilot(value), 860); }}>↻ {es ? 'Variar' : 'Vary'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={undo} disabled={!canUndo}>↶ {es ? 'Deshacer' : 'Undo'}</button>
        </div>
      </div>

      <div className="sgx-pilotb__panel">
        <div className="sgx-pilotb__tabs" role="tablist" aria-label={es ? 'Partes del Highbot' : 'Highbot parts'}>
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className={tab === t ? 'is-on' : ''} onClick={() => { playUiChirp(640); setTab(t); }}>
              {L(TAB_LABEL[t])}
            </button>
          ))}
        </div>

        {tab === 'bots' && (
          <div className="sgx-pilotb__part">
            <p className="sgx-pilotb__hint">{es ? 'Empieza con un bot y hazlo tuyo en las otras pestañas.' : 'Start from a bot and make it yours in the other tabs.'}</p>
            <div className="sgx-pilotb__grid" role="listbox" aria-label="Bots">
              {HIGHBOT_PRESETS.map((p) => option(p.id, preset === p.id, N(p), p.config, () => { setPreset(p.id); set({ ...p.config, colors: { ...p.config.colors } }, 900); }))}
            </div>
          </div>
        )}

        {tab === 'parts' && (
          <div className="sgx-pilotb__part">
            <span className="sgx-pilotb__colorlabel">{es ? 'Piezas del modelo' : 'Model parts'}</span>
            <div className="sgx-pilotb__chips" role="group" aria-label={es ? 'Piezas del modelo' : 'Model parts'}>
              {PARTS.map((pt) => (
                <button key={pt.id} type="button" aria-pressed={value.parts[pt.id]} className={value.parts[pt.id] ? 'is-on' : ''}
                  onClick={() => set({ ...value, parts: { ...value.parts, [pt.id]: !value.parts[pt.id] } })}>
                  {value.parts[pt.id] ? '✓ ' : ''}{N(pt)}
                </button>
              ))}
            </div>
            {([
              ['sockets', es ? 'En los sockets laterales' : 'On the side sockets', SOCKET_GEAR],
              ['top', es ? 'Desde el botón de arriba' : 'From the top button', TOP_GEAR],
              ['above', es ? 'Sobre y detrás de la cabeza' : 'Above and behind the head', HEADGEAR.map((_, i) => i).filter((i) => i > 0 && !SOCKET_GEAR.includes(i) && !TOP_GEAR.includes(i))],
            ] as const).map(([zone, label, ids]) => (
              <div key={zone} className="sgx-pilotb__colorrow">
                <span className="sgx-pilotb__colorlabel">{label}</span>
                <div className="sgx-pilotb__chips" role="listbox" aria-label={label}>
                  {ids.map((i) => (
                    <button key={i} type="button" role="option" aria-selected={value.headgear === i} className={value.headgear === i ? 'is-on' : ''}
                      onClick={() => set({ ...value, headgear: value.headgear === i ? 0 : i })}>{N(HEADGEAR[i])}</button>
                  ))}
                </div>
              </div>
            ))}
            <p className="sgx-pilotb__hint">{es ? 'Un accesorio a la vez en la cabeza: tocarlo otra vez lo quita.' : 'One headpiece at a time: tap it again to remove it.'}</p>
            <span className="sgx-pilotb__colorlabel">{es ? 'Visor (se engancha a los sockets)' : 'Visor (clips onto the sockets)'}</span>
            <div className="sgx-pilotb__chips" role="listbox" aria-label="Visor">
              {VISORS.map((g, i) => (
                <button key={g.en} type="button" role="option" aria-selected={value.visor === i} className={value.visor === i ? 'is-on' : ''} onClick={() => set({ ...value, visor: i })}>{N(g)}</button>
              ))}
            </div>
          </div>
        )}

        {tab === 'face' && (
          <div className="sgx-pilotb__part">
            <span className="sgx-pilotb__colorlabel">{es ? 'Párpados' : 'Eyelids'}</span>
            <div className="sgx-pilotb__grid" role="listbox" aria-label={es ? 'Párpados' : 'Eyelids'}>
              {EYELIDS.map((e) => option(e.id, value.eyelid === e.id, N(e), { ...value, eyelid: e.id }, () => set({ ...value, eyelid: e.id })))}
            </div>
            <span className="sgx-pilotb__colorlabel">{es ? 'Boca' : 'Mouth'}</span>
            <div className="sgx-pilotb__grid" role="listbox" aria-label={es ? 'Boca' : 'Mouth'}>
              {MOUTHS.map((m) => option(m.id, value.mouth === m.id, N(m), { ...value, mouth: m.id }, () => set({ ...value, mouth: m.id })))}
            </div>
          </div>
        )}

        {tab === 'plates' && (
          <div className="sgx-pilotb__part">
            <span className="sgx-pilotb__colorlabel">{es ? 'Emblema 3D del pilar del pecho' : '3D emblem of the chest pillar'}</span>
            <div className="sgx-pilotb__chips" role="listbox" aria-label={es ? 'Emblema 3D' : '3D emblem'}>
              {RELIC_MOUNTS.map((r) => (
                <button key={r.id} type="button" role="option" aria-selected={value.relic === r.id} className={value.relic === r.id ? 'is-on' : ''} onClick={() => set({ ...value, relic: r.id })}>{N(r)}</button>
              ))}
            </div>
            {([['chest', es ? 'Pecho' : 'Chest'], ['back', es ? 'Espalda' : 'Back']] as const).map(([side, label]) => (
              <div key={side} className="sgx-pilotb__colorrow">
                <span className="sgx-pilotb__colorlabel">{label}</span>
                <div className="sgx-pilotb__plates" role="listbox" aria-label={label}>
                  {PLATES.map((p) => {
                    const on = value[side] === p.id;
                    return (
                      <button key={p.id} type="button" role="option" aria-selected={on} className={on ? 'is-on' : ''} title={N(p)} onClick={() => set({ ...value, [side]: p.id })}>
                        <img src={p.src} alt="" />
                        <span>{N(p)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'colors' && (
          <div className="sgx-pilotb__colors">
            {COLOR_GROUPS.map((g) => (
              <div key={g.id} className="sgx-pilotb__colorrow">
                <span className="sgx-pilotb__colorlabel">{N(g)}</span>
                <div className="sgx-pilotb__swatches">
                  {BOT_SWATCHES.map((hex) => {
                    const on = value.colors[g.id].toUpperCase() === hex;
                    return (
                      <button key={hex} type="button" className={on ? 'is-on' : ''} style={{ background: hex }}
                        aria-label={`${N(g)}: ${SWATCH_NAMES[hex] ? L(SWATCH_NAMES[hex]) : hex}`} aria-pressed={on}
                        onClick={() => set(withColor(g.id, hex))} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'texture' && (
          <div className="sgx-pilotb__part">
            <p className="sgx-pilotb__hint">{es ? 'El patrón se mezcla con el color del cuerpo. Todos los bots son de metal cepillado.' : 'The pattern mixes into the body color. Every bot is brushed metal.'}</p>
            <span className="sgx-pilotb__colorlabel">{es ? 'Tamaño del patrón' : 'Pattern size'}</span>
            <div className="sgx-pilotb__chips" role="listbox" aria-label={es ? 'Tamaño del patrón' : 'Pattern size'}>
              {TILE_SIZES.map((t, i) => (
                <button key={t.en} type="button" role="option" aria-selected={value.tile === i} className={value.tile === i ? 'is-on' : ''} onClick={() => set({ ...value, tile: i })}>{N(t)}</button>
              ))}
            </div>
            <span className="sgx-pilotb__colorlabel">{es ? 'Textura del cuerpo' : 'Body texture'}</span>
            <div className="sgx-pilotb__plates sgx-pilotb__plates--tex" role="listbox" aria-label={es ? 'Textura' : 'Texture'}>
              {PILOT_TEXTURES.map((t, i) => {
                const on = value.pattern === i;
                return (
                  <button key={t.file || 'plain'} type="button" role="option" aria-selected={on} className={on ? 'is-on' : ''} title={N(t)} onClick={() => set({ ...value, pattern: i })}>
                    {t.file ? <img src={`/pilot/tex/${t.file}.png`} alt="" /> : <span className="sgx-pilotb__plain" style={{ background: value.colors.shell }} />}
                    <span>{N(t)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PilotBuilder;
