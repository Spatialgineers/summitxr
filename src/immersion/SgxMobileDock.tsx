import React from 'react';
import { Boxes, Cpu, Orbit, Terminal, Ticket } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { navigateToSection } from './navigation';
import { useImmersion } from './ImmersionContext';

/* Phones get a thumb-reach dock instead of a crowded header: core, the six
   pillars, the SGX Pass, the Reactor and the terminal. */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxMobileDock: React.FC<{ section: string }> = ({ section }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { setTerminalOpen } = useImmersion();
  const sgx = useOptionalSgxIdentity();
  const done = sgx ? sgx.missions.filter((m) => sgx.isDone(m.id)).length : 0;
  const tap = (fn: () => void) => () => { playUiChirp(640); fn(); };

  const items = [
    { id: 'core', label: es ? 'Núcleo' : 'Core', icon: Orbit, active: section === 'OVERVIEW', run: () => navigateToSection('OVERVIEW') },
    { id: 'pillars', label: es ? 'Pilares' : 'Pillars', icon: Boxes, active: section.startsWith('PILLAR'), run: () => fire('sgx:open_main_menu') },
    {
      id: 'pass', label: sgx?.isForged ? (es ? 'Pase' : 'Pass') : (es ? 'Forjar' : 'Forge'), icon: Ticket, active: section === 'CREDENTIAL_GENERATOR', primary: !sgx?.isForged,
      run: () => fire(sgx?.isForged ? 'sgx:open_hangar' : 'sgx:open_forge', { tab: 'pass' }),
    },
    { id: 'reactor', label: sgx ? `${done}/${sgx.missions.length}` : 'Reactor', icon: Cpu, active: false, run: () => fire('sgx:open_hangar', { tab: 'reactor' }) },
    { id: 'term', label: es ? 'Terminal' : 'Terminal', icon: Terminal, active: false, run: () => setTerminalOpen(true) },
  ];

  return (
    <nav className="sgx-dock sgx-calm-hide" aria-label={es ? 'Navegación rápida' : 'Quick navigation'}>
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <button key={it.id} type="button" className={`sgx-dock__item ${it.active ? 'is-active' : ''} ${it.primary ? 'is-primary' : ''}`} onClick={tap(it.run)}>
            <Icon className="w-5 h-5" />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default SgxMobileDock;
