import { getIsAudioMuted } from '../../../../lib/cyberAudioEngine';

/* Torre de Pilares sounds: small procedural Web Audio cues. One shared
   AudioContext, resumed on the first gesture; the global mute wins. The drop
   tone climbs a pentatonic scale with the combo. */

export type StackSfx = 'drop' | 'perfect' | 'cut' | 'miss' | 'power' | 'pillars' | 'shield' | 'grow' | 'over';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Call from a user gesture so phones unlock audio. */
export function unlockStackAudio() { audio(); }

const PENTA = [0, 2, 4, 7, 9];
const step = (n: number) => PENTA[n % 5] + 12 * Math.floor(n / 5);
const hz = (semi: number, base = 261.63) => base * Math.pow(2, semi / 12);

function tone(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, gain: number, out: AudioNode) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.02);
  return o;
}

function hiss(c: AudioContext, at: number, dur: number, from: number, to: number, gain: number, out: AudioNode) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.6, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = 1.2;
  f.frequency.setValueAtTime(from, at);
  f.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at);
  src.stop(at + dur + 0.02);
}

export function playStackSfx(kind: StackSfx, combo = 0) {
  if (getIsAudioMuted()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.005;
  const out = c.createGain();
  out.gain.value = 0.5;
  out.connect(c.destination);

  switch (kind) {
    case 'drop':
      tone(c, 150, t, 0.12, 'sine', 0.5, out);
      hiss(c, t, 0.06, 1800, 600, 0.12, out);
      break;
    case 'perfect': {
      const s = step(Math.min(combo, 14));
      tone(c, hz(s + 12), t, 0.35, 'triangle', 0.32, out);
      tone(c, hz(s + 19), t + 0.04, 0.3, 'sine', 0.16, out);
      tone(c, hz(s + 24), t + 0.09, 0.25, 'sine', 0.08, out);
      tone(c, 160, t, 0.1, 'sine', 0.35, out);
      break;
    }
    case 'cut':
      tone(c, 120, t, 0.14, 'sine', 0.45, out);
      hiss(c, t, 0.22, 3200, 400, 0.22, out);
      break;
    case 'miss':
      hiss(c, t, 0.4, 1200, 120, 0.3, out);
      tone(c, 110, t, 0.3, 'sawtooth', 0.08, out).frequency.exponentialRampToValueAtTime(55, t + 0.3);
      break;
    case 'power':
      [0, 4, 7, 12].forEach((s, i) => tone(c, hz(s + 12), t + i * 0.06, 0.22, 'square', 0.07, out));
      break;
    case 'grow':
      tone(c, hz(7), t, 0.4, 'triangle', 0.22, out).frequency.exponentialRampToValueAtTime(hz(19), t + 0.35);
      break;
    case 'shield':
      tone(c, hz(12), t, 0.5, 'sine', 0.25, out).frequency.exponentialRampToValueAtTime(hz(0), t + 0.45);
      hiss(c, t, 0.3, 800, 3000, 0.1, out);
      break;
    case 'pillars':
      [0, 2, 4, 7, 9, 12].forEach((s, i) => tone(c, hz(s + 12), t + i * 0.07, 0.4, 'triangle', 0.2, out));
      tone(c, hz(24), t + 0.45, 0.7, 'sine', 0.16, out);
      break;
    case 'over':
      [7, 4, 0, -5].forEach((s, i) => tone(c, hz(s), t + i * 0.11, 0.3, 'triangle', 0.18, out));
      break;
  }
  window.setTimeout(() => out.disconnect(), 1500);
}
