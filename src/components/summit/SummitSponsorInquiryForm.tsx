import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  Globe, 
  CheckCircle2, 
  Sparkles, 
  Send, 
  X, 
  DollarSign, 
  ShieldCheck, 
  Award,
  ChevronRight,
  Info,
  Layers,
  Flame,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { SponsorshipTier, SponsorInquiry } from '../../types/summit';
import { submitSponsorInquiry, SPONSORSHIP_TIERS } from '../../lib/summitData';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

interface SummitSponsorInquiryFormProps {
  initialTierId?: string;
  onClose?: () => void;
  onSuccess?: (inquiry: SponsorInquiry) => void;
  isModal?: boolean;
}

const AVAILABLE_GOALS = [
  { id: '4K_STREAM_OVERLAY', label: 'Logo en la webapp y en los overlays de la transmisión (Días 1-3)', labelEn: 'Logo on the web app and on the broadcast overlays (Days 1-3)', icon: Sparkles },
  { id: 'PHYSICAL_BOOTH_CHROMA', label: 'Activación "Experience by [Marca]" (Tier 4 y 5)', labelEn: '"Experience by [Brand]" activation (Tier 4 and 5)', icon: Building2 },
  { id: 'DRONE_MINIGAME_BRANDING', label: 'Branding en Minijuego de Drones & Zonas de Aterrizaje', labelEn: 'Branding in the Drone Mini-Game & Landing Zones', icon: Flame },
  { id: 'GAMIFIED_CHALLENGE_POINTS', label: 'Pregunta de trivia de marca en vivo (+25 XP)', labelEn: 'Live brand trivia question (+25 XP)', icon: Award },
  { id: 'SEGMENT_NAMING', label: 'Naming de Segmento o Pilar ("Showcase Powered by...")', labelEn: 'Segment or Pillar Naming ("Showcase Powered by...")', icon: Layers },
  { id: 'VIP_CATERING', label: 'Alianza de servicios esenciales: venue, internet, comida u otros (Tier 5)', labelEn: 'Essential services alliance: venue, internet, food or others (Tier 5)', icon: ShieldCheck },
  { id: 'YEAR_LONG_LICENSE', label: 'Licencia de acceso a la webapp por 365 días desde noviembre (Tier 4 y 5)', labelEn: '365-day web app access license starting in November (Tier 4 and 5)', icon: Globe },
  { id: 'TALENT_RECRUITMENT', label: 'Reclutamiento de Talento 3D / Desarrolladores Roblox', labelEn: '3D Talent / Roblox Developer Recruiting', icon: Building2 }
];

export const SummitSponsorInquiryForm: React.FC<SummitSponsorInquiryFormProps> = ({
  initialTierId = 'tier_2',
  onClose,
  onSuccess,
  isModal = false
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const [selectedTierId, setSelectedTierId] = useState<string>(initialTierId);
  const [companyName, setCompanyName] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [websiteUrl, setWebsiteUrl] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<string>('$250 – $500');
  const [selectedGoals, setSelectedGoals] = useState<string[]>([
    '4K_STREAM_OVERLAY',
    'DRONE_MINIGAME_BRANDING'
  ]);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [submittedInquiry, setSubmittedInquiry] = useState<SponsorInquiry | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const toggleGoal = (goalId: string) => {
    setSelectedGoals(prev => 
      prev.includes(goalId) 
        ? prev.filter(g => g !== goalId) 
        : [...prev, goalId]
    );
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!companyName.trim()) newErrors.companyName = (es ? 'Ingresa el nombre de tu empresa o marca' : 'Enter your company or brand name');
    if (!contactName.trim()) newErrors.contactName = (es ? 'Ingresa el nombre del representante' : 'Enter the representative\'s name');
    if (!email.trim()) {
      newErrors.email = (es ? 'Ingresa un correo de contacto' : 'Enter a contact email');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = (es ? 'Ingresa un correo electrónico válido' : 'Enter a valid email address');
    }
    if (!phone.trim()) newErrors.phone = (es ? 'Ingresa un número telefónico o WhatsApp' : 'Enter a phone or WhatsApp number');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);

    const chosenTier = SPONSORSHIP_TIERS.find(t => t.id === selectedTierId);
    const tierName = chosenTier ? `${chosenTier.name} (${chosenTier.priceRange})` : (es ? 'Personalizado' : 'Custom');

    const refNum = Math.floor(1000 + Math.random() * 9000);
    const newInquiry: SponsorInquiry = {
      id: `inq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      companyName: companyName.trim(),
      contactName: contactName.trim(),
      roleTitle: roleTitle.trim() || undefined,
      email: email.trim(),
      phone: phone.trim(),
      websiteUrl: websiteUrl.trim() || undefined,
      selectedTierId,
      selectedTierName: tierName,
      estimatedBudget,
      goals: selectedGoals,
      customMessage: customMessage.trim() || undefined,
      submittedAt: Date.now(),
      status: 'PENDING_REVIEW',
      referenceCode: `SGX-SPONSOR-2026-${refNum}`
    };

    // Lands in the team's Firestore inbox; the local copy is the visitor's receipt.
    setSendError(null);
    const sent = await submitSponsorInquiry(newInquiry);
    setIsSubmitting(false);
    if (!sent) {
      setSendError('No pudimos enviar tu solicitud en este momento. Revisa tu conexión e inténtalo de nuevo, o escríbenos a info@spatialgineers.com.');
      return;
    }
    setSubmittedInquiry(newInquiry);
    if (onSuccess) onSuccess(newInquiry);
  };

  const handleCopyCode = () => {
    if (!submittedInquiry) return;
    navigator.clipboard?.writeText(submittedInquiry.referenceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadSummary = () => {
    if (!submittedInquiry) return;
    const summaryText = (es ? `=====================================================
SPATIALGINEERS SUMMIT 2026 • SOLICITUD DE PATROCINIO
Día 3 (SGX Showcase): Chroma Space Studios, San Juan, Puerto Rico
Fecha del Evento: Diciembre 11 - 13, 2026
Pago total: a más tardar el 14 de noviembre de 2026 · Materiales: hasta el 30 de noviembre de 2026
=====================================================

CÓDIGO DE SEGUIMIENTO: ${submittedInquiry.referenceCode}
FECHA DE SOLICITUD: ${new Date(submittedInquiry.submittedAt).toLocaleString()}
ESTADO: En revisión por Spatialgineers

DATOS DE LA EMPRESA:
- Empresa / Marca: ${submittedInquiry.companyName}
- Representante: ${submittedInquiry.contactName}
- Cargo / Rol: ${submittedInquiry.roleTitle || 'N/A'}
- Correo Electrónico: ${submittedInquiry.email}
- Teléfono / WhatsApp: ${submittedInquiry.phone}
- Sitio Web / Enlace: ${submittedInquiry.websiteUrl || 'N/A'}

DETALLES DEL PATROCINIO:
- Tier Seleccionado: ${submittedInquiry.selectedTierName}
- Presupuesto Estimado: ${submittedInquiry.estimatedBudget || 'N/A'}

OBJETIVOS Y ACTIVACIONES SELECCIONADAS:
${submittedInquiry.goals.map(g => `  • ${AVAILABLE_GOALS.find(item => item.id === g)?.label || g}`).join('\n')}

MENSAJE / PROPUESTA PERSONALIZADA:
${submittedInquiry.customMessage || 'Sin notas adicionales.'}

CONTACTO DIRECTO DE PRODUCCIÓN:
Correo: info@spatialgineers.com · Teléfono: +1 (787) 445-5284 · @spatialgineers
Este resumen no es una oferta vinculante. Rige el contrato corto de auspicio firmado por ambas partes.
=====================================================` : `=====================================================
SPATIALGINEERS SUMMIT 2026 • SPONSORSHIP REQUEST
Day 3 (SGX Showcase): Chroma Space Studios, San Juan, Puerto Rico
Event Dates: December 11 - 13, 2026
Full payment: by November 14, 2026 · Materials: by November 30, 2026
=====================================================

TRACKING CODE: ${submittedInquiry.referenceCode}
REQUEST DATE: ${new Date(submittedInquiry.submittedAt).toLocaleString()}
STATUS: Under review by Spatialgineers

COMPANY DETAILS:
- Company / Brand: ${submittedInquiry.companyName}
- Representative: ${submittedInquiry.contactName}
- Title / Role: ${submittedInquiry.roleTitle || 'N/A'}
- Email: ${submittedInquiry.email}
- Phone / WhatsApp: ${submittedInquiry.phone}
- Website / Link: ${submittedInquiry.websiteUrl || 'N/A'}

SPONSORSHIP DETAILS:
- Selected Tier: ${submittedInquiry.selectedTierName}
- Estimated Budget: ${submittedInquiry.estimatedBudget || 'N/A'}

SELECTED GOALS AND ACTIVATIONS:
${submittedInquiry.goals.map(g => `  • ${AVAILABLE_GOALS.find(item => item.id === g)?.labelEn || g}`).join('\n')}

CUSTOM MESSAGE / PROPOSAL:
${submittedInquiry.customMessage || 'No additional notes.'}

DIRECT PRODUCTION CONTACT:
Email: info@spatialgineers.com · Phone: +1 (787) 445-5284 · @spatialgineers
This summary is not a binding offer. The short sponsorship contract signed by both parties governs.
=====================================================`);

    const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SGX_Patrocinio_${submittedInquiry.companyName.replace(/\s+/g, '_')}_${submittedInquiry.referenceCode}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`w-full ${isModal ? 'max-w-4xl mx-auto' : ''}`}>
      <div 
        className="bg-[#1b1b1b]/95 border-2 border-[var(--sgx-accent)] p-6 md:p-8 text-white relative shadow-2xl shadow-[var(--sgx-accent)]/10 space-y-6"
        style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
      >
        {/* Header with Close option if Modal */}
        <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)]/60 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] text-[var(--sgx-accent)] font-mono font-bold tracking-widest uppercase bg-[var(--sgx-accent)]/10 px-2 py-0.5 border border-[var(--sgx-accent)]/30">
                {es ? 'PORTAL OFICIAL DE PATROCINIOS & ALIANZAS' : 'OFFICIAL SPONSORSHIPS & PARTNERSHIPS PORTAL'}
              </span>
              <span className="text-[10px] text-[var(--sgx-neon)] font-mono">
                CHROMA SPACE STUDIOS • SAN JUAN
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold font-['Orbitron',sans-serif] text-white uppercase tracking-wider flex items-center space-x-2">
              <Building2 className="w-6 h-6 text-[var(--sgx-accent)]" />
              <span>{es ? 'POSTÚLATE COMO PATROCINADOR SGX' : 'APPLY AS AN SGX SPONSOR'}</span>
            </h2>
            <p className="text-xs text-slate-300 font-mono">
              {es ? 'Posiciona tu marca en la transmisión de YouTube Live y en la webapp del Summit.' : 'Position your brand on the YouTube Live broadcast and on the Summit web app.'}
            </p>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 bg-[#2b2b2b] border border-[var(--sgx-secondary)] text-slate-300 hover:text-white hover:border-red-400 transition-all"
              style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {submittedInquiry ? (
          /* Confirmation & Success Screen */
          <div className="space-y-6 py-4 animate-fadeIn font-mono">
            <div 
              className="p-6 bg-[var(--sgx-neon)]/10 border-2 border-[var(--sgx-neon)] text-center space-y-4"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div 
                className="w-16 h-16 bg-[var(--sgx-neon)]/20 border-2 border-[var(--sgx-neon)] flex items-center justify-center mx-auto shadow-lg shadow-[var(--sgx-neon)]/20"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <CheckCircle2 className="w-8 h-8 text-[var(--sgx-neon)]" />
              </div>
              <div className="space-y-1">
                <span className="text-xs text-[var(--sgx-accent)] font-bold uppercase tracking-widest">
                  {es ? '¡SOLICITUD REGISTRADA EXITOSAMENTE!' : 'REQUEST SUBMITTED SUCCESSFULLY!'}
                </span>
                <h3 className="text-xl font-bold text-white font-['Orbitron',sans-serif]">
                  {es ? 'Gracias por tu interés, ' : 'Thank you for your interest, '}{submittedInquiry.companyName}
                </h3>
                <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
                  {es ? 'El equipo de ' : 'The '}<span className="text-[var(--sgx-neon)] font-bold">Spatialgineers</span>{es ? ' revisará tu propuesta y se comunicará contigo por correo. Recuerda: pago total a más tardar el 14 de noviembre y materiales hasta el 30 de noviembre.' : ' team will review your proposal and contact you by email. Remember: full payment by November 14 and materials by November 30.'}
                </p>
              </div>

              {/* Reference ID Card */}
              <div 
                className="max-w-md mx-auto p-3.5 bg-[#101010] border border-[var(--sgx-accent)] flex items-center justify-between"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <div className="text-left">
                  <span className="text-[9px] text-slate-400 block uppercase">{es ? 'CÓDIGO DE SEGUIMIENTO:' : 'TRACKING CODE:'}</span>
                  <span className="text-sm font-extrabold text-[var(--sgx-accent)] font-mono tracking-wider">
                    {submittedInquiry.referenceCode}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 bg-[var(--sgx-bg)] border border-[var(--sgx-accent)] text-[10px] text-white hover:bg-[var(--sgx-accent)] hover:text-black font-bold flex items-center space-x-1.5 transition-all"
                  style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-[#FDCC0D]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? (es ? 'COPIADO' : 'COPIED') : (es ? 'COPIAR' : 'COPY')}</span>
                </button>
              </div>
            </div>

            {/* Application Summary Box */}
            <div 
              className="p-4 bg-[#2b2b2b]/60 border border-[var(--sgx-secondary)] space-y-3 text-xs"
              style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
            >
              <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)]/60 pb-2">
                <span className="text-[var(--sgx-accent)] font-bold uppercase">{es ? 'RESUMEN DE LA POSTULACIÓN' : 'APPLICATION SUMMARY'}</span>
                <span className="text-slate-400 text-[10px]">Tier: {submittedInquiry.selectedTierName}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">{es ? 'Contacto:' : 'Contact:'}</span>
                  <span className="font-bold text-white">{submittedInquiry.contactName} ({submittedInquiry.roleTitle || (es ? 'Representante' : 'Representative')})</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{es ? 'Correo de enlace:' : 'Contact email:'}</span>
                  <span className="font-bold text-[var(--sgx-neon)]">{submittedInquiry.email}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{es ? 'Teléfono / WhatsApp:' : 'Phone / WhatsApp:'}</span>
                  <span className="font-bold text-white">{submittedInquiry.phone}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">{es ? 'Presupuesto Estimado:' : 'Estimated Budget:'}</span>
                  <span className="font-bold text-[var(--sgx-accent)]">{submittedInquiry.estimatedBudget}</span>
                </div>
              </div>

              {submittedInquiry.goals.length > 0 && (
                <div className="pt-2 border-t border-[var(--sgx-secondary)]/40">
                  <span className="text-slate-400 text-[10px] block mb-1">{es ? 'Activaciones seleccionadas:' : 'Selected activations:'}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {submittedInquiry.goals.map(g => {
                      const item = AVAILABLE_GOALS.find(x => x.id === g);
                      return (
                        <span 
                          key={g} 
                          className="px-2 py-0.5 bg-[#1b1b1b] border border-[var(--sgx-neon)]/40 text-[var(--sgx-neon)] text-[10px]"
                          style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                        >
                          ✓ {(item && loc(item, 'label', language)) || g}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleDownloadSummary}
                className="px-4 py-2.5 bg-[#2b2b2b] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black text-xs font-bold font-mono uppercase flex items-center space-x-2 transition-all"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <Download className="w-4 h-4" />
                <span>{es ? 'DESCARGAR COMPROBANTE (.TXT)' : 'DOWNLOAD RECEIPT (.TXT)'}</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSubmittedInquiry(null)}
                  className="px-4 py-2.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300 hover:text-white text-xs font-bold font-mono uppercase transition-all"
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  {es ? 'ENVIAR OTRA CONSULTA' : 'SEND ANOTHER INQUIRY'}
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="sgx-btn text-xs font-bold py-2.5 px-6"
                  >
                    {es ? 'CERRAR' : 'CLOSE'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Form Entry Screen */
          <form onSubmit={handleSubmit} className="space-y-6 font-mono">
            
            {/* Step 1: Select Tier */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[var(--sgx-accent)] uppercase flex items-center space-x-1.5">
                  <Award className="w-4 h-4 text-[var(--sgx-accent)]" />
                  <span>{es ? '1. SELECCIONA EL TIER DE PATROCINIO DESEADO *' : '1. SELECT THE SPONSORSHIP TIER YOU WANT *'}</span>
                </label>
                <span className="text-[10px] text-slate-400">{es ? 'Precios en USD' : 'Prices in USD'}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {SPONSORSHIP_TIERS.map(tier => {
                  const isSelected = selectedTierId === tier.id;
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => {
                        setSelectedTierId(tier.id);
                        setEstimatedBudget(tier.priceRange);
                      }}
                      className={`p-3.5 text-left border transition-all relative flex flex-col justify-between ${
                        isSelected 
                          ? 'border-[var(--sgx-accent)] bg-[var(--sgx-accent)]/15 shadow-md shadow-[var(--sgx-accent)]/20' 
                          : 'border-[var(--sgx-secondary)]/70 bg-[#2b2b2b]/50 hover:border-[var(--sgx-neon)]'
                      }`}
                      style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                    >
                      {isSelected && (
                        <div 
                          className="absolute top-2 right-2 w-2 h-2 bg-[var(--sgx-accent)] animate-ping" 
                          style={{ clipPath: 'polygon(1px 0, 100% 0, 100% calc(100% - 1px), calc(100% - 1px) 100%, 0 100%, 0 1px)' }}
                        />
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span 
                            className="text-[9px] px-1.5 py-0.5 bg-[#1b1b1b] text-[var(--sgx-neon)] font-bold border border-[var(--sgx-secondary)]"
                            style={{ clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)' }}
                          >
                            TIER {tier.tierNumber}
                          </span>
                          <span className="text-xs font-extrabold text-[var(--sgx-accent)]">
                            {loc(tier, 'priceRange', language)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-white uppercase mb-1">
                          {loc(tier, 'name', language)}
                        </h4>
                        <p className="text-[10px] text-slate-300 leading-tight">
                          {loc(tier, 'keyBenefit', language)}
                        </p>
                      </div>
                      <div className="mt-3 pt-2 border-t border-[var(--sgx-secondary)]/40 flex items-center justify-between text-[9px]">
                        <span className={isSelected ? 'text-[var(--sgx-accent)] font-bold' : 'text-slate-400'}>
                          {isSelected ? (es ? '✓ SELECCIONADO' : '✓ SELECTED') : (es ? 'Elegir este' : 'Choose this one')}
                        </span>
                        {tier.yearLongLicense && (
                          <span className="text-[#FDCC0D] font-bold">{es ? 'LICENCIA 365 DÍAS' : '365-DAY LICENSE'}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Company & Contact Info */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--sgx-accent)] uppercase flex items-center space-x-1.5">
                <Building2 className="w-4 h-4 text-[var(--sgx-accent)]" />
                <span>{es ? '2. INFORMACIÓN DE TU EMPRESA Y REPRESENTANTE *' : '2. YOUR COMPANY AND REPRESENTATIVE INFORMATION *'}</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'EMPRESA / MARCA *' : 'COMPANY / BRAND *'}</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder={es ? 'Ej. CyberCraft Studios, MetaTech PR' : 'E.g. CyberCraft Studios, MetaTech PR'}
                    className={`w-full p-2.5 bg-[#1b1b1b] border text-xs text-white placeholder-slate-500 focus:outline-none ${
                      errors.companyName ? 'border-red-500 bg-red-950/20' : 'border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)]'
                    }`}
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                  {errors.companyName && <span className="text-[10px] text-red-400 mt-0.5 block">{errors.companyName}</span>}
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'REPRESENTANTE DE CONTACTO *' : 'CONTACT REPRESENTATIVE *'}</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                    placeholder={es ? 'Nombre y Apellidos' : 'First and Last Name'}
                    className={`w-full p-2.5 bg-[#1b1b1b] border text-xs text-white placeholder-slate-500 focus:outline-none ${
                      errors.contactName ? 'border-red-500 bg-red-950/20' : 'border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)]'
                    }`}
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                  {errors.contactName && <span className="text-[10px] text-red-400 mt-0.5 block">{errors.contactName}</span>}
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'CARGO / POSICIÓN' : 'TITLE / POSITION'}</label>
                  <input
                    type="text"
                    value={roleTitle}
                    onChange={e => setRoleTitle(e.target.value)}
                    placeholder={es ? 'Ej. Director de Marketing, Founder, CMO' : 'E.g. Marketing Director, Founder, CMO'}
                    className="w-full p-2.5 bg-[#1b1b1b] border border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)] text-xs text-white placeholder-slate-500 focus:outline-none"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'CORREO ELECTRÓNICO PROFESIONAL *' : 'PROFESSIONAL EMAIL *'}</label>
                  <div className="relative">
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="sponsor@empresa.com"
                      className={`w-full p-2.5 bg-[#1b1b1b] border text-xs text-white placeholder-slate-500 focus:outline-none ${
                        errors.email ? 'border-red-500 bg-red-950/20' : 'border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)]'
                      }`}
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  {errors.email && <span className="text-[10px] text-red-400 mt-0.5 block">{errors.email}</span>}
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'TELÉFONO O WHATSAPP DE NEGOCIOS *' : 'BUSINESS PHONE OR WHATSAPP *'}</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (787) 555-0100"
                      className={`w-full p-2.5 bg-[#1b1b1b] border text-xs text-white placeholder-slate-500 focus:outline-none ${
                        errors.phone ? 'border-red-500 bg-red-950/20' : 'border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)]'
                      }`}
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                    <Phone className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                  {errors.phone && <span className="text-[10px] text-red-400 mt-0.5 block">{errors.phone}</span>}
                </div>

                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'SITIO WEB O PERFIL PROFESIONAL' : 'WEBSITE OR PROFESSIONAL PROFILE'}</label>
                  <div className="relative">
                    <input
                      type="url"
                      value={websiteUrl}
                      onChange={e => setWebsiteUrl(e.target.value)}
                      placeholder="https://empresa.com"
                      className="w-full p-2.5 bg-[#1b1b1b] border border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)] text-xs text-white placeholder-slate-500 focus:outline-none"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    />
                    <Globe className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3: Specific Goals & Activations */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[var(--sgx-accent)] uppercase flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-[var(--sgx-accent)]" />
                <span>{es ? '3. ACTIVACIONES Y BENEFICIOS QUE TE INTERESAN' : '3. ACTIVATIONS AND BENEFITS YOU\'RE INTERESTED IN'}</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {AVAILABLE_GOALS.map(goal => {
                  const isChecked = selectedGoals.includes(goal.id);
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => toggleGoal(goal.id)}
                      className={`p-2.5 border text-left flex items-center space-x-2.5 transition-all text-xs ${
                        isChecked 
                          ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)]/10 text-white' 
                          : 'border-[var(--sgx-secondary)]/60 bg-[#1b1b1b] text-slate-400 hover:border-slate-500'
                      }`}
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <div 
                        className={`w-4 h-4 border flex items-center justify-center shrink-0 ${
                          isChecked ? 'border-[var(--sgx-neon)] bg-[var(--sgx-neon)] text-black' : 'border-slate-500'
                        }`}
                        style={{ clipPath: 'polygon(1px 0, 100% 0, 100% calc(100% - 1px), calc(100% - 1px) 100%, 0 100%, 0 1px)' }}
                      >
                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <Icon className={`w-4 h-4 shrink-0 ${isChecked ? 'text-[var(--sgx-neon)]' : 'text-slate-500'}`} />
                      <span className="leading-tight">{loc(goal, 'label', language)}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Budget Range & Custom Notes */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'RANGO DE INVERSIÓN ESTIMADO' : 'ESTIMATED INVESTMENT RANGE'}</label>
                  <select
                    value={estimatedBudget}
                    onChange={e => setEstimatedBudget(e.target.value)}
                    className="w-full p-2.5 bg-[#1b1b1b] border border-[var(--sgx-secondary)] text-xs text-white focus:outline-none focus:border-[var(--sgx-neon)]"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    <option value="$50 – $100">$50 – $100 (Tier 1: Digital Presence)</option>
                    <option value="$250 – $500">$250 – $500 (Tier 2: Gamified)</option>
                    <option value="$750 – $1,000">$750 – $1,000 (Tier 3: Experience)</option>
                    <option value="$1,500 – $2,500">$1,500 – $2,500 (Tier 4: Signature Experience)</option>
                    <option value="A convenir (sin precio público)">{es ? 'A convenir (Tier 5: Alianza de servicios esenciales)' : 'To be agreed (Tier 5: Essential Services Alliance)'}</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] text-slate-300 block mb-1">{es ? 'PROPUESTA DE ACTIVACIÓN / MENSAJE PERSONALIZADO' : 'ACTIVATION PROPOSAL / CUSTOM MESSAGE'}</label>
                  <textarea
                    rows={2}
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder={es ? 'Cuéntanos sobre tu producto, ideas de activación en la transmisión, la webapp o los minijuegos...' : 'Tell us about your product and your activation ideas for the broadcast, the web app or the mini-games...'}
                    className="w-full p-2 bg-[#1b1b1b] border border-[var(--sgx-secondary)] focus:border-[var(--sgx-neon)] text-xs text-white placeholder-slate-500 focus:outline-none"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  />
                </div>
              </div>
            </div>

            {sendError && (
              <p role="alert" className="text-xs text-red-300 border border-red-500/50 bg-red-950/40 p-2">{sendError}</p>
            )}

            {/* Submit Bar */}
            <div className="pt-4 border-t border-[var(--sgx-secondary)]/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                <Info className="w-4 h-4 text-[var(--sgx-accent)] shrink-0" />
                <span>{es ? 'Pago total a más tardar el 14 de noviembre de 2026. Materiales hasta el 30 de noviembre. También puedes escribir a info@spatialgineers.com.' : 'Full payment by November 14, 2026. Materials by November 30. You can also write to info@spatialgineers.com.'}</span>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                {onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-slate-300 hover:text-white text-xs font-bold"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {es ? 'CANCELAR' : 'CANCEL'}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="sgx-btn w-full sm:w-auto py-2.5 px-8 text-xs font-bold uppercase flex items-center justify-center space-x-2 shadow-lg shadow-[var(--sgx-accent)]/20 hover:scale-[1.02] transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black border-t-transparent animate-spin" />
                      <span>{es ? 'ENVIANDO SOLICITUD...' : 'SENDING REQUEST...'}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-black" />
                      <span>{es ? 'ENVIAR SOLICITUD DE PATROCINIO' : 'SEND SPONSORSHIP REQUEST'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};
