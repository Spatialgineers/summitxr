import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Hand, MousePointer2, Pause, Play, RotateCcw, Share2, SwitchCamera, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { usePilotProfile } from '../../../../context/PilotProfileContext';
import { useSgxIdentity } from '../../../../identity/SgxIdentityContext';
import { getIsAudioMuted, toggleAudioMute } from '../../../../lib/cyberAudioEngine';
import { submitGameScore, useGameRanking, type GameRanking } from '../../../../lib/gameScores';
import { SgxDialog } from '../../../common/SgxDialog';
import { BoltEngine, type BoltHud, type BoltResult } from './boltEngine';
import { HandTracker, coverMap, type Facing } from './handTracker';
import { chargeHum, playBolt, unlockBoltAudio } from './boltSfx';
import { PILLARS, ROUND_SECONDS, CHARGE_MIN, runXp } from './boltConfig';
import './bolt.css';

/* Rayo en tus manos (SGX.Spark): pinch to charge an SGX bolt, release to
   shoot it at floating glyphs over your own camera. Hands are tracked on the
   device; without a camera it plays with touch, mouse or keyboard. */

type Phase = 'intro' | 'loading' | 'countdown' | 'playing' | 'paused' | 'over';
type Mode = 'camera' | 'pointer';
type Tone = 'cyan' | 'yellow' | 'alert';
type CamIssue = null | 'denied' | 'missing' | 'model' | 'other';

interface Over extends BoltResult { xp: number; best: number; newRecord: boolean }
interface Toast { id: number; text: string; tone: Tone }

const EMPTY_HUD: BoltHud = { score: 0, timeLeft: ROUND_SECONDS, energy: 100, shots: 0, hits: 0, seq: 0, mult: 1, charge: 0, boss: null };
const fmt = (n: number, es: boolean) => Math.round(n).toLocaleString(es ? 'es-PR' : 'en-US');
const pct = (a: number) => `${Math.round(a * 100)}%`;
const BEST_KEY = 'sgx_bolt_best';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };

const Game: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { recordActivity } = usePilotProfile();
  const { identity } = useSgxIdentity();
  const playerName = identity.pass?.fullName || identity.callsign || 'Creador';

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BoltEngine | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const pointerActive = useRef(false);
  const keyDown = useRef(false);
  const handLoop = useRef(0);

  const [phase, setPhase] = useState<Phase>('intro');
  const [mode, setMode] = useState<Mode>('camera');
  const [facing, setFacing] = useState<Facing>('user');
  const [multiCam, setMultiCam] = useState(false);
  const [camIssue, setCamIssue] = useState<CamIssue>(null);
  const [hud, setHud] = useState<BoltHud>(EMPTY_HUD);
  const [handSeen, setHandSeen] = useState(false);
  const [count, setCount] = useState(3);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [flash, setFlash] = useState<{ id: number; tone: Tone } | null>(null);
  const [result, setResult] = useState<Over | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [muted, setMuted] = useState(getIsAudioMuted);
  const [shareNote, setShareNote] = useState('');
  const [savedBest, setSavedBest] = useState(readBest);
  const [noGl, setNoGl] = useState(false);
  const ranking = useGameRanking('bolt', phase === 'over' || rankingOpen);

  const live = useRef({ es, recordActivity, playerName, savedBest, phase, mode });
  live.current = { es, recordActivity, playerName, savedBest, phase, mode };
  const coarse = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;

  // ---------------------------------------------------------- engine
  const addToast = useCallback((text: string, tone: Tone = 'cyan') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, text, tone }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2000);
  }, []);

  const onEnd = useCallback((r: BoltResult) => {
    const { es: e, recordActivity: activity, playerName: name, savedBest: prev } = live.current;
    const xp = runXp(r.score, r.shots);
    const newRecord = r.score > prev;
    const best = Math.max(prev, r.score);
    if (newRecord) { try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* private mode */ } setSavedBest(best); }
    if (xp > 0) {
      activity('quest_complete', e ? 'Rayo en tus manos' : 'Lightning in your hands',
        e ? `${fmt(r.score, e)} pts · precisión ${pct(r.accuracy)}` : `${fmt(r.score, e)} pts · accuracy ${pct(r.accuracy)}`, xp, '#00DDFF');
    }
    if (r.score > 0) void submitGameScore('bolt', r.score, name).then(() => ranking.reload());
    const milestone = r.sets > 0 ? 'six_pillars' : r.bossDown ? 'boss_down' : undefined;
    window.dispatchEvent(new CustomEvent('sgx:spark_game', { detail: { game: 'bolt', score: r.score, milestone } }));
    chargeHum(null);
    setResult({ ...r, xp, best, newRecord });
    setPhase('over');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, stage = stageRef.current, pops = popRef.current;
    if (!canvas || !stage || !pops) return;
    let engine: BoltEngine;
    try {
      engine = new BoltEngine(canvas, pops, {
        onHud: setHud,
        onToast: addToast,
        onFlash: (tone) => setFlash({ id: Date.now(), tone }),
        onEnd,
      });
    } catch {
      setNoGl(true);
      return;
    }
    engineRef.current = engine;
    const ro = new ResizeObserver(() => engine.resize(stage.clientWidth, stage.clientHeight));
    ro.observe(stage);
    engine.resize(stage.clientWidth, stage.clientHeight);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(handLoop.current);
      trackerRef.current?.dispose();
      trackerRef.current = null;
      engine.dispose();
      engineRef.current = null;
      chargeHum(null);
    };
  }, [addToast, onEnd]);

  useEffect(() => { engineRef.current?.setLanguage(es); }, [es]);

  useEffect(() => {
    document.body.toggleAttribute('data-sgx-game', phase === 'playing');
    return () => document.body.removeAttribute('data-sgx-game');
  }, [phase]);

  // ---------------------------------------------------------- hand → engine
  const startHandLoop = useCallback(() => {
    cancelAnimationFrame(handLoop.current);
    let seen = false;
    let seenBefore = false;
    const tick = () => {
      handLoop.current = requestAnimationFrame(tick);
      const tr = trackerRef.current, en = engineRef.current, stage = stageRef.current, video = videoRef.current;
      if (!tr || !en || !stage || !video) return;
      const h = tr.hand;
      if (h.present !== seen) { seen = h.present; setHandSeen(seen); }
      if (!h.present || !h.points) {
        en.setSkeleton(null);
        if (seenBefore && !pointerActive.current && !keyDown.current) en.cancelCharge();
        seenBefore = false;
        if (!pointerActive.current) { en.input.present = false; if (!keyDown.current) en.input.down = false; }
        return;
      }
      const map = coverMap(video, stage.clientWidth, stage.clientHeight);
      const px = new Float32Array(42);
      for (let i = 0; i < 21; i++) {
        const [x, y] = map(h.points[i * 3], h.points[i * 3 + 1]);
        px[i * 2] = x; px[i * 2 + 1] = y;
      }
      en.setSkeleton(px);
      seenBefore = true;
      const [cx, cy] = map(h.x, h.y);
      en.input.x = cx; en.input.y = cy;
      en.input.present = true;
      en.input.down = h.pinching || keyDown.current;
    };
    handLoop.current = requestAnimationFrame(tick);
  }, []);

  /** Opens the camera, then loads the tracker. Falls back to pointer mode with a reason. */
  const startCamera = useCallback(async (face: Facing) => {
    const video = videoRef.current;
    if (!video) return false;
    if (!trackerRef.current) trackerRef.current = new HandTracker(video);
    const tr = trackerRef.current;
    try {
      await tr.startCamera(face);
    } catch (err) {
      const name = (err as DOMException)?.name;
      setCamIssue(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'other');
      return false;
    }
    try {
      await tr.loadModel();
    } catch {
      tr.dispose();
      trackerRef.current = null;
      setCamIssue('model');
      return false;
    }
    navigator.mediaDevices.enumerateDevices?.().then((d) => setMultiCam(d.filter((x) => x.kind === 'videoinput').length > 1)).catch(() => undefined);
    tr.run();
    startHandLoop();
    return true;
  }, [startHandLoop]);

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(handLoop.current);
    trackerRef.current?.pauseLoop();
    trackerRef.current?.stopCamera();
    engineRef.current?.setSkeleton(null);
    setHandSeen(false);
  }, []);

  // ---------------------------------------------------------- flow
  const countdownTimer = useRef(0);
  const beginCountdown = useCallback(() => {
    setHud(EMPTY_HUD);
    setResult(null);
    setShareNote('');
    setCount(3);
    setPhase('countdown');
    let n = 3;
    window.clearInterval(countdownTimer.current);
    countdownTimer.current = window.setInterval(() => {
      n -= 1;
      if (n <= 0) {
        window.clearInterval(countdownTimer.current);
        setPhase('playing');
        engineRef.current?.start();
        playBolt('pillar');
      } else { setCount(n); playBolt('clank'); }
    }, 800);
  }, []);
  useEffect(() => () => window.clearInterval(countdownTimer.current), []);

  const play = useCallback(async (m: Mode) => {
    unlockBoltAudio();
    setMode(m);
    setCamIssue(null);
    if (m === 'camera' && !trackerRef.current?.cameraOn) {
      setPhase('loading');
      const ok = await startCamera(facing);
      if (!ok) { setMode('pointer'); setPhase('intro'); return; }
    }
    if (m === 'pointer') stopCamera();
    beginCountdown();
  }, [beginCountdown, facing, startCamera, stopCamera]);

  const pause = useCallback(() => {
    if (live.current.phase !== 'playing') return;
    engineRef.current?.pause();
    setPhase('paused');
  }, []);

  const resume = useCallback(async () => {
    if (live.current.mode === 'camera' && !trackerRef.current?.cameraOn) {
      const ok = await startCamera(facing);
      if (!ok) setMode('pointer');
    }
    setPhase('playing');
    engineRef.current?.resume();
  }, [facing, startCamera]);

  const quit = () => { engineRef.current?.finish(); };

  const flipCamera = async () => {
    const next: Facing = facing === 'user' ? 'environment' : 'user';
    setFacing(next);
    if (mode === 'camera' && trackerRef.current?.cameraOn) {
      try { await trackerRef.current.startCamera(next); } catch { setFacing(facing); await trackerRef.current.startCamera(facing).catch(() => undefined); }
    }
  };

  // pause and release the camera when the tab is hidden
  useEffect(() => {
    const onVis = () => {
      if (!document.hidden) return;
      pause();
      if (live.current.phase === 'countdown') { window.clearInterval(countdownTimer.current); setPhase('paused'); }
      stopCamera();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [pause, stopCamera]);

  // the camera is only on while a run can use it
  useEffect(() => {
    if (phase === 'over' || phase === 'intro') stopCamera();
  }, [phase, stopCamera]);

  // ---------------------------------------------------------- pointer + keys
  const aimFromEvent = (e: React.PointerEvent) => {
    const en = engineRef.current, stage = stageRef.current;
    if (!en || !stage) return;
    const r = stage.getBoundingClientRect();
    en.input.x = e.clientX - r.left;
    en.input.y = e.clientY - r.top;
    en.input.present = true;
  };
  const onPointerDown = (e: React.PointerEvent) => {
    if (phase !== 'playing') return;
    unlockBoltAudio();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    pointerActive.current = true;
    aimFromEvent(e);
    engineRef.current?.press();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (trackerRef.current?.hand.present) return;
    if (e.pointerType === 'mouse' || pointerActive.current) aimFromEvent(e);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!pointerActive.current) return;
    pointerActive.current = false;
    aimFromEvent(e);
    if (engineRef.current) engineRef.current.input.down = keyDown.current;
  };
  const onPointerLeave = () => {
    if (!pointerActive.current && engineRef.current && !trackerRef.current?.hand.present) engineRef.current.input.present = false;
  };

  useEffect(() => {
    if (phase !== 'playing') return;
    const move = new Set<string>();
    let raf = 0;
    const step = () => {
      raf = requestAnimationFrame(step);
      const en = engineRef.current, stage = stageRef.current;
      if (!en || !stage || move.size === 0) return;
      const v = 9;
      if (!en.input.present) { en.input.x = stage.clientWidth / 2; en.input.y = stage.clientHeight * 0.4; en.input.present = true; }
      if (move.has('ArrowLeft')) en.input.x -= v;
      if (move.has('ArrowRight')) en.input.x += v;
      if (move.has('ArrowUp')) en.input.y -= v;
      if (move.has('ArrowDown')) en.input.y += v;
      en.input.x = Math.max(0, Math.min(stage.clientWidth, en.input.x));
      en.input.y = Math.max(0, Math.min(stage.clientHeight, en.input.y));
    };
    raf = requestAnimationFrame(step);
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key.startsWith('Arrow')) { move.add(e.key); e.preventDefault(); }
      else if (e.code === 'Space') {
        e.preventDefault();
        if (e.repeat) return;
        const en = engineRef.current, stage = stageRef.current;
        if (en && stage && !en.input.present) { en.input.x = stage.clientWidth / 2; en.input.y = stage.clientHeight * 0.4; en.input.present = true; }
        keyDown.current = true;
        en?.press();
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') pause();
    };
    const up = (e: KeyboardEvent) => {
      if (e.key.startsWith('Arrow')) move.delete(e.key);
      else if (e.code === 'Space') {
        keyDown.current = false;
        const en = engineRef.current;
        if (en) en.input.down = pointerActive.current || !!trackerRef.current?.hand.pinching;
      }
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [phase, pause]);

  // ---------------------------------------------------------- share
  const share = async () => {
    const url = `${window.location.origin}/juegos`;
    const pts = fmt(result?.score || 0, es);
    const text = es
      ? `Hice ${pts} pts con el rayo SGX en mis manos en el Spatialgineers Summit 2026. ¿Me superas?`
      : `I scored ${pts} pts with the SGX bolt in my hands at Spatialgineers Summit 2026. Can you beat me?`;
    if (navigator.share) {
      try { await navigator.share({ title: es ? 'Rayo en tus manos' : 'Lightning in your hands', text, url }); return; } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setShareNote(es ? 'Enlace copiado.' : 'Link copied.'); } catch { setShareNote(url); }
  };

  // ---------------------------------------------------------- render
  const accuracy = hud.shots ? hud.hits / hud.shots : 0;
  const timeLow = hud.timeLeft <= 10;
  const pillarBar = <div className="sgx-bolt__pillarbar" aria-hidden>{PILLARS.map((p) => <i key={p.key} style={{ background: p.color }} />)}</div>;
  const issueText: Record<Exclude<CamIssue, null>, string> = {
    denied: es ? 'No diste permiso a la cámara. Puedes jugar con toque o ratón, o permitirla en tu navegador y volver a intentar.' : "Camera permission wasn't granted. Play with touch or mouse, or allow it in your browser and try again.",
    missing: es ? 'No encontramos una cámara en este dispositivo. Juega con toque o ratón.' : "We couldn't find a camera on this device. Play with touch or mouse.",
    model: es ? 'No pudimos descargar el rastreador de manos. Revisa tu conexión o juega con toque o ratón.' : "We couldn't download the hand tracker. Check your connection or play with touch or mouse.",
    other: es ? 'La cámara no está disponible ahora (quizás otra app la usa). Juega con toque o ratón.' : 'The camera is not available right now (another app may be using it). Play with touch or mouse.',
  };
  const soundButton = (
    <button type="button" className="sgx-bolt__icon" onClick={() => setMuted(toggleAudioMute())} aria-pressed={!muted} aria-label={muted ? (es ? 'Activar sonido' : 'Unmute') : (es ? 'Silenciar' : 'Mute')}>
      {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
    </button>
  );
  const showHud = phase === 'playing' || phase === 'paused' || phase === 'countdown';

  return (
    <section className={`sgx-bolt is-${mode}`} aria-label={es ? 'Rayo en tus manos' : 'Lightning in your hands'} data-bolt-game>
      <div
        ref={stageRef}
        className="sgx-bolt__stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={onPointerLeave}
      >
        <video ref={videoRef} className={`sgx-bolt__video${facing === 'user' ? ' is-mirrored' : ''}${mode === 'camera' ? ' is-on' : ''}`} playsInline muted aria-hidden />
        <div ref={canvasRef} className="sgx-bolt__gl" />
        <div ref={popRef} className="sgx-bolt__pops" aria-hidden />
        {flash && <div key={flash.id} className={`sgx-bolt__flash is-${flash.tone}`} aria-hidden />}

        {showHud && (
          <div className="sgx-bolt__hud">
            <div className="sgx-bolt__cell">
              <span className="sgx-bolt__lbl">{es ? 'Puntos' : 'Points'}</span>
              <b className="is-yellow">{fmt(hud.score, es)}{hud.mult > 1 && <small> ×{hud.mult}</small>}</b>
            </div>
            <div className="sgx-bolt__cell">
              <span className="sgx-bolt__lbl">{es ? 'Tiempo' : 'Time'}</span>
              <b className={timeLow ? 'is-alert' : ''}>{Math.ceil(hud.timeLeft)}s</b>
            </div>
            <div className="sgx-bolt__cell is-wide">
              <span className="sgx-bolt__lbl">{es ? 'Precisión' : 'Accuracy'}</span>
              <b>{hud.shots ? pct(accuracy) : '—'}</b>
            </div>
            <div className="sgx-bolt__cell sgx-bolt__cell--energy">
              <span className="sgx-bolt__lbl">{es ? 'Energía' : 'Energy'}</span>
              <span className={`sgx-bolt__meter${hud.energy < 20 ? ' is-low' : ''}`} role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(hud.energy)} aria-label={es ? 'Energía' : 'Energy'}>
                <i style={{ transform: `scaleX(${hud.energy / 100})` }} />
              </span>
            </div>
            <div className="sgx-bolt__cell sgx-bolt__seq" title={es ? 'Los 6 pilares en orden' : 'The 6 pillars in order'}>
              <span className="sgx-bolt__lbl">{es ? 'Pilares' : 'Pillars'}</span>
              <span className="sgx-bolt__dots" aria-label={es ? `Pilares en orden: ${hud.seq} de 6. Siguiente: ${PILLARS[hud.seq].name}` : `Pillars in order: ${hud.seq} of 6. Next: ${PILLARS[hud.seq].name}`}>
                {PILLARS.map((p, i) => <i key={p.key} style={{ ['--dot' as string]: p.glow }} className={i < hud.seq ? 'is-done' : i === hud.seq ? 'is-next' : ''} />)}
              </span>
            </div>
            <div className="sgx-bolt__tools">
              {mode === 'camera' && multiCam && (
                <button type="button" className="sgx-bolt__icon" onClick={flipCamera} aria-label={es ? 'Cambiar cámara' : 'Switch camera'} title={es ? 'Cambiar cámara' : 'Switch camera'}><SwitchCamera aria-hidden /></button>
              )}
              {soundButton}
              <button type="button" className="sgx-bolt__icon is-primary" onClick={phase === 'paused' ? resume : pause} disabled={phase === 'countdown'} aria-label={phase === 'paused' ? (es ? 'Continuar' : 'Resume') : (es ? 'Pausa' : 'Pause')}>
                {phase === 'paused' ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
            </div>
          </div>
        )}

        {showHud && hud.boss !== null && (
          <div className="sgx-bolt__boss" role="status">
            <span>{es ? 'Jefe SGX' : 'SGX Boss'}</span>
            <span className="sgx-bolt__meter is-boss"><i style={{ transform: `scaleX(${Math.max(0, hud.boss)})` }} /></span>
          </div>
        )}

        {phase === 'playing' && (
          <div className="sgx-bolt__charge" aria-hidden>
            <i style={{ transform: `scaleX(${hud.charge})` }} className={hud.charge >= CHARGE_MIN ? 'is-full' : ''} />
            <span>{hud.charge >= CHARGE_MIN ? (es ? 'Rayo cargado' : 'Bolt charged') : mode === 'camera' ? (es ? 'Pellizca para cargar' : 'Pinch to charge') : (es ? 'Mantén para cargar' : 'Hold to charge')}</span>
          </div>
        )}

        {phase === 'playing' && mode === 'camera' && !handSeen && (
          <p className="sgx-bolt__hint" role="status"><Hand aria-hidden /> {es ? 'Muestra tu mano a la cámara' : 'Show your hand to the camera'}</p>
        )}

        <div className="sgx-bolt__toasts" aria-live="polite">
          {toasts.map((t) => <span key={t.id} className={`is-${t.tone}`}>{t.text}</span>)}
        </div>

        {phase === 'countdown' && <div className="sgx-bolt__count" aria-live="assertive"><b key={count}>{count}</b></div>}

        {noGl && (
          <div className="sgx-bolt__overlay">
            <div className="sgx-bolt__panel is-sm" role="alert">
              {pillarBar}
              <p className="sgx-bolt__kicker">WebGL</p>
              <h2>{es ? 'Rayo en tus manos' : 'Lightning in your hands'}</h2>
              <p className="sgx-bolt__lead">{es ? 'Este navegador no puede mostrar gráficos 3D (WebGL), así que el juego no puede arrancar aquí. Prueba con otro navegador o dispositivo.' : "This browser can't show 3D graphics (WebGL), so the game can't start here. Try another browser or device."}</p>
            </div>
          </div>
        )}

        {phase === 'intro' && !noGl && (
          <div className="sgx-bolt__overlay">
            <div className="sgx-bolt__panel">
              {pillarBar}
              <p className="sgx-bolt__kicker"><img src="/holo/spark.png" alt="" /> SGX.Spark · {es ? 'Juego con tus manos' : 'Hands-on game'}</p>
              <h2>{es ? 'Rayo en tus manos' : 'Lightning in your hands'}</h2>
              <p className="sgx-bolt__lead">
                {es
                  ? 'Usa tu mano frente a la cámara: junta el pulgar y el índice para cargar un rayo SGX y suéltalos para dispararlo a los glifos que flotan a tu alrededor.'
                  : 'Use your hand in front of the camera: pinch thumb and index to charge an SGX bolt, then let go to shoot it at the glyphs floating around you.'}
              </p>
              <ul className="sgx-bolt__rules">
                <li><img src="/holo/story.png" alt="" /><span><b>{es ? 'Pilares' : 'Pillars'}</b> {es ? '100 pts. Los 6 en orden (Story → Synthesize): +600.' : '100 pts. All 6 in order (Story → Synthesize): +600.'}</span></li>
                <li><img src="/holo/gear.png" alt="" /><span><b>{es ? 'Engranes' : 'Gears'}</b> {es ? '250 pts, pero solo caen con un rayo cargado.' : '250 pts, but only a charged bolt breaks them.'}</span></li>
                <li><i className="sgx-bolt__swatch is-crystal" aria-hidden /><span><b>{es ? 'Cristales' : 'Crystals'}</b> {es ? '150 pts y +15 de energía.' : '150 pts and +15 energy.'}</span></li>
                <li><i className="sgx-bolt__swatch is-glitch" aria-hidden /><span><b>Glitch</b> {es ? 'Evítalos: te quitan puntos y energía.' : 'Avoid them: they cost points and energy.'}</span></li>
                <li><img src="/holo/sgxLogo.png" alt="" /><span><b>{es ? 'Jefe SGX' : 'SGX Boss'}</b> {es ? `Aparece al final de los ${ROUND_SECONDS} s. Derríbalo para el bono.` : `Shows up at the end of the ${ROUND_SECONDS} s. Take it down for the bonus.`}</span></li>
              </ul>
              <div className="sgx-bolt__privacy">
                <Camera aria-hidden />
                <p>
                  <b>{es ? 'La cámara solo se usa en tu dispositivo; no se graba ni se envía nada.' : 'The camera is only used on your device; nothing is recorded or sent.'}</b>{' '}
                  {es ? 'La primera vez se descarga el rastreador de manos (unos 12 MB).' : 'The first time, the hand tracker is downloaded (about 12 MB).'}
                </p>
              </div>
              {camIssue && <p className="sgx-bolt__issue" role="alert">{issueText[camIssue]}</p>}
              {coarse && (
                <div className="sgx-bolt__facing" role="radiogroup" aria-label={es ? 'Cámara' : 'Camera'}>
                  {(['user', 'environment'] as Facing[]).map((f) => (
                    <button key={f} type="button" role="radio" aria-checked={facing === f} className={facing === f ? 'is-on' : ''} onClick={() => setFacing(f)}>
                      {f === 'user' ? (es ? 'Cámara frontal' : 'Front camera') : (es ? 'Cámara trasera' : 'Rear camera')}
                    </button>
                  ))}
                </div>
              )}
              <div className="sgx-bolt__buttons">
                <button type="button" className="sgx-btn" onClick={() => play('camera')} data-bolt-camera autoFocus><Hand className="w-4 h-4" aria-hidden />{es ? 'Jugar con la cámara' : 'Play with camera'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => play('pointer')} data-bolt-pointer><MousePointer2 className="w-4 h-4" aria-hidden />{es ? 'Jugar con toque o ratón' : 'Play with touch or mouse'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setRankingOpen(true)}><Trophy className="w-4 h-4" aria-hidden />Ranking</button>
              </div>
              <p className="sgx-bolt__best">
                {es ? 'Sin cámara: mantén presionado para cargar y suelta para disparar (o Espacio + flechas).' : 'No camera: press and hold to charge, release to shoot (or Space + arrows).'}
                {savedBest > 0 && <> · {es ? 'Tu mejor' : 'Your best'}: <b>{fmt(savedBest, es)} pts</b></>}
              </p>
            </div>
          </div>
        )}

        {phase === 'loading' && (
          <div className="sgx-bolt__overlay">
            <div className="sgx-bolt__panel is-sm" role="status">
              {pillarBar}
              <p className="sgx-bolt__kicker">{es ? 'Preparando' : 'Getting ready'}</p>
              <h2>{es ? 'Activando tus manos' : 'Waking up your hands'}</h2>
              <p className="sgx-bolt__lead">{es ? 'Permite la cámara y espera a que cargue el rastreador de manos. Todo ocurre en tu dispositivo.' : 'Allow the camera and wait for the hand tracker to load. Everything happens on your device.'}</p>
              <span className="sgx-bolt__loading" aria-hidden><i /></span>
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => { trackerRef.current?.dispose(); trackerRef.current = null; play('pointer'); }}>
                <MousePointer2 className="w-4 h-4" aria-hidden />{es ? 'Mejor con toque o ratón' : 'Use touch or mouse instead'}
              </button>
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div className="sgx-bolt__overlay">
            <div className="sgx-bolt__panel is-sm" role="group" aria-label={es ? 'Pausa' : 'Paused'}>
              {pillarBar}
              <p className="sgx-bolt__kicker">{es ? 'En pausa' : 'Paused'}</p>
              <h2>{fmt(hud.score, es)} pts</h2>
              {mode === 'camera' && <p className="sgx-bolt__lead">{es ? 'La cámara se apagó mientras estás en pausa.' : 'The camera is off while paused.'}</p>}
              <div className="sgx-bolt__buttons is-stack">
                <button type="button" className="sgx-btn" onClick={resume} autoFocus><Play className="w-4 h-4" aria-hidden />{es ? 'Continuar' : 'Resume'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={quit}><X className="w-4 h-4" aria-hidden />{es ? 'Terminar partida' : 'End run'}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="sgx-bolt__overlay" data-bolt-over>
            <div className="sgx-bolt__panel">
              {pillarBar}
              <p className="sgx-bolt__kicker">{result.bossDown ? (es ? 'Jefe SGX derribado' : 'SGX Boss down') : (es ? 'Se acabó el tiempo' : "Time's up")}</p>
              <h2>{result.newRecord ? (es ? '¡Nuevo récord!' : 'New best!') : (es ? 'Partida terminada' : 'Run over')}</h2>
              <dl className="sgx-bolt__stats">
                <div><dt>{es ? 'Puntos' : 'Points'}</dt><dd className="is-yellow">{fmt(result.score, es)}</dd></div>
                <div><dt>{es ? 'Precisión' : 'Accuracy'}</dt><dd>{result.shots ? pct(result.accuracy) : '—'}</dd></div>
                <div><dt>{es ? 'XP ganada' : 'XP earned'}</dt><dd>+{result.xp}</dd></div>
                <div><dt>{es ? 'Tu mejor' : 'Your best'}</dt><dd>{fmt(result.best, es)}</dd></div>
              </dl>
              <p className="sgx-bolt__rankline" role="status">
                {es ? `Rayos: ${result.hits}/${result.shots}` : `Bolts: ${result.hits}/${result.shots}`}
                {result.sets > 0 && ` · ${es ? 'Series de 6 pilares' : '6-pillar sets'}: ${result.sets}`}
                {result.bestStreak > 1 && ` · ${es ? 'Mejor racha' : 'Best streak'}: ${result.bestStreak}`}
                {' · '}
                {ranking.status === 'loading' ? (es ? 'Buscando tu puesto…' : 'Finding your place…')
                  : ranking.status === 'error' ? (es ? 'Ranking no disponible ahora' : 'Ranking unavailable right now')
                    : ranking.myRank ? (es ? `Puesto #${ranking.myRank}` : `Place #${ranking.myRank}`)
                      : (es ? 'Entra con tu cuenta para el ranking' : 'Sign in to join the ranking')}
              </p>
              <div className="sgx-bolt__buttons">
                <button type="button" className="sgx-btn" onClick={() => play(mode)} autoFocus><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Jugar otra vez' : 'Play again'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setRankingOpen(true)}><Trophy className="w-4 h-4" aria-hidden />{es ? 'Ver ranking' : 'View ranking'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={share}><Share2 className="w-4 h-4" aria-hidden />{es ? 'Compartir' : 'Share'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => { setCamIssue(null); setPhase('intro'); }}>{es ? 'Menú' : 'Menu'}</button>
              </div>
              {shareNote && <p className="sgx-bolt__best" role="status">{shareNote}</p>}
            </div>
          </div>
        )}
      </div>

      {rankingOpen && (
        <SgxDialog
          open
          onClose={() => setRankingOpen(false)}
          size="sm"
          title={es ? 'Ranking · Rayo en tus manos' : 'Ranking · Lightning in your hands'}
          kicker={es ? 'Top 10 por mejor puntaje' : 'Top 10 by best score'}
          icon={<Trophy className="w-5 h-5 text-[#FDCC0D]" aria-hidden />}
          footer={phase === 'intro' || phase === 'over' ? (
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { setRankingOpen(false); play(mode); }}>{es ? 'Jugar' : 'Play'}</button>
          ) : undefined}
        >
          <RankingList ranking={ranking} es={es} />
        </SgxDialog>
      )}
    </section>
  );
};

const RankingList: React.FC<{ ranking: GameRanking; es: boolean }> = ({ ranking, es }) => {
  const { status, rows, myBest, myRank, reload } = ranking;
  return (
    <div className="sgx-bolt-rank">
      <div className="sgx-bolt-rank__me">
        <div><span>{es ? 'Tu mejor' : 'Your best'}</span><b>{myBest > 0 ? `${fmt(myBest, es)} pts` : '—'}</b></div>
        <div><span>{es ? 'Tu puesto' : 'Your place'}</span><b>{myRank ? `#${myRank}` : '—'}</b></div>
      </div>
      {status === 'loading' && <p className="sgx-bolt-rank__note" role="status">{es ? 'Cargando ranking…' : 'Loading ranking…'}</p>}
      {status === 'error' && (
        <div className="sgx-bolt-rank__note" role="status">
          <p>{es ? 'No pudimos cargar el ranking ahora mismo.' : "We couldn't load the ranking right now."}</p>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={reload}>{es ? 'Reintentar' : 'Retry'}</button>
        </div>
      )}
      {status === 'ready' && rows.length === 0 && <p className="sgx-bolt-rank__note">{es ? 'Todavía nadie tiene puntaje. Juega y sé el primero.' : 'No scores yet. Play and be the first.'}</p>}
      {status === 'ready' && rows.length > 0 && (
        <ol className="sgx-bolt-rank__list">
          {rows.map((r, i) => (
            <li key={r.uid} className={r.isMe ? 'is-me' : ''}>
              <span className="sgx-bolt-rank__pos">{String(i + 1).padStart(2, '0')}</span>
              <span className="sgx-bolt-rank__name">{r.name}{r.isMe ? (es ? ' · tú' : ' · you') : ''}</span>
              <b>{fmt(r.score, es)}</b>
            </li>
          ))}
        </ol>
      )}
      <p className="sgx-bolt-rank__fine">{es ? 'Para aparecer en el ranking entra con tu cuenta; se guarda tu mejor partida.' : 'Sign in to appear in the ranking; your best run is saved.'}</p>
    </div>
  );
};

export default Game;
