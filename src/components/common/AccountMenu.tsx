import React, { useEffect, useRef } from 'react';
import { LogIn, LogOut, Sparkles, Ticket, UserRound } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';

/* ACCOUNT MENU: what the pass chip in the header opens. Your Studio is always one
   tap away (with or without a pass), and so are Google sign-in and sign-out, so a
   visitor is never stuck inside the Forge to change accounts. */

interface Props {
  open: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export const AccountMenu: React.FC<Props> = ({ open, onClose, anchorRef }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { user, signInWithGoogle, logout } = useAuth();
  const sgxId = useOptionalSgxIdentity();
  const ref = useRef<HTMLDivElement | null>(null);
  const google = user && !user.isAnonymous ? user : null;
  const forged = !!sgxId?.isForged;

  useEffect(() => {
    if (!open) return;
    const items = (): HTMLElement[] => Array.from(ref.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? []);
    window.setTimeout(() => items()[0]?.focus(), 20);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); anchorRef.current?.focus(); return; }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const list = items();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.key === 'ArrowDown' ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
      e.preventDefault();
      list[next]?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !anchorRef.current?.contains(t)) onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onDown); };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  const act = (fn: () => void) => () => { playUiChirp(760); onClose(); fn(); };
  const openStudio = () => window.dispatchEvent(new CustomEvent('sgx:open_hangar', { detail: { tab: 'pass' } }));
  const openForge = () => window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } }));

  return (
    <div ref={ref} className="sgx-acct" role="menu" aria-label={es ? 'Tu cuenta' : 'Your account'}>
      <div className="sgx-acct__who">
        <UserRound aria-hidden />
        <div>
          <b>{forged ? sgxId!.identity.pass!.fullName : google?.displayName || (es ? 'Invitado' : 'Guest')}</b>
          <small>{google ? google.email : (es ? 'Sin sesión de Google' : 'Not signed in with Google')}</small>
        </div>
      </div>
      <button type="button" role="menuitem" onClick={act(openStudio)}>
        <Sparkles aria-hidden />{es ? 'Tu Estudio' : 'Your Studio'}
        <span>{es ? 'Pase, Reactor, Red, Rolodex' : 'Pass, Reactor, Network, Rolodex'}</span>
      </button>
      {!forged && (
        <button type="button" role="menuitem" onClick={act(openForge)}>
          <Ticket aria-hidden />{es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'}
        </button>
      )}
      {google ? (
        <button type="button" role="menuitem" className="is-quiet" onClick={act(() => { logout(); })}>
          <LogOut aria-hidden />{es ? 'Cerrar sesión' : 'Sign out'}
          <span>{es ? 'Tu pase queda guardado en tu cuenta' : 'Your pass stays saved to your account'}</span>
        </button>
      ) : (
        <button type="button" role="menuitem" onClick={act(() => { signInWithGoogle(); })}>
          <LogIn aria-hidden />{es ? 'Iniciar sesión con Google' : 'Sign in with Google'}
          <span>{es ? 'Guarda tu progreso en tu cuenta' : 'Save your progress to your account'}</span>
        </button>
      )}
    </div>
  );
};

export default AccountMenu;
