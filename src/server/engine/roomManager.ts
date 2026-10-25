import { 
  EventSession, 
  Question, 
  UserProfile, 
  ReactionBurst 
} from '../../types/engine';
import { SAMPLE_QUESTIONS } from '../../lib/schemas';
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
}

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

export function getAllRooms(): Map<string, RoomState> {
  return rooms;
}

export function resetRoom(tenantId: string, eventId: string): RoomState {
  const key = `${tenantId}:${eventId}`;
  const existing = rooms.get(key);
  if (existing?.timerInterval) {
    clearInterval(existing.timerInterval);
  }
  rooms.delete(key);
  return getOrCreateRoom(tenantId, eventId);
}
