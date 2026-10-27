import { SGX_YOUTUBE } from '../../lib/sgxLinks';
import { SgxStandby } from '../../immersion/SgxStandby';
import { SgxPassSection, SgxHoloStudioPanel } from '../../identity/SgxPassSection';
import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
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
import { SummitSponsorTicker } from './SummitSponsorTicker';
import { PillarTenantSelector } from './PillarTenantSelector';
import { SgxGuildShowcaseSection } from './SgxGuildShowcaseSection';
import { SummitBrandShowcaseModal } from './SummitBrandShowcaseModal';
import { SummitSectionsDropdown, SummitSectionKey } from './SummitSectionsDropdown';
import { SummitExperienceHub } from './SummitExperienceHub';
import { SummitRewardsStoreModal } from './SummitRewardsStoreModal';
import { KeynotePulseReactions } from './KeynotePulseReactions';
import type { HoloCardProfile } from './SgxHoloCardGeneratorModal';
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
import { usePilotProfile } from '../../context/PilotProfileContext';
import { useSummitFeatures } from '../../context/SummitFeatureContext';
import { SummitContentAuditModal } from './SummitContentAuditModal';
import { SummitWeeklyCapsules } from './SummitWeeklyCapsules';

// Heavy, on-demand modules (Leaflet radar, jsQR scanner, drone game, Match, avatar studio).
const SummitVisitRadar = lazy(() => import('./SummitVisitRadar').then((m) => ({ default: m.SummitVisitRadar })));
const SummitEmbedsHub = lazy(() => import('./SummitEmbedsHub').then((m) => ({ default: m.SummitEmbedsHub })));
const MatchModule = lazy(() => import('../../modules/match/MatchModule').then((m) => ({ default: m.MatchModule })));
const AttendeeAvatarGenerator = lazy(() => import('./AttendeeAvatarGenerator').then((m) => ({ default: m.AttendeeAvatarGenerator })));
const NetworkingQrScannerModal = lazy(() => import('./NetworkingQrScannerModal').then((m) => ({ default: m.NetworkingQrScannerModal })));
const SummitSpeakerPortalModal = lazy(() => import('./SummitSpeakerPortalModal').then((m) => ({ default: m.SummitSpeakerPortalModal })));

// Every section's home pillar, chips and icons come from the single six-pillar source (lib/sgxPillars).
const HUD_SECTION_CHIPS: HudSectionChip[] = SGX_PILLARS.flatMap((p) =>
  p.modules.flatMap((m) => (m.kind === 'section'
    ? [{ key: m.key as SummitSectionKey, label: m.label.es, pillar: p.id, icon: m.icon }]
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
  const [hasRegisteredTicket, setHasRegisteredTicket] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem('sgx_summit_registered_pass'));
    } catch {
      return false;
    }
  });
  const [hasGeneratedHoloCard, setHasGeneratedHoloCard] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sgx_holo_card_generated') === 'true';
    } catch {
      return false;
    }
  });

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
    const handleOpenAnalytics = () => setAnalyticsModalOpen(true);
    const handleOpenSponsor = () => handleOpenSponsorModal('tier_2');

    window.addEventListener('sgx:switch_summit_section', handleSwitchSectionEvent);
    window.addEventListener('sgx:open_audit_modal', handleOpenAudit);
    window.addEventListener('sgx:open_analytics', handleOpenAnalytics);
    window.addEventListener('sgx:open_sponsor_modal', handleOpenSponsor);

    return () => {
      window.removeEventListener('sgx:switch_summit_section', handleSwitchSectionEvent);
      window.removeEventListener('sgx:open_audit_modal', handleOpenAudit);
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
  const [avatarGeneratorModalOpen, setAvatarGeneratorModalOpen] = useState<boolean>(false);
  const [qrScannerModalOpen, setQrScannerModalOpen] = useState<boolean>(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [isAmbiancePlaying, setIsAmbiancePlaying] = useState<boolean>(false);
  const [sponsorInquiryModalOpen, setSponsorInquiryModalOpen] = useState<boolean>(false);
  const [selectedSponsorTierId, setSelectedSponsorTierId] = useState<string>('tier_2');
  const [selectedBrandShowcase, setSelectedBrandShowcase] = useState<ApprovedSponsor | null>(null);
  const [isHoloCardModalOpen, setIsHoloCardModalOpen] = useState<boolean>(false);
  const [holoCardProfile, setHoloCardProfile] = useState<HoloCardProfile | null>(null);
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
    const handleOpenAvatar = () => setAvatarGeneratorModalOpen(true);
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
    window.addEventListener('sgx:open_avatar', handleOpenAvatar);
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
        setHasGeneratedHoloCard(true);
        playScanSuccessSound();
        recordActivity?.('holo_card_generated', 150, 'SGX Holo Card 3D Generada');
        setActiveToastNotif({
          id: `holo_xp_${Date.now()}`,
          title: '¡Credencial SGX Exportada (+150 XP)!',
          message: `Tu pase holográfico (${e.data.name || 'Visitante'}) ha sido generado y acreditado en tu SGX Pass.`,
          timestamp: Date.now(),
          type: 'SYSTEM',
          priority: 'HIGH',
          actionUrl: '/summit',
          actionLabel: 'Ver mi SGX Pass'
        });
      }
    };
    window.addEventListener('message', handleCredentialMessage);

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('sgx:open_rewards', handleOpenRewards);
      window.removeEventListener('sgx:open_avatar', handleOpenAvatar);
      window.removeEventListener('sgx:open_qr_scanner', handleOpenQrScanner);
      window.removeEventListener('sgx:open_sponsorships', handleOpenSponsorshipsEvent);
      window.removeEventListener('sgx:open_brand_showcase', handleOpenBrandShowcaseEvent);
      window.removeEventListener('sgx:switch_summit_section', handleSwitchSummitSection);
      window.removeEventListener('message', handleCredentialMessage);
    };
  }, [recordActivity]);

  // Sync ticket & holo card completion badges whenever modals close or section switches
  useEffect(() => {
    try {
      setHasRegisteredTicket(Boolean(localStorage.getItem('sgx_summit_registered_pass')));
      setHasGeneratedHoloCard(localStorage.getItem('sgx_holo_card_generated') === 'true');
    } catch {}
  }, [isHoloCardModalOpen, activeSection]);

  // The SGX Pass is forged outside this page (SgxPassHost); follow it live.
  useEffect(() => {
    const sync = () => {
      try {
        setHasRegisteredTicket(Boolean(localStorage.getItem('sgx_summit_registered_pass')));
        setHasGeneratedHoloCard(localStorage.getItem('sgx_holo_card_generated') === 'true');
      } catch {}
    };
    window.addEventListener('sgx:identity_changed', sync);
    return () => window.removeEventListener('sgx:identity_changed', sync);
  }, []);

  const handleBroadcastPush = (notif: SummitNotification) => {
    setActiveToastNotif(notif);
  };

  // Announcements sent from the CMS reach every open page.
  useEffect(() => subscribeAnnouncement(setActiveToastNotif), []);

  const handleSessionNotification = (session: SummitSession) => {
    const notif: SummitNotification = {
      id: `alert_${session.id}_${Date.now()}`,
      title: `Alerta Programada: ${session.title}`,
      message: `La sesión "${session.title}" comenzará a las ${session.startTime} (${session.venueLocation}).`,
      timestamp: Date.now(),
      type: 'SESSION_START',
      priority: 'HIGH',
      actionUrl: '/summit',
      actionLabel: 'Ver Agenda',
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
          chips={HUD_SECTION_CHIPS.filter((chip) => isSectionVisible(chip.key))}
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
          dropdown={
            <SummitSectionsDropdown
              activeSection={activeSection}
              onSelectSection={(sec) => handleSelectSection(sec)}
              onOpenTickets={() => window.dispatchEvent(new CustomEvent('sgx:open_tickets'))}
              onOpenSponsors={(tier) => handleOpenSponsorModal(tier || 'tier_2')}
              onOpenTour={() => window.dispatchEvent(new CustomEvent('sgx:open_tour'))}
              className="shrink-0"
            />
          }
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
                  ? 'MÓDULO EN FASE DE CALIBRACIÓN ESPACIAL — PRÓXIMAMENTE'
                  : 'MÓDULO OCULTO POR EL ADMINISTRADOR'}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif]">
              Esta Estación del Summit se Activará Próximamente
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
              Nuestro equipo de ingeniería espacial está finalizando los últimos detalles de este módulo para el Spatialgineers Summit 2026. Mientras tanto, explora el Núcleo Orbital 3D.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleSelectSection('OVERVIEW')}
                className="px-5 py-2.5 bg-[#00DDFF] hover:bg-[#FDCC0D] text-black font-mono text-xs font-extrabold uppercase transition-colors cursor-pointer"
              >
                ← Volver al Núcleo 3D Principal
              </button>
              {isAdmin && (
              <button
                type="button"
                onClick={() => setAuditModalOpen(true)}
                className="px-4 py-2.5 bg-[#121212] hover:bg-[#32527B] border border-[#00DDFF]/60 text-[#00DDFF] hover:text-white font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Gestionar Visibilidad de Módulos</span>
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
              onOpenAvatarGenerator={() => setAvatarGeneratorModalOpen(true)}
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
                      <span>CÁPSULAS DE LORE & RETOS JUGABLES RUMBO AL SUMMIT</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTimeCapsulesModalOpen(false)}
                      className="px-3 py-1 bg-slate-900 hover:bg-[#00DDFF] hover:text-black border border-white/20 text-xs font-mono font-bold text-slate-200 cursor-pointer"
                    >
                      Cerrar ✕
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
                      <span>RUN OF SHOW OFICIAL v2026.10 • 3 DÍAS DE EXPERIENCIAS INMERSIVAS XR</span>
                    </div>
                    <h3 className="text-lg font-black text-white font-['Orbitron',sans-serif] uppercase">
                      Run of Show Ejecutivo: Mundos 3D, Día de la Industria & Evento Híbrido
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">
                      Diciembre 11, 12 & 13, 2026 • YouTube Live, presentaciones de artistas en Roblox y Chroma Space Studios, San Juan, PR
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
                    <span>VER LÍNEA DE TIEMPO COMPLETA</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  {/* Day 1 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#FDCC0D] font-bold">
                          <span className="px-2 py-0.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[10px]">DÍA 1 • 100% DIGITAL</span>
                          <span className="text-[11px]">VIE 11 DIC • 10:00 AM – 4:30 PM</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          6 PILARES, ARTISTAS & 8 INITIATES
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6h 30m • YouTube Live</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6 artistas invitados (por anunciar)</span>
                          <span className="px-1.5 py-0.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[#FDCC0D] text-[10px]">8 Initiates × 8 min</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          Bloques de los 6 pilares en orden oficial (Story, Showcase, Spark, Stage, System, Synthesize) intercalados con 6 intermedios de artistas invitados (por anunciar; el Artista 1 dentro de Roblox) y los portafolios de los 8 Initiates activos.
                        </p>

                        {expandedDayId === 'day_1' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–10:30 AM:</strong> Apertura con Danelson (el espacio de Roblox abre para las presentaciones de artistas).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>10:30 AM–2:30 PM:</strong> 6 artistas invitados (15 min c/u, en Roblox) + 6 Bloques de Pilares (25m c/u): Story → Showcase → Spark → Stage → System → Synthesize.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>2:30–4:00 PM:</strong> Portafolios de los 8 Initiates activos (8 min c/u = 64 de los 90 min).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>4:00–4:30 PM:</strong> Cierre del Día 1 y anuncio de los 6 Initiates que presentan el Día 3.
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
                          <span>{expandedDayId === 'day_1' ? 'Menos detalles' : 'Ver desglose minuto a minuto'}</span>
                          {expandedDayId === 'day_1' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('AGENDA')}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-[#32527B] border border-[#FDCC0D]/50 text-[#FDCC0D] hover:text-white font-bold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          Ver Bloques del Día 1 →
                        </button>
                      </div>
                    </div>
                  </SpatialTiltCard>

                  {/* Day 2 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#00DDFF] font-bold">
                          <span className="px-2 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[10px]">DÍA 2 • 100% DIGITAL</span>
                          <span className="text-[11px]">SÁB 12 DIC • 10:00 AM – 4:00 PM</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          DÍA DE LA INDUSTRIA
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6h • 6 Conversaciones</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">45 min c/u + Pausas 10m</span>
                          <span className="px-1.5 py-0.5 bg-[#00DDFF]/10 border border-[#00DDFF]/40 text-[#00DDFF] text-[10px]">Votación +25 XP</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          Resumen del Día 1, recordatorio de los 6 Initiates seleccionados y 6 conversaciones de 45 minutos con personas invitadas por cada pilar SGX.
                        </p>

                        {expandedDayId === 'day_2' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–10:30 AM:</strong> Introducción, resumen del Día 1 y recordatorio de los 6 Initiates.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>10:30 AM–1:05 PM:</strong> Conversaciones SGX.Story (10:30), SGX.Showcase (11:25) y SGX.Spark (12:20) con pausas de 10 min.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>1:15–3:50 PM:</strong> Conversaciones SGX.Stage (1:15), SGX.System (2:10) y SGX.Synthesize (3:05).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>3:50–4:00 PM:</strong> Cierre del Día 2 y adelanto del Día 3, el SGX Showcase.
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
                          <span>{expandedDayId === 'day_2' ? 'Menos detalles' : 'Ver desglose minuto a minuto'}</span>
                          {expandedDayId === 'day_2' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('GUILD')}
                          className="w-full py-1.5 px-3 bg-slate-900 hover:bg-[#32527B] border border-[#00DDFF]/50 text-[#00DDFF] hover:text-white font-bold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          Ver SGX Guild & Initiates →
                        </button>
                      </div>
                    </div>
                  </SpatialTiltCard>

                  {/* Day 3 */}
                  <SpatialTiltCard showCornerBrackets className="h-full">
                    <div className="p-5 h-full sgx-spatial-card sgx-cyber-bevel flex flex-col justify-between space-y-4 border-2 border-[#00DDFF] bg-gradient-to-b from-[#1f1f1f] to-[#1d1d1d]">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-[#00DDFF] font-bold">
                          <span className="px-2 py-0.5 bg-[#00DDFF]/20 border border-[#00DDFF] text-[10px]">DÍA 3 • HÍBRIDO (SAN JUAN)</span>
                          <span className="text-[11px]">DOM 13 DIC • 10:00 AM – 4:00 PM</span>
                        </div>
                        <h4 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          CHROMA SPACE STUDIOS & STREAM
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">40–60 Invitados</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 text-[10px]">6 Initiates × 5 min</span>
                          <span className="px-1.5 py-0.5 bg-[#FDCC0D]/20 border border-[#FDCC0D]/50 text-[#FDCC0D] text-[10px]">Premio Mayor Tier 1</span>
                        </div>
                        <p className="text-slate-300 leading-relaxed text-xs">
                          En vivo desde Chroma Space Studios (San Juan, por invitación) + YouTube/LinkedIn/Facebook Live: avatar facial en tiempo real, artistas invitados (por confirmar), los 6 Initiates, networking y premios mayores.
                        </p>

                        {expandedDayId === 'day_3' && (
                          <div className="pt-3 border-t border-slate-800 space-y-2 text-[11px] text-slate-300">
                            <p className="leading-relaxed">
                              • <strong>10:00–11:00 AM:</strong> Introducción del evento (Ricardo marca el ambiente).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>11:00 AM–12:30 PM:</strong> Presentación y showcase: Danelson con su avatar y captura facial en tiempo real + Artista 1 con visualizadores SGX + Artista 2.
                            </p>
                            <p className="leading-relaxed">
                              • <strong>12:30–1:00 PM:</strong> Presentaciones del Guild: los 6 Initiates (5 min c/u, presencial o remoto).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>1:00–3:30 PM:</strong> Networking con votación gamificada y canje de premios (1:00–2:00 PM) + Interacción libre con Initiates, demos y Roblox (2:00–3:30 PM).
                            </p>
                            <p className="leading-relaxed">
                              • <strong>3:30–4:00 PM:</strong> Cierre, anuncios finales, sesión "Grit" con artistas (por confirmar) y premio mayor: "Spatialgineers activa tu evento".
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
                          <span>{expandedDayId === 'day_3' ? 'Menos detalles' : 'Ver desglose minuto a minuto'}</span>
                          {expandedDayId === 'day_3' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectSection('BROADCAST_ROOMS')}
                          className="w-full py-1.5 px-3 bg-[#FDCC0D] hover:bg-[#00DDFF] text-black font-extrabold text-center transition-colors cursor-pointer text-[11px]"
                        >
                          Salas de transmisión →
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
                      <span>ALIANZAS ESTRATÉGICAS & PERMANENCIA 365 DÍAS</span>
                    </div>
                    <h3 className="text-lg font-black text-white font-['Orbitron',sans-serif] uppercase">
                      Patrocinadores Oficiales & Brand Showcases
                    </h3>
                    <p className="text-xs text-slate-300 font-mono">
                      Marcas que impulsan el ecosistema de computación espacial en el Caribe y el mundo.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenSponsorModal('tier_4')}
                      className="px-4 py-2 bg-[#FDCC0D] hover:bg-[#FDCC0D]/90 text-black font-mono text-xs font-bold uppercase transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Postular como Sponsor</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('SPONSORS_HUB')}
                      className="px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs font-bold uppercase transition-colors cursor-pointer"
                    >
                      Ver Todos los Tiers →
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
                              {sponsor.tierName.split('(')[0]}
                            </span>
                            <p className="text-[11px] text-slate-300 font-mono line-clamp-2 mt-1">
                              {sponsor.tagline}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t border-[var(--sgx-secondary)]/40 text-xs font-mono">
                          <span className="text-[var(--sgx-neon)] font-bold group-hover:underline flex items-center space-x-1">
                            <span>Ver Brand Landing</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                          {sponsor.specialOfferCode && (
                            <span className="text-[9px] text-[var(--sgx-accent)] font-bold">
                              PROMO ACTIVA
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
                      <span>SEDE DEL DÍA 3 • SAN JUAN, PUERTO RICO</span>
                    </div>
                    <h3 className="text-2xl font-bold text-white font-['Orbitron',sans-serif]">
                      Chroma Space Studios
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Sede del Día 3, el SGX Showcase: networking y demos en vivo mientras presentan los Initiates. Por invitación y cupo limitado (40 a 60 personas). El estudio cuenta con luces, proyectores y cámaras integrados.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <span className="px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300 text-[10px]">Domingo 13 dic · 10:00 AM–4:00 PM</span>
                      <span className="px-2 py-0.5 bg-black/60 border border-slate-700 text-slate-300 text-[10px]">Por invitación · 40 a 60 personas</span>
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
                      <span>ABRIR RECORRIDO 360° COMPLETO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSection('AGENDA')}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-mono font-bold text-center transition-colors cursor-pointer"
                    >
                      Ver Agenda del Día 3 en Chroma →
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
                          <span>EN VIVO</span>
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider flex items-center gap-2">
                        <Radio className="w-5 h-5 text-[var(--sgx-neon)]" />
                        <span>Live Social Stream: Sintoniza el Pulso del Summit</span>
                      </h3>

                      <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                        Publica en Instagram, X o Threads con <strong>#SpatialgineersSummit</strong> y <strong>#SGX2026</strong> para que tus fotos, vídeos y opiniones aparezcan proyectados en la pantalla LED gigante de Chroma Space Studios y en la transmisión oficial.
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
                        <span>ABRIR LIVE SOCIAL STREAM COMPLETO</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                    <div className="flex flex-wrap items-center gap-1.5 text-slate-400 text-[11px]">
                      <span className="text-slate-200 font-bold">Hashtags oficiales (clic para copiar):</span>
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
                      <span>Gana +50 XP por publicar en vivo</span>
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
              title="Radar de visitas del Summit"
              subtitle="Desde dónde nos visitan, en vivo. Cada visita enciende su municipio en el mapa de Puerto Rico."
              pillarBadge="SGX.SYSTEM"
            />
            <Suspense fallback={<LazyFallback />}>
              <SummitVisitRadar />
            </Suspense>
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
              title="Manifiesto Oficial & Los 6 Pilares Spatialgineers"
              subtitle="Story, Showcase, Spark, Stage, System y Synthesize: la filosofía tecnocreativa que impulsa el Summit 2026."
              pillarBadge="SGX.STORY"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Story1.png"
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
              onOpenAvatarGenerator={() => setAvatarGeneratorModalOpen(true)}
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
              title="Recorrido 360° — Chroma Space Studios"
              subtitle="Explora en 360° el estudio de producción virtual, las zonas de demos y networking del Día 3."
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png"
            />
            <Summit360MapViewer
              nodes={mapNodes}
              selectedNodeId={selectedMapNodeId}
              onSelectNode={(id) => setSelectedMapNodeId(id)}
              onOpenSessionDetails={(nodeId) => handleSelectSection('AGENDA')}
            />
          </div>
        )}

        {/* TAB 3: PERSONALIZED AGENDA BUILDER & NOTIFICATIONS */}
        {/* NEW TAB: BROADCAST ROOMS */}
        {activeSection === 'BROADCAST_ROOMS' && getSectionStatus('BROADCAST_ROOMS') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="BROADCAST_ROOMS"
              title="Salas de transmisión & canales en vivo"
              subtitle="Transmisiones simultáneas de alta fidelidad con audio espacial y selector multivista."
              pillarBadge="SGX.STAGE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(tenant.rooms || []).map((room, idx) => (
                <div key={room.id} className="sgx-card space-y-3 p-4 relative group">
                  <div 
                    className="absolute top-2 right-2 flex items-center space-x-1 bg-black/60 border px-1.5 py-0.5 text-[8px] uppercase tracking-wider"
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    {room.status === 'LIVE' ? <><div className="w-1.5 h-1.5 bg-red-500 animate-pulse" /><span className="text-red-400 font-bold">EN VIVO</span></> : <><div className="w-1.5 h-1.5 bg-slate-500" /><span className="text-slate-400">{room.status}</span></>}
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
                      <span>{room.status === 'LIVE' ? 'Sin transmisión' : 'Transmisión inactiva'}</span>
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
                    <span>LIVE SOCIAL STREAM VINCULADO AL BROADCAST</span>
                    <span className="px-1.5 py-0.2 bg-red-600 text-white text-[9px] rounded-xs font-bold">RADAR</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Sigue las publicaciones en tiempo real en Instagram, X y Threads con <strong>#SpatialgineersSummit</strong>.
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
                VER LIVE SOCIAL STREAM
              </button>
            </div>
          </div>
        )}

        {/* TAB: LIVE SOCIAL STREAM (Instagram, Threads, X & WebXR) */}
        {activeSection === 'SOCIAL_STREAM' && getSectionStatus('SOCIAL_STREAM') === 'ACTIVE' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="SOCIAL_STREAM"
              title="Live Social Stream & Radar del Summit"
              subtitle="Feed interactivo en vivo de Instagram, Threads y X con publicaciones oficiales #SpatialgineersSummit."
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png"
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
              title="Run of Show Oficial & Agenda de 3 Días"
              subtitle="Línea de tiempo minuto a minuto, presentaciones de artistas en Roblox, conversatorios de industria y show performativo."
              pillarBadge="SGX.STAGE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png"
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
                  Línea de Tiempo (Run of Show)
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
                  Mi Agenda & Alertas
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
              subtitle="Los 8 iniciados oficiales de la cohorte técnica Spatialgineers con matrices de habilidades y mentoría."
              pillarBadge="SGX.SYSTEM"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png"
            />
            <SgxGuildShowcaseSection />
          </div>
        )}

        {/* TAB 4: SPEAKERS, ARTISTAS & SGX GUILD INITIATES (3D INTERACTIVE CARD DECK) */}
        {activeSection === 'SPEAKERS' && getSectionStatus('SPEAKERS') === 'ACTIVE' && (
          <div id="summit-section-speakers" className="space-y-6">
            <SummitSectionBanner
              sectionKey="SPEAKERS"
              title="Directorio Oficial de Speakers & Artistas"
              subtitle="Se publican solo speakers y artistas confirmados por escrito. Los anuncios van del 7 al 21 de noviembre."
              pillarBadge="SGX.STAGE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png"
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
                  ¿ERES SPEAKER, ARTISTA O CREADOR SPATIALGINEER?
                </h4>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Accede a la consola de creadores para actualizar tu biografía técnica, links y ficha de sesión.
                </p>
              </div>

              <button
                onClick={() => setSpeakerPortalOpen(true)}
                className="sgx-btn py-2 px-4 text-xs font-bold uppercase flex items-center space-x-2 shrink-0 shadow-lg shadow-[var(--sgx-neon)]/20 hover:scale-105 transition-all font-mono cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>PORTAL DE SPEAKERS & ARTISTAS</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: NETWORKING CHAT */}
        {activeSection === 'NETWORKING' && getSectionStatus('NETWORKING') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="NETWORKING"
              title="Foros del Summit & Espacio de Networking"
              subtitle="Conecta con asistentes, speakers y empresas para generar alianzas, co-creación y proyectos espaciales."
              pillarBadge="SGX.SYNTHESIZE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png"
            />
            <SummitNetworkingChat />
          </div>
        )}

        {/* TAB: ENTREPRENEUR MATCH (SGX.MATCH) */}
        {activeSection === 'ENTREPRENEUR_MATCH' && getSectionStatus('ENTREPRENEUR_MATCH') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="ENTREPRENEUR_MATCH"
              title="SGX.Match — Speed Pitching & Citas Estratégicas"
              subtitle="Conecta con creadores y marcas de todos los pilares."
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png"
            />
            <Suspense fallback={<LazyFallback />}>
              <MatchModule
                onOpenPassport={() => window.dispatchEvent(new CustomEvent('sgx:open_passport'))}
                onOpenAvatarGenerator={() => setAvatarGeneratorModalOpen(true)}
              />
            </Suspense>
          </div>
        )}

        {/* TAB 6: EMBEDS & GAMES HUB */}
        {activeSection === 'EMBEDS_GAMES' && getSectionStatus('EMBEDS_GAMES') === 'ACTIVE' && (
          <div className="space-y-4">
            <SummitSectionBanner
              sectionKey="EMBEDS_GAMES"
              title="Simulador de Dron & Minijuegos Gamificados"
              subtitle="Entorno de simulación de vuelo en tiempo real, colisiones espaciales y retos interactivos con ranking."
              pillarBadge="SGX.SPARK"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png"
            />
            <Suspense fallback={<LazyFallback />}>
              <SummitEmbedsHub embeds={embeds} />
            </Suspense>
          </div>
        )}

        {/* TAB 7: SPONSORS HUB & INQUIRY */}
        {activeSection === 'SPONSORS_HUB' && getSectionStatus('SPONSORS_HUB') === 'ACTIVE' && (
          <div className="space-y-8">
            <SummitSectionBanner
              sectionKey="SPONSORS_HUB"
              title={`Directorio de Patrocinadores & Marcas Aliadas (${approvedSponsors.length})`}
              subtitle="Marcas de vanguardia que hacen posible el Spatialgineers Summit 2026. Conoce sus stands y beneficios."
              pillarBadge="SGX.SHOWCASE"
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png"
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
                    PATROCINADORES Y BRAND SHOWCASES ACTIVOS ({approvedSponsors.length})
                  </h3>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Haz clic en cualquier marca para abrir su landing interactivo oficial con ofertas exclusivas, códigos promocionales y activación en el evento.
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
                          {sp.tierName.split('(')[0]}
                        </span>
                        <p className="text-[11px] text-slate-300 font-mono line-clamp-2 mt-1">{sp.tagline}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-[var(--sgx-secondary)]/40 text-[11px] font-mono text-[var(--sgx-neon)] font-bold">
                      <span>VER LANDING DE MARCA ➔</span>
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
              pillarIconUrl="https://cdn.spatialgineers.com/Branding/Pilares/System1.png"
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
                  DÍA {selectedSessionModal.day} • {selectedSessionModal.startTime} – {selectedSessionModal.endTime}
                </span>
                <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                  {selectedSessionModal.title}
                </h3>
              </div>
              <button onClick={() => setSelectedSessionModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-slate-300 leading-relaxed text-sm">
                {selectedSessionModal.description}
              </p>

              <div 
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-1"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="text-slate-400">Ubicación: <strong className="text-white">{selectedSessionModal.venueLocation}</strong></div>
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
                  <span>DESCARGAR .ICS</span>
                </button>

                <a
                  href={getGoogleCalendarUrl(selectedSessionModal)}
                  target="_blank"
                  rel="noreferrer"
                  className="sgx-btn px-3 py-1.5 text-xs font-bold flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>AÑADIR A GOOGLE CALENDAR</span>
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
                  <span className="text-xs text-[var(--sgx-accent)] font-mono block">{selectedSpeakerModal.role}</span>
                </div>
              </div>
              <button onClick={() => setSelectedSpeakerModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              {selectedSpeakerModal.bio}
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
                Conectar en Chat →
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

      {/* 10. Avatar Studio Generator Modal */}
      {avatarGeneratorModalOpen && (
        <Suspense fallback={<LazyFallback overlay />}>
          <AttendeeAvatarGenerator
            onClose={() => setAvatarGeneratorModalOpen(false)}
          />
        </Suspense>
      )}

      {/* 11. WebXR QR Networking Scanner & Rolodex Modal */}
      {qrScannerModalOpen && (
        <Suspense fallback={<LazyFallback overlay />}>
          <NetworkingQrScannerModal
            onClose={() => setQrScannerModalOpen(false)}
          />
        </Suspense>
      )}

      {/* 12. Floating Live Pulse Reactions & Keynote Polls Widget */}
      {isFeatureVisible('exp_pulse_reactions') && (
        <KeynotePulseReactions
          currentSessionTitle={sessions[0]?.title || 'Keynote Oficial: The Spatial Web'}
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
        <Suspense fallback={<LazyFallback overlay />}>
      <SummitSpeakerPortalModal
        isOpen={speakerPortalOpen}
        onClose={() => setSpeakerPortalOpen(false)}
        onSpeakerRegistered={(newSpeaker) => {
          setSpeakers(loadPersistedSpeakers());
          setActiveToastNotif({
            id: `toast_speaker_${Date.now()}`,
            title: 'Perfil recibido',
            message: `Gracias, ${newSpeaker.name}. El equipo revisa tu perfil y lo publica en el directorio cuando esté confirmado por escrito.`,
            actionUrl: '/summit',
            priority: 'HIGH',
            timestamp: Date.now()
          });
        }}
      />
        </Suspense>
      )}

      {/* Live Summit Analytics & Telemetry Full-Width Modal */}
      {analyticsModalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-6xl bg-[#0D0D0D] border-2 border-[#00DDFF] shadow-[0_0_50px_rgba(0, 221, 255,0.22)] p-4 sm:p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-white/15 sticky top-0 bg-[#0D0D0D]/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-5 h-5 text-[#FDCC0D]" />
                <span className="text-sm sm:text-base font-black text-white font-['Orbitron',sans-serif] uppercase tracking-wider">
                  SGX.SYSTEM · Analíticas & Telemetría en Tiempo Real
                </span>
              </div>
              <button
                type="button"
                onClick={() => setAnalyticsModalOpen(false)}
                className="px-3 py-1.5 bg-[#1B1B1B] hover:bg-[#FFBB00] hover:text-black border border-white/20 text-xs font-mono font-bold text-white transition-colors cursor-pointer"
              >
                Cerrar Analíticas ✕
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
            © 2026 Spatialgineers LLC. Todos los derechos reservados. <span className="text-slate-600 mx-2">•</span> Día 3: Chroma Space Studios, San Juan <span className="text-slate-600 mx-2">•</span> <span className="text-[var(--sgx-neon)] font-bold">YouTube Live, con Los Mismos TV transmitiendo junto a nosotros</span> <span className="text-slate-600 mx-2">•</span> Gratis · En español <span className="text-slate-600 mx-2">•</span> <a href="mailto:info@spatialgineers.com" className="hover:text-[var(--sgx-neon)]">info@spatialgineers.com</a> · +1 (787) 445-5284 · <a href={SGX_YOUTUBE} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--sgx-neon)]">YouTube @spatialgineers</a> · #SpatialgineersSummit <span className="text-slate-600 mx-2">•</span> Prensa: acreditación antes del 1 de diciembre (6 cupos, un acceso por medio) en info@spatialgineers.com
          </div>
          {/* Line 2 */}
          <div className="text-[11px] text-slate-400 max-w-3xl mx-auto leading-relaxed">
            Ingeniando Imaginación, Construyendo Realidades — Plataforma de computación espacial, experiencias inmersivas XR, mundos 3D y transmisión en vivo.
          </div>
          {/* Line 3 */}
          <div className="pt-3 border-t border-[var(--sgx-secondary)]/30 max-w-xl mx-auto">
            <span className="text-[13px] font-bold text-[#FDCC0D] tracking-wider font-['Orbitron',sans-serif] uppercase block filter drop-shadow-[0_0_8px_rgba(253,204,13,0.45)] transition-transform duration-300 hover:scale-[1.02]">
              ★ POWERED BY SPATIALGINEERS • INGENIANDO IMAGINACIÓN, CONSTRUYENDO REALIDADES ★
            </span>
          </div>

          {/* Line 4: Puerto Rico Compliant Privacy & Data Notice + Intro Replay */}
          <div className="pt-3 border-t border-slate-800/80 max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-2 text-left">
              <span className="w-2 h-2 rounded-full bg-[#FDCC0D] animate-pulse" />
              <span>
                <strong>Privacidad & Datos (Leyes de Puerto Rico):</strong> Login anónimo sin datos privados. Telemetría usada para mejorar servicios y validar use cases. Jamás vendemos datos a 3ros.
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
                title="Volver a reproducir la pantalla de carga cibernética de 5 segundos"
              >
                ⚡ VER INTRO 5S
              </button>
              <button
                onClick={() => {
                  playUiChirp(820);
                  setPrivacyModalOpen(true);
                }}
                className="px-3 py-1.5 bg-[#1b1b1b] hover:bg-[var(--sgx-neon)] hover:text-black border border-slate-700 hover:border-[var(--sgx-neon)] text-[var(--sgx-neon)] font-bold text-[10px] tracking-wider uppercase transition-all whitespace-nowrap cursor-pointer"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                🛡️ POLÍTICA DE PRIVACIDAD
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

