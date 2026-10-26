import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  ExternalLink, 
  Twitter, 
  Linkedin, 
  Instagram, 
  Github, 
  Globe, 
  Award, 
  Layers, 
  Radio, 
  Music, 
  Building2, 
  Tv, 
  X, 
  CheckCircle2, 
  Flame,
  Calendar,
  ChevronRight
} from 'lucide-react';
import { SummitSpeaker, SummitPillarId, SummitSession } from '../../types/summit';
import { SUMMIT_PILLARS } from '../../lib/summitData';

interface SummitSpeakersDeckProps {
  speakers: SummitSpeaker[];
  sessions: SummitSession[];
  onSelectSpeaker?: (speaker: SummitSpeaker) => void;
  onOpenSessionModal?: (session: SummitSession) => void;
  onOpenSpeakerPortal?: () => void;
}

type CategoryFilter = 'ALL' | 'HOSTS' | 'PILOTS';

export const getSafePilotAvatar = (url?: string, pillarId?: SummitPillarId): string => {
  if (url && !url.includes('unsplash.com')) return url;
  switch (pillarId) {
    case 'SGX.STAGE': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png';
    case 'SGX.SYSTEM': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png';
    case 'SGX.SPARK': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png';
    case 'SGX.SHOWCASE': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png';
    case 'SGX.STORY': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Story%20Icon%20BY.png';
    case 'SGX.SYNTHESIZE': return 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png';
    default: return 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
  }
};

export const SummitSpeakersDeck: React.FC<SummitSpeakersDeckProps> = ({
  speakers,
  sessions,
  onSelectSpeaker,
  onOpenSessionModal,
  onOpenSpeakerPortal,
}) => {
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('ALL');
  const [activePillar, setActivePillar] = useState<SummitPillarId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectedSpeaker, setInspectedSpeaker] = useState<SummitSpeaker | null>(null);

  // Classify each speaker: Only Danelson and Ricardo are pre-confirmed founders/hosts; others are registered pilot speakers
  const classifiedSpeakers = useMemo(() => {
    return speakers.map(spk => {
      let category: CategoryFilter = 'PILOTS';
      if (spk.id === 'spk_danelson' || spk.id === 'spk_ricardo') {
        category = 'HOSTS';
      }
      return { 
        ...spk, 
        avatarUrl: getSafePilotAvatar(spk.avatarUrl, spk.pillarId),
        category 
      };
    });
  }, [speakers]);

  // Filtered list
  const filteredSpeakers = useMemo(() => {
    return classifiedSpeakers.filter(spk => {
      if (activeCategory !== 'ALL' && spk.category !== activeCategory) return false;
      if (activePillar !== 'ALL' && spk.pillarId !== activePillar) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = spk.name.toLowerCase().includes(q);
        const matchHandle = spk.handle?.toLowerCase().includes(q);
        const matchRole = spk.role.toLowerCase().includes(q);
        const matchOrg = spk.organization?.toLowerCase().includes(q);
        const matchBio = spk.bio?.toLowerCase().includes(q);
        if (!matchName && !matchHandle && !matchRole && !matchOrg && !matchBio) return false;
      }
      return true;
    });
  }, [classifiedSpeakers, activeCategory, activePillar, searchQuery]);

  const categoriesMeta: { id: CategoryFilter; label: string; count: number; icon: any }[] = [
    { id: 'ALL', label: 'Todos', count: classifiedSpeakers.length, icon: Users },
    { id: 'HOSTS', label: 'Hosts & Fundadores', count: classifiedSpeakers.filter(s => s.category === 'HOSTS').length, icon: Award },
    { id: 'PILOTS', label: 'Pilotos Registrados', count: classifiedSpeakers.filter(s => s.category === 'PILOTS').length, icon: Sparkles },
  ];

  const getPillarColor = (pillarId?: SummitPillarId) => {
    switch (pillarId) {
      case 'SGX.STORY': return '#FDCC0D';
      case 'SGX.SHOWCASE': return '#00DDFF';
      case 'SGX.SPARK': return '#FFBB00';
      case 'SGX.STAGE': return '#FFFFFF';
      case 'SGX.SYSTEM': return '#32527B';
      case 'SGX.SYNTHESIZE': return '#00DDFF';
      default: return '#FDCC0D';
    }
  };

  // Find sessions where this speaker appears
  const getSpeakerSessions = (speakerId: string) => {
    return sessions.filter(s => s.speakerIds?.includes(speakerId));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#121212]/90 p-5 md:p-6 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FDCC0D]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00DDFF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-[#00DDFF]/10 text-[#00DDFF] border border-[#00DDFF]/30">
                3D INTERACTIVE CARD DECK
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700">
                Roster Oficial
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              Directorio de Ponentes, Artistas & SGX Guild
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Conoce a los creadores detrás de cada pilar tecnológico: los fundadores de Spatialgineers, ponentes de industria, 
              músicos en Roblox y los 10 Initiates seleccionados de los Ranked Trials con su Growth Factor.
            </p>
          </div>

          {/* Quick Search & Register CTA */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o pilar..."
                className="w-full bg-slate-900/90 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-[#FDCC0D] focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                  detail: {
                    role: 'SPEAKER',
                    name: 'Speaker SGX',
                    title: 'Ponente Oficial',
                    org: 'Spatialgineers Summit 2026'
                  }
                }));
              }}
              className="px-3 py-2 bg-cyan-500/20 hover:bg-cyan-500 hover:text-black border border-cyan-400 text-cyan-300 font-extrabold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-lg shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>🎨 Crear Holo Card</span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (onOpenSpeakerPortal) onOpenSpeakerPortal();
                else window.dispatchEvent(new CustomEvent('sgx:open_speaker_portal'));
              }}
              className="px-3 py-2 bg-[#FDCC0D] hover:bg-yellow-300 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 rounded-lg shadow-md shadow-yellow-500/20 shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 fill-black" />
              <span>Crear Perfil</span>
            </button>
          </div>
        </div>

        {/* Category Filters Pills */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
          {categoriesMeta.filter(cat => cat.id === 'ALL' || cat.count > 0).map(cat => {
            const Icon = cat.icon;
            const isSelected = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center gap-1.5 border ${
                  isSelected
                    ? 'border-[#FDCC0D] bg-[#FDCC0D]/15 text-[#FDCC0D] shadow-[0_0_12px_rgba(253,204,13,0.2)]'
                    : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300">
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Pillar Filter Bar */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Filtrar por Pilar:
          </span>
          <button
            onClick={() => setActivePillar('ALL')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border transition-all ${
              activePillar === 'ALL'
                ? 'border-white bg-white/10 text-white'
                : 'border-slate-800 bg-slate-900/40 text-slate-500 hover:text-slate-300'
            }`}
          >
            Todos
          </button>
          {SUMMIT_PILLARS.map(p => {
            const isSelected = activePillar === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePillar(p.id)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'border-current bg-slate-900 font-bold'
                    : 'border-slate-800 bg-slate-900/30 opacity-70 hover:opacity-100'
                }`}
                style={{ color: p.color }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                <span>{p.id.replace('SGX.', '')}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D Holographic Card Deck Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredSpeakers.map((speaker, index) => {
          const pillarColor = getPillarColor(speaker.pillarId);
          const speakerSessions = getSpeakerSessions(speaker.id);
          const isFounder = speaker.category === 'HOSTS';

          return (
            <div
              key={speaker.id}
              onClick={() => {
                setInspectedSpeaker(speaker);
                if (onSelectSpeaker) onSelectSpeaker(speaker);
              }}
              style={{
                perspective: '1000px',
              }}
              className="cursor-pointer group"
            >
              <div 
                className="relative rounded-xl border border-slate-800 sgx-crystal-card p-5 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_36px_rgba(0,0,0,0.65)] overflow-hidden"
                style={{
                  borderColor: `${pillarColor}55`,
                }}
              >
                {/* Glow bar top */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1 transition-all duration-300 group-hover:h-1.5"
                  style={{ backgroundColor: pillarColor }}
                />

                {/* Badges top right */}
                <div className="flex items-center justify-between gap-1 mb-3">
                  <span 
                    className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border"
                    style={{ borderColor: `${pillarColor}60`, backgroundColor: `${pillarColor}15`, color: pillarColor }}
                  >
                    {speaker.pillarId || 'SGX.CORE'}
                  </span>

                  {isFounder ? (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/50 flex items-center gap-1">
                      <Flame className="w-2.5 h-2.5" />
                      FOUNDER & KEYNOTE
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#00DDFF]/20 text-[#00DDFF] border border-[#00DDFF]/50 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      PILOTO REGISTRADO
                    </span>
                  )}
                </div>

                {/* Pilot Avatar & Profile */}
                <div className="flex items-start gap-3.5">
                  <div className="relative shrink-0">
                    <img 
                      src={speaker.avatarUrl} 
                      alt={speaker.name} 
                      className="w-14 h-14 rounded-xl object-contain p-1 bg-black/60 border border-slate-700 group-hover:border-white transition-colors"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png';
                      }}
                    />
                    {speaker.isKeynote && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-[#FDCC0D] text-black text-[9px] flex items-center justify-center font-bold">
                        ★
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#FDCC0D] transition-colors truncate font-['Orbitron',sans-serif]">
                      {speaker.name}
                    </h3>
                    <div className="text-[11px] font-mono text-cyan-400 truncate">
                      {speaker.handle || `@${speaker.name.toLowerCase().replace(/\s+/g, '_')}`}
                    </div>
                    <div className="text-[10px] text-slate-300 font-medium truncate mt-0.5">
                      {speaker.role}
                    </div>
                  </div>
                </div>

                {/* Bio snippet */}
                <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed font-sans">
                  {speaker.bio || 'Participante oficial en Spatialgineers Summit 2026.'}
                </p>

                {/* Organization & Session Count */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span className="truncate max-w-[150px]">
                    {speaker.organization || 'Spatialgineers Ecosystem'}
                  </span>
                  <span className="text-[#00DDFF] flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {speakerSessions.length} {speakerSessions.length === 1 ? 'bloque' : 'bloques'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Dynamic Slot: Convocatoria Abierta · Crea tu Perfil de Piloto */}
        <div
          onClick={() => {
            if (onOpenSpeakerPortal) onOpenSpeakerPortal();
            else window.dispatchEvent(new CustomEvent('sgx:open_speaker_portal'));
          }}
          className="cursor-pointer group h-full"
        >
          <div className="relative rounded-xl border-2 border-dashed border-[#00DDFF]/50 hover:border-[#FDCC0D] p-5 bg-gradient-to-b from-[#131313]/90 to-[#0C0C0C]/90 transition-all duration-300 ease-out group-hover:-translate-y-1.5 group-hover:shadow-[0_16px_36px_rgba(0, 221, 255,0.25)] flex flex-col justify-between h-full min-h-[240px]">
            <div>
              <div className="flex items-center justify-between gap-1 mb-3">
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border border-[#00DDFF]/40 bg-[#00DDFF]/10 text-[#00DDFF]">
                  CONVOCATORIA
                </span>
                <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/40 animate-pulse">
                  SLOTS DISPONIBLES
                </span>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-400/50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-6 h-6 text-[#00DDFF]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-[#FDCC0D] transition-colors font-['Orbitron',sans-serif]">
                    Crea tu Perfil de Piloto Speaker
                  </h3>
                  <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                    Spatial Computing · WebXR · Audio 3D · IA
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed font-sans">
                Por ahora los únicos ponentes confirmados son Danelson y Ricardo. Los demás ponentes deben registrar y calibrar su perfil de piloto para unirse a la agenda oficial.
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-[#FDCC0D] group-hover:text-yellow-300">
              <span>Registrar mi Perfil</span>
              <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Speaker Modal */}
      {inspectedSpeaker && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setInspectedSpeaker(null)}
        >
          <div 
            className="relative w-full max-w-lg rounded-2xl border border-slate-800 bg-[#121212] p-6 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            style={{
              borderColor: `${getPillarColor(inspectedSpeaker.pillarId)}80`
            }}
          >
            {/* Modal top glow */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5"
              style={{ backgroundColor: getPillarColor(inspectedSpeaker.pillarId) }}
            />

            <button
              onClick={() => setInspectedSpeaker(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="flex items-start gap-4">
              {inspectedSpeaker.avatarUrl ? (
                <img 
                  src={inspectedSpeaker.avatarUrl} 
                  alt={inspectedSpeaker.name} 
                  className="w-16 h-16 rounded-xl object-contain p-1 bg-black/60 border-2 border-slate-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png';
                  }}
                />
              ) : (
                <div 
                  className="w-16 h-16 rounded-xl flex items-center justify-center font-bold text-2xl border-2 border-slate-700"
                  style={{ backgroundColor: `${getPillarColor(inspectedSpeaker.pillarId)}20`, color: getPillarColor(inspectedSpeaker.pillarId) }}
                >
                  {inspectedSpeaker.name.charAt(0)}
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <span 
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                    style={{ backgroundColor: `${getPillarColor(inspectedSpeaker.pillarId)}20`, color: getPillarColor(inspectedSpeaker.pillarId) }}
                  >
                    {inspectedSpeaker.pillarId || 'SGX.CORE'}
                  </span>
                  <span className="text-xs font-mono text-slate-400">{inspectedSpeaker.handle}</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">
                  {inspectedSpeaker.name}
                </h3>
                <div className="text-xs text-slate-300">{inspectedSpeaker.role}</div>
                <div className="text-[11px] font-mono text-[#FDCC0D]">{inspectedSpeaker.organization}</div>
              </div>
            </div>

            {/* Bio */}
            <div className="mt-4 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-1">
                Biografía Canónica:
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {inspectedSpeaker.bio}
              </p>
            </div>

            {/* Social links */}
            {inspectedSpeaker.socialLinks && (
              <div className="mt-3 flex items-center gap-2">
                {inspectedSpeaker.socialLinks.twitter && (
                  <a href={inspectedSpeaker.socialLinks.twitter} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#00DDFF]">
                    <Twitter className="w-4 h-4" />
                  </a>
                )}
                {inspectedSpeaker.socialLinks.linkedin && (
                  <a href={inspectedSpeaker.socialLinks.linkedin} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#00DDFF]">
                    <Linkedin className="w-4 h-4" />
                  </a>
                )}
                {inspectedSpeaker.socialLinks.instagram && (
                  <a href={inspectedSpeaker.socialLinks.instagram} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#FDCC0D]">
                    <Instagram className="w-4 h-4" />
                  </a>
                )}
                {inspectedSpeaker.socialLinks.github && (
                  <a href={inspectedSpeaker.socialLinks.github} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white">
                    <Github className="w-4 h-4" />
                  </a>
                )}
                {inspectedSpeaker.socialLinks.portfolio && (
                  <a href={inspectedSpeaker.socialLinks.portfolio} target="_blank" rel="noreferrer" className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-[#FDCC0D] flex items-center gap-1 text-xs font-mono">
                    <Globe className="w-4 h-4" />
                    <span>Portafolio</span>
                  </a>
                )}
              </div>
            )}

            {/* Sessions in Summit */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-2">
                Participación en el Run of Show:
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {getSpeakerSessions(inspectedSpeaker.id).map(session => (
                  <div 
                    key={session.id}
                    onClick={() => {
                      if (onOpenSessionModal) onOpenSessionModal(session);
                    }}
                    className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-[#FDCC0D] cursor-pointer transition-colors flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white line-clamp-1">{session.title}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Día {session.day} • {session.startTime} – {session.endTime}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                ))}
              </div>
            </div>
            {/* Holo Card Generator CTA for this Speaker */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                    detail: {
                      role: 'SPEAKER',
                      name: inspectedSpeaker.name,
                      title: inspectedSpeaker.role,
                      org: inspectedSpeaker.organization,
                      handle: inspectedSpeaker.handle || inspectedSpeaker.socialLinks?.twitter || inspectedSpeaker.socialLinks?.linkedin,
                      photoUrl: inspectedSpeaker.avatarUrl,
                      bio: inspectedSpeaker.bio,
                      portfolio: inspectedSpeaker.socialLinks?.portfolio,
                      tier: 'SPEAKER'
                    }
                  }));
                }}
                className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500 hover:text-black border border-cyan-400 text-cyan-300 font-bold text-xs font-mono uppercase tracking-wider rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/10"
              >
                <Sparkles className="w-4 h-4" />
                <span>🪪 OBTENER CREDENCIAL HOLOGRÁFICA (PNG)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
