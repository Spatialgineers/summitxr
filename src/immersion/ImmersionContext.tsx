import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { playScanSuccessSound, playUiChirp, playCyberBurstSound, getIsAudioMuted } from '../lib/cyberAudioEngine';
import { recordEvent } from '../lib/telemetry';
import { QUESTS, QUEST_BY_ID, SECRET_CODES, TOTAL_CELLS } from './quests';
import { SECTION_META, normalizePillarId, ALL_PILLARS } from './sections';

/* =========================================================================
   SGX IMMERSION ENGINE
   One place for the platform-wide game layer: quests, energy cells, the
   energy / overdrive meter, pulses, stage mode and HUD toasts. XP is paid
   through PilotProfileContext.recordActivity so it lands in the same
   profile, leaderboard and activity log as every other mechanic.
   ========================================================================= */

const STATE_KEY = 'sgx_immersion_v1';
const SETTINGS_KEY = 'sgx_immersion_settings_v1';
const OVERDRIVE_MS = 12000;
const PULSE_COOLDOWN_MS = 900;

interface PersistedState {
  visited: string[];
  pillars: string[];
  cells: string[];
  secrets: string[];
  progress: Record<string, number>;
  done: Record<string, number>;
  energy: number;
}

export interface ImmersionSettings {
  /** Visual FX: atmosphere, reticle, warp, energy cells. */
  fx: boolean;
  /** UI hover/click sounds (the global mute still wins). */
  sfx: boolean;
}

export type ToastTone = 'action' | 'telemetry' | 'alert';

export interface HudToast {
  id: string;
  tag: string;
  title: string;
  detail?: string;
  xp?: number;
  tone: ToastTone;
}

interface ImmersionContextValue {
  state: PersistedState;
  settings: ImmersionSettings;
  setSettings: (patch: Partial<ImmersionSettings>) => void;
  toasts: HudToast[];
  dismissToast: (id: string) => void;
  pushToast: (t: Omit<HudToast, 'id'>) => void;
  overdrive: boolean;
  stageMode: boolean;
  toggleStageMode: () => void;
  terminalOpen: boolean;
  setTerminalOpen: (open: boolean) => void;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  markVisited: (sectionKey: string) => void;
  markPillar: (pillarId: string) => void;
  collectCell: (sectionKey: string) => boolean;
  addEnergy: (amount: number) => void;
  firePulse: (x?: number, y?: number) => boolean;
  completeQuest: (questId: string) => void;
  tryCode: (code: string) => 'new' | 'repeat' | null;
  questProgress: (questId: string) => { value: number; target: number; done: boolean };
  completedCount: number;
  resetProgress: () => void;
}

const EMPTY_STATE: PersistedState = {
  visited: [], pillars: [], cells: [], secrets: [], progress: {}, done: {}, energy: 0,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/** Progress of the quests whose value is derived from collections. */
function derivedProgress(s: PersistedState): Record<string, number> {
  const sectionKeys = new Set(SECTION_META.map((m) => m.key));
  const visitedSections = s.visited.filter((v) => sectionKeys.has(v as any)).length;
  return {
    q_explorer: visitedSections,
    q_cartographer: visitedSections,
    q_six_pillars: s.pillars.filter((p) => ALL_PILLARS.includes(p as any)).length,
    q_cells_6: s.cells.length,
    q_cells_all: s.cells.length,
    q_secrets: s.secrets.length,
  };
}

export function haptic(pattern: number | number[]) {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {}
}

const ImmersionContext = createContext<ImmersionContextValue | undefined>(undefined);

export const ImmersionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { recordActivity, profile } = usePilotProfile();
  const { language } = useLanguage();
  const lang = language === 'es' ? 'es' : 'en';

  const [state, setState] = useState<PersistedState>(() => loadJson(STATE_KEY, EMPTY_STATE));
  const stateRef = useRef(state);
  const [settings, setSettingsState] = useState<ImmersionSettings>(() =>
    loadJson(SETTINGS_KEY, { fx: !prefersReducedMotion(), sfx: true }),
  );
  const [toasts, setToasts] = useState<HudToast[]>([]);
  const [overdriveUntil, setOverdriveUntil] = useState(0);
  const [stageMode, setStageMode] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const lastPulseRef = useRef(0);
  const langRef = useRef(lang);
  langRef.current = lang;
  const overdriveRef = useRef(false);
  overdriveRef.current = overdriveUntil > Date.now();

  const setSettings = useCallback((patch: Partial<ImmersionSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      saveJson(SETTINGS_KEY, next);
      return next;
    });
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback((t: Omit<HudToast, 'id'>) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    window.setTimeout(() => dismissToast(id), 4800);
  }, [dismissToast]);

  /**
   * Applies a mutation, then pays out any quest it completed. Side effects run
   * outside setState so StrictMode's double-invoked updaters can't pay twice.
   */
  const commit = useCallback((mutate: (draft: PersistedState) => void) => {
    const prev = stateRef.current;
    const draft: PersistedState = {
      ...prev,
      visited: [...prev.visited],
      pillars: [...prev.pillars],
      cells: [...prev.cells],
      secrets: [...prev.secrets],
      progress: { ...prev.progress },
      done: { ...prev.done },
    };
    mutate(draft);
    Object.assign(draft.progress, derivedProgress(draft));

    const newlyDone: string[] = [];
    for (const q of QUESTS) {
      if (draft.done[q.id]) continue;
      if ((draft.progress[q.id] || 0) >= q.target) {
        draft.done[q.id] = Date.now();
        newlyDone.push(q.id);
      }
    }
    if (newlyDone.length) draft.energy = Math.min(100, draft.energy + 10 * newlyDone.length);

    stateRef.current = draft;
    setState(draft);
    saveJson(STATE_KEY, draft);

    newlyDone.forEach((id, i) => {
      const q = QUEST_BY_ID[id];
      const copy = q[langRef.current];
      window.setTimeout(() => {
        recordActivity('quest_complete', `${langRef.current === 'es' ? 'Misión' : 'Quest'}: ${copy.title}`, copy.hint, q.xp, '#FDCC0D');
        pushToast({
          tag: q.kind === 'secret' ? (langRef.current === 'es' ? 'SECRETO' : 'SECRET') : (langRef.current === 'es' ? 'MISIÓN COMPLETA' : 'QUEST COMPLETE'),
          title: copy.title,
          detail: copy.hint,
          xp: q.xp,
          tone: 'action',
        });
        playScanSuccessSound();
        haptic([30, 40, 60]);
        recordEvent('immersion', 'quest_complete', { questId: id });
        window.dispatchEvent(new CustomEvent('sgx:quest_complete', { detail: { questId: id } }));
      }, i * 650);
    });
    return newlyDone;
  }, [pushToast, recordActivity]);

  const addEnergy = useCallback((amount: number) => {
    if (overdriveRef.current) return;
    const current = stateRef.current.energy;
    const next = current + amount;
    if (next >= 100) {
      commit((d) => {
        d.energy = 0;
        d.progress.q_overdrive = 1;
      });
      setOverdriveUntil(Date.now() + OVERDRIVE_MS);
      pushToast({
        tag: 'OVERDRIVE',
        title: langRef.current === 'es' ? 'Reactor al 100%' : 'Reactor at 100%',
        detail: langRef.current === 'es' ? 'XP doble en celdas por 12 segundos.' : 'Double XP on cells for 12 seconds.',
        tone: 'alert',
      });
      playCyberBurstSound('quantum');
      haptic([60, 40, 60, 40, 120]);
      window.dispatchEvent(new CustomEvent('sgx:overdrive', { detail: { durationMs: OVERDRIVE_MS } }));
    } else {
      // Energy ticks are frequent: skip the commit pipeline, just persist.
      const draft = { ...stateRef.current, energy: Math.max(0, next) };
      stateRef.current = draft;
      setState(draft);
      saveJson(STATE_KEY, draft);
    }
  }, [commit, pushToast]);

  // Overdrive timer + body class so CSS can light the whole UI.
  useEffect(() => {
    if (!overdriveUntil) return;
    document.body.classList.add('sgx-overdrive');
    const t = window.setTimeout(() => {
      setOverdriveUntil(0);
      document.body.classList.remove('sgx-overdrive');
    }, Math.max(0, overdriveUntil - Date.now()));
    return () => window.clearTimeout(t);
  }, [overdriveUntil]);

  const markVisited = useCallback((sectionKey: string) => {
    if (stateRef.current.visited.includes(sectionKey)) return;
    commit((d) => { d.visited.push(sectionKey); });
  }, [commit]);

  const markPillar = useCallback((raw: string) => {
    const id = normalizePillarId(raw);
    if (!id || stateRef.current.pillars.includes(id)) return;
    commit((d) => { d.pillars.push(id); });
  }, [commit]);

  const collectCell = useCallback((sectionKey: string) => {
    if (stateRef.current.cells.includes(sectionKey)) return false;
    const doubled = overdriveRef.current;
    const xp = doubled ? 80 : 40;
    commit((d) => { d.cells.push(sectionKey); });
    const count = stateRef.current.cells.length;
    recordActivity('energy_cell', `${langRef.current === 'es' ? 'Celda de energía' : 'Energy cell'} ${count}/${TOTAL_CELLS}`, sectionKey, xp, '#FDCC0D');
    pushToast({
      tag: langRef.current === 'es' ? 'CELDA' : 'CELL',
      title: `${count}/${TOTAL_CELLS} ${langRef.current === 'es' ? 'celdas de energía' : 'energy cells'}`,
      detail: doubled ? 'OVERDRIVE x2' : undefined,
      xp,
      tone: 'telemetry',
    });
    playScanSuccessSound();
    haptic([20, 30, 40]);
    recordEvent('immersion', 'energy_cell', { sectionKey, count });
    addEnergy(15);
    return true;
  }, [addEnergy, commit, pushToast, recordActivity]);

  const firePulse = useCallback((x?: number, y?: number) => {
    const now = Date.now();
    if (now - lastPulseRef.current < PULSE_COOLDOWN_MS) return false;
    lastPulseRef.current = now;
    commit((d) => { d.progress.q_pulse = Math.min(QUEST_BY_ID.q_pulse.target, (d.progress.q_pulse || 0) + 1); });
    window.dispatchEvent(new CustomEvent('sgx:pulse', {
      detail: { x: x ?? window.innerWidth / 2, y: y ?? window.innerHeight / 2 },
    }));
    playCyberBurstSound('spark');
    haptic(25);
    addEnergy(4);
    return true;
  }, [addEnergy, commit]);

  const completeQuest = useCallback((questId: string) => {
    const q = QUEST_BY_ID[questId];
    if (!q || stateRef.current.done[questId]) return;
    commit((d) => { d.progress[questId] = q.target; });
  }, [commit]);

  const tryCode = useCallback((raw: string): 'new' | 'repeat' | null => {
    const code = raw.toLowerCase().replace(/[\s_.-]+/g, '');
    const secret = SECRET_CODES[code];
    if (!secret) return null;
    if (stateRef.current.secrets.includes(code)) return 'repeat';
    commit((d) => { d.secrets.push(code); });
    recordActivity('quest_complete', `Código: ${code.toUpperCase()}`, secret[langRef.current], secret.xp, '#00DDFF');
    pushToast({ tag: langRef.current === 'es' ? 'CÓDIGO' : 'CODE', title: code.toUpperCase(), detail: secret[langRef.current], xp: secret.xp, tone: 'telemetry' });
    addEnergy(12);
    return 'new';
  }, [addEnergy, commit, pushToast, recordActivity]);

  const toggleStageMode = useCallback(() => {
    const el = document.documentElement as any;
    const isFs = !!document.fullscreenElement;
    if (!stageMode) {
      setStageMode(true);
      completeQuest('q_stage_mode');
      if (!isFs && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    } else {
      setStageMode(false);
      if (isFs && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  }, [completeQuest, stageMode]);

  // Leaving fullscreen with the browser's own Esc also leaves stage mode.
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setStageMode(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    document.body.toggleAttribute('data-sgx-stage', stageMode);
  }, [stageMode]);

  // Level-up fanfare: watch the pilot level the profile already computes.
  const lastLevelRef = useRef<number | null>(null);
  const levelReadyAt = useRef(Date.now() + 3000);
  useEffect(() => {
    const lvl = profile?.level ?? 1;
    if (lastLevelRef.current !== null && lvl > lastLevelRef.current && Date.now() > levelReadyAt.current) {
      pushToast({
        tag: 'LEVEL UP',
        title: `${langRef.current === 'es' ? 'Nivel' : 'Level'} ${lvl}`,
        detail: profile.rankTitle,
        tone: 'action',
      });
      if (!getIsAudioMuted()) playUiChirp(660, 'triangle', 0.25);
      haptic([40, 30, 40, 30, 160]);
      window.dispatchEvent(new CustomEvent('sgx:level_up', { detail: { level: lvl } }));
    }
    lastLevelRef.current = lvl;
  }, [profile?.level, profile?.rankTitle, pushToast]);

  const questProgress = useCallback((questId: string) => {
    const q = QUEST_BY_ID[questId];
    const s = stateRef.current;
    return {
      value: Math.min(q?.target ?? 1, s.progress[questId] || 0),
      target: q?.target ?? 1,
      done: !!s.done[questId],
    };
    // state in deps so consumers re-render with fresh numbers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const resetProgress = useCallback(() => {
    stateRef.current = EMPTY_STATE;
    setState(EMPTY_STATE);
    saveJson(STATE_KEY, EMPTY_STATE);
  }, []);

  const value = useMemo<ImmersionContextValue>(() => ({
    state,
    settings,
    setSettings,
    toasts,
    dismissToast,
    pushToast,
    overdrive: overdriveUntil > Date.now(),
    stageMode,
    toggleStageMode,
    terminalOpen,
    setTerminalOpen,
    panelOpen,
    setPanelOpen,
    markVisited,
    markPillar,
    collectCell,
    addEnergy,
    firePulse,
    completeQuest,
    tryCode,
    questProgress,
    completedCount: Object.keys(state.done).length,
    resetProgress,
  }), [state, settings, setSettings, toasts, dismissToast, pushToast, overdriveUntil, stageMode, toggleStageMode,
    terminalOpen, panelOpen, markVisited, markPillar, collectCell, addEnergy, firePulse, completeQuest, tryCode,
    questProgress, resetProgress]);

  return <ImmersionContext.Provider value={value}>{children}</ImmersionContext.Provider>;
};

export function useImmersion(): ImmersionContextValue {
  const ctx = useContext(ImmersionContext);
  if (!ctx) throw new Error('useImmersion must be used inside ImmersionProvider');
  return ctx;
}
