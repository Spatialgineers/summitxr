import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { HeaderNav, PageRoute } from './components/common/HeaderNav';
import { InteractiveSpatialCanvas } from './components/common/InteractiveSpatialCanvas';
import { AdminAuthGuard } from './components/admin/AdminAuthGuard';
import { LazyBoundary } from './components/common/LazyBoundary';
import { SummitPushAlertToast } from './components/summit/SummitPushAlertToast';
import { subscribeAnnouncement } from './lib/summitData';
import type { SummitNotification } from './types/summit';
import { LazyFallback } from './components/common/LazyFallback';
import { SummitLandingPage } from './components/summit/SummitLandingPage';

// Route-level code splitting: admin/stage/play/analytics/schema load on demand.
const AdminDashboard = lazy(() => import('./components/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const StagePage = lazy(() => import('./components/stage/StagePage').then((m) => ({ default: m.StagePage })));
const AudiencePWA = lazy(() => import('./components/audience/AudiencePWA').then((m) => ({ default: m.AudiencePWA })));
const AnalyticsDashboard = lazy(() => import('./components/analytics/AnalyticsDashboard').then((m) => ({ default: m.AnalyticsDashboard })));
const DatabaseSchemaViewer = lazy(() => import('./components/schema/DatabaseSchemaViewer').then((m) => ({ default: m.DatabaseSchemaViewer })));
import { 
  EventSession, 
  Question, 
  UserProfile, 
  VoteSummary, 
  VisualizerPresetId, 
  ReactionBurst, 
  WSMessage, 
  ReactionType,
  OptionEffectType,
  CustomVisualAssets
} from './types/engine';
import { SAMPLE_QUESTIONS, INITIAL_TENANTS } from './lib/schemas';
import { DEFAULT_PRESET, VISUALIZER_PRESETS, getAllPresets } from './lib/presets';
import { preloadAllPresetAssets } from './lib/assetCache';
import { useAuth } from './context/AuthContext';
import { auth } from './lib/firebase';
import { telemetry } from './lib/telemetry';

import { getAppRouteAndSectionFromUrl, syncAppUrl } from './lib/summitUrlSync';
import { SgxPassHost } from './identity/SgxPassHost';
import { PassGate } from './identity/PassGate';
import { ImmersionLayer } from './immersion/ImmersionLayer';
import { SgxBootSequence } from './immersion/SgxBootSequence';
import { recordVisit } from './lib/visitTracker';

export default function App() {
  const { isAdmin, user: authUser } = useAuth();
  const [showSplash, setShowSplash] = useState<boolean>(() => {
    try {
      return !sessionStorage.getItem('sgx_splash_shown');
    } catch {
      return true;
    }
  });
  // Cinematic SGX boot plays first, then hands off to the sponsor splash.
  const [bootDone, setBootDone] = useState<boolean>(() => new URLSearchParams(window.location.search).get('embed') === 'true');
  const [bootFading, setBootFading] = useState<boolean>(false);
  // First visit: boot only, straight into the Forge. The sponsor splash plays on "Ver intro".
  const [splashReplay, setSplashReplay] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    try {
      const parsed = getAppRouteAndSectionFromUrl();
      return parsed.page || 'summit';
    } catch {
      return 'summit';
    }
  });
  const [selectedTenantId, setSelectedTenantId] = useState<string>('tenant_spatialgineers');
  const [selectedEventId, setSelectedEventId] = useState<string>('event_live_main');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // SGX.System · Radar de visitas: count this session once (coarse region only).
  useEffect(() => {
    recordVisit();
  }, []);

  useEffect(() => {
    const handleReplaySplash = () => { setBootDone(false); setBootFading(false); setSplashReplay(true); setShowSplash(true); };
    window.addEventListener('sgx:replay_splash', handleReplaySplash);
    return () => window.removeEventListener('sgx:replay_splash', handleReplaySplash);
  }, []);

  // Core Room State
  const [session, setSession] = useState<EventSession>({
    id: 'sess_default',
    tenantId: 'tenant_spatialgineers',
    title: 'SGX Live Visualizer Stage',
    description: 'Interactive Choose Your Own Adventure Broadcast Engine',
    status: 'IDLE',
    activePresetId: DEFAULT_PRESET.id,
    timeRemaining: 0,
  });

  const [questions, setQuestions] = useState<Question[]>(SAMPLE_QUESTIONS);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [voteSummary, setVoteSummary] = useState<VoteSummary | null>(null);
  const [connectedAudienceCount, setConnectedAudienceCount] = useState<number>(1);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reactions, setReactions] = useState<ReactionBurst[]>([]);
  const [customAssets, setCustomAssets] = useState<CustomVisualAssets>({});

  // Local Audience Vote State
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Local User Profile for Audience PWA
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    // One stable voter per browser, named after the SGX Pass when there is one.
    let savedId = '';
    let nickname = '';
    try {
      savedId = localStorage.getItem('sgx_voter_id_v1') || '';
      if (!/^[A-Za-z0-9_-]{6,64}$/.test(savedId)) {
        savedId = `user_${Math.random().toString(36).substring(2, 11)}`;
        localStorage.setItem('sgx_voter_id_v1', savedId);
      }
      const pass = JSON.parse(localStorage.getItem('sgx_identity_v1') || 'null')?.pass;
      nickname = (pass?.callsign || pass?.fullName || '').toString().slice(0, 40);
    } catch {}
    if (!savedId) savedId = `user_${Math.random().toString(36).substring(2, 11)}`;
    return {
      id: savedId,
      nickname: nickname || `Piloto_${savedId.slice(-4).toUpperCase()}`,
      avatar: '🚀',
      avatarSeed: savedId,
      tenantId: 'tenant_spatialgineers',
      eventId: 'event_live_main',
      score: 0,
      totalScore: 0,
      accuracyRate: 100,
      streak: 0,
      currentStreak: 0,
      highestStreak: 0,
      multiplier: 1.0,
      totalInteractions: 0,
      activeSeconds: 0,
      prizeTier: 'Bronze Contributor',
      unlockedPrizeIds: [],
      choiceHistory: [],
    };
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Path Parsing and Routing Synchronizer
  const [activeSummitSection, setActiveSummitSection] = useState<string>('OVERVIEW');

  const parseCurrentURL = () => {
    if (typeof window === 'undefined') return;

    const parsed = getAppRouteAndSectionFromUrl();
    const urlParams = new URLSearchParams(window.location.search);
    const qTenant = urlParams.get('tenantId') || urlParams.get('tenant') || urlParams.get('theme');
    const qEvent = urlParams.get('eventId');

    setCurrentPage(parsed.page);
    setActiveSummitSection(parsed.summitSection || 'OVERVIEW');
    if (qTenant) setSelectedTenantId(qTenant);
    if (qEvent) setSelectedEventId(qEvent);
  };

  useEffect(() => {
    parseCurrentURL();

    const handlePopState = () => {
      parseCurrentURL();
    };
    const handleSwitchSection = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail?.section) {
        setActiveSummitSection(customEvt.detail.section);
      }
    };

    // Page-level navigation requests from outside the header (command terminal, HUD).
    const handleNavigatePage = (e: Event) => {
      const detail = (e as CustomEvent<{ page?: PageRoute; section?: string; pillar?: string }>).detail;
      if (!detail?.page) return;
      syncAppUrl({ page: detail.page, section: detail.section, subtab: detail.pillar, replace: false });
      setCurrentPage(detail.page);
      if (detail.page === 'summit') setActiveSummitSection(detail.section || 'OVERVIEW');
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('sgx:switch_summit_section', handleSwitchSection as EventListener);
    window.addEventListener('sgx:summit_section_changed', handleSwitchSection as EventListener);
    window.addEventListener('sgx:navigate_page', handleNavigatePage);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('sgx:switch_summit_section', handleSwitchSection as EventListener);
      window.removeEventListener('sgx:summit_section_changed', handleSwitchSection as EventListener);
      window.removeEventListener('sgx:navigate_page', handleNavigatePage);
    };
  }, []);

  const handleNavigate = (page: PageRoute) => {
    setCurrentPage(page);
    syncAppUrl({ page, replace: false });
  };

  const handleSelectTenant = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    syncAppUrl({ page: currentPage, theme: tenantId, replace: false });
  };

  /** Director REST calls carry the admin's Firebase ID token. */
  const adminFetch = async (url: string, init: RequestInit) => {
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    return fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  };

  // Fetch initial state via REST API
  const fetchInitialState = async () => {
    try {
      const res = await fetch(`/api/state?tenantId=${selectedTenantId}&eventId=${selectedEventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.session) setSession(data.session);
        if (data.currentQuestionIndex !== undefined) setCurrentQuestionIndex(data.currentQuestionIndex);
        if (data.voteSummary) setVoteSummary(data.voteSummary);
        if (data.connectedAudienceCount) setConnectedAudienceCount(data.connectedAudienceCount);
        if (data.users) setUsers(data.users);
      }
      const qRes = await fetch(`/api/questions?tenantId=${selectedTenantId}&eventId=${selectedEventId}`);
      if (qRes.ok) {
        const qData = await qRes.json();
        if (qData.questions && qData.questions.length > 0) {
          setQuestions(qData.questions);
        }
      }
    } catch (e) {
      console.warn('REST API fetch notice:', e);
    }
  };

  // The live engine (votes, presets, stage) only runs on the pages that use it.
  // CMS announcements reach every page; the Summit landing shows them itself.
  const [announcement, setAnnouncement] = useState<SummitNotification | null>(null);
  useEffect(() => {
    if (currentPage === 'summit') return;
    return subscribeAnnouncement(setAnnouncement);
  }, [currentPage]);

  const [engineNotice, setEngineNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!engineNotice) return;
    const t = window.setTimeout(() => setEngineNotice(null), 8000);
    return () => window.clearTimeout(t);
  }, [engineNotice]);

  const needsLiveEngine = currentPage === 'admin' || currentPage === 'play' || currentPage === 'stage' || currentPage === 'multiview' || currentPage === 'analytics';
  const isAdminRef = useRef(isAdmin);
  isAdminRef.current = isAdmin;

  // Setup WebSocket Connection & Ecosystem Asset Preloading
  useEffect(() => {
    if (!needsLiveEngine) return;
    fetchInitialState();
    
    // Global suppressor for benign WebSocket closing / Vite HMR unhandled rejections
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      if (
        e.reason?.message?.includes('WebSocket') ||
        e.reason?.toString?.()?.includes('WebSocket') ||
        String(e.reason).includes('WebSocket closed')
      ) {
        e.preventDefault(); // Silence expected dev WebSocket closing warning
      }
    };
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Background Ecosystem Preload: Cache all sprites, models & shaders in IndexedDB locally
    try {
      const presets = Object.values(getAllPresets());
      preloadAllPresetAssets(presets).catch((err) => {
        console.warn('Preload assets notice:', err);
      });
    } catch (e) {
      console.warn('Preload initialization warning:', e);
    }

    let isDisposed = false;

    const connectWS = () => {
      if (isDisposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?tenantId=${selectedTenantId}&eventId=${selectedEventId}&userId=${userProfile.id}&nickname=${encodeURIComponent(userProfile.nickname || '')}`;

      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isDisposed) return;
          setIsConnected(true);
          // Directors prove who they are with their Firebase ID token.
          if (isAdminRef.current && auth.currentUser) {
            auth.currentUser.getIdToken()
              .then((token) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'AUTH', payload: { token } })); })
              .catch(() => {});
          }
        };

        ws.onmessage = (evt) => {
          if (isDisposed) return;
          try {
            if (typeof evt.data === 'string') {
              telemetry.recordBytesIn(evt.data.length);
              const msg: WSMessage = JSON.parse(evt.data);
              handleIncomingWSMessage(msg);
            } else if (evt.data instanceof ArrayBuffer) {
              telemetry.recordBytesIn(evt.data.byteLength);
            } else if (evt.data instanceof Blob) {
              telemetry.recordBytesIn(evt.data.size);
            }
          } catch (err) {
            console.error('Error parsing WS message:', err);
          }
        };

        ws.onclose = () => {
          if (isDisposed) return;
          setIsConnected(false);
          reconnectTimerRef.current = setTimeout(connectWS, 4000);
        };

        ws.onerror = () => {
          if (!isDisposed) setIsConnected(false);
        };
      } catch (err) {
        console.warn('WebSocket connection notice:', err);
      }
    };

    connectWS();

    return () => {
      isDisposed = true;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          try {
            ws.close();
          } catch {
            // ignore cleanup errors
          }
        }
        wsRef.current = null;
      }
    };
  }, [selectedTenantId, selectedEventId, needsLiveEngine, isAdmin, authUser?.uid]);

  const handleIncomingWSMessage = (msg: WSMessage) => {
    switch (msg.type) {
      case 'INIT_STATE':
      case 'ROOM_STATE_SYNC':
      case 'STATE_SYNC': {
        const payload = msg.payload;
        if (!payload) break;
        if (payload.session) {
          setSession(payload.session);
        }
        if (payload.currentQuestionIndex !== undefined) {
          setCurrentQuestionIndex(payload.currentQuestionIndex);
        }
        if (payload.voteSummary !== undefined) {
          setVoteSummary(payload.voteSummary);
        }
        if (payload.connectedAudienceCount !== undefined) {
          setConnectedAudienceCount(payload.connectedAudienceCount);
        }
        if (payload.users && Array.isArray(payload.users)) {
          setUsers(payload.users);
          const me = payload.users.find((u: UserProfile) => u.id === userProfile.id);
          if (me) setUserProfile(me);
        }
        if (payload.questions && payload.questions.length > 0) {
          setQuestions(payload.questions);
        }
        if (payload.customAssets) {
          setCustomAssets(payload.customAssets);
        }
        break;
      }

      case 'UPDATE_CUSTOM_ASSETS': {
        if (msg.payload) {
          setCustomAssets(msg.payload);
        }
        break;
      }

      case 'QUESTION_START': {
        const { question, questionIndex, durationSeconds } = msg.payload || {};
        const idx = questionIndex ?? (question ? questions.findIndex(q => q.id === question.id) : currentQuestionIndex);
        if (idx >= 0) {
          setCurrentQuestionIndex(idx);
        }
        setSession(prev => ({
          ...prev,
          status: 'VOTING_ACTIVE',
          timeRemaining: durationSeconds || question?.durationSeconds || 30,
        }));
        setVoteSummary(null);
        setHasVoted(false);
        setSelectedOptionId(null);
        break;
      }

      case 'TIMER_TICK':
      case 'COUNTDOWN_TICK': {
        const { timeRemaining } = msg.payload || {};
        if (timeRemaining !== undefined) {
          setSession(prev => ({
            ...prev,
            timeRemaining,
          }));
        }
        break;
      }

      case 'VOTE_UPDATE': {
        const summary: VoteSummary = msg.payload;
        if (summary) {
          setVoteSummary(summary);
        }
        break;
      }

      case 'VOTE_SUMMARY':
      case 'VOTING_CLOSED': {
        const payload = msg.payload || {};
        const summary: VoteSummary = payload.summary || payload;
        if (summary) {
          setVoteSummary(summary);
        }
        setSession(prev => ({
          ...prev,
          status: 'RESULT_REVEALED',
          activePresetId: summary?.winningPresetId || payload.winningPresetId || prev.activePresetId,
          timeRemaining: 0,
        }));
        if (payload.users && Array.isArray(payload.users)) {
          setUsers(payload.users);
        }
        break;
      }

      case 'VISUALIZER_TRIGGER':
      case 'PRESET_TRIGGER': {
        const { presetId } = msg.payload || {};
        if (presetId) {
          setSession(prev => ({
            ...prev,
            activePresetId: presetId,
          }));
        }
        break;
      }

      case 'AUDIENCE_REACTION':
      case 'REACTION_BURST': {
        const reaction: ReactionBurst = msg.payload;
        if (reaction) {
          setReactions(prev => [...prev.slice(-20), reaction]);
        }
        break;
      }

      case 'SCORE_UPDATE': {
        const { user } = msg.payload || {};
        if (user) {
          setUserProfile(user);
        }
        break;
      }

      case 'USER_SCORES_SYNC': {
        const updatedUsers: UserProfile[] = msg.payload;
        if (Array.isArray(updatedUsers)) {
          setUsers(updatedUsers);
          const me = updatedUsers.find(u => u.id === userProfile.id);
          if (me) {
            setUserProfile(me);
          }
        }
        break;
      }

      case 'ERROR': {
        // The live engine refused a director action (e.g. an invalid question import).
        // Tell the director and pull the server's real state so the console doesn't drift.
        const reason = (msg.payload as any)?.error || 'acción rechazada';
        setEngineNotice(`El servidor rechazó la acción: ${reason}`);
        fetchInitialState();
        break;
      }

      case 'AUTH_RESULT': {
        if (isAdminRef.current && !(msg.payload as any)?.isAdmin) {
          setEngineNotice('El servidor no verificó tu sesión de admin: vuelve a entrar con Google (info@ o support@).');
        }
        break;
      }
    }
  };

  // Dispatch WebSocket JSON
  const sendWS = (msg: WSMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const payloadStr = JSON.stringify(msg);
      telemetry.recordBytesOut(payloadStr.length);
      wsRef.current.send(payloadStr);
    }
  };

  // Send Ultra-Low Payload Binary Buffer (1 byte: 0x01–0x04)
  const sendBinaryVote = (code: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const buffer = new Uint8Array([code]);
      telemetry.recordBytesOut(1);
      wsRef.current.send(buffer);
    }
  };

  // Director Actions (Dual-path: Instant Optimistic + WebSocket + REST)
  const handleBroadcastQuestion = (index: number) => {
    // 1. Optimistic Local State
    const targetQ = questions[index];
    setCurrentQuestionIndex(index);
    setSession(prev => ({
      ...prev,
      status: 'VOTING_ACTIVE',
      timeRemaining: targetQ?.durationSeconds || 30,
      currentQuestionId: targetQ?.id,
    }));
    setVoteSummary(null);
    setHasVoted(false);
    setSelectedOptionId(null);

    // 2. Real-Time WebSocket broadcast
    sendWS({
      type: 'BROADCAST_QUESTION',
      payload: { index, questionIndex: index },
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });

    // 3. REST Action Sync
    adminFetch('/api/action/broadcast-question', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: selectedTenantId,
        eventId: selectedEventId,
        questionIndex: index,
      }),
    }).catch(err => console.warn('REST broadcast fallback warning:', err));
  };

  const handleCloseVoting = () => {
    setSession(prev => ({
      ...prev,
      status: 'RESULT_REVEALED',
      timeRemaining: 0,
    }));

    sendWS({
      type: 'CLOSE_VOTING',
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });

    adminFetch('/api/action/close-voting', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: selectedTenantId,
        eventId: selectedEventId,
      }),
    }).catch(err => console.warn('REST close voting warning:', err));
  };

  const handleTriggerPreset = (presetId: VisualizerPresetId) => {
    setSession(prev => ({
      ...prev,
      activePresetId: presetId,
    }));

    sendWS({
      type: 'TRIGGER_PRESET',
      payload: { presetId },
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });

    adminFetch('/api/action/trigger-preset', {
      method: 'POST',
      body: JSON.stringify({
        tenantId: selectedTenantId,
        eventId: selectedEventId,
        presetId,
      }),
    }).catch(err => console.warn('REST trigger preset warning:', err));
  };

  const handleCreateQuestion = (newQ: Partial<Question>) => {
    sendWS({
      type: 'CREATE_QUESTION',
      payload: newQ,
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });
  };

  const handleBulkCreateQuestions = (newQuestions: Question[], mode: 'append' | 'replace') => {
    if (mode === 'replace') {
      setQuestions(newQuestions);
      sendWS({
        type: 'UPDATE_QUESTIONS',
        payload: newQuestions,
        tenantId: selectedTenantId,
        eventId: selectedEventId,
      });
    } else {
      setQuestions((prev) => [...prev, ...newQuestions]);
      sendWS({
        type: 'CREATE_QUESTION',
        payload: newQuestions,
        tenantId: selectedTenantId,
        eventId: selectedEventId,
      });
    }
  };


  const handleUpdateOptionEffect = (
    questionIndex: number,
    optionId: string,
    updates: Partial<{
      presetId: VisualizerPresetId;
      effectType: OptionEffectType;
      effectName: string;
      effectMultiplier: number;
      effectTargetParam: string;
    }>
  ) => {
    setQuestions((prevQuestions) => {
      const updated = [...prevQuestions];
      const targetQ = { ...updated[questionIndex] };
      if (!targetQ || !targetQ.options) return prevQuestions;

      targetQ.options = targetQ.options.map((opt) =>
        opt.id === optionId ? { ...opt, ...updates } : opt
      );
      updated[questionIndex] = targetQ;

      sendWS({
        type: 'UPDATE_QUESTIONS',
        payload: { questions: updated },
        tenantId: selectedTenantId,
        eventId: selectedEventId,
      });

      return updated;
    });
  };


  // Audience Actions
  const handleCastVote = (optionId: string, optionCode: number) => {
    if (hasVoted) return;
    setHasVoted(true);
    setSelectedOptionId(optionId);

    // 1. Send ultra-low latency binary buffer (1 byte)
    sendBinaryVote(optionCode);

    // 2. Send JSON payload over WebSocket
    sendWS({
      type: 'SUBMIT_VOTE',
      payload: {
        optionId,
        optionCode,
        userId: userProfile.id,
        user: userProfile,
      },
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });

    // 3. REST fallback POST
    fetch('/api/vote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: selectedTenantId,
        eventId: selectedEventId,
        userId: userProfile.id,
        optionId,
        optionCode,
        user: userProfile,
      }),
    }).catch(err => console.warn('REST vote fallback warning:', err));
  };

  const handleSendReaction = (emoji: string, type: ReactionType) => {
    // 1. Optimistically display reaction immediately
    const optimisticRx: ReactionBurst = {
      id: `rx_local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      emoji,
      userId: userProfile.id,
      timestamp: Date.now(),
      color: type === 'fire' ? '#ff4500' : type === 'lightning' ? '#fdcc0d' : type === 'rocket' ? '#00ddff' : '#ff2d55',
    };
    setReactions(prev => [...prev.slice(-20), optimisticRx]);

    // 2. Send WebSocket
    sendWS({
      type: 'SEND_REACTION',
      payload: {
        emoji,
        type,
        color: optimisticRx.color,
        userId: userProfile.id,
        userName: userProfile.nickname,
      },
      tenantId: selectedTenantId,
      eventId: selectedEventId,
    });

    // 3. REST fallback
    fetch('/api/reaction', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tenantId: selectedTenantId,
        eventId: selectedEventId,
        userId: userProfile.id,
        emoji,
        color: optimisticRx.color,
      }),
    }).catch(err => console.warn('REST reaction fallback warning:', err));
  };

  const handleUpdateCustomAssets = (newAssets: CustomVisualAssets) => {
    setCustomAssets(newAssets);
    sendWS({
      type: 'UPDATE_CUSTOM_ASSETS',
      tenantId: selectedTenantId,
      eventId: selectedEventId,
      payload: newAssets,
    });
  };

  const activeQuestion = questions[currentQuestionIndex] || null;

  const renderCurrentView = () => {
    // Dedicated Summit Landing Page
    if (currentPage === 'summit') {
      return (
        <div className={`w-full flex flex-col ${activeSummitSection === 'OVERVIEW' ? 'h-[100dvh] max-h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
          <HeaderNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          <div className={`w-full ${activeSummitSection === 'OVERVIEW' ? 'flex-1 min-h-0 relative flex flex-col overflow-hidden' : 'min-h-screen'}`}>
            <SummitLandingPage 
              onNavigateToPlayVote={() => handleNavigate('play')} 
              onNavigateToVisualizer={() => handleNavigate('stage')} 
              onNavigateToAdmin={() => handleNavigate('admin')}
            />
          </div>
        </div>
      );
    }

    // Single-Page Full Outputs for Dedicated URL Routes
    if (currentPage === 'stage') {
      return (
        <StagePage
          tenantId={selectedTenantId}
          eventId={selectedEventId}
          session={session}
          currentQuestion={activeQuestion}
          voteSummary={voteSummary}
          reactions={reactions}
          customAssets={customAssets}
          onNavigate={handleNavigate}
        />
      );
    }

    if (currentPage === 'play') {
      return (
        <div className="min-h-screen">
          <HeaderNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          <PassGate feature="live">
              <AudiencePWA
                tenantId={selectedTenantId}
                eventId={selectedEventId}
                session={session}
                currentQuestion={activeQuestion}
                voteSummary={voteSummary}
                user={userProfile}
                hasVoted={hasVoted}
                selectedOptionId={selectedOptionId}
                onCastVote={handleCastVote}
                onSendReaction={handleSendReaction}
                isConnected={isConnected}
              />
          </PassGate>
        </div>
      );
    }

    if (currentPage === 'admin') {
      return (
        <div className="min-h-screen">
          <HeaderNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          {isAdmin ? (
            <AdminDashboard
              tenantId={selectedTenantId}
              eventId={selectedEventId}
              questions={questions}
              currentQuestionIndex={currentQuestionIndex}
              session={session}
              voteSummary={voteSummary}
              connectedAudienceCount={connectedAudienceCount}
              users={users}
              onBroadcastQuestion={handleBroadcastQuestion}
              onCloseVoting={handleCloseVoting}
              onTriggerPreset={handleTriggerPreset}
              onCreateQuestion={handleCreateQuestion}
              onBulkCreateQuestions={handleBulkCreateQuestions}
              onUpdateOptionEffect={handleUpdateOptionEffect}
              customAssets={customAssets}
              onUpdateCustomAssets={handleUpdateCustomAssets}
            />
          ) : (
            <AdminAuthGuard onNavigate={handleNavigate} />
          )}
        </div>
      );
    }

    if (currentPage === 'analytics') {
      return (
        <div className="min-h-screen">
          <HeaderNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          {isAdmin ? (
            <AnalyticsDashboard
              tenantId={selectedTenantId}
              eventId={selectedEventId}
              users={users}
              questions={questions}
              voteSummary={voteSummary}
            />
          ) : (
            <AdminAuthGuard onNavigate={handleNavigate} />
          )}
        </div>
      );
    }

    if (currentPage === 'schema') {
      return (
        <div className="min-h-screen">
          <HeaderNav
            currentPage={currentPage}
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          {isAdmin ? (
            <DatabaseSchemaViewer />
          ) : (
            <AdminAuthGuard onNavigate={handleNavigate} />
          )}
        </div>
      );
    }

    // Multi-View Live Studio Command Center (Director + Stage + PWA in one synchronized view for Admins)
    if (!isAdmin) {
      return (
        <div className="min-h-screen">
          <HeaderNav
            currentPage="play"
            onNavigate={handleNavigate}
            selectedTenantId={selectedTenantId}
            selectedEventId={selectedEventId}
            onSelectTenant={handleSelectTenant}
            isConnected={isConnected}
          />
          <div className="px-3 pt-4">
            <PassGate feature="live">
              <AudiencePWA
                tenantId={selectedTenantId}
                eventId={selectedEventId}
                session={session}
                currentQuestion={activeQuestion}
                voteSummary={voteSummary}
                user={userProfile}
                hasVoted={hasVoted}
                selectedOptionId={selectedOptionId}
                onCastVote={handleCastVote}
                onSendReaction={handleSendReaction}
                isConnected={isConnected}
              />
            </PassGate>
          </div>
        </div>
      );
    }

    // Multi-View Live Studio Command Center (Director + Stage + PWA in one synchronized view)
    return (
      <div className="min-h-screen flex flex-col">
        <HeaderNav
          currentPage={currentPage}
          onNavigate={handleNavigate}
          selectedTenantId={selectedTenantId}
          selectedEventId={selectedEventId}
          onSelectTenant={handleSelectTenant}
          isConnected={isConnected}
        />

        <main className="flex-1 p-3 md:p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 max-w-[1750px] mx-auto w-full">
          
          {/* Left Container (Desktop/Admin backend controls, questions, CYOA, etc.): 7 columns on large screens */}
          <div className="lg:col-span-7 flex flex-col space-y-3">
            <div className="flex items-center justify-between px-3 bg-[#121212]/90 border border-[var(--sgx-secondary)] p-2.5 shadow-lg backdrop-blur-md" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--sgx-neon)] animate-ping" />
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Admin & Director Control Hub (PC / Backend)
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[10px]">
                <span className="text-slate-400">QUESTIONS • CYOA • LIVE DIRECTOR</span>
              </div>
            </div>

            <div className="flex-1 sgx-spatial-card border border-[var(--sgx-secondary)] overflow-y-auto max-h-[850px] shadow-2xl p-1" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
              <AdminDashboard
                tenantId={selectedTenantId}
                eventId={selectedEventId}
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                session={session}
                voteSummary={voteSummary}
                connectedAudienceCount={connectedAudienceCount}
                users={users}
                onBroadcastQuestion={handleBroadcastQuestion}
                onCloseVoting={handleCloseVoting}
                onTriggerPreset={handleTriggerPreset}
                onCreateQuestion={handleCreateQuestion}
                onBulkCreateQuestions={handleBulkCreateQuestions}
                onUpdateOptionEffect={handleUpdateOptionEffect}
                customAssets={customAssets}
                onUpdateCustomAssets={handleUpdateCustomAssets}
              />
            </div>
          </div>

          {/* Right Container (Audience PWA Mobile View): 5 columns with a realistic mobile smartphone frame */}
          <div className="lg:col-span-5 flex flex-col space-y-3">
            
            <div className="flex items-center justify-between px-3 bg-[#121212]/90 border border-[var(--sgx-secondary)] p-2.5 shadow-lg backdrop-blur-md" style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}>
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--sgx-primary)] animate-pulse" />
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Audience PWA Mobile (Smartphone View)
                </span>
              </div>
              <div className="flex items-center space-x-2 font-mono text-[10px]">
                <span className="px-2 py-0.5 border border-[var(--sgx-primary)]/60 text-[var(--sgx-primary)] bg-[var(--sgx-primary)]/15 rounded">
                  LIVE INTERACTION
                </span>
                <button
                  onClick={() => handleNavigate('play')}
                  className="text-[var(--sgx-neon)] hover:underline px-1.5 py-0.5 border border-[var(--sgx-secondary)] hover:bg-[var(--sgx-neon)]/20"
                >
                  Open /play ↗
                </button>
              </div>
            </div>

            {/* Centered Mobile Device Simulator Container */}
            <div className="flex-1 sgx-spatial-card border border-[var(--sgx-secondary)] p-3 flex justify-center items-start overflow-y-auto max-h-[850px] shadow-2xl" style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}>
              
              {/* Mobile Phone Mockup Box */}
              <div className="w-full max-w-[440px] bg-[var(--sgx-bg)]/95 backdrop-blur-xl border-2 border-[var(--sgx-secondary)] rounded-3xl p-3 shadow-2xl relative flex flex-col my-auto sgx-rim-glow">
                
                {/* Phone Speaker & Camera Notch */}
                <div className="w-24 h-4 bg-[#121212] rounded-full mx-auto mb-2 flex items-center justify-center space-x-2 border border-[var(--sgx-secondary)]/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="w-8 h-1 rounded bg-slate-800" />
                </div>

                {/* Screen Content */}
                <div className="rounded-2xl overflow-hidden border border-[var(--sgx-secondary)]/50 bg-[var(--sgx-bg)]">
                  <AudiencePWA
                    tenantId={selectedTenantId}
                    eventId={selectedEventId}
                    session={session}
                    currentQuestion={activeQuestion}
                    voteSummary={voteSummary}
                    user={userProfile}
                    hasVoted={hasVoted}
                    selectedOptionId={selectedOptionId}
                    onCastVote={handleCastVote}
                    onSendReaction={handleSendReaction}
                    isConnected={isConnected}
                  />
                </div>

                {/* Phone Home Bar Indicator */}
                <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-3" />

              </div>

            </div>

          </div>

        </main>
      </div>
    );
  };

  return (
    <div className={`relative bg-[var(--sgx-bg)] text-slate-100 selection:bg-[var(--sgx-primary)] selection:text-black ${currentPage === 'summit' && activeSummitSection === 'OVERVIEW' ? 'h-[100dvh] overflow-hidden' : 'min-h-screen'}`}>
      {/* The one splash: particle bolt, Summit wordmark and the Tier 3+ partner row */}
      {showSplash && !bootDone && (
        <SgxBootSequence
          onFadeStart={() => setBootFading(true)}
          onComplete={() => {
            setBootDone(true);
            setShowSplash(false);
            setSplashReplay(false);
            try { sessionStorage.setItem('sgx_splash_shown', '1'); } catch { /* private mode */ }
          }}
        />
      )}

      {/* Persistent 3D Three.js Spatial Atmosphere & Cursor-Reactive Canvas */}
      <InteractiveSpatialCanvas />
      
      {currentPage !== 'summit' && (
        <SummitPushAlertToast
          notification={announcement}
          onClose={() => setAnnouncement(null)}
          onActionClick={(url) => { if (url) window.location.href = url; }}
        />
      )}

      {engineNotice && (
        <div role="alert" className="fixed top-16 left-1/2 -translate-x-1/2 z-[140] max-w-[92vw] px-4 py-2 bg-red-950/90 border border-red-500/60 text-red-100 text-xs font-mono">
          {engineNotice}
        </div>
      )}

      {/* Application Content Layer */}
      <div className={`relative z-10 w-full ${currentPage === 'summit' && activeSummitSection === 'OVERVIEW' ? 'h-full overflow-hidden' : 'min-h-screen'}`}>
        <LazyBoundary fallback={<LazyFallback fullScreen />}>
          {renderCurrentView()}
        </LazyBoundary>
      </div>

      {/* SGX Pass: Forja de identidad + Hangar del piloto (replaces taquilla, profile, passport, tours) */}
      <SgxPassHost quiet={currentPage === 'stage' || currentPage === 'multiview'} />

      {/* SGX Immersion Engine: quests, energy cells, terminal, HUD and FX */}
      <ImmersionLayer currentPage={currentPage} />
    </div>
  );
}
