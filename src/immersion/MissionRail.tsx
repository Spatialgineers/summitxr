import React, { useEffect, useState } from 'react';
import { useImmersion } from './ImmersionContext';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { getIsAudioMuted, toggleAudioMute } from '../lib/cyberAudioEngine';
import { QUESTS, TOTAL_CELLS } from './quests';
import { SECTION_META } from './sections';
import { SgxBolt } from './SgxSymbols';

const COPY = {
  es: {
    rail: 'Misiones', title: 'Control de Misión', close: 'Cerrar', energy: 'Energía', cells: 'Celdas de energía',
    cellsHint: 'Hay un rayo SGX escondido en cada sección. Aparece cerca de los bordes unos segundos después de llegar.',
    main: 'Main Quests', side: 'Side Quests', secret: 'Secretos', terminal: 'Terminal', pulse: 'Pulso', stage: 'Escenario',
    sound: 'Sonido', keys: 'Atajos', overdrive: 'OVERDRIVE ACTIVO',
  },
  en: {
    rail: 'Quests', title: 'Mission Control', close: 'Close', energy: 'Energy', cells: 'Energy cells',
    cellsHint: 'There is an SGX bolt hidden in every section. It shows up near the edges a few seconds after you arrive.',
    main: 'Main Quests', side: 'Side Quests', secret: 'Secrets', terminal: 'Terminal', pulse: 'Pulse', stage: 'Stage',
    sound: 'Sound', keys: 'Shortcuts', overdrive: 'OVERDRIVE ACTIVE',
  },
};

function useFps(active: boolean): number {
  const [fps, setFps] = useState(0);
  useEffect(() => {
    if (!active) return;
    let frames = 0;
    let last = performance.now();
    let raf = requestAnimationFrame(function tick(now) {
      frames++;
      if (now - last >= 1000) {
        setFps(Math.round((frames * 1000) / (now - last)));
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [active]);
  return fps;
}

/** Right-edge HUD rail with the collapsible mission-control panel. */
export const MissionRail: React.FC = () => {
  const {
    state, settings, setSettings, overdrive, completedCount, panelOpen, setPanelOpen,
    setTerminalOpen, firePulse, toggleStageMode, questProgress,
  } = useImmersion();
  const { language } = useLanguage();
  const { profile } = usePilotProfile();
  const c = language === 'es' ? COPY.es : COPY.en;
  const lang = language === 'es' ? 'es' : 'en';
  const fps = useFps(panelOpen);
  const [muted, setMuted] = useState(getIsAudioMuted());

  useEffect(() => {
    const onMute = (e: Event) => setMuted(!!(e as CustomEvent<{ muted: boolean }>).detail?.muted);
    window.addEventListener('sgx:audio_mute_changed', onMute);
    return () => window.removeEventListener('sgx:audio_mute_changed', onMute);
  }, []);

  const energy = overdrive ? 100 : Math.round(state.energy);

  const renderGroup = (kind: 'main' | 'side' | 'secret', label: string) => (
    <section className="sgx-mission__group">
      <h3 className="sgx-mission__group-title">{label}</h3>
      <ul className="sgx-mission__list">
        {QUESTS.filter((q) => q.kind === kind).map((q) => {
          const p = questProgress(q.id);
          const copy = q[lang];
          const hidden = kind === 'secret' && !p.done && p.value === 0;
          return (
            <li key={q.id} className={`sgx-quest ${p.done ? 'is-done' : ''}`}>
              <span className="sgx-quest__check" aria-hidden="true">{p.done ? <SgxBolt size={10} /> : null}</span>
              <span className="sgx-quest__text">
                <span className="sgx-quest__title">{hidden ? '???' : copy.title}</span>
                <span className="sgx-quest__hint">{copy.hint}</span>
              </span>
              <span className="sgx-quest__meta">
                {p.target > 1 && <span className="sgx-readout">{p.value}/{p.target}</span>}
                <span className="sgx-quest__xp">+{q.xp} XP</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <>
      <button
        type="button"
        className={`sgx-rail ${overdrive ? 'is-overdrive' : ''}`}
        onClick={() => setPanelOpen(!panelOpen)}
        aria-expanded={panelOpen}
        aria-controls="sgx-mission-panel"
        data-sgx-hover
      >
        <span className={`sgx-led ${overdrive ? 'sgx-led--alert' : 'sgx-led--action'}`} aria-hidden="true" />
        <span className="sgx-rail__label">{c.rail}</span>
        <span className="sgx-rail__count">{completedCount}/{QUESTS.length}</span>
        <span className="sgx-rail__meter" aria-label={`${c.energy} ${energy}%`}>
          <span style={{ transform: `scaleY(${energy / 100})` }} />
        </span>
      </button>

      {panelOpen && (
        <aside id="sgx-mission-panel" className="sgx-mission sgx-panel sgx-panel--solid" aria-label={c.title}>
          <header className="sgx-mission__head">
            <h2 className="sgx-panel__title">{c.title}</h2>
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setPanelOpen(false)}>{c.close}</button>
          </header>

          <div className="sgx-status sgx-mission__telemetry">
            <span className="sgx-readout"><span className="sgx-readout__k">XP</span>{profile.totalXp.toLocaleString()}</span>
            <span className="sgx-readout"><span className="sgx-readout__k">LVL</span>{profile.level}</span>
            <span className="sgx-readout"><span className="sgx-readout__k">FPS</span>{fps || '--'}</span>
            <span className="sgx-mission__rank">{profile.rankTitle}</span>
          </div>

          <div className="sgx-field sgx-mission__energy">
            <span className="sgx-field__label">{overdrive ? c.overdrive : c.energy}</span>
            <span className="sgx-field__value">{energy}%</span>
            <span className={`sgx-meter ${overdrive ? 'is-overdrive' : ''}`}><span style={{ transform: `scaleX(${energy / 100})` }} /></span>
          </div>

          <div className="sgx-mission__cells">
            <div className="sgx-field">
              <span className="sgx-field__label">{c.cells}</span>
              <span className="sgx-field__value">{state.cells.length}/{TOTAL_CELLS}</span>
            </div>
            <div className="sgx-mission__cell-grid" aria-hidden="true">
              {SECTION_META.map((s) => (
                <span key={s.key} className={`sgx-mission__cell ${state.cells.includes(s.key) ? 'is-on' : ''}`} title={s[lang]}>
                  {state.cells.includes(s.key) && <SgxBolt size={12} />}
                </span>
              ))}
            </div>
            <p className="sgx-mission__note">{c.cellsHint}</p>
          </div>

          {renderGroup('main', c.main)}
          {renderGroup('side', c.side)}
          {renderGroup('secret', c.secret)}

          <div className="sgx-mission__actions">
            <span className="sgx-glow"><button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { setPanelOpen(false); setTerminalOpen(true); }}>{c.terminal} · K</button></span>
            <span className="sgx-glow"><button type="button" className="sgx-btn sgx-btn--sm" onClick={() => firePulse()}>{c.pulse} · P</button></span>
            <span className="sgx-glow"><button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={toggleStageMode}>{c.stage} · F</button></span>
            <button type="button" className="sgx-btn sgx-btn--sm" aria-pressed={settings.fx} onClick={() => setSettings({ fx: !settings.fx })}>FX {settings.fx ? 'ON' : 'OFF'}</button>
            <button type="button" className="sgx-btn sgx-btn--sm" aria-pressed={settings.sfx} onClick={() => setSettings({ sfx: !settings.sfx })}>SFX {settings.sfx ? 'ON' : 'OFF'}</button>
            <button type="button" className="sgx-btn sgx-btn--sm" aria-pressed={!muted} onClick={() => setMuted(toggleAudioMute())}>{c.sound} · M {muted ? 'OFF' : 'ON'}</button>
          </div>

          <p className="sgx-mission__keys">
            <span className="sgx-field__label">{c.keys}</span>
            <span className="sgx-readout">1–8 · P · M · F · / · ESC</span>
          </p>
        </aside>
      )}
    </>
  );
};
