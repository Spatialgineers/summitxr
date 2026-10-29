import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useImmersion } from './ImmersionContext';
import { useLanguage } from '../context/LanguageContext';
import { rankLabel, usePilotProfile } from '../context/PilotProfileContext';
import { toggleAudioMute, playUiChirp } from '../lib/cyberAudioEngine';
import { getAppRouteAndSectionFromUrl } from '../lib/summitUrlSync';
import { SECTION_META, pillarDisplay } from './sections';
import { QUESTS, SECRET_CODES, TOTAL_CELLS } from './quests';
import { navigateToPage, navigateToPillar, navigateToSection } from './navigation';
import { SGX_PILLARS, bi } from '../lib/sgxPillars';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';

interface Command {
  id: string;
  label: string;
  group: string;
  keywords: string[];
  run: () => string | string[] | void;
}

interface LogLine { id: number; text: string; tone: 'in' | 'out' | 'ok' | 'err' }

/** Runs a landing-page modal event; hops to the summit page first if needed. */
function openSummitModal(eventName: string) {
  if (getAppRouteAndSectionFromUrl().page !== 'summit') {
    navigateToPage('summit');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent(eventName)), 450);
  } else {
    window.dispatchEvent(new CustomEvent(eventName));
  }
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

export const CommandTerminal: React.FC = () => {
  const imm = useImmersion();
  const { terminalOpen, setTerminalOpen } = imm;
  const { language } = useLanguage();
  // The same mission count the rail and the dock show (Reactor), not the old quest list.
  const sgx = useOptionalSgxIdentity();
  const reactorTotal = sgx?.missions.length || 0;
  const reactorDone = sgx ? sgx.missions.filter((m) => sgx.isDone(m.id)).length : 0;
  const { profile } = usePilotProfile();
  const es = language === 'es';
  const [input, setInput] = useState('');
  const [cursor, setCursor] = useState(0);
  const [log, setLog] = useState<LogLine[]>(() => [
    { id: 0, tone: 'ok', text: 'SGX://TERMINAL v2026.10 · POWERED BY SPATIALGINEERS' },
    { id: 1, tone: 'out', text: es ? 'Escribe "ayuda" o busca una sección.' : 'Type "help" or search for a section.' },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lineId = useRef(2);

  const commands = useMemo<Command[]>(() => {
    const go = es ? 'Ir' : 'Go';
    const stations: Command[] = SGX_PILLARS.map((p) => ({
      id: `pillar_${p.slug}`,
      label: `${es ? 'Estación' : 'Station'} 0${p.index} · ${p.name}`,
      group: bi(p.title, language),
      keywords: [p.slug, p.name, p.id, p.guildTeam, `pilar ${p.slug}`, `pillar ${p.slug}`, String(p.index)],
      run: () => {
        navigateToPillar(p.slug);
        window.setTimeout(() => setTerminalOpen(false), 260);
        return `${es ? 'Entrando a la estación' : 'Entering station'} ${p.name}…`;
      },
    }));
    const list: Command[] = [...stations, ...SECTION_META.map((s) => ({
      id: `go_${s.key}`,
      label: `${go} · ${es ? s.es : s.en}`,
      group: pillarDisplay(s.pillar),
      keywords: [s.es, s.en, ...s.aliases, s.key],
      run: () => {
        navigateToSection(s.key);
        window.setTimeout(() => setTerminalOpen(false), 260);
        return `${es ? 'Navegando a' : 'Navigating to'} ${es ? s.es : s.en}…`;
      },
    }))];
    const act = es ? 'Acción' : 'Action';
    const open = es ? 'Abrir' : 'Open';
    list.push(
      { id: 'play', label: es ? 'Ir · Audiencia en vivo' : 'Go · Live audience', group: 'SGX.Stage', keywords: ['play', 'audiencia', 'audience', 'votar', 'vote', 'pwa'], run: () => { navigateToPage('play'); window.setTimeout(() => setTerminalOpen(false), 260); return es ? 'Conectando a la audiencia en vivo…' : 'Joining the live audience…'; } },
      { id: 'quests', label: es ? 'Control de Misión' : 'Mission Control', group: act, keywords: ['misiones', 'quests', 'mision', 'mission', 'xp'], run: () => { setTerminalOpen(false); imm.setPanelOpen(true); } },
      { id: 'pulse', label: es ? 'Lanzar Pulso SGX' : 'Fire SGX Pulse', group: act, keywords: ['pulso', 'pulse', 'p'], run: () => (imm.firePulse() ? (es ? 'Pulso emitido.' : 'Pulse fired.') : (es ? 'Recargando el pulso…' : 'Pulse recharging…')) },
      { id: 'stage', label: es ? 'Modo Escenario' : 'Stage Mode', group: act, keywords: ['escenario', 'stage', 'fullscreen', 'pantalla'], run: () => { setTerminalOpen(false); imm.toggleStageMode(); } },
      { id: 'fx', label: `FX ${imm.settings.fx ? 'OFF' : 'ON'}`, group: act, keywords: ['fx', 'efectos', 'effects', 'motion'], run: () => { imm.setSettings({ fx: !imm.settings.fx }); return `FX ${imm.settings.fx ? 'OFF' : 'ON'}`; } },
      { id: 'sfx', label: `SFX ${imm.settings.sfx ? 'OFF' : 'ON'}`, group: act, keywords: ['sfx', 'sonidos', 'sounds'], run: () => { imm.setSettings({ sfx: !imm.settings.sfx }); return `SFX ${imm.settings.sfx ? 'OFF' : 'ON'}`; } },
      { id: 'mute', label: es ? 'Silenciar / activar audio' : 'Mute / unmute audio', group: act, keywords: ['mute', 'silencio', 'audio', 'm'], run: () => (toggleAudioMute() ? 'AUDIO OFF' : 'AUDIO ON') },
      { id: 'profile', label: es ? 'Tu Estudio' : 'Your Studio', group: open, keywords: ['estudio', 'studio', 'hangar', 'perfil', 'profile', 'piloto', 'pilot', 'leaderboard', 'rolodex'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_hangar'); } },
      { id: 'tickets', label: es ? 'SGX Pass (registro, Holo Card, PDF)' : 'SGX Pass (registration, Holo Card, PDF)', group: open, keywords: ['pase', 'pass', 'boleto', 'ticket', 'registro', 'register', 'pdf', 'forja', 'forge'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_tickets'); } },
      { id: 'passport', label: es ? 'Reactor de misiones' : 'Mission reactor', group: open, keywords: ['reactor', 'misiones', 'missions', 'pasaporte', 'passport', 'sellos', 'stamps'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_passport'); } },
      { id: 'rewards', label: es ? 'Tienda de recompensas' : 'Rewards store', group: open, keywords: ['recompensas', 'rewards', 'tienda', 'store', 'premios'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_rewards'); } },
      { id: 'avatar', label: es ? 'Generador de avatar' : 'Avatar generator', group: open, keywords: ['avatar'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_avatar'); } },
      { id: 'holo', label: es ? 'Holo Card Studio (tu pase para compartir)' : 'Holo Card Studio (your pass to share)', group: open, keywords: ['holo', 'holocard', 'credencial', 'credential', 'speaker', 'sponsor', 'initiate'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_credential_generator'); } },
      { id: 'qr', label: es ? 'Escáner QR de networking' : 'Networking QR scanner', group: open, keywords: ['qr', 'scanner', 'escaner', 'escanear'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_qr_scanner'); } },
      { id: 'tour', label: es ? 'Forja de identidad' : 'Identity forge', group: open, keywords: ['tour', 'guia', 'guide', 'onboarding', 'forja', 'forge'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_forge'); } },
      {
        id: 'status', label: es ? 'Tu estado' : 'Your status', group: 'SGX.System', keywords: ['estado', 'status', 'stats', 'whoami'],
        run: () => [
          `${es ? 'CREADOR' : 'CREATOR'} ${profile.nickname} · LVL ${profile.level} · ${rankLabel(profile.level, es)}`,
          `XP ${profile.totalXp.toLocaleString()} · ${es ? 'MISIONES' : 'MISSIONS'} ${reactorDone}/${reactorTotal} · ${es ? 'CELDAS' : 'CELLS'} ${imm.state.cells.length}/${TOTAL_CELLS} · ${es ? 'ENERGÍA' : 'ENERGY'} ${Math.round(imm.state.energy)}%`,
        ],
      },
      {
        id: 'help', label: es ? 'Ayuda' : 'Help', group: 'SGX.System', keywords: ['ayuda', 'help', '?', 'comandos', 'commands'],
        run: () => es
          ? ['Escribe un pilar (story, showcase, spark, stage, system, synthesize), una sección (agenda, dron, mapa…) o una acción:', 'reactor · pase · estudio · holo · pulso · escenario · recompensas · estado · fx · sfx · mute · limpiar', 'Atajos: 1–6 estaciones de pilar · 0 núcleo · P pulso · M audio · F escenario · / terminal · ESC salir', 'Hay códigos escondidos. Los ingenieros saludan diferente.']
          : ['Type a pillar (story, showcase, spark, stage, system, synthesize), a section (agenda, drone, map…) or an action:', 'reactor · pass · studio · holo · pulse · stage · rewards · status · fx · sfx · mute · clear', 'Shortcuts: 1–6 pillar stations · 0 core · P pulse · M audio · F stage · / terminal · ESC exit', 'There are hidden codes. Engineers greet differently.'],
      },
      { id: 'clear', label: es ? 'Limpiar terminal' : 'Clear terminal', group: 'SGX.System', keywords: ['limpiar', 'clear', 'cls'], run: () => { setLog([]); } },
    );
    return list;
  }, [es, imm, profile, setTerminalOpen, language, reactorDone, reactorTotal]);

  const matches = useMemo(() => {
    const q = normalize(input);
    if (!q) return commands.slice(0, 8);
    const scored = commands
      .map((cmd) => {
        const hay = [cmd.label, ...cmd.keywords].map(normalize);
        let score = 0;
        for (const h of hay) {
          if (h === q) score = Math.max(score, 100);
          else if (h.startsWith(q)) score = Math.max(score, 60);
          else if (h.includes(q)) score = Math.max(score, 30);
        }
        return { cmd, score };
      })
      .filter((m) => m.score > 0)
      .sort((a, b) => b.score - a.score);
    return scored.slice(0, 8).map((m) => m.cmd);
  }, [commands, input]);

  useEffect(() => { setCursor(0); }, [input]);

  useEffect(() => {
    if (!terminalOpen) return;
    imm.completeQuest('q_terminal');
    playUiChirp(1320, 'square', 0.05);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [terminalOpen]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [log]);

  const print = (lines: string | string[], tone: LogLine['tone'] = 'out') => {
    const arr = Array.isArray(lines) ? lines : [lines];
    setLog((prev) => [...prev.slice(-40), ...arr.map((text) => ({ id: lineId.current++, text, tone }))]);
  };

  const execute = (cmd: Command | undefined, raw: string) => {
    print(`> ${raw}`, 'in');
    if (cmd) {
      const out = cmd.run();
      if (out) print(out, 'ok');
      return;
    }
    const clean = normalize(raw);
    if (clean.startsWith('sudo')) {
      print(es ? 'Acceso denegado. Aquí todos somos ingenieros, nadie es root.' : 'Access denied. Everyone here is an engineer, nobody is root.', 'err');
      return;
    }
    const code = imm.tryCode(clean);
    if (code === 'new') { print(es ? 'Código aceptado. Revisa tus misiones.' : 'Code accepted. Check your quests.', 'ok'); return; }
    if (code === 'repeat') { print(es ? 'Ese código ya está registrado en tu perfil.' : 'That code is already on your profile.', 'out'); return; }
    print(es ? `Comando no reconocido: ${raw}. Escribe "ayuda".` : `Unknown command: ${raw}. Type "help".`, 'err');
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = input.trim();
    if (!raw) return;
    const exact = normalize(raw);
    // Exact words (secret codes, "sudo …") must not be swallowed by fuzzy matches.
    const exactCmd = commands.find((c) => c.keywords.some((k) => normalize(k) === exact) || normalize(c.label) === exact);
    const stripped = exact.replace(/^(ir|go|goto|abrir|open)\s+/, '');
    const strippedCmd = stripped !== exact ? commands.find((c) => c.keywords.some((k) => normalize(k) === stripped)) : undefined;
    const isCode = !!SECRET_CODES[exact.replace(/[\s_.-]+/g, '')] || exact.startsWith('sudo');
    const chosen = exactCmd || strippedCmd || (isCode ? undefined : matches[cursor]);
    execute(chosen, raw);
    setInput('');
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor((c) => Math.min(matches.length - 1, c + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor((c) => Math.max(0, c - 1)); }
    else if (e.key === 'Escape') { e.preventDefault(); setTerminalOpen(false); }
    else if (e.key === 'Tab' && matches[cursor]) { e.preventDefault(); setInput(matches[cursor].keywords[0] ? normalize(matches[cursor].keywords[0]) : ''); }
  };

  if (!terminalOpen) return null;

  return (
    <div className="sgx-terminal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setTerminalOpen(false); }}>
      <div className="sgx-terminal sgx-panel sgx-panel--solid" role="dialog" aria-modal="true" aria-label="SGX Terminal">
        <header className="sgx-terminal__head">
          <span className="sgx-brand-tag">SGX://TERMINAL</span>
          <span className="sgx-status">
            <span className="sgx-led" aria-hidden="true" />
            <span className="sgx-readout"><span className="sgx-readout__k">XP</span>{profile.totalXp.toLocaleString()}</span>
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => setTerminalOpen(false)}>ESC</button>
          </span>
        </header>

        <div className="sgx-terminal__log" ref={logRef}>
          {log.map((l) => (
            <div key={l.id} className={`sgx-terminal__line is-${l.tone}`}>{l.text}</div>
          ))}
        </div>

        <form className="sgx-terminal__prompt" onSubmit={onSubmit}>
          <span aria-hidden="true">SGX://&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={es ? 'agenda, dron, misiones, pulso…' : 'agenda, drone, quests, pulse…'}
            aria-label={es ? 'Comando' : 'Command'}
            autoComplete="off"
            spellCheck={false}
          />
        </form>

        {matches.length > 0 && (
          <ul className="sgx-terminal__list" role="listbox">
            {matches.map((m, i) => (
              <li key={m.id} role="option" aria-selected={i === cursor}>
                <button
                  type="button"
                  className={`sgx-terminal__item ${i === cursor ? 'is-active' : ''}`}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => { execute(m, m.label); setInput(''); inputRef.current?.focus(); }}
                >
                  <span>{m.label}</span>
                  <span className="sgx-terminal__group">{m.group}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
