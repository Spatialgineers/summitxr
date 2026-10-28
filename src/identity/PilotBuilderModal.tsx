import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { PilotBuilder } from './PilotBuilder';
import { HoloGlass } from '../immersion/shaders/HoloGlass';
import { configFromSeed, type PilotConfig } from './pilotAvatar';

/* Avatar Studio: the Pilot Builder outside the Forge (from the Hangar, the
   Holo Card Studio or the reactor mission). Saving updates the pass, the
   Holo Card and everywhere the pilot shows. */

export const PilotBuilderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity } = useSgxIdentity();
  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const [pilot, setPilot] = useState<PilotConfig>(() => identity.avatar.pilot || configFromSeed(identity.avatar.seed, accent));
  const [usePilot, setUsePilot] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const save = () => {
    playUiChirp(980);
    window.dispatchEvent(new CustomEvent('sgx:avatar_saved', {
      detail: { pilot, seed: identity.avatar.seed, clearPhoto: !!identity.avatar.png && usePilot },
    }));
    onClose();
  };

  return (
    <div className="sgx-hangar" role="dialog" aria-modal="true" aria-label={es ? 'Constructor de piloto' : 'Pilot builder'} onClick={onClose}>
      <div className="sgx-hangar__frame sgx-pilotb-modal" onClick={(e) => e.stopPropagation()}>
        <HoloGlass />
        <header className="sgx-hangar__head">
          <div className="sgx-hangar__title">
            <img src="/brand/sgx-bolt.svg" alt="" />
            <div>
              <h2>{es ? 'Arma tu avatar XR' : 'Build your XR avatar'}</h2>
              <p>{es ? 'Visor, interfaz, ropa con texturas SGX y el emblema de tu pilar. Sale en tu pase, tu Holo Card y el núcleo 3D.' : 'Headset, interface, SGX-textured outfit and your pillar emblem. It shows on your pass, your Holo Card and the 3D core.'}</p>
            </div>
          </div>
          <button type="button" className="sgx-hangar__close" onClick={onClose} aria-label={es ? 'Cerrar' : 'Close'}>✕</button>
        </header>
        <div className="sgx-hangar__body">
          <PilotBuilder value={pilot} onChange={setPilot} accent={accent} callsign={identity.callsign || undefined} />
          {identity.avatar.png && (
            <label className="sgx-pilotb__photo">
              <input type="checkbox" checked={usePilot} onChange={(e) => setUsePilot(e.target.checked)} />
              {es ? 'Usar este piloto en mi pase en vez de mi foto' : 'Use this pilot on my pass instead of my photo'}
            </label>
          )}
          <div className="sgx-forge__actions">
            <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Cancelar' : 'Cancel'}</button>
            <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={save}>[ ⚡ {es ? 'Guardar piloto' : 'Save pilot'} ]</button></span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PilotBuilderModal;
