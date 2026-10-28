import { VisualizerPresetId, ReactionBurst } from '../../types/engine';
import { VISUALIZER_PRESETS } from '../../lib/presets';
import { RoomState } from './roomManager';
import { BroadcastFn } from './votingEngine';
import { cleanColor, cleanText } from '../security/validation';

const REACTION_BATCH_MS = 250;
const REACTION_BATCH_MAX = 24;

export function triggerPresetOverride(
  room: RoomState,
  presetId: VisualizerPresetId,
  source: string = 'MANUAL_DIRECTOR',
  broadcast: BroadcastFn
): boolean {
  if (presetId && VISUALIZER_PRESETS[presetId]) {
    // Socket + REST copy of the same director tap: send it once.
    const now = Date.now();
    if (room.lastPresetTrigger && room.lastPresetTrigger.presetId === presetId && now - room.lastPresetTrigger.at < 2000) return true;
    room.lastPresetTrigger = { presetId, at: now };
    room.session.activePresetId = presetId;
    
    broadcast(room.tenantId, room.eventId, {
      type: 'VISUALIZER_TRIGGER',
      tenantId: room.tenantId,
      eventId: room.eventId,
      timestamp: Date.now(),
      payload: {
        presetId,
        source,
      }
    });

    return true;
  }
  return false;
}

export function processAudienceReaction(
  room: RoomState,
  reaction: { emoji?: unknown; color?: unknown; userId?: string },
  broadcast: BroadcastFn
): ReactionBurst {
  const burst: ReactionBurst = {
    id: `rx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    emoji: cleanText(reaction.emoji, 8) || '🔥',
    userId: cleanText(reaction.userId, 64) || 'anon',
    timestamp: Date.now(),
    color: cleanColor(reaction.color) || '#00ddff',
  };

  room.recentReactions.push(burst);
  if (room.recentReactions.length > 50) room.recentReactions.shift();

  // Taps are batched: one REACTION_BURST per room every REACTION_BATCH_MS,
  // carrying at most REACTION_BATCH_MAX (a full room can't flood every phone).
  (room.pendingReactions ||= []).push(burst);
  if (room.pendingReactions.length > REACTION_BATCH_MAX) room.pendingReactions.shift();
  if (!room.reactionTimer) {
    room.reactionTimer = setTimeout(() => {
      room.reactionTimer = undefined;
      const batch = room.pendingReactions || [];
      room.pendingReactions = [];
      if (!batch.length) return;
      try {
        broadcast(room.tenantId, room.eventId, {
          type: 'REACTION_BURST',
          tenantId: room.tenantId,
          eventId: room.eventId,
          timestamp: Date.now(),
          payload: batch,
        });
      } catch (err) {
        console.error('[Visualizer Bridge] reaction batch error:', err);
      }
    }, REACTION_BATCH_MS);
  }

  return burst;
}
