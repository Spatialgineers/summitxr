import React, { useRef } from 'react';
import { POWERS, POWER_ORDER, type PowerKey } from './droneConfig';
import { PowerButton, type PowerState } from './PowerButton';

/* Phone layout: a floating stick (put a thumb anywhere on the left side and
   drag; the stick appears under it) and the four powers in a 2×2 grid on the
   right, within easy thumb reach. */

interface Props {
  es: boolean;
  stick: React.MutableRefObject<{ x: number; y: number }>;
  powers: Record<PowerKey, PowerState>;
  onPower: (key: PowerKey) => void;
}

const RADIUS = 52;

export const DroneTouchControls: React.FC<Props> = ({ es, stick, powers, onPower }) => {
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const baseRef = useRef<HTMLSpanElement | null>(null);
  const knobRef = useRef<HTMLSpanElement | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);

  const place = (x: number, y: number) => {
    const zone = zoneRef.current?.getBoundingClientRect();
    if (!zone || !baseRef.current) return;
    baseRef.current.style.left = `${x - zone.left}px`;
    baseRef.current.style.top = `${y - zone.top}px`;
    baseRef.current.classList.add('is-live');
  };

  const move = (e: React.PointerEvent) => {
    const o = origin.current;
    if (!o) return;
    let dx = e.clientX - o.x;
    let dy = e.clientY - o.y;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) { dx = (dx / len) * RADIUS; dy = (dy / len) * RADIUS; }
    // A small dead zone, then a gentle curve so small moves stay precise.
    const curve = (v: number) => Math.sign(v) * Math.pow(Math.max(0, Math.abs(v) - 0.06) / 0.94, 1.3);
    stick.current = { x: curve(dx / RADIUS), y: curve(-dy / RADIUS) };
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  const release = () => {
    origin.current = null;
    stick.current = { x: 0, y: 0 };
    if (knobRef.current) knobRef.current.style.transform = '';
    baseRef.current?.classList.remove('is-live');
  };

  return (
    <div className="sgx-drone__touch">
      <div
        ref={zoneRef}
        className="sgx-drone__pad"
        role="application"
        aria-label={es ? 'Zona de control: pon el pulgar y arrastra para mover el dron' : 'Steering zone: put your thumb down and drag to steer the drone'}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          origin.current = { x: e.clientX, y: e.clientY };
          place(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) move(e); }}
        onPointerUp={release}
        onPointerCancel={release}
      >
        <span ref={baseRef} className="sgx-drone__stick" aria-hidden>
          <span ref={knobRef} className="sgx-drone__knob" />
        </span>
        <span className="sgx-drone__pad-hint" aria-hidden>{es ? 'Arrastra aquí' : 'Drag here'}</span>
      </div>
      <div className="sgx-drone__actions">
        {POWER_ORDER.map((k) => <PowerButton key={k} def={POWERS[k]} state={powers[k]} es={es} onPress={() => onPower(k)} touch />)}
      </div>
    </div>
  );
};
