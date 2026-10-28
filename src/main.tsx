import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { TenantThemeProvider } from './context/TenantThemeContext.tsx';
import { LanguageProvider } from './context/LanguageContext.tsx';
import { PilotProfileProvider } from './context/PilotProfileContext.tsx';
import { SummitFeatureProvider } from './context/SummitFeatureContext.tsx';
import { ImmersionProvider } from './immersion/ImmersionContext.tsx';
import { SgxIdentityProvider } from './identity/SgxIdentityContext.tsx';
import { startLiveContentSync } from './lib/summitData';
import { installErrorMonitor, reportError } from './lib/errorMonitor';
import { AppCrashBoundary } from './components/common/AppCrashBoundary';
import './index.css';

// Uncaught errors on visitors' phones reach the admin dashboard (Errores en vivo).
installErrorMonitor();

// Published CMS content (speakers, sessions, sponsors…) reaches every visitor live.
startLiveContentSync();

// After a new deploy, an open tab may ask for chunks that no longer exist: reload once.
window.addEventListener('vite:preloadError', (event) => {
  reportError('chunk', (event as Event & { payload?: unknown }).payload || 'vite:preloadError');
  try {
    if (sessionStorage.getItem('sgx_chunk_reloaded')) return;
    sessionStorage.setItem('sgx_chunk_reloaded', '1');
  } catch { /* storage blocked: still try once */ }
  event.preventDefault();
  window.location.reload();
});

// Installable app + offline SGX Pass (production builds only; dev uses Vite's server).
if ('serviceWorker' in navigator && (import.meta as any).env?.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => reportError('manual', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppCrashBoundary>
    <AuthProvider>
      <TenantThemeProvider>
        <LanguageProvider>
          <PilotProfileProvider>
            <SummitFeatureProvider>
              <ImmersionProvider>
                <SgxIdentityProvider>
                  <App />
                </SgxIdentityProvider>
              </ImmersionProvider>
            </SummitFeatureProvider>
          </PilotProfileProvider>
        </LanguageProvider>
      </TenantThemeProvider>
    </AuthProvider>
    </AppCrashBoundary>
  </StrictMode>,
);
