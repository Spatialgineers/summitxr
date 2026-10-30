import type { Candidate, Lane, Mark } from './pulseChart';

/* Pulso SGX audio: one shared AudioContext, the built-in SGX beat (synthesized
   sample by sample, then played through the same path as a real song),
   the player (AudioBufferSource → analyser → master) and the calibration
   metronome. */

let ctx: AudioContext | null = null;

export function pulseAudio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor({ latencyHint: 'interactive' });
  return ctx;
}

export function closePulseAudio() {
  ctx?.close().catch(() => {});
  ctx = null;
}

/** Audio-clock time of a DOM event (corrects for the delay before the handler ran). */
export function audioTimeOf(ac: AudioContext, eventTimeStamp: number): number {
  const lag = Math.max(0, Math.min(0.1, (performance.now() - eventTimeStamp) / 1000));
  return ac.currentTime - lag;
}

/** Lets the page breathe during long work (a message, not a timer: timers get throttled). */
export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    const ch = new MessageChannel();
    ch.port1.onmessage = () => { ch.port1.close(); resolve(); };
    ch.port2.postMessage(0);
  });
}

/* ---------- The built-in SGX beat ---------- */
export const SGX_BEAT_BPM = 120;
const BEAT = 60 / SGX_BEAT_BPM;
const S16 = BEAT / 4;
const BARS = 44;
export const SGX_BEAT_LENGTH = BARS * 4 * BEAT + 2;

type Section = 'intro' | 'build' | 'drop' | 'break' | 'rise' | 'drop2' | 'outro';
const sectionOf = (bar: number): Section =>
  bar < 4 ? 'intro' : bar < 12 ? 'build' : bar < 20 ? 'drop' : bar < 24 ? 'break' : bar < 28 ? 'rise' : bar < 40 ? 'drop2' : 'outro';

// Am – F – C – G, as MIDI notes (root, third, fifth).
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const HOLD_LANE: Lane[] = [0, 1, 2, 1];
const ARP_STEPS = [0, 1, 2, 3, 2, 1, 2, 3, 4, 3, 2, 1, 2, 3, 2, 1];
const LEAD = [0, -1, 2, -1, 1, 2, -1, 3];
const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);

export interface BeatTrack { buffer: AudioBuffer; cands: Candidate[] }

/* Sample-level synth: an OfflineAudioContext with thousands of voices renders
   far too slowly on phones. Voices write into dry L/R plus reverb and echo
   sends; the result becomes an AudioBuffer played through Web Audio. */
const RATE = 44100;

/** Chamberlin state-variable filter, one sample at a time. */
function svf() {
  let low = 0;
  let band = 0;
  let lastCutoff = -1;
  let f = 0;
  return (x: number, cutoff: number, q: number, mode: 0 | 1 | 2) => {
    if (cutoff !== lastCutoff) { lastCutoff = cutoff; f = 2 * Math.sin((Math.PI * Math.min(cutoff, RATE / 6)) / RATE); }
    low += f * band;
    const high = x - low - q * band;
    band += f * high;
    return mode === 0 ? low : mode === 1 ? band : high;
  };
}

export async function renderSgxBeat(): Promise<BeatTrack> {
  const len = Math.ceil(SGX_BEAT_LENGTH * RATE);
  const L = new Float32Array(len);
  const R = new Float32Array(len);
  const verb = new Float32Array(len);
  const echo = new Float32Array(len);
  const cands: Candidate[] = [];
  const cand = (t: number, lane: Lane, w: number, mark: Mark, dur = 0) => cands.push({ t, lane, w, dur, mark });
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 1073741823.5 - 1; };

  const write = (i: number, s: number, pan: number, wet: number, dly: number) => {
    if (i < 0 || i >= len) return;
    L[i] += s * (1 - Math.max(0, pan));
    R[i] += s * (1 + Math.min(0, pan));
    if (wet) verb[i] += s * wet;
    if (dly) echo[i] += s * dly;
  };

  const kick = (t: number, v = 1) => {
    const i0 = Math.round(t * RATE);
    let ph = 0;
    for (let n = 0; n < 0.36 * RATE; n++) {
      const tt = n / RATE;
      ph += (2 * Math.PI * (42 + 110 * Math.exp(-tt / 0.03))) / RATE;
      write(i0 + n, Math.sin(ph) * Math.min(1, tt / 0.002) * Math.exp(-tt / 0.11) * 0.9 * v, 0, 0, 0);
    }
  };
  const noiseHit = (t: number, mode: 1 | 2, cutoff: number, q: number, peak: number, decay: number, pan: number, wet: number) => {
    const i0 = Math.round(t * RATE);
    const f = svf();
    for (let n = 0; n < decay * 6 * RATE; n++) write(i0 + n, f(rnd(), cutoff, q, mode) * peak * Math.exp(-n / RATE / decay), pan, wet, 0);
  };
  const snare = (t: number, v = 1) => {
    noiseHit(t, 1, 1900, 0.9, 0.9 * v, 0.045, 0, 0.35);
    const i0 = Math.round(t * RATE);
    let ph = 0;
    for (let n = 0; n < 0.12 * RATE; n++) {
      const tt = n / RATE;
      ph += (2 * Math.PI * (160 + 80 * Math.exp(-tt / 0.03))) / RATE;
      write(i0 + n, (2 / Math.PI) * Math.asin(Math.sin(ph)) * 0.3 * v * Math.exp(-tt / 0.03), 0, 0.1, 0);
    }
  };
  const hat = (t: number, v: number, open = false) => noiseHit(t, 2, 7500, 0.6, 0.22 * v, open ? 0.06 : 0.012, 0.25, 0.05);

  type Wave = 'saw' | 'square';
  const synth = (t: number, midi: number, dur: number, wave: Wave, peak: number, cutoff: number, pan = 0, wet = 0, dly = 0, detune = 0) => {
    const i0 = Math.round(t * RATE);
    const freqs = detune ? [hz(midi) * 2 ** (-detune / 1200), hz(midi) * 2 ** (detune / 1200)] : [hz(midi)];
    const ph = freqs.map((_, k) => k * 0.37);
    const f = svf();
    const total = Math.round((dur + 0.08) * RATE);
    const tail = Math.exp(-1 / 0.7);
    let c = cutoff;
    for (let n = 0; n < total; n++) {
      const tt = n / RATE;
      if (n % 32 === 0) c = cutoff * (1 + 1.4 * Math.exp(-tt / 0.08));
      let x = 0;
      for (let k = 0; k < freqs.length; k++) {
        ph[k] += freqs[k] / RATE;
        if (ph[k] >= 1) ph[k] -= 1;
        x += wave === 'saw' ? 2 * ph[k] - 1 : ph[k] < 0.5 ? 1 : -1;
      }
      const env = Math.min(1, tt / 0.005) * (tt < dur ? Math.exp(-tt / (dur * 0.7)) : tail * Math.max(0, 1 - (tt - dur) / 0.08));
      write(i0 + n, f(x / freqs.length, c, 0.5, 0) * env * peak, pan, wet, dly);
    }
  };
  const pad = (t: number, chord: number[], dur: number) => {
    for (const m of chord) {
      const i0 = Math.round(t * RATE);
      const freqs = [hz(m + 12) * 0.995, hz(m + 12) * 1.005];
      const ph = [0, 0.37];
      const f = svf();
      for (let n = 0; n < dur * RATE; n++) {
        const tt = n / RATE;
        let x = 0;
        for (let k = 0; k < 2; k++) { ph[k] += freqs[k] / RATE; if (ph[k] >= 1) ph[k] -= 1; x += 2 * ph[k] - 1; }
        const env = Math.min(1, tt / 0.35) * Math.min(1, (dur - tt) / 0.3);
        write(i0 + n, f(x * 0.5, 1300, 0.7, 0) * env * 0.075, 0, 0.5, 0);
      }
    }
  };
  const riser = (t: number, dur: number) => {
    const i0 = Math.round(t * RATE);
    const f = svf();
    for (let n = 0; n < dur * RATE; n++) {
      const k = n / (dur * RATE);
      write(i0 + n, f(rnd(), 400 * 22 ** k, 0.5, 1) * 0.25 * k * k, 0, 0.4, 0);
    }
  };

  for (let bar = 0; bar < BARS; bar++) {
    const sec = sectionOf(bar);
    const t0 = bar * 4 * BEAT;
    const ci = bar % 4;
    const chord = CHORDS[ci];
    const drums = sec === 'build' || sec === 'drop' || sec === 'drop2' || sec === 'rise' || sec === 'outro';
    const full = sec === 'drop' || sec === 'drop2';

    if (sec === 'intro' || sec === 'break' || sec === 'outro') {
      pad(t0, chord, 4 * BEAT);
      if (bar > 0) cand(t0, HOLD_LANE[ci], 2.6, 2, BEAT * 3);
    } else if (full) pad(t0, chord, 4 * BEAT);
    if (sec === 'rise' && bar === 24) riser(t0, 16 * BEAT);

    for (let b = 0; b < 4; b++) {
      const tb = t0 + b * BEAT;
      if (drums && !(sec === 'outro' && bar === BARS - 1 && b > 0)) {
        kick(tb, sec === 'outro' ? 0.8 : 1);
        cand(tb, 1, b === 0 ? 3 : b === 2 ? 1.5 : 1.2, 0);
      }
      const snareOn = (full || (sec === 'build' && bar >= 8)) && (b === 1 || b === 3);
      if (snareOn) {
        snare(tb);
        cand(tb, b === 3 ? (bar % 2 ? 0 : 2) : bar % 2 ? 2 : 0, b === 3 ? 2.2 : 1.6, 0);
      }
      // Hats: 8ths in intro/build, 16ths in drops (open hat on the offbeat).
      if (sec !== 'break') {
        for (let s = 0; s < 4; s++) {
          if (!full && s % 2) continue;
          if (sec === 'intro' && s === 0) continue;
          hat(tb + s * S16, s === 2 ? 1 : 0.55, full && s === 2);
        }
      }
      // Bass: offbeat 8ths pumping on the chord root.
      if (drums && sec !== 'outro') {
        synth(tb + BEAT / 2, chord[0] - 24, BEAT * 0.42, 'saw', 0.4, 280);
        if (full) synth(tb, chord[0] - 24, BEAT * 0.2, 'square', 0.16, 220);
      }
    }

    // Arp: 16ths over the chord (8ths when it is quiet). Lane follows the pitch contour.
    if (bar >= 2 && (sec !== 'outro' || bar < 42)) {
      const sixteenths = sec !== 'intro' && sec !== 'break';
      for (let s = 0; s < 16; s++) {
        if (!sixteenths && s % 2) continue;
        const idx = ARP_STEPS[s];
        const midi = chord[idx % 3] + 12 * (1 + Math.floor(idx / 3));
        const t = t0 + s * S16;
        const bright = full ? 2600 : sec === 'rise' ? 900 + (bar - 24) * 500 : 1100;
        synth(t, midi, S16 * 0.9, 'square', full ? 0.11 : 0.09, bright, s % 2 ? 0.35 : -0.35, 0.12, 0.45);
        const lane = (idx % 3) as Lane;
        if (s % 4 === 0) cand(t, lane, sec === 'intro' || sec === 'break' ? (s === 8 ? 2 : 1.3) : 1, 1);
        else if (s % 2 === 0) cand(t, lane, s === 6 || s === 14 ? 1.1 : 0.9, 1);
        else cand(t, lane, 0.55, 1);
      }
    }

    // Chord stabs in the first drop, lead line in the second.
    if (sec === 'drop') {
      for (const s of [0, 3, 6]) {
        const t = t0 + s * 2 * S16;
        for (const m of chord) synth(t, m + 12, BEAT * 0.4, 'saw', 0.07, 2400, 0, 0.25, 0.25, 12);
        cand(t, (s / 3) as Lane, s === 0 ? 1.4 : 1.25, 1);
      }
    }
    if (sec === 'drop2') {
      LEAD.forEach((idx, s) => {
        if (idx < 0) return;
        const t = t0 + s * 2 * S16;
        synth(t, chord[idx % 3] + 24 + (idx === 3 ? 12 : 0), BEAT * 0.45, 'saw', 0.1, 3400, 0, 0.3, 0.35, 7);
        cand(t, (idx % 3) as Lane, 1.3, 1);
      });
    }
    // Snare roll into the second drop.
    if (sec === 'rise') {
      const step = bar < 26 ? 2 : 1;
      for (let s = 0; s < 16; s += step) {
        const t = t0 + s * S16;
        snare(t, 0.35 + (s / 16) * 0.4 + (bar - 24) * 0.12);
        cand(t, s % 4 === 0 ? 1 : ((s / step) % 2 ? 2 : 0) as Lane, step === 1 ? 0.8 : 1.1, 0);
      }
    }
    if (bar % 4 === 3) await yieldToBrowser();
  }
  // Final hit.
  const end = BARS * 4 * BEAT;
  kick(end);
  noiseHit(end, 2, 3000, 0.5, 0.4, 0.4, 0, 0.6);
  for (const m of CHORDS[0]) synth(end, m + 12, 1.6, 'saw', 0.08, 1800, 0, 0.5, 0, 10);
  cand(end - 4 * BEAT, 1, 2.6, 2, BEAT * 3);
  await yieldToBrowser();

  // Echo (dotted 8th, alternating sides) and a small Schroeder reverb.
  const d = Math.round(BEAT * 0.75 * RATE);
  for (let i = d; i < len; i++) echo[i] += echo[i - d] * 0.38;
  for (let i = 0; i < len; i++) {
    const side = Math.floor(i / d) % 2 ? 0.5 : -0.5;
    L[i] += echo[i] * 0.5 * (1 - side);
    R[i] += echo[i] * 0.5 * (1 + side);
  }
  await yieldToBrowser();
  const combs = [1557, 1617, 1491, 1422].map((n) => ({ n, buf: new Float32Array(n), i: 0, lp: 0 }));
  const aps = [225, 556].map((n) => ({ n, buf: new Float32Array(n), i: 0 }));
  for (let i = 0; i < len; i++) {
    const x = verb[i];
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.lp = o * 0.7 + c.lp * 0.3;
      c.buf[c.i] = x + c.lp * 0.8;
      c.i = (c.i + 1) % c.n;
      y += o;
    }
    for (const a of aps) {
      const o = a.buf[a.i];
      const v = y + o * 0.5;
      a.buf[a.i] = v;
      a.i = (a.i + 1) % a.n;
      y = o - v * 0.5;
    }
    L[i] += y * 0.12;
    R[i] += y * 0.12;
  }
  // Normalize and soft-clip.
  let peak = 0;
  for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const g = peak > 0 ? 1.4 / peak : 1;
  for (let i = 0; i < len; i++) { L[i] = Math.tanh(L[i] * g) * 0.9; R[i] = Math.tanh(R[i] * g) * 0.9; }

  const buffer = new AudioBuffer({ length: len, sampleRate: RATE, numberOfChannels: 2 });
  buffer.copyToChannel(L, 0);
  buffer.copyToChannel(R, 1);
  return { buffer, cands };
}

/* ---------- Player ---------- */
export interface Player {
  analyser: AnalyserNode;
  /** Song time (s) at audio-clock time `at`. */
  songTime: (at?: number) => number;
  start: (from: number, delay: number) => void;
  stop: () => number;
  setVolume: (v: number) => void;
  dispose: () => void;
}

export function createPlayer(ac: AudioContext, buffer: AudioBuffer): Player {
  const master = ac.createGain();
  const analyser = ac.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.6;
  analyser.connect(master).connect(ac.destination);
  let src: AudioBufferSourceNode | null = null;
  let startAt = 0;
  let pausedAt = 0;
  let running = false;

  return {
    analyser,
    songTime: (at = ac.currentTime) => (running ? at - startAt : pausedAt),
    start(from, delay) {
      src?.disconnect();
      src = ac.createBufferSource();
      src.buffer = buffer;
      src.connect(analyser);
      const when = ac.currentTime + delay;
      // `from` can be negative (lead-in): the audio starts later instead.
      if (from >= 0) src.start(when, from);
      else src.start(when - from);
      startAt = when - from;
      running = true;
    },
    stop() {
      if (running) pausedAt = ac.currentTime - startAt;
      running = false;
      try { src?.stop(); } catch { /* not started */ }
      src?.disconnect();
      src = null;
      return pausedAt;
    },
    setVolume(v) { master.gain.setTargetAtTime(v, ac.currentTime, 0.02); },
    dispose() {
      try { src?.stop(); } catch { /* not started */ }
      src?.disconnect();
      analyser.disconnect();
      master.disconnect();
    },
  };
}

/** One metronome click at audio time `t`. */
export function click(ac: AudioContext, t: number, accent: boolean, volume: number) {
  if (volume <= 0) return;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = 'square';
  o.frequency.value = accent ? 1760 : 1175;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.3 * volume, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  o.connect(g).connect(ac.destination);
  o.start(t);
  o.stop(t + 0.08);
}
