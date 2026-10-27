import React, { useState } from 'react';
import { SummitSectionKey } from './SummitSectionsDropdown';
import { 
  SECTION_TO_SLUG, 
  copySectionLinkToClipboard, 
  getShareableSectionUrl 
} from '../../lib/summitUrlSync';
import { 
  Link, 
  Share2, 
  Check, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Info
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { ScrambleText } from '../../immersion/ScrambleText';
import { moduleCode, pillarOfSection } from '../../lib/sgxPillars';
import { useLanguage } from '../../context/LanguageContext';

interface SummitSectionBannerProps {
  sectionKey: SummitSectionKey;
  title: string;
  subtitle: string;
  pillarBadge: string;
  pillarIconUrl?: string;
  children?: React.ReactNode;
  additionalParams?: Record<string, string | number | undefined>;
}

export const SummitSectionBanner: React.FC<SummitSectionBannerProps> = ({
  sectionKey,
  title,
  subtitle,
  pillarBadge,
  pillarIconUrl,
  children,
  additionalParams,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant } = useTenantTheme();
  const [copied, setCopied] = useState(false);

  const slug = SECTION_TO_SLUG[sectionKey] || sectionKey.toLowerCase();
  const shareUrl = getShareableSectionUrl(sectionKey, additionalParams);

  const getPillarColor = (badge: string) => {
    const b = badge.toUpperCase();
    if (b.includes('STORY')) return { border: '#FDCC0D', bg: '#FDCC0D25', text: '#FDCC0D', glow: 'rgba(253, 204, 13, 0.45)' };
    if (b.includes('SPARK')) return { border: '#FFBB00', bg: '#FFBB0025', text: '#FFBB00', glow: 'rgba(255, 187, 0, 0.45)' };
    if (b.includes('SHOWCASE')) return { border: '#00DDFF', bg: '#00DDFF25', text: '#00DDFF', glow: 'rgba(0, 221, 255, 0.45)' };
    if (b.includes('STAGE')) return { border: '#FFFFFF', bg: '#FFFFFF20', text: '#FFFFFF', glow: 'rgba(255, 255, 255, 0.45)' };
    if (b.includes('SYSTEM')) return { border: '#32527B', bg: '#32527B35', text: '#87A6CB', glow: 'rgba(50, 82, 123, 0.55)' };
    if (b.includes('SYNTHESIZE')) return { border: '#FDCC0D', bg: '#FDCC0D25', text: '#FDCC0D', glow: 'rgba(253, 204, 13, 0.45)' };
    return { border: 'var(--sgx-primary)', bg: 'var(--sgx-primary)/15', text: 'var(--sgx-neon)', glow: 'rgba(0, 221, 255, 0.3)' };
  };

  const pCol = getPillarColor(pillarBadge);

  const handleCopy = async () => {
    const success = await copySectionLinkToClipboard(sectionKey, additionalParams);
    if (success) {
      setCopied(true);
      playUiChirp(880);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Spatialgineers Summit 2026 — ${title}`,
          text: subtitle,
          url: shareUrl,
        });
        playUiChirp(750);
        return;
      } catch {
        // Fallback to copy
      }
    }
    handleCopy();
  };

  const homePillar = pillarOfSection(sectionKey);
  const code = moduleCode(sectionKey) || '00.0';

  return (
    <section className="sgx-hero" style={{ ['--hero-accent' as any]: pCol.border }} aria-label={title}>
      <div className="sgx-hero__bg" aria-hidden="true" />
      <span className="sgx-hero__index" aria-hidden="true">0{homePillar?.index ?? 0}</span>
      <span className="sgx-hero__corner sgx-hero__corner--tl" aria-hidden="true" />
      <span className="sgx-hero__corner sgx-hero__corner--br" aria-hidden="true" />

      <div className="sgx-hero__layout">
        <div className="sgx-hero__emblem" aria-hidden="true">
          <span className="sgx-hero__ring" />
          {homePillar?.iconUrl || pillarIconUrl ? (
            <img src={homePillar?.iconUrl || pillarIconUrl} alt="" referrerPolicy="no-referrer" />
          ) : (
            <Sparkles className="w-6 h-6 text-[var(--SGX_Yellow)]" />
          )}
        </div>

        <div className="sgx-hero__copy">
          <div className="sgx-hero__telemetry">
            <span className="sgx-led sgx-led--action" aria-hidden="true" />
            <span className="sgx-hero__badge">{homePillar?.name.toUpperCase() || pillarBadge}</span>
            <span className="sgx-hero__path">{es ? 'MÓDULO ' : 'MODULE '}{code} // #/{slug} // SYNC OK</span>
          </div>
          <h1 className="sgx-hero__title">
            <ScrambleText text={title} />
          </h1>
          <p className="sgx-hero__subtitle">{subtitle}</p>
        </div>

        <div className="sgx-hero__actions">
          {children}
          <button type="button" onClick={handleShare} className="sgx-btn sgx-btn--sm" title={es ? 'Compartir enlace directo a esta sección' : 'Share a direct link to this section'}>
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{es ? 'Compartir' : 'Share'}</span>
          </button>
          <span className="sgx-glow">
            <button
              type="button"
              onClick={handleCopy}
              className={`sgx-btn sgx-btn--sm ${copied ? 'is-active' : ''}`}
              title={(es ? `Copiar enlace directo: ${shareUrl}` : `Copy direct link: ${shareUrl}`)}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? (es ? 'Enlace copiado' : 'Link copied') : (es ? 'Copiar enlace' : 'Copy link')}</span>
            </button>
          </span>
        </div>
      </div>
      <div className="sgx-hero__scan" aria-hidden="true" />
    </section>
  );
};
