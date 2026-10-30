/* Pulso SGX: chart model, difficulty filter, judgments and scoring. Both the
   built-in SGX beat and an analyzed song produce "candidates" (every musical
   event worth a note, with a weight); each difficulty keeps the ones above its
   threshold on its grid. */

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];
export type Lane = 0 | 1 | 2;

/** Atlas mark drawn on the gem: 0 bolt (drums), 1 gear (melody), 2 gear G (holds). */
export type Mark = 0 | 1 | 2;

export interface Candidate { t: number; lane: Lane; w: number; dur: number; mark: Mark }

export interface Note {
  t: number;
  lane: Lane;
  /** Hold length in seconds (0 = tap). */
  dur: number;
  mark: Mark;
  /** 0 waiting, 1 hit, 2 missed, 3 holding, 4 hold done, 5 hold broken. */
  state: number;
}

export interface Chart { bpm: number; offset: number; duration: number; notes: Note[] }

interface DiffRule { min: number; grid: number; laneGap: number; gap: number; doubles: boolean; holdsBlock: boolean; speed: number; nps: number }

/** grid in beats; gaps in seconds. */
const RULES: Record<Difficulty, DiffRule> = {
  easy: { min: 1.9, grid: 1, laneGap: 0.45, gap: 0.42, doubles: false, holdsBlock: true, speed: 15, nps: 1.1 },
  normal: { min: 1.05, grid: 0.5, laneGap: 0.24, gap: 0.2, doubles: false, holdsBlock: false, speed: 19, nps: 2.2 },
  hard: { min: 0.75, grid: 0.25, laneGap: 0.17, gap: 0.11, doubles: true, holdsBlock: false, speed: 23, nps: 3.6 },
};

export const scrollSpeed = (d: Difficulty) => RULES[d].speed;

/** `song`: candidates from an analyzed song. Their weights are relative, so each
    difficulty keeps the strongest ones up to its note density, and lanes are
    spread out (onsets on the beat are mostly kicks, all in one band). */
export function buildChart(cands: Candidate[], d: Difficulty, bpm: number, offset: number, duration: number, song = false): Chart {
  const rule = RULES[d];
  const beat = 60 / bpm;
  const step = beat * rule.grid;
  // Keep candidates on this difficulty's grid, strongest first.
  const pool = cands
    .filter((c) => (song || c.w >= rule.min) && c.t > 1 && c.t < duration - 1)
    .filter((c) => {
      const k = (c.t - offset) / step;
      return Math.abs(k - Math.round(k)) * step < 0.02;
    })
    .sort((a, b) => b.w - a.w);

  const picked: Candidate[] = [];
  const clash = (c: Candidate) => picked.some((p) => {
    const dt = Math.abs(p.t - c.t);
    if (p.lane === c.lane && (dt < rule.laneGap || (p.dur > 0 && c.t >= p.t && c.t <= p.t + p.dur + 0.15) || (c.dur > 0 && p.t >= c.t && p.t <= c.t + c.dur + 0.15))) return true;
    if (rule.holdsBlock && ((p.dur > 0 && c.t > p.t - 0.2 && c.t < p.t + p.dur + 0.3) || (c.dur > 0 && p.t > c.t - 0.2 && p.t < c.t + c.dur + 0.3))) return true;
    if (dt < 0.01) return !rule.doubles || p.w < 1.4 || c.w < 1 || (p.dur > 0 && c.dur > 0);
    return dt < rule.gap && p.lane !== c.lane;
  });
  const cap = song ? Math.round(rule.nps * duration) : Infinity;
  for (const c of pool) if (picked.length < cap && !clash(c)) picked.push({ ...c });
  picked.sort((a, b) => a.t - b.t || a.lane - b.lane);
  if (song) {
    // No lane may take half of the last 8 notes: move the note to the quietest lane.
    for (let i = 1; i < picked.length; i++) {
      const z = picked[i];
      if (picked[i - 1].t === z.t || picked[i + 1]?.t === z.t) continue;
      const recent = picked.slice(Math.max(0, i - 8), i);
      const use = [0, 1, 2].map((l) => recent.filter((n) => n.lane === l).length);
      if (use[z.lane] < 4) continue;
      const lane = ([0, 1, 2] as Lane[]).filter((l) => l !== z.lane).sort((p, q) => use[p] - use[q])[0];
      const busy = picked.some((n) => n !== z && n.lane === lane && Math.abs(n.t - z.t) < rule.laneGap + n.dur);
      if (!busy) z.lane = lane;
    }
  }

  const notes = picked.map((c) => ({ t: c.t, lane: c.lane, dur: d === 'easy' ? Math.min(c.dur, beat * 3) : c.dur, mark: c.mark, state: 0 }));
  return { bpm, offset, duration, notes };
}

/* ---------- Judgments ---------- */
export const WINDOW_PERFECT = 0.05;
export const WINDOW_GOOD = 0.105;
export const WINDOW_MISS = 0.15;
/** A hold released this close to its end still counts. */
export const HOLD_GRACE = 0.14;
export const FEVER_COMBO = 30;

export type Judgment = 'perfect' | 'good' | 'miss';

export interface RunStats { score: number; combo: number; maxCombo: number; perfect: number; good: number; miss: number; fever: boolean }
export const freshStats = (): RunStats => ({ score: 0, combo: 0, maxCombo: 0, perfect: 0, good: 0, miss: 0, fever: false });

export const multiplier = (s: RunStats) => Math.min(4, 1 + Math.floor(s.combo / 10)) * (s.fever ? 2 : 1);

/** Applies one judgment; returns the points it gave. */
export function applyJudgment(s: RunStats, j: Judgment, base = j === 'perfect' ? 300 : 120): number {
  if (j === 'miss') {
    s.miss++;
    s.combo = 0;
    s.fever = false;
    return 0;
  }
  if (j === 'perfect') s.perfect++;
  else s.good++;
  s.combo++;
  s.maxCombo = Math.max(s.maxCombo, s.combo);
  if (s.combo >= FEVER_COMBO) s.fever = true;
  const pts = base * multiplier(s);
  s.score += pts;
  return pts;
}

export function accuracy(s: RunStats): number {
  const n = s.perfect + s.good + s.miss;
  return n ? Math.round(((s.perfect + 0.6 * s.good) / n) * 1000) / 10 : 0;
}

export type Grade = 'S' | 'A' | 'B' | 'C';
export const gradeOf = (acc: number): Grade => (acc >= 95 ? 'S' : acc >= 88 ? 'A' : acc >= 75 ? 'B' : 'C');
