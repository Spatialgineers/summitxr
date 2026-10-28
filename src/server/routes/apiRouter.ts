import { Router } from 'express';
import { INITIAL_TENANTS } from '../../lib/schemas';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { VisualizerPresetId } from '../../types/engine';
import { resolveRoom, RoomState } from '../engine/roomManager';
import { requireAdmin } from '../security/adminAuth';
import { ipRateLimit } from '../security/rateLimit';
import { isValidId, LIMITS, validateQuestionList } from '../security/validation';
import type { Request, Response } from 'express';
import { 
  computeVoteSummary, 
  startQuestionVoting, 
  endVotingAndReveal, 
  processVoteSubmission, 
  BroadcastFn 
} from '../engine/votingEngine';
import { triggerPresetOverride, processAudienceReaction } from '../engine/visualizerBridge';

export function createApiRouter(broadcastToRoom: BroadcastFn): Router {
  const router = Router();
  // Generous per-IP budget: a whole venue may share one Wi-Fi address.
  router.use(ipRateLimit({ capacity: 120, refillPerSec: 40 }));

  /** Validated room for client-supplied ids; replies 400/503 itself when invalid. */
  const roomFrom = (req: Request, res: Response): RoomState | null => {
    const src = req.method === 'GET' ? req.query : (req.body || {});
    const r = resolveRoom((src as any).tenantId, (src as any).eventId);
    if (r.ok === false) {
      const bad = r as { status: 400 | 503; error: string };
      res.status(bad.status).json({ error: bad.error });
      return null;
    }
    return r.room;
  };

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'ok', engine: 'SGX Live Engine', timestamp: Date.now() });
  });

  // Engine status
  router.get('/engine/status', (req, res) => {
    res.json({
      status: 'ONLINE',
      mode: 'INTERACTIVE_BROADCAST',
      version: '2026.12.0',
      activeFeatures: ['CYOA_VOTING', 'WEBGL_SHADERS', 'IMAGE_COMPRESSION_CLIENT', 'MULTI_SPEAKER_CMS', 'FIRESTORE_SYNC'],
    });
  });

  // Tenants
  router.get('/tenants', (req, res) => {
    res.json({ tenants: INITIAL_TENANTS });
  });

  // State snapshot
  router.get('/state', (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const currentQ = room.questions[room.currentQuestionIndex];
    const summary = currentQ ? computeVoteSummary(room, currentQ) : null;

    res.json({
      session: room.session,
      currentQuestion: currentQ,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.questions.length,
      voteSummary: summary,
      connectedAudienceCount: room.users.size + 1,
      activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
      users: Array.from(room.users.values()).slice(0, 200),
    });
  });

  // Questions
  router.get('/questions', (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    res.json({ questions: room.questions });
  });

  router.post('/questions', requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const v = validateQuestionList([req.body], Math.max(0, LIMITS.MAX_QUESTIONS - room.questions.length), `q_${Date.now()}`);
    if (v.ok === false) return res.status(400).json({ error: (v as any).error });
    const newQ = { ...v.value[0], tenantId: room.tenantId, eventId: room.eventId, order: room.questions.length + 1 };
    room.questions.push(newQ);
    res.json({ success: true, question: newQ });
  });

  // Director Action: Broadcast Question
  router.post('/action/broadcast-question', requireAdmin, (req, res) => {
    const questionIndex = req.body.questionIndex ?? req.body.index ?? 0;
    const room = roomFrom(req, res);
    if (!room) return;

    const question = Number.isInteger(Number(questionIndex)) ? startQuestionVoting(room, Number(questionIndex), broadcastToRoom) : null;
    if (!question) {
      return res.status(400).json({ error: 'Question not found' });
    }

    res.json({ success: true, session: room.session, question });
  });

  // Audience Vote Submission (REST Fallback)
  router.post('/vote', (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const voterId = req.body?.userId;
    if (!isValidId(voterId)) return res.status(400).json({ error: 'INVALID_USER_ID' });

    const result = processVoteSubmission(room, voterId, req.body || {}, broadcastToRoom);
    if (result.status !== 'ACCEPTED') {
      return res.status(result.status === 'DUPLICATE' ? 409 : 400).json({ error: result.status });
    }
    const ok = result as Extract<typeof result, { status: 'ACCEPTED' }>;
    res.json({ success: true, calculation: ok.calc, summary: ok.summary, user: ok.user });
  });

  // Audience Reaction (REST Fallback)
  router.post('/reaction', (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const reaction = processAudienceReaction(room, { emoji: req.body?.emoji, color: req.body?.color, userId: isValidId(req.body?.userId) ? req.body.userId : 'anon' }, broadcastToRoom);
    res.json({ success: true, reaction });
  });

  // Director Action: Force Close Voting
  router.post('/action/close-voting', requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;
    const question = room.questions[room.currentQuestionIndex];
    if (question) {
      endVotingAndReveal(room, question, broadcastToRoom);
    }
    res.json({ success: true, session: room.session });
  });

  // Director Action: Trigger Visualizer Preset Override
  router.post('/action/trigger-preset', requireAdmin, (req, res) => {
    const { presetId } = req.body || {};
    const room = roomFrom(req, res);
    if (!room) return;
    const success = typeof presetId === 'string' && !!VISUALIZER_PRESETS[presetId as VisualizerPresetId] && triggerPresetOverride(room, presetId as VisualizerPresetId, 'MANUAL_DIRECTOR', broadcastToRoom);
    if (success) {
      res.json({ success: true, activePresetId: presetId });
    } else {
      res.status(400).json({ error: 'Invalid preset ID' });
    }
  });

  // Analytics
  router.get('/analytics', requireAdmin, (req, res) => {
    const room = roomFrom(req, res);
    if (!room) return;

    const userList = Array.from(room.users.values()).sort((a, b) => b.totalScore - a.totalScore);
    const topLeaderboard = userList.slice(0, 20);
    const totalInteractions = userList.reduce((acc, u) => acc + u.totalInteractions, 0);
    const avgScore = userList.length > 0 ? Math.round(userList.reduce((acc, u) => acc + u.totalScore, 0) / userList.length) : 0;

    res.json({
      totalUsers: userList.length,
      totalInteractions,
      avgScore,
      leaderboard: topLeaderboard,
      questions: room.questions.map(q => ({
        id: q.id,
        prompt: q.prompt,
        category: q.category,
        answerType: q.answerType,
        options: q.options.map(o => ({
          id: o.id,
          label: o.label,
          presetId: o.presetId,
        }))
      }))
    });
  });

  return router;
}
