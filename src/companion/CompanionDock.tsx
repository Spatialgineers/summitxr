import React, { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { PILLAR_ACCENT } from '../identity/sgxIdentity';
import { useOptionalSgxIdentity } from '../identity/SgxIdentityContext';
import { SgxPilotGlyph } from '../identity/SgxPilotGlyph';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { companionStatus, type CompanionMode } from './companionApi';
import { CompanionPanel } from './CompanionPanel';
import { getCompanionState, setCompanionOwner, useCompanion } from './companionStore';
import './companion.css';

/* Outside Tu Estudio your Highbot floats as a small head in the corner:
   tap it for a quick chat. It hides on the screens that are not for visitors
   and while the Studio's "Tu Highbot" tab is on screen. */

export const CompanionDock: React.FC<{ hidden?: boolean }> = ({ hidden = false }) => {
  const { language } = useLanguage();
  const es = language !== 'en';
  const sgx = useOptionalSgxIdentity();
  const { mood, busy, turns } = useCompanion();
  const [mode, setMode] = useState<CompanionMode | null>(null);
  const [open, setOpen] = useState(false);
  const [inline, setInline] = useState(false);
  const [seen, setSeen] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);

  const code = sgx?.isForged ? sgx.identity.pass?.code || '' : '';
  // a stored conversation is not news: only answers that land while the chat is closed are
  useEffect(() => { setCompanionOwner(code); setSeen(getCompanionState().turns.length); }, [code]);
  useEffect(() => { let alive = true; companionStatus().then((m) => { if (alive) setMode(m); }); return () => { alive = false; }; }, []);
  useEffect(() => {
    const onInline = (e: Event) => { const on = !!(e as CustomEvent<{ on?: boolean }>).detail?.on; setInline(on); if (on) setOpen(false); };
    const onOpen = () => setOpen(true);
    window.addEventListener('sgx:companion_inline', onInline);
    window.addEventListener('sgx:open_companion', onOpen);
    return () => { window.removeEventListener('sgx:companion_inline', onInline); window.removeEventListener('sgx:open_companion', onOpen); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); btnRef.current?.focus(); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => { if (open) setSeen(turns.length); }, [open, turns.length]);

  if (hidden || inline || !mode || mode === 'off' || !sgx) return null;

  const accent = sgx.identity.affinity ? PILLAR_ACCENT[sgx.identity.affinity] : '#FDCC0D';
  const head = (size: number) => (
    <span className="sgx-companion-head__face" style={{ width: size, height: size }} aria-hidden="true">
      <SgxPilotGlyph seed={sgx.identity.avatar.seed} config={sgx.identity.avatar.pilot} accent={accent} size={Math.round(size * 1.22)} />
    </span>
  );
  const unread = !open && !busy && turns.length > seen && turns[turns.length - 1]?.role === 'assistant';

  return (
    <div className={`sgx-companion-dock ${open ? 'is-open' : ''}`} style={{ ['--bot-accent' as string]: accent }}>
      {open && (
        <div className="sgx-companion-dock__pop" role="dialog" aria-modal="false" aria-label={es ? 'Chat con tu Highbot' : 'Chat with your Highbot'}>
          <CompanionPanel variant="pop" head={head(34)} onClose={() => { setOpen(false); btnRef.current?.focus(); }} />
        </div>
      )}
      <button
        ref={btnRef}
        type="button"
        className={`sgx-companion-head is-${mood} ${unread ? 'has-news' : ''}`}
        aria-expanded={open}
        aria-label={open ? (es ? 'Cerrar el chat de tu Highbot' : 'Close your Highbot chat') : (es ? 'Hablar con tu Highbot' : 'Talk to your Highbot')}
        onClick={() => { playUiChirp(open ? 420 : 760); setOpen((v) => !v); }}
      >
        <span className="sgx-companion-head__orb" aria-hidden="true">
          {head(58)}
          <span className="sgx-companion-head__ring" />
        </span>
      </button>
    </div>
  );
};

export default CompanionDock;
