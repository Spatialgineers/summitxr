export type AnswerType = 'KNOWLEDGE' | 'OPINION_CYOA';

export type VisualizerPresetId = 
  | 'preset_volcano_fire'
  | 'preset_neon_grid'
  | 'preset_particle_storm'
  | 'preset_cyber_matrix'
  | 'preset_hyper_warp'
  | 'preset_aurora_crystal'
  | 'preset_glitch_cyber'
  | 'preset_quantum_vortex'
  | 'preset_plasma_bloom'
  | 'preset_synthwave_terrain'
  | 'preset_hologram_ubershader'
  | string;

export type ShaderKeyType = 
  | 'volcano'
  | 'grid'
  | 'storm'
  | 'matrix'
  | 'warp'
  | 'aurora'
  | 'glitch'
  | 'vortex'
  | 'plasma'
  | 'terrain'
  | 'ubershader'
  | string;

export type ParticleBehaviorType =
  | 'vortex_spiral'
  | 'upward_fountain'
  | 'tunnel_stream'
  | 'orbital_galaxy'
  | 'orbital_ring'
  | 'ambient_float'
  | 'shockwave_pulse'
  | 'matrix_fall';

export type CoreGeometryType =
  | 'torus_knot'
  | 'icosahedron'
  | 'sphere_sun'
  | 'octahedron'
  | 'dodecahedron'
  | 'torus_ring'
  | 'cube_matrix'
  | 'custom_model'
  | 'none';

export interface VisualizerPreset {
  id: VisualizerPresetId;
  name: string;
  category: 'Elements' | 'Cyber' | 'Cosmic' | 'Abstract' | 'UberShaders' | 'Custom';
  description: string;
  themeColor: string;
  secondaryColor?: string;
  accentColor: string;
  neonHighlightColor?: string;
  shaderKey: ShaderKeyType;
  
  // UberShader & Glitch / Warp FX Controls
  glitchIntensity?: number; // 0.0 to 1.0 (RGB split, scanline jitter, strobe)
  warpSpeed?: number; // 0.1 to 5.0 (hyperspace star speed & stretch)
  distortionAmount?: number; // 0.0 to 3.0 (vertex wave & noise displacement)
  bloomIntensity?: number; // 0.5 to 4.0
  wireframe?: boolean;
  coreGeometry?: CoreGeometryType;
  coreRotationSpeed?: number; // 0.1 to 5.0
  cameraShake?: number; // 0.0 to 2.0
  
  // Particle Instance System (Enlaces para partículas e instancias)
  particleTextureUrl?: string | null; // Direct link or Data URI for custom particle sprite
  particleShape?: 'ember' | 'spark' | 'star' | 'rune' | 'orb' | 'crystal' | 'ring' | 'lightning' | 'custom_url';
  particleDensity: number; // 500 to 15,000 particles
  particleSize?: number; // 0.05 to 1.0
  particleSpeed?: number; // 0.2 to 5.0
  particleBehavior?: ParticleBehaviorType;
  particleBlending?: 'additive' | 'normal' | 'multiply';

  // 3D Model Instance Link
  model3dUrl?: string | null;
  modelScale?: number;
  modelRotationSpeed?: number;
  modelEmissiveColor?: string | null;

  // Environment & Branding Links
  backgroundUrl?: string | null;
  logoUrl?: string | null;
  audioFxUrl?: string | null;

  isCustom?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type OptionEffectType = 
  | 'magma_eruption'
  | 'matrix_rain'
  | 'cyber_grid_pulse'
  | 'quantum_vortex'
  | 'hyper_warp_streak'
  | 'aurora_crystal_wave'
  | 'plasma_bloom'
  | 'strobe_glitch';

export interface QuestionOption {
  id: string; // 'opt_a' | 'opt_b' | 'opt_c' | 'opt_d'
  index: number; // 0, 1, 2, 3
  code: number; // 0x01, 0x02, 0x03, 0x04 for binary payload
  label: string;
  description?: string;
  presetId: VisualizerPresetId;
  isCorrect?: boolean;
  color: string;
  // Dynamic Effect & Preset Synchronization
  effectType?: OptionEffectType;
  effectName?: string;
  effectMultiplier?: number; // 0.5 to 3.0
  effectTargetParam?: string; // e.g., 'Velocidad de Brasas', 'Lluvia Matrix', etc.
}

export interface Question {
  id: string;
  tenantId: string;
  eventId: string;
  order: number;
  prompt: string;
  subtitle?: string;
  category: string;
  answerType: AnswerType;
  durationSeconds: number;
  basePoints: number;
  maxSpeedBonus: number;
  participationWeight: number;
  options: QuestionOption[];
  storyPathOutcome?: {
    narrative: string;
    stageTitle: string;
  };
}

export interface TenantRoom {
  id: string;
  name: string;
  type: 'MAIN_STAGE' | 'BREAKOUT_ROOM' | 'VIP_LOUNGE' | 'WORKSHOP_POD' | 'EXHIBITION_BOOTH';
  status: 'LIVE' | 'UPCOMING' | 'OFF_AIR';
  capacity: number;
  currentAttendees: number;
  streamUrl?: string;
  isGlobal?: boolean;
  description?: string;
}

export interface TenantPresetConfig {
  shaderKey?: 'glitch' | 'warp' | 'volcano' | 'matrix' | 'vortex' | 'plasma' | 'holographic';
  coreGeometry?: 'icosahedron' | 'torus_knot' | 'dodecahedron' | 'crystal' | 'cyber_ring' | 'sphere' | 'cube' | 'octahedron';
  wireframe?: boolean;
  particleBehavior?: 'ambient_float' | 'upward_fountain' | 'vortex_spiral' | 'shockwave_pulse' | 'matrix_fall' | 'tunnel_stream';
  particleDensity?: number;
  particleSpeed?: number;
  glitchIntensity?: number;
  bloomIntensity?: number;
  cameraShake?: number;
  model3dUrl?: string;
  modelScale?: number;
  particleTextureUrl?: string;
  backgroundUrl?: string;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  pillarId?: 'SGX.STORY' | 'SGX.SHOWCASE' | 'SGX.SPARK' | 'SGX.STAGE' | 'SGX.SYSTEM' | 'SGX.SYNTHESIZE';
  vibe: string;
  description?: string;
  slogan?: string;
  hostName?: string;
  erraticRating: number; // 1 (calm float) to 6 (max erratic chaos)
  presetId: VisualizerPresetId;
  presetConfig?: TenantPresetConfig;
  logoUrl?: string;
  rooms?: TenantRoom[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    cardBgColor: string;
    borderColor: string;
    neonHighlightColor: string;
    glowShadow: string;
    bannerUrl?: string;
    gradientCss?: string;
  };
}

export interface EventSession {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  currentQuestionId?: string;
  status: 'IDLE' | 'VOTING_ACTIVE' | 'VOTING_CLOSED' | 'RESULT_REVEALED' | 'EVENT_ENDED';
  activePresetId: VisualizerPresetId;
  startedAt?: number;
  questionEndTime?: number;
  timeRemaining?: number;
}

export interface VoteSummary {
  questionId: string;
  totalVotes: number;
  optionCounts: Record<string, number>;
  optionPercentages: Record<string, number>;
  winningOptionId: string;
  winningPresetId: VisualizerPresetId;
  correctOptionId?: string;
}

export interface UserProfile {
  id: string;
  nickname: string;
  email?: string;
  isAnonymous?: boolean;
  avatar?: string;
  avatarSeed: string;
  tenantId: string;
  eventId: string;
  score?: number;
  totalScore: number;
  accuracyRate: number;
  streak?: number;
  currentStreak: number;
  highestStreak: number;
  multiplier: number;
  totalInteractions: number;
  activeSeconds: number;
  prizeTier?: string;
  unlockedPrizeIds: string[];
  choiceHistory: Array<{
    questionId: string;
    selectedOptionId: string;
    isCorrect?: boolean;
    pointsEarned: number;
    responseTimeMs: number;
    timestamp: number;
  }>;
  joinedAt?: number;
}

export interface PrizeTier {
  id: string;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'VIP_BACKSTAGE';
  name: string;
  description: string;
  minPoints: number;
  minInteractions: number;
  badgeIcon: string;
  perkReward: string;
  couponCode: string;
  color: string;
}

export type ReactionType = 'fire' | 'lightning' | 'rocket' | 'heart' | 'party';

export interface ReactionBurst {
  id: string;
  emoji: string;
  userId: string;
  timestamp: number;
  color: string;
}

// WebSocket Message Protocol Types
export type WebSocketMessageType =
  | 'INIT_STATE'
  | 'QUESTION_START'
  | 'VOTE_SUBMIT'
  | 'COUNTDOWN_TICK'
  | 'VOTE_SUMMARY'
  | 'PRESET_TRIGGER'
  | 'SCORE_UPDATE'
  | 'STATE_SYNC'
  | 'REACTION_BURST'
  | 'STAGE_OVERRIDE'
  | 'RESET_ROUND'
  | 'AUDIENCE_JOIN'
  | 'SIMULATE_VOTES'
  | 'ROOM_STATE_SYNC'
  | 'TIMER_TICK'
  | 'VOTE_UPDATE'
  | 'VOTING_CLOSED'
  | 'VISUALIZER_TRIGGER'
  | 'AUDIENCE_REACTION'
  | 'USER_SCORES_SYNC'
  | 'BROADCAST_QUESTION'
  | 'CLOSE_VOTING'
  | 'TRIGGER_PRESET'
  | 'CREATE_QUESTION'
  | 'SUBMIT_VOTE'
  | 'UPDATE_QUESTIONS'
  | 'UPDATE_CUSTOM_ASSETS'
  | 'SYNC_PRESETS'
  | 'SAVE_PRESET'
  | 'DELETE_PRESET'
  | 'FX_PRESET_TRIGGER'
  | 'SEND_REACTION'
  | 'AUTH'
  | 'AUTH_RESULT'
  | 'ERROR';

export interface CustomVisualAssets {
  customBackgroundUrl?: string | null;
  customLogoUrl?: string | null;
  customParticleTextureUrl?: string | null;
  customModel3dUrl?: string | null;
  customModelScale?: number;
  customModelRotationSpeed?: number;
  customModelColor?: string | null;
}

export interface WSMessage<T = any> {
  type: WebSocketMessageType;
  tenantId: string;
  eventId: string;
  timestamp?: number;
  payload?: T;
}

export interface StageRenderSettings {
  transparentBackground: boolean;
  showHUD: boolean;
  show3DVotingBars: boolean;
  cameraMotion: boolean;
  particleDensityMultiplier: number;
  resolutionQuality: 'high' | 'ultra';
  bloomIntensity: number;
}

export interface TelemetryStats {
  totalBytesIn: number;
  totalBytesOut: number;
  rollingBytes30s: number;
  kbPerUserPer30s: number;
  messageCount30s: number;
  connectedUsers: number;
  latencyMs: number;
  streamEfficiencyScore: number;
  lastUpdated: number;
}
