import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useLite } from '../../lib/lite';
import { SGX_PILLARS, pillarInk } from '../../lib/sgxPillars';
import { navigateToSection } from '../../immersion/navigation';
import { useSgxIdentity } from '../SgxIdentityContext';
import { PILLAR_ACCENT } from '../sgxIdentity';
import { configFromSeed, normalizePilot, type PilotConfig } from '../pilotAvatar';
import { createStudioRoom, type StationId, type StudioRoom } from './roomScene';
import './studioRoom.css';

/* Tu Estudio 3D: the page around the room scene. It feeds the scene with the
   Creador's pass data, draws the joystick and the station prompt, and sends
   each station to the part of the app that already does that job. */

const STATION: Record<StationId, { es: string; en: string; goEs: string; goEn: string }> = {
  computer: { es: 'Tu computadora', en: 'Your computer', goEs: 'Abrir el Reactor de misiones', goEn: 'Open the mission Reactor' },
  wall: { es: 'Pared de Holo Cards', en: 'Holo Card wall', goEs: 'Ver mis contactos', goEn: 'See my contacts' },
  shelf: { es: 'Sellos de los pilares', en: 'Pillar stamps', goEs: 'Editar mi Highbot', goEn: 'Edit my Highbot' },
  portal: { es: 'Portal al núcleo', en: 'Portal to the core', goEs: 'Volver al núcleo', goEn: 'Back to the core' },
};

export const SgxStudioRoom: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const lite = useLite();
  const { identity, xpEarned, missions, isDone, isForged } = useSgxIdentity();
  const hostRef = useRef<HTMLDivElement | null>(null);
  const roomRef = useRef<StudioRoom | null>(null);
  const [near, setNear] = useState<StationId | null>(null);
  const [seen, setSeen] = useState<StationId[]>([]);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [stick, setStick] = useState<{ x: number; y: number; dx: number; dy: number } | null>(null);

  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const pilot = useMemo<PilotConfig>(
    () => (normalizePilot(identity.avatar.pilot, accent) as PilotConfig | null) || configFromSeed(identity.avatar.seed, accent),
    [identity.avatar.pilot, identity.avatar.seed, accent],
  );
  const core = missions.filter((m) => !m.secret);
  const done = core.filter((m) => isDone(m.id)).length;
  const cardsKey = identity.contacts.map((c) => c.code).join(',');
  const stampsKey = SGX_PILLARS.map((p) => (identity.stamps[`pillar:${p.key}`] ? 1 : 0)).join('');

  useEffect(() => {
    const host = hostRef.current;
    if (!host || lite) return;
    setReady(false);
    const room = createStudioRoom(host, {
      pilot, accent, es,
      callsign: identity.callsign || '',
      xp: xpEarned,
      missionsDone: done,
      missionsTotal: core.length,
      stamps: SGX_PILLARS.map((p) => ({ label: p.name, color: pillarInk(p.key), earned: !!identity.stamps[`pillar:${p.key}`] })),
      cards: identity.contacts.slice(0, 7).map((c) => ({ name: c.name, callsign: c.callsign, org: c.organization, color: c.pillar ? PILLAR_ACCENT[c.pillar] : '#00DDFF' })),
      myHolo: identity.holo?.image,
    }, (s) => {
      setNear(s);
      if (s) setSeen((prev) => (prev.includes(s) ? prev : [...prev, s]));
    }, () => setReady(true));
    if (!room) { setFailed(true); return; }
    roomRef.current = room;
    return () => { room.dispose(); roomRef.current = null; };
    // the scene is rebuilt only when what it shows changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite, es, accent, JSON.stringify(pilot), xpEarned, done, cardsKey, stampsKey, identity.holo?.image]);

  const go = (s: StationId) => {
    if (s === 'computer') window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'reactor' } }));
    else if (s === 'wall') window.dispatchEvent(new CustomEvent(isForged ? 'sgx:open_hangar' : 'sgx:open_forge', { detail: { tab: 'rolodex' } }));
    else if (s === 'shelf') window.dispatchEvent(new CustomEvent('sgx:open_avatar'));
    else navigateToSection('OVERVIEW');
  };

  // Floating joystick: press anywhere on the room and drag.
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
  };
  const move = (e: React.PointerEvent) => {
    if (!stick) return;
    let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
    const len = Math.hypot(dx, dy), max = 56;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    setStick({ ...stick, dx, dy });
    roomRef.current?.setMove(dx / max, -dy / max);
  };
  const up = () => { setStick(null); roomRef.current?.setMove(0, 0); };

  if (lite || failed) {
    return (
      <div className="sgx-room sgx-room--lite">
        <h2>{es ? 'Tu Estudio 3D' : 'Your 3D Studio'}</h2>
        <p>{lite
          ? (es ? 'El Modo Ligero está activo y el cuarto 3D no se carga. Apágalo en los ajustes para entrar.' : 'Lite Mode is on, so the 3D room does not load. Turn it off in settings to enter.')
          : (es ? 'Este dispositivo no pudo abrir el cuarto 3D.' : 'This device could not open the 3D room.')}</p>
        <div className="sgx-room__lite-actions">
          {(Object.keys(STATION) as StationId[]).map((s) => (
            <button key={s} type="button" className="sgx-btn" onClick={() => go(s)}>{es ? STATION[s].goEs : STATION[s].goEn}</button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="sgx-room" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div ref={hostRef} className="sgx-room__canvas" aria-label={es ? 'Tu Estudio en 3D' : 'Your Studio in 3D'} />
      {!ready && <div className="sgx-room__loading" role="status">{es ? 'Abriendo tu Estudio…' : 'Opening your Studio…'}</div>}

      <div className="sgx-room__hud">
        <strong>{es ? 'Tu Estudio 3D' : 'Your 3D Studio'}</strong>
        <span>{es ? `Estaciones ${seen.length}/4` : `Stations ${seen.length}/4`}</span>
      </div>
      <p className="sgx-room__help">
        {es ? 'Arrastra para caminar · en teclado: flechas o WASD' : 'Drag to walk · on a keyboard: arrows or WASD'}
      </p>

      {near && (
        <div className="sgx-room__prompt" role="status">
          <span>{es ? STATION[near].es : STATION[near].en}</span>
          <button type="button" className="sgx-btn" onClick={() => go(near)}>{es ? STATION[near].goEs : STATION[near].goEn}</button>
        </div>
      )}

      {stick && (
        <div className="sgx-room__stick" style={{ left: stick.x, top: stick.y }} aria-hidden="true">
          <i style={{ transform: `translate(${stick.dx}px, ${stick.dy}px)` }} />
        </div>
      )}
    </div>
  );
};

export default SgxStudioRoom;
