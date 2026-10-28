import React from 'react';
import { Lock } from 'lucide-react';
import { useOptionalSgxIdentity } from './SgxIdentityContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';

/* The SGX Pass is the key to the app. What it opens is listed here, in one
   place: the info (agenda, speakers, pillars, sponsors, 3D core) stays open
   for everyone; the interactive things need a pass. Admins always pass. */

export type GatedFeature = 'live' | 'games' | 'match' | 'networking' | 'tour360';

export const PASS_GATED_SECTIONS: Record<string, GatedFeature> = {
  EMBEDS_GAMES: 'games',
  ENTREPRENEUR_MATCH: 'match',
  NETWORKING: 'networking',
  MAP_360: 'tour360',
};

const FEATURE_COPY: Record<GatedFeature, { es: string; en: string }> = {
  live: { es: 'SGX Live: vota y dirige el escenario', en: 'SGX Live: vote and direct the stage' },
  games: { es: 'El simulador de dron y los minijuegos', en: 'The drone simulator and mini-games' },
  match: { es: 'SGX.Match, tus citas con creadores y marcas', en: 'SGX.Match, your meetings with creators and brands' },
  networking: { es: 'Los foros y el chat de networking', en: 'The networking forums and chat' },
  tour360: { es: 'El recorrido 360° de Chroma Space Studios', en: 'The 360° tour of Chroma Space Studios' },
};

export function useHasPass(): boolean {
  const sgx = useOptionalSgxIdentity();
  const { isAdmin } = useAuth();
  return isAdmin || !!sgx?.isForged;
}

export const PassGate: React.FC<{ feature: GatedFeature; children: React.ReactNode }> = ({ feature, children }) => {
  const hasPass = useHasPass();
  const { language } = useLanguage();
  const es = language === 'es';
  if (hasPass) return <>{children}</>;

  const unlocks = (Object.keys(FEATURE_COPY) as GatedFeature[]).filter((f) => f !== feature);
  const openForge = () => {
    playUiChirp(880);
    window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } }));
  };

  return (
    <section className="sgx-passgate" aria-labelledby={`sgx-passgate-${feature}`}>
      <div className="sgx-passgate__icon" aria-hidden="true"><Lock /></div>
      <p className="sgx-passgate__kicker">{es ? 'Con tu SGX Pass' : 'With your SGX Pass'}</p>
      <h2 id={`sgx-passgate-${feature}`}>{FEATURE_COPY[feature][es ? 'es' : 'en']}</h2>
      <p className="sgx-passgate__lead">
        {es
          ? 'Tu SGX Pass es tu Holo Card y tu llave del Summit. Es gratis y lo forjas en un minuto.'
          : 'Your SGX Pass is your Holo Card and your key to the Summit. It is free and takes a minute to forge.'}
      </p>
      <ul className="sgx-passgate__list">
        {unlocks.map((f) => <li key={f}>{FEATURE_COPY[f][es ? 'es' : 'en']}</li>)}
        <li>{es ? 'Misiones, XP y premios del Reactor' : 'Reactor missions, XP and rewards'}</li>
      </ul>
      <span className="sgx-glow">
        <button type="button" className="sgx-btn" onClick={openForge}>[ ⚡ {es ? 'Forjar mi SGX Pass' : 'Forge my SGX Pass'} ]</button>
      </span>
      {feature === 'live' && (
        <button
          type="button"
          className="sgx-btn sgx-btn--sm sgx-btn--ground"
          onClick={() => window.dispatchEvent(new CustomEvent('sgx:navigate_page', { detail: { page: 'stage' } }))}
        >
          {es ? 'Solo mirar el escenario en vivo' : 'Just watch the live stage'}
        </button>
      )}
      <p className="sgx-passgate__note">
        {es
          ? '¿Ya lo forjaste en otro dispositivo? Entra con la misma cuenta de Google y lo recuperas.'
          : 'Forged it on another device? Sign in with the same Google account to get it back.'}
      </p>
    </section>
  );
};
