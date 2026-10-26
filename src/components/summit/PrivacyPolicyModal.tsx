import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Mail, 
  FileText, 
  CheckCircle, 
  X, 
  Sparkles,
  Server,
  Award
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-[#131313] border-2 border-[var(--sgx-neon)] p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden font-sans text-slate-100 max-h-[92vh] flex flex-col"
        style={{ clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)' }}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#B87000] via-[var(--sgx-gold)] to-[#FDCC0D]" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)]/80 pb-4 shrink-0">
          <div className="flex items-center space-x-3">
            <div 
              className="p-2.5 bg-[#32527B]/60 border border-[var(--sgx-gold)] text-[#FDCC0D]"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-bold font-['Orbitron',sans-serif] text-white tracking-wide">
                  POLÍTICA DE PRIVACIDAD & USO DE DATOS
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 border border-[#FDCC0D]/60 text-[#FDCC0D] font-extrabold uppercase bg-[#32527B]/40">
                  COMPLIANT PR
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Spatialgineers Summit Gamified Engine • San Juan, Puerto Rico
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white border border-transparent hover:border-[var(--sgx-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1.5 custom-scrollbar text-xs leading-relaxed text-slate-300 font-sans">
          
          {/* Summary Box */}
          <div className="p-4 bg-[#0E0E0E] border border-[#FDCC0D]/40 space-y-2 rounded">
            <div className="text-xs font-mono font-black text-[#FDCC0D] uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-[#FDCC0D]" />
              <span>COMPROMISO FUNDAMENTAL DE SPATIALGINEERS</span>
            </div>
            <p className="text-slate-200">
              Nuestros juegos, recorridos interactivos y experiencias son 100% gratuitos. 
              <strong> NUNCA vendemos, alquilamos ni transferimos tus datos a terceros con fines comerciales.</strong> 
              Toda la información recolectada se utiliza exclusivamente a nivel interno por Spatialgineers para operar la plataforma, validar casos de uso, mejorar la experiencia y enviarte información de eventos.
            </p>
          </div>

          {/* Section 1: Anonymous Login & Activity Tracking */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Lock className="w-4 h-4 text-[#FDCC0D]" />
              <span>1. Acceso Anónimo y Telemetría de Actividad</span>
            </h4>
            <p>
              Cuando ingresas a través del modo <strong>Inicio Anónimo</strong>, la plataforma no recopila tu nombre real, número telefónico ni datos identificatorios sensibles. 
              Generamos un identificador criptográfico anónimo para permitirte:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              <li>Guardar tu progreso de misiones, logros y rango en tu SGX Pass.</li>
              <li>Registrar tus interacciones y decisiones de diseño en el creador de avatares.</li>
              <li>Validar casos de uso técnicos y métricas de desempeño del motor en tiempo real.</li>
            </ul>
          </div>

          {/* Section 2: Email Collection & Communications */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Mail className="w-4 h-4 text-[#FDCC0D]" />
              <span>2. Registro con Correo Electrónico y Promociones</span>
            </h4>
            <p>
              Al registrarte para una taquilla oficial (Pase Digital o Pase Showcase Presencial), ingresar a través de Google o inscribirte en listas de espera, nos autorizas a utilizar tu correo electrónico para:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-2 text-slate-300">
              <li>Enviarte tu acreditación oficial, código de acceso y comprobante de taquilla en PDF.</li>
              <li>Notificarte sobre transmisiones en vivo, cambios de horario de speakers y salas interactivas.</li>
              <li>Compartir noticias exclusivas, lanzamientos tecnológicos y convocatorias de futuros eventos de Spatialgineers.</li>
            </ul>
          </div>

          {/* Section 3: Legal Compliance Puerto Rico */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Server className="w-4 h-4 text-[#FDCC0D]" />
              <span>3. Cumplimiento Legal y Jurisdicción (Puerto Rico)</span>
            </h4>
            <p>
              Esta política se rige en conformidad con el ordenamiento jurídico aplicable en el Estado Libre Asociado de Puerto Rico y las leyes federales de los Estados Unidos de América. 
              Garantizamos que la información de decisiones, interacciones y métricas permanecerá bajo control exclusivo de Spatialgineers sin cesión a terceras partes.
            </p>
          </div>

          {/* Section 4: Security */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <Eye className="w-4 h-4 text-[#FDCC0D]" />
              <span>4. Almacenamiento Seguro y Derechos del Usuario</span>
            </h4>
            <p>
              Implementamos protocolos de cifrado estándar en la industria para resguardar la persistencia de datos en la nube. 
              Puedes solicitar la eliminación de tu registro de taquilla o desconexión de tu perfil contactándonos directamente a 
              <span className="font-mono text-[#FDCC0D] ml-1">info@spatialgineers.com</span>.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--sgx-secondary)]/80 flex items-center justify-between shrink-0 font-mono text-xs">
          <span className="text-slate-400 text-[11px]">
            Última actualización: octubre 2026 • San Juan, PR
          </span>
          <button
            onClick={onClose}
            className="sgx-btn py-2 px-5 text-xs font-bold font-mono uppercase"
          >
            ENTENDIDO & ACEPTAR
          </button>
        </div>

      </div>
    </div>
  );
};
