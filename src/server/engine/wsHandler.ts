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
} from './votingEngine';
import { triggerPresetOverride, processAudienceReaction } from './visualizerBridge';
import { verifyAdminToken } from '../security/adminAuth';
import { appCheckMode, noteMissingAppCheck, verifyAppCheckToken } from '../security/appCheck';
import { TokenBucket } from '../security/rateLimit';
import { cleanNickname, isValidId, LIMITS, validateQuestionList } from '../security/validation';

export interface ClientMeta {
  tenantId: string;
  eventId: string;
  userId?: string;
  role: 'admin' | 'audience' | 'stage';
  /** Set only after the socket presented a verified admin Firebase ID token. */
  isAdmin: boolean;
  /** Set once the socket presented a valid Firebase App Check token. */
  appCheck: boolean;
}

/** Audience actions that App Check guards (in enforce mode). */
const APP_CHECKED_MESSAGES = new Set(['SUBMIT_VOTE', 'VOTE_SUBMIT', 'SEND_REACTION', 'REACTION_BURST']);

/** Messages only a verified director may send. Everything else is audience. */
const DIRECTOR_MESSAGES = new Set([
  'BROADCAST_QUESTION', 'START_VOTING', 'CLOSE_VOTING', 'END_VOTING',
  'TRIGGER_PRESET', 'STAGE_OVERRIDE', 'SIMULATE_VOTES', 'CREATE_QUESTION', 'UPDATE_QUESTIONS',
]);

// A whole venue can share one Wi-Fi address (Day 3 at Chroma), so the per-IP cap is generous.
const MAX_SOCKETS_PER_IP = 1500;
// Directors upload custom visuals over the socket; keep room for them.
const MAX_PAYLOAD_BYTES = 12 * 1024 * 1024;
// The audience only sends votes, reactions and its sign-in token.
const MAX_AUDIENCE_PAYLOAD_BYTES = 64 * 1024;

// A phone that stops reading (bad Wi-Fi) must not make the server hold its
// backlog forever: above SOFT, it misses decorative updates; above HARD, it is
// dropped (it reconnects and gets a fresh INIT_STATE).
const BACKLOG_SOFT_BYTES = 512 * 1024;
const BACKLOG_HARD_BYTES = 8 * 1024 * 1024;
/** Messages a lagging phone can skip without losing state. */
const SKIPPABLE = new Set(['REACTION_BURST', 'TIMER_TICK', 'VOTE_UPDATE', 'STATE_SYNC']);
/** Audience count broadcasts are coalesced to one per room per interval. */
const COUNT_SYNC_MS = 1000;

export function setupWebSocketEngine(server: http.Server) {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_PAYLOAD_BYTES });
  const clientMap = new Map<WebSocket, ClientMeta>();
  const socketsPerIp = new Map<string, number>();
  // Sockets per room, so a broadcast only walks that room and the count is O(1).
  const roomSockets = new Map<string, Set<WebSocket>>();
  const roomKey = (tenantId: string, eventId: string) => `${tenantId}:${eventId}`;
  const countTimers = new Map<string, NodeJS.Timeout>();

  function broadcastToRoom(tenantId: string, eventId: string, message: WSMessage) {
    const sockets = roomSockets.get(roomKey(tenantId, eventId));
    if (!sockets || sockets.size === 0) return;
    const payloadStr = JSON.stringify(message);
    const skippable = SKIPPABLE.has(message.type);
    sockets.forEach((client) => {
      if (client.readyState !== WebSocket.OPEN) return;
      const backlog = client.bufferedAmount;
      if (backlog > BACKLOG_HARD_BYTES) { client.terminate(); return; }
      if (skippable && backlog > BACKLOG_SOFT_BYTES) return;
      client.send(payloadStr);
    });
  }

  const roomCount = (tenantId: string, eventId: string) => roomSockets.get(roomKey(tenantId, eventId))?.size || 0;

  /** Connect/disconnect storms (a deploy, a Wi-Fi blip) send one count update per second, not one per phone. */
  function scheduleCountSync(tenantId: string, eventId: string) {
    const key = roomKey(tenantId, eventId);
    if (countTimers.has(key)) return;
    countTimers.set(key, setTimeout(() => {
      countTimers.delete(key);
      try {
        broadcastToRoom(tenantId, eventId, {
          type: 'STATE_SYNC', tenantId, eventId, timestamp: Date.now(),
          payload: { connectedAudienceCount: roomCount(tenantId, eventId) },
        });
      } catch (err) {
        console.error('[WebSocket Engine Error]:', err);
      }
    }, COUNT_SYNC_MS));
  }

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

      const meta: ClientMeta = { tenantId, eventId, userId, role, isAdmin: false, appCheck: false };
      clientMap.set(ws, meta);
      const rk = roomKey(tenantId, eventId);
      if (!roomSockets.has(rk)) roomSockets.set(rk, new Set());
      roomSockets.get(rk)!.add(ws);
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
      scheduleCountSync(tenantId, eventId);

      let appCheckPending: Promise<boolean> | null = null;
      ws.on('message', async (data, isBinary) => {
        try {
          if (!limiter.take()) return;
          const size = Array.isArray(data) ? data.reduce((n, b) => n + b.length, 0) : (data as Buffer | ArrayBuffer).byteLength;
          if (!meta.isAdmin && size > MAX_AUDIENCE_PAYLOAD_BYTES) { ws.close(1009, 'Message too big'); return; }
          let messageType = '';
          let payload: any = {};

          // Votes are JSON with the question id; old 1-byte binary votes can't say
          // which question they were for, so they are ignored.
          if (isBinary) return;
          const parsed = JSON.parse(data.toString());
          if (!parsed || typeof parsed !== 'object') return;
          messageType = typeof parsed.type === 'string' ? parsed.type : '';
          payload = parsed.payload ?? {};

          if (messageType === 'AUTH') {
            authenticate(payload?.token).catch(() => {});
            return;
          }

          if (messageType === 'APP_CHECK') {
            appCheckPending = verifyAppCheckToken(payload?.token).then((ok) => { meta.appCheck = meta.appCheck || ok; return ok; });
            return;
          }

          // Scripts without a real browser + reCAPTCHA have no App Check token.
          // A vote can arrive while the token is still being checked.
          if (APP_CHECKED_MESSAGES.has(messageType) && !meta.appCheck && appCheckPending) await appCheckPending;
          if (APP_CHECKED_MESSAGES.has(messageType) && !meta.appCheck && !meta.isAdmin && appCheckMode() !== 'off') {
            noteMissingAppCheck();
            if (appCheckMode() === 'enforce') {
              ws.send(JSON.stringify({ type: 'ERROR', tenantId, eventId, timestamp: Date.now(), payload: { error: 'APP_CHECK_REQUIRED', for: messageType } }));
              return;
            }
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
              // Fake voters were removed: every vote on the stage comes from a real person.
              ws.send(JSON.stringify({ type: 'ERROR', tenantId, eventId, timestamp: Date.now(), payload: { error: 'NOT_AVAILABLE', for: messageType } }));
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
        roomSockets.get(rk)?.delete(ws);
        if (roomSockets.get(rk)?.size === 0) roomSockets.delete(rk);
        socketsPerIp.set(ip, Math.max(0, (socketsPerIp.get(ip) || 1) - 1));
        if ((socketsPerIp.get(ip) || 0) === 0) socketsPerIp.delete(ip);
        scheduleCountSync(tenantId, eventId);
      });

      ws.on('error', (err) => console.warn('[WebSocket Engine] socket error:', err?.message || err));
    } catch (err) {
      console.error('[WebSocket Engine] connection error:', err);
      try { ws.close(1011, 'SERVER_ERROR'); } catch {}
    }
  });

  return { wss, clientMap, broadcastToRoom };
}
