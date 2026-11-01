import { useSyncExternalStore } from 'react';
import { askCompanion, type CompanionContext, type CompanionTurn } from './companionApi';
import { goTo, pointAt } from './guide';
import { localAnswer, wantsToGo } from './localKb';

/* One conversation per SGX Pass, shared by every place the Highbot shows up
   (Tu Estudio and the floating head), kept on this device. */

export type CompanionMood = 'idle' | 'thinking' | 'talking' | 'pointing';
export interface ChatTurn extends CompanionTurn { id: string; error?: boolean; sample?: boolean }

interface State { turns: ChatTurn[]; busy: boolean; mood: CompanionMood }

const KEEP = 40;
const SEND = 12;
let owner = '';
let state: State = { turns: [], busy: false, mood: 'idle' };
const subs = new Set<() => void>();
let abort: AbortController | null = null;
let moodTimer = 0;

const storeKey = (code: string) => `sgx_companion_v1:${code}`;
const emit = () => subs.forEach((f) => f());
const set = (patch: Partial<State>) => { state = { ...state, ...patch }; emit(); };
const uid = () => Math.random().toString(36).slice(2, 10);

function save() {
  if (!owner) return;
  try {
    const keep = state.turns.filter((t) => !t.sample && t.text).slice(-KEEP).map(({ role, text, id, error }) => ({ role, text, id, error }));
    localStorage.setItem(storeKey(owner), JSON.stringify(keep));
  } catch { /* storage full or blocked: the chat still works */ }
}

/** Loads the conversation of this pass (or of a visitor without one: ''). */
export function setCompanionOwner(code: string) {
  if (code === owner) return;
  abort?.abort();
  owner = code;
  let turns: ChatTurn[] = [];
  if (code) {
    try {
      const raw = JSON.parse(localStorage.getItem(storeKey(code)) || '[]');
      if (Array.isArray(raw)) turns = raw.filter((t) => t && (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string');
    } catch { /* fresh start */ }
  }
  state = { turns, busy: false, mood: 'idle' };
  emit();
}

/** Current state, outside React. */
export const getCompanionState = (): State => state;

export function useCompanion(): State {
  return useSyncExternalStore(
    (f) => { subs.add(f); return () => subs.delete(f); },
    () => state,
    () => state,
  );
}

function moodFor(m: CompanionMood, ms: number) {
  window.clearTimeout(moodTimer);
  set({ mood: m });
  if (ms > 0) moodTimer = window.setTimeout(() => set({ mood: state.busy ? 'talking' : 'idle' }), ms);
}

const NOTICE: Record<string, { es: string; en: string }> = {
  NO_PASS: {
    es: 'No encuentro tu SGX Pass en esta cuenta de Google. Conéctate con la cuenta que tiene el mismo email de tu pase, o pon tu email de Google en el pase desde Tu Estudio.',
    en: 'I cannot find your SGX Pass on this Google account. Sign in with the account that has your pass email, or put your Google email on the pass from Your Studio.',
  },
  NEED_GOOGLE: {
    es: 'Para hablar conmigo conecta tu cuenta de Google en Tu Estudio. Así tu progreso queda guardado y yo sé que eres tú.',
    en: 'To talk to me, connect your Google account in Your Studio. Your progress stays saved and I know it is you.',
  },
  NO_ACCOUNT: {
    es: 'Estoy conectándome a tu cuenta. Dame un segundo y vuelve a intentarlo.',
    en: 'I am connecting to your account. Give me a second and try again.',
  },
  COMPANION_OFF: { es: 'Todavía estoy despertando. Muy pronto podrás hablar conmigo.', en: 'I am still waking up. Very soon you will be able to talk to me.' },
  NETWORK: { es: 'Parece que no hay conexión. Inténtalo otra vez en un momento.', en: 'Looks like you are offline. Try again in a moment.' },
};

export function askHighbot(question: string, ctx: CompanionContext, pass: { email: string; code: string }) {
  const q = question.trim().slice(0, 600);
  if (!q || state.busy) return;
  const history: CompanionTurn[] = state.turns.filter((t) => !t.error && !t.sample && t.text).slice(-(SEND - 1)).map(({ role, text }) => ({ role, text }));
  const answer: ChatTurn = { id: uid(), role: 'assistant', text: '' };
  set({ turns: [...state.turns, { id: uid(), role: 'user', text: q }, answer], busy: true });
  moodFor('thinking', 0);
  abort = new AbortController();
  const patchAnswer = (fn: (t: ChatTurn) => ChatTurn) => set({ turns: state.turns.map((t) => (t.id === answer.id ? fn(t) : t)) });
  // A pass forged a moment ago may not be on the server yet: one quiet retry.
  const run = (attempt: number) => askCompanion({ messages: [...history, { role: 'user', text: q }], context: ctx, email: pass.email, code: pass.code }, {
    onText: (t) => {
      if (state.mood !== 'talking' && state.mood !== 'pointing') moodFor('talking', 0);
      patchAnswer((a) => ({ ...a, text: a.text + t }));
    },
    onAction: (a) => {
      moodFor('pointing', 1600);
      if (a.type === 'ir_a') window.setTimeout(() => goTo(a.id), 450);
      else pointAt(a.id, ctx.lang === 'en' ? 'Here' : 'Aquí');
    },
    onEnd: (err) => {
      if (err?.code === 'NO_PASS' && attempt === 0 && abort && !abort.signal.aborted) {
        window.setTimeout(() => { if (abort && !abort.signal.aborted) run(1); }, 3500);
        return;
      }
      abort = null;
      // Claude is off, paused, busy, out of budget or unreachable: the backup brain answers
      if (err && (FALLBACK.has(err.code) || /^HTTP_5/.test(err.code)) && !state.turns.find((t) => t.id === answer.id)?.text) {
        const local = localAnswer(q, ctx.lang);
        const note = err.message || NOTICE[err.code]?.[ctx.lang] || '';
        const lead = ctx.lang === 'en' ? 'Meanwhile, this I can tell you:' : 'Mientras, esto sí te lo puedo decir:';
        patchAnswer((a) => ({ ...a, sample: true, text: local.matched ? `${note ? `${note} ${lead}\n\n` : ''}${local.text}` : (note || local.text) }));
        set({ busy: false });
        if (local.matched && local.go && wantsToGo(q)) window.setTimeout(() => goTo(local.go!), 700);
        moodFor('talking', 1400);
        save();
        return;
      }
      if (err && err.code !== 'ABORTED') {
        const n = NOTICE[err.code];
        const text = err.message || (n ? n[ctx.lang] : (ctx.lang === 'en' ? 'My wires got crossed. Try again in a moment.' : 'Se me cruzaron los cables. Inténtalo de nuevo en un momento.'));
        patchAnswer((a) => ({ ...a, text: a.text ? `${a.text}\n\n${text}` : text, error: !a.text }));
      }
      set({ busy: false, turns: state.turns.filter((t) => t.id !== answer.id || t.text) });
      if (state.mood !== 'pointing') moodFor('talking', 1400);
      save();
    },
  }, abort!.signal);
  run(0);
}

const FALLBACK = new Set(['COMPANION_OFF', 'PAUSED', 'BUSY', 'DAILY', 'BUDGET', 'NETWORK', 'PASS_CHECK_UNAVAILABLE', 'UPSTREAM', 'SERVER', 'HTTP']);

/** Without Claude (no pass, no Google, or the server off): answered on the device from the app guide. */
export function localReply(question: string, lang: 'es' | 'en') {
  const q = question.trim().slice(0, 600);
  if (!q || state.busy) return;
  const local = localAnswer(q, lang);
  sampleAnswer(q, local.text);
  if (local.matched && local.go && wantsToGo(q)) window.setTimeout(() => goTo(local.go!), 900);
}

/** Visitors without a pass: a canned answer, no call to the server. */
export function sampleAnswer(q: string, a: string) {
  if (state.busy) return;
  const answer: ChatTurn = { id: uid(), role: 'assistant', text: '', sample: true };
  set({ turns: [...state.turns, { id: uid(), role: 'user', text: q, sample: true }, answer], busy: true });
  moodFor('talking', 0);
  const words = a.split(/(\s+)/);
  // time-based, ~0.9 s whatever the length: on a busy page (timers late) it still ends on the next tick
  const start = Date.now();
  const step = () => {
    const i = Math.min(words.length, Math.max(3, Math.ceil(((Date.now() - start) / 900) * words.length)));
    set({ turns: state.turns.map((t) => (t.id === answer.id ? { ...t, text: words.slice(0, i).join('') } : t)) });
    if (i < words.length) window.setTimeout(step, 40);
    else { set({ busy: false }); moodFor('talking', 1200); }
  };
  step();
}

export function clearCompanion() {
  abort?.abort();
  state = { turns: [], busy: false, mood: 'idle' };
  save();
  emit();
}
