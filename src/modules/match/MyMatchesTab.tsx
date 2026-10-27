// SGX Entrepreneur Match - My Matches Directory Tab

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  FileText, 
  Sparkles, 
  Check, 
  ExternalLink, 
  Users, 
  Zap,
  ArrowRight
} from 'lucide-react';
import { MutualMatch, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { PILLAR_META } from './MatchCard';
import { 
  getLocalMatches, 
  saveMatchPrivateNote, 
  exportContactAsVCard, 
  exportMatchesAsCSV 
} from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface MyMatchesTabProps {
  myUid: string;
  lang?: 'es' | 'en';
  onGoToDeck: () => void;
}

export const MyMatchesTab: React.FC<MyMatchesTabProps> = ({
  myUid,
  lang = 'es',
  onGoToDeck
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant } = useTenantTheme();
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  const [matches, setMatches] = useState<MutualMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeNoteMatchId, setActiveNoteMatchId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string>('');
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);

  useEffect(() => {
    setMatches(getLocalMatches());
  }, []);

  const getOtherCandidate = (m: MutualMatch): MatchCandidate | undefined => {
    return m.userA === myUid ? (m.candidateB || m.candidateA) : (m.candidateA || m.candidateB);
  };

  // Filtered by name, org, role, or pitch
  const filteredMatches = matches.filter(m => {
    const candidate = getOtherCandidate(m);
    if (!candidate) return false;
    const q = searchQuery.toLowerCase();
    return (
      candidate.displayName.toLowerCase().includes(q) ||
      (candidate.organization && candidate.organization.toLowerCase().includes(q)) ||
      (candidate.roleTitle && candidate.roleTitle.toLowerCase().includes(q)) ||
      (candidate.profile?.pitch && candidate.profile.pitch.toLowerCase().includes(q))
    );
  });

  const handleOpenNoteEditor = (m: MutualMatch) => {
    playUiChirp();
    setActiveNoteMatchId(m.id);
    setNoteDraft(m.notes?.[myUid] || '');
  };

  const handleSaveNote = async (matchId: string) => {
    setSavingNoteId(matchId);
    await saveMatchPrivateNote(matchId, myUid, noteDraft);
    setMatches(getLocalMatches());
    setSavingNoteId(null);
    setActiveNoteMatchId(null);
  };

  const handleExportAllCSV = () => {
    playUiChirp();
    exportMatchesAsCSV(matches, myUid);
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 text-white">
      {/* Search Bar & Export Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)]/60 rounded-2xl p-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={strings.mineSearch}
            className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[var(--sgx-neon)] focus:outline-none"
          />
        </div>

        {matches.length > 0 && (
          <button
            onClick={handleExportAllCSV}
            className="w-full sm:w-auto py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
            <span>{strings.mineExportCsv}</span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {filteredMatches.length === 0 ? (
        <div className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)]/60 rounded-3xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 mx-auto flex items-center justify-center mb-3 text-slate-500">
            <Users className="w-7 h-7" />
          </div>
          <h4 className="font-bold text-base mb-1 font-['Orbitron',sans-serif]">
            {matches.length === 0 ? strings.mineEmpty : (es ? 'No se encontraron resultados.' : 'No results found.')}
          </h4>
          <p className="text-xs text-slate-400 mb-5 font-mono">
            {matches.length === 0 ? (es ? 'Conecta con otros builders en el mazo para formar tu squad.' : 'Connect with other builders in the deck to form your squad.') : (es ? 'Prueba buscando con otro término.' : 'Try searching with another term.')}
          </p>

          {matches.length === 0 && (
            <button
              onClick={onGoToDeck}
              style={{
                backgroundColor: 'var(--sgx-primary)',
                boxShadow: '0 0 14px var(--sgx-glow)'
              }}
              className="py-2.5 px-5 rounded-xl text-black font-mono font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5 hover:brightness-110"
            >
              <span>{es ? 'Ir al mazo' : 'Go to the deck'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ) : (
        /* List of Mutual Matches */
        <div className="space-y-3">
          {filteredMatches.map(m => {
            const candidate = getOtherCandidate(m);
            if (!candidate) return null;
            const pillar = candidate.profile?.pillar || 'spark';
            const meta = PILLAR_META[pillar] || PILLAR_META.spark;
            const currentNote = m.notes?.[myUid];

            return (
              <div
                key={m.id}
                className="bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)]/60 hover:border-[var(--sgx-neon)] rounded-2xl p-4 transition-all shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center p-0.5 border flex-shrink-0"
                      style={{
                        borderColor: meta.primary,
                        backgroundColor: meta.bg
                      }}
                    >
                      {candidate.avatarUrl ? (
                        <img 
                          src={candidate.avatarUrl} 
                          alt={candidate.displayName}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-full h-full rounded-lg flex items-center justify-center font-bold text-base text-white font-mono bg-slate-900">
                          {candidate.displayName ? candidate.displayName.charAt(0).toUpperCase() : '⚡'}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-white truncate font-['Orbitron',sans-serif]">
                          {candidate.displayName}
                        </h4>
                        <span 
                          className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full border uppercase"
                          style={{
                            borderColor: `${meta.primary}66`,
                            color: meta.primary,
                            backgroundColor: `${meta.primary}18`
                          }}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate font-mono">
                        {candidate.roleTitle || candidate.organization || 'Founder'}
                      </p>
                    </div>
                  </div>

                  {/* Right actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleOpenNoteEditor(m)}
                      title={es ? 'Editar nota privada' : 'Edit private note'}
                      className={`p-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer ${
                        currentNote 
                          ? 'bg-amber-950/40 border-amber-500/40 text-amber-300' 
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => {
                        playUiChirp();
                        exportContactAsVCard(candidate);
                      }}
                      title={strings.mineExportVcard}
                      style={{
                        borderColor: 'rgba(var(--sgx-neon-rgb), 0.4)',
                        color: 'var(--sgx-neon)',
                        backgroundColor: 'rgba(var(--sgx-neon-rgb), 0.15)'
                      }}
                      className="p-2 rounded-xl border text-xs font-mono transition-colors cursor-pointer hover:brightness-125"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Pitch */}
                <p className="text-xs text-slate-300 mt-2.5 bg-[var(--sgx-bg)]/80 p-2.5 rounded-xl border border-[var(--sgx-secondary)]/50 leading-relaxed font-sans">
                  "{candidate.profile?.pitch}"
                </p>

                {/* Chips */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px] font-mono">
                  <span className="text-slate-400 text-[10px]">{es ? 'TRAE:' : 'BRINGS:'}</span>
                  {candidate.profile?.brings.slice(0, 3).map((b, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                      {b}
                    </span>
                  ))}
                  <span 
                    className="text-[10px] ml-2 font-bold"
                    style={{ color: 'var(--sgx-neon)' }}
                  >
                    {es ? 'BUSCA:' : 'SEEKS:'}
                  </span>
                  {candidate.profile?.seeking.map((s, i) => (
                    <span 
                      key={i} 
                      className="px-2 py-0.5 rounded border"
                      style={{
                        backgroundColor: 'rgba(var(--sgx-neon-rgb), 0.15)',
                        borderColor: 'rgba(var(--sgx-neon-rgb), 0.4)',
                        color: 'var(--sgx-neon)'
                      }}
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Private Note display or editor */}
                {activeNoteMatchId === m.id ? (
                  <div className="mt-3 pt-3 border-t border-[var(--sgx-secondary)]/60">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteDraft}
                        onChange={e => setNoteDraft(e.target.value)}
                        placeholder={strings.mineNotePlaceholder}
                        className="flex-1 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] rounded-xl px-3 py-1.5 text-xs text-white focus:border-[var(--sgx-neon)] focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveNote(m.id)}
                        disabled={savingNoteId === m.id}
                        style={{
                          backgroundColor: 'var(--sgx-primary)',
                          color: '#000000'
                        }}
                        className="py-1.5 px-3 rounded-xl font-mono font-bold text-xs cursor-pointer hover:brightness-110"
                      >
                        {savingNoteId === m.id ? '...' : (es ? 'Guardar' : 'Save')}
                      </button>
                      <button
                        onClick={() => setActiveNoteMatchId(null)}
                        className="py-1.5 px-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-400 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ) : currentNote ? (
                  <div className="mt-2.5 pt-2 border-t border-[var(--sgx-secondary)]/60 flex items-center justify-between text-xs text-amber-300/90 font-mono">
                    <span className="truncate">{es ? '📝 Nota: "' : '📝 Note: "'}{currentNote}"</span>
                    <button 
                      onClick={() => handleOpenNoteEditor(m)}
                      className="text-[10px] text-slate-400 hover:underline ml-2 flex-shrink-0"
                    >
                      {es ? 'Editar' : 'Edit'}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
