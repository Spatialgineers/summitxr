import { getAppRouteAndSectionFromUrl, syncAppUrl } from '../lib/summitUrlSync';
import type { PageRoute } from '../components/common/HeaderNav';
import type { PillarModule } from '../lib/sgxPillars';

/**
 * Navigation helpers shared by the header, the section HUD, the 3D hub, the
 * pillar stations and the command terminal. They reuse the platform's own
 * event bus, so the landing page, header and App stay the single owners of
 * routing state.
 */
export function navigateToSection(section: string, pillarSlug?: string) {
  const { page } = getAppRouteAndSectionFromUrl();
  if (page === 'summit') {
    syncAppUrl({ page: 'summit', section, subtab: pillarSlug, replace: false });
    window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section, pillar: pillarSlug } }));
  } else {
    window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page: 'summit', section, pillar: pillarSlug } }));
  }
}

/** Opens the station page of one pillar (?tab=pillar&subtab=story). */
export function navigateToPillar(slug: string) {
  navigateToSection('PILLAR', slug);
}

export function navigateToPage(page: PageRoute) {
  window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page } }));
}

const GLOBAL_IDENTITY_EVENTS = [
  'sgx:open_forge', 'sgx:open_hangar', 'sgx:open_tickets', 'sgx:open_ticket', 'sgx:open_passport',
  'sgx:open_profile_drawer', 'sgx:open_tour', 'sgx:open_credential_generator',
];

/** Fires a landing-page modal event; hops to the summit page first if needed. */
export function openSummitModal(eventName: string) {
  // The terminal and every SGX Pass surface are global: no need to hop pages.
  if (eventName === 'sgx:open_terminal' || GLOBAL_IDENTITY_EVENTS.includes(eventName)) {
    window.dispatchEvent(new CustomEvent(eventName));
    return;
  }
  if (getAppRouteAndSectionFromUrl().page !== 'summit') {
    navigateToPage('summit');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), 450);
  } else {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

/** Runs whatever a pillar module points at: a section, a page or a modal. */
export function runPillarModule(module: PillarModule) {
  if (module.kind === 'section') navigateToSection(module.key);
  else if (module.kind === 'page') navigateToPage(module.page);
  else openSummitModal(module.event);
}
