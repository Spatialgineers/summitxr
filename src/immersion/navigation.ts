import { getAppRouteAndSectionFromUrl, syncAppUrl } from '../lib/summitUrlSync';
import type { PageRoute } from '../components/common/HeaderNav';

/**
 * Navigation helpers for the immersion layer. They reuse the platform's own
 * event bus, so the landing page, header and App stay the single owners of
 * routing state.
 */
export function navigateToSection(section: string) {
  const { page } = getAppRouteAndSectionFromUrl();
  if (page === 'summit') {
    syncAppUrl({ page: 'summit', section, replace: false });
    window.dispatchEvent(new CustomEvent('sgx:switch_summit_section', { detail: { section } }));
  } else {
    window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page: 'summit', section } }));
  }
}

export function navigateToPage(page: PageRoute) {
  window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page } }));
}
