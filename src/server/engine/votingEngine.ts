import { Question, VoteSummary, WSMessage, UserProfile } from '../../types/engine';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { calculatePoints } from '../../lib/gamification';
import { RoomState } from './roomManager';
import { cleanAvatar, cleanNickname, LIMITS } from '../security/validation';

export type BroadcastFn = (tenantId: string, eventId: string, message: WSMessage) => void;

/** Live vote broadcasts are coalesced to at most one per room per interval. */
const VOTE_BROADCAST_INTERVAL_MS = 500;
/** Per-vote STATE_SYNC carries only the top of the leaderboard (full list on reveal / init). */
const LIVE_USERS_LIMIT = 50;

export type VoteResult =
  | { status: 'ACCEPTED'; calc: ReturnType<typeof calculatePoints>; user: UserProfile }
  | { status: 'DUPLICATE' | 'INVALID_OPTION' | 'NOT_ACTIVE' | 'STALE' };

export function computeVoteSummary(room: RoomState, question: Question | null | undefined): VoteSummary {
  const options = Array.isArray(question?.options) ? question!.options.filter((o) => o && typeof o.id === 'string') : [];
  const totalVotes = room.votes.size;
  const optionCounts: Record<string, number> = {};
  const optionPercentages: Record<string, number> = {};

  options.forEach((opt) => {
    optionCounts[opt.id] = 0;
    optionPercentages[opt.id] = 0;
  });

  room.votes.forEach((vote) => {
    if (optionCounts[vote.optionId] !== undefined) {
      optionCounts[vote.optionId]++;
    }
  });

  let highestCount = -1;
  let winningOptionId = options[0]?.id || '';
  let winningPresetId = options[0]?.presetId || DEFAULT_PRESET.id;

  options.forEach((opt) => {
    const count = optionCounts[opt.id] || 0;
    optionPercentages[opt.id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    if (count > highestCount) {
      highestCount = count;
      winningOptionId = opt.id;
      winningPresetId = opt.presetId || DEFAULT_PRESET.id;
    }
  });

  const correctOption = options.find((o) => o.isCorrect);

  return {
    questionId: question?.id || '',
    totalVotes,
    optionCounts,
    optionPercentages,
    winningOptionId,
    winningPresetId,
    correctOptionId: correctOption?.id,
  };
}

export function endVotingAndReveal(
  room: RoomState, 
  question: Question, 
  broadcast: BroadcastFn
) {
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = undefined;
  }
  cancelVoteBroadcast(room);

  // The director's console may send the close twice (socket + REST): reveal once.
  if (room.session.status === 'RESULT_REVEALED' && room.session.currentQuestionId === question.id) return;

  const summary = computeVoteSummary(room, question);
  room.session.status = 'RESULT_REVEALED';
  room.session.activePresetId = summary.winningPresetId;
  room.session.timeRemaining = 0;

  const winningPreset = VISUALIZER_PRESETS[summary.winningPresetId] || DEFAULT_PRESET;

  broadcast(room.tenantId, room.eventId, {
    type: 'VOTING_CLOSED',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      summary,
      winningPreset,
      winningPresetId: summary.winningPresetId,
      storyNarrative: question.storyPathOutcome?.narrative,
      // Leaderboard only: everyone's full history would grow with every poll.
      users: topUsers(room),
    },
  });

  broadcast(room.tenantId, room.eventId, {
    type: 'VISUALIZER_TRIGGER',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      presetId: summary.winningPresetId,
      source: 'WINNER_VOTE',
    },
  });

}

export function startQuestionVoting(
  room: RoomState, 
  questionIndex: number, 
  broadcast: BroadcastFn
): Question | null {
  if (questionIndex >= 0 && questionIndex < room.questions.length) {
    room.currentQuestionIndex = questionIndex;
  }

  const question = room.questions[room.currentQuestionIndex];
  if (!question) return null;

  // Starting the question that is already open is a no-op (the console sends
  // socket + REST); resetting would wipe the votes cast in between.
  if (room.session.status === 'VOTING_ACTIVE' && room.session.currentQuestionId === question.id) return question;

  // Reset votes for new round
  room.votes.clear();
  const duration = question.durationSeconds || 30;
  const endTime = Date.now() + duration * 1000;

  room.session.status = 'VOTING_ACTIVE';
  room.session.currentQuestionId = question.id;
  room.session.startedAt = Date.now();
  room.session.questionEndTime = endTime;
  room.session.timeRemaining = duration;

  if (room.timerInterval) {
    clearInterval(room.timerInterval);
  }
  cancelVoteBroadcast(room);

  const initialSummary = computeVoteSummary(room, question);

  broadcast(room.tenantId, room.eventId, {
    type: 'QUESTION_START',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      question,
      questionIndex: room.currentQuestionIndex,
      durationSeconds: duration,
      session: room.session,
      voteSummary: initialSummary,
      endTime,
    }
  });

  broadcast(room.tenantId, room.eventId, {
    type: 'STATE_SYNC',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      session: room.session,
      currentQuestion: question,
      currentQuestionIndex: room.currentQuestionIndex,
      voteSummary: initialSummary,
      totalVotes: 0,
    }
  });

  room.timerInterval = setInterval(() => {
   try {
    const now = Date.now();
    const remainingMs = Math.max(0, endTime - now);
    const remainingSec = Math.ceil(remainingMs / 1000);
    room.session.timeRemaining = remainingSec;

    broadcast(room.tenantId, room.eventId, {
      type: 'TIMER_TICK',
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: now,
      payload: {
        questionId: question.id,
        timeRemaining: remainingSec,
        totalDuration: duration,
      }
    });


    if (remainingSec <= 0) {
      endVotingAndReveal(room, question, broadcast);
    }
   } catch (err) {
    // Never let a timer tick take the process down.
    console.error('[Voting Engine] timer tick error:', err);
    if (room.timerInterval) clearInterval(room.timerInterval);
    room.timerInterval = undefined;
   }
  }, 1000);

  return question;
}

function cancelVoteBroadcast(room: RoomState) {
  if (room.voteBroadcastTimer) {
    clearTimeout(room.voteBroadcastTimer);
    room.voteBroadcastTimer = undefined;
  }
}

function topUsers(room: RoomState): UserProfile[] {
  return Array.from(room.users.values())
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0))
    .slice(0, LIVE_USERS_LIMIT)
    .map((u) => ({ ...u, choiceHistory: [] }));
}

/** Coalesces live vote updates: one VOTE_UPDATE + STATE_SYNC per room per interval. */
function scheduleVoteBroadcast(room: RoomState, broadcast: BroadcastFn) {
  if (room.voteBroadcastTimer) return;
  room.voteBroadcastTimer = setTimeout(() => {
    room.voteBroadcastTimer = undefined;
    try {
      const currentQ = room.questions[room.currentQuestionIndex];
      if (!currentQ) return;
      const liveSummary = computeVoteSummary(room, currentQ);
      broadcast(room.tenantId, room.eventId, {
        type: 'VOTE_UPDATE',
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: Date.now(),
        payload: liveSummary,
      });
      broadcast(room.tenantId, room.eventId, {
        type: 'STATE_SYNC',
        tenantId: room.tenantId,
        eventId: room.eventId,
        timestamp: Date.now(),
        payload: {
          voteSummary: liveSummary,
          totalVotes: room.votes.size,
          users: topUsers(room),
        }
      });
    } catch (err) {
      console.error('[Voting Engine] vote broadcast error:', err);
    }
  }, VOTE_BROADCAST_INTERVAL_MS);
}

/**
 * Records one vote. `voterId` must come from the server (socket binding or a
 * validated REST id), never from the vote payload. One vote per voter per
 * question; repeats are ignored. Response time is measured server-side.
 */
export function processVoteSubmission(
  room: RoomState,
  voterId: string,
  payload: {
    optionId?: unknown;
    optionCode?: unknown;
    /** The question the phone was looking at; a late vote for an older question is refused. */
    questionId?: unknown;
    nickname?: unknown;
    avatar?: unknown;
  },
  broadcast: BroadcastFn
): VoteResult {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ || room.session.status !== 'VOTING_ACTIVE' || !Array.isArray(currentQ.options)) {
    return { status: 'NOT_ACTIVE' };
  }
  if (typeof payload.questionId === 'string' && payload.questionId !== currentQ.id) return { status: 'STALE' };
  if (room.votes.has(voterId)) return { status: 'DUPLICATE' };

  const opt = (typeof payload.optionId === 'string' && currentQ.options.find(o => o.id === payload.optionId))
    || (typeof payload.optionCode === 'number' && currentQ.options.find(o => o.code === payload.optionCode))
    || null;
  if (!opt) return { status: 'INVALID_OPTION' };

  const durationMs = (currentQ.durationSeconds || 30) * 1000;
  const elapsed = room.session.startedAt ? Date.now() - room.session.startedAt : 2000;
  const responseTimeMs = Math.min(durationMs, Math.max(250, elapsed));

  let user = room.users.get(voterId);
  if (!user) {
    user = {
      id: voterId,
      nickname: cleanNickname(payload.nickname) || `User #${voterId.slice(-4)}`,
      avatar: cleanAvatar(payload.avatar) || '🚀',
      avatarSeed: voterId,
      tenantId: room.tenantId,
      eventId: room.eventId,
      score: 0,
      totalScore: 0,
      accuracyRate: 100,
      streak: 0,
      currentStreak: 0,
      highestStreak: 0,
      multiplier: 1.0,
      totalInteractions: 0,
      activeSeconds: 120,
      prizeTier: 'Bronze Contributor',
      unlockedPrizeIds: [],
      choiceHistory: [],
    };
    room.users.set(voterId, user);
  } else {
    const nick = cleanNickname(payload.nickname);
    if (nick) user.nickname = nick;
  }

  const calc = calculatePoints(
    currentQ.answerType,
    opt.isCorrect ?? false,
    responseTimeMs,
    durationMs,
    currentQ.basePoints,
    currentQ.maxSpeedBonus,
    currentQ.participationWeight,
    user.currentStreak
  );

  user.totalScore += calc.totalPointsEarned;
  user.score = user.totalScore;
  user.currentStreak = calc.newStreak;
  user.streak = user.currentStreak;
  user.highestStreak = Math.max(user.highestStreak, user.currentStreak);
  user.totalInteractions += 1;
  user.multiplier = 1.0 + Math.min(3.0, user.currentStreak * 0.25);
  user.choiceHistory.push({
    questionId: currentQ.id,
    selectedOptionId: opt.id,
    isCorrect: calc.isCorrect,
    pointsEarned: calc.totalPointsEarned,
    responseTimeMs,
    timestamp: Date.now(),
  });
  if (user.choiceHistory.length > LIMITS.MAX_QUESTIONS) user.choiceHistory.shift();

  room.votes.set(voterId, {
    optionId: opt.id,
    optionCode: opt.code || 1,
    responseTimeMs,
    isCorrect: calc.isCorrect,
    points: calc.totalPointsEarned,
  });

  scheduleVoteBroadcast(room, broadcast);

  return { status: 'ACCEPTED', calc, user };
}

