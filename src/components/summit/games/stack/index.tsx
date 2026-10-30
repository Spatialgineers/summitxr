import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, Share2, Trophy, Volume2, VolumeX } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { usePilotProfile } from '../../../../context/PilotProfileContext';
import { useOptionalSgxIdentity } from '../../../../identity/SgxIdentityContext';
import { submitGameScore, useGameRanking } from '../../../../lib/gameScores';
import { getIsAudioMuted, toggleAudioMute } from '../../../../lib/cyberAudioEngine';
import { SgxDialog } from '../../../common/SgxDialog';
import { PILLARS, POWERS, POWER_SPAN, StackEngine, type PowerKind, type StackHud, type StackPop, type StackSummary } from './stackEngine';
import { playStackSfx, unlockStackAudio } from './stackSfx';
import './stack.css';

/* TORRE DE PILARES (SGX.Spark): stack the 6 pillars. Tap / click / Space
   drops the sliding slab; what hangs over is cut. Perfect drops keep the width
   and build a combo; power slabs bring gears, bolts and a shield; the six
   pillars in the official order pay a big bonus. */

type Phase = 'start' | 'playing' | 'paused' | 'over';
type Bi = { es: string; en: string };

const POWER_TEXT: Record<PowerKind, { name: Bi; effect: Bi }> = {
  gear: { name: { es: 'Engranaje', en: 'Gear' }, effect: { es: 'Restaura el ancho de la torre', en: 'Restores the tower width' } },
  magnet: { name: { es: 'Engranaje G', en: 'G Gear' }, effect: { es: `Tus próximas ${POWER_SPAN.magnet} caídas quedan perfectas`, en: `Your next ${POWER_SPAN.magnet} drops land perfect` } },
  slow: { name: { es: 'Rayo', en: 'Bolt' }, effect: { es: `Cámara lenta por ${POWER_SPAN.slow} pisos`, en: `Slow motion for ${POWER_SPAN.slow} floors` } },
  double: { name: { es: 'Rayo nocturno', en: 'Night bolt' }, effect: { es: `Puntos x2 por ${POWER_SPAN.double} pisos`, en: `Double points for ${POWER_SPAN.double} floors` } },
  shield: { name: { es: 'Escudo', en: 'Shield' }, effect: { es: 'Te salva de un fallo', en: 'Saves you from one miss' } },
};
const POWER_ORDER: PowerKind[] = ['gear', 'magnet', 'slow', 'double', 'shield'];

const EMPTY_HUD: StackHud = { score: 0, height: 0, combo: 0, perfects: 0, chain: 0, current: null, magnet: 0, slow: 0, double: 0, shield: false };
const BEST_KEY = 'sgx_stack_best';

interface Popup { id: number; pop: StackPop }
interface Result extends StackSummary { xp: number; best: number; newRecord: boolean }

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');
const runXp = (s: StackSummary) => (s.height < 3 ? 0 : Math.min(150, 40 + s.height * 2 + s.perfects + s.sixPillars * 15));

const PowerIcon: React.FC<{ kind: PowerKind; className?: string }> = ({ kind, className = '' }) => {
  if (kind === 'shield') {
    return (
      <svg className={`sgx-stack__picon ${className}`} viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.5 20 5.3v6.2c0 4.7-3.4 8.4-8 10-4.6-1.6-8-5.3-8-10V5.3z" fill="rgba(143,243,255,0.2)" stroke={POWERS.shield.color} strokeWidth="2" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <span className={`sgx-stack__picon ${className}`} aria-hidden="true">
      <img src={POWERS[kind].mark} alt="" />
      {kind === 'double' && <b>x2</b>}
      {kind === 'slow' && <b>½</b>}
    </span>
  );
};

const StackGame: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const t = (b: Bi) => (es ? b.es : b.en);
  const { recordActivity } = usePilotProfile();
  const identity = useOptionalSgxIdentity()?.identity;
  const playerName = identity?.pass?.fullName || identity?.callsign || 'Creador';

  const stageRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<StackEngine | null>(null);
  const [phase, setPhase] = useState<Phase>('start');
  const [hud, setHud] = useState<StackHud>(EMPTY_HUD);
  const [popups, setPopups] = useState<Popup[]>([]);
  const [result, setResult] = useState<Result | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [muted, setMuted] = useState(getIsAudioMuted());
  const [shareNote, setShareNote] = useState('');
  const [localBest, setLocalBest] = useState(readBest);
  const [noGl, setNoGl] = useState(false);
  const ranking = useGameRanking('stack', phase === 'start' || phase === 'over' || rankingOpen);
  const best = Math.max(localBest, ranking.myBest);

  const live = useRef({ es, recordActivity, playerName, best, reload: ranking.reload });
  live.current = { es, recordActivity, playerName, best, reload: ranking.reload };
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const popSeq = useRef(0);
  const pushPop = useCallback((pop: StackPop) => {
    const id = ++popSeq.current;
    setPopups((prev) => [...prev.filter((p) => p.pop.kind !== pop.kind || pop.kind !== 'perfect').slice(-2), { id, pop }]);
    window.setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), pop.kind === 'perfect' ? 900 : 1900);
  }, []);

  const onOver = useCallback((s: StackSummary) => {
    const { es: e, recordActivity: activity, playerName: name, best: prevBest, reload } = live.current;
    const xp = runXp(s);
    if (xp > 0) {
      activity('quest_complete', e ? 'Torre de Pilares' : 'Pillar Tower',
        e ? `Torre de ${s.height} pisos · ${s.score} pts` : `${s.height}-floor tower · ${s.score} pts`, xp, '#FDCC0D');
    }
    if (s.score > readBest()) { try { localStorage.setItem(BEST_KEY, String(s.score)); } catch { /* private mode */ } }
    setLocalBest(readBest());
    setResult({ ...s, xp, best: Math.max(prevBest, s.score), newRecord: s.score > prevBest && s.score > 0 });
    setShareNote('');
    setPhase('over');
    const milestone = s.sixPillars > 0 ? 'six_pillars' : s.height >= 30 ? 'tower_30' : s.maxCombo >= 10 ? 'combo_10' : undefined;
    window.dispatchEvent(new CustomEvent('sgx:spark_game', { detail: { game: 'stack', score: s.score, milestone } }));
    void submitGameScore('stack', s.score, name).then(() => reload());
  }, []);

  // Engine lives for the whole mount; callbacks reach React through refs.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    // A fresh canvas per mount: a canvas whose context was released cannot be reused.
    const canvas = document.createElement('canvas');
    canvas.className = 'sgx-stack__canvas';
    stage.prepend(canvas);
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let engine: StackEngine;
    try {
      engine = new StackEngine(canvas, {
        reducedMotion,
        onHud: setHud,
        onPop: pushPop,
        onOver,
        onSound: (s, combo) => playStackSfx(s, combo),
      });
    } catch {
      canvas.remove();
      setNoGl(true);
      return;
    }
    engineRef.current = engine;
    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) (window as unknown as { __sgxStack?: StackEngine }).__sgxStack = engine;
    const ro = new ResizeObserver(() => engine.resize(stage.clientWidth, stage.clientHeight));
    ro.observe(stage);
    engine.resize(stage.clientWidth, stage.clientHeight);
    return () => { ro.disconnect(); engine.dispose(); canvas.remove(); engineRef.current = null; };
  }, [onOver, pushPop]);

  const start = useCallback(() => {
    unlockStackAudio();
    setResult(null);
    setPopups([]);
    setRankingOpen(false);
    engineRef.current?.start();
    setPhase('playing');
  }, []);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    engineRef.current?.setPaused(true);
    setPhase('paused');
  }, []);
  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    engineRef.current?.setPaused(false);
    setPhase('playing');
  }, []);

  const drop = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    unlockStackAudio();
    engineRef.current?.drop();
  }, []);

  // Keyboard: Space drops, P / Escape pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (rankingOpen || e.repeat) return;
      const p = phaseRef.current;
      if (e.code === 'Space' && p === 'playing') { e.preventDefault(); drop(); }
      else if ((e.code === 'KeyP' || e.code === 'Escape') && p === 'playing') pause();
      else if (e.code === 'KeyP' && p === 'paused') resume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drop, pause, resume, rankingOpen]);

  useEffect(() => {
    const onHide = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [pause]);

  useEffect(() => {
    const onMute = () => setMuted(getIsAudioMuted());
    window.addEventListener('sgx:audio_mute_changed', onMute);
    return () => window.removeEventListener('sgx:audio_mute_changed', onMute);
  }, []);

  // Global shortcuts stand down while a run is live.
  useEffect(() => {
    document.body.toggleAttribute('data-sgx-game', phase === 'playing');
    return () => document.body.removeAttribute('data-sgx-game');
  }, [phase]);

  const onStagePointer = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, a, [data-stack-ui]')) return;
    e.preventDefault();
    drop();
  };

  const openRanking = () => { pause(); setRankingOpen(true); };

  const share = async () => {
    const url = `${window.location.origin}/?section=games`;
    const pts = fmt(result?.score || 0, es);
    const text = es
      ? `Construí una Torre de Pilares de ${result?.height || 0} pisos (${pts} pts) en el Spatialgineers Summit 2026. ¿Me superas?`
      : `I built a ${result?.height || 0}-floor Pillar Tower (${pts} pts) at Spatialgineers Summit 2026. Can you beat me?`;
    if (navigator.share) {
      try { await navigator.share({ title: es ? 'Torre de Pilares' : 'Pillar Tower', text, url }); return; } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShareNote(es ? 'Enlace copiado.' : 'Link copied.');
    } catch {
      setShareNote(url);
    }
  };

  const pillarBar = (
    <div className="sgx-stack__pillarbar" aria-hidden="true">
      {PILLARS.map((p) => <i key={p.key} style={{ background: p.color }} />)}
    </div>
  );

  const rankLine = (
    <p className="sgx-stack__rankline">
      {es ? 'Tu mejor' : 'Your best'}: <b>{best > 0 ? `${fmt(best, es)} pts` : '—'}</b>
      {ranking.myRank ? <> · {es ? 'Puesto' : 'Place'} <b>#{ranking.myRank}</b></> : null}
    </p>
  );

  const cur = hud.current;
  const actives = [
    hud.magnet > 0 && { kind: 'magnet' as PowerKind, left: hud.magnet },
    hud.slow > 0 && { kind: 'slow' as PowerKind, left: hud.slow },
    hud.double > 0 && { kind: 'double' as PowerKind, left: hud.double },
    hud.shield && { kind: 'shield' as PowerKind, left: 0 },
  ].filter(Boolean) as { kind: PowerKind; left: number }[];

  const popView = (p: StackPop) => {
    if (p.kind === 'perfect') {
      return <span className="sgx-stack__perfect">{es ? 'Perfecto' : 'Perfect'}{(p.combo || 0) > 1 ? ` x${p.combo}` : ''} <small>+{p.points}</small></span>;
    }
    if (p.kind === 'pillars') {
      return (
        <span className="sgx-stack__pop is-pillars">
          <span className="sgx-stack__pop-marks">{PILLARS.map((pl) => <img key={pl.key} src={`/holo/${pl.slug}.png`} alt="" />)}</span>
          <strong>{es ? 'Seis pilares' : 'Six pillars'}</strong>
          <small>{es ? 'En el orden oficial' : 'In the official order'} · +{p.points}</small>
        </span>
      );
    }
    if (p.kind === 'shield_used') {
      return (
        <span className="sgx-stack__pop" style={{ '--pc': POWERS.shield.color } as React.CSSProperties}>
          <PowerIcon kind="shield" />
          <strong>{es ? 'Escudo usado' : 'Shield used'}</strong>
          <small>{es ? 'Ese fallo no cuenta' : 'That miss does not count'}</small>
        </span>
      );
    }
    const k = p.power!;
    return (
      <span className="sgx-stack__pop" style={{ '--pc': POWERS[k].color } as React.CSSProperties}>
        <PowerIcon kind={k} />
        <strong>{t(POWER_TEXT[k].name)}</strong>
        <small>{t(POWER_TEXT[k].effect)}</small>
      </span>
    );
  };

  return (
    <div className="sgx-stack" style={{ '--stack-accent': cur?.kind === 'pillar' ? PILLARS[cur.index].color : cur ? POWERS[cur.power].color : '#00DDFF' } as React.CSSProperties}>
      <div
        ref={stageRef}
        className={`sgx-stack__stage${phase === 'playing' ? ' is-live' : ''}`}
        onPointerDown={onStagePointer}
        role="application"
        aria-label={es ? 'Torre de Pilares: toca o pulsa Espacio para soltar el bloque' : 'Pillar Tower: tap or press Space to drop the block'}
      >
        {(phase === 'playing' || phase === 'paused') && (
          <>
            <div className="sgx-stack__hud">
              <div className="sgx-stack__cell is-score">
                <span className="sgx-stack__lbl">{es ? 'Puntos' : 'Score'}</span>
                <b aria-live="polite">{fmt(hud.score, es)}</b>
              </div>
              <div className="sgx-stack__cell">
                <span className="sgx-stack__lbl">{es ? 'Pisos' : 'Floors'}</span>
                <b>{hud.height}</b>
              </div>
              <div className="sgx-stack__cell">
                <span className="sgx-stack__lbl">Combo</span>
                <b className={hud.combo >= 3 ? 'is-yellow' : ''}>{hud.combo > 0 ? `x${hud.combo}` : '—'}</b>
              </div>
              <div className="sgx-stack__tools" data-stack-ui>
                <button type="button" className="sgx-stack__icon" onClick={() => setMuted(toggleAudioMute())} aria-label={muted ? (es ? 'Activar sonido' : 'Sound on') : (es ? 'Silenciar' : 'Mute')}>
                  {muted ? <VolumeX aria-hidden /> : <Volume2 aria-hidden />}
                </button>
                <button type="button" className="sgx-stack__icon is-primary" onClick={pause} aria-label={es ? 'Pausa' : 'Pause'}>
                  <Pause aria-hidden />
                </button>
              </div>
            </div>

            <div className="sgx-stack__row2">
              <div className="sgx-stack__chain" title={es ? 'Seis pilares en orden' : 'Six pillars in order'}>
                <span className="sgx-stack__lbl">{es ? 'Pilares' : 'Pillars'}</span>
                <span className="sgx-stack__chain-dots">
                  {PILLARS.map((p, i) => (
                    <i key={p.key} className={i < hud.chain ? 'is-on' : cur?.kind === 'pillar' && cur.index === i ? 'is-next' : ''} style={{ '--dot': p.color } as React.CSSProperties} />
                  ))}
                </span>
                <span className="sr-only">{es ? `${hud.chain} de 6 pilares en orden` : `${hud.chain} of 6 pillars in order`}</span>
              </div>
              {actives.map((a) => (
                <div key={a.kind} className="sgx-stack__active" data-kind={a.kind} style={{ '--pc': POWERS[a.kind].color } as React.CSSProperties}>
                  <PowerIcon kind={a.kind} />
                  <span className="sgx-stack__active-name">{t(POWER_TEXT[a.kind].name)}</span>
                  {a.left > 0 && <b>{a.left}</b>}
                </div>
              ))}
            </div>

            <div className="sgx-stack__pops" aria-live="polite">
              {popups.map((p) => <div key={p.id} className="sgx-stack__pop-wrap">{popView(p.pop)}</div>)}
            </div>

            {cur?.kind === 'power' && phase === 'playing' && (
              <div className="sgx-stack__incoming" style={{ '--pc': POWERS[cur.power].color } as React.CSSProperties}>
                <PowerIcon kind={cur.power} />
                <span><b>{t(POWER_TEXT[cur.power].name)}</b> · {t(POWER_TEXT[cur.power].effect)}</span>
              </div>
            )}
            {hud.height === 0 && phase === 'playing' && (
              <p className="sgx-stack__hint">{es ? 'Toca la pantalla o pulsa Espacio para soltar' : 'Tap the screen or press Space to drop'}</p>
            )}
          </>
        )}

        {noGl && (
          <div className="sgx-stack__overlay" data-stack-ui>
            <section className="sgx-stack__panel is-sm" role="status">
              {pillarBar}
              <h2>{es ? 'Torre de Pilares' : 'Pillar Tower'}</h2>
              <p className="sgx-stack__lead">{es ? 'Este dispositivo no pudo abrir el 3D (WebGL). Prueba en otro navegador o cierra otras pestañas con 3D.' : "This device couldn't start 3D (WebGL). Try another browser or close other tabs using 3D."}</p>
            </section>
          </div>
        )}

        {phase === 'start' && !noGl && (
          <div className="sgx-stack__overlay" data-stack-ui>
            <section className="sgx-stack__panel">
              {pillarBar}
              <p className="sgx-stack__kicker"><img src="/holo/spark.png" alt="" /> SGX.Spark · {es ? 'Minijuego' : 'Mini-game'}</p>
              <h2>{es ? 'Torre de Pilares' : 'Pillar Tower'}</h2>
              <p className="sgx-stack__lead">
                {es
                  ? 'Un bloque se desliza sobre la torre: suéltalo a tiempo. Lo que sobresale se corta y cae. Mientras más alto, más rápido.'
                  : 'A block slides over the tower: drop it in time. Whatever hangs over is cut off and falls. The higher you go, the faster it gets.'}
              </p>
              <ul className="sgx-stack__how">
                <li><b>{es ? 'Soltar' : 'Drop'}</b><span>{es ? 'Toca, haz clic o pulsa Espacio.' : 'Tap, click or press Space.'}</span></li>
                <li><b>{es ? 'Perfecto' : 'Perfect'}</b><span>{es ? 'Alineado exacto: no pierdes ancho y sube el combo.' : 'Exactly aligned: no width lost and the combo grows.'}</span></li>
                <li><b>{es ? 'Seis pilares' : 'Six pillars'}</b><span>{es ? 'Story, Showcase, Spark, Stage, System, Synthesize limpios y en orden: +20.' : 'Story, Showcase, Spark, Stage, System, Synthesize clean and in order: +20.'}</span></li>
              </ul>
              <ul className="sgx-stack__legend" aria-label={es ? 'Bloques de poder' : 'Power blocks'}>
                {POWER_ORDER.map((k) => (
                  <li key={k} style={{ '--pc': POWERS[k].color } as React.CSSProperties}>
                    <PowerIcon kind={k} />
                    <span><b>{t(POWER_TEXT[k].name)}</b><small>{t(POWER_TEXT[k].effect)}</small></span>
                  </li>
                ))}
              </ul>
              <div className="sgx-stack__buttons">
                <button type="button" className="sgx-btn" data-stack-start onClick={start}><Play aria-hidden /> {es ? 'Jugar' : 'Play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openRanking}><Trophy aria-hidden /> Ranking</button>
              </div>
              {rankLine}
            </section>
          </div>
        )}

        {phase === 'paused' && (
          <div className="sgx-stack__overlay" data-stack-ui>
            <section className="sgx-stack__panel is-sm">
              {pillarBar}
              <h2>{es ? 'En pausa' : 'Paused'}</h2>
              <p className="sgx-stack__lead">{es ? `Vas por ${hud.height} pisos y ${fmt(hud.score, es)} pts.` : `You are at ${hud.height} floors and ${fmt(hud.score, es)} pts.`}</p>
              <div className="sgx-stack__buttons is-stack">
                <button type="button" className="sgx-btn" onClick={resume}><Play aria-hidden /> {es ? 'Continuar' : 'Resume'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={start}><RotateCcw aria-hidden /> {es ? 'Empezar de nuevo' : 'Start over'}</button>
              </div>
            </section>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="sgx-stack__overlay is-over" data-stack-ui>
            <section className="sgx-stack__panel">
              {pillarBar}
              <p className="sgx-stack__kicker"><img src="/holo/spark.png" alt="" /> {result.newRecord ? (es ? 'Nuevo récord' : 'New record') : (es ? 'Torre terminada' : 'Tower complete')}</p>
              <h2>{fmt(result.score, es)} pts</h2>
              <dl className="sgx-stack__stats">
                <div><dt>{es ? 'Pisos' : 'Floors'}</dt><dd>{result.height}</dd></div>
                <div><dt>{es ? 'Perfectos' : 'Perfects'}</dt><dd>{result.perfects}</dd></div>
                <div><dt>{es ? 'Mejor combo' : 'Best combo'}</dt><dd>{result.maxCombo > 0 ? `x${result.maxCombo}` : '—'}</dd></div>
                <div><dt>{es ? 'Bonos' : 'Bonuses'}</dt><dd className="is-yellow">+{result.bonus}</dd></div>
              </dl>
              {result.sixPillars > 0 && (
                <p className="sgx-stack__note is-yellow">{es ? `Seis pilares en orden x${result.sixPillars}` : `Six pillars in order x${result.sixPillars}`}</p>
              )}
              <p className="sgx-stack__note">
                {result.xp > 0 ? (es ? `+${result.xp} XP para tu Estudio` : `+${result.xp} XP for your Studio`) : (es ? 'Llega a 3 pisos para ganar XP.' : 'Reach 3 floors to earn XP.')}
              </p>
              {rankLine}
              <div className="sgx-stack__buttons">
                <button type="button" className="sgx-btn" data-stack-start onClick={start}><RotateCcw aria-hidden /> {es ? 'Jugar otra vez' : 'Play again'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={openRanking}><Trophy aria-hidden /> {es ? 'Ver ranking' : 'See ranking'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={share}><Share2 aria-hidden /> {es ? 'Compartir' : 'Share'}</button>
              </div>
              {shareNote && <p className="sgx-stack__note" role="status">{shareNote}</p>}
            </section>
          </div>
        )}
      </div>

      {rankingOpen && (
        <SgxDialog
          open
          onClose={() => setRankingOpen(false)}
          size="sm"
          title={es ? 'Ranking · Torre de Pilares' : 'Ranking · Pillar Tower'}
          kicker={es ? 'Top 10 por mejor puntaje' : 'Top 10 by best score'}
          icon={<Trophy className="w-5 h-5 text-[#FDCC0D]" aria-hidden />}
          footer={<button type="button" className="sgx-btn sgx-btn--sm" onClick={start}>{es ? 'Jugar' : 'Play'}</button>}
        >
          <div className="sgx-stack-rank">
            <div className="sgx-stack-rank__me">
              <div><span>{es ? 'Tu mejor puntaje' : 'Your best score'}</span><b>{best > 0 ? `${fmt(best, es)} pts` : '—'}</b></div>
              <div><span>{es ? 'Tu puesto' : 'Your place'}</span><b>{ranking.myRank ? `#${ranking.myRank}` : '—'}</b></div>
            </div>
            {ranking.status === 'loading' && <p className="sgx-stack-rank__note" role="status">{es ? 'Cargando ranking…' : 'Loading ranking…'}</p>}
            {ranking.status === 'error' && (
              <div className="sgx-stack-rank__note" role="status">
                <p>{es ? 'No pudimos cargar el ranking ahora mismo.' : "We couldn't load the ranking right now."}</p>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={ranking.reload}>{es ? 'Reintentar' : 'Retry'}</button>
              </div>
            )}
            {ranking.status === 'ready' && ranking.rows.length === 0 && (
              <p className="sgx-stack-rank__note">{es ? 'Todavía nadie tiene puntaje. Juega una partida y sé el primero.' : 'No scores yet. Play a run and be the first.'}</p>
            )}
            {ranking.status === 'ready' && ranking.rows.length > 0 && (
              <ol className="sgx-stack-rank__list">
                {ranking.rows.map((r, i) => (
                  <li key={r.uid} className={r.isMe ? 'is-me' : ''}>
                    <span className="sgx-stack-rank__pos">{String(i + 1).padStart(2, '0')}</span>
                    <span className="sgx-stack-rank__name">{r.name}{r.isMe ? (es ? ' · tú' : ' · you') : ''}</span>
                    <b>{fmt(r.score, es)}</b>
                  </li>
                ))}
              </ol>
            )}
            <p className="sgx-stack-rank__fine">{es ? 'Para aparecer en el ranking entra con tu cuenta; se guarda tu mejor partida.' : 'Sign in to appear in the ranking; your best run is saved.'}</p>
          </div>
        </SgxDialog>
      )}
    </div>
  );
};

export default StackGame;
