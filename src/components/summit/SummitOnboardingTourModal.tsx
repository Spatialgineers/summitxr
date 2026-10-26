import React, { useState } from 'react';
import { 
  Sparkles, 
  Layers, 
  UserCheck, 
  Award, 
  Zap, 
  Radio, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  X, 
  Compass, 
  Calendar, 
  Building2, 
  Gamepad2, 
  HelpCircle, 
  ExternalLink, 
  Flame,
  MessageSquare,
  Navigation,
  Tv,
  Vote,
  Ticket,
  ScanLine,
  Boxes
} from 'lucide-react';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { playUiChirp } from '../../lib/cyberAudioEngine';
import { SummitSectionKey } from './SummitSectionsDropdown';

interface SummitOnboardingTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToSection: (sectionKey: SummitSectionKey) => void;
  onOpenAvatarGenerator: () => void;
  onOpenPassport: () => void;
  onOpenTickets: () => void;
  onOpenSectionsDropdown?: () => void;
  onNavigateToVisualizer?: () => void;
  onNavigateToPlayVote?: () => void;
  onOpenRewards?: () => void;
}

interface TourStep {
  stepNumber: number;
  badge: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  primaryActionLabel?: string;
  primaryAction?: () => void;
  highlights: {
    label: string;
    desc: string;
    icon?: React.ElementType;
    sectionKey?: SummitSectionKey;
  }[];
}

function getContrastTextColor(hex?: string): string {
  if (!hex) return '#000000';
  const clean = hex.replace('#', '');
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16) || 0;
    const g = parseInt(clean.substring(2, 4), 16) || 0;
    const b = parseInt(clean.substring(4, 6), 16) || 0;
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 145 ? '#000000' : '#FFFFFF';
  }
  return '#000000';
}

export const SummitOnboardingTourModal: React.FC<SummitOnboardingTourModalProps> = ({
  isOpen,
  onClose,
  onNavigateToSection,
  onOpenAvatarGenerator,
  onOpenPassport,
  onOpenTickets,
  onOpenSectionsDropdown,
  onNavigateToVisualizer,
  onNavigateToPlayVote,
  onOpenRewards,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { tenant } = useTenantTheme();
  const { recordActivity } = usePilotProfile();

  const b = tenant.branding;
  const primaryRgb = hexToRgbStr(b.primaryColor);
  const secondaryRgb = hexToRgbStr(b.secondaryColor || '#767676');
  const btnTextColor = getContrastTextColor(b.primaryColor);

  // Mark completion in localStorage and grant passport XP & Pilot Profile XP
  const markTourCompleted = () => {
    try {
      localStorage.setItem('sgx_onboarding_completed', 'true');
      const savedQuests = localStorage.getItem('sgx_passport_quests');
      const parsed = savedQuests ? JSON.parse(savedQuests) : {};
      parsed['quest_onboarding'] = true;
      localStorage.setItem('sgx_passport_quests', JSON.stringify(parsed));
      
      recordActivity(
        'tour_complete',
        'Tour Guiado del Summit Completado',
        'Completaste con éxito la inducción a las 3 Grandes Áreas y 12 Sub-Secciones.',
        200,
        b.primaryColor
      );
      playUiChirp(880);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNext = () => {
    playUiChirp(620);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      markTourCompleted();
      onClose();
    }
  };

  const handlePrev = () => {
    playUiChirp(440);
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleJumpToStep = (index: number) => {
    playUiChirp(520);
    setCurrentStepIndex(index);
  };

  const handleSkip = () => {
    playUiChirp(330);
    markTourCompleted();
    onClose();
  };

  const steps: TourStep[] = [
    // PASO 1: ARQUITECTURA MAESTRA Y LAS 3 GRANDES ÁREAS
    {
      stepNumber: 1,
      badge: 'PASO 1 / 8 • ARQUITECTURA MAESTRA',
      title: 'Las 3 Grandes Áreas del Mega WebApp',
      subtitle: 'Ecosistema Unificado de Computación Espacial & Telemetría',
      description: 'El Spatialgineers Summit 2026 está estructurado en 3 grandes áreas principales diseñadas para ofrecer una experiencia híbrida inmersiva tanto en Chroma Space Studios (San Juan, PR) como vía streaming global:',
      icon: Layers,
      highlights: [
        {
          label: '1. Portal Summit & Hub Principal (/)',
          desc: 'La sede web completa con 12 sub-secciones: agenda oficial, transmisiones 4K, foros, networking y minijuegos.',
          icon: Compass
        },
        {
          label: '2. Stage 3D & Telemetría (#cyoa)',
          desc: 'Motor interactivo Three.js en WebGL que renderiza el escenario espacial virtual, drones y visualización reactiva.',
          icon: Tv
        },
        {
          label: '3. Consola Live Play & Votaciones (/play)',
          desc: 'Consola táctica de votación en tiempo real para que la audiencia decida el rumbo de las ponencias y batallas.',
          icon: Vote
        }
      ],
      primaryActionLabel: onNavigateToVisualizer ? 'Probar Visualizador 3D' : 'Comenzar Recorrido',
      primaryAction: onNavigateToVisualizer ? () => {
        onClose();
        onNavigateToVisualizer();
      } : handleNext,
    },

    // PASO 2: CUADRANTE 1 — PROGRAMA & HORARIOS (Subsecciones 1, 2 y 3)
    {
      stepNumber: 2,
      badge: 'PASO 2 / 8 • CUADRANTE 1: PROGRAMA',
      title: 'Cuadrante 1: Programa, Manifiesto & Agenda',
      subtitle: 'Sub-Secciones 1, 2 y 3 del Menú Táctico',
      description: 'Este cuadrante reúne los fundamentos intelectuales y la estructura cronológica del evento en 3 sub-secciones completas:',
      icon: Calendar,
      highlights: [
        {
          label: '1. Resumen General (Overview)',
          desc: 'Directorio central con accesos rápidos a las 12 experiencias, estado de perfil y buscador de tracks.',
          icon: Compass,
          sectionKey: 'OVERVIEW'
        },
        {
          label: '2. Manifiesto & 6 Pilares SGX',
          desc: 'Nuestra visión: Roblox, Three.js, AI, Audio Espacial, Producción Virtual y WebXR.',
          icon: Boxes,
          sectionKey: 'PILLARS_MANIFESTO'
        },
        {
          label: '3. Agenda Oficial de 3 Días',
          desc: 'Horarios de keynotes, paneles y talleres por día con opción de exportar a Google Calendar o formato .ics.',
          icon: Calendar,
          sectionKey: 'AGENDA'
        }
      ],
      primaryActionLabel: 'Ver Agenda Oficial',
      primaryAction: () => {
        onClose();
        setTimeout(() => onNavigateToSection('AGENDA'), 150);
      }
    },

    // PASO 3: CUADRANTE 2 — EN VIVO & ESCENARIOS (Subsecciones 4, 5 y 6)
    {
      stepNumber: 3,
      badge: 'PASO 3 / 8 • CUADRANTE 2: EN VIVO',
      title: 'Cuadrante 2: Transmisiones & Speakers',
      subtitle: 'Sub-Secciones 4, 5 y 6 del Menú Táctico',
      description: 'Conecta con la acción en directo a través de los canales de streaming temáticos, el radar de redes sociales y el directorio de conferencistas:',
      icon: Radio,
      highlights: [
        {
          label: '4. Salones de Transmisión (Broadcast)',
          desc: 'Salas simultáneas de streaming 4K por YouTube y servidores interactivos de Roblox en vivo.',
          icon: Radio,
          sectionKey: 'BROADCAST_ROOMS'
        },
        {
          label: '5. Live Social Stream (Radar LED)',
          desc: 'Muro social en vivo: comparte en Instagram, Threads y X con #SpatialgineersSummit para salir en la pantalla LED gigante.',
          icon: Flame,
          sectionKey: 'SOCIAL_STREAM'
        },
        {
          label: '6. Directorio de Speakers & Mentores',
          desc: 'Conoce a los pioneros en computación espacial, directores creativos y portal para registrarse como ponente.',
          icon: UserCheck,
          sectionKey: 'SPEAKERS'
        }
      ],
      primaryActionLabel: 'Abrir Live Social Stream',
      primaryAction: () => {
        onClose();
        setTimeout(() => onNavigateToSection('SOCIAL_STREAM'), 150);
      }
    },

    // PASO 4: CUADRANTE 3 — TALENTO & COMUNIDAD (Subsecciones 7, 8 y 9)
    {
      stepNumber: 4,
      badge: 'PASO 4 / 8 • CUADRANTE 3: COMUNIDAD',
      title: 'Cuadrante 3: Guild, Foros & Matchmaking',
      subtitle: 'Sub-Secciones 7, 8 y 9 del Menú Táctico',
      description: 'El núcleo social del Summit diseñado para descubrir talento emergente, debatir temas técnicos y cerrar alianzas profesionales:',
      icon: Zap,
      highlights: [
        {
          label: '7. SGX Guild Showcase',
          desc: 'Los 8 talentos y proyectos estudiantiles seleccionados compitiendo por el prestigioso SGX Guild Trophy.',
          icon: Award,
          sectionKey: 'GUILD'
        },
        {
          label: '8. Foros Públicos de Discusión',
          desc: 'Canales temáticos abiertos para debate técnico, Q&A en tiempo real con speakers y retroalimentación.',
          icon: MessageSquare,
          sectionKey: 'NETWORKING'
        },
        {
          label: '9. SGX.MATCH (Entrepreneur Match)',
          desc: 'Dating profesional para fundadores, inversionistas y programadores con cálculo algorítmico de compatibilidad.',
          icon: Zap,
          sectionKey: 'ENTREPRENEUR_MATCH'
        }
      ],
      primaryActionLabel: 'Explorar SGX.MATCH',
      primaryAction: () => {
        onClose();
        setTimeout(() => onNavigateToSection('ENTREPRENEUR_MATCH'), 150);
      }
    },

    // PASO 5: CUADRANTE 4 — VENUE & EXPERIENCIAS ESPACIALES (Subsecciones 10, 11 y 12)
    {
      stepNumber: 5,
      badge: 'PASO 5 / 8 • CUADRANTE 4: INMERSIÓN',
      title: 'Cuadrante 4: Tour 360°, Minijuegos & Sponsors',
      subtitle: 'Sub-Secciones 10, 11 y 12 del Menú Táctico',
      description: 'Explora virtualmente las instalaciones del evento, ponte a prueba con simuladores interactivos y conoce a nuestros patrocinadores:',
      icon: Navigation,
      highlights: [
        {
          label: '10. Tour Virtual 360° en Three.js',
          desc: 'Recorrido interactivo por Chroma Space Studios en San Juan: Main LED Stage, Audio Lab y VIP Lounge.',
          icon: Navigation,
          sectionKey: 'MAP_360'
        },
        {
          label: '11. Simulador de Drone & Arcade',
          desc: 'Pilota el dron táctico SGX con controles de teclado o táctiles, esquiva obstáculos y recolecta suministros.',
          icon: Gamepad2,
          sectionKey: 'EMBEDS_GAMES'
        },
        {
          label: '12. Patrocinios & Brand Showcases',
          desc: 'Stands interactivos de marcas patrocinadoras y formulario para alianzas comerciales B2B.',
          icon: Building2,
          sectionKey: 'SPONSORS_HUB'
        }
      ],
      primaryActionLabel: 'Iniciar Tour 360°',
      primaryAction: () => {
        onClose();
        setTimeout(() => onNavigateToSection('MAP_360'), 150);
      }
    },

    // PASO 6: IDENTIDAD DIGITAL & AVATAR STUDIO
    {
      stepNumber: 6,
      badge: 'PASO 6 / 8 • IDENTIDAD DIGITAL',
      title: 'Avatar Studio 3D & Credencial Holográfica',
      subtitle: 'Tu Astronauta Personalizado en la Pantalla LED',
      description: 'Genera tu identidad espacial para el evento. Personaliza tu casco, visor táctico HUD, traje de presión y colores del pilar que representas. Tu avatar se proyectará en la pantalla gigante de Chroma Studios y en tus credenciales.',
      icon: UserCheck,
      highlights: [
        {
          label: 'Personalización Visual Completa',
          desc: 'Selecciona combinaciones de cascos low-poly/pixel, viseras de telemetría y paletas reactivas.',
          icon: Sparkles
        },
        {
          label: 'Exportación en Alta Definición',
          desc: 'Descarga tu tarjeta holográfica en PNG con marco oficial para usar en redes sociales.',
          icon: ExternalLink
        },
        {
          label: 'Recompensa Instantánea',
          desc: 'Diseñar tu avatar desbloquea la misión "Avatar Spatialgineer" y te otorga +200 XP en tu pasaporte.',
          icon: Award
        }
      ],
      primaryActionLabel: 'Diseñar Mi Avatar',
      primaryAction: () => {
        onClose();
        setTimeout(() => onOpenAvatarGenerator(), 150);
      }
    },

    // PASO 7: SUMMIT PASSPORT, ESCÁNER QR & PREMIOS
    {
      stepNumber: 7,
      badge: 'PASO 7 / 8 • GAMIFICACIÓN & XP',
      title: 'Summit Passport, Escáner QR & Tienda de Premios',
      subtitle: 'Gana Puntos de Experiencia (XP) y Canjea Recompensas Reales',
      description: 'Cada acción en la plataforma suma XP a tu pasaporte. Escanea códigos QR en San Juan, completa misiones de exploración y sube de rango para canjear recompensas exclusivas:',
      icon: Award,
      highlights: [
        {
          label: 'Escáner QR & Rolodex',
          desc: 'Escanea credenciales de otros participantes en el venue para ganar +50 XP y guardar contactos en tu Rolodex (.vcf).',
          icon: ScanLine
        },
        {
          label: 'Misiones del Pasaporte',
          desc: 'Supera desafíos como probar el simulador de dron, hacer match en SGX.MATCH o publicar en el social feed.',
          icon: Compass
        },
        {
          label: 'Tienda de Premios & Canje',
          desc: 'Canjea tus puntos por licencias de software de computación espacial, merch física y pases VIP.',
          icon: Flame
        }
      ],
      primaryActionLabel: onOpenRewards ? 'Ver Tienda de Premios' : 'Abrir Mi Pasaporte',
      primaryAction: () => {
        onClose();
        if (onOpenRewards) {
          setTimeout(() => onOpenRewards(), 150);
        } else {
          setTimeout(() => onOpenPassport(), 150);
        }
      }
    },

    // PASO 8: RESUMEN TÁCTICO, PASES & ¡MISIÓN CUMPLIDA!
    {
      stepNumber: 8,
      badge: 'PASO 8 / 8 • ¡MISIÓN CUMPLIDA!',
      title: '¡Estás Listo para el Spatialgineers Summit!',
      subtitle: 'Has desbloqueado +100 XP en tu Summit Passport',
      description: 'Has completado la inducción integral por las 3 áreas maestras y las 12 sub-secciones del evento. Obtén tu boleto oficial con código QR o comienza a explorar de inmediato:',
      icon: CheckCircle2,
      highlights: [
        {
          label: 'Submenú Maestro Siempre Disponible',
          desc: 'Accede en cualquier momento a las 12 áreas haciendo clic en el botón superior de secciones.',
          icon: Layers
        },
        {
          label: 'Registro de Admisión Oficial',
          desc: 'Genera tu pase digital o taquilla en PDF con código QR para el acceso presencial y virtual.',
          icon: Ticket
        },
        {
          label: '+100 XP de Inducción Otorgados',
          desc: 'Tu progreso ha quedado guardado automáticamente en tu navegador con la insignia "Iniciado SGX".',
          icon: Award
        }
      ],
      primaryActionLabel: 'Obtener Mi Boleto / Pase',
      primaryAction: () => {
        markTourCompleted();
        onClose();
        setTimeout(() => onOpenTickets(), 150);
      }
    }
  ];

  const currentStep = steps[currentStepIndex];
  const StepIcon = currentStep.icon;

  if (!isOpen) return null;

  return (
    <div 
      id="sgx-onboarding-tour-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleSkip();
        }
      }}
    >
      <div 
        id="sgx-onboarding-tour-dialog"
        className="w-full max-w-3xl border-2 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 relative text-slate-100 max-h-[92vh]"
        style={{
          backgroundColor: b.cardBgColor || '#131313',
          borderColor: b.primaryColor,
          boxShadow: `0 0 35px ${b.glowShadow || `rgba(${primaryRgb}, 0.35)`}`,
          clipPath: 'polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)'
        }}
      >
        {/* Top Header Bar */}
        <div 
          className="border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shrink-0"
          style={{
            backgroundColor: b.backgroundColor || '#0D0D0D',
            borderBottomColor: `rgba(${primaryRgb}, 0.25)`
          }}
        >
          <div className="flex items-center gap-2 font-mono text-xs min-w-0">
            <span 
              className="px-2 py-0.5 border text-[10px] font-bold rounded shrink-0 uppercase tracking-wider"
              style={{
                borderColor: b.primaryColor,
                color: b.primaryColor,
                backgroundColor: `rgba(${primaryRgb}, 0.15)`
              }}
            >
              {currentStep.badge}
            </span>
            <span className="text-slate-500 hidden sm:inline">•</span>
            <span 
              className="text-[11px] hidden sm:inline font-bold truncate"
              style={{ color: b.neonHighlightColor || b.primaryColor }}
            >
              TEMA ACTIVO: {tenant.pillarId || tenant.name}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSkip}
              className="px-2.5 py-1 text-[11px] font-mono text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
              title="Cerrar tour y marcar como completado"
            >
              Saltar Tour
            </button>
            <button
              onClick={handleSkip}
              className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
              title="Cerrar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step Progress Track */}
        <div 
          className="px-4 sm:px-6 py-2.5 border-b flex items-center justify-between gap-3 overflow-x-auto shrink-0"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderBottomColor: `rgba(${primaryRgb}, 0.18)`
          }}
        >
          <div className="flex items-center gap-1.5 w-full">
            {steps.map((s, idx) => {
              const isCurrent = idx === currentStepIndex;
              const isPast = idx < currentStepIndex;
              return (
                <button
                  key={s.stepNumber}
                  onClick={() => handleJumpToStep(idx)}
                  className="h-2 flex-1 rounded-full transition-all cursor-pointer"
                  style={{
                    backgroundColor: isCurrent 
                      ? b.primaryColor 
                      : isPast 
                        ? `rgba(${primaryRgb}, 0.5)` 
                        : 'rgba(255, 255, 255, 0.12)',
                    boxShadow: isCurrent ? `0 0 10px ${b.primaryColor}` : 'none'
                  }}
                  title={`Ir al paso ${idx + 1}: ${s.title}`}
                />
              );
            })}
          </div>
          <span 
            className="font-mono text-[10px] shrink-0 pl-2 font-bold"
            style={{ color: b.neonHighlightColor || b.primaryColor }}
          >
            {currentStepIndex + 1} / {steps.length}
          </span>
        </div>

        {/* Main Body Content */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-5 flex-1">
          {/* Title & Icon Header */}
          <div className="flex items-start gap-4">
            <div 
              className="p-3.5 border rounded-lg shrink-0 shadow-lg"
              style={{
                borderColor: `rgba(${primaryRgb}, 0.45)`,
                backgroundColor: `rgba(${primaryRgb}, 0.12)`,
                color: b.primaryColor,
                boxShadow: `0 0 16px ${b.glowShadow || `rgba(${primaryRgb}, 0.3)`}`
              }}
            >
              <StepIcon className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="space-y-1 min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-['Orbitron',sans-serif]">
                {currentStep.title}
              </h2>
              <p 
                className="text-xs sm:text-sm font-mono font-bold"
                style={{ color: b.neonHighlightColor || b.primaryColor }}
              >
                {currentStep.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1">
                {currentStep.description}
              </p>
            </div>
          </div>

          {/* Highlights 3-Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {currentStep.highlights.map((h, i) => {
              const HIcon = h.icon || Sparkles;
              return (
                <div 
                  key={i}
                  className="p-3.5 border rounded-lg transition-all space-y-2 flex flex-col justify-between text-left"
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.45)',
                    borderColor: `rgba(${primaryRgb}, 0.22)`
                  }}
                >
                  <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                    <HIcon 
                      className="w-4 h-4 shrink-0" 
                      style={{ color: b.primaryColor }}
                    />
                    <span className="leading-snug">{h.label}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                    {h.desc}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Direct Interactive Trigger */}
          {currentStep.primaryActionLabel && (
            <div 
              className="p-3.5 border rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.08)`,
                borderColor: `rgba(${primaryRgb}, 0.35)`
              }}
            >
              <div className="text-slate-300 text-center sm:text-left">
                <span className="text-white font-bold block">¿Deseas probar o interactuar con esta sección ahora?</span>
                <span className="text-[11px] text-slate-400">Puedes abrirla directamente o continuar recorriendo el tour paso a paso.</span>
              </div>
              <button
                onClick={currentStep.primaryAction}
                className="px-4 py-2 font-extrabold text-xs rounded transition-all shadow-md flex items-center gap-1.5 shrink-0 hover:scale-105 cursor-pointer"
                style={{
                  background: b.gradientCss || `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor || '#767676'} 100%)`,
                  color: btnTextColor,
                  boxShadow: `0 0 15px ${b.glowShadow || `rgba(${primaryRgb}, 0.35)`}`
                }}
              >
                <span>{currentStep.primaryActionLabel}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Completion Celebration Callout (Step 8) */}
          {currentStep.stepNumber === 8 && (
            <div 
              className="p-4 border rounded-lg flex items-center gap-3 font-mono text-xs"
              style={{
                backgroundColor: `rgba(${primaryRgb}, 0.12)`,
                borderColor: b.primaryColor,
                boxShadow: `0 0 20px ${b.glowShadow || `rgba(${primaryRgb}, 0.3)`}`
              }}
            >
              <Award 
                className="w-8 h-8 shrink-0 animate-bounce" 
                style={{ color: b.primaryColor }}
              />
              <div className="space-y-0.5">
                <span 
                  className="font-bold block text-sm"
                  style={{ color: b.neonHighlightColor || b.primaryColor }}
                >
                  +100 XP Otorgados al Pasaporte del Summit
                </span>
                <span className="text-slate-300 text-[11px]">
                  Tu progreso de inducción ha quedado registrado con éxito. Puedes revisar tus insignias y misiones en el menú Summit Passport.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Controls */}
        <div 
          className="border-t p-4 sm:px-6 flex items-center justify-between gap-3 font-mono text-xs shrink-0"
          style={{
            backgroundColor: b.backgroundColor || '#0D0D0D',
            borderTopColor: `rgba(${primaryRgb}, 0.25)`
          }}
        >
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className={`px-3 sm:px-4 py-2 border rounded flex items-center gap-1.5 transition-all ${
              currentStepIndex === 0 
                ? 'border-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                : 'border-slate-700 text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          {/* Step Bubbles */}
          <div className="flex items-center gap-1.5 hidden sm:flex">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleJumpToStep(idx)}
                className="w-2.5 h-2.5 rounded-full transition-all cursor-pointer"
                style={{
                  backgroundColor: idx === currentStepIndex ? b.primaryColor : `rgba(${secondaryRgb}, 0.45)`,
                  boxShadow: idx === currentStepIndex ? `0 0 8px ${b.primaryColor}` : 'none',
                  transform: idx === currentStepIndex ? 'scale(1.25)' : 'scale(1)'
                }}
                title={`Paso ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStepIndex < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 sm:px-5 py-2 font-extrabold rounded flex items-center gap-1.5 transition-all shadow-md hover:scale-105 cursor-pointer"
                style={{
                  background: b.gradientCss || `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor || '#767676'} 100%)`,
                  color: btnTextColor,
                  boxShadow: `0 0 14px ${b.glowShadow || `rgba(${primaryRgb}, 0.35)`}`
                }}
              >
                <span>Siguiente Paso</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={currentStep.primaryAction || handleNext}
                className="px-4 sm:px-6 py-2 font-extrabold rounded flex items-center gap-1.5 transition-all shadow-lg hover:scale-105 cursor-pointer"
                style={{
                  background: b.gradientCss || `linear-gradient(135deg, ${b.primaryColor} 0%, ${b.secondaryColor || '#767676'} 100%)`,
                  color: btnTextColor,
                  boxShadow: `0 0 20px ${b.glowShadow || `rgba(${primaryRgb}, 0.5)`}`
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>¡Finalizar y Explorar!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
