import { useEffect, useState } from 'react';
import { subscribeVisitRegions, subscribeVisitStats, VisitRegion, VisitStats } from '../../lib/visitTracker';

/*
 * One shared Firestore subscription per collection, however many counters are
 * on screen (header chip, HUD bar, radar page).
 */

type Listener<T> = (v: T) => void;

function sharedSubscription<T>(subscribe: (cb: (v: T) => void) => () => void) {
  let value: T | undefined;
  let unsub: (() => void) | null = null;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => value,
    add(l: Listener<T>) {
      listeners.add(l);
      if (!unsub) {
        unsub = subscribe((v) => {
          value = v;
          listeners.forEach((fn) => fn(v));
        });
      }
      return () => {
        listeners.delete(l);
        if (listeners.size === 0 && unsub) { unsub(); unsub = null; }
      };
    },
  };
}

const statsSub = sharedSubscription<VisitStats | null>(subscribeVisitStats);
const regionsSub = sharedSubscription<VisitRegion[] | null>(subscribeVisitRegions);

/** undefined = loading, null = radar unavailable (offline or rules not deployed). */
export function useVisitStats(): VisitStats | null | undefined {
  const [v, setV] = useState(statsSub.get());
  useEffect(() => statsSub.add(setV), []);
  return v;
}

export function useVisitRegions(): VisitRegion[] | null | undefined {
  const [v, setV] = useState(regionsSub.get());
  useEffect(() => regionsSub.add(setV), []);
  return v;
}

export function formatCount(n: number): string {
  if (n >= 100000) return `${Math.round(n / 1000)}K`;
  if (n >= 10000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('es-PR');
}
