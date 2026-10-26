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
  /** Short line under the name: event, year, figure. */
  metric: string;
  desc: string;
  year?: string;
  partners?: string;
  useCase?: boolean;
}

export const SGX_PORTFOLIO: PortfolioProject[] = [
  // SGX.Story
  {
    id: 'infinite_borikua', pillar: 'STORY', useCase: true, year: '2025',
    name: 'Infinite Borikua · Metaverse Fashion Week 2025',
    metric: 'Decentraland · tema "Infinite Identities"',
    desc: 'Participación en la Metaverse Fashion Week 2025 bajo el tema "Infinite Identities", con wearables y coleccionables 3D de inspiración taína (sets Wayuko y Cemí) y trivias históricas.',
  },
  {
    id: 'pr_film_festival', pillar: 'STORY', useCase: true,
    name: 'Puerto Rico Film Festival',
    metric: 'Patrocinio',
    desc: 'Spatialgineers como patrocinador del Puerto Rico Film Festival.',
  },
  {
    id: 'unidos_jam', pillar: 'STORY', year: '2024',
    name: 'Unidos Jam 2024 (Latinx in Gaming)',
    metric: 'Plataformero educativo taíno',
    desc: 'Videojuego donde los jugadores superan obstáculos y responden preguntas históricas para rescatar archivos culturales de Borikén.',
  },
  {
    id: 'terapia_risa', pillar: 'STORY',
    name: 'Espacio Inmersivo de Terapia de la Risa',
    metric: 'Bienestar y salud mental',
    desc: 'Entorno diseñado con psicología de color y arquitectura sensorial para sesiones terapéuticas en línea.',
  },

  // SGX.Showcase
  {
    id: 'viaje_aguadilla', pillar: 'SHOWCASE', useCase: true, year: '2026',
    name: 'Un Viaje a Aguadilla · FITUR 2026 (Madrid)',
    metric: '700+ personas (estimado) · 570 waivers registrados',
    partners: 'con Sombrero Media',
    desc: 'Experiencia VR de turismo en FITUR 2026: Quest 3, video 360° estereoscópico y audio espacial.',
  },
  {
    id: 'spatial_ambassador', pillar: 'SHOWCASE', useCase: true,
    name: 'Spatial.io Global Ambassador',
    metric: 'Uno de los primeros 40 beta developers',
    desc: 'Spatialgineers fue parte de los primeros 40 beta developers de Spatial.io y el único equipo latino del grupo.',
  },
  {
    id: 'dreamscape', pillar: 'SHOWCASE',
    name: 'Dreamscape para centro comercial',
    metric: 'Activación surreal para retail',
    desc: 'En vez de un gemelo estéril, la marca se convirtió en un dreamscape interactivo con avatares personalizados.',
  },
  {
    id: 'infinite_galleries', pillar: 'SHOWCASE',
    name: 'Infinite Galleries (plataforma de museo digital)',
    metric: 'Galería WebGL 360° para XR y móvil',
    desc: 'Plataforma multi-sala para exhibir obras de arte 3D sin instalar apps, navegable en cualquier navegador.',
  },
  {
    id: 'festival_cine_xr', pillar: 'SHOWCASE',
    name: 'Experiencia XR para festival de cine',
    metric: 'Cine y archivo cultural inmersivo',
    desc: 'Activación espacial que extendió la vida del festival más allá de sus fechas con salas de proyección interactivas.',
  },

  // SGX.Spark
  {
    id: 'highcade', pillar: 'SPARK', useCase: true,
    name: 'Highcade',
    metric: '20 usuarios registrados en vivo durante el evento',
    partners: 'In The Cloud PR × Highcoon',
    desc: 'Hub de juegos web con leaderboard en vivo.',
  },
  {
    id: 'laberinto_molecular', pillar: 'SPARK',
    name: 'Laberinto educativo de geometría molecular',
    metric: 'Gamificación educativa',
    desc: 'Navega estructuras químicas y terpenos con física de gravedad cero y banda sonora original.',
  },
  {
    id: 'navegacion_web3', pillar: 'SPARK',
    name: 'Juego de navegación espacial con economía Web3',
    metric: 'NFTs y navegación espacial',
    desc: 'Los jugadores pilotean tablas espaciales esquivando asteroides para recolectar tokens, con colisiones en tiempo real.',
  },
  {
    id: 'laberinto_multijugador', pillar: 'SPARK',
    name: 'Laberinto multijugador procedural',
    metric: 'Multijugador en Unity',
    desc: 'Laberinto concéntrico procedural donde los jugadores compiten por objetivos con economía in-game.',
  },

  // SGX.Stage
  {
    id: 'summit_2025', pillar: 'STAGE', useCase: true, year: '2025',
    name: 'Spatialgineers Summit 2025',
    metric: '200+ vistas en YouTube · 8 personas en el showcase',
    partners: 'Spatial.io + Lucas & Ella (Aguadilla)',
    desc: 'La edición anterior del Summit, híbrida, del 19 al 21 de diciembre de 2025 en Aguadilla. El 2026 es su regreso.',
  },
  {
    id: 'guayacan', pillar: 'STAGE', useCase: true,
    name: 'App para el evento de Grupo Guayacán',
    metric: '400+ usuarios concurrentes en un día, sin fallas críticas',
    partners: 'con Incubadora Creativa',
    desc: 'App para evento que sostuvo más de 400 usuarios concurrentes en un solo día.',
  },
  {
    id: 'visualizers', pillar: 'STAGE',
    name: 'Visualizadores de escenario SGX',
    metric: 'Visuales reactivos a la música',
    desc: 'Visualizadores que reaccionan al audio en tiempo real para transmisiones, performances y eventos híbridos. En el Día 3 acompañan al Artista 1.',
  },
  {
    id: 'escenario_virtual', pillar: 'STAGE',
    name: 'Laboratorio de escenario virtual',
    metric: 'Rascacielos virtual con DJ booth',
    desc: 'Espacio inmersivo con cabina de DJ funcional, mecánicas de baile en tiempo real y arte phygital.',
  },
  {
    id: 'espacios_sonoros', pillar: 'STAGE',
    name: 'Espacios sonoros inmersivos para artistas',
    metric: 'Ambientes acústicos virtuales',
    desc: 'Ambientes en el desierto con fogatas interactivas para conciertos acústicos íntimos transmitidos.',
  },

  // SGX.System
  {
    id: 'grimorio', pillar: 'SYSTEM', useCase: true,
    name: 'Grimorio · Atlantic University',
    metric: '70 interesados · 64 solicitudes · 15 reclutas',
    desc: 'App gamificada de reclutamiento para una feria universitaria, que capta y clasifica solicitudes en tiempo real.',
  },
  {
    id: 'graffiti_ar', pillar: 'SYSTEM',
    name: 'Graffiti AR (MediaPipe + WebGL)',
    metric: 'Visión computacional sin hardware externo',
    desc: 'Convierte la cámara web o móvil en un sensor espacial para pintar grafitis 3D en el aire con gestos de manos.',
  },
  {
    id: 'alta_concurrencia', pillar: 'SYSTEM',
    name: 'Infraestructura de alta concurrencia',
    metric: 'Pruebas de estrés de servidores SGX',
    desc: 'Sistema interactivo de alto estrés para validar la estabilidad técnica de los servidores SGX.',
  },

  // SGX.Synthesize
  {
    id: 'somos_mayaguez', pillar: 'SYNTHESIZE', useCase: true, year: '2025 y 2026',
    name: 'Somos Mayagüez · Justas LAI 2025 y 2026',
    metric: 'Ecosistema WebXR sin instalación',
    partners: 'para el Municipio de Mayagüez',
    desc: 'Ecosistema móvil WebXR, sin instalar nada, desplegado durante las Justas LAI 2025 y 2026.',
  },
  {
    id: 'summit_platform', pillar: 'SYNTHESIZE',
    name: 'Spatialgineers Summit Platform (este ecosistema)',
    metric: 'Plataforma propia',
    desc: 'Webapp nativa con base de datos en tiempo real, simulador de vuelo, transmisión multicanal y gamificación con votación en vivo.',
  },
];

/** Projects of one pillar, use cases first. */
export function portfolioOf(pillar: PillarKey): PortfolioProject[] {
  return SGX_PORTFOLIO.filter((p) => p.pillar === pillar).sort((a, b) => Number(!!b.useCase) - Number(!!a.useCase));
}
