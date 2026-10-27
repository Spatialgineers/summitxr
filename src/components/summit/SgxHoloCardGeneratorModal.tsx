import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { playCyberBurstSound, playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';
import { SgxHoloStudio } from '../../identity/SgxHoloStudio';
import type { CredentialRole } from '../../identity/credentials';

/* Full-screen Holo Card Studio. Your Holo Card is your SGX Pass; the roles
   you really hold (speaker, initiate, sponsor) show up as extra cards. */

interface SgxHoloCardGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: CredentialRole;
}

export const SgxHoloCardGeneratorModal: React.FC<SgxHoloCardGeneratorModalProps> = ({ isOpen, onClose, initialRole }) => {
  const { language } = useLanguage();
  const es = language === 'es';

  useEffect(() => {
    if (!isOpen) return;
    playCyberBurstSound();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="sgx-hangar" role="dialog" aria-modal="true" aria-label="Holo Card Studio" onClick={onClose}>
      <div className="sgx-hangar__frame sgx-hstudio-modal" onClick={(e) => e.stopPropagation()}>
        <header className="sgx-hangar__head">
          <div className="sgx-hangar__title">
            <img src="/brand/sgx-bolt.svg" alt="" />
            <div>
              <h2>Holo Card Studio</h2>
              <p>{es ? 'Tu SGX Pass, listo para compartir' : 'Your SGX Pass, ready to share'}</p>
            </div>
          </div>
          <button type="button" className="sgx-hangar__close" onClick={() => { playUiChirp(700); onClose(); }} aria-label={es ? 'Cerrar' : 'Close'}>
            <X className="w-4 h-4" />
          </button>
        </header>
        <div className="sgx-hangar__body">
          <SgxHoloStudio initialRole={initialRole} onClose={onClose} />
        </div>
      </div>
    </div>
  );
};

export default SgxHoloCardGeneratorModal;
