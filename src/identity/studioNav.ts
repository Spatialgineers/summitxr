import { navigateToSection } from '../immersion/navigation';
import type { HangarTab } from './SgxHangar';

/* Tu Estudio lives on the SGX Pass page. Every "open my Studio" (header chip,
   Reactor rail, email links, terminal…) lands there on the requested tab. */
let pendingTab: HangarTab = 'pass';

export const takeStudioTab = (): HangarTab => pendingTab;

export function openStudioPage(tab: HangarTab = 'pass') {
  pendingTab = tab;
  navigateToSection('CREDENTIAL_GENERATOR');
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('sgx:studio_tab', { detail: { tab } })), 60);
  window.setTimeout(() => document.getElementById('sgx-studio-page')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 160);
}
