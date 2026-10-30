import { getIsAudioMuted } from '../../../lib/cyberAudioEngine';

/* Synth sound for the drone game: ring chimes that climb a pentatonic scale
   with the combo, hits, powers and a soft motor hum that follows the speed.
   One shared AudioContext, created on the first sound (a user gesture), and
   silent whenever the Summit-wide mute is on. */

export type DroneSfx = 'laser' | 'emp' | 'shield' | 'turbo' | 'hit' | 'gate' | 'route' | 'crate' | 'mine' | 'miss';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let hum: { osc: OscillatorNode; osc2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode } | null = null;
let noise: AudioBuffer | null = null;

function audio(): AudioContext | null {
  if (getIsAudioMuted()) return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, delay = 0) {
  const ac = audio();
  if (!ac || !master) return;
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

function burstNoise(dur: number, vol: number, freq: number) {
  const ac = audio();
  if (!ac || !master) return;
  if (!noise) {
    noise = ac.createBuffer(1, ac.sampleRate * 0.5, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const src = ac.createBufferSource();
  src.buffer = noise;
  const f = ac.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = ac.createGain();
  const now = ac.currentTime;
  g.gain.setValueAtTime(vol, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(now);
  src.stop(now + dur);
}

const SCALE = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

/** Bell chime: pitch climbs with the combo; a perfect pass adds a sparkle. */
export function playRingChime(combo: number, perfect: boolean) {
  try {
    const f = SCALE[Math.min(combo, SCALE.length - 1)];
    tone('sine', f, f, 0.55, 0.16);
    tone('triangle', f * 2.01, f * 2.01, 0.3, 0.05);
    if (perfect) tone('sine', f * 3, f * 3.02, 0.25, 0.05, 0.06);
  } catch {
    // Audio is optional.
  }
}

export function playDroneSfx(type: DroneSfx) {
  try {
    switch (type) {
      case 'laser': tone('square', 1320, 220, 0.12, 0.05); break;
      case 'emp': tone('triangle', 180, 40, 0.6, 0.25); burstNoise(0.5, 0.15, 900); break;
      case 'shield': tone('sine', 440, 880, 0.25, 0.14); break;
      case 'turbo': tone('sawtooth', 160, 640, 0.45, 0.07); burstNoise(0.4, 0.08, 2400); break;
      case 'hit': tone('sawtooth', 140, 45, 0.3, 0.2); burstNoise(0.25, 0.25, 1200); break;
      case 'mine': burstNoise(0.35, 0.22, 700); tone('square', 220, 60, 0.2, 0.08); break;
      case 'miss': tone('sine', 330, 247, 0.18, 0.06); break;
      case 'crate': [659.25, 987.77].forEach((f, i) => tone('triangle', f, f, 0.22, 0.12, i * 0.07)); break;
      case 'gate': tone('sawtooth', 200, 1200, 0.5, 0.1); break;
      case 'route':
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => tone('triangle', f, f, 0.28, 0.13, i * 0.08));
        break;
    }
  } catch {
    // Audio is optional.
  }
}

/** Motor hum: start on play, follow the speed, stop on pause/end. */
export function setDroneHum(on: boolean, speed01 = 0) {
  const ac = on ? audio() : ctx;
  if (!ac || !master) return;
  const now = ac.currentTime;
  if (on && !hum) {
    const osc = ac.createOscillator();
    const osc2 = ac.createOscillator();
    const filter = ac.createBiquadFilter();
    const gain = ac.createGain();
    osc.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc2.detune.value = 12;
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    gain.gain.value = 0.0001;
    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    osc2.start();
    hum = { osc, osc2, filter, gain };
  }
  if (!hum) return;
  if (on) {
    const f = 70 + speed01 * 70;
    hum.osc.frequency.setTargetAtTime(f, now, 0.1);
    hum.osc2.frequency.setTargetAtTime(f * 1.5, now, 0.1);
    hum.filter.frequency.setTargetAtTime(380 + speed01 * 600, now, 0.1);
    hum.gain.gain.setTargetAtTime(0.035, now, 0.15);
  } else {
    const h = hum;
    hum = null;
    h.gain.gain.setTargetAtTime(0.0001, now, 0.05);
    h.osc.stop(now + 0.3);
    h.osc2.stop(now + 0.3);
  }
}

export function closeDroneAudio() {
  hum = null;
  noise = null;
  ctx?.close().catch(() => {});
  ctx = null;
  master = null;
}
