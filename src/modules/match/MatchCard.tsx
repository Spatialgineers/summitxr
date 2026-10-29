// SGX Entrepreneur Match - Profile Card Component

import React from 'react';
import { Zap, ArrowRight, Flag, X } from 'lucide-react';
import { MatchCandidate, MatchPillar } from './match.types';
import { MATCH_I18N } from './match.i18n';
import { useLanguage } from '../../context/LanguageContext';
import { PILLAR_BY_KEY, pillarInk, type PillarKey } from '../../lib/sgxPillars';
import '../../components/summit/sgx-kit.css';
import './match.css';

interface MatchCardProps {
  candidate: MatchCandidate;
  lang?: 'es' | 'en';
  onPass: () => void;
  onConnect: () => void;
  onReport?: (candidate: MatchCandidate) => void;
  isProcessing?: boolean;
  /** Preview of your own card: no actions. */
  preview?: boolean;
}

const MATCH_PILLAR_KEY: Record<MatchPillar, PillarKey> = {
  story: 'STORY', showcase: 'SHOWCASE', spark: 'SPARK', stage: 'STAGE', systems: 'SYSTEM', synthesize: 'SYNTHESIZE',
};

/** Pillar label and text-safe accent for a match profile (hex, so callers can add alpha). */
export const PILLAR_META: Record<MatchPillar, { label: string; primary: string }> = Object.fromEntries(
  (Object.keys(MATCH_PILLAR_KEY) as MatchPillar[]).map((p) => [p, { label: PILLAR_BY_KEY[MATCH_PILLAR_KEY[p]].name, primary: pillarInk(MATCH_PILLAR_KEY[p]) }]),
) as Record<MatchPillar, { label: string; primary: string }>;

/** Photo, or the first letter when there is none. */
export const MatchAvatar: React.FC<{ candidate: MatchCandidate; accent: string; size?: number }> = ({ candidate, accent, size = 56 }) => (
  <span className="sgx-avatar" style={{ ['--avatar-accent' as string]: accent, width: size, height: size }}>
    {candidate.avatarUrl
      ? <img src={candidate.avatarUrl} alt="" />
      : <span aria-hidden>{(candidate.displayName || 'S').charAt(0).toUpperCase()}</span>}
  </span>
);

export const MatchCard: React.FC<MatchCardProps> = ({
  candidate,
  lang = 'es',
  onPass,
  onConnect,
  onReport,
  isProcessing = false,
  preview = false,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;
  const pillar = candidate.profile.pillar || 'spark';
  const meta = PILLAR_META[pillar] || PILLAR_META.spark;
  // Only a score that was really computed is shown.
  const score = candidate.score;

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
    <article className="sgx-card sgx-card--stripe sgx-mcard" style={{ ['--card-accent' as string]: meta.primary }}>
      <header className="sgx-mcard__head">
        <MatchAvatar candidate={candidate} accent={meta.primary} />
        <div className="sgx-mcard__who">
          <h3>{candidate.displayName}</h3>
          <p>{candidate.roleTitle || candidate.organization || (es ? 'Creador' : 'Creator')}</p>
          {candidate.organization && candidate.roleTitle && <p className="sgx-mcard__org">{candidate.organization}</p>}
        </div>
        <div className="sgx-mcard__tags">
          <span className="sgx-chip" style={{ ['--chip' as string]: meta.primary }}>{meta.label}</span>
          {candidate.xp > 0 && <span className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}><Zap aria-hidden />{candidate.xp} XP</span>}
        </div>
      </header>

      <blockquote className="sgx-mcard__pitch">{candidate.profile.pitch}</blockquote>

      <div className="sgx-mcard__block">
        <p className="sgx-kicker sgx-mcard__label">{strings.cardBrings}</p>
        <div className="sgx-chip-row">
          {candidate.profile.brings.map((chip, idx) => (
            <span key={idx} className="sgx-chip sgx-chip--ghost">{getBringLabel(chip)}</span>
          ))}
          {candidate.profile.customBringsText && <span className="sgx-chip sgx-chip--ghost">+ {candidate.profile.customBringsText}</span>}
        </div>
      </div>

      <div className="sgx-mcard__block">
        <p className="sgx-kicker">{strings.cardSeeking}</p>
        <div className="sgx-chip-row">
          {candidate.profile.seeking.map((chip, idx) => (
            <span key={idx} className="sgx-chip"><ArrowRight aria-hidden />{getSeekingLabel(chip)}</span>
          ))}
        </div>
      </div>

      {candidate.profile.openTo && candidate.profile.openTo.length > 0 && (
        <div className="sgx-mcard__block">
          <p className="sgx-kicker sgx-mcard__label">{strings.cardOpenTo}</p>
          <div className="sgx-chip-row">
            {candidate.profile.openTo.map((tag, idx) => (
              <span key={idx} className="sgx-chip" style={{ ['--chip' as string]: 'var(--SGX_Yellow)' }}>#{getOpenToLabel(tag)}</span>
            ))}
          </div>
        </div>
      )}

      <footer className="sgx-mcard__foot">
        <div className="sgx-mcard__fit">
          {score !== undefined && <b style={{ color: score >= 75 ? meta.primary : undefined }}>{score}% match</b>}
          <span>{candidate.matchReason || strings.wizardSubtitle}</span>
        </div>

        {!preview && (
          <div className="sgx-mcard__actions">
            {onReport && (
              <button type="button" className="sgx-iconbtn" onClick={() => onReport(candidate)} aria-label={es ? 'Reportar perfil' : 'Report profile'}>
                <Flag aria-hidden />
              </button>
            )}
            <button type="button" className="sgx-btn sgx-btn--ground" onClick={onPass} disabled={isProcessing}>
              <X aria-hidden />{strings.actionPass}
            </button>
            <button type="button" className="sgx-btn is-active" onClick={onConnect} disabled={isProcessing}>
              <Zap aria-hidden />{strings.actionConnect}
            </button>
          </div>
        )}
      </footer>
    </article>
  );
};
