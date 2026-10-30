import React, { useEffect, useState } from 'react';
import { Orbit } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useImmersion } from '../../immersion/ImmersionContext';
import { navigateToPillar, navigateToSection, runPillarModule } from '../../immersion/navigation';
import { SGX_PILLARS, bi, findPillar, pillarOfSection } from '../../lib/sgxPillars';
import { getAppRouteAndSectionFromUrl, getPillarSlugFromUrl } from '../../lib/summitUrlSync';
import { playUiChirp } from '../../lib/cyberAudioEngine';

/** The pillar the visitor is "in" right now: the open station, or the home pillar of the open section. */
function readActivePillar(): string | undefined {
  const parsed = getAppRouteAndSectionFromUrl();
  // The live voting arena is an SGX.Spark module.
  if (parsed.page === 'play') return 'spark';
  if (parsed.page !== 'summit') return undefined;
  if (parsed.summitSection === 'PILLAR') {
    return findPillar(getPillarSlugFromUrl())?.slug || 'story';
  }
  return parsed.summitSection ? pillarOfSection(parsed.summitSection)?.slug : undefined;
}

export function useActivePillar(): string | undefined {
  const [active, setActive] = useState<string | undefined>(() => readActivePillar());
  useEffect(() => {
    const sync = () => setActive(readActivePillar());
    const onSwitch = (e: Event) => {
      const d = (e as CustomEvent<{ section?: string; pillar?: string }>).detail;
      if (!d?.section) return;
      setActive(d.section === 'PILLAR' ? findPillar(d.pillar)?.slug : pillarOfSection(d.section)?.slug);
    };
    window.addEventListener('sgx:route_changed', sync);
    window.addEventListener('popstate', sync);
    window.addEventListener('sgx:switch_summit_section', onSwitch);
    return () => {
      window.removeEventListener('sgx:route_changed', sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener('sgx:switch_summit_section', onSwitch);
    };
  }, []);
  return active;
}

/** Compact always-visible six-pillar navigation for the header (large screens). */
export const HeaderPillarNav: React.FC = () => {
  const active = useActivePillar();
  return (
    <nav className="sgx-hpillars" aria-label="SGX pillars">
      {SGX_PILLARS.map((p) => (
        <button
          key={p.key}
          type="button"
          className={`sgx-hpillars__item ${active === p.slug ? 'is-active' : ''}`}
          aria-current={active === p.slug ? 'page' : undefined}
          onClick={() => { playUiChirp(700); navigateToPillar(p.slug); }}
          title={`${p.name} · ${p.title.es}`}
          data-sgx-hover
        >
          <span className="sgx-hpillars__index">0{p.index}</span>
          <span className="sgx-hpillars__name">{p.name.replace('SGX.', '')}</span>
        </button>
      ))}
    </nav>
  );
};

/** Full directory: the 3D core plus the six pillars and every module inside them. */
export const PillarDirectoryGrid: React.FC<{ onDone: () => void }> = ({ onDone }) => {
  const { language } = useLanguage();
  const { state } = useImmersion();
  const active = useActivePillar();
  const es = language === 'es';

  return (
    <div className="sgx-pdir">
      <button
        type="button"
        className="sgx-pdir__core"
        onClick={() => { playUiChirp(700); onDone(); navigateToSection('OVERVIEW'); }}
        data-sgx-hover
      >
        <Orbit className="w-5 h-5" />
        <span className="sgx-pdir__core-title">{es ? 'Núcleo 3D' : '3D Core'}</span>
        <span className="sgx-pdir__core-desc">{es ? 'Los seis pilares orbitando en un solo espacio. Tecla 0.' : 'The six pillars orbiting in one space. Key 0.'}</span>
      </button>

      <div className="sgx-pdir__grid">
        {SGX_PILLARS.map((p) => (
          <section key={p.key} className={`sgx-pdir__pillar ${active === p.slug ? 'is-active' : ''}`}>
            <button
              type="button"
              className="sgx-pdir__head"
              onClick={() => { playUiChirp(760); onDone(); navigateToPillar(p.slug); }}
              data-sgx-hover
            >
              <span className="sgx-pdir__index">0{p.index}</span>
              <img src={p.iconUrl} alt="" referrerPolicy="no-referrer" />
              <span className="sgx-pdir__names">
                <span className="sgx-pdir__name">{p.name}</span>
                <span className="sgx-pdir__title">{bi(p.title, language)}</span>
              </span>
              {state.pillars.includes(p.id) && <span className="sgx-sechud__dot" aria-label={es ? 'Acoplado' : 'Docked'} />}
            </button>
            <ul className="sgx-pdir__modules">
              {p.modules.map((m) => {
                const Icon = m.icon;
                const key = m.kind === 'section' ? m.key : m.kind === 'page' ? m.page : m.event;
                return (
                  <li key={key}>
                    <button
                      type="button"
                      className="sgx-pdir__module"
                      onClick={() => { playUiChirp(650); onDone(); runPillarModule(m); }}
                      data-sgx-hover
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{bi(m.label, language)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};
