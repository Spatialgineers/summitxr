import React from 'react';
import type { PowerDef } from './droneConfig';

export interface PowerState {
  /** 0 = ready, 1 = just used. */
  cooldown: number;
  active: boolean;
}

interface Props {
  def: PowerDef;
  state: PowerState;
  es: boolean;
  onPress: () => void;
  /** Big square for the phone layout. */
  touch?: boolean;
}

/* One power: key cap, label and a recharge bar. Fires on pointerdown so a
   held thumb on the pad doesn't delay it. */
export const PowerButton: React.FC<Props> = ({ def, state, es, onPress, touch }) => {
  const cooling = state.cooldown > 0 && !state.active;
  const secs = Math.ceil((state.cooldown * def.cooldown) / 1000);
  const label = es ? def.label.es : def.label.en;
  const cls = ['sgx-drone__power', touch ? 'is-touch' : '', state.active ? 'is-active' : '', cooling ? 'is-cooling' : ''].join(' ');
  return (
    <button
      type="button"
      className={cls}
      aria-label={cooling && def.cooldown > 1000 ? `${label} (${secs} s)` : label}
      aria-disabled={cooling}
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      onKeyDown={(e) => { if (e.key === 'Enter') onPress(); }}
    >
      {!touch && <kbd>{es ? def.keyCap.es : def.keyCap.en}</kbd>}
      <span className="sgx-drone__power-label">{label}</span>
      {cooling && def.cooldown > 1000 && <span className="sgx-drone__power-secs">{secs}s</span>}
      <span className="sgx-drone__power-bar" style={{ transform: `scaleX(${1 - state.cooldown})` }} />
    </button>
  );
};
