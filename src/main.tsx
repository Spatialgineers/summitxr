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
import { guardedReload } from './lib/reloadGuard';
import { registerServiceWorker } from './lib/swRegister';
import './index.css';

// Uncaught errors on visitors' phones reach the admin dashboard (Errores en vivo).
installErrorMonitor();

// Published CMS content (speakers, sessions, sponsors…) reaches every visitor live.
startLiveContentSync();

// After a new deploy, an open tab may ask for chunks that no longer exist: reload, but
// through the shared guard (one automatic reload per session, whatever the reason).
// When the guard says no, the error stays with the LazyBoundary ("Reintentar").
window.addEventListener('vite:preloadError', (event) => {
  reportError('chunk', (event as Event & { payload?: unknown }).payload || 'vite:preloadError');
  if (guardedReload('chunk')) event.preventDefault();
});

// Installable app + offline SGX Pass (production builds only; dev uses Vite's server).
if ((import.meta as any).env?.PROD) registerServiceWorker();

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
