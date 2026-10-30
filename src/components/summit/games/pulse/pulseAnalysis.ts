import type { Candidate, Lane } from './pulseChart';
import { yieldToBrowser } from './pulseAudio';

/* Pulso SGX: builds chart candidates from a real song. The song is downmixed
   and resampled with an OfflineAudioContext, then a spectral-flux onset curve
   (low / mid / high bands) gives the onsets, autocorrelation gives the BPM and
   the beat phase, and every onset is quantized to the 16th grid. The result is
   cached in localStorage per song URL. */

export interface SongAnalysis { v: 2; url: string; duration: number; bpm: number; offset: number; cands: Candidate[] }

const RATE = 11025;
const N = 512;
const HOP = 128;
const FPS = RATE / HOP;
const CACHE_KEY = 'sgx_pulse_song_v2';

export function cachedAnalysis(url: string, duration: number): SongAnalysis | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    const a = raw ? (JSON.parse(raw) as SongAnalysis) : null;
    return a && a.v === 2 && a.url === url && Math.abs(a.duration - duration) < 0.05 ? a : null;
  } catch {
    return null;
  }
}

function saveAnalysis(a: SongAnalysis) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(a)); } catch { /* storage full: analyze again next time */ }
}

function fft(re: Float32Array, im: Float32Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

export async function analyzeSong(url: string, buffer: AudioBuffer): Promise<SongAnalysis> {
  const cached = cachedAnalysis(url, buffer.duration);
  if (cached) return cached;

  // 1. Mono at 11 kHz.
  const oc = new OfflineAudioContext(1, Math.ceil(buffer.duration * RATE), RATE);
  const src = oc.createBufferSource();
  src.buffer = buffer;
  src.connect(oc.destination);
  src.start();
  const mono = (await oc.startRendering()).getChannelData(0);

  // 2. Spectral flux per band.
  const frames = Math.max(0, Math.floor((mono.length - N) / HOP));
  const binHz = RATE / N;
  const lowTo = Math.round(200 / binHz);
  const midTo = Math.round(2000 / binHz);
  const win = new Float32Array(N).map((_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  let prev = new Float32Array(N / 2);
  let cur = new Float32Array(N / 2);
  const flux = new Float32Array(frames);
  const bands = [new Float32Array(frames), new Float32Array(frames), new Float32Array(frames)];
  const energy = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    const o = f * HOP;
    for (let i = 0; i < N; i++) { re[i] = mono[o + i] * win[i]; im[i] = 0; }
    fft(re, im);
    let e = 0;
    for (let k = 1; k < N / 2; k++) {
      const m = Math.log1p(100 * Math.hypot(re[k], im[k]));
      cur[k] = m;
      e += m;
      const d = m - prev[k];
      if (d > 0) bands[k < lowTo ? 0 : k < midTo ? 1 : 2][f] += d;
    }
    energy[f] = e;
    flux[f] = bands[0][f] * 2 + bands[1][f] + bands[2][f] * 0.7;
    [prev, cur] = [cur, prev];
    if (f % 4000 === 3999) await yieldToBrowser();
  }

  // 3. Novelty: flux above its local mean.
  const half = Math.round(FPS * 0.15);
  const nov = new Float32Array(frames);
  let acc = 0;
  for (let f = 0; f < frames + half; f++) {
    if (f < frames) acc += flux[f];
    if (f - 2 * half - 1 >= 0) acc -= flux[f - 2 * half - 1];
    const c = f - half;
    if (c >= 0 && c < frames) nov[c] = Math.max(0, flux[c] - acc / (2 * half + 1));
  }

  // 4. Tempo by autocorrelation (70–180 BPM, gently preferring ~120).
  const minLag = Math.floor((FPS * 60) / 180);
  const maxLag = Math.ceil((FPS * 60) / 70);
  let bestLag = minLag;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let f = lag; f < frames; f++) s += nov[f] * nov[f - lag];
    s *= Math.exp(-0.5 * (Math.log2((60 * FPS) / lag / 120) / 0.9) ** 2);
    if (s > bestScore) { bestScore = s; bestLag = lag; }
  }

  // 5. Fine tempo + phase: the beat grid that collects the most novelty. A frame
  //    is ~12 ms, so the lag alone is too coarse for a whole song.
  const at = (x: number) => { const i = Math.floor(x); const k = x - i; return (nov[i] || 0) * (1 - k) + (nov[i + 1] || 0) * k; };
  const coarse = (60 * FPS) / bestLag;
  let bpm = coarse;
  let offsetF = 0;
  let best = -1;
  for (let b = coarse * 0.97; b <= coarse * 1.03; b += 0.02) {
    const period = (60 * FPS) / b;
    for (let p = 0; p < period; p += 0.5) {
      let s = 0;
      for (let f = p; f < frames; f += period) s += at(f) + 0.5 * at(f + period / 2);
      if (s > best) { best = s; bpm = b; offsetF = p; }
    }
  }
  bpm = Math.round(bpm * 100) / 100;
  const beat = 60 / bpm;
  const beatFrames = beat * FPS;
  // Frame f starts at f*HOP; its onset sits around the window center.
  const frameTime = (f: number) => (f * HOP + N / 2) / RATE;
  const offset = frameTime(offsetF) % beat;

  // 6. Peaks → quantized candidates.
  const sorted = Array.from(nov).filter((v) => v > 0).sort((x, y) => x - y);
  const p95 = sorted[Math.floor(sorted.length * 0.95)] || 1;
  const floor = sorted[Math.floor(sorted.length * 0.6)] || 0;
  const bandMean = bands.map((b) => b.reduce((s, v) => s + v, 0) / Math.max(1, frames) || 1);
  const s16 = beat / 4;
  const slots = new Map<number, Candidate>();
  const BAND_LANE: Lane[] = [1, 0, 2];
  for (let f = 3; f < frames - 3; f++) {
    const v = nov[f];
    if (v <= floor || v < nov[f - 1] || v < nov[f + 1] || v < nov[f - 2] || v < nov[f + 2] || v < nov[f - 3] || v < nov[f + 3]) continue;
    const k = Math.round((frameTime(f) - offset) / s16);
    const tq = offset + k * s16;
    if (tq < 0) continue;
    const pos = ((k % 4) + 4) % 4;
    const w = Math.min(3, (v / p95) * 1.6) + (pos === 0 ? 0.6 : pos === 2 ? 0.3 : 0);
    // Lane from the band that moved the most, relative to how busy that band usually is.
    const rel = bands.map((b, i) => b[f] / bandMean[i]);
    const band = rel.indexOf(Math.max(...rel));
    // Hold when the sound sustains for at least 3/4 of a beat with no new onset.
    let dur = 0;
    const lvl = energy[f];
    let g = f + 1;
    while (g < frames && g - f < beatFrames * 2 && energy[g] > lvl * 0.75 && nov[g] < v * 0.5) g++;
    if ((g - f) / FPS >= beat * 0.75) dur = Math.round(((g - f) / FPS) / (beat / 2)) * (beat / 2);
    const prevC = slots.get(k);
    if (!prevC || prevC.w < w) slots.set(k, { t: Math.round(tq * 1000) / 1000, lane: BAND_LANE[band], w: Math.round(w * 100) / 100, dur, mark: dur ? 2 : band === 0 ? 0 : 1 });
  }
  const cands = [...slots.values()].sort((x, y) => x.t - y.t);

  const result: SongAnalysis = { v: 2, url, duration: buffer.duration, bpm, offset: Math.round(offset * 1000) / 1000, cands };
  saveAnalysis(result);
  return result;
}
