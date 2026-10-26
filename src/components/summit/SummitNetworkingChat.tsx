import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Users, 
  Hash, 
  Sparkles, 
  Pin, 
  ShieldCheck, 
  Search, 
  Filter,
  ExternalLink,
  Radio,
  Globe,
  ChevronDown,
  ArrowRight,
  Flame,
  Rocket,
  Heart,
  ThumbsUp,
  Volume2,
  VolumeX,
  Share2,
  Code,
  HelpCircle,
  Award,
  MapPin,
  Briefcase,
  CheckCircle2,
  X
} from 'lucide-react';
import { ChatMessage, AttendeeProfile, SummitPillarId } from '../../types/summit';
import { INITIAL_CHAT_MESSAGES, INITIAL_ATTENDEE_PROFILES, playNotificationChime } from '../../lib/summitData';
import { db } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useTenantTheme } from '../../context/TenantThemeContext';

export interface ForumChannel {
  id: string;
  name: string;
  topic: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  badge: string;
  pillar?: SummitPillarId;
  readOnly?: boolean;
}

const PUBLIC_FORUM_CHANNELS: ForumChannel[] = [
  { 
    id: '#general', 
    name: 'Debate General del Summit', 
    topic: 'Conversación global y bienvenida a todos los participantes', 
    desc: 'Espacio abierto para comentar impresiones, expectativas y reflexiones generales sobre el Spatialgineers Summit 2026.',
    icon: Hash, 
    color: 'text-[var(--sgx-neon)]',
    badge: 'PRINCIPAL'
  },
  { 
    id: '#anuncios-oficiales', 
    name: 'Anuncios Oficiales & Producción', 
    topic: 'Avisos oficiales de horarios, links de transmisión y dinámicas de los directores', 
    desc: 'Canal de comunicados emitidos por el equipo organizador de Spatialgineers, directores de producción y speakers.',
    icon: ShieldCheck, 
    color: 'text-amber-400',
    badge: 'OFICIAL'
  },
  { 
    id: '#stage-live', 
    name: 'Escenario & Transmisión en Vivo', 
    topic: 'Reacciones a la transmisión de YouTube Live y a los artistas invitados', 
    desc: 'Comenta en directo lo que está ocurriendo en el escenario principal, las transiciones visuales y los sets de los artistas.',
    icon: Radio, 
    color: 'text-rose-400',
    badge: 'EN VIVO'
  },
  { 
    id: '#preguntas-a-speakers', 
    name: 'Preguntas & Respuestas (Q&A)', 
    topic: 'Preguntas de la audiencia para los paneles y keynotes de los 6 pilares', 
    desc: 'Publica tus dudas para que los moderadores las seleccionen durante las rondas de Q&A en vivo de cada charla.',
    icon: HelpCircle, 
    color: 'text-[#FDCC0D]',
    badge: 'Q&A'
  },
  { 
    id: '#sgx-guild-trials', 
    name: 'SGX Guild Trials & Proyectos', 
    topic: 'Portafolios de los 8 Initiates (Día 1) y SGX Guild Ranked Trials Pitch Session (Día 3)', 
    desc: 'Espacio dedicado a comentar los portafolios de los Initiates y compartir feedback sobre sus presentaciones en vivo.',
    icon: Award, 
    color: 'text-[#FDCC0D]',
    badge: 'GUILD'
  },
  { 
    id: '#workshops-y-codigo', 
    name: 'Workshops, WebGL & Código', 
    topic: 'Dudas técnicas, Three.js, shaders GLSL, WebXR y arquitectura en la nube', 
    desc: 'Comparte snippets, recursos y resuelve dudas técnicas de los workshops y demostraciones prácticas del evento.',
    icon: Code, 
    color: 'text-cyan-400',
    badge: 'TECH'
  },
  { 
    id: '#matchmaking-proyectos', 
    name: 'Colaboración & Matchmaking', 
    topic: 'Búsqueda de colaboradores, ofertas y alianzas para proyectos de computación espacial', 
    desc: 'Preséntate, muestra tu portafolio y conecta con otros desarrolladores, diseñadores o marcas para futuros proyectos.',
    icon: Users, 
    color: 'text-[#FDCC0D]',
    badge: 'NETWORKING'
  },
  { 
    id: '#venue-san-juan', 
    name: 'SGX Showcase · Día 3 (San Juan, PR)', 
    topic: 'Logística del Día 3 en Chroma Space Studios (por invitación)', 
    desc: 'Foro para las personas invitadas al SGX Showcase del Día 3 en San Juan: puntos de encuentro, transporte y agenda presencial.',
    icon: MapPin, 
    color: 'text-[#FDCC0D]',
    badge: 'SAN JUAN'
  }
];

interface SummitNetworkingChatProps {
  currentUser?: {
    id: string;
    name: string;
    avatar: string;
    role?: string;
  };
}

export const SummitNetworkingChat: React.FC<SummitNetworkingChatProps> = ({
  currentUser: propUser
}) => {
  const { user: authUser } = useAuth();
  const { tenant } = useTenantTheme();

  const currentUser = {
    id: propUser?.id || authUser?.uid || 'user_attendee_live',
    name: propUser?.name || authUser?.displayName || authUser?.email?.split('@')[0] || 'Asistente Spatialgineer',
    avatar: propUser?.avatar || authUser?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
    role: propUser?.role || 'ATTENDEE'
  };

  const [activeTab, setActiveTab] = useState<'FORUMS' | 'COMMUNITY_ROSTER'>('FORUMS');
  const [activeChannelId, setActiveChannelId] = useState<string>('#general');
  const [selectedAttendeeProfile, setSelectedAttendeeProfile] = useState<AttendeeProfile | null>(null);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('sgx_summit_chat_messages');
      return saved ? JSON.parse(saved) : INITIAL_CHAT_MESSAGES;
    } catch {
      return INITIAL_CHAT_MESSAGES;
    }
  });

  const [inputText, setInputText] = useState<string>('');
  const [attendees] = useState<AttendeeProfile[]>(INITIAL_ATTENDEE_PROFILES);
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<SummitPillarId | 'ALL'>('ALL');
  const [attendeeSearch, setAttendeeSearch] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Firestore Real-time Listener for Live Public Forums
  useEffect(() => {
    try {
      const chatRef = collection(db, 'chat_messages');
      const q = query(chatRef, orderBy('timestamp', 'asc'), limit(300));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setIsLiveConnected(true);
          if (!snapshot.empty) {
            const firestoreMsgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                channelId: data.channelId || '#general',
                senderId: data.senderId || 'anon',
                senderName: data.senderName || 'Asistente',
                senderAvatar: data.senderAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
                senderRole: data.senderRole || 'ATTENDEE',
                text: data.text || '',
                timestamp: data.timestamp || Date.now(),
                reactions: data.reactions || {},
                isPinned: Boolean(data.isPinned)
              };
            });

            // Merge with default seed messages so all forums start lively
            const seenIds = new Set<string>();
            const merged: ChatMessage[] = [];

            firestoreMsgs.forEach((msg) => {
              seenIds.add(msg.id);
              merged.push(msg);
            });

            INITIAL_CHAT_MESSAGES.forEach((seed) => {
              if (!seenIds.has(seed.id)) {
                merged.push(seed);
              }
            });

            merged.sort((a, b) => a.timestamp - b.timestamp);
            setMessages(merged);

            try {
              localStorage.setItem('sgx_summit_chat_messages', JSON.stringify(merged));
            } catch {}
          }
        },
        (err) => {
          console.warn('Firestore live forum fallback to local cache:', err);
          setIsLiveConnected(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore chat listener setup error:', e);
      setIsLiveConnected(false);
    }
  }, []);

  const currentChannel = PUBLIC_FORUM_CHANNELS.find(c => c.id === activeChannelId) || PUBLIC_FORUM_CHANNELS[0];
  const CurrentChannelIcon = currentChannel.icon;

  // Filter messages for active channel + search query
  const channelMessages = messages.filter(m => m.channelId === activeChannelId);
  const displayedMessages = channelMessages.filter(m => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return m.text.toLowerCase().includes(q) || m.senderName.toLowerCase().includes(q);
  });

  // Count messages per channel
  const getChannelMessageCount = (chId: string) => {
    return messages.filter(m => m.channelId === chId).length;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayedMessages.length, activeChannelId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const trimmedText = inputText.trim();
    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const newMsg: ChatMessage = {
      id: tempId,
      channelId: activeChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderRole: (currentUser.role as any) || 'ATTENDEE',
      text: trimmedText,
      timestamp: Date.now(),
      reactions: {}
    };

    // Optimistic local update
    const updated = [...messages, newMsg];
    setMessages(updated);
    try {
      localStorage.setItem('sgx_summit_chat_messages', JSON.stringify(updated));
    } catch {}
    setInputText('');

    if (soundEnabled) {
      playNotificationChime();
    }

    // Push to Firestore live collection
    try {
      await addDoc(collection(db, 'chat_messages'), {
        channelId: activeChannelId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        senderRole: (currentUser.role as any) || 'ATTENDEE',
        text: trimmedText,
        timestamp: Date.now(),
        reactions: {}
      });
    } catch (err) {
      console.warn('Firestore live message send fallback to local cache:', err);
    }
  };

  const handleAddReaction = async (msgId: string, emoji: string) => {
    setMessages(prev => prev.map(m => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        reactions[emoji] = (reactions[emoji] || 0) + 1;
        return { ...m, reactions };
      }
      return m;
    }));

    if (soundEnabled) {
      playNotificationChime();
    }

    try {
      if (!msgId.startsWith('msg_') && !msgId.startsWith('chat_seed_')) {
        const msgDocRef = doc(db, 'chat_messages', msgId);
        await updateDoc(msgDocRef, {
          [`reactions.${emoji}`]: increment(1)
        });
      }
    } catch (err) {
      console.warn('Firestore reaction update fallback:', err);
    }
  };

  // Filter Attendees for Roster Tab
  const filteredAttendees = attendees.filter(att => {
    if (selectedPillarFilter !== 'ALL' && !att.pillars.includes(selectedPillarFilter)) return false;
    if (attendeeSearch.trim()) {
      const q = attendeeSearch.toLowerCase();
      const matchName = att.name.toLowerCase().includes(q);
      const matchTitle = att.title.toLowerCase().includes(q);
      const matchCompany = att.company.toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchCompany) return false;
    }
    return true;
  });

  return (
    <div className="bg-[var(--sgx-card-bg)] border-2 border-[var(--sgx-secondary)] rounded-2xl flex flex-col md:flex-row min-h-[620px] h-[82vh] md:h-[720px] overflow-hidden shadow-2xl">
      
      {/* 1. Mobile Top Channel Bar (Only visible on < md screens) */}
      <div className="md:hidden bg-[#121212] border-b border-[var(--sgx-secondary)] shrink-0 flex flex-col">
        
        {/* Mobile Header Bar */}
        <div className="p-3 flex items-center justify-between border-b border-[var(--sgx-secondary)]/40 bg-[var(--sgx-card-bg)]">
          <div className="flex items-center space-x-2">
            <CurrentChannelIcon className={`w-4 h-4 ${currentChannel.color}`} />
            <div className="text-left">
              <span className="text-[9px] text-slate-400 block font-mono">FORO PÚBLICO</span>
              <span className="text-xs font-bold text-white font-mono uppercase truncate max-w-[170px] block leading-none">
                {activeTab === 'COMMUNITY_ROSTER' ? 'DIRECTORIO COMUNIDAD' : currentChannel.name}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-1.5 border text-xs ${soundEnabled ? 'text-[var(--sgx-neon)] border-[var(--sgx-neon)]/50' : 'text-slate-500 border-slate-700'}`}
              title={soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === 'COMMUNITY_ROSTER' ? 'FORUMS' : 'COMMUNITY_ROSTER')}
              className={`px-2.5 py-1 text-[10px] font-mono font-bold border transition-colors ${
                activeTab === 'COMMUNITY_ROSTER'
                  ? 'bg-[var(--sgx-accent)] text-black border-[var(--sgx-accent)]'
                  : 'bg-[var(--sgx-bg)] text-slate-300 border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]'
              }`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              {activeTab === 'COMMUNITY_ROSTER' ? '💬 VER FOROS' : `👥 COMUNIDAD (${attendees.length})`}
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Scrollable Channel Chips */}
        {activeTab === 'FORUMS' && (
          <div className="flex items-center space-x-2 px-3 py-2.5 overflow-x-auto no-scrollbar bg-[#161616]">
            {PUBLIC_FORUM_CHANNELS.map((ch) => {
              const isActive = activeChannelId === ch.id;
              const Icon = ch.icon;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    setActiveChannelId(ch.id);
                    setActiveTab('FORUMS');
                  }}
                  className={`px-3 py-1.5 text-xs font-mono font-bold whitespace-nowrap flex items-center space-x-1.5 shrink-0 transition-all ${
                    isActive
                      ? 'bg-[var(--sgx-neon)] text-black shadow-md shadow-[var(--sgx-neon)]/20'
                      : 'bg-[var(--sgx-bg)] text-slate-400 border border-[var(--sgx-secondary)]/80 hover:text-white'
                  }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-black' : ch.color}`} />
                  <span>{ch.id}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. Desktop Left Sidebar: Public Thematic Channels & Community Directory */}
      <div className="hidden md:flex w-80 bg-[#151515] border-r border-[var(--sgx-secondary)] flex-col justify-between shrink-0">
        
        {/* Top Header & Tabs */}
        <div>
          <div className="p-3 bg-[var(--sgx-card-bg)] border-b border-[var(--sgx-secondary)]/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-[var(--sgx-neon)]" />
              <div>
                <h3 className="font-extrabold text-xs text-white font-['Orbitron',sans-serif] uppercase">
                  FOROS DEL SUMMIT
                </h3>
                <span className="text-[9px] text-slate-400 font-mono">Discusión 100% Pública</span>
              </div>
            </div>

            <button
              onClick={() => setSoundEnabled(prev => !prev)}
              className={`p-1 border text-xs transition-colors ${soundEnabled ? 'text-[var(--sgx-neon)] border-[var(--sgx-neon)]/50' : 'text-slate-500 border-slate-700'}`}
              title={soundEnabled ? 'Silenciar sonidos' : 'Activar sonido'}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="p-2 border-b border-[var(--sgx-secondary)]/60 flex items-center space-x-1.5 font-mono text-[11px]">
            <button
              onClick={() => setActiveTab('FORUMS')}
              className={`flex-1 py-1.5 font-bold transition-all text-center ${
                activeTab === 'FORUMS' ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)]'
              }`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              CANALES ({PUBLIC_FORUM_CHANNELS.length})
            </button>
            <button
              onClick={() => setActiveTab('COMMUNITY_ROSTER')}
              className={`flex-1 py-1.5 font-bold transition-all text-center ${
                activeTab === 'COMMUNITY_ROSTER' ? 'bg-[var(--sgx-accent)] text-black font-extrabold shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)]'
              }`}
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              ASISTENTES ({attendees.length})
            </button>
          </div>
        </div>

        {/* Channels List / Forum Navigation */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {activeTab === 'FORUMS' ? (
            PUBLIC_FORUM_CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannelId === ch.id;
              const msgCount = getChannelMessageCount(ch.id);

              return (
                <button
                  key={ch.id}
                  onClick={() => { 
                    setActiveChannelId(ch.id); 
                    setActiveTab('FORUMS'); 
                  }}
                  className={`w-full text-left p-2.5 border transition-all flex items-start space-x-2.5 text-xs group ${
                    isActive
                      ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/15 text-white font-bold shadow-md shadow-[var(--sgx-neon)]/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#1D1D1D] hover:border-[var(--sgx-secondary)]/50'
                  }`}
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <div className={`p-1 rounded shrink-0 mt-0.5 ${isActive ? 'bg-[var(--sgx-neon)] text-black' : 'bg-black/60 text-slate-400 group-hover:text-white'}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate text-white font-semibold text-xs">{ch.name}</span>
                      <span className={`text-[8px] font-mono px-1 py-0.2 border rounded ml-1 ${isActive ? 'bg-black/80 text-[var(--sgx-neon)] border-[var(--sgx-neon)]/60' : 'bg-black/40 text-slate-400 border-[var(--sgx-secondary)]/40'}`}>
                        {ch.badge}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono truncate mt-0.5">{ch.topic}</div>
                  </div>
                </button>
              );
            })
          ) : (
            /* Community Roster list */
            <div className="space-y-1.5 p-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono px-1 block font-bold">
                Participantes Registrados:
              </span>
              {attendees.map((att) => (
                <div
                  key={att.id}
                  onClick={() => setSelectedAttendeeProfile(att)}
                  className="w-full text-left p-2 border border-transparent hover:border-[var(--sgx-secondary)] hover:bg-[var(--sgx-bg)] transition-all flex items-center space-x-2.5 text-xs cursor-pointer group"
                  style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                >
                  <div className="relative shrink-0">
                    <img 
                      src={att.avatar} 
                      alt={att.name} 
                      className="w-8 h-8 object-cover border border-[var(--sgx-secondary)]" 
                      style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                    />
                    {att.isOnline && <div className="w-2 h-2 bg-[#FDCC0D] absolute bottom-0 right-0 border border-[#151515]" />}
                  </div>
                  <div className="truncate flex-1">
                    <div className="font-bold truncate text-white group-hover:text-[var(--sgx-neon)]">{att.name}</div>
                    <div className="text-[10px] text-slate-400 truncate font-mono">{att.title}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current User Info Footer */}
        <div className="p-3 bg-[var(--sgx-card-bg)] border-t border-[var(--sgx-secondary)]/60 flex items-center space-x-3">
          <img 
            src={currentUser.avatar} 
            alt={currentUser.name} 
            className="w-8 h-8 object-cover border border-[var(--sgx-neon)] shrink-0" 
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          />
          <div className="truncate text-left flex-1 min-w-0">
            <span className="text-xs font-bold text-white block truncate">{currentUser.name}</span>
            <span className="text-[10px] text-[#FDCC0D] font-mono flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-[#FDCC0D] animate-pulse rounded-full" />
              <span>Conectado al Foro Público</span>
            </span>
          </div>
        </div>

      </div>

      {/* 3. Main Forum Feed & Discussion Area */}
      <div className="flex-1 flex flex-col justify-between overflow-hidden bg-[#0d0d0d]">
        
        {activeTab === 'COMMUNITY_ROSTER' ? (
          /* Public Community Directory (No DMs, only public bios & pillars) */
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)]/60 pb-4">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white uppercase font-['Orbitron',sans-serif]">
                  DIRECTORIO PÚBLICO DE ASISTENTES & CREADORES
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Conoce a los creadores, ponentes e ingenieros espaciales que participan en los foros del Summit 2026.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center space-x-2">
                <select
                  value={selectedPillarFilter}
                  onChange={(e) => setSelectedPillarFilter(e.target.value as any)}
                  className="bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  <option value="ALL">TODOS LOS PILARES</option>
                  <option value="SGX.STORY">SGX.STORY</option>
                  <option value="SGX.SHOWCASE">SGX.SHOWCASE</option>
                  <option value="SGX.SPARK">SGX.SPARK</option>
                  <option value="SGX.STAGE">SGX.STAGE</option>
                  <option value="SGX.SYSTEM">SGX.SYSTEM</option>
                  <option value="SGX.SYNTHESIZE">SGX.SYNTHESIZE</option>
                </select>
              </div>
            </div>

            {/* Attendees Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {filteredAttendees.map((att) => (
                <div 
                  key={att.id}
                  className="p-4 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)]/80 hover:border-[var(--sgx-neon)] transition-all flex flex-col justify-between space-y-3 shadow-lg"
                  style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 100%)' }}
                >
                  <div className="flex items-start space-x-3.5">
                    <img 
                      src={att.avatar} 
                      alt={att.name} 
                      className="w-12 h-12 object-cover border-2 border-[var(--sgx-neon)] shrink-0" 
                      style={{ clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white truncate font-['Orbitron',sans-serif]">{att.name}</h4>
                        <span 
                          className="text-[9px] px-2 py-0.5 bg-[var(--sgx-secondary)]/50 text-[var(--sgx-neon)] font-mono uppercase font-bold"
                          style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                        >
                          {att.ticketType.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--sgx-accent)] font-mono mt-0.5">{att.title} • {att.company}</div>
                      <p className="text-xs text-slate-300 mt-2 leading-relaxed line-clamp-2">{att.bio}</p>
                    </div>
                  </div>

                  {/* Pillars & Public Contribution Action */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--sgx-secondary)]/40">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      {att.pillars.map(p => (
                        <span 
                          key={p} 
                          className="text-[9px] font-mono px-1.5 py-0.5 bg-black border border-[var(--sgx-secondary)] text-slate-300"
                          style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                        >
                          {p.replace('SGX.', '')}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setActiveTab('FORUMS');
                        setActiveChannelId('#matchmaking-proyectos');
                        setInputText(`@${att.name} `);
                      }}
                      className="px-3 py-1.5 bg-[var(--sgx-bg)] hover:bg-[var(--sgx-neon)] hover:text-black border border-[var(--sgx-secondary)] text-xs font-mono font-bold text-slate-200 transition-colors flex items-center space-x-1.5"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      title="Mencionar en el foro público de matchmaking"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>MENCIONAR EN FORO</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Public Channel Forum View */
          <>
            {/* Desktop Forum Channel Top Header with Guideline Notice */}
            <div className="p-3 sm:p-4 bg-[var(--sgx-card-bg)] border-b border-[var(--sgx-secondary)] space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div 
                    className={`p-1.5 bg-black/60 border border-[var(--sgx-secondary)] ${currentChannel.color}`}
                    style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                  >
                    <CurrentChannelIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-wide">
                        {currentChannel.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 border border-[var(--sgx-secondary)] text-[var(--sgx-neon)] bg-black/50 rounded">
                        {currentChannel.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 font-mono hidden sm:block">
                      {currentChannel.desc}
                    </p>
                  </div>
                </div>

                {/* Firestore Real-Time Indicator & Search */}
                <div className="flex items-center space-x-2.5 text-[10px] text-slate-400 font-mono shrink-0">
                  <div 
                    className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-950/60 border border-[#FDCC0D]/50 text-[#FDCC0D]"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    <span className="w-2 h-2 bg-[#FDCC0D] animate-pulse rounded-full" />
                    <span className="font-bold">{isLiveConnected ? 'EN VIVO' : 'SIN CONEXIÓN · GUARDADO LOCAL'}</span>
                  </div>
                  <span className="hidden lg:inline">{displayedMessages.length} MENSAJES</span>
                </div>
              </div>

              {/* Forum Guidelines Callout */}
              <div className="px-3 py-1.5 bg-black/50 border border-[var(--sgx-secondary)]/60 text-[10px] text-slate-400 font-mono flex items-center justify-between gap-2 rounded">
                <div className="flex items-center space-x-1.5 truncate">
                  <Sparkles className="w-3.5 h-3.5 text-[#FDCC0D] shrink-0" />
                  <span className="text-slate-300 font-bold truncate">Regla del Foro:</span>
                  <span className="truncate">Todos los mensajes son públicos y visibles para todos los asistentes y conferencistas.</span>
                </div>
                <span className="text-[#FDCC0D] shrink-0 font-bold hidden sm:inline">100% Moderado</span>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
              {displayedMessages.length === 0 ? (
                <div className="text-center py-16 text-slate-500 font-mono text-xs max-w-sm mx-auto space-y-2">
                  <MessageSquare className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                  <p className="text-slate-300 font-bold text-sm font-['Orbitron',sans-serif]">FORO PÚBLICO DISPONIBLE</p>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Sé el primero en iniciar la conversación en el canal <span className="text-[var(--sgx-neon)] font-bold">{currentChannel.id}</span>. Tu mensaje será visible para todos los asistentes del Summit.
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isOfficial = msg.senderRole === 'ORGANIZER' || msg.senderRole === 'SPEAKER' || msg.senderRole === 'DIRECTOR';

                  return (
                    <div 
                      key={msg.id}
                      className={`flex items-start space-x-3 sm:space-x-3.5 ${isMe ? 'flex-row-reverse space-x-reverse' : ''}`}
                    >
                      {/* Avatar */}
                      <img 
                        src={msg.senderAvatar} 
                        alt={msg.senderName} 
                        className={`w-8 h-8 sm:w-9 sm:h-9 object-cover border shrink-0 mt-1 shadow-md ${
                          isOfficial ? 'border-amber-400' : 'border-[var(--sgx-secondary)]'
                        }`} 
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      />

                      <div className={`max-w-[85%] sm:max-w-[75%] space-y-1.5 ${isMe ? 'items-end text-right' : 'text-left'}`}>
                        
                        {/* Sender Name, Badge & Timestamp */}
                        <div className={`flex items-center space-x-2 text-[10px] sm:text-[11px] font-mono ${isMe ? 'justify-end' : ''}`}>
                          <span className="font-bold text-white tracking-wide">{msg.senderName}</span>
                          
                          {msg.senderRole && msg.senderRole !== 'ATTENDEE' && (
                            <span 
                              className={`px-1.5 py-0.5 text-[8px] font-bold border ${
                                isOfficial 
                                  ? 'bg-amber-500/20 border-amber-400 text-amber-300' 
                                  : 'bg-[var(--sgx-neon)]/20 border-[var(--sgx-neon)]/60 text-[var(--sgx-neon)]'
                              }`}
                              style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                            >
                              {msg.senderRole}
                            </span>
                          )}

                          {msg.isPinned && (
                            <span className="flex items-center space-x-0.5 text-amber-400 text-[9px] font-bold">
                              <Pin className="w-3 h-3 rotate-45" />
                              <span>FIJADO</span>
                            </span>
                          )}

                          <span className="text-slate-500 text-[10px]">
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Message Box */}
                        <div 
                          className={`p-3.5 text-xs sm:text-xs leading-relaxed shadow-md font-sans ${
                            isMe 
                              ? 'bg-[var(--sgx-neon)]/20 border border-[var(--sgx-neon)]/80 text-white' 
                              : isOfficial
                              ? 'bg-[#202020] border-2 border-amber-400/60 text-slate-100 shadow-amber-500/10'
                              : 'bg-[#1A1A1A] border border-[var(--sgx-secondary)] text-slate-200'
                          }`}
                          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
                        >
                          {msg.text}
                        </div>

                        {/* Public Reactions Bar */}
                        <div className={`flex items-center space-x-1.5 pt-0.5 ${isMe ? 'justify-end' : ''}`}>
                          {msg.reactions && Object.entries(msg.reactions).map(([emoji, count]) => (
                            <button
                              key={emoji}
                              onClick={() => handleAddReaction(msg.id, emoji)}
                              className="px-2 py-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 text-xs flex items-center space-x-1 shadow-sm transition-colors"
                              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                            >
                              <span>{emoji}</span>
                              <span className="font-bold font-mono text-[10px] text-white">{count}</span>
                            </button>
                          ))}
                          
                          {/* Quick Emoji Reaction Buttons */}
                          <button
                            onClick={() => handleAddReaction(msg.id, '🔥')}
                            className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)] text-xs transition-colors"
                            title="Reaccionar con 🔥"
                          >
                            🔥
                          </button>
                          <button
                            onClick={() => handleAddReaction(msg.id, '🚀')}
                            className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)] text-xs transition-colors"
                            title="Reaccionar con 🚀"
                          >
                            🚀
                          </button>
                          <button
                            onClick={() => handleAddReaction(msg.id, '💎')}
                            className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)] text-xs transition-colors"
                            title="Reaccionar con 💎"
                          >
                            💎
                          </button>
                          <button
                            onClick={() => handleAddReaction(msg.id, '👏')}
                            className="px-1.5 py-1 text-slate-400 hover:text-white hover:bg-[var(--sgx-bg)] text-xs transition-colors"
                            title="Reaccionar con 👏"
                          >
                            👏
                          </button>
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-[var(--sgx-card-bg)] border-t border-[var(--sgx-secondary)] flex items-center space-x-2.5">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Comenta públicamente en ${currentChannel.id}...`}
                className="flex-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] px-4 py-3 sm:py-2.5 min-h-[46px] text-xs sm:text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-[var(--sgx-neon)] shadow-inner"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="sgx-btn-cyan px-5 py-3 sm:py-2.5 min-h-[46px] text-xs font-bold font-mono flex items-center justify-center space-x-1.5 disabled:opacity-50 shrink-0 shadow-lg shadow-[var(--sgx-neon)]/20 transition-all hover:scale-105"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">PUBLICAR</span>
              </button>
            </form>
          </>
        )}

      </div>

      {/* Attendee Profile Quick Modal */}
      {selectedAttendeeProfile && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setSelectedAttendeeProfile(null)}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-[#151515] border-2 border-[var(--sgx-neon)] p-5 space-y-4 shadow-2xl font-mono text-xs"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <img 
                  src={selectedAttendeeProfile.avatar} 
                  alt={selectedAttendeeProfile.name} 
                  className="w-14 h-14 object-cover border-2 border-[var(--sgx-neon)]"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                />
                <div>
                  <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">{selectedAttendeeProfile.name}</h3>
                  <div className="text-[11px] text-[var(--sgx-accent)] font-bold">{selectedAttendeeProfile.title}</div>
                  <div className="text-[10px] text-slate-400">{selectedAttendeeProfile.company}</div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAttendeeProfile(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-slate-300 leading-relaxed text-xs">
              {selectedAttendeeProfile.bio}
            </p>

            <div className="space-y-1 pt-2 border-t border-[var(--sgx-secondary)]/60">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Pilares de Interés:</span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedAttendeeProfile.pillars.map(p => (
                  <span key={p} className="px-2 py-0.5 bg-black border border-[var(--sgx-secondary)] text-[var(--sgx-neon)] text-[10px] font-bold">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--sgx-secondary)]/60 flex items-center justify-between">
              <span className="text-[#FDCC0D] flex items-center space-x-1 text-[10px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#FDCC0D]" />
                <span>Pase {selectedAttendeeProfile.ticketType.replace('_', ' ')}</span>
              </span>
              <button
                onClick={() => {
                  const targetName = selectedAttendeeProfile.name;
                  setSelectedAttendeeProfile(null);
                  setActiveTab('FORUMS');
                  setActiveChannelId('#matchmaking-proyectos');
                  setInputText(`@${targetName} `);
                }}
                className="px-3 py-1.5 bg-[var(--sgx-neon)] text-black font-extrabold text-xs flex items-center space-x-1"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                <span>MENCIONAR EN FORO</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
