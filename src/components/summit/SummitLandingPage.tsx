import { PassGate } from '../../identity/PassGate';
import { pillarIcon } from '../../lib/sgxPillars';
import { SGX_YOUTUBE } from '../../lib/sgxLinks';
import { SgxStandby } from '../../immersion/SgxStandby';
import { SgxPassSection, SgxHoloStudioPanel } from '../../identity/SgxPassSection';
import { useOptionalSgxIdentity } from '../../identity/SgxIdentityContext';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { LazyBoundary } from '../common/LazyBoundary';
import { LazyFallback } from '../common/LazyFallback';
import { SpatialTiltCard } from '../common/SpatialTiltCard';
import { SummitAnalyticsView } from '../analytics/SummitAnalyticsView';
import { 
  Compass, 
  Calendar, 
  Radio, 
  Users, 
  Gamepad2, 
  BarChart3, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Tv, 
  Layers, 
  ExternalLink, 
  Download, 
  Globe, 
  Clock, 
  Play, 
  Ticket, Video, 
  Share2, 
  ChevronRight, 
  ChevronLeft,
  Award, 
  Flame,
  Boxes,
  CheckCircle2,
  X,
  Lock,
  Building2,
  LogIn,
  Send,
  HelpCircle,
  Zap,
  Tag,
  MessageSquare,
  Volume2,
  VolumeX,
  Trophy,
  Activity,
  ScanLine,
  Shield,
  Sliders,
  Instagram,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Menu
} from 'lucide-react';
import { 
  SummitSession, 
  SummitSpeaker, 
  Map360Node, 
  EmbedWidget, 
  SponsorshipTier, 
  SummitNotification, 
  SummitPillarId,
  SponsorInquiry,
  ApprovedSponsor
} from '../../types/summit';
import { 
  INITIAL_SUMMIT_SESSIONS, 
  INITIAL_SUMMIT_SPEAKERS, 
  INITIAL_MAP_360_NODES, 
  INITIAL_EMBED_WIDGETS, 
  SPONSORSHIP_TIERS,
  loadPersistedSessions,
  loadPersistedSpeakers,
  loadPersistedMapNodes,
  loadPersistedEmbedWidgets,
  loadPersistedSponsorshipTiers,
  loadAllApprovedSponsors,
  playNotificationChime,
  downloadICS,
  getGoogleCalendarUrl
} from '../../lib/summitData';

import { useAuth } from '../../context/AuthContext';
import { Summit360MapViewer } from './Summit360MapViewer';
import { SummitAgendaBuilder } from './SummitAgendaBuilder';
import { SummitNetworkingChat } from './SummitNetworkingChat';
import { SummitPushAlertToast } from './SummitPushAlertToast';
import { subscribeAnnouncement } from '../../lib/summitData';
import { SummitSponsorInquiryForm } from './SummitSponsorInquiryForm';
import { SummitCountdownVisualizer } from './SummitCountdownVisualizer';
import { SgxChromaArrival } from './SgxChromaArrival';
import { SummitSponsorTicker } from './SummitSponsorTicker';
import { PillarTenantSelector } from './PillarTenantSelector';
import { SgxGuildShowcaseSection } from './SgxGuildShowcaseSection';
import { SummitBrandShowcaseModal } from './SummitBrandShowcaseModal';
import { SummitSectionsDropdown, SummitSectionKey } from './SummitSectionsDropdown';
import { SummitExperienceHub } from './SummitExperienceHub';
import { SummitRewardsStoreModal } from './SummitRewardsStoreModal';
import { KeynotePulseReactions } from './KeynotePulseReactions';
import { SgxSectionHudBar, HudSectionChip } from './SgxSectionHudBar';
import { SgxPillarStation } from './SgxPillarStation';
import { SGX_PILLARS, pillarOfSection, findPillar } from '../../lib/sgxPillars';
import { SummitPrivacyPolicyModal } from './SummitPrivacyPolicyModal';
import { LiveSocialStream } from './LiveSocialStream';
import { SgxPillarsManifestoSection } from './SgxPillarsManifestoSection';
import { SummitRunOfShowTimeline } from './SummitRunOfShowTimeline';
import { SummitSpeakersDeck } from './SummitSpeakersDeck';
import { SummitSponsorshipMatrix } from './SummitSponsorshipMatrix';
import { SummitSectionBanner } from './SummitSectionBanner';
import { TransientSponsorSlot } from './TransientSponsorSlot';
import { getAppRouteAndSectionFromUrl, getSectionFromUrl, syncAppUrl, syncSectionToUrl, scrollToSectionContainer, SECTION_TO_SLUG } from '../../lib/summitUrlSync';
import { toggleCyberAmbiance, getIsCyberAmbiancePlaying, playUiChirp, playPillarDockSound, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useSummitFeatures } from '../../context/SummitFeatureContext';
import { SummitContentAuditModal } from './SummitContentAuditModal';
import { SummitWeeklyCapsules } from './SummitWeeklyCapsules';

// Heavy, on-demand modules (Leaflet radar, jsQR scanner, drone game, Match, avatar studio).
const SummitVisitRadar = lazy(() => import('./SummitVisitRadar').then((m) => ({ default: m.SummitVisitRadar })));
const SummitEmbedsHub = lazy(() => import('./SummitEmbedsHub').then((m) => ({ default: m.SummitEmbedsHub })));
const MatchModule = lazy(() => import('../../modules/match/MatchModule').then((m) => ({ default: m.MatchModule })));
const NetworkingQrScannerModal = lazy(() => import('./NetworkingQrScannerModal').then((m) => ({ default: m.NetworkingQrScannerModal })));
const SummitSpeakerPortalModal = lazy(() => import('./SummitSpeakerPortalModal').then((m) => ({ default: m.SummitSpeakerPortalModal })));

// Every section's home pillar, chips and icons come from the single six-pillar source (lib/sgxPillars).
const HUD_SECTION_CHIPS: HudSectionChip[] = SGX_PILLARS.flatMap((p) =>
  p.modules.flatMap((m) => (m.kind === 'section'
    ? [{ key: m.key as SummitSectionKey, label: m.label.es, labelEn: m.label.en, pillar: p.id, icon: m.icon }]
    : [])),
);

const SECTION_TO_PILLAR_MAP: Record<string, { pillarId: string; color: string; iconUrl: string }> = Object.fromEntries(
  HUD_SECTION_CHIPS.map((chip) => {
    const p = pillarOfSection(chip.key)!;
    return [chip.key, { pillarId: p.id, color: '#FDCC0D', iconUrl: p.iconUrl }];
  }),
);

interface SummitLandingPageProps {
  onNavigateToVisualizer?: () => void;
  onNavigateToPlayVote?: () => void;
  onNavigateToAdmin?: () => void;
}

export const SummitLandingPage: React.FC<SummitLandingPageProps> = ({
  onNavigateToVisualizer,
  onNavigateToPlayVote,
  onNavigateToAdmin,
}) => {
  const { user, playerProfile, isAdmin, signInWithGoogle, loading: authLoading, authError, recordActivity } = useAuth();
  const { tenant, styles, selectPillar } = useTenantTheme();
  const { language, setLanguage, t } = useLanguage();
  const es = language === 'es';
  const { 
    profile, 
    isProfileModalOpen, 
    setIsProfileModalOpen,
    isRoleModalOpen,
    setIsRoleModalOpen,
    liteMode,
    setLiteMode
  } = usePilotProfile();
  const {
    isFeatureActive,
    isFeatureVisible,
    isSectionVisible,
    getSectionStatus,
    isAuditModalOpen,
    setAuditModalOpen,
  } = useSummitFeatures();
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);
  const embeddedHoloIframeRef = useRef<HTMLIFrameElement>(null);
  // One source of truth: the SGX Pass identity store.
  const sgxIdentity = useOptionalSgxIdentity();
  const hasRegisteredTicket = !!sgxIdentity?.isForged;
  const hasGeneratedHoloCard = !!sgxIdentity?.identity.holo?.image;

  // Global 3D Interactive Tilt & Specular Parallax Engine across all cards & panels
  useEffect(() => {
    let activeCard: HTMLElement | null = null;

    const resetCardTilt = (el: HTMLElement | null) => {
      if (!el) return;
      el.style.setProperty('--sgx-tilt-x', '0deg');
      el.style.setProperty('--sgx-tilt-y', '0deg');
    };

    const handleGlobalPointerMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Skip tilting when interacting inside a live WebGL canvas so 3D cameras/games aren't skewed
      if (target.tagName === 'CANVAS') {
        if (activeCard) {
          resetCardTilt(activeCard);
          activeCard = null;
        }
        return;
      }

      const card = target.closest(
        '.sgx-spatial-card, .sgx-crystal-card, .sgx-glass-relief, .tenant-card, .sgx-cyber-card'
      ) as HTMLElement | null;

      if (activeCard && activeCard !== card) {
        resetCardTilt(activeCard);
      }

      if (!card) {
        activeCard = null;
        return;
      }

      activeCard = card;
      const rect = card.getBoundingClientRect();
      // For very large full-width containers, use gentler tilt angles; for smaller cards, use deeper 3D relief
      const maxAngle = rect.width > 720 ? 1.6 : 4.8;
      const relX = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const relY = (e.clientY - rect.top) / Math.max(rect.height, 1);

      const tiltX = ((0.5 - relY) * maxAngle * 2).toFixed(2);
      const tiltY = ((relX - 0.5) * maxAngle * 2).toFixed(2);

      card.style.setProperty('--sgx-tilt-x', `${tiltX}deg`);
      card.style.setProperty('--sgx-tilt-y', `${tiltY}deg`);
      card.style.setProperty('--sgx-spot-x', `${(relX * 100).toFixed(1)}%`);
      card.style.setProperty('--sgx-spot-y', `${(relY * 100).toFixed(1)}%`);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      if (activeCard) resetCardTilt(activeCard);
    };
  }, []);

  // Active Section Tab with URL Deep Link initial hydration
  const [activeSection, setActiveSection] = useState<SummitSectionKey>(() => {
    const fromUrl = getSectionFromUrl();
    return fromUrl || 'OVERVIEW';
  });
  const [activePillarSlug, setActivePillarSlug] = useState<string>(() => {
    if (typeof window === 'undefined') return 'story';
    return findPillar(new URLSearchParams(window.location.search).get('subtab'))?.slug || 'story';
  });
  const [agendaViewMode, setAgendaViewMode] = useState<'TIMELINE' | 'BUILDER'>(() => {
    if (typeof window !== 'undefined') {
      const mode = new URLSearchParams(window.location.search).get('view');
      if (mode?.toUpperCase() === 'BUILDER') return 'BUILDER';
    }
    return 'TIMELINE';
  });

  const handleSelectSection = (sec: SummitSectionKey, scroll: boolean = true) => {
    setActiveSection(sec);
    const mappedPillar = SECTION_TO_PILLAR_MAP[sec];
    if (mappedPillar) {
      selectPillar(mappedPillar.pillarId);
      playPillarDockSound(mappedPillar.pillarId);
      window.dispatchEvent(new CustomEvent('sgx:pillar_docked', { detail: { pillarId: mappedPillar.pillarId } }));
    }
    if (sec !== 'PILLAR') syncAppUrl({ page: 'summit', section: sec, replace: false });
    if (scroll) {
      scrollToSectionContainer(sec);
    }
  };

  // Tell the app shell which section is showing: only the 3D core (OVERVIEW)
  // locks the page height; every other section must scroll. Every path that
  // changes the section (buttons, core, URL) goes through this one effect.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('sgx:summit_section_changed', { detail: { section: activeSection } }));
  }, [activeSection]);

  // Sincronización en tiempo real de eventos de navegación global (HeaderNav, enlaces internos, etc.)
  useEffect(() => {
    const handleSwitchSectionEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ section: SummitSectionKey; pillar?: string }>;
      if (customEvent.detail?.section) {
        const station = findPillar(customEvent.detail.pillar);
        if (customEvent.detail.section === 'PILLAR' && station) setActivePillarSlug(station.slug);
        setActiveSection(customEvent.detail.section);
        const timer = setTimeout(() => {
          scrollToSectionContainer(customEvent.detail.section);
        }, 100);
        return () => clearTimeout(timer);
      }
    };
    const handleOpenAudit = () => setAuditModalOpen(true);
    const handleOpenSpeakerPortal = () => setSpeakerPortalOpen(true);
    window.addEventListener('sgx:open_speaker_portal', handleOpenSpeakerPortal);
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
    const handleOpenSponsor = () => handleOpenSponsorModal('tier_2');

    window.addEventListener('sgx:switch_summit_section', handleSwitchSectionEvent);
    window.addEventListener('sgx:open_audit_modal', handleOpenAudit);
    window.addEventListener('sgx:open_analytics', handleOpenAnalytics);
    window.addEventListener('sgx:open_sponsor_modal', handleOpenSponsor);

    return () => {
      window.removeEventListener('sgx:switch_summit_section', handleSwitchSectionEvent);
      window.removeEventListener('sgx:open_audit_modal', handleOpenAudit);
      window.removeEventListener('sgx:open_speaker_portal', handleOpenSpeakerPortal);
      window.removeEventListener('sgx:open_analytics', handleOpenAnalytics);
      window.removeEventListener('sgx:open_sponsor_modal', handleOpenSponsor);
    };
  }, []);

  // Viewport-First In-Screen Holographic Workspace Tab on OVERVIEW
  const [overviewDockTab, setOverviewDockTab] = useState<'CORE_PILLARS' | 'AGENDA_3DAYS' | 'SPONSORS' | 'VENUE_360' | 'SOCIAL_RADAR'>('CORE_PILLARS');
  const [timeCapsulesModalOpen, setTimeCapsulesModalOpen] = useState<boolean>(false);
  const [expandedDayId, setExpandedDayId] = useState<string | null>(null);
  const [copiedHashtag, setCopiedHashtag] = useState<string | null>(null);

  // Compact Live Countdown to Dec 11, 2026 10:00 AM AST
  const [timeLeft, setTimeLeft] = useState(() => {
    const target = new Date('2026-12-11T10:00:00-04:00').getTime();
    const diff = Math.max(0, target - Date.now());
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
    };
  });

  useEffect(() => {
    const target = new Date('2026-12-11T10:00:00-04:00').getTime();
    const interval = setInterval(() => {
      const diff = Math.max(0, target - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initial Auto-scroll to section if opened via direct URL link
  useEffect(() => {
    const parsed = getAppRouteAndSectionFromUrl();
    if (parsed.summitSection && parsed.summitSection !== 'OVERVIEW') {
      setActiveSection(parsed.summitSection);
      const timer = setTimeout(() => {
        scrollToSectionContainer(parsed.summitSection!);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  // Synchronize browser back and forward navigation
  useEffect(() => {
    const handleUrlChange = () => {
      const parsed = getAppRouteAndSectionFromUrl();
      if (parsed.summitSection && parsed.summitSection !== activeSection) {
        setActiveSection(parsed.summitSection);
      }
    };
    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [activeSection]);

  // Core Data States with LocalStorage Hydration
  const [sessions, setSessions] = useState<SummitSession[]>(() => loadPersistedSessions());
  const [speakers, setSpeakers] = useState<SummitSpeaker[]>(() => loadPersistedSpeakers());
  const [mapNodes, setMapNodes] = useState<Map360Node[]>(() => loadPersistedMapNodes());
  const [embeds, setEmbeds] = useState<EmbedWidget[]>(() => loadPersistedEmbedWidgets());
  const [sponsors, setSponsors] = useState<SponsorshipTier[]>(() => loadPersistedSponsorshipTiers());
  const [approvedSponsors, setApprovedSponsors] = useState<ApprovedSponsor[]>(() => loadAllApprovedSponsors());

  // Push Notification State
  const [activeToastNotif, setActiveToastNotif] = useState<SummitNotification | null>(null);

  // Modal States
  const [selectedSessionModal, setSelectedSessionModal] = useState<SummitSession | null>(null);
  const [selectedSpeakerModal, setSelectedSpeakerModal] = useState<SummitSpeaker | null>(null);
  const [selectedMapNodeId, setSelectedMapNodeId] = useState<string>('node_chroma_studios');
  const [rewardsStoreModalOpen, setRewardsStoreModalOpen] = useState<boolean>(false);
  const [qrScannerModalOpen, setQrScannerModalOpen] = useState<boolean>(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [isAmbiancePlaying, setIsAmbiancePlaying] = useState<boolean>(false);
  const [sponsorInquiryModalOpen, setSponsorInquiryModalOpen] = useState<boolean>(false);
  const [selectedSponsorTierId, setSelectedSponsorTierId] = useState<string>('tier_2');
  const [selectedBrandShowcase, setSelectedBrandShowcase] = useState<ApprovedSponsor | null>(null);
  const [isHoloCardModalOpen, setIsHoloCardModalOpen] = useState<boolean>(false);
  const [speakerPortalOpen, setSpeakerPortalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      return search.includes('portal=speaker') || search.includes('speaker_portal=true');
    }
    return false;
  });

  // First-time visitors get the Forja de identidad (SgxPassHost), not a tour.

  const handleToggleAmbiance = () => {
    const isPlaying = toggleCyberAmbiance();
    setIsAmbiancePlaying(isPlaying);
    playUiChirp(isPlaying ? 880 : 440);
  };

  // Listen for storage events & global custom events (for drawer triggers)
  useEffect(() => {
    const handleStorage = () => {
      setApprovedSponsors(loadAllApprovedSponsors());
      setSessions(loadPersistedSessions());
      setSpeakers(loadPersistedSpeakers());
      setMapNodes(loadPersistedMapNodes());
      setEmbeds(loadPersistedEmbedWidgets());
      setSponsors(loadPersistedSponsorshipTiers());
    };

    const handleOpenRewards = () => setRewardsStoreModalOpen(true);
    const handleOpenQrScanner = () => setQrScannerModalOpen(true);

    window.addEventListener('storage', handleStorage);
    const handleOpenSponsorshipsEvent = (e: any) => {
      if (e.detail?.preferredTier) {
        setSelectedSponsorTierId(e.detail.preferredTier);
      }
      setSponsorInquiryModalOpen(true);
    };

    const handleOpenBrandShowcaseEvent = (e: any) => {
      if (e.detail?.sponsor) {
        setSelectedBrandShowcase(e.detail.sponsor);
      }
    };

    window.addEventListener('sgx:open_rewards', handleOpenRewards);
    window.addEventListener('sgx:open_qr_scanner', handleOpenQrScanner);
    window.addEventListener('sgx:open_sponsorships', handleOpenSponsorshipsEvent);
    window.addEventListener('sgx:open_brand_showcase', handleOpenBrandShowcaseEvent);

    // Every Holo Card (pass, speaker, initiate, sponsor) opens in SgxPassHost's single Studio.

    const handleSwitchSummitSection = (e: any) => {
      if (e.detail?.section) {
        handleSelectSection(e.detail.section, true);
        const station = e.detail.section === 'PILLAR' ? findPillar(e.detail.pillar) : undefined;
        if (station) {
          selectPillar(station.id);
          playPillarDockSound(station.id);
        }
      }
    };
    window.addEventListener('sgx:switch_summit_section', handleSwitchSummitSection);

    const handleCredentialMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'SGX_CREDENTIAL_EXPORTED') {
        playScanSuccessSound();
        recordActivity?.('holo_card_generated', 150, 'SGX Holo Card 3D Generada');
        setActiveToastNotif({
          id: `holo_xp_${Date.now()}`,
          title: (es ? '¡Credencial SGX Exportada (+150 XP)!' : 'SGX Credential Exported (+150 XP)!'),
          message: (es ? `Tu pase holográfico (${e.data.name || 'Visitante'}) ha sido generado y acreditado en tu SGX Pass.` : `Your holographic pass (${e.data.name || 'Visitor'}) has been generated and credited to your SGX Pass.`),
          timestamp: Date.now(),
          type: 'SYSTEM',
          priority: 'HIGH',
          actionUrl: '/summit',
          actionLabel: (es ? 'Ver mi SGX Pass' : 'View my SGX Pass')
        });
      }
    };
    window.addEventListener('message', handleCredentialMessage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sgx:open_rewards', handleOpenRewards);
      window.removeEventListener('sgx:open_qr_scanner', handleOpenQrScanner);
      window.removeEventListener('sgx:open_sponsorships', handleOpenSponsorshipsEvent);
      window.removeEventListener('sgx:open_brand_showcase', handleOpenBrandShowcaseEvent);
      window.removeEventListener('sgx:switch_summit_section', handleSwitchSummitSection);
      window.removeEventListener('message', handleCredentialMessage);
    };
  }, [recordActivity, language]);


  const handleBroadcastPush = (notif: SummitNotification) => {
    setActiveToastNotif(notif);
  };

  // Announcements sent from the CMS reach every open page.
  useEffect(() => subscribeAnnouncement(setActiveToastNotif), []);

  const handleSessionNotification = (session: SummitSession) => {
    const notif: SummitNotification = {
      id: `alert_${session.id}_${Date.now()}`,
      title: (es ? `Alerta Programada: ${session.title}` : `Scheduled Alert: ${loc(session, 'title', language)}`),
      message: (es ? `La sesión "${session.title}" comenzará a las ${session.startTime} (${session.venueLocation}).` : `The session "${loc(session, 'title', language)}" starts at ${session.startTime} (${loc(session, 'venueLocation', language)}).`),
      timestamp: Date.now(),
      type: 'SESSION_START',
      priority: 'HIGH',
      actionUrl: '/summit',
      actionLabel: (es ? 'Ver Agenda' : 'View Agenda'),
    };
    setActiveToastNotif(notif);
  };

  const handleOpenSponsorModal = (tierId: string = 'tier_2') => {
    setSelectedSponsorTierId(tierId);
    setSponsorInquiryModalOpen(true);
  };

  return (
    <div className={`w-full ${activeSection === 'OVERVIEW' ? 'bg-[var(--sgx-bg)]' : 'bg-transparent'} text-slate-100 flex flex-col font-sans selection:bg-[var(--sgx-neon)] selection:text-black ${activeSection === 'OVERVIEW' ? 'h-full min-h-0 overflow-hidden' : 'min-h-screen'}`}>
      
      {/* 2. Tactical section HUD (only away from the 3D Cockpit OVERVIEW) */}
      {activeSection !== 'OVERVIEW' && (
        <SgxSectionHudBar
          activeSection={activeSection}
          chips={HUD_SECTION_CHIPS}
          pillarLabel={activeSection === 'PILLAR' ? findPillar(activePillarSlug)?.id : SECTION_TO_PILLAR_MAP[activeSection]?.pillarId}
          pillarIconUrl={activeSection === 'PILLAR' ? findPillar(activePillarSlug)?.iconUrl : SECTION_TO_PILLAR_MAP[activeSection]?.iconUrl}
          stationSlug={activeSection === 'PILLAR' ? activePillarSlug : undefined}
          onSelect={(sec) => {
            playUiChirp(650);
            handleSelectSection(sec);
          }}
          onBack={() => handleSelectSection('OVERVIEW')}
          onTour={() => {
            window.dispatchEvent(new CustomEvent('sgx:open_tour'));
            playUiChirp(850);
          }}
          onShare={() => {
            syncAppUrl({ page: 'summit', section: activeSection });
            if (navigator.clipboard?.writeText) {
              navigator.clipboard.writeText(window.location.href);
            }
            playUiChirp(880);
          }}
        />
      )}

      {/* 1b. Sponsor ticker sits under the HUD so the HUD bar never moves between pages */}
      {isFeatureVisible('exp_sponsor_ticker') && activeSection !== 'OVERVIEW' && (
        <div className="sgx-ticker-wrap">
          <SummitSponsorTicker 
            sponsors={approvedSponsors} 
            onSelectSponsor={(sponsor) => setSelectedBrandShowcase(sponsor)} 
          />
        </div>
      )}


      {/* 5. Main Dynamic Body Views */}
      <main id="summit-main-tab-content" className={`w-full flex flex-col ${activeSection === 'OVERVIEW' ? 'flex-1 min-h-0 overflow-hidden p-0 max-w-none' : 'max-w-[1750px] mx-auto p-2 sm:p-4 lg:p-5 flex-1'}`}>
        
        {/* Maintenance / Hidden Section Guard for Non-Overview Sections */}
        {activeSection !== 'OVERVIEW' && getSectionStatus(activeSection) !== 'ACTIVE' && (
          <div className="my-8 p-8 sm:p-12 sgx-crystal-card border-2 border-[#FDCC0D] text-center space-y-5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDCC0D]/15 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold uppercase">
              <Sparkles className="w-4 h-4" />
              <span>
                {getSectionStatus(activeSection) === 'MAINTENANCE'
                  ? (es ? 'MÓDULO EN FASE DE CALIBRACIÓN ESPACIAL — PRÓXIMAMENTE' : 'MODULE IN SPATIAL CALIBRATION — COMING SOON')
                  : (es ? 'MÓDULO OCULTO POR EL ADMINISTRADOR' : 'MODULE HIDDEN BY THE ADMINISTRATOR')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif]">
              {es ? 'Esta Estación del Summit se Activará Próximamente' : 'This Summit Station Will Go Live Soon'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
              {es ? 'Nuestro equipo de ingeniería espacial está finalizando los últimos detalles de este módulo para el Spatialgineers Summit 2026. Mientras tanto, explora el Núcleo Orbital 3D.' : 'Our spatial engineering team is putting the finishing touches on this module for the Spatialgineers Summit 2026. Meanwhile, explore the 3D Orbital Core.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSelectSection('OVERVIEW')}
                className="px-5 py-2.5 bg-[#00DDFF] hover:bg-[#FDCC0D] text-black font-mono text-xs font-extrabold uppercase transition-colors cursor-pointer"
              >
                {es ? '← Volver al Núcleo 3D Principal' : '← Back to the Main 3D Core'}
              </button>
              {isAdmin && (
              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="px-4 py-2.5 bg-[#121212] hover:bg-[#32527B] border border-[#00DDFF]/60 text-[#00DDFF] hover:text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{es ? 'Gestionar Visibilidad de Módulos' : 'Manage Module Visibility'}</span>
              </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 1: RESUMEN GENERAL (OVERVIEW) — FULL-BLEED 3D COCKPIT & FLOATING HUD */}
        {activeSection === 'OVERVIEW' && (
          <div id="summit-section-overview" className="h-full w-full flex-1 min-h-0 flex flex-col overflow-hidden">
            <SummitExperienceHub
              onSelectSection={(sec) => handleSelectSection(sec)}
              onOpenTickets={() => window.dispatchEvent(new CustomEvent('sgx:open_tickets'))}
              onOpenSponsors={(tier) => handleOpenSponsorModal(tier || 'tier_2')}
              onNavigateToPlayVote={onNavigateToPlayVote}
              onNavigateToVisualizer={onNavigateToVisualizer}
              onOpenRewardsStore={() => setRewardsStoreModalOpen(true)}
              onOpenAvatarGenerator={() => window.dispatchEvent(new CustomEvent('sgx:open_avatar'))}
              onOpenQrScanner={() => setQrScannerModalOpen(true)}
              onOpenPassport={() => window.dispatchEvent(new CustomEvent('sgx:open_passport'))}
              onOpenSpeakerPortal={() => setSpeakerPortalOpen(true)}
              onOpenTour={() => window.dispatchEvent(new CustomEvent('sgx:open_tour'))}
              onOpenTimeCapsules={() => setTimeCapsulesModalOpen(true)}
              sponsorCount={approvedSponsors.length}
            />

            {/* ON-DEMAND 3D TIME CAPSULES & LORE MODAL (Opens when clicking the 4 Circular Clocks HUD) */}
            {timeCapsulesModalOpen && (
              <div
                onClick={() => setTimeCapsulesModalOpen(false)}
                className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="relative w-full max-w-5xl bg-[#0D0D0D] border-2 border-[#00DDFF] p-4 sm:p-6 shadow-[0_0_50px_rgba(0, 221, 255,0.25)] space-y-4 my-auto max-h-[90vh] overflow-y-auto"
                  style={{
                    clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
                  }}
                >
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800 font-mono">
                    <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                      <Clock className="w-4 h-4 text-[#00DDFF]" />
                      <span>{es ? 'CÁPSULAS DE LORE & RETOS JUGABLES RUMBO AL SUMMIT' : 'LORE CAPSULES & PLAYABLE CHALLENGES ON THE ROAD TO THE SUMMIT'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimeCapsulesModalOpen(false)}
                      className="px-3 py-1 bg-slate-900 hover:bg-[#00DDFF] hover:text-black border border-white/20 text-xs font-mono font-bold text-slate-200 cursor-pointer"
                    >
                      {es ? 'Cerrar ✕' : 'Close ✕'}
                    </button>
                  </div>
                  <SummitWeeklyCapsules
                    onNavigateToSection={(sec) => {
                      setTimeCapsulesModalOpen(false);
                      handleSelectSection(sec);
                    }}
                  />
                </div>
              </div>
            )}

            {/* DOCK VIEW 2: 3-DAY RUN OF SHOW WITH PROGRESSIVE DISCLOSURE (Official v2026.10 Run of Show) */}
            {overviewDockTab === 'AGENDA_3DAYS' && (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171717] via-[#202020] to-[#171717] border border-[var(--sgx-secondary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[#00DDFF] text-[10px] font-mono font-bold uppercase">
                      <Calendar className="w-3 h-3" />
                      <span>{es ? 'RUN OF SHOW OFICIAL v2026.10 • 3 DÍAS DE EXPERIENCIAS INMERSIVAS XR' : 'OFFICIAL RUN OF SHOW v2026.10 • 3 DAYS OF IMMERSIVE XR EXPERIENCES'}</span>
                    </div>
                    <h3 className="text-lg font-black text-white font-['Orbitron',sans-serif] uppercase">
                      {es ? 'Run of Show Ejecutivo: Mundos 3D, Día de la Industria & Evento Híbrido' : 'Executive Run of Show: 3D Worlds, Industry Day & Hybrid Event'}
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">
                      {es ? 'Diciembre 11, 12 & 13, 2026 • YouTube Live, presentaciones de artistas en Roblox y Chroma Space Studios, San Juan, PR' : 'December 11, 12 & 13, 2026 • YouTube Live, artist performances in Roblox & Chroma Space Studios, San Juan, PR'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      playUiChirp(800);
                      handleSelectSection('AGENDA');
                    }}
                    className="sgx-btn px-4 py-2 text-xs font-bold font-mono uppercase flex items-center space-x-1.5 shrink-0"
                  >
                    <span>{es ? 'VER LÍNEA DE TIEMPO COMPLETA' : 'VIEW FULL TIMELINE'}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  {/* Day 1 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#FDCC0D] font-bold">
                          <span className="px-2 py-0.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[10px]">{es ? 'DÍA 1 • 100% DIGITAL' : 'DAY 1 • 100% DIGITAL'}</span>
                          <span className="text-[11px]">{es ? 'VIE 11 DIC • 10:00 AM – 4:30 PM' : 'FRI DEC 11 • 10:00 AM – 4:30 PM'}</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          {es ? '6 PILARES, ARTISTAS & 8 INITIATES' : '6 PILLARS, ARTISTS & 8 INITIATES'}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6h 30m • YouTube Live</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">{es ? '6 artistas invitados (por anunciar)' : '6 guest artists (TBA)'}</span>
                          <span className="px-1.5 py-0.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[#FDCC0D] text-[10px]">8 Initiates × 8 min</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {es ? 'Bloques de los 6 pilares en orden oficial (Story, Showcase, Spark, Stage, System, Synthesize) intercalados con 6 intermedios de artistas invitados (por anunciar; el Artista 1 dentro de Roblox) y los portafolios de los 8 Initiates activos.' : 'Blocks for the 6 pillars in official order (Story, Showcase, Spark, Stage, System, Synthesize), alternating with 6 guest artist interludes (TBA; Artist 1 inside Roblox) and the portfolios of the 8 active Initiates.'}
                        </p>

                        {expandedDayId === 'day_1' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–10:30 AM:</strong>{es ? ' Apertura con Danelson (el espacio de Roblox abre para las presentaciones de artistas).' : ' Opening with Danelson (the Roblox space opens for the artist performances).'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>10:30 AM–2:30 PM:</strong>{es ? ' 6 artistas invitados (15 min c/u, en Roblox) + 6 Bloques de Pilares (25m c/u): Story → Showcase → Spark → Stage → System → Synthesize.' : ' 6 guest artists (15 min each, in Roblox) + 6 Pillar Blocks (25m each): Story → Showcase → Spark → Stage → System → Synthesize.'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>2:30–4:00 PM:</strong>{es ? ' Portafolios de los 8 Initiates activos (8 min c/u = 64 de los 90 min).' : ' Portfolios of the 8 active Initiates (8 min each = 64 of the 90 min).'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>4:00–4:30 PM:</strong>{es ? ' Cierre del Día 1 y anuncio de los 6 Initiates que presentan el Día 3.' : ' Day 1 closing and announcement of the 6 Initiates who present on Day 3.'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[var(--sgx-secondary)]/40">
                        <button
                          type="button"
                          onClick={() => setExpandedDayId(expandedDayId === 'day_1' ? null : 'day_1')}
                          className="w-full text-slate-400 hover:text-white text-[11px] flex items-center justify-between py-1 cursor-pointer"
                        >
                          <span>{expandedDayId === 'day_1' ? (es ? 'Menos detalles' : 'Fewer details') : (es ? 'Ver desglose minuto a minuto' : 'See the minute-by-minute breakdown')}</span>
                          {expandedDayId === 'day_1' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('AGENDA')}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-[#32527B] border border-[#FDCC0D]/50 text-[#FDCC0D] hover:text-white font-bold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          {es ? 'Ver Bloques del Día 1 →' : 'View Day 1 Blocks →'}
                        </button>
                      </div>
                    </div>
                  </SpatialTiltCard>

                  {/* Day 2 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#00DDFF] font-bold">
                          <span className="px-2 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[10px]">{es ? 'DÍA 2 • 100% DIGITAL' : 'DAY 2 • 100% DIGITAL'}</span>
                          <span className="text-[11px]">{es ? 'SÁB 12 DIC • 10:00 AM – 4:00 PM' : 'SAT DEC 12 • 10:00 AM – 4:00 PM'}</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          {es ? 'DÍA DE LA INDUSTRIA' : 'INDUSTRY DAY'}
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">{es ? '6h • 6 Conversaciones' : '6h • 6 Conversations'}</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">{es ? '45 min c/u + Pausas 10m' : '45 min each + 10m Breaks'}</span>
                          <span className="px-1.5 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[#00DDFF] text-[10px]">{es ? 'Votación +25 XP' : 'Voting +25 XP'}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {es ? 'Resumen del Día 1, recordatorio de los 6 Initiates seleccionados y 6 conversaciones de 45 minutos con personas invitadas por cada pilar SGX.' : 'Day 1 recap, a reminder of the 6 selected Initiates and 6 45-minute conversations with guests for each SGX pillar.'}
                        </p>

                        {expandedDayId === 'day_2' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–10:30 AM:</strong>{es ? ' Introducción, resumen del Día 1 y recordatorio de los 6 Initiates.' : ' Introduction, Day 1 recap and a reminder of the 6 Initiates.'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>10:30 AM–1:05 PM:</strong>{es ? ' Conversaciones SGX.Story (10:30), SGX.Showcase (11:25) y SGX.Spark (12:20) con pausas de 10 min.' : ' SGX.Story (10:30), SGX.Showcase (11:25) and SGX.Spark (12:20) conversations with 10-min breaks.'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>1:15–3:50 PM:</strong>{es ? ' Conversaciones SGX.Stage (1:15), SGX.System (2:10) y SGX.Synthesize (3:05).' : ' SGX.Stage (1:15), SGX.System (2:10) and SGX.Synthesize (3:05) conversations.'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>3:50–4:00 PM:</strong>{es ? ' Cierre del Día 2 y adelanto del Día 3, el SGX Showcase.' : ' Day 2 closing and a preview of Day 3, the SGX Showcase.'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[var(--sgx-secondary)]/40">
                        <button
                          type="button"
                          onClick={() => setExpandedDayId(expandedDayId === 'day_2' ? null : 'day_2')}
                          className="w-full text-slate-400 hover:text-white text-[11px] flex items-center justify-between py-1 cursor-pointer"
                        >
                          <span>{expandedDayId === 'day_2' ? (es ? 'Menos detalles' : 'Fewer details') : (es ? 'Ver desglose minuto a minuto' : 'See the minute-by-minute breakdown')}</span>
                          {expandedDayId === 'day_2' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('GUILD')}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-[#32527B] border border-[#00DDFF]/50 text-[#00DDFF] hover:text-white font-bold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          {es ? 'Ver SGX Guild & Initiates →' : 'View SGX Guild & Initiates →'}
                        </button>
                      </div>
                    </div>
                  </SpatialTiltCard>

                  {/* Day 3 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4 border-2 border-[#00DDFF] bg-gradient-to-b from-[#1f1f1f] to-[#1d1d1d]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#00DDFF] font-bold">
                          <span className="px-2 py-0.5 bg-[#00DDFF]/20 border border-[#00DDFF] text-[10px]">{es ? 'DÍA 3 • HÍBRIDO (SAN JUAN)' : 'DAY 3 • HYBRID (SAN JUAN)'}</span>
                          <span className="text-[11px]">{es ? 'DOM 13 DIC • 10:00 AM – 4:00 PM' : 'SUN DEC 13 • 10:00 AM – 4:00 PM'}</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          CHROMA SPACE STUDIOS & STREAM
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">{es ? '40–60 Invitados' : '40–60 Guests'}</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6 Initiates × 5 min</span>
                          <span className="px-1.5 py-0.5 bg-[#FDCC0D]/20 border border-[#FDCC0D]/50 text-[#FDCC0D] text-[10px]">{es ? 'Premio Mayor Tier 1' : 'Tier 1 Grand Prize'}</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          {es ? 'En vivo desde Chroma Space Studios (San Juan, por invitación) + YouTube/LinkedIn/Facebook Live: avatar facial en tiempo real, artistas invitados (por confirmar), los 6 Initiates, networking y premios mayores.' : 'Live from Chroma Space Studios (San Juan, by invitation) + YouTube/LinkedIn/Facebook Live: real-time facial avatar, guest artists (TBC), the 6 Initiates, networking and grand prizes.'}
                        </p>

                        {expandedDayId === 'day_3' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–11:00 AM:</strong>{es ? ' Introducción del evento (Ricardo marca el ambiente).' : ' Event introduction (Ricardo sets the mood).'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>11:00 AM–12:30 PM:</strong>{es ? ' Presentación y showcase: Danelson con su avatar y captura facial en tiempo real + Artista 1 con visualizadores SGX + Artista 2.' : ' Presentation and showcase: Danelson with his avatar and real-time facial capture + Artist 1 with SGX visualizers + Artist 2.'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>12:30–1:00 PM:</strong>{es ? ' Presentaciones del Guild: los 6 Initiates (5 min c/u, presencial o remoto).' : ' Guild presentations: the 6 Initiates (5 min each, in person or remote).'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>1:00–3:30 PM:</strong>{es ? ' Networking con votación gamificada y canje de premios (1:00–2:00 PM) + Interacción libre con Initiates, demos y Roblox (2:00–3:30 PM).' : ' Networking with gamified voting and prize redemption (1:00–2:00 PM) + Open interaction with Initiates, demos and Roblox (2:00–3:30 PM).'}
                            </p>
                            <p className="leading-relaxed">
                              • <strong>3:30–4:00 PM:</strong>{es ? ' Cierre, anuncios finales, sesión "Grit" con artistas (por confirmar) y premio mayor: "Spatialgineers activa tu evento".' : ' Closing, final announcements, "Grit" session with artists (TBC) and the grand prize: "Spatialgineers activa tu evento" (Spatialgineers activates your event).'}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[var(--sgx-secondary)]/40">
                        <button
                          type="button"
                          onClick={() => setExpandedDayId(expandedDayId === 'day_3' ? null : 'day_3')}
                          className="w-full text-slate-400 hover:text-white text-[11px] flex items-center justify-between py-1 cursor-pointer"
                        >
                          <span>{expandedDayId === 'day_3' ? (es ? 'Menos detalles' : 'Fewer details') : (es ? 'Ver desglose minuto a minuto' : 'See the minute-by-minute breakdown')}</span>
                          {expandedDayId === 'day_3' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('BROADCAST_ROOMS')}
                          className="w-full py-1.5 px-3 bg-[#FDCC0D] hover:bg-[#00DDFF] text-black font-extrabold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          {es ? 'Salas de transmisión →' : 'Broadcast rooms →'}
                        </button>
                      </div>
                    </div>
                  </SpatialTiltCard>
                </div>
              </div>
            )}

            {/* DOCK VIEW 3: SPONSORS & TIERS MATRIX */}
            {overviewDockTab === 'SPONSORS' && (
              <div className="space-y-6">
                <div className="p-4 sm:p-5 bg-gradient-to-r from-[#171717] via-[#202020] to-[#171717] border border-[var(--sgx-secondary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[#FDCC0D] text-[10px] font-mono font-bold uppercase">
                      <Building2 className="w-3 h-3" />
                      <span>{es ? 'ALIANZAS ESTRATÉGICAS & PERMANENCIA 365 DÍAS' : 'STRATEGIC ALLIANCES & 365-DAY PRESENCE'}</span>
                    </div>
                    <h3 className="text-lg font-black text-white font-['Orbitron',sans-serif] uppercase">
                      {es ? 'Patrocinadores Oficiales & Brand Showcases' : 'Official Sponsors & Brand Showcases'}
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">
                      {es ? 'Marcas que impulsan el ecosistema de computación espacial en el Caribe y el mundo.' : 'Brands driving the spatial computing ecosystem in the Caribbean and around the world.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenSponsorModal('tier_4')}
                      className="px-4 py-2 bg-[#FDCC0D] hover:bg-[#FDCC0D]/90 text-black font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{es ? 'Postular como Sponsor' : 'Apply as a Sponsor'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('SPONSORS_HUB')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      {es ? 'Ver Todos los Tiers →' : 'View All Tiers →'}
                    </button>
                  </div>
                </div>

                {/* Approved Brand Showcases Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {approvedSponsors.map((sponsor) => (
                    <SpatialTiltCard 
                      key={sponsor.id} 
                      showCornerBrackets 
                      onClick={() => setSelectedBrandShowcase(sponsor)}
                      className="h-full cursor-pointer"
                    >
                      <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4 group">
                        <div className="flex items-start space-x-3">
                          <div 
                            className="w-14 h-14 bg-[var(--sgx-bg)] border border-[var(--sgx-neon)]/60 p-1.5 flex items-center justify-center overflow-hidden shrink-0 group-hover:border-[var(--sgx-neon)]"
                            style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                          >
                            <img 
                              src={sponsor.logoUrl} 
                              alt={sponsor.companyName} 
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/brand/sgx-bolt.svg';
                              }}
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] group-hover:text-[var(--sgx-neon)] break-words leading-snug">
                                {sponsor.companyName}
                              </h4>
                            </div>
                            <span 
                              className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-accent)]/10 text-[var(--sgx-accent)] border border-[var(--sgx-accent)]/40 font-bold mt-1 inline-block"
                              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                            >
                              {loc(sponsor, 'tierName', language).split('(')[0]}
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono line-clamp-2 mt-1">
                              {loc(sponsor, 'tagline', language)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--sgx-secondary)]/40 text-xs font-mono">
                          <span className="text-[var(--sgx-neon)] font-bold group-hover:underline flex items-center space-x-1">
                            <span>{es ? 'Ver Brand Landing' : 'View Brand Landing'}</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                          {sponsor.specialOfferCode && (
                            <span className="text-[9px] text-[var(--sgx-accent)] font-bold">
                              {es ? 'PROMO ACTIVA' : 'ACTIVE PROMO'}
                            </span>
                          )}
                        </div>
                      </div>
                    </SpatialTiltCard>
                  ))}
                </div>

                {/* Sponsorship Tiers Interactive Showcase */}
                <SummitSponsorshipMatrix
                  tiers={sponsors}
                  onOpenInquiryModal={(tierId) => handleOpenSponsorModal(tierId || 'tier_4')}
                />
              </div>
            )}

            {/* DOCK VIEW 4: VENUE CHROMA SPACE STUDIOS 360° */}
            {overviewDockTab === 'VENUE_360' && (
              <div className="space-y-6">
                <div 
                  className="p-6 sm:p-8 bg-gradient-to-r from-[var(--sgx-card-bg)] via-[#191919] to-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] flex flex-col md:flex-row items-center justify-between gap-6"
                  style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
                >
                  <div className="space-y-3 max-w-2xl font-mono">
                    <div 
                      className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-[var(--sgx-neon)]/10 border border-[var(--sgx-neon)]/40 text-[var(--sgx-neon)] text-[10px] font-bold"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <MapPin className="w-3 h-3" />
                      <span>{es ? 'SEDE DEL DÍA 3 • SAN JUAN, PUERTO RICO' : 'DAY 3 VENUE • SAN JUAN, PUERTO RICO'}</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white font-['Orbitron',sans-serif]">
                      Chroma Space Studios
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {es ? 'Sede del Día 3, el SGX Showcase: networking y demos en vivo mientras presentan los Initiates. Por invitación y cupo limitado (40 a 60 personas). El estudio cuenta con luces, proyectores y cámaras integrados.' : 'Venue for Day 3, the SGX Showcase: networking and live demos while the Initiates present. By invitation, limited capacity (40 to 60 people). The studio has built-in lights, projectors and cameras.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300 text-[10px]">{es ? 'Domingo 13 dic · 10:00 AM–4:00 PM' : 'Sunday Dec 13 · 10:00 AM–4:00 PM'}</span>
                      <span className="px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300 text-[10px]">{es ? 'Por invitación · 40 a 60 personas' : 'By invitation · 40 to 60 people'}</span>
                      <span className="px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300 text-[10px]">SGX Guild Ranked Trials Pitch Session</span>
                      <span className="px-2 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[#00DDFF] text-[10px]">YouTube Live</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMapNodeId('node_chroma_studios');
                        handleSelectSection('MAP_360');
                      }}
                      className="sgx-btn-cyan px-5 py-3 text-xs font-bold flex items-center justify-center space-x-2 w-full sm:w-auto shadow-lg shadow-[#00DDFF]/20"
                    >
                      <Compass className="w-4 h-4" />
                      <span>{es ? 'ABRIR RECORRIDO 360° COMPLETO' : 'OPEN FULL 360° TOUR'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('AGENDA')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold text-center transition-colors cursor-pointer"
                    >
                      {es ? 'Ver Agenda del Día 3 en Chroma →' : 'View the Day 3 Agenda at Chroma →'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DOCK VIEW 5: LIVE SOCIAL RADAR */}
            {overviewDockTab === 'SOCIAL_RADAR' && (
              <div className="space-y-6">
                <div 
                  className="p-5 sm:p-6 bg-gradient-to-r from-[#171717] via-[#1f1f1f] to-[#150e26] border-2 border-[var(--sgx-neon)] space-y-4 shadow-xl relative overflow-hidden"
                  style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
                >
                  <div 
                    className="absolute top-0 right-0 w-64 h-64 blur-3xl pointer-events-none" 
                    style={{ backgroundColor: `${tenant.branding.primaryColor}20` }}
                  />
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="px-2 py-0.5 border text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1"
                          style={{
                            backgroundColor: `${tenant.branding.primaryColor}20`,
                            borderColor: `${tenant.branding.primaryColor}60`,
                            color: tenant.branding.primaryColor
                          }}
                        >
                          <Instagram className="w-3 h-3" />
                          <span>INSTAGRAM & MULTI-PLATFORM RADAR</span>
                        </span>
                        <span className="px-2 py-0.5 bg-red-950 border border-red-500/60 text-red-400 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span>{es ? 'EN VIVO' : 'LIVE'}</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider flex items-center gap-2">
                        <Radio className="w-5 h-5 text-[var(--sgx-neon)]" />
                        <span>{es ? 'Live Social Stream: Sintoniza el Pulso del Summit' : 'Live Social Stream: Tune In to the Summit\'s Pulse'}</span>
                      </h3>

                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        {es ? 'Publica en Instagram, X o Threads con ' : 'Post on Instagram, X or Threads with '}<strong>#SpatialgineersSummit</strong> y <strong>#SGX2026</strong>{es ? ' para que tus fotos, vídeos y opiniones aparezcan proyectados en la pantalla LED gigante de Chroma Space Studios y en la transmisión oficial.' : ' so your photos, videos and opinions appear on the giant LED screen at Chroma Space Studios and on the official broadcast.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          playUiChirp(840);
                          handleSelectSection('SOCIAL_STREAM');
                        }}
                        className="sgx-btn py-2.5 px-5 text-xs font-bold uppercase flex items-center space-x-1.5 shadow-lg shadow-[var(--sgx-neon)]/20 hover:scale-105 transition-all font-mono"
                      >
                        <span>{es ? 'ABRIR LIVE SOCIAL STREAM COMPLETO' : 'OPEN FULL LIVE SOCIAL STREAM'}</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-400 text-[11px]">
                      <span className="text-slate-200 font-bold">{es ? 'Hashtags oficiales (clic para copiar):' : 'Official hashtags (click to copy):'}</span>
                      {['#SpatialgineersSummit', '#SGX2026', '#ChromaStudios', '#SpatialComputing'].map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(tag);
                            setCopiedHashtag(tag);
                            setTimeout(() => setCopiedHashtag(null), 2000);
                          }}
                          className="px-2 py-0.5 bg-slate-900 hover:bg-[#32527B] border border-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <span>{tag}</span>
                          {copiedHashtag === tag ? <Check className="w-3 h-3 text-[#00DDFF]" /> : <Copy className="w-2.5 h-2.5 text-slate-400" />}
                        </button>
                      ))}
                    </div>
                    <div 
                      className="text-[11px] font-bold flex items-center gap-1"
                      style={{ color: tenant.branding.primaryColor }}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{es ? 'Gana +50 XP por publicar en vivo' : 'Earn +50 XP for posting live'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* TAB: EL MANIFIESTO & LOS 6 PILARES SGX */}
        {/* SGX.SYSTEM · Radar de visitas */}
        {activeSection === 'VISITS' && getSectionStatus('VISITS') === 'ACTIVE' && (
          <div id="summit-section-visitas" className="w-full">
            <SummitSectionBanner
              sectionKey="VISITS"
              title={es ? 'Radar de visitas del Summit' : 'Summit Visit Radar'}
              subtitle={es ? 'Desde dónde nos visitan, en vivo. Cada visita enciende su municipio en el mapa de Puerto Rico.' : 'Where our visitors come from, live. Every visit lights up its municipality on the map of Puerto Rico.'}
              pillarBadge="SGX.SYSTEM"
            />
            <LazyBoundary fallback={<LazyFallback />}>
              <SummitVisitRadar />
            </LazyBoundary>
          </div>
        )}

        {/* PILLAR STATIONS: the event divided into the six SGX pillars */}
        {activeSection === 'PILLAR' && (
          <div id="summit-section-pillar" className="w-full">
            <SgxPillarStation pillarSlug={activePillarSlug} />
          </div>
        )}

        {activeSection === 'PILLARS_MANIFESTO' && getSectionStatus('PILLARS_MANIFESTO') === 'ACTIVE' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="PILLARS_MANIFESTO"
              title={es ? 'Manifiesto Oficial & Los 6 Pilares Spatialgineers' : 'Official Manifesto & the 6 Spatialgineers Pillars'}
              subtitle={es ? 'Story, Showcase, Spark, Stage, System y Synthesize: la filosofía tecnocreativa que impulsa el Summit 2026.' : 'Story, Showcase, Spark, Stage, System and Synthesize: the tech-creative philosophy driving Summit 2026.'}
              pillarBadge="SGX.STORY"
              pillarIconUrl={pillarIcon('STORY')}
            />
            <SgxPillarsManifestoSection
              onNavigateToSection={(sec) => handleSelectSection(sec)}
              onExploreAgenda={() => handleSelectSection('AGENDA')}
              onExploreGuild={() => handleSelectSection('GUILD')}
              onExploreSponsors={() => handleSelectSection('SPONSORS_HUB')}
              onOpenTickets={() => window.dispatchEvent(new CustomEvent('sgx:open_tickets'))}
              onOpenDroneSimulator={() => handleSelectSection('EMBEDS_GAMES')}
              onOpen360Tour={() => handleSelectSection('MAP_360')}
              onOpenMatchModule={() => handleSelectSection('ENTREPRENEUR_MATCH')}
              onOpenSpeakerPortal={() => setSpeakerPortalOpen(true)}
              onOpenAvatarGenerator={() => window.dispatchEvent(new CustomEvent('sgx:open_avatar'))}
              onOpenPassportModal={() => window.dispatchEvent(new CustomEvent('sgx:open_passport'))}
              onOpenBroadcastRooms={() => handleSelectSection('BROADCAST_ROOMS')}
              onOpenSponsorInquiry={() => handleOpenSponsorModal('tier_2')}
              onOpenNetworkingChat={() => handleSelectSection('NETWORKING')}
            />
          </div>
        )}

        {/* TAB 2: INTERACTIVE 360 MAP NODES */}
        {activeSection === 'MAP_360' && getSectionStatus('MAP_360') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="MAP_360"
              title={es ? 'Recorrido 360° — Chroma Space Studios' : '360° Tour — Chroma Space Studios'}
              subtitle={es ? 'Explora en 360° el estudio de producción virtual, las zonas de demos y networking del Día 3.' : 'Explore in 360° the virtual production studio and the Day 3 demo and networking areas.'}
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl={pillarIcon('SHOWCASE')}
            />
            <PassGate feature="tour360">
              <SgxChromaArrival />
              <Summit360MapViewer
                nodes={mapNodes}
                selectedNodeId={selectedMapNodeId}
                onSelectNode={(id) => setSelectedMapNodeId(id)}
                onOpenSessionDetails={(nodeId) => handleSelectSection('AGENDA')}
              />
            </PassGate>
          </div>
        )}

        {/* TAB 3: PERSONALIZED AGENDA BUILDER & NOTIFICATIONS */}
        {/* NEW TAB: BROADCAST ROOMS */}
        {activeSection === 'BROADCAST_ROOMS' && getSectionStatus('BROADCAST_ROOMS') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="BROADCAST_ROOMS"
              title={es ? 'Salas de transmisión & canales en vivo' : 'Broadcast rooms & live channels'}
              subtitle={es ? 'Transmisiones simultáneas de alta fidelidad con audio espacial y selector multivista.' : 'Simultaneous high-fidelity streams with spatial audio and a multi-view selector.'}
              pillarBadge="SGX.STAGE"
              pillarIconUrl={pillarIcon('STAGE')}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tenant.rooms || []).map((room, idx) => (
                <div key={room.id} className="sgx-card space-y-3 p-4 relative group">
                  <div 
                    className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 border px-1.5 py-0.5 text-[8px] uppercase tracking-wider"
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    {room.status === 'LIVE' ? <><div className="w-1.5 h-1.5 bg-red-500 animate-pulse" /><span className="text-red-400 font-bold">{es ? 'EN VIVO' : 'LIVE'}</span></> : <><div className="w-1.5 h-1.5 bg-slate-500" /><span className="text-slate-400">{room.status}</span></>}
                  </div>
                  <div className="font-bold text-white text-sm font-['Orbitron',sans-serif] pr-16">{room.name}</div>
                  {room.streamUrl && room.status === 'LIVE' ? (
                    <div 
                      className="relative pt-[56.25%] w-full bg-black border border-[var(--sgx-secondary)] overflow-hidden"
                      style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                    >
                      <iframe
                        src={room.streamUrl}
                        className="absolute inset-0 w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div 
                      className="relative pt-[56.25%] w-full bg-black border border-[var(--sgx-secondary)] flex items-center justify-center flex-col text-slate-500 text-xs font-mono"
                      style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                    >
                      <Video className="w-6 h-6 mb-1 opacity-50" />
                      <span>{room.status === 'LIVE' ? (es ? 'Sin transmisión' : 'No stream') : (es ? 'Transmisión inactiva' : 'Stream inactive')}</span>
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 font-mono line-clamp-3">{room.description}</p>
                </div>
              ))}
              {(!tenant.rooms || tenant.rooms.length === 0) && (
                <div className="col-span-full">
                  <SgxStandby
                    title={language === 'es' ? 'Salas de transmisión' : 'Broadcast rooms'}
                    body={language === 'es'
                      ? 'Los 3 días se transmiten por YouTube Live (canal principal), con LinkedIn y Facebook Live; Los Mismos TV transmite junto a nosotros. Las salas se encienden aquí cuando empiece la señal.'
                      : 'All 3 days stream on YouTube Live (main channel), plus LinkedIn and Facebook Live; Los Mismos TV streams alongside us. Rooms light up here when the signal starts.'}
                    actions={[
                      { label: language === 'es' ? 'Canal de YouTube' : 'YouTube channel', primary: true, onClick: () => window.open(SGX_YOUTUBE, '_blank', 'noopener') },
                      { label: language === 'es' ? 'Ver la agenda' : 'See the agenda', onClick: () => handleSelectSection('AGENDA') },
                      { label: language === 'es' ? 'Mi SGX Pass' : 'My SGX Pass', onClick: () => window.dispatchEvent(new CustomEvent('sgx:open_tickets')) },
                    ]}
                  />
                </div>
              )}
            </div>

            {/* Live Social Radar Broadcast Banner */}
            <div 
              className="p-4 bg-[#1B1B1B] border border-[var(--sgx-primary)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="p-2 rounded-full shrink-0"
                  style={{
                    backgroundColor: `${tenant.branding.primaryColor}25`,
                    color: tenant.branding.primaryColor
                  }}
                >
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-white uppercase flex items-center gap-1.5">
                    <span>{es ? 'LIVE SOCIAL STREAM VINCULADO AL BROADCAST' : 'LIVE SOCIAL STREAM LINKED TO THE BROADCAST'}</span>
                    <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] rounded-xs font-bold">RADAR</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {es ? 'Sigue las publicaciones en tiempo real en Instagram, X y Threads con ' : 'Follow posts in real time on Instagram, X and Threads with '}<strong>#SpatialgineersSummit</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  playUiChirp(840);
                  handleSelectSection('SOCIAL_STREAM');
                }}
                className="sgx-btn py-2 px-4 text-xs font-bold uppercase shrink-0"
              >
                {es ? 'VER LIVE SOCIAL STREAM' : 'VIEW LIVE SOCIAL STREAM'}
              </button>
            </div>
          </div>
        )}

        {/* TAB: LIVE SOCIAL STREAM (Instagram, Threads, X & WebXR) */}
        {activeSection === 'SOCIAL_STREAM' && getSectionStatus('SOCIAL_STREAM') === 'ACTIVE' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="SOCIAL_STREAM"
              title={es ? 'Live Social Stream & Radar del Summit' : 'Live Social Stream & Summit Radar'}
              subtitle={es ? 'Feed interactivo en vivo de Instagram, Threads y X con publicaciones oficiales #SpatialgineersSummit.' : 'Live interactive feed from Instagram, Threads and X with official #SpatialgineersSummit posts.'}
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl={pillarIcon('SHOWCASE')}
            />
            <LiveSocialStream
              onOpenBroadcastRoom={() => handleSelectSection('BROADCAST_ROOMS')}
            />
          </div>
        )}

        {activeSection === 'AGENDA' && getSectionStatus('AGENDA') === 'ACTIVE' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="AGENDA"
              title={es ? 'Run of Show Oficial & Agenda de 3 Días' : 'Official Run of Show & 3-Day Agenda'}
              subtitle={es ? 'Línea de tiempo minuto a minuto, presentaciones de artistas en Roblox, conversatorios de industria y show performativo.' : 'Minute-by-minute timeline, artist performances in Roblox, industry conversations and a live performance show.'}
              pillarBadge="SGX.STAGE"
              pillarIconUrl={pillarIcon('STAGE')}
              additionalParams={{ view: agendaViewMode.toLowerCase() }}
            >
              {/* View Switcher: Interactive Run of Show Timeline vs. Agenda Builder */}
              <div className="flex items-center gap-1.5 shrink-0 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => {
                    setAgendaViewMode('TIMELINE');
                    syncSectionToUrl('AGENDA', { view: 'timeline' });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    agendaViewMode === 'TIMELINE'
                      ? 'bg-[var(--sgx-primary)] text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {es ? 'Línea de Tiempo (Run of Show)' : 'Timeline (Run of Show)'}
                </button>
                <button
                  onClick={() => {
                    setAgendaViewMode('BUILDER');
                    syncSectionToUrl('AGENDA', { view: 'builder' });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    agendaViewMode === 'BUILDER'
                      ? 'bg-[var(--sgx-neon)] text-black shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {es ? 'Mi Agenda & Alertas' : 'My Agenda & Alerts'}
                </button>
              </div>
            </SummitSectionBanner>

            {agendaViewMode === 'TIMELINE' ? (
              <SummitRunOfShowTimeline
                sessions={sessions}
                speakers={speakers}
                onOpenSessionModal={(sess) => setSelectedSessionModal(sess)}
                onNavigateToNode={(nodeId) => {
                  setSelectedMapNodeId(nodeId);
                  handleSelectSection('MAP_360');
                }}
              />
            ) : (
              <SummitAgendaBuilder
                sessions={sessions}
                speakers={speakers}
                onOpenSessionModal={(sess) => setSelectedSessionModal(sess)}
                onTriggerNotification={(sess) => handleSessionNotification(sess)}
              />
            )}
          </div>
        )}

        {/* TAB 4: SGX GUILD SHOWCASE & RANKED TRIALS INITIATES */}
        {activeSection === 'GUILD' && getSectionStatus('GUILD') === 'ACTIVE' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="GUILD"
              title="SGX Guild Initiates & Ranked Trials 2026"
              subtitle={es ? 'Los 8 iniciados oficiales de la cohorte técnica Spatialgineers con matrices de habilidades y mentoría.' : 'The 8 official Initiates of the Spatialgineers technical cohort, with skill matrices and mentorship.'}
              pillarBadge="SGX.SYSTEM"
              pillarIconUrl={pillarIcon('SYSTEM')}
            />
            <SgxGuildShowcaseSection />
          </div>
        )}

        {/* TAB 4: SPEAKERS, ARTISTAS & SGX GUILD INITIATES (3D INTERACTIVE CARD DECK) */}
        {activeSection === 'SPEAKERS' && getSectionStatus('SPEAKERS') === 'ACTIVE' && (
          <div id="summit-section-speakers" className="space-y-6">
            <SummitSectionBanner
              sectionKey="SPEAKERS"
              title={es ? 'Directorio Oficial de Speakers & Artistas' : 'Official Speakers & Artists Directory'}
              subtitle={es ? 'Se publican solo speakers y artistas confirmados por escrito. Los anuncios van del 7 al 21 de noviembre.' : 'Only speakers and artists confirmed in writing are published. Announcements run from November 7 to 21.'}
              pillarBadge="SGX.STAGE"
              pillarIconUrl={pillarIcon('STAGE')}
            />
            <SummitSpeakersDeck
              speakers={speakers}
              sessions={sessions}
              onSelectSpeaker={(spk) => setSelectedSpeakerModal(spk)}
              onOpenSessionModal={(sess) => setSelectedSessionModal(sess)}
              onOpenSpeakerPortal={() => setSpeakerPortalOpen(true)}
            />

            {/* Speaker / Artist Registration CTA */}
            <div className="p-4 rounded-xl border border-slate-800 bg-[#121212]/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                  {es ? '¿ERES SPEAKER, ARTISTA O CREADOR SPATIALGINEER?' : 'ARE YOU A SPEAKER, ARTIST OR SPATIALGINEER CREATOR?'}
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {es ? 'Accede a la consola de creadores para actualizar tu biografía técnica, links y ficha de sesión.' : 'Open the creator console to update your technical bio, links and session sheet.'}
                </p>
              </div>

              <button
                onClick={() => setSpeakerPortalOpen(true)}
                className="sgx-btn py-2 px-4 text-xs font-bold uppercase flex items-center space-x-2 shrink-0 shadow-lg shadow-[var(--sgx-neon)]/20 hover:scale-105 transition-all font-mono cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{es ? 'PORTAL DE SPEAKERS & ARTISTAS' : 'SPEAKERS & ARTISTS PORTAL'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: NETWORKING CHAT */}
        {activeSection === 'NETWORKING' && getSectionStatus('NETWORKING') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="NETWORKING"
              title={es ? 'Foros del Summit & Espacio de Networking' : 'Summit Forums & Networking Space'}
              subtitle={es ? 'Conecta con asistentes, speakers y empresas para generar alianzas, co-creación y proyectos espaciales.' : 'Connect with attendees, speakers and companies to build alliances, co-creation and spatial projects.'}
              pillarBadge="SGX.SYNTHESIZE"
              pillarIconUrl={pillarIcon('SYNTHESIZE')}
            />
            <PassGate feature="networking">
              <SummitNetworkingChat />
            </PassGate>
          </div>
        )}

        {/* TAB: ENTREPRENEUR MATCH (SGX.MATCH) */}
        {activeSection === 'ENTREPRENEUR_MATCH' && getSectionStatus('ENTREPRENEUR_MATCH') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="ENTREPRENEUR_MATCH"
              title={es ? 'SGX.Match — Speed Pitching & Citas Estratégicas' : 'SGX.Match — Speed Pitching & Strategic Meetings'}
              subtitle={es ? 'Conecta con creadores y marcas de todos los pilares.' : 'Connect with creators and brands from every pillar.'}
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl={pillarIcon('SHOWCASE')}
            />
            <PassGate feature="match">
              <LazyBoundary fallback={<LazyFallback />}>
                <MatchModule
                  onOpenPassport={() => window.dispatchEvent(new CustomEvent('sgx:open_passport'))}
                  onOpenAvatarGenerator={() => window.dispatchEvent(new CustomEvent('sgx:open_avatar'))}
                />
              </LazyBoundary>
            </PassGate>
          </div>
        )}

        {/* TAB 6: EMBEDS & GAMES HUB */}
        {activeSection === 'EMBEDS_GAMES' && getSectionStatus('EMBEDS_GAMES') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="EMBEDS_GAMES"
              title={es ? 'Simulador de Dron & Minijuegos Gamificados' : 'Drone Simulator & Gamified Mini-Games'}
              subtitle={es ? 'Entorno de simulación de vuelo en tiempo real, colisiones espaciales y retos interactivos con ranking.' : 'Real-time flight simulation, spatial collisions and interactive challenges with a leaderboard.'}
              pillarBadge="SGX.SPARK"
              pillarIconUrl={pillarIcon('SPARK')}
            />
            <PassGate feature="games">
              <LazyBoundary fallback={<LazyFallback />}>
                <SummitEmbedsHub embeds={embeds} />
              </LazyBoundary>
            </PassGate>
          </div>
        )}

        {/* TAB 7: SPONSORS HUB & INQUIRY */}
        {activeSection === 'SPONSORS_HUB' && getSectionStatus('SPONSORS_HUB') === 'ACTIVE' && (
          <div className="space-y-8">
            <SummitSectionBanner
              sectionKey="SPONSORS_HUB"
              title={(es ? `Directorio de Patrocinadores & Marcas Aliadas (${approvedSponsors.length})` : `Sponsors & Partner Brands Directory (${approvedSponsors.length})`)}
              subtitle={es ? 'Marcas de vanguardia que hacen posible el Spatialgineers Summit 2026. Conoce sus stands y beneficios.' : 'Cutting-edge brands that make the Spatialgineers Summit 2026 possible. Discover their booths and benefits.'}
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl={pillarIcon('SHOWCASE')}
            />
            {/* 5-Tier Sponsorship Matrix & Dossier */}
            <SummitSponsorshipMatrix
              tiers={sponsors}
              onOpenInquiryModal={(tierId) => handleOpenSponsorModal(tierId || 'tier_4')}
            />
            
            {/* Approved Brand Landings Grid */}
            <div 
              className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-6 space-y-4"
              style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
            >
              <div className="border-b border-[var(--sgx-secondary)]/60 pb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-[var(--sgx-neon)]" />
                  <h3 className="text-base font-bold text-white uppercase font-['Orbitron',sans-serif]">
                    {es ? 'PATROCINADORES Y BRAND SHOWCASES ACTIVOS (' : 'ACTIVE SPONSORS & BRAND SHOWCASES ('}{approvedSponsors.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  {es ? 'Haz clic en cualquier marca para abrir su landing interactivo oficial con ofertas exclusivas, códigos promocionales y activación en el evento.' : 'Click any brand to open its official interactive landing with exclusive offers, promo codes and its activation at the event.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {approvedSponsors.map((sp) => (
                  <div
                    key={sp.id}
                    onClick={() => setSelectedBrandShowcase(sp)}
                    className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between space-y-3"
                    style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                  >
                    <div className="flex items-start space-x-3">
                      <div 
                        className="w-14 h-14 bg-[#121212] border border-[var(--sgx-neon)]/60 p-1 flex items-center justify-center overflow-hidden shrink-0"
                        style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                      >
                        <img 
                          src={sp.logoUrl} 
                          alt={sp.companyName} 
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/brand/sgx-bolt.svg';
                          }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] break-words leading-snug">
                          {sp.companyName}
                        </h4>
                        <span 
                          className="text-[9px] px-1.5 py-0.5 bg-[var(--sgx-accent)]/10 text-[var(--sgx-accent)] border border-[var(--sgx-accent)]/40 font-bold inline-block mt-0.5"
                          style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                        >
                          {loc(sp, 'tierName', language).split('(')[0]}
                        </span>
                        <p className="text-[11px] text-slate-300 font-mono line-clamp-2 mt-1">{loc(sp, 'tagline', language)}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--sgx-secondary)]/40 text-[11px] font-mono text-[var(--sgx-neon)] font-bold">
                      <span>{es ? 'VER LANDING DE MARCA ➔' : 'VIEW BRAND LANDING ➔'}</span>
                      {sp.specialOfferCode && (
                        <span className="text-[9px] text-[var(--sgx-accent)] font-bold">PROMO: {sp.specialOfferCode}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsorship Inquiry Form */}
            <SummitSponsorInquiryForm 
              initialTierId={selectedSponsorTierId} 
            />
          </div>
        )}

        {/* TAB: SGX PASS + HOLO CARD STUDIO (visitante · speaker · initiate · sponsor) */}
        {activeSection === 'CREDENTIAL_GENERATOR' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="CREDENTIAL_GENERATOR"
              title="SGX Pass & Holo Card Studio"
              subtitle={language === 'es'
                ? 'Tu SGX Pass es tu registro, QR y entrada. El Holo Card Studio crea la credencial 3D para visitantes, speakers, initiates y sponsors, con el mismo código y QR del pase.'
                : 'Your SGX Pass is your registration, QR and entrance. The Holo Card Studio makes the 3D credential for visitors, speakers, initiates and sponsors, with the same pass code and QR.'}
              pillarBadge="SGX.SYSTEM"
              pillarIconUrl={pillarIcon('SYSTEM')}
            />
            <SgxPassSection />
            <SgxHoloStudioPanel />
          </div>
        )}

      </main>

      {/* 6. Session Detail Modal */}
      {selectedSessionModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-xl w-full p-6 space-y-4 shadow-2xl"
            style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
          >
            <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <div>
                <span className="text-[10px] font-mono text-[var(--sgx-neon)] font-bold uppercase">
                  {es ? 'DÍA ' : 'DAY '}{selectedSessionModal.day} • {selectedSessionModal.startTime} – {selectedSessionModal.endTime}
                </span>
                <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                  {loc(selectedSessionModal, 'title', language)}
                </h3>
              </div>
              <button onClick={() => setSelectedSessionModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-slate-300 leading-relaxed text-sm">
                {loc(selectedSessionModal, 'description', language)}
              </p>

              <div 
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-1"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="text-slate-400">{es ? 'Ubicación: ' : 'Location: '}<strong className="text-white">{loc(selectedSessionModal, 'venueLocation', language)}</strong></div>
                <div className="text-slate-400">Formato: <strong className="text-[var(--sgx-accent)]">{selectedSessionModal.format}</strong></div>
                {selectedSessionModal.pillarId && (
                  <div className="text-slate-400">Pilar: <strong className="text-[var(--sgx-neon)]">{selectedSessionModal.pillarId}</strong></div>
                )}
              </div>

              {/* Action Buttons: Calendar Sync */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => downloadICS(selectedSessionModal)}
                  className="sgx-btn-cyan px-3 py-1.5 text-xs font-bold flex items-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{es ? 'DESCARGAR .ICS' : 'DOWNLOAD .ICS'}</span>
                </button>

                <a
                  href={getGoogleCalendarUrl(selectedSessionModal)}
                  target="_blank"
                  rel="noreferrer"
                  className="sgx-btn px-3 py-1.5 text-xs font-bold flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{es ? 'AÑADIR A GOOGLE CALENDAR' : 'ADD TO GOOGLE CALENDAR'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. Speaker Detail Modal */}
      {selectedSpeakerModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div 
            className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-md w-full p-6 space-y-4 shadow-2xl"
            style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
          >
            <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <div className="flex items-center space-x-3">
                {selectedSpeakerModal.avatarUrl ? (
                  <img 
                    src={selectedSpeakerModal.avatarUrl} 
                    alt={selectedSpeakerModal.name} 
                    className="w-12 h-12 object-cover border border-[var(--sgx-neon)]" 
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  />
                ) : (
                  <div 
                    className="w-12 h-12 bg-[var(--sgx-secondary)]/30 border border-[var(--sgx-neon)] flex items-center justify-center text-sm font-bold text-[var(--sgx-neon)] uppercase shrink-0"
                    style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                  >
                    {selectedSpeakerModal.name.substring(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-bold text-white font-['Orbitron',sans-serif]">{selectedSpeakerModal.name}</h3>
                  <span className="text-xs text-[var(--sgx-accent)] font-mono block">{loc(selectedSpeakerModal, 'role', language)}</span>
                </div>
              </div>
              <button onClick={() => setSelectedSpeakerModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {loc(selectedSpeakerModal, 'bio', language)}
            </p>

            <div className="pt-2 border-t border-[var(--sgx-secondary)] text-xs font-mono flex items-center justify-between">
              <span className="text-slate-400">{selectedSpeakerModal.organization}</span>
              <button
                onClick={() => {
                  setSelectedSpeakerModal(null);
                  setActiveSection('NETWORKING');
                }}
                className="text-[var(--sgx-neon)] font-bold hover:underline"
              >
                {es ? 'Conectar en Chat →' : 'Connect in Chat →'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Brand Showcase Landing Modal */}
      <SummitBrandShowcaseModal
        sponsor={selectedBrandShowcase}
        onClose={() => setSelectedBrandShowcase(null)}
      />

      {/* 9. Reactor store (the pass, passport and tickets live in SgxPassHost) */}
      {rewardsStoreModalOpen && (
        <SummitRewardsStoreModal
          onClose={() => setRewardsStoreModalOpen(false)}
          onOpenAdminRewards={onNavigateToAdmin}
          isAdmin={isAdmin}
        />
      )}

      {/* 10. Avatar Studio: the Pilot Builder lives with the pass (SgxPassHost). */}

      {/* 11. WebXR QR Networking Scanner & Rolodex Modal */}
      {qrScannerModalOpen && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
          <NetworkingQrScannerModal
            onClose={() => setQrScannerModalOpen(false)}
          />
        </LazyBoundary>
      )}

      {/* 12. Floating Live Pulse Reactions & Keynote Polls Widget */}
      {isFeatureVisible('exp_pulse_reactions') && (
        <KeynotePulseReactions
          currentSessionTitle={(sessions[0] && loc(sessions[0], 'title', language)) || (es ? 'Keynote Oficial: The Spatial Web' : 'Official Keynote: The Spatial Web')}
        />
      )}

      {/* 13. Privacy & Data Disclosure Modal (Puerto Rico Compliant) */}
      {privacyModalOpen && (
        <SummitPrivacyPolicyModal
          onClose={() => setPrivacyModalOpen(false)}
        />
      )}

      {sponsorInquiryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="max-h-[95vh] overflow-y-auto w-full max-w-4xl">
            <SummitSponsorInquiryForm
              initialTierId={selectedSponsorTierId}
              isModal={true}
              onClose={() => setSponsorInquiryModalOpen(false)}
              onSuccess={() => {
                // Refresh local state of inquiries
              }}
            />
          </div>
        </div>
      )}

      {/* 11. Push Notification Live Toast Alert */}
      <SummitPushAlertToast
        notification={activeToastNotif}
        onClose={() => setActiveToastNotif(null)}
        onActionClick={(url) => {
          if (url?.includes('agenda')) setActiveSection('AGENDA');
          else if (url?.includes('map')) setActiveSection('MAP_360');
          else if (url?.includes('play') && onNavigateToPlayVote) onNavigateToPlayVote();
          else setActiveSection('OVERVIEW');
        }}
      />

      {/* 12. Speaker & Artist Self-Service Portal Modal */}
      {speakerPortalOpen && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
      <SummitSpeakerPortalModal
        isOpen={speakerPortalOpen}
        onClose={() => setSpeakerPortalOpen(false)}
        onSpeakerRegistered={(newSpeaker) => {
          setSpeakers(loadPersistedSpeakers());
          setActiveToastNotif({
            id: `toast_speaker_${Date.now()}`,
            title: (es ? 'Perfil recibido' : 'Profile received'),
            message: (es ? `Gracias, ${newSpeaker.name}. El equipo revisa tu perfil y lo publica en el directorio cuando esté confirmado por escrito.` : `Thanks, ${newSpeaker.name}. The team reviews your profile and adds it to the directory once confirmed in writing.`),
            actionUrl: '/summit',
            priority: 'HIGH',
            timestamp: Date.now()
          });
        }}
      />
        </LazyBoundary>
      )}

      {/* Live Summit Analytics & Telemetry Full-Width Modal */}
      {analyticsModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl bg-[#0D0D0D] border-2 border-[#00DDFF] shadow-[0_0_50px_rgba(0, 221, 255,0.22)] p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/15 sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#FDCC0D]" />
                <span className="text-sm sm:text-base font-black text-white font-['Orbitron',sans-serif] uppercase tracking-wider">
                  {es ? 'SGX.SYSTEM · Analíticas & Telemetría en Tiempo Real' : 'SGX.SYSTEM · Real-Time Analytics & Telemetry'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsModalOpen(false)}
                className="px-3 py-1.5 bg-[#1B1B1B] hover:bg-[#FFBB00] hover:text-black border border-white/20 text-xs font-mono font-bold text-white transition-colors cursor-pointer"
              >
                {es ? 'Cerrar Analíticas ✕' : 'Close Analytics ✕'}
              </button>
            </div>
            <SummitAnalyticsView />
          </div>
        </div>
      )}

      {/* 14. Global Footer (Only rendered on scrollable content sub-sections, completely hidden on the 100dvh 3D core OVERVIEW) */}
      {activeSection !== 'OVERVIEW' && (
        <footer className="bg-[#101010] border-t border-[var(--sgx-secondary)] py-8 px-4 text-center font-mono text-xs text-slate-400 space-y-4">
          {/* Transient Sponsor Strip in Footer with 10s rotation and '(tu marca podría estar aquí)' */}
          <div className="max-w-4xl mx-auto pb-2">
            <TransientSponsorSlot 
              slotId="footer_sponsor_strip" 
              variant="banner" 
              showSubtitleLink={true}
              onOpenSponsorshipModal={() => handleOpenSponsorModal('tier_2')}
            />
          </div>

          {/* Line 1 */}
          <div className="text-slate-300 leading-relaxed max-w-5xl mx-auto">
            {es ? '© 2026 Spatialgineers LLC. Todos los derechos reservados. ' : '© 2026 Spatialgineers LLC. All rights reserved. '}<span className="text-slate-600 mx-2">•</span>{es ? ' Día 3: Chroma Space Studios, San Juan ' : ' Day 3: Chroma Space Studios, San Juan '}<span className="text-slate-600 mx-2">•</span> <span className="text-[var(--sgx-neon)] font-bold">{es ? 'YouTube Live, con Los Mismos TV transmitiendo junto a nosotros' : 'YouTube Live, with Los Mismos TV streaming alongside us'}</span> <span className="text-slate-600 mx-2">•</span>{es ? ' Gratis · En español ' : ' Free · In Spanish '}<span className="text-slate-600 mx-2">•</span> <a href="mailto:info@spatialgineers.com" className="hover:text-[var(--sgx-neon)]">info@spatialgineers.com</a> · +1 (787) 445-5284 · <a href={SGX_YOUTUBE} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--sgx-neon)]">YouTube @spatialgineers</a> · #SpatialgineersSummit <span className="text-slate-600 mx-2">•</span>{es ? ' Prensa: acreditación antes del 1 de diciembre (6 cupos, un acceso por medio) en info@spatialgineers.com' : ' Press: accreditation before December 1 (6 slots, one pass per outlet) at info@spatialgineers.com'}
          </div>
          {/* Line 2 */}
          <div className="text-[11px] text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {es ? 'Ingeniando Imaginación, Construyendo Realidades — Plataforma de computación espacial, experiencias inmersivas XR, mundos 3D y transmisión en vivo.' : 'Engineering Imagination, Building Realities — A platform for spatial computing, immersive XR experiences, 3D worlds and live streaming.'}
          </div>
          {/* Line 3 */}
          <div className="pt-3 border-t border-[var(--sgx-secondary)]/30 max-w-xl mx-auto">
            <span className="text-[13px] font-bold text-[#FDCC0D] tracking-wider font-['Orbitron',sans-serif] uppercase block filter drop-shadow-[0_0_8px_rgba(253,204,13,0.45)] transition-transform duration-300 hover:scale-[1.02]">
              {es ? '★ POWERED BY SPATIALGINEERS • INGENIANDO IMAGINACIÓN, CONSTRUYENDO REALIDADES ★' : '★ POWERED BY SPATIALGINEERS • ENGINEERING IMAGINATION, BUILDING REALITIES ★'}
            </span>
          </div>

          {/* Line 4: Puerto Rico Compliant Privacy & Data Notice + Intro Replay */}
          <div className="pt-3 border-t border-slate-800/80 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2 h-2 rounded-full bg-[#FDCC0D] animate-pulse" />
              <span>
                <strong>{es ? 'Privacidad & Datos (Leyes de Puerto Rico):' : 'Privacy & Data (Puerto Rico Law):'}</strong>{es ? ' Login anónimo sin datos privados. Telemetría usada para mejorar servicios y validar use cases. Jamás vendemos datos a 3ros.' : ' Anonymous login with no private data. Telemetry is used to improve services and validate use cases. We never sell data to third parties.'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  playUiChirp(840);
                  window.dispatchEvent(new CustomEvent('sgx:replay_splash'));
                }}
                className="px-2.5 py-1.5 bg-[#141414] hover:bg-cyan-500 hover:text-black border border-cyan-500/50 text-cyan-300 font-bold text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                title={es ? 'Volver a reproducir la pantalla de carga cibernética de 5 segundos' : 'Replay the 5-second cyber loading screen'}
              >
                {es ? '⚡ VER INTRO 5S' : '⚡ WATCH 5S INTRO'}
              </button>
              <button
                onClick={() => {
                  playUiChirp(820);
                  setPrivacyModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#1b1b1b] hover:bg-[var(--sgx-neon)] hover:text-black border border-slate-700 hover:border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-bold text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                {es ? '🛡️ POLÍTICA DE PRIVACIDAD' : '🛡️ PRIVACY POLICY'}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Module Visibility & Content Audit Control Modal */}
      <SummitContentAuditModal
        isOpen={isAdmin && isAuditModalOpen}
        onClose={() => setAuditModalOpen(false)}
      />



    </div>
  );
};

