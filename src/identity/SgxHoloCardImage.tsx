import React, { useEffect, useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useSgxIdentity } from './SgxIdentityContext';
import { renderPassCardImage } from './passCardImage';

/* The SGX Pass as it really is: the Holo Card (same drawing as your Studio and
   the core). `printing` plays the Forge reveal: the card prints in from a scan line. */
export const SgxHoloCardImage: React.FC<{ printing?: boolean; className?: string }> = ({ printing = false, className }) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { identity } = useSgxIdentity();
  const [src, setSrc] = useState<string | null>(null);
  const key = [identity.pass?.code, identity.pass?.fullName, identity.callsign, identity.affinity, JSON.stringify(identity.avatar.pilot || identity.avatar.seed), identity.avatar.png?.length || 0, language].join('|');

  useEffect(() => {
    let alive = true;
    renderPassCardImage(identity, { es, scale: 1 }).then((img) => { if (alive) setSrc(img); }).catch(() => undefined);
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className={`sgx-holoimg ${printing ? 'is-printing' : ''} ${className || ''}`}>
      {src
        ? <img src={src} alt={es ? `SGX Pass de ${identity.pass?.fullName || ''}` : `SGX Pass of ${identity.pass?.fullName || ''}`} />
        : <div className="sgx-holoimg__wait" aria-hidden="true" />}
    </div>
  );
};

export default SgxHoloCardImage;
