import type { SummitSession } from '../types/summit';
import { summitNow } from './summitDeadlines';

/* What is on air right now. Session times are Puerto Rico time (UTC-4, no
   daylight saving); day 1 is December 11, 2026. Tests move the clock with
   localStorage `sgx_now`, the same switch the deadlines use. */

const DAY_ONE_UTC = Date.UTC(2026, 11, 11, 4, 0); // Dec 11, 00:00 in Puerto Rico

function minutesOf(clock: string): number | null {
  const m = /^(\d{1,2}):(\d{2})\s*([AP]M)$/i.exec(clock.trim());
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === 'PM' ? 12 : 0);
  return h * 60 + Number(m[2]);
}

export function sessionWindow(s: SummitSession): { start: number; end: number } {
  const day = DAY_ONE_UTC + (s.day - 1) * 86400000;
  const startMin = s.startMinutes ?? minutesOf(s.startTime) ?? 0;
  const endMin = minutesOf(s.endTime) ?? startMin + 30;
  return { start: day + startMin * 60000, end: day + Math.max(endMin, startMin + 1) * 60000 };
}

export function liveSession(sessions: SummitSession[], now: number = summitNow()): SummitSession | null {
  return sessions.find((s) => { const w = sessionWindow(s); return now >= w.start && now < w.end; }) || null;
}
