import { navigateToPage, navigateToSection } from '../immersion/navigation';
import type { ReactorMission } from './reactor';

/** Takes the pilot to wherever a Reactor mission is completed. */
export function goToMission(m: ReactorMission) {
  if (!m.go) return;
  if (m.go.event) window.setTimeout(() => window.dispatchEvent(new CustomEvent(m.go!.event!)), 80);
  else if (m.go.page) navigateToPage(m.go.page as Parameters<typeof navigateToPage>[0]);
  else if (m.go.section) navigateToSection(m.go.section);
}
