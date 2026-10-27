import type { Question, QuestionOption } from '../../types/engine';

/** Input limits for everything the live engine accepts from clients. */
export const LIMITS = {
  MAX_QUESTIONS: 200,
  MIN_OPTIONS: 2,
  MAX_OPTIONS: 8,
  PROMPT_MAX: 300,
  LABEL_MAX: 120,
  TEXT_MAX: 500,
  SHORT_MAX: 80,
  ID_MAX: 64,
  NICKNAME_MAX: 40,
  SIMULATE_MAX: 500,
} as const;

const ID_RE = /^[A-Za-z0-9_.:-]{1,64}$/;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{3,8}$/;

export function isValidId(v: unknown): v is string {
  return typeof v === 'string' && ID_RE.test(v);
}

/** Trim, strip control characters and cap length. Returns '' for non-strings. */
export function cleanText(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

function optText(v: unknown, max: number): string | undefined {
  const s = cleanText(v, max);
  return s ? s : undefined;
}

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function optNumber(v: unknown, min: number, max: number): number | undefined {
  const n = Number(v);
  if (v === undefined || v === null || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; error: string };

function validateOption(raw: any, idx: number, qIdx: number): ValidationResult<QuestionOption> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `question[${qIdx}].options[${idx}] must be an object` };
  }
  const label = cleanText(raw.label, LIMITS.LABEL_MAX + 1);
  if (!label) return { ok: false, error: `question[${qIdx}].options[${idx}].label is required` };
  if (label.length > LIMITS.LABEL_MAX) {
    return { ok: false, error: `question[${qIdx}].options[${idx}].label exceeds ${LIMITS.LABEL_MAX} chars` };
  }
  if (raw.id !== undefined && !isValidId(raw.id)) {
    return { ok: false, error: `question[${qIdx}].options[${idx}].id is invalid` };
  }
  const presetId = isValidId(raw.presetId) ? raw.presetId : 'preset_neon_grid';
  const color = typeof raw.color === 'string' && HEX_COLOR_RE.test(raw.color) ? raw.color : '#00DDFF';

  const opt: QuestionOption = {
    id: raw.id || `opt_${idx + 1}`,
    index: idx,
    code: idx + 1,
    label,
    presetId,
    color,
  };
  const description = optText(raw.description, LIMITS.TEXT_MAX);
  if (description) opt.description = description;
  if (typeof raw.isCorrect === 'boolean') opt.isCorrect = raw.isCorrect;
  if (isValidId(raw.effectType)) opt.effectType = raw.effectType as QuestionOption['effectType'];
  const effectName = optText(raw.effectName, LIMITS.SHORT_MAX);
  if (effectName) opt.effectName = effectName;
  const effectMultiplier = optNumber(raw.effectMultiplier, 0, 5);
  if (effectMultiplier !== undefined) opt.effectMultiplier = effectMultiplier;
  const effectTargetParam = optText(raw.effectTargetParam, LIMITS.SHORT_MAX);
  if (effectTargetParam) opt.effectTargetParam = effectTargetParam;
  return { ok: true, value: opt };
}

/**
 * Validates one question from a director and returns a clean copy that only
 * carries known fields. Missing ids are generated; tenant/event/order are set
 * by the caller.
 */
export function validateQuestion(raw: any, qIdx: number, fallbackId: string): ValidationResult<Question> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: `question[${qIdx}] must be an object` };
  }
  if (raw.id !== undefined && !isValidId(raw.id)) return { ok: false, error: `question[${qIdx}].id is invalid` };

  const prompt = cleanText(raw.prompt ?? raw.text, LIMITS.PROMPT_MAX + 1);
  if (!prompt) return { ok: false, error: `question[${qIdx}].prompt is required` };
  if (prompt.length > LIMITS.PROMPT_MAX) {
    return { ok: false, error: `question[${qIdx}].prompt exceeds ${LIMITS.PROMPT_MAX} chars` };
  }

  if (!Array.isArray(raw.options)) return { ok: false, error: `question[${qIdx}].options must be an array` };
  if (raw.options.length < LIMITS.MIN_OPTIONS || raw.options.length > LIMITS.MAX_OPTIONS) {
    return { ok: false, error: `question[${qIdx}] needs ${LIMITS.MIN_OPTIONS}-${LIMITS.MAX_OPTIONS} options` };
  }
  const options: QuestionOption[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < raw.options.length; i++) {
    const r = validateOption(raw.options[i], i, qIdx);
    if (!r.ok) return r as any;
    if (seen.has(r.value.id)) return { ok: false, error: `question[${qIdx}] has duplicate option id ${r.value.id}` };
    seen.add(r.value.id);
    options.push(r.value);
  }

  const q: Question = {
    id: raw.id || fallbackId,
    tenantId: '',
    eventId: '',
    order: 0,
    prompt,
    category: cleanText(raw.category, LIMITS.SHORT_MAX) || 'AUDIENCE_POLL',
    answerType: raw.answerType === 'KNOWLEDGE' ? 'KNOWLEDGE' : 'OPINION_CYOA',
    durationSeconds: clampInt(raw.durationSeconds, 5, 600, 30),
    basePoints: clampInt(raw.basePoints, 0, 10_000, 100),
    maxSpeedBonus: clampInt(raw.maxSpeedBonus, 0, 10_000, 50),
    participationWeight: clampInt(raw.participationWeight, 0, 10_000, 20),
    options,
  };
  const subtitle = optText(raw.subtitle, LIMITS.PROMPT_MAX);
  if (subtitle) q.subtitle = subtitle;
  if (raw.storyPathOutcome && typeof raw.storyPathOutcome === 'object') {
    q.storyPathOutcome = {
      narrative: cleanText(raw.storyPathOutcome.narrative, LIMITS.TEXT_MAX),
      stageTitle: cleanText(raw.storyPathOutcome.stageTitle, LIMITS.PROMPT_MAX),
    };
  }
  return { ok: true, value: q };
}

/** Validates a list of questions; all-or-nothing. */
export function validateQuestionList(
  rawList: unknown,
  maxCount: number,
  idPrefix: string
): ValidationResult<Question[]> {
  if (!Array.isArray(rawList)) return { ok: false, error: 'questions must be an array' };
  if (rawList.length === 0) return { ok: false, error: 'questions must not be empty' };
  if (rawList.length > maxCount) return { ok: false, error: `at most ${maxCount} questions allowed` };
  const out: Question[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < rawList.length; i++) {
    const r = validateQuestion(rawList[i], i, `${idPrefix}_${i}`);
    if (!r.ok) return r as any;
    if (seen.has(r.value.id)) return { ok: false, error: `duplicate question id ${r.value.id}` };
    seen.add(r.value.id);
    out.push(r.value);
  }
  return { ok: true, value: out };
}

export function cleanNickname(v: unknown): string {
  return cleanText(v, LIMITS.NICKNAME_MAX);
}

/** Avatars on the live engine are short emoji/text only (no data URLs). */
export function cleanAvatar(v: unknown): string | undefined {
  const s = cleanText(v, 16);
  return s && !s.includes(':') ? s : undefined;
}

export function cleanColor(v: unknown): string | undefined {
  return typeof v === 'string' && HEX_COLOR_RE.test(v) ? v : undefined;
}
