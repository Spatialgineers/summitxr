// SGX Entrepreneur Match - Master Module Container

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  Layers, 
  Users, 
  User, 
  Zap, 
  ShieldAlert, 
  Edit3,
  Award,
  ArrowRight,
  Share2,
  Check,
  Copy
} from 'lucide-react';
import { 
  MatchProfile, 
  MatchCandidate, 
  MutualMatch 
} from './match.types';
import { MATCH_I18N } from './match.i18n';
import { MatchDeck } from './MatchDeck';
import { MyMatchesTab } from './MyMatchesTab';
import { MatchProfileTab } from './MatchProfileTab';
import { MatchProfileWizard } from './MatchProfileWizard';
import { MatchConnectionSheet } from './MatchConnectionSheet';
import { 
  loadUserMatchProfile, 
  getMatchModuleKillSwitch, 
  getLocalMatches 
} from './matchData';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { syncAppUrl, copyUnifiedLinkToClipboard, getAppRouteAndSectionFromUrl } from '../../lib/summitUrlSync';

interface MatchModuleProps {
  onOpenPassport?: () => void;
  onOpenAvatarGenerator?: () => void;
}

export type MatchModuleTab = 'deck' | 'matches' | 'profile';

export const MatchModule: React.FC<MatchModuleProps> = ({
  onOpenPassport,
  onOpenAvatarGenerator
}) => {
  const { user, playerProfile, savePlayerProfile } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant, styles } = useTenantTheme();
  const { recordActivity, syncMatchDetails } = usePilotProfile();
  const lang = (language === 'en' ? 'en' : 'es') as 'es' | 'en';
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  // Active Tab with URL Hydration
  const [activeTab, setActiveTab] = useState<MatchModuleTab>(() => {
    if (typeof window !== 'undefined') {
      const parsed = getAppRouteAndSectionFromUrl();
      if (parsed.subtab === 'matches' || parsed.subtab === 'profile' || parsed.subtab === 'deck') {
        return parsed.subtab as MatchModuleTab;
      }
      const params = new URLSearchParams(window.location.search);
      const rawSub = params.get('subtab') || params.get('view');
      if (rawSub === 'matches' || rawSub === 'profile' || rawSub === 'deck') {
        return rawSub as MatchModuleTab;
      }
    }
    return 'deck';
  });

  // Share link feedback
  const [copiedLink, setCopiedLink] = useState(false);

  // Kill Switch
  const [isModuleEnabled, setIsModuleEnabled] = useState<boolean>(getMatchModuleKillSwitch());

  // User Profile
  const [myProfile, setMyProfile] = useState<MatchProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);

  // Connection Sheet State
  const [celebrationMatch, setCelebrationMatch] = useState<MutualMatch | null>(null);

  // Match Count Badge
  const [matchCount, setMatchCount] = useState<number>(() => getLocalMatches().length);

  const myUid = user?.uid || 'local_player';
  const myName = playerProfile?.nickname || (user?.isAnonymous ? 'Spatialgineer Anonymous' : user?.displayName || 'Builder');
  const myAvatar = playerProfile?.avatar || '';
  const myXp = playerProfile?.totalScore || 350;

  // Load existing profile on mount
  useEffect(() => {
    async function load() {
      setLoadingProfile(true);
      const profile = await loadUserMatchProfile(myUid);
      setMyProfile(profile);
      if (profile) {
        syncMatchDetails(profile.pitch || '', profile.brings || [], profile.seeking || []);
      }
      setMatchCount(getLocalMatches().length);
      setLoadingProfile(false);
    }
    load();
  }, [myUid, syncMatchDetails]);

  // Handle Tab Navigation & URL Synchronization
  const handleSelectTab = (tab: MatchModuleTab) => {
    playUiChirp();
    setActiveTab(tab);
    if (tab === 'matches') {
      setMatchCount(getLocalMatches().length);
    }
    syncAppUrl({
      section: 'ENTREPRENEUR_MATCH',
      subtab: tab,
      replace: false,
    });
  };

  const handleCopyShareLink = async () => {
    playScanSuccessSound();
    const success = await copyUnifiedLinkToClipboard({
      section: 'ENTREPRENEUR_MATCH',
      subtab: activeTab,
    });
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    }
  };

  // Tick passport quest progress
  const updatePassportProgress = useCallback((stepKey: string) => {
    try {
      const saved = localStorage.getItem('sgx_passport_quests');
      const quests = saved ? JSON.parse(saved) : {};
      quests[stepKey] = true;
      localStorage.setItem('sgx_passport_quests', JSON.stringify(quests));
    } catch {}
  }, []);

  // Handle Wizard Completion
  const handleWizardCompleted = async (savedProfile: MatchProfile, isFirstPublish: boolean) => {
    setMyProfile(savedProfile);
    setIsWizardOpen(false);
    handleSelectTab('deck');

    // Update Passport Quest: Step 1 (Create Profile)
    updatePassportProgress('quest_match_profile');
    syncMatchDetails(savedProfile.pitch || '', savedProfile.brings || [], savedProfile.seeking || []);

    recordActivity(
      'avatar_customized',
      'Perfil de Matchmaking Publicado',
      `Registraste tu pitch ("${savedProfile.pitch}") y habilidades en el networking del summit.`,
      150,
      tenant.branding.primaryColor || '#FDCC0D'
    );

    // Award +150 XP on first publish
    if (isFirstPublish && savePlayerProfile) {
      try {
        const currentScore = playerProfile?.totalScore || 0;
        await savePlayerProfile({
          totalScore: currentScore + 150
        });
      } catch (err) {
        console.warn('Failed to award profile creation XP:', err);
      }
    }
  };

  // Handle Mutual Match Encounter
  const handleMutualMatch = async (match: MutualMatch) => {
    setCelebrationMatch(match);
    const updatedMatches = getLocalMatches();
    setMatchCount(updatedMatches.length);

    // Update Passport Quest: Step 2 (First Match)
    updatePassportProgress('quest_match_first');

    const matchedName = match.candidateB?.displayName || match.candidateA?.displayName || (es ? 'Emprendedor' : 'Entrepreneur');
    const matchedRole = match.candidateB?.roleTitle || match.candidateA?.roleTitle || 'Founder';

    recordActivity(
      'match_connection',
      `Match Realizado con ${matchedName}`,
      `Conectaste en Matchmaking con ${matchedName} (${matchedRole}). Chat y credenciales compartidas.`,
      100,
      tenant.branding.primaryColor || '#FDCC0D'
    );

    // Award +100 XP for mutual match
    if (savePlayerProfile) {
      try {
        const currentScore = playerProfile?.totalScore || 0;
        const newScore = currentScore + 100;
        await savePlayerProfile({
          totalScore: newScore
        });
      } catch (err) {
        console.warn('Failed to award match XP:', err);
      }
    }

    // Step 3 (Reach 3 matches): +250 XP squad bonus
    if (updatedMatches.length >= 3) {
      const bonusAwarded = localStorage.getItem('sgx_match_squad_bonus_awarded');
      if (!bonusAwarded) {
        localStorage.setItem('sgx_match_squad_bonus_awarded', 'true');
        updatePassportProgress('quest_match_squad');
        recordActivity(
          'match_connection',
          'Bonus de Red: 3+ Matches Alcanzados',
          'Has alcanzado 3 conexiones clave en el ecosistema emprendedor del summit.',
          250,
          tenant.branding.accentColor || '#FDCC0D'
        );
        if (savePlayerProfile) {
          try {
            const current = playerProfile?.totalScore || 0;
            await savePlayerProfile({
              totalScore: current + 250
            });
          } catch {}
        }
      }
    }
  };

  // Check Kill Switch
  if (!isModuleEnabled) {
    return (
      <div className="w-full max-w-xl mx-auto py-16 px-4 text-center text-white">
        <div className="w-16 h-16 rounded-2xl bg-amber-950/40 border border-amber-500/40 mx-auto flex items-center justify-center mb-4 text-amber-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-bold font-sans mb-2">
          {es ? 'Módulo en Mantenimiento Táctico' : 'Module in Tactical Maintenance'}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          {es ? 'El módulo de Entrepreneur Match está pausado temporalmente por la dirección técnica del evento. Regresa en unos minutos.' : 'The Entrepreneur Match module is temporarily paused by the event\'s technical team. Come back in a few minutes.'}
        </p>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div 
          className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mb-4"
          style={{ borderColor: `var(--sgx-neon)` }}
        />
        <p className="text-xs font-mono text-slate-400">
          {es ? 'Verificando credenciales de fundador...' : 'Verifying founder credentials...'}
        </p>
      </div>
    );
  }

  // Gate Check: If user does not have a profile, show the onboarding wizard
  if (!myProfile || isWizardOpen) {
    return (
      <div className="py-6 px-3">
        <MatchProfileWizard
          initialProfile={myProfile}
          userUid={myUid}
          userName={myName}
          userAvatar={myAvatar}
          userXp={myXp}
          lang={lang}
          onCompleted={handleWizardCompleted}
          onCancel={myProfile ? () => setIsWizardOpen(false) : undefined}
        />
      </div>
    );
  }

  const myCandidate: MatchCandidate = {
    uid: myUid,
    displayName: myName,
    avatarUrl: myAvatar,
    xp: myXp,
    profile: myProfile
  };

  return (
    <div id="summit-section-match" className="w-full max-w-4xl mx-auto py-4 px-2 sm:px-4 space-y-6">
      {/* Module Navigation Tabs Header */}
      <div 
        className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)]/70 p-2 sm:p-3 flex items-center justify-between shadow-xl flex-wrap gap-2 transition-all"
        style={{
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
          boxShadow: `0 0 20px ${tenant.branding.glowShadow || 'rgba(0,0,0,0.5)'}`
        }}
      >
        {/* Brand glyph */}
        <div className="flex items-center gap-2.5 px-3">
          <div 
            className="w-8 h-8 rounded-xl flex items-center justify-center border transition-all"
            style={{
              backgroundColor: `rgba(var(--sgx-primary-rgb), 0.15)`,
              borderColor: `var(--sgx-primary)`,
              color: `var(--sgx-primary)`
            }}
          >
            <Zap className="w-4 h-4 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span 
                className="text-xs font-mono font-bold tracking-wider"
                style={{ color: `var(--sgx-neon)` }}
              >
                {strings.navGlyphLabel}
              </span>
              <span 
                className="w-1.5 h-1.5 rounded-full animate-ping"
                style={{ backgroundColor: `var(--sgx-neon)` }}
              />
            </div>
            <h2 className="text-sm font-bold text-white font-['Orbitron',sans-serif]">
              {strings.navTitle}
            </h2>
          </div>
        </div>

        {/* Action Controls & Tab Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Direct Copy Link Button */}
          <button
            onClick={handleCopyShareLink}
            type="button"
            className="px-2.5 py-1.5 rounded-xl border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-[11px] font-mono flex items-center gap-1.5 text-slate-300 hover:text-white transition-all bg-[var(--sgx-bg)]/80 cursor-pointer"
            title={es ? 'Copiar enlace directo a este módulo de Matchmaking' : 'Copy a direct link to this Matchmaking module'}
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 font-bold">{es ? '¡Enlace Copiado!' : 'Link Copied!'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span className="hidden sm:inline">{es ? 'Compartir Match' : 'Share Match'}</span>
              </>
            )}
          </button>

          {/* Tab Controls */}
          <div className="flex items-center gap-1 bg-[#101010] border border-[var(--sgx-secondary)]/60 p-1 rounded-2xl">
            {/* Deck Tab */}
            <button
              onClick={() => handleSelectTab('deck')}
              style={activeTab === 'deck' ? {
                backgroundColor: `var(--sgx-primary)`,
                color: '#000000',
                boxShadow: `0 0 12px var(--sgx-glow)`
              } : undefined}
              className={`py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'deck'
                  ? 'font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{strings.tabDeck}</span>
            </button>

            {/* Matches Tab */}
            <button
              onClick={() => handleSelectTab('matches')}
              style={activeTab === 'matches' ? {
                backgroundColor: `var(--sgx-primary)`,
                color: '#000000',
                boxShadow: `0 0 12px var(--sgx-glow)`
              } : undefined}
              className={`py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'matches'
                  ? 'font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>{strings.tabMatches}</span>
              {matchCount > 0 && (
                <span 
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-bold transition-all"
                  style={{
                    backgroundColor: activeTab === 'matches' ? '#000000' : `var(--sgx-neon)`,
                    color: activeTab === 'matches' ? `var(--sgx-neon)` : '#000000'
                  }}
                >
                  {matchCount}
                </span>
              )}
            </button>

            {/* My Profile Tab */}
            <button
              onClick={() => handleSelectTab('profile')}
              style={activeTab === 'profile' ? {
                backgroundColor: `var(--sgx-primary)`,
                color: '#000000',
                boxShadow: `0 0 12px var(--sgx-glow)`
              } : undefined}
              className={`py-2 px-3 sm:px-4 rounded-xl font-mono text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>{strings.tabProfile}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="pt-2">
        {activeTab === 'deck' && (
          <MatchDeck
            myUid={myUid}
            myCandidate={myCandidate}
            lang={lang}
            onMutualMatch={handleMutualMatch}
            onEditProfile={() => setIsWizardOpen(true)}
          />
        )}

        {activeTab === 'matches' && (
          <MyMatchesTab
            myUid={myUid}
            lang={lang}
            onGoToDeck={() => handleSelectTab('deck')}
          />
        )}

        {activeTab === 'profile' && (
          <MatchProfileTab
            candidate={myCandidate}
            lang={lang}
            onEditProfile={() => setIsWizardOpen(true)}
            onProfileUpdated={updated => setMyProfile(updated)}
          />
        )}
      </div>

      {/* Celebratory Post-Match Modal Sheet */}
      {celebrationMatch && (
        <MatchConnectionSheet
          match={celebrationMatch}
          myUid={myUid}
          lang={lang}
          onClose={() => setCelebrationMatch(null)}
          onGoToMatches={() => {
            setCelebrationMatch(null);
            handleSelectTab('matches');
          }}
        />
      )}
    </div>
  );
};
