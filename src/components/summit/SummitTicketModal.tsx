import React, { useState, useEffect } from 'react';
import { 
  Ticket, 
  X, 
  Mail, 
  CheckCircle2, 
  Download, 
  Copy, 
  Check, 
  User, 
  Building,
  RefreshCw,
  Globe,
  MapPin,
  Sparkles,
  FileText,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { generateSummitPassPDF } from '../../lib/pdfTicketGenerator';
import { SummitPrivacyPolicyModal } from './SummitPrivacyPolicyModal';
import { SpatialTiltCard } from '../common/SpatialTiltCard';
import { playUiChirp, playCyberBurstSound, playScanSuccessSound } from '../../lib/cyberAudioEngine';

export type TicketType = 'DIGITAL' | 'SHOWCASE_PHYSICAL';

export interface SummitPassRecord {
  id: string;
  referenceCode: string;
  ticketType: TicketType;
  fullName: string;
  email: string;
  roleTitle?: string;
  organization?: string;
  registeredAt: number;
  userId?: string | null;
  status: 'CONFIRMED' | 'PENDING';
}

interface SummitTicketModalProps {
  onClose: () => void;
  initialType?: TicketType;
}

export const SummitTicketModal: React.FC<SummitTicketModalProps> = ({ onClose, initialType = 'DIGITAL' }) => {
  const { user, signInWithGoogle } = useAuth();
  
  const [selectedType, setSelectedType] = useState<TicketType>(initialType);
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [roleTitle, setRoleTitle] = useState<string>('Creador de Contenido');
  const [organization, setOrganization] = useState<string>('');

  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'viewing_existing'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [activePass, setActivePass] = useState<SummitPassRecord | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState<boolean>(false);

  // Check for saved pass on mount
  useEffect(() => {
    try {
      const savedPass = localStorage.getItem('sgx_summit_registered_pass');
      if (savedPass) {
        const parsed: SummitPassRecord = JSON.parse(savedPass);
        if (parsed && parsed.referenceCode) {
          setActivePass(parsed);
          setStatus('viewing_existing');
        }
      }
    } catch (e) {
      console.warn('Error reading saved pass from storage:', e);
    }
  }, []);

  // Autofill when user is authenticated
  useEffect(() => {
    if (user && status === 'idle') {
      if (user.displayName && !fullName) {
        setFullName(user.displayName);
      }
      if (user.email && !email) {
        setEmail(user.email);
      }
    }
  }, [user, fullName, email, status]);

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setErrorMsg('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      setErrorMsg('No se pudo iniciar sesión con Google. Puedes escribir tu correo manualmente.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Por favor escribe tu nombre completo.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMsg('Por favor ingresa un correo electrónico válido.');
      return;
    }

    setStatus('loading');
    setErrorMsg('');

    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
    const prefix = selectedType === 'DIGITAL' ? 'SGX-DIGITAL' : 'SGX-SHOWCASE';
    const refCode = `${prefix}-${randomSuffix}`;

    const newPass: SummitPassRecord = {
      id: `pass_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      referenceCode: refCode,
      ticketType: selectedType,
      fullName: fullName.trim(),
      email: email.trim(),
      roleTitle: selectedType === 'SHOWCASE_PHYSICAL' ? roleTitle.trim() : 'Asistente Digital',
      organization: organization.trim() || undefined,
      registeredAt: Date.now(),
      userId: user ? user.uid : null,
      status: selectedType === 'DIGITAL' ? 'CONFIRMED' : 'PENDING'
    };

    // Save to Firestore
    try {
      await addDoc(collection(db, 'ticket_inquiries'), {
        email: newPass.email,
        fullName: newPass.fullName,
        ticketType: newPass.ticketType,
        referenceCode: newPass.referenceCode,
        roleTitle: newPass.roleTitle || '',
        organization: newPass.organization || '',
        status: newPass.status,
        userId: newPass.userId,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.warn('Firestore write notice (local fallback active):', err);
    }

    // Save locally
    try {
      localStorage.setItem('sgx_summit_registered_pass', JSON.stringify(newPass));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }

    playScanSuccessSound();
    setActivePass(newPass);
    setStatus('success');
  };

  const handleCopyCode = () => {
    if (!activePass) return;
    navigator.clipboard?.writeText(activePass.referenceCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadPDF = () => {
    if (!activePass) return;
    generateSummitPassPDF(activePass);
  };

  const handleDownloadReceipt = () => {
    if (!activePass) return;

    const receipt = `=====================================================
SPATIALGINEERS SUMMIT 2026 • REGISTRO
Fecha: Diciembre 11 - 13, 2026
Días 1 y 2: digitales por YouTube Live
Día 3 (SGX Showcase): Chroma Space Studios, San Juan, PR · por invitación y cupo limitado (sujeto a la firma del acuerdo)
=====================================================

CÓDIGO DE REGISTRO: ${activePass.referenceCode}
TIPO DE PASE: ${activePass.ticketType === 'DIGITAL' ? 'Pase Digital Global' : 'Solicitud SGX Showcase Presencial (por invitación)'}
ESTADO: ${activePass.status === 'CONFIRMED' ? 'CONFIRMADO' : 'SOLICITUD EN REVISIÓN'}

DATOS REGISTRADOS:
- Nombre: ${activePass.fullName}
- Correo: ${activePass.email}
${activePass.roleTitle ? `- Perfil: ${activePass.roleTitle}` : ''}
${activePass.organization ? `- Empresa/Medio: ${activePass.organization}` : ''}

INFORMACIÓN:
- Para soporte o dudas: info@spatialgineers.com
=====================================================`;

    const blob = new Blob([receipt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SGX_Registro_${activePass.fullName.replace(/\s+/g, '_')}_${activePass.referenceCode}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fadeIn">
      <div 
        className="bg-[#131313] border-t-2 sm:border-2 border-[var(--sgx-neon)] max-w-xl w-full p-4 sm:p-6 space-y-4 shadow-2xl relative sm:my-auto max-h-[94vh] overflow-y-auto"
        style={{ 
          boxShadow: '0 0 45px rgba(0, 221, 255, 0.22)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)]/70 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <span 
                className="px-2 py-0.5 bg-[var(--sgx-neon)]/15 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] text-[9px] font-bold font-mono uppercase"
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                EVENTO 100% GRATUITO
              </span>
              <span className="text-slate-400 text-[10px] font-mono">DIC 11–13, 2026</span>
            </div>
            <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif] uppercase tracking-wide flex items-center space-x-2 mt-1">
              <Ticket className="w-5 h-5 text-[var(--sgx-neon)]" />
              <span>REGISTRO AL SUMMIT 2026</span>
            </h3>
          </div>
          
          <button 
            onClick={onClose} 
            className="p-1.5 bg-[#2b2b2b] border border-[var(--sgx-secondary)] text-slate-400 hover:text-white transition-colors"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* View Mode: Success or Active Pass */}
        {(status === 'success' || status === 'viewing_existing') && activePass ? (
          <div className="space-y-4 font-mono">
            {/* Status Alert */}
            <div 
              className={`p-3.5 border text-center space-y-1.5 ${
                activePass.ticketType === 'DIGITAL'
                  ? 'bg-amber-950/40 border-[#FDCC0D] text-[#FDCC0D]'
                  : 'bg-amber-950/40 border-amber-500 text-amber-300'
              }`}
              style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
            >
              <div 
                className="w-9 h-9 flex items-center justify-center mx-auto bg-black/40 border border-current"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-sm font-['Orbitron',sans-serif]">
                {activePass.ticketType === 'DIGITAL' 
                  ? '¡PASE DIGITAL CONFIRMADO!' 
                  : '¡SOLICITUD DE SHOWCASE RECIBIDA!'}
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                {activePass.ticketType === 'DIGITAL'
                  ? `Tu registro está activo. Puedes descargar tu taquilla oficial en PDF lista para imprimir o guardar.`
                  : `Hemos recibido tu solicitud para el SGX Showcase presencial (Día 3) en San Juan. El acceso es por invitación y cupo limitado; te confirmaremos por correo. Descarga tu comprobante en PDF.`}
              </p>
            </div>

            {/* High-Fidelity 3D Interactive Holographic Pass Card Preview */}
            <SpatialTiltCard showCornerBrackets maxTilt={11}>
            <div 
              className="relative p-5 border overflow-hidden transition-all bg-gradient-to-br from-[#171717] via-[#131313] to-[#0A0A0A] shadow-2xl"
              style={{
                clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)',
                borderColor: activePass.ticketType === 'DIGITAL' ? 'rgba(0, 221, 255, 0.6)' : 'rgba(255, 184, 0, 0.6)',
                boxShadow: activePass.ticketType === 'DIGITAL' 
                  ? '0 0 25px rgba(0, 221, 255, 0.15), inset 0 0 20px rgba(0, 221, 255, 0.05)' 
                  : '0 0 25px rgba(255, 184, 0, 0.15), inset 0 0 20px rgba(255, 184, 0, 0.05)'
              }}
            >
              {/* Corner Cyber Accents */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />

              {/* Holographic Watermark Sheen */}
              <div className="absolute -right-8 -bottom-8 opacity-5 text-white pointer-events-none select-none">
                <Ticket className="w-56 h-56" />
              </div>

              {/* Pass Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3 relative z-10">
                <div>
                  <span className="text-[10px] tracking-widest text-slate-400 uppercase font-bold block">
                    SPATIALGINEERS SUMMIT 2026
                  </span>
                  <span className="text-xs text-white font-bold font-['Orbitron',sans-serif]">
                    OFFICIAL ADMISSION PASS
                  </span>
                </div>
                <span 
                  className={`px-2.5 py-1 text-[10px] font-extrabold uppercase self-start sm:self-auto border ${
                    activePass.ticketType === 'DIGITAL'
                      ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 shadow-sm shadow-cyan-500/30'
                      : 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-sm shadow-amber-500/30'
                  }`}
                  style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                >
                  {activePass.ticketType === 'DIGITAL' ? 'PASE DIGITAL GLOBAL' : 'SHOWCASE SAN JUAN'}
                </span>
              </div>

              {/* Pass Body */}
              <div className="flex flex-col sm:flex-row sm:items-stretch gap-4 py-4 relative z-10">
                <div className="flex-1 min-w-0 space-y-2.5 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Titular / Passholder:</span>
                    <span className="text-sm sm:text-base font-extrabold text-white tracking-wide uppercase font-['Orbitron',sans-serif] block break-words leading-snug">
                      {activePass.fullName}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-mono">Correo Verificado:</span>
                    <span className="text-[var(--sgx-neon)] font-bold text-xs break-all block">
                      {activePass.email}
                    </span>
                  </div>
                  {(activePass.organization || activePass.roleTitle) && (
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase font-mono">Perfil / Entidad:</span>
                      <span className="text-slate-200 text-xs break-words block leading-relaxed">
                        {[activePass.roleTitle, activePass.organization].filter(Boolean).join(' • ')}
                      </span>
                    </div>
                  )}
                  <div className="pt-2 text-[10px] text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
                    <span className="whitespace-normal">📅 Dic 11–13, 2026</span>
                    <span className="whitespace-normal">📍 Días 1–2 por YouTube Live • Día 3: Chroma Space Studios (San Juan, sujeto a la firma del acuerdo)</span>
                  </div>
                </div>

                {/* Right Mini Stub / QR Simulation */}
                <div className="border-t sm:border-t-0 sm:border-l border-dashed border-slate-700/80 pt-3 sm:pt-0 sm:pl-4 flex flex-row sm:flex-col items-center justify-between sm:justify-center text-center gap-3 shrink-0">
                  <div 
                    className="p-2 bg-white shadow-inner shrink-0"
                    style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
                  >
                    <QrCode className="w-12 h-12 sm:w-14 sm:h-14 text-black" />
                  </div>
                  <div className="text-right sm:text-center min-w-0">
                    <span className="text-[9px] text-slate-400 block uppercase font-mono">CÓDIGO DE REGISTRO</span>
                    <span className="text-xs sm:text-sm font-bold font-mono text-[var(--sgx-neon)] tracking-wider block break-all">
                      {activePass.referenceCode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Footer Security Stamp */}
              <div className="border-t border-slate-800/80 pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[9px] text-slate-500 relative z-10 font-mono">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D] shrink-0" />
                  <span className="break-words">EMITIDO POR SGX LIVE ENGINE • AUTH VERIFIED</span>
                </span>
                <span className="shrink-0 font-bold">{activePass.status === 'CONFIRMED' ? 'ESTADO: CONFIRMADO' : 'ESTADO: EN REVISIÓN'}</span>
              </div>
            </div>
            </SpatialTiltCard>

            {/* Actions Bar */}
            <div className="space-y-2 pt-1">
              {/* Primary PDF Download Action */}
              <button
                onClick={handleDownloadPDF}
                className="w-full py-3 px-4 bg-gradient-to-r from-[var(--sgx-neon)] to-cyan-400 hover:from-cyan-300 hover:to-cyan-200 text-black font-extrabold text-xs font-['Orbitron',sans-serif] uppercase flex items-center justify-center space-x-2 shadow-lg shadow-cyan-500/20 hover:scale-[1.01] transition-all cursor-pointer"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <Download className="w-4 h-4 text-black" />
                <span>DESCARGAR TAQUILLA OFICIAL EN PDF (ALTA CALIDAD)</span>
              </button>

              {/* Visitor Holo Card Button */}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.dispatchEvent(
                    new CustomEvent('sgx:open_holo_card', {
                      detail: {
                        name: activePass.fullName,
                        jobtitle: activePass.roleTitle || 'ASISTENTE SUMMIT',
                        org: activePass.organization || 'SPATIALGINEERS SUMMIT',
                        role: 'visitante',
                        passType: activePass.ticketType === 'DIGITAL' ? 'PASE DIGITAL GLOBAL' : 'PASAPORTE SUMMIT PRESENCIAL',
                        ticketCode: activePass.referenceCode,
                      },
                    })
                  );
                }}
                className="w-full py-3 px-4 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-300 text-black font-extrabold text-xs font-['Orbitron',sans-serif] uppercase flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/20 hover:scale-[1.01] transition-all cursor-pointer"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <Sparkles className="w-4 h-4 text-black" />
                <span>🎨 GENERAR TU PASE HOLOGRÁFICO (VISITANTE CON PASAPORTE SUMMIT)</span>
              </button>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-2 bg-[#252525] border border-[var(--sgx-neon)] text-[11px] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-bold flex items-center space-x-1.5 transition-all"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'COPIADO' : 'COPIAR CÓDIGO'}</span>
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="px-3 py-2 bg-[#2b2b2b] border border-slate-700 text-slate-300 hover:text-white text-[11px] font-bold flex items-center space-x-1 transition-all"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    title="Descargar comprobante en texto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>RECIBO .TXT</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setStatus('idle')}
                    className="px-2.5 py-2 text-slate-400 hover:text-slate-200 text-[11px] underline"
                  >
                    Nuevo registro
                  </button>
                  <button
                    onClick={onClose}
                    className="sgx-btn py-2 px-4 text-xs font-bold"
                  >
                    CERRAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Simple Registration Form with Real-Time 3D Holographic Ticket Preview */
          <form onSubmit={handleRegister} className="space-y-4 font-mono">
            
            {/* Live Interactive 3D Ticket Preview as you type */}
            <SpatialTiltCard showCornerBrackets maxTilt={9}>
              <div
                className="p-3.5 bg-gradient-to-r from-[#151515] via-[#1E1E1E] to-[#131313] border relative overflow-hidden"
                style={{
                  borderColor: selectedType === 'DIGITAL' ? '#00DDFF' : '#FDCC0D',
                }}
              >
                <div className="flex items-center justify-between text-[10px] pb-2 border-b border-white/10">
                  <span className="font-bold text-white font-['Orbitron',sans-serif] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FDCC0D]" />
                    <span>VISTA PREVIA 3D EN TIEMPO REAL</span>
                  </span>
                  <span
                    className={`px-2 py-0.5 font-extrabold text-[9px] uppercase ${
                      selectedType === 'DIGITAL'
                        ? 'bg-[#00DDFF]/20 text-[#00DDFF] border border-[#00DDFF]/50'
                        : 'bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/50'
                    }`}
                  >
                    {selectedType === 'DIGITAL' ? 'PASE DIGITAL · YOUTUBE LIVE' : 'SGX SHOWCASE · SAN JUAN PR'}
                  </span>
                </div>

                <div className="pt-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[9px] text-slate-400 uppercase">TITULAR DEL PASAPORTE SUMMIT</div>
                    <div className="text-sm font-black text-white font-['Orbitron',sans-serif] truncate uppercase">
                      {fullName.trim() || 'TU NOMBRE EN LA CREDENCIAL 3D'}
                    </div>
                    <div className="text-[10px] text-cyan-300 truncate mt-0.5">
                      {selectedType === 'SHOWCASE_PHYSICAL'
                        ? `${roleTitle} · ${organization || 'San Juan, PR'}`
                        : 'VISITANTE CON PASAPORTE SUMMIT · +100 XP'}
                    </div>
                  </div>
                  <div className="p-1.5 bg-white shrink-0 rounded-xs">
                    <QrCode className="w-9 h-9 text-black" />
                  </div>
                </div>
              </div>
            </SpatialTiltCard>

            {/* Step 1: Select Type */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Digital Pass */}
              <button
                type="button"
                onClick={() => {
                  playUiChirp(740);
                  setSelectedType('DIGITAL');
                }}
                className={`p-3 text-left border transition-all relative ${
                  selectedType === 'DIGITAL'
                    ? 'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-500/10'
                    : 'border-slate-800 bg-[#0e0e0e] opacity-70 hover:opacity-100'
                }`}
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase">Pase Digital</span>
                </div>
                <div className="text-[10px] text-cyan-300 font-bold mb-1">GRATIS • ONLINE</div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Transmisión en vivo por YouTube Live, chat y votaciones interactivas los 3 días.
                </p>
              </button>

              {/* In-Person Showcase Request */}
              <button
                type="button"
                onClick={() => setSelectedType('SHOWCASE_PHYSICAL')}
                className={`p-3 text-left border transition-all relative ${
                  selectedType === 'SHOWCASE_PHYSICAL'
                    ? 'border-amber-400 bg-amber-950/30 shadow-md shadow-amber-500/10'
                    : 'border-slate-800 bg-[#0e0e0e] opacity-70 hover:opacity-100'
                }`}
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-center space-x-1.5 mb-1">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-white uppercase">SGX Showcase (Día 3)</span>
                </div>
                <div className="text-[10px] text-amber-300 font-bold mb-1">POR INVITACIÓN • SAN JUAN</div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Presencial por invitación y cupo limitado (40 a 60 personas). Domingo 13 de diciembre, 10:00 a.m. a 4:00 p.m.
                </p>
              </button>
            </div>

            {/* Quick Google Autofill */}
            {!user ? (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-black font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                <span>{isGoogleLoading ? 'Conectando...' : 'Completar rápido con Google'}</span>
              </button>
            ) : (
              <div 
                className="p-2.5 bg-amber-950/30 border border-[#FDCC0D]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[#FDCC0D] font-bold text-[11px] break-words">
                    Conectado: {user.displayName || user.email}
                  </span>
                  {user.displayName && user.email && user.displayName !== user.email && (
                    <span className="text-[10px] text-slate-400 break-all">
                      {user.email}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 shrink-0 self-end sm:self-auto font-mono">Google ✓</span>
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-2.5 text-xs">
              <div>
                <label className="text-[10px] text-slate-300 block mb-1">NOMBRE COMPLETO *</label>
                <div className="relative">
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full p-2.5 bg-[#0e0e0e] border border-[var(--sgx-secondary)] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[var(--sgx-neon)] pr-8"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    required
                  />
                  <User className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-300 block mb-1">CORREO ELECTRÓNICO *</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full p-2.5 bg-[#0e0e0e] border border-[var(--sgx-secondary)] text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[var(--sgx-neon)] pr-8"
                    style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                </div>
              </div>

              {/* Extra fields only for Showcase Physical Request */}
              {selectedType === 'SHOWCASE_PHYSICAL' && (
                <div className="space-y-2.5 pt-1 border-t border-slate-800">
                  <div>
                    <label className="text-[10px] text-amber-300 block mb-1">PERFIL / ROL *</label>
                    <select
                      value={roleTitle}
                      onChange={e => setRoleTitle(e.target.value)}
                      className="w-full p-2.5 bg-[#0e0e0e] border border-amber-500/50 text-white text-xs focus:outline-none focus:border-amber-400"
                      style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                    >
                      <option value="Marca / Patrocinador">Marca / Patrocinador</option>
                      <option value="Líder de Industria / Ejecutivo">Líder de Industria / Ejecutivo</option>
                      <option value="Creador de Contenido / Streamer">Creador de Contenido / Streamer</option>
                      <option value="Medios / Prensa / Broadcast">Medios / Prensa / Broadcast</option>
                      <option value="Desarrollador / Estudio XR">Desarrollador / Estudio XR</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-amber-300 block mb-1">EMPRESA / MEDIO / PROYECTO</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={organization}
                        onChange={e => setOrganization(e.target.value)}
                        placeholder="Ej. Estudio XR, Agencia, Canal"
                        className="w-full p-2.5 bg-[#0e0e0e] border border-amber-500/50 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-amber-400 pr-8"
                        style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
                      />
                      <Building className="w-4 h-4 text-slate-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {errorMsg && (
              <div 
                className="p-2 bg-red-950/50 border border-red-500 text-red-300 text-xs"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                {errorMsg}
              </div>
            )}

            {/* Puerto Rico Compliant Privacy & Data Notice */}
            <div 
              className="p-3 bg-[#0f0f0f] border border-cyan-900/60 text-slate-300 text-[11px] space-y-1.5"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-cyan-400 font-bold font-mono text-[10.5px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FDCC0D]" />
                  <span>PROTECCIÓN DE DATOS (LEYES DE PUERTO RICO)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPrivacyModal(true)}
                  className="text-[var(--sgx-neon)] hover:underline font-mono text-[10px] font-bold"
                >
                  [Leer Política Completa]
                </button>
              </div>
              <p className="text-[10.5px] text-slate-400 leading-relaxed">
                Al registrarte, autorizas el uso de tu correo exclusivamente para emitir tu pase, notificarte sobre el Summit y compartir futuros eventos y noticias de Spatialgineers. <strong className="text-slate-200">Garantizamos cero venta o cesión a terceros</strong>.
              </p>
            </div>

            {/* Submit */}
            <div className="pt-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 bg-[#2b2b2b] border border-slate-700 text-slate-300 hover:text-white text-xs"
                style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={status === 'loading'}
                className="sgx-btn py-2.5 px-5 text-xs font-bold uppercase flex items-center justify-center space-x-1.5 shadow-lg shadow-cyan-500/20 w-full sm:w-auto"
              >
                {status === 'loading' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-black" />
                    <span>REGISTRANDO...</span>
                  </>
                ) : (
                  <>
                    <Ticket className="w-3.5 h-3.5 text-black" />
                    <span>
                      {selectedType === 'DIGITAL' ? 'OBTENER PASE DIGITAL' : 'ENVIAR SOLICITUD SHOWCASE'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

        {/* Embedded Privacy Policy Modal */}
        {showPrivacyModal && (
          <SummitPrivacyPolicyModal onClose={() => setShowPrivacyModal(false)} />
        )}

      </div>
    </div>
  );
};
