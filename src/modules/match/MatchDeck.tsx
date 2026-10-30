// SGX Entrepreneur Match - Deck Swiper Component

import React, { useState, useEffect, useCallback } from 'react';
import { RotateCcw, Layers, Check, UserCheck } from 'lucide-react';
import { 
  MatchProfile, 
  MatchCandidate, 
  MutualMatch 
} from './match.types';
import { MATCH_I18N } from './match.i18n';
import { MatchCard } from './MatchCard';
import { 
  fetchCandidatesDeck, 
  recordMatchPass, 
  sendMatchConnectIntent, 
  reportMatchProfile 
} from './matchData';
import { rankCandidatesDeck } from './matchScore';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { triggerMatchConfetti } from './MatchBurstFX';
import { useLanguage } from '../../context/LanguageContext';
import { SgxDialog } from '../../components/common/SgxDialog';

interface MatchDeckProps {
  myUid: string;
  myCandidate: MatchCandidate;
  lang?: 'es' | 'en';
  onMutualMatch: (match: MutualMatch) => void;
  onEditProfile: () => void;
}

export const MatchDeck: React.FC<MatchDeckProps> = ({
  myUid,
  myCandidate,
  lang = 'es',
  onMutualMatch,
  onEditProfile
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  const [deck, setDeck] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [reportingCandidate, setReportingCandidate] = useState<MatchCandidate | null>(null);
  const [reportReason, setReportReason] = useState<string>('spam');
  const [reportSent, setReportSent] = useState<boolean>(false);

  // Load and rank deck
  const loadDeck = useCallback(async () => {
    setLoading(true);
    try {
      const candidates = await fetchCandidatesDeck(myUid, myCandidate.profile);
      const ranked = rankCandidatesDeck(myCandidate.profile, candidates, es ? 'es' : 'en');
      setDeck(ranked);
    } catch (err) {
      console.error('Failed to load match deck:', err);
    } finally {
      setLoading(false);
    }
  }, [myUid, myCandidate]);

  useEffect(() => {
    loadDeck();
  }, [loadDeck]);

  // Current top candidate
  const currentCandidate = deck.length > 0 ? deck[0] : null;

  // PASS action
  const handlePass = useCallback(async () => {
    if (!currentCandidate || isProcessing) return;
    setIsProcessing(true);
    playUiChirp();

    const targetUid = currentCandidate.uid;
    // Remove from UI immediately
    setDeck(prev => prev.slice(1));

    await recordMatchPass(myUid, targetUid);
    setIsProcessing(false);
  }, [currentCandidate, isProcessing, myUid]);

  // CONNECT action
  const handleConnect = useCallback(async () => {
    if (!currentCandidate || isProcessing) return;
    setIsProcessing(true);
    playUiChirp();

    const target = currentCandidate;
    // Remove from UI immediately
    setDeck(prev => prev.slice(1));

    const result = await sendMatchConnectIntent(myCandidate, target);
    if (result.isMatch && result.mutualMatch) {
      playScanSuccessSound();
      triggerMatchConfetti();
      onMutualMatch(result.mutualMatch);
    }
    setIsProcessing(false);
  }, [currentCandidate, isProcessing, myCandidate, onMutualMatch]);

  // Keyboard navigation: Left = Pass, Right = Connect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
      if (reportingCandidate) return;
      if (e.key === 'ArrowLeft') {
        handlePass();
      } else if (e.key === 'ArrowRight') {
        handleConnect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePass, handleConnect, reportingCandidate]);

  // Handle Report confirmation
  const handleConfirmReport = async () => {
    if (!reportingCandidate) return;
    await reportMatchProfile(myUid, reportingCandidate.uid, reportReason);
    setReportSent(true);
    setTimeout(() => {
      setReportSent(false);
      setReportingCandidate(null);
      // Also pass them
      setDeck(prev => prev.filter(c => c.uid !== reportingCandidate.uid));
    }, 1500);
  };

  if (loading) {
    return (
      <div className="sgx-match__state" role="status">
        <span className="sgx-match__spinner" aria-hidden />
        <p className="sgx-fine">{es ? 'Cargando perfiles…' : 'Loading profiles…'}</p>
      </div>
    );
  }

  // Empty deck state
  if (!currentCandidate) {
    return (
      <div className="sgx-card sgx-match__empty">
        <UserCheck aria-hidden />
        <h3 className="sgx-h">{es ? 'Mazo al día' : 'Deck up to date'}</h3>
        <p className="sgx-copy">{strings.deckEmpty}</p>
        <div className="sgx-match__row">
          <button type="button" className="sgx-btn sgx-btn--sm" onClick={onEditProfile}>{strings.deckEmptyCta}</button>
          <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={loadDeck}>
            <RotateCcw aria-hidden />{es ? 'Recargar mazo' : 'Reload deck'}
          </button>
        </div>
      </div>
    );
  }

  const reasons = [
    { id: 'spam', label: es ? 'Spam o contenido comercial abusivo' : 'Spam or abusive commercial content' },
    { id: 'inappropriate', label: es ? 'Lenguaje o conducta inapropiada' : 'Inappropriate language or conduct' },
    { id: 'not-an-entrepreneur', label: es ? 'No es un asistente ni un creador' : 'Not an attendee or creator' },
  ];

  return (
    <div className="sgx-match__deck">
      <div className="sgx-match__deckbar">
        <span><Layers aria-hidden />{deck.length}{es ? ' perfiles restantes' : ' profiles left'}</span>
        <span className="sgx-match__keys">{es ? 'Teclado: ← pasar · → conectar' : 'Keyboard: ← pass · → connect'}</span>
      </div>

      <MatchCard
        candidate={currentCandidate}
        lang={lang}
        isProcessing={isProcessing}
        onPass={handlePass}
        onConnect={handleConnect}
        onReport={candidate => setReportingCandidate(candidate)}
      />

      {reportingCandidate && (
        <SgxDialog
          onClose={() => setReportingCandidate(null)}
          size="sm"
          accent="#FFBB00"
          className="sgx-dialog--fit"
          title={es ? 'Reportar perfil' : 'Report profile'}
          kicker={reportingCandidate.displayName}
          footer={reportSent ? undefined : (
            <>
              <button type="button" className="sgx-btn sgx-btn--ground sgx-btn--sm" onClick={() => setReportingCandidate(null)}>{es ? 'Cancelar' : 'Cancel'}</button>
              <button type="button" className="sgx-btn sgx-btn--sm" onClick={handleConfirmReport}>{es ? 'Enviar reporte' : 'Send report'}</button>
            </>
          )}
        >
          {reportSent ? (
            <p className="sgx-copy sgx-match__ok" role="status"><Check aria-hidden />{es ? 'Reporte enviado para revisión.' : 'Report sent for review.'}</p>
          ) : (
            <fieldset className="sgx-match__reasons">
              <legend className="sgx-copy">{es ? '¿Por qué reportas este perfil?' : 'Why are you reporting this profile?'}</legend>
              {reasons.map(opt => (
                <label key={opt.id} className={reportReason === opt.id ? 'is-on' : ''}>
                  <input type="radio" name="report_reason" checked={reportReason === opt.id} onChange={() => setReportReason(opt.id)} />
                  <span>{opt.label}</span>
                </label>
              ))}
            </fieldset>
          )}
        </SgxDialog>
      )}
    </div>
  );
};
