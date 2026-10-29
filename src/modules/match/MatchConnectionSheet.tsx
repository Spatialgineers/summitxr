// SGX Entrepreneur Match - Post-Match Celebratory Sheet

import React, { useState } from 'react';
import { Download, FileText, Check, Zap, Users } from 'lucide-react';
import { MutualMatch, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { PILLAR_META, MatchAvatar } from './MatchCard';
import { exportContactAsVCard, saveMatchPrivateNote } from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';
import { SgxDialog } from '../../components/common/SgxDialog';

interface MatchConnectionSheetProps {
  match: MutualMatch;
  myUid: string;
  lang?: 'es' | 'en';
  onClose: () => void;
  onGoToMatches: () => void;
}

export const MatchConnectionSheet: React.FC<MatchConnectionSheetProps> = ({
  match,
  myUid,
  lang = 'es',
  onClose,
  onGoToMatches
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  const candidate = match.userA === myUid 
    ? (match.candidateB || match.candidateA)
    : (match.candidateA || match.candidateB);

  const [note, setNote] = useState<string>(match.notes?.[myUid] || '');
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);
  const [noteSaved, setNoteSaved] = useState<boolean>(false);

  if (!candidate) return null;

  const pillar = candidate.profile?.pillar || 'spark';
  const meta = PILLAR_META[pillar] || PILLAR_META.spark;

  const handleSaveNote = async () => {
    setIsSavingNote(true);
    await saveMatchPrivateNote(match.id, myUid, note);
    setIsSavingNote(false);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleExportVCard = () => {
    playUiChirp();
    exportContactAsVCard(candidate);
  };

  return (
    <SgxDialog
      onClose={onClose}
      size="sm"
      accent={meta.primary}
      className="sgx-dialog--fit"
      title={strings.hitTitle}
      kicker={<><Zap aria-hidden className="sgx-match__inline-icon" />{strings.hitSubtitle}</>}
      footer={
        <>
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={onClose}>{es ? 'Seguir descubriendo' : 'Keep discovering'}</button>
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={onGoToMatches}><Users aria-hidden />{strings.hitViewMatches}</button>
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleExportVCard}><Download aria-hidden />{strings.hitSaveVcard} (.vcf)</button>
        </>
      }
    >
      <div className="sgx-match__hit">
        <div className="sgx-card sgx-card--stripe" style={{ ['--card-accent' as string]: meta.primary }}>
          <div className="sgx-match__item-head">
            <MatchAvatar candidate={candidate} accent={meta.primary} />
            <div className="sgx-mcard__who">
              <h3>{candidate.displayName}</h3>
              <p>{candidate.roleTitle || candidate.organization || (es ? 'Creador' : 'Creator')}</p>
            </div>
            <span className="sgx-chip" style={{ ['--chip' as string]: meta.primary }}>{meta.label}</span>
          </div>
          <blockquote className="sgx-mcard__pitch">{candidate.profile?.pitch}</blockquote>
        </div>

        <div className="sgx-match__note-field">
          <label htmlFor="sgx-hit-note" className="sgx-kicker"><FileText aria-hidden className="sgx-match__inline-icon" />{strings.hitAddNote}</label>
          <div className="sgx-match__note">
            <input
              id="sgx-hit-note"
              type="text"
              className="sgx-input"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={es ? 'Ej: hablar de una alianza WebXR en el break' : 'E.g. talk about a WebXR partnership at the break'}
            />
            <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleSaveNote} disabled={isSavingNote}>{es ? 'Guardar' : 'Save'}</button>
          </div>
          {noteSaved && <p className="sgx-fine sgx-match__ok" role="status"><Check aria-hidden />{es ? 'Nota guardada' : 'Note saved'}</p>}
        </div>
      </div>
    </SgxDialog>
  );
};
