// SGX Entrepreneur Match - Deck Swiper Component

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Sparkles, 
  RotateCcw, 
  Layers, 
  Info, 
  ShieldAlert, 
  Check, 
  Zap, 
  ArrowLeft, 
  ArrowRight,
  UserCheck
} from 'lucide-react';
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
      const ranked = rankCandidatesDeck(myCandidate.profile, candidates);
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
      if (e.key === 'ArrowLeft') {
        handlePass();
      } else if (e.key === 'ArrowRight') {
        handleConnect();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePass, handleConnect]);

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
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-12 h-12 rounded-full border-2 border-[#00DDFF] border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-mono text-slate-400">
          Sincronizando fundadores en Chroma Space...
        </p>
      </div>
    );
  }

  // Empty deck state
  if (!currentCandidate) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#0f0f0f] border border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/40 border border-[#00DDFF]/30 mx-auto flex items-center justify-center mb-4 text-[#00DDFF]">
          <UserCheck className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2 font-sans">
          Mazo al día
        </h3>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          {strings.deckEmpty}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={onEditProfile}
            className="w-full sm:w-auto py-2.5 px-5 rounded-xl bg-[#00DDFF] hover:bg-[#00d0e0] text-black font-mono font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            {strings.deckEmptyCta}
          </button>
          <button
            onClick={loadDeck}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Recargar mazo</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center relative w-full">
      {/* Deck Remaining Count & Keyboard hints */}
      <div className="flex items-center justify-between w-full max-w-[420px] mb-3 px-1 text-[11px] font-mono text-slate-400">
        <span className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-[#00DDFF]" />
          <span>{deck.length} perfiles restantes</span>
        </span>
        <span className="hidden sm:inline text-slate-500">
          Usa teclas [← Pasar] / [→ Conectar]
        </span>
      </div>

      {/* Primary Top Card */}
      <div className="w-full flex justify-center">
        <MatchCard
          candidate={currentCandidate}
          lang={lang}
          isProcessing={isProcessing}
          onPass={handlePass}
          onConnect={handleConnect}
          onReport={candidate => setReportingCandidate(candidate)}
        />
      </div>

      {/* Moderation / Report Dialog Modal */}
      {reportingCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#151515] border border-slate-700 rounded-2xl p-5 shadow-2xl text-white">
            <div className="flex items-center gap-2 mb-3 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
              <h4 className="font-bold text-sm">Reportar perfil</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              ¿Por qué deseas reportar a <strong className="text-white">{reportingCandidate.displayName}</strong>?
            </p>

            {reportSent ? (
              <div className="p-3 bg-emerald-950/50 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs text-center flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> Reporte enviado para revisión.
              </div>
            ) : (
              <>
                <div className="space-y-2 mb-5">
                  {[
                    { id: 'spam', label: 'Spam o contenido comercial abusivo' },
                    { id: 'inappropriate', label: 'Lenguaje o conducta inapropiada' },
                    { id: 'not-an-entrepreneur', label: 'No es un asistente o fundador' }
                  ].map(opt => (
                    <label 
                      key={opt.id} 
                      className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer hover:border-slate-700"
                    >
                      <input
                        type="radio"
                        name="report_reason"
                        checked={reportReason === opt.id}
                        onChange={() => setReportReason(opt.id)}
                        className="accent-[#00DDFF]"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => setReportingCandidate(null)}
                    className="py-1.5 px-3 rounded-lg border border-slate-700 text-xs text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmReport}
                    className="py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-semibold"
                  >
                    Enviar reporte
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
