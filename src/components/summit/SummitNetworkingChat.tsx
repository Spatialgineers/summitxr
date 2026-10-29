import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare, Send, Users, Hash, Pin, ShieldCheck, Radio, Volume2, VolumeX, Code, HelpCircle, Award, MapPin,
  AtSign, Flame, Zap, Gem, ThumbsUp, Sparkles, type LucideIcon,
} from 'lucide-react';
import { ChatMessage, AttendeeProfile, SummitPillarId } from '../../types/summit';
import { INITIAL_CHAT_MESSAGES, INITIAL_ATTENDEE_PROFILES, playNotificationChime } from '../../lib/summitData';
import { db } from '../../lib/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, limit, doc, updateDoc, increment } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { SgxPilotGlyph } from '../../identity/SgxPilotGlyph';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { SGX_PILLARS, findPillar, pillarInk, type PillarKey } from '../../lib/sgxPillars';
import { SgxDialog } from '../common/SgxDialog';
import './sgx-kit.css';
import './SummitNetworkingChat.css';

/** Only small, remote avatars travel in chat docs (rules cap ~150 KB). */
const isShareableAvatar = (src?: string) =>
  !!src && /^https:\/\//.test(src) && src.length <= 1000 && !/images\.unsplash\.com/.test(src);

/** A real photo when there is one, otherwise the in-house avatar glyph. */
const ChatAvatar: React.FC<{ src?: string; seed: string; alt: string; className?: string; accent?: string }> = ({ src, seed, alt, className = '', accent = '#00DDFF' }) => {
  const [broken, setBroken] = useState(false);
  const usable = !!src && !broken && !/images\.unsplash\.com/.test(src) && (/^https:\/\//.test(src) || /^data:image\//.test(src));
  return (
    <span className={`sgx-avatar ${className}`} style={{ ['--avatar-accent' as string]: accent }} {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })}>
      {usable
        ? <img src={src} alt="" onError={() => setBroken(true)} />
        : <SgxPilotGlyph seed={seed || 'sgx'} accent={accent} size={28} />}
    </span>
  );
};

/* Reaction keys stay the stored strings (Firestore docs already use them); they render as icons. */
const REACTIONS: { key: string; icon: LucideIcon; es: string; en: string }[] = [
  { key: '🔥', icon: Flame, es: 'Fuego', en: 'Fire' },
  { key: '🚀', icon: Zap, es: 'Impulso', en: 'Boost' },
  { key: '💎', icon: Gem, es: 'Joya', en: 'Gem' },
  { key: '👏', icon: ThumbsUp, es: 'Aplausos', en: 'Applause' },
];
const reactionMeta = (key: string) => REACTIONS.find((r) => r.key === key) || { key, icon: Sparkles, es: 'Reacción', en: 'Reaction' };

const ROLE_LABEL: Record<string, { es: string; en: string }> = {
  ORGANIZER: { es: 'Organización', en: 'Organizer' },
  SPEAKER: { es: 'Speaker', en: 'Speaker' },
  DIRECTOR: { es: 'Dirección', en: 'Director' },
  INITIATE: { es: 'Initiate', en: 'Initiate' },
  VIP: { es: 'VIP', en: 'VIP' },
};

export interface ForumChannel {
  id: string;
  name: string;
  topic: string;
  desc: string;
  icon: LucideIcon;
  /** Pillar whose color marks the channel. */
  accent: PillarKey;
  badge: string;
  nameEn?: string;
  topicEn?: string;
  descEn?: string;
  badgeEn?: string;
  readOnly?: boolean;
}

const PUBLIC_FORUM_CHANNELS: ForumChannel[] = [
  { 
    id: '#general', 
    name: 'Debate General del Summit',
    nameEn: 'General Summit Discussion', 
    topic: 'Conversación global y bienvenida a todos los participantes',
    topicEn: 'Global conversation and a welcome to every participant', 
    desc: 'Espacio abierto para comentar impresiones, expectativas y reflexiones generales sobre el Spatialgineers Summit 2026.',
    descEn: 'An open space to share impressions, expectations and general thoughts about the Spatialgineers Summit 2026.',
    icon: Hash, 
    accent: 'SYNTHESIZE',
    badge: 'PRINCIPAL',
    badgeEn: 'MAIN',
  },
  { 
    id: '#anuncios-oficiales', 
    name: 'Anuncios Oficiales & Producción',
    nameEn: 'Official Announcements & Production', 
    topic: 'Avisos oficiales de horarios, links de transmisión y dinámicas de los directores',
    topicEn: 'Official notices on schedules, stream links and the directors\' activities', 
    desc: 'Canal de comunicados emitidos por el equipo organizador de Spatialgineers, directores de producción y speakers.',
    descEn: 'Channel for announcements from the Spatialgineers organizing team, production directors and speakers.',
    icon: ShieldCheck, 
    accent: 'STORY',
    badge: 'OFICIAL',
    badgeEn: 'OFFICIAL',
  },
  { 
    id: '#stage-live', 
    name: 'Escenario & Transmisión en Vivo',
    nameEn: 'Stage & Live Broadcast', 
    topic: 'Reacciones a la transmisión de YouTube Live y a los artistas invitados',
    topicEn: 'Reactions to the YouTube Live stream and the guest artists', 
    desc: 'Comenta en directo lo que está ocurriendo en el escenario principal, las transiciones visuales y los sets de los artistas.',
    descEn: 'Comment live on what\'s happening on the main stage, the visual transitions and the artists\' sets.',
    icon: Radio, 
    accent: 'STAGE',
    badge: 'EN VIVO',
    badgeEn: 'LIVE',
  },
  { 
    id: '#preguntas-a-speakers', 
    name: 'Preguntas & Respuestas (Q&A)',
    nameEn: 'Questions & Answers (Q&A)', 
    topic: 'Preguntas de la audiencia para los paneles y keynotes de los 6 pilares',
    topicEn: 'Audience questions for the panels and keynotes of the 6 pillars', 
    desc: 'Publica tus dudas para que los moderadores las seleccionen durante las rondas de Q&A en vivo de cada charla.',
    descEn: 'Post your questions so the moderators can pick them during each talk\'s live Q&A rounds.',
    icon: HelpCircle, 
    accent: 'STAGE',
    badge: 'Q&A'
  },
  { 
    id: '#sgx-guild-trials', 
    name: 'SGX Guild Trials & Proyectos',
    nameEn: 'SGX Guild Trials & Projects', 
    topic: 'Portafolios de los 8 Initiates (Día 1) y SGX Guild Ranked Trials Pitch Session (Día 3)',
    topicEn: 'Portfolios of the 8 Initiates (Day 1) and the SGX Guild Ranked Trials Pitch Session (Day 3)', 
    desc: 'Espacio dedicado a comentar los portafolios de los Initiates y compartir feedback sobre sus presentaciones en vivo.',
    descEn: 'A space to comment on the Initiates\' portfolios and share feedback on their live presentations.',
    icon: Award, 
    accent: 'SPARK',
    badge: 'GUILD'
  },
  { 
    id: '#workshops-y-codigo', 
    name: 'Workshops, WebGL & Código',
    nameEn: 'Workshops, WebGL & Code', 
    topic: 'Dudas técnicas, Three.js, shaders GLSL, WebXR y arquitectura en la nube',
    topicEn: 'Technical questions, Three.js, GLSL shaders, WebXR and cloud architecture', 
    desc: 'Comparte snippets, recursos y resuelve dudas técnicas de los workshops y demostraciones prácticas del evento.',
    descEn: 'Share snippets and resources and solve technical questions from the event\'s workshops and hands-on demos.',
    icon: Code, 
    accent: 'SYSTEM',
    badge: 'TECH'
  },
  { 
    id: '#matchmaking-proyectos', 
    name: 'Colaboración & Matchmaking',
    nameEn: 'Collaboration & Matchmaking', 
    topic: 'Búsqueda de colaboradores, ofertas y alianzas para proyectos de computación espacial',
    topicEn: 'Looking for collaborators, offers and alliances for spatial computing projects', 
    desc: 'Preséntate, muestra tu portafolio y conecta con otros desarrolladores, diseñadores o marcas para futuros proyectos.',
    descEn: 'Introduce yourself, show your portfolio and connect with other developers, designers or brands for future projects.',
    icon: Users, 
    accent: 'SYNTHESIZE',
    badge: 'NETWORKING'
  },
  { 
    id: '#venue-san-juan', 
    name: 'SGX Showcase · Día 3 (San Juan, PR)',
    nameEn: 'SGX Showcase · Day 3 (San Juan, PR)', 
    topic: 'Logística del Día 3 en Chroma Space Studios (por invitación)',
    topicEn: 'Day 3 logistics at Chroma Space Studios (by invitation)', 
    desc: 'Foro para las personas invitadas al SGX Showcase del Día 3 en San Juan: puntos de encuentro, transporte y agenda presencial.',
    descEn: 'Forum for guests invited to the Day 3 SGX Showcase in San Juan: meeting points, transportation and the in-person agenda.',
    icon: MapPin, 
    accent: 'SHOWCASE',
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
  const { language } = useLanguage();
  const es = language === 'es';
  const { user: authUser } = useAuth();

  const currentUser = {
    id: propUser?.id || authUser?.uid || 'user_attendee_live',
    name: propUser?.name || authUser?.displayName || authUser?.email?.split('@')[0] || (es ? 'Asistente Spatialgineer' : 'Spatialgineer Attendee'),
    avatar: propUser?.avatar || authUser?.photoURL || '',
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
      if (!saved) return INITIAL_CHAT_MESSAGES;
      // Drop the sample messages older versions seeded (msg_02…); keep real ones.
      const parsed: ChatMessage[] = JSON.parse(saved);
      const real = parsed.filter((m) => !/^msg_0\d$/.test(m.id));
      return [...INITIAL_CHAT_MESSAGES, ...real];
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
      // Newest 300 (desc + limit), shown oldest→newest below.
      const q = query(chatRef, orderBy('timestamp', 'desc'), limit(300));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          // Live only when the data really came from the server, not the offline cache.
          setIsLiveConnected(!snapshot.metadata.fromCache);
          if (!snapshot.empty) {
            const firestoreMsgs: ChatMessage[] = snapshot.docs.map((docSnap) => {
              const data = docSnap.data();
              return {
                id: docSnap.id,
                channelId: data.channelId || '#general',
                senderId: data.senderId || 'anon',
                senderName: data.senderName || (es ? 'Asistente' : 'Attendee'),
                senderAvatar: data.senderAvatar || '',
                senderRole: data.senderRole || 'ATTENDEE',
                text: data.text || '',
                timestamp: data.timestamp || Date.now(),
                reactions: Object.fromEntries(Object.entries(data.reactions || {}).filter(([, v]) => typeof v === 'number')) as Record<string, number>,
                isPinned: Boolean(data.isPinned)
              };
            }).reverse();

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

    // Push to Firestore live collection (rules: signed in, authorUid == auth uid,
    // only ATTENDEE role for non-admins, small avatar URL or none).
    if (!authUser?.uid) return;
    try {
      await addDoc(collection(db, 'chat_messages'), {
        channelId: activeChannelId,
        senderId: authUser.uid,
        authorUid: authUser.uid,
        senderName: currentUser.name.slice(0, 100),
        ...(isShareableAvatar(currentUser.avatar) ? { senderAvatar: currentUser.avatar } : {}),
        senderRole: 'ATTENDEE',
        text: trimmedText.slice(0, 1000),
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

  const accentOf = (ch: ForumChannel) => pillarInk(ch.accent);
  const pillarChip = (p: SummitPillarId) => {
    const pillar = findPillar(p);
    return <span key={p} className="sgx-chip" style={{ ['--chip' as string]: pillar ? pillarInk(pillar.key) : 'var(--SGX_Cyan)' }}>{pillar?.name || p}</span>;
  };
  const mention = (name: string) => {
    setSelectedAttendeeProfile(null);
    setActiveTab('FORUMS');
    setActiveChannelId('#matchmaking-proyectos');
    setInputText(`@${name} `);
  };
  const statusLabel = isLiveConnected ? (es ? 'En vivo' : 'Live') : (es ? 'Sin conexión · guardado local' : 'Offline · saved locally');

  const soundToggle = (
    <button
      type="button"
      className="sgx-iconbtn"
      aria-pressed={soundEnabled}
      onClick={() => setSoundEnabled((prev) => !prev)}
      aria-label={soundEnabled ? (es ? 'Silenciar sonidos del foro' : 'Mute forum sounds') : (es ? 'Activar sonidos del foro' : 'Turn forum sounds on')}
    >
      {soundEnabled ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}
    </button>
  );

  const tabs = (
    <div className="sgx-hangar__tabs sgx-net__tabs" role="tablist" aria-label={es ? 'Foros' : 'Forums'}>
      <button type="button" role="tab" aria-selected={activeTab === 'FORUMS'} className={activeTab === 'FORUMS' ? 'is-on' : ''} onClick={() => setActiveTab('FORUMS')}>
        {es ? 'Canales' : 'Channels'} <span className="sgx-net__n">{PUBLIC_FORUM_CHANNELS.length}</span>
      </button>
      <button type="button" role="tab" aria-selected={activeTab === 'COMMUNITY_ROSTER'} className={activeTab === 'COMMUNITY_ROSTER' ? 'is-on' : ''} onClick={() => setActiveTab('COMMUNITY_ROSTER')}>
        {es ? 'Comunidad' : 'Community'} <span className="sgx-net__n">{attendees.length}</span>
      </button>
    </div>
  );

  return (
    <div className="sgx-net" style={{ ['--net-accent' as string]: accentOf(currentChannel) }}>
      {/* Desktop sidebar: channels and community */}
      <aside className="sgx-net__side" aria-label={es ? 'Canales del foro' : 'Forum channels'}>
        <div className="sgx-net__side-head">
          <div>
            <p className="sgx-kicker">{es ? 'Foros del Summit' : 'Summit forums'}</p>
            <p className="sgx-fine">{es ? 'Todo es público y moderado' : 'Everything is public and moderated'}</p>
          </div>
          {soundToggle}
        </div>
        {tabs}
        <div className="sgx-net__list">
          {activeTab === 'FORUMS' ? (
            PUBLIC_FORUM_CHANNELS.map((ch) => {
              const Icon = ch.icon;
              const isActive = activeChannelId === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  className={`sgx-net__chan ${isActive ? 'is-on' : ''}`}
                  style={{ ['--chan' as string]: accentOf(ch) }}
                  aria-current={isActive ? 'true' : undefined}
                  onClick={() => { setActiveChannelId(ch.id); setActiveTab('FORUMS'); }}
                >
                  <span className="sgx-net__chan-icon"><Icon aria-hidden /></span>
                  <span className="sgx-net__chan-text">
                    <strong>{loc(ch, 'name', language)}</strong>
                    <small>{loc(ch, 'topic', language)}</small>
                  </span>
                  <span className="sgx-net__chan-n" aria-label={es ? 'mensajes' : 'messages'}>{getChannelMessageCount(ch.id)}</span>
                </button>
              );
            })
          ) : attendees.length === 0 ? (
            <p className="sgx-fine sgx-net__pad">{es ? 'El directorio se llena cuando las personas publican su perfil.' : 'The directory fills up as people publish their profile.'}</p>
          ) : (
            attendees.map((att) => (
              <button key={att.id} type="button" className="sgx-net__chan" onClick={() => setSelectedAttendeeProfile(att)}>
                <ChatAvatar src={att.avatar} seed={att.id} alt="" className="sgx-net__ava-sm" />
                <span className="sgx-net__chan-text">
                  <strong>{att.name}</strong>
                  <small>{att.title}</small>
                </span>
              </button>
            ))
          )}
        </div>
        <div className="sgx-net__me">
          <ChatAvatar src={currentUser.avatar} seed={currentUser.id} alt={currentUser.name} className="sgx-net__ava-sm" />
          <span>
            <strong>{currentUser.name}</strong>
            <small><span className={`sgx-dot ${isLiveConnected ? 'is-live' : ''}`} />{isLiveConnected ? (es ? 'Conectado al foro' : 'Connected to the forum') : (es ? 'Sin conexión: tus mensajes se guardan aquí' : 'Offline: your messages are kept here')}</small>
          </span>
        </div>
      </aside>

      <section className="sgx-net__main">
        {/* Phone bar: tabs, sound and channel chips */}
        <div className="sgx-net__mobilebar">
          <div className="sgx-net__mobilebar-row">{tabs}{soundToggle}</div>
          {activeTab === 'FORUMS' && (
            <div className="sgx-net__chips">
              {PUBLIC_FORUM_CHANNELS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  className="sgx-chip"
                  style={{ ['--chip' as string]: accentOf(ch) }}
                  aria-pressed={activeChannelId === ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                >
                  {ch.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {activeTab === 'COMMUNITY_ROSTER' ? (
          <div className="sgx-net__roster">
            <div className="sgx-net__roster-head">
              <div>
                <h3 className="sgx-h">{es ? 'Directorio de la comunidad' : 'Community directory'}</h3>
                <p className="sgx-copy">{es ? 'Creadores, speakers y marcas que participan en los foros. Sin mensajes privados: se conversa en público.' : 'Creators, speakers and brands taking part in the forums. No private messages: conversations are public.'}</p>
              </div>
              <label className="sgx-net__filter">
                <span className="sr-only">{es ? 'Filtrar por pilar' : 'Filter by pillar'}</span>
                <select className="sgx-input" value={selectedPillarFilter} onChange={(e) => setSelectedPillarFilter(e.target.value as SummitPillarId | 'ALL')}>
                  <option value="ALL">{es ? 'Todos los pilares' : 'All pillars'}</option>
                  {SGX_PILLARS.map((p) => <option key={p.key} value={p.id}>{p.name}</option>)}
                </select>
              </label>
            </div>
            {filteredAttendees.length === 0 ? (
              <p className="sgx-fine">{es ? 'Todavía no hay perfiles públicos con ese filtro.' : 'No public profiles with that filter yet.'}</p>
            ) : (
              <ul className="sgx-net__people">
                {filteredAttendees.map((att) => (
                  <li key={att.id} className="sgx-card">
                    <div className="sgx-net__person">
                      <ChatAvatar src={att.avatar} seed={att.id} alt="" />
                      <div>
                        <strong>{att.name}</strong>
                        <small>{att.title} · {att.company}</small>
                      </div>
                    </div>
                    <p className="sgx-copy sgx-net__bio">{att.bio}</p>
                    <div className="sgx-chip-row">{att.pillars.map(pillarChip)}</div>
                    <div className="sgx-net__person-actions">
                      <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => setSelectedAttendeeProfile(att)}>{es ? 'Ver perfil' : 'View profile'}</button>
                      <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => mention(att.name)}><AtSign aria-hidden />{es ? 'Mencionar' : 'Mention'}</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <>
            <header className="sgx-net__head">
              <span className="sgx-net__head-icon"><CurrentChannelIcon aria-hidden /></span>
              <div className="sgx-net__head-text">
                <h3 className="sgx-h">{loc(currentChannel, 'name', language)}</h3>
                <p className="sgx-fine">{loc(currentChannel, 'desc', language)}</p>
              </div>
              <div className="sgx-net__head-status">
                <span className="sgx-chip sgx-chip--ghost"><span className={`sgx-dot ${isLiveConnected ? 'is-live' : ''}`} />{statusLabel}</span>
                <span className="sgx-fine">{displayedMessages.length} {es ? 'mensajes' : 'messages'}</span>
              </div>
            </header>

            <div className="sgx-net__feed" aria-live="polite">
              {displayedMessages.length === 0 ? (
                <div className="sgx-net__empty">
                  <MessageSquare aria-hidden />
                  <p className="sgx-copy">
                    {es ? 'Nadie ha escrito en ' : 'Nobody has posted in '}<b>{currentChannel.id}</b>{es ? ' todavía. Tu mensaje lo ve todo el Summit.' : ' yet. Your message is seen by the whole Summit.'}
                  </p>
                </div>
              ) : (
                displayedMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  const isOfficial = msg.senderRole === 'ORGANIZER' || msg.senderRole === 'SPEAKER' || (msg.senderRole as string) === 'DIRECTOR';
                  const role = msg.senderRole && msg.senderRole !== 'ATTENDEE' ? ROLE_LABEL[msg.senderRole] : undefined;
                  return (
                    <article key={msg.id} className={`sgx-net__msg ${isMe ? 'is-me' : ''} ${isOfficial ? 'is-official' : ''}`}>
                      <ChatAvatar src={msg.senderAvatar} seed={msg.senderId} alt="" className="sgx-net__ava" accent={isOfficial ? '#FDCC0D' : '#00DDFF'} />
                      <div className="sgx-net__msg-body">
                        <div className="sgx-net__meta">
                          <strong>{msg.senderName}</strong>
                          {role && <span className="sgx-chip" style={{ ['--chip' as string]: isOfficial ? 'var(--SGX_Yellow)' : 'var(--SGX_Cyan)' }}>{es ? role.es : role.en}</span>}
                          {msg.isPinned && <span className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}><Pin aria-hidden />{es ? 'Fijado' : 'Pinned'}</span>}
                          <time dateTime={new Date(msg.timestamp).toISOString()}>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                        </div>
                        <div className="sgx-net__bubble">{loc(msg, 'text', language)}</div>
                        <div className="sgx-net__reacts">
                          {msg.reactions && Object.entries(msg.reactions).map(([key, count]) => {
                            const r = reactionMeta(key);
                            const Icon = r.icon;
                            return (
                              <button key={key} type="button" className="sgx-net__react is-count" onClick={() => handleAddReaction(msg.id, key)} aria-label={`${es ? r.es : r.en}: ${count}`}>
                                <Icon aria-hidden /><span>{count}</span>
                              </button>
                            );
                          })}
                          {REACTIONS.map((r) => {
                            const Icon = r.icon;
                            return (
                              <button key={r.key} type="button" className="sgx-net__react" onClick={() => handleAddReaction(msg.id, r.key)} aria-label={es ? `Reaccionar: ${r.es}` : `React: ${r.en}`} title={es ? r.es : r.en}>
                                <Icon aria-hidden />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="sgx-net__form">
              <label className="sr-only" htmlFor="sgx-net-input">{es ? 'Mensaje' : 'Message'}</label>
              <input
                id="sgx-net-input"
                type="text"
                className="sgx-input"
                value={inputText}
                maxLength={1000}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={es ? `Escribe en ${currentChannel.id} (público)` : `Write in ${currentChannel.id} (public)`}
              />
              <button type="submit" className="sgx-btn sgx-btn--sm" disabled={!inputText.trim()} aria-label={es ? 'Publicar' : 'Post'}>
                <Send aria-hidden /><span className="sgx-net__send-label">{es ? 'Publicar' : 'Post'}</span>
              </button>
            </form>
          </>
        )}
      </section>

      {selectedAttendeeProfile && (
        <SgxDialog
          onClose={() => setSelectedAttendeeProfile(null)}
          size="sm"
          className="sgx-dialog--fit"
          title={selectedAttendeeProfile.name}
          kicker={`${selectedAttendeeProfile.title} · ${selectedAttendeeProfile.company}`}
          icon={<ChatAvatar src={selectedAttendeeProfile.avatar} seed={selectedAttendeeProfile.id} alt="" />}
          footer={
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => mention(selectedAttendeeProfile.name)}>
              <AtSign aria-hidden />{es ? 'Mencionar en el foro' : 'Mention in the forum'}
            </button>
          }
        >
          <div className="sgx-net__profile">
            <p className="sgx-copy">{selectedAttendeeProfile.bio}</p>
            <p className="sgx-kicker">{es ? 'Pilares' : 'Pillars'}</p>
            <div className="sgx-chip-row">{selectedAttendeeProfile.pillars.map(pillarChip)}</div>
          </div>
        </SgxDialog>
      )}
    </div>
  );
};
