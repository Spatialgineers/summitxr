import React, { useState } from 'react';
import { 
  ShieldCheck, 
  X, 
  Lock, 
  Eye, 
  Server, 
  Mail, 
  FileText, 
  Scale, 
  CheckCircle2, 
  ExternalLink,
  Cpu,
  Sparkles
} from 'lucide-react';
import { playUiChirp } from '../../lib/cyberAudioEngine';

interface SummitPrivacyPolicyModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const SummitPrivacyPolicyModal: React.FC<SummitPrivacyPolicyModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'anonymous' | 'telemetry' | 'no_sale' | 'email' | 'pr_law'>('all');

  return (
    <div 
      className="fixed inset-0 z-[999999] flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl bg-[#0F0F0F] border-2 border-[var(--sgx-neon)] p-5 sm:p-7 space-y-5 shadow-2xl relative overflow-hidden font-sans text-slate-100 max-h-[92vh] flex flex-col my-auto"
        style={{ clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)' }}
      >
        {/* Decorative corner grid & cyber accents */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--sgx-neon)]/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-[#32527B]/10 blur-3xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[var(--sgx-neon)] to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--sgx-secondary)] pb-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-cyan-950/80 border border-[var(--sgx-neon)] text-[var(--sgx-neon)] text-[10px] font-mono uppercase tracking-widest font-bold">
                PRIVACY & DATA DISCLOSURE • PUERTO RICO COMPLIANT
              </span>
              <span className="text-[10px] text-[#FDCC0D] font-mono hidden sm:inline flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 inline text-[#FDCC0D]" /> VERIFICADO 2026
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[var(--sgx-neon)]" />
              Política de Privacidad y Tratamiento de Datos
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              Spatialgineers, LLC • San Juan, Puerto Rico • Marco de Transparencia para Experiencias Espaciales Gratuitas
            </p>
          </div>

          <button 
            onClick={() => {
              playUiChirp(600);
              onClose();
            }}
            className="p-1.5 bg-[#1E1E1E] hover:bg-[var(--sgx-neon)] hover:text-black border border-slate-700 hover:border-[var(--sgx-neon)] text-slate-400 transition-colors"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono border-b border-slate-800 pb-3">
          {[
            { id: 'all', label: 'Ver Todo el Documento', icon: FileText },
            { id: 'anonymous', label: '1. Login Anónimo & Cero Datos Privados', icon: Lock },
            { id: 'telemetry', label: '2. Telemetría & Decisiones en la App', icon: Cpu },
            { id: 'no_sale', label: '3. Garantía de NO Venta a 3ros', icon: ShieldCheck },
            { id: 'email', label: '4. Uso de Email & Noticias', icon: Mail },
            { id: 'pr_law', label: '5. Leyes de Puerto Rico & Gratis', icon: Scale },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  playUiChirp(800);
                  setActiveTab(tab.id as any);
                }}
                className={`px-2.5 py-1 flex items-center gap-1.5 transition-all text-[11px] whitespace-nowrap ${
                  isSelected
                    ? 'bg-[var(--sgx-neon)] text-black font-extrabold shadow-sm'
                    : 'bg-[#1b1b1b] border border-slate-700 text-slate-300 hover:border-slate-500 hover:text-white'
                }`}
                style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Policy Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-xs text-slate-300 font-sans leading-relaxed">
          
          {/* Highlight Banner */}
          <div 
            className="p-4 bg-gradient-to-r from-[#191919] via-[#1F1F1F] to-[#131313] border-l-4 border-[var(--sgx-neon)] space-y-1.5"
            style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%)' }}
          >
            <div className="flex items-center gap-2 text-[var(--sgx-neon)] font-bold text-xs font-mono uppercase">
              <Sparkles className="w-4 h-4" />
              <span>Nuestra Promesa Central de Transparencia</span>
            </div>
            <p className="text-slate-200 text-xs">
              Nuestras experiencias, simuladores y juegos espaciales son <strong>100% gratuitos</strong>. No solicitamos ni almacenamos datos personales sensibles mediante el inicio de sesión anónimo. Recopilamos únicamente datos de interacción y telemetría de decisiones para validar casos de uso y mejorar nuestros servicios. <strong>Jamás vendemos ni comercializamos tus datos con terceros bajo ninguna circunstancia.</strong>
            </p>
          </div>

          {/* Section 1: Anonymous Login */}
          {(activeTab === 'all' || activeTab === 'anonymous') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Lock className="w-4 h-4" />
                <span>1. Autenticación Anónima (Guest Mode) y Cero Datos Personales</span>
              </div>
              <p>
                Al utilizar el <strong>Spatialgineers Summit Gamified Engine</strong> en modo invitado o inicio anónimo, la plataforma <strong>no recopila</strong> nombres reales, domicilios físicos, números de teléfono, documentos de identidad ni información financiera o bancaria.
              </p>
              <p className="text-slate-400">
                Se te asigna un identificador criptográfico pseudo-aleatorio en tu navegador para permitirte acumular puntos de experiencia (XP), desbloquear insignias en el pasaporte, conservar tu avatar y votar en tiempo real sin revelar tu identidad real.
              </p>
            </div>
          )}

          {/* Section 2: Telemetry & Activity Decisions */}
          {(activeTab === 'all' || activeTab === 'telemetry') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-[#FDCC0D] font-bold text-sm font-['Orbitron',sans-serif]">
                <Cpu className="w-4 h-4" />
                <span>2. Telemetría de Decisiones, Interacciones y Validación de Casos de Uso</span>
              </div>
              <p>
                Recopilamos y analizamos métricas técnicas de interacción dentro del entorno web, incluyendo:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li>Decisiones tomadas en encuestas de conferencias y votaciones de keynotes en vivo.</li>
                <li>Rutas y pilares elegidos en los minijuegos de computación espacial y simulador de vuelo.</li>
                <li>Puntos de interés explorados en el mapa 360° y stands virtuales visitados.</li>
                <li>Rendimiento del pipeline gráfico (tasas de cuadros por segundo de WebGL y Three.js, compatibilidad con navegadores y latencia de audio Web Audio API).</li>
              </ul>
              <div className="p-3 bg-[#32527B]/30 border border-[#FDCC0D]/40 text-slate-200 text-[11px] font-mono">
                <strong>PROPÓSITO EXCLUSIVO:</strong> Esta información se utiliza de forma interna y agregada para auditar y mejorar la calidad del software, optimizar la experiencia de usuario, balancear servidores de streaming y validar casos de uso reales de computación espacial y tecnologías WebXR.
              </div>
            </div>
          )}

          {/* Section 3: Absolute Zero Third-Party Sale */}
          {(activeTab === 'all' || activeTab === 'no_sale') && (
            <div className="p-4 bg-[#171717] border border-[#FDCC0D]/40 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-[#FDCC0D] font-bold text-sm font-['Orbitron',sans-serif]">
                <ShieldCheck className="w-4 h-4" />
                <span>3. Garantía Estricta de NO Venta ni Transferencia a Terceros</span>
              </div>
              <p className="text-white font-medium">
                Spatialgineers, LLC mantiene una política estricta y sin excepciones: <strong>NUNCA vendemos, comercializamos, alquilamos, monetizamos ni cedemos</strong> tus datos de navegación, telemetría o correos electrónicos a corredores de datos (data brokers), agencias de publicidad externas, redes de anuncios o terceros no afiliados.
              </p>
              <p className="text-slate-400">
                La información procesada es de uso exclusivo para las operaciones, infraestructura e investigación de <strong>Spatialgineers, LLC</strong> y el ecosistema del Summit.
              </p>
            </div>
          )}

          {/* Section 4: Email Usage for News & Future Events */}
          {(activeTab === 'all' || activeTab === 'email') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Mail className="w-4 h-4" />
                <span>4. Uso de Correos Electrónicos Recopilados Voluntariamente</span>
              </div>
              <p>
                Cuando un usuario proporciona voluntariamente su correo electrónico para:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li>Registrar su pase de admisión oficial (Summit Pass digital o presencial en San Juan).</li>
                <li>Postularse como ponente en el <em>Speaker Portal</em>.</li>
                <li>Solicitar información sobre patrocinios o alianzas de marca.</li>
              </ul>
              <p>
                El usuario autoriza a <strong>Spatialgineers, LLC</strong> a utilizar dicha dirección de correo para:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                <li>Envío de sus credenciales, códigos de confirmación y notificaciones operativas esenciales del evento.</li>
                <li>Compartir noticias tecnológicas, resúmenes de conferencias y anuncios de nuevos proyectos espaciales.</li>
                <li>Promociones de futuras ediciones del Spatialgineers Summit, actividades del SGX Guild (como los SGX Ranked Trials) y lanzamientos de nuevas webapps de la comunidad.</li>
              </ol>
              <p className="text-[11px] text-slate-400 pt-1">
                <em>* Derecho de Desuscripción (Opt-Out): En cualquier momento puedes solicitar la cancelación de envíos informativos escribiendo a <strong>info@spatialgineers.com</strong> o haciendo clic en el enlace de desuscripción incluido en los comunicados.</em>
              </p>
            </div>
          )}

          {/* Section 5: Puerto Rico Legal Compliance & Free Experiences */}
          {(activeTab === 'all' || activeTab === 'pr_law') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-3 rounded-sm">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Scale className="w-4 h-4" />
                <span>5. Marco Jurídico del Estado Libre Asociado de Puerto Rico & Modelo Gratuito</span>
              </div>
              <p>
                Esta política se rige en estricto cumplimiento con el ordenamiento jurídico del <strong>Estado Libre Asociado de Puerto Rico</strong>, en concordancia con el derecho a la intimidad y las disposiciones relativas a la protección de datos y comunicaciones digitales aplicables en la jurisdicción:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                <div className="p-3 bg-[#1B1B1B] border border-slate-700/60 space-y-1">
                  <div className="text-white font-bold font-mono">NATURALEZA GRATUITA</div>
                  <div className="text-slate-400">
                    Nuestras aplicaciones, minijuegos y simuladores son provistos de forma libre y sin tarifa de acceso. La contraprestación legítima es la autorización expresa del usuario para procesar la telemetría generada con fines de optimización interna.
                  </div>
                </div>
                <div className="p-3 bg-[#1B1B1B] border border-slate-700/60 space-y-1">
                  <div className="text-white font-bold font-mono">JURISDICCIÓN & TRIBUNALES</div>
                  <div className="text-slate-400">
                    Cualquier controversia relacionada con el uso de la plataforma o esta política se someterá de forma exclusiva a la jurisdicción de los tribunales de San Juan, Puerto Rico.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Contact & Rights */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 space-y-2 rounded-sm text-slate-300 text-xs">
            <div className="font-bold text-white uppercase font-mono text-[11px]">
              Contacto del Delegado de Privacidad & Ejercicio de Derechos
            </div>
            <p>
              Si tienes preguntas sobre cómo gestionamos los datos, deseas actualizar tu correo o solicitar la eliminación de tu registro de pase, puedes comunicarte directamente con nuestro equipo:
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-1 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-[var(--sgx-neon)]">
                <Mail className="w-4 h-4" />
                <span>info@spatialgineers.com</span>
              </div>
              <div className="text-slate-400">
                Spatialgineers, LLC • San Juan, Puerto Rico 00901
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[var(--sgx-secondary)] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400 text-[11px] text-center sm:text-left">
            Última actualización: <span className="text-slate-200">Septiembre 2026</span> • Versión 2.4 PR-Compliant
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                playUiChirp(840);
                onClose();
              }}
              className="sgx-btn py-2 px-6 text-xs font-extrabold uppercase w-full sm:w-auto text-center"
            >
              ENTENDIDO & ACEPTAR
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
