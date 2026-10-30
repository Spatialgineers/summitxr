import { getIsAudioMuted } from '../../../../lib/cyberAudioEngine';

/* Procedural Web Audio for "Rayo en tus manos": one shared context, created
   and resumed on the first gesture, silent when the site is muted. */

export type BoltSfx = 'zap' | 'zapBig' | 'hit' | 'pillar' | 'combo' | 'glitch' | 'clank' | 'boss' | 'bossDown' | 'end' | 'fizzle';

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let chargeOsc: { osc: OscillatorNode; gain: GainNode } | null = null;

function audio(): AudioContext | null {
  if (getIsAudioMuted()) return null;
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

/** Call from a user gesture so the context can start. */
export function unlockBoltAudio() { audio(); }

function noiseBuffer(c: AudioContext) {
  if (!noise) {
    noise = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  return noise;
}

function tone(c: AudioContext, type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function burst(c: AudioContext, t: number, dur: number, vol: number, freq: number, q = 0.8) {
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(c);
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
  s.stop(t + dur + 0.02);
}

export function playBolt(kind: BoltSfx) {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  switch (kind) {
    case 'zap': burst(c, t, 0.18, 0.35, 3200, 0.6); tone(c, 'sawtooth', 1400, 180, t, 0.16, 0.08); break;
    case 'zapBig': burst(c, t, 0.4, 0.5, 1800, 0.5); tone(c, 'sawtooth', 900, 60, t, 0.38, 0.14); tone(c, 'square', 2200, 300, t, 0.2, 0.04); break;
    case 'hit': tone(c, 'triangle', 880, 1320, t, 0.12, 0.16); burst(c, t, 0.12, 0.2, 5200, 1.2); break;
    case 'pillar': tone(c, 'triangle', 660, 990, t, 0.1, 0.16); tone(c, 'sine', 1320, 1320, t + 0.06, 0.18, 0.1); break;
    case 'combo': [523, 659, 784, 1046].forEach((f, i) => tone(c, 'triangle', f, f, t + i * 0.07, 0.22, 0.12)); break;
    case 'glitch': tone(c, 'square', 220, 70, t, 0.3, 0.12); burst(c, t, 0.3, 0.25, 600, 3); break;
    case 'clank': tone(c, 'square', 300, 260, t, 0.08, 0.08); burst(c, t, 0.06, 0.18, 2400, 4); break;
    case 'boss': tone(c, 'sawtooth', 70, 140, t, 0.9, 0.12); tone(c, 'sine', 55, 55, t, 1.1, 0.18); break;
    case 'bossDown': burst(c, t, 0.9, 0.5, 900, 0.4); [392, 523, 659, 784, 1046].forEach((f, i) => tone(c, 'triangle', f, f, t + 0.1 + i * 0.08, 0.3, 0.12)); break;
    case 'end': [784, 659, 523].forEach((f, i) => tone(c, 'triangle', f, f, t + i * 0.12, 0.25, 0.1)); break;
    case 'fizzle': tone(c, 'sine', 300, 120, t, 0.15, 0.06); break;
  }
}

/** Rising hum while a bolt charges (0..1). Pass null to stop. */
export function chargeHum(level: number | null) {
  const c = level === null ? ctx : audio();
  if (!c) return;
  if (level === null) {
    if (chargeOsc) {
      const { osc, gain } = chargeOsc;
      gain.gain.setTargetAtTime(0, c.currentTime, 0.02);
      osc.stop(c.currentTime + 0.1);
      chargeOsc = null;
    }
    return;
  }
  if (!chargeOsc) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    gain.gain.value = 0;
    const f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1400;
    osc.connect(f).connect(gain).connect(c.destination);
    osc.start();
    chargeOsc = { osc, gain };
  }
  chargeOsc.osc.frequency.setTargetAtTime(90 + level * 420, c.currentTime, 0.03);
  chargeOsc.gain.gain.setTargetAtTime(0.025 + level * 0.05, c.currentTime, 0.03);
}
