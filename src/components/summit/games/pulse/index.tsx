import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Trophy, Share2, HelpCircle, Volume2, VolumeX, Square, Timer, Music, Keyboard, Flame } from 'lucide-react';
import { useLanguage } from '../../../../context/LanguageContext';
import { usePilotProfile } from '../../../../context/PilotProfileContext';
import { useSgxIdentity } from '../../../../identity/SgxIdentityContext';
import { QuickGuideModal, type GuideStep } from '../../../common/QuickGuideModal';
import { getIsAudioMuted } from '../../../../lib/cyberAudioEngine';
import { submitGameScore, useGameRanking } from '../../../../lib/gameScores';
import { PILLAR_BY_KEY, SGX_PILLARS } from '../../../../lib/sgxPillars';
import {
  accuracy, applyJudgment, buildChart, DIFFICULTIES, freshStats, gradeOf, multiplier, scrollSpeed,
  HOLD_GRACE, WINDOW_GOOD, WINDOW_MISS, WINDOW_PERFECT,
  type Candidate, type Chart, type Difficulty, type Grade, type Judgment, type RunStats,
} from './pulseChart';
import { audioTimeOf, click, closePulseAudio, createPlayer, pulseAudio, renderSgxBeat, SGX_BEAT_BPM, SGX_BEAT_LENGTH, type Player } from './pulseAudio';
import { analyzeSong } from './pulseAnalysis';
import { SONG_TITLE, songUrl } from './pulseConfig';
import { createPulseScene, LANE_COLORS, type PulseLayout, type PulseScene } from './pulseScene';
import { PulseRankingDialog } from './PulseRanking';
import './pulse.css';

/* Pulso SGX — rhythm game of SGX.Spark. Three lanes, notes scroll to the hit
   line; timing runs on the Web Audio clock with a per-device calibration. */

type Phase = 'start' | 'calibrate' | 'playing' | 'paused' | 'over';

interface Track { buffer: AudioBuffer; cands: Candidate[]; bpm: number; offset: number; duration: number; source: 'song' | 'beat'; fallback: boolean }

interface Hud { score: number; combo: number; mult: number; fever: boolean; acc: number; judge: { kind: Judgment | 'hold'; id: number } | null }
interface RunResult { score: number; acc: number; grade: Grade; maxCombo: number; perfect: number; good: number; miss: number; xp: number; best: number; completed: boolean; fullCombo: boolean; newRecord: boolean }

const OFFSET_KEY = 'sgx_pulse_offset_ms';
const DIFF_KEY = 'sgx_pulse_difficulty';
const LEAD_IN = 2.4;
const KEYS: Record<string, number> = { d: 0, f: 1, j: 2, arrowleft: 0, arrowdown: 1, arrowright: 2 };
const LANE_KEYS = ['D · ←', 'F · ↓', 'J · →'];
const CAL_BPM = 100;
const CAL_CLICKS = 16;
const CAL_COUNT_IN = 4;
const EMPTY_HUD: Hud = { score: 0, combo: 0, mult: 1, fever: false, acc: 0, judge: null };

const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');
const readNum = (key: string) => { try { const v = localStorage.getItem(key); return v === null ? null : Number(v); } catch { return null; } };
const writeStr = (key: string, v: string) => { try { localStorage.setItem(key, v); } catch { /* private mode */ } };

let trackPromise: Promise<Track> | null = null;
function loadTrack(): Promise<Track> {
  if (trackPromise) return trackPromise;
  trackPromise = (async () => {
    const url = songUrl();
    if (url) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(String(res.status));
        const buffer = await new OfflineAudioContext(2, 1, 44100).decodeAudioData(await res.arrayBuffer());
        const a = await analyzeSong(url, buffer);
        return { buffer, cands: a.cands, bpm: a.bpm, offset: a.offset, duration: buffer.duration, source: 'song', fallback: false } as Track;
      } catch {
        // Fall through to the built-in beat.
      }
    }
    const beat = await renderSgxBeat();
    return { buffer: beat.buffer, cands: beat.cands, bpm: SGX_BEAT_BPM, offset: 0, duration: SGX_BEAT_LENGTH, source: 'beat', fallback: !!url } as Track;
  })();
  trackPromise.catch(() => { trackPromise = null; });
  return trackPromise;
}

const DIFF_LABEL: Record<Difficulty, { es: string; en: string; line: { es: string; en: string } }> = {
  easy: { es: 'Fácil', en: 'Easy', line: { es: 'Un toque por compás y notas largas.', en: 'One hit per bar and long notes.' } },
  normal: { es: 'Normal', en: 'Normal', line: { es: 'Bombo, caja y la melodía.', en: 'Kick, snare and the melody.' } },
  hard: { es: 'Difícil', en: 'Hard', line: { es: 'El arpegio completo y dobles.', en: 'The full arpeggio and doubles.' } },
};

function guideSteps(es: boolean): GuideStep[] {
  return [
    {
      title: es ? 'Toca al ritmo' : 'Hit on the beat', subtitle: es ? 'Tres carriles' : 'Three lanes', icon: Music, badge: '01',
      description: es ? 'Las gemas SGX bajan por tres carriles. Tócalas justo cuando crucen la línea blanca.' : 'SGX gems slide down three lanes. Hit them right as they cross the white line.',
      keyControls: [{ key: 'D / ←', action: es ? 'Carril izquierdo' : 'Left lane' }, { key: 'F / ↓', action: es ? 'Carril central' : 'Center lane' }, { key: 'J / →', action: es ? 'Carril derecho' : 'Right lane' }],
      tips: [es ? 'En el teléfono toca la zona de cada carril, abajo.' : 'On a phone, tap each lane zone at the bottom.'],
    },
    {
      title: es ? 'Notas largas' : 'Long notes', subtitle: es ? 'Mantén' : 'Hold', icon: Keyboard, badge: '02',
      description: es ? 'Las gemas con engranaje G traen un haz: mantén presionado hasta que termine.' : 'Gems with the G gear carry a beam: hold until it ends.',
    },
    {
      title: es ? 'Combo y Fiebre SGX' : 'Combo and SGX Fever', subtitle: 'x2 · x4 · x8', icon: Flame, badge: '03',
      description: es ? 'Cada 10 aciertos seguidos sube el multiplicador. Con 30 entras en Fiebre SGX: todo vale el doble hasta que falles.' : 'Every 10 hits in a row raises the multiplier. At 30 you enter SGX Fever: everything is worth double until you miss.',
      tips: [es ? 'Perfecto: ±50 ms · Bien: ±105 ms.' : 'Perfect: ±50 ms · Good: ±105 ms.'],
    },
    {
      title: es ? 'Calibra tu equipo' : 'Calibrate your device', subtitle: es ? 'Latencia' : 'Latency', icon: Timer, badge: '04',
      description: es ? 'Los audífonos Bluetooth atrasan el sonido. En Calibrar, toca al ritmo del metrónomo y el juego se ajusta a tu equipo.' : 'Bluetooth headphones delay the sound. In Calibrate, tap along with the metronome and the game adjusts to your device.',
    },
  ];
}

const Game: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { recordActivity } = usePilotProfile();
  const { identity } = useSgxIdentity();
  const playerName = identity.pass?.fullName || identity.callsign || 'Creador';

  const stageRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);
  const calRingRef = useRef<HTMLDivElement | null>(null);

  const [phase, setPhase] = useState<Phase>('start');
  const [track, setTrack] = useState<Track | null>(null);
  const [trackError, setTrackError] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>(() => {
    try { const d = localStorage.getItem(DIFF_KEY) as Difficulty | null; return d && DIFFICULTIES.includes(d) ? d : 'normal'; } catch { return 'normal'; }
  });
  const [offsetMs, setOffsetMs] = useState<number>(() => readNum(OFFSET_KEY) ?? 0);
  const [calibrated, setCalibrated] = useState(() => readNum(OFFSET_KEY) !== null);
  const [cal, setCal] = useState<{ run: number; taps: number; result: number | null; spread: number }>({ run: 0, taps: 0, result: null, spread: 0 });
  const [soundOn, setSoundOn] = useState(() => !getIsAudioMuted());
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [layout, setLayout] = useState<PulseLayout | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [shareNote, setShareNote] = useState('');
  const [pressed, setPressed] = useState([false, false, false]);

  const ranking = useGameRanking('pulse', rankingOpen || phase === 'over');
  const myBest = Math.max(ranking.myBest, result?.best || 0);

  const sceneRef = useRef<PulseScene | null>(null);
  const run = useRef({
    phase: 'start' as Phase,
    chart: null as Chart | null,
    player: null as Player | null,
    stats: freshStats(),
    first: 0,
    holds: [-1, -1, -1],
    pressed: [false, false, false],
    offset: 0,
    endAt: 0,
    judgeId: 0,
    feverWas: false,
    freq: new Uint8Array(128),
    levels: { bass: 0, mid: 0, high: 0 },
    eq: [0, 0, 0, 0, 0, 0],
    cal: { start: 0, taps: [] as number[] },
    dialogs: false,
  });
  run.current.dialogs = rankingOpen || guideOpen;
  const live = useRef({ es, difficulty, recordActivity, playerName, reload: ranking.reload, soundOn, myBest: ranking.myBest });
  live.current = { es, difficulty, recordActivity, playerName, reload: ranking.reload, soundOn, myBest: ranking.myBest };

  const goPhase = useCallback((p: Phase) => { run.current.phase = p; setPhase(p); }, []);

  // Prepare the track as soon as the game mounts.
  useEffect(() => {
    let alive = true;
    loadTrack().then((t) => alive && setTrack(t)).catch(() => alive && setTrackError(true));
    return () => { alive = false; };
  }, []);

  useEffect(() => { run.current.player?.setVolume(soundOn ? 1 : 0); }, [soundOn]);

  /* ---------- Judgments ---------- */
  const judge = useCallback((lane: number, j: Judgment, tail = false) => {
    const r = run.current;
    applyJudgment(r.stats, j, tail ? 200 : undefined);
    sceneRef.current?.hitFx(lane, j);
    if (r.stats.fever && !r.feverWas) sceneRef.current?.feverFx();
    r.feverWas = r.stats.fever;
    r.judgeId++;
    setHud({ score: r.stats.score, combo: r.stats.combo, mult: multiplier(r.stats), fever: r.stats.fever, acc: accuracy(r.stats), judge: { kind: tail && j !== 'miss' ? 'hold' : j, id: r.judgeId } });
  }, []);

  const press = useCallback((lane: number, at: number) => {
    const r = run.current;
    r.pressed[lane] = true;
    setPressed([...r.pressed]);
    if (r.phase !== 'playing' || !r.chart || !r.player) return;
    const vt = r.player.songTime(at) - r.offset;
    const notes = r.chart.notes;
    let best = -1;
    let bestD = Infinity;
    for (let i = r.first; i < notes.length && notes[i].t <= vt + WINDOW_MISS; i++) {
      const n = notes[i];
      if (n.state !== 0 || n.lane !== lane) continue;
      const d = Math.abs(n.t - vt);
      if (d <= WINDOW_MISS && d < bestD) { best = i; bestD = d; }
    }
    if (best < 0) return;
    const n = notes[best];
    const j: Judgment = bestD <= WINDOW_PERFECT ? 'perfect' : bestD <= WINDOW_GOOD ? 'good' : 'miss';
    if (j === 'miss') {
      n.state = 2;
      judge(lane, 'miss');
      if (n.dur > 0) judge(lane, 'miss', true);
      return;
    }
    n.state = n.dur > 0 ? 3 : 1;
    if (n.dur > 0) r.holds[lane] = best;
    judge(lane, j);
  }, [judge]);

  const release = useCallback((lane: number, at: number) => {
    const r = run.current;
    r.pressed[lane] = false;
    setPressed([...r.pressed]);
    const idx = r.holds[lane];
    if (idx < 0 || !r.chart || !r.player) return;
    r.holds[lane] = -1;
    const n = r.chart.notes[idx];
    if (n.state !== 3) return;
    const vt = r.player.songTime(at) - r.offset;
    const ok = vt >= n.t + n.dur - HOLD_GRACE;
    n.state = ok ? 4 : 5;
    judge(lane, ok ? 'perfect' : 'miss', true);
  }, [judge]);

  /* ---------- Run lifecycle ---------- */
  const finish = useCallback((completed: boolean) => {
    const r = run.current;
    if (r.phase === 'over' || !r.chart) return;
    r.player?.stop();
    document.body.removeAttribute('data-sgx-game');
    const { es: e, difficulty: d, recordActivity: activity, playerName: name, reload } = live.current;
    const s = r.stats;
    const acc = accuracy(s);
    const grade = gradeOf(acc);
    const judged = s.perfect + s.good + s.miss;
    const fullCombo = completed && judged > 0 && s.miss === 0;
    const factor = d === 'easy' ? 0.7 : d === 'hard' ? 1.15 : 1;
    const xp = completed && judged >= 10 ? Math.min(150, Math.round(40 + 110 * (acc / 100) * factor)) : 0;
    if (xp > 0) activity('quest_complete', e ? 'Pulso SGX' : 'SGX Pulse', `${grade} · ${acc}% · ${s.score} pts`, xp, '#00DDFF');
    const milestones = [fullCombo && 'full_combo', completed && grade === 'S' && 'grade_s'].filter(Boolean) as string[];
    window.dispatchEvent(new CustomEvent('sgx:spark_game', { detail: { game: 'pulse', score: s.score, milestone: milestones[0], milestones } }));
    const prevBest = live.current.myBest;
    setResult({ score: s.score, acc, grade, maxCombo: s.maxCombo, perfect: s.perfect, good: s.good, miss: s.miss, xp, best: Math.max(prevBest, s.score), completed, fullCombo, newRecord: s.score > prevBest && s.score > 0 });
    goPhase('over');
    submitGameScore('pulse', s.score, name).then((best) => {
      setResult((res) => (res ? { ...res, best: Math.max(res.best, best) } : res));
      reload();
    });
  }, [goPhase]);

  const startRun = useCallback(async () => {
    const ac = pulseAudio();
    if (!ac || !track) return;
    if (ac.state === 'suspended') await ac.resume().catch(() => {});
    const r = run.current;
    r.player?.dispose();
    const chart = buildChart(track.cands, live.current.difficulty, track.bpm, track.offset, track.duration, track.source === 'song');
    const last = chart.notes[chart.notes.length - 1];
    r.chart = chart;
    r.endAt = Math.min(track.duration, last ? last.t + last.dur + 2.5 : track.duration);
    r.stats = freshStats();
    r.first = 0;
    r.holds = [-1, -1, -1];
    r.feverWas = false;
    r.offset = (readNum(OFFSET_KEY) ?? 0) / 1000;
    r.player = createPlayer(ac, track.buffer);
    r.player.setVolume(live.current.soundOn ? 1 : 0);
    r.player.start(-LEAD_IN, 0.05);
    setHud(EMPTY_HUD);
    setResult(null);
    setShareNote('');
    document.body.setAttribute('data-sgx-game', 'pulse');
    goPhase('playing');
    stageRef.current?.focus({ preventScroll: true });
  }, [track, goPhase]);

  const pause = useCallback(() => {
    const r = run.current;
    if (r.phase !== 'playing') return;
    r.player?.stop();
    r.pressed = [false, false, false];
    setPressed([false, false, false]);
    goPhase('paused');
  }, [goPhase]);

  const resume = useCallback(async () => {
    const r = run.current;
    const ac = pulseAudio();
    if (r.phase !== 'paused' || !r.player || !ac) return;
    if (ac.state === 'suspended') await ac.resume().catch(() => {});
    // Any hold in progress is released by the pause.
    r.holds.forEach((idx, lane) => {
      if (idx >= 0 && r.chart) { r.chart.notes[idx].state = 5; judge(lane, 'miss', true); }
    });
    r.holds = [-1, -1, -1];
    const at = r.player.songTime();
    // The notes slide back 0.8 s and the music picks up where it stopped.
    r.player.start(at, 0.8);
    goPhase('playing');
    stageRef.current?.focus({ preventScroll: true });
  }, [goPhase, judge]);

  /* ---------- Calibration ---------- */
  const startCalibration = useCallback(async () => {
    const ac = pulseAudio();
    if (!ac) return;
    if (ac.state === 'suspended') await ac.resume().catch(() => {});
    const r = run.current;
    const beat = 60 / CAL_BPM;
    r.cal = { start: ac.currentTime + 0.4, taps: [] };
    for (let i = 0; i < CAL_CLICKS; i++) click(ac, r.cal.start + i * beat, i % 4 === 0, live.current.soundOn ? 1 : 0.0001);
    setCal((c) => ({ run: c.run + 1, taps: 0, result: null, spread: 0 }));
    goPhase('calibrate');
  }, [goPhase]);

  const calTap = useCallback((at: number) => {
    const r = run.current;
    const beat = 60 / CAL_BPM;
    const k = Math.round((at - r.cal.start) / beat);
    if (k < CAL_COUNT_IN || k >= CAL_CLICKS) return;
    r.cal.taps.push(at - (r.cal.start + k * beat));
    setCal((c) => ({ ...c, taps: r.cal.taps.length }));
  }, []);

  const saveOffset = (ms: number) => {
    const v = Math.max(-150, Math.min(400, Math.round(ms)));
    setOffsetMs(v);
    setCalibrated(true);
    writeStr(OFFSET_KEY, String(v));
  };

  /* ---------- Scene + main loop ---------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let scene: PulseScene;
    try {
      scene = createPulseScene(canvas, stage, reduced);
    } catch {
      return;
    }
    sceneRef.current = scene;
    const relayout = () => { scene.resize(); setLayout(scene.layout()); };
    relayout();
    const ro = new ResizeObserver(relayout);
    ro.observe(stage);

    let raf = 0;
    let last = performance.now();
    let skip = false;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const r = run.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      // Menus render at half rate.
      if (r.phase !== 'playing' && r.phase !== 'calibrate') { skip = !skip; if (skip) return; }
      last = now;
      const ac = pulseAudio();
      const playing = r.phase === 'playing' && !!r.player && !!r.chart && !!ac;
      let vt = 0;
      let beat = 0;
      let beatLen = 0.5;
      if (playing && r.player && r.chart) {
        const st = r.player.songTime();
        vt = st - r.offset;
        beatLen = 60 / r.chart.bpm;
        const bp = (vt - r.chart.offset) / beatLen;
        beat = vt > -0.2 ? Math.exp(-(bp - Math.floor(bp)) * beatLen * 9) : 0;
        const notes = r.chart.notes;
        while (r.first < notes.length && notes[r.first].state !== 0 && notes[r.first].state !== 3 && notes[r.first].t + notes[r.first].dur < vt - 0.6) r.first++;
        for (let i = r.first; i < notes.length && notes[i].t < vt; i++) {
          const n = notes[i];
          if (n.state === 0 && vt - n.t > WINDOW_MISS) {
            n.state = 2;
            judge(n.lane, 'miss');
            if (n.dur > 0) judge(n.lane, 'miss', true);
          } else if (n.state === 3 && vt >= n.t + n.dur) {
            n.state = 4;
            r.holds[n.lane] = -1;
            judge(n.lane, 'perfect', true);
          }
        }
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${Math.max(0, Math.min(1, st / r.endAt))})`;
        // Analyser → background.
        r.player.analyser.getByteFrequencyData(r.freq);
        const avg = (a: number, b: number) => { let s = 0; for (let i = a; i < b; i++) s += r.freq[i]; return s / ((b - a) * 255); };
        const k = Math.min(1, dt * 12);
        r.levels.bass += (avg(0, 3) - r.levels.bass) * k;
        r.levels.mid += (avg(3, 16) - r.levels.mid) * k;
        r.levels.high += (avg(16, 64) - r.levels.high) * k;
        [[0, 2], [2, 4], [4, 8], [8, 16], [16, 32], [32, 64]].forEach(([a, b], i) => { r.eq[i] += (Math.min(1, avg(a, b) * 1.3) - r.eq[i]) * k; });
        if (st >= r.endAt) finish(true);
      } else {
        // Idle: a soft 120 BPM pulse, the skyline breathing.
        const t = now / 1000;
        const bp = t * 2;
        beat = r.phase === 'calibrate' && ac
          ? Math.exp(-(((ac.currentTime - r.cal.start) / (60 / CAL_BPM)) % 1 + 1) % 1 * 5)
          : Math.exp(-(bp - Math.floor(bp)) * 4) * 0.6;
        r.levels.bass = 0.15 + beat * 0.2;
        r.levels.mid = 0.12;
        r.levels.high = 0.08;
        for (let i = 0; i < 6; i++) r.eq[i] = 0.25 + 0.2 * Math.sin(t * 1.3 + i * 1.1) + beat * 0.2;
        if (r.phase === 'calibrate' && calRingRef.current) calRingRef.current.style.setProperty('--beat', beat.toFixed(3));
      }
      scene.frame({
        vt, dt, notes: r.chart?.notes || [], first: r.first, speed: scrollSpeed(live.current.difficulty), beat, beatLen,
        levels: r.levels, eq: r.eq, fever: r.stats.fever && playing ? 1 : 0, pressed: r.pressed, playing,
      });
    };
    raf = requestAnimationFrame(loop);

    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);

    if ((import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
      (window as unknown as Record<string, unknown>).__sgxPulse = {
        notes: () => run.current.chart?.notes.map((n) => ({ t: n.t, lane: n.lane, dur: n.dur })) || [],
        time: () => (run.current.player ? run.current.player.songTime() - run.current.offset : 0),
        // Test input at an exact (visual) song time, independent of frame rate.
        hit: (lane: number, t: number, down: boolean) => {
          const ac = pulseAudio();
          const p = run.current.player;
          if (!ac || !p) return;
          const at = t + run.current.offset + ac.currentTime - p.songTime();
          if (down) press(lane, at);
          else release(lane, at);
        },
      };
    }

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      document.body.removeAttribute('data-sgx-game');
      run.current.player?.dispose();
      run.current.player = null;
      run.current.phase = 'start';
      scene.dispose();
      sceneRef.current = null;
      closePulseAudio();
    };
    // Built once; callbacks are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calibration result once the last click has passed.
  useEffect(() => {
    if (phase !== 'calibrate') return;
    const ac = pulseAudio();
    if (!ac) return;
    const r = run.current;
    const ms = (r.cal.start + CAL_CLICKS * (60 / CAL_BPM) - ac.currentTime) * 1000;
    const id = window.setTimeout(() => {
      const taps = [...r.cal.taps].sort((a, b) => a - b);
      if (taps.length < 4) { setCal((c) => ({ ...c, result: NaN })); return; }
      const median = taps[Math.floor(taps.length / 2)];
      const spread = taps[Math.floor(taps.length * 0.8)] - taps[Math.floor(taps.length * 0.2)];
      setCal((c) => ({ ...c, taps: taps.length, result: Math.round(median * 1000), spread: Math.round(spread * 1000) }));
    }, Math.max(0, ms + 300));
    return () => window.clearTimeout(id);
  }, [phase, cal.run]);

  /* ---------- Keyboard ---------- */
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
    const down = (e: KeyboardEvent) => {
      const r = run.current;
      if (r.dialogs || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const ac = pulseAudio();
      const key = e.key.toLowerCase();
      if (r.phase === 'playing') {
        if (key === 'escape' || key === 'p') { e.preventDefault(); pause(); return; }
        const lane = KEYS[key];
        if (lane === undefined || !ac) return;
        e.preventDefault();
        if (!e.repeat) press(lane, audioTimeOf(ac, e.timeStamp));
      } else if (r.phase === 'calibrate' && ac && (key === ' ' || key in KEYS)) {
        e.preventDefault();
        if (!e.repeat) calTap(audioTimeOf(ac, e.timeStamp));
      }
    };
    const up = (e: KeyboardEvent) => {
      const lane = KEYS[e.key.toLowerCase()];
      const ac = pulseAudio();
      if (lane === undefined || !ac || !run.current.pressed[lane]) return;
      release(lane, audioTimeOf(ac, e.timeStamp));
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [press, release, pause, calTap]);

  const lanePointer = (lane: number, kind: 'down' | 'up') => (e: React.PointerEvent<HTMLButtonElement>) => {
    const ac = pulseAudio();
    if (!ac) return;
    if (kind === 'down') {
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
      press(lane, audioTimeOf(ac, e.timeStamp));
    } else if (run.current.pressed[lane]) release(lane, audioTimeOf(ac, e.timeStamp));
  };

  const pickDifficulty = (d: Difficulty) => { setDifficulty(d); writeStr(DIFF_KEY, d); };

  const share = async () => {
    const url = `${window.location.origin}/?section=games`;
    const text = es
      ? `Hice ${fmt(result?.score || 0, es)} pts (nota ${result?.grade}) en Pulso SGX del Spatialgineers Summit 2026. ¿Me superas?`
      : `I scored ${fmt(result?.score || 0, es)} pts (grade ${result?.grade}) in SGX Pulse at Spatialgineers Summit 2026. Can you beat me?`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Pulso SGX', text, url }); return; } catch (err) { if ((err as DOMException)?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(`${text} ${url}`); setShareNote(es ? 'Enlace copiado.' : 'Link copied.'); } catch { setShareNote(url); }
  };

  const soundButton = (
    <button type="button" className="sgx-pulse__icon" onClick={() => setSoundOn((v) => !v)} aria-pressed={soundOn} aria-label={soundOn ? (es ? 'Silenciar' : 'Mute') : (es ? 'Activar sonido' : 'Unmute')}>
      {soundOn ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </button>
  );
  const pillarBar = <div className="sgx-pulse__pillarbar" aria-hidden>{SGX_PILLARS.map((p) => <i key={p.key} style={{ background: p.color }} />)}</div>;
  const inRun = phase === 'playing' || phase === 'paused';
  const trackName = track?.source === 'song' ? (es ? SONG_TITLE.es : SONG_TITLE.en) : (es ? 'Pista SGX' : 'SGX beat');
  const trackLine = !track
    ? (trackError ? (es ? 'No pudimos preparar la pista en este navegador.' : "We couldn't prepare the track in this browser.") : (es ? 'Preparando la pista…' : 'Preparing the track…'))
    : track.source === 'song'
      ? `${trackName} · ${Math.round(track.bpm)} BPM · ${Math.floor(track.duration / 60)}:${String(Math.round(track.duration % 60)).padStart(2, '0')}`
      : `${trackName} · ${SGX_BEAT_BPM} BPM · 1:30 · ${es ? 'generada en tu navegador' : 'generated in your browser'}`;
  const judgeText = (k: Hud['judge']) => !k ? '' : k.kind === 'perfect' ? (es ? 'Perfecto' : 'Perfect') : k.kind === 'good' ? (es ? 'Bien' : 'Good') : k.kind === 'hold' ? (es ? 'Sostenido' : 'Held') : (es ? 'Fallo' : 'Miss');
  const hitTop = `${((layout?.hitY ?? 0.78) * 100).toFixed(1)}%`;

  return (
    <section className={`sgx-pulse ${hud.fever && phase === 'playing' ? 'is-fever' : ''}`} data-pulse-game aria-label="Pulso SGX">
      <div ref={stageRef} className="sgx-pulse__stage" tabIndex={-1} style={{ ['--hit-y' as string]: hitTop }}>
        <canvas ref={canvasRef} className="sgx-pulse__canvas" aria-hidden />

        {inRun && (
          <div className="sgx-pulse__hud">
            <div className="sgx-pulse__cell">
              <span className="sgx-pulse__lbl">{es ? 'Puntos' : 'Points'}</span>
              <b className="is-yellow" data-pulse-score>{fmt(hud.score, es)}</b>
            </div>
            <div className="sgx-pulse__cell">
              <span className="sgx-pulse__lbl">{es ? 'Multi' : 'Multi'}</span>
              <b className={hud.fever ? 'is-yellow' : ''}>x{hud.mult}</b>
            </div>
            <div className="sgx-pulse__cell is-wide">
              <span className="sgx-pulse__lbl">{es ? 'Precisión' : 'Accuracy'}</span>
              <b>{hud.acc.toFixed(1)}%</b>
            </div>
            <div className="sgx-pulse__tools">
              {soundButton}
              <button type="button" className="sgx-pulse__icon is-primary" onClick={phase === 'paused' ? resume : pause} aria-label={phase === 'paused' ? (es ? 'Continuar' : 'Resume') : (es ? 'Pausa' : 'Pause')}>
                {phase === 'paused' ? <Play aria-hidden /> : <Pause aria-hidden />}
              </button>
            </div>
            <span className="sgx-pulse__progress" aria-hidden><span ref={progressRef} /></span>
          </div>
        )}

        {phase === 'playing' && (
          <>
            {hud.fever && <p className="sgx-pulse__fever" aria-live="polite"><img src="/holo/bolt.png" alt="" />{es ? 'Fiebre SGX' : 'SGX Fever'} · x{hud.mult}</p>}
            <div className="sgx-pulse__judge" aria-live="polite">
              {hud.judge && <span key={hud.judge.id} className={`is-${hud.judge.kind}`}>{judgeText(hud.judge)}</span>}
              {hud.combo >= 4 && <b key={`c${hud.combo}`}>{hud.combo}<small>combo</small></b>}
            </div>
          </>
        )}

        {inRun && layout && (
          <div className="sgx-pulse__lanes">
            {layout.lanes.map((l, i) => (
              <button
                key={i}
                type="button"
                className={`sgx-pulse__lane ${pressed[i] ? 'is-down' : ''}`}
                style={{ left: `${l.x0 * 100}%`, width: `${(l.x1 - l.x0) * 100}%`, ['--lane' as string]: LANE_COLORS[i] }}
                aria-label={es ? `Carril ${['izquierdo', 'central', 'derecho'][i]} (${LANE_KEYS[i]})` : `${['Left', 'Center', 'Right'][i]} lane (${LANE_KEYS[i]})`}
                tabIndex={-1}
                onPointerDown={lanePointer(i, 'down')}
                onPointerUp={lanePointer(i, 'up')}
                onPointerCancel={lanePointer(i, 'up')}
                onLostPointerCapture={lanePointer(i, 'up')}
                onContextMenu={(e) => e.preventDefault()}
              >
                <kbd>{LANE_KEYS[i]}</kbd>
              </button>
            ))}
          </div>
        )}

        {phase === 'start' && (
          <div className="sgx-pulse__overlay">
            <div className="sgx-pulse__panel">
              {pillarBar}
              <p className="sgx-pulse__kicker"><img src="/holo/spark.png" alt="" /> SGX.Spark · {es ? 'Ritmo' : 'Rhythm'}</p>
              <h2>{es ? 'Pulso SGX' : 'SGX Pulse'}</h2>
              <p className="sgx-pulse__lead">
                {es
                  ? 'Las gemas SGX bajan por tres carriles al ritmo de la música. Tócalas justo en la línea, arma combos y entra en Fiebre SGX.'
                  : 'SGX gems slide down three lanes to the beat. Hit them right on the line, build combos and enter SGX Fever.'}
              </p>
              <p className={`sgx-pulse__track ${track ? '' : 'is-wait'}`} role="status"><Music aria-hidden />{trackLine}</p>
              {track?.fallback && (
                <p className="sgx-pulse__note">{es ? 'No pudimos cargar la canción del Summit; suena la pista SGX.' : "We couldn't load the Summit song; the SGX beat plays instead."}</p>
              )}
              <div className="sgx-pulse__diffs" role="radiogroup" aria-label={es ? 'Dificultad' : 'Difficulty'}>
                {DIFFICULTIES.map((d, i) => (
                  <button key={d} type="button" role="radio" aria-checked={difficulty === d} className={`sgx-pulse__diff ${difficulty === d ? 'is-on' : ''}`} style={{ ['--zone' as string]: [PILLAR_BY_KEY.SHOWCASE.color, PILLAR_BY_KEY.STAGE.color, PILLAR_BY_KEY.SPARK.color][i] }} onClick={() => pickDifficulty(d)}>
                    <span aria-hidden>{'▮'.repeat(i + 1)}</span>
                    <strong>{es ? DIFF_LABEL[d].es : DIFF_LABEL[d].en}</strong>
                    <small>{es ? DIFF_LABEL[d].line.es : DIFF_LABEL[d].line.en}</small>
                  </button>
                ))}
              </div>
              <div className="sgx-pulse__buttons">
                <button type="button" className="sgx-btn" onClick={startRun} disabled={!track} data-pulse-start><Play className="w-4 h-4" aria-hidden />{track ? (es ? 'Jugar' : 'Play') : (es ? 'Preparando…' : 'Preparing…')}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={startCalibration} data-pulse-calibrate><Timer className="w-4 h-4" aria-hidden />{es ? 'Calibrar' : 'Calibrate'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setGuideOpen(true)}><HelpCircle className="w-4 h-4" aria-hidden />{es ? 'Cómo se juega' : 'How to play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setRankingOpen(true)} data-pulse-ranking><Trophy className="w-4 h-4" aria-hidden />Ranking</button>
                {soundButton}
              </div>
              <p className="sgx-pulse__best">
                {es ? 'Latencia' : 'Latency'}: <b>{offsetMs} ms</b>{calibrated ? '' : (es ? ' · sin calibrar' : ' · not calibrated')}
                {myBest > 0 && <> · {es ? 'Tu mejor' : 'Your best'}: <b>{fmt(myBest, es)} pts</b></>}
              </p>
            </div>
          </div>
        )}

        {phase === 'calibrate' && (
          <div className="sgx-pulse__overlay">
            <div className="sgx-pulse__panel is-sm">
              {pillarBar}
              <p className="sgx-pulse__kicker"><Timer aria-hidden /> {es ? 'Calibración' : 'Calibration'}</p>
              <h2>{es ? 'Toca al ritmo' : 'Tap to the beat'}</h2>
              {cal.result === null ? (
                <>
                  <p className="sgx-pulse__lead">
                    {es ? `Escucha 4 clics y luego toca con cada clic (${CAL_CLICKS - CAL_COUNT_IN} veces): el botón, la barra espaciadora o D F J.` : `Listen to 4 clicks, then tap with every click (${CAL_CLICKS - CAL_COUNT_IN} times): the button, the space bar or D F J.`}
                  </p>
                  {!soundOn && <p className="sgx-pulse__note">{es ? 'Activa el sonido para oír el metrónomo.' : 'Turn the sound on to hear the metronome.'}</p>}
                  <button
                    type="button"
                    className="sgx-pulse__tap"
                    onPointerDown={(e) => { const ac = pulseAudio(); if (ac) { e.preventDefault(); calTap(audioTimeOf(ac, e.timeStamp)); } }}
                    data-pulse-tap
                  >
                    <div ref={calRingRef} className="sgx-pulse__tap-ring" aria-hidden />
                    <span>{es ? 'Toca aquí' : 'Tap here'}</span>
                    <small>{cal.taps} / {CAL_CLICKS - CAL_COUNT_IN}</small>
                  </button>
                </>
              ) : Number.isNaN(cal.result) ? (
                <p className="sgx-pulse__lead" role="status">{es ? 'No llegaron suficientes toques. Inténtalo otra vez.' : 'Not enough taps came in. Try again.'}</p>
              ) : (
                <div className="sgx-pulse__calres" role="status">
                  <p>{es ? 'Tus toques llegan' : 'Your taps land'} <b>{Math.abs(cal.result)} ms</b> {cal.result >= 0 ? (es ? 'después del clic' : 'after the click') : (es ? 'antes del clic' : 'before the click')}.</p>
                  <p className="sgx-pulse__best">{es ? 'Variación entre toques' : 'Spread between taps'}: {cal.spread} ms{cal.spread > 60 ? (es ? ' · repite para afinar' : ' · repeat to refine') : ''}</p>
                </div>
              )}
              <div className="sgx-pulse__nudge" role="group" aria-label={es ? 'Ajuste manual' : 'Manual adjustment'}>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => saveOffset(offsetMs - 10)} aria-label={es ? 'Restar 10 ms' : 'Minus 10 ms'}>−10</button>
                <span>{es ? 'Actual' : 'Current'}: <b>{offsetMs} ms</b></span>
                <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => saveOffset(offsetMs + 10)} aria-label={es ? 'Sumar 10 ms' : 'Plus 10 ms'}>+10</button>
              </div>
              <div className="sgx-pulse__buttons is-stack">
                {cal.result !== null && !Number.isNaN(cal.result) && (
                  <button type="button" className="sgx-btn" onClick={() => { saveOffset(cal.result as number); goPhase('start'); }} autoFocus data-pulse-save>{es ? `Guardar ${cal.result} ms` : `Save ${cal.result} ms`}</button>
                )}
                {cal.result !== null && <button type="button" className="sgx-btn sgx-btn--ground" onClick={startCalibration}><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Repetir' : 'Repeat'}</button>}
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => goPhase('start')}>{es ? 'Volver' : 'Back'}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'paused' && (
          <div className="sgx-pulse__overlay">
            <div className="sgx-pulse__panel is-sm" role="group" aria-label={es ? 'Pausa' : 'Paused'}>
              {pillarBar}
              <p className="sgx-pulse__kicker">{trackName}</p>
              <h2>{es ? 'Pausa' : 'Paused'}</h2>
              <div className="sgx-pulse__buttons is-stack">
                <button type="button" className="sgx-btn" onClick={resume} autoFocus><Play className="w-4 h-4" aria-hidden />{es ? 'Continuar' : 'Resume'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={startRun}><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Empezar de nuevo' : 'Restart'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setGuideOpen(true)}><HelpCircle className="w-4 h-4" aria-hidden />{es ? 'Cómo se juega' : 'How to play'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => finish(false)} data-pulse-end><Square className="w-4 h-4" aria-hidden />{es ? 'Terminar partida' : 'End run'}</button>
              </div>
            </div>
          </div>
        )}

        {phase === 'over' && result && (
          <div className="sgx-pulse__overlay" data-pulse-over>
            <div className="sgx-pulse__panel">
              {pillarBar}
              <p className="sgx-pulse__kicker">{trackName} · {es ? DIFF_LABEL[difficulty].es : DIFF_LABEL[difficulty].en}</p>
              <div className="sgx-pulse__over-head">
                <div className={`sgx-pulse__grade is-${result.grade.toLowerCase()}`} aria-label={`${es ? 'Nota' : 'Grade'} ${result.grade}`}>{result.grade}</div>
                <div>
                  <h2>{result.newRecord ? (es ? '¡Nuevo récord!' : 'New best!') : result.completed ? (es ? 'Canción completa' : 'Song complete') : (es ? 'Partida terminada' : 'Run over')}</h2>
                  {(result.fullCombo || (result.completed && result.grade === 'S')) && (
                    <p className="sgx-pulse__badges">
                      {result.fullCombo && <span>Full combo</span>}
                      {result.completed && result.grade === 'S' && <span>{es ? 'Nota S' : 'Grade S'}</span>}
                    </p>
                  )}
                </div>
              </div>
              <dl className="sgx-pulse__stats">
                <div><dt>{es ? 'Puntos' : 'Points'}</dt><dd className="is-yellow" data-pulse-final>{fmt(result.score, es)}</dd></div>
                <div><dt>{es ? 'Precisión' : 'Accuracy'}</dt><dd>{result.acc.toFixed(1)}%</dd></div>
                <div><dt>{es ? 'Combo máx.' : 'Max combo'}</dt><dd>{result.maxCombo}</dd></div>
                <div><dt>{es ? 'XP ganada' : 'XP earned'}</dt><dd>+{result.xp}</dd></div>
              </dl>
              <p className="sgx-pulse__split">
                <span className="is-perfect">{es ? 'Perfecto' : 'Perfect'} {result.perfect}</span>
                <span className="is-good">{es ? 'Bien' : 'Good'} {result.good}</span>
                <span className="is-miss">{es ? 'Fallo' : 'Miss'} {result.miss}</span>
              </p>
              <p className="sgx-pulse__rankline" role="status">
                {es ? 'Tu mejor' : 'Your best'}: <b>{fmt(Math.max(result.best, myBest), es)}</b> ·{' '}
                {ranking.status === 'loading'
                  ? (es ? 'Buscando tu puesto…' : 'Finding your place…')
                  : ranking.status === 'error'
                    ? (es ? 'Ranking no disponible ahora' : 'Ranking unavailable right now')
                    : ranking.myRank
                      ? (es ? `Puesto #${ranking.myRank}` : `Place #${ranking.myRank}`)
                      : (es ? 'Suma puntos para entrar al ranking' : 'Score points to enter the ranking')}
                {!result.completed && <> · {es ? 'La XP es por canciones completas' : 'XP is for completed songs'}</>}
              </p>
              <div className="sgx-pulse__buttons">
                <button type="button" className="sgx-btn" onClick={startRun} data-pulse-start autoFocus><RotateCcw className="w-4 h-4" aria-hidden />{es ? 'Jugar otra vez' : 'Play again'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => setRankingOpen(true)} data-pulse-ranking><Trophy className="w-4 h-4" aria-hidden />{es ? 'Ver ranking' : 'View ranking'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={share}><Share2 className="w-4 h-4" aria-hidden />{es ? 'Compartir' : 'Share'}</button>
                <button type="button" className="sgx-btn sgx-btn--ground" onClick={() => goPhase('start')}>{es ? 'Menú' : 'Menu'}</button>
              </div>
              {shareNote && <p className="sgx-pulse__best" role="status">{shareNote}</p>}
            </div>
          </div>
        )}
      </div>

      <QuickGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        guideTitle={es ? 'Cómo se juega' : 'How to play'}
        guideCategory="Pulso SGX"
        steps={guideSteps(es)}
        onPrimaryAction={phase === 'start' && track ? startRun : undefined}
        primaryActionLabel={phase === 'start' && track ? (es ? 'Jugar' : 'Play') : (es ? 'Entendido' : 'Got it')}
        accent="#00DDFF"
      />
      <PulseRankingDialog
        open={rankingOpen}
        onClose={() => setRankingOpen(false)}
        onPlay={() => { if (phase === 'paused') resume(); else if (track) startRun(); }}
        ranking={ranking}
        es={es}
        myBest={myBest}
      />
    </section>
  );
};

export default Game;
