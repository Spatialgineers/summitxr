import type { PillarKey } from './sgxPillars';

/* =========================================================================
   SGX PORTFOLIO: every project Spatialgineers shows publicly, filed under
   its pillar. Use cases (with a real client, event or verifiable figure)
   are flagged and listed first. Figures follow the Ground Truth registry
   (v2026.10.1 §9); where the registry has no figure we don't add one.
   Not public (Ground Truth §8): Bad Bunny Land, RUM, IHP, Artec Corp, Lajas.
   ========================================================================= */

export interface PortfolioProject {
  id: string;
  pillar: PillarKey;
  name: string;
  nameEn?: string;
  /** Short line under the name: event, year, figure. */
  metric: string;
  metricEn?: string;
  desc: string;
  descEn?: string;
  year?: string;
  yearEn?: string;
  partners?: string;
  partnersEn?: string;
  useCase?: boolean;
}

export const SGX_PORTFOLIO: PortfolioProject[] = [
  // SGX.Story
  {
    id: 'infinite_borikua', pillar: 'STORY', useCase: true, year: '2025',
    name: 'Infinite Borikua · Metaverse Fashion Week 2025',
    metric: 'Decentraland · tema "Infinite Identities"',
    metricEn: 'Decentraland · "Infinite Identities" theme',
    desc: 'Participación en la Metaverse Fashion Week 2025 bajo el tema "Infinite Identities", con wearables y coleccionables 3D de inspiración taína (sets Wayuko y Cemí) y trivias históricas.',
    descEn: 'Took part in Metaverse Fashion Week 2025 under the "Infinite Identities" theme, with Taíno-inspired 3D wearables and collectibles (Wayuko and Cemí sets) and history trivia.',
  },
  {
    id: 'pr_film_festival', pillar: 'STORY', useCase: true,
    name: 'Puerto Rico Film Festival',
    metric: 'Patrocinio',
    metricEn: 'Sponsorship',
    desc: 'Spatialgineers como patrocinador del Puerto Rico Film Festival.',
    descEn: 'Spatialgineers as a sponsor of the Puerto Rico Film Festival.',
  },
  {
    id: 'unidos_jam', pillar: 'STORY', year: '2024',
    name: 'Unidos Jam 2024 (Latinx in Gaming)',
    metric: 'Plataformero educativo taíno',
    metricEn: 'Taíno educational platformer',
    desc: 'Videojuego donde los jugadores superan obstáculos y responden preguntas históricas para rescatar archivos culturales de Borikén.',
    descEn: 'A video game where players overcome obstacles and answer history questions to rescue Borikén\'s cultural archives.',
  },
  {
    id: 'terapia_risa', pillar: 'STORY',
    name: 'Espacio Inmersivo de Terapia de la Risa',
    nameEn: 'Immersive Laughter Therapy Space',
    metric: 'Bienestar y salud mental',
    metricEn: 'Wellness and mental health',
    desc: 'Entorno diseñado con psicología de color y arquitectura sensorial para sesiones terapéuticas en línea.',
    descEn: 'An environment designed with color psychology and sensory architecture for online therapy sessions.',
  },

  // SGX.Showcase
  {
    id: 'viaje_aguadilla', pillar: 'SHOWCASE', useCase: true, year: '2026',
    name: 'Un Viaje a Aguadilla · FITUR 2026 (Madrid)',
    nameEn: 'Un Viaje a Aguadilla (A Trip to Aguadilla) · FITUR 2026 (Madrid)',
    metric: '700+ personas (estimado) · 570 waivers registrados',
    metricEn: '700+ people (estimated) · 570 registered waivers',
    partners: 'con Sombrero Media',
    partnersEn: 'with Sombrero Media',
    desc: 'Experiencia VR de turismo en FITUR 2026: Quest 3, video 360° estereoscópico y audio espacial.',
    descEn: 'A VR tourism experience at FITUR 2026: Quest 3, stereoscopic 360° video and spatial audio.',
  },
  {
    id: 'spatial_ambassador', pillar: 'SHOWCASE', useCase: true,
    name: 'Spatial.io Global Ambassador',
    metric: 'Uno de los primeros 40 beta developers',
    metricEn: 'One of the first 40 beta developers',
    desc: 'Spatialgineers fue parte de los primeros 40 beta developers de Spatial.io y el único equipo latino del grupo.',
    descEn: 'Spatialgineers was among Spatial.io\'s first 40 beta developers and the only Latino team in the group.',
  },
  {
    id: 'dreamscape', pillar: 'SHOWCASE',
    name: 'Dreamscape para centro comercial',
    nameEn: 'Dreamscape for a shopping mall',
    metric: 'Activación surreal para retail',
    metricEn: 'Surreal retail activation',
    desc: 'En vez de un gemelo estéril, la marca se convirtió en un dreamscape interactivo con avatares personalizados.',
    descEn: 'Instead of a sterile twin, the brand became an interactive dreamscape with custom avatars.',
  },
  {
    id: 'infinite_galleries', pillar: 'SHOWCASE',
    name: 'Infinite Galleries (plataforma de museo digital)',
    nameEn: 'Infinite Galleries (digital museum platform)',
    metric: 'Galería WebGL 360° para XR y móvil',
    metricEn: '360° WebGL gallery for XR and mobile',
    desc: 'Plataforma multi-sala para exhibir obras de arte 3D sin instalar apps, navegable en cualquier navegador.',
    descEn: 'A multi-room platform to exhibit 3D artworks without installing apps, browsable in any browser.',
  },
  {
    id: 'festival_cine_xr', pillar: 'SHOWCASE',
    name: 'Experiencia XR para festival de cine',
    nameEn: 'XR experience for a film festival',
    metric: 'Cine y archivo cultural inmersivo',
    metricEn: 'Immersive film and cultural archive',
    desc: 'Activación espacial que extendió la vida del festival más allá de sus fechas con salas de proyección interactivas.',
    descEn: 'A spatial activation that extended the festival\'s life beyond its dates with interactive screening rooms.',
  },

  // SGX.Spark
  {
    id: 'highcade', pillar: 'SPARK', useCase: true,
    name: 'Highcade',
    metric: '20 usuarios registrados en vivo durante el evento',
    metricEn: '20 users registered live during the event',
    partners: 'In The Cloud PR × Highcoon',
    desc: 'Hub de juegos web con leaderboard en vivo.',
    descEn: 'Web game hub with a live leaderboard.',
  },
  {
    id: 'laberinto_molecular', pillar: 'SPARK',
    name: 'Laberinto educativo de geometría molecular',
    nameEn: 'Educational molecular geometry maze',
    metric: 'Gamificación educativa',
    metricEn: 'Educational gamification',
    desc: 'Navega estructuras químicas y terpenos con física de gravedad cero y banda sonora original.',
    descEn: 'Navigate chemical structures and terpenes with zero-gravity physics and an original soundtrack.',
  },
  {
    id: 'navegacion_web3', pillar: 'SPARK',
    name: 'Juego de navegación espacial con economía Web3',
    nameEn: 'Space navigation game with a Web3 economy',
    metric: 'NFTs y navegación espacial',
    metricEn: 'NFTs and space navigation',
    desc: 'Los jugadores pilotean tablas espaciales esquivando asteroides para recolectar tokens, con colisiones en tiempo real.',
    descEn: 'Players pilot space boards dodging asteroids to collect tokens, with real-time collisions.',
  },
  {
    id: 'laberinto_multijugador', pillar: 'SPARK',
    name: 'Laberinto multijugador procedural',
    nameEn: 'Procedural multiplayer maze',
    metric: 'Multijugador en Unity',
    metricEn: 'Multiplayer in Unity',
    desc: 'Laberinto concéntrico procedural donde los jugadores compiten por objetivos con economía in-game.',
    descEn: 'A procedural concentric maze where players compete for objectives with an in-game economy.',
  },

  // SGX.Stage
  {
    id: 'summit_2025', pillar: 'STAGE', useCase: true, year: '2025',
    name: 'Spatialgineers Summit 2025',
    metric: '200+ vistas en YouTube · 8 personas en el showcase',
    metricEn: '200+ YouTube views · 8 people at the showcase',
    partners: 'Spatial.io + Lucas & Ella (Aguadilla)',
    desc: 'La edición anterior del Summit, híbrida, del 19 al 21 de diciembre de 2025 en Aguadilla. El 2026 es su regreso.',
    descEn: 'The previous, hybrid edition of the Summit, December 19 to 21, 2025 in Aguadilla. 2026 is its return.',
  },
  {
    id: 'guayacan', pillar: 'STAGE', useCase: true,
    name: 'App para el evento de Grupo Guayacán',
    nameEn: 'App for the Grupo Guayacán event',
    metric: '400+ usuarios concurrentes en un día, sin fallas críticas',
    metricEn: '400+ concurrent users in one day, no critical failures',
    partners: 'con Incubadora Creativa',
    partnersEn: 'with Incubadora Creativa',
    desc: 'App para evento que sostuvo más de 400 usuarios concurrentes en un solo día.',
    descEn: 'An event app that sustained more than 400 concurrent users in a single day.',
  },
  {
    id: 'visualizers', pillar: 'STAGE',
    name: 'Visualizadores de escenario SGX',
    nameEn: 'SGX stage visualizers',
    metric: 'Visuales reactivos a la música',
    metricEn: 'Music-reactive visuals',
    desc: 'Visualizadores que reaccionan al audio en tiempo real para transmisiones, performances y eventos híbridos. En el Día 3 acompañan al Artista 1.',
    descEn: 'Visualizers that react to audio in real time for broadcasts, performances and hybrid events. On Day 3 they accompany Artist 1.',
  },
  {
    id: 'escenario_virtual', pillar: 'STAGE',
    name: 'Laboratorio de escenario virtual',
    nameEn: 'Virtual stage lab',
    metric: 'Rascacielos virtual con DJ booth',
    metricEn: 'Virtual skyscraper with a DJ booth',
    desc: 'Espacio inmersivo con cabina de DJ funcional, mecánicas de baile en tiempo real y arte phygital.',
    descEn: 'An immersive space with a working DJ booth, real-time dance mechanics and phygital art.',
  },
  {
    id: 'espacios_sonoros', pillar: 'STAGE',
    name: 'Espacios sonoros inmersivos para artistas',
    nameEn: 'Immersive sound spaces for artists',
    metric: 'Ambientes acústicos virtuales',
    metricEn: 'Virtual acoustic environments',
    desc: 'Ambientes en el desierto con fogatas interactivas para conciertos acústicos íntimos transmitidos.',
    descEn: 'Desert environments with interactive campfires for intimate streamed acoustic concerts.',
  },

  // SGX.System
  {
    id: 'grimorio', pillar: 'SYSTEM', useCase: true,
    name: 'Grimorio · Atlantic University',
    metric: '70 interesados · 64 solicitudes · 15 reclutas',
    metricEn: '70 interested · 64 applications · 15 recruits',
    desc: 'App gamificada de reclutamiento para una feria universitaria, que capta y clasifica solicitudes en tiempo real.',
    descEn: 'A gamified recruiting app for a university fair that captures and sorts applications in real time.',
  },
  {
    id: 'graffiti_ar', pillar: 'SYSTEM',
    name: 'Graffiti AR (MediaPipe + WebGL)',
    metric: 'Visión computacional sin hardware externo',
    metricEn: 'Computer vision with no external hardware',
    desc: 'Convierte la cámara web o móvil en un sensor espacial para pintar grafitis 3D en el aire con gestos de manos.',
    descEn: 'Turns the webcam or phone camera into a spatial sensor to paint 3D graffiti in the air with hand gestures.',
  },
  {
    id: 'alta_concurrencia', pillar: 'SYSTEM',
    name: 'Infraestructura de alta concurrencia',
    nameEn: 'High-concurrency infrastructure',
    metric: 'Pruebas de estrés de servidores SGX',
    metricEn: 'SGX server stress tests',
    desc: 'Sistema interactivo de alto estrés para validar la estabilidad técnica de los servidores SGX.',
    descEn: 'A high-stress interactive system to validate the technical stability of the SGX servers.',
  },

  // SGX.Synthesize
  {
    id: 'somos_mayaguez', pillar: 'SYNTHESIZE', useCase: true, year: '2025 y 2026', yearEn: '2025 and 2026',
    name: 'Somos Mayagüez · Justas LAI 2025 y 2026',
    nameEn: 'Somos Mayagüez · LAI Games (Justas LAI) 2025 and 2026',
    metric: 'Ecosistema WebXR sin instalación',
    metricEn: 'Install-free WebXR ecosystem',
    partners: 'para el Municipio de Mayagüez',
    partnersEn: 'for the Municipality of Mayagüez',
    desc: 'Ecosistema móvil WebXR, sin instalar nada, desplegado durante las Justas LAI 2025 y 2026.',
    descEn: 'A mobile WebXR ecosystem, nothing to install, deployed during the LAI Games (Justas LAI) 2025 and 2026.',
  },
  {
    id: 'summit_platform', pillar: 'SYNTHESIZE',
    name: 'Spatialgineers Summit Platform (este ecosistema)',
    nameEn: 'Spatialgineers Summit Platform (this ecosystem)',
    metric: 'Plataforma propia',
    metricEn: 'Our own platform',
    desc: 'Webapp nativa con base de datos en tiempo real, simulador de dron, transmisión multicanal y gamificación con votación en vivo.',
    descEn: 'A native web app with a real-time database, drone simulator, multichannel streaming and gamification with live voting.',
  },
];

/** Projects of one pillar, use cases first. */
export function portfolioOf(pillar: PillarKey): PortfolioProject[] {
  return SGX_PORTFOLIO.filter((p) => p.pillar === pillar).sort((a, b) => Number(!!b.useCase) - Number(!!a.useCase));
}
