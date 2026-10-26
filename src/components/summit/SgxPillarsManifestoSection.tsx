import { navigateToPage, navigateToSection } from '../../immersion/navigation';
import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Layers, 
  Cpu, 
  Target, 
  Award, 
  Users, 
  Gamepad2, 
  Radio, 
  Eye, 
  BookOpen, 
  Zap, 
  Compass, 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  Tv, 
  Flame, 
  ArrowRight, 
  Briefcase, 
  GraduationCap, 
  Boxes, 
  Rocket, 
  Code2, 
  Share2, 
  FileText, 
  ChevronRight,
  TrendingUp,
  MapPin,
  Calendar,
  HelpCircle,
  Instagram,
  Lock,
  Globe,
  Check,
  Play,
  Maximize2,
  Ticket,
  UserCheck,
  MessageSquare,
  Copy
} from 'lucide-react';
import { playUiChirp, playScanSuccessSound } from '../../lib/cyberAudioEngine';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { SummitRetrospectiveGallery } from './SummitRetrospectiveGallery';
import { OFFICIAL_BRAND_ASSETS } from '../../lib/summitData';
import { copyUnifiedLinkToClipboard, syncAppUrl } from '../../lib/summitUrlSync';
import { SummitSectionKey } from './SummitSectionsDropdown';

export type PillarId = 'SPARK' | 'STAGE' | 'SHOWCASE' | 'STORY' | 'SYSTEM' | 'SYNTHESIZE';

interface SgxPillarsManifestoSectionProps {
  onNavigateToSection?: (sectionKey: SummitSectionKey) => void;
  onExploreAgenda?: () => void;
  onExploreGuild?: () => void;
  onExploreSponsors?: () => void;
  onOpenTickets?: () => void;
  onOpenDroneSimulator?: () => void;
  onOpen360Tour?: () => void;
  onOpenMatchModule?: () => void;
  onOpenSpeakerPortal?: () => void;
  onOpenAvatarGenerator?: () => void;
  onOpenPassportModal?: () => void;
  onOpenBroadcastRooms?: () => void;
  onOpenSponsorInquiry?: () => void;
  onOpenNetworkingChat?: () => void;
}

export const SgxPillarsManifestoSection: React.FC<SgxPillarsManifestoSectionProps> = ({
  onNavigateToSection,
  onExploreAgenda,
  onExploreGuild,
  onExploreSponsors,
  onOpenTickets,
  onOpenDroneSimulator,
  onOpen360Tour,
  onOpenMatchModule,
  onOpenSpeakerPortal,
  onOpenAvatarGenerator,
  onOpenPassportModal,
  onOpenBroadcastRooms,
  onOpenSponsorInquiry,
  onOpenNetworkingChat,
}) => {
  const { tenant } = useTenantTheme();
  
  // Hydrate active pillar from URL parameter (?pillar=spark etc.)
  const [activePillarTab, setActivePillarTab] = useState<PillarId>(() => {
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      const rawPillar = (search.get('pillar') || search.get('theme') || '').toUpperCase();
      if (['SPARK', 'STAGE', 'SHOWCASE', 'STORY', 'SYSTEM', 'SYNTHESIZE'].includes(rawPillar)) {
        return rawPillar as PillarId;
      }
    }
    return 'SPARK';
  });

  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [copiedPillarLink, setCopiedPillarLink] = useState(false);

  // Sync pillar change with URL
  const handleSelectPillarTab = (pillarId: PillarId) => {
    playUiChirp(820);
    setActivePillarTab(pillarId);
    syncAppUrl({
      section: 'PILLARS_MANIFESTO',
      theme: pillarId.toLowerCase(),
      replace: false,
    });
  };

  const handleCopyPillarShare = async () => {
    playScanSuccessSound();
    const success = await copyUnifiedLinkToClipboard({
      section: 'PILLARS_MANIFESTO',
      theme: activePillarTab.toLowerCase(),
    });
    if (success) {
      setCopiedPillarLink(true);
      setTimeout(() => setCopiedPillarLink(false), 2500);
    }
  };

  // Exact descriptions directly from the official Spatialgineers Summit presentation slides & CDN Icons (official pillar order: Story, Showcase, Spark, Stage, System, Synthesize)
  const pillarsData = [
    {
      id: 'STORY' as PillarId,
      name: 'SGX.STORY',
      title: 'Cine Digital, Arte, Música & Proyección Cultural',
      shortDesc: 'Este pilar transforma narrativas en experiencias. Story reúne cine digital, arte, música, escritura, NFTs y efectos visuales para crear contenido que inspira, educa y proyecta cultura a través de la tecnología.',
      icon: BookOpen,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.STORY'],
      accentColor: '#FDCC0D',
      bgGradients: 'from-[#FDCC0D]/30 via-[#2A1700] to-transparent',
      tagline: 'Cine Digital, Arte, Música, NFTs & Efectos Visuales',
      industryScope: 'Cineastas, estudios de cine, creadores independientes, instituciones culturales, museos, historiadores, coleccionistas y casas de moda.',
      features: [
        {
          title: 'Avatar Studio',
          desc: 'Crea tu identidad de piloto en pixel art o low-poly; queda impresa en tu SGX Pass.',
          actionLabel: 'Abrir Avatar Studio',
          icon: UserCheck,
          onClick: onOpenAvatarGenerator,
          badge: 'IDENTIDAD'
        },
        {
          title: 'Radar social',
          desc: 'Las historias de la comunidad en vivo con #SpatialgineersSummit.',
          actionLabel: 'Ver radar social',
          icon: Sparkles,
          onClick: () => navigateToSection('SOCIAL_STREAM'),
          badge: 'COMUNIDAD'
        },
        {
          title: 'Sesiones de Narrativa & Cine XR',
          desc: 'Bloque SGX.Story del Día 1 y conversación de industria del Día 2.',
          actionLabel: 'Explorar Agenda de Cine XR',
          icon: Calendar,
          onClick: onExploreAgenda,
          badge: 'PANEL CULTURAL'
        }
      ],
      realDeployments: [
        {
          name: 'Metaverse Fashion Week 2025',
          metric: 'Panel "Infinite Identities"',
          desc: 'The Highgineer en el panel "Infinite Identities" sobre cultura e identidad digital.',
        },
        {
          name: 'Unidos Jam 2024 (Latinx in Gaming)',
          metric: 'Plataformero educativo Taíno',
          desc: 'Videojuego interactivo donde los jugadores superan obstáculos y responden preguntas históricas para rescatar archivos culturales de Borikén.',
        },
        {
          name: 'Espacio Inmersivo de Terapia de la Risa',
          metric: 'Bienestar y salud mental',
          desc: 'Entorno diseñado con psicología de color y arquitectura sensorial para sesiones terapéuticas en línea.',
        }
      ],
      summitActivation: 'Presentación de colecciones culturales en 3D, paneles dedicados a la identidad boricua en la computación espacial y archivo digital permanente.'
    },
    {
      id: 'SHOWCASE' as PillarId,
      name: 'SGX.SHOWCASE',
      title: 'Presentación Visual, Renders 3D & Entornos XR',
      shortDesc: 'Este pilar da forma a cómo las ideas se presentan al mundo. Showcase desarrolla renders, animaciones 3D, vídeos, galerías y entornos XR que transforman productos, marcas y conceptos en experiencias visuales memorables.',
      icon: Eye,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SHOWCASE'],
      accentColor: '#00DDFF',
      bgGradients: 'from-[#00DDFF]/25 via-[#002B36] to-transparent',
      tagline: 'Renders, Animaciones 3D, Galerías & Entornos XR',
      industryScope: 'Marcas físicas y digitales, tiendas, diseñadores de moda, diseñadores de producto, arquitectos, brokers inmobiliarios y galerías de arte.',
      features: [
        {
          title: 'Recorrido 360° Chroma Space Studios',
          desc: 'Exploración 360° de Chroma Space Studios, el venue del Día 3, con hotspots tácticos.',
          actionLabel: 'Abrir recorrido 360°',
          icon: Compass,
          onClick: onOpen360Tour,
          badge: 'VENUE 360°'
        },
        {
          title: 'Directorio de Patrocinadores & Marcas',
          desc: 'Stands interactivos, beneficios exclusivos y activaciones comerciales.',
          actionLabel: 'Ver Marcas Aliadas',
          icon: Briefcase,
          onClick: onExploreSponsors,
          badge: 'SPONSORS'
        },
        {
          title: 'Matriz de Patrocinio & Dossier',
          desc: '5 Tiers de auspicio con formulario de consulta para marcas.',
          actionLabel: 'Formulario de Alianzas',
          icon: FileText,
          onClick: onOpenSponsorInquiry,
          badge: 'DOSSIER B2B'
        }
      ],
      realDeployments: [
        {
          name: 'Dreamscape para Centro Comercial',
          metric: 'Activación surreal para retail',
          desc: 'En lugar de un gemelo estéril, se sintetizó la marca en un dreamscape interactivo con avatares personalizados para maximizar retención y lealtad del cliente.',
        },
        {
          name: 'Infinite Galleries (Digital Museum Platform)',
          metric: 'Galería WebGL 360° para visores XR y móvil',
          desc: 'Plataforma multi-sala para exhibir obras de arte 3D inmersivas sin necesidad de instalar apps, navegable en cualquier explorador.',
        },
        {
          name: 'Experiencia XR para Festival de Cine',
          metric: 'Cine & archivo cultural inmersivo',
          desc: 'Activación espacial que extendió la vida del festival más allá de las fechas físicas mediante salas de proyección interactivas.',
        }
      ],
      summitActivation: 'Tour virtual 360° por el venue del Día 3 (Chroma Space Studios, San Juan), showrooms de patrocinadores y vitrinas holográficas interactivas.'
    },
    {
      id: 'SPARK' as PillarId,
      name: 'SGX.SPARK',
      title: 'Interacción, Exploración Creativa & Dinámicas Inmersivas',
      shortDesc: 'Este pilar impulsa la interacción y la exploración creativa. Spark abarca videojuegos, dinámicas inmersivas, simulaciones, activaciones participativas y herramientas de juego educativo que fomentan la conexión entre personas y tecnología.',
      icon: Gamepad2,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SPARK'],
      accentColor: '#FFBB00',
      bgGradients: 'from-[#FFBB00]/25 via-[#2A1002] to-transparent',
      tagline: 'Videojuegos, Simulaciones & Juegos Educativos',
      industryScope: 'Estudios de videojuegos, educadores, ligas deportivas, comunidades competitivas, herramientas de capacitación y simulaciones interactivas.',
      features: [
        {
          title: 'Simulador de Dron 3D',
          desc: 'Entorno de vuelo táctico WebGL con físicas de gravedad cero y colisiones.',
          actionLabel: 'Lanzar Simulador de Dron',
          icon: Rocket,
          onClick: onOpenDroneSimulator,
          badge: 'SIMULADOR EN VIVO'
        },
        {
          title: 'Votación en vivo estilo Kahoot',
          desc: 'Vota durante los bloques del Summit desde tu teléfono (+25 XP por voto).',
          actionLabel: 'Abrir consola /play',
          icon: Zap,
          onClick: () => navigateToPage('play'),
          badge: 'INTERACCIÓN EN VIVO'
        },
        {
          title: 'Reactor & tienda de premios',
          desc: 'Misiones por pilar y premios mayormente digitales, con el mismo XP.',
          actionLabel: 'Abrir Reactor de misiones',
          icon: TrophyIcon,
          onClick: onOpenPassportModal,
          badge: 'GAMIFICACIÓN'
        }
      ],
      realDeployments: [
        {
          name: 'Laberinto Educativo de Geometría Molecular',
          metric: 'Gamificación educativa',
          desc: 'Gamificación educativa que permite a los usuarios navegar estructuras químicas y terpenos con físicas de gravedad cero, reforzado con banda sonora original.',
        },
        {
          name: 'Juego de Navegación Espacial con Economía Web3',
          metric: 'NFTs & navegación espacial',
          desc: 'Los jugadores pilotean tablas espaciales esquivando asteroides para recolectar tokens con físicas dinámicas de colisión en tiempo real.',
        },
        {
          name: 'Laberinto Multijugador Procedural',
          metric: 'Multijugador en Unity Engine',
          desc: 'Laberinto concéntrico procedural donde los jugadores compiten por objetivos estratégicos en tiempo real con economías in-game.',
        }
      ],
      summitActivation: 'Simulador de dron táctico en la plataforma, votación tipo Kahoot con recompensas de XP y bloque SGX.Spark del Día 1.'
    },
    {
      id: 'STAGE' as PillarId,
      name: 'SGX.STAGE',
      title: 'Expresión en Vivo, Shows Inmersivos & Transmisiones Híbridas',
      shortDesc: 'Este pilar celebra la expresión en vivo y la energía del presente. Stage incluye conciertos, podcasts, visualizers, performances, transmisiones híbridas y shows inmersivos que convierten la creatividad en espectáculo.',
      icon: Radio,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.STAGE'],
      accentColor: '#FFFFFF',
      bgGradients: 'from-[#32527B]/30 via-[#1e1e1e] to-transparent',
      tagline: 'Conciertos, Visualizers, Podcasts & Shows Inmersivos',
      industryScope: 'Productores de eventos, DJs, artistas musicales, productoras audiovisuales, podcasters, influencers, conferencias y organizadores de ferias.',
      features: [
        {
          title: 'Salas de Broadcast & Canales',
          desc: 'YouTube Live como canal principal, con LinkedIn Live y Facebook Live.',
          actionLabel: 'Abrir Salas Broadcast',
          icon: Tv,
          onClick: onOpenBroadcastRooms,
          badge: 'STREAMING EN VIVO'
        },
        {
          title: 'Artistas Invitados & Roblox',
          desc: 'Intermedios de artistas invitados (por anunciar) en la transmisión y en Roblox, si se usa.',
          actionLabel: 'Ver Cronograma de Shows',
          icon: Radio,
          onClick: onExploreAgenda,
          badge: 'LIVE STAGE'
        },
        {
          title: 'Directorio de Artistas & Keynotes',
          desc: 'Artistas y speakers: solo se anuncian los confirmados por escrito.',
          actionLabel: 'Portal de Artistas',
          icon: Users,
          onClick: onOpenSpeakerPortal,
          badge: 'SPEAKERS'
        }
      ],
      realDeployments: [
        {
          name: 'Laboratorio de Escenario Virtual',
          metric: 'Rascacielos virtual interactivo con DJ booth',
          desc: 'Espacio arquitectónico inmersivo con cabina de DJ funcional, mecánicas de baile en tiempo real y exhibición de arte phygital.',
        },
        {
          name: 'Visualizadores de Escenario SGX',
          metric: 'Visuales reactivos a la música',
          desc: 'Visualizadores que reaccionan al audio en tiempo real para transmisiones, performances y eventos híbridos.',
        },
        {
          name: 'Espacios Sonoros Inmersivos para Artistas',
          metric: 'Ambientes acústicos virtuales',
          desc: 'Ambientes acústicos en el desierto con fogatas interactivas para conciertos acústicos íntimos transmitidos globalmente.',
        }
      ],
      summitActivation: 'Transmisión de los 3 días por YouTube Live, intermedios de artistas invitados el Día 1 y showcase con avatar y captura facial en tiempo real el Día 3.'
    },
    {
      id: 'SYSTEM' as PillarId,
      name: 'SGX.SYSTEM',
      title: 'Herramientas Digitales, Integraciones AI, WebApps & Robótica',
      shortDesc: 'Este pilar se enfoca en crear herramientas digitales que hacen la innovación accesible. System desarrolla webapps interactivas, integraciones con AI, manufactura y robótica para apoyar proyectos creativos.',
      icon: Cpu,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SYSTEM'],
      accentColor: '#32527B',
      bgGradients: 'from-[#32527B]/30 via-[#202020] to-transparent',
      tagline: 'WebApps Interactivas, AI, Robótica & Manufactura',
      industryScope: 'Departamentos técnicos, instituciones tecnológicas, empresas de manufactura, logística, startups y makers.',
      features: [
        {
          title: 'SGX Pass & Holo Card',
          desc: 'Registro, Holo Card, credencial y QR en un solo pase.',
          actionLabel: 'Abrir mi SGX Pass',
          icon: Ticket,
          onClick: onOpenTickets,
          badge: 'IDENTIDAD'
        },
        {
          title: 'Radar de visitas',
          desc: 'Desde dónde nos visitan, en vivo: mapa, contadores y leaderboards.',
          actionLabel: 'Ver el radar',
          icon: Code2,
          onClick: () => navigateToSection('VISITS'),
          badge: 'TELEMETRÍA'
        },
        {
          title: 'Escáner de pases & Rolodex',
          desc: 'Escanea un SGX Pass: quedan en los dos Rolodex.',
          actionLabel: 'Abrir escáner',
          icon: UserCheck,
          onClick: () => window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner')),
          badge: 'NETWORKING'
        }
      ],
      realDeployments: [
        {
          name: 'Graffiti AR (MediaPipe Hand-Tracking + WebGL)',
          metric: 'Visión computacional sin hardware externo',
          desc: 'Convierte la cámara web o móvil en un sensor espacial permitiendo pintar grafitis 3D en el aire mediante reconocimiento de gestos de manos.',
        },
        {
          name: 'Grimoire HR & Recruitment App',
          metric: 'Web App gamificada de reclutamiento',
          desc: 'Web App gamificada para una feria universitaria de tecnología, que capta y clasifica solicitudes en tiempo real.',
        },
        {
          name: 'Infraestructura de Alta Concurrencia',
          metric: 'Pruebas de estrés de servidores SGX',
          desc: 'Sistema interactivo de alto estrés para validar la gestión y la estabilidad técnica de los servidores SGX.',
        }
      ],
      summitActivation: 'Demostración en vivo en el escenario el Día 3 del rig de captura facial de avatares en tiempo real operado por Danelson y rediseño de UI reactiva.'
    },
    {
      id: 'SYNTHESIZE' as PillarId,
      name: 'SGX.SYNTHESIZE',
      title: 'Integración Holística, Soluciones a la Medida & Alto Impacto',
      shortDesc: 'Este pilar materializa proyectos que integran múltiples áreas del ecosistema SGX. Synthesize une creatividad, ingeniería, arte y estrategia para desarrollar soluciones a la medida y experiencias de alto impacto.',
      icon: Boxes,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SYNTHESIZE'],
      accentColor: '#FDCC0D',
      bgGradients: 'from-[#FDCC0D]/25 via-[#32527B]/30 to-transparent',
      tagline: 'Creatividad, Ingeniería, Arte & Estrategia Integrada',
      industryScope: 'Empresas privadas, municipios, instituciones educativas, desarrolladores de proyectos y mega-ecosistemas B2B.',
      features: [
        {
          title: 'SGX.Match — Speed Pitching',
          desc: 'Conecta con creadores y marcas de todos los pilares.',
          actionLabel: 'Lanzar SGX.Match',
          icon: Flame,
          onClick: onOpenMatchModule,
          badge: 'SGX.MATCH'
        },
        {
          title: 'Foros de Networking & Red de Asistentes',
          desc: 'Espacio de conexión para coordinar alianzas y co-creación de proyectos.',
          actionLabel: 'Abrir Foros de Networking',
          icon: MessageSquare,
          onClick: onOpenNetworkingChat,
          badge: 'NETWORKING'
        },
        {
          title: 'SGX Guild Initiates',
          desc: 'Los 8 Initiates activos; los 6 mejores presentan en la Ranked Trials Pitch Session del Día 3.',
          actionLabel: 'Ver SGX Guild Initiates',
          icon: GraduationCap,
          onClick: onExploreGuild,
          badge: 'SGX GUILD'
        }
      ],
      realDeployments: [
        {
          name: 'FITUR — Gemelo Digital Inmersivo en VR',
          metric: '700+ personas (estimado de Spatialgineers; 570 waivers registrados)',
          desc: 'Gemelo digital inmersivo en VR presentado en FITUR, la feria internacional de turismo de Madrid.',
        },
        {
          name: 'Justas LAI (Ecosistema WebXR)',
          metric: 'Ecosistema móvil WebXR para evento deportivo universitario',
          desc: 'Ecosistema móvil WebXR desplegado durante un evento deportivo universitario en Puerto Rico.',
        },
        {
          name: 'Spatialgineers Summit Platform (Este Ecosistema Vivo)',
          metric: 'Arquitectura 100% propia y autónoma',
          desc: 'Plataforma web nativa que integra base de datos en tiempo real (Firestore), simulador de vuelo, streaming multicanal y gamificación con votación en vivo.',
        }
      ],
      summitActivation: 'El Summit 2026 en su totalidad representa la síntesis máxima: un evento de 3 días que une a líderes empresariales, reclutas e Initiates del SGX Guild y creadores.'
    }
  ];

  const currentPillar = pillarsData.find((p) => p.id === activePillarTab) || pillarsData[0];

  const targetNiches = [
    'Estudios de Videojuegos', 'Marcas Físicas & Digitales', 'Educadores & Escuelas', 'Creadores Independientes',
    'Ligas Deportivas & Atletas', 'Comunidades Competitivas', 'Productores de Eventos', 'Organizadores de Ferias',
    'Agencias de Marketing', 'DJs & Artistas Musicales', 'Productoras Audiovisuales', 'Podcasters & Influencers',
    'Medios Digitales & Conferencias', 'Instituciones Culturales & Museos', 'Tiendas & Ecommerce', 'Diseñadores de Moda',
    'Diseñadores de Producto', 'Arquitectos & Brokers Inmobiliarios', 'Desarrolladores de Proyectos', 'Empresas de Robótica & AI'
  ];

  return (
    <div id="summit-section-pillars" className="space-y-8 text-white">
      {/* 1. MANIFIESTO Y VISIÓN GENERAL */}
      <div 
        className="p-6 sm:p-8 bg-[var(--sgx-card-bg)] border border-[var(--sgx-secondary)] relative overflow-hidden shadow-2xl space-y-6"
        style={{
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          borderLeft: `4px solid ${tenant.branding.primaryColor || 'var(--sgx-primary)'}`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-[var(--sgx-primary)]/15 border border-[var(--sgx-primary)] text-[var(--sgx-neon)] uppercase tracking-wider">
                FRAMEWORK OFICIAL SGX • 6 PILARES
              </span>
              <span className="text-xs text-slate-400 font-mono">
                DESARROLLADO EN PUERTO RICO PARA EL MUNDO
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-tight">
              ¿QUÉ ES EL FRAMEWORK SGX?
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              SGX es una <strong>metodología operativa y técnica</strong> creada por Spatialgineers para diseñar, desarrollar y desplegar experiencias inmersivas interconectadas. Integra computación espacial, inteligencia artificial, transmisiones en vivo y economías interactivas en una sola arquitectura accesible.
            </p>
          </div>

          {/* Quick Share Pillar Link Button */}
          <button
            onClick={handleCopyPillarShare}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)] text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 shrink-0 transition-all cursor-pointer shadow-md self-start"
          >
            {copiedPillarLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">¡Enlace Copiado!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span>Compartir Hub</span>
              </>
            )}
          </button>
        </div>

        {/* Pillar Selector Tabs */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--sgx-neon)' }}>
              SELECCIONA UN PILAR PARA ABRIR SU HUB OPERATIVO:
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              6 VECTORES ACTIVOS
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {pillarsData.map((p, idx) => {
              const isSelected = activePillarTab === p.id;
              const IconComp = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPillarTab(p.id)}
                  className={`p-3 text-left transition-all flex flex-col justify-between space-y-2 border cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#272727] to-[#121212] shadow-lg scale-[1.02]'
                      : 'bg-[#141414] border-slate-800 hover:border-slate-600'
                  }`}
                  style={{ 
                    clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    borderColor: isSelected ? p.accentColor : undefined,
                    boxShadow: isSelected ? `0 0 16px ${p.accentColor}40` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    {p.iconUrl ? (
                      <img src={p.iconUrl} alt={p.name} className="w-6 h-6 object-contain" />
                    ) : (
                      <IconComp className="w-5 h-5" style={{ color: isSelected ? p.accentColor : '#94A3B8' }} />
                    )}
                    <span className="text-[9px] font-mono font-bold uppercase" style={{ color: isSelected ? p.accentColor : '#767676' }}>
                      PILAR 0{idx + 1}
                    </span>
                  </div>
                  <div>
                    <div className={`font-mono font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                      {p.name}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. DEDICATED ACTIVE PILLAR HUB & INTERACTIVE FEATURES SUITE */}
      <div 
        className="p-6 sm:p-8 bg-[#0F0F0F] border-2 relative overflow-hidden space-y-8 shadow-2xl"
        style={{ 
          clipPath: 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)',
          borderColor: currentPillar.accentColor,
          boxShadow: `0 0 30px ${currentPillar.accentColor}25`,
        }}
      >
        {/* Pillar Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 border-b border-slate-800 pb-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold" style={{ color: currentPillar.accentColor }}>
              {currentPillar.iconUrl ? (
                <img src={currentPillar.iconUrl} alt={currentPillar.name} className="w-5 h-5 object-contain" />
              ) : (
                <currentPillar.icon className="w-4 h-4" style={{ color: currentPillar.accentColor }} />
              )}
              <span>{currentPillar.tagline}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron',sans-serif]">
              {currentPillar.name} — {currentPillar.title}
            </h2>
            <p className="text-sm text-slate-200 max-w-3xl leading-relaxed font-sans font-medium">
              {currentPillar.shortDesc}
            </p>
          </div>

          <div className="bg-[#1e1e1e] p-4 border border-slate-700 text-xs font-mono space-y-1.5 lg:w-80 shrink-0">
            <div className="text-[10px] uppercase font-bold" style={{ color: currentPillar.accentColor }}>
              NICHOS & ALCANCE OPERATIVO:
            </div>
            <div className="text-slate-200 leading-relaxed font-sans text-xs">
              {currentPillar.industryScope}
            </div>
          </div>
        </div>

        {/* 2.1 PILLAR INTERACTIVE FEATURES & TOOLKIT SUITE */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: currentPillar.accentColor }}>
              <Zap className="w-4 h-4" style={{ color: currentPillar.accentColor }} />
              <span>HERRAMIENTAS & ACTIVACIONES INTERACTIVAS DEL PILAR ({currentPillar.features.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              CLIC DIRECTO PARA ABRIR EL MÓDULO O MODAL
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {currentPillar.features.map((feat, fIdx) => {
              const FeatIcon = feat.icon;
              return (
                <div 
                  key={fIdx}
                  onClick={feat.onClick}
                  className={`p-4 bg-[#191919] border border-slate-700 hover:border-white transition-all flex flex-col justify-between space-y-3 group shadow-lg ${
                    feat.onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
                  }`}
                  style={{ 
                    clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)',
                  }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div 
                        className="w-8 h-8 flex items-center justify-center border"
                        style={{
                          clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
                          backgroundColor: `${currentPillar.accentColor}20`,
                          borderColor: `${currentPillar.accentColor}60`,
                          color: currentPillar.accentColor
                        }}
                      >
                        <FeatIcon className="w-4 h-4" />
                      </div>
                      <span 
                        className="text-[9px] font-mono font-bold px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-300 uppercase"
                        style={{ clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)' }}
                      >
                        {feat.badge}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-white font-['Orbitron',sans-serif] group-hover:text-cyan-300 transition-colors">
                      {feat.title}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-sans">
                      {feat.desc}
                    </p>
                  </div>

                  {feat.onClick && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        feat.onClick?.();
                      }}
                      className="w-full py-2 px-3 text-xs font-mono font-black uppercase transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                      style={{
                        clipPath: 'polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px)',
                        backgroundColor: currentPillar.accentColor,
                        color: currentPillar.accentColor === '#32527B' ? '#FFFFFF' : '#000000',
                      }}
                    >
                      <span>{feat.actionLabel}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* 2.2 REAL WORLD DEPLOYMENTS & CASE STUDIES */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: currentPillar.accentColor }}>
            <Award className="w-3.5 h-3.5" style={{ color: currentPillar.accentColor }} />
            <span>PROYECTOS & CASOS REALES DESPLEGADOS</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentPillar.realDeployments.map((dep, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-[#171717] border border-slate-800 space-y-1.5"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="font-bold text-white text-xs font-['Orbitron',sans-serif]">{dep.name}</div>
                <div className="text-[10px] font-mono font-semibold" style={{ color: currentPillar.accentColor }}>
                  {dep.metric}
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{dep.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2.3 SUMMIT LIVE ACTIVATION */}
        <div 
          className="p-4 bg-gradient-to-r from-[#1f1f1f] to-[#181818] border border-[#32527B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono"
          style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
        >
          <div className="space-y-0.5">
            <span className="font-bold uppercase flex items-center gap-1.5" style={{ color: currentPillar.accentColor }}>
              <Tv className="w-3.5 h-3.5" style={{ color: currentPillar.accentColor }} />
              <span>CÓMO SE EXPERIMENTA ESTE PILAR EN EL SUMMIT 2026:</span>
            </span>
            <p className="text-slate-300 font-sans text-xs">{currentPillar.summitActivation}</p>
          </div>

          {onExploreAgenda && (
            <button
              onClick={onExploreAgenda}
              className="px-3.5 py-1.5 bg-[#FDCC0D] hover:bg-[#B87000] text-black font-bold text-xs uppercase font-mono flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <span>VER SESIONES</span>
              <ChevronRight className="w-3 h-3 text-black" />
            </button>
          )}
        </div>
      </div>

      {/* 3. UN EVENTO PARA... (NICHOS DEL SGX FRAMEWORK) */}
      <div 
        className="bg-[#0F0F0F] border-2 border-[#32527B] p-6 sm:p-8 space-y-4 shadow-2xl"
        style={{
          clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)',
          boxShadow: '0 0 25px rgba(50, 82, 123, 0.3)'
        }}
      >
        <div className="space-y-1">
          <div className="text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5" style={{ color: 'var(--sgx-neon)' }}>
            <Briefcase className="w-3.5 h-3.5" style={{ color: 'var(--sgx-neon)' }} />
            <span>SGX FRAMEWORK • AUDIENCIA & NICHOS DE IMPACTO</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif]">
            UN EVENTO PARA CADA INDUSTRIA Y SECTOR
          </h2>
          <p className="text-xs text-slate-300 font-sans">
            El Framework SGX está diseñado para ser agnóstico de industria. Conecta a cualquier tipo de organización con experiencias inmersivas e infraestructura 3D.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {targetNiches.map((niche, i) => (
            <span 
              key={i} 
              className="px-3 py-1.5 bg-[#1a1a1a] border border-slate-700 hover:border-[#FDCC0D] text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
              style={{
                clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)',
              }}
            >
              <Check className="w-3 h-3 text-[var(--sgx-neon)]" />
              <span>{niche}</span>
            </span>
          ))}
        </div>
      </div>

      {/* 4. THE 3-DAY SUMMIT FORMULA & SGX RANKED TRIALS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Day 1 */}
        <div 
          className="p-5 bg-[#121212] border border-slate-800 space-y-4"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-red-950/60 border border-red-500/50 text-red-400 font-mono font-bold text-xs uppercase">
              DÍA 1 • DIGITAL (YOUTUBE LIVE)
            </span>
            <span className="text-xs font-mono text-slate-400">VIE 11 DIC</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            PILLAR PRESENTATIONS & SGX RANKED TRIALS
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>Seis bloques de 25 min en orden oficial: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System y SGX.Synthesize, con un artista invitado (por anunciar) antes de cada uno.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>Portafolios de los Initiates (2:30–4:00 p.m.):</strong> los 8 Initiates activos presentan su portafolio, 8 minutos cada uno.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>Cierre (4:00–4:30 p.m.):</strong> se anuncian los 6 Initiates que presentan el Día 3.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>Horario:</strong> 10:00 a.m. a 4:30 p.m. por YouTube Live, con Roblox activo si se usa.</span>
            </li>
          </ul>
        </div>

        {/* Day 2 */}
        <div 
          className="p-5 bg-[#121212] border border-slate-800 space-y-4"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-amber-950/60 border border-amber-500/50 text-amber-400 font-mono font-bold text-xs uppercase">
              DÍA 2 • DIGITAL (YOUTUBE LIVE)
            </span>
            <span className="text-xs font-mono text-slate-400">SÁB 12 DIC</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            INDUSTRY DAY
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>Seis conversaciones de industria de 45 minutos, una por pilar, con una persona invitada (por anunciar).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>Pausas de 10 minutos</strong> entre conversaciones.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>Horario:</strong> 10:00 a.m. a 4:00 p.m., 100% digital.</span>
            </li>
          </ul>
        </div>

        {/* Day 3 */}
        <div 
          className="p-5 bg-[#121212] border border-slate-800 space-y-4"
          style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
        >
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500/50 text-emerald-400 font-mono font-bold text-xs uppercase">
              DÍA 3 • SGX SHOWCASE (HÍBRIDO)
            </span>
            <span className="text-xs font-mono text-slate-400">DOM 13 DIC</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            SGX SHOWCASE
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>SGX Guild Ranked Trials Pitch Session:</strong> los top 6 Initiates presentan 5 minutos cada uno.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>Demos en vivo, avatar con captura facial en tiempo real y networking con votación gamificada y canje de premios.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>10:00 a.m. a 4:00 p.m. en Chroma Space Studios, San Juan, por invitación y cupo limitado (40 a 60 personas), y por YouTube Live.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* 5. TRAVESÍA RÁPIDA & HUB DE MÓDULOS DEL SUMMIT */}
      <div 
        className="p-6 sm:p-8 bg-gradient-to-r from-[#0F0F0F] via-[#191919] to-[#0F0F0F] border-2 border-[var(--sgx-primary)] space-y-6 shadow-2xl"
        style={{ clipPath: 'polygon(16px 0, 100% 0, 100% calc(100% - 16px), calc(100% - 16px) 100%, 0 100%, 0 16px)' }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-[var(--sgx-neon)]">
              <Compass className="w-4 h-4 text-[var(--sgx-neon)]" />
              <span>ECOSISTEMA SPATIALGINEERS SUMMIT 2026</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Orbitron',sans-serif] uppercase mt-1">
              CONTINÚA TU RECORRIDO POR EL SUMMIT
            </h3>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              Accede directamente a cualquier área del evento sin perder tu progreso.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono">
          {[
            {
              title: 'Agenda 3 Días',
              desc: 'Cronograma interactivo minuto a minuto',
              icon: Calendar,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onExploreAgenda,
            },
            {
              title: 'Directorio Speakers',
              desc: 'Directorio 3D de expertos y artistas',
              icon: Users,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onOpenSpeakerPortal,
            },
            {
              title: 'SGX.Match',
              desc: 'Conecta creadores y marcas',
              icon: Flame,
              color: '#00DDFF',
              badge: 'SGX.SHOWCASE',
              action: onOpenMatchModule,
            },
            {
              title: 'Recorrido 360° Chroma',
              desc: 'Exploración virtual de Chroma Space Studios',
              icon: Compass,
              color: '#FFBB00',
              badge: 'SGX.SHOWCASE',
              action: onOpen360Tour,
            },
            {
              title: 'Salas Broadcast',
              desc: 'Canales temáticos y streaming multicámara',
              icon: Radio,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onOpenBroadcastRooms,
            },
            {
              title: 'SGX Guild Initiates',
              desc: 'Los 8 Initiates activos',
              icon: Award,
              color: '#32527B',
              badge: 'SGX.SYSTEM',
              action: onExploreGuild,
            },
            {
              title: 'Simulador Dron',
              desc: 'Vuelo acrobático 3D y retos con XP',
              icon: Rocket,
              color: '#00DDFF',
              badge: 'SGX.SPARK',
              action: onOpenDroneSimulator,
            },
            {
              title: 'Patrocinadores',
              desc: 'Stands interactivos y ofertas de sponsors',
              icon: Briefcase,
              color: '#FFBB00',
              badge: 'SGX.SHOWCASE',
              action: onExploreSponsors,
            },
            {
              title: 'Foros de Networking',
              desc: 'Comunidad y salas de chat temáticas',
              icon: MessageSquare,
              color: '#00DDFF',
              badge: 'SGX.SYNTHESIZE',
              action: onOpenNetworkingChat,
            },
            {
              title: 'Avatar Studio 3D',
              desc: 'Genera tu avatar y credencial',
              icon: UserCheck,
              color: '#FDCC0D',
              badge: 'SGX.STORY',
              action: onOpenAvatarGenerator,
            },
            {
              title: 'SGX Pass',
              desc: 'Acreditación oficial para los 3 días',
              icon: Ticket,
              color: '#00DDFF',
              badge: 'SGX.SYNTHESIZE',
              action: onOpenTickets,
            },
            {
              title: 'Misiones & XP',
              desc: 'Pase con misiones, sellos y QR',
              icon: Sparkles,
              color: '#FDCC0D',
              badge: 'SGX.STORY',
              action: onOpenPassportModal,
            },
          ].map((item, idx) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  playUiChirp(680);
                  item.action?.();
                }}
                className="p-3 bg-black/60 border border-slate-800 hover:border-white text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-2 group cursor-pointer"
                style={{
                  clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div 
                    className="p-1.5 flex items-center justify-center border"
                    style={{ 
                      clipPath: 'polygon(3px 0, 100% 0, 100% calc(100% - 3px), calc(100% - 3px) 100%, 0 100%, 0 3px)',
                      borderColor: `${item.color}40`, 
                      backgroundColor: `${item.color}15`, 
                      color: item.color 
                    }}
                  >
                    <ItemIcon className="w-4 h-4" />
                  </div>
                  <span 
                    className="text-[8px] font-mono font-bold px-1.5 py-0.5 border border-slate-700 bg-slate-900 text-slate-300 uppercase"
                    style={{
                      clipPath: 'polygon(2px 0, 100% 0, 100% calc(100% - 2px), calc(100% - 2px) 100%, 0 100%, 0 2px)',
                    }}
                  >
                    {item.badge}
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white font-['Orbitron',sans-serif] group-hover:text-[var(--sgx-neon)] transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5 line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="text-[9px] font-bold text-slate-400 group-hover:text-white pt-1 border-t border-slate-900 flex items-center justify-between">
                  <span>Acceder</span>
                  <ChevronRight className="w-3 h-3 text-[var(--sgx-neon)]" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Simple Trophy Icon helper
function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.45 1-1 1H8c-.55 0-1 .45-1 1v1c0 .55.45 1 1 1h8c.55 0 1-.45 1-1v-1c0-.55-.45-1-1-1h-1c-.55 0-1-.45-1-1v-2.34" />
      <path d="M6 4h12v7a6 6 0 0 1-12 0V4Z" />
    </svg>
  );
}
