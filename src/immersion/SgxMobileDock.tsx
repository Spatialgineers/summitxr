import React, { useEffect } from 'react';
import { CalendarDays, Cpu, Menu, Orbit, Ticket } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { navigateToSection } from './navigation';

/* Phones get a thumb-reach dock instead of a crowded header: core, the six
   agenda, the SGX Pass, the Reactor and the main menu (pillars, modules and the terminal). */

const fire = (name: string, detail?: unknown) => window.dispatchEvent(new CustomEvent(name, { detail }));

export const SgxMobileDock: React.FC<{ section: string }> = ({ section }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  // While the dock is on screen the header drops its own Menú button (same menu, one place)
  useEffect(() => {
    fire('sgx:dock_presence', { on: true });
    return () => fire('sgx:dock_presence', { on: false });
  }, []);
  const sgx = useOptionalSgxIdentity();
  const tap = (fn: () => void) => () => { playUiChirp(640); fn(); };

  const items = [
    { id: 'core', label: es ? 'Núcleo' : 'Core', icon: Orbit, active: section === 'OVERVIEW', run: () => navigateToSection('OVERVIEW') },
    { id: 'agenda', label: 'Agenda', icon: CalendarDays, active: section === 'AGENDA', run: () => navigateToSection('AGENDA') },
    {
      id: 'pass', label: sgx?.isForged ? (es ? 'Pase' : 'Pass') : (es ? 'Forjar' : 'Forge'), icon: Ticket, active: section === 'CREDENTIAL_GENERATOR', primary: !sgx?.isForged,
      run: () => fire(sgx?.isForged ? 'sgx:open_hangar' : 'sgx:open_forge', { tab: 'pass' }),
    },
    { id: 'reactor', label: 'Reactor', icon: Cpu, active: false, run: () => fire('sgx:open_hangar', { tab: 'reactor' }) },
    { id: 'menu', label: es ? 'Menú' : 'Menu', icon: Menu, active: false, run: () => fire('sgx:open_main_menu') },
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
