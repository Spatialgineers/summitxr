/*
 * DEPLOYMENT CONSTRAINT: all live voting state (rooms, votes, scores) lives in
 * this process's memory only. A restart loses it and a second instance splits
 * the audience into separate, inconsistent rooms. During the event the live
 * engine MUST run as a single instance (Cloud Run max-instances=1) with
 * session affinity enabled. See docs/DEPLOY.md.
 */
import { 
  EventSession, 
  Question, 
  UserProfile, 
  ReactionBurst 
} from '../../types/engine';
import { SAMPLE_QUESTIONS, INITIAL_TENANTS } from '../../lib/schemas';
import { DEFAULT_PRESET } from '../../lib/presets';

export interface RoomVoteRecord {
  optionId: string;
  optionCode: number;
  responseTimeMs: number;
  isCorrect: boolean;
  points: number;
}

export interface RoomState {
  tenantId: string;
  eventId: string;
  session: EventSession;
  questions: Question[];
  currentQuestionIndex: number;
  votes: Map<string, RoomVoteRecord>;
  users: Map<string, UserProfile>;
  timerInterval?: NodeJS.Timeout;
  recentReactions: ReactionBurst[];
  /** Pending throttled vote broadcast (see votingEngine). */
  voteBroadcastTimer?: NodeJS.Timeout;
}

export const DEFAULT_TENANT_ID = 'tenant_spatialgineers';
export const DEFAULT_EVENT_ID = 'event_live_main';
/** Hard cap on rooms so arbitrary tenantId/eventId values cannot exhaust memory. */
export const MAX_ROOMS = 20;
const ROOM_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;
const KNOWN_TENANT_IDS = new Set<string>([DEFAULT_TENANT_ID, ...INITIAL_TENANTS.map((t) => t.id)]);

const rooms = new Map<string, RoomState>();

export function getOrCreateRoom(
  tenantId: string = 'tenant_spatialgineers', 
  eventId: string = 'event_live_main'
): RoomState {
  const key = `${tenantId}:${eventId}`;
  if (!rooms.has(key)) {
    const defaultQuestions = JSON.parse(JSON.stringify(SAMPLE_QUESTIONS));
    rooms.set(key, {
      tenantId,
      eventId,
      session: {
        id: `sess_${Date.now()}`,
        tenantId,
        title: 'SGX Live Visualizer Stage',
        description: 'Interactive Choose Your Own Adventure Broadcast Engine',
        status: 'IDLE',
        activePresetId: DEFAULT_PRESET.id,
        timeRemaining: 0,
      },
      questions: defaultQuestions,
      currentQuestionIndex: 0,
      votes: new Map(),
      users: new Map(),
      recentReactions: [],
    });
  }
  return rooms.get(key)!;
}

export type RoomLookup =
  | { ok: true; room: RoomState }
  | { ok: false; status: 400 | 503; error: string };

/**
 * Validated room lookup for anything driven by client input. Ids must be
 * simple slugs; new rooms are only created while under MAX_ROOMS (known
 * tenants on the default event are always allowed).
 */
export function resolveRoom(tenantIdRaw: unknown, eventIdRaw: unknown): RoomLookup {
  const tenantId = tenantIdRaw === undefined || tenantIdRaw === null || tenantIdRaw === '' ? DEFAULT_TENANT_ID : tenantIdRaw;
  const eventId = eventIdRaw === undefined || eventIdRaw === null || eventIdRaw === '' ? DEFAULT_EVENT_ID : eventIdRaw;
  if (typeof tenantId !== 'string' || !ROOM_ID_RE.test(tenantId) || typeof eventId !== 'string' || !ROOM_ID_RE.test(eventId)) {
    return { ok: false, status: 400, error: 'INVALID_ROOM_ID' };
  }
  const key = `${tenantId}:${eventId}`;
  const existing = rooms.get(key);
  if (existing) return { ok: true, room: existing };
  const alwaysAllowed = KNOWN_TENANT_IDS.has(tenantId) && eventId === DEFAULT_EVENT_ID;
  if (!alwaysAllowed && rooms.size >= MAX_ROOMS) {
    return { ok: false, status: 503, error: 'ROOM_LIMIT_REACHED' };
  }
  return { ok: true, room: getOrCreateRoom(tenantId, eventId) };
}

export function getAllRooms(): Map<string, RoomState> {
  return rooms;
}

export function resetRoom(tenantId: string, eventId: string): RoomState {
  const key = `${tenantId}:${eventId}`;
  const existing = rooms.get(key);
  if (existing?.timerInterval) {
    clearInterval(existing.timerInterval);
  }
  if (existing?.voteBroadcastTimer) {
    clearTimeout(existing.voteBroadcastTimer);
  }
  rooms.delete(key);
  return getOrCreateRoom(tenantId, eventId);
}
