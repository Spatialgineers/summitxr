import { SGX_PILLARS } from '../lib/sgxPillars';
import { REACTOR_MISSIONS, missionPlace } from '../identity/reactor';
import { APP_FAQ, type GuideEntry } from './appGuide';
import { COMPANION_DESTINATIONS } from './destinations';

/* The Highbot's backup brain: when Claude is off, paused or out of budget
   (or the Creador has no pass yet), questions are answered here, on the
   device, from the same app guide Claude reads plus the pillars, the
   missions and the map of the app. Plain keyword matching: no network. */

type Lang = 'es' | 'en';

export interface LocalAnswer { text: string; go?: string; matched: boolean }

const STOP = new Set(('a al algo como con cual cuales de del donde el ella en es esa ese eso esta este esto ha hay la las le lo los me mi mis no o para por que se si sin su sus te tu tus un una uno y yo ' +
  'the a an and are can do does for from how i in is it me my of on or the to what where which who why with you your').split(' '));

export const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ\s.-]/g, ' ').replace(/\s+/g, ' ').trim();
const words = (s: string) => norm(s).split(' ').filter((w) => w.length > 1 && !STOP.has(w));

interface Doc { keys: string[]; text: Record<Lang, string>; go?: string; weight: number }

let docs: Doc[] | null = null;

function build(): Doc[] {
  const out: Doc[] = APP_FAQ.map((e: GuideEntry) => ({
    keys: [...e.keys, ...words(e.q.es), ...words(e.q.en)].map(norm),
    text: { es: e.a.es, en: e.a.en }, go: e.go, weight: 1.2,
  }));
  for (const p of SGX_PILLARS) {
    const prog = p.program.map((s) => `Día ${s.day}, ${s.time}: ${s.label.es}`).join(' · ');
    const progEn = p.program.map((s) => `Day ${s.day}, ${s.time}: ${s.label.en}`).join(' · ');
    out.push({
      keys: [norm(p.name), norm(p.key), p.slug, ...words(p.title.es), ...words(p.title.en), ...words(p.scope.es), ...words(p.scope.en)],
      text: {
        es: `${p.name}: ${p.title.es}. "${p.line.es}" Cubre ${p.scope.es.charAt(0).toLowerCase()}${p.scope.es.slice(1)} En el Summit: ${prog}.`,
        en: `${p.name}: ${p.title.en}. "${p.line.en}" It covers ${p.scope.en.charAt(0).toLowerCase()}${p.scope.en.slice(1)} At the Summit: ${progEn}.`,
      },
      go: `pilar-${p.slug}`, weight: 1.1,
    });
  }
  for (const m of REACTOR_MISSIONS) {
    if (m.secret) continue;
    const placeEs = missionPlace(m, true);
    const placeEn = missionPlace(m, false);
    out.push({
      keys: [...words(m.es.title), ...words(m.en.title), ...words(m.es.hint), ...words(m.en.hint), 'mision', 'mission'],
      text: {
        es: `Misión "${m.es.title}" (+${m.xp} XP, ${PILLAR_NAME[m.pillar]}): ${m.es.hint}${placeEs && placeEs !== 'Ir' ? ` Se hace en ${placeEs}.` : ''}`,
        en: `Mission "${m.en.title}" (+${m.xp} XP, ${PILLAR_NAME[m.pillar]}): ${m.en.hint}${placeEn && placeEn !== 'Go' ? ` It is done in ${placeEn}.` : ''}`,
      },
      go: m.go?.section ? COMPANION_DESTINATIONS.find((d) => d.kind === 'section' && d.section === m.go!.section)?.id : undefined,
      weight: 0.9,
    });
  }
  for (const d of COMPANION_DESTINATIONS) {
    out.push({
      keys: [d.id, ...words(d.label), ...words(d.desc)],
      text: { es: `${d.label}: ${d.desc}`, en: `${d.label}: ${d.desc}` },
      go: d.id, weight: 0.8,
    });
  }
  return out;
}

const PILLAR_NAME = Object.fromEntries(SGX_PILLARS.map((p) => [p.key, p.name])) as Record<string, string>;

/** Best local answer, or a friendly "not sure" with the contact. */
export function localAnswer(question: string, lang: Lang): LocalAnswer {
  docs ||= build();
  const q = norm(question);
  const qw = words(question);
  let best: Doc | null = null;
  let bestScore = 0;
  for (const d of docs) {
    let score = 0;
    for (const k of d.keys) {
      if (!k) continue;
      if (k.includes(' ')) { if (q.includes(k)) score += 2.2; continue; }
      if (qw.includes(k)) score += 1;
      else if (k.length > 4 && qw.some((w) => w.length > 4 && (w.startsWith(k.slice(0, 5)) || k.startsWith(w.slice(0, 5))))) score += 0.45;
    }
    score *= d.weight;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  if (!best || bestScore < 0.9) {
    return { text: lang === 'en'
      ? 'That one I answer better once I am fully awake. Meanwhile, ask me about the dates, the SGX Pass, XP, the pillars or where something is in the app, or write to info@spatialgineers.com.'
      : 'Esa te la contesto mejor cuando despierte del todo. Mientras, pregúntame por las fechas, el SGX Pass, el XP, los pilares o dónde está algo en la app, o escríbele al equipo a info@spatialgineers.com.', matched: false };
  }
  return { text: best.text[lang], go: best.go, matched: true };
}

/** Did the Creador ask to be taken somewhere? */
export const wantsToGo = (question: string) => /\b(llevame|lleva|llevar|ir a|ve a|abre|abrir|ensename|donde (esta|queda|veo|hago)|take me|go to|open|show me|where (is|do))\b/.test(norm(question));
