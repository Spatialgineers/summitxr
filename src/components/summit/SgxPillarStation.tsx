import React from 'react';
import { ArrowLeft, ArrowRight, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useImmersion } from '../../immersion/ImmersionContext';
import { ScrambleText } from '../../immersion/ScrambleText';
import { SgxBolt } from '../../immersion/SgxSymbols';
import { navigateToPillar, runPillarModule } from '../../immersion/navigation';
import { SGX_PILLARS, SgxPillar, bi, findPillar } from '../../lib/sgxPillars';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { missionsOfPillar } from '../../identity/reactor';
import { goToMission } from '../../identity/missionNav';
import { PILLAR_ACCENT } from '../../identity/sgxIdentity';
import { portfolioOf } from '../../lib/sgxPortfolio';
import { loc } from '../../lib/localize';

const DAYS = {
  1: { es: 'Día 1 · Viernes 11 dic · Digital', en: 'Day 1 · Fri Dec 11 · Digital' },
  2: { es: 'Día 2 · Sábado 12 dic · Día de la Industria', en: 'Day 2 · Sat Dec 12 · Industry Day' },
  3: { es: 'Día 3 · Domingo 13 dic · SGX Showcase', en: 'Day 3 · Sun Dec 13 · SGX Showcase' },
} as const;

const EVENT_START = new Date('2026-12-11T10:00:00-04:00').getTime();

/** The six-pillar selector used at the top of every station. */
export const PillarRail: React.FC<{ active?: string; onPick: (p: SgxPillar) => void }> = ({ active, onPick }) => {
  const { state } = useImmersion();
  return (
    <nav className="sgx-pillar-rail" aria-label="SGX pillars">
      {SGX_PILLARS.map((p) => {
        const isActive = p.slug === active;
        const docked = state.pillars.includes(p.id);
        return (
          <button
            key={p.key}
            type="button"
            className={`sgx-pillar-rail__item ${isActive ? 'is-active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onPick(p)}
            data-sgx-hover
          >
            <span className="sgx-pillar-rail__index">0{p.index}</span>
            <img src={p.iconUrl} alt="" referrerPolicy="no-referrer" />
            <span className="sgx-pillar-rail__name">{p.name.replace('SGX.', '')}</span>
            {docked && !isActive && <span className="sgx-sechud__dot" aria-hidden="true" />}
          </button>
        );
      })}
    </nav>
  );
};

export const SgxPillarStation: React.FC<{ pillarSlug?: string | null }> = ({ pillarSlug }) => {
  const { language } = useLanguage();
  const { state } = useImmersion();
  const pillar = findPillar(pillarSlug) || SGX_PILLARS[0];
  const sgx = useOptionalSgxIdentity();
  const prev = SGX_PILLARS[(pillar.index + 4) % 6];
  const next = SGX_PILLARS[pillar.index % 6];
  const es = language === 'es';

  const sectionModules = pillar.modules.filter((m) => m.kind === 'section');
  const visited = sectionModules.filter((m) => m.kind === 'section' && state.visited.includes(m.key)).length;
  const cells = sectionModules.filter((m) => m.kind === 'section' && state.cells.includes(m.key)).length;
  const daysLeft = Math.max(0, Math.ceil((EVENT_START - Date.now()) / 86400000));

  const go = (p: SgxPillar) => {
    playUiChirp(700);
    navigateToPillar(p.slug);
  };

  const byDay = ([1, 2, 3] as const)
    .map((d) => ({ day: d, slots: pillar.program.filter((s) => s.day === d) }))
    .filter((g) => g.slots.length > 0);

  return (
    <div className="sgx-station" key={pillar.key} style={{ ['--SGX_Yellow' as string]: PILLAR_ACCENT[pillar.key] }}>
      <PillarRail active={pillar.slug} onPick={go} />

      <section className="sgx-station__hero">
        <div className="sgx-hero__bg" aria-hidden="true" />
        <span className="sgx-hero__index" aria-hidden="true">0{pillar.index}</span>
        <span className="sgx-hero__corner sgx-hero__corner--tl" aria-hidden="true" />
        <span className="sgx-hero__corner sgx-hero__corner--br" aria-hidden="true" />

        <div className="sgx-station__emblem" aria-hidden="true">
          <span className="sgx-hero__ring" />
          <img src={pillar.iconUrl} alt="" referrerPolicy="no-referrer" />
        </div>

        <div className="sgx-station__copy">
          <div className="sgx-hero__telemetry">
            <span className="sgx-led sgx-led--action" aria-hidden="true" />
            <span className="sgx-hero__badge">{es ? 'Estación' : 'Station'} 0{pillar.index} / 06</span>
            <span className="sgx-hero__path">{pillar.id} // {bi(pillar.line, language).toUpperCase()}</span>
          </div>
          <h1 className="sgx-station__name"><ScrambleText text={pillar.name.toUpperCase()} /></h1>
          <p className="sgx-station__title">{bi(pillar.title, language)}</p>
          <blockquote className="sgx-station__line">«{bi(pillar.line, language)}»</blockquote>
          <p className="sgx-station__scope">{bi(pillar.scope, language)}</p>
          <div className="sgx-status sgx-station__stats">
            <span className="sgx-readout"><span className="sgx-readout__k">{es ? 'MÓDULOS' : 'MODULES'}</span>{visited}/{sectionModules.length}</span>
            <span className="sgx-readout"><span className="sgx-readout__k">{es ? 'CELDAS' : 'CELLS'}</span>{cells}/{sectionModules.length}</span>
            <span className="sgx-readout"><span className="sgx-readout__k">T-</span>{daysLeft} {es ? 'DÍAS' : 'DAYS'}</span>
          </div>
        </div>
      </section>

      <div className="sgx-station__grid">
        <section className="sgx-station__block" aria-labelledby="station-modules">
          <h2 id="station-modules" className="sgx-station__h2">
            <span>{es ? 'Módulos de la estación' : 'Station modules'}</span>
            <span className="sgx-readout">{pillar.modules.length}</span>
          </h2>
          <div className="sgx-station__modules">
            {pillar.modules.map((m, i) => {
              const Icon = m.icon;
              const key = m.kind === 'section' ? m.key : m.kind === 'page' ? m.page : m.event;
              const seen = m.kind === 'section' && state.visited.includes(m.key);
              const cell = m.kind === 'section' && state.cells.includes(m.key);
              return (
                <button
                  key={key}
                  type="button"
                  className="sgx-module"
                  style={{ ['--sgx-i' as any]: i }}
                  onClick={() => { playUiChirp(820); runPillarModule(m); }}
                  data-sgx-hover
                >
                  <span className="sgx-module__icon"><Icon className="w-5 h-5" /></span>
                  <span className="sgx-module__body">
                    <span className="sgx-module__label">{bi(m.label, language)}</span>
                    <span className="sgx-module__desc">{bi(m.desc, language)}</span>
                  </span>
                  <span className="sgx-module__meta">
                    {cell ? <SgxBolt size={12} /> : seen ? <span className="sgx-sechud__dot" aria-hidden="true" /> : null}
                    <span className="sgx-module__kind">
                      {m.kind === 'section' ? (es ? 'Sección' : 'Section') : m.kind === 'page' ? (es ? 'En vivo' : 'Live') : (es ? 'Herramienta' : 'Tool')}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="sgx-station__block" aria-labelledby="station-program">
          <h2 id="station-program" className="sgx-station__h2">
            <span>{es ? 'En el programa' : 'In the program'}</span>
            <span className="sgx-readout">RUN OF SHOW v2026.10.1</span>
          </h2>
          <ol className="sgx-station__program">
            {byDay.map((g) => (
              <li key={g.day} className="sgx-station__day">
                <span className="sgx-station__day-label">{bi(DAYS[g.day], language)}</span>
                <ul>
                  {g.slots.map((slot) => (
                    <li key={slot.time} className="sgx-station__slot">
                      <span className="sgx-station__time">{slot.time}</span>
                      <span>{bi(slot.label, language)}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
          <p className="sgx-station__note">
            {es
              ? 'Hora de Puerto Rico (AST). El Día 3 no se divide por pilar: aquí ves el bloque más afín. Speakers y artistas se anuncian solo cuando están confirmados por escrito.'
              : 'Puerto Rico time (AST). Day 3 is not split by pillar: this is the closest block. Speakers and artists are announced only once confirmed in writing.'}
          </p>
        </section>
      </div>

      {sgx && (() => {
        const list = missionsOfPillar(sgx.missions, pillar.key);
        const stamped = !!sgx.identity.stamps[`pillar:${pillar.key}`];
        return (
          <section className={`sgx-station__reactor sgx-hangar__pillar ${stamped ? 'is-stamped' : ''}`} style={{ ['--pillar-accent' as string]: PILLAR_ACCENT[pillar.key] }} aria-labelledby="station-reactor">
            <header>
              <SgxBolt size={20} />
              <div>
                <h4 id="station-reactor">{es ? `Reactor · misiones de ${pillar.name}` : `Reactor · ${pillar.name} missions`}</h4>
                <p>{es ? 'Complétalas y este pilar queda sellado en tu SGX Pass.' : 'Finish them and this pillar is stamped on your SGX Pass.'}</p>
              </div>
              <span className="sgx-hangar__stamp">{stamped ? (es ? 'SELLADO' : 'STAMPED') : `${list.filter((m) => sgx.isDone(m.id)).length}/${list.length}`}</span>
            </header>
            <ul>
              {list.map((m) => {
                const ok = sgx.isDone(m.id);
                const copy = es ? m.es : m.en;
                return (
                  <li key={m.id} className={ok ? 'is-done' : ''}>
                    <span className="sgx-hangar__check" aria-hidden="true">{ok ? '◆' : '◇'}</span>
                    <div><strong>{m.secret && !ok ? '???' : copy.title}{m.day3 ? (es ? ' · Día 3' : ' · Day 3') : ''}</strong><small>{copy.hint}</small></div>
                    <span className="sgx-hangar__mxp">+{m.xp}</span>
                    {!ok && m.go && <button type="button" className="sgx-hangar__go" onClick={() => { playUiChirp(760); goToMission(m); }}>{es ? 'Ir' : 'Go'} →</button>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })()}

      {portfolioOf(pillar.key).length > 0 && (
        <section className="sgx-station__portfolio" aria-labelledby="station-portfolio">
          <h2 id="station-portfolio" className="sgx-station__h2">
            <span>{es ? `Proyectos & casos de uso · ${pillar.name}` : `Projects & use cases · ${pillar.name}`}</span>
            <span className="sgx-readout">{portfolioOf(pillar.key).length}</span>
          </h2>
          <ul className="sgx-portfolio">
            {portfolioOf(pillar.key).map((proj) => (
              <li key={proj.id} className={`sgx-portfolio__item ${proj.useCase ? 'is-case' : ''}`}>
                <div className="sgx-portfolio__head">
                  <strong>{loc(proj, 'name', language)}</strong>
                  {proj.useCase && <span className="sgx-portfolio__tag">{es ? 'CASO DE USO' : 'USE CASE'}</span>}
                </div>
                <span className="sgx-portfolio__metric">{loc(proj, 'metric', language)}</span>
                {loc(proj, 'partners', language) && <span className="sgx-portfolio__partners">{loc(proj, 'partners', language)}</span>}
                <p>{loc(proj, 'desc', language)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav className="sgx-station__pager" aria-label={es ? 'Estaciones' : 'Stations'}>
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => go(prev)}>
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>0{prev.index} {prev.name}</span>
        </button>
        <span className="sgx-glow">
          <button type="button" className="sgx-btn" onClick={() => go(next)}>
            <span>{es ? 'Siguiente estación' : 'Next station'} · 0{next.index} {next.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </span>
      </nav>
    </div>
  );
};
