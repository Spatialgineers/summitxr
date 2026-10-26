import React, { useEffect, useRef, useState } from 'react';
import type { PageRoute } from '../components/common/HeaderNav';
import { usePilotProfile } from '../context/PilotProfileContext';
import { useLanguage } from '../context/LanguageContext';
import { getAppRouteAndSectionFromUrl } from '../lib/summitUrlSync';
import { getIsAudioMuted, playUiChirp, toggleAudioMute } from '../lib/cyberAudioEngine';
import { useImmersion, haptic } from './ImmersionContext';
import { SECTION_BY_KEY } from './sections';
import { SGX_PILLARS, findPillar } from '../lib/sgxPillars';
import { navigateToPillar, navigateToSection } from './navigation';
import { HudToasts } from './HudToasts';
import { MissionRail } from './MissionRail';
import { CommandTerminal } from './CommandTerminal';
import { EnergyCell, boltBurst } from './EnergyCell';
import { Atmosphere, CursorReticle, Holodeck, OverdriveFrame, PulseWaves, WarpTransition, XpTicker, useScrollReveal } from './ImmersionFX';

/** Pages that get the full game layer. The broadcast stage and multiview stay clean for projection. */
const GAME_PAGES: PageRoute[] = ['summit', 'play'];
const QUIET_PAGES: PageRoute[] = ['stage', 'multiview'];

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
const INTERACTIVE = 'a, button, [role="button"], summary, [data-sgx-hover]';

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node || !node.tagName) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}

/** Pillar stations are tracked as "PILLAR:<slug>", every other section by its key. */
function stationKey(section: string | null | undefined, pillar?: string | null): string {
  if (section === 'PILLAR') return `PILLAR:${findPillar(pillar)?.slug || 'story'}`;
  return section || 'OVERVIEW';
}

function readSection(): string {
  const parsed = getAppRouteAndSectionFromUrl();
  if (parsed.page !== 'summit') return `PAGE_${parsed.page.toUpperCase()}`;
  return stationKey(parsed.summitSection, new URLSearchParams(window.location.search).get('subtab'));
}

export const ImmersionLayer: React.FC<{ currentPage: PageRoute }> = ({ currentPage }) => {
  const imm = useImmersion();
  const { settings, markVisited, markPillar, firePulse, toggleStageMode, stageMode, setTerminalOpen, terminalOpen,
    panelOpen, setPanelOpen, completeQuest, addEnergy, pushToast } = imm;
  const { liteMode } = usePilotProfile();
  const { language } = useLanguage();
  const [section, setSection] = useState<string>(() => readSection());
  const konamiRef = useRef<string[]>([]);
  const embed = useRef(new URLSearchParams(window.location.search).get('embed') === 'true').current;

  const isGamePage = GAME_PAGES.includes(currentPage);
  const isQuiet = QUIET_PAGES.includes(currentPage);
  const fx = settings.fx && !liteMode;
  const sectionKey = currentPage === 'summit' ? section : `PAGE_${currentPage.toUpperCase()}`;

  // Follow navigation from every source: our URL sync hook, back/forward and the section event bus.
  useEffect(() => {
    const sync = () => setSection(readSection());
    const onSwitch = (e: Event) => {
      const d = (e as CustomEvent<{ section?: string; pillar?: string }>).detail;
      if (d?.section) setSection(stationKey(d.section, d.pillar));
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

  useEffect(() => {
    if (currentPage !== 'summit') return;
    if (section.startsWith('PILLAR:')) markPillar(section.slice(7));
    else markVisited(section);
  }, [currentPage, section, markVisited, markPillar]);

  // Pillar modules can ask for the terminal (SGX.System → Terminal de mando).
  useEffect(() => {
    const open = () => setTerminalOpen(true);
    window.addEventListener('sgx:open_terminal', open);
    return () => window.removeEventListener('sgx:open_terminal', open);
  }, [setTerminalOpen]);

  // Pillars docked anywhere (3D core, section bar, hub) count toward "Los Seis Pilares".
  useEffect(() => {
    const onDock = (e: Event) => markPillar((e as CustomEvent<{ pillarId?: string }>).detail?.pillarId || '');
    window.addEventListener('sgx:pillar_docked', onDock);
    return () => window.removeEventListener('sgx:pillar_docked', onDock);
  }, [markPillar]);

  // "Iniciar Sistema": first drag on the 3D core.
  useEffect(() => {
    if (currentPage !== 'summit' || section !== 'OVERVIEW' || imm.state.done.q_core_boot) return;
    const onDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'CANVAS') completeQuest('q_core_boot');
    };
    window.addEventListener('pointerdown', onDown, { passive: true });
    return () => window.removeEventListener('pointerdown', onDown);
  }, [currentPage, section, imm.state.done.q_core_boot, completeQuest]);

  // Interaction charges the reactor; hovering ticks like hardware.
  useEffect(() => {
    if (isQuiet) return;
    let lastClick = 0;
    let lastHover = 0;
    let lastHoverEl: Element | null = null;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE);
      if (!el) return;
      const now = Date.now();
      if (now - lastClick < 350) return;
      lastClick = now;
      addEnergy(1.5);
    };
    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || !settings.sfx || getIsAudioMuted()) return;
      // Browsers block audio until the first gesture; skip ticks until then.
      if ((navigator as any).userActivation && !(navigator as any).userActivation.hasBeenActive) return;
      const el = (e.target as Element | null)?.closest?.(INTERACTIVE) || null;
      if (!el || el === lastHoverEl) { lastHoverEl = el; return; }
      lastHoverEl = el;
      const now = Date.now();
      if (now - lastHover < 70) return;
      lastHover = now;
      playUiChirp(2100, 'sine', 0.02);
    };
    window.addEventListener('click', onClick, { capture: true, passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    return () => {
      window.removeEventListener('click', onClick, { capture: true } as any);
      window.removeEventListener('pointerover', onOver);
    };
  }, [isQuiet, settings.sfx, addEnergy]);

  // Live shortcuts from the SGX HUD spec: 1–8 · P · M · F · / · ESC (+ Ctrl/Cmd+K).
  useEffect(() => {
    if (isQuiet) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setTerminalOpen(!terminalOpen);
        return;
      }
      if (e.key === 'Escape') {
        if (terminalOpen) setTerminalOpen(false);
        else if (panelOpen) setPanelOpen(false);
        else if (stageMode) toggleStageMode();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || isTypingTarget(e.target) || terminalOpen) return;
      if (document.body.hasAttribute('data-sgx-game')) return;

      konamiRef.current = [...konamiRef.current, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => konamiRef.current[i] === k)) {
        konamiRef.current = [];
        completeQuest('q_konami');
        for (let i = 0; i < 5; i++) {
          window.setTimeout(() => boltBurst(window.innerWidth * (0.15 + Math.random() * 0.7), window.innerHeight * 0.25, 30), i * 180);
        }
        haptic([80, 50, 80, 50, 200]);
        pushToast({ tag: 'HIGHGINEER', title: language === 'es' ? 'Modo Highgineer desbloqueado' : 'Highgineer Mode unlocked', detail: 'Ingeniando imaginación, construyendo realidades.', tone: 'action' });
        return;
      }

      const key = e.key.toLowerCase();
      if (key === '/' || key === '`') {
        e.preventDefault();
        setTerminalOpen(true);
      } else if (key === 'p') {
        firePulse();
      } else if (key === 'm') {
        const muted = toggleAudioMute();
        pushToast({ tag: 'AUDIO', title: muted ? 'MUTE' : 'AUDIO ON', tone: 'telemetry' });
      } else if (key === 'f') {
        toggleStageMode();
      } else if (isGamePage && /^[1-6]$/.test(e.key)) {
        // 1–6: the six pillar stations in official order. 0: back to the 3D core.
        navigateToPillar(SGX_PILLARS[Number(e.key) - 1].slug);
      } else if (isGamePage && e.key === '0') {
        navigateToSection('OVERVIEW');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isQuiet, isGamePage, terminalOpen, panelOpen, stageMode, setTerminalOpen, setPanelOpen, toggleStageMode,
    firePulse, completeQuest, pushToast, language]);

  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  useScrollReveal(fx && !reduceMotion && !embed && currentPage === 'summit' && section !== 'OVERVIEW', sectionKey);

  if (embed) return null;

  if (isQuiet) {
    return <HudToasts />;
  }

  return (
    <div className="sgx-immersion" data-fx={fx ? 'on' : 'off'}>
      {isGamePage && !(currentPage === 'summit' && section === 'OVERVIEW') && <Holodeck motion={fx && !reduceMotion} />}
      {fx && <Atmosphere />}
      {fx && <CursorReticle />}
      {fx && <WarpTransition sectionKey={sectionKey} />}
      {fx && currentPage === 'summit' && SECTION_BY_KEY[section] && <EnergyCell key={sectionKey} sectionKey={sectionKey} />}
      <PulseWaves />
      <OverdriveFrame />
      {!stageMode && isGamePage && <MissionRail />}
      {!stageMode && isGamePage && <XpTicker />}
      <CommandTerminal />
      <HudToasts />
    </div>
  );
};
