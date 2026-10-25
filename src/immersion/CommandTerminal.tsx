import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useImmersion } from './ImmersionContext';
import { useLanguage } from '../context/LanguageContext';
import { usePilotProfile } from '../context/PilotProfileContext';
import { toggleAudioMute, playUiChirp } from '../lib/cyberAudioEngine';
import { getAppRouteAndSectionFromUrl } from '../lib/summitUrlSync';
import { SECTION_META, pillarDisplay } from './sections';
import { QUESTS, SECRET_CODES, TOTAL_CELLS } from './quests';
import { navigateToPage, navigateToSection } from './navigation';

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
  const { profile, setIsProfileModalOpen } = usePilotProfile();
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
    const list: Command[] = SECTION_META.map((s) => ({
      id: `go_${s.key}`,
      label: `${go} · ${es ? s.es : s.en}`,
      group: pillarDisplay(s.pillar),
      keywords: [s.es, s.en, ...s.aliases, s.key],
      run: () => {
        navigateToSection(s.key);
        window.setTimeout(() => setTerminalOpen(false), 260);
        return `${es ? 'Navegando a' : 'Navigating to'} ${es ? s.es : s.en}…`;
      },
    }));
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
      { id: 'profile', label: es ? 'Perfil de piloto' : 'Pilot profile', group: open, keywords: ['perfil', 'profile', 'piloto', 'pilot', 'leaderboard'], run: () => { setTerminalOpen(false); setIsProfileModalOpen(true); } },
      { id: 'tickets', label: es ? 'Boleto SGX Access' : 'SGX Access ticket', group: open, keywords: ['boleto', 'ticket', 'registro', 'register', 'pdf'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_tickets'); } },
      { id: 'passport', label: es ? 'Pasaporte del Summit' : 'Summit passport', group: open, keywords: ['pasaporte', 'passport', 'sellos', 'stamps'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_passport'); } },
      { id: 'rewards', label: es ? 'Tienda de recompensas' : 'Rewards store', group: open, keywords: ['recompensas', 'rewards', 'tienda', 'store', 'premios'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_rewards'); } },
      { id: 'avatar', label: es ? 'Generador de avatar' : 'Avatar generator', group: open, keywords: ['avatar'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_avatar'); } },
      { id: 'qr', label: es ? 'Escáner QR de networking' : 'Networking QR scanner', group: open, keywords: ['qr', 'scanner', 'escaner', 'escanear'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_qr_scanner'); } },
      { id: 'tour', label: es ? 'Tour guiado' : 'Guided tour', group: open, keywords: ['tour', 'guia', 'guide', 'onboarding'], run: () => { setTerminalOpen(false); openSummitModal('sgx:open_tour'); } },
      {
        id: 'status', label: es ? 'Estado del piloto' : 'Pilot status', group: 'SGX.System', keywords: ['estado', 'status', 'stats', 'whoami'],
        run: () => [
          `PILOT ${profile.nickname} · LVL ${profile.level} · ${profile.rankTitle}`,
          `XP ${profile.totalXp.toLocaleString()} · ${es ? 'MISIONES' : 'QUESTS'} ${imm.completedCount}/${QUESTS.length} · ${es ? 'CELDAS' : 'CELLS'} ${imm.state.cells.length}/${TOTAL_CELLS} · ${es ? 'ENERGÍA' : 'ENERGY'} ${Math.round(imm.state.energy)}%`,
        ],
      },
      {
        id: 'help', label: es ? 'Ayuda' : 'Help', group: 'SGX.System', keywords: ['ayuda', 'help', '?', 'comandos', 'commands'],
        run: () => es
          ? ['Escribe el nombre de una sección (agenda, speakers, dron, mapa…) o una acción:', 'misiones · pulso · escenario · perfil · boleto · pasaporte · recompensas · estado · fx · sfx · mute · limpiar', 'Atajos: 1–8 secciones · P pulso · M audio · F escenario · / terminal · ESC salir', 'Hay códigos escondidos. Los ingenieros saludan diferente.']
          : ['Type a section name (agenda, speakers, drone, map…) or an action:', 'quests · pulse · stage · profile · ticket · passport · rewards · status · fx · sfx · mute · clear', 'Shortcuts: 1–8 sections · P pulse · M audio · F stage · / terminal · ESC exit', 'There are hidden codes. Engineers greet differently.'],
      },
      { id: 'clear', label: es ? 'Limpiar terminal' : 'Clear terminal', group: 'SGX.System', keywords: ['limpiar', 'clear', 'cls'], run: () => { setLog([]); } },
    );
    return list;
  }, [es, imm, profile, setIsProfileModalOpen, setTerminalOpen]);

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
