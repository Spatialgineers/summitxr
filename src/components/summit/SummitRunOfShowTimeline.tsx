import React, { useState } from 'react';
import { 
  Clock, 
  MapPin, 
  Calendar, 
  Sparkles, 
  Tv, 
  Radio, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  ChevronRight, 
  Layers, 
  Gamepad2, 
  Music, 
  Award,
  Users,
  Info
} from 'lucide-react';
import { SummitSession, SummitSpeaker, SummitPillarId } from '../../types/summit';
import { downloadICS, getGoogleCalendarUrl, SUMMIT_PILLARS } from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

interface SummitRunOfShowTimelineProps {
  sessions: SummitSession[];
  speakers: SummitSpeaker[];
  onOpenSessionModal?: (session: SummitSession) => void;
  onNavigateToNode?: (nodeId: string) => void;
  initialDay?: 1 | 2 | 3;
  onDayChange?: (day: 1 | 2 | 3) => void;
}

export const SummitRunOfShowTimeline: React.FC<SummitRunOfShowTimelineProps> = ({
  sessions,
  speakers,
  onOpenSessionModal,
  onNavigateToNode,
  initialDay,
  onDayChange,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedDay, setSelectedDay] = useState<1 | 2 | 3>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('day');
      if (p === '1' || p === '2' || p === '3') return Number(p) as 1 | 2 | 3;
    }
    return initialDay || 1;
  });

  const handleSelectDay = (day: 1 | 2 | 3) => {
    setSelectedDay(day);
    if (onDayChange) onDayChange(day);
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('day', String(day));
        window.history.replaceState(window.history.state, '', url.toString());
      } catch {}
    }
  };
  const [selectedPillarFilter, setSelectedPillarFilter] = useState<SummitPillarId | 'ALL'>('ALL');
  const [formatFilter, setFormatFilter] = useState<'ALL' | 'DIGITAL' | 'PHYSICAL' | 'HYBRID'>('ALL');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Day meta configuration based on Official Run of Show v2026.10.1
  const dayMeta = {
    1: {
      title: (es ? 'Día 1 — Viernes 11 de Diciembre' : 'Day 1 — Friday, December 11'),
      badge: (es ? '100% DIGITAL • YOUTUBE LIVE (PRINCIPAL) + LINKEDIN + FACEBOOK LIVE' : '100% DIGITAL • YOUTUBE LIVE (MAIN) + LINKEDIN + FACEBOOK LIVE'),
      hours: '10:00 AM – 4:30 PM AST (6h 30m)',
      focus: (es ? 'Apertura (30 min), un artista invitado de 15 min antes de cada pilar, 6 bloques de pilares de 25 min (SGX.Story → SGX.Showcase → SGX.Spark → SGX.Stage → SGX.System → SGX.Synthesize) y los portafolios de los 8 Initiates activos (2:30–4:00 p.m., 8 min c/u).' : 'Opening (30 min), a 15-min guest artist before each pillar, 6 pillar blocks of 25 min (SGX.Story → SGX.Showcase → SGX.Spark → SGX.Stage → SGX.System → SGX.Synthesize) and the portfolios of the 8 active Initiates (2:30–4:00 p.m., 8 min each).'),
      highlight: (es ? 'Al cierre (4:00–4:30 p.m.) se anuncian los 6 Initiates que presentan en el Día 3.' : 'At the closing (4:00–4:30 p.m.) the 6 Initiates who present on Day 3 are announced.'),
      themeColor: '#FDCC0D',
      streamNotice: (es ? 'Transmisión en YouTube Live con las presentaciones de artistas en Roblox. Artistas por anunciar: solo se publican los confirmados por escrito.' : 'Streamed on YouTube Live with the artist performances in Roblox. Artists to be announced: only those confirmed in writing are published.'),
    },
    2: {
      title: (es ? 'Día 2 — Sábado 12 de Diciembre (Día de la Industria)' : 'Day 2 — Saturday, December 12 (Industry Day)'),
      badge: (es ? '100% DIGITAL • YOUTUBE LIVE (PRINCIPAL) + LINKEDIN + FACEBOOK LIVE' : '100% DIGITAL • YOUTUBE LIVE (MAIN) + LINKEDIN + FACEBOOK LIVE'),
      hours: (es ? '10:00 AM – 4:00 PM AST (6h exactas)' : '10:00 AM – 4:00 PM AST (exactly 6h)'),
      focus: (es ? 'Introducción (30 min) con resumen del Día 1 y recordatorio de los 6 Initiates, 6 conversaciones de industria de 45 min (una por pilar, persona invitada por anunciar) con pausas de 10 min y cierre de 3:50 a 4:00 p.m.' : 'Introduction (30 min) with a Day 1 recap and a reminder of the 6 Initiates, 6 45-min industry conversations (one per pillar, guest TBA) with 10-min breaks, and the closing from 3:50 to 4:00 p.m.'),
      highlight: (es ? 'Orden oficial de conversaciones: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System y SGX.Synthesize.' : 'Official order of the conversations: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System and SGX.Synthesize.'),
      themeColor: '#00DDFF',
      streamNotice: (es ? '6 conversaciones profundas de industria y rondas de votación estilo Kahoot (+25 XP).' : '6 in-depth industry conversations and Kahoot-style voting rounds (+25 XP).'),
    },
    3: {
      title: (es ? 'Día 3 — Domingo 13 de Diciembre (SGX Showcase)' : 'Day 3 — Sunday, December 13 (SGX Showcase)'),
      badge: (es ? 'HÍBRIDO • CHROMA SPACE STUDIOS (SAN JUAN) • POR INVITACIÓN, 40–60 PERSONAS + YOUTUBE LIVE' : 'HYBRID • CHROMA SPACE STUDIOS (SAN JUAN) • BY INVITATION, 40–60 PEOPLE + YOUTUBE LIVE'),
      hours: '10:00 AM – 4:00 PM AST (6h)',
      focus: (es ? 'Ricardo marca el ambiente; Danelson con su avatar y captura facial en tiempo real; dos artistas invitados (por confirmar), uno con los visualizadores de SGX; y la SGX Guild Ranked Trials Pitch Session con los top 6 Initiates (5 min c/u).' : 'Ricardo sets the mood; Danelson with his avatar and real-time facial capture; two guest artists (TBC), one with the SGX visualizers; and the SGX Guild Ranked Trials Pitch Session with the top 6 Initiates (5 min each).'),
      highlight: (es ? 'Networking con votación gamificada y canje de premios, interacción libre y cierre con el Premio Mayor "Spatialgineers activa tu evento". Sesión "Grit" con artistas: por confirmar.' : 'Networking with gamified voting and prize redemption, open interaction and a closing with the Grand Prize "Spatialgineers activa tu evento" (Spatialgineers activates your event). "Grit" session with artists: TBC.'),
      themeColor: '#FFFFFF',
      streamNotice: (es ? 'Presencial en Chroma Space Studios (San Juan, por invitación y cupo limitado) y en vivo por YouTube, LinkedIn y Facebook Live.' : 'In person at Chroma Space Studios (San Juan, by invitation, limited capacity) and live on YouTube, LinkedIn and Facebook Live.'),
    },
  };

  const currentMeta = dayMeta[selectedDay];

  // Filter day sessions
  const daySessions = sessions
    .filter(s => s.day === selectedDay)
    .filter(s => selectedPillarFilter === 'ALL' || s.pillarId === selectedPillarFilter)
    .filter(s => formatFilter === 'ALL' || s.format === formatFilter)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  const getPillarBadge = (pillarId?: SummitPillarId) => {
    if (!pillarId) return null;
    const pillar = SUMMIT_PILLARS.find(p => p.id === pillarId);
    const color = pillar?.color || '#FDCC0D';
    return (
      <span 
        className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded border tracking-wider inline-flex items-center gap-1"
        style={{ borderColor: `${color}60`, backgroundColor: `${color}15`, color: color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {pillarId}
      </span>
    );
  };

  const getFormatBadge = (format: string) => {
    switch (format) {
      case 'DIGITAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-cyan-950/60 border border-[#00DDFF]/40 text-[#00DDFF] rounded">
            Digital Stream
          </span>
        );
      case 'PHYSICAL':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-amber-950/60 border border-[#FDCC0D]/40 text-[#FDCC0D] rounded">
            {es ? 'Presencial San Juan' : 'In person, San Juan'}
          </span>
        );
      case 'HYBRID':
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-slate-900 border border-white/60 text-white rounded">
            {es ? 'Híbrido (Estudio + Stream)' : 'Hybrid (Studio + Stream)'}
          </span>
        );
      default:
        return null;
    }
  };

  const getSessionSpeakers = (speakerIds: string[]) => {
    return speakerIds
      .map(id => speakers.find(s => s.id === id))
      .filter((s): s is SummitSpeaker => !!s);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#121212]/90 p-5 md:p-6 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FDCC0D]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00DDFF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/40">
                {es ? 'OFFICIAL RUN OF SHOW • 3 DÍAS' : 'OFFICIAL RUN OF SHOW • 3 DAYS'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700">
                Ground Truth Canon
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              {es ? 'Línea de Tiempo & Minuto a Minuto del Summit' : 'Summit Timeline & Minute by Minute'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              {es ? 'Estructura cronológica oficial basada en el ' : 'Official chronological structure based on the '}<strong className="text-[#FDCC0D]">Run of Show v2026.10.1</strong>{es ? '. Navega cada bloque: pilares e Initiates (Día 1), Día de la Industria (Día 2) y el SGX Showcase (Día 3). Artistas y speakers se anuncian solo cuando estén confirmados por escrito.' : '. Browse each block: pillars and Initiates (Day 1), Industry Day (Day 2) and the SGX Showcase (Day 3). Artists and speakers are announced only once confirmed in writing.'}
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 text-left">
              <div className="text-[10px] font-mono text-slate-400 uppercase">{es ? 'Total Bloques' : 'Total Blocks'}</div>
              <div className="text-lg font-bold text-white font-mono">{sessions.length}{es ? ' Sesiones' : ' Sessions'}</div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 text-left">
              <div className="text-[10px] font-mono text-slate-400 uppercase">Speakers & Initiates</div>
              <div className="text-lg font-bold text-[#00DDFF] font-mono">{speakers.length}{es ? ' Creadores' : ' Creators'}</div>
            </div>
          </div>
        </div>

        {/* Day Tabs with SGX 45deg cuts */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map(dayNum => {
            const isDaySelected = selectedDay === dayNum;
            const meta = dayMeta[dayNum as 1 | 2 | 3];
            return (
              <button
                key={dayNum}
                onClick={() => handleSelectDay(dayNum as 1 | 2 | 3)}
                className={`relative text-left p-3.5 border transition-all cursor-pointer shadow-md ${
                  isDaySelected
                    ? 'border-[var(--sgx-primary)] bg-[var(--sgx-primary)]/15 text-white shadow-[0_0_20px_rgba(var(--sgx-primary-rgb),0.25)]'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--sgx-primary)]">
                    {es ? 'DÍA ' : 'DAY '}{dayNum}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {dayNum === 1 ? (es ? '11 DIC' : 'DEC 11') : dayNum === 2 ? (es ? '12 DIC' : 'DEC 12') : (es ? '13 DIC' : 'DEC 13')}
                  </span>
                </div>
                <div className="text-sm font-bold text-white mt-1">
                  {dayNum === 1 ? (es ? 'Pilares & Initiates' : 'Pillars & Initiates') : dayNum === 2 ? (es ? 'Día de la Industria' : 'Industry Day') : 'SGX Showcase'}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-1 font-mono">
                  {meta.badge}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Info Banner with SGX 45deg cut */}
      <div 
        className="p-4 sm:p-5 border border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="p-2.5 bg-[#FDCC0D]/10 border border-[#FDCC0D]/40 text-[#FDCC0D] shrink-0 mt-0.5"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {currentMeta.title}
              </span>
              <span 
                className="text-[10px] font-mono text-[#00DDFF] px-2 py-0.5 bg-cyan-950/60 border border-[#00DDFF]/30 font-bold"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                {currentMeta.hours}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              {currentMeta.focus}
            </p>
            <div className="text-[11px] text-[#FDCC0D] mt-1 font-mono flex items-center gap-1.5 font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentMeta.highlight}</span>
            </div>
          </div>
        </div>

        {/* Filter controls with SGX 45deg cut */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <select
            value={selectedPillarFilter}
            onChange={(e) => setSelectedPillarFilter(e.target.value as any)}
            className="text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 focus:border-[#FDCC0D] focus:outline-none cursor-pointer"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <option value="ALL">{es ? 'Todos los Pilares' : 'All Pillars'}</option>
            {SUMMIT_PILLARS.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value as any)}
            className="text-xs font-mono bg-slate-900 border border-slate-700 text-slate-200 px-2.5 py-1.5 focus:border-[#FDCC0D] focus:outline-none cursor-pointer"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <option value="ALL">{es ? 'Cualquier Formato' : 'Any Format'}</option>
            <option value="DIGITAL">{es ? 'Solo Digital' : 'Digital Only'}</option>
            <option value="PHYSICAL">{es ? 'Presencial San Juan' : 'In person, San Juan'}</option>
            <option value="HYBRID">{es ? 'Híbrido' : 'Hybrid'}</option>
          </select>
        </div>
      </div>

      {/* Timeline Stream with SGX 45deg session cards */}
      <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-[#FDCC0D] before:via-[#00DDFF] before:to-[#32527B]">
        {daySessions.length === 0 ? (
          <div 
            className="p-8 text-center border border-dashed border-slate-800 bg-slate-950/50"
            style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
          >
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-mono">{es ? 'No se encontraron sesiones para los filtros seleccionados.' : 'No sessions found for the selected filters.'}</p>
          </div>
        ) : (
          daySessions.map((session, index) => {
            const sessionSpeakers = getSessionSpeakers(session.speakerIds);
            const isExpanded = expandedSessionId === session.id;
            const googleCalUrl = getGoogleCalendarUrl(session, language);

            return (
              <div 
                key={session.id}
                className="relative group transition-all"
              >
                {/* Timeline node icon */}
                <div className={`absolute -left-6 sm:-left-8 top-4 w-4 h-4 rounded-full border-2 transition-all ${
                  session.format === 'PHYSICAL'
                    ? 'border-[#FDCC0D] bg-[#FDCC0D] shadow-[0_0_10px_#FDCC0D]'
                    : session.format === 'HYBRID'
                    ? 'border-white bg-white shadow-[0_0_10px_#FFFFFF]'
                    : 'border-[#00DDFF] bg-[#121212] shadow-[0_0_8px_#00DDFF]'
                }`} />

                {/* Card Container with SGX 45deg cut */}
                <div 
                  className={`border transition-all p-4 sm:p-5 ${
                    isExpanded 
                      ? 'border-[#FDCC0D] bg-[#191919] shadow-[0_0_25px_rgba(253,204,13,0.15)]' 
                      : 'border-slate-800/90 bg-[#121212]/90 hover:border-slate-700 hover:bg-[#171717]'
                  }`}
                  style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
                >
                  {/* Top Bar: Time, Badges & Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2.5 py-1 bg-slate-900 border border-slate-700 font-mono text-xs font-bold text-[#FDCC0D] flex items-center gap-1.5 shadow-sm"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        <Clock className="w-3.5 h-3.5 text-[#FDCC0D]" />
                        {session.startTime} – {session.endTime}
                      </span>
                      {getPillarBadge(session.pillarId)}
                      {getFormatBadge(session.format)}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <a
                        href={googleCalUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={es ? 'Añadir a Google Calendar' : 'Add to Google Calendar'}
                        className="p-1.5 border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-[#FDCC0D] hover:border-[#FDCC0D]/40 transition-colors"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </a>
                      <button
                        onClick={() => downloadICS(session, language)}
                        title={es ? 'Descargar archivo .ics' : 'Download .ics file'}
                        className="p-1.5 border border-slate-800 bg-slate-900/60 text-slate-400 hover:text-[#00DDFF] hover:border-[#00DDFF]/40 transition-colors cursor-pointer"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      {onOpenSessionModal && (
                        <button
                          onClick={() => onOpenSessionModal(session)}
                          className="px-2.5 py-1 border border-slate-700 bg-slate-800 text-[11px] font-mono text-white hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                          style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                        >
                          <span>{es ? 'Detalles' : 'Details'}</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mt-3 cursor-pointer" onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}>
                    <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-[#FDCC0D] transition-colors">
                      {loc(session, 'title', language)}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 mt-1 font-medium">
                      {loc(session, 'subtitle', language)}
                    </p>
                  </div>

                  {/* Description preview / full */}
                  <p className={`text-xs text-slate-400 mt-2 leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                    {loc(session, 'description', language)}
                  </p>

                  {/* Speakers and Facilitators */}
                  {sessionSpeakers.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#FDCC0D]" />
                        <span>{es ? 'Ponente(s):' : 'Speaker(s):'}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {sessionSpeakers.map(spk => (
                          <div 
                            key={spk.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-xs text-slate-200"
                          >
                            {spk.avatarUrl ? (
                              <img src={spk.avatarUrl} alt={spk.name} className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <span className="w-4 h-4 rounded-full bg-[#FDCC0D]/20 text-[#FDCC0D] text-[9px] flex items-center justify-center font-bold">
                                {spk.name.charAt(0)}
                              </span>
                            )}
                            <span className="font-medium text-slate-100">{spk.name}</span>
                            <span className="text-[10px] font-mono text-slate-400">({loc(spk, 'role', language)})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Location & Tags Footer */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-[#00DDFF]" />
                      <span className="font-mono text-[11px] text-slate-300">{loc(session, 'venueLocation', language)}</span>
                      {session.mapNodeId && onNavigateToNode && (
                        <button
                          onClick={() => onNavigateToNode(session.mapNodeId!)}
                          className="ml-1 text-[10px] text-[#00DDFF] underline hover:text-[#FDCC0D]"
                        >
                          {es ? 'Ver en Mapa 360°' : 'View on 360° Map'}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      {loc(session, 'tags', language).slice(0, 4).map(tag => (
                        <span key={tag} className="text-[9px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800">
                          #{tag}
                        </span>
                      ))}
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
