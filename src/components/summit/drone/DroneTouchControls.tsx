import React, { useRef } from 'react';
import { POWERS, type PowerKey } from './droneConfig';
import { PowerButton, type PowerState } from './PowerButton';

/* Phone layout: a drag pad on the left (analog up/down/left/right) and the
   powers on the right, four big ones and two small ones in a single row. */

interface Props {
  es: boolean;
  stick: React.MutableRefObject<{ x: number; y: number }>;
  powers: Record<PowerKey, PowerState>;
  onPower: (key: PowerKey) => void;
}

const MAIN: PowerKey[] = ['turbo', 'laser', 'roll', 'shield'];
const EXTRA: PowerKey[] = ['emp', 'slowmo'];

export const DroneTouchControls: React.FC<Props> = ({ es, stick, powers, onPower }) => {
  const padRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLSpanElement | null>(null);

  const move = (e: React.PointerEvent) => {
    const pad = padRef.current;
    if (!pad) return;
    const r = pad.getBoundingClientRect();
    const max = r.width / 2;
    let dx = e.clientX - (r.left + max);
    let dy = e.clientY - (r.top + max);
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    stick.current = { x: dx / max, y: -dy / max };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };
  const release = () => {
    stick.current = { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = '';
  };

  return (
    <div className="sgx-drone__touch">
      <div
        ref={padRef}
        className="sgx-drone__pad"
        role="application"
        aria-label={es ? 'Control de movimiento: arrastra para mover el dron' : 'Movement pad: drag to steer the drone'}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span ref={knobRef} className="sgx-drone__knob" />
      </div>
      <div className="sgx-drone__actions">
        <div className="sgx-drone__actions-row">
          {EXTRA.map((k) => <PowerButton key={k} def={POWERS[k]} state={powers[k]} es={es} onPress={() => onPower(k)} compact />)}
        </div>
        <div className="sgx-drone__actions-grid">
          {MAIN.map((k) => <PowerButton key={k} def={POWERS[k]} state={powers[k]} es={es} onPress={() => onPower(k)} touch />)}
        </div>
      </div>
    </div>
  );
};
