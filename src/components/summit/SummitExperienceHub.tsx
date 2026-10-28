import { pillarIcon } from '../../lib/sgxPillars';
import { pillarInk } from '../../lib/sgxPillars';
import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Orbit,
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
import { PILLAR_BY_KEY, PillarKey } from '../../lib/sgxPillars';
import { navigateToPillar } from '../../immersion/navigation';

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
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant, selectPillar } = useTenantTheme();
  const { t } = useLanguage();
  const { setIsProfileModalOpen, recordActivity } = usePilotProfile();
  const { isHubModuleVisible, getHubModuleStatus } = useSummitFeatures();

  const [activePillarId, setActivePillarId] = useState<SgxCorePillarId>(() =>
    resolvePillarFromTenantId(tenant.pillarId || tenant.id)
  );
  // No pillar is picked until the visitor picks one (or a link names it).
  const [pillarChosen, setPillarChosen] = useState<boolean>(() => {
    try { return !!new URLSearchParams(window.location.search).get('pillar'); } catch { return false; }
  });
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
    setPillarChosen(true);
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
  const rawPillarStations: PillarStationDefinition[] = [
    {
      id: 'STORY',
      name: 'SGX.STORY',
      title: (es ? 'Identidad, Narrativa & Reliquias 3D' : 'Identity, Narrative & 3D Relics'),
      subtitle: (es ? 'Story opt.glb • Manifiesto • Avatar Studio 3D (+200 XP) • SGX Pass' : 'Story opt.glb • Manifesto • 3D Avatar Studio (+200 XP) • SGX Pass'),
      description:
        (es ? 'El origen conceptual de Spatialgineers ("Ingeniando Imaginación, Construyendo Realidades"). Inspecciona la escultura oficial Story opt.glb, construye tu avatar (+200 XP) y desbloquea sellos en tu SGX Pass.' : 'The conceptual origin of Spatialgineers ("Engineering Imagination, Building Realities"). Inspect the official Story opt.glb sculpture, build your avatar (+200 XP) and unlock stamps on your SGX Pass.'),
      icon: Boxes,
      iconUrl: pillarIcon('STORY'),
      themeColor: pillarInk('STORY'),
      physicsDescription: (es ? 'Física: Brasas Doradas Ascendentes · Audio: Acorde Lydian 432Hz' : 'Physics: Rising Golden Embers · Audio: 432Hz Lydian Chord'),
      modules: [
        {
          id: 'mod_manifesto',
          title: (es ? 'Manifiesto de los 6 Pilares SGX' : 'Manifesto of the 6 SGX Pillars'),
          subtitle: (es ? 'Filosofía Tecnocreativa & Casos Reales' : 'Tech-Creative Philosophy & Real Cases'),
          description:
            (es ? 'Explora a fondo la arquitectura conceptual de Spatialgineers, despliegues previos y visión del ecosistema XR.' : 'Dive into the Spatialgineers conceptual architecture, past deployments and the vision for the XR ecosystem.'),
          xpReward: '+75 XP',
          actionLabel: (es ? 'Abrir Manifiesto' : 'Open Manifesto'),
          icon: Boxes,
          onLaunch: () => onSelectSection('PILLARS_MANIFESTO'),
        },
        {
          id: 'mod_avatar',
          title: 'Avatar Studio 3D',
          subtitle: (es ? 'Generador Oficial de Identidad de Piloto' : 'Official Pilot Identity Generator'),
          description:
            (es ? 'Personaliza tu insignia y avatar cibernético para las salas de networking, leaderboard y acreditación oficial del Summit.' : 'Customize your badge and cyber avatar for the networking rooms, the leaderboard and official Summit accreditation.'),
          xpReward: '+200 XP',
          actionLabel: (es ? 'Crear Avatar (+200 XP)' : 'Create Avatar (+200 XP)'),
          icon: User,
          onLaunch: () => {
            if (onOpenAvatarGenerator) onOpenAvatarGenerator();
            else window.dispatchEvent(new CustomEvent('sgx:open_avatar'));
          },
        },
        {
          id: 'mod_passport',
          title: (es ? 'Reactor de misiones' : 'Mission Reactor'),
          subtitle: (es ? 'Misiones por pilar & sellos en tu SGX Pass' : 'Missions by pillar & stamps on your SGX Pass'),
          description:
            (es ? 'Cada pilar tiene 2 o 3 misiones. Complétalas y el pilar queda sellado en tu pase. El XP se gasta en la Tienda del Reactor sin bajar de rango.' : 'Each pillar has 2 or 3 missions. Complete them and the pillar is stamped on your pass. XP is spent in the Reactor Store without lowering your rank.'),
          xpReward: '+60–250 XP',
          actionLabel: (es ? 'Abrir Reactor' : 'Open Reactor'),
          icon: Award,
          onLaunch: () => {
            if (onOpenPassport) onOpenPassport();
            else window.dispatchEvent(new CustomEvent('sgx:open_passport'));
          },
        },
        {
          id: 'mod_pilot_profile',
          title: (es ? 'Bitácora de Piloto & Rango XP' : 'Pilot Log & XP Rank'),
          subtitle: (es ? 'Estadísticas del Fin de Semana' : 'Weekend Stats'),
          description:
            (es ? 'Consulta tu nivel actual, historial de interacciones en vivo y desglose de puntos acumulados.' : 'Check your current level, live interaction history and a breakdown of your points.'),
          xpReward: (es ? 'PERFIL ACTIVO' : 'ACTIVE PROFILE'),
          actionLabel: (es ? 'Ver Bitácora' : 'View Log'),
          icon: ShieldCheck,
          onLaunch: () => {
            playUiChirp(620);
            setIsProfileModalOpen(true);
          },
        },
        {
          id: 'mod_relic_studio',
          title: (es ? 'Inspector Holográfico de Reliquias .GLB' : 'Holographic .GLB Relic Inspector'),
          subtitle: (es ? 'Laboratorio de Materiales PBR & Shaders' : 'PBR Materials & Shaders Lab'),
          description:
            (es ? 'Inspecciona las esculturas 3D oficiales de Spatialgineers sin salir del visor, alternando entre Cristal PBR, Wireframe y Oro Solar.' : 'Inspect the official Spatialgineers 3D sculptures without leaving the viewer, switching between PBR Crystal, Wireframe and Solar Gold.'),
          xpReward: '+40 XP',
          actionLabel: (es ? 'Activar Inspector 3D' : 'Activate 3D Inspector'),
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
      title: (es ? 'Exposición 360°, SGX.Match & Alianzas Oficiales' : '360° Exhibition, SGX.Match & Official Partnerships'),
      subtitle: (es ? 'Showcase opt.glb • Recorrido 360° Chroma • Speed Pitching • QR (+50 XP)' : 'Showcase opt.glb • Chroma 360° Tour • Speed Pitching • QR (+50 XP)'),
      description:
        (es ? 'Donde los proyectos, marcas aliadas y fundadores se conectan con el mundo. Recorre en 360° Chroma Space Studios, la sede del Día 3, haz matchmaking estratégico y escanea códigos QR (+50 XP).' : 'Where projects, partner brands and founders connect with the world. Tour Chroma Space Studios, the Day 3 venue, in 360°, do strategic matchmaking and scan QR codes (+50 XP).'),
      icon: Building2,
      iconUrl: pillarIcon('SHOWCASE'),
      themeColor: pillarInk('SHOWCASE'),
      physicsDescription: (es ? 'Física: Galería Holográfica Panorámica · Audio: Resonancia Cristalina Cian' : 'Physics: Panoramic Holographic Gallery · Audio: Cyan Crystal Resonance'),
      modules: [
        {
          id: 'mod_map_360',
          title: (es ? 'Recorrido 360° Chroma Space Studios' : 'Chroma Space Studios 360° Tour'),
          subtitle: (es ? 'Recorrido Espacial por la Sede Híbrida en San Juan' : 'Spatial Tour of the Hybrid Venue in San Juan'),
          description:
            (es ? 'Explora en 360° los sets de producción virtual, escenario principal y zonas de networking de Chroma Space Studios, la sede del Día 3.' : 'Explore in 360° the virtual production sets, main stage and networking areas of Chroma Space Studios, the Day 3 venue.'),
          xpReward: '+90 XP',
          actionLabel: (es ? 'Entrar al recorrido 360°' : 'Enter the 360° tour'),
          icon: Globe,
          onLaunch: () => onSelectSection('MAP_360'),
        },
        {
          id: 'mod_sgx_match',
          title: (es ? 'SGX.Match — Speed Pitching & Alianzas' : 'SGX.Match — Speed Pitching & Partnerships'),
          subtitle: (es ? 'Emparejamiento Inteligente B2B & Creadores' : 'Smart B2B & Creator Matchmaking'),
          description:
            (es ? 'Conecta con fundadores, estudios XR, inversionistas y líderes técnicos para agendar reuniones durante el Summit.' : 'Connect with founders, XR studios, investors and technical leaders to schedule meetings during the Summit.'),
          xpReward: '+150 XP',
          actionLabel: (es ? 'Abrir SGX.Match' : 'Open SGX.Match'),
          icon: Zap,
          onLaunch: () => onSelectSection('ENTREPRENEUR_MATCH'),
        },
        {
          id: 'mod_sponsors_hub',
          title: (es ? `Partners Oficiales & Matriz de Patrocinio (${sponsorCount})` : `Official Partners & Sponsorship Matrix (${sponsorCount})`),
          subtitle: (es ? 'Tiers 1–5 • Las marcas viven dentro de la experiencia' : 'Tiers 1–5 • Brands live inside the experience'),
          description:
            (es ? 'Explora los 5 Tiers de auspicio. Solo se publican marcas confirmadas por escrito.' : 'Explore the 5 sponsorship Tiers. Only brands confirmed in writing are published.'),
          xpReward: 'PARTNERS',
          actionLabel: (es ? 'Ver Partners & Tiers' : 'View Partners & Tiers'),
          icon: Building2,
          onLaunch: () => onSelectSection('SPONSORS_HUB'),
        },
        {
          id: 'mod_qr_scanner',
          title: (es ? 'Escáner de SGX Pass' : 'SGX Pass Scanner'),
          subtitle: (es ? 'Rolodex mutuo (+50 XP por intercambio)' : 'Mutual Rolodex (+50 XP per exchange)'),
          description:
            (es ? 'Escanea el SGX Pass de otra persona: tú quedas en su Rolodex y esa persona en el tuyo. En el Día 3 es el bloque de networking.' : 'Scan another person\'s SGX Pass: you\'re saved in their Rolodex and they\'re saved in yours. On Day 3 it\'s the networking block.'),
          xpReward: '+50 XP',
          actionLabel: (es ? 'Escanear QR (+50 XP)' : 'Scan QR (+50 XP)'),
          icon: ScanLine,
          onLaunch: () => {
            if (onOpenQrScanner) onOpenQrScanner();
            else window.dispatchEvent(new CustomEvent('sgx:open_qr_scanner'));
          },
        },
        {
          id: 'mod_social_stream',
          title: 'Live Social Stream & Radar #SGX2026',
          subtitle: (es ? 'Muro en Vivo de Instagram, X & Threads' : 'Live Instagram, X & Threads Wall'),
          description:
            (es ? 'Visualiza el pulso social del evento proyectado en tiempo real en las pantallas LED del venue.' : 'See the event\'s social pulse shown in real time on the venue\'s LED screens.'),
          xpReward: '+50 XP',
          actionLabel: (es ? 'Abrir Social Radar' : 'Open Social Radar'),
          icon: Instagram,
          onLaunch: () => onSelectSection('SOCIAL_STREAM'),
        },
        {
          id: 'mod_credential_generator',
          title: 'SGX Pass',
          subtitle: (es ? 'Registro + Holo Card + credencial en uno' : 'Registration + Holo Card + credential in one'),
          description:
            (es ? 'Forja tu pase en un minuto: nombre, pilar y piloto. Gana sellos completando las misiones de cada pilar.' : 'Forge your pass in a minute: name, pillar and pilot. Earn stamps by completing each pillar\'s missions.'),
          xpReward: '+120 XP',
          actionLabel: (es ? 'Abrir mi pase' : 'Open my pass'),
          icon: Award,
          onLaunch: () => onSelectSection('CREDENTIAL_GENERATOR'),
        },
      ],
    },
    {
      id: 'SPARK',
      name: 'SGX.SPARK',
      title: (es ? 'Simulación de Dron con Colisiones 3D & Gamificación' : 'Drone Simulation with 3D Collisions & Gamification'),
      subtitle: (es ? 'Spark Opt.glb • Dron 3D con Física Box3 • Premios XP • Votación Kahoot (+25 XP)' : 'Spark Opt.glb • 3D Drone with Box3 Physics • XP Prizes • Kahoot Voting (+25 XP)'),
      description:
        (es ? 'Exploración creativa y dinámicas participativas. Pilotea el dron táctico, participa en las rondas de votación estilo Kahoot (+25 XP) y canjea premios oficiales del Summit.' : 'Creative exploration and participatory dynamics. Fly the tactical drone, join the Kahoot-style voting rounds (+25 XP) and redeem official Summit prizes.'),
      icon: Zap,
      iconUrl: pillarIcon('SPARK'),
      themeColor: pillarInk('SPARK'),
      physicsDescription: (es ? 'Física: Vórtice Cinético Centrífugo · Audio: Sintetizador Arpegiado Ámbar' : 'Physics: Centrifugal Kinetic Vortex · Audio: Amber Arpeggiated Synth'),
      modules: [
        {
          id: 'mod_drone_sim',
          title: (es ? 'Simulador de Dron 3D (Motor de Colisiones Box3)' : '3D Drone Simulator (Box3 Collision Engine)'),
          subtitle: (es ? 'Colisiones contra Edificios, Islas, Túneles & Barrel Roll [Q]' : 'Collisions with Buildings, Islands, Tunnels & Barrel Roll [Q]'),
          description:
            (es ? 'Vuela a través de San Juan Cyberpunk, Archipiélago Tropical y Túnel Cuántico con colisiones físicas reales, rebote vectorial y chispas 3D.' : 'Fly through Cyberpunk San Juan, the Tropical Archipelago and the Quantum Tunnel with real physical collisions, vector bounce and 3D sparks.'),
          xpReward: '+250 XP',
          actionLabel: (es ? 'Volar Dron 3D Ahora' : 'Fly the 3D Drone Now'),
          icon: Gamepad2,
          onLaunch: () => onSelectSection('EMBEDS_GAMES'),
        },
        {
          id: 'mod_rewards_store',
          title: (es ? 'Tienda de Premios Oficiales & Canje XP' : 'Official Prize Store & XP Redemption'),
          subtitle: (es ? 'Cupones, suscripción 3 meses, sesión Grit y premio mayor' : 'Coupons, 3-month subscription, Grit session and the grand prize'),
          description:
            (es ? 'Canjea tus XP por cupones de auspiciadores, 3 meses en plataformas SGX, sesión "Grit" con artistas (por confirmar) o el premio mayor "Spatialgineers activa tu evento".' : 'Redeem your XP for sponsor coupons, 3 months on SGX platforms, a "Grit" session with artists (TBC) or the grand prize "Spatialgineers activa tu evento" (Spatialgineers activates your event).'),
          xpReward: (es ? 'PREMIOS XP' : 'XP PRIZES'),
          actionLabel: (es ? 'Abrir Tienda de Premios' : 'Open Prize Store'),
          icon: Trophy,
          onLaunch: () => {
            if (onOpenRewardsStore) onOpenRewardsStore();
            else window.dispatchEvent(new CustomEvent('sgx:open_rewards'));
          },
        },
        {
          id: 'mod_play_vote',
          title: (es ? 'Consola de Votación Estilo Kahoot (/play)' : 'Kahoot-Style Voting Console (/play)'),
          subtitle: (es ? 'Rondas en Directo & Trivias (+25 XP por voto)' : 'Live Rounds & Trivia (+25 XP per vote)'),
          description:
            (es ? 'Vota en tiempo real durante los bloques de pilares, intermedios y conversaciones de industria para sumar +25 XP por voto.' : 'Vote in real time during the pillar blocks, interludes and industry conversations to earn +25 XP per vote.'),
          xpReward: (es ? '+25 XP / VOTO' : '+25 XP / VOTE'),
          actionLabel: (es ? 'Abrir Consola /play' : 'Open /play Console'),
          icon: Zap,
          onLaunch: () => {
            if (onNavigateToPlayVote) onNavigateToPlayVote();
            else onSelectSection('EMBEDS_GAMES');
          },
        },
      ],
    },
    {
      id: 'STAGE',
      name: 'SGX.STAGE',
      title: (es ? 'Transmisión, escenario & sintetizador en vivo' : 'Live broadcast, stage & synthesizer'),
      subtitle: (es ? 'Stage opt.glb • Agenda Run of Show • Salas de transmisión • Speakers' : 'Stage opt.glb • Run of Show Agenda • Broadcast rooms • Speakers'),
      description:
        (es ? 'La energía del espectáculo en tiempo real. Consulta el Run of Show oficial de los 3 días, entra a las salas de transmisión (YouTube Live, con Los Mismos TV transmitiendo junto a nosotros) y dispara frecuencias armónicas en vivo.' : 'The energy of the show in real time. Check the official 3-day Run of Show, enter the broadcast rooms (YouTube Live, with Los Mismos TV streaming alongside us) and trigger harmonic frequencies live.'),
      icon: Tv,
      iconUrl: pillarIcon('STAGE'),
      themeColor: pillarInk('STAGE'),
      physicsDescription: (es ? 'Física: Ondas Acústicas Rítmicas · Audio: Armónicos de Escenario en Vivo' : 'Physics: Rhythmic Acoustic Waves · Audio: Live Stage Harmonics'),
      modules: [
        {
          id: 'mod_agenda',
          title: (es ? 'Agenda Oficial Run of Show (3 Días)' : 'Official Run of Show Agenda (3 Days)'),
          subtitle: (es ? 'Cronograma Minuto a Minuto v2026.10 & Mi Agenda' : 'Minute-by-Minute Schedule v2026.10 & My Agenda'),
          description:
            (es ? 'Explora los bloques de los 6 pilares y 8 Initiates (Día 1), Día de la Industria (Día 2) y el SGX Showcase híbrido (Chroma Space Studios) con los 6 Initiates seleccionados (Día 3).' : 'Explore the blocks for the 6 pillars and 8 Initiates (Day 1), Industry Day (Day 2) and the hybrid SGX Showcase (Chroma Space Studios) with the 6 selected Initiates (Day 3).'),
          xpReward: '+50 XP',
          actionLabel: (es ? 'Explorar Agenda' : 'Explore Agenda'),
          icon: Calendar,
          onLaunch: () => onSelectSection('AGENDA'),
        },
        {
          id: 'mod_broadcast',
          title: (es ? 'Salas de transmisión' : 'Broadcast rooms'),
          subtitle: 'YouTube Live • LinkedIn Live • Facebook Live • Los Mismos TV',
          description:
            (es ? 'Sintoniza los canales de transmisión en vivo, cámaras multicámara del escenario y cobertura oficial.' : 'Tune in to the live broadcast channels, multi-camera stage feeds and official coverage.'),
          xpReward: (es ? 'EN VIVO' : 'LIVE'),
          actionLabel: (es ? 'Entrar a las salas' : 'Enter the rooms'),
          icon: Radio,
          onLaunch: () => onSelectSection('BROADCAST_ROOMS'),
        },
        {
          id: 'mod_speakers',
          title: (es ? 'Directorio 3D de Speakers & Artistas' : '3D Speakers & Artists Directory'),
          subtitle: (es ? 'Hosts, personas invitadas y artistas confirmados por escrito' : 'Hosts, guests and artists confirmed in writing'),
          description:
            (es ? 'Conoce a Danelson ("The Highgineer"), Ricardo ("Lightning Fingers"), personas invitadas de cada pilar, artistas y los 8 Initiates del Guild.' : 'Meet Danelson ("The Highgineer"), Ricardo ("Lightning Fingers"), each pillar\'s guests, the artists and the Guild\'s 8 Initiates.'),
          xpReward: '+60 XP',
          actionLabel: (es ? 'Ver Speakers 3D' : 'View 3D Speakers'),
          icon: Users,
          onLaunch: () => onSelectSection('SPEAKERS'),
        },
        {
          id: 'mod_visualizer_stage',
          title: (es ? 'Escenario 3D Reactivo SGX' : 'SGX Reactive 3D Stage'),
          subtitle: (es ? 'Motor Visual Three.js en Tiempo Real' : 'Real-Time Three.js Visual Engine'),
          description:
            (es ? 'Visualizador escénico de pantalla completa sincronizado con la música en vivo y las reacciones de la audiencia.' : 'Full-screen stage visualizer synced with the live music and audience reactions.'),
          xpReward: 'THREE.JS LIVE',
          actionLabel: (es ? 'Abrir Escenario 3D' : 'Open 3D Stage'),
          icon: Tv,
          onLaunch: () => {
            if (onNavigateToVisualizer) onNavigateToVisualizer();
            else onSelectSection('BROADCAST_ROOMS');
          },
        },
        {
          id: 'mod_stage_synth',
          title: (es ? 'Mesa de Frecuencias & Pulso Acústico 432Hz' : 'Frequency Desk & 432Hz Acoustic Pulse'),
          subtitle: (es ? 'Sintetizador Espacial Web Audio en Directo' : 'Live Web Audio Spatial Synthesizer'),
          description:
            (es ? 'Modula en tiempo real las ondas armónicas del universo 3D y sincroniza destellos lumínicos con el núcleo SGX.' : 'Modulate the 3D universe\'s harmonic waves in real time and sync light flashes with the SGX core.'),
          xpReward: '+65 XP',
          actionLabel: (es ? 'Abrir Sintetizador' : 'Open Synthesizer'),
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
      title: (es ? 'SGX Guild Ranked Trials, Telemetría & Datos' : 'SGX Guild Ranked Trials, Telemetry & Data'),
      subtitle: (es ? 'System opt.glb • 8 Initiates Activos (Día 1) • 6 Presentan en el Día 3' : 'System opt.glb • 8 Active Initiates (Day 1) • 6 Present on Day 3'),
      description:
        (es ? 'La columna vertebral de ingeniería y talento técnico. Audita los portafolios de los 8 Initiates activos del Día 1 (8 min c/u) y sigue la selección de los 6 Initiates que presentan en el Día 3 (5 min c/u).' : 'The backbone of engineering and technical talent. Review the portfolios of the 8 active Initiates on Day 1 (8 min each) and follow the selection of the 6 Initiates who present on Day 3 (5 min each).'),
      icon: Activity,
      iconUrl: pillarIcon('SYSTEM'),
      themeColor: pillarInk('SYSTEM'),
      physicsDescription: (es ? 'Física: Retícula Orbital de Precisión · Audio: Pulso Cuántico de Telemetría' : 'Physics: Precision Orbital Grid · Audio: Quantum Telemetry Pulse'),
      modules: [
        {
          id: 'mod_guild_trials',
          title: 'SGX Guild Initiates & Ranked Trials',
          subtitle: (es ? '8 Initiates Activos en Día 1 → 6 Seleccionados para el Día 3' : '8 Active Initiates on Day 1 → 6 Selected for Day 3'),
          description:
            (es ? 'Inspecciona los perfiles técnicos, portafolios de 8 minutos del Día 1 y el ranking de los 6 Initiates elegidos para presentar el domingo en el SGX Showcase.' : 'Inspect the technical profiles, the Day 1 8-minute portfolios and the ranking of the 6 Initiates chosen to present on Sunday at the SGX Showcase.'),
          xpReward: '+100 XP',
          actionLabel: (es ? 'Ver Los 8 Initiates' : 'View the 8 Initiates'),
          icon: Award,
          onLaunch: () => onSelectSection('GUILD'),
        },
        {
          id: 'mod_speaker_portal',
          title: (es ? 'Consola de Registro de Speakers & Artistas' : 'Speakers & Artists Registration Console'),
          subtitle: (es ? 'Autogestión de Ponentes Oficiales' : 'Self-Service for Official Speakers'),
          description:
            (es ? 'Portal técnico para que speakers y creadores invitados actualicen su ficha técnica, sesión y enlaces.' : 'Technical portal for speakers and guest creators to update their technical sheet, session and links.'),
          xpReward: (es ? 'PORTAL OFICIAL' : 'OFFICIAL PORTAL'),
          actionLabel: (es ? 'Abrir Portal Speaker' : 'Open Speaker Portal'),
          icon: Users,
          onLaunch: () => {
            if (onOpenSpeakerPortal) onOpenSpeakerPortal();
            else onSelectSection('SPEAKERS');
          },
        },
        {
          id: 'mod_leaderboard_stats',
          title: (es ? 'Leaderboard & Métricas de Piloto' : 'Leaderboard & Pilot Metrics'),
          subtitle: (es ? 'Clasificación General de Participación' : 'Overall Participation Ranking'),
          description:
            (es ? 'Verifica tu posición en la tabla de líderes del ecosistema Spatialgineers rumbo a los premios mayores del Día 3.' : 'Check your position on the Spatialgineers ecosystem leaderboard on the road to the Day 3 grand prizes.'),
          xpReward: 'RANKING',
          actionLabel: (es ? 'Ver Mi Rango' : 'View My Rank'),
          icon: Trophy,
          onLaunch: () => {
            playUiChirp(620);
            setIsProfileModalOpen(true);
          },
        },
        {
          id: 'mod_telemetry_sandbox',
          title: (es ? 'Simulador de Telemetría & Nodos Cuánticos' : 'Telemetry & Quantum Nodes Simulator'),
          subtitle: (es ? 'Diagnóstico en Vivo del SGX Framework' : 'Live SGX Framework Diagnostics'),
          description:
            (es ? 'Ejecuta pruebas de pulso de red, latencia de los 7 nodos GLB y calibración gravitacional en tiempo real.' : 'Run network pulse tests, latency checks on the 7 GLB nodes and real-time gravitational calibration.'),
          xpReward: '+55 XP',
          actionLabel: (es ? 'Abrir Telemetría' : 'Open Telemetry'),
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
      title: (es ? 'Convergencia Maestra, Comunidad & Registro' : 'Master Convergence, Community & Registration'),
      subtitle: (es ? 'Synthesize opt.glb • Foros de Networking • SGX Pass' : 'Synthesize opt.glb • Networking Forums • SGX Pass'),
      description:
        (es ? 'La unión armónica de los 6 Pilares en un solo organismo vivo. Únete a los foros de conversación en tiempo real, descarga tu pase oficial en PDF y sincroniza tu participación.' : 'The harmonious union of the 6 Pillars in a single living organism. Join the real-time conversation forums, download your official pass as a PDF and sync your participation.'),
      icon: Layers,
      iconUrl: pillarIcon('SYNTHESIZE'),
      themeColor: pillarInk('SYNTHESIZE'),
      physicsDescription: (es ? 'Física: Convergencia Dual Cobre/Oro · Audio: Sinfonía Maestra Unificada' : 'Physics: Dual Copper/Gold Convergence · Audio: Unified Master Symphony'),
      modules: [
        {
          id: 'mod_networking_chat',
          title: (es ? 'Foros del Summit & Chat de Comunidad' : 'Summit Forums & Community Chat'),
          subtitle: (es ? 'Canales Temáticos en Tiempo Real' : 'Real-Time Themed Channels'),
          description:
            (es ? 'Debate con otros pilotos, comparte recursos de Roblox/WebXR y coordina colaboraciones en directo.' : 'Talk with other pilots, share Roblox/WebXR resources and coordinate collaborations live.'),
          xpReward: '+80 XP',
          actionLabel: (es ? 'Entrar al Foro Chat' : 'Enter the Forum Chat'),
          icon: MessageSquare,
          onLaunch: () => onSelectSection('NETWORKING'),
        },
        {
          id: 'mod_sponsor_apply',
          title: (es ? 'Postular Marca como Patrocinador' : 'Apply Your Brand as a Sponsor'),
          subtitle: (es ? 'Convocatoria Abierta Tiers 1 al 5' : 'Open Call Tiers 1 to 5'),
          description:
            (es ? 'Integra tu marca dentro del ecosistema interactivo del Summit con uno de los 5 Tiers.' : 'Bring your brand into the Summit\'s interactive ecosystem with one of the 5 Tiers.'),
          xpReward: (es ? 'ALIANZA B2B' : 'B2B PARTNERSHIP'),
          actionLabel: (es ? 'Solicitar Dossier / Tier' : 'Request Dossier / Tier'),
          icon: Building2,
          onLaunch: () => onOpenSponsors('tier_3'),
        },
      ],
    },
  ];

  // Each hub module lives in the same home pillar the menus use (lib/sgxPillars), and every
  // pillar opens with a door to its full station page.
  const HUB_MODULE_HOME: Record<string, SgxCorePillarId> = {
    mod_passport: 'SPARK',
    mod_pilot_profile: 'SPARK',
    mod_relic_studio: 'SHOWCASE',
    mod_sponsor_apply: 'SHOWCASE',
    mod_social_stream: 'STORY',
    mod_qr_scanner: 'SYSTEM',
    mod_credential_generator: 'SYSTEM',
    mod_speaker_portal: 'STAGE',
    mod_sgx_match: 'SYNTHESIZE',
    mod_guild_trials: 'SYNTHESIZE',
  };
  const allHubModules = rawPillarStations.flatMap((st) => st.modules.map((m) => ({ m, from: st.id })));
  const pillarStations: PillarStationDefinition[] = rawPillarStations.map((st) => {
    const def = PILLAR_BY_KEY[st.id as PillarKey];
    const modules = allHubModules.filter((x) => (HUB_MODULE_HOME[x.m.id] || x.from) === st.id).map((x) => x.m);
    const door: PillarModuleItem = {
      id: `mod_station_${def.slug}`,
      title: (es ? `Estación 0${def.index} · ${def.name}` : `Station 0${def.index} · ${def.name}`),
      subtitle: (es ? 'Programa de los 3 días, módulos y tu progreso' : 'The 3-day program, modules and your progress'),
      description: `${def.line.es} ${def.scope.es}`,
      actionLabel: (es ? 'Entrar a la estación' : 'Enter the station'),
      icon: Orbit,
      onLaunch: () => navigateToPillar(def.slug),
    };
    return {
      ...st,
      name: def.id,
      title: def.title.es,
      subtitle: modules.slice(0, 4).map((m) => m.title.split(' (')[0]).join(' • '),
      description: `${def.line.es} ${def.scope.es}`,
      iconUrl: def.iconUrl,
      modules: [door, ...modules],
    };
  });

  const activeStation =
    pillarStations.find(s => s.id === activePillarId) || pillarStations[0];
  const activeColorRgb = hexToRgbStr(activeStation.themeColor);

  return (
    <div id="summit-experience-hub" className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* 1. Full-Bleed Interactive 3D Orbital Core Reactor with 4 Circular 3D Clocks & Angled HUD Wings */}
      <SgxOrbitalCore3D
        activePillarId={activePillarId}
        noSelection={!pillarChosen}
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
            {es ? 'Toca cualquier escultura ' : 'Tap any '}<strong className="text-[#FDCC0D]">.GLB</strong>{es ? ' en el visor 3D o despliega el catálogo completo bajo demanda:' : ' sculpture in the 3D viewer or open the full catalog on demand:'}
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
              ? (es ? `Ocultar Estación ${activeStation.id} ▲` : `Hide Station ${activeStation.id} ▲`)
              : (es ? `Tarjetas de ${activeStation.name} (${activeStation.modules.length}) ▼` : `${activeStation.name} Cards (${activeStation.modules.length}) ▼`)}
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
              ? (es ? 'Ocultar Mapa de 6 Pilares ▲' : 'Hide 6 Pillars Map ▲')
              : (es ? 'Mapa Completo (27 Módulos) ▼' : 'Full Map (27 Modules) ▼')}
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
                  {es ? 'LABORATORIO INTERACTIVO EN VIVO · SIN SALTO DE PÁGINA' : 'LIVE INTERACTIVE LAB · NO PAGE JUMP'}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white font-['Orbitron',sans-serif]">
                  {activeHoloSandbox === 'HARMONIC_SYNTH_LAB'
                    ? (es ? 'Mesa de Sintetizador Espacial 432Hz & Ondas Armónicas' : '432Hz Spatial Synth Desk & Harmonic Waves')
                    : activeHoloSandbox === 'TELEMETRY_MATRIX'
                    ? (es ? 'Diagnóstico Cuántico de Nodos .GLB & Telemetría SGX' : 'Quantum .GLB Node Diagnostics & SGX Telemetry')
                    : (es ? 'Estudio Holográfico de Reliquias 3D (.GLB)' : 'Holographic 3D Relics Studio (.GLB)')}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveHoloSandbox('NONE')}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-white/20 text-xs font-mono text-slate-200 cursor-pointer"
            >
              {es ? 'Cerrar Laboratorio ✕' : 'Close Lab ✕'}
            </button>
          </div>

          {activeHoloSandbox === 'HARMONIC_SYNTH_LAB' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              {[
                { hz: 288, name: (es ? 'Raíz Cósmica (D4)' : 'Cosmic Root (D4)'), desc: (es ? 'Sub-bajo gravitacional' : 'Gravitational sub-bass') },
                { hz: 432, name: (es ? 'Armónico Solar (A4)' : 'Solar Harmonic (A4)'), desc: (es ? 'Sintonía base SGX.STORY' : 'SGX.STORY base tuning') },
                { hz: 528, name: (es ? 'Resonancia Cian (C5)' : 'Cyan Resonance (C5)'), desc: (es ? 'Pulso cristalino SHOWCASE' : 'SHOWCASE crystal pulse') },
                { hz: 648, name: (es ? 'Quinta Orbital (E5)' : 'Orbital Fifth (E5)'), desc: (es ? 'Expansión de anillos 3D' : '3D ring expansion') },
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
                  <div>{es ? 'Estado de los 7 Nodos .GLB: ' : 'Status of the 7 .GLB Nodes: '}<strong className="text-[#00DDFF]">{es ? 'SINCRONIZADOS (60 FPS)' : 'SYNCED (60 FPS)'}</strong></div>
                  <div>{es ? 'Pulsos de Calibración Emitidos: ' : 'Calibration Pulses Sent: '}<strong className="text-[#FDCC0D] tabular-nums">{telemetryPulseCount}</strong></div>
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
                  {es ? 'Emitir Pulso de Diagnóstico (+30 XP)' : 'Send Diagnostic Pulse (+30 XP)'}
                </button>
              </div>

              {/* Embedded Full Live Summit Analytics & Telemetry View */}
              <SummitAnalyticsView />
            </div>
          )}

          {activeHoloSandbox === 'RELIC_INSPECTOR' && (
            <div className="text-xs font-mono text-slate-300 leading-relaxed">
              {es ? 'Usa la pestaña ' : 'Use the '}<strong className="text-[#FDCC0D]">{es ? 'Laboratorio 3D' : '3D Lab'}</strong>{es ? ' dentro del Panel Holográfico derecho del visor 3D superior para explorar los 7 archivos ' : ' tab inside the right Holographic Panel of the 3D viewer above to explore the 7 files '}<code className="text-cyan-300">.glb</code>{es ? ' en su color e iluminación original.' : ' in their original color and lighting.'}
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
                    {es ? 'ESTACIÓN ACOPLADA: ' : 'DOCKED STATION: '}{activeStation.name}
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
                <span>{es ? 'Siguiente Pilar Orbital' : 'Next Orbital Pillar'}</span>
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
                            {es ? '⏳ PRÓXIMAMENTE' : '⏳ COMING SOON'}
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
                          {es ? 'En Calibración' : 'Calibrating'}
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
                      {es ? 'Módulos Activos (' : 'Active Modules ('}{visibleModules.length}):
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
                            <span className="text-[9px] text-[#FDCC0D] font-bold shrink-0">{es ? 'PRÓX.' : 'SOON'}</span>
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
                    <span>{es ? 'Acoplar Estación ' : 'Dock Station '}{station.name}</span>
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
