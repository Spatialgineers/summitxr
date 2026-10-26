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

/** Fires a landing-page modal event; hops to the summit page first if needed. */
export function openSummitModal(eventName: string) {
  if (eventName === 'sgx:open_terminal') {
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
