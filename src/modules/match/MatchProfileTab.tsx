// SGX Entrepreneur Match - My Profile Management Tab

import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Edit3, 
  Sparkles, 
  ShieldCheck, 
  Zap,
  Info
} from 'lucide-react';
import { MatchProfile, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { MatchCard } from './MatchCard';
import { saveUserMatchProfile } from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';

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
    <div className="w-full max-w-md mx-auto space-y-4 text-white">
      {/* Controls Header */}
      <div className="bg-[#0f0f0f] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-lg">
        {/* Visibility Toggle */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleToggleVisibility}
            disabled={isUpdating}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isVisible
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <div>
            <p className="text-xs font-mono font-bold">
              {isVisible ? strings.profileVisible : strings.profileHidden}
            </p>
            <p className="text-[10px] text-slate-400">
              {isVisible ? 'Otros fundadores pueden verte en el mazo.' : 'Tu tarjeta está oculta del mazo.'}
            </p>
          </div>
        </div>

        {/* Edit Button */}
        <button
          onClick={onEditProfile}
          className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
        >
          <Edit3 className="w-3.5 h-3.5 text-[#00DDFF]" />
          <span>{strings.profileEdit}</span>
        </button>
      </div>

      {/* Card Preview */}
      <div className="flex justify-center">
        <MatchCard
          candidate={candidate}
          lang={lang}
          onPass={() => {}}
          onConnect={() => {}}
        />
      </div>

      {/* Helper text */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 flex items-center gap-2">
        <Info className="w-4 h-4 text-[#00DDFF] flex-shrink-0" />
        <span>Las opciones [Pasar] y [Conectar] en esta vista previa están deshabilitadas ya que es tu propia tarjeta.</span>
      </div>
    </div>
  );
};
