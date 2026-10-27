// SGX Entrepreneur Match - Post-Match Celebratory Sheet

import React, { useState } from 'react';
import { 
  Sparkles, 
  Download, 
  FileText, 
  ArrowRight, 
  X, 
  Check, 
  Zap,
  Users
} from 'lucide-react';
import { MutualMatch, MatchCandidate } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { PILLAR_META } from './MatchCard';
import { exportContactAsVCard, saveMatchPrivateNote } from './matchData';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useLanguage } from '../../context/LanguageContext';

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
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

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
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div 
        className="w-full max-w-md bg-[#101010] border border-cyan-500/40 rounded-3xl p-6 shadow-2xl text-white relative animate-in fade-in zoom-in-95 duration-200"
        style={{
          boxShadow: '0 0 50px -10px rgba(0, 221, 255, 0.3)'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Celebratory Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/50 text-[#00DDFF] text-xs font-mono font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{strings.hitTitle}</span>
          </div>
          <h2 className="text-2xl font-bold font-sans">
            {es ? '¡Están Conectados!' : 'You\'re Connected!'}
          </h2>
          <p className="text-xs text-amber-400 font-mono mt-1 flex items-center justify-center gap-1">
            <Zap className="w-3.5 h-3.5 fill-amber-400" />
            <span>{strings.hitSubtitle}</span>
          </p>
        </div>

        {/* Matched Candidate Overview */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 mb-5">
          <div className="flex items-center gap-3.5 mb-3">
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center p-0.5 border"
              style={{
                borderColor: meta.primary,
                backgroundColor: meta.bg
              }}
            >
              {candidate.avatarUrl ? (
                <img 
                  src={candidate.avatarUrl} 
                  alt={candidate.displayName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full rounded-xl flex items-center justify-center font-bold text-xl text-white font-mono bg-slate-900">
                  {candidate.displayName ? candidate.displayName.charAt(0).toUpperCase() : '⚡'}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h3 className="font-bold text-base text-white truncate font-sans">
                {candidate.displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate">
                {candidate.roleTitle || candidate.organization || 'Founder'}
              </p>
              <span 
                className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border mt-1 inline-block"
                style={{
                  borderColor: `${meta.primary}66`,
                  color: meta.primary,
                  backgroundColor: `${meta.primary}18`
                }}
              >
                {meta.label}
              </span>
            </div>
          </div>

          <p className="text-xs text-slate-300 italic border-t border-slate-800/80 pt-2.5">
            "{candidate.profile?.pitch}"
          </p>
        </div>

        {/* Private Quick Note Input */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <FileText className="w-3 h-3 text-[#00DDFF]" />
              <span>{strings.hitAddNote}</span>
            </label>
            {noteSaved && (
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <Check className="w-3 h-3" />{es ? ' Guardado' : ' Saved'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={es ? 'Ej: Charlar sobre partnership WebXR en el break...' : 'E.g. Chat about a WebXR partnership during the break...'}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:border-[#00DDFF] focus:outline-none"
            />
            <button
              onClick={handleSaveNote}
              disabled={isSavingNote}
              className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-mono text-white transition-colors cursor-pointer"
            >
              {es ? 'Guardar' : 'Save'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleExportVCard}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#00DDFF] to-[#0088FF] hover:opacity-95 text-black font-mono font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-950/40 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{strings.hitSaveVcard} (.vcf)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onGoToMatches}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-[#00DDFF]" />
              <span>{strings.hitViewMatches}</span>
            </button>

            <button
              onClick={onClose}
              className="py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              {es ? 'Seguir Descubriendo' : 'Keep Discovering'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
