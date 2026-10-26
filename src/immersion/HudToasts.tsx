import React from 'react';
import { useImmersion } from './ImmersionContext';
import { SgxBolt } from './SgxSymbols';

/** Quest, cell and level-up notifications in the DS alert shape. */
export const HudToasts: React.FC = () => {
  const { toasts, dismissToast } = useImmersion();
  if (!toasts.length) return null;
  // Toast budget: one on screen at a time; the rest show as a counter.
  const latest = toasts[toasts.length - 1];
  const queued = toasts.length - 1;
  return (
    <div className="sgx-toasts" role="status" aria-live="polite">
      {[latest].map((t) => (
        <button
          key={t.id}
          type="button"
          className={`sgx-toast sgx-toast--${t.tone}`}
          onClick={() => dismissToast(t.id)}
        >
          <span className="sgx-toast__tag">{t.tag}</span>
          <span className="sgx-toast__body">
            <span className="sgx-toast__title">{t.title}</span>
            {t.detail && <span className="sgx-toast__detail">{t.detail}</span>}
          </span>
          {typeof t.xp === 'number' && (
            <span className="sgx-toast__xp">
              <SgxBolt size={12} />+{t.xp} XP
            </span>
          )}
          {queued > 0 && <span className="sgx-toast__more">+{queued}</span>}
        </button>
      ))}
    </div>
  );
};
