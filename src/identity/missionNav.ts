import { navigateToPage, navigateToSection } from '../immersion/navigation';
import type { ReactorMission } from './reactor';

/** Takes the pilot to wherever a Reactor mission is completed. */
export function goToMission(m: ReactorMission) {
  if (!m.go) return;
  if (m.go.event) window.setTimeout(() => window.dispatchEvent(new CustomEvent(m.go!.event!, { detail: m.go!.detail })), 80);
  else if (m.go.page) navigateToPage(m.go.page as Parameters<typeof navigateToPage>[0]);
  else if (m.go.section) navigateToSection(m.go.section);
}

const PLACE: Record<string, [string, string]> = {
  PILLARS_MANIFESTO: ['Manifiesto', 'Manifesto'],
  MAP_360: ['Tour 360°', '360° tour'],
  SPONSORS_HUB: ['Partners', 'Partners'],
  EMBEDS_GAMES: ['Juegos', 'Games'],
  AGENDA: ['Agenda', 'Agenda'],
  BROADCAST_ROOMS: ['Salas', 'Rooms'],
  SPEAKERS: ['Line-up', 'Line-up'],
  OVERVIEW: ['Núcleo 3D', '3D core'],
  VISITS: ['Radar', 'Radar'],
  ENTREPRENEUR_MATCH: ['SGX.Match', 'SGX.Match'],
  'sgx:open_forge': ['Forja', 'Forge'],
  'sgx:open_avatar': ['Tu Highbot', 'Your Highbot'],
  'sgx:open_terminal': ['Terminal', 'Terminal'],
  'sgx:open_credential_generator': ['Holo Card', 'Holo Card'],
  'sgx:open_qr_scanner': ['Escáner QR', 'QR scanner'],
  'sgx:open_hangar': ['Tu Estudio', 'Your Studio'],
  'sgx:open_brand_showcase': ['Showcase', 'Showcase'],
};

/** Where a mission is done, for its button ("Agenda →"); null when it has no single place. */
export function missionPlace(m: ReactorMission, es: boolean): string | null {
  const key = m.go?.event || m.go?.section || m.go?.page;
  const hit = key ? PLACE[key] : undefined;
  if (hit) return es ? hit[0] : hit[1];
  return key ? (es ? 'Ir' : 'Go') : null;
}
