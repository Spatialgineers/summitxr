import React, { useState } from 'react';
import { 
  X, 
  ExternalLink, 
  Sparkles, 
  Award, 
  Building2, 
  MapPin, 
  Tag, 
  Copy, 
  Check, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Mail, 
  Share2 
} from 'lucide-react';
import { ApprovedSponsor } from '../../types/summit';

interface SummitBrandShowcaseModalProps {
  sponsor: ApprovedSponsor | null;
  onClose: () => void;
}

export const SummitBrandShowcaseModal: React.FC<SummitBrandShowcaseModalProps> = ({
  sponsor,
  onClose,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!sponsor) return null;

  const handleCopyCode = () => {
    if (sponsor.specialOfferCode) {
      navigator.clipboard.writeText(sponsor.specialOfferCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2200);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(sponsor.websiteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="bg-[#151515] border-2 border-[var(--sgx-neon)]/50 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl shadow-[var(--sgx-neon)]/10 relative flex flex-col text-slate-200"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        {/* Top Header Controls */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-5 py-3.5 bg-[#121212]/95 border-b border-[var(--sgx-secondary)]/60 backdrop-blur-lg">
          <div className="flex items-center space-x-2">
            <span 
              className="w-2.5 h-2.5 bg-[var(--sgx-neon)] animate-ping" 
              style={{ clipPath: 'polygon(1px 0, 100% 0, 100% calc(100% - 1px), calc(100% - 1px) 100%, 0 100%, 0 1px)' }}
            />
            <span className="text-xs font-mono font-bold text-[var(--sgx-neon)] uppercase tracking-wider">
              SPATIALGINEERS SUMMIT 2026 • OFFICIAL BRAND SHOWCASE
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-[#262626] hover:bg-[#FF0055]/30 text-slate-300 hover:text-white border border-[var(--sgx-secondary)]/50 transition-colors"
            style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            title="Cerrar Showcase"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Hero Banner with Brand Artwork */}
        <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-gradient-to-r from-[var(--sgx-bg)] to-[#121212] border-b border-[var(--sgx-secondary)]">
          <img 
            src={sponsor.bannerUrl || 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG'} 
            alt={sponsor.companyName}
            className="w-full h-full object-cover opacity-60 mix-blend-luminosity filter hover:filter-none transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#151515] via-[#151515]/60 to-transparent" />

          {/* Floating Tier Badge */}
          <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
            <span 
              className="px-3 py-1 bg-[var(--sgx-accent)]/20 border border-[var(--sgx-accent)] text-[var(--sgx-accent)] text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg backdrop-blur-md"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            >
              <Award className="w-3.5 h-3.5" />
              <span>{sponsor.tierName}</span>
            </span>
            <span 
              className="px-3 py-1 bg-amber-500/20 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono font-bold flex items-center space-x-1 shadow-lg backdrop-blur-md"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>PARTNER VERIFICADO</span>
            </span>
          </div>
        </div>

        {/* Brand Identity & Header Info */}
        <div className="px-6 -mt-14 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-end space-x-4">
            <div 
              className="w-24 h-24 sm:w-28 sm:h-28 bg-[var(--sgx-bg)] border-2 border-[var(--sgx-neon)] p-2 shadow-2xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#121212] to-[#262626]"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <img 
                src={sponsor.logoUrl} 
                alt={sponsor.companyName} 
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png';
                }}
              />
            </div>
            <div className="pb-1">
              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-['Orbitron',sans-serif] tracking-wide">
                {sponsor.companyName}
              </h2>
              <p className="text-xs sm:text-sm text-[var(--sgx-neon)] font-mono mt-0.5">
                {sponsor.tagline}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pb-1">
            <a
              href={sponsor.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-gradient-to-r from-[var(--sgx-neon)] to-[#00B0FF] text-black font-bold text-xs uppercase font-mono tracking-wider flex items-center space-x-2 shadow-lg shadow-[var(--sgx-neon)]/20 hover:brightness-110 active:scale-95 transition-all"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <span>{sponsor.ctaButtonText || 'VISITAR WEB OFICIAL'}</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">

          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sponsor.boothLocation && (
              <div 
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-start space-x-3"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <MapPin className="w-5 h-5 text-[var(--sgx-accent)] shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Ubicación / Stage</div>
                  <div className="text-xs font-semibold text-white">{sponsor.boothLocation}</div>
                </div>
              </div>
            )}
            <div 
              className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-start space-x-3"
              style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
            >
              <Globe className="w-5 h-5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-mono text-slate-400 uppercase">Sitio Web Oficial</div>
                <a 
                  href={sponsor.websiteUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-semibold text-[var(--sgx-neon)] hover:underline break-all block"
                >
                  {sponsor.websiteUrl.replace(/^https?:\/\//, '')}
                </a>
              </div>
            </div>
            {sponsor.contactEmail && (
              <div 
                className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/60 flex items-start space-x-3"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <Mail className="w-5 h-5 text-[#FDCC0D] shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Contacto de Alianza</div>
                  <div className="text-xs font-semibold text-slate-200 break-all">{sponsor.contactEmail}</div>
                </div>
              </div>
            )}
          </div>

          {/* Brand Description */}
          <div 
            className="p-5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)]/70 space-y-3"
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            <h3 className="text-xs font-mono font-bold uppercase text-[var(--sgx-accent)] flex items-center space-x-2 tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Acerca de la Marca y Alianza SGX</span>
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {sponsor.description}
            </p>
          </div>

          {/* Key Partnership Highlights */}
          {sponsor.highlights && sponsor.highlights.length > 0 && (
            <div 
              className="p-5 bg-[#121212] border border-[var(--sgx-secondary)]/60 space-y-3"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <h3 className="text-xs font-mono font-bold uppercase text-[var(--sgx-neon)] flex items-center space-x-2 tracking-wider">
                <Zap className="w-4 h-4" />
                <span>Puntos Destacados en el Summit 2026</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {sponsor.highlights.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-[var(--sgx-bg)]/80 border border-[var(--sgx-secondary)]/40 flex items-center space-x-3"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    <div 
                      className="w-6 h-6 bg-[var(--sgx-neon)]/10 border border-[var(--sgx-neon)]/40 flex items-center justify-center shrink-0"
                      style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                    >
                      <span className="text-[10px] font-mono font-bold text-[var(--sgx-neon)]">{idx + 1}</span>
                    </div>
                    <span className="text-xs text-slate-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Special Attendee Offer & Coupon Banner */}
          {(sponsor.specialOfferText || sponsor.specialOfferCode) && (
            <div 
              className="p-5 bg-gradient-to-r from-[var(--sgx-bg)] via-[#262626] to-[var(--sgx-bg)] border-2 border-[var(--sgx-accent)] relative overflow-hidden shadow-xl shadow-[var(--sgx-accent)]/5"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div 
                className="absolute top-0 right-0 w-32 h-32 bg-[var(--sgx-accent)]/10 blur-2xl pointer-events-none" 
                style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
              />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 text-[var(--sgx-accent)] text-xs font-mono font-bold uppercase tracking-wider">
                    <Tag className="w-4 h-4" />
                    <span>Beneficio Exclusivo para Asistentes SGX</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200">
                    {sponsor.specialOfferText || 'Utiliza el siguiente código promocional para canjear beneficios especiales de nuestro patrocinador.'}
                  </p>
                </div>

                {sponsor.specialOfferCode && (
                  <div className="flex items-center space-x-2 shrink-0">
                    <div 
                      className="px-3.5 py-2 bg-[#121212] border border-[var(--sgx-accent)] text-[var(--sgx-accent)] font-mono font-bold text-sm tracking-wider"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      {sponsor.specialOfferCode}
                    </div>
                    <button
                      onClick={handleCopyCode}
                      className="px-3 py-2 bg-[var(--sgx-accent)] hover:bg-[var(--sgx-accent)]/80 text-black font-bold text-xs font-mono flex items-center space-x-1.5 transition-colors"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      title="Copiar código"
                    >
                      {copiedCode ? <Check className="w-4 h-4 text-black" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedCode ? 'COPIADO' : 'COPIAR'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[var(--sgx-secondary)]/60">
            <div className="text-[11px] font-mono text-slate-400">
              Presencia activa en: {sponsor.activeInVisualizer ? 'Visualizadores 3D' : ''} {sponsor.activeInMiniGame ? '• Drone Mini-Game' : ''} {sponsor.activeInAppTicker ? '• Ticker Global' : ''}
            </div>

            <div className="flex items-center space-x-3 w-full sm:w-auto">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-[#262626] border border-[var(--sgx-secondary)] text-xs font-mono text-slate-300 hover:text-white flex items-center justify-center space-x-1.5 transition-colors"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#FDCC0D]" /> : <Share2 className="w-4 h-4" />}
                <span>{copiedLink ? 'ENLACE COPIADO' : 'COMPARTIR'}</span>
              </button>
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2 bg-[#2A2A2A] hover:bg-[#3A3A3A] text-white text-xs font-mono font-bold uppercase transition-colors"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                CERRAR
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
