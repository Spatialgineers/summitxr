import { Question, VoteSummary, WSMessage, UserProfile } from '../../types/engine';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { calculatePoints } from '../../lib/gamification';
import { RoomState } from './roomManager';

export type BroadcastFn = (tenantId: string, eventId: string, message: WSMessage) => void;

export function computeVoteSummary(room: RoomState, question: Question): VoteSummary {
  const totalVotes = room.votes.size;
  const optionCounts: Record<string, number> = {};
  const optionPercentages: Record<string, number> = {};

  question.options.forEach((opt) => {
    optionCounts[opt.id] = 0;
    optionPercentages[opt.id] = 0;
  });

  room.votes.forEach((vote) => {
    if (optionCounts[vote.optionId] !== undefined) {
      optionCounts[vote.optionId]++;
    }
  });

  let highestCount = -1;
  let winningOptionId = question.options[0]?.id || '';
  let winningPresetId = question.options[0]?.presetId || DEFAULT_PRESET.id;

  question.options.forEach((opt) => {
    const count = optionCounts[opt.id] || 0;
    optionPercentages[opt.id] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    if (count > highestCount) {
      highestCount = count;
      winningOptionId = opt.id;
      winningPresetId = opt.presetId;
    }
  });

  const correctOption = question.options.find((o) => o.isCorrect);

  return {
    questionId: question.id,
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
      users: Array.from(room.users.values()),
    },
  });

  broadcast(room.tenantId, room.eventId, {
    type: 'VOTE_SUMMARY',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      summary,
      winningPreset,
      storyNarrative: question.storyPathOutcome?.narrative,
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

  broadcast(room.tenantId, room.eventId, {
    type: 'PRESET_TRIGGER',
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

    broadcast(room.tenantId, room.eventId, {
      type: 'COUNTDOWN_TICK',
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
  }, 1000);

  return question;
}

export function processVoteSubmission(
  room: RoomState,
  payload: {
    userId: string;
    optionId?: string;
    optionCode?: number;
    responseTimeMs?: number;
    nickname?: string;
    avatar?: string;
  },
  broadcast: BroadcastFn
) {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ || room.session.status !== 'VOTING_ACTIVE') return null;

  const voterId = payload.userId;
  const optionId = payload.optionId || (currentQ.options.find(o => o.code === payload.optionCode)?.id) || currentQ.options[0].id;
  const opt = currentQ.options.find(o => o.id === optionId) || currentQ.options[0];
  const isCorrect = currentQ.answerType === 'OPINION_CYOA' ? true : (opt?.isCorrect ?? false);
  const responseTimeMs = payload.responseTimeMs || 2000;

  let user = room.users.get(voterId);
  if (!user) {
    user = {
      id: voterId,
      nickname: payload.nickname || `User #${voterId.slice(-4)}`,
      avatar: payload.avatar || '🚀',
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
  }

  const calc = calculatePoints(
    currentQ.answerType,
    opt?.isCorrect ?? false,
    responseTimeMs,
    (currentQ.durationSeconds || 30) * 1000,
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

  room.votes.set(voterId, {
    optionId: opt.id,
    optionCode: opt.code || payload.optionCode || 1,
    responseTimeMs,
    isCorrect: calc.isCorrect,
    points: calc.totalPointsEarned,
  });

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
      users: Array.from(room.users.values()),
    }
  });

  return { calc, user, summary: liveSummary };
}

export function simulateAudienceVotes(
  room: RoomState,
  count: number,
  broadcast: BroadcastFn
) {
  const currentQ = room.questions[room.currentQuestionIndex];
  if (!currentQ) return null;

  const firstNames = ['Kai', 'Nova', 'Zephyr', 'Echo', 'Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Avery', 'Sam', 'Cameron', 'Dakota', 'Skylar', 'Quinn', 'Harper', 'Rowan'];

  for (let i = 0; i < count; i++) {
    const mockUserId = `sim_user_${Math.random().toString(36).substring(2, 9)}`;
    const randomOpt = currentQ.options[Math.floor(Math.random() * currentQ.options.length)];
    const responseTimeMs = Math.floor(Math.random() * ((currentQ.durationSeconds || 30) * 1000 * 0.75)) + 600;
    const nickname = `${firstNames[Math.floor(Math.random() * firstNames.length)]}_${Math.floor(Math.random() * 899 + 100)}`;

    const calc = calculatePoints(
      currentQ.answerType,
      randomOpt.isCorrect ?? false,
      responseTimeMs,
      (currentQ.durationSeconds || 30) * 1000,
      currentQ.basePoints,
      currentQ.maxSpeedBonus,
      currentQ.participationWeight,
      Math.floor(Math.random() * 3)
    );

    const userProfile: UserProfile = {
      id: mockUserId,
      nickname,
      avatar: ['🚀', '⚡', '🔥', '💎', '🎮', '🌟'][Math.floor(Math.random() * 6)],
      avatarSeed: mockUserId,
      tenantId: room.tenantId,
      eventId: room.eventId,
      score: calc.totalPointsEarned * Math.floor(Math.random() * 3 + 1),
      totalScore: calc.totalPointsEarned * Math.floor(Math.random() * 3 + 1),
      accuracyRate: Math.floor(Math.random() * 25 + 75),
      multiplier: 1.0 + Math.random() * 1.5,
      streak: calc.newStreak,
      currentStreak: calc.newStreak,
      highestStreak: Math.max(calc.newStreak, Math.floor(Math.random() * 4)),
      totalInteractions: Math.floor(Math.random() * 5 + 1),
      activeSeconds: Math.floor(Math.random() * 300 + 60),
      prizeTier: 'Silver Specialist',
      unlockedPrizeIds: [],
      choiceHistory: [{
        questionId: currentQ.id,
        selectedOptionId: randomOpt.id,
        isCorrect: calc.isCorrect,
        pointsEarned: calc.totalPointsEarned,
        responseTimeMs,
        timestamp: Date.now(),
      }]
    };

    room.users.set(mockUserId, userProfile);
    room.votes.set(mockUserId, {
      optionId: randomOpt.id,
      optionCode: randomOpt.code,
      responseTimeMs,
      isCorrect: calc.isCorrect,
      points: calc.totalPointsEarned,
    });
  }

  const updatedSummary = computeVoteSummary(room, currentQ);

  broadcast(room.tenantId, room.eventId, {
    type: 'VOTE_UPDATE',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: updatedSummary,
  });

  broadcast(room.tenantId, room.eventId, {
    type: 'STATE_SYNC',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: {
      voteSummary: updatedSummary,
      totalVotes: room.votes.size,
      connectedAudienceCount: room.users.size + 1,
      users: Array.from(room.users.values()),
    }
  });

  return updatedSummary;
}
