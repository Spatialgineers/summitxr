// SGX Entrepreneur Match - Master Module Container

import React, { useState, useEffect, useCallback } from 'react';
import { Layers, Users, User, Zap, ShieldAlert, Share2, Check } from 'lucide-react';
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
  getLocalMatches,
  syncRemoteMatches
} from './matchData';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useTenantTheme } from '../../context/TenantThemeContext';
import '../../components/summit/sgx-kit.css';
import './match.css';
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
  const { tenant } = useTenantTheme();
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
  const myXp = playerProfile?.totalScore ?? 0;

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
      // Matches completed by the other person while we were away.
      const fresh = await syncRemoteMatches(myUid);
      if (fresh.length) {
        setMatchCount(getLocalMatches().length);
        setCelebrationMatch(fresh[0]);
      }
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


  // Handle Wizard Completion
  const handleWizardCompleted = async (savedProfile: MatchProfile, isFirstPublish: boolean) => {
    setMyProfile(savedProfile);
    setIsWizardOpen(false);
    handleSelectTab('deck');

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
      <div className="sgx-card sgx-match__empty">
        <ShieldAlert aria-hidden />
        <h3 className="sgx-h">{es ? 'SGX.Match está en pausa' : 'SGX.Match is paused'}</h3>
        <p className="sgx-copy">
          {es ? 'El equipo técnico pausó el módulo por un momento. Vuelve en unos minutos.' : 'The technical team paused the module for a moment. Come back in a few minutes.'}
        </p>
      </div>
    );
  }

  if (loadingProfile) {
    return (
      <div className="sgx-match__state" role="status">
        <span className="sgx-match__spinner" aria-hidden />
        <p className="sgx-fine">{es ? 'Cargando tu perfil…' : 'Loading your profile…'}</p>
      </div>
    );
  }

  // Gate Check: If user does not have a profile, show the onboarding wizard
  if (!myProfile || isWizardOpen) {
    return (
      <div className="sgx-match">
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

  const tabItems: { id: MatchModuleTab; label: string; icon: typeof Layers; count?: number }[] = [
    { id: 'deck', label: strings.tabDeck, icon: Layers },
    { id: 'matches', label: strings.tabMatches, icon: Users, count: matchCount },
    { id: 'profile', label: strings.tabProfile, icon: User },
  ];

  return (
    <div id="summit-section-match" className="sgx-match">
      <div className="sgx-card sgx-card--sm sgx-match__nav">
        <div className="sgx-match__brand">
          <span className="sgx-match__glyph" aria-hidden><Zap /></span>
          <div>
            <p className="sgx-kicker">{strings.navGlyphLabel}</p>
            <h2 className="sgx-h">{strings.navTitle}</h2>
          </div>
        </div>
        <div className="sgx-hangar__tabs sgx-match__tabs" role="tablist" aria-label={strings.navTitle}>
          {tabItems.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" role="tab" aria-selected={activeTab === t.id} className={activeTab === t.id ? 'is-on' : ''} onClick={() => handleSelectTab(t.id)}>
                <Icon aria-hidden />{t.label}{t.count ? <span className="sgx-match__n">{t.count}</span> : null}
              </button>
            );
          })}
        </div>
        <button type="button" className="sgx-iconbtn" onClick={handleCopyShareLink} aria-label={es ? 'Copiar enlace a SGX.Match' : 'Copy link to SGX.Match'} title={copiedLink ? (es ? 'Enlace copiado' : 'Link copied') : undefined}>
          {copiedLink ? <Check aria-hidden /> : <Share2 aria-hidden />}
        </button>
      </div>

      {/* Main Tab Content */}
      <div>
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
