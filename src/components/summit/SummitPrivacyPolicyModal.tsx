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
import { useLanguage } from '../../context/LanguageContext';

interface SummitPrivacyPolicyModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export const SummitPrivacyPolicyModal: React.FC<SummitPrivacyPolicyModalProps> = ({ onClose }) => {
  const { language } = useLanguage();
  const es = language === 'es';
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
                <CheckCircle2 className="w-3 h-3 inline text-[#FDCC0D]" />{es ? ' VERIFICADO 2026' : ' VERIFIED 2026'}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-[var(--sgx-neon)]" />
              {es ? 'Política de Privacidad y Tratamiento de Datos' : 'Privacy Policy and Data Processing'}
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {es ? 'Spatialgineers, LLC • San Juan, Puerto Rico • Marco de Transparencia para Experiencias Espaciales Gratuitas' : 'Spatialgineers, LLC • San Juan, Puerto Rico • Transparency Framework for Free Spatial Experiences'}
            </p>
          </div>

          <button 
            onClick={() => {
              playUiChirp(600);
              onClose();
            }}
            className="p-1.5 bg-[#1E1E1E] hover:bg-[var(--sgx-neon)] hover:text-black border border-slate-700 hover:border-[var(--sgx-neon)] text-slate-400 transition-colors"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            title={es ? 'Cerrar modal' : 'Close modal'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap gap-1.5 text-[11px] font-mono border-b border-slate-800 pb-3">
          {[
            { id: 'all', label: (es ? 'Ver Todo el Documento' : 'View the Whole Document'), icon: FileText },
            { id: 'anonymous', label: (es ? '1. Login Anónimo & Cero Datos Privados' : '1. Anonymous Login & Zero Private Data'), icon: Lock },
            { id: 'telemetry', label: (es ? '2. Telemetría & Decisiones en la App' : '2. Telemetry & In-App Decisions'), icon: Cpu },
            { id: 'no_sale', label: (es ? '3. Garantía de NO Venta a 3ros' : '3. NO Sale to Third Parties Guarantee'), icon: ShieldCheck },
            { id: 'email', label: (es ? '4. Uso de Email & Noticias' : '4. Email Use & News'), icon: Mail },
            { id: 'pr_law', label: (es ? '5. Leyes de Puerto Rico & Gratis' : '5. Puerto Rico Law & Free Access'), icon: Scale },
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
              <span>{es ? 'Nuestra Promesa Central de Transparencia' : 'Our Core Transparency Promise'}</span>
            </div>
            <p className="text-slate-200 text-xs">
              {es ? 'Nuestras experiencias, simuladores y juegos espaciales son ' : 'Our spatial experiences, simulators and games are '}<strong>{es ? '100% gratuitos' : '100% free'}</strong>{es ? '. No solicitamos ni almacenamos datos personales sensibles mediante el inicio de sesión anónimo. Recopilamos únicamente datos de interacción y telemetría de decisiones para validar casos de uso y mejorar nuestros servicios. ' : '. We don\'t request or store sensitive personal data through anonymous sign-in. We only collect interaction data and decision telemetry to validate use cases and improve our services. '}<strong>{es ? 'Jamás vendemos ni comercializamos tus datos con terceros bajo ninguna circunstancia.' : 'We never sell or trade your data with third parties under any circumstances.'}</strong>
            </p>
          </div>

          {/* Section 1: Anonymous Login */}
          {(activeTab === 'all' || activeTab === 'anonymous') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Lock className="w-4 h-4" />
                <span>{es ? '1. Autenticación Anónima (Guest Mode) y Cero Datos Personales' : '1. Anonymous Authentication (Guest Mode) and Zero Personal Data'}</span>
              </div>
              <p>
                {es ? 'Al utilizar el ' : 'When you use the '}<strong>Spatialgineers Summit Gamified Engine</strong>{es ? ' en modo invitado o inicio anónimo, la plataforma ' : ' in guest mode or with anonymous sign-in, the platform '}<strong>{es ? 'no recopila' : 'does not collect'}</strong>{es ? ' nombres reales, domicilios físicos, números de teléfono, documentos de identidad ni información financiera o bancaria.' : ' real names, physical addresses, phone numbers, ID documents or financial or banking information.'}
              </p>
              <p className="text-slate-400">
                {es ? 'Se te asigna un identificador criptográfico pseudo-aleatorio en tu navegador para permitirte acumular puntos de experiencia (XP), desbloquear insignias en el pasaporte, conservar tu avatar y votar en tiempo real sin revelar tu identidad real.' : 'You\'re assigned a pseudo-random cryptographic identifier in your browser so you can earn experience points (XP), unlock passport badges, keep your avatar and vote in real time without revealing your real identity.'}
              </p>
            </div>
          )}

          {/* Section 2: Telemetry & Activity Decisions */}
          {(activeTab === 'all' || activeTab === 'telemetry') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-[#FDCC0D] font-bold text-sm font-['Orbitron',sans-serif]">
                <Cpu className="w-4 h-4" />
                <span>{es ? '2. Telemetría de Decisiones, Interacciones y Validación de Casos de Uso' : '2. Decision Telemetry, Interactions and Use-Case Validation'}</span>
              </div>
              <p>
                {es ? 'Recopilamos y analizamos métricas técnicas de interacción dentro del entorno web, incluyendo:' : 'We collect and analyze technical interaction metrics within the web environment, including:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li>{es ? 'Decisiones tomadas en encuestas de conferencias y votaciones de keynotes en vivo.' : 'Choices made in conference polls and live keynote votes.'}</li>
                <li>{es ? 'Rutas y pilares elegidos en los minijuegos de computación espacial y simulador de vuelo.' : 'Routes and pillars chosen in the spatial computing mini-games and the flight simulator.'}</li>
                <li>{es ? 'Puntos de interés explorados en el mapa 360° y stands virtuales visitados.' : 'Points of interest explored on the 360° map and virtual booths visited.'}</li>
                <li>{es ? 'Rendimiento del pipeline gráfico (tasas de cuadros por segundo de WebGL y Three.js, compatibilidad con navegadores y latencia de audio Web Audio API).' : 'Graphics pipeline performance (WebGL and Three.js frame rates, browser compatibility and Web Audio API audio latency).'}</li>
              </ul>
              <div className="p-3 bg-[#32527B]/30 border border-[#FDCC0D]/40 text-slate-200 text-[11px] font-mono">
                <strong>{es ? 'PROPÓSITO EXCLUSIVO:' : 'SOLE PURPOSE:'}</strong>{es ? ' Esta información se utiliza de forma interna y agregada para auditar y mejorar la calidad del software, optimizar la experiencia de usuario, balancear servidores de streaming y validar casos de uso reales de computación espacial y tecnologías WebXR.' : ' This information is used internally and in aggregate to audit and improve software quality, optimize the user experience, balance streaming servers and validate real use cases for spatial computing and WebXR technologies.'}
              </div>
            </div>
          )}

          {/* Section 3: Absolute Zero Third-Party Sale */}
          {(activeTab === 'all' || activeTab === 'no_sale') && (
            <div className="p-4 bg-[#171717] border border-[#FDCC0D]/40 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-[#FDCC0D] font-bold text-sm font-['Orbitron',sans-serif]">
                <ShieldCheck className="w-4 h-4" />
                <span>{es ? '3. Garantía Estricta de NO Venta ni Transferencia a Terceros' : '3. Strict Guarantee of NO Sale or Transfer to Third Parties'}</span>
              </div>
              <p className="text-white font-medium">
                {es ? 'Spatialgineers, LLC mantiene una política estricta y sin excepciones: ' : 'Spatialgineers, LLC keeps a strict policy with no exceptions: '}<strong>{es ? 'NUNCA vendemos, comercializamos, alquilamos, monetizamos ni cedemos' : 'we NEVER sell, trade, rent, monetize or hand over'}</strong>{es ? ' tus datos de navegación, telemetría o correos electrónicos a corredores de datos (data brokers), agencias de publicidad externas, redes de anuncios o terceros no afiliados.' : ' your browsing data, telemetry or email addresses to data brokers, outside advertising agencies, ad networks or unaffiliated third parties.'}
              </p>
              <p className="text-slate-400">
                {es ? 'La información procesada es de uso exclusivo para las operaciones, infraestructura e investigación de ' : 'The information processed is used exclusively for the operations, infrastructure and research of '}<strong>Spatialgineers, LLC</strong>{es ? ' y el ecosistema del Summit.' : ' and the Summit ecosystem.'}
              </p>
            </div>
          )}

          {/* Section 4: Email Usage for News & Future Events */}
          {(activeTab === 'all' || activeTab === 'email') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-2 rounded-sm">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Mail className="w-4 h-4" />
                <span>{es ? '4. Uso de Correos Electrónicos Recopilados Voluntariamente' : '4. Use of Voluntarily Provided Email Addresses'}</span>
              </div>
              <p>
                {es ? 'Cuando un usuario proporciona voluntariamente su correo electrónico para:' : 'When a user voluntarily provides their email address to:'}
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-300 pl-2">
                <li>{es ? 'Registrar su pase de admisión oficial (Summit Pass digital o presencial en San Juan).' : 'Register their official admission pass (digital Summit Pass or in person in San Juan).'}</li>
                <li>{es ? 'Postularse como ponente en el ' : 'Apply as a speaker through the '}<em>Speaker Portal</em>.</li>
                <li>{es ? 'Solicitar información sobre patrocinios o alianzas de marca.' : 'Request information about sponsorships or brand partnerships.'}</li>
              </ul>
              <p>
                {es ? 'El usuario autoriza a ' : 'The user authorizes '}<strong>Spatialgineers, LLC</strong>{es ? ' a utilizar dicha dirección de correo para:' : ' to use that email address to:'}
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-300 pl-2">
                <li>{es ? 'Envío de sus credenciales, códigos de confirmación y notificaciones operativas esenciales del evento.' : 'Send their credentials, confirmation codes and essential event notices.'}</li>
                <li>{es ? 'Compartir noticias tecnológicas, resúmenes de conferencias y anuncios de nuevos proyectos espaciales.' : 'Share technology news, conference recaps and announcements of new spatial projects.'}</li>
                <li>{es ? 'Promociones de futuras ediciones del Spatialgineers Summit, actividades del SGX Guild (como los SGX Ranked Trials) y lanzamientos de nuevas webapps de la comunidad.' : 'Promote future editions of the Spatialgineers Summit, SGX Guild activities (such as the SGX Ranked Trials) and new community web app launches.'}</li>
              </ol>
              <p className="text-[11px] text-slate-400 pt-1">
                <em>{es ? '* Derecho de Desuscripción (Opt-Out): En cualquier momento puedes solicitar la cancelación de envíos informativos escribiendo a ' : '* Right to Opt Out: You can ask to stop receiving informational emails at any time by writing to '}<strong>info@spatialgineers.com</strong>{es ? ' o haciendo clic en el enlace de desuscripción incluido en los comunicados.' : ' or by clicking the unsubscribe link included in our messages.'}</em>
              </p>
            </div>
          )}

          {/* Section 5: Puerto Rico Legal Compliance & Free Experiences */}
          {(activeTab === 'all' || activeTab === 'pr_law') && (
            <div className="p-4 bg-[#171717] border border-slate-800 space-y-3 rounded-sm">
              <div className="flex items-center gap-2 text-blue-400 font-bold text-sm font-['Orbitron',sans-serif]">
                <Scale className="w-4 h-4" />
                <span>{es ? '5. Marco Jurídico del Estado Libre Asociado de Puerto Rico & Modelo Gratuito' : '5. Legal Framework of the Commonwealth of Puerto Rico & Free Model'}</span>
              </div>
              <p>
                {es ? 'Esta política se rige en estricto cumplimiento con el ordenamiento jurídico del ' : 'This policy is governed in strict compliance with the laws of the '}<strong>{es ? 'Estado Libre Asociado de Puerto Rico' : 'Commonwealth of Puerto Rico'}</strong>{es ? ', en concordancia con el derecho a la intimidad y las disposiciones relativas a la protección de datos y comunicaciones digitales aplicables en la jurisdicción:' : ', in line with the right to privacy and the data protection and digital communications provisions that apply in the jurisdiction:'}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px]">
                <div className="p-3 bg-[#1B1B1B] border border-slate-700/60 space-y-1">
                  <div className="text-white font-bold font-mono">{es ? 'NATURALEZA GRATUITA' : 'FREE OF CHARGE'}</div>
                  <div className="text-slate-400">
                    {es ? 'Nuestras aplicaciones, minijuegos y simuladores son provistos de forma libre y sin tarifa de acceso. La contraprestación legítima es la autorización expresa del usuario para procesar la telemetría generada con fines de optimización interna.' : 'Our apps, mini-games and simulators are provided freely with no access fee. The legitimate consideration is the user\'s express authorization to process the generated telemetry for internal optimization.'}
                  </div>
                </div>
                <div className="p-3 bg-[#1B1B1B] border border-slate-700/60 space-y-1">
                  <div className="text-white font-bold font-mono">{es ? 'JURISDICCIÓN & TRIBUNALES' : 'JURISDICTION & COURTS'}</div>
                  <div className="text-slate-400">
                    {es ? 'Cualquier controversia relacionada con el uso de la plataforma o esta política se someterá de forma exclusiva a la jurisdicción de los tribunales de San Juan, Puerto Rico.' : 'Any dispute related to the use of the platform or this policy will be submitted exclusively to the jurisdiction of the courts of San Juan, Puerto Rico.'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Section 6: Contact & Rights */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 space-y-2 rounded-sm text-slate-300 text-xs">
            <div className="font-bold text-white uppercase font-mono text-[11px]">
              {es ? 'Contacto del Delegado de Privacidad & Ejercicio de Derechos' : 'Privacy Officer Contact & Exercising Your Rights'}
            </div>
            <p>
              {es ? 'Si tienes preguntas sobre cómo gestionamos los datos, deseas actualizar tu correo o solicitar la eliminación de tu registro de pase, puedes comunicarte directamente con nuestro equipo:' : 'If you have questions about how we handle data, want to update your email or request deletion of your pass record, you can contact our team directly:'}
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
            {es ? 'Última actualización: ' : 'Last updated: '}<span className="text-slate-200">{es ? 'Septiembre 2026' : 'September 2026'}</span> • Versión 2.4 PR-Compliant
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => {
                playUiChirp(840);
                onClose();
              }}
              className="sgx-btn py-2 px-6 text-xs font-extrabold uppercase w-full sm:w-auto text-center"
            >
              {es ? 'ENTENDIDO & ACEPTAR' : 'UNDERSTOOD & ACCEPT'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
