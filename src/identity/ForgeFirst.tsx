import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { SgxDialog } from '../components/common/SgxDialog';

/* Every role starts from the pass: forge it, then apply from it. */
export const ForgeFirst: React.FC<{ role: 'speaker' | 'sponsor'; onClose: () => void }> = ({ role, onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const what = role === 'speaker' ? (es ? 'speaker o artista' : 'speaker or artist') : 'sponsor';
  return (
    <SgxDialog
      onClose={onClose}
      size="sm"
      title={es ? 'Primero, tu SGX Pass' : 'First, your SGX Pass'}
      kicker={es ? `Para solicitar ser ${what}` : `To apply as ${what}`}
      footer={(
        <>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={onClose}>{es ? 'Ahora no' : 'Not now'}</button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { onClose(); window.dispatchEvent(new CustomEvent('sgx:open_forge', { detail: { tier: 'DIGITAL' } })); }}>{es ? 'Forjar mi pase' : 'Forge my pass'}</button>
        </>
      )}
    >
      <p className="sgx-hstudio__hint">
        {es
          ? `Todo empieza con tu SGX Pass. Fórjalo (toma un minuto) y desde tu pase solicitas ser ${what}. Cuando el equipo te apruebe, tu misma tarjeta cambia a ese rol.`
          : `Everything starts with your SGX Pass. Forge it (it takes a minute) and apply as ${what} from your pass. Once the team approves you, your same card switches to that role.`}
      </p>
    </SgxDialog>
  );
};

export default ForgeFirst;
