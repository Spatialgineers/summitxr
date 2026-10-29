import { useEffect, useState } from 'react';
import { PILLAR_BY_KEY } from '../sgxPillars';
import { makeLiveList, OFFICIAL_BRAND_ASSETS } from '../summitData';

/* Lists that used to be hard-coded and are now editable from the admin (and by
   CSV): keynote polls and the retrospective gallery. Each one
   keeps its bundled defaults until an admin publishes to summit_content. */

/* ---------- keynote polls (summit_content/polls) ---------- */

export interface KeynotePollOption {
  id: string;
  label: string;
  labelEn?: string;
  votes: number;
  color: string;
}

export interface KeynotePoll {
  id: string;
  question: string;
  speaker: string;
  sessionTitle: string;
  questionEn?: string;
  speakerEn?: string;
  sessionTitleEn?: string;
  options: KeynotePollOption[];
  /** Votes are accepted only while the team has it open (Admin → Encuestas). */
  open?: boolean;
}

// Polls tied to the real Run of Show. Speakers are named only when confirmed in writing.
const PILLAR_OPTIONS = [
  { id: 'opt_story', label: 'SGX.Story (lore)', labelEn: 'SGX.Story (lore)', votes: 0, color: PILLAR_BY_KEY['STORY'].color },
  { id: 'opt_showcase', label: 'SGX.Showcase (inmersión)', labelEn: 'SGX.Showcase (immersion)', votes: 0, color: PILLAR_BY_KEY['SHOWCASE'].color },
  { id: 'opt_spark', label: 'SGX.Spark (interactividad y juegos)', labelEn: 'SGX.Spark (interactivity and games)', votes: 0, color: PILLAR_BY_KEY['SPARK'].color },
  { id: 'opt_stage', label: 'SGX.Stage (eventos)', labelEn: 'SGX.Stage (events)', votes: 0, color: PILLAR_BY_KEY['STAGE'].color },
  { id: 'opt_system', label: 'SGX.System (herramientas, IA y backend)', labelEn: 'SGX.System (tools, AI and backend)', votes: 0, color: PILLAR_BY_KEY['SYSTEM'].color },
  { id: 'opt_synthesize', label: 'SGX.Synthesize (todo converge)', labelEn: 'SGX.Synthesize (everything converges)', votes: 0, color: PILLAR_BY_KEY['SYNTHESIZE'].color },
];

export const DEFAULT_POLLS: KeynotePoll[] = [
  {
    id: 'poll_day1_open',
    sessionTitle: 'Día 1 · Apertura',
    sessionTitleEn: 'Day 1 · Opening',
    speaker: 'Danelson Maldonado González',
    question: '¿Qué pilar te mueve más?',
    questionEn: 'Which pillar moves you the most?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day2_industry',
    sessionTitle: 'Día 2 · Día de la Industria',
    sessionTitleEn: 'Day 2 · Industry Day',
    speaker: 'Personas invitadas (por anunciar)',
    speakerEn: 'Guests (TBA)',
    question: '¿Qué conversación de industria quieres escuchar primero?',
    questionEn: 'Which industry conversation do you want to hear first?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
  {
    id: 'poll_day3_showcase',
    sessionTitle: 'Día 3 · SGX Showcase',
    sessionTitleEn: 'Day 3 · SGX Showcase',
    speaker: 'Initiates del SGX Guild',
    speakerEn: 'SGX Guild Initiates',
    question: '¿En qué pilar quieres ver el próximo proyecto de un Initiate?',
    questionEn: 'In which pillar do you want to see an Initiate\'s next project?',
    options: PILLAR_OPTIONS.map((o) => ({ ...o })),
  },
];


export const POLLS = makeLiveList<KeynotePoll>('polls', 'sgx_summit_polls_v1', () => DEFAULT_POLLS);

/* ---------- retrospective gallery (summit_content/gallery) ---------- */

export type GalleryPhoto = (typeof OFFICIAL_BRAND_ASSETS.retrospectiveGallery)[number] & { id: string };

export const GALLERY = makeLiveList<GalleryPhoto>('gallery', 'sgx_summit_gallery_v1', () => OFFICIAL_BRAND_ASSETS.retrospectiveGallery as GalleryPhoto[]);

/** Re-reads a live list whenever the CMS content changes (published or imported). */
export function useLiveList<T>(list: { load(): T[] }): T[] {
  const [items, setItems] = useState<T[]>(() => list.load());
  useEffect(() => {
    const refresh = () => setItems(list.load());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, [list]);
  return items;
}

/* ---------- reactor mission copy & XP (summit_content/mission_overrides) ----------
   Missions are wired to code (what completes them), so the admin can only
   retitle them and change their XP; new missions still need code. */

export interface MissionOverride {
  id: string;
  xp?: number;
  titleEs?: string;
  hintEs?: string;
  titleEn?: string;
  hintEn?: string;
}

export const MISSION_OVERRIDES = makeLiveList<MissionOverride>('mission_overrides', 'sgx_summit_mission_overrides_v1', () => []);

export function applyMissionOverrides<M extends { id: string; xp: number; es: { title: string; hint: string }; en: { title: string; hint: string } }>(missions: M[]): M[] {
  const byId = new Map(MISSION_OVERRIDES.load().map((o) => [o.id, o]));
  return missions.map((m) => {
    const o = byId.get(m.id);
    if (!o) return m;
    return {
      ...m,
      xp: typeof o.xp === 'number' && o.xp >= 0 ? o.xp : m.xp,
      es: { title: o.titleEs || m.es.title, hint: o.hintEs || m.es.hint },
      en: { title: o.titleEn || m.en.title, hint: o.hintEn || m.en.hint },
    };
  });
}
