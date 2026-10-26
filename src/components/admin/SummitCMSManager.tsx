import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  User, 
  MapPin, 
  Gamepad2, 
  Bell, 
  Send, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  Check, 
  RotateCcw, 
  Sparkles, 
  ExternalLink,
  ShieldCheck,
  Radio,
  Layers,
  Award,
  Building2,
  Mail,
  Phone,
  Download,
  CheckCircle2,
  Clock,
  Globe,
  Tag,
  Eye,
  Zap,
  Share2
} from 'lucide-react';
import { 
  SummitSession, 
  SummitSpeaker, 
  Map360Node, 
  EmbedWidget, 
  SponsorshipTier, 
  SponsorInquiry,
  ApprovedSponsor,
  SummitNotification, 
  SummitPillarId 
} from '../../types/summit';
import { 
  saveAllSessions, 
  saveAllSpeakers, 
  saveAllMapNodes, 
  saveAllEmbedWidgets, 
  saveAllSponsorshipTiers,
  loadAllSponsorInquiries,
  saveAllSponsorInquiries,
  loadAllApprovedSponsors,
  saveAllApprovedSponsors,
  loadPersistedSponsorshipTiers,
  approveSponsorInquiryAndCreateShowcase,
  updateApprovedSponsor,
  deleteApprovedSponsor,
  saveSessionToFirestore,
  deleteSessionFromFirestore,
  saveSpeakerToFirestore,
  deleteSpeakerFromFirestore,
  playNotificationChime,
  INITIAL_SUMMIT_SESSIONS,
  INITIAL_SUMMIT_SPEAKERS,
  INITIAL_MAP_360_NODES,
  INITIAL_EMBED_WIDGETS,
  SPONSORSHIP_TIERS,
  SUMMIT_PILLARS
} from '../../lib/summitData';
import { SummitBrandShowcaseModal } from '../summit/SummitBrandShowcaseModal';
import { SummitSpeakerPortalModal } from '../summit/SummitSpeakerPortalModal';
import { TabCsvDirectActions } from './TabCsvDirectActions';

interface SummitCMSManagerProps {
  sessions: SummitSession[];
  speakers: SummitSpeaker[];
  mapNodes: Map360Node[];
  embeds: EmbedWidget[];
  sponsors: SponsorshipTier[];
  onUpdateSessions: (sessions: SummitSession[]) => void;
  onUpdateSpeakers: (speakers: SummitSpeaker[]) => void;
  onUpdateMapNodes: (nodes: Map360Node[]) => void;
  onUpdateEmbeds: (embeds: EmbedWidget[]) => void;
  onUpdateSponsors: (sponsors: SponsorshipTier[]) => void;
  onBroadcastPushNotification: (notification: SummitNotification) => void;
}

export const SummitCMSManager: React.FC<SummitCMSManagerProps> = ({
  sessions,
  speakers,
  mapNodes,
  embeds,
  sponsors,
  onUpdateSessions,
  onUpdateSpeakers,
  onUpdateMapNodes,
  onUpdateEmbeds,
  onUpdateSponsors,
  onBroadcastPushNotification,
}) => {
  const [activeTab, setActiveTab] = useState<
    'BROADCAST' | 'SESSIONS' | 'SPEAKERS' | 'MAP_NODES' | 'EMBEDS' | 'SPONSORS' | 'BRAND_SHOWCASES' | 'INQUIRIES'
  >('BROADCAST');

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Inquiries & Approved Sponsors States
  const [inquiries, setInquiries] = useState<SponsorInquiry[]>(() => loadAllSponsorInquiries());
  const [approvedSponsors, setApprovedSponsors] = useState<ApprovedSponsor[]>(() => loadAllApprovedSponsors());
  const [previewShowcaseModal, setPreviewShowcaseModal] = useState<ApprovedSponsor | null>(null);
  const [editingApprovedSponsor, setEditingApprovedSponsor] = useState<ApprovedSponsor | null>(null);

  // Editing modals state for other entities
  const [editingSession, setEditingSession] = useState<SummitSession | null>(null);
  const [editingSpeaker, setEditingSpeaker] = useState<SummitSpeaker | null>(null);
  const [editingMapNode, setEditingMapNode] = useState<Map360Node | null>(null);
  const [editingEmbed, setEditingEmbed] = useState<EmbedWidget | null>(null);
  const [isSpeakerPortalOpen, setIsSpeakerPortalOpen] = useState<boolean>(false);
  const [speakerSearchTermInModal, setSpeakerSearchTermInModal] = useState<string>('');

  // Broadcast Notification Form
  const [broadcastTitle, setBroadcastTitle] = useState<string>('¡SESIÓN EN VIVO AHORA!');
  const [broadcastMessage, setBroadcastMessage] = useState<string>('Comienza la presentación del Pilar SGX.STAGE con captura facial de avatar en vivo en YouTube.');
  const [broadcastPriority, setBroadcastPriority] = useState<'URGENT' | 'HIGH' | 'NORMAL'>('HIGH');
  const [broadcastActionUrl, setBroadcastActionUrl] = useState<string>('/summit');
  const [broadcastActionLabel, setBroadcastActionLabel] = useState<string>('Entrar a la sesión');

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3500);
  };

  // --- 1-CLICK APPROVAL & SHOWCASE GENERATION ---
  const handleApproveAndCreateShowcase = (inquiry: SponsorInquiry) => {
    const result = approveSponsorInquiryAndCreateShowcase(inquiry);
    // Reload state
    setInquiries(loadAllSponsorInquiries());
    const refreshedSponsors = loadAllApprovedSponsors();
    setApprovedSponsors(refreshedSponsors);
    onUpdateSponsors(loadPersistedSponsorshipTiers());
    showStatus(`¡Solicitud aprobada! Landing Brand Showcase creado para ${result.approvedSponsor.companyName}`);
    // Open preview of the brand showcase
    setPreviewShowcaseModal(result.approvedSponsor);
  };

  const handleUpdateInquiryStatus = (id: string, newStatus: SponsorInquiry['status']) => {
    if (newStatus === 'APPROVED') {
      const targetInq = inquiries.find(i => i.id === id);
      if (targetInq) {
        handleApproveAndCreateShowcase(targetInq);
        return;
      }
    }
    const updated = inquiries.map(inq => inq.id === id ? { ...inq, status: newStatus } : inq);
    setInquiries(updated);
    saveAllSponsorInquiries(updated);
    showStatus(`Estado de solicitud actualizado a: ${newStatus}`);
  };

  const handleDeleteInquiry = (id: string) => {
    const updated = inquiries.filter(inq => inq.id !== id);
    setInquiries(updated);
    saveAllSponsorInquiries(updated);
    showStatus('Solicitud eliminada.');
  };

  const handleExportInquiriesCSV = () => {
    const headers = ['ID', 'Código', 'Empresa', 'Contacto', 'Cargo', 'Email', 'Teléfono', 'Sitio Web', 'Tier', 'Presupuesto', 'Estado', 'Fecha', 'Objetivos', 'Mensaje'];
    const rows = inquiries.map(inq => [
      inq.id,
      inq.referenceCode,
      `"${inq.companyName.replace(/"/g, '""')}"`,
      `"${inq.contactName.replace(/"/g, '""')}"`,
      `"${(inq.roleTitle || '').replace(/"/g, '""')}"`,
      inq.email,
      inq.phone,
      inq.websiteUrl || '',
      `"${inq.selectedTierName.replace(/"/g, '""')}"`,
      inq.estimatedBudget || '',
      inq.status,
      new Date(inq.submittedAt).toISOString(),
      `"${inq.goals.join(', ')}"`,
      `"${(inq.customMessage || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGX_Sponsor_Leads_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // --- APPROVED SPONSOR SHOWCASE CRUD ---
  const handleSaveApprovedSponsor = (sponsorToSave: ApprovedSponsor) => {
    let updated: ApprovedSponsor[];
    const exists = approvedSponsors.some(s => s.id === sponsorToSave.id);
    if (exists) {
      updated = approvedSponsors.map(s => s.id === sponsorToSave.id ? sponsorToSave : s);
    } else {
      updated = [...approvedSponsors, sponsorToSave];
    }
    setApprovedSponsors(updated);
    saveAllApprovedSponsors(updated);
    setEditingApprovedSponsor(null);
    showStatus(`Brand Showcase guardado para: ${sponsorToSave.companyName}`);
  };

  const handleDeleteApprovedSponsor = (id: string) => {
    deleteApprovedSponsor(id);
    setApprovedSponsors(loadAllApprovedSponsors());
    showStatus('Brand Showcase eliminado.');
  };

  const handleNewApprovedSponsor = () => {
    const newSponsor: ApprovedSponsor = {
      id: `sponsor_${Date.now()}`,
      inquiryId: `direct_${Date.now()}`,
      companyName: 'Nueva Marca / Patrocinador',
      brandSlug: `sponsor-${Date.now().toString().slice(-4)}`,
      tierId: 'tier_2',
      tierName: 'Tier 2: Gamified Experience Partner',
      logoUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=200&auto=format&fit=crop&q=80',
      bannerUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1400&auto=format&fit=crop&q=80',
      websiteUrl: 'https://spatialgineers.org',
      tagline: 'Impulsando la próxima era de computación espacial en Puerto Rico',
      description: 'Patrocinador oficial del Spatialgineers Summit 2026 activando experiencias interactivas y pabellón de innovación.',
      highlights: ['Pabellón de Innovación en Chroma Space Studios', 'Presencia interactiva en Minijuegos Roblox'],
      specialOfferText: 'Obtén 20% de descuento exclusivo para asistentes con el código promocional.',
      specialOfferCode: 'SGXSUMMIT2026',
      ctaButtonText: 'VISITAR SITIO WEB',
      boothLocation: 'Chroma Space Studios - Partner Pavilion',
      contactEmail: 'partnerships@marca.com',
      activeInVisualizer: true,
      activeInMiniGame: true,
      activeInAppTicker: true,
      publishedAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditingApprovedSponsor(newSponsor);
  };

  // --- SESSIONS CRUD ---
  const handleSaveSession = (sessionToSave: SummitSession) => {
    let updated: SummitSession[];
    const exists = sessions.some(s => s.id === sessionToSave.id);
    if (exists) {
      updated = sessions.map(s => s.id === sessionToSave.id ? sessionToSave : s);
    } else {
      updated = [...sessions, sessionToSave];
    }
    onUpdateSessions(updated);
    saveAllSessions(updated);
    saveSessionToFirestore(sessionToSave);
    setEditingSession(null);
    showStatus('Sesión guardada y sincronizada en Firestore.');
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter(s => s.id !== id);
    onUpdateSessions(updated);
    saveAllSessions(updated);
    deleteSessionFromFirestore(id);
    showStatus('Sesión eliminada de la agenda y Firestore.');
  };

  const handleNewSession = () => {
    const newSess: SummitSession = {
      id: `sess_${Date.now()}`,
      day: 1,
      dateStr: 'Dec 11, 2026',
      startTime: '10:00 AM',
      endTime: '10:45 AM',
      startMinutes: 600,
      title: 'Nueva Sesión de Demostración Espacial',
      subtitle: 'Subtítulo descriptivo de la sesión',
      description: 'Detalles completos de la sesión y agenda interactiva.',
      pillarId: 'SGX.STORY',
      speakerIds: speakers.length > 0 ? [speakers[0].id] : [],
      format: 'DIGITAL',
      venueLocation: 'YouTube Live Broadcast',
      tags: ['Live Demo', 'SGX'],
      status: 'UPCOMING',
    };
    setEditingSession(newSess);
  };

  // --- SPEAKERS CRUD ---
  const handleSaveSpeaker = (spk: SummitSpeaker) => {
    let updated: SummitSpeaker[];
    const exists = speakers.some(s => s.id === spk.id);
    if (exists) {
      updated = speakers.map(s => s.id === spk.id ? spk : s);
    } else {
      updated = [...speakers, spk];
    }
    onUpdateSpeakers(updated);
    saveAllSpeakers(updated);
    saveSpeakerToFirestore(spk);
    setEditingSpeaker(null);
    showStatus('Speaker guardado y sincronizado en Firestore.');
  };

  const handleDeleteSpeaker = (id: string) => {
    const updated = speakers.filter(s => s.id !== id);
    onUpdateSpeakers(updated);
    saveAllSpeakers(updated);
    deleteSpeakerFromFirestore(id);
    showStatus('Speaker eliminado de Firestore.');
  };

  const handleNewSpeaker = () => {
    const newSpk: SummitSpeaker = {
      id: `spk_${Date.now()}`,
      name: 'Nuevo Speaker / Artista',
      role: 'Spatialgineers Innovator',
      organization: 'Ecosistema Spatialgineers',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
      bio: 'Biografía del creador o initiate.',
      pillarId: 'SGX.SPARK',
      day: 1,
      isKeynote: false,
      isAwakenInitiate: false,
    };
    setEditingSpeaker(newSpk);
  };

  // --- MAP NODES CRUD ---
  const handleSaveMapNode = (node: Map360Node) => {
    let updated: Map360Node[];
    const exists = mapNodes.some(n => n.id === node.id);
    if (exists) {
      updated = mapNodes.map(n => n.id === node.id ? node : n);
    } else {
      updated = [...mapNodes, node];
    }
    onUpdateMapNodes(updated);
    saveAllMapNodes(updated);
    setEditingMapNode(null);
    showStatus('Nodo 360 guardado.');
  };

  // --- EMBEDS CRUD ---
  const handleSaveEmbed = (embed: EmbedWidget) => {
    let updated: EmbedWidget[];
    const exists = embeds.some(e => e.id === embed.id);
    if (exists) {
      updated = embeds.map(e => e.id === embed.id ? embed : e);
    } else {
      updated = [...embeds, embed];
    }
    onUpdateEmbeds(updated);
    saveAllEmbedWidgets(updated);
    setEditingEmbed(null);
    showStatus('Experiencia embebida guardada.');
  };

  const handleDeleteEmbed = (id: string) => {
    const updated = embeds.filter(e => e.id !== id);
    onUpdateEmbeds(updated);
    saveAllEmbedWidgets(updated);
    showStatus('Experiencia eliminada.');
  };

  // --- BROADCAST PUSH NOTIFICATION ---
  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    const notif: SummitNotification = {
      id: `notif_${Date.now()}`,
      title: broadcastTitle.trim(),
      message: broadcastMessage.trim(),
      timestamp: Date.now(),
      type: 'SYSTEM_ANNOUNCEMENT',
      priority: broadcastPriority,
      actionUrl: broadcastActionUrl.trim() || undefined,
      actionLabel: broadcastActionLabel.trim() || undefined,
    };

    onBroadcastPushNotification(notif);
    playNotificationChime();
    showStatus('¡Notificación Push enviada a todos los asistentes en vivo!');
  };

  // --- RESET ALL DATA TO DEFAULTS ---
  const handleResetToDefaults = () => {
    if (window.confirm('¿Deseas restaurar todos los datos oficiales del Summit 2026 (Operational Bible)?')) {
      onUpdateSessions(INITIAL_SUMMIT_SESSIONS);
      saveAllSessions(INITIAL_SUMMIT_SESSIONS);
      onUpdateSpeakers(INITIAL_SUMMIT_SPEAKERS);
      saveAllSpeakers(INITIAL_SUMMIT_SPEAKERS);
      onUpdateMapNodes(INITIAL_MAP_360_NODES);
      saveAllMapNodes(INITIAL_MAP_360_NODES);
      onUpdateEmbeds(INITIAL_EMBED_WIDGETS);
      saveAllEmbedWidgets(INITIAL_EMBED_WIDGETS);
      onUpdateSponsors(SPONSORSHIP_TIERS);
      saveAllSponsorshipTiers(SPONSORSHIP_TIERS);
      showStatus('Todos los datos se han restablecido al estado oficial.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-[#FDCC0D]" />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              PANEL DE CONTROL & CMS DEL SUMMIT (FRONTEND CRUD TOTAL)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 font-mono">
            Edita, crea, elimina y modifica cualquier dato del evento en tiempo real con persistencia, brand showcases y alertas instantáneas.
          </p>
        </div>

        {/* Reset & Status */}
        <div className="flex items-center space-x-2 font-mono text-xs">
          {statusMessage && (
            <span className="px-2.5 py-1 bg-[#FDCC0D]/20 border border-[#FDCC0D] text-[#FDCC0D] font-bold animate-pulse">
              {statusMessage}
            </span>
          )}
          <button
            onClick={handleResetToDefaults}
            className="p-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-amber-400 text-amber-400 text-xs flex items-center space-x-1"
            title="Restablecer datos originales del Summit"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>REINICIAR DATOS</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center space-x-1.5 overflow-x-auto bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-1.5 font-mono text-xs">
        <button
          onClick={() => setActiveTab('BROADCAST')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'BROADCAST' ? 'bg-[var(--sgx-accent)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>PUSH BROADCAST</span>
        </button>

        <button
          onClick={() => setActiveTab('BRAND_SHOWCASES')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'BRAND_SHOWCASES' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>BRAND SHOWCASES ({approvedSponsors.length})</span>
        </button>

        <button
          onClick={() => {
            setInquiries(loadAllSponsorInquiries());
            setActiveTab('INQUIRIES');
          }}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'INQUIRIES' ? 'bg-[var(--sgx-accent)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>LEADS & INQUIRIES ({inquiries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SESSIONS')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'SESSIONS' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>AGENDA ({sessions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SPEAKERS')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'SPEAKERS' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>SPEAKERS ({speakers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('MAP_NODES')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'MAP_NODES' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>MAPA 360° ({mapNodes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EMBEDS')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'EMBEDS' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>EMBEDS ({embeds.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('SPONSORS')}
          className={`px-3 py-1.5 font-bold transition-all flex items-center space-x-1.5 ${
            activeTab === 'SPONSORS' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Award className="w-3.5 h-3.5" />
          <span>TIERS (1-4)</span>
        </button>
      </div>

      {/* TAB: BRAND SHOWCASES CRUD */}
      {activeTab === 'BRAND_SHOWCASES' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-[var(--sgx-neon)]" />
                <span>PATROCINADORES APROBADOS & BRAND SHOWCASES ({approvedSponsors.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Cada marca aprobada genera un landing showcase interactivo y se sincroniza con banners, tickers y visualizadores 3D del Summit.
              </p>
            </div>

            <div className="flex items-center space-x-2 self-start sm:self-auto">
              <TabCsvDirectActions
                entityKey="SPONSORS"
                items={approvedSponsors}
                onUpdateItems={(newItems) => {
                  setApprovedSponsors(newItems);
                  saveAllApprovedSponsors(newItems);
                }}
              />
              <button
                onClick={handleNewApprovedSponsor}
                className="sgx-btn-cyan px-3 py-1.5 text-xs font-bold flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>AÑADIR BRAND SHOWCASE</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedSponsors.map((sp) => (
              <div 
                key={sp.id}
                className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]/80 transition-all rounded-xl flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-16 rounded-xl bg-[#121212] border border-[var(--sgx-neon)]/60 p-1 flex items-center justify-center overflow-hidden shrink-0">
                    <img 
                      src={sp.logoUrl || "https://via.placeholder.com/150"} 
                      alt={sp.companyName} 
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=100&auto=format&fit=crop&q=80';
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-white uppercase truncate font-['Orbitron',sans-serif]">
                        {sp.companyName}
                      </h4>
                      <span className="text-[9px] px-2 py-0.5 rounded bg-[var(--sgx-accent)]/10 text-[var(--sgx-accent)] border border-[var(--sgx-accent)]/40 font-bold shrink-0">
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

                {/* Activations & Badges */}
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] pt-2 border-t border-[var(--sgx-secondary)]/50 text-slate-300">
                  <span className={`px-2 py-0.5 rounded border ${sp.activeInVisualizer !== false ? 'bg-amber-950/60 border-[#FDCC0D] text-[#FDCC0D]' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                    3D Visualizer: {sp.activeInVisualizer !== false ? 'ON' : 'OFF'}
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${sp.activeInMiniGame !== false ? 'bg-cyan-950/60 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                    Roblox / MiniGame: {sp.activeInMiniGame !== false ? 'ON' : 'OFF'}
                  </span>
                  <span className={`px-2 py-0.5 rounded border ${sp.activeInAppTicker !== false ? 'bg-blue-950/60 border-blue-500 text-[var(--sgx-neon)]' : 'bg-slate-900 border-slate-700 text-slate-500'}`}>
                    Global Ticker: {sp.activeInAppTicker !== false ? 'ON' : 'OFF'}
                  </span>
                  {sp.specialOfferCode && (
                    <span className="px-2 py-0.5 rounded bg-[var(--sgx-accent)]/20 border border-[var(--sgx-accent)] text-[var(--sgx-accent)] font-bold">
                      PROMO: {sp.specialOfferCode}
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--sgx-secondary)]/40">
                  <button
                    onClick={() => setPreviewShowcaseModal(sp)}
                    className="px-2.5 py-1 bg-[#262626] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-bold text-[10px] flex items-center space-x-1 transition-all rounded"
                  >
                    <Eye className="w-3 h-3" />
                    <span>VER LANDING SHOWCASE</span>
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
                      onClick={() => handleDeleteApprovedSponsor(sp.id)}
                      className="p-1.5 rounded border border-rose-500/60 text-rose-400 hover:bg-rose-500 hover:text-black"
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
      )}

      {/* Tab 1: PUSH NOTIFICATION BROADCAST */}
      {activeTab === 'BROADCAST' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-6 space-y-4">
          <div className="flex items-center space-x-2 border-b border-[var(--sgx-secondary)]/60 pb-3">
            <Radio className="w-5 h-5 text-[var(--sgx-accent)] animate-pulse" />
            <div>
              <h3 className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                TRANSMISOR DE ALERTAS PUSH EN TIEMPO REAL
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Envía alertas instantáneas a todos los asistentes conectados en la web con sintetizador de audio futurista.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendBroadcast} className="space-y-4 max-w-2xl">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Título de la Alerta</label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:border-[var(--sgx-accent)] focus:outline-none"
                placeholder="Ej. ¡COMIENZA EL BLOQUE SGX GUILD!"
              />
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Mensaje de Notificación</label>
              <textarea
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                rows={3}
                className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono focus:border-[var(--sgx-accent)] focus:outline-none"
                placeholder="Escribe el mensaje..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Prioridad</label>
                <select
                  value={broadcastPriority}
                  onChange={(e) => setBroadcastPriority(e.target.value as any)}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">Alta (High)</option>
                  <option value="URGENT">Urgente (Urgent)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">URL de Acción (Opcional)</label>
                <input
                  type="text"
                  value={broadcastActionUrl}
                  onChange={(e) => setBroadcastActionUrl(e.target.value)}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono"
                  placeholder="/summit"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Etiqueta del Botón</label>
                <input
                  type="text"
                  value={broadcastActionLabel}
                  onChange={(e) => setBroadcastActionLabel(e.target.value)}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono"
                  placeholder="Ver Agenda"
                />
              </div>
            </div>

            <button
              type="submit"
              className="sgx-btn text-xs font-bold py-2.5 px-6 flex items-center space-x-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>TRANSMITIR PUSH A TODOS LOS USUARIOS</span>
            </button>
          </form>
        </div>
      )}

      {/* TAB: SPONSOR INQUIRIES & LEADS */}
      {activeTab === 'INQUIRIES' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4 font-mono text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif] flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-[var(--sgx-accent)]" />
                <span>SOLICITUDES Y LEADS DE PATROCINADORES ({inquiries.length})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Al hacer clic en "⚡ APROBAR Y CREAR SHOWCASE", se genera automáticamente el landing de la marca y se activa en el ecosistema.
              </p>
            </div>

            <button
              onClick={handleExportInquiriesCSV}
              className="px-3 py-1.5 bg-[#2b2b2b] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black text-xs font-bold flex items-center space-x-1.5 transition-all self-start sm:self-auto"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORTAR CSV</span>
            </button>
          </div>

          {inquiries.length === 0 ? (
            <div className="p-8 text-center bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-400 space-y-2">
              <Building2 className="w-8 h-8 mx-auto text-slate-600" />
              <p>No hay solicitudes de patrocinio pendientes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {inquiries.map((inq) => (
                <div 
                  key={inq.id} 
                  className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]/60 transition-all space-y-3 rounded-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--sgx-secondary)]/40 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                        {inq.companyName}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-[#1b1b1b] border border-[var(--sgx-accent)] text-[var(--sgx-accent)] font-bold">
                        {inq.referenceCode}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {inq.status !== 'APPROVED' && (
                        <button
                          onClick={() => handleApproveAndCreateShowcase(inq)}
                          className="px-3 py-1 bg-gradient-to-r from-amber-600 to-[#FDCC0D] hover:brightness-110 text-black font-bold text-[10px] rounded flex items-center space-x-1 shadow-md shadow-amber-950/30"
                        >
                          <Zap className="w-3 h-3 text-black" />
                          <span>⚡ APROBAR & CREAR SHOWCASE</span>
                        </button>
                      )}

                      <select
                        value={inq.status}
                        onChange={(e) => handleUpdateInquiryStatus(inq.id, e.target.value as any)}
                        className={`text-[10px] font-bold px-2 py-1 border rounded focus:outline-none ${
                          inq.status === 'APPROVED' ? 'bg-amber-950/80 border-[#FDCC0D] text-[#FDCC0D]' :
                          inq.status === 'CONTACTED' ? 'bg-blue-950/80 border-[var(--sgx-neon)] text-[var(--sgx-neon)]' :
                          inq.status === 'DECLINED' ? 'bg-rose-950/80 border-rose-400 text-rose-400' :
                          'bg-amber-950/80 border-[var(--sgx-accent)] text-[var(--sgx-accent)]'
                        }`}
                      >
                        <option value="PENDING_REVIEW">EN REVISIÓN</option>
                        <option value="CONTACTED">CONTACTADO</option>
                        <option value="APPROVED">APROBADO</option>
                        <option value="DECLINED">RECHAZADO</option>
                      </select>

                      <button
                        onClick={() => handleDeleteInquiry(inq.id)}
                        className="p-1 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-black transition-all rounded"
                        title="Eliminar Lead"
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
                      <span className="text-slate-500 text-[10px] block">Tier & Presupuesto:</span>
                      <span className="font-bold text-[var(--sgx-accent)]">{inq.selectedTierName}</span>
                      {inq.estimatedBudget && <span className="text-slate-400 block text-[10px]">Est: {inq.estimatedBudget}</span>}
                    </div>
                  </div>

                  {inq.websiteUrl && (
                    <div className="text-[11px] flex items-center space-x-1 text-slate-400">
                      <Globe className="w-3 h-3 text-[var(--sgx-neon)]" />
                      <span>Web:</span>
                      <a href={inq.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[var(--sgx-neon)] hover:underline">
                        {inq.websiteUrl}
                      </a>
                    </div>
                  )}

                  {inq.goals.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {inq.goals.map((g, gIdx) => (
                        <span key={gIdx} className="px-1.5 py-0.5 bg-[#1b1b1b] border border-[var(--sgx-secondary)] text-[9px] text-[var(--sgx-neon)] rounded">
                          • {g}
                        </span>
                      ))}
                    </div>
                  )}

                  {inq.customMessage && (
                    <div className="p-2.5 bg-[#101010] border border-[var(--sgx-secondary)]/60 text-[11px] text-slate-300 italic rounded">
                      "{inq.customMessage}"
                    </div>
                  )}

                  <div className="text-[9px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Recibido: {new Date(inq.submittedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: SESSIONS CRUD */}
      {activeTab === 'SESSIONS' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                GESTIÓN DE AGENDA Y SESIONES ({sessions.length})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Organiza las ponencias, paneles y presentaciones por día y pilar temático.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <TabCsvDirectActions
                entityKey="SESSIONS"
                items={sessions}
                onUpdateItems={onUpdateSessions}
              />
              <button
                onClick={handleNewSession}
                className="sgx-btn text-xs font-bold py-1.5 px-4 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>AÑADIR SESIÓN</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {sessions.map((sess) => (
              <div 
                key={sess.id}
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0 font-mono">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 bg-[var(--sgx-neon)]/20 text-[var(--sgx-neon)] text-[10px] font-bold">
                      Día {sess.day} • {sess.startTime}
                    </span>
                    <span className="text-slate-400 text-[10px]">{sess.pillarId}</span>
                  </div>
                  <h4 className="font-bold text-white truncate mt-0.5">{sess.title}</h4>
                  <p className="text-[10px] text-slate-400 truncate">{sess.venueLocation}</p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingSession(sess)}
                    className="p-1.5 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteSession(sess.id)}
                    className="p-1.5 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: SPEAKERS CRUD */}
      {activeTab === 'SPEAKERS' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-3">
            <div>
              <h3 className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
                DIRECTORIO DE SPEAKERS & PROGRAMA GUILD ({speakers.length})
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Speakers, artistas y ponentes con sincronización en Firestore y subida de imágenes comprimidas (&lt; 1MB).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <TabCsvDirectActions
                entityKey="SPEAKERS"
                items={speakers}
                onUpdateItems={onUpdateSpeakers}
              />
              <button
                onClick={() => setIsSpeakerPortalOpen(true)}
                className="bg-black/80 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black transition-colors text-xs font-bold py-1.5 px-3 flex items-center space-x-1.5 font-mono"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>PORTAL DE SPEAKER (AUTO-REGISTRO)</span>
              </button>
              <button
                onClick={handleNewSpeaker}
                className="sgx-btn text-xs font-bold py-1.5 px-4 flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>AÑADIR SPEAKER</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {speakers.map((spk) => (
              <div 
                key={spk.id}
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-center justify-between gap-3 text-xs"
              >
                <img src={spk.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + spk.id} alt={spk.name} className="w-10 h-10 rounded-full object-cover border border-[var(--sgx-secondary)]" />
                <div className="flex-1 min-w-0 font-mono">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-white truncate">{spk.name}</span>
                    {spk.isAwakenInitiate && (
                      <span className="text-[8px] px-1 bg-amber-900 text-amber-200">SGX GUILD SYSTEM</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[var(--sgx-accent)] truncate">{spk.role}</div>
                  <div className="text-[10px] text-slate-400 truncate">{spk.organization}</div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingSpeaker(spk)}
                    className="p-1.5 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteSpeaker(spk.id)}
                    className="p-1.5 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: MAP NODES CRUD */}
      {activeTab === 'MAP_NODES' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-3">
            <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
              NODOS DEL MAPA 360° & FOTOESFERAS ({mapNodes.length})
            </span>
            <TabCsvDirectActions
              entityKey="MAP_NODES"
              items={mapNodes}
              onUpdateItems={onUpdateMapNodes}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto">
            {mapNodes.map((node) => (
              <div 
                key={node.id}
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-start space-x-3 text-xs"
              >
                <img src={node.thumbnailUrl || "https://via.placeholder.com/150"} alt={node.title} className="w-14 h-14 object-cover border border-[var(--sgx-secondary)]" />
                <div className="flex-1 min-w-0 font-mono">
                  <span className="font-bold text-white block truncate">{node.title}</span>
                  <span className="text-[10px] text-[var(--sgx-neon)] block">{node.areaName}</span>
                  <span className="text-[9px] text-slate-400 block truncate">{node.locationLabel}</span>
                  <span className="text-[8px] text-slate-500 block">{node.hotspots.length} Puntos de Interés</span>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingMapNode(node)}
                    className="p-1.5 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: EMBEDS CRUD */}
      {activeTab === 'EMBEDS' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-3">
            <span className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
              EXPERIENCIAS EMBEBIDAS, WEBAPPS & JUEGOS ({embeds.length})
            </span>
            <div className="flex items-center space-x-2">
              <TabCsvDirectActions
                entityKey="EMBEDS"
                items={embeds}
                onUpdateItems={onUpdateEmbeds}
              />
              <button
                onClick={() => {
                  const newEmb: EmbedWidget = {
                    id: `embed_${Date.now()}`,
                    title: 'Nueva Experiencia Espacial Embebida',
                    category: 'WEBAPP',
                    description: 'Descripción de la experiencia interactiva.',
                    thumbnailUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=600&auto=format&fit=crop&q=80',
                    author: 'Spatialgineers Dev',
                    tags: ['Interactive', 'WebXR'],
                  };
                  setEditingEmbed(newEmb);
                }}
                className="sgx-btn-cyan px-3 py-1.5 text-xs font-bold font-mono flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>AÑADIR EMBED / WIDGET</span>
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {embeds.map((emb) => (
              <div 
                key={emb.id}
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-center justify-between gap-3 text-xs"
              >
                <img src={emb.thumbnailUrl || "https://via.placeholder.com/150"} alt={emb.title} className="w-12 h-12 object-cover border border-[var(--sgx-secondary)]" />
                <div className="flex-1 min-w-0 font-mono">
                  <span className="font-bold text-white truncate block">{emb.title}</span>
                  <span className="text-[10px] text-[var(--sgx-neon)] uppercase">{emb.category}</span>
                  <p className="text-[10px] text-slate-400 truncate">{emb.description}</p>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => setEditingEmbed(emb)}
                    className="p-1.5 border border-[var(--sgx-neon)] text-[var(--sgx-neon)]"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleDeleteEmbed(emb.id)}
                    className="p-1.5 border border-rose-500 text-rose-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: SPONSORS TIERS */}
      {activeTab === 'SPONSORS' && (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 space-y-4">
          <div className="border-b border-[var(--sgx-secondary)]/60 pb-3">
            <h3 className="text-xs font-bold text-white uppercase font-['Orbitron',sans-serif]">
              PAQUETES & TIERS DE PATROCINIO (OPERATIONAL BIBLE PART 5)
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Patrocinios nativos integrados en minijuegos, overlays y plataforma anual.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sponsors.map((tier) => (
              <div key={tier.id} className="p-4 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] space-y-2 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                    TIER {tier.tierNumber}: {tier.name}
                  </span>
                  <span className="text-xs font-mono font-bold text-[var(--sgx-accent)]">{tier.priceRange}</span>
                </div>
                <div className="text-xs text-[var(--sgx-neon)] font-mono">{tier.keyBenefit}</div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  {tier.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EDIT APPROVED SPONSOR SHOWCASE MODAL */}
      {editingApprovedSponsor && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-neon)] max-w-2xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                EDITAR BRAND SHOWCASE & LANDING DE PATROCINADOR
              </span>
              <button onClick={() => setEditingApprovedSponsor(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
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
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">URL de Logo (PNG/SVG Transparente)</label>
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
                onClick={() => handleSaveApprovedSponsor(editingApprovedSponsor)}
                className="sgx-btn text-xs font-bold px-5 py-2 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR BRAND SHOWCASE</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SESSION EDIT MODAL */}
      {editingSession && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <div>
                <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                  EDITAR / CREAR SESIÓN DE AGENDA
                </span>
                <p className="text-[10px] text-slate-400 font-mono">
                  Sincronizado con base de datos de Firestore y agenda interactiva
                </p>
              </div>
              <button onClick={() => setEditingSession(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Título de la Sesión</label>
                <input
                  type="text"
                  value={editingSession.title}
                  onChange={(e) => setEditingSession({ ...editingSession, title: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Subtítulo / Tema Principal</label>
                <input
                  type="text"
                  value={editingSession.subtitle || ''}
                  onChange={(e) => setEditingSession({ ...editingSession, subtitle: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  placeholder="Ej. Inmersión Holística y Renderizado de Audio Espacial"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Día del Summit</label>
                  <select
                    value={editingSession.day}
                    onChange={(e) => {
                      const newDay = Number(e.target.value) as 1 | 2 | 3;
                      const dateStr = newDay === 1 ? 'Dec 11, 2026' : newDay === 2 ? 'Dec 12, 2026' : 'Dec 13, 2026';
                      setEditingSession({ ...editingSession, day: newDay, dateStr });
                    }}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white"
                  >
                    <option value={1}>Día 1: Vie 11 Dic (Virtual / Roblox)</option>
                    <option value={2}>Día 2: Sáb 12 Dic (Virtual / SGX Guild)</option>
                    <option value={3}>Día 3: Dom 13 Dic (Híbrido / Chroma Space)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Pilar Temático</label>
                  <select
                    value={editingSession.pillarId}
                    onChange={(e) => setEditingSession({ ...editingSession, pillarId: e.target.value as any })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white"
                  >
                    <option value="SGX.STORY">SGX.STORY (Narrativa & Lore)</option>
                    <option value="SGX.SHOWCASE">SGX.SHOWCASE (Showcases 3D)</option>
                    <option value="SGX.SPARK">SGX.SPARK (Educación & Guild)</option>
                    <option value="SGX.STAGE">SGX.STAGE (Conciertos & Media)</option>
                    <option value="SGX.SYSTEM">SGX.SYSTEM (IA & Arquitectura)</option>
                    <option value="SGX.SYNTHESIZE">SGX.SYNTHESIZE (Audio Espacial)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Formato</label>
                  <select
                    value={editingSession.format}
                    onChange={(e) => setEditingSession({ ...editingSession, format: e.target.value as any })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white"
                  >
                    <option value="DIGITAL">DIGITAL (Streaming 4K)</option>
                    <option value="HYBRID">HÍBRIDO (Presencial + Online)</option>
                    <option value="PHYSICAL">PRESENCIAL (Chroma Space)</option>
                    <option value="ROBLOX_STREAM">ROBLOX LIVE EVENT</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Hora Inicio</label>
                  <input
                    type="text"
                    value={editingSession.startTime}
                    onChange={(e) => setEditingSession({ ...editingSession, startTime: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                    placeholder="10:00 AM"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1">Hora Fin</label>
                  <input
                    type="text"
                    value={editingSession.endTime}
                    onChange={(e) => setEditingSession({ ...editingSession, endTime: e.target.value })}
                    className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                    placeholder="10:45 AM"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Ubicación / Stage</label>
                <input
                  type="text"
                  value={editingSession.venueLocation}
                  onChange={(e) => setEditingSession({ ...editingSession, venueLocation: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  placeholder="Chroma Space Studios / YouTube 4K"
                />
              </div>

              {/* SPEAKERS / ARTISTS INTEGRATED PICKER */}
              <div className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/80 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-[var(--sgx-neon)] uppercase font-bold flex items-center space-x-1">
                    <Sparkles className="w-3 h-3" />
                    <span>SPEAKERS & ARTISTAS ASIGNADOS ({editingSession.speakerIds.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSpeakerPortalOpen(true)}
                    className="text-[10px] text-[var(--sgx-accent)] hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Registrar Nuevo Speaker</span>
                  </button>
                </div>

                {/* Selected speakers chips */}
                {editingSession.speakerIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pb-1">
                    {editingSession.speakerIds.map((sId) => {
                      const spk = speakers.find((s) => s.id === sId);
                      return (
                        <div
                          key={sId}
                          className="flex items-center space-x-1.5 px-2 py-1 bg-[var(--sgx-neon)]/15 border border-[var(--sgx-neon)]/50 rounded text-[11px] text-white"
                        >
                          <img
                            src={spk?.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + sId}
                            alt={spk?.name || sId}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span className="font-bold">{spk?.name || sId}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSession({
                                ...editingSession,
                                speakerIds: editingSession.speakerIds.filter((id) => id !== sId),
                              });
                            }}
                            className="text-slate-400 hover:text-rose-400 font-bold ml-1"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Speaker search filter */}
                <input
                  type="text"
                  placeholder="Buscar speaker por nombre o colectivo..."
                  value={speakerSearchTermInModal}
                  onChange={(e) => setSpeakerSearchTermInModal(e.target.value)}
                  className="w-full bg-black/50 border border-[var(--sgx-secondary)]/60 px-2 py-1 text-[11px] text-white focus:outline-none"
                />

                {/* Speaker selection list */}
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {speakers
                    .filter((spk) =>
                      speakerSearchTermInModal === '' ||
                      spk.name.toLowerCase().includes(speakerSearchTermInModal.toLowerCase()) ||
                      spk.role.toLowerCase().includes(speakerSearchTermInModal.toLowerCase()) ||
                      spk.organization.toLowerCase().includes(speakerSearchTermInModal.toLowerCase())
                    )
                    .map((spk) => {
                      const isSelected = editingSession.speakerIds.includes(spk.id);
                      return (
                        <div
                          key={spk.id}
                          onClick={() => {
                            if (isSelected) {
                              setEditingSession({
                                ...editingSession,
                                speakerIds: editingSession.speakerIds.filter((id) => id !== spk.id),
                              });
                            } else {
                              setEditingSession({
                                ...editingSession,
                                speakerIds: [...editingSession.speakerIds, spk.id],
                              });
                            }
                          }}
                          className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors text-[11px] ${
                            isSelected
                              ? 'bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)]'
                              : 'bg-black/30 border border-[var(--sgx-secondary)]/30 hover:border-[var(--sgx-secondary)]'
                          }`}
                        >
                          <div className="flex items-center space-x-2 truncate">
                            <img
                              src={spk.avatarUrl || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + spk.id}
                              alt={spk.name}
                              className="w-5 h-5 rounded-full object-cover shrink-0"
                            />
                            <div className="truncate">
                              <span className="font-bold text-white block truncate">{spk.name}</span>
                              <span className="text-[9px] text-slate-400 block truncate">{spk.role} • {spk.organization}</span>
                            </div>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded shrink-0 ${
                              isSelected ? 'bg-[var(--sgx-neon)] text-black' : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            {isSelected ? '✓ SELECCIONADO' : '+ ASIGNAR'}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Descripción</label>
                <textarea
                  value={editingSession.description}
                  onChange={(e) => setEditingSession({ ...editingSession, description: e.target.value })}
                  rows={3}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--sgx-secondary)]">
              <button
                onClick={() => setEditingSession(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveSession(editingSession)}
                className="sgx-btn text-xs font-bold px-5 py-2 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR SESIÓN EN AGENDA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SPEAKER EDIT MODAL */}
      {editingSpeaker && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                EDITAR / CREAR SPEAKER & INITIATE
              </span>
              <button onClick={() => setEditingSpeaker(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={editingSpeaker.name}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, name: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Rol / Especialidad</label>
                <input
                  type="text"
                  value={editingSpeaker.role}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, role: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Organización / Colectivo</label>
                <input
                  type="text"
                  value={editingSpeaker.organization}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, organization: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">URL de Avatar / Foto</label>
                <input
                  type="text"
                  value={editingSpeaker.avatarUrl}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, avatarUrl: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Biografía</label>
                <textarea
                  value={editingSpeaker.bio}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, bio: e.target.value })}
                  rows={3}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="chkAwaken"
                  checked={editingSpeaker.isAwakenInitiate || false}
                  onChange={(e) => setEditingSpeaker({ ...editingSpeaker, isAwakenInitiate: e.target.checked })}
                  className="cursor-pointer"
                />
                <label htmlFor="chkAwaken" className="text-slate-300 text-xs cursor-pointer">
                  Es miembro o candidato del SGX Guild System (SGX Ranked Trials)
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--sgx-secondary)]">
              <button
                onClick={() => setEditingSpeaker(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveSpeaker(editingSpeaker)}
                className="sgx-btn text-xs font-bold px-5 py-2 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR SPEAKER</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EMBED EDIT MODAL */}
      {editingEmbed && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-neon)] max-w-xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
              <span className="text-sm font-bold text-white uppercase font-['Orbitron',sans-serif]">
                EDITAR / CREAR EMBED & JUEGO
              </span>
              <button onClick={() => setEditingEmbed(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Título</label>
                <input
                  type="text"
                  value={editingEmbed.title}
                  onChange={(e) => setEditingEmbed({ ...editingEmbed, title: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Categoría</label>
                <select
                  value={editingEmbed.category}
                  onChange={(e) => setEditingEmbed({ ...editingEmbed, category: e.target.value as any })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white"
                >
                  <option value="MINI_GAME">Minijuego</option>
                  <option value="METAVERSE_ROBLOX">Roblox Space</option>
                  <option value="WEBGL_XR">WebGL / WebXR</option>
                  <option value="WEBAPP">WebApp / Iframe</option>
                  <option value="CUSTOM_CODE">Código Personalizado (HTML/JS)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">URL Externa</label>
                <input
                  type="text"
                  value={editingEmbed.externalUrl || ''}
                  onChange={(e) => setEditingEmbed({ ...editingEmbed, externalUrl: e.target.value })}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white focus:outline-none"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1">Código HTML Personalizado (Opcional)</label>
                <textarea
                  value={editingEmbed.customCode || ''}
                  onChange={(e) => setEditingEmbed({ ...editingEmbed, customCode: e.target.value })}
                  rows={4}
                  className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white font-mono text-xs focus:outline-none"
                  placeholder="<!DOCTYPE html><html>...</html>"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--sgx-secondary)]">
              <button
                onClick={() => setEditingEmbed(null)}
                className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white"
              >
                CANCELAR
              </button>
              <button
                onClick={() => handleSaveEmbed(editingEmbed)}
                className="sgx-btn text-xs font-bold px-5 py-2 flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>GUARDAR EMBED</span>
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

      {/* SPEAKER & ARTIST SELF-SERVICE PORTAL MODAL */}
      <SummitSpeakerPortalModal
        isOpen={isSpeakerPortalOpen}
        onClose={() => setIsSpeakerPortalOpen(false)}
        onSpeakerRegistered={(newSpeaker) => {
          const updated = [...speakers, newSpeaker];
          onUpdateSpeakers(updated);
          showStatus(`¡Speaker "${newSpeaker.name}" registrado con éxito y sincronizado en Firestore!`);
        }}
      />

    </div>
  );
};
