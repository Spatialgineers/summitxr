import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ArrowRight,
  User,
  Tv,
  Zap,
  Activity,
  Building2,
  Layers,
  Boxes,
  Gamepad2,
  Trophy,
  Calendar,
  Users,
  Award,
  Compass,
  HelpCircle,
  Ticket,
  ScanLine,
  Radio,
  MessageSquare,
  Instagram,
  Globe,
  ShieldCheck,
  Sliders,
  Volume2,
  Eye,
} from 'lucide-react';
import { SummitSectionKey } from './SummitSectionsDropdown';
import { useTenantTheme, hexToRgbStr } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { playUiChirp, playPillarDockSound, playCyberBurstSound } from '../../lib/cyberAudioEngine';
import { usePilotProfile } from '../../context/PilotProfileContext';
import { SgxOrbitalCore3D, SgxCorePillarId } from './SgxOrbitalCore3D';
import { SummitAnalyticsView } from '../analytics/SummitAnalyticsView';
import { useSummitFeatures } from '../../context/SummitFeatureContext';

export interface PillarModuleItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  xpReward?: string;
  actionLabel: string;
  icon: React.ElementType;
  onLaunch: () => void;
}

export interface PillarStationDefinition {
  id: SgxCorePillarId;
  name: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ElementType;
  iconUrl: string;
  themeColor: string;
  physicsDescription: string;
  modules: PillarModuleItem[];
}

interface SummitExperienceHubProps {
  onSelectSection: (section: SummitSectionKey) => void;
  onOpenTickets: () => void;
  onOpenSponsors: (tierId?: string) => void;
  onNavigateToPlayVote?: () => void;
  onNavigateToVisualizer?: () => void;
  onOpenRewardsStore?: () => void;
  onOpenAvatarGenerator?: () => void;
  onOpenQrScanner?: () => void;
  onOpenPassport?: () => void;
  onOpenSpeakerPortal?: () => void;
  onOpenTour?: () => void;
  onOpenTimeCapsules?: () => void;
  sponsorCount: number;
}

function resolvePillarFromTenantId(raw?: string): SgxCorePillarId {
  if (!raw) return 'STORY';
  const u = raw.toUpperCase();
  if (u.includes('SPARK')) return 'SPARK';
  if (u.includes('STAGE')) return 'STAGE';
  if (u.includes('SHOWCASE')) return 'SHOWCASE';
  if (u.includes('SYSTEM')) return 'SYSTEM';
  if (u.includes('SYNTH')) return 'SYNTHESIZE';
  return 'STORY';
}

export const SummitExperienceHub: React.FC<SummitExperienceHubProps> = ({
  onSelectSection,
  onOpenTickets,
  onOpenSponsors,
  onNavigateToPlayVote,
  onNavigateToVisualizer,
  onOpenRewardsStore,
  onOpenAvatarGenerator,
  onOpenQrScanner,
  onOpenPassport,
  onOpenSpeakerPortal,
  onOpenTour,
  onOpenTimeCapsules,
  sponsorCount,
}) => {
  const { tenant, selectPillar } = useTenantTheme();
  const { t } = useLanguage();
  const { setIsProfileModalOpen, recordActivity } = usePilotProfile();
  const { isHubModuleVisible, getHubModuleStatus } = useSummitFeatures();

  const [activePillarId, setActivePillarId] = useState<SgxCorePillarId>(() =>
    resolvePillarFromTenantId(tenant.pillarId || tenant.id)
  );
  const [viewMode, setViewMode] = useState<'CLOSED_3D_ONLY' | 'DOCKED_STATION' | 'ALL_PILLARS_MATRIX'>('CLOSED_3D_ONLY');
  const [activeHoloSandbox, setActiveHoloSandbox] = useState<
    'NONE' | 'HARMONIC_SYNTH_LAB' | 'TELEMETRY_MATRIX' | 'RELIC_INSPECTOR'
  >('NONE');
  const [synthFreq, setSynthFreq] = useState<number>(432);
  const [telemetryPulseCount, setTelemetryPulseCount] = useState<number>(0);

  // Keep active pillar synchronized with global tenant changes
  useEffect(() => {
    const resolved = resolvePillarFromTenantId(tenant.pillarId || tenant.id);
    setActivePillarId(resolved);
  }, [tenant.id, tenant.pillarId]);

  const handleDockPillar = (pillarId: SgxCorePillarId) => {
    setActivePillarId(pillarId);
    selectPillar(`SGX.${pillarId}`);
    playPillarDockSound(pillarId);
    window.dispatchEvent(new CustomEvent('sgx:pillar_docked', { detail: { pillarId } }));
  };

  const triggerSynthFrequency = (hz: number, label: string) => {
    setSynthFreq(hz);
    playUiChirp(hz);
    playCyberBurstSound();
    recordActivity('pillar_explore', `Sintetizador Espacial ${label}`, `Frecuencia ${hz}Hz disparada en el SGX Core`, 20);
  };

  // Strict logical separation of all modules into their 6 SGX Pillars in official v2026.10 order:
  // 1. STORY -> 2. SHOWCASE -> 3. SPARK -> 4. STAGE -> 5. SYSTEM -> 6. SYNTHESIZE
  const pillarStations: PillarStationDefinition[] = [
    {
      id: 'STORY',
      name: 'SGX.STORY',
      title: 'Identidad, Narrativa & Reliquias 3D',
      subtitle: 'Story opt.glb • Manifiesto • Avatar Studio 3D (+200 XP) • Pasaporte XP',
      description:
        'El origen conceptual de Spatialgineers ("Ingeniando Imaginación, Construyendo Realidades"). Inspecciona la escultura oficial Story opt.glb, construye tu avatar (+200 XP) y desbloquea sellos en tu pasaporte.',
      icon: Boxes,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
      themeColor: '#FDCC0D',
      physicsDescription: 'Física: Brasas Doradas Ascendentes · Audio: Acorde Lydian 432Hz',
      modules: [
        {
          id: 'mod_manifesto',
          title: 'Manifiesto de los 6 Pilares SGX',
          subtitle: 'Filosofía Tecnocreativa & Casos Reales',
          description:
            'Explora a fondo la arquitectura conceptual de Spatialgineers, despliegues previos y visión del ecosistema XR.',
          xpReward: '+75 XP',
          actionLabel: 'Abrir Manifiesto',
          icon: Boxes,
          onLaunch: () => onSelectSection('PILLARS_MANIFESTO'),
        },
        {
          id: 'mod_avatar',
          title: 'Avatar Studio 3D',
          subtitle: 'Generador Oficial de Identidad de Piloto',
          description:
            'Personaliza tu insignia y avatar cibernético para las salas de networking, leaderboard y acreditación oficial del Summit.',
          xpReward: '+200 XP',
          actionLabel: 'Crear Avatar (+200 XP)',
          icon: User,
          onLaunch: () => {
            if (onOpenAvatarGenerator) onOpenAvatarGenerator();
            else window.dispatchEvent(new CustomEvent('sgx:open_avatar'));
          },
        },
        {
          id: 'mod_passport',
          title: 'Pasaporte Oficial del Summit',
          subtitle: 'Misiones Interactivas & Sellos Digitales',
          description:
            'Revisa tus misiones completadas en cada pilar y reclama bonificaciones de experiencia del evento.',
          xpReward: '+150 XP',
          actionLabel: 'Abrir Pasaporte',
          icon: Award,
          onLaunch: () => {
            if (onOpenPassport) onOpenPassport();
            else window.dispatchEvent(new CustomEvent('sgx:open_passport'));
          },
        },
        {
          id: 'mod_pilot_profile',
          title: 'Bitácora de Piloto & Rango XP',
          subtitle: 'Estadísticas del Fin de Semana',
          description:
            'Consulta tu nivel actual, historial de interacciones en vivo y desglose de puntos acumulados.',
          xpReward: 'PERFIL ACTIVO',
          actionLabel: 'Ver Bitácora',
          icon: ShieldCheck,
          onLaunch: () => {
            playUiChirp(620);
            setIsProfileModalOpen(true);
          },
        },
        {
          id: 'mod_relic_studio',
          title: 'Inspector Holográfico de Reliquias .GLB',
          subtitle: 'Laboratorio de Materiales PBR & Shaders',
          description:
            'Inspecciona las esculturas 3D oficiales de Spatialgineers sin salir del visor, alternando entre Cristal PBR, Wireframe y Oro Solar.',
          xpReward: '+40 XP',
          actionLabel: 'Activar Inspector 3D',
          icon: Eye,
          onLaunch: () => {
            playCyberBurstSound();
            setActiveHoloSandbox('RELIC_INSPECTOR');
          },
        },
      ],
    },
    {
      id: 'SHOWCASE',
      name: 'SGX.SHOWCASE',
      title: 'Exposición 360°, SGX.Match & Alianzas Oficiales',
      subtitle: 'Showcase opt.glb • Tour 360° Chroma Studios • Speed Pitching • QR (+50 XP)',
      description:
        'Donde los proyectos, marcas aliadas y fundadores se conectan con el mundo. Recorre Chroma Space Studios en 360°, haz matchmaking estratégico y escanea códigos QR (+50 XP).',
      icon: Building2,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
      themeColor: '#00DDFF',
      physicsDescription: 'Física: Galería Holográfica Panorámica · Audio: Resonancia Cristalina Cian',
      modules: [
        {
          id: 'mod_map_360',
          title: 'Tour Virtual 360° Chroma Space Studios',
          subtitle: 'Recorrido Espacial por la Sede Híbrida en San Juan',
          description:
            'Explora en 360° los sets de producción virtual, escenario principal y zonas de networking de nuestro Strategic Venue Partner.',
          xpReward: '+90 XP',
          actionLabel: 'Entrar al Tour 360°',
          icon: Globe,
          onLaunch: () => onSelectSection('MAP_360'),
        },
        {
          id: 'mod_sgx_match',
          title: 'SGX.Match — Speed Pitching & Alianzas',
          subtitle: 'Emparejamiento Inteligente B2B & Creadores',
          description:
            'Conecta con fundadores, estudios XR, inversionistas y líderes técnicos para agendar reuniones durante el Summit.',
          xpReward: '+150 XP',
          actionLabel: 'Abrir SGX.Match',
          icon: Zap,
          onLaunch: () => onSelectSection('ENTREPRENEUR_MATCH'),
        },
        {
          id: 'mod_sponsors_hub',
          title: `Partners Oficiales & Matriz de Patrocinio (${sponsorCount})`,
          subtitle: 'Chroma Space Studios • Los Mismos TV • Tiers 1–5',
          description:
            'Conoce a nuestros Strategic Partners confirmados y explora los 5 niveles de patrocinio con presencia los 365 días.',
          xpReward: 'PARTNERS',
          actionLabel: 'Ver Partners & Tiers',
          icon: Building2,
          onLaunch: () => onSelectSection('SPONSORS_HUB'),
        },
        {
          id: 'mod_qr_scanner',
          title: 'Escáner QR WebXR de Credenciales',
          subtitle: 'Rolodex Digital de Contactos (+50 XP por escaneo)',
          description:
            'Escanea los códigos QR del evento y de otros asistentes en Chroma Space Studios para sumar +50 XP y guardar su perfil.',
          xpReward: '+50 XP',
          actionLabel: 'Escanear QR (+50 XP)',
          icon: ScanLine,
          onLaunch: () => {
            if (onOpenQrScanner) onOpenQrScanner();
            else window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner'));
          },
        },
        {
          id: 'mod_social_stream',
          title: 'Live Social Stream & Radar #SGX2026',
          subtitle: 'Muro en Vivo de Instagram, X & Threads',
          description:
            'Visualiza el pulso social del evento proyectado en tiempo real en las pantallas LED del venue.',
          xpReward: '+50 XP',
          actionLabel: 'Abrir Social Radar',
          icon: Instagram,
          onLaunch: () => onSelectSection('SOCIAL_STREAM'),
        },
        {
          id: 'mod_credential_generator',
          title: 'SGX Credential & Holo Card Generator',
          subtitle: 'Pase Holográfico 3D Personalizable',
          description:
            'Crea y descarga tu credencial cibernética oficial con efecto foil 3D, soporte HEIC/PNG y modo Visitante.',
          xpReward: '+150 XP',
          actionLabel: 'Generar Credencial',
          icon: Award,
          onLaunch: () => onSelectSection('CREDENTIAL_GENERATOR'),
        },
      ],
    },
    {
      id: 'SPARK',
      name: 'SGX.SPARK',
      title: 'Simulación de Dron con Colisiones 3D & Gamificación',
      subtitle: 'Spark Opt.glb • Dron 3D con Física Box3 • Premios XP • Votación Kahoot (+25 XP)',
      description:
        'Exploración creativa y dinámicas participativas. Pilotea el dron táctico, participa en las rondas de votación estilo Kahoot (+25 XP) y canjea premios oficiales del Summit.',
      icon: Zap,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
      themeColor: '#FFBB00',
      physicsDescription: 'Física: Vórtice Cinético Centrífugo · Audio: Sintetizador Arpegiado Ámbar',
      modules: [
        {
          id: 'mod_drone_sim',
          title: 'Simulador de Dron 3D (Motor de Colisiones Box3)',
          subtitle: 'Colisiones contra Edificios, Islas, Túneles & Barrel Roll [Q]',
          description:
            'Vuela a través de San Juan Cyberpunk, Archipiélago Tropical y Túnel Cuántico con colisiones físicas reales, rebote vectorial y chispas 3D.',
          xpReward: '+250 XP',
          actionLabel: 'Volar Dron 3D Ahora',
          icon: Gamepad2,
          onLaunch: () => onSelectSection('EMBEDS_GAMES'),
        },
        {
          id: 'mod_rewards_store',
          title: 'Tienda de Premios Oficiales & Canje XP',
          subtitle: 'Cupones, Suscripciones 3M, Sesión Grit & Premio Mayor Tier 1',
          description:
            'Canjea tus XP por cupones de auspiciadores, 3 meses en plataformas SGX, Sesión "Grit" con Vyze y Ericson o el Premio Mayor "Spatialgineers activa tu evento".',
          xpReward: 'PREMIOS XP',
          actionLabel: 'Abrir Tienda de Premios',
          icon: Trophy,
          onLaunch: () => {
            if (onOpenRewardsStore) onOpenRewardsStore();
            else window.dispatchEvent(new CustomEvent('sgx:open_rewards'));
          },
        },
        {
          id: 'mod_play_vote',
          title: 'Consola de Votación Estilo Kahoot (/play)',
          subtitle: 'Rondas en Directo & Trivias (+25 XP por voto)',
          description:
            'Vota en tiempo real durante los bloques de pilares, intermedios y conversaciones de industria para sumar +25 XP por voto.',
          xpReward: '+25 XP / VOTO',
          actionLabel: 'Abrir Consola /play',
          icon: Zap,
          onLaunch: () => {
            if (onNavigateToPlayVote) onNavigateToPlayVote();
            else onSelectSection('EMBEDS_GAMES');
          },
        },
        {
          id: 'mod_guided_tour',
          title: 'Misión de Reconocimiento Guiado',
          subtitle: 'Recorrido Interactivo por la Plataforma',
          description:
            'Completa el briefing táctico interactivo de los módulos del Summit y recibe tu bonificación de bienvenida.',
          xpReward: '+100 XP',
          actionLabel: 'Iniciar Misión Tour',
          icon: Compass,
          onLaunch: () => {
            if (onOpenTour) onOpenTour();
            else window.dispatchEvent(new CustomEvent('sgx:open_tour'));
          },
        },
      ],
    },
    {
      id: 'STAGE',
      name: 'SGX.STAGE',
      title: 'Transmisión 4K, Escenario & Sintetizador en Vivo',
      subtitle: 'Stage opt.glb • Agenda Run of Show • Salas Broadcast 4K • Speakers 3D',
      description:
        'La energía del espectáculo en tiempo real. Consulta el Run of Show oficial de los 3 días, entra a los salones de transmisión 4K con Los Mismos TV y dispara frecuencias armónicas en vivo.',
      icon: Tv,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
      themeColor: '#FFFFFF',
      physicsDescription: 'Física: Ondas Acústicas Rítmicas · Audio: Armónicos de Escenario en Vivo',
      modules: [
        {
          id: 'mod_agenda',
          title: 'Agenda Oficial Run of Show (3 Días)',
          subtitle: 'Cronograma Minuto a Minuto v2026.10 & Mi Agenda',
          description:
            'Explora los bloques de los 6 pilares y 8 Initiates (Día 1), Día de la Industria (Día 2) y el evento híbrido en Chroma Space Studios con los 6 Initiates seleccionados (Día 3).',
          xpReward: '+50 XP',
          actionLabel: 'Explorar Agenda',
          icon: Calendar,
          onLaunch: () => onSelectSection('AGENDA'),
        },
        {
          id: 'mod_broadcast',
          title: 'Salones Broadcast 4K & Streaming',
          subtitle: 'YouTube Live • LinkedIn Live • Facebook Live • Los Mismos TV',
          description:
            'Sintoniza los canales de transmisión en vivo, cámaras multicámara del escenario y cobertura oficial.',
          xpReward: 'SEÑAL 4K',
          actionLabel: 'Entrar a Salas 4K',
          icon: Radio,
          onLaunch: () => onSelectSection('BROADCAST_ROOMS'),
        },
        {
          id: 'mod_speakers',
          title: 'Directorio 3D de Speakers & Artistas',
          subtitle: 'Co-Hosts, Personas Invitadas & Artistas en Vivo',
          description:
            'Conoce a Danelson ("The Highgineer"), Ricardo ("Lightning Fingers"), personas invitadas de cada pilar, artistas y los 8 Initiates del Guild.',
          xpReward: '+60 XP',
          actionLabel: 'Ver Speakers 3D',
          icon: Users,
          onLaunch: () => onSelectSection('SPEAKERS'),
        },
        {
          id: 'mod_visualizer_stage',
          title: 'Escenario 3D Reactivo SGX',
          subtitle: 'Motor Visual Three.js en Tiempo Real',
          description:
            'Visualizador escénico de pantalla completa sincronizado con la música en vivo y las reacciones de la audiencia.',
          xpReward: 'THREE.JS LIVE',
          actionLabel: 'Abrir Escenario 3D',
          icon: Tv,
          onLaunch: () => {
            if (onNavigateToVisualizer) onNavigateToVisualizer();
            else onSelectSection('BROADCAST_ROOMS');
          },
        },
        {
          id: 'mod_stage_synth',
          title: 'Mesa de Frecuencias & Pulso Acústico 432Hz',
          subtitle: 'Sintetizador Espacial Web Audio en Directo',
          description:
            'Modula en tiempo real las ondas armónicas del universo 3D y sincroniza destellos lumínicos con el núcleo SGX.',
          xpReward: '+65 XP',
          actionLabel: 'Abrir Sintetizador',
          icon: Volume2,
          onLaunch: () => {
            playCyberBurstSound();
            setActiveHoloSandbox('HARMONIC_SYNTH_LAB');
          },
        },
      ],
    },
    {
      id: 'SYSTEM',
      name: 'SGX.SYSTEM',
      title: 'SGX Guild Ranked Trials, Telemetría & Datos',
      subtitle: 'System opt.glb • 8 Initiates Activos (Día 1) • 6 Presentan en el Día 3',
      description:
        'La columna vertebral de ingeniería y talento técnico. Audita los portafolios de los 8 Initiates activos del Día 1 (8 min c/u) y sigue la selección de los 6 Initiates que presentan en el Día 3 (5 min c/u).',
      icon: Activity,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
      themeColor: '#32527B',
      physicsDescription: 'Física: Retícula Orbital de Precisión · Audio: Pulso Cuántico de Telemetría',
      modules: [
        {
          id: 'mod_guild_trials',
          title: 'SGX Guild Initiates & Ranked Trials',
          subtitle: '8 Initiates Activos en Día 1 → 6 Seleccionados para el Día 3',
          description:
            'Inspecciona los perfiles técnicos, portafolios de 8 minutos del Día 1 y el ranking de los 6 Initiates elegidos para presentar el domingo en Chroma Space Studios.',
          xpReward: '+100 XP',
          actionLabel: 'Ver Los 8 Initiates',
          icon: Award,
          onLaunch: () => onSelectSection('GUILD'),
        },
        {
          id: 'mod_telemetry_play',
          title: 'Terminal de Votación & Telemetría (/play)',
          subtitle: 'Sincronización Baja Latencia Firestore (+25 XP)',
          description:
            'Participa en las rondas de evaluación en vivo de la audiencia y observa el impacto estadístico instantáneo.',
          xpReward: '+25 XP',
          actionLabel: 'Conectar Terminal',
          icon: Activity,
          onLaunch: () => {
            if (onNavigateToPlayVote) onNavigateToPlayVote();
            else onSelectSection('GUILD');
          },
        },
        {
          id: 'mod_speaker_portal',
          title: 'Consola de Registro de Speakers & Artistas',
          subtitle: 'Autogestión de Ponentes Oficiales',
          description:
            'Portal técnico para que speakers y creadores invitados actualicen su ficha técnica, sesión y enlaces.',
          xpReward: 'PORTAL OFICIAL',
          actionLabel: 'Abrir Portal Speaker',
          icon: Users,
          onLaunch: () => {
            if (onOpenSpeakerPortal) onOpenSpeakerPortal();
            else onSelectSection('SPEAKERS');
          },
        },
        {
          id: 'mod_leaderboard_stats',
          title: 'Leaderboard & Métricas de Piloto',
          subtitle: 'Clasificación General de Participación',
          description:
            'Verifica tu posición en la tabla de líderes del ecosistema Spatialgineers rumbo a los premios mayores del Día 3.',
          xpReward: 'RANKING',
          actionLabel: 'Ver Mi Rango',
          icon: Trophy,
          onLaunch: () => {
            playUiChirp(620);
            setIsProfileModalOpen(true);
          },
        },
        {
          id: 'mod_telemetry_sandbox',
          title: 'Simulador de Telemetría & Nodos Cuánticos',
          subtitle: 'Diagnóstico en Vivo del SGX Framework',
          description:
            'Ejecuta pruebas de pulso de red, latencia de los 7 nodos GLB y calibración gravitacional en tiempo real.',
          xpReward: '+55 XP',
          actionLabel: 'Abrir Telemetría',
          icon: Sliders,
          onLaunch: () => {
            playCyberBurstSound();
            setActiveHoloSandbox('TELEMETRY_MATRIX');
          },
        },
      ],
    },
    {
      id: 'SYNTHESIZE',
      name: 'SGX.SYNTHESIZE',
      title: 'Convergencia Maestra, Comunidad & Registro',
      subtitle: 'Synthesize opt.glb • Foros de Networking • Taquilla Oficial PDF',
      description:
        'La unión armónica de los 6 Pilares en un solo organismo vivo. Únete a los foros de conversación en tiempo real, descarga tu pase oficial en PDF y sincroniza tu participación.',
      icon: Layers,
      iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
      themeColor: '#B87000',
      physicsDescription: 'Física: Convergencia Dual Cobre/Oro · Audio: Sinfonía Maestra Unificada',
      modules: [
        {
          id: 'mod_networking_chat',
          title: 'Foros del Summit & Chat de Comunidad',
          subtitle: 'Canales Temáticos en Tiempo Real',
          description:
            'Debate con otros pilotos, comparte recursos de Roblox/WebXR y coordina colaboraciones en directo.',
          xpReward: '+80 XP',
          actionLabel: 'Entrar al Foro Chat',
          icon: MessageSquare,
          onLaunch: () => onSelectSection('NETWORKING'),
        },
        {
          id: 'mod_vip_ticket',
          title: 'Acreditación & Taquilla Oficial PDF',
          subtitle: 'Pase Digital con Código QR Verificable',
          description:
            'Genera y descarga tu entrada oficial gratuita para los días digitales o solicita invitación para el Día 3 en Chroma Space Studios (aforo 40–60 personas).',
          xpReward: '+100 XP',
          actionLabel: 'Obtener Mi Pase PDF',
          icon: Ticket,
          onLaunch: () => onOpenTickets(),
        },
        {
          id: 'mod_sponsor_apply',
          title: 'Postular Marca como Patrocinador',
          subtitle: 'Convocatoria Abierta Tiers 1 al 5',
          description:
            'Integra tu empresa junto a Chroma Space Studios y Los Mismos TV en el ecosistema interactivo del Summit.',
          xpReward: 'ALIANZA B2B',
          actionLabel: 'Solicitar Dossier / Tier',
          icon: Building2,
          onLaunch: () => onOpenSponsors('tier_3'),
        },
        {
          id: 'mod_full_tour',
          title: 'Tour Guiado del Ecosistema Unificado',
          subtitle: 'Recorrido Paso a Paso por los 6 Pilares',
          description:
            'Activa el asistente de navegación espacial para descubrir cada rincón del SGX Framework.',
          xpReward: '+100 XP',
          actionLabel: 'Iniciar Tour Guiado',
          icon: HelpCircle,
          onLaunch: () => {
            if (onOpenTour) onOpenTour();
            else window.dispatchEvent(new CustomEvent('sgx:open_tour'));
          },
        },
      ],
    },
  ];

  const activeStation =
    pillarStations.find(s => s.id === activePillarId) || pillarStations[0];
  const activeColorRgb = hexToRgbStr(activeStation.themeColor);

  return (
    <div id="summit-experience-hub" className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* 1. Full-Bleed Interactive 3D Orbital Core Reactor with 4 Circular 3D Clocks & Angled HUD Wings */}
      <SgxOrbitalCore3D
        activePillarId={activePillarId}
        onSelectPillar={handleDockPillar}
        activePillarModules={activeStation.modules}
        onOpenTimeCapsules={onOpenTimeCapsules}
        onSelectSection={onSelectSection}
        onOpenTickets={onOpenTickets}
        onOpenCredential={() => onSelectSection('CREDENTIAL_GENERATOR')}
        onOpen360Tour={() => onSelectSection('MAP_360')}
        onQuickLaunchPrimaryModule={pillarId => {
          const st = pillarStations.find(s => s.id === pillarId);
          if (st && st.modules[0]) {
            st.modules[0].onLaunch();
          }
        }}
      />

      {/* Compact On-Demand Expansion Bar (Only shown when expanded, keeping default 3D core full-screen) */}
      {viewMode !== 'CLOSED_3D_ONLY' && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0D0D0D]/90 border border-white/10 backdrop-blur-md font-mono text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Boxes className="w-3.5 h-3.5 text-[#00DDFF] shrink-0" />
          <span className="text-[11px]">
            Toca cualquier escultura <strong className="text-[#FDCC0D]">.GLB</strong> en el visor 3D o despliega el catálogo completo bajo demanda:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              playUiChirp(640);
              setViewMode(prev => (prev === 'DOCKED_STATION' ? 'CLOSED_3D_ONLY' : 'DOCKED_STATION'));
            }}
            className={`px-3 py-1.5 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 text-[11px] border ${
              viewMode === 'DOCKED_STATION'
                ? 'bg-[#FDCC0D] text-black border-[#FDCC0D]'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border-white/15'
            }`}
          >
            {viewMode === 'DOCKED_STATION'
              ? `Ocultar Estación ${activeStation.id} ▲`
              : `Tarjetas de ${activeStation.name} (${activeStation.modules.length}) ▼`}
          </button>

          <button
            type="button"
            onClick={() => {
              playUiChirp(720);
              setViewMode(prev => (prev === 'ALL_PILLARS_MATRIX' ? 'CLOSED_3D_ONLY' : 'ALL_PILLARS_MATRIX'));
            }}
            className={`px-3 py-1.5 font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 text-[11px] border ${
              viewMode === 'ALL_PILLARS_MATRIX'
                ? 'bg-[#00DDFF] text-black border-[#00DDFF]'
                : 'bg-slate-900/90 text-slate-300 hover:text-white border-white/15'
            }`}
          >
            {viewMode === 'ALL_PILLARS_MATRIX'
              ? 'Ocultar Mapa de 6 Pilares ▲'
              : 'Mapa Completo (27 Módulos) ▼'}
          </button>
        </div>
      </div>
      )}

      {/* Optional Interactive Holographic Micro-Sandbox (Opens inline without scrolling the page) */}
      {activeHoloSandbox !== 'NONE' && (
        <div className="sgx-crystal-card p-5 sm:p-6 border-2 border-cyan-400 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-[#FDCC0D]" />
              <div>
                <div className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
                  LABORATORIO INTERACTIVO EN VIVO · SIN SALTO DE PÁGINA
                </div>
                <h3 className="text-base sm:text-lg font-black text-white font-['Orbitron',sans-serif]">
                  {activeHoloSandbox === 'HARMONIC_SYNTH_LAB'
                    ? 'Mesa de Sintetizador Espacial 432Hz & Ondas Armónicas'
                    : activeHoloSandbox === 'TELEMETRY_MATRIX'
                    ? 'Diagnóstico Cuántico de Nodos .GLB & Telemetría SGX'
                    : 'Estudio Holográfico de Reliquias 3D (.GLB)'}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveHoloSandbox('NONE')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/20 text-xs font-mono text-slate-200 cursor-pointer"
            >
              Cerrar Laboratorio ✕
            </button>
          </div>

          {activeHoloSandbox === 'HARMONIC_SYNTH_LAB' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {[
                { hz: 288, name: 'Raíz Cósmica (D4)', desc: 'Sub-bajo gravitacional' },
                { hz: 432, name: 'Armónico Solar (A4)', desc: 'Sintonía base SGX.STORY' },
                { hz: 528, name: 'Resonancia Cian (C5)', desc: 'Pulso cristalino SHOWCASE' },
                { hz: 648, name: 'Quinta Orbital (E5)', desc: 'Expansión de anillos 3D' },
              ].map(pad => (
                <button
                  key={pad.hz}
                  type="button"
                  onClick={() => triggerSynthFrequency(pad.hz, pad.name)}
                  className={`p-4 border text-left transition-all cursor-pointer ${
                    synthFreq === pad.hz
                      ? 'bg-cyan-950/90 border-[#FDCC0D] text-white shadow-lg'
                      : 'bg-black/60 border-white/15 text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  <div className="text-lg font-black text-[#FDCC0D] tabular-nums">{pad.hz} Hz</div>
                  <div className="font-bold text-white mt-1">{pad.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{pad.desc}</div>
                </button>
              ))}
            </div>
          )}

          {activeHoloSandbox === 'TELEMETRY_MATRIX' && (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs p-3.5 bg-black/50 border border-cyan-500/30">
                <div className="space-y-1 text-slate-300">
                  <div>Estado de los 7 Nodos .GLB: <strong className="text-[#00DDFF]">SINCRONIZADOS (60 FPS)</strong></div>
                  <div>Pulsos de Calibración Emitidos: <strong className="text-[#FDCC0D] tabular-nums">{telemetryPulseCount}</strong></div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTelemetryPulseCount(c => c + 1);
                    playCyberBurstSound();
                    recordActivity('pillar_explore', 'Pulso de Telemetría SGX.SYSTEM', 'Sincronización de los 7 núcleos .GLB', 30);
                  }}
                  className="px-4 py-2.5 bg-[#FDCC0D] text-black font-extrabold cursor-pointer hover:brightness-110 transition-all"
                >
                  Emitir Pulso de Diagnóstico (+30 XP)
                </button>
              </div>

              {/* Embedded Full Live Summit Analytics & Telemetry View */}
              <SummitAnalyticsView />
            </div>
          )}

          {activeHoloSandbox === 'RELIC_INSPECTOR' && (
            <div className="text-xs font-mono text-slate-300 leading-relaxed">
              Usa la pestaña <strong className="text-[#FDCC0D]">Laboratorio 3D</strong> dentro del Panel Holográfico derecho del visor 3D superior para explorar los 7 archivos <code className="text-cyan-300">.glb</code> en su color e iluminación original.
            </div>
          )}
        </div>
      )}

      {/* 2. On-Demand Docked Pillar Command Station (Only rendered when user explicitly clicks to expand) */}
      {viewMode === 'DOCKED_STATION' && (
        <div
          className="sgx-glass-relief p-5 sm:p-7 space-y-6 transition-all duration-300"
          style={{
            borderColor: activeStation.themeColor,
            boxShadow: `0 16px 48px -8px rgba(0, 0, 0, 0.9), 0 0 34px rgba(${activeColorRgb}, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.28)`,
          }}
        >
          {/* Station Header Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-white/10">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 border-2 flex items-center justify-center p-2 shrink-0 bg-[#111111]"
                style={{
                  borderColor: activeStation.themeColor,
                  boxShadow: `0 0 22px rgba(${activeColorRgb}, 0.35)`,
                  clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)',
                }}
              >
                <img
                  src={activeStation.iconUrl}
                  alt={activeStation.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  <span className="font-extrabold tracking-wider" style={{ color: activeStation.themeColor }}>
                    ESTACIÓN ACOPLADA: {activeStation.name}
                  </span>
                  <span aria-hidden="true" className="text-slate-500">·</span>
                  <span className="text-slate-300">{activeStation.physicsDescription}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-['Orbitron',sans-serif]">
                  {activeStation.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed font-mono">
                  {activeStation.description}
                </p>
              </div>
            </div>

            {/* Pillar Station Cycle Controls */}
            <div className="flex items-center gap-2 shrink-0 font-mono text-xs">
              <button
                type="button"
                onClick={() => {
                  const idx = pillarStations.findIndex(p => p.id === activePillarId);
                  const next = pillarStations[(idx + 1) % pillarStations.length];
                  handleDockPillar(next.id);
                }}
                className="px-4 py-2.5 bg-slate-900/90 hover:bg-slate-800 border border-white/20 text-white font-bold flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap shrink-0"
                style={{ clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)' }}
              >
                <span>Siguiente Pilar Orbital</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FDCC0D]" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('CLOSED_3D_ONLY')}
                className="px-3 py-2.5 bg-slate-950 hover:bg-slate-800 border border-white/20 text-slate-300 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Exclusively Separated Modules Grid for the Active Pillar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeStation.modules
              .filter((mod) => isHubModuleVisible(mod.id))
              .map((mod, idx) => {
                const ModIcon = mod.icon;
                const modStatus = getHubModuleStatus(mod.id);
                const isMaintenance = modStatus === 'MAINTENANCE';

                return (
                  <div
                    key={mod.id}
                    onClick={() => {
                      if (isMaintenance) {
                        playUiChirp(380);
                        return;
                      }
                      playUiChirp(740);
                      mod.onLaunch();
                    }}
                    className={`sgx-crystal-card p-5 flex flex-col justify-between gap-4 group ${
                      isMaintenance ? 'opacity-80 cursor-not-allowed border-[#FDCC0D]/40' : 'cursor-pointer'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 bg-slate-950/90 border flex items-center justify-center shrink-0 transition-transform group-hover:scale-110"
                            style={{
                              borderColor: activeStation.themeColor,
                              color: activeStation.themeColor,
                              clipPath:
                                'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                            }}
                          >
                            <ModIcon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-[11px] font-mono text-slate-400">
                              0{idx + 1} · {activeStation.name}
                            </div>
                            <h4 className="text-base font-extrabold text-white font-['Orbitron',sans-serif] group-hover:text-[#FDCC0D] transition-colors leading-snug">
                              {mod.title}
                            </h4>
                          </div>
                        </div>

                        {isMaintenance ? (
                          <span className="px-2 py-0.5 bg-[#FDCC0D]/15 border border-[#FDCC0D] text-[#FDCC0D] text-[10px] font-mono font-bold uppercase shrink-0">
                            ⏳ PRÓXIMAMENTE
                          </span>
                        ) : (
                          mod.xpReward && (
                            <span
                              className="text-[11px] font-mono font-bold tabular-nums shrink-0"
                              style={{ color: activeStation.themeColor }}
                            >
                              {mod.xpReward}
                            </span>
                          )
                        )}
                      </div>

                      <p className="text-xs text-slate-300 font-mono leading-relaxed">
                        {mod.description}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400 truncate">{mod.subtitle}</span>
                      {isMaintenance ? (
                        <span className="font-bold text-[#FDCC0D] whitespace-nowrap shrink-0">
                          En Calibración
                        </span>
                      ) : (
                        <span
                          className="font-extrabold flex items-center gap-1.5 whitespace-nowrap shrink-0 group-hover:translate-x-1 transition-transform"
                          style={{ color: activeStation.themeColor }}
                        >
                          <span>{mod.actionLabel}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* 3. Complete 6-Pillar Matrix View (Only rendered when user explicitly clicks to expand) */}
      {viewMode === 'ALL_PILLARS_MATRIX' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {pillarStations.map((station) => {
            const cardColorRgb = hexToRgbStr(station.themeColor);
            const isActive = station.id === activePillarId;
            const visibleModules = station.modules.filter((m) => isHubModuleVisible(m.id));

            return (
              <div
                key={station.id}
                className="sgx-crystal-card p-5 sm:p-6 flex flex-col justify-between space-y-5"
                style={{
                  borderColor: isActive ? station.themeColor : `rgba(${cardColorRgb}, 0.45)`,
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={station.iconUrl}
                        alt={station.name}
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 object-contain shrink-0"
                      />
                      <div>
                        <div
                          className="text-xs font-mono font-extrabold tracking-wider"
                          style={{ color: station.themeColor }}
                        >
                          {station.name}
                        </div>
                        <h3 className="text-base font-bold text-white font-['Orbitron',sans-serif]">
                          {station.title}
                        </h3>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 font-mono leading-relaxed">
                    {station.description}
                  </p>

                  {/* Clickable Module List inside each Pillar */}
                  <div className="space-y-1.5 pt-2">
                    <div className="text-[11px] font-mono text-slate-400 font-bold">
                      Módulos Activos ({visibleModules.length}):
                    </div>
                    {visibleModules.map((m) => {
                      const MIcon = m.icon;
                      const mStatus = getHubModuleStatus(m.id);
                      const isMaint = mStatus === 'MAINTENANCE';
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (isMaint) {
                              playUiChirp(380);
                              return;
                            }
                            handleDockPillar(station.id);
                            m.onLaunch();
                          }}
                          className={`w-full px-3 py-2 bg-black/50 hover:bg-slate-900 border border-white/10 hover:border-cyan-400/60 flex items-center justify-between gap-2 text-left text-xs font-mono text-slate-200 hover:text-white transition-colors ${
                            isMaint ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <MIcon className="w-3.5 h-3.5 shrink-0" style={{ color: station.themeColor }} />
                            <span className="truncate">{m.title}</span>
                          </div>
                          {isMaint ? (
                            <span className="text-[9px] text-[#FDCC0D] font-bold shrink-0">PRÓX.</span>
                          ) : (
                            <ArrowRight className="w-3 h-3 shrink-0 text-slate-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleDockPillar(station.id);
                      setViewMode('DOCKED_STATION');
                    }}
                    className="w-full py-2 px-3 text-xs font-mono font-extrabold text-black flex items-center justify-center gap-1.5 cursor-pointer transition-transform hover:scale-[1.02]"
                    style={{
                      backgroundColor: station.themeColor,
                      clipPath: 'polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)',
                    }}
                  >
                    <span>Acoplar Estación {station.name}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
