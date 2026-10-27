import { pillarInk } from '../../lib/sgxPillars';
import { portfolioOf } from '../../lib/sgxPortfolio';
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
import { useLanguage } from '../../context/LanguageContext';
import { loc } from '../../lib/localize';

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
  const { language } = useLanguage();
  const es = language === 'es';
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
      title: (es ? 'Cine Digital, Arte, Música & Proyección Cultural' : 'Digital Film, Art, Music & Cultural Reach'),
      shortDesc: (es ? 'Este pilar transforma narrativas en experiencias. Story reúne cine digital, arte, música, escritura, NFTs y efectos visuales para crear contenido que inspira, educa y proyecta cultura a través de la tecnología.' : 'This pillar turns narratives into experiences. Story brings together digital film, art, music, writing, NFTs and visual effects to create content that inspires, educates and projects culture through technology.'),
      icon: BookOpen,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.STORY'],
      accentColor: pillarInk('STORY'),
      bgGradients: 'from-[#32527B]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'Cine Digital, Arte, Música, NFTs & Efectos Visuales' : 'Digital Film, Art, Music, NFTs & Visual Effects'),
      industryScope: (es ? 'Cineastas, estudios de cine, creadores independientes, instituciones culturales, museos, historiadores, coleccionistas y casas de moda.' : 'Filmmakers, film studios, independent creators, cultural institutions, museums, historians, collectors and fashion houses.'),
      features: [
        {
          title: 'Avatar Studio',
          desc: (es ? 'Crea tu identidad de piloto en pixel art o low-poly; queda impresa en tu SGX Pass.' : 'Create your pilot identity in pixel art or low-poly; it\'s printed on your SGX Pass.'),
          actionLabel: (es ? 'Abrir Avatar Studio' : 'Open Avatar Studio'),
          icon: UserCheck,
          onClick: onOpenAvatarGenerator,
          badge: (es ? 'IDENTIDAD' : 'IDENTITY')
        },
        {
          title: (es ? 'Radar social' : 'Social radar'),
          desc: (es ? 'Las historias de la comunidad en vivo con #SpatialgineersSummit.' : 'The community\'s stories, live, with #SpatialgineersSummit.'),
          actionLabel: (es ? 'Ver radar social' : 'View social radar'),
          icon: Sparkles,
          onClick: () => navigateToSection('SOCIAL_STREAM'),
          badge: (es ? 'COMUNIDAD' : 'COMMUNITY')
        },
        {
          title: (es ? 'Sesiones de Narrativa & Cine XR' : 'Narrative & XR Film Sessions'),
          desc: (es ? 'Bloque SGX.Story del Día 1 y conversación de industria del Día 2.' : 'The Day 1 SGX.Story block and the Day 2 industry conversation.'),
          actionLabel: (es ? 'Explorar Agenda de Cine XR' : 'Explore the XR Film Agenda'),
          icon: Calendar,
          onClick: onExploreAgenda,
          badge: (es ? 'PANEL CULTURAL' : 'CULTURAL PANEL')
        }
      ],
      realDeployments: portfolioOf('STORY'),
      summitActivation: (es ? 'Presentación de colecciones culturales en 3D, paneles dedicados a la identidad boricua en la computación espacial y archivo digital permanente.' : 'Presentation of cultural collections in 3D, panels dedicated to Boricua identity in spatial computing and a permanent digital archive.')
    },
    {
      id: 'SHOWCASE' as PillarId,
      name: 'SGX.SHOWCASE',
      title: (es ? 'Presentación Visual, Renders 3D & Entornos XR' : 'Visual Presentation, 3D Renders & XR Environments'),
      shortDesc: (es ? 'Este pilar da forma a cómo las ideas se presentan al mundo. Showcase desarrolla renders, animaciones 3D, vídeos, galerías y entornos XR que transforman productos, marcas y conceptos en experiencias visuales memorables.' : 'This pillar shapes how ideas are presented to the world. Showcase develops renders, 3D animations, videos, galleries and XR environments that turn products, brands and concepts into memorable visual experiences.'),
      icon: Eye,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SHOWCASE'],
      accentColor: pillarInk('SHOWCASE'),
      bgGradients: 'from-[#00DDFF]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'Renders, Animaciones 3D, Galerías & Entornos XR' : 'Renders, 3D Animations, Galleries & XR Environments'),
      industryScope: (es ? 'Marcas físicas y digitales, tiendas, diseñadores de moda, diseñadores de producto, arquitectos, brokers inmobiliarios y galerías de arte.' : 'Physical and digital brands, stores, fashion designers, product designers, architects, real estate brokers and art galleries.'),
      features: [
        {
          title: (es ? 'Recorrido 360° Chroma Space Studios' : 'Chroma Space Studios 360° Tour'),
          desc: (es ? 'Exploración 360° de Chroma Space Studios, el venue del Día 3, con hotspots tácticos.' : 'A 360° tour of Chroma Space Studios, the Day 3 venue, with tactical hotspots.'),
          actionLabel: (es ? 'Abrir recorrido 360°' : 'Open the 360° tour'),
          icon: Compass,
          onClick: onOpen360Tour,
          badge: 'VENUE 360°'
        },
        {
          title: (es ? 'Directorio de Patrocinadores & Marcas' : 'Sponsors & Brands Directory'),
          desc: (es ? 'Stands interactivos, beneficios exclusivos y activaciones comerciales.' : 'Interactive booths, exclusive benefits and commercial activations.'),
          actionLabel: (es ? 'Ver Marcas Aliadas' : 'View Partner Brands'),
          icon: Briefcase,
          onClick: onExploreSponsors,
          badge: 'SPONSORS'
        },
        {
          title: (es ? 'Matriz de Patrocinio & Dossier' : 'Sponsorship Matrix & Dossier'),
          desc: (es ? '5 Tiers de auspicio con formulario de consulta para marcas.' : '5 sponsorship Tiers with an inquiry form for brands.'),
          actionLabel: (es ? 'Formulario de Alianzas' : 'Partnership Form'),
          icon: FileText,
          onClick: onOpenSponsorInquiry,
          badge: 'DOSSIER B2B'
        }
      ],
      realDeployments: portfolioOf('SHOWCASE'),
      summitActivation: (es ? 'Tour virtual 360° por el venue del Día 3 (Chroma Space Studios, San Juan), showrooms de patrocinadores y vitrinas holográficas interactivas.' : 'A 360° virtual tour of the Day 3 venue (Chroma Space Studios, San Juan), sponsor showrooms and interactive holographic showcases.')
    },
    {
      id: 'SPARK' as PillarId,
      name: 'SGX.SPARK',
      title: (es ? 'Interacción, Exploración Creativa & Dinámicas Inmersivas' : 'Interaction, Creative Exploration & Immersive Dynamics'),
      shortDesc: (es ? 'Este pilar impulsa la interacción y la exploración creativa. Spark abarca videojuegos, dinámicas inmersivas, simulaciones, activaciones participativas y herramientas de juego educativo que fomentan la conexión entre personas y tecnología.' : 'This pillar drives interaction and creative exploration. Spark covers video games, immersive dynamics, simulations, participatory activations and educational game tools that foster connection between people and technology.'),
      icon: Gamepad2,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SPARK'],
      accentColor: pillarInk('SPARK'),
      bgGradients: 'from-[#B87000]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'Videojuegos, Simulaciones & Juegos Educativos' : 'Video Games, Simulations & Educational Games'),
      industryScope: (es ? 'Estudios de videojuegos, educadores, ligas deportivas, comunidades competitivas, herramientas de capacitación y simulaciones interactivas.' : 'Video game studios, educators, sports leagues, competitive communities, training tools and interactive simulations.'),
      features: [
        {
          title: (es ? 'Simulador de Dron 3D' : '3D Drone Simulator'),
          desc: (es ? 'Entorno de vuelo táctico WebGL con físicas de gravedad cero y colisiones.' : 'Tactical WebGL flight environment with zero-gravity physics and collisions.'),
          actionLabel: (es ? 'Lanzar Simulador de Dron' : 'Launch the Drone Simulator'),
          icon: Rocket,
          onClick: onOpenDroneSimulator,
          badge: (es ? 'SIMULADOR EN VIVO' : 'LIVE SIMULATOR')
        },
        {
          title: (es ? 'Votación en vivo estilo Kahoot' : 'Kahoot-style live voting'),
          desc: (es ? 'Vota durante los bloques del Summit desde tu teléfono (+25 XP por voto).' : 'Vote during the Summit blocks from your phone (+25 XP per vote).'),
          actionLabel: (es ? 'Abrir consola /play' : 'Open the /play console'),
          icon: Zap,
          onClick: () => navigateToPage('play'),
          badge: (es ? 'INTERACCIÓN EN VIVO' : 'LIVE INTERACTION')
        },
        {
          title: (es ? 'Reactor & tienda de premios' : 'Reactor & prize store'),
          desc: (es ? 'Misiones por pilar y premios mayormente digitales, con el mismo XP.' : 'Missions by pillar and mostly digital prizes, with the same XP.'),
          actionLabel: (es ? 'Abrir Reactor de misiones' : 'Open the mission Reactor'),
          icon: TrophyIcon,
          onClick: onOpenPassportModal,
          badge: (es ? 'GAMIFICACIÓN' : 'GAMIFICATION')
        }
      ],
      realDeployments: portfolioOf('SPARK'),
      summitActivation: (es ? 'Simulador de dron táctico en la plataforma, votación tipo Kahoot con recompensas de XP y bloque SGX.Spark del Día 1.' : 'A tactical drone simulator on the platform, Kahoot-style voting with XP rewards and the Day 1 SGX.Spark block.')
    },
    {
      id: 'STAGE' as PillarId,
      name: 'SGX.STAGE',
      title: (es ? 'Expresión en Vivo, Shows Inmersivos & Transmisiones Híbridas' : 'Live Expression, Immersive Shows & Hybrid Broadcasts'),
      shortDesc: (es ? 'Este pilar celebra la expresión en vivo y la energía del presente. Stage incluye conciertos, podcasts, visualizers, performances, transmisiones híbridas y shows inmersivos que convierten la creatividad en espectáculo.' : 'This pillar celebrates live expression and the energy of the moment. Stage includes concerts, podcasts, visualizers, performances, hybrid broadcasts and immersive shows that turn creativity into spectacle.'),
      icon: Radio,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.STAGE'],
      accentColor: pillarInk('STAGE'),
      bgGradients: 'from-[#FDCC0D]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'Conciertos, Visualizers, Podcasts & Shows Inmersivos' : 'Concerts, Visualizers, Podcasts & Immersive Shows'),
      industryScope: (es ? 'Productores de eventos, DJs, artistas musicales, productoras audiovisuales, podcasters, influencers, conferencias y organizadores de ferias.' : 'Event producers, DJs, musical artists, audiovisual production companies, podcasters, influencers, conferences and trade show organizers.'),
      features: [
        {
          title: (es ? 'Salas de Broadcast & Canales' : 'Broadcast Rooms & Channels'),
          desc: (es ? 'YouTube Live como canal principal, con LinkedIn Live y Facebook Live.' : 'YouTube Live as the main channel, with LinkedIn Live and Facebook Live.'),
          actionLabel: (es ? 'Abrir Salas Broadcast' : 'Open Broadcast Rooms'),
          icon: Tv,
          onClick: onOpenBroadcastRooms,
          badge: (es ? 'STREAMING EN VIVO' : 'LIVE STREAMING')
        },
        {
          title: (es ? 'Artistas Invitados & Roblox' : 'Guest Artists & Roblox'),
          desc: (es ? 'Intermedios de artistas invitados (por anunciar) presentados en Roblox y transmitidos por YouTube Live.' : 'Guest artist interludes (to be announced), performed in Roblox and streamed on YouTube Live.'),
          actionLabel: (es ? 'Ver Cronograma de Shows' : 'View the Show Schedule'),
          icon: Radio,
          onClick: onExploreAgenda,
          badge: 'LIVE STAGE'
        },
        {
          title: (es ? 'Directorio de Artistas & Keynotes' : 'Artists & Keynotes Directory'),
          desc: (es ? 'Artistas y speakers: solo se anuncian los confirmados por escrito.' : 'Artists and speakers: only those confirmed in writing are announced.'),
          actionLabel: (es ? 'Portal de Artistas' : 'Artists Portal'),
          icon: Users,
          onClick: onOpenSpeakerPortal,
          badge: 'SPEAKERS'
        }
      ],
      realDeployments: portfolioOf('STAGE'),
      summitActivation: (es ? 'Transmisión de los 3 días por YouTube Live, intermedios de artistas invitados el Día 1 y showcase con avatar y captura facial en tiempo real el Día 3.' : 'All 3 days streamed on YouTube Live, guest artist interludes on Day 1 and a showcase with an avatar and real-time facial capture on Day 3.')
    },
    {
      id: 'SYSTEM' as PillarId,
      name: 'SGX.SYSTEM',
      title: (es ? 'Herramientas Digitales, Integraciones AI, WebApps & Robótica' : 'Digital Tools, AI Integrations, Web Apps & Robotics'),
      shortDesc: (es ? 'Este pilar se enfoca en crear herramientas digitales que hacen la innovación accesible. System desarrolla webapps interactivas, integraciones con AI, manufactura y robótica para apoyar proyectos creativos.' : 'This pillar focuses on building digital tools that make innovation accessible. System develops interactive web apps, AI integrations, manufacturing and robotics to support creative projects.'),
      icon: Cpu,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SYSTEM'],
      accentColor: pillarInk('SYSTEM'),
      bgGradients: 'from-[#888888]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'WebApps Interactivas, AI, Robótica & Manufactura' : 'Interactive Web Apps, AI, Robotics & Manufacturing'),
      industryScope: (es ? 'Departamentos técnicos, instituciones tecnológicas, empresas de manufactura, logística, startups y makers.' : 'Technical departments, technology institutions, manufacturing companies, logistics, startups and makers.'),
      features: [
        {
          title: 'SGX Pass & Holo Card',
          desc: (es ? 'Registro, Holo Card, credencial y QR en un solo pase.' : 'Registration, Holo Card, credential and QR in a single pass.'),
          actionLabel: (es ? 'Abrir mi SGX Pass' : 'Open my SGX Pass'),
          icon: Ticket,
          onClick: onOpenTickets,
          badge: (es ? 'IDENTIDAD' : 'IDENTITY')
        },
        {
          title: (es ? 'Radar de visitas' : 'Visit radar'),
          desc: (es ? 'Desde dónde nos visitan, en vivo: mapa, contadores y leaderboards.' : 'Where our visitors come from, live: map, counters and leaderboards.'),
          actionLabel: (es ? 'Ver el radar' : 'View the radar'),
          icon: Code2,
          onClick: () => navigateToSection('VISITS'),
          badge: (es ? 'TELEMETRÍA' : 'TELEMETRY')
        },
        {
          title: (es ? 'Escáner de pases & Rolodex' : 'Pass scanner & Rolodex'),
          desc: (es ? 'Escanea un SGX Pass: quedan en los dos Rolodex.' : 'Scan an SGX Pass: it\'s saved in both Rolodexes.'),
          actionLabel: (es ? 'Abrir escáner' : 'Open scanner'),
          icon: UserCheck,
          onClick: () => window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner')),
          badge: 'NETWORKING'
        }
      ],
      realDeployments: portfolioOf('SYSTEM'),
      summitActivation: (es ? 'Demostración en vivo en el escenario el Día 3 del rig de captura facial de avatares en tiempo real operado por Danelson y rediseño de UI reactiva.' : 'A live on-stage demo on Day 3 of the real-time avatar facial-capture rig run by Danelson, plus a reactive UI redesign.')
    },
    {
      id: 'SYNTHESIZE' as PillarId,
      name: 'SGX.SYNTHESIZE',
      title: (es ? 'Integración Holística, Soluciones a la Medida & Alto Impacto' : 'Holistic Integration, Custom Solutions & High Impact'),
      shortDesc: (es ? 'Este pilar materializa proyectos que integran múltiples áreas del ecosistema SGX. Synthesize une creatividad, ingeniería, arte y estrategia para desarrollar soluciones a la medida y experiencias de alto impacto.' : 'This pillar delivers projects that combine several areas of the SGX ecosystem. Synthesize brings together creativity, engineering, art and strategy to develop custom solutions and high-impact experiences.'),
      icon: Boxes,
      iconUrl: OFFICIAL_BRAND_ASSETS.pillarIcons['SGX.SYNTHESIZE'],
      accentColor: pillarInk('SYNTHESIZE'),
      bgGradients: 'from-[#FFFFFF]/30 via-[#1a1a1a] to-transparent',
      tagline: (es ? 'Creatividad, Ingeniería, Arte & Estrategia Integrada' : 'Integrated Creativity, Engineering, Art & Strategy'),
      industryScope: (es ? 'Empresas privadas, municipios, instituciones educativas, desarrolladores de proyectos y mega-ecosistemas B2B.' : 'Private companies, municipalities, educational institutions, project developers and large B2B ecosystems.'),
      features: [
        {
          title: 'SGX.Match — Speed Pitching',
          desc: (es ? 'Conecta con creadores y marcas de todos los pilares.' : 'Connect with creators and brands from every pillar.'),
          actionLabel: (es ? 'Lanzar SGX.Match' : 'Launch SGX.Match'),
          icon: Flame,
          onClick: onOpenMatchModule,
          badge: 'SGX.MATCH'
        },
        {
          title: (es ? 'Foros de Networking & Red de Asistentes' : 'Networking Forums & Attendee Network'),
          desc: (es ? 'Espacio de conexión para coordinar alianzas y co-creación de proyectos.' : 'A connection space to coordinate alliances and project co-creation.'),
          actionLabel: (es ? 'Abrir Foros de Networking' : 'Open Networking Forums'),
          icon: MessageSquare,
          onClick: onOpenNetworkingChat,
          badge: 'NETWORKING'
        },
        {
          title: 'SGX Guild Initiates',
          desc: (es ? 'Los 8 Initiates activos; los 6 mejores presentan en la Ranked Trials Pitch Session del Día 3.' : 'The 8 active Initiates; the top 6 present at the Day 3 Ranked Trials Pitch Session.'),
          actionLabel: (es ? 'Ver SGX Guild Initiates' : 'View SGX Guild Initiates'),
          icon: GraduationCap,
          onClick: onExploreGuild,
          badge: 'SGX GUILD'
        }
      ],
      realDeployments: portfolioOf('SYNTHESIZE'),
      summitActivation: (es ? 'El Summit 2026 en su totalidad representa la síntesis máxima: un evento de 3 días que une a líderes empresariales, reclutas e Initiates del SGX Guild y creadores.' : 'The Summit 2026 as a whole is the ultimate synthesis: a 3-day event that brings together business leaders, SGX Guild recruits and Initiates, and creators.')
    }
  ];

  const currentPillar = pillarsData.find((p) => p.id === activePillarTab) || pillarsData[0];

  const targetNiches = [
    (es ? 'Estudios de Videojuegos' : 'Video Game Studios'), (es ? 'Marcas Físicas & Digitales' : 'Physical & Digital Brands'), (es ? 'Educadores & Escuelas' : 'Educators & Schools'), (es ? 'Creadores Independientes' : 'Independent Creators'),
    (es ? 'Ligas Deportivas & Atletas' : 'Sports Leagues & Athletes'), (es ? 'Comunidades Competitivas' : 'Competitive Communities'), (es ? 'Productores de Eventos' : 'Event Producers'), (es ? 'Organizadores de Ferias' : 'Trade Show Organizers'),
    (es ? 'Agencias de Marketing' : 'Marketing Agencies'), (es ? 'DJs & Artistas Musicales' : 'DJs & Musical Artists'), (es ? 'Productoras Audiovisuales' : 'Audiovisual Production Companies'), 'Podcasters & Influencers',
    (es ? 'Medios Digitales & Conferencias' : 'Digital Media & Conferences'), (es ? 'Instituciones Culturales & Museos' : 'Cultural Institutions & Museums'), (es ? 'Tiendas & Ecommerce' : 'Stores & Ecommerce'), (es ? 'Diseñadores de Moda' : 'Fashion Designers'),
    (es ? 'Diseñadores de Producto' : 'Product Designers'), (es ? 'Arquitectos & Brokers Inmobiliarios' : 'Architects & Real Estate Brokers'), (es ? 'Desarrolladores de Proyectos' : 'Project Developers'), (es ? 'Empresas de Robótica & AI' : 'Robotics & AI Companies')
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
                {es ? 'FRAMEWORK OFICIAL SGX • 6 PILARES' : 'OFFICIAL SGX FRAMEWORK • 6 PILLARS'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {es ? 'DESARROLLADO EN PUERTO RICO PARA EL MUNDO' : 'BUILT IN PUERTO RICO FOR THE WORLD'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase font-['Orbitron',sans-serif] tracking-tight">
              {es ? '¿QUÉ ES EL FRAMEWORK SGX?' : 'WHAT IS THE SGX FRAMEWORK?'}
            </h1>
            <p className="text-sm text-slate-200 leading-relaxed font-sans">
              {es ? 'SGX es una ' : 'SGX is an '}<strong>{es ? 'metodología operativa y técnica' : 'operational and technical methodology'}</strong>{es ? ' creada por Spatialgineers para diseñar, desarrollar y desplegar experiencias inmersivas interconectadas. Integra computación espacial, inteligencia artificial, transmisiones en vivo y economías interactivas en una sola arquitectura accesible.' : ' created by Spatialgineers to design, develop and deploy interconnected immersive experiences. It brings together spatial computing, artificial intelligence, live broadcasts and interactive economies in a single accessible architecture.'}
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
                <span className="text-emerald-400">{es ? '¡Enlace Copiado!' : 'Link Copied!'}</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-[var(--sgx-neon)]" />
                <span>{es ? 'Compartir Hub' : 'Share Hub'}</span>
              </>
            )}
          </button>
        </div>

        {/* Pillar Selector Tabs */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider" style={{ color: 'var(--sgx-neon)' }}>
              {es ? 'SELECCIONA UN PILAR PARA ABRIR SU HUB OPERATIVO:' : 'SELECT A PILLAR TO OPEN ITS OPERATIONS HUB:'}
            </span>
            <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
              {es ? '6 VECTORES ACTIVOS' : '6 ACTIVE VECTORS'}
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
                      {es ? 'PILAR 0' : 'PILLAR 0'}{idx + 1}
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
              {es ? 'NICHOS & ALCANCE OPERATIVO:' : 'NICHES & OPERATIONAL REACH:'}
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
              <span>{es ? 'HERRAMIENTAS & ACTIVACIONES INTERACTIVAS DEL PILAR (' : 'THE PILLAR\'S INTERACTIVE TOOLS & ACTIVATIONS ('}{currentPillar.features.length})</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">
              {es ? 'CLIC DIRECTO PARA ABRIR EL MÓDULO O MODAL' : 'CLICK TO OPEN THE MODULE OR MODAL DIRECTLY'}
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
            <span>{es ? 'PROYECTOS & CASOS REALES DESPLEGADOS' : 'PROJECTS & REAL DEPLOYED CASES'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {currentPillar.realDeployments.map((dep, idx) => (
              <div 
                key={idx} 
                className="p-3.5 bg-[#171717] border border-slate-800 space-y-1.5"
                style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-white text-xs font-['Orbitron',sans-serif]">{loc(dep, 'name', language)}</div>
                  {dep.useCase && (
                    <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-mono font-bold text-black" style={{ background: currentPillar.accentColor }}>{es ? 'CASO DE USO' : 'USE CASE'}</span>
                  )}
                </div>
                <div className="text-[10px] font-mono font-semibold" style={{ color: currentPillar.accentColor }}>
                  {loc(dep, 'metric', language)}
                </div>
                {loc(dep, 'partners', language) && <div className="text-[10px] font-mono text-slate-400">{loc(dep, 'partners', language)}</div>}
                <p className="text-[11px] text-slate-300 leading-relaxed">{loc(dep, 'desc', language)}</p>
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
              <span>{es ? 'CÓMO SE EXPERIMENTA ESTE PILAR EN EL SUMMIT 2026:' : 'HOW YOU EXPERIENCE THIS PILLAR AT SUMMIT 2026:'}</span>
            </span>
            <p className="text-slate-300 font-sans text-xs">{currentPillar.summitActivation}</p>
          </div>

          {onExploreAgenda && (
            <button
              onClick={onExploreAgenda}
              className="px-3.5 py-1.5 bg-[#FDCC0D] hover:bg-[#B87000] text-black font-bold text-xs uppercase font-mono flex items-center gap-1 shrink-0 cursor-pointer shadow-md"
              style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
            >
              <span>{es ? 'VER SESIONES' : 'VIEW SESSIONS'}</span>
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
            <span>{es ? 'SGX FRAMEWORK • AUDIENCIA & NICHOS DE IMPACTO' : 'SGX FRAMEWORK • AUDIENCE & IMPACT NICHES'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase font-['Orbitron',sans-serif]">
            {es ? 'UN EVENTO PARA CADA INDUSTRIA Y SECTOR' : 'AN EVENT FOR EVERY INDUSTRY AND SECTOR'}
          </h2>
          <p className="text-xs text-slate-300 font-sans">
            {es ? 'El Framework SGX está diseñado para ser agnóstico de industria. Conecta a cualquier tipo de organización con experiencias inmersivas e infraestructura 3D.' : 'The SGX Framework is designed to be industry-agnostic. It connects any kind of organization with immersive experiences and 3D infrastructure.'}
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
              {es ? 'DÍA 1 • DIGITAL (YOUTUBE LIVE)' : 'DAY 1 • DIGITAL (YOUTUBE LIVE)'}
            </span>
            <span className="text-xs font-mono text-slate-400">{es ? 'VIE 11 DIC' : 'FRI DEC 11'}</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            PILLAR PRESENTATIONS & SGX RANKED TRIALS
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>{es ? 'Seis bloques de 25 min en orden oficial: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System y SGX.Synthesize, con un artista invitado (por anunciar) antes de cada uno.' : 'Six 25-min blocks in official order: SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System and SGX.Synthesize, with a guest artist (TBA) before each one.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'Portafolios de los Initiates (2:30–4:00 p.m.):' : 'Initiate Portfolios (2:30–4:00 p.m.):'}</strong>{es ? ' los 8 Initiates activos presentan su portafolio, 8 minutos cada uno.' : ' the 8 active Initiates present their portfolios, 8 minutes each.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'Cierre (4:00–4:30 p.m.):' : 'Closing (4:00–4:30 p.m.):'}</strong>{es ? ' se anuncian los 6 Initiates que presentan el Día 3.' : ' the 6 Initiates who present on Day 3 are announced.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'Horario:' : 'Schedule:'}</strong>{es ? ' 10:00 a.m. a 4:30 p.m. por YouTube Live, con las presentaciones de artistas en Roblox.' : ' 10:00 a.m. to 4:30 p.m. on YouTube Live, with the artist performances in Roblox.'}</span>
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
              {es ? 'DÍA 2 • DIGITAL (YOUTUBE LIVE)' : 'DAY 2 • DIGITAL (YOUTUBE LIVE)'}
            </span>
            <span className="text-xs font-mono text-slate-400">{es ? 'SÁB 12 DIC' : 'SAT DEC 12'}</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            INDUSTRY DAY
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>{es ? 'Seis conversaciones de industria de 45 minutos, una por pilar, con una persona invitada (por anunciar).' : 'Six 45-minute industry conversations, one per pillar, each with a guest (TBA).'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'Pausas de 10 minutos' : '10-minute breaks'}</strong>{es ? ' entre conversaciones.' : ' between conversations.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'Horario:' : 'Schedule:'}</strong>{es ? ' 10:00 a.m. a 4:00 p.m., 100% digital.' : ' 10:00 a.m. to 4:00 p.m., 100% digital.'}</span>
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
              {es ? 'DÍA 3 • SGX SHOWCASE (HÍBRIDO)' : 'DAY 3 • SGX SHOWCASE (HYBRID)'}
            </span>
            <span className="text-xs font-mono text-slate-400">{es ? 'DOM 13 DIC' : 'SUN DEC 13'}</span>
          </div>

          <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
            SGX SHOWCASE
          </h3>

          <ul className="text-xs text-slate-300 space-y-2 font-sans">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span><strong>{es ? 'SGX Guild Ranked Trials Pitch Session:' : 'SGX Guild Ranked Trials Pitch Session:'}</strong>{es ? ' los top 6 Initiates presentan 5 minutos cada uno.' : ' the top 6 Initiates present for 5 minutes each.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>{es ? 'Demos en vivo, avatar con captura facial en tiempo real y networking con votación gamificada y canje de premios.' : 'Live demos, an avatar with real-time facial capture and networking with gamified voting and prize redemption.'}</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--sgx-neon)] shrink-0 mt-0.5" />
              <span>{es ? '10:00 a.m. a 4:00 p.m. en Chroma Space Studios, San Juan, por invitación y cupo limitado (40 a 60 personas), y por YouTube Live.' : '10:00 a.m. to 4:00 p.m. at Chroma Space Studios, San Juan, by invitation with limited capacity (40 to 60 people), and on YouTube Live.'}</span>
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
              <span>{es ? 'ECOSISTEMA SPATIALGINEERS SUMMIT 2026' : 'SPATIALGINEERS SUMMIT 2026 ECOSYSTEM'}</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white font-['Orbitron',sans-serif] uppercase mt-1">
              {es ? 'CONTINÚA TU RECORRIDO POR EL SUMMIT' : 'CONTINUE YOUR SUMMIT JOURNEY'}
            </h3>
            <p className="text-xs text-slate-300 font-sans mt-0.5">
              {es ? 'Accede directamente a cualquier área del evento sin perder tu progreso.' : 'Jump straight to any area of the event without losing your progress.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 font-mono">
          {[
            {
              title: (es ? 'Agenda 3 Días' : '3-Day Agenda'),
              desc: (es ? 'Cronograma interactivo minuto a minuto' : 'Interactive minute-by-minute schedule'),
              icon: Calendar,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onExploreAgenda,
            },
            {
              title: (es ? 'Directorio Speakers' : 'Speakers Directory'),
              desc: (es ? 'Directorio 3D de expertos y artistas' : '3D directory of experts and artists'),
              icon: Users,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onOpenSpeakerPortal,
            },
            {
              title: 'SGX.Match',
              desc: (es ? 'Conecta creadores y marcas' : 'Connect creators and brands'),
              icon: Flame,
              color: '#00DDFF',
              badge: 'SGX.SHOWCASE',
              action: onOpenMatchModule,
            },
            {
              title: (es ? 'Recorrido 360° Chroma' : 'Chroma 360° Tour'),
              desc: (es ? 'Exploración virtual de Chroma Space Studios' : 'Virtual tour of Chroma Space Studios'),
              icon: Compass,
              color: '#FFBB00',
              badge: 'SGX.SHOWCASE',
              action: onOpen360Tour,
            },
            {
              title: (es ? 'Salas Broadcast' : 'Broadcast Rooms'),
              desc: (es ? 'Canales temáticos y streaming multicámara' : 'Themed channels and multi-camera streaming'),
              icon: Radio,
              color: '#FFFFFF',
              badge: 'SGX.STAGE',
              action: onOpenBroadcastRooms,
            },
            {
              title: 'SGX Guild Initiates',
              desc: (es ? 'Los 8 Initiates activos' : 'The 8 active Initiates'),
              icon: Award,
              color: '#32527B',
              badge: 'SGX.SYSTEM',
              action: onExploreGuild,
            },
            {
              title: (es ? 'Simulador Dron' : 'Drone Simulator'),
              desc: (es ? 'Vuelo acrobático 3D y retos con XP' : '3D aerobatic flight and XP challenges'),
              icon: Rocket,
              color: '#00DDFF',
              badge: 'SGX.SPARK',
              action: onOpenDroneSimulator,
            },
            {
              title: (es ? 'Patrocinadores' : 'Sponsors'),
              desc: (es ? 'Stands interactivos y ofertas de sponsors' : 'Interactive booths and sponsor offers'),
              icon: Briefcase,
              color: '#FFBB00',
              badge: 'SGX.SHOWCASE',
              action: onExploreSponsors,
            },
            {
              title: (es ? 'Foros de Networking' : 'Networking Forums'),
              desc: (es ? 'Comunidad y salas de chat temáticas' : 'Community and themed chat rooms'),
              icon: MessageSquare,
              color: '#00DDFF',
              badge: 'SGX.SYNTHESIZE',
              action: onOpenNetworkingChat,
            },
            {
              title: 'Avatar Studio 3D',
              desc: (es ? 'Genera tu avatar y credencial' : 'Generate your avatar and credential'),
              icon: UserCheck,
              color: '#FDCC0D',
              badge: 'SGX.STORY',
              action: onOpenAvatarGenerator,
            },
            {
              title: 'SGX Pass',
              desc: (es ? 'Acreditación oficial para los 3 días' : 'Official accreditation for all 3 days'),
              icon: Ticket,
              color: '#00DDFF',
              badge: 'SGX.SYNTHESIZE',
              action: onOpenTickets,
            },
            {
              title: (es ? 'Misiones & XP' : 'Missions & XP'),
              desc: (es ? 'Pase con misiones, sellos y QR' : 'Pass with missions, stamps and QR'),
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
                  <span>{es ? 'Acceder' : 'Enter'}</span>
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
