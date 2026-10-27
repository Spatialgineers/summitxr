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
import './index.css';

// Published CMS content (speakers, sessions, sponsors…) reaches every visitor live.
startLiveContentSync();

// After a new deploy, an open tab may ask for chunks that no longer exist: reload once.
window.addEventListener('vite:preloadError', (event) => {
  try {
    if (sessionStorage.getItem('sgx_chunk_reloaded')) return;
    sessionStorage.setItem('sgx_chunk_reloaded', '1');
  } catch { /* storage blocked: still try once */ }
  event.preventDefault();
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
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
  </StrictMode>,
);
