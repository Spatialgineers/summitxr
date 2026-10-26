import { Question, Tenant } from '../types/engine';

export const INITIAL_TENANTS: Tenant[] = [
  {
    id: 'tenant_sgx_story',
    name: 'SGX.STORY — Lore & Craft',
    slug: 'story',
    pillarId: 'SGX.STORY',
    vibe: 'Amarillo Neón & Oro (Narrativa & Lore)',
    description: 'Preset enfocado en desarrollo conceptual, worldbuilding y estética amarillo neón.',
    erraticRating: 1,
    presetId: 'preset_story_float',
    branding: {
      primaryColor: '#FDCC0D',
      secondaryColor: '#32527B',
      accentColor: '#FFE566',
      backgroundColor: '#101010',
      cardBgColor: '#1B1B1B',
      borderColor: '#FDCC0D',
      neonHighlightColor: '#FFE566',
      glowShadow: 'rgba(253, 204, 13, 0.45)',
      gradientCss: 'linear-gradient(135deg, #FDCC0D 0%, #32527B 100%)',
    },
  },
  {
    id: 'tenant_sgx_spark',
    name: 'SGX.SPARK — Gamification & Logic',
    slug: 'spark',
    pillarId: 'SGX.SPARK',
    vibe: 'Naranja Neón & Fuego (Alto Voltaje Lógico)',
    description: 'Preset para mecánicas de gamificación, simulador de dron y dinamismo interactivo.',
    erraticRating: 3,
    presetId: 'preset_plasma_bloom',
    branding: {
      primaryColor: '#FFBB00',
      secondaryColor: '#FDCC0D',
      accentColor: '#FF8800',
      backgroundColor: '#140904',
      cardBgColor: '#1F1008',
      borderColor: '#FFBB00',
      neonHighlightColor: '#FFAA33',
      glowShadow: 'rgba(255, 187, 0, 0.55)',
      gradientCss: 'linear-gradient(135deg, #FFBB00 0%, #FDCC0D 100%)',
    },
  },
  {
    id: 'tenant_sgx_showcase',
    name: 'SGX.SHOWCASE — Brand & Exhibition',
    slug: 'showcase',
    pillarId: 'SGX.SHOWCASE',
    vibe: 'Cyan Neón & WebXR (Showroom de Marcas)',
    description: 'Preset de alta claridad pensado para exhibición de patrocinadores, 3D y marcas.',
    erraticRating: 2,
    presetId: 'preset_aurora_crystal',
    branding: {
      primaryColor: '#00DDFF',
      secondaryColor: '#32527B',
      accentColor: '#33FFFF',
      backgroundColor: '#101010',
      cardBgColor: '#1E1E1E',
      borderColor: '#00DDFF',
      neonHighlightColor: '#00DDFF',
      glowShadow: 'rgba(0, 221, 255, 0.55)',
      gradientCss: 'linear-gradient(135deg, #00DDFF 0%, #32527B 100%)',
    },
  },
  {
    id: 'tenant_sgx_stage',
    name: 'SGX.STAGE — Virtual Production Arena',
    slug: 'stage',
    pillarId: 'SGX.STAGE',
    vibe: 'Blanco Puro & Spotlights (Luces de Escenario)',
    description: 'Preset de escenario en vivo con strobes de alta intensidad y presencia escénica.',
    erraticRating: 4,
    presetId: 'preset_volcano_fire',
    branding: {
      primaryColor: '#FFFFFF',
      secondaryColor: '#32527B',
      accentColor: '#F8FAFC',
      backgroundColor: '#1B1B1B',
      cardBgColor: '#2B2B2B',
      borderColor: '#FFFFFF',
      neonHighlightColor: '#F8FAFC',
      glowShadow: 'rgba(255, 255, 255, 0.65)',
      gradientCss: 'linear-gradient(135deg, #FFFFFF 0%, #32527B 100%)',
    },
  },
  {
    id: 'tenant_sgx_system',
    name: 'SGX.SYSTEM — Core Matrix Infrastructure',
    slug: 'system',
    pillarId: 'SGX.SYSTEM',
    vibe: 'Azul Oficial SGX & Cian (#32527B & #00DDFF)',
    description: 'Preset técnico de bajo nivel con arquitectura en Azul Oficial SGX (#32527B) e infraestructura cloud.',
    erraticRating: 5,
    presetId: 'preset_glitch_cyber',
    branding: {
      primaryColor: '#32527B',
      secondaryColor: '#00DDFF',
      accentColor: '#FDCC0D',
      backgroundColor: '#0F0F0F',
      cardBgColor: '#191919',
      borderColor: '#32527B',
      neonHighlightColor: '#00DDFF',
      glowShadow: 'rgba(50, 82, 123, 0.75)',
      gradientCss: 'linear-gradient(135deg, #32527B 0%, #00DDFF 100%)',
    },
  },
  {
    id: 'tenant_sgx_synthesize',
    name: 'SGX.SYNTHESIZE — Full Spectrum SGX',
    slug: 'synthesize',
    pillarId: 'SGX.SYNTHESIZE',
    vibe: 'Gradiente Amarillo / Azul SGX (#FDCC0D & #32527B)',
    description: 'Preset sinérgico total que armoniza todos los pilares con el gradiente oficial SGX.',
    erraticRating: 6,
    presetId: 'preset_synthesize_chaos',
    branding: {
      primaryColor: '#FDCC0D',
      secondaryColor: '#32527B',
      accentColor: '#00DDFF',
      backgroundColor: '#0F0F0F',
      cardBgColor: '#1E1E1E',
      borderColor: '#FDCC0D',
      neonHighlightColor: '#FFE566',
      glowShadow: 'rgba(253, 204, 13, 0.65)',
      gradientCss: 'linear-gradient(135deg, #FDCC0D 0%, #32527B 100%)',
    },
  },
];

export const SAMPLE_QUESTIONS: Question[] = [
  {
    id: 'q_001',
    tenantId: 'tenant_spatialgineers',
    eventId: 'event_live_main',
    order: 1,
    prompt: 'Which dimensional timeline should our live stage warp towards next?',
    subtitle: 'Audience CYOA choice determines the live visual world & stage lighting in real-time!',
    category: 'CYOA Dimension Shift',
    answerType: 'OPINION_CYOA',
    durationSeconds: 30,
    basePoints: 200,
    maxSpeedBonus: 150,
    participationWeight: 50,
    options: [
      {
        id: 'opt_a',
        index: 0,
        code: 0x01,
        label: 'A: Synthwave Neon Grid',
        description: 'Retro 80s perspective wireframe mountains and glowing cyber sun',
        presetId: 'preset_neon_grid',
        color: '#00ddff',
        effectType: 'cyber_grid_pulse',
        effectName: 'Onda Neón Rejilla Synthwave',
        effectMultiplier: 1.5,
        effectTargetParam: 'Malla 3D & Pulsación Sol Cyber',
      },
      {
        id: 'opt_b',
        index: 1,
        code: 0x02,
        label: 'B: Inferno Magma Volcano',
        description: 'Turbulent volcanic lava vortex with burning thermal ember eruptive bursts',
        presetId: 'preset_volcano_fire',
        color: '#ff3b30',
        effectType: 'magma_eruption',
        effectName: 'Erupción Magma & Brasas Térmicas',
        effectMultiplier: 1.8,
        effectTargetParam: 'Velocidad Partículas de Fuego',
      },
      {
        id: 'opt_c',
        index: 2,
        code: 0x03,
        label: 'C: Quantum Particle Storm',
        description: 'Cosmic 8,000-particle gravitational attractor vortex',
        presetId: 'preset_particle_storm',
        color: '#5f86b4',
        effectType: 'quantum_vortex',
        effectName: 'Vórtice Cuántico Orbital',
        effectMultiplier: 1.4,
        effectTargetParam: 'Giro Orbital & Gravitación',
      },
      {
        id: 'opt_d',
        index: 3,
        code: 0x04,
        label: 'D: Neural Matrix Rain',
        description: 'Digital data streams with rotating 3D holographic quantum core',
        presetId: 'preset_cyber_matrix',
        color: '#22c55e',
        effectType: 'matrix_rain',
        effectName: 'Lluvia Digital Matrix',
        effectMultiplier: 1.6,
        effectTargetParam: 'Velocidad de Caída Matrix',
      },
    ],
    storyPathOutcome: {
      narrative: 'The collective consensus has unlocked a hyperspace jump into the selected cyber dimension!',
      stageTitle: 'DIMENSION WARP INITIATED',
    },
  },
  {
    id: 'q_002',
    tenantId: 'tenant_spatialgineers',
    eventId: 'event_live_main',
    order: 2,
    prompt: 'TRIVIA CHALLENGE: What rendering pipeline power WebGL shaders directly in the browser?',
    subtitle: 'Speed + Correctness unlocks highest streak multipliers and VIP points!',
    category: 'Spatial Knowledge',
    answerType: 'KNOWLEDGE',
    durationSeconds: 20,
    basePoints: 300,
    maxSpeedBonus: 200,
    participationWeight: 50,
    options: [
      {
        id: 'opt_a',
        index: 0,
        code: 0x01,
        label: 'A: OpenGL ES & GLSL GPU Shaders',
        description: 'Direct GPU programmable vertex & fragment pipelines',
        presetId: 'preset_hyper_warp',
        isCorrect: true,
        color: '#0070f3',
        effectType: 'hyper_warp_streak',
        effectName: 'Aceleración Túnel Híper-Warp',
        effectMultiplier: 2.0,
        effectTargetParam: 'Estiramiento Estelar Hyperspace',
      },
      {
        id: 'opt_b',
        index: 1,
        code: 0x02,
        label: 'B: Static HTML Canvas 2D Bitmap',
        description: 'Pure CPU rasterization on main thread',
        presetId: 'preset_volcano_fire',
        isCorrect: false,
        color: '#ff3b30',
        effectType: 'magma_eruption',
        effectName: 'Fuego & Brasas de Calor CPU',
        effectMultiplier: 1.2,
        effectTargetParam: 'Emisión Térmica Lava',
      },
      {
        id: 'opt_c',
        index: 2,
        code: 0x03,
        label: 'C: Server-Side Video JPEG Stream',
        description: 'Remote cloud streaming buffer',
        presetId: 'preset_neon_grid',
        isCorrect: false,
        color: '#00ddff',
        effectType: 'cyber_grid_pulse',
        effectName: 'Malla Neón Distorsionada',
        effectMultiplier: 1.0,
        effectTargetParam: 'Velocidad Plano Rejilla',
      },
      {
        id: 'opt_d',
        index: 3,
        code: 0x04,
        label: 'D: CSS Transitions Only',
        description: 'DOM style transform engine',
        presetId: 'preset_aurora_crystal',
        isCorrect: false,
        color: '#ec4899',
        effectType: 'aurora_crystal_wave',
        effectName: 'Atmósfera Prismática Aurora',
        effectMultiplier: 1.3,
        effectTargetParam: 'Ondulación Cristales Quartz',
      },
    ],
  },
  {
    id: 'q_003',
    tenantId: 'tenant_spatialgineers',
    eventId: 'event_live_main',
    order: 3,
    prompt: 'CYOA CLIMAX: Choose the ultimate climax stage effect for the grand finale!',
    subtitle: 'Your vote triggers real-time 3D particle physics on the main OBS broadcast canvas.',
    category: 'Finale Climax',
    answerType: 'OPINION_CYOA',
    durationSeconds: 30,
    basePoints: 250,
    maxSpeedBonus: 150,
    participationWeight: 100,
    options: [
      {
        id: 'opt_a',
        index: 0,
        code: 0x01,
        label: 'A: Prismatic Aurora Realm',
        description: 'Refractive quartz crystals with iridescent atmosphere wave curtains',
        presetId: 'preset_aurora_crystal',
        color: '#38bdf8',
        effectType: 'aurora_crystal_wave',
        effectName: 'Onda Prismática de Cristal Quartz',
        effectMultiplier: 1.7,
        effectTargetParam: 'Brote de Luz & Refracción',
      },
      {
        id: 'opt_b',
        index: 1,
        code: 0x02,
        label: 'B: Lightspeed Hyperspace Warp',
        description: 'Relativistic starfield acceleration warp speed',
        presetId: 'preset_hyper_warp',
        color: '#6366f1',
        effectType: 'hyper_warp_streak',
        effectName: 'Impulso Híper-Warp Relativista',
        effectMultiplier: 2.2,
        effectTargetParam: 'Aceleración Túnel de Estrellas',
      },
      {
        id: 'opt_c',
        index: 2,
        code: 0x03,
        label: 'C: Cosmic Quantum Storm',
        description: 'High-energy galactic vortex with dual gravity wells',
        presetId: 'preset_particle_storm',
        color: '#9d4edd',
        effectType: 'quantum_vortex',
        effectName: 'Vórtice Galáctico Espiral',
        effectMultiplier: 1.8,
        effectTargetParam: 'Densidad y Giro Galáctico',
      },
      {
        id: 'opt_d',
        index: 3,
        code: 0x04,
        label: 'D: Inferno Lava Eruption',
        description: 'Volcanic magma eruption with fiery thermal glow',
        presetId: 'preset_volcano_fire',
        color: '#f97316',
        effectType: 'magma_eruption',
        effectName: 'Erupción Magma Térmica Explosiva',
        effectMultiplier: 2.5,
        effectTargetParam: 'Impulso Vertical de Brasas',
      },
    ],
  },
];

export const PRISMA_SCHEMA_SPEC = `// ==========================================
// SGX LIVE ENGINE - PRISMA SCHEMA DEFINITION
// Multi-Tenant Real-Time Interactive CYOA Engine
// ==========================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum AnswerType {
  KNOWLEDGE
  OPINION_CYOA
}

enum SessionStatus {
  IDLE
  VOTING_ACTIVE
  VOTING_CLOSED
  RESULT_REVEALED
  EVENT_ENDED
}

enum PrizeTierLevel {
  BRONZE
  SILVER
  GOLD
  PLATINUM
  VIP_BACKSTAGE
}

model Tenant {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  logoUrl     String?
  brandColor  String    @default("#00ddff")
  accentColor String    @default("#ff007f")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  events      Event[]
  presets     Preset[]
  users       User[]

  @@index([slug])
}

model Event {
  id          String        @id @default(cuid())
  tenantId    String
  tenant      Tenant        @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  title       String
  slug        String
  description String?
  isLive      Boolean       @default(false)
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  sessions    EventSession[]
  questions   Question[]
  prizes      Prize[]
  interactions Interaction[]

  @@unique([tenantId, slug])
}

model EventSession {
  id               String        @id @default(cuid())
  eventId          String
  event            Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  currentQuestionId String?
  status           SessionStatus @default(IDLE)
  activePresetId   String        @default("preset_neon_grid")
  startedAt        DateTime?
  questionEndTime  DateTime?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt
}

model Question {
  id                  String        @id @default(cuid())
  eventId             String
  event               Event         @relation(fields: [eventId], references: [id], onDelete: Cascade)
  order               Int           @default(1)
  prompt              String
  subtitle            String?
  category            String        @default("General")
  answerType          AnswerType    @default(OPINION_CYOA)
  durationSeconds     Int           @default(30)
  basePoints          Int           @default(200)
  maxSpeedBonus       Int           @default(150)
  participationWeight Int           @default(50)
  storyOutcomeText    String?
  createdAt           DateTime      @default(now())
  updatedAt           DateTime      @updatedAt

  options             Option[]
  interactions        Interaction[]

  @@index([eventId, order])
}

model Option {
  id          String        @id @default(cuid())
  questionId  String
  question    Question      @relation(fields: [questionId], references: [id], onDelete: Cascade)
  index       Int
  code        Int           // Binary buffer code: 0x01, 0x02, etc.
  label       String
  description String?
  presetId    String        // Bound WebGL visualizer preset
  isCorrect   Boolean       @default(false)
  color       String        @default("#00ddff")

  interactions Interaction[]

  @@unique([questionId, index])
}

model Preset {
  id              String   @id // e.g. "preset_volcano_fire"
  tenantId        String?
  tenant          Tenant?  @relation(fields: [tenantId], references: [id])
  name            String
  category        String
  description     String
  themeColor      String
  accentColor     String
  shaderKey       String
  particleDensity Int      @default(5000)
  isCustom        Boolean  @default(false)
  customGLSLCode  String?
  createdAt       DateTime @default(now())
}

model User {
  id                 String        @id @default(cuid())
  tenantId           String
  tenant             Tenant        @relation(fields: [tenantId], references: [id])
  nickname           String
  avatarSeed         String
  totalScore         Int           @default(0)
  currentStreak      Int           @default(0)
  highestStreak      Int           @default(0)
  totalInteractions  Int           @default(0)
  activeSeconds      Int           @default(0)
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  interactions       Interaction[]
  userPrizes         UserPrize[]

  @@index([tenantId, totalScore(sort: Desc)])
}

model Interaction {
  id              String    @id @default(cuid())
  eventId         String
  event           Event     @relation(fields: [eventId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question  @relation(fields: [questionId], references: [id], onDelete: Cascade)
  optionId        String
  option          Option    @relation(fields: [optionId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  isCorrect       Boolean   @default(false)
  pointsEarned    Int       @default(0)
  responseTimeMs  Int
  streakAtTime    Int       @default(0)
  speedBonus      Int       @default(0)
  createdAt       DateTime  @default(now())

  @@unique([questionId, userId]) // 1 vote per user per question
  @@index([eventId, createdAt])
}

model Prize {
  id              String         @id @default(cuid())
  eventId         String
  event           Event          @relation(fields: [eventId], references: [id], onDelete: Cascade)
  tier            PrizeTierLevel
  name            String
  description     String
  minPoints       Int
  minInteractions Int
  badgeIcon       String
  perkReward      String
  couponCode      String
  color           String
  createdAt       DateTime       @default(now())

  userPrizes      UserPrize[]
}

model UserPrize {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  prizeId   String
  prize     Prize    @relation(fields: [prizeId], references: [id], onDelete: Cascade)
  unlockedAt DateTime @default(now())

  @@unique([userId, prizeId])
}`;

export const POSTGRESQL_DDL = `-- ==========================================
-- SGX LIVE ENGINE - POSTGRESQL DDL (Optimized for High Concurrency)
-- ==========================================

CREATE TYPE answer_type_enum AS ENUM ('KNOWLEDGE', 'OPINION_CYOA');
CREATE TYPE session_status_enum AS ENUM ('IDLE', 'VOTING_ACTIVE', 'VOTING_CLOSED', 'RESULT_REVEALED', 'EVENT_ENDED');
CREATE TYPE prize_tier_enum AS ENUM ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'VIP_BACKSTAGE');

CREATE TABLE tenants (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(128) UNIQUE NOT NULL,
    logo_url TEXT,
    brand_color VARCHAR(16) DEFAULT '#00ddff',
    accent_color VARCHAR(16) DEFAULT '#ff007f',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE events (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(128) NOT NULL,
    description TEXT,
    is_live BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_tenant_event_slug UNIQUE (tenant_id, slug)
);

CREATE TABLE questions (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
    question_order INT NOT NULL DEFAULT 1,
    prompt TEXT NOT NULL,
    subtitle TEXT,
    category VARCHAR(128) DEFAULT 'General',
    answer_type answer_type_enum DEFAULT 'OPINION_CYOA',
    duration_seconds INT DEFAULT 30,
    base_points INT DEFAULT 200,
    max_speed_bonus INT DEFAULT 150,
    participation_weight INT DEFAULT 50,
    story_outcome_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE options (
    id VARCHAR(64) PRIMARY KEY,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    option_index INT NOT NULL,
    code SMALLINT NOT NULL, -- 0x01, 0x02 binary code
    label VARCHAR(255) NOT NULL,
    description TEXT,
    preset_id VARCHAR(64) NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    color VARCHAR(16) DEFAULT '#00ddff',
    CONSTRAINT unique_question_option UNIQUE (question_id, option_index)
);

CREATE TABLE users (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) REFERENCES tenants(id),
    nickname VARCHAR(128) NOT NULL,
    avatar_seed VARCHAR(64) NOT NULL,
    total_score INT DEFAULT 0,
    current_streak INT DEFAULT 0,
    highest_streak INT DEFAULT 0,
    total_interactions INT DEFAULT 0,
    active_seconds INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE interactions (
    id VARCHAR(64) PRIMARY KEY,
    event_id VARCHAR(64) REFERENCES events(id) ON DELETE CASCADE,
    question_id VARCHAR(64) REFERENCES questions(id) ON DELETE CASCADE,
    option_id VARCHAR(64) REFERENCES options(id) ON DELETE CASCADE,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    is_correct BOOLEAN DEFAULT FALSE,
    points_earned INT DEFAULT 0,
    response_time_ms INT NOT NULL,
    streak_at_time INT DEFAULT 0,
    speed_bonus INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_question_vote UNIQUE (question_id, user_id)
);

-- High Performance Indexes
CREATE INDEX idx_user_leaderboard ON users(tenant_id, total_score DESC);
CREATE INDEX idx_interactions_question ON interactions(question_id);
CREATE INDEX idx_interactions_event ON interactions(event_id, created_at);`;

export const MONGODB_SCHEMA_SPEC = `// ==========================================
// SGX LIVE ENGINE - MONGOOSE / MONGODB SCHEMA
// ==========================================
import mongoose, { Schema } from 'mongoose';

const QuestionOptionSchema = new Schema({
  code: { type: Number, required: true }, // 0x01, 0x02
  label: { type: String, required: true },
  description: { type: String },
  presetId: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
  color: { type: String, default: '#00ddff' }
});

const QuestionSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  eventId: { type: String, required: true, index: true },
  order: { type: Number, default: 1 },
  prompt: { type: String, required: true },
  subtitle: { type: String },
  category: { type: String, default: 'General' },
  answerType: { type: String, enum: ['KNOWLEDGE', 'OPINION_CYOA'], default: 'OPINION_CYOA' },
  durationSeconds: { type: Number, default: 30 },
  basePoints: { type: Number, default: 200 },
  maxSpeedBonus: { type: Number, default: 150 },
  participationWeight: { type: Number, default: 50 },
  options: [QuestionOptionSchema],
  storyPathOutcome: {
    narrative: String,
    stageTitle: String
  }
}, { timestamps: true });

const UserProfileSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  eventId: { type: String, required: true, index: true },
  nickname: { type: String, required: true },
  avatarSeed: { type: String, required: true },
  totalScore: { type: Number, default: 0, index: -1 },
  currentStreak: { type: Number, default: 0 },
  highestStreak: { type: Number, default: 0 },
  totalInteractions: { type: Number, default: 0 },
  activeSeconds: { type: Number, default: 0 },
  unlockedPrizeIds: [{ type: String }],
  choiceHistory: [{
    questionId: String,
    selectedOptionId: String,
    isCorrect: Boolean,
    pointsEarned: Number,
    responseTimeMs: Number,
    timestamp: Date
  }]
}, { timestamps: true });`;
