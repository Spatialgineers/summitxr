import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import { WSMessage, VisualizerPresetId } from '../../types/engine';
import { VISUALIZER_PRESETS, DEFAULT_PRESET } from '../../lib/presets';
import { resolveRoom, RoomState } from './roomManager';
import {
  computeVoteSummary,
  startQuestionVoting,
  endVotingAndReveal,
  processVoteSubmission,
  simulateAudienceVotes
} from './votingEngine';
import { triggerPresetOverride, processAudienceReaction } from './visualizerBridge';
import { verifyAdminToken } from '../security/adminAuth';
import { TokenBucket } from '../security/rateLimit';
import { cleanNickname, isValidId, LIMITS, validateQuestionList } from '../security/validation';

export interface ClientMeta {
  tenantId: string;
  eventId: string;
  userId?: string;
  role: 'admin' | 'audience' | 'stage';
  /** Set only after the socket presented a verified admin Firebase ID token. */
  isAdmin: boolean;
}

/** Messages only a verified director may send. Everything else is audience. */
const DIRECTOR_MESSAGES = new Set([
  'BROADCAST_QUESTION', 'START_VOTING', 'CLOSE_VOTING', 'END_VOTING',
  'TRIGGER_PRESET', 'STAGE_OVERRIDE', 'SIMULATE_VOTES', 'CREATE_QUESTION', 'UPDATE_QUESTIONS',
]);

// A whole venue can share one Wi-Fi address (Day 3 at Chroma), so the per-IP cap is generous.
const MAX_SOCKETS_PER_IP = 600;
// Directors upload custom visuals over the socket; keep room for them.
const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;

export function setupWebSocketEngine(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_PAYLOAD_BYTES });
  const clientMap = new Map<WebSocket, ClientMeta>();
  const socketsPerIp = new Map<string, number>();

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

  const roomCount = (tenantId: string, eventId: string) =>
    Array.from(clientMap.values()).filter(c => c.tenantId === tenantId && c.eventId === eventId).length;

  function syncRoom(room: RoomState) {
    const currentQ = room.questions[room.currentQuestionIndex];
    broadcastToRoom(room.tenantId, room.eventId, {
      type: 'ROOM_STATE_SYNC',
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: Date.now(),
      payload: {
        session: room.session,
        currentQuestionIndex: room.currentQuestionIndex,
        currentQuestion: currentQ,
        questions: room.questions,
        voteSummary: computeVoteSummary(room, currentQ),
        connectedAudienceCount: roomCount(room.tenantId, room.eventId),
        users: Array.from(room.users.values()).slice(0, 200),
      }
    });
  }

  wss.on('connection', (ws, req) => {
    try {
      // Cloud Run appends the real client IP as the LAST X-Forwarded-For entry; earlier ones are client-supplied.
      const xff = (req.headers['x-forwarded-for'] as string | undefined)?.split(',').map((s) => s.trim()).filter(Boolean) || [];
      const ip = xff[xff.length - 1] || req.socket.remoteAddress || 'unknown';
      const open = socketsPerIp.get(ip) || 0;
      if (open >= MAX_SOCKETS_PER_IP) {
        ws.close(1013, 'TOO_MANY_CONNECTIONS');
        return;
      }
      socketsPerIp.set(ip, open + 1);

      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const lookup = resolveRoom(url.searchParams.get('tenantId'), url.searchParams.get('eventId'));
      if (lookup.ok === false) {
        ws.close(1008, (lookup as any).error);
        socketsPerIp.set(ip, Math.max(0, (socketsPerIp.get(ip) || 1) - 1));
        return;
      }
      const room = lookup.room;
      const { tenantId, eventId } = room;
      const requestedRole = url.searchParams.get('role');
      const role: ClientMeta['role'] = requestedRole === 'admin' || requestedRole === 'stage' ? requestedRole : 'audience';
      // The voter id is fixed for the life of the socket; vote payloads cannot change it.
      const rawUserId = url.searchParams.get('userId');
      const userId = isValidId(rawUserId) ? rawUserId : `user_${Math.random().toString(36).substring(2, 11)}`;
      const nickname = cleanNickname(url.searchParams.get('nickname'));

      const meta: ClientMeta = { tenantId, eventId, userId, role, isAdmin: false };
      clientMap.set(ws, meta);
      const limiter = new TokenBucket(30, 10);

      const authenticate = async (token: unknown) => {
        const identity = await verifyAdminToken(token);
        meta.isAdmin = !!identity;
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'AUTH_RESULT', tenantId, eventId, timestamp: Date.now(), payload: { isAdmin: meta.isAdmin } }));
        }
      };
      const urlToken = url.searchParams.get('token');
      if (urlToken) authenticate(urlToken).catch(() => {});

      const currentQ = room.questions[room.currentQuestionIndex];
      const initStatePayload = {
        session: room.session,
        currentQuestion: currentQ,
        currentQuestionIndex: room.currentQuestionIndex,
        questions: room.questions,
        voteSummary: currentQ ? computeVoteSummary(room, currentQ) : undefined,
        activePreset: VISUALIZER_PRESETS[room.session.activePresetId] || DEFAULT_PRESET,
        connectedAudienceCount: roomCount(tenantId, eventId),
        users: Array.from(room.users.values()).slice(0, 200),
      };

      ws.send(JSON.stringify({ type: 'INIT_STATE', tenantId, eventId, timestamp: Date.now(), payload: initStatePayload }));
      ws.send(JSON.stringify({ type: 'ROOM_STATE_SYNC', tenantId, eventId, timestamp: Date.now(), payload: initStatePayload }));
      broadcastToRoom(tenantId, eventId, {
        type: 'STATE_SYNC', tenantId, eventId, timestamp: Date.now(),
        payload: { connectedAudienceCount: roomCount(tenantId, eventId) },
      });

      ws.on('message', (data, isBinary) => {
        try {
          if (!limiter.take()) return;
          let messageType = '';
          let payload: any = {};

          if (isBinary) {
            const buffer = Buffer.from(data as Buffer);
            const optionCode = buffer[0];
            const curQ = room.questions[room.currentQuestionIndex];
            if (curQ && Array.isArray(curQ.options)) {
              const matchedOpt = curQ.options.find(o => o.code === optionCode) || curQ.options[optionCode - 1];
              if (matchedOpt) {
                messageType = 'SUBMIT_VOTE';
                payload = { optionId: matchedOpt.id, nickname };
              }
            }
          } else {
            const parsed = JSON.parse(data.toString());
            if (!parsed || typeof parsed !== 'object') return;
            messageType = typeof parsed.type === 'string' ? parsed.type : '';
            payload = parsed.payload ?? {};
          }

          if (messageType === 'AUTH') {
            authenticate(payload?.token).catch(() => {});
            return;
          }

          if (DIRECTOR_MESSAGES.has(messageType) && !meta.isAdmin) {
            ws.send(JSON.stringify({ type: 'ERROR', tenantId, eventId, timestamp: Date.now(), payload: { error: 'NOT_AUTHORIZED', for: messageType } }));
            return;
          }

          switch (messageType) {
            case 'BROADCAST_QUESTION':
            case 'START_VOTING': {
              const index = Number(payload?.index ?? payload?.questionIndex ?? 0);
              if (Number.isInteger(index) && index >= 0 && index < room.questions.length) {
                startQuestionVoting(room, index, broadcastToRoom);
              }
              break;
            }

            case 'CLOSE_VOTING':
            case 'END_VOTING': {
              const curQ = room.questions[room.currentQuestionIndex];
              if (curQ) endVotingAndReveal(room, curQ, broadcastToRoom);
              break;
            }

            case 'TRIGGER_PRESET':
            case 'STAGE_OVERRIDE': {
              const presetId = payload?.presetId as VisualizerPresetId;
              if (typeof presetId === 'string' && VISUALIZER_PRESETS[presetId]) {
                triggerPresetOverride(room, presetId, 'MANUAL_DIRECTOR', broadcastToRoom);
              }
              break;
            }

            case 'SUBMIT_VOTE':
            case 'VOTE_SUBMIT': {
              const result = processVoteSubmission(room, userId, { ...(payload || {}), nickname: payload?.nickname || nickname }, broadcastToRoom);
              if (result.status === 'ACCEPTED') {
                const ok = result as Extract<typeof result, { status: 'ACCEPTED' }>;
                ws.send(JSON.stringify({
                  type: 'SCORE_UPDATE', tenantId, eventId, timestamp: Date.now(),
                  payload: { calculation: ok.calc, user: ok.user },
                }));
              }
              break;
            }

            case 'SIMULATE_VOTES': {
              simulateAudienceVotes(room, Number(payload?.count) || 25, broadcastToRoom);
              break;
            }

            case 'CREATE_QUESTION': {
              const list = Array.isArray(payload) ? payload : [payload];
              const room_left = LIMITS.MAX_QUESTIONS - room.questions.length;
              const v = validateQuestionList(list, Math.max(0, room_left), `q_${Date.now()}`);
              if (v.ok === false) {
                ws.send(JSON.stringify({ type: 'ERROR', tenantId, eventId, timestamp: Date.now(), payload: { error: (v as any).error } }));
                break;
              }
              const base = room.questions.length;
              room.questions.push(...v.value.map((q, idx) => ({ ...q, tenantId, eventId, order: base + idx + 1 })));
              syncRoom(room);
              break;
            }

            case 'UPDATE_QUESTIONS': {
              const v = validateQuestionList(payload, LIMITS.MAX_QUESTIONS, `q_${Date.now()}`);
              if (v.ok === false) {
                ws.send(JSON.stringify({ type: 'ERROR', tenantId, eventId, timestamp: Date.now(), payload: { error: (v as any).error } }));
                break;
              }
              room.questions = v.value.map((q, idx) => ({ ...q, tenantId, eventId, order: idx + 1 }));
              if (room.currentQuestionIndex >= room.questions.length) room.currentQuestionIndex = 0;
              syncRoom(room);
              break;
            }

            case 'SEND_REACTION':
            case 'REACTION_BURST': {
              processAudienceReaction(room, { emoji: payload?.emoji, color: payload?.color, userId }, broadcastToRoom);
              break;
            }
          }
        } catch (err) {
          console.error('[WebSocket Engine Error]:', err);
        }
      });

      ws.on('close', () => {
        clientMap.delete(ws);
        socketsPerIp.set(ip, Math.max(0, (socketsPerIp.get(ip) || 1) - 1));
        if ((socketsPerIp.get(ip) || 0) === 0) socketsPerIp.delete(ip);
        try {
          broadcastToRoom(tenantId, eventId, {
            type: 'STATE_SYNC', tenantId, eventId, timestamp: Date.now(),
            payload: { connectedAudienceCount: roomCount(tenantId, eventId) },
          });
        } catch (err) {
          console.error('[WebSocket Engine Error]:', err);
        }
      });

      ws.on('error', (err) => console.warn('[WebSocket Engine] socket error:', err?.message || err));
    } catch (err) {
      console.error('[WebSocket Engine] connection error:', err);
      try { ws.close(1011, 'SERVER_ERROR'); } catch {}
    }
  });

  return { wss, clientMap, broadcastToRoom };
}
