import React, { useState } from 'react';
import { Instagram, ExternalLink, ShieldCheck, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

interface InstagramEmbedCardProps {
  postUrl?: string;
  url?: string;
  caption?: string;
  authorName?: string;
  authorHandle?: string;
  timestamp?: string;
  likes?: number;
  className?: string;
}

export const InstagramEmbedCard: React.FC<InstagramEmbedCardProps> = ({
  postUrl,
  url,
  caption,
  authorName,
  authorHandle,
  timestamp,
  likes,
  className = '',
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const effectiveUrl = postUrl || url || '';
  const [isIframeLoaded, setIsIframeLoaded] = useState<boolean>(false);

  // Extract shortcode from standard Instagram URLs (/p/code, /reel/code, /tv/code)
  const extractShortcode = (rawUrl: string): string | null => {
    if (!rawUrl) return null;
    const cleanUrl = rawUrl.split('?')[0].split('#')[0];
    const match = cleanUrl.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  };

  const shortcode = extractShortcode(effectiveUrl);
  const canonicalUrl = shortcode ? `https://www.instagram.com/p/${shortcode}/` : effectiveUrl;
  const embedSrc = shortcode ? `https://www.instagram.com/p/${shortcode}/embed/` : null;

  return (
    <div 
      className={`bg-[var(--sgx-card-bg)] border border-[var(--sgx-border)] overflow-hidden flex flex-col justify-between relative shadow-lg ${className}`}
      style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
    >
      {/* Top Meta Verification Bar */}
      <div className="bg-[var(--sgx-gradient)] px-3 py-1.5 flex items-center justify-between text-[10px] font-mono font-bold text-black uppercase tracking-wider shrink-0">
        <span className="flex items-center gap-1.5">
          <Instagram className="w-3.5 h-3.5 text-black" />
          <span>INSTAGRAM OFICIAL (META)</span>
        </span>
        <a
          href={canonicalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[9px] bg-black/80 hover:bg-black text-white px-2 py-0.5 rounded font-mono transition-colors"
        >
          <span>{es ? 'ABRIR EN IG' : 'OPEN IN IG'}</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </a>
      </div>

      {/* Embed Viewport */}
      <div className="p-2 bg-[var(--sgx-bg)] flex flex-col items-center justify-center min-h-[460px] relative w-full">
        {embedSrc ? (
          <>
            {!isIframeLoaded && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-2 bg-[var(--sgx-bg)] text-slate-400 font-mono text-xs z-10">
                <RefreshCw className="w-6 h-6 text-[var(--sgx-primary)] animate-spin" />
                <p>{es ? 'Cargando publicación oficial de Instagram...' : 'Loading the official Instagram post...'}</p>
                <span className="text-[10px] text-slate-500">ID: {shortcode}</span>
              </div>
            )}
            <iframe
              src={embedSrc}
              className={`w-full min-h-[480px] max-h-[580px] border-0 rounded bg-white transition-opacity duration-300 ${
                isIframeLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              title={`Instagram Embed ${shortcode}`}
              allowTransparency
              frameBorder="0"
              scrolling="no"
              loading="lazy"
              onLoad={() => setIsIframeLoaded(true)}
            />
          </>
        ) : (
          <div className="p-6 text-center space-y-3 font-mono text-xs text-slate-400">
            <Instagram className="w-8 h-8 text-[var(--sgx-primary)] mx-auto" />
            <p className="text-white font-bold">{es ? 'Publicación de Instagram' : 'Instagram post'}</p>
            {caption && <p className="text-slate-300 text-[11px] line-clamp-3">{caption}</p>}
            <a
              href={canonicalUrl || 'https://instagram.com/spatialgineers'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 sgx-btn text-[10px] font-bold"
            >
              <span>{es ? 'VER EN INSTAGRAM' : 'VIEW ON INSTAGRAM'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

