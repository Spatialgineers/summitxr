import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { WSMessage, VisualizerPresetId } from '../../types/engine';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { getOrCreateRoom } from './roomManager';
import { 
  computeVoteSummary, 
  startQuestionVoting, 
  endVotingAndReveal, 
  processVoteSubmission, 
  simulateAudienceVotes 
} from './votingEngine';
import { triggerPresetOverride, processAudienceReaction } from './visualizerBridge';

export interface ClientMeta {
  tenantId: string;
  eventId: string;
  userId?: string;
  role: 'admin' | 'audience' | 'stage';
}

export function setupWebSocketEngine(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });
  const clientMap = new Map<WebSocket, ClientMeta>();

  function broadcastToRoom(tenantId: string, eventId: string, message: WSMessage) {
    const payloadStr = JSON.stringify(message);
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        const meta = clientMap.get(client);
        if (meta && meta.tenantId === tenantId && meta.eventId === eventId) {
          client.send(payloadStr);
        }
      }
    });
  }

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
    const tenantId = url.searchParams.get('tenantId') || 'tenant_spatialgineers';
    const eventId = url.searchParams.get('eventId') || 'event_live_main';
    const role = (url.searchParams.get('role') || 'audience') as 'admin' | 'audience' | 'stage';
    const userId = url.searchParams.get('userId') || `user_${Math.random().toString(36).substring(2, 9)}`;

    const room = getOrCreateRoom(tenantId, eventId);
    clientMap.set(ws, { tenantId, eventId, userId, role });

    const currentQ = room.questions[room.currentQuestionIndex];
    const initialSummary = currentQ ? computeVoteSummary(room, currentQ) : undefined;
    const count = Array.from(clientMap.values()).filter(c => c.tenantId === tenantId && c.eventId === eventId).length;

    const initStatePayload = {
      session: room.session,
      currentQuestion: currentQ,
      currentQuestionIndex: room.currentQuestionIndex,
      questions: room.questions,
      voteSummary: initialSummary,
      activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
      connectedAudienceCount: count,
      users: Array.from(room.users.values()),
    };

    ws.send(JSON.stringify({
      type: 'INIT_STATE',
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: initStatePayload,
    }));

    ws.send(JSON.stringify({
      type: 'ROOM_STATE_SYNC',
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: initStatePayload,
    }));

    broadcastToRoom(tenantId, eventId, {
      type: 'STATE_SYNC',
      tenantId,
      eventId,
      timestamp: Date.now(),
      payload: {
        connectedAudienceCount: count,
      }
    });

    ws.on('message', (data, isBinary) => {
      try {
        const currentRoom = getOrCreateRoom(tenantId, eventId);
        let messageType = '';
        let payload: any = {};

        if (isBinary) {
          const buffer = Buffer.from(data as Buffer);
          const optionCode = buffer[0];
          const curQ = currentRoom.questions[currentRoom.currentQuestionIndex];
          if (curQ) {
            const matchedOpt = curQ.options.find(o => o.code === optionCode) || curQ.options[optionCode - 1];
            if (matchedOpt) {
              messageType = 'SUBMIT_VOTE';
              payload = {
                userId,
                nickname: 'Mobile Attendee',
                questionId: curQ.id,
                optionId: matchedOpt.id,
                optionCode: matchedOpt.code,
                responseTimeMs: 1800,
              };
            }
          }
        } else {
          const parsed = JSON.parse(data.toString());
          messageType = parsed.type;
          payload = parsed.payload || {};
        }

        switch (messageType) {
          case 'BROADCAST_QUESTION':
          case 'START_VOTING': {
            const index = payload.index ?? payload.questionIndex ?? 0;
            startQuestionVoting(currentRoom, index, broadcastToRoom);
            break;
          }

          case 'CLOSE_VOTING':
          case 'END_VOTING': {
            const curQ = currentRoom.questions[currentRoom.currentQuestionIndex];
            if (curQ) {
              endVotingAndReveal(currentRoom, curQ, broadcastToRoom);
            }
            break;
          }

          case 'TRIGGER_PRESET':
          case 'STAGE_OVERRIDE': {
            const presetId = payload.presetId as VisualizerPresetId;
            if (presetId) {
              triggerPresetOverride(currentRoom, presetId, 'MANUAL_DIRECTOR', broadcastToRoom);
            }
            break;
          }

          case 'SUBMIT_VOTE':
          case 'VOTE_SUBMIT': {
            const result = processVoteSubmission(
              currentRoom, 
              { ...payload, userId: payload.userId || userId }, 
              broadcastToRoom
            );
            if (result) {
              ws.send(JSON.stringify({
                type: 'SCORE_UPDATE',
                tenantId,
                eventId,
                timestamp: Date.now(),
                payload: {
                  calculation: result.calc,
                  user: result.user,
                }
              }));
            }
            break;
          }

          case 'SIMULATE_VOTES': {
            const simCount = payload.count || 25;
            simulateAudienceVotes(currentRoom, simCount, broadcastToRoom);
            break;
          }

          case 'CREATE_QUESTION': {
            if (Array.isArray(payload)) {
              const newQuestions = payload.map((q: any, idx: number) => ({
                ...q,
                id: q.id || `q_${Date.now()}_${idx}`,
                tenantId,
                eventId,
                order: currentRoom.questions.length + idx + 1,
              }));
              currentRoom.questions.push(...newQuestions);
            } else {
              const newQ = {
                ...payload,
                id: payload.id || `q_${Date.now()}`,
                tenantId,
                eventId,
                order: currentRoom.questions.length + 1,
              };
              currentRoom.questions.push(newQ);
            }
            broadcastToRoom(tenantId, eventId, {
              type: 'ROOM_STATE_SYNC',
              tenantId,
              eventId,
              timestamp: Date.now(),
              payload: {
                session: currentRoom.session,
                currentQuestionIndex: currentRoom.currentQuestionIndex,
                currentQuestion: currentRoom.questions[currentRoom.currentQuestionIndex],
                questions: currentRoom.questions,
                voteSummary: computeVoteSummary(currentRoom, currentRoom.questions[currentRoom.currentQuestionIndex]),
                connectedAudienceCount: Array.from(clientMap.values()).filter(c => c.tenantId === tenantId && c.eventId === eventId).length,
                users: Array.from(currentRoom.users.values()),
              }
            });
            break;
          }

          case 'UPDATE_QUESTIONS': {
            if (Array.isArray(payload)) {
              currentRoom.questions = payload.map((q: any, idx: number) => ({
                ...q,
                id: q.id || `q_${Date.now()}_${idx}`,
                tenantId,
                eventId,
                order: idx + 1,
              }));
            }
            broadcastToRoom(tenantId, eventId, {
              type: 'ROOM_STATE_SYNC',
              tenantId,
              eventId,
              timestamp: Date.now(),
              payload: {
                session: currentRoom.session,
                currentQuestionIndex: currentRoom.currentQuestionIndex,
                currentQuestion: currentRoom.questions[currentRoom.currentQuestionIndex],
                questions: currentRoom.questions,
                voteSummary: computeVoteSummary(currentRoom, currentRoom.questions[currentRoom.currentQuestionIndex]),
                connectedAudienceCount: Array.from(clientMap.values()).filter(c => c.tenantId === tenantId && c.eventId === eventId).length,
                users: Array.from(currentRoom.users.values()),
              }
            });
            break;
          }

          case 'SEND_REACTION':
          case 'REACTION_BURST': {
            processAudienceReaction(currentRoom, { ...payload, userId }, broadcastToRoom);
            break;
          }
        }
      } catch (err) {
        console.error('[WebSocket Engine Error]:', err);
      }
    });

    ws.on('close', () => {
      clientMap.delete(ws);
      broadcastToRoom(tenantId, eventId, {
        type: 'STATE_SYNC',
        tenantId,
        eventId,
        timestamp: Date.now(),
        payload: {
          connectedAudienceCount: Array.from(clientMap.values()).filter(c => c.tenantId === tenantId && c.eventId === eventId).length,
        }
      });
    });
  });

  return { wss, clientMap, broadcastToRoom };
}
