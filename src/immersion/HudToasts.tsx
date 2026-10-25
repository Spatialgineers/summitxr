import React from 'react';
import { useImmersion } from './ImmersionContext';
import { SgxBolt } from './SgxSymbols';

/** Quest, cell and level-up notifications in the DS alert shape. */
export const HudToasts: React.FC = () => {
  const { toasts, dismissToast } = useImmersion();
  if (!toasts.length) return null;
  return (
    <div className="sgx-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
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
        </button>
      ))}
    </div>
  );
};
