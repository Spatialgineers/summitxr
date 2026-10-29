import React, { useState, useEffect, useCallback, lazy } from 'react';
import {
  Orbit,
  User,
  Tv,
  Zap,
  Building2,
  Boxes,
  Gamepad2,
  Trophy,
  Calendar,
  Users,
  Award,
  ScanLine,
  Radio,
  MessageSquare,
  Instagram,
  Globe,
  ShieldCheck,
  Volume2,
  BarChart3,
} from 'lucide-react';
import type { SummitSectionKey } from './sectionKeys';
import { useTenantTheme } from '../../context/TenantThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { playUiChirp, playPillarDockSound, getIsAudioMuted } from '../../lib/cyberAudioEngine';
import { usePilotProfile } from '../../context/PilotProfileContext';
import type { SgxCorePillarId } from './SgxOrbitalCore3D';
import { LazyBoundary } from '../common/LazyBoundary';
import { LazyFallback } from '../common/LazyFallback';
import { SgxDialog } from '../common/SgxDialog';
import { useSummitFeatures } from '../../context/SummitFeatureContext';
import { PILLAR_BY_KEY, PillarKey, bi } from '../../lib/sgxPillars';
import { navigateToPillar } from '../../immersion/navigation';
// three.js and the core arrive after the page shell has painted.
const SgxOrbitalCore3D = lazy(() => import('./SgxOrbitalCore3D').then((m) => ({ default: m.SgxOrbitalCore3D })));

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
  sponsorCount: number;
}

/* The tone desk: four pads, each a short Web Audio tone. */
const TONES: { hz: number; label: { es: string; en: string } }[] = [
  { hz: 288, label: { es: 'Grave', en: 'Low' } },
  { hz: 432, label: { es: 'Base', en: 'Base' } },
  { hz: 528, label: { es: 'Brillante', en: 'Bright' } },
  { hz: 648, label: { es: 'Agudo', en: 'High' } },
];

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
  sponsorCount,
}) => {
  const { language } = useLanguage();
  const es = language === 'es';
  const { tenant, selectPillar } = useTenantTheme();
  const { setIsProfileModalOpen } = usePilotProfile();
  const { isHubModuleVisible } = useSummitFeatures();

  const [activePillarId, setActivePillarId] = useState<SgxCorePillarId>(() =>
    resolvePillarFromTenantId(tenant.pillarId || tenant.id)
  );
  // No pillar is picked until the visitor picks one (or a link names it).
  const [pillarChosen, setPillarChosen] = useState<boolean>(() => {
    try { return !!new URLSearchParams(window.location.search).get('pillar'); } catch { return false; }
  });
  const [synthOpen, setSynthOpen] = useState(false);
  const [synthHz, setSynthHz] = useState<number | null>(null);
  const closeSynth = useCallback(() => setSynthOpen(false), []);

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

  // Strict logical separation of all modules into their 6 SGX Pillars in official v2026.10 order:
  // 1. STORY -> 2. SHOWCASE -> 3. SPARK -> 4. STAGE -> 5. SYSTEM -> 6. SYNTHESIZE
  const rawPillarStations: { id: SgxCorePillarId; modules: PillarModuleItem[] }[] = [
    {
      id: 'STORY',
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
          subtitle: (es ? 'Generador oficial de tu avatar XR' : 'Official XR avatar generator'),
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
          title: (es ? 'Perfil de creador y rango XP' : 'Creator profile & XP rank'),
          subtitle: (es ? 'Estadísticas del Fin de Semana' : 'Weekend Stats'),
          description:
            (es ? 'Consulta tu nivel actual, historial de interacciones en vivo y desglose de puntos acumulados.' : 'Check your current level, live interaction history and a breakdown of your points.'),
          actionLabel: (es ? 'Ver Bitácora' : 'View Log'),
          icon: ShieldCheck,
          onLaunch: () => {
            playUiChirp(620);
            setIsProfileModalOpen(true);
          },
        },
      ],
    },
    {
      id: 'SHOWCASE',
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
            (es ? 'Forja tu pase en un minuto: nombre, pilar y avatar. Gana sellos completando las misiones de cada pilar.' : 'Forge your pass in a minute: name, pillar and avatar. Earn stamps by completing each pillar\'s missions.'),
          xpReward: '+120 XP',
          actionLabel: (es ? 'Abrir mi pase' : 'Open my pass'),
          icon: Award,
          onLaunch: () => onSelectSection('CREDENTIAL_GENERATOR'),
        },
      ],
    },
    {
      id: 'SPARK',
      modules: [
        {
          id: 'mod_drone_sim',
          title: (es ? 'Simulador de dron 3D' : '3D drone simulator'),
          subtitle: (es ? 'Colisiones reales, trucos y ranking' : 'Real collisions, tricks and a leaderboard'),
          description:
            (es ? 'Maneja el dron entre edificios e islas con colisiones reales, haz trucos y sube en el ranking.' : 'Steer the drone between buildings and islands with real collisions, pull off tricks and climb the leaderboard.'),
          xpReward: '+250 XP',
          actionLabel: (es ? 'Jugar con el dron' : 'Play the drone game'),
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
          actionLabel: (es ? 'Abrir Escenario 3D' : 'Open 3D Stage'),
          icon: Tv,
          onLaunch: () => {
            if (onNavigateToVisualizer) onNavigateToVisualizer();
            else onSelectSection('BROADCAST_ROOMS');
          },
        },
        {
          id: 'mod_stage_synth',
          title: (es ? 'Mesa de tonos' : 'Tone desk'),
          subtitle: (es ? 'Cuatro tonos con Web Audio' : 'Four tones with Web Audio'),
          description:
            (es ? 'Toca cuatro tonos (288, 432, 528 y 648 Hz) generados en vivo por tu navegador.' : 'Play four tones (288, 432, 528 and 648 Hz) generated live by your browser.'),
          actionLabel: (es ? 'Abrir mesa de tonos' : 'Open the tone desk'),
          icon: Volume2,
          onLaunch: () => setSynthOpen(true),
        },
      ],
    },
    {
      id: 'SYSTEM',
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
          title: (es ? 'Leaderboard y métricas de creador' : 'Leaderboard & creator metrics'),
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
          title: (es ? 'Analíticas del Summit' : 'Summit analytics'),
          subtitle: (es ? 'Visitas, pases y actividad' : 'Visits, passes and activity'),
          description:
            (es ? 'Los números reales del Summit: visitas por región, pases forjados y actividad en la app.' : 'The Summit\'s real numbers: visits by region, forged passes and activity in the app.'),
          actionLabel: (es ? 'Ver analíticas' : 'View analytics'),
          icon: BarChart3,
          onLaunch: () => window.dispatchEvent(new CustomEvent('sgx:open_analytics')),
        },
      ],
    },
    {
      id: 'SYNTHESIZE',
      modules: [
        {
          id: 'mod_networking_chat',
          title: (es ? 'Foros del Summit & Chat de Comunidad' : 'Summit Forums & Community Chat'),
          subtitle: (es ? 'Canales Temáticos en Tiempo Real' : 'Real-Time Themed Channels'),
          description:
            (es ? 'Debate con otros creadores, comparte recursos de Roblox/WebXR y coordina colaboraciones en directo.' : 'Talk with other creators, share Roblox/WebXR resources and coordinate collaborations live.'),
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
  // pillar opens with a door to its full station page. Modules the admin disabled are left out.
  const HUB_MODULE_HOME: Record<string, SgxCorePillarId> = {
    mod_passport: 'SPARK',
    mod_pilot_profile: 'SPARK',
    mod_sponsor_apply: 'SHOWCASE',
    mod_social_stream: 'STORY',
    mod_qr_scanner: 'SYSTEM',
    mod_credential_generator: 'SYSTEM',
    mod_speaker_portal: 'STAGE',
    mod_sgx_match: 'SYNTHESIZE',
    mod_guild_trials: 'SYNTHESIZE',
  };
  const allHubModules = rawPillarStations.flatMap((st) => st.modules.map((m) => ({ m, from: st.id })));
  const pillarStations = rawPillarStations.map((st) => {
    const def = PILLAR_BY_KEY[st.id as PillarKey];
    const modules = allHubModules
      .filter((x) => (HUB_MODULE_HOME[x.m.id] || x.from) === st.id && isHubModuleVisible(x.m.id))
      .map((x) => x.m);
    const door: PillarModuleItem = {
      id: `mod_station_${def.slug}`,
      title: (es ? `Estación 0${def.index} · ${def.name}` : `Station 0${def.index} · ${def.name}`),
      subtitle: (es ? 'Programa de los 3 días, módulos y tu progreso' : 'The 3-day program, modules and your progress'),
      description: `${bi(def.line, language)} ${bi(def.scope, language)}`,
      actionLabel: (es ? 'Entrar a la estación' : 'Enter the station'),
      icon: Orbit,
      onLaunch: () => navigateToPillar(def.slug),
    };
    return { id: st.id, modules: [door, ...modules] };
  });

  const activeStation = pillarStations.find((s) => s.id === activePillarId) || pillarStations[0];

  return (
    <div id="summit-experience-hub" className="w-full h-full flex-1 min-h-0 flex flex-col overflow-hidden">
      <LazyBoundary fallback={<LazyFallback fullScreen label={es ? 'Cargando núcleo 3D…' : 'Loading the 3D core…'} />}>
      <SgxOrbitalCore3D
        activePillarId={activePillarId}
        noSelection={!pillarChosen}
        onSelectPillar={handleDockPillar}
        activePillarModules={activeStation.modules}
        onSelectSection={onSelectSection}
        onOpenTickets={onOpenTickets}
        onOpenCredential={() => onSelectSection('CREDENTIAL_GENERATOR')}
        onOpen360Tour={() => onSelectSection('MAP_360')}
        onQuickLaunchPrimaryModule={(pillarId) => {
          const st = pillarStations.find((s) => s.id === pillarId);
          st?.modules[0]?.onLaunch();
        }}
      />
      </LazyBoundary>

      {synthOpen && (
        <SgxDialog
          size="sm"
          onClose={closeSynth}
          title={es ? 'Mesa de tonos' : 'Tone desk'}
          kicker={es ? 'SGX.Stage · toca un pad' : 'SGX.Stage · tap a pad'}
          icon={<Volume2 className="w-5 h-5 text-[#FDCC0D] shrink-0" aria-hidden="true" />}
        >
          {getIsAudioMuted() && (
            <p className="mb-3 text-sm font-mono text-[#FDCC0D]">
              {es ? 'El sonido está apagado. Enciéndelo con el botón de sonido de la barra superior.' : 'Sound is off. Turn it on with the sound button in the top bar.'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3" role="group" aria-label={es ? 'Tonos' : 'Tones'}>
            {TONES.map((tone) => (
              <button
                key={tone.hz}
                type="button"
                aria-pressed={synthHz === tone.hz}
                onClick={() => { setSynthHz(tone.hz); playUiChirp(tone.hz, 'triangle', 0.35); }}
                className="sgx-btn flex-col !items-start !whitespace-normal min-h-[88px]"
              >
                <span className="text-xl font-bold tabular-nums">{tone.hz} Hz</span>
                <span className="text-xs">{bi(tone.label, language)}</span>
              </button>
            ))}
          </div>
        </SgxDialog>
      )}
    </div>
  );
};
