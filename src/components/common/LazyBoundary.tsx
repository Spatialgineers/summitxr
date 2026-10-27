import React, { Suspense } from 'react';

/* Suspense + an error boundary for code-split modules. If a chunk fails to load
   (flaky network, or a new deploy replaced it), only that module shows a retry
   card instead of the whole app going blank. */

interface State { failed: boolean; attempt: number }

class ChunkErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false, attempt: 0 };
  // React 19 typings here don't expose the inherited members on subclasses; declare what we use.
  declare props: { children: React.ReactNode };
  declare setState: (updater: (s: State) => Partial<State>) => void;

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('[SGX] module failed to load:', error);
  }

  render() {
    if (!this.state.failed) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    const es = (() => { try { return (localStorage.getItem('sgx_summit_language') || 'es') === 'es'; } catch { return true; } })();
    return (
      <div role="alert" className="w-full min-h-[180px] flex flex-col items-center justify-center gap-3 p-6 text-center font-mono text-sm text-slate-200">
        <p>{es ? 'Este módulo no cargó. Revisa tu conexión.' : "This module didn't load. Check your connection."}</p>
        <div className="flex gap-2">
          <button type="button" className="sgx-btn px-4 py-2 min-h-[40px]" onClick={() => this.setState((s) => ({ failed: false, attempt: s.attempt + 1 }))}>
            {es ? 'Reintentar' : 'Retry'}
          </button>
          <button type="button" className="px-4 py-2 min-h-[40px] border border-white/20" onClick={() => window.location.reload()}>
            {es ? 'Recargar la página' : 'Reload page'}
          </button>
        </div>
      </div>
    );
  }
}

export const LazyBoundary: React.FC<{ fallback: React.ReactNode; children: React.ReactNode }> = ({ fallback, children }) => (
  <ChunkErrorBoundary>
    <Suspense fallback={fallback}>{children}</Suspense>
  </ChunkErrorBoundary>
);

export default LazyBoundary;
