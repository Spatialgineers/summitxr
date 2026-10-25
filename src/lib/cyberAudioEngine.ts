// Web Audio API Generative Ambient Soundscape & Cyber Sound FX

let audioCtx: AudioContext | null = null;
let ambientGain: GainNode | null = null;
let isAmbientPlaying = false;
let ambientOscillators: OscillatorNode[] = [];
let isAudioMuted: boolean = (() => {
  try {
    return localStorage.getItem('sgx_audio_muted') === 'true';
  } catch {
    return false;
  }
})();

export function getIsAudioMuted(): boolean {
  return isAudioMuted;
}

export function toggleAudioMute(): boolean {
  isAudioMuted = !isAudioMuted;
  try {
    localStorage.setItem('sgx_audio_muted', String(isAudioMuted));
  } catch {}
  if (isAudioMuted && isAmbientPlaying) {
    toggleCyberAmbiance();
  }
  window.dispatchEvent(new CustomEvent('sgx:audio_mute_changed', { detail: { muted: isAudioMuted } }));
  return isAudioMuted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Toggles an atmospheric ambient sci-fi synth drone (harmonically tuned to 432Hz & minor pentatonic).
 */
export function toggleCyberAmbiance(): boolean {
  try {
    const ctx = getAudioContext();

    if (isAmbientPlaying) {
      // Fade out
      if (ambientGain) {
        ambientGain.gain.setTargetAtTime(0.001, ctx.currentTime, 0.5);
        setTimeout(() => {
          ambientOscillators.forEach(osc => {
            try { osc.stop(); osc.disconnect(); } catch {}
          });
          ambientOscillators = [];
        }, 600);
      }
      isAmbientPlaying = false;
      return false;
    } else {
      if (isAudioMuted) {
        isAudioMuted = false;
        try { localStorage.setItem('sgx_audio_muted', 'false'); } catch {}
      }
      // Start atmospheric drone
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime);
      masterGain.gain.setTargetAtTime(0.08, ctx.currentTime, 1.2); // soft ambient volume
      masterGain.connect(ctx.destination);
      ambientGain = masterGain;

      // Minor pentatonic frequencies: C2 (65.41Hz), G2 (98Hz), Eb3 (155.56Hz), Bb3 (233.08Hz)
      const freqs = [65.41, 98.00, 155.56, 233.08];

      ambientOscillators = freqs.map((f, i) => {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;

        osc.type = i === 0 ? 'sine' : i === 1 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450 + (i * 120), ctx.currentTime);

        if (pan) {
          pan.pan.setValueAtTime((i % 2 === 0 ? -0.4 : 0.4), ctx.currentTime);
          osc.connect(filter);
          filter.connect(pan);
          pan.connect(masterGain);
        } else {
          osc.connect(filter);
          filter.connect(masterGain);
        }

        osc.start();
        return osc;
      });

      isAmbientPlaying = true;
      return true;
    }
  } catch (err) {
    console.warn('Audio ambiance not supported:', err);
    return false;
  }
}

export function getIsCyberAmbiancePlaying(): boolean {
  return isAmbientPlaying;
}

/**
 * Play a high-tech UI beep/click sound
 */
export function playUiChirp(freq = 880, type: OscillatorType = 'sine', duration = 0.08) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

/**
 * Play a crystalline 3D holographic focus/flip shimmer sound
 */
export function playHoloFocusSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [660, 990].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.035);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.25, now + i * 0.035 + 0.11);
      gain.gain.setValueAtTime(0.035, now + i * 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + i * 0.035 + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.035);
      osc.stop(now + i * 0.035 + 0.13);
    });
  } catch {}
}

/**
 * Play a futuristic particle / firework burst sound
 */
export function playCyberBurstSound(burstType: 'spark' | 'quantum' | 'flame' | 'kudos' = 'spark') {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const baseFreq = burstType === 'quantum' ? 440 : burstType === 'flame' ? 180 : burstType === 'kudos' ? 660 : 880;
    
    // Multi-frequency harmonic burst
    [baseFreq, baseFreq * 1.5, baseFreq * 2].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 2.2, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.04);
      osc.stop(ctx.currentTime + 0.4);
    });
  } catch {}
}

/**
 * Play a camera scan success chime (for QR badge reader)
 */
export function playScanSuccessSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      gain.gain.setValueAtTime(0.06, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.2);
    });
  } catch {}
}

/**
 * Play cyber dice randomize sound
 */
export function playDiceRollSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(300 + Math.random() * 600, now + i * 0.04);
      gain.gain.setValueAtTime(0.02, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + i * 0.04 + 0.05);
    }
  } catch {}
}

/**
 * Play celebratory match sound (sparkling arpeggiated chords for SGX.MATCH)
 */
export function playMatchBurstSound() {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    // Ascending harmonic minor 9th shimmer: C5 (523.25), E5 (659.25), G5 (783.99), B5 (987.77), D6 (1174.66)
    const chord = [523.25, 659.25, 783.99, 987.77, 1174.66];
    chord.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      
      gain.gain.setValueAtTime(0.001, now + idx * 0.07);
      gain.gain.linearRampToValueAtTime(0.08, now + idx * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.07 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.5);
    });
  } catch {}
}

// Harmonic frequency profiles for each of the 6 SGX Pillars
const PILLAR_CHORD_PROFILES: Record<string, { freqs: number[]; wave: OscillatorType; filterFreq: number }> = {
  STORY: {
    // Warm Golden 432Hz Lydian chord
    freqs: [108.0, 162.0, 216.0, 270.0, 324.0],
    wave: 'sine',
    filterFreq: 520,
  },
  STAGE: {
    // Live Concert Arena Harmonic Fifths
    freqs: [110.0, 164.81, 220.0, 329.63, 440.0],
    wave: 'triangle',
    filterFreq: 780,
  },
  SPARK: {
    // High-energy Kinetic Ignis Arpeggio
    freqs: [146.83, 220.0, 293.66, 369.99, 587.33],
    wave: 'sawtooth',
    filterFreq: 950,
  },
  SYSTEM: {
    // Precision Telemetry Crystalline Quartal
    freqs: [130.81, 196.0, 261.63, 392.0, 523.25],
    wave: 'sine',
    filterFreq: 640,
  },
  SHOWCASE: {
    // Holographic Gallery Shimmer Major 9th
    freqs: [123.47, 185.0, 246.94, 311.13, 493.88],
    wave: 'triangle',
    filterFreq: 860,
  },
  SYNTHESIZE: {
    // Master Unified Harmonic Convergence
    freqs: [108.0, 162.0, 216.0, 324.0, 432.0, 648.0],
    wave: 'sine',
    filterFreq: 720,
  },
};

/**
 * Plays a spatial docking resonance chord tailored to the selected SGX Pillar
 * and retunes the ambient drone if currently active.
 */
export function playPillarDockSound(pillarId: string) {
  if (isAudioMuted) return;
  try {
    const cleanKey = pillarId.replace('SGX.', '').toUpperCase();
    const profile = PILLAR_CHORD_PROFILES[cleanKey] || PILLAR_CHORD_PROFILES.SYNTHESIZE;
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    profile.freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = idx === 0 ? 'sine' : profile.wave;
      osc.frequency.setValueAtTime(freq * 0.5, now + idx * 0.045);
      osc.frequency.exponentialRampToValueAtTime(freq, now + idx * 0.045 + 0.14);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(profile.filterFreq, now);

      gain.gain.setValueAtTime(0.001, now + idx * 0.045);
      gain.gain.linearRampToValueAtTime(0.045, now + idx * 0.045 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.045 + 0.55);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.045);
      osc.stop(now + idx * 0.045 + 0.6);
    });

    // If background ambiance is playing, smoothly retune oscillators to the new pillar
    if (isAmbientPlaying && ambientOscillators.length > 0) {
      ambientOscillators.forEach((osc, i) => {
        const targetFreq = (profile.freqs[i % profile.freqs.length] || 108) * 0.5;
        try {
          osc.frequency.setTargetAtTime(targetFreq, now, 0.4);
        } catch {}
      });
    }
  } catch {}
}

