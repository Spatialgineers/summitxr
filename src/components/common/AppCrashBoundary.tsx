import React from 'react';
import { reportError } from '../../lib/errorMonitor';

/* Last line of defense: if a render crashes the whole tree, report it and show
   a way back instead of a blank screen. */

interface State { failed: boolean }

export class AppCrashBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { failed: false };
  declare props: { children: React.ReactNode };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const top = (info?.componentStack || '').split('\n').map((l) => l.trim()).find(Boolean) || '';
    reportError('react', error, { component: top });
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const es = (() => { try { return (localStorage.getItem('sgx_summit_language') || 'es') === 'es'; } catch { return true; } })();
    return (
      <main role="alert" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#050505', color: '#fff', padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ maxWidth: 420 }}>
          <p style={{ color: '#FDCC0D', letterSpacing: '0.12em', fontSize: 12, textTransform: 'uppercase', margin: 0 }}>Spatialgineers Summit 2026</p>
          <h1 style={{ fontSize: 22, margin: '10px 0' }}>{es ? 'Algo se rompió en esta pantalla' : 'Something broke on this screen'}</h1>
          <p style={{ color: '#b5b5b5', margin: '0 0 18px' }}>{es ? 'Ya avisamos al equipo. Recarga para seguir; tu pase está guardado en este dispositivo.' : 'The team has been notified. Reload to continue; your pass is saved on this device.'}</p>
          <button type="button" onClick={() => window.location.reload()} style={{ background: '#FDCC0D', color: '#050505', border: 0, padding: '12px 22px', fontWeight: 700, cursor: 'pointer', minHeight: 44 }}>
            {es ? 'Recargar' : 'Reload'}
          </button>
        </div>
      </main>
    );
  }
}

export default AppCrashBoundary;
