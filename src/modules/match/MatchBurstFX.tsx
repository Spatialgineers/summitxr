// SGX Entrepreneur Match - Confetti and Particle Burst Effect

import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { playMatchBurstSound } from '../../lib/cyberAudioEngine';

interface MatchBurstFXProps {
  primaryColor?: string;
  secondaryColor?: string;
  onComplete?: () => void;
}

export const triggerMatchConfetti = (primaryColor: string = '#00DDFF', secondaryColor: string = '#FDCC0D') => {
  // Fire sound
  playMatchBurstSound();

  // Fire multi-stage canvas confetti
  const count = 200;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
      colors: [primaryColor, secondaryColor, '#FFBB00', '#32527B', '#ffffff']
    });
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
  });
  fire(0.2, {
    spread: 60,
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    scalar: 1.2
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 45,
  });
};

export const MatchBurstFX: React.FC<MatchBurstFXProps> = ({
  primaryColor = '#00DDFF',
  secondaryColor = '#FDCC0D',
  onComplete
}) => {
  useEffect(() => {
    triggerMatchConfetti(primaryColor, secondaryColor);
    const timer = setTimeout(() => {
      onComplete?.();
    }, 2500);
    return () => clearTimeout(timer);
  }, [primaryColor, secondaryColor, onComplete]);

  return null;
};
