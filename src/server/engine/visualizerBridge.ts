import { VisualizerPresetId, ReactionBurst } from '../../types/engine';
import { VISUALIZER_PRESETS } from '../../lib/presets';
import { RoomState } from './roomManager';
import { BroadcastFn } from './votingEngine';
import { cleanColor, cleanText } from '../security/validation';

export function triggerPresetOverride(
  room: RoomState,
  presetId: VisualizerPresetId,
  source: string = 'MANUAL_DIRECTOR',
  broadcast: BroadcastFn
): boolean {
  if (presetId && VISUALIZER_PRESETS[presetId]) {
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

    broadcast(room.tenantId, room.eventId, {
      type: 'PRESET_TRIGGER',
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

  broadcast(room.tenantId, room.eventId, {
    type: 'AUDIENCE_REACTION',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: burst,
  });

  broadcast(room.tenantId, room.eventId, {
    type: 'REACTION_BURST',
    tenantId: room.tenantId,
    eventId: room.eventId,
    timestamp: Date.now(),
    payload: burst,
  });

  return burst;
}
