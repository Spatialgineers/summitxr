import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { playUiChirp } from '../lib/cyberAudioEngine';
import { SgxDialog } from '../components/common/SgxDialog';
import { PILLAR_ACCENT } from './sgxIdentity';
import { useSgxIdentity } from './SgxIdentityContext';
import { PilotBuilder } from './PilotBuilder';
import { configFromSeed, type PilotConfig } from './pilotAvatar';
import './SgxStudio.css';

/* Avatar Studio: the avatar builder outside the Forge (from your Studio, the
   Holo Card Studio or the reactor mission). Saving updates the pass, the
   Holo Card and everywhere the avatar shows. The avatar is the only portrait:
   an old uploaded photo is dropped on save. */

export const PilotBuilderModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity } = useSgxIdentity();
  const accent = identity.affinity ? PILLAR_ACCENT[identity.affinity] : '#FDCC0D';
  const [pilot, setPilot] = useState<PilotConfig>(() => identity.avatar.pilot || configFromSeed(identity.avatar.seed, accent));

  const save = () => {
    playUiChirp(980);
    window.dispatchEvent(new CustomEvent('sgx:avatar_saved', {
      detail: { pilot, seed: identity.avatar.seed, clearPhoto: !!identity.avatar.png },
    }));
    onClose();
  };

  return (
    <SgxDialog
      onClose={onClose}
      size="lg"
      className="sgx-studio sgx-pilotb-modal"
      icon={<img src="/brand/sgx-bolt.svg" alt="" />}
      title={es ? 'Arma tu avatar XR' : 'Build your XR avatar'}
      kicker={es ? 'Tu pase, tu Holo Card y el núcleo 3D' : 'Your pass, Holo Card and 3D core'}
      footer={(
        <>
          <button type="button" className="sgx-btn sgx-btn--ground" onClick={onClose}>{es ? 'Cancelar' : 'Cancel'}</button>
          <span className="sgx-glow"><button type="button" className="sgx-btn" onClick={save}>{es ? 'Guardar avatar' : 'Save avatar'}</button></span>
        </>
      )}
    >
      <PilotBuilder value={pilot} onChange={setPilot} accent={accent} callsign={identity.callsign || undefined} />
    </SgxDialog>
  );
};

export default PilotBuilderModal;
