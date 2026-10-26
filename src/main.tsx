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
import './index.css';

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
