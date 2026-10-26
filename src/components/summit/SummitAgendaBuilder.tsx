import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Bookmark, 
  BookmarkCheck, 
  Bell, 
  BellRing, 
  Download, 
  ExternalLink, 
  Search, 
  Filter, 
  Wifi, 
  WifiOff, 
  Sparkles, 
  Tv, 
  Share2,
  CheckCircle2,
  Layers,
  Radio
} from 'lucide-react';
import { SummitSession, SummitSpeaker, SummitPillarId } from '../../types/summit';
import { 
  downloadICS, 
  getGoogleCalendarUrl, 
  getSavedAgendaIds, 
  saveAgendaIds,
  playNotificationChime
} from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';

interface SummitAgendaBuilderProps {
  sessions: SummitSession[];
  speakers: SummitSpeaker[];
  onOpenSessionModal?: (session: SummitSession) => void;
  onTriggerNotification?: (session: SummitSession) => void;
}

export const SummitAgendaBuilder: React.FC<SummitAgendaBuilderProps> = ({
  sessions,
  speakers,
  onOpenSessionModal,
  onTriggerNotification,
}) => {
  const { t, language } = useLanguage();
  const [selectedDay, setSelectedDay] = useState<1 | 2 | 3 | 'ALL'>(1);
  const [selectedPillar, setSelectedPillar] = useState<SummitPillarId | 'ALL'>('ALL');
  const [onlyMyAgenda, setOnlyMyAgenda] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => getSavedAgendaIds());
  const [notifiedSessionIds, setNotifiedSessionIds] = useState<string[]>([]);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [copiedSessionId, setCopiedSessionId] = useState<string | null>(null);

  // Monitor online / offline status
  useEffect(() => {
    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => setIsOfflineMode(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleBookmark = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (bookmarkedIds.includes(sessionId)) {
      updated = bookmarkedIds.filter(id => id !== sessionId);
    } else {
      updated = [...bookmarkedIds, sessionId];
    }
    setBookmarkedIds(updated);
    saveAgendaIds(updated);
  };

  const togglePushNotification = (session: SummitSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowActive = !notifiedSessionIds.includes(session.id);
    if (isNowActive) {
      setNotifiedSessionIds(prev => [...prev, session.id]);
      playNotificationChime();
      if (onTriggerNotification) {
        onTriggerNotification(session);
      }
    } else {
      setNotifiedSessionIds(prev => prev.filter(id => id !== session.id));
    }
  };

  const handleShareSession = (session: SummitSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const shareText = `Asiste a "${session.title}" en el Spatialgineers Summit 2026! (${session.dateStr} - ${session.startTime})`;
    navigator.clipboard.writeText(shareText);
    setCopiedSessionId(session.id);
    setTimeout(() => setCopiedSessionId(null), 2000);
  };

  // Filter sessions
  const filteredSessions = sessions.filter(session => {
    if (selectedDay !== 'ALL' && session.day !== selectedDay) return false;
    if (selectedPillar !== 'ALL' && session.pillarId !== selectedPillar) return false;
    if (onlyMyAgenda && !bookmarkedIds.includes(session.id)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = session.title.toLowerCase().includes(q);
      const matchDesc = session.description.toLowerCase().includes(q);
      const matchTags = session.tags.some(t => t.toLowerCase().includes(q));
      const matchSpeaker = session.speakerIds.some(spkId => {
        const spk = speakers.find(s => s.id === spkId);
        return spk && spk.name.toLowerCase().includes(q);
      });
      if (!matchTitle && !matchDesc && !matchTags && !matchSpeaker) return false;
    }
    return true;
  }).sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    return a.startMinutes - b.startMinutes;
  });

  const getSpeaker = (id: string) => speakers.find(s => s.id === id);

  return (
    <div className="space-y-6">
      {/* Top Header & Offline Status Banner */}
      <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[var(--sgx-neon)]" />
            <h2 className="text-base font-extrabold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              {t('tab_schedule', 'AGENDA OFICIAL & RUN-OF-SHOW (3 DÍAS)')}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('hero_dates', 'Diciembre 11 – 13, 2026')} • {t('btn_add_agenda', 'Arma tu agenda personalizada con notificaciones instantáneas y sincronización con tu calendario.')}
          </p>
        </div>

        {/* Offline Badge & Fast Action */}
        <div className="flex items-center space-x-3 flex-wrap gap-2">
          <div className={`px-2.5 py-1 border text-[10px] font-mono font-bold flex items-center space-x-1.5 ${
            isOfflineMode ? 'border-amber-500/80 bg-amber-500/10 text-amber-300' : 'border-[#FDCC0D]/80 bg-[#FDCC0D]/10 text-[#FDCC0D]'
          }`}>
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            <span>{isOfflineMode ? t('offline_badge', 'MODO OFFLINE (CACHE LOCAL)') : t('offline_ready', 'ONLINE • CACHE SYNC OK')}</span>
          </div>

          <button
            onClick={() => setOnlyMyAgenda(!onlyMyAgenda)}
            className={`px-3 py-1.5 text-xs font-bold font-mono transition-all flex items-center space-x-1.5 ${
              onlyMyAgenda 
                ? 'bg-[var(--sgx-accent)] text-black shadow-md shadow-[var(--sgx-accent)]/20' 
                : 'bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300 hover:border-[var(--sgx-accent)]'
            }`}
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{t('filter_my_agenda', 'MI AGENDA')} ({bookmarkedIds.length})</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs: Days, Pillars, Search */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Day Selector Buttons */}
        <div className="lg:col-span-4 flex items-center space-x-1.5 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] p-1.5 overflow-x-auto">
          <button
            onClick={() => setSelectedDay(1)}
            className={`flex-1 py-2 text-xs font-bold font-mono transition-all whitespace-nowrap px-2 ${
              selectedDay === 1 ? 'bg-[var(--sgx-neon)] text-black font-extrabold' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('day_1_date', 'DIC 11')} ({t('day_1', 'DÍA 1')})
          </button>
          <button
            onClick={() => setSelectedDay(2)}
            className={`flex-1 py-2 text-xs font-bold font-mono transition-all whitespace-nowrap px-2 ${
              selectedDay === 2 ? 'bg-[var(--sgx-neon)] text-black font-extrabold' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('day_2_date', 'DIC 12')} ({t('day_2', 'DÍA 2')})
          </button>
          <button
            onClick={() => setSelectedDay(3)}
            className={`flex-1 py-2 text-xs font-bold font-mono transition-all whitespace-nowrap px-2 ${
              selectedDay === 3 ? 'bg-[var(--sgx-accent)] text-black font-extrabold' : 'text-slate-300 hover:text-white'
            }`}
          >
            {t('day_3_date', 'DIC 13')} ({t('day_3', 'DÍA 3')})
          </button>
          <button
            onClick={() => setSelectedDay('ALL')}
            className={`px-2 py-2 text-[10px] font-bold font-mono transition-all whitespace-nowrap ${
              selectedDay === 'ALL' ? 'bg-slate-200 text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('filter_all', 'VER TODO')}
          </button>
        </div>

        {/* Pillar Filter Selector */}
        <div className="lg:col-span-4 flex items-center bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] px-3 py-1.5">
          <Layers className="w-4 h-4 text-[var(--sgx-accent)] mr-2 shrink-0" />
          <select
            value={selectedPillar}
            onChange={(e) => setSelectedPillar(e.target.value as any)}
            className="w-full bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[var(--sgx-bg)] text-white">{t('filter_all', 'FILTRAR POR PILAR (TODOS LOS 6)')}</option>
            <option value="SGX.STORY" className="bg-[var(--sgx-bg)] text-[#3B82F6]">SGX.STORY — Narrativa & Lore</option>
            <option value="SGX.SHOWCASE" className="bg-[var(--sgx-bg)] text-[var(--sgx-neon)]">SGX.SHOWCASE — 3D & Pavilions</option>
            <option value="SGX.SPARK" className="bg-[var(--sgx-bg)] text-[var(--sgx-accent)]">SGX.SPARK — Ideación & IA</option>
            <option value="SGX.STAGE" className="bg-[var(--sgx-bg)] text-[#FDCC0D]">SGX.STAGE — Visualizadores & MoCap</option>
            <option value="SGX.SYSTEM" className="bg-[var(--sgx-bg)] text-[#38BDF8]">SGX.SYSTEM — Cloud & WebSockets</option>
            <option value="SGX.SYNTHESIZE" className="bg-[var(--sgx-bg)] text-[#00B0FF]">SGX.SYNTHESIZE — WebXR & Híbrido</option>
          </select>
        </div>

        {/* Search Field */}
        <div className="lg:col-span-4 flex items-center bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] px-3 py-1.5">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder', 'Buscar por título, speaker, tema...')}
            className="w-full bg-transparent text-xs font-mono text-white placeholder-slate-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 text-xs hover:text-white">
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sessions Timeline Cards List */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <div className="p-8 text-center bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] text-slate-400 font-mono text-xs">
            {t('filter_all', 'No se encontraron sesiones con los filtros aplicados.')}
          </div>
        ) : (
          filteredSessions.map((session) => {
            const isBookmarked = bookmarkedIds.includes(session.id);
            const isNotified = notifiedSessionIds.includes(session.id);

            return (
              <div
                key={session.id}
                onClick={() => onOpenSessionModal && onOpenSessionModal(session)}
                className={`p-4 bg-[var(--sgx-card-bg)]/90 border transition-all relative overflow-hidden group hover:border-[var(--sgx-neon)] cursor-pointer ${
                  isBookmarked ? 'border-[var(--sgx-neon)]/80 bg-[var(--sgx-card-bg)]' : 'border-[var(--sgx-secondary)]/60'
                }`}
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                {/* Left Pillar Accent Line */}
                {session.pillarId && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1.5"
                    style={{
                      backgroundColor: 
                        session.pillarId === 'SGX.STORY' ? '#3B82F6' :
                        session.pillarId === 'SGX.SHOWCASE' ? '#00DDFF' :
                        session.pillarId === 'SGX.SPARK' ? '#FDCC0D' :
                        session.pillarId === 'SGX.STAGE' ? '#FDCC0D' :
                        session.pillarId === 'SGX.SYSTEM' ? '#38BDF8' : '#00B0FF'
                    }}
                  />
                )}

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Metadata & Info */}
                  <div className="space-y-1.5 flex-1 pl-1">
                    {/* Time, Day & Format Chips */}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
                      <span className="px-2 py-0.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-[var(--sgx-neon)] font-bold flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[var(--sgx-neon)]" />
                        <span>{session.startTime} – {session.endTime}</span>
                      </span>

                      <span className="px-2 py-0.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300">
                        {session.dateStr} (DÍA {session.day})
                      </span>

                      <span className={`px-2 py-0.5 border font-bold uppercase ${
                        session.format === 'HYBRID' ? 'bg-[var(--sgx-accent)]/20 border-[var(--sgx-accent)] text-[var(--sgx-accent)]' :
                        session.format === 'ROBLOX_STREAM' ? 'bg-amber-500/20 border-amber-400 text-amber-300' :
                        'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      }`}>
                        {session.format === 'HYBRID' ? '🔴 HÍBRIDO (SAN JUAN + STREAM)' :
                         session.format === 'ROBLOX_STREAM' ? '🎵 INTERMEDIO DE ARTISTA (ROBLOX SI SE USA)' : '🌐 DIGITAL YOUTUBE LIVE'}
                      </span>

                      {session.pillarId && (
                        <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-white font-bold">
                          {session.pillarId}
                        </span>
                      )}
                    </div>

                    {/* Title & Subtitle */}
                    <div>
                      <h3 className="text-sm md:text-base font-bold text-white group-hover:text-[var(--sgx-neon)] transition-colors font-['Orbitron',sans-serif]">
                        {session.title}
                      </h3>
                      {session.subtitle && (
                        <p className="text-xs text-[var(--sgx-accent)] font-mono mt-0.5">
                          {session.subtitle}
                        </p>
                      )}
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                      {session.description}
                    </p>

                    {/* Speakers & Location */}
                    <div className="flex flex-wrap items-center gap-4 pt-1 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-[var(--sgx-accent)]" />
                        <span>{session.venueLocation}</span>
                      </div>

                      {session.speakerIds.map(spkId => {
                        const spk = getSpeaker(spkId);
                        if (!spk) return null;
                        return (
                          <div key={spkId} className="flex items-center space-x-1.5">
                            {spk.avatarUrl ? (
                              <img 
                                src={spk.avatarUrl} 
                                alt={spk.name}
                                className="w-4 h-4 rounded-full object-cover border border-[var(--sgx-neon)]"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-[var(--sgx-secondary)]/30 border border-[var(--sgx-neon)] flex items-center justify-center text-[7px] font-bold text-white uppercase shrink-0">
                                {spk.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <span className="font-bold text-white">{spk.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Actions: Agenda Toggle, Notification, Calendar Sync */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between gap-2 shrink-0 border-t lg:border-t-0 border-[var(--sgx-secondary)]/60 pt-2 lg:pt-0">
                    
                    {/* Bookmark in My Agenda */}
                    <button
                      onClick={(e) => toggleBookmark(session.id, e)}
                      className={`px-3 py-1.5 text-xs font-bold font-mono transition-all flex items-center space-x-1.5 ${
                        isBookmarked
                          ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-md shadow-[var(--sgx-neon)]/30'
                          : 'bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300 hover:border-[var(--sgx-neon)]'
                      }`}
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                      <span>{isBookmarked ? t('btn_remove_agenda', 'GUARDADO') : t('btn_add_agenda', '+ MI AGENDA')}</span>
                    </button>

                    {/* Push Notification Toggle */}
                    <button
                      onClick={(e) => togglePushNotification(session, e)}
                      className={`p-1.5 border text-xs font-mono transition-all flex items-center space-x-1 ${
                        isNotified 
                          ? 'border-[var(--sgx-accent)] bg-[var(--sgx-accent)]/20 text-[var(--sgx-accent)] animate-pulse' 
                          : 'border-[var(--sgx-secondary)] bg-[var(--sgx-bg)] text-slate-400 hover:text-white'
                      }`}
                      title={isNotified ? 'Alerta activa para esta sesión' : 'Notificarme al iniciar'}
                    >
                      {isNotified ? <BellRing className="w-3.5 h-3.5 text-[var(--sgx-accent)]" /> : <Bell className="w-3.5 h-3.5" />}
                      <span className="text-[10px] hidden sm:inline">{isNotified ? t('btn_notify_active', 'NOTIFICAR ACTIVO') : t('btn_notify_session', 'ALERTAR')}</span>
                    </button>

                    {/* Calendar Export Links */}
                    <div className="flex items-center space-x-1">
                      {/* .ICS File Download */}
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadICS(session); }}
                        className="p-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-300 hover:text-[var(--sgx-neon)] text-[10px] font-mono flex items-center space-x-1"
                        title={t('btn_export_calendar', 'Descargar archivo de calendario universal (.ics)')}
                      >
                        <Download className="w-3 h-3" />
                        <span className="hidden sm:inline">.ICS</span>
                      </button>

                      {/* Google Calendar Web Link */}
                      <a
                        href={getGoogleCalendarUrl(session)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-[var(--sgx-accent)] text-slate-300 hover:text-[var(--sgx-accent)] text-[10px] font-mono flex items-center space-x-1"
                        title={t('btn_google_calendar', 'Añadir directamente a Google Calendar')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="hidden sm:inline">GCAL</span>
                      </a>

                      {/* Copy Share Link */}
                      <button
                        onClick={(e) => handleShareSession(session, e)}
                        className="p-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] hover:border-white text-slate-400 hover:text-white text-[10px] font-mono"
                        title="Copiar información de la sesión"
                      >
                        {copiedSessionId === session.id ? <CheckCircle2 className="w-3 h-3 text-[#FDCC0D]" /> : <Share2 className="w-3 h-3" />}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
