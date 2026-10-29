/* Small synth blips for the drone game. One shared AudioContext (browsers cap
   how many can be open), created on the first sound. */

export type DroneSfx = 'laser' | 'emp' | 'shield' | 'turbo' | 'ring' | 'hit' | 'gate' | 'roll' | 'route';

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function tone(type: OscillatorType, from: number, to: number, dur: number, vol: number, ramp: 'exp' | 'lin' = 'exp', delay = 0) {
  const ac = audio();
  if (!ac) return;
  if (ac.state === 'suspended') ac.resume().catch(() => {});
  const now = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, now);
  if (ramp === 'exp') osc.frequency.exponentialRampToValueAtTime(to, now + dur);
  else osc.frequency.linearRampToValueAtTime(to, now + dur);
  gain.gain.setValueAtTime(vol, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
  osc.connect(gain);
  gain.connect(ac.destination);
  osc.start(now);
  osc.stop(now + dur);
}

export function playDroneSfx(type: DroneSfx) {
  try {
    switch (type) {
      case 'laser': tone('sawtooth', 880, 110, 0.15, 0.16); break;
      case 'emp': tone('triangle', 150, 40, 0.6, 0.3); break;
      case 'shield': tone('sine', 440, 880, 0.25, 0.18); break;
      case 'turbo': tone('sine', 220, 660, 0.3, 0.2); break;
      case 'roll': tone('sine', 320, 740, 0.3, 0.2); break;
      case 'ring': tone('sine', 523.25, 783.99, 0.28, 0.18); break;
      case 'hit': tone('sawtooth', 150, 42, 0.28, 0.28, 'lin'); break;
      case 'gate': tone('sawtooth', 200, 1200, 0.5, 0.18); break;
      case 'route':
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone('triangle', f, f, 0.18, 0.16, 'exp', i * 0.09));
        break;
    }
  } catch {
    // Audio is optional.
  }
}

export function closeDroneAudio() {
  ctx?.close().catch(() => {});
  ctx = null;
}
