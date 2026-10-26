import React, { useState } from 'react';
import { 
  Award, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  Tv, 
  Gamepad2, 
  Layers, 
  Building2, 
  ArrowRight,
  Clock,
  Zap,
  Info
} from 'lucide-react';
import { SponsorshipTier } from '../../types/summit';
import { SPONSORSHIP_TIERS } from '../../lib/summitData';

interface SummitSponsorshipMatrixProps {
  tiers?: SponsorshipTier[];
  onOpenInquiryModal?: (tierId?: string) => void;
}

export const SummitSponsorshipMatrix: React.FC<SummitSponsorshipMatrixProps> = ({
  tiers = SPONSORSHIP_TIERS,
  onOpenInquiryModal,
}) => {
  const [selectedTierId, setSelectedTierId] = useState<string>('tier_4');
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');

  // Key comparison features across tiers
  const comparisonMatrix = [
    {
      feature: 'Logo en WebApp oficial del Summit (Días 1–3)',
      t1: true, t2: true, t3: true, t4: true, t5: true,
      category: 'Digital'
    },
    {
      feature: 'Overlays en transmisión global YouTube Live',
      t1: true, t2: true, t3: true, t4: true, t5: true,
      category: 'Broadcast'
    },
    {
      feature: 'Logo en minijuego de drones (cajas de entrega)',
      t1: false, t2: true, t3: true, t4: true, t5: true,
      category: 'Gamificación'
    },
    {
      feature: 'Pregunta de desafío/trivia dedicada (+25 XP)',
      t1: false, t2: true, t3: true, t4: true, t5: true,
      category: 'Gamificación'
    },
    {
      feature: 'Nombramiento oficial de segmento ("The [Brand] Showcase")',
      t1: false, t2: false, t3: true, t4: true, t5: true,
      category: 'Naming'
    },
    {
      feature: 'Video comercial de marca (30–60 seg) en stream',
      t1: false, t2: false, t3: true, t4: true, t5: true,
      category: 'Broadcast'
    },
    {
      feature: 'Integración de marca en minijuegos, visualizador y sistema de votación',
      t1: false, t2: false, t3: false, t4: true, t5: true,
      category: 'Integración'
    },
    {
      feature: 'Exclusividad por categoría (una sola marca de su sector)',
      t1: false, t2: false, t3: false, t4: true, t5: true,
      category: 'Exclusividad'
    },
    {
      feature: 'Documental y minijuego a medida (el minijuego se cotiza aparte)',
      t1: false, t2: false, t3: false, t4: true, t5: true,
      category: 'Contenido'
    },
    {
      feature: 'Reporte final a los 30 días (vistas, asistencia, clics y participación, sin datos personales)',
      t1: false, t2: false, t3: false, t4: true, t5: true,
      category: 'Reporte'
    },
    {
      feature: 'Licencia de acceso a la webapp por 365 días desde noviembre (sin transferencia de código)',
      t1: false, t2: false, t3: false, t4: true, t5: true,
      category: 'Permanencia 365D',
      highlight: true
    },
    {
      feature: 'Aporte de servicios esenciales (venue, internet, comida u otros), a convenir',
      t1: false, t2: false, t3: false, t4: false, t5: true,
      category: 'Alianza'
    }
  ];

  const getTierBadge = (tier: SponsorshipTier) => {
    switch (tier.tierNumber) {
      case 1:
        return { label: 'TIER 1 • DIGITAL', color: '#00DDFF', border: 'border-[#00DDFF]' };
      case 2:
        return { label: 'TIER 2 • GAMIFIED', color: '#FDCC0D', border: 'border-[#FDCC0D]' };
      case 3:
        return { label: 'TIER 3 • EXPERIENCE', color: '#FFBB00', border: 'border-[#FFBB00]' };
      case 4:
        return { label: 'TIER 4 • SIGNATURE 365D', color: '#FDCC0D', border: 'border-[#FDCC0D]' };
      case 5:
        return { label: 'TIER 5 • SERVICIOS ESENCIALES', color: '#FFFFFF', border: 'border-white' };
      default:
        return { label: 'SPONSOR', color: '#FDCC0D', border: 'border-[#FDCC0D]' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Dossier Header Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-[#121212]/90 p-5 md:p-6 backdrop-blur-md shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#FDCC0D]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#00DDFF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-widest uppercase bg-[#FDCC0D]/10 text-[#FDCC0D] border border-[#FDCC0D]/30">
                DOSSIER DE AUSPICIO OFICIAL
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono text-slate-400 bg-slate-800/60 border border-slate-700">
                Tiers 1 al 5 · Pago total antes del 14 de nov. · Materiales hasta el 30 de nov.
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
              Matriz Comparativa de Patrocinios
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Conecta tu marca con el Spatialgineers Summit 2026, el regreso de nuestro evento de spatial computing. 
              Los Tiers 4 y 5 incluyen una <strong className="text-[#FDCC0D]">licencia de acceso de 365 días desde noviembre</strong> a la webapp y sus espacios de promoción. El precio exacto dentro de cada rango se acuerda según el presupuesto del sponsor.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('sgx:open_holo_card', {
                  detail: {
                    self: true,
                    role: 'SPONSOR',
                    name: 'Tu Marca / Empresa',
                    title: 'Patrocinador Oficial',
                    org: 'Spatialgineers Summit 2026',
                    tier: 'SPONSOR'
                  }
                }));
              }}
              className="px-3.5 py-2 rounded-lg border border-cyan-400 bg-cyan-500/20 text-xs font-mono font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Holo Card de sponsor</span>
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'CARDS' ? 'TABLE' : 'CARDS')}
              className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 text-xs font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {viewMode === 'CARDS' ? 'Ver Tabla Comparativa' : 'Ver Tarjetas de Tiers'}
            </button>
            <button
              onClick={() => onOpenInquiryModal && onOpenInquiryModal(selectedTierId)}
              className="px-4 py-2 rounded-lg bg-[#FDCC0D] hover:bg-[#ffe066] text-black font-mono font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(253,204,13,0.3)] flex items-center gap-1.5 cursor-pointer"
            >
              <span>Solicitar Auspicio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 365 Days Value Callout */}
        <div className="mt-5 p-3.5 rounded-lg border border-[#FDCC0D]/30 bg-[#FDCC0D]/5 flex items-start sm:items-center gap-3">
          <Zap className="w-5 h-5 text-[#FDCC0D] shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs text-slate-200">
            <strong className="text-[#FDCC0D]">Valor Diferencial SGX:</strong> A diferencia de eventos tradicionales de un solo fin de semana, 
            los patrocinadores de los Tiers 4 y 5 mantienen su acceso a la webapp y a sus espacios de promoción <span className="font-bold underline">por 365 días desde noviembre</span>, y reciben un reporte final a los 30 días. Spatialgineers no garantiza un número de vistas, asistentes ni clics.
          </div>
        </div>
      </div>

      {/* View Mode: Interactive Cards Grid */}
      {viewMode === 'CARDS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {tiers.map((tier) => {
            const badge = getTierBadge(tier);
            const isSelected = selectedTierId === tier.id;

            return (
              <div
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`relative rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-[#FDCC0D] bg-[#1B1B1B] shadow-[0_0_25px_rgba(253,204,13,0.15)] ring-1 ring-[#FDCC0D]'
                    : 'border-slate-800 bg-[#121212]/80 hover:border-slate-700 hover:bg-[#171717]'
                }`}
              >
                {/* 365 Days Flag for Tier 4 and 5 */}
                {tier.yearLongLicense && (
                  <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#FDCC0D] text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-md">
                    ★ 365 DÍAS WEBAPP
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span 
                      className="px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase border"
                      style={{ borderColor: `${badge.color}60`, color: badge.color, backgroundColor: `${badge.color}15` }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mt-1">
                    {tier.name}
                  </h3>

                  <div className="text-lg font-black font-mono text-white mt-2">
                    {tier.priceRange}
                  </div>

                  <p className="text-xs text-slate-300 mt-2 font-medium leading-snug">
                    {tier.keyBenefit}
                  </p>

                  {/* Feature Bullets */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2">
                    {tier.features.map((feat, i) => (
                      <div key={i} className="flex items-start gap-2 text-[11px] text-slate-400">
                        <Check className="w-3.5 h-3.5 text-[#00DDFF] shrink-0 mt-0.5" />
                        <span className="leading-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Action */}
                <div className="mt-5 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onOpenInquiryModal) onOpenInquiryModal(tier.id);
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#FDCC0D] text-black hover:bg-[#ffe066]'
                        : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-[#FDCC0D] hover:text-white'
                    }`}
                  >
                    <span>Postular a {tier.name}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View Mode: Matrix Comparison Table */
        <div className="rounded-xl border border-slate-800 bg-[#121212] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="p-3.5 w-1/3">Beneficio / Feature</th>
                  <th className="p-3.5 text-center text-[#00DDFF]">Tier 1 ($50–$100)</th>
                  <th className="p-3.5 text-center text-[#FDCC0D]">Tier 2 ($250–$500)</th>
                  <th className="p-3.5 text-center text-[#FFBB00]">Tier 3 ($750–$1K)</th>
                  <th className="p-3.5 text-center text-[#FDCC0D] bg-[#FDCC0D]/5">Tier 4 ($1.5K–$2.5K)</th>
                  <th className="p-3.5 text-center text-white bg-slate-800/50">Tier 5 (A convenir)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {comparisonMatrix.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className={`hover:bg-slate-900/40 transition-colors ${
                      item.highlight ? 'bg-[#FDCC0D]/5 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3.5 text-slate-200">
                      <div className="flex items-center gap-2">
                        <span>{item.feature}</span>
                        {item.highlight && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-[#FDCC0D] text-black font-bold">
                            KEY VALUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-center">
                      {item.t1 ? <Check className="w-4 h-4 text-[#00DDFF] mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.t2 ? <Check className="w-4 h-4 text-[#FDCC0D] mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-center">
                      {item.t3 ? <Check className="w-4 h-4 text-[#FFBB00] mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-center bg-[#FDCC0D]/5">
                      {item.t4 ? <Check className="w-4 h-4 text-[#FDCC0D] mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                    <td className="p-3.5 text-center bg-slate-800/30">
                      {item.t5 ? <Check className="w-4 h-4 text-white mx-auto" /> : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Media Kit & Dossier Download Bar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#00DDFF]" />
          <span>¿Necesitas una propuesta formal personalizada o el Media Kit completo en PDF?</span>
        </div>
        <button
          onClick={() => onOpenInquiryModal && onOpenInquiryModal()}
          className="text-xs font-mono font-bold text-[#FDCC0D] hover:underline flex items-center gap-1 shrink-0"
        >
          <span>Escríbenos a info@spatialgineers.com</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
