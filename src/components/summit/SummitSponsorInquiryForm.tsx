import React, { useState } from 'react';
import { CheckCircle2, Send, Info, Download, Copy, Check, AlertTriangle } from 'lucide-react';
import { SponsorshipTier, SponsorInquiry } from '../../types/summit';
import { submitSponsorInquiry, SPONSORSHIP_TIERS } from '../../lib/summitData';
import { auth } from '../../lib/firebase';
import { savePendingCredential } from '../../identity/credentials';
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';
import { SgxDialog } from '../common/SgxDialog';
import './sgxModals.css';

/* SPONSOR APPLICATION: tier, company, activations and a message. Inline in the
   sponsors section, or in SgxDialog when `isModal`. Lands in Firestore via
   submitSponsorInquiry; the downloadable .txt is the visitor's receipt. */

interface SummitSponsorInquiryFormProps {
  initialTierId?: string;
  onClose?: () => void;
  onSuccess?: (inquiry: SponsorInquiry) => void;
  isModal?: boolean;
}

const AVAILABLE_GOALS = [
  { id: '4K_STREAM_OVERLAY', label: 'Logo en la webapp y en los overlays de la transmisión (Días 1-3)', labelEn: 'Logo on the web app and on the broadcast overlays (Days 1-3)' },
  { id: 'PHYSICAL_BOOTH_CHROMA', label: 'Activación "Experience by [Marca]" (Tier 4 y 5)', labelEn: '"Experience by [Brand]" activation (Tier 4 and 5)' },
  { id: 'DRONE_MINIGAME_BRANDING', label: 'Branding en Minijuego de Drones & Zonas de Aterrizaje', labelEn: 'Branding in the Drone Mini-Game & Landing Zones' },
  { id: 'GAMIFIED_CHALLENGE_POINTS', label: 'Pregunta de trivia de marca en vivo (+25 XP)', labelEn: 'Live brand trivia question (+25 XP)' },
  { id: 'SEGMENT_NAMING', label: 'Naming de Segmento o Pilar ("Showcase Powered by...")', labelEn: 'Segment or Pillar Naming ("Showcase Powered by...")' },
  { id: 'VIP_CATERING', label: 'Alianza de servicios esenciales: venue, internet, comida u otros (Tier 5)', labelEn: 'Essential services alliance: venue, internet, food or others (Tier 5)' },
  { id: 'YEAR_LONG_LICENSE', label: 'Licencia de acceso a la webapp por 365 días desde noviembre (Tier 4 y 5)', labelEn: '365-day web app access license starting in November (Tier 4 and 5)' },
  { id: 'TALENT_RECRUITMENT', label: 'Reclutamiento de Talento 3D / Desarrolladores Roblox', labelEn: '3D Talent / Roblox Developer Recruiting' }
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
  // The budget follows the tier the visitor picked on the sponsors page.
  const [estimatedBudget, setEstimatedBudget] = useState<string>(() => SPONSORSHIP_TIERS.find((t) => t.id === initialTierId)?.priceRange || '$250 – $500');
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
  const formId = React.useId();

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
      referenceCode: `SGX-SPONSOR-2026-${refNum}`,
      // Lets the team's approval turn this visitor's sponsor Holo Card official.
      submittedBy: auth.currentUser?.uid || undefined,
    };

    // Lands in the team's Firestore inbox; the local copy is the visitor's receipt.
    setSendError(null);
    const sent = await submitSponsorInquiry(newInquiry);
    setIsSubmitting(false);
    if (!sent) {
      setSendError(es ? 'No pudimos enviar tu solicitud en este momento. Revisa tu conexión e inténtalo de nuevo, o escríbenos a info@spatialgineers.com.' : "We couldn't send your request right now. Check your connection and try again, or write to info@spatialgineers.com.");
      return;
    }
    savePendingCredential('sponsor', {
      name: newInquiry.contactName, title: newInquiry.roleTitle, org: newInquiry.companyName,
      topic: chosenTier ? chosenTier.name : undefined,
    });
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

  const field = (
    key: 'companyName' | 'contactName' | 'roleTitle' | 'email' | 'phone' | 'websiteUrl',
    label: string,
    value: string,
    set: (v: string) => void,
    opts: { type?: string; placeholder: string; required?: boolean; autoComplete?: string },
  ) => (
    <label className="sgx-m-field">
      <span>{label}{opts.required && <em> *</em>}</span>
      <input
        className="sgx-m-input"
        type={opts.type || 'text'}
        value={value}
        onChange={(e) => set(e.target.value)}
        placeholder={opts.placeholder}
        autoComplete={opts.autoComplete}
        aria-invalid={errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `sgx-spn-err-${key}` : undefined}
      />
      {errors[key] && <span id={`sgx-spn-err-${key}`} className="sgx-m-err">{errors[key]}</span>}
    </label>
  );

  const title = es ? 'Postúlate como patrocinador' : 'Apply as a sponsor';
  const kicker = es ? 'Tu marca en la transmisión de YouTube Live y en la webapp del Summit' : 'Your brand on the YouTube Live broadcast and the Summit web app';

  const success = submittedInquiry && (
    <div className="sgx-m sgx-m-stack">
      <div className="sgx-m-note sgx-m-note--ok" role="status">
        <CheckCircle2 size={18} aria-hidden />
        <div>
          <strong>{es ? 'Solicitud enviada. ' : 'Request sent. '}</strong>
          {es ? 'Gracias, ' : 'Thank you, '}{submittedInquiry.companyName}.{' '}
          {es ? 'El equipo de Spatialgineers revisará tu propuesta y te escribirá por correo. Pago total a más tardar el 14 de noviembre y materiales hasta el 30 de noviembre.' : 'The Spatialgineers team will review your proposal and email you. Full payment by November 14 and materials by November 30.'}
        </div>
      </div>
      <div className="sgx-m-code">
        <div>
          <p className="sgx-m-fine">{es ? 'Código de seguimiento' : 'Tracking code'}</p>
          <code>{submittedInquiry.referenceCode}</code>
        </div>
        <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={handleCopyCode}>
          {copiedCode ? <Check size={14} aria-hidden /> : <Copy size={14} aria-hidden />}{copiedCode ? (es ? 'Copiado' : 'Copied') : (es ? 'Copiar' : 'Copy')}
        </button>
      </div>
      <div className="sgx-m-card">
        <div className="sgx-m-row sgx-m-row--between">
          <p className="sgx-m-kicker">{es ? 'Resumen' : 'Summary'}</p>
          <span className="sgx-m-tag sgx-m-tag--gold">{submittedInquiry.selectedTierName}</span>
        </div>
        <div className="sgx-m-grid sgx-m-grid--2">
          <div className="sgx-m-readout"><span>{es ? 'Contacto' : 'Contact'}</span><b>{submittedInquiry.contactName}{submittedInquiry.roleTitle ? ` · ${submittedInquiry.roleTitle}` : ''}</b></div>
          <div className="sgx-m-readout"><span>{es ? 'Correo' : 'Email'}</span><b style={{ overflowWrap: 'anywhere' }}>{submittedInquiry.email}</b></div>
          <div className="sgx-m-readout"><span>{es ? 'Teléfono / WhatsApp' : 'Phone / WhatsApp'}</span><b>{submittedInquiry.phone}</b></div>
          <div className="sgx-m-readout"><span>{es ? 'Inversión estimada' : 'Estimated budget'}</span><b>{submittedInquiry.estimatedBudget}</b></div>
        </div>
        {submittedInquiry.goals.length > 0 && (
          <ul className="sgx-m-bullets">
            {submittedInquiry.goals.map((g) => {
              const item = AVAILABLE_GOALS.find((x) => x.id === g);
              return <li key={g}>{(item && loc(item, 'label', language)) || g}</li>;
            })}
          </ul>
        )}
      </div>
    </div>
  );

  const successActions = (
    <>
      <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={handleDownloadSummary} style={{ marginRight: 'auto' }}>
        <Download size={14} aria-hidden /> {es ? 'Descargar comprobante (.txt)' : 'Download receipt (.txt)'}
      </button>
      <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={() => setSubmittedInquiry(null)}>{es ? 'Enviar otra' : 'Send another'}</button>
      {onClose && <button type="button" className="sgx-btn sgx-btn--sm" onClick={onClose}>{es ? 'Cerrar' : 'Close'}</button>}
    </>
  );

  const formActions = (
    <>
      {onClose && <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={onClose}>{es ? 'Cancelar' : 'Cancel'}</button>}
      <button type="submit" form={formId} className="sgx-btn sgx-btn--sm" disabled={isSubmitting}>
        <Send size={14} aria-hidden /> {isSubmitting ? (es ? 'Enviando…' : 'Sending…') : (es ? 'Enviar solicitud' : 'Send request')}
      </button>
    </>
  );

  const form = (
    <form id={formId} onSubmit={handleSubmit} className="sgx-m sgx-m-stack">
      <fieldset className="sgx-m-stack" style={{ border: 0, margin: 0, padding: 0, gap: 10 }}>
        <legend className="sgx-m-row sgx-m-row--between" style={{ width: '100%', marginBottom: 10 }}>
          <span className="sgx-spn__step"><b>1</b>{es ? 'Elige tu nivel' : 'Pick your tier'}</span>
          <span className="sgx-m-fine">{es ? 'Precios en USD' : 'Prices in USD'}</span>
        </legend>
        <div className="sgx-spn__tiers" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 180px), 1fr))' }}>
          {SPONSORSHIP_TIERS.map((tier) => {
            const isSelected = selectedTierId === tier.id;
            return (
              <button
                key={tier.id}
                type="button"
                aria-pressed={isSelected}
                className={`sgx-m-card sgx-spn__tier ${isSelected ? 'is-on' : ''}`}
                onClick={() => { setSelectedTierId(tier.id); setEstimatedBudget(tier.priceRange); }}
              >
                <span className="sgx-m-row sgx-m-row--between" style={{ width: '100%' }}>
                  <span className="sgx-m-tag">{es ? 'Nivel' : 'Tier'} {tier.tierNumber}</span>
                  <span className="sgx-m-xp" style={{ fontSize: '0.85rem' }}>{loc(tier, 'priceRange', language)}</span>
                </span>
                <span className="sgx-m-h">{loc(tier, 'name', language)}</span>
                <span className="sgx-m-p" style={{ fontSize: '0.8rem' }}>{loc(tier, 'keyBenefit', language)}</span>
                <span className="sgx-m-row sgx-m-row--between" style={{ width: '100%', marginTop: 'auto' }}>
                  <span className="sgx-m-fine">{isSelected ? (es ? 'Seleccionado' : 'Selected') : (es ? 'Elegir' : 'Choose')}</span>
                  {tier.yearLongLicense && <span className="sgx-m-tag sgx-m-tag--gold">{es ? 'Licencia 365 días' : '365-day license'}</span>}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="sgx-m-stack" style={{ border: 0, margin: 0, padding: 0, gap: 10 }}>
        <legend className="sgx-spn__step" style={{ marginBottom: 10 }}><b>2</b>{es ? 'Tu empresa y contacto' : 'Your company and contact'}</legend>
        <div className="sgx-m-grid sgx-m-grid--2">
          {field('companyName', es ? 'Empresa o marca' : 'Company or brand', companyName, setCompanyName, { placeholder: es ? 'Ej. CyberCraft Studios' : 'E.g. CyberCraft Studios', required: true, autoComplete: 'organization' })}
          {field('contactName', es ? 'Representante' : 'Representative', contactName, setContactName, { placeholder: es ? 'Nombre y apellidos' : 'First and last name', required: true, autoComplete: 'name' })}
          {field('roleTitle', es ? 'Cargo' : 'Title', roleTitle, setRoleTitle, { placeholder: es ? 'Ej. Directora de Mercadeo' : 'E.g. Marketing Director', autoComplete: 'organization-title' })}
          {field('email', es ? 'Correo profesional' : 'Work email', email, setEmail, { type: 'email', placeholder: es ? 'patrocinio@empresa.com' : 'sponsor@company.com', required: true, autoComplete: 'email' })}
          {field('phone', es ? 'Teléfono o WhatsApp' : 'Phone or WhatsApp', phone, setPhone, { type: 'tel', placeholder: '+1 (787) 555-0100', required: true, autoComplete: 'tel' })}
          {field('websiteUrl', es ? 'Sitio web o perfil' : 'Website or profile', websiteUrl, setWebsiteUrl, { type: 'url', placeholder: 'https://empresa.com', autoComplete: 'url' })}
        </div>
      </fieldset>

      <fieldset className="sgx-m-stack" style={{ border: 0, margin: 0, padding: 0, gap: 10 }}>
        <legend className="sgx-spn__step" style={{ marginBottom: 10 }}><b>3</b>{es ? 'Activaciones que te interesan' : 'Activations you want'}</legend>
        <div className="sgx-m-grid sgx-m-grid--2" style={{ gap: 8 }}>
          {AVAILABLE_GOALS.map((goal) => {
            const isChecked = selectedGoals.includes(goal.id);
            return (
              <button key={goal.id} type="button" className="sgx-spn__goal" aria-pressed={isChecked} onClick={() => toggleGoal(goal.id)}>
                <span className="sgx-spn__box" aria-hidden="true">{isChecked && <Check size={13} strokeWidth={3} />}</span>
                <span>{loc(goal, 'label', language)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="sgx-m-stack" style={{ border: 0, margin: 0, padding: 0, gap: 10 }}>
        <legend className="sgx-spn__step" style={{ marginBottom: 10 }}><b>4</b>{es ? 'Inversión y mensaje' : 'Budget and message'}</legend>
        <div className="sgx-m-grid sgx-m-grid--2">
          <label className="sgx-m-field">
            <span>{es ? 'Rango de inversión' : 'Budget range'}</span>
            <select className="sgx-m-input" value={estimatedBudget} onChange={(e) => setEstimatedBudget(e.target.value)}>
              <option value="$50 – $100">$50 – $100 (Tier 1: Digital Presence)</option>
              <option value="$250 – $500">$250 – $500 (Tier 2: Gamified)</option>
              <option value="$750 – $1,000">$750 – $1,000 (Tier 3: Experience)</option>
              <option value="$1,500 – $2,500">$1,500 – $2,500 (Tier 4: Signature Experience)</option>
              <option value="A convenir (sin precio público)">{es ? 'A convenir (Tier 5: Alianza de servicios esenciales)' : 'To be agreed (Tier 5: Essential Services Alliance)'}</option>
            </select>
          </label>
          <label className="sgx-m-field">
            <span>{es ? 'Tu propuesta o mensaje' : 'Your proposal or message'}</span>
            <textarea className="sgx-m-input" rows={3} value={customMessage} onChange={(e) => setCustomMessage(e.target.value)}
              placeholder={es ? 'Tu producto e ideas de activación en la transmisión, la webapp o los minijuegos…' : 'Your product and activation ideas for the broadcast, the web app or the mini-games…'} />
          </label>
        </div>
      </fieldset>

      <div className="sgx-m-note">
        <Info size={16} aria-hidden />
        <div>{es ? 'Pago total a más tardar el 14 de noviembre de 2026. Materiales hasta el 30 de noviembre. También puedes escribir a info@spatialgineers.com.' : 'Full payment by November 14, 2026. Materials by November 30. You can also write to info@spatialgineers.com.'}</div>
      </div>

      {sendError && (
        <div className="sgx-m-note sgx-m-note--warn" role="alert">
          <AlertTriangle size={18} aria-hidden />
          <div>{sendError}</div>
        </div>
      )}
    </form>
  );

  if (isModal) {
    return (
      <SgxDialog
        onClose={onClose || (() => {})}
        title={submittedInquiry ? (es ? 'Solicitud enviada' : 'Request sent') : title}
        kicker={kicker}
        icon={<img src="/holo/showcase.png" alt="" />}
        size="lg"
        footer={submittedInquiry ? successActions : formActions}
      >
        {submittedInquiry ? success : form}
      </SgxDialog>
    );
  }

  return (
    <section className="sgx-spn__inline sgx-m sgx-m-stack" aria-labelledby="sgx-spn-title">
      <header className="sgx-m-row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', gap: 12 }}>
        <img className="sgx-m-mark sgx-m-mark--lg" src="/holo/showcase.png" alt="" />
        <div style={{ minWidth: 0 }}>
          <h2 id="sgx-spn-title" className="sgx-m-h" style={{ fontSize: 'clamp(1.1rem, 2.6vw, 1.5rem)' }}>{submittedInquiry ? (es ? 'Solicitud enviada' : 'Request sent') : title}</h2>
          <p className="sgx-m-kicker" style={{ marginTop: 4, textTransform: 'none', letterSpacing: '0.04em' }}>{kicker}</p>
        </div>
      </header>
      {submittedInquiry ? success : form}
      <div className="sgx-m-row" style={{ justifyContent: 'flex-end', gap: 10, paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        {submittedInquiry ? successActions : formActions}
      </div>
    </section>
  );
};
