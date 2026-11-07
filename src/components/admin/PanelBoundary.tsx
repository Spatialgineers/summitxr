import React from 'react';
import { reportError } from '../../lib/errorMonitor';

/* Keeps one admin panel's crash inside that panel: shows the error text (so
   the team can report it) and a retry, instead of taking down the admin. */
interface State { error: string | null; attempt: number }

export class PanelBoundary extends React.Component<{ name: string; children: React.ReactNode }, State> {
  state: State = { error: null, attempt: 0 };
  declare props: { name: string; children: React.ReactNode };
  declare setState: (updater: (s: State) => Partial<State>) => void;

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: String((error as Error)?.message || error).slice(0, 300) };
  }

  componentDidCatch(error: unknown) {
    reportError('react', error, { component: this.props.name });
  }

  render() {
    if (!this.state.error) return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    return (
      <div role="alert" className="sgx-panel-error">
        <p><strong>{this.props.name}</strong> tuvo un error y se detuvo. El resto del admin sigue funcionando.</p>
        <pre>{this.state.error}</pre>
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}>Reintentar</button>
      </div>
    );
  }
}
