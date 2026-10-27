import React from 'react';

/**
 * Themed placeholder shown while a code-split module loads.
 * - default: inline block that keeps some height so the layout doesn't jump
 * - fullScreen: centred in the viewport (route-level)
 * - overlay: dimmed fixed layer for modals
 */
export const LazyFallback: React.FC<{ label?: string; fullScreen?: boolean; overlay?: boolean }> = ({
  label = 'Cargando módulo SGX…',
  fullScreen,
  overlay,
}) => {
  const body = (
    <span className="inline-flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--sgx-neon,#00DDFF)]">
      <span className="w-2 h-2 rounded-full bg-[var(--sgx-neon,#00DDFF)] animate-pulse shadow-[0_0_10px_var(--sgx-neon,#00DDFF)]" aria-hidden="true" />
      {label}
    </span>
  );
  if (overlay) {
    return (
      <div role="status" aria-live="polite" className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm flex items-center justify-center">
        {body}
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-live="polite"
      className={`w-full flex items-center justify-center ${fullScreen ? 'min-h-[60vh]' : 'min-h-[180px] py-10'}`}
    >
      {body}
    </div>
  );
};
