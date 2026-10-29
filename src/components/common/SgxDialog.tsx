import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../lib/useDialogFocus';
import { useLanguage } from '../../context/LanguageContext';

/* SGX DIALOG: the one modal shell for the Summit. Same frame as Tu Estudio
   (clipped HUD corners, dark glass, yellow close on hover), dialog semantics,
   Escape to close, focus kept inside and returned on close, page scroll locked.
   Use it for every new or migrated modal instead of a hand-made fixed overlay. */

export interface SgxDialogProps {
  open?: boolean;
  onClose: () => void;
  /** Visible title (also the accessible name). */
  title: React.ReactNode;
  /** Small cyan line under the title. */
  kicker?: React.ReactNode;
  /** Optional icon/image left of the title. */
  icon?: React.ReactNode;
  /** Right side of the header, before the close button (XP, status pill…). */
  headerExtra?: React.ReactNode;
  /** Pinned under the header (tabs, filters). */
  toolbar?: React.ReactNode;
  /** Pinned at the bottom (primary actions). */
  footer?: React.ReactNode;
  /** sm 520px · md 760px · lg 1080px (default) · full screen. */
  size?: 'sm' | 'md' | 'lg' | 'full';
  /** Pillar or brand accent for the frame edge. */
  accent?: string;
  className?: string;
  /** Close when the backdrop is clicked (default true). */
  dismissable?: boolean;
  children: React.ReactNode;
}

const WIDTH = { sm: '520px', md: '760px', lg: '1080px', full: '100vw' } as const;
let openCount = 0;

export const SgxDialog: React.FC<SgxDialogProps> = ({
  open = true, onClose, title, kicker, icon, headerExtra, toolbar, footer, size = 'lg', accent, className = '', dismissable = true, children,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const ref = useRef<HTMLDivElement | null>(null);
  const titleId = useRef(`sgx-dlg-${Math.random().toString(36).slice(2, 8)}`).current;
  useDialogFocus(ref);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    window.addEventListener('keydown', onKey);
    openCount += 1;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      openCount -= 1;
      if (openCount === 0) document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className={`sgx-hangar sgx-dialog sgx-dialog--${size} ${className}`} onClick={dismissable ? onClose : undefined}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="sgx-hangar__frame sgx-dialog__frame"
        style={{ width: `min(100%, ${WIDTH[size]})`, ...(accent ? { ['--sgx-dialog-accent' as string]: accent } : {}) }}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sgx-hangar__head sgx-dialog__head">
          <div className="sgx-hangar__title">
            {icon}
            <div>
              <h2 id={titleId}>{title}</h2>
              {kicker && <p>{kicker}</p>}
            </div>
          </div>
          {headerExtra && <div className="sgx-dialog__extra">{headerExtra}</div>}
          <button type="button" className="sgx-hangar__close" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
        </header>
        {toolbar && <div className="sgx-dialog__toolbar">{toolbar}</div>}
        <div className="sgx-hangar__body sgx-dialog__body">{children}</div>
        {footer && <footer className="sgx-dialog__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
};

export default SgxDialog;
