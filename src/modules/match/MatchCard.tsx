// SGX Entrepreneur Match - Profile Card Component

import React from 'react';
import { 
  Zap, 
  ArrowRight, 
  Shield, 
  Flag, 
  Sparkles, 
  Check, 
  X, 
  ExternalLink,
  Tag
} from 'lucide-react';
import { MatchCandidate, MatchPillar } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';

interface MatchCardProps {
  candidate: MatchCandidate;
  lang?: 'es' | 'en';
  onPass: () => void;
  onConnect: () => void;
  onReport?: (candidate: MatchCandidate) => void;
  isProcessing?: boolean;
}

export const PILLAR_META: Record<MatchPillar, { label: string; primary: string; secondary: string; bg: string }> = {
  story: { label: 'SGX.STORY', primary: '#FDCC0D', secondary: '#767676', bg: '#242013' },
  showcase: { label: 'SGX.SHOWCASE', primary: '#FFBB00', secondary: '#FFFFFF', bg: '#1F1008' },
  spark: { label: 'SGX.SPARK', primary: '#00DDFF', secondary: '#FDCC0D', bg: '#1E1E1E' },
  stage: { label: 'SGX.STAGE', primary: '#FFFFFF', secondary: '#FDCC0D', bg: '#201A10' },
  systems: { label: 'SGX.SYSTEM', primary: '#32527B', secondary: '#888888', bg: '#1B1B1B' },
  synthesize: { label: 'SGX.SYNTHESIZE', primary: '#00DDFF', secondary: '#FDCC0D', bg: '#1B1B1B' }
};

export const MatchCard: React.FC<MatchCardProps> = ({
  candidate,
  lang = 'es',
  onPass,
  onConnect,
  onReport,
  isProcessing = false
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant } = useTenantTheme();
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;
  const pillar = candidate.profile.pillar || 'spark';
  const meta = PILLAR_META[pillar] || PILLAR_META.spark;
  const score = candidate.score !== undefined ? candidate.score : 85;

  // Map brings / seeking to human chips
  const getBringLabel = (chip: string) => {
    const key = `brings${chip.charAt(0).toUpperCase() + chip.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}` as keyof typeof strings;
    return (strings[key] as string) || chip;
  };

  const getSeekingLabel = (chip: string) => {
    const key = `seeking${chip.charAt(0).toUpperCase() + chip.slice(1)}` as keyof typeof strings;
    return (strings[key] as string) || chip;
  };

  const getOpenToLabel = (tag: string) => {
    const key = `openTo${tag.charAt(0).toUpperCase() + tag.slice(1).replace(/_([a-z])/g, (_, g) => g.toUpperCase())}` as keyof typeof strings;
    return (strings[key] as string) || tag;
  };

  return (
    <div 
      className="w-full max-w-[420px] bg-[var(--sgx-card-bg)]/95 border border-[var(--sgx-secondary)]/60 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden transition-all duration-300"
      style={{
        boxShadow: `0 20px 50px -10px ${meta.primary}22, 0 0 1px 1px ${meta.primary}40`,
        clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)'
      }}
    >
      {/* Top Ambient Glow Gradient */}
      <div 
        className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-25"
        style={{ backgroundColor: meta.primary }}
      />

      {/* Header Bar: Avatar + Identity + Live XP + Pillar */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            {/* Hexagon Ring Avatar */}
            <div className="relative flex-shrink-0">
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center p-0.5 border"
                style={{ 
                  borderColor: meta.primary,
                  backgroundColor: meta.bg,
                  boxShadow: `0 0 12px ${meta.primary}44`
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
              <span 
                className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#111111] flex items-center justify-center text-[8px] font-bold text-black"
                style={{ backgroundColor: meta.primary }}
              >
                ✓
              </span>
            </div>

            {/* Names & Titles */}
            <div className="min-w-0">
              <h3 className="text-white font-bold text-base sm:text-lg truncate flex items-center gap-1.5 font-['Orbitron',sans-serif]">
                {candidate.displayName}
              </h3>
              <p className="text-xs text-slate-400 truncate font-mono">
                {candidate.roleTitle || candidate.organization || 'Founder / Builder'}
              </p>
              {candidate.organization && candidate.roleTitle && (
                <p className="text-[11px] text-slate-500 truncate font-mono">
                  {candidate.organization}
                </p>
              )}
            </div>
          </div>

          {/* Right Pillar & XP Badges */}
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span 
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider"
              style={{
                borderColor: `${meta.primary}66`,
                color: meta.primary,
                backgroundColor: `${meta.primary}18`
              }}
            >
              {meta.label}
            </span>
            <span 
              className="text-[11px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 border"
              style={{
                color: 'var(--sgx-neon)',
                backgroundColor: 'rgba(var(--sgx-neon-rgb), 0.15)',
                borderColor: 'rgba(var(--sgx-neon-rgb), 0.4)'
              }}
            >
              <Zap className="w-3 h-3 fill-current" />
              {candidate.xp} XP
            </span>
          </div>
        </div>

        {/* Pitch Statement (Bold, high readability) */}
        <div className="mb-4 bg-[var(--sgx-bg)]/80 border border-[var(--sgx-secondary)]/60 rounded-xl p-3">
          <p className="text-white font-medium text-sm sm:text-base leading-relaxed tracking-tight">
            "{candidate.profile.pitch}"
          </p>
        </div>

        {/* BRINGS & SEEKING Chips */}
        <div className="space-y-3 mb-4">
          {/* TRAE / BRINGS */}
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-1.5">
              <span>{strings.cardBrings}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.profile.brings.map((chip, idx) => (
                <span 
                  key={idx}
                  className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-slate-200"
                >
                  {getBringLabel(chip)}
                </span>
              ))}
              {candidate.profile.customBringsText && (
                <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-slate-200 italic">
                  + {candidate.profile.customBringsText}
                </span>
              )}
            </div>
          </div>

          {/* BUSCA / SEEKING */}
          <div>
            <div 
              className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase mb-1.5"
              style={{ color: 'var(--sgx-neon)' }}
            >
              <span>{strings.cardSeeking}</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {candidate.profile.seeking.map((chip, idx) => (
                <span 
                  key={idx}
                  className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1 border transition-all"
                  style={{
                    backgroundColor: 'rgba(var(--sgx-neon-rgb), 0.15)',
                    borderColor: 'rgba(var(--sgx-neon-rgb), 0.4)',
                    color: 'var(--sgx-neon)'
                  }}
                >
                  <ArrowRight className="w-3 h-3" />
                  {getSeekingLabel(chip)}
                </span>
              ))}
            </div>
          </div>

          {/* OPEN TO (Ghost tags) */}
          {candidate.profile.openTo && candidate.profile.openTo.length > 0 && (
            <div>
              <div className="text-[10px] font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                {strings.cardOpenTo}:
              </div>
              <div className="flex flex-wrap gap-1.5">
                {candidate.profile.openTo.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-md border border-slate-700/80 text-slate-400 bg-slate-900/40"
                  >
                    #{getOpenToLabel(tag)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Section: Match Score Bar + Actions */}
      <div className="pt-2 border-t border-[var(--sgx-secondary)]/50 mt-auto">
        {/* Match Fit Score & Reason */}
        <div className="mb-4 bg-[var(--sgx-bg)]/80 border border-[var(--sgx-secondary)]/60 rounded-xl p-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span 
              className="text-xs sm:text-sm font-mono font-extrabold px-2 py-0.5 rounded-lg border"
              style={{
                backgroundColor: score >= 75 ? `${meta.primary}25` : 'rgba(148, 163, 184, 0.15)',
                borderColor: score >= 75 ? meta.primary : '#767676',
                color: score >= 75 ? meta.primary : '#cbd5e1'
              }}
            >
              ⬡ {score}% MATCH
            </span>
          </div>
          <p className="text-[11px] text-slate-300 italic text-right truncate">
            {candidate.matchReason || strings.wizardSubtitle}
          </p>
        </div>

        {/* Action Bar: Pass vs Connect */}
        <div className="flex items-center gap-2.5">
          {/* Report Button (Discreet) */}
          {onReport && (
            <button
              onClick={() => onReport(candidate)}
              title={es ? 'Reportar perfil' : 'Report profile'}
              className="p-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <Flag className="w-4 h-4" />
            </button>
          )}

          {/* PASS Button */}
          <button
            onClick={onPass}
            disabled={isProcessing}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-900/90 hover:bg-rose-950/30 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-300 font-mono text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-rose-400" />
            <span>{strings.actionPass}</span>
          </button>

          {/* CONNECT Button (Dynamic Neon / Primary Accent CTA) */}
          <button
            onClick={onConnect}
            disabled={isProcessing}
            style={{
              background: `linear-gradient(135deg, var(--sgx-primary) 0%, var(--sgx-neon) 100%)`,
              boxShadow: `0 0 16px var(--sgx-glow)`
            }}
            className="flex-1 py-3 px-4 rounded-xl text-black font-mono text-sm font-extrabold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 hover:brightness-110"
          >
            <Zap className="w-4 h-4 fill-black text-black" />
            <span>{strings.actionConnect}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
