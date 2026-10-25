import React from 'react';
import {
  X,
  Sparkles,
  Code2,
  Building2,
  GraduationCap,
  Eye,
  CheckCircle2,
  ArrowRight,
  Compass,
  Zap,
  ShieldCheck,
  ChevronRight,
  Award
} from 'lucide-react';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp, playHoloFocusSound } from '../../lib/cyberAudioEngine';
import { SpatialTiltCard } from '../common/SpatialTiltCard';

export type PilotRole = 'CREATOR' | 'SPONSOR' | 'STUDENT' | 'VISIONARY';

interface PilotRoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection?: (sectionKey: string) => void;
}

interface RoleConfig {
  id: PilotRole;
  title: string;
  tagline: string;
  colorHex: string;
  badge: string;
  icon: React.ElementType;
  avatarImg: string;
  description: string;
  keyPerks: string[];
  recommendedSections: { label: string; sectionKey: string }[];
  primaryAction: { label: string; sectionKey: string };
}

export const PILOT_ROLES_DATA: RoleConfig[] = [
  {
    id: 'CREATOR',
    title: 'Creador & Desarrollador XR',
    tagline: 'Construye mundos, shaders y experiencias espaciales',
    colorHex: '#00FFFF',
    badge: 'ROBLOX · SHADERS · DRON 3D',
    icon: Code2,
    avatarImg: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png',
    description: 'Diseñado para programadores, modeladores 3D, creadores de Roblox Studio y shaders que buscan competir en los Ranked Trials y exhibir proyectos inmersivos.',
    keyPerks: [
      'Acceso al simulador espacial de vuelo de drones con físicas 3D',
      'Desafíos de código del SGX Guild con recompensas de XP',
      'Blueprint del mundo virtual oficial en Roblox'
    ],
    recommendedSections: [
      { label: 'Simulador Dron 3D', sectionKey: 'EMBEDS_GAMES' },
      { label: 'Guild Initiates 3D', sectionKey: 'GUILD' },
      { label: 'Speakers & Workshops', sectionKey: 'SPEAKERS' }
    ],
    primaryAction: { label: 'Explorar Simulador de Drones', sectionKey: 'EMBEDS_GAMES' }
  },
  {
    id: 'SPONSOR',
    title: 'Empresa & Inversionista',
    tagline: 'Posiciona tu marca en el volumen LED de Chroma Studios',
    colorHex: '#FDCC0D',
    badge: 'TIERS $50 - $2,500 · 365 DÍAS',
    icon: Building2,
    avatarImg: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
    description: 'Para empresas, agencias de tecnología, fundadores e inversionistas que quieren visibilidad física en Chroma Space Studios y presencia satelital en el metaverso.',
    keyPerks: [
      'Tiers oficiales desde Tier 1 ($50–$100 Digital) hasta Tier 4 Signature ($1,500–$2,500 con Licencia Anual)',
      'Presencia en el volumen LED de producción virtual y broadcast 4K',
      'Matchmaking exclusivo B2B con fundadores y creadores en SGX.Match'
    ],
    recommendedSections: [
      { label: 'Tiers de Patrocinio', sectionKey: 'SPONSORS_HUB' },
      { label: 'Tour 360° Chroma Space', sectionKey: 'MAP_360' },
      { label: 'Red SGX.Match B2B', sectionKey: 'ENTREPRENEUR_MATCH' }
    ],
    primaryAction: { label: 'Ver Opciones de Patrocinio', sectionKey: 'SPONSORS_HUB' }
  },
  {
    id: 'STUDENT',
    title: 'Estudiante & Aprendiz',
    tagline: 'Aprende computación espacial desde cero y acumula XP',
    colorHex: '#FF6B00',
    badge: 'BECAS · PASAPORTE XP · TALLERES',
    icon: GraduationCap,
    avatarImg: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Story%20Icon%20BY.png',
    description: 'Ideal para estudiantes universitarios, escolares y autodidactas de Puerto Rico y LATAM que quieren ingresar a la industria de la computación espacial e IA.',
    keyPerks: [
      'Pases gratuitos virtuales y descuentos estudiantiles presenciales',
      'Pasaporte digital con sellos y misiones para canjear en la Tienda XP',
      'Mentorías en vivo con ingenieros y creadores internacionales'
    ],
    recommendedSections: [
      { label: 'Pasaporte de Misiones', sectionKey: 'OVERVIEW' },
      { label: 'Agenda de Talleres', sectionKey: 'AGENDA' },
      { label: 'Manifiesto Espacial', sectionKey: 'PILLARS_MANIFESTO' }
    ],
    primaryAction: { label: 'Ver Agenda de Talleres', sectionKey: 'AGENDA' }
  },
  {
    id: 'VISIONARY',
    title: 'Curioso & Visionario',
    tagline: 'Disfruta transmisiones 4K, conciertos y la comunidad',
    colorHex: '#FFFFFF',
    badge: 'BROADCAST 4K · CONCIERTOS · LIVE',
    icon: Eye,
    avatarImg: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png',
    description: 'Para entusiastas de la cultura digital, gamers y curiosos que desean presenciar el futuro del entretenimiento interactivo y los conciertos en vivo.',
    keyPerks: [
      'Transmisiones multicanal 4K desde Chroma Space Studios y Roblox',
      'Votación interactiva CYOA en tiempo real durante las presentaciones',
      'Comunidad en vivo con reacciones hápticas y chat global'
    ],
    recommendedSections: [
      { label: 'Salas de Broadcast 4K', sectionKey: 'BROADCAST_ROOMS' },
      { label: 'Comunidad & Social Stream', sectionKey: 'SOCIAL_STREAM' },
      { label: 'Manifiesto SGX', sectionKey: 'PILLARS_MANIFESTO' }
    ],
    primaryAction: { label: 'Explorar Salas de Transmisión', sectionKey: 'BROADCAST_ROOMS' }
  }
];

export const PilotRoleSelectorModal: React.FC<PilotRoleSelectorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSection,
}) => {
  const { profile, selectPilotRole } = usePilotProfile();

  if (!isOpen) return null;

  const currentRole = profile.selectedRole;

  const handleSelectRole = (role: PilotRole, primarySectionKey: string) => {
    selectPilotRole(role);
    playUiChirp(880);
    // Auto-navigate if desired or let user explore
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-end sm:items-center justify-center p-0 sm:p-6 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full bg-[#070D18] border-t-2 sm:border-2 border-cyan-400/80 p-4 sm:p-6 shadow-2xl relative space-y-5 sm:my-auto max-h-[93vh] overflow-y-auto text-slate-100 font-mono"
        style={{
          boxShadow: '0 0 45px rgba(0, 255, 255, 0.25)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-bold text-cyan-400 tracking-widest uppercase">
                ASTRONAUTA GUÍA · ONBOARDING DE RUTA
              </span>
              <span className="px-2 py-0.5 bg-[#FDCC0D]/20 text-[#FDCC0D] border border-[#FDCC0D]/40 text-[10px] font-black">
                +50 XP
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-wider">
              ELIGE TU SENDA TÁCTICA EN EL SUMMIT
            </h2>
            <p className="text-xs text-slate-400 max-w-2xl font-sans">
              El astronauta calibrará tu interfaz, destacando las estaciones, talleres y patrocinios más relevantes para tu perfil. Puedes cambiar de senda en cualquier momento.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Role Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PILOT_ROLES_DATA.map((role) => {
            const isSelected = currentRole === role.id;
            const Icon = role.icon;

            return (
              <SpatialTiltCard
                key={role.id}
                showCornerBrackets
                maxTilt={10}
                onClick={() => {
                  playHoloFocusSound();
                  handleSelectRole(role.id, role.primaryAction.sectionKey);
                }}
                className="h-full cursor-pointer"
              >
              <div
                className={`relative h-full p-4 sm:p-5 border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-gradient-to-br from-[#0F1E36] via-[#0B1629] to-[#070E1C] shadow-lg'
                    : 'bg-[#08101E]/90 hover:bg-[#0C172B] border-slate-800 hover:border-slate-600'
                }`}
                style={{
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                  borderColor: isSelected ? role.colorHex : undefined,
                  boxShadow: isSelected ? `0 0 24px ${role.colorHex}40` : undefined,
                }}
              >
                {/* Active Indicator Pin */}
                {isSelected && (
                  <div
                    className="absolute top-3 right-3 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider flex items-center space-x-1"
                    style={{
                      backgroundColor: role.colorHex,
                      color: role.colorHex === '#FFFFFF' || role.colorHex === '#FDCC0D' || role.colorHex === '#00FFFF' ? '#000000' : '#FFFFFF',
                    }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    <span>RUTA ACTIVA</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Role Header */}
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-10 h-10 rounded-xs flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: `${role.colorHex}15`,
                        borderColor: role.colorHex,
                        color: role.colorHex,
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span
                        className="text-[10px] font-bold tracking-wider block"
                        style={{ color: role.colorHex }}
                      >
                        {role.badge}
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-white font-['Orbitron',sans-serif]">
                        {role.title}
                      </h3>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-slate-300 font-sans leading-relaxed">
                    {role.description}
                  </p>

                  {/* Perks list */}
                  <div className="space-y-1.5 pt-1">
                    {role.keyPerks.map((perk, i) => (
                      <div key={i} className="flex items-start space-x-2 text-[11px] text-slate-400">
                        <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                        <span>{perk}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {role.recommendedSections.map((sec, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRole(role.id, sec.sectionKey);
                          if (onNavigateToSection) {
                            onNavigateToSection(sec.sectionKey);
                            onClose();
                          }
                        }}
                        className="text-[10px] px-2 py-0.5 bg-slate-900 border border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-white transition-colors"
                      >
                        {sec.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectRole(role.id, role.primaryAction.sectionKey);
                      if (onNavigateToSection) {
                        onNavigateToSection(role.primaryAction.sectionKey);
                        onClose();
                      }
                    }}
                    className="px-3 py-1.5 text-xs font-bold font-mono transition-all flex items-center space-x-1 shrink-0"
                    style={{
                      backgroundColor: isSelected ? role.colorHex : '#162238',
                      color: isSelected
                        ? (role.colorHex === '#FFFFFF' || role.colorHex === '#FDCC0D' || role.colorHex === '#00FFFF' ? '#000000' : '#FFFFFF')
                        : '#FFFFFF',
                    }}
                  >
                    <span>{isSelected ? 'Explorar Senda' : 'Seleccionar'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              </SpatialTiltCard>
            );
          })}
        </div>

        {/* Bottom Banner */}
        <div className="p-3 bg-black/50 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 text-slate-400">
            <Award className="w-4 h-4 text-[#FDCC0D]" />
            <span>Al elegir tu ruta recibes +50 XP y se guardará en tu Pasaporte de Piloto.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            Listo, Continuar Navegando
          </button>
        </div>
      </div>
    </div>
  );
};
