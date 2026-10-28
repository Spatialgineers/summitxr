import { downloadCsvFile, escapeCsvCell } from '../../lib/csvManager';
import React, { useState, useEffect } from 'react';
import { 
  Question, 
  EventSession, 
  VoteSummary, 
  UserProfile, 
  VisualizerPresetId,
  TelemetryStats,
  OptionEffectType,
  CustomVisualAssets
} from '../../types/engine';
import { CustomVisualUploader } from './CustomVisualUploader';
import { FXPresetsStudio } from './FXPresetsStudio';
import { getAllPresets } from '../../lib/presets';
import { AdminRewardsManager } from "./AdminRewardsManager";
import { INITIAL_TENANTS } from '../../lib/schemas';
import { TenantRoomManager } from './TenantRoomManager';
import { SummitRegistrationsPanel } from './SummitRegistrationsPanel';
import { AdminThemeStudio } from './AdminThemeStudio';
import { useAuth, AUTHORIZED_SUPER_ADMIN_EMAIL } from '../../context/AuthContext';
import { telemetry } from '../../lib/telemetry';
import { 
  Play, 
  Square, 
  Sparkles, 
  Palette,
  Plus, 
  Lock, 
  ShieldAlert, 
  ShieldCheck, 
  Radio, 
  Layers, 
  GitBranch, 
  Database, 
  Key, 
  Activity,
  Award,
  Zap,
  Users,
  Download,
  FileSpreadsheet,
  FileJson,
  Search,
  RefreshCw,
  BarChart3,
  Calendar,
  Building2,
  Globe,
  Mail,
  Phone,
  Tag,
  Eye,
  Trash2,
  Edit3,
  Save,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';

// Summit CMS, Analytics & Sponsor Integrations
import { SummitCMSManager } from './SummitCMSManager';
import { SummitAnalyticsView } from '../analytics/SummitAnalyticsView';
import { SummitBrandShowcaseModal } from '../summit/SummitBrandShowcaseModal';
import { SummitContentAuditModal } from '../summit/SummitContentAuditModal';
import { BulkQuestionUploadModal } from './BulkQuestionUploadModal';
import { BulkInstagramImportModal } from './BulkInstagramImportModal';
import { AdminMatchPanel } from '../../modules/match/admin/AdminMatchPanel';
import { AdminSection, LiveListTable, AdminRosterPanel, ContentBackupPanel } from './AdminPanels';
import { SummitInitiatesPanel } from './SummitInitiatesPanel';
import { ClientErrorsPanel, useClientErrors } from './ClientErrorsPanel';
import { CSV_ENTITIES } from '../../lib/csv/entities';
import './admin.css';
import { Instagram, UploadCloud, Sliders, Download as DownloadIcon, Megaphone, Vote, CalendarDays, Mic2, Handshake, Layers3, Sparkle, Map as MapIcon, AppWindow, Package, Images, Ticket, Gift, Target, HelpCircle as HelpIcon, BarChart2, Brush, Wand2, ShieldCheck as ShieldIcon, UserCog, DatabaseBackup, Users2, Briefcase, Radio as RadioIcon, Bug } from 'lucide-react';
import { 
  SummitSession, 
  SummitSpeaker, 
  Map360Node, 
  EmbedWidget, 
  SponsorshipTier, 
  SponsorInquiry,
  ApprovedSponsor,
  SummitNotification
} from '../../types/summit';
import { SocialPost } from '../../lib/realSocialStreamApi';
import { 
  loadPersistedSessions, 
  loadPersistedSpeakers, 
  loadPersistedMapNodes, 
  loadPersistedEmbedWidgets, 
  loadPersistedSponsorshipTiers,
  loadAllApprovedSponsors,
  loadAllSponsorInquiries,
  saveAllApprovedSponsors,
  saveAllSponsorInquiries,
  saveAllSessions,
  saveAllSpeakers,
  saveAllMapNodes,
  saveAllEmbedWidgets,
  saveAllSponsorshipTiers,
  approveSponsorInquiryAndCreateShowcase,
  deleteApprovedSponsor,
  playNotificationChime,
  fetchSponsorInquiriesRemote,
  deleteSponsorInquiryRemote,
} from '../../lib/summitData';

interface AdminDashboardProps {
  tenantId: string;
  eventId: string;
  questions: Question[];
  currentQuestionIndex: number;
  session: EventSession;
  voteSummary?: VoteSummary | null;
  connectedAudienceCount: number;
  users: UserProfile[];
  onBroadcastQuestion: (index: number) => void;
  onCloseVoting: () => void;
  onTriggerPreset: (presetId: VisualizerPresetId) => void;
  onCreateQuestion: (newQ: Partial<Question>) => void;
  onBulkCreateQuestions?: (questions: Question[], mode: 'append' | 'replace') => void;
  onUpdateOptionEffect?: (questionIndex: number, optionId: string, updates: Partial<{ presetId: VisualizerPresetId; effectType: OptionEffectType; effectName: string; effectMultiplier: number; effectTargetParam: string }>) => void;
  onSimulateCustomOptionWeights?: (weights: Record<string, number>) => void;
  customAssets?: CustomVisualAssets;
  onUpdateCustomAssets?: (assets: CustomVisualAssets) => void;
}

export type AdminSubpage =
  // En vivo
  | 'DIRECTOR' | 'ANNOUNCE' | 'POLLS' | 'ERRORS'
  // Contenido
  | 'AGENDA' | 'SPEAKERS' | 'SPONSORS' | 'TIERS' | 'INITIATES' | 'MAP' | 'EMBEDS' | 'CAPSULES' | 'GALLERY' | 'SOCIAL'
  // Personas
  | 'REGISTRATIONS' | 'AUDIENCE_LEADS' | 'ENTREPRENEUR_MATCH'
  // Juego
  | 'REWARDS' | 'MISSIONS' | 'CYOA_SCENARIOS'
  // Sistema
  | 'SUMMIT_ANALYTICS' | 'BRAND' | 'PRESETS_LAB' | 'CONTENT_AUDIT' | 'ADMINS' | 'BACKUP';

type NavItem = { id: AdminSubpage; label: string; icon: React.ComponentType<{ className?: string }>; keywords?: string };
const ADMIN_NAV: { id: string; label: string; items: NavItem[] }[] = [
  { id: 'live', label: 'En vivo', items: [
    { id: 'DIRECTOR', label: 'Consola del director', icon: RadioIcon, keywords: 'votacion pregunta escenario' },
    { id: 'ANNOUNCE', label: 'Anuncios', icon: Megaphone, keywords: 'push aviso notificacion' },
    { id: 'POLLS', label: 'Encuestas del keynote', icon: Vote, keywords: 'votos reacciones' },
    { id: 'ERRORS', label: 'Errores en vivo', icon: Bug, keywords: 'monitoreo fallos telefonos crash sentry' },
  ] },
  { id: 'content', label: 'Contenido', items: [
    { id: 'AGENDA', label: 'Agenda / Run of Show', icon: CalendarDays, keywords: 'sesiones horario programa' },
    { id: 'SPEAKERS', label: 'Speakers', icon: Mic2, keywords: 'conferencistas oradores' },
    { id: 'SPONSORS', label: 'Sponsors', icon: Handshake, keywords: 'auspiciadores solicitudes showcase crm' },
    { id: 'TIERS', label: 'Niveles de auspicio', icon: Layers3, keywords: 'tiers precios' },
    { id: 'INITIATES', label: 'Guild Initiates', icon: Sparkle, keywords: 'guild iniciados' },
    { id: 'MAP', label: 'Mapa 360', icon: MapIcon, keywords: 'tour chroma nodos' },
    { id: 'EMBEDS', label: 'Apps embebidas', icon: AppWindow, keywords: 'juegos widgets' },
    { id: 'CAPSULES', label: 'Cápsulas semanales', icon: Package, keywords: 'transmisiones' },
    { id: 'GALLERY', label: 'Galería', icon: Images, keywords: 'fotos retrospectiva' },
    { id: 'SOCIAL', label: 'Redes sociales', icon: Instagram, keywords: 'instagram reels' },
  ] },
  { id: 'people', label: 'Personas', items: [
    { id: 'REGISTRATIONS', label: 'Inscritos y Día 3', icon: Ticket, keywords: 'registro check-in propuestas' },
    { id: 'AUDIENCE_LEADS', label: 'Audiencia y leads', icon: Users2, keywords: 'pilotos emails' },
    { id: 'ENTREPRENEUR_MATCH', label: 'Entrepreneur Match', icon: Briefcase, keywords: 'match perfiles' },
  ] },
  { id: 'game', label: 'Juego', items: [
    { id: 'REWARDS', label: 'Tienda del Reactor', icon: Gift, keywords: 'premios canjes xp' },
    { id: 'MISSIONS', label: 'Misiones', icon: Target, keywords: 'reactor xp' },
    { id: 'CYOA_SCENARIOS', label: 'Preguntas en vivo', icon: HelpIcon, keywords: 'cyoa votacion' },
  ] },
  { id: 'system', label: 'Sistema', items: [
    { id: 'SUMMIT_ANALYTICS', label: 'Analítica', icon: BarChart2, keywords: 'metricas visitas' },
    { id: 'BRAND', label: 'Marca y tenants', icon: Brush, keywords: 'tema colores salas' },
    { id: 'PRESETS_LAB', label: 'Efectos visuales', icon: Wand2, keywords: 'presets fx shaders' },
    { id: 'CONTENT_AUDIT', label: 'Funciones y QA', icon: ShieldIcon, keywords: 'feature flags toggles auditoria' },
    { id: 'ADMINS', label: 'Admins', icon: UserCog, keywords: 'acceso roles' },
    { id: 'BACKUP', label: 'Respaldo y restauración', icon: DatabaseBackup, keywords: 'csv backup reset' },
  ] },
];
const fold = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const matchesNav = (it: NavItem, q: string) => !q.trim() || fold(`${it.label} ${it.keywords || ''}`).includes(fold(q.trim()));

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  tenantId,
  eventId,
  questions,
  currentQuestionIndex,
  session,
  voteSummary,
  connectedAudienceCount,
  users = [],
  onBroadcastQuestion,
  onCloseVoting,
  onTriggerPreset,
  onCreateQuestion,
  onBulkCreateQuestions,
  onUpdateOptionEffect,
  customAssets = {},
  onUpdateCustomAssets,
}) => {
  const { user, isAdmin } = useAuth();
  const [activeSubpage, setActiveSubpage] = useState<AdminSubpage>('DIRECTOR');
  // Live error feed: drives the nav badge and the Errores en vivo panel.
  const clientErrors = useClientErrors(isAdmin);
  const recentErrorCount = clientErrors.items.filter((d) => Date.now() - (d.at?.toMillis?.() ?? Date.now()) < 15 * 60_000).length;
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [navQuery, setNavQuery] = useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);
  const [csvRev, setCsvRev] = useState(0);
  const bumpCsv = () => setCsvRev((n) => n + 1);

  // Interactive Simulation Weights State for Active Question Options
  const activeQ = questions[currentQuestionIndex];
  // Live Data Streaming Telemetry State (KB/user/30s)
  const [telemetryStats, setTelemetryStats] = useState<TelemetryStats>(() => telemetry.getStats(connectedAudienceCount));

  // Audience Leads State & Downloader
  const [firestoreLeads, setFirestoreLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState<boolean>(false);
  const [leadsSearch, setLeadsSearch] = useState<string>('');

  // Summit CMS State (Unified under Admin Dashboard)
  const [summitSessions, setSummitSessions] = useState<SummitSession[]>(() => loadPersistedSessions());
  const [summitSpeakers, setSummitSpeakers] = useState<SummitSpeaker[]>(() => loadPersistedSpeakers());
  const [summitMapNodes, setSummitMapNodes] = useState<Map360Node[]>(() => loadPersistedMapNodes());
  const [summitEmbeds, setSummitEmbeds] = useState<EmbedWidget[]>(() => loadPersistedEmbedWidgets());
  const [summitSponsors, setSummitSponsors] = useState<SponsorshipTier[]>(() => loadPersistedSponsorshipTiers());
  const [approvedSponsors, setApprovedSponsors] = useState<ApprovedSponsor[]>(() => loadAllApprovedSponsors());
  const [sponsorInquiries, setSponsorInquiries] = useState<SponsorInquiry[]>(() => loadAllSponsorInquiries());
  const [previewShowcaseModal, setPreviewShowcaseModal] = useState<ApprovedSponsor | null>(null);
  const [crmStatusMessage, setCrmStatusMessage] = useState<string | null>(null);

  // Bulk Upload Modals State
  const [isBulkQuestionModalOpen, setIsBulkQuestionModalOpen] = useState<boolean>(false);
  const [isBulkInstagramModalOpen, setIsBulkInstagramModalOpen] = useState<boolean>(false);

  // New Question Form State for CYOA Scenarios
  const [newPrompt, setNewPrompt] = useState<string>('');
  const [newCategory, setNewCategory] = useState<string>('Roblox World Evolution');
  const [newDuration, setNewDuration] = useState<number>(30);
  const [newBasePoints, setNewBasePoints] = useState<number>(100);
  const [optA, setOptA] = useState<string>('Desplegar Holograma Cyberpunk');
  const [presetA, setPresetA] = useState<VisualizerPresetId>('preset_cyberpunk');
  const [optB, setOptB] = useState<string>('Activar Templo Solar Caribeño');
  const [presetB, setPresetB] = useState<VisualizerPresetId>('preset_solarpunk');
  const [newNarrative, setNewNarrative] = useState<string>('');

  const fetchLeads = async () => {
    setLeadsLoading(true);
    try {
      if (db) {
        const q = query(collection(db, 'players'), orderBy('updatedAt', 'desc'), limit(200));
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setFirestoreLeads(fetched);
      }
    } catch (err) {
      console.warn('Firestore leads fetch fallback:', err);
    } finally {
      setLeadsLoading(false);
    }
  };

  useEffect(() => {
    if (activeSubpage === 'AUDIENCE_LEADS') {
      fetchLeads();
    }
    if (activeSubpage === 'SPONSORS') {
      fetchSponsorInquiriesRemote().then(setSponsorInquiries);
    }
  }, [activeSubpage]);

  // Live content can change under us (another admin, an approval, the live snapshot):
  // always edit the current version, never the one loaded when this page mounted.
  const reloadContent = () => {
    setSummitSessions(loadPersistedSessions());
    setSummitSpeakers(loadPersistedSpeakers());
    setSummitMapNodes(loadPersistedMapNodes());
    setSummitEmbeds(loadPersistedEmbedWidgets());
    setSummitSponsors(loadPersistedSponsorshipTiers());
    setApprovedSponsors(loadAllApprovedSponsors());
    bumpCsv();
  };

  // Ctrl/Cmd+K jumps to the section search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopPropagation(); searchRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  useEffect(() => {
    const reload = () => {
      setSummitSessions(loadPersistedSessions());
      setSummitSpeakers(loadPersistedSpeakers());
      setSummitMapNodes(loadPersistedMapNodes());
      setSummitEmbeds(loadPersistedEmbedWidgets());
      setSummitSponsors(loadPersistedSponsorshipTiers());
      setApprovedSponsors(loadAllApprovedSponsors());
    };
    const onFail = (e: Event) => {
      const d = (e as CustomEvent).detail || {};
      showCrmStatus(`No se publicó "${d.key}" para los visitantes: ${d.message}. Quedó guardado solo en este navegador.`);
    };
    window.addEventListener('storage', reload);
    window.addEventListener('sgx:cms_publish_failed', onFail);
    return () => { window.removeEventListener('storage', reload); window.removeEventListener('sgx:cms_publish_failed', onFail); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showCrmStatus = (msg: string) => {
    setCrmStatusMessage(msg);
    setTimeout(() => setCrmStatusMessage(null), 3500);
  };





  // Combined audience data (Firestore records + current live room users)
  const combinedLeads = React.useMemo(() => {
    const map = new Map<string, any>();
    
    // Add live users first
    users.forEach(u => {
      map.set(u.id, {
        id: u.id,
        nickname: u.nickname,
        email: u.email || '',
        score: u.score || 0,
        streak: u.streak || u.highestStreak || 0,
        totalInteractions: u.totalInteractions || 0,
        isLive: true,
        tenantId: u.tenantId || tenantId,
        eventId: u.eventId || eventId,
        createdAt: new Date().toISOString(),
      });
    });

    // Merge or append Firestore leads
    firestoreLeads.forEach(f => {
      const existing = map.get(f.id);
      if (existing) {
        map.set(f.id, {
          ...existing,
          ...f,
          isLive: true,
        });
      } else {
        map.set(f.id, {
          ...f,
          isLive: false,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => (b.score || 0) - (a.score || 0));
  }, [users, firestoreLeads, tenantId, eventId]);

  // CSV Lead Exporter
  const handleExportCSV = () => {
    const headers = ['ID', 'Nombre', 'Email', 'Puntos', 'Mejor racha', 'Interacciones', 'Nivel', 'Estado', 'Tenant', 'Evento', 'Ultima actividad'];
    const rows = combinedLeads.map(lead => [
      lead.id,
      `"${(lead.nickname || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      lead.score || 0,
      lead.streak || 0,
      lead.totalInteractions || 0,
      `"${(lead.prizeTier || 'Bronze Contributor').replace(/"/g, '""')}"`,
      lead.isLive ? 'EN_SALA' : 'REGISTRADO',
      lead.tenantId || tenantId,
      lead.eventId || eventId,
      lead.updatedAt ? new Date(lead.updatedAt).toISOString() : new Date().toISOString(),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGX_Audience_Leads_${tenantId}_${eventId}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Sponsor inquiries (CRM) exporter
  const handleExportInquiriesCSV = () => {
    const headers = ['Referencia', 'Empresa', 'Contacto', 'Cargo', 'Email', 'Telefono', 'Web', 'Tier', 'Presupuesto', 'Metas', 'Mensaje', 'Estado', 'Enviado'];
    const rows = sponsorInquiries.map((q) => [
      q.referenceCode, q.companyName, q.contactName, q.roleTitle || '', q.email, q.phone, q.websiteUrl || '',
      q.selectedTierName, q.estimatedBudget || '', (q.goals || []).join(' | '), q.customMessage || '', q.status,
      q.submittedAt ? new Date(q.submittedAt).toISOString() : '',
    ]);
    downloadCsvFile([headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\n'), `sgx_sponsor_inquiries_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // JSON Lead Exporter
  const handleExportJSON = () => {
    const dataStr = JSON.stringify(combinedLeads, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGX_Audience_Leads_${tenantId}_${eventId}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Push notification handler for CMS
  // The CMS publishes the announcement itself; this only echoes it here.
  const handleCMSPushAlert = (notif: SummitNotification) => {
    showCrmStatus(`Anuncio "${notif.title}" en camino a todos los asistentes conectados.`);
  };


  // If not admin, show secure lock
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--sgx-bg)] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 bg-[#121212] border-2 border-[var(--sgx-secondary)] text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-xl bg-[var(--sgx-bg)] border-2 border-[#FFBB00] flex items-center justify-center text-[#FFBB00] shadow-lg shadow-[#FFBB00]/15">
            <Lock className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-[#FFBB00] text-[10px] font-mono font-bold uppercase">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Centro de mando · acceso restringido</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">
              Solo para admins
            </h1>

            <p className="text-xs text-slate-300 font-mono max-w-md mx-auto leading-relaxed">
              Esta área es solo para el equipo. Entra con Google con una cuenta de admin.
              Super admin: <span className="text-[var(--sgx-neon)] font-bold">{AUTHORIZED_SUPER_ADMIN_EMAIL}</span>.
            </p>
          </div>

          <div className="p-4 bg-[#121212] border border-[var(--sgx-secondary)] text-left text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#888888]">SESIÓN:</span>
              <span className={user ? 'text-[var(--sgx-neon)] font-bold' : 'text-[#888888]'}>
                {user ? (user.email || 'ANÓNIMA') : 'SIN SESIÓN'}
              </span>
            </div>
            {user && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-[#888888]">LOGGED-IN EMAIL:</span>
                  <span className="text-white font-bold truncate max-w-[220px]">{user.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#888888]">ACCESS LEVEL:</span>
                  <span className="text-[#FFBB00] font-bold">UNAUTHORIZED (GUEST)</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle Question Creation with Visual Preset Binding
  const handleSaveQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPrompt.trim()) return;

    onCreateQuestion({
      tenantId,
      eventId,
      prompt: newPrompt,
      category: newCategory,
      answerType: 'OPINION_CYOA',
      durationSeconds: Number(newDuration),
      basePoints: Number(newBasePoints),
      maxSpeedBonus: 50,
      participationWeight: 20,
      options: [
        {
          id: `opt_${Date.now()}_a`,
          index: 0,
          code: 1,
          label: optA,
          description: 'Audience choice path A',
          presetId: presetA,
          color: '#00DDFF',
        },
        {
          id: `opt_${Date.now()}_b`,
          index: 1,
          code: 2,
          label: optB,
          description: 'Audience choice path B',
          presetId: presetB,
          color: '#FDCC0D',
        }
      ],
      storyPathOutcome: {
        narrative: newNarrative || 'The audience co-directors commanded the next stage transformation.',
        stageTitle: newPrompt,
      }
    });

    setNewPrompt('');
    setNewNarrative('');
  };

  const handleBulkImportQuestions = (importedQuestions: Question[], mode: 'append' | 'replace') => {
    if (onBulkCreateQuestions) {
      onBulkCreateQuestions(importedQuestions, mode);
    } else {
      importedQuestions.forEach((q) => onCreateQuestion(q));
    }
    showCrmStatus(`¡${importedQuestions.length} preguntas importadas exitosamente (${mode === 'replace' ? 'Reemplazo total' : 'Añadidas'})!`);
  };

  const activeQuestion = questions[currentQuestionIndex] || null;

  return (
    <div className="sgx-admin min-h-screen bg-[var(--sgx-bg)] text-slate-100 relative">
      
      <header className="sgx-admin__top">
        <div className="sgx-admin__brand">
          <Radio className="w-4 h-4" />
          <div>
            <small>Spatialgineers Summit 2026 · Admin</small>
            <h1>Centro de mando</h1>
          </div>
        </div>
        <div className="sgx-admin__status">
          {crmStatusMessage && <span className="sgx-admin__flash">{crmStatusMessage}</span>}
          <span className="sgx-admin__chip"><Users className="w-3.5 h-3.5" /> {connectedAudienceCount} en la sala en vivo</span>
          <span className="sgx-admin__chip">{user?.email}</span>
        </div>
      </header>

      <div className="sgx-admin__layout">
        <nav className="sgx-admin__nav" aria-label="Secciones del admin">
          <label className="sgx-admin__search">
            <Search className="w-3.5 h-3.5" />
            <input ref={searchRef} value={navQuery} onChange={(e) => setNavQuery(e.target.value)} placeholder="Buscar sección (Ctrl+K)" />
          </label>
          {ADMIN_NAV.map((area) => {
            const items = area.items.filter((it) => matchesNav(it, navQuery));
            if (!items.length) return null;
            return (
              <div key={area.id} className="sgx-admin__area">
                <span className="sgx-admin__area-name">{area.label}</span>
                {items.map((it) => {
                  const Icon = it.icon;
                  return (
                    <button key={it.id} type="button" aria-current={activeSubpage === it.id ? 'page' : undefined} onClick={() => { setActiveSubpage(it.id); setNavQuery(''); }}>
                      <Icon className="w-3.5 h-3.5" /> <span>{it.label}</span>
                      {it.id === 'ERRORS' && recentErrorCount > 0 && <span className="sgx-admin__badge" aria-label={`${recentErrorCount} errores en 15 min`}>{recentErrorCount}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="sgx-admin__main space-y-4 w-full">

          {/* SUBPAGE 1: DIRECTOR CONSOLE */}
          {activeSubpage === 'REGISTRATIONS' && (
            <AdminSection title="Inscritos y Día 3" desc="Registros, código de check-in del Día 3 y propuestas de speakers.">
              <SummitRegistrationsPanel />
            </AdminSection>
          )}

          {activeSubpage === 'DIRECTOR' && (
            <AdminSection title="Consola del director" desc="Lanza la pregunta en vivo a la audiencia, cierra la votación y dispara efectos.">

            <div className="space-y-4">
              
              {/* Active Broadcast Node Card */}
              <div className="sgx-panel space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2 text-[10px] font-mono">
                  <span className="text-[var(--sgx-neon)] font-bold uppercase">
                    PREGUNTA {currentQuestionIndex + 1}/{questions.length} • EN VIVO
                  </span>
                  <span className={`font-bold px-2 py-0.5 ${
                    session.status === 'VOTING_ACTIVE' 
                      ? 'bg-red-950 text-red-400 border border-red-500 animate-pulse' 
                      : session.status === 'RESULT_REVEALED'
                      ? 'bg-amber-950 text-[var(--sgx-accent)] border border-[var(--sgx-accent)]'
                      : 'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}>
                    {session.status}
                  </span>
                </div>

                {activeQuestion ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-[var(--sgx-accent)] font-bold">{activeQuestion.category}</span>
                      <span className="text-slate-300">⏱ {session.timeRemaining}s Left</span>
                    </div>

                    <h2 className="text-sm md:text-base font-bold text-white leading-snug">
                      {activeQuestion.prompt}
                    </h2>

                    {/* Live Option Tally Bars */}
                    <div className="space-y-2 pt-1">
                      {activeQuestion.options.map((opt, idx) => {
                        const count = voteSummary?.optionCounts[opt.id] || 0;
                        const totalVotes = voteSummary?.totalVotes || 0;
                        const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                        const isWinning = voteSummary?.winningOptionId === opt.id;

                        return (
                          <div key={opt.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-mono">
                              <span className="flex items-center space-x-2">
                                <span className="font-bold text-[var(--sgx-neon)]">[{String.fromCharCode(65 + idx)}]</span>
                                <span className="text-slate-200">{opt.label}</span>
                                {isWinning && (
                                  <span className="text-[10px] px-1.5 py-0.2 bg-[var(--sgx-accent)] text-black font-bold">
                                    GANANDO
                                  </span>
                                )}
                              </span>
                              <span className="text-slate-300 font-bold">{pct}% ({count} votes)</span>
                            </div>

                            <div className="h-2 bg-[#121212] border border-[var(--sgx-secondary)] overflow-hidden">
                              <div 
                                className="h-full transition-all duration-300"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor: opt.color || (idx === 0 ? '#00DDFF' : '#FDCC0D')
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Director Broadcast & Voting Trigger Controls */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-[var(--sgx-secondary)]">
                      {session.status === 'VOTING_ACTIVE' ? (
                        <button
                          onClick={onCloseVoting}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-mono text-xs font-bold uppercase transition-all flex items-center space-x-1.5"
                        >
                          <Square className="w-3.5 h-3.5" />
                          <span>CERRAR VOTACIÓN Y REVELAR RESULTADO</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onBroadcastQuestion(currentQuestionIndex)}
                          className="sgx-btn text-xs font-bold py-2 px-5 flex items-center space-x-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>ABRIR VOTACIÓN EN VIVO</span>
                        </button>
                      )}

                      {currentQuestionIndex < questions.length - 1 && (
                        <button
                          onClick={() => onBroadcastQuestion(currentQuestionIndex + 1)}
                          className="px-3 py-2 bg-[var(--sgx-bg)] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-mono text-xs font-bold transition-all"
                        >
                          SIGUIENTE PREGUNTA ➔
                        </button>
                      )}
                    </div>

                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">No active scenario selected.</p>
                )}
              </div>

              {/* Scenarios Quick Grid */}
              <div className="sgx-panel space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--sgx-secondary)] pb-1.5">
                  Orden de preguntas ({questions.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={q.id}
                      onClick={() => onBroadcastQuestion(idx)}
                      className={`p-2.5 text-left border transition-all text-xs font-mono ${
                        currentQuestionIndex === idx
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/10 text-white'
                          : 'border-[var(--sgx-secondary)]/60 bg-[#121212] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-[var(--sgx-accent)]">
                        <span>PREGUNTA #{idx + 1}</span>
                        <span>{q.durationSeconds}s</span>
                      </div>
                      <p className="font-bold text-white truncate mt-1">{q.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </AdminSection>
          )}

          {/* SUBPAGE 2: CYOA SCENARIOS */}
          {activeSubpage === 'CYOA_SCENARIOS' && (
            <AdminSection title="Preguntas en vivo (CYOA)" desc="Las preguntas que la audiencia vota para dirigir el escenario. Importación masiva por CSV o JSON." actions={<button type="button" className="sgx-btn text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={() => setIsBulkQuestionModalOpen(true)}><UploadCloud className="w-3.5 h-3.5" /> Importar preguntas</button>}>

            <div className="space-y-4">
              <div className="sgx-panel space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-[var(--sgx-neon)]" />
                    <span>Crear pregunta en vivo con efecto en el visualizador</span>
                  </h3>

                </div>

                <form onSubmit={handleSaveQuestion} className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Scenario Prompt / Question for Audience</label>
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="ej. ¿Qué estructura procedural debe manifestarse en el escenario?"
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Category</label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 uppercase block mb-1">Voting Duration (Seconds)</label>
                      <input
                        type="number"
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                    <div className="space-y-2">
                      <span className="text-[var(--sgx-neon)] font-bold text-[10px]">OPTION [A] SPECIFICATION</span>
                      <input
                        type="text"
                        value={optA}
                        onChange={(e) => setOptA(e.target.value)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white"
                        placeholder="Opción A"
                      />
                      <select
                        value={presetA}
                        onChange={(e) => setPresetA(e.target.value as VisualizerPresetId)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white text-[10px]"
                      >
                        {Object.values(getAllPresets()).map(p => (
                          <option key={p.id} value={p.id}>Trigger FX: {p.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <span className="text-[var(--sgx-accent)] font-bold text-[10px]">OPTION [B] SPECIFICATION</span>
                      <input
                        type="text"
                        value={optB}
                        onChange={(e) => setOptB(e.target.value)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white"
                        placeholder="Opción B"
                      />
                      <select
                        value={presetB}
                        onChange={(e) => setPresetB(e.target.value as VisualizerPresetId)}
                        className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-1.5 text-white text-[10px]"
                      >
                        {Object.values(getAllPresets()).map(p => (
                          <option key={p.id} value={p.id}>Trigger FX: {p.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Storypath Outcome Narrative</label>
                    <textarea
                      value={newNarrative}
                      onChange={(e) => setNewNarrative(e.target.value)}
                      rows={2}
                      className="w-full bg-[#121212] border border-[var(--sgx-secondary)] p-2 text-white"
                      placeholder="Narrativa que se desplegará al ganar la votación..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="sgx-btn text-xs font-bold py-2 px-6 flex items-center space-x-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>GUARDAR Y AÑADIR PREGUNTA</span>
                  </button>
                </form>
              </div>
            </div>
          </AdminSection>
          )}

          {/* SUBPAGE 3: PRESETS LAB */}
          {activeSubpage === 'PRESETS_LAB' && (
            <AdminSection title="Efectos visuales (presets)" desc="Presets del visualizador y assets propios. Se guardan en este equipo; usa exportar/importar JSON para moverlos.">

            <div className="space-y-4">
              <FXPresetsStudio
                onTriggerPreset={onTriggerPreset}
                customAssets={customAssets}
                onUpdateCustomAssets={onUpdateCustomAssets}
              />
            </div>
          </AdminSection>
          )}

          {activeSubpage === 'ANNOUNCE' && (
            <AdminSection title="Anuncios en vivo" desc="Un aviso que aparece al instante en todas las páginas abiertas del Summit.">
              <SummitCMSManager key={`BROADCAST_${csvRev}`} tab="BROADCAST" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'POLLS' && (
            <AdminSection title="Encuestas del keynote" desc="Las encuestas del panel de reacciones. Los votos se guardan por id de opción." publishKeys={['polls']} csv={[CSV_ENTITIES.polls]} onCsvApplied={bumpCsv}>
              <LiveListTable entity={CSV_ENTITIES.polls} version={csvRev} columns={[
                { label: 'Sesión', get: (p: any) => p.sessionTitle },
                { label: 'Pregunta', get: (p: any) => p.question },
                { label: 'Opciones', get: (p: any) => p.options.map((o: any) => o.label).join(' · ') },
              ]} />
            </AdminSection>
          )}

          {activeSubpage === 'AGENDA' && (
            <AdminSection title="Agenda / Run of Show" desc="Sesiones de los 3 días. El orden se calcula solo por la hora de inicio." publishKeys={['sessions']} csv={[CSV_ENTITIES.sessions]} onCsvApplied={reloadContent}>
              <SummitCMSManager key={`SESSIONS_${csvRev}`} tab="SESSIONS" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'SPEAKERS' && (
            <AdminSection title="Speakers" desc="Personas confirmadas por escrito. Sus IDs se usan en la agenda." publishKeys={['speakers']} csv={[CSV_ENTITIES.speakers]} onCsvApplied={reloadContent}>
              <SummitCMSManager key={`SPEAKERS_${csvRev}`} tab="SPEAKERS" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'SPONSORS' && (
            <AdminSection title="Sponsors" desc="Solicitudes que llegan del formulario y las marcas aprobadas con su showcase. Aprobar una solicitud le da su Holo Card de sponsor." publishKeys={['approved_sponsors']} csv={[CSV_ENTITIES.showcases]} onCsvApplied={bumpCsv}
              actions={<button type="button" className="sgx-btn text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={handleExportInquiriesCSV}><Download className="w-3.5 h-3.5" /> Solicitudes CSV</button>}>
              <SummitCMSManager key={`INQUIRIES_${csvRev}`} tab="INQUIRIES" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
              <div className="mt-6"><SummitCMSManager key={`BRAND_SHOWCASES_${csvRev}`} tab="BRAND_SHOWCASES" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} /></div>
            </AdminSection>
          )}

          {activeSubpage === 'TIERS' && (
            <AdminSection title="Niveles de auspicio" desc="Los niveles (1–5) con su precio y beneficios que ve la matriz de auspicios." publishKeys={['sponsorship_tiers']} csv={[CSV_ENTITIES.tiers]} onCsvApplied={reloadContent}>
              <SummitCMSManager key={`SPONSORS_${csvRev}`} tab="SPONSORS" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'INITIATES' && (
            <AdminSection title="SGX Guild Initiates" desc="El roster público del Guild y el email privado con el que cada initiate reclama su Holo Card." publishKeys={['initiates']} csv={[CSV_ENTITIES.initiates]} onCsvApplied={bumpCsv}>
              <SummitInitiatesPanel key={csvRev} />
            </AdminSection>
          )}

          {activeSubpage === 'MAP' && (
            <AdminSection title="Mapa 360" desc="Lugares de Chroma Space Studios y del recorrido 360." publishKeys={['map_nodes']} csv={[CSV_ENTITIES.map]} onCsvApplied={reloadContent}>
              <SummitCMSManager key={`MAP_NODES_${csvRev}`} tab="MAP_NODES" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'EMBEDS' && (
            <AdminSection title="Apps embebidas" desc="Juegos, mundos y apps del hub. Solo los admins pueden añadirlas." publishKeys={['embeds']} csv={[CSV_ENTITIES.embeds]} onCsvApplied={reloadContent}>
              <SummitCMSManager key={`EMBEDS_${csvRev}`} tab="EMBEDS" sessions={summitSessions} speakers={summitSpeakers} mapNodes={summitMapNodes} embeds={summitEmbeds} sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions} onUpdateSpeakers={setSummitSpeakers} onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds} onUpdateSponsors={setSummitSponsors} onBroadcastPushNotification={handleCMSPushAlert} />
            </AdminSection>
          )}

          {activeSubpage === 'CAPSULES' && (
            <AdminSection title="Cápsulas semanales" desc="Las transmisiones que se abren cada semana antes del Summit." publishKeys={['capsules']} csv={[CSV_ENTITIES.capsules]} onCsvApplied={bumpCsv}>
              <LiveListTable entity={CSV_ENTITIES.capsules} version={csvRev} columns={[
                { label: 'Semana', get: (c: any) => c.weekNumber },
                { label: 'Título', get: (c: any) => c.title },
                { label: 'Se abre', get: (c: any) => new Date(c.unlockDate).toLocaleString('es-PR', { dateStyle: 'medium', timeStyle: 'short' }) },
                { label: 'XP', get: (c: any) => c.xpReward },
              ]} />
            </AdminSection>
          )}

          {activeSubpage === 'GALLERY' && (
            <AdminSection title="Galería retrospectiva" desc="Fotos de ediciones anteriores y del equipo." publishKeys={['gallery']} csv={[CSV_ENTITIES.gallery]} onCsvApplied={bumpCsv}>
              <LiveListTable entity={CSV_ENTITIES.gallery} version={csvRev} columns={[
                { label: 'Foto', get: (g: any) => <img src={g.url} alt="" className="w-16 h-10 object-cover" /> },
                { label: 'Título', get: (g: any) => g.title },
                { label: 'Categoría', get: (g: any) => g.tag },
              ]} />
            </AdminSection>
          )}

          {activeSubpage === 'SOCIAL' && (
            <AdminSection title="Redes sociales" desc="Publicaciones y reels de Instagram que alimentan el radar social."
              actions={<button type="button" className="sgx-btn text-xs px-3 py-1.5 flex items-center gap-1.5" onClick={() => setIsBulkInstagramModalOpen(true)}><Instagram className="w-3.5 h-3.5" /> Importar publicaciones</button>}>
              <p className="text-sm text-slate-400">Sube un CSV con los enlaces de las publicaciones; aparecen en el radar social de la app.</p>
            </AdminSection>
          )}

          {activeSubpage === 'MISSIONS' && (
            <AdminSection title="Misiones del Reactor" desc="Cambia el texto y el XP de cada misión. Qué completa una misión está programado; una misión nueva necesita código." publishKeys={['mission_overrides']} csv={[CSV_ENTITIES.missions]} onCsvApplied={bumpCsv}>
              <LiveListTable entity={CSV_ENTITIES.missions} version={csvRev} columns={[
                { label: 'Pilar', get: (m: any) => m.pillar },
                { label: 'Misión', get: (m: any) => m.titleEs },
                { label: 'XP', get: (m: any) => m.xp },
              ]} />
            </AdminSection>
          )}

          {activeSubpage === 'ADMINS' && (
            <AdminSection title="Admins" desc="Quién puede entrar a este centro de mando.">
              <AdminRosterPanel />
            </AdminSection>
          )}

          {activeSubpage === 'BACKUP' && (
            <AdminSection title="Respaldo y restauración" desc="Descarga todo el contenido en CSV o vuelve al contenido original con respaldo previo.">
              <ContentBackupPanel onRestored={reloadContent} />
            </AdminSection>
          )}

          {/* SUBPAGE 6: SUMMIT ANALYTICS (UNIFIED IN ADMIN DASHBOARD) */}
          {activeSubpage === 'ERRORS' && (
            <AdminSection title="Errores en vivo" desc="Lo que falla en los teléfonos de la gente, en tiempo real. Agrupado por error, con dispositivo y pantalla.">
              <ClientErrorsPanel items={clientErrors.items} error={clientErrors.error} />
            </AdminSection>
          )}

          {activeSubpage === 'SUMMIT_ANALYTICS' && (
            <AdminSection title="Analítica" desc="Visitas, pases, votos y retención con datos reales de Firestore.">

            <div className="space-y-4">
              <SummitAnalyticsView
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                connectedAudienceCount={connectedAudienceCount}
                telemetryStats={telemetryStats}
              />
            </div>
          </AdminSection>
          )}

          {/* SUBPAGE 7: AUDIENCE & LEADS (CSV) */}
          {activeSubpage === 'AUDIENCE_LEADS' && (
            <AdminSection title="Audiencia y leads" desc="Pilotos registrados y personas en la sala en vivo. Exporta en CSV o JSON.">

            <div className="sgx-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[var(--sgx-neon)]" />
                    <span>Pilotos y audiencia ({combinedLeads.length})</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Real-time audience participant database synchronized with Firebase Firestore.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleExportCSV}
                    className="sgx-btn text-[11px] font-mono font-bold py-1.5 px-3 flex items-center space-x-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>EXPORTAR CSV</span>
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="px-3 py-1.5 bg-[#121212] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-mono text-[11px] font-bold flex items-center space-x-1.5 transition-all"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex items-center space-x-2 bg-[#121212] border border-[var(--sgx-secondary)] p-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={leadsSearch}
                  onChange={(e) => setLeadsSearch(e.target.value)}
                  placeholder="Filtrar por nombre o email…"
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#121212] border-b border-[var(--sgx-secondary)] text-[10px] text-[var(--sgx-neon)] uppercase">
                    <tr>
                      <th className="p-2">#</th>
                      <th className="p-2">Piloto</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Puntos</th>
                      <th className="p-2">Racha</th>
                      <th className="p-2">Interacciones</th>
                      <th className="p-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--sgx-secondary)]/40">
                    {combinedLeads
                      .filter(l => 
                        !leadsSearch || 
                        (l.nickname || '').toLowerCase().includes(leadsSearch.toLowerCase()) ||
                        (l.email || '').toLowerCase().includes(leadsSearch.toLowerCase())
                      )
                      .map((lead, idx) => (
                        <tr key={lead.id} className="hover:bg-[#121212]/60">
                          <td className="p-2 text-[var(--sgx-accent)] font-bold">#{idx + 1}</td>
                          <td className="p-2 text-white font-bold">{lead.nickname}</td>
                          <td className="p-2 text-slate-300">{lead.email || '—'}</td>
                          <td className="p-2 text-[var(--sgx-neon)] font-bold">{lead.score || 0}</td>
                          <td className="p-2 text-amber-400 font-bold">{lead.streak || 0}</td>
                          <td className="p-2 text-slate-300">{lead.totalInteractions || 0}</td>
                          <td className="p-2">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              lead.isLive ? 'bg-amber-950 text-[#FDCC0D] border border-[#FDCC0D]' : 'bg-slate-900 text-slate-400'
                            }`}>
                              {lead.isLive ? 'ONLINE' : 'LOGGED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminSection>
          )}

          {activeSubpage === 'BRAND' && (
            <AdminSection title="Marca y tenants" desc="Colores del tema y los tenants / salas del motor de votación, en un solo lugar.">
              <AdminThemeStudio />
              <div className="border-t border-[var(--sgx-secondary)] pt-6 mt-6"><TenantRoomManager /></div>
            </AdminSection>
          )}

          {activeSubpage === 'REWARDS' && (
            <AdminSection title="Tienda del Reactor" desc="Premios que los pilotos canjean con su XP. Un premio inactivo no se puede canjear." csv={[CSV_ENTITIES.rewards]} onCsvApplied={bumpCsv}>
              <AdminRewardsManager key={csvRev} />
            </AdminSection>
          )}

          {/* SUBPAGE 14: ENTREPRENEUR MATCH MODERATION */}
          {activeSubpage === 'ENTREPRENEUR_MATCH' && (
            <AdminSection title="Entrepreneur Match" desc="Moderación de perfiles y el interruptor del módulo.">

            <div className="space-y-4">
              <AdminMatchPanel />
            </div>
          </AdminSection>
          )}

          {/* SUBPAGE 15: CONTENT AUDIT & QA CONTROL PLANE */}
          {activeSubpage === 'CONTENT_AUDIT' && (
            <div className="space-y-4">
              <div className="sgx-panel space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[var(--sgx-neon)]" />
                      <span>Funciones activas y diagnóstico de contenido</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-mono mt-1">
                      Módulo aislado de administración para activar/desactivar características, diagnosticar la salud del contenido y verificar compatibilidad.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAuditModalOpen(true)}
                    className="sgx-btn px-4 py-2 text-xs font-bold font-mono flex items-center space-x-2 cursor-pointer shadow-lg"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>ABRIR PANEL DE FUNCIONES Y QA</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="text-[var(--sgx-primary)] font-bold uppercase text-[11px]">1. Privacidad de QA</div>
                    <p className="text-slate-400">
                      Herramientas de diagnóstico, toggles y notas de inspección solo son accesibles con credenciales de Director/Admin.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="text-[var(--sgx-neon)] font-bold uppercase text-[11px]">2. Feature Toggles</div>
                    <p className="text-slate-400">
                      Control granular en tiempo real para poner módulos en estado ACTIVO, MANTENIMIENTO o DESACTIVADO.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-lg space-y-1.5">
                    <div className="text-[#FDCC0D] font-bold uppercase text-[11px]">3. Reportes de Cumplimiento</div>
                    <p className="text-slate-400">
                      Generación instantánea de reportes de integridad para los 6 pilares y 12 módulos interactivos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* BRAND SHOWCASE LANDING PREVIEW MODAL */}
      <SummitBrandShowcaseModal
        sponsor={previewShowcaseModal}
        onClose={() => setPreviewShowcaseModal(null)}
      />

      {/* BULK QUESTION UPLOAD MODAL */}
      <BulkQuestionUploadModal
        isOpen={isBulkQuestionModalOpen}
        onClose={() => setIsBulkQuestionModalOpen(false)}
        tenantId={tenantId}
        eventId={eventId}
        existingQuestionsCount={questions.length}
        onBulkImport={handleBulkImportQuestions}
      />

      {/* BULK INSTAGRAM IMPORT MODAL */}
      <BulkInstagramImportModal
        isOpen={isBulkInstagramModalOpen}
        onClose={() => setIsBulkInstagramModalOpen(false)}
        onPostsImported={(imported) => {
          showCrmStatus(`¡${imported.length} publicaciones de Instagram importadas y sincronizadas con el Stream!`);
        }}
      />

      {/* CONTENT AUDIT & QA CONTROL PLANE MODAL (ADMIN-ONLY) */}
      <SummitContentAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />


    </div>
  );
};
