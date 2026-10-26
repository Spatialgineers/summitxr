import { SECTION_META } from './sections';

export type QuestKind = 'main' | 'side' | 'secret';

export interface QuestDef {
  id: string;
  kind: QuestKind;
  es: { title: string; hint: string };
  en: { title: string; hint: string };
  xp: number;
  /** Progress target; 1 for one-shot quests. */
  target: number;
}

/** Energy cells: one SGX Bolt hidden per section, 13 in total. */
export const TOTAL_CELLS = SECTION_META.length;

export const QUESTS: QuestDef[] = [
  {
    id: 'q_core_boot', kind: 'main', xp: 50, target: 1,
    es: { title: 'Iniciar Sistema', hint: 'Entra al Núcleo 3D y orbita la escena.' },
    en: { title: 'Boot the System', hint: 'Enter the 3D Core and orbit the scene.' },
  },
  {
    id: 'q_explorer', kind: 'main', xp: 150, target: 6,
    es: { title: 'Ruta de Exploración', hint: 'Visita 6 secciones distintas del Summit.' },
    en: { title: 'Exploration Route', hint: 'Visit 6 different Summit sections.' },
  },
  {
    id: 'q_cartographer', kind: 'main', xp: 300, target: SECTION_META.length,
    es: { title: 'Cartógrafo SGX', hint: 'Visita todas las secciones de la plataforma.' },
    en: { title: 'SGX Cartographer', hint: 'Visit every section of the platform.' },
  },
  {
    id: 'q_six_pillars', kind: 'main', xp: 250, target: 6,
    es: { title: 'Los Seis Pilares', hint: 'Entra a las 6 estaciones de pilar (teclas 1 a 6) o acóplalas desde el núcleo 3D.' },
    en: { title: 'The Six Pillars', hint: 'Enter all 6 pillar stations (keys 1 to 6) or dock them from the 3D core.' },
  },
  {
    id: 'q_cells_6', kind: 'side', xp: 120, target: 6,
    es: { title: 'Cazador de Energía', hint: 'Recoge 6 celdas de energía (rayos SGX ocultos).' },
    en: { title: 'Energy Hunter', hint: 'Collect 6 energy cells (hidden SGX bolts).' },
  },
  {
    id: 'q_cells_all', kind: 'side', xp: 400, target: TOTAL_CELLS,
    es: { title: 'Reactor Completo', hint: `Recoge las ${TOTAL_CELLS} celdas, una por sección.` },
    en: { title: 'Full Reactor', hint: `Collect all ${TOTAL_CELLS} cells, one per section.` },
  },
  {
    id: 'q_terminal', kind: 'side', xp: 40, target: 1,
    es: { title: 'Terminal de Mando', hint: 'Abre la terminal con Ctrl+K o la tecla /.' },
    en: { title: 'Command Terminal', hint: 'Open the terminal with Ctrl+K or the / key.' },
  },
  {
    id: 'q_pulse', kind: 'side', xp: 30, target: 5,
    es: { title: 'Pulso SGX', hint: 'Lanza 5 pulsos con la tecla P o el botón PULSO.' },
    en: { title: 'SGX Pulse', hint: 'Fire 5 pulses with the P key or the PULSE button.' },
  },
  {
    id: 'q_overdrive', kind: 'side', xp: 200, target: 1,
    es: { title: 'Overdrive', hint: 'Llena la barra de energía al 100%.' },
    en: { title: 'Overdrive', hint: 'Fill the energy bar to 100%.' },
  },
  {
    id: 'q_stage_mode', kind: 'side', xp: 40, target: 1,
    es: { title: 'Modo Escenario', hint: 'Activa el modo escenario con la tecla F.' },
    en: { title: 'Stage Mode', hint: 'Turn on stage mode with the F key.' },
  },
  {
    id: 'q_secrets', kind: 'secret', xp: 100, target: 3,
    es: { title: 'Códigos de Ingeniería', hint: 'Hay palabras que la terminal reconoce. Pista: saludo boricua.' },
    en: { title: 'Engineering Codes', hint: 'The terminal knows some words. Hint: a Boricua greeting.' },
  },
  {
    id: 'q_konami', kind: 'secret', xp: 250, target: 1,
    es: { title: 'Modo Highgineer', hint: 'Un código clásico de consola. Arriba, arriba…' },
    en: { title: 'Highgineer Mode', hint: 'A classic console code. Up, up…' },
  },
];

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(QUESTS.map((q) => [q.id, q]));

/** Terminal words that count toward q_secrets. Each one pays once. */
export const SECRET_CODES: Record<string, { es: string; en: string; xp: number }> = {
  wepa: { es: '¡Wepa! Esperamos que esté todo bien. Bienvenide al Summit.', en: 'Wepa! Hope all is well. Welcome to the Summit.', xp: 50 },
  highgineer: { es: 'The Highgineer aprueba esta exploración. Visión desbloqueada.', en: 'The Highgineer approves this exploration. Vision unlocked.', xp: 60 },
  lightningfingers: { es: 'Lightning Fingers compiló tu acceso en 0.42 ms.', en: 'Lightning Fingers compiled your access in 0.42 ms.', xp: 60 },
  technocore: { es: 'Frecuencia tecno core sincronizada. #TechnoCore', en: 'Techno core frequency synced. #TechnoCore', xp: 40 },
  borikua: { es: 'Desde Puerto Rico para el mundo.', en: 'From Puerto Rico to the world.', xp: 40 },
};
