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
import { GamificationTierManager } from "./GamificationTierManager";
import { AdminRewardsManager } from "./AdminRewardsManager";
import { PRIZE_TIERS } from '../../lib/gamification';
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
import { AdminCsvHubModal } from './AdminCsvHubModal';
import { TabCsvDirectActions } from './TabCsvDirectActions';
import { Instagram, UploadCloud, Sliders } from 'lucide-react';
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
  | 'REGISTRATIONS'
  | 'DIRECTOR' 
  | 'CYOA_SCENARIOS' 
  | 'PRESETS_LAB' 
  | 'SUMMIT_CMS'
  | 'SPONSORS_CRM'
  | 'SUMMIT_ANALYTICS'
  | 'AUDIENCE_LEADS'
  | 'TELEMETRY'
  | 'TENANT_ROOMS' 
  | 'THEME_STUDIO'
  | 'GAMIFICATION' 
  | 'FIRESTORE_SYNC' 
  | 'SECURITY_ACCESS'
  | 'ENTREPRENEUR_MATCH'
  | 'CONTENT_AUDIT';

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
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);

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
  const [editingApprovedSponsor, setEditingApprovedSponsor] = useState<ApprovedSponsor | null>(null);
  const [crmStatusMessage, setCrmStatusMessage] = useState<string | null>(null);

  // Bulk Upload Modals State
  const [isBulkQuestionModalOpen, setIsBulkQuestionModalOpen] = useState<boolean>(false);
  const [isBulkInstagramModalOpen, setIsBulkInstagramModalOpen] = useState<boolean>(false);
  const [isCsvHubModalOpen, setIsCsvHubModalOpen] = useState<boolean>(false);

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
    if (activeSubpage === 'SPONSORS_CRM') {
      fetchSponsorInquiriesRemote().then(setSponsorInquiries);
    }
  }, [activeSubpage]);

  // Live content can change under us (another admin, an approval, the live snapshot):
  // always edit the current version, never the one loaded when this page mounted.
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

  // 1-Click Approve Inquiry and Create Showcase
  const handleApproveInquiryInCRM = (inquiry: SponsorInquiry) => {
    const result = approveSponsorInquiryAndCreateShowcase(inquiry);
    setSponsorInquiries(loadAllSponsorInquiries());
    setApprovedSponsors(loadAllApprovedSponsors());
    setSummitSponsors(loadPersistedSponsorshipTiers());
    showCrmStatus(`¡Patrocinador aprobado y Brand Showcase generado para ${result.approvedSponsor.companyName}!`);
    setPreviewShowcaseModal(result.approvedSponsor);
  };

  const handleDeleteInquiryInCRM = (id: string) => {
    const updated = sponsorInquiries.filter(i => i.id !== id);
    setSponsorInquiries(updated);
    saveAllSponsorInquiries(updated);
    deleteSponsorInquiryRemote(id);
    showCrmStatus('Solicitud eliminada.');
  };

  const handleSaveApprovedSponsorCRM = (sponsor: ApprovedSponsor) => {
    let updated: ApprovedSponsor[];
    const exists = approvedSponsors.some(s => s.id === sponsor.id);
    if (exists) {
      updated = approvedSponsors.map(s => s.id === sponsor.id ? sponsor : s);
    } else {
      updated = [...approvedSponsors, sponsor];
    }
    setApprovedSponsors(updated);
    saveAllApprovedSponsors(updated);
    setEditingApprovedSponsor(null);
    showCrmStatus(`Brand Showcase guardado para ${sponsor.companyName}`);
  };

  const handleDeleteApprovedSponsorCRM = (id: string) => {
    deleteApprovedSponsor(id);
    setApprovedSponsors(loadAllApprovedSponsors());
    showCrmStatus('Brand Showcase eliminado.');
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
    const headers = ['User ID', 'Nickname', 'Email', 'Score', 'Highest Streak', 'Interactions', 'Prize Tier', 'Status', 'Tenant ID', 'Event ID', 'Last Active'];
    const rows = combinedLeads.map(lead => [
      lead.id,
      `"${(lead.nickname || '').replace(/"/g, '""')}"`,
      `"${(lead.email || '').replace(/"/g, '""')}"`,
      lead.score || 0,
      lead.streak || 0,
      lead.totalInteractions || 0,
      `"${(lead.prizeTier || 'Bronze Contributor').replace(/"/g, '""')}"`,
      lead.isLive ? 'LIVE_IN_ROOM' : 'RECORDED_LEAD',
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
              <span>Gated Administrative Control Plane</span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wider">
              SGX Director Authorization Required
            </h1>

            <p className="text-xs text-slate-300 font-mono max-w-md mx-auto leading-relaxed">
              Administrative functions are restricted to authorized administrators via Firebase Authentication. 
              Primary authorized director: <span className="text-[var(--sgx-neon)] font-bold">{AUTHORIZED_SUPER_ADMIN_EMAIL}</span>.
            </p>
          </div>

          <div className="p-4 bg-[#121212] border border-[var(--sgx-secondary)] text-left text-xs font-mono space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#888888]">FIREBASE AUTH STATUS:</span>
              <span className={user ? 'text-[var(--sgx-neon)] font-bold' : 'text-[#888888]'}>
                {user ? 'AUTHENTICATED' : 'ANONYMOUS'}
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
    <div className="min-h-screen bg-[var(--sgx-bg)] text-slate-100 font-['Orbitron',sans-serif] relative">
      
      {/* Top Header */}
      <div className="p-3 md:p-5 border-b border-[var(--sgx-secondary)]/60 bg-[var(--sgx-bg)] sticky top-0 z-20 shadow-md">
        <div className="max-w-[1700px] mx-auto flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] flex items-center justify-center text-[var(--sgx-accent)] shadow-md">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 text-[10px] font-mono text-[var(--sgx-neon)] uppercase">
                <span>ADMINISTRATIVE COMMAND CENTER</span>
                <span>•</span>
                <span className="text-[#FDCC0D] font-bold">UNIFIED SINGLE LOGIN</span>
              </div>
              <h1 className="text-sm md:text-base font-bold text-white tracking-wider uppercase">
                Director Studio Control & Summit Operations
              </h1>
            </div>
          </div>

          {/* Right Toolbar: Telemetry Indicator & Bulk Tools */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
            {crmStatusMessage && (
              <span className="px-2.5 py-1 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] text-[10px] font-bold animate-pulse">
                {crmStatusMessage}
              </span>
            )}

            <button
              onClick={() => setIsCsvHubModalOpen(true)}
              className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-400 hover:text-black text-cyan-300 border border-cyan-400/80 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer rounded shadow-sm"
              title="Abrir Suite Unificada de Gestión CSV (Descargar plantillas y subir datos editados)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>SUITE GESTIÓN CSV</span>
            </button>

            <button
              onClick={() => setIsBulkQuestionModalOpen(true)}
              className="px-2.5 py-1 bg-[var(--sgx-secondary)] hover:bg-[var(--sgx-neon)] hover:text-black text-white border border-[var(--sgx-neon)]/60 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer rounded"
              title="Importar múltiples preguntas para la sesión via CSV o JSON"
            >
              <UploadCloud className="w-3.5 h-3.5 text-[var(--sgx-neon)] hover:text-black" />
              <span>CARGA MASIVA PREGUNTAS</span>
            </button>

            <button
              onClick={() => setIsBulkInstagramModalOpen(true)}
              className="px-2.5 py-1 bg-[var(--sgx-secondary)] hover:bg-[var(--sgx-primary)] hover:text-black text-white border border-[var(--sgx-primary)]/60 text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer rounded"
              title="Importar lista de publicaciones y reels de Instagram via CSV"
            >
              <Instagram className="w-3.5 h-3.5 text-[var(--sgx-primary)] hover:text-black" />
              <span>BULK INSTAGRAM (.CSV)</span>
            </button>

            <div className="flex items-center space-x-2 bg-[#121212] border border-[var(--sgx-secondary)] px-2.5 py-1 text-[10px]">
              <Activity className="w-3 h-3 text-[var(--sgx-neon)] animate-pulse" />
              <span className="text-slate-300">STREAM:</span>
              <span className="text-[#FDCC0D] font-bold">{telemetryStats.kbPerUserPer30s} KB / user / 30s</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Container: Clean Full Width Admin Panel */}
      <div className="p-3 md:p-5 max-w-[1700px] mx-auto w-full grid grid-cols-1 gap-5">
        
        {/* Admin Control Plane */}
        <div className="space-y-4 w-full">
          
          {/* Subpage Navigation Tabs (Unified Single-Login Menu) */}
          <div className="flex items-center space-x-2 border-b border-[var(--sgx-secondary)] pb-2 overflow-x-auto">
            {[
              { id: 'REGISTRATIONS', label: '0. INSCRITOS & DÍA 3', icon: Users },
              { id: 'DIRECTOR', label: '1. DIRECTOR CONSOLE', icon: Radio },
              { id: 'CYOA_SCENARIOS', label: '2. CYOA SCENARIOS', icon: GitBranch },
              { id: 'PRESETS_LAB', label: '3. FX PRESETS & UBERSHADERS', icon: Sparkles },
              { id: 'THEME_STUDIO', label: '4. THEME & COLOR STUDIO', icon: Palette },
              { id: 'SUMMIT_CMS', label: '5. SUMMIT CMS (AGENDA/MAPS/SPEAKERS)', icon: Calendar },
              { id: 'SPONSORS_CRM', label: '6. SPONSORS & BRAND SHOWCASES', icon: Building2 },
              { id: 'SUMMIT_ANALYTICS', label: '7. ANALYTICS & RETENTION', icon: BarChart3 },
              { id: 'AUDIENCE_LEADS', label: '8. AUDIENCIA & LEADS (CSV)', icon: Users },
              { id: 'TELEMETRY', label: '9. DATA & STREAM METRICS', icon: Activity },
              { id: 'TENANT_ROOMS', label: '10. TENANTS & ROOMS', icon: Layers },
              { id: 'GAMIFICATION', label: '11. REWARDS & TIERS', icon: Award },
              { id: 'FIRESTORE_SYNC', label: '12. FIRESTORE SYNC', icon: Database },
              { id: 'SECURITY_ACCESS', label: '13. SECURITY & ACCESS', icon: Key },
              { id: 'ENTREPRENEUR_MATCH', label: '14. ENTREPRENEUR MATCH', icon: Zap },
              { id: 'CONTENT_AUDIT', label: '15. AUDITORÍA & QA FLAGS', icon: ShieldCheck },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeSubpage === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubpage(tab.id as AdminSubpage)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-[11px] font-mono font-bold whitespace-nowrap transition-all ${
                    isActive
                      ? 'sgx-btn shadow-md shadow-[var(--sgx-accent)]/20'
                      : 'text-[#888888] hover:text-white bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/40 hover:border-[var(--sgx-secondary)]'
                  }`}
                  style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUBPAGE 1: DIRECTOR CONSOLE */}
          {activeSubpage === 'REGISTRATIONS' && <SummitRegistrationsPanel />}

          {activeSubpage === 'DIRECTOR' && (
            <div className="space-y-4">
              
              {/* Active Broadcast Node Card */}
              <div className="sgx-panel space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-2 text-[10px] font-mono">
                  <span className="text-[var(--sgx-neon)] font-bold uppercase">
                    NODE ({currentQuestionIndex + 1}/{questions.length}) • LIVE BROADCAST
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
                                    LEADING
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
                          <span>CLOSE VOTING & REVEAL OUTCOME</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onBroadcastQuestion(currentQuestionIndex)}
                          className="sgx-btn text-xs font-bold py-2 px-5 flex items-center space-x-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>OPEN LIVE AUDIENCE VOTING</span>
                        </button>
                      )}

                      {currentQuestionIndex < questions.length - 1 && (
                        <button
                          onClick={() => onBroadcastQuestion(currentQuestionIndex + 1)}
                          className="px-3 py-2 bg-[var(--sgx-bg)] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-mono text-xs font-bold transition-all"
                        >
                          NEXT SCENARIO ➔
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
                  Scenario Sequence Roster ({questions.length})
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
                        <span>SCENARIO #{idx + 1}</span>
                        <span>{q.durationSeconds}s</span>
                      </div>
                      <p className="font-bold text-white truncate mt-1">{q.prompt}</p>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SUBPAGE 2: CYOA SCENARIOS */}
          {activeSubpage === 'CYOA_SCENARIOS' && (
            <div className="space-y-4">
              <div className="sgx-panel space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-[var(--sgx-neon)]" />
                    <span>Create Interactive CYOA Scenario & 3D Visualizer Trigger</span>
                  </h3>

                  <div className="flex items-center space-x-2">
                    <TabCsvDirectActions
                      entityKey="QUESTIONS"
                      items={questions}
                      onUpdateItems={(newQ) => handleBulkImportQuestions(newQ, 'replace')}
                    />
                    <button
                      type="button"
                      onClick={() => setIsBulkQuestionModalOpen(true)}
                      className="px-3 py-1.5 bg-[var(--sgx-neon)]/15 hover:bg-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:text-black border border-[var(--sgx-neon)] text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer rounded"
                    >
                      <UploadCloud className="w-4 h-4" />
                      <span>IMPORTAR (.CSV / .JSON)</span>
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSaveQuestion} className="space-y-3 font-mono text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase block mb-1">Scenario Prompt / Question for Audience</label>
                    <input
                      type="text"
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="e.g. ¿Qué estructura procedural debe manifestarse en el escenario?"
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
                        placeholder="Option A Label"
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
                        placeholder="Option B Label"
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
                    <span>SAVE & APPEND CYOA SCENARIO</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* SUBPAGE 3: PRESETS LAB */}
          {activeSubpage === 'PRESETS_LAB' && (
            <div className="space-y-4">
              <FXPresetsStudio
                onTriggerPreset={onTriggerPreset}
                customAssets={customAssets}
                onUpdateCustomAssets={onUpdateCustomAssets}
              />
            </div>
          )}

          {/* SUBPAGE 4: SUMMIT CMS (UNIFIED IN ADMIN DASHBOARD) */}
          {activeSubpage === 'SUMMIT_CMS' && (
            <div className="space-y-4">
              <SummitCMSManager
                sessions={summitSessions}
                speakers={summitSpeakers}
                mapNodes={summitMapNodes}
                embeds={summitEmbeds}
                sponsors={summitSponsors}
                onUpdateSessions={setSummitSessions}
                onUpdateSpeakers={setSummitSpeakers}
                onUpdateMapNodes={setSummitMapNodes}
                onUpdateEmbeds={setSummitEmbeds}
                onUpdateSponsors={setSummitSponsors}
                onBroadcastPushNotification={handleCMSPushAlert}
              />
            </div>
          )}

          {/* SUBPAGE 5: SPONSORS & BRAND SHOWCASES (CRM & 1-CLICK LANDINGS) */}
          {activeSubpage === 'SPONSORS_CRM' && (
            <div className="space-y-6">
              
              {/* Header Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Brand Showcases Activos</span>
                    <strong className="text-xl font-black text-[var(--sgx-neon)] font-['Orbitron',sans-serif]">{approvedSponsors.length}</strong>
                  </div>
                  <Sparkles className="w-6 h-6 text-[var(--sgx-neon)]" />
                </div>

                <div className="p-4 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Inquiries / Leads Recibidos</span>
                    <strong className="text-xl font-black text-[var(--sgx-accent)] font-['Orbitron',sans-serif]">{sponsorInquiries.length}</strong>
                  </div>
                  <Building2 className="w-6 h-6 text-[var(--sgx-accent)]" />
                </div>

                <div className="p-4 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase block">Venue Día 3</span>
                    <strong className="text-xs font-bold text-white">Chroma Space Studios</strong>
                  </div>
                  <Tag className="w-6 h-6 text-[#FDCC0D]" />
                </div>
              </div>

              {/* Inquiries Section with 1-Click Approval */}
              <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-5 space-y-4 rounded-xl font-mono text-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-[var(--sgx-accent)]" />
                      <span>SOLICITUDES DE PATROCINIO PENDIENTES & LEADS</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Al aprobar una solicitud, el sistema genera automáticamente un landing de marca con logo, banners y presencia activa en la app.
                    </p>
                  </div>

                  <button
                    onClick={handleExportInquiriesCSV}
                    className="px-3 py-1.5 bg-[#262626] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-bold text-xs flex items-center space-x-1.5 rounded transition-all self-start sm:self-auto"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>EXPORTAR CSV</span>
                  </button>
                </div>

                {sponsorInquiries.length === 0 ? (
                  <p className="text-slate-400 text-center py-6">No hay solicitudes de patrocinio pendientes.</p>
                ) : (
                  <div className="space-y-3">
                    {sponsorInquiries.map((inq) => (
                      <div 
                        key={inq.id}
                        className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] rounded-xl hover:border-[var(--sgx-neon)]/70 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--sgx-secondary)]/40 pb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                              {inq.companyName}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 bg-[#1B1B1B] border border-[var(--sgx-accent)] text-[var(--sgx-accent)] font-bold rounded">
                              {inq.referenceCode}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {inq.status !== 'APPROVED' ? (
                              <button
                                onClick={() => handleApproveInquiryInCRM(inq)}
                                className="px-3 py-1.5 bg-gradient-to-r from-amber-600 to-[#FDCC0D] hover:brightness-110 text-black font-bold text-[11px] rounded flex items-center space-x-1.5 shadow-md shadow-amber-950/40"
                              >
                                <Zap className="w-3.5 h-3.5 text-black" />
                                <span>⚡ APROBAR & CREAR SHOWCASE</span>
                              </button>
                            ) : (
                              <span className="px-2.5 py-1 bg-amber-950 border border-[#FDCC0D] text-[#FDCC0D] text-[10px] font-bold rounded">
                                ✓ SHOWCASE APROBADO
                              </span>
                            )}

                            <button
                              onClick={() => handleDeleteInquiryInCRM(inq.id)}
                              className="p-1.5 border border-rose-500/60 text-rose-400 hover:bg-rose-500 hover:text-white rounded"
                              title="Eliminar Solicitud"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px] text-slate-300">
                          <div>
                            <span className="text-slate-500 text-[10px] block">Contacto:</span>
                            <span className="font-bold text-white">{inq.contactName}</span>
                            {inq.roleTitle && <span className="text-slate-400 block text-[10px]">({inq.roleTitle})</span>}
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Email:</span>
                            <a href={`mailto:${inq.email}`} className="text-[var(--sgx-neon)] hover:underline flex items-center space-x-1 break-all">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span>{inq.email}</span>
                            </a>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Teléfono / WhatsApp:</span>
                            <a href={`tel:${inq.phone}`} className="text-white hover:underline flex items-center space-x-1">
                              <Phone className="w-3 h-3 shrink-0 text-[#FDCC0D]" />
                              <span>{inq.phone}</span>
                            </a>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block">Tier Seleccionado:</span>
                            <span className="font-bold text-[var(--sgx-accent)]">{inq.selectedTierName}</span>
                          </div>
                        </div>

                        {inq.customMessage && (
                          <p className="p-2.5 bg-[#101010] border border-[var(--sgx-secondary)]/60 text-slate-300 italic text-[11px] rounded">
                            "{inq.customMessage}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Approved Brand Showcases Directory */}
              <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-5 space-y-4 rounded-xl font-mono text-xs">
                <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-[var(--sgx-neon)]" />
                      <span>BRAND SHOWCASES EN VIVO ({approvedSponsors.length})</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Marcas con landing oficial activo, banners interactivos y tickers del Spatialgineers Summit 2026.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedSponsors.map((sp) => (
                    <div 
                      key={sp.id}
                      className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] rounded-xl space-y-3 flex flex-col justify-between"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-16 h-16 rounded-xl bg-[#121212] border border-[var(--sgx-neon)]/60 p-1.5 flex items-center justify-center overflow-hidden shrink-0">
                          <img 
                            src={sp.logoUrl} 
                            alt={sp.companyName} 
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=100&auto=format&fit=crop&q=80';
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif] truncate">
                              {sp.companyName}
                            </h4>
                            <span className="text-[9px] px-2 py-0.5 bg-[var(--sgx-accent)]/10 text-[var(--sgx-accent)] border border-[var(--sgx-accent)]/40 font-bold rounded shrink-0">
                              {sp.tierName.split('(')[0]}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--sgx-neon)] truncate mt-0.5">{sp.tagline}</p>
                          <a 
                            href={sp.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-[10px] text-slate-400 hover:text-white flex items-center space-x-1 mt-1 truncate"
                          >
                            <Globe className="w-3 h-3 text-[var(--sgx-neon)] shrink-0" />
                            <span className="truncate">{sp.websiteUrl}</span>
                          </a>
                        </div>
                      </div>

                      {/* Activations & Actions */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--sgx-secondary)]/40">
                        <button
                          onClick={() => setPreviewShowcaseModal(sp)}
                          className="px-3 py-1 bg-[#262626] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-bold text-[10px] flex items-center space-x-1.5 rounded transition-all"
                        >
                          <Eye className="w-3 h-3" />
                          <span>VER LANDING DE MARCA</span>
                        </button>

                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setEditingApprovedSponsor(sp)}
                            className="p-1.5 rounded border border-[var(--sgx-secondary)] text-slate-300 hover:border-[var(--sgx-neon)] hover:text-white"
                            title="Editar Marca y Landing"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteApprovedSponsorCRM(sp.id)}
                            className="p-1.5 rounded border border-rose-500/60 text-rose-400 hover:bg-rose-500 hover:text-white"
                            title="Eliminar Marca"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* SUBPAGE 6: SUMMIT ANALYTICS (UNIFIED IN ADMIN DASHBOARD) */}
          {activeSubpage === 'SUMMIT_ANALYTICS' && (
            <div className="space-y-4">
              <SummitAnalyticsView
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
                connectedAudienceCount={connectedAudienceCount}
                telemetryStats={telemetryStats}
              />
            </div>
          )}

          {/* SUBPAGE 7: AUDIENCE & LEADS (CSV) */}
          {activeSubpage === 'AUDIENCE_LEADS' && (
            <div className="sgx-panel space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-2">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                    <Users className="w-4 h-4 text-[var(--sgx-neon)]" />
                    <span>Audience Leads & Registered Gamers ({combinedLeads.length})</span>
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
                    <span>EXPORT CSV</span>
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
                  placeholder="Filter by nickname, email or prize tier..."
                  className="w-full bg-transparent text-xs text-white font-mono focus:outline-none"
                />
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#121212] border-b border-[var(--sgx-secondary)] text-[10px] text-[var(--sgx-neon)] uppercase">
                    <tr>
                      <th className="p-2">Rank</th>
                      <th className="p-2">User / Avatar</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Score</th>
                      <th className="p-2">Streak</th>
                      <th className="p-2">Interactions</th>
                      <th className="p-2">Status</th>
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
          )}

          {/* SUBPAGE 8: TELEMETRY */}
          {activeSubpage === 'TELEMETRY' && (
            <div className="sgx-panel space-y-4 font-mono text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--sgx-secondary)] pb-2 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-[#FDCC0D]" />
                <span>Live Data Streaming Telemetry & Low-Latency Metrics</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] text-slate-400 uppercase block">Total Consumed (30s Window)</span>
                  <span className="text-lg font-bold text-[#FDCC0D] font-['Orbitron',sans-serif]">
                    {telemetryStats.kbPerUserPer30s} KB
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Under 250 KB target SLA</span>
                </div>

                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] text-slate-400 uppercase block">Connected Audience Nodes</span>
                  <span className="text-lg font-bold text-[var(--sgx-neon)] font-['Orbitron',sans-serif]">
                    {connectedAudienceCount}
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">WebSocket Multiplexing</span>
                </div>

                <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <span className="text-[10px] text-slate-400 uppercase block">Average Packet RTT</span>
                  <span className="text-lg font-bold text-[var(--sgx-accent)] font-['Orbitron',sans-serif]">
                    18 ms
                  </span>
                  <span className="text-[9px] text-slate-500 block mt-0.5">Cloud Edge Ingress</span>
                </div>
              </div>
            </div>
          )}

          {/* SUBPAGE 4: THEME & COLOR STUDIO */}
          {activeSubpage === 'THEME_STUDIO' && (
            <AdminThemeStudio />
          )}

          {/* SUBPAGE 10: TENANTS & ROOMS */}
          {activeSubpage === 'TENANT_ROOMS' && (
            <TenantRoomManager />
          )}

          {/* SUBPAGE 10: GAMIFICATION & REWARDS REDEMPTION MANAGER */}
          {activeSubpage === 'GAMIFICATION' && (
            <div className="space-y-6">
              <AdminRewardsManager />
              <div className="border-t border-[var(--sgx-secondary)] pt-6">
                <GamificationTierManager />
              </div>
            </div>
          )}

          {/* SUBPAGE 11: FIRESTORE SYNC */}
          {activeSubpage === 'FIRESTORE_SYNC' && (
            <div className="sgx-panel space-y-3 font-mono text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--sgx-secondary)] pb-1.5">
                Firestore Cloud Persistence Status
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <span className="text-[#888888] text-[9px] block">/admins</span>
                  <span className="font-bold text-[#FDCC0D]">1 Super Admin Node</span>
                </div>
                <div className="p-2.5 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <span className="text-[#888888] text-[9px] block">/questions</span>
                  <span className="font-bold text-[var(--sgx-neon)]">{questions.length} Scenarios</span>
                </div>
              </div>
            </div>
          )}

          {/* SUBPAGE 12: SECURITY & ACCESS */}
          {activeSubpage === 'SECURITY_ACCESS' && (
            <div className="sgx-panel space-y-3 font-mono text-xs">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-[var(--sgx-secondary)] pb-1.5">
                Zero-Trust Security & Admin Roster
              </h3>
              <div className="p-3 bg-[#121212] border border-[var(--sgx-secondary)] space-y-2">
                <div className="flex items-center space-x-2 text-[#FDCC0D] font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Primary Admin: {AUTHORIZED_SUPER_ADMIN_EMAIL}</span>
                </div>
                <p className="text-slate-300 font-sans text-xs">
                  All write operations on director session triggers and summit configurations are secured by Firebase Security Rules.
                </p>
              </div>
            </div>
          )}

          {/* SUBPAGE 14: ENTREPRENEUR MATCH MODERATION */}
          {activeSubpage === 'ENTREPRENEUR_MATCH' && (
            <div className="space-y-4">
              <AdminMatchPanel />
            </div>
          )}

          {/* SUBPAGE 15: CONTENT AUDIT & QA CONTROL PLANE */}
          {activeSubpage === 'CONTENT_AUDIT' && (
            <div className="space-y-4">
              <div className="sgx-panel space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-3">
                  <div>
                    <h2 className="text-base font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-[var(--sgx-neon)]" />
                      <span>Auditoría de Contenido, Feature Toggles & Diagnósticos QA</span>
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
                    <span>ABRIR MATRIZ INTERACTIVA DE AUDITORÍA</span>
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

      {/* EDIT APPROVED SPONSOR SHOWCASE MODAL */}
      {editingApprovedSponsor && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-neon)] max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                EDITAR BRAND SHOWCASE & LANDING DE PATROCINADOR
              </span>
              <button onClick={() => setEditingApprovedSponsor(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Nombre de la Empresa / Marca</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.companyName}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, companyName: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Slug / Identificador URL</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.brandSlug}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, brandSlug: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">URL de Logo (PNG/SVG)</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.logoUrl}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, logoUrl: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">URL de Banner Hero (1400x600)</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.bannerUrl || ''}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, bannerUrl: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Sitio Web Oficial (Enlace CTA)</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.websiteUrl}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, websiteUrl: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Texto del Botón CTA</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.ctaButtonText || 'VISITAR SITIO WEB'}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, ctaButtonText: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Tagline / Lema de Marca</label>
                <input
                  type="text"
                  value={editingApprovedSponsor.tagline}
                  onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, tagline: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Descripción Completa en Landing</label>
                <textarea
                  value={editingApprovedSponsor.description}
                  onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Código Promocional Especial (Opcional)</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.specialOfferCode || ''}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, specialOfferCode: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-accent)] p-2 text-[var(--sgx-accent)] font-bold focus:outline-none"
                    placeholder="Ej. SGX2026"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Ubicación / Stage (Chroma Space Studios)</label>
                  <input
                    type="text"
                    value={editingApprovedSponsor.boothLocation || ''}
                    onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, boothLocation: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                    placeholder="Chroma Space Studios - Partner Pavilion"
                  />
                </div>
              </div>

              {/* Activation Toggles */}
              <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] rounded-xl space-y-2">
                <span className="text-[10px] text-[var(--sgx-accent)] uppercase font-bold block">
                  Presencia e Integración Interactiva en la Aplicación
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingApprovedSponsor.activeInVisualizer !== false}
                      onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, activeInVisualizer: e.target.checked })}
                    />
                    <span>Visualizador 3D Stage</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingApprovedSponsor.activeInMiniGame !== false}
                      onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, activeInMiniGame: e.target.checked })}
                    />
                    <span>Minijuegos & Roblox</span>
                  </label>

                  <label className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingApprovedSponsor.activeInAppTicker !== false}
                      onChange={(e) => setEditingApprovedSponsor({ ...editingApprovedSponsor, activeInAppTicker: e.target.checked })}
                    />
                    <span>Ticker Global</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--sgx-secondary)]">
              <button
                onClick={() => setEditingApprovedSponsor(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveApprovedSponsorCRM(editingApprovedSponsor)}
                className="sgx-btn text-xs font-bold px-5 py-2 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR BRAND SHOWCASE</span>
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* UNIFIED CSV MANAGEMENT SUITE MODAL */}
      <AdminCsvHubModal
        isOpen={isCsvHubModalOpen}
        onClose={() => setIsCsvHubModalOpen(false)}
        sessions={summitSessions}
        speakers={summitSpeakers}
        mapNodes={summitMapNodes}
        embeds={summitEmbeds}
        sponsors={summitSponsors}
        questions={questions}
        gamificationTiers={PRIZE_TIERS}
        onUpdateSessions={(sess) => {
          setSummitSessions(sess);
          saveAllSessions(sess);
        }}
        onUpdateSpeakers={(spks) => {
          setSummitSpeakers(spks);
          saveAllSpeakers(spks);
        }}
        onUpdateMapNodes={(nodes) => {
          setSummitMapNodes(nodes);
          saveAllMapNodes(nodes);
        }}
        onUpdateEmbeds={(embs) => {
          setSummitEmbeds(embs);
          saveAllEmbedWidgets(embs);
        }}
        onUpdateSponsors={(spons) => {
          setSummitSponsors(spons);
          saveAllSponsorshipTiers(spons);
        }}
        onUpdateQuestions={(qs) => {
          handleBulkImportQuestions(qs, 'replace');
        }}
      />

    </div>
  );
};
