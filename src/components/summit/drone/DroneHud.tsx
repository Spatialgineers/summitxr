import React from 'react';
import { Pause, Play, Video, Volume2, VolumeX } from 'lucide-react';
import { ROUTE_COLORS, ROUTE_ICONS, ROUTE_NAMES } from './droneConfig';

/* In-run HUD: battery, score with the combo multiplier, the 6 pillars linked
   so far on the route, time, and the camera/sound/pause tools. */

export interface HudState {
  score: number;
  energy: number;
  mult: number;
  combo: number;
  routeIdx: number;
  routes: number;
  time: number;
  speed: number;
  countdown: number;
  warning: string | null;
}

interface Props {
  es: boolean;
  hud: HudState;
  paused: boolean;
  muted: boolean;
  cameraLabel: string;
  zoneLabel: string;
  onCamera: () => void;
  onSound: () => void;
  onPause: () => void;
}

const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');
const clock = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export const RouteChips: React.FC<{ linked: number; es: boolean; big?: boolean }> = ({ linked, es, big }) => (
  <span
    className={`sgx-drone__chips ${big ? 'is-big' : ''}`}
    role="img"
    aria-label={es ? `Ruta de los 6 pilares: ${linked} de 6 enlazados` : `6 Pillars Route: ${linked} of 6 linked`}
  >
    {ROUTE_COLORS.map((c, i) => (
      <i key={c} style={{ ['--dot' as string]: c }} className={i < linked ? 'is-done' : i === linked ? 'is-next' : ''} title={ROUTE_NAMES[i]}>
        <img src={ROUTE_ICONS[i]} alt="" />
      </i>
    ))}
  </span>
);

export const DroneHud: React.FC<Props> = ({ es, hud, paused, muted, cameraLabel, zoneLabel, onCamera, onSound, onPause }) => {
  const low = hud.energy <= 25;
  return (
    <div className="sgx-drone__hud">
      <div className="sgx-drone__cell sgx-drone__cell--battery">
        <span className="sgx-drone__lbl">{es ? 'Batería' : 'Battery'}</span>
        <b className={low ? 'is-alert' : ''}>{Math.ceil(hud.energy)}%</b>
        <span className={`sgx-drone__meter ${low ? 'is-low' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.ceil(hud.energy)} aria-label={es ? 'Batería' : 'Battery'}>
          <i style={{ transform: `scaleX(${hud.energy / 100})` }} />
        </span>
      </div>
      <div className="sgx-drone__cell sgx-drone__cell--score">
        <span className="sgx-drone__lbl">{es ? 'Puntos' : 'Points'}</span>
        <b className="is-yellow" data-drone-score>{fmt(hud.score, es)}</b>
        {hud.mult > 1 && <em className="sgx-drone__mult" key={hud.mult}>×{hud.mult}</em>}
      </div>
      <div className="sgx-drone__cell sgx-drone__route">
        <span className="sgx-drone__lbl">
          {es ? 'Ruta 6 pilares' : '6 Pillars Route'}
          {hud.routes > 0 && <span className="is-yellow"> · ×{hud.routes}</span>}
        </span>
        <RouteChips linked={hud.routeIdx} es={es} />
      </div>
      <div className="sgx-drone__cell is-wide">
        <span className="sgx-drone__lbl">{zoneLabel}</span>
        <b>{clock(hud.time)} · {hud.speed} km/h</b>
      </div>
      <div className="sgx-drone__tools">
        <button type="button" className="sgx-drone__icon" onClick={onCamera} aria-label={cameraLabel} title={cameraLabel}><Video aria-hidden /></button>
        <button type="button" className="sgx-drone__icon" onClick={onSound} aria-pressed={!muted} aria-label={muted ? (es ? 'Activar sonido' : 'Unmute') : (es ? 'Silenciar' : 'Mute')}>
          {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
        </button>
        <button type="button" className="sgx-drone__icon is-primary" onClick={onPause} aria-label={paused ? (es ? 'Continuar' : 'Resume') : (es ? 'Pausa' : 'Pause')}>
          {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
        </button>
      </div>
    </div>
  );
};
