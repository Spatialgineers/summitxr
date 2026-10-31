import { SGX_PILLARS } from '../lib/sgxPillars';
import { SECTION_TO_SLUG } from '../lib/summitUrlSync';

/* Every place the Highbot companion can take a Creador to. Built from the
   pillar modules (lib/sgxPillars), so a new module shows up here on its own.
   The server lists them in the companion's knowledge and as the enum of its
   `ir_a` tool; the client turns the chosen id into a navigation. */

export type StudioTab = 'pass' | 'bot' | 'reactor' | 'stars' | 'rolodex' | 'day3';

export type CompanionDestination = { id: string; label: string; desc: string } & (
  | { kind: 'section'; section: string }
  | { kind: 'pillar'; pillar: string }
  | { kind: 'page'; page: 'play' | 'stage' }
  | { kind: 'studio'; tab: StudioTab }
);

const STUDIO: CompanionDestination[] = [
  { id: 'tu-highbot', kind: 'studio', tab: 'bot', label: 'Tu Estudio · Tu Highbot', desc: 'Donde vive el Highbot del Creador para conversar.' },
  { id: 'reactor', kind: 'studio', tab: 'reactor', label: 'Tu Estudio · Reactor de misiones', desc: 'Las misiones por pilar; cada pilar completo sella el SGX Pass.' },
  { id: 'red', kind: 'studio', tab: 'stars', label: 'Tu Estudio · Red (constelación)', desc: 'Los contactos del Creador como mapa de estrellas.' },
  { id: 'rolodex', kind: 'studio', tab: 'rolodex', label: 'Tu Estudio · Rolodex', desc: 'Los pases escaneados, con exportar a contactos.' },
  { id: 'dia-3', kind: 'studio', tab: 'day3', label: 'Tu Estudio · Día 3', desc: 'Check-in y sellos del Día 3 en Chroma Space Studios.' },
];

function build(): CompanionDestination[] {
  const out: CompanionDestination[] = [
    { id: 'inicio', kind: 'section', section: 'OVERVIEW', label: 'Inicio (núcleo 3D)', desc: 'La portada: el núcleo 3D con los seis pilares.' },
  ];
  for (const p of SGX_PILLARS) {
    out.push({ id: `pilar-${p.slug}`, kind: 'pillar', pillar: p.slug, label: `Página de ${p.name}`, desc: p.scope.es });
  }
  for (const p of SGX_PILLARS) {
    for (const m of p.modules) {
      if (m.kind === 'section') {
        const slug = (SECTION_TO_SLUG as Record<string, string>)[m.key];
        if (!slug || out.some((d) => d.id === slug)) continue;
        out.push({ id: slug, kind: 'section', section: m.key, label: `${m.label.es} (${p.name})`, desc: m.desc.es });
      } else if (m.kind === 'page') {
        out.push({ id: m.page, kind: 'page', page: m.page, label: `${m.label.es} (${p.name})`, desc: m.desc.es });
      }
    }
  }
  return [...out, ...STUDIO];
}

export const COMPANION_DESTINATIONS: CompanionDestination[] = build();

export const destinationById = (id: string) => COMPANION_DESTINATIONS.find((d) => d.id === id);
