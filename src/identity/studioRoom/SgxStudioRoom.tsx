import { createPortal } from 'react-dom';
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

export const SgxStudioRoom: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
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
  const [hoops, setHoops] = useState(0);
  const holding = useRef(false);
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
    }, () => {
      setReady(true);
      // the room counts as visited from the page and from the Studio tab alike
      window.dispatchEvent(new CustomEvent('sgx:quest_complete', { detail: { questId: 'q_studio3d' } }));
    }, setHoops);
    if (!room) { setFailed(true); return; }
    roomRef.current = room;
    return () => { room.dispose(); roomRef.current = null; };
    // the scene is rebuilt only when what it shows changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lite, es, accent, JSON.stringify(pilot), xpEarned, done, cardsKey, stampsKey, identity.holo?.image]);

  // Like the core, the room is a fixed screen: it fills the window under the header, and the
  // page behind it cannot scroll, so a drag always moves the Highbot and never the page.
  const fixed = !lite && !failed;
  const [inset, setInset] = useState({ top: 0, bottom: 0 });
  useEffect(() => {
    if (!fixed) return;
    const measure = () => {
      // the header and the section bar under it both stay on screen
      const top = Math.max(0, ...Array.from(document.querySelectorAll('.sgx-hdr, .sgx-sechud')).map((el) => el.getBoundingClientRect().bottom));
      const dock = document.querySelector('.sgx-dock');
      const dr = dock && getComputedStyle(dock).display !== 'none' ? dock.getBoundingClientRect() : null;
      setInset({ top: Math.round(top), bottom: dr ? Math.max(0, Math.round(window.innerHeight - dr.top + 6)) : 0 });
    };
    const root = document.documentElement;
    const prev = { overflow: root.style.overflow, overscroll: root.style.overscrollBehavior, body: document.body.style.overflow };
    const noWheel = (e: WheelEvent) => e.preventDefault();
    window.addEventListener('wheel', noWheel, { passive: false });
    window.scrollTo(0, 0);
    root.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    root.style.overscrollBehavior = 'none';
    measure();
    const t = window.setTimeout(() => { window.scrollTo(0, 0); measure(); }, 400);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('wheel', noWheel);
      root.style.overflow = prev.overflow;
      document.body.style.overflow = prev.body;
      root.style.overscrollBehavior = prev.overscroll;
    };
  }, [fixed]);
  const openTab = (tab: string) => window.dispatchEvent(new CustomEvent('sgx:studio_tab', { detail: { tab } }));

  const go = (s: StationId) => {
    // inside Tu Estudio the stations are its own tabs
    if (embedded && s !== 'portal' && s !== 'shelf') {
      const tab = s === 'computer' ? 'reactor' : 'rolodex';
      window.dispatchEvent(new CustomEvent('sgx:studio_tab', { detail: { tab } }));
      return;
    }
    if (s === 'computer') window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'reactor' } }));
    else if (s === 'wall') window.dispatchEvent(new CustomEvent(isForged ? 'sgx:open_hangar' : 'sgx:open_forge', { detail: { tab: 'rolodex' } }));
    else if (s === 'shelf') window.dispatchEvent(new CustomEvent('sgx:open_avatar'));
    else navigateToSection('OVERVIEW');
  };

  // Floating joystick: press anywhere on the room and drag.
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* the pointer is already gone */ }
    // a press on a prop picks it up; anywhere else is the joystick
    if (roomRef.current?.grab(e.clientX, e.clientY)) { holding.current = true; return; }
    setStick({ x: e.clientX, y: e.clientY, dx: 0, dy: 0 });
  };
  const move = (e: React.PointerEvent) => {
    if (holding.current) { roomRef.current?.dragTo(e.clientX, e.clientY); return; }
    if (!stick) return;
    let dx = e.clientX - stick.x, dy = e.clientY - stick.y;
    const len = Math.hypot(dx, dy), max = 56;
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    setStick({ ...stick, dx, dy });
    roomRef.current?.setMove(dx / max, -dy / max);
  };
  const up = () => {
    if (holding.current) { holding.current = false; roomRef.current?.drop(); return; }
    setStick(null); roomRef.current?.setMove(0, 0);
  };

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

  // Portaled to the body: a page section with a transform would otherwise trap the fixed room.
  return createPortal(
    <div className="sgx-room sgx-room--fixed" style={{ top: inset.top, bottom: inset.bottom }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div ref={hostRef} className="sgx-room__canvas" aria-label={es ? 'Tu Estudio en 3D' : 'Your Studio in 3D'} />
      {!ready && <div className="sgx-room__loading" role="status">{es ? 'Abriendo tu Estudio…' : 'Opening your Studio…'}</div>}

      <div className="sgx-room__hud">
        <strong>{es ? 'Tu Estudio 3D' : 'Your 3D Studio'}</strong>
        <span>{es ? `Estaciones ${seen.length}/4` : `Stations ${seen.length}/4`}</span>
        <span id="sgx-room-hoops">{es ? `Canastas ${hoops}` : `Hoops ${hoops}`}</span>
      </div>
      <p className="sgx-room__help">
        {es ? 'Arrastra para caminar (o flechas / WASD) · Agarra un objeto y tíralo al aro' : 'Drag to walk (or arrows / WASD) · Grab an object and throw it at the hoop'}
      </p>

      <nav className="sgx-room__exit" aria-label={es ? 'Salir del cuarto' : 'Leave the room'}>
        {embedded ? (
          <>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => openTab('pass')}>{es ? 'Pase' : 'Pass'}</button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => openTab('bot')}>{es ? 'Tu Highbot' : 'Your Highbot'}</button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => openTab('reactor')}>Reactor</button>
            <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => openTab('rolodex')}>Rolodex</button>
          </>
        ) : (
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => navigateToSection('OVERVIEW')}>{es ? 'Volver al núcleo' : 'Back to the core'}</button>
        )}
      </nav>

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
    </div>,
    document.body,
  );
};

export default SgxStudioRoom;
