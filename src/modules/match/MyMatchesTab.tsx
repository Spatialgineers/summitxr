// SGX Entrepreneur Match - My Matches Directory Tab

import React, { useState, useEffect } from 'react';
import { Search, Download, FileText, Users, ArrowRight, X } from 'lucide-react';
import { MutualMatch, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { PILLAR_META, MatchAvatar } from './MatchCard';
import { 
  getLocalMatches, 
  saveMatchPrivateNote, 
  exportContactAsVCard, 
  exportMatchesAsCSV 
} from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
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
    <div className="sgx-match__mine">
      <div className="sgx-card sgx-card--sm sgx-match__bar">
        <label className="sgx-search">
          <Search aria-hidden />
          <span className="sr-only">{strings.mineSearch}</span>
          <input type="search" className="sgx-input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={strings.mineSearch} />
        </label>
        {matches.length > 0 && (
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={handleExportAllCSV}>
            <Download aria-hidden />{strings.mineExportCsv}
          </button>
        )}
      </div>

      {filteredMatches.length === 0 ? (
        <div className="sgx-card sgx-match__empty">
          <Users aria-hidden />
          <h3 className="sgx-h">{matches.length === 0 ? strings.mineEmpty : (es ? 'No se encontraron resultados.' : 'No results found.')}</h3>
          <p className="sgx-copy">
            {matches.length === 0 ? (es ? 'Conecta con otros creadores en el mazo para armar tu red.' : 'Connect with other creators in the deck to build your network.') : (es ? 'Prueba con otro término.' : 'Try another term.')}
          </p>
          {matches.length === 0 && (
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={onGoToDeck}>
              {es ? 'Ir al mazo' : 'Go to the deck'}<ArrowRight aria-hidden />
            </button>
          )}
        </div>
      ) : (
        <ul className="sgx-match__list">
          {filteredMatches.map(m => {
            const candidate = getOtherCandidate(m);
            if (!candidate) return null;
            const pillar = candidate.profile?.pillar || 'spark';
            const meta = PILLAR_META[pillar] || PILLAR_META.spark;
            const currentNote = m.notes?.[myUid];

            return (
              <li key={m.id} className="sgx-card sgx-card--stripe sgx-match__item" style={{ ['--card-accent' as string]: meta.primary }}>
                <div className="sgx-match__item-head">
                  <MatchAvatar candidate={candidate} accent={meta.primary} size={48} />
                  <div className="sgx-mcard__who">
                    <h3>{candidate.displayName}</h3>
                    <p>{candidate.roleTitle || candidate.organization || (es ? 'Creador' : 'Creator')}</p>
                  </div>
                  <span className="sgx-chip" style={{ ['--chip' as string]: meta.primary }}>{meta.label}</span>
                  <div className="sgx-match__item-actions">
                    <button type="button" className="sgx-iconbtn" aria-pressed={!!currentNote} onClick={() => handleOpenNoteEditor(m)} aria-label={es ? 'Editar nota privada' : 'Edit private note'}>
                      <FileText aria-hidden />
                    </button>
                    <button type="button" className="sgx-iconbtn" onClick={() => { playUiChirp(); exportContactAsVCard(candidate); }} aria-label={strings.mineExportVcard}>
                      <Download aria-hidden />
                    </button>
                  </div>
                </div>

                <blockquote className="sgx-mcard__pitch">{candidate.profile?.pitch}</blockquote>

                <div className="sgx-chip-row">
                  {candidate.profile?.brings.slice(0, 3).map((b, i) => <span key={i} className="sgx-chip sgx-chip--ghost">{b}</span>)}
                  {candidate.profile?.seeking.map((s, i) => <span key={i} className="sgx-chip"><ArrowRight aria-hidden />{s}</span>)}
                </div>

                {activeNoteMatchId === m.id ? (
                  <div className="sgx-match__note">
                    <label className="sr-only" htmlFor={`note-${m.id}`}>{strings.mineNotePlaceholder}</label>
                    <input id={`note-${m.id}`} type="text" className="sgx-input" value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder={strings.mineNotePlaceholder} />
                    <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => handleSaveNote(m.id)} disabled={savingNoteId === m.id}>
                      {savingNoteId === m.id ? '…' : (es ? 'Guardar' : 'Save')}
                    </button>
                    <button type="button" className="sgx-iconbtn" onClick={() => setActiveNoteMatchId(null)} aria-label={es ? 'Cancelar' : 'Cancel'}><X aria-hidden /></button>
                  </div>
                ) : currentNote ? (
                  <p className="sgx-match__note-view">
                    <FileText aria-hidden /><span>{currentNote}</span>
                    <button type="button" onClick={() => handleOpenNoteEditor(m)}>{es ? 'Editar' : 'Edit'}</button>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
