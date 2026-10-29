import { PassGate } from '../../identity/PassGate';
import { pillarIcon } from '../../lib/sgxPillars';
import { SGX_YOUTUBE } from '../../lib/sgxLinks';
import { SgxStandby } from '../../immersion/SgxStandby';
import React, { useState, useEffect, useCallback, lazy } from 'react';
import { LazyBoundary } from '../common/LazyBoundary';
import { LazyFallback } from '../common/LazyFallback';
import { BarChart3, Clock, Download, ExternalLink, Instagram, Sliders, Sparkles, Video } from 'lucide-react';
import type { SummitSession, SummitSpeaker, Map360Node, EmbedWidget, SponsorshipTier, SummitNotification, ApprovedSponsor } from '../../types/summit';
import {
  loadPersistedSessions,
  loadPersistedSpeakers,
  loadPersistedMapNodes,
  loadPersistedEmbedWidgets,
  loadPersistedSponsorshipTiers,
  loadAllApprovedSponsors,
  downloadICS,
  getGoogleCalendarUrl,
} from '../../lib/summitData';

import { useAuth } from '../../context/AuthContext';
import { SummitPushAlertToast } from './SummitPushAlertToast';
import { subscribeAnnouncement } from '../../lib/summitData';
import { SgxChromaArrival } from './SgxChromaArrival';
import { SummitSponsorTicker } from './SummitSponsorTicker';
import type { SummitSectionKey } from './sectionKeys';
import { SummitExperienceHub } from './SummitExperienceHub';
import { SgxSectionHudBar, HudSectionChip } from './SgxSectionHudBar';
import { SGX_PILLARS, pillarOfSection, findPillar, pillarInk, bi } from '../../lib/sgxPillars';
import { SgxDialog } from '../common/SgxDialog';
import { SummitFooter, SummitCoreFooterBar } from './SummitFooter';
import { SummitSectionBanner } from './SummitSectionBanner';
import { getAppRouteAndSectionFromUrl, getSectionFromUrl, syncAppUrl, syncSectionToUrl, scrollToSectionContainer } from '../../lib/summitUrlSync';
import { playUiChirp, playPillarDockSound, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { useSummitFeatures } from '../../context/SummitFeatureContext';

// Heavy, on-demand modules (Leaflet radar, jsQR scanner, drone game, Match, avatar studio).
// Each section and modal downloads when it is first opened.
const Summit360MapViewer = lazy(() => import('./Summit360MapViewer').then((m) => ({ default: m.Summit360MapViewer })));
const SummitAgendaBuilder = lazy(() => import('./SummitAgendaBuilder').then((m) => ({ default: m.SummitAgendaBuilder })));
const SummitNetworkingChat = lazy(() => import('./SummitNetworkingChat').then((m) => ({ default: m.SummitNetworkingChat })));
const SummitSponsorInquiryForm = lazy(() => import('./SummitSponsorInquiryForm').then((m) => ({ default: m.SummitSponsorInquiryForm })));
const SgxGuildShowcaseSection = lazy(() => import('./SgxGuildShowcaseSection').then((m) => ({ default: m.SgxGuildShowcaseSection })));
const SummitBrandShowcaseModal = lazy(() => import('./SummitBrandShowcaseModal').then((m) => ({ default: m.SummitBrandShowcaseModal })));
const SummitRewardsStoreModal = lazy(() => import('./SummitRewardsStoreModal').then((m) => ({ default: m.SummitRewardsStoreModal })));
const KeynotePulseReactions = lazy(() => import('./KeynotePulseReactions').then((m) => ({ default: m.KeynotePulseReactions })));
const SgxPillarStation = lazy(() => import('./SgxPillarStation').then((m) => ({ default: m.SgxPillarStation })));
const SummitPrivacyPolicyModal = lazy(() => import('./SummitPrivacyPolicyModal').then((m) => ({ default: m.SummitPrivacyPolicyModal })));
const LiveSocialStream = lazy(() => import('./LiveSocialStream').then((m) => ({ default: m.LiveSocialStream })));
const SgxPillarsManifestoSection = lazy(() => import('./SgxPillarsManifestoSection').then((m) => ({ default: m.SgxPillarsManifestoSection })));
const SummitRunOfShowTimeline = lazy(() => import('./SummitRunOfShowTimeline').then((m) => ({ default: m.SummitRunOfShowTimeline })));
const SummitSponsorsGrid = lazy(() => import('./SummitSponsorsGrid').then((m) => ({ default: m.SummitSponsorsGrid })));
const SummitSpeakersDeck = lazy(() => import('./SummitSpeakersDeck').then((m) => ({ default: m.SummitSpeakersDeck })));
const SummitSponsorshipMatrix = lazy(() => import('./SummitSponsorshipMatrix').then((m) => ({ default: m.SummitSponsorshipMatrix })));
const SummitContentAuditModal = lazy(() => import('./SummitContentAuditModal').then((m) => ({ default: m.SummitContentAuditModal })));
const SummitAnalyticsView = lazy(() => import('../analytics/SummitAnalyticsView').then((m) => ({ default: m.SummitAnalyticsView })));
const SgxPassSection = lazy(() => import('../../identity/SgxPassSection').then((m) => ({ default: m.SgxPassSection })));
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

const SESSION_FORMAT_LABEL: Record<SummitSession['format'], { es: string; en: string }> = {
  DIGITAL: { es: 'Digital (YouTube Live)', en: 'Digital (YouTube Live)' },
  HYBRID: { es: 'Híbrido (presencial y en vivo)', en: 'Hybrid (in person and live)' },
  PHYSICAL: { es: 'Presencial', en: 'In person' },
  ROBLOX_STREAM: { es: 'En Roblox y en vivo', en: 'In Roblox and live' },
};

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
  const { isAdmin, recordActivity } = useAuth();
  const { tenant, selectPillar } = useTenantTheme();
  const { language } = useLanguage();
  const es = language === 'es';
  const {
    isFeatureVisible,
    getSectionStatus,
    isAuditModalOpen,
    setAuditModalOpen,
  } = useSummitFeatures();
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false);

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
  const [selectedMapNodeId, setSelectedMapNodeId] = useState<string>('node_chroma_studios');
  const [rewardsStoreModalOpen, setRewardsStoreModalOpen] = useState<boolean>(false);
  const [qrScannerModalOpen, setQrScannerModalOpen] = useState<boolean>(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState<boolean>(false);
  const [sponsorInquiryModalOpen, setSponsorInquiryModalOpen] = useState<boolean>(false);
  const [selectedSponsorTierId, setSelectedSponsorTierId] = useState<string>('tier_2');
  const [selectedBrandShowcase, setSelectedBrandShowcase] = useState<ApprovedSponsor | null>(null);
  const [speakerPortalOpen, setSpeakerPortalOpen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      return search.includes('portal=speaker') || search.includes('speaker_portal=true');
    }
    return false;
  });

  // First-time visitors get the Forja de identidad (SgxPassHost), not a tour.

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

  // Stable close handlers: SgxDialog re-binds Escape whenever onClose changes.
  const openPrivacy = useCallback(() => setPrivacyModalOpen(true), []);
  const closePrivacy = useCallback(() => setPrivacyModalOpen(false), []);
  const closeSessionModal = useCallback(() => setSelectedSessionModal(null), []);
  const closeAnalytics = useCallback(() => setAnalyticsModalOpen(false), []);

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
        <LazyBoundary fallback={<LazyFallback />}>
        
        {/* Maintenance / Hidden Section Guard for Non-Overview Sections */}
        {activeSection !== 'OVERVIEW' && getSectionStatus(activeSection) !== 'ACTIVE' && (
          <div className="my-8 p-8 sm:p-12 sgx-crystal-card border-2 border-[#FDCC0D] text-center space-y-5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FDCC0D]/15 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold uppercase">
              <Sparkles className="w-4 h-4" />
              <span>
                {getSectionStatus(activeSection) === 'MAINTENANCE'
                  ? (es ? 'MÓDULO EN PREPARACIÓN · PRÓXIMAMENTE' : 'MODULE IN PREPARATION · COMING SOON')
                  : (es ? 'MÓDULO OCULTO POR EL ADMINISTRADOR' : 'MODULE HIDDEN BY THE ADMINISTRATOR')}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif]">
              {es ? 'Esta Estación del Summit se Activará Próximamente' : 'This Summit Station Will Go Live Soon'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-mono leading-relaxed">
              {es ? 'Nuestro equipo está terminando este módulo para el Spatialgineers Summit 2026. Mientras tanto, explora el Núcleo 3D.' : 'Our team is finishing this module for the Spatialgineers Summit 2026. Meanwhile, explore the 3D Core.'}
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
              sponsorCount={approvedSponsors.length}
            />

            <SummitCoreFooterBar onOpenPrivacy={openPrivacy} />

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
              subtitle={es ? 'Simulador de dron en tiempo real, colisiones y retos interactivos con ranking.' : 'Real-time drone simulator, collisions and interactive challenges with a leaderboard.'}
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
          <SummitSponsorshipMatrix
            tiers={sponsors}
            onOpenInquiryModal={(tierId) => handleOpenSponsorModal(tierId || 'tier_2')}
            partners={<SummitSponsorsGrid sponsors={approvedSponsors} onOpen={setSelectedBrandShowcase} onApply={() => handleOpenSponsorModal('tier_2')} />}
          />
        )}

        {/* TAB: SGX PASS + HOLO CARD STUDIO (visitante · speaker · initiate · sponsor) */}
        {activeSection === 'CREDENTIAL_GENERATOR' && (
          <div className="space-y-6">
            <SummitSectionBanner
              sectionKey="CREDENTIAL_GENERATOR"
              title={language === 'es' ? 'Tu SGX Pass' : 'Your SGX Pass'}
              subtitle={language === 'es'
                ? 'Tu SGX Pass es tu Holo Card: al frente, tú; al reverso, el programa y tu QR de entrada al Día 3. Una sola tarjeta para registrarte, entrar y compartir como tarjeta 3D, post o story.'
                : 'Your SGX Pass is your Holo Card: you on the front; the program and your Day 3 entrance QR on the back. One card to register, get in and share as a 3D card, post or story.'}
              pillarBadge="SGX.SYSTEM"
              pillarIconUrl={pillarIcon('SYSTEM')}
            />
            <SgxPassSection />
          </div>
        )}

        </LazyBoundary>
      </main>

      {/* 6. Session detail */}
      {selectedSessionModal && (() => {
        const sess = selectedSessionModal;
        const pillar = findPillar(sess.pillarId);
        const subtitle = sess.subtitle ? loc(sess, 'subtitle', language) : '';
        return (
          <SgxDialog
            size="md"
            onClose={closeSessionModal}
            accent={pillar ? pillarInk(pillar.key) : undefined}
            kicker={`${es ? 'Día' : 'Day'} ${sess.day} · ${sess.startTime} – ${sess.endTime}`}
            title={loc(sess, 'title', language)}
            icon={pillar ? <img src={pillar.iconUrl} alt="" referrerPolicy="no-referrer" className="w-9 h-9 object-contain shrink-0" /> : undefined}
            footer={
              <>
                <button type="button" onClick={() => downloadICS(sess, language)} className="sgx-btn sgx-btn--sm sgx-btn--ground">
                  <Download className="w-4 h-4" aria-hidden="true" />
                  <span>{es ? 'Descargar .ics' : 'Download .ics'}</span>
                </button>
                <a href={getGoogleCalendarUrl(sess, language)} target="_blank" rel="noopener noreferrer" className="sgx-btn sgx-btn--sm">
                  <ExternalLink className="w-4 h-4" aria-hidden="true" />
                  <span>{es ? 'Añadir a Google Calendar' : 'Add to Google Calendar'}</span>
                </a>
              </>
            }
          >
            <div className="space-y-4">
              {subtitle && <p className="text-base text-white font-['Exo_2',sans-serif] leading-snug">{subtitle}</p>}
              <p className="text-sm text-slate-300 leading-relaxed">{loc(sess, 'description', language)}</p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 p-3 text-sm font-mono border-l-2 border-[#00DDFF]/60 bg-white/[0.03]">
                <dt className="text-slate-400">{es ? 'Lugar' : 'Where'}</dt>
                <dd className="text-white">{loc(sess, 'venueLocation', language)}</dd>
                <dt className="text-slate-400">{es ? 'Formato' : 'Format'}</dt>
                <dd className="text-white">{SESSION_FORMAT_LABEL[sess.format]?.[es ? 'es' : 'en'] || sess.format}</dd>
                {pillar && (
                  <>
                    <dt className="text-slate-400">{es ? 'Pilar' : 'Pillar'}</dt>
                    <dd style={{ color: pillarInk(pillar.key) }}>{pillar.name} · {bi(pillar.title, language)}</dd>
                  </>
                )}
              </dl>
            </div>
          </SgxDialog>
        );
      })()}

      {/* 7. Speaker detail */}

      {/* 8. Brand Showcase Landing Modal */}
      {selectedBrandShowcase && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
          <SummitBrandShowcaseModal
            sponsor={selectedBrandShowcase}
            onClose={() => setSelectedBrandShowcase(null)}
          />
        </LazyBoundary>
      )}

      {/* 9. Reactor store (the pass, passport and tickets live in SgxPassHost) */}
      {rewardsStoreModalOpen && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
          <SummitRewardsStoreModal
            onClose={() => setRewardsStoreModalOpen(false)}
            onOpenAdminRewards={onNavigateToAdmin}
            isAdmin={isAdmin}
          />
        </LazyBoundary>
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
        <LazyBoundary fallback={null}>
        <KeynotePulseReactions
          currentSessionTitle={(sessions[0] && loc(sessions[0], 'title', language)) || (es ? 'Keynote Oficial: The Spatial Web' : 'Official Keynote: The Spatial Web')}
        />
        </LazyBoundary>
      )}

      {/* 13. Privacy policy */}
      {privacyModalOpen && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
          <SummitPrivacyPolicyModal onClose={closePrivacy} />
        </LazyBoundary>
      )}

      {sponsorInquiryModalOpen && (
        <LazyBoundary fallback={<LazyFallback />}>
          <SummitSponsorInquiryForm
            initialTierId={selectedSponsorTierId}
            isModal={true}
            onClose={() => setSponsorInquiryModalOpen(false)}
          />
        </LazyBoundary>
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

      {/* Summit analytics (header menu and the SGX.System drawer) */}
      {analyticsModalOpen && (
        <SgxDialog
          size="full"
          onClose={closeAnalytics}
          title={es ? 'Analíticas del Summit' : 'Summit analytics'}
          kicker={es ? 'SGX.System · datos reales de visitas y pases' : 'SGX.System · real visit and pass data'}
          icon={<BarChart3 className="w-5 h-5 text-[#FDCC0D] shrink-0" aria-hidden="true" />}
        >
          <LazyBoundary fallback={<LazyFallback />}>
            <SummitAnalyticsView />
          </LazyBoundary>
        </SgxDialog>
      )}

      {/* Footer on every scrolling section; the 3D core has its slim bar */}
      {activeSection !== 'OVERVIEW' && (
        <SummitFooter onOpenPrivacy={openPrivacy} onOpenSponsors={() => handleOpenSponsorModal('tier_2')} />
      )}

      {/* Module Visibility & Content Audit Control Modal */}
      {isAdmin && isAuditModalOpen && (
        <LazyBoundary fallback={<LazyFallback overlay />}>
          <SummitContentAuditModal
            isOpen
            onClose={() => setAuditModalOpen(false)}
          />
        </LazyBoundary>
      )}



    </div>
  );
};

