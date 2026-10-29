// SGX Entrepreneur Match - My Profile Management Tab

import React, { useState } from 'react';
import { Eye, EyeOff, Edit3 } from 'lucide-react';
import { MatchProfile, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { MatchCard } from './MatchCard';
import { saveUserMatchProfile } from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';

interface MatchProfileTabProps {
  candidate: MatchCandidate;
  lang?: 'es' | 'en';
  onEditProfile: () => void;
  onProfileUpdated: (newProfile: MatchProfile) => void;
}

export const MatchProfileTab: React.FC<MatchProfileTabProps> = ({
  candidate,
  lang = 'es',
  onEditProfile,
  onProfileUpdated
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;
  const [isVisible, setIsVisible] = useState<boolean>(candidate.profile.visible !== false);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const handleToggleVisibility = async () => {
    playUiChirp();
    const next = !isVisible;
    setIsVisible(next);
    setIsUpdating(true);

    const updatedProfile: MatchProfile = {
      ...candidate.profile,
      visible: next,
      updatedAt: new Date().toISOString()
    };

    await saveUserMatchProfile(candidate.uid, updatedProfile);
    onProfileUpdated(updatedProfile);
    setIsUpdating(false);
  };

  return (
    <div className="sgx-match__profile">
      <div className="sgx-card sgx-card--sm sgx-match__bar">
        <button
          type="button"
          className="sgx-match__toggle"
          role="switch"
          aria-checked={isVisible}
          onClick={handleToggleVisibility}
          disabled={isUpdating}
        >
          <span className="sgx-iconbtn" aria-hidden>{isVisible ? <Eye /> : <EyeOff />}</span>
          <span>
            <strong>{isVisible ? strings.profileVisible : strings.profileHidden}</strong>
            <small>{isVisible ? (es ? 'Otros creadores pueden verte en el mazo.' : 'Other creators can see you in the deck.') : (es ? 'Tu tarjeta está oculta del mazo.' : 'Your card is hidden from the deck.')}</small>
          </span>
        </button>
        <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={onEditProfile}>
          <Edit3 aria-hidden />{strings.profileEdit}
        </button>
      </div>

      <MatchCard candidate={candidate} lang={lang} onPass={() => {}} onConnect={() => {}} preview />
    </div>
  );
};
