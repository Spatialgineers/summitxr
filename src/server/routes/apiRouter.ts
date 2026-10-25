import { Router } from 'express';
import { INITIAL_TENANTS } from '../../lib/schemas';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { VisualizerPresetId } from '../../types/engine';
import { getOrCreateRoom } from '../engine/roomManager';
import { 
  computeVoteSummary, 
  startQuestionVoting, 
  endVotingAndReveal, 
  processVoteSubmission, 
  simulateAudienceVotes,
  BroadcastFn 
} from '../engine/votingEngine';
import { triggerPresetOverride, processAudienceReaction } from '../engine/visualizerBridge';

export function createApiRouter(broadcastToRoom: BroadcastFn): Router {
  const router = Router();

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
    const tenantId = (req.query.tenantId as string) || 'tenant_spatialgineers';
    const eventId = (req.query.eventId as string) || 'event_live_main';
    const room = getOrCreateRoom(tenantId, eventId);
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
      users: Array.from(room.users.values()),
    });
  });

  // Questions
  router.get('/questions', (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'tenant_spatialgineers';
    const eventId = (req.query.eventId as string) || 'event_live_main';
    const room = getOrCreateRoom(tenantId, eventId);
    res.json({ questions: room.questions });
  });

  router.post('/questions', (req, res) => {
    const tenantId = req.body.tenantId || 'tenant_spatialgineers';
    const eventId = req.body.eventId || 'event_live_main';
    const room = getOrCreateRoom(tenantId, eventId);
    const newQ = {
      ...req.body,
      id: `q_${Date.now()}`,
      tenantId,
      eventId,
      order: room.questions.length + 1,
    };
    room.questions.push(newQ);
    res.json({ success: true, question: newQ });
  });

  // Director Action: Broadcast Question
  router.post('/action/broadcast-question', (req, res) => {
    const tenantId = req.body.tenantId || 'tenant_spatialgineers';
    const eventId = req.body.eventId || 'event_live_main';
    const questionIndex = req.body.questionIndex ?? req.body.index ?? 0;
    const room = getOrCreateRoom(tenantId, eventId);

    const question = startQuestionVoting(room, questionIndex, broadcastToRoom);
    if (!question) {
      return res.status(400).json({ error: 'Question not found' });
    }

    res.json({ success: true, session: room.session, question });
  });

  // Audience Vote Submission (REST Fallback)
  router.post('/vote', (req, res) => {
    const { tenantId = 'tenant_spatialgineers', eventId = 'event_live_main' } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);

    const result = processVoteSubmission(room, req.body, broadcastToRoom);
    if (!result) {
      return res.status(400).json({ error: 'Voting is not active' });
    }

    res.json({ success: true, calculation: result.calc, summary: result.summary, user: result.user });
  });

  // Audience Reaction (REST Fallback)
  router.post('/reaction', (req, res) => {
    const { tenantId = 'tenant_spatialgineers', eventId = 'event_live_main' } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const reaction = processAudienceReaction(room, req.body, broadcastToRoom);
    res.json({ success: true, reaction });
  });

  // Director Action: Force Close Voting
  router.post('/action/close-voting', (req, res) => {
    const tenantId = req.body.tenantId || 'tenant_spatialgineers';
    const eventId = req.body.eventId || 'event_live_main';
    const room = getOrCreateRoom(tenantId, eventId);
    const question = room.questions[room.currentQuestionIndex];
    if (question) {
      endVotingAndReveal(room, question, broadcastToRoom);
    }
    res.json({ success: true, session: room.session });
  });

  // Director Action: Trigger Visualizer Preset Override
  router.post('/action/trigger-preset', (req, res) => {
    const { tenantId = 'tenant_spatialgineers', eventId = 'event_live_main', presetId } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const success = triggerPresetOverride(room, presetId as VisualizerPresetId, 'MANUAL_DIRECTOR', broadcastToRoom);
    if (success) {
      res.json({ success: true, activePresetId: presetId });
    } else {
      res.status(400).json({ error: 'Invalid preset ID' });
    }
  });

  // Director Tool: Simulate Audience Crowd Votes
  router.post('/action/simulate-votes', (req, res) => {
    const { tenantId = 'tenant_spatialgineers', eventId = 'event_live_main', count = 100 } = req.body;
    const room = getOrCreateRoom(tenantId, eventId);
    const updatedSummary = simulateAudienceVotes(room, count, broadcastToRoom);
    if (!updatedSummary) {
      return res.status(400).json({ error: 'No active question' });
    }
    res.json({ success: true, simulatedCount: count, totalVotes: room.votes.size, summary: updatedSummary });
  });

  // Analytics
  router.get('/analytics', (req, res) => {
    const tenantId = (req.query.tenantId as string) || 'tenant_spatialgineers';
    const eventId = (req.query.eventId as string) || 'event_live_main';
    const room = getOrCreateRoom(tenantId, eventId);

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
