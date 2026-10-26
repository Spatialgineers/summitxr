import { 
  SummitPillar, 
  SummitSession, 
  SummitSpeaker, 
  Map360Node, 
  ChatMessage, 
  AttendeeProfile, 
  EmbedWidget, 
  SponsorshipTier, 
  SponsorInquiry, 
  ApprovedSponsor, 
  SummitNotification, 
  SummitAnalyticsMetrics, 
  LanguageCode 
} from '../types/summit';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot 
} from 'firebase/firestore';

// Official Canonical Brand Assets & CDN Resources
export const OFFICIAL_BRAND_ASSETS = {
  logoSpatialgineers: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
  logoSummit: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
  logoGuild: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
  pillarIcons: {
    'SGX.STORY': 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
    'SGX.SHOWCASE': 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
    'SGX.SPARK': 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    'SGX.STAGE': 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
    'SGX.SYSTEM': 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
    'SGX.SYNTHESIZE': 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
  },
  models3D: {
    guildLogo: 'https://cdn.spatialgineers.com/3D%20Branding/Sgxgs%201.glb',
    sgxLogo: 'https://cdn.spatialgineers.com/3D%20Branding/SGX%20Icon.glb',
  },
  retrospectiveGallery: [
    {
      id: 'photo_1',
      title: 'The Highgineer & Lightning Fingers',
      description: 'Danelson Maldonado González y Ricardo A. Hernández Díaz, fundadores de Spatialgineers.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2026.png',
      tag: 'Fundadores'
    },
    {
      id: 'photo_2',
      title: 'The Highgineer en Acción',
      description: 'Danelson Maldonado González dirigiendo la visión transmedia y los 6 pilares del SGX Framework.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2028.png',
      tag: 'Liderazgo'
    },
    {
      id: 'photo_3',
      title: 'Lightning Fingers',
      description: 'Ricardo A. Hernández Díaz orquestando la infraestructura técnica, WebXR y WebSockets.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2029.png',
      tag: 'Dirección Técnica'
    },
    {
      id: 'photo_4',
      title: 'Comunidad Spatialgineer Unida',
      description: 'Foto grupal con creadores y participantes del ecosistema Spatialgineers.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2037.png',
      tag: 'Comunidad'
    },
    {
      id: 'photo_5',
      title: 'Demostración Grupal de Computación Espacial #1',
      description: 'Pruebas de campo con visores inmersivos e interacción multitáctil en tiempo real.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2038.png',
      tag: 'Live Demo'
    },
    {
      id: 'photo_6',
      title: 'Demostración Grupal #2',
      description: 'Workshops colaborativos de prototipado rápido y desarrollo WebGL.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2039.png',
      tag: 'Workshop'
    },
    {
      id: 'photo_7',
      title: 'The Highgineer & Bucolove Espacia\'os',
      description: 'Danelson y Bucolov grabando cobertura especial sobre la evolución de 2D a 3D.',
      url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2041.png',
      tag: 'Podcast & Medios'
    },
  ]
};

// 6 SGX Pillars (Strict SGX v2026.10 Color Identity & Official Order: Story, Showcase, Spark, Stage, System, Synthesize)
export const SUMMIT_PILLARS: SummitPillar[] = [
  {
    id: 'SGX.STORY',
    name: 'SGX.STORY',
    tagline: 'Narrative Engineering & Lore Architecture',
    description: 'Immersive transmedia worldbuilding, interactive storytelling branches, and high-impact cinematic narrative development for cross-reality platforms.',
    color: '#FDCC0D',
    iconName: 'BookOpen',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Story1.png',
    leadSpeaker: 'Danelson Maldonado González',
    caseStudies: ['MVFW 2025 Taíno Cultural Lore', 'Spatial Transmedia Lore Matrix', 'Historic Space Re-creation'],
    features: ['Branching Decision Trees', 'Dynamic Dialogue Engines', 'Transmedia Continuity Vault'],
    dayFeatured: 1,
  },
  {
    id: 'SGX.SHOWCASE',
    name: 'SGX.SHOWCASE',
    tagline: 'Real-Time 3D Portfolios & Digital Pavilions',
    description: 'High-fidelity spatial showcases, photogrammetry scanning, interactive 3D asset galleries, and web-native spatial exhibition spaces.',
    color: '#00DDFF',
    iconName: 'Box',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Showcase1.png',
    leadSpeaker: 'Ricardo A. Hernández Díaz',
    caseStudies: ['FITUR 2026 Virtual Tourism Pavilion', 'SGX Guild Initiate Spatial Galleries', 'Interactive 3D Drone Exhibition'],
    features: ['Zero-Latency WebGL Portfolios', 'PBR Material Viewers', 'High-Poly Spatial Optimization'],
    dayFeatured: 1,
  },
  {
    id: 'SGX.SPARK',
    name: 'SGX.SPARK',
    tagline: 'Rapid Ideation & Gamified Simulation',
    description: 'Hyper-accelerated interactive simulations, creative AI workflows, shader synthesis, and rapid zero-to-one prototype deployment for next-gen interactive media.',
    color: '#FFBB00',
    iconName: 'Zap',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    leadSpeaker: 'Danelson Maldonado González & Ricardo A. Hernández Díaz',
    caseStudies: ['Autonomous Drone Challenge', 'Live AI Shader Generation Lab', 'Autonomous Drone Pathing Engine'],
    features: ['Live GLSL Shader Compilers', 'Generative Geometry Pipelines', 'Instant Sandbox Prototyping'],
    dayFeatured: 1,
  },
  {
    id: 'SGX.STAGE',
    name: 'SGX.STAGE',
    tagline: 'Live Audio-Reactive Visualizers & Avatar MoCap',
    description: 'Real-time broadcast graphics, audio-driven reactive shaders, facial capture rigs, and performative spatial stages for live festivals and hybrid events.',
    color: '#FFFFFF',
    iconName: 'Tv',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
    leadSpeaker: 'Danelson Maldonado González ("The Highgineer")',
    caseStudies: ['Live Digital Avatar Behind-The-Screen', 'SGX Music-Reactive Stage Visualizers', 'Roblox Live Streamed Concerts'],
    features: ['Low-Latency WebSocket MIDI/Audio Bus', 'Real-Time Facial Rig Tracking', 'Broadcast OBS Overlays'],
    dayFeatured: 1,
  },
  {
    id: 'SGX.SYSTEM',
    name: 'SGX.SYSTEM',
    tagline: 'Edge Cloud Sync & Micro-Services Architecture',
    description: 'Resilient multi-tenant event infrastructure, distributed WebSocket state synchronization, telemetry pipelines, and scalable cloud engines.',
    color: '#32527B',
    iconName: 'Cpu',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Systems1.png',
    leadSpeaker: 'Ricardo A. Hernández Díaz ("Lightning Fingers")',
    caseStudies: ['SGX Live CYOA Voting Engine', 'Multi-Tenant Micro-Room Mesh', 'Sub-50ms Global Audience Sync'],
    features: ['Binary Packed State Updates', 'Real-Time Telemetry Tracking', 'Cloud Run Auto-Scaling Architecture'],
    dayFeatured: 1,
  },
  {
    id: 'SGX.SYNTHESIZE',
    name: 'SGX.SYNTHESIZE',
    tagline: 'Cross-Reality Convergence & Spatial Audio',
    description: 'Bridging physical environments with virtual realms through WebXR, binaural audio acoustics, IoT sensors, and multi-sensory hybrid activations.',
    color: '#B87000',
    iconName: 'Layers',
    iconUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
    leadSpeaker: 'Danelson Maldonado González & Ricardo A. Hernández Díaz',
    caseStudies: ['SGX Showcase Hybrid Activation (Day 3)', 'WebXR 360 Spatial Nodes', 'Virtual LED Wall Production Stage'],
    features: ['WebXR Stereo Spatial Audio', 'Photosphere 360 Portals', 'Cross-Device Multi-User Sync'],
    dayFeatured: 1,
  },
];

// Initial 3-Day Summit Schedule (Dec 11 - 13, 2026) — Official Run of Show v2026.10.1 Single Source of Truth
export const INITIAL_SUMMIT_SESSIONS: SummitSession[] = [
  // DAY 1: Viernes 11 de diciembre de 2026 (10:00 a.m. – 4:30 p.m., 6h 30m, 100% digital · YouTube Live + espacio de Roblox activo si se usa)
  {
    id: 'd1_01',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    startMinutes: 600,
    title: 'Apertura — Spatialgineers Summit 2026',
    subtitle: 'Danelson abre la transmisión. Roblox ya está activo, si se usa (30 min)',
    description: 'Danelson Maldonado González ("The Highgineer") abre la transmisión oficial en YouTube Live presentando la visión de Spatialgineers ("Ingeniando Imaginación, Construyendo Realidades") y la hoja de ruta de los 3 días. El espacio de Roblox (embed opcional, si se usa) está activo desde la apertura.',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    streamUrl: 'https://www.youtube.com',
    mapNodeId: 'node_roblox',
    tags: ['Apertura', 'Keynote', 'Roblox Activo', 'Highgineer', '30 Min'],
    status: 'LIVE',
  },
  {
    id: 'd1_02',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '10:30 AM',
    endTime: '10:45 AM',
    startMinutes: 630,
    title: 'Artista invitado 1 (por anunciar) — Presentación en vivo dentro de Roblox',
    subtitle: 'Primer intermedio de artista, en vivo dentro de Roblox si se usa (15 min). Solo se anuncian artistas confirmados por escrito',
    description: 'Presentación en vivo de un artista invitado (por anunciar) dentro del espacio de Roblox (si se usa), transmitida por YouTube Live. Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 1', 'Roblox Live', 'Música en Vivo', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_03',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '10:45 AM',
    endTime: '11:10 AM',
    startMinutes: 645,
    title: 'Bloque del Primer Pilar: SGX.Story',
    subtitle: 'Ingeniería narrativa, preservación cultural y demostración de 2 casos reales (25 min)',
    description: 'Bloque oficial del primer pilar (SGX.Story): arquitectura de historias interactivas, preservación cultural en mundos 3D y demostración en vivo de casos de estudio ejecutados por Spatialgineers.',
    pillarId: 'SGX.STORY',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['SGX.Story', 'Pilar 1', 'Narrativa Espacial', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_04',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '11:10 AM',
    endTime: '11:25 AM',
    startMinutes: 670,
    title: 'Artista invitado 2 (por anunciar) — Intermedio de artista',
    subtitle: 'Segundo intermedio de artista antes de SGX.Showcase (15 min)',
    description: 'Intermedio en vivo de un artista invitado (por anunciar) con visualizadores reactivos. Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 2', 'Roblox Concert', 'Intermedio', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_05',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '11:25 AM',
    endTime: '11:50 AM',
    startMinutes: 685,
    title: 'Bloque del Segundo Pilar: SGX.Showcase',
    subtitle: 'Portafolios 3D en tiempo real, pabellones virtuales y demostración de casos reales (25 min)',
    description: 'Bloque oficial del segundo pilar (SGX.Showcase) junto a Ricardo A. Hernández Díaz ("Lightning Fingers"): exhibición espacial en WebGL, gemelos digitales, fotogrametría y pabellones interactivos para marcas e instituciones.',
    pillarId: 'SGX.SHOWCASE',
    speakerIds: ['spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_awaken_gallery',
    tags: ['SGX.Showcase', 'Pilar 2', 'Pabellones 3D', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_06',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '11:50 AM',
    endTime: '12:05 PM',
    startMinutes: 710,
    title: 'Artista invitado 3 (por anunciar) — Intermedio de artista',
    subtitle: 'Tercer intermedio de artista antes de SGX.Spark (15 min)',
    description: 'Intermedio en vivo de un artista invitado (por anunciar) y ronda de votación estilo Kahoot en la webapp del Summit. Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 3', 'Votación 25 XP', 'Roblox', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_07',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '12:05 PM',
    endTime: '12:30 PM',
    startMinutes: 725,
    title: 'Bloque del Tercer Pilar: SGX.Spark',
    subtitle: 'Prototipado rápido, simulación de drones y gamificación interactiva (25 min)',
    description: 'Bloque oficial del tercer pilar (SGX.Spark): mecánicas de gamificación en tiempo real, simulaciones interactivas de baja fricción, shaders GLSL y casos prácticos de participación masiva.',
    pillarId: 'SGX.SPARK',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_drone_bay',
    tags: ['SGX.Spark', 'Pilar 3', 'Gamificación', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_08',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '12:30 PM',
    endTime: '12:45 PM',
    startMinutes: 750,
    title: 'Artista invitado 4 (por anunciar) — Intermedio de artista',
    subtitle: 'Cuarto intermedio de artista antes de SGX.Stage (15 min)',
    description: 'Intermedio en vivo de un artista invitado (por anunciar) con diseño sonoro reactivo. Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 4', 'Por anunciar', 'Intermedio', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_09',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '12:45 PM',
    endTime: '1:10 PM',
    startMinutes: 765,
    title: 'Bloque del Cuarto Pilar: SGX.Stage',
    subtitle: 'Producción virtual, avatares con captura facial en vivo y visualizadores reactivos (25 min)',
    description: 'Bloque oficial del cuarto pilar (SGX.Stage): escenarios 3D reactivos al audio, captura facial en tiempo real detrás de pantalla y transmisiones interactivas para festivales y eventos híbridos.',
    pillarId: 'SGX.STAGE',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_chroma_studios',
    tags: ['SGX.Stage', 'Pilar 4', 'Producción Virtual', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_10',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '1:10 PM',
    endTime: '1:25 PM',
    startMinutes: 790,
    title: 'Artista invitado 5 (por anunciar) — Intermedio de artista',
    subtitle: 'Quinto intermedio de artista antes de SGX.System (15 min)',
    description: 'Intermedio en vivo de un artista invitado (por anunciar). Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 5', 'Synths', 'Roblox Live', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_11',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '1:25 PM',
    endTime: '1:50 PM',
    startMinutes: 805,
    title: 'Bloque del Quinto Pilar: SGX.System',
    subtitle: 'Infraestructura cloud, sincronización en tiempo real y telemetría (25 min)',
    description: 'Bloque oficial del quinto pilar (SGX.System) conducido por Ricardo A. Hernández Díaz: arquitectura distribuida, WebSockets de baja latencia, Firestore en tiempo real y el motor de evaluación del SGX Guild.',
    pillarId: 'SGX.SYSTEM',
    speakerIds: ['spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['SGX.System', 'Pilar 5', 'Cloud Sync', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_12',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '1:50 PM',
    endTime: '2:05 PM',
    startMinutes: 830,
    title: 'Artista invitado 6 (por anunciar) — Intermedio de artista',
    subtitle: 'Sexto intermedio de artista antes de SGX.Synthesize (15 min)',
    description: 'Intermedio en vivo de un artista invitado (por anunciar) antes del sexto pilar. Solo se publican artistas confirmados por escrito.',
    speakerIds: [],
    format: 'ROBLOX_STREAM',
    venueLocation: 'YouTube Live + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_roblox',
    tags: ['Artista 6', 'Audio Espacial', 'Intermedio', '15 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_13',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '2:05 PM',
    endTime: '2:30 PM',
    startMinutes: 845,
    title: 'Bloque del Sexto Pilar: SGX.Synthesize',
    subtitle: 'Convergencia física-digital, WebXR y ecosistemas híbridos (25 min)',
    description: 'Bloque oficial del sexto pilar (SGX.Synthesize): la convergencia de los 6 pilares integrando entornos físicos con mundos 3D, audio espacial y sensores en vivo.',
    pillarId: 'SGX.SYNTHESIZE',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_chroma_studios',
    tags: ['SGX.Synthesize', 'Pilar 6', 'Cross-Reality', '25 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_14',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '2:30 PM',
    endTime: '4:00 PM',
    startMinutes: 870,
    title: 'Portafolios de los Initiates — 8 Initiates Activos (8 min c/u)',
    subtitle: 'Los 8 Initiates activos presentan su portafolio interactivo (64 de los 90 min del bloque). Roblox sigue activo (si se usa)',
    description: 'Los 8 Initiates activos del SGX Guild presentan su portafolio en vivo (8 minutos cada uno, ocupando 64 de los 90 minutos del bloque, con transiciones y comentarios técnicos). El espacio de Roblox (si se usa) permanece activo.',
    speakerIds: [
      'spk_initiate_1', 'spk_initiate_2', 'spk_initiate_3', 'spk_initiate_4', 'spk_initiate_5',
      'spk_initiate_6', 'spk_initiate_7', 'spk_initiate_8'
    ],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream + Espacio de Roblox (si se usa)',
    mapNodeId: 'node_awaken_gallery',
    tags: ['SGX Guild', '8 Initiates', 'Portafolios 8 Min', '90 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd1_15',
    day: 1,
    dateStr: 'Dec 11, 2026',
    startTime: '4:00 PM',
    endTime: '4:30 PM',
    startMinutes: 960,
    title: 'Cierre del Día 1 — Anuncio de los 6 Initiates que Presentan el Día 3',
    subtitle: 'Se anuncian los 6 Initiates elegidos por Danelson según desempeño y rankings (30 min)',
    description: 'Cierre oficial del Día 1. Danelson Maldonado anuncia en directo a los 6 Initiates seleccionados (elegidos según desempeño y rankings en los SGX Ranked Trials) que presentarán en el Día 3.',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['Cierre Día 1', 'Anuncio 6 Initiates', 'Rankings', '30 Min'],
    status: 'UPCOMING',
  },

  // DAY 2: Sábado 12 de diciembre de 2026 — Día de la Industria (10:00 a.m. – 4:00 p.m., 6h exactas, 100% digital)
  {
    id: 'd2_01',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '10:00 AM',
    endTime: '10:30 AM',
    startMinutes: 600,
    title: 'Introducción del Día 2 — Resumen del Día 1 & Recordatorio de los 6 Initiates',
    subtitle: 'Resumen del Día 1 y recordatorio oficial de los 6 Initiates anunciados al cierre del Día 1 (30 min)',
    description: 'Apertura del Día de la Industria (100% digital). Danelson y Ricardo presentan el resumen ejecutivo del Día 1 y recuerdan a los 6 Initiates anunciados al cierre del viernes que presentarán en el Día 3.',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['Día 2', 'Día de la Industria', '6 Initiates', '30 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_02',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '10:30 AM',
    endTime: '11:15 AM',
    startMinutes: 630,
    title: 'Conversación SGX.Story — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre narrativa espacial, medios transmedia y preservación cultural (45 min)',
    description: 'Primera conversación del Día de la Industria dedicada al pilar SGX.Story con persona invitada del pilar: evolución de la narrativa de 2D a mundos 3D, propiedad intelectual e identidad cultural.',
    pillarId: 'SGX.STORY',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['Conversación 1', 'SGX.Story', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_03',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '11:15 AM',
    endTime: '11:25 AM',
    startMinutes: 675,
    title: 'Pausa 1 & Ronda de Votación Gamificada',
    subtitle: 'Pausa de 10 minutos con trivia interactiva (+25 XP por voto)',
    description: 'Pausa breve entre conversaciones con activación de votación estilo Kahoot en la consola /play y actualización del leaderboard en vivo.',
    speakerIds: [],
    format: 'DIGITAL',
    venueLocation: 'Summit Site /play Console',
    mapNodeId: 'node_roblox',
    tags: ['Pausa', 'Votación 25 XP', '10 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_04',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '11:25 AM',
    endTime: '12:10 PM',
    startMinutes: 685,
    title: 'Conversación SGX.Showcase — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre portafolios 3D, gemelos digitales, comercio y turismo espacial (45 min)',
    description: 'Segunda conversación del Día de la Industria enfocada en SGX.Showcase con persona invitada del pilar: impacto de exhibiciones 3D WebGL en turismo, arquitectura y ventas B2B.',
    pillarId: 'SGX.SHOWCASE',
    speakerIds: ['spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_awaken_gallery',
    tags: ['Conversación 2', 'SGX.Showcase', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_05',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '12:10 PM',
    endTime: '12:20 PM',
    startMinutes: 730,
    title: 'Pausa 2 & Ronda de Votación Gamificada',
    subtitle: 'Pausa de 10 minutos y desafío interactivo en vivo',
    description: 'Segunda pausa de 10 minutos con trivia interactiva del ecosistema SGX (+25 XP por participación).',
    speakerIds: [],
    format: 'DIGITAL',
    venueLocation: 'Summit Site /play Console',
    mapNodeId: 'node_roblox',
    tags: ['Pausa', 'Votación 25 XP', '10 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_06',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '12:20 PM',
    endTime: '1:05 PM',
    startMinutes: 740,
    title: 'Conversación SGX.Spark — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre gamificación, simulación interactiva e IA aplicada a 3D (45 min)',
    description: 'Tercera conversación del Día de la Industria dedicada a SGX.Spark con persona invitada del pilar: diseño de mecánicas participativas, simuladores en navegador y pipelines creativos acelerados.',
    pillarId: 'SGX.SPARK',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_drone_bay',
    tags: ['Conversación 3', 'SGX.Spark', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_07',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '1:05 PM',
    endTime: '1:15 PM',
    startMinutes: 785,
    title: 'Pausa 3 & Actualización de Leaderboard de Mediodía',
    subtitle: 'Pausa de 10 minutos y revisión de posiciones en la tabla general',
    description: 'Receso breve de mediodía con revisión del leaderboard de experiencia XP y mención de auspiciadores oficiales.',
    speakerIds: [],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['Pausa', 'Leaderboard', '10 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_08',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '1:15 PM',
    endTime: '2:00 PM',
    startMinutes: 795,
    title: 'Conversación SGX.Stage — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre producción virtual, captura de movimiento y espectáculos reactivos (45 min)',
    description: 'Cuarta conversación del Día de la Industria enfocada en SGX.Stage con persona invitada del pilar: el futuro de la producción virtual en vivo, avatares detrás de pantalla y conciertos híbridos.',
    pillarId: 'SGX.STAGE',
    speakerIds: ['spk_danelson'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_chroma_studios',
    tags: ['Conversación 4', 'SGX.Stage', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_09',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '2:00 PM',
    endTime: '2:10 PM',
    startMinutes: 840,
    title: 'Pausa 4 & Ronda de Votación Gamificada',
    subtitle: 'Pausa de 10 minutos y desafío de audiencia en vivo',
    description: 'Cuarta pausa de 10 minutos con preguntas interactivas en la consola de votación.',
    speakerIds: [],
    format: 'DIGITAL',
    venueLocation: 'Summit Site /play Console',
    mapNodeId: 'node_roblox',
    tags: ['Pausa', 'Votación 25 XP', '10 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_10',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '2:10 PM',
    endTime: '2:55 PM',
    startMinutes: 850,
    title: 'Conversación SGX.System — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre infraestructura cloud, telemetría y sincronización multiusuario (45 min)',
    description: 'Quinta conversación del Día de la Industria dedicada a SGX.System con persona invitada del pilar: ingeniería de sistemas de baja latencia, escalabilidad en la nube y telemetría de eventos en vivo.',
    pillarId: 'SGX.SYSTEM',
    speakerIds: ['spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_industry_stage',
    tags: ['Conversación 5', 'SGX.System', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_11',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '2:55 PM',
    endTime: '3:05 PM',
    startMinutes: 895,
    title: 'Pausa 5 & Última Ronda de Votación del Día 2',
    subtitle: 'Pausa de 10 minutos antes de la conversación de cierre',
    description: 'Última pausa de 10 minutos del Día 2 para acumular XP antes del bloque final de síntesis.',
    speakerIds: [],
    format: 'DIGITAL',
    venueLocation: 'Summit Site /play Console',
    mapNodeId: 'node_roblox',
    tags: ['Pausa', 'Votación 25 XP', '10 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_12',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '3:05 PM',
    endTime: '3:50 PM',
    startMinutes: 905,
    title: 'Conversación SGX.Synthesize — Persona invitada del pilar (por anunciar)',
    subtitle: 'Conversatorio de industria sobre convergencia XR, estudios híbridos y computación espacial (45 min)',
    description: 'Sexta conversación del Día de la Industria dedicada a SGX.Synthesize con persona invitada del pilar (por anunciar): integración de estudios físicos con experiencias inmersivas XR.',
    pillarId: 'SGX.SYNTHESIZE',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_chroma_studios',
    tags: ['Conversación 6', 'SGX.Synthesize', 'Industria', '45 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd2_13',
    day: 2,
    dateStr: 'Dec 12, 2026',
    startTime: '3:50 PM',
    endTime: '4:00 PM',
    startMinutes: 950,
    title: 'Cierre del Día 2 — Despedida y Adelanto del Día 3',
    subtitle: 'Despedida de la jornada digital y adelanto del SGX Showcase del Día 3 (10 min)',
    description: 'Cierre oficial del Día 2 (10 min). Resumen de las 6 conversaciones de industria y adelanto del SGX Showcase del domingo (híbrido, por invitación) en Chroma Space Studios, San Juan y en YouTube Live.',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'DIGITAL',
    venueLocation: 'YouTube Live Stream',
    mapNodeId: 'node_chroma_studios',
    tags: ['Cierre Día 2', 'Adelanto Día 3', 'Chroma Space Studios', '10 Min'],
    status: 'UPCOMING',
  },

  // DAY 3: Domingo 13 de diciembre de 2026 — SGX Showcase, Evento Híbrido (10:00 a.m. – 4:00 p.m., 6h, Chroma Space Studios, San Juan · Solo por invitación 40–60 personas + YouTube Live / LinkedIn Live / Facebook Live)
  {
    id: 'd3_01',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    startMinutes: 600,
    title: 'SGX Showcase — Introducción del evento (Ricardo marca el ambiente)',
    subtitle: 'Apertura en Chroma Space Studios (San Juan; por invitación y cupo limitado, 40 a 60 personas) + YouTube, LinkedIn y Facebook Live (60 min)',
    description: 'Apertura oficial del SGX Showcase (Día 3, híbrido) desde Chroma Space Studios en San Juan (presencial por invitación y cupo limitado: 40 a 60 personas como máximo) y transmisión en directo por YouTube Live, LinkedIn Live y Facebook Live. Ricardo A. Hernández Díaz ("Lightning Fingers") marca el ambiente.',
    speakerIds: ['spk_ricardo', 'spk_danelson'],
    format: 'HYBRID',
    venueLocation: 'Chroma Space Studios (San Juan) + YouTube / LinkedIn / Facebook Live',
    mapNodeId: 'node_chroma_studios',
    tags: ['Híbrido', 'Chroma Space Studios', 'Ricardo', '60 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd3_02',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '11:00 AM',
    endTime: '12:30 PM',
    startMinutes: 660,
    title: 'Presentación y showcase — Avatar en tiempo real + artistas invitados (por confirmar)',
    subtitle: 'Danelson con su avatar y captura facial en tiempo real. Artista invitado 1 con los visualizadores de SGX. Artista invitado 2. Artistas por confirmar (90 min)',
    description: 'Bloque central de showcase performativo en vivo: Danelson presenta con su avatar y captura facial en tiempo real; un artista invitado actúa con los visualizadores reactivos de SGX, seguido por un segundo artista invitado. Ambos artistas están por confirmar y solo se anuncian cuando haya confirmación por escrito.',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'HYBRID',
    venueLocation: 'Chroma Space Studios Stage + Multi-Stream Live',
    mapNodeId: 'node_chroma_studios',
    tags: ['Showcase en Vivo', 'Captura Facial', 'Visualizadores SGX', 'Artistas por confirmar', '90 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd3_03',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '12:30 PM',
    endTime: '1:00 PM',
    startMinutes: 750,
    title: 'Presentaciones del Guild — SGX Guild Ranked Trials Pitch Session (top 6 Initiates, 5 min c/u)',
    subtitle: 'SGX Guild Ranked Trials Pitch Session: los top 6 Initiates presentan 5 minutos cada uno, en persona o de forma remota (30 min)',
    description: 'SGX Guild Ranked Trials Pitch Session: los top 6 Initiates anunciados al cierre del Día 1 presentan 5 minutos cada uno (en persona o de forma remota), como parte del proceso Spatialgineers, ante los invitados y la audiencia en transmisión.',
    speakerIds: ['spk_initiate_1', 'spk_initiate_2', 'spk_initiate_3', 'spk_initiate_4', 'spk_initiate_5', 'spk_initiate_6', 'spk_danelson'],
    format: 'HYBRID',
    venueLocation: 'Chroma Space Stage + YouTube / LinkedIn / Facebook Live',
    mapNodeId: 'node_awaken_gallery',
    tags: ['SGX Guild Ranked Trials Pitch Session', 'Top 6 Initiates', '5 Min c/u', '30 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd3_04',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '1:00 PM',
    endTime: '2:00 PM',
    startMinutes: 780,
    title: 'Networking — Votación Gamificada Activa & Canje de Premios',
    subtitle: 'Conexión presencial y digital, escaneo de QR (+50 XP), votación activa (+25 XP) y canje de recompensas (60 min)',
    description: 'Bloque de networking en Chroma Space Studios y en la plataforma digital. Votación gamificada activa y canje de premios (mayormente digitales) por XP acumulada: cupón de descuento de un auspiciador y suscripción de 3 meses a nuestras plataformas.',
    speakerIds: ['spk_ricardo'],
    format: 'HYBRID',
    venueLocation: 'Chroma Space Studios Lounge + Plataforma Summit',
    mapNodeId: 'node_chroma_vip_lounge',
    tags: ['Networking', 'Canje de Premios', 'Votación Activa', 'QR 50 XP', '60 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd3_05',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '2:00 PM',
    endTime: '3:30 PM',
    startMinutes: 840,
    title: 'Interacción Libre — Initiates, Demos & Roblox',
    subtitle: 'Sesión abierta para explorar demos en vivo, conversar con los Initiates y recorrer el espacio de Roblox si se usa (90 min). Dinámica por anunciar',
    description: 'Espacio de interacción libre donde los invitados en San Juan y los participantes en línea prueban las demos de Spatialgineers, conversan directamente con los Initiates del Guild y participan dentro del entorno de Roblox (si se usa).',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'HYBRID',
    venueLocation: 'Chroma Space Studios Showroom + Roblox',
    mapNodeId: 'node_drone_bay',
    tags: ['Interacción Libre', 'Demos en Vivo', 'Initiates', 'Roblox', '90 Min'],
    status: 'UPCOMING',
  },
  {
    id: 'd3_06',
    day: 3,
    dateStr: 'Dec 13, 2026',
    startTime: '3:30 PM',
    endTime: '4:00 PM',
    startMinutes: 930,
    title: 'Cierre — Anuncios Finales & Premios Mayores',
    subtitle: 'Clausura oficial del Summit 2026: anuncios finales y premios mayores, incluido el Premio Mayor "Spatialgineers activa tu evento" (30 min)',
    description: 'Cierre oficial del Spatialgineers Summit 2026. Anuncios finales y entrega de los premios mayores: el Premio Mayor "Spatialgineers activa tu evento" (un servicio de Spatialgineers) y la sesión "Grit" con artistas (por confirmar).',
    speakerIds: ['spk_danelson', 'spk_ricardo'],
    format: 'HYBRID',
    venueLocation: 'Main Stage + YouTube / LinkedIn / Facebook Live',
    mapNodeId: 'node_chroma_studios',
    tags: ['Gran Cierre', 'Premios Mayores', 'Spatialgineers Activa Tu Evento', '30 Min'],
    status: 'UPCOMING',
  },
];

// Initial Speakers Roster: Only Danelson "The Highgineer" and Ricardo "Lightning Fingers" are confirmed.
// All other prospective speakers must register their pilot profiles dynamically.
export const INITIAL_SUMMIT_SPEAKERS: SummitSpeaker[] = [
  // 1. FOUNDERS & CONFIRMED KEYNOTE HOSTS (Pilot Avatars)
  {
    id: 'spk_danelson',
    name: 'Danelson Maldonado González',
    handle: '@thehighgineer',
    role: 'Founder, Host & CEO ("The Highgineer")',
    organization: 'Spatialgineers LLC',
    avatarUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png',
    bio: 'Ingeniero mecánico, fundador de Spatialgineers y host del podcast Lo Espacia\'o ("The Highgineer"). Creador del Framework SGX de 6 pilares. Presenta en vivo como avatar digital 3D mediante captura facial en tiempo real en el Día 3.',
    pillarId: 'SGX.STAGE',
    day: 1,
    isKeynote: true,
    socialLinks: {
      twitter: 'https://twitter.com/thehighgineer',
      linkedin: 'https://linkedin.com/in/danelson-maldonado',
      instagram: 'https://instagram.com/thehighgineer',
      portfolio: 'https://summit.spatialgineers.com',
    },
  },
  {
    id: 'spk_ricardo',
    name: 'Ricardo A. Hernández Díaz',
    handle: '@lightningfingers',
    role: 'Co-Founder, Host & CPO ("Lightning Fingers")',
    organization: 'Spatialgineers LLC',
    avatarUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
    bio: 'Cofundador, vicepresidente y CPO de Spatialgineers ("Lightning Fingers"). Ingeniero mecánico especializado en ensamble de Unity, WebXR, optimización de activos 3D, backend de interactividad y orquestación de transmisiones OBS híbridas.',
    pillarId: 'SGX.SYSTEM',
    day: 1,
    isKeynote: true,
    socialLinks: {
      linkedin: 'https://linkedin.com/in/ricardo-hernandez-sgx',
      twitter: 'https://twitter.com/lightningfingers',
      github: 'https://github.com/spatialgineers',
    },
  },
];

// Interactive 360 Map Nodes (Chroma Studios, Roblox Space, Awaken Gallery, Industry Stage, Drone Bay, Chroma VIP Lounge)
export const INITIAL_MAP_360_NODES: Map360Node[] = [
  {
    id: 'node_chroma_studios',
    title: 'Chroma Space Studios',
    areaName: 'San Juan Studio Stage',
    locationLabel: 'San Juan, PR',
    category: 'PHYSICAL_STUDIO',
    mapCoords: { x: 52, y: 38 },
    panorama360Url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2026.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Nosotros/IMG_2026.png',
    description: 'Venue del Día 3 (SGX Showcase, híbrido). Estudio de producción con luces, proyectores y cámaras integrados, y escenario para el rig de avatar.',
    liveStatus: 'HYBRID_LIVE',
    capacityInfo: 'Por invitación y cupo limitado: 40 a 60 personas como máximo',
    connectedNodeIds: ['node_chroma_vip_lounge', 'node_awaken_gallery', 'node_industry_stage'],
    hotspots: [
      {
        id: 'hs_stage_1',
        title: 'Escenario Principal & Rig Avatar',
        description: 'Punto de demostración en vivo con captura facial en tiempo real detrás de pantalla.',
        yaw: 0,
        pitch: -5,
        actionType: 'VIEW_SESSION',
      },
      {
        id: 'hs_stage_2',
        title: 'Mesa de Control OBS & Audio Live',
        description: 'Consola de orquestación en tiempo real para transmisión en YouTube Live.',
        yaw: 90,
        pitch: -10,
        actionType: 'NAVIGATE',
        targetNodeId: 'node_industry_stage',
      },
      {
        id: 'hs_stage_3',
        title: 'Portal al espacio de Roblox',
        description: 'Punto de conexión espacial entre el estudio físico y el mundo virtual.',
        yaw: -120,
        pitch: 5,
        actionType: 'NAVIGATE',
        targetNodeId: 'node_roblox',
      }
    ]
  },
  {
    id: 'node_roblox',
    title: 'Espacio Spatialgineers en Roblox',
    areaName: 'Roblox Virtual World',
    locationLabel: 'roblox.com/games/spatialgineers-summit',
    category: 'METAVERSE',
    mapCoords: { x: 22, y: 25 },
    panorama360Url: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
    description: 'Espacio virtual de Spatialgineers en Roblox (embed opcional, si se usa). Puede albergar las presentaciones de los artistas invitados durante los intermedios.',
    liveStatus: 'ONLINE_ACTIVE',
    capacityInfo: 'Instancias de 100 usuarios en simultáneo con mesh global',
    connectedNodeIds: ['node_chroma_studios', 'node_awaken_gallery', 'node_drone_bay'],
    embedUrl: 'https://www.roblox.com',
    hotspots: [
      {
        id: 'hs_rbx_1',
        title: 'Main Concert Stage',
        description: 'Plataforma para las presentaciones de los artistas invitados (por anunciar).',
        yaw: 15,
        pitch: 0,
        actionType: 'VIEW_SESSION',
      },
      {
        id: 'hs_rbx_2',
        title: 'Pabellón de los 6 Pilares',
        description: 'Exposición interactiva de activos 3D creados por los Spatialgineers.',
        yaw: -80,
        pitch: -5,
        actionType: 'NAVIGATE',
        targetNodeId: 'node_awaken_gallery',
      }
    ]
  },
  {
    id: 'node_awaken_gallery',
    title: 'SGX Guild Trials Gallery',
    areaName: 'Virtual 3D Pavilions',
    locationLabel: 'Pabellones Virtuales WebGL 3D',
    category: 'VIRTUAL_GALLERY',
    mapCoords: { x: 75, y: 30 },
    panorama360Url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2038.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Nosotros/IMG_2038.png',
    description: 'Galería espacial que alberga los portafolios interactivos de los participantes del SGX Guild. Explora sus creaciones en 3D y vota por tu favorito.',
    liveStatus: 'VIRTUAL_READY',
    capacityInfo: 'Acceso WebGL universal optimizado',
    connectedNodeIds: ['node_chroma_studios', 'node_roblox', 'node_hq_lab'],
    hotspots: [
      {
        id: 'hs_awk_1',
        title: 'Cámara de Votación Comunitaria',
        description: 'Registra tu voto en la votación gamificada de los 8 Initiates del Summit 2026.',
        yaw: 45,
        pitch: 0,
        actionType: 'OPEN_URL',
        actionUrl: '/play',
      }
    ]
  },
  {
    id: 'node_industry_stage',
    title: 'Industry Talks Amphitheater',
    areaName: 'Digital Auditorium Stage',
    locationLabel: 'YouTube Live Broadcast Hub',
    category: 'ARENA',
    mapCoords: { x: 38, y: 65 },
    panorama360Url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2028.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Nosotros/IMG_2028.png',
    description: 'Anfiteatro digital dedicado al Día 2 (Día de la Industria). 6 conversaciones de alto impacto con líderes de la industria sobre narrativa, 3D, IA y computación espacial.',
    liveStatus: 'ONLINE_ACTIVE',
    capacityInfo: 'Audiencia digital global ilimitada',
    connectedNodeIds: ['node_chroma_studios', 'node_hq_lab'],
    hotspots: [
      {
        id: 'hs_ind_1',
        title: 'Panel de Transmisión Interactiva',
        description: 'Preguntas y respuestas en vivo moderadas a través del chat de la plataforma.',
        yaw: 0,
        pitch: 5,
        actionType: 'VIEW_SESSION',
      }
    ]
  },
  {
    id: 'node_drone_bay',
    title: 'Drone Port & Delivery Bay',
    areaName: 'Interactive Simulation Arena',
    locationLabel: 'Hikon Point-to-Point Test Track',
    category: 'ARENA',
    mapCoords: { x: 80, y: 72 },
    panorama360Url: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    description: 'Pista de pruebas y simulación interactiva para el juego de drones SGX. Pilota tu dron punto a punto, esquiva obstáculos y recolecta cajas de patrocinadores.',
    liveStatus: 'ONLINE_ACTIVE',
    capacityInfo: 'Minijuego en tiempo real con ranking en vivo',
    connectedNodeIds: ['node_roblox', 'node_chroma_vip_lounge'],
    hotspots: [
      {
        id: 'hs_drn_1',
        title: 'Lanzadera de Vuelo Virtual',
        description: 'Inicia el minijuego de drones en el canvas interactivo.',
        yaw: -45,
        pitch: -15,
        actionType: 'VIEW_SESSION',
      }
    ]
  },
  {
    id: 'node_chroma_vip_lounge',
    title: 'Chroma Networking Lounge',
    areaName: 'Zona de networking',
    locationLabel: 'San Juan, PR',
    category: 'LOUNGE',
    mapCoords: { x: 15, y: 78 },
    panorama360Url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2037.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Nosotros/IMG_2037.png',
    description: 'Zona de networking dentro de Chroma Space Studios para el canje de premios, mayormente digitales, y la conversación entre creadores e invitados.',
    liveStatus: 'HYBRID_LIVE',
    capacityInfo: 'Por invitación (aforo total del Día 3: 40 a 60 personas)',
    connectedNodeIds: ['node_chroma_studios', 'node_drone_bay'],
    hotspots: [
      {
        id: 'hs_lounge_1',
        title: 'Punto de canje de premios',
        description: 'Muestra tu código QR de puntuación para canjear tus premios (mayormente digitales).',
        yaw: 60,
        pitch: -5,
        actionType: 'OPEN_URL',
        actionUrl: '/play',
      }
    ]
  },
  {
    id: 'node_hq_lab',
    title: 'Spatialgineers R&D Core',
    areaName: 'Lab Central',
    locationLabel: 'Spatialgineers Headquarters',
    category: 'PHYSICAL_STUDIO',
    mapCoords: { x: 50, y: 88 },
    panorama360Url: 'https://cdn.spatialgineers.com/Nosotros/IMG_2029.png',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Nosotros/IMG_2029.png',
    description: 'Laboratorio de desarrollo central donde se ensamblan los visualizadores WebGL, los shaders UberShader y la infraestructura en la nube.',
    liveStatus: 'VIRTUAL_READY',
    connectedNodeIds: ['node_chroma_studios', 'node_industry_stage'],
    hotspots: []
  }
];

// Initial Peer-to-Peer & Channel Messages
export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_01',
    channelId: '#general',
    senderId: 'spk_danelson',
    senderName: 'Danelson ("The Highgineer")',
    senderAvatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png',
    senderRole: 'ORGANIZER',
    senderPillar: 'SGX.STAGE',
    text: '¡Bienvenidos al Spatialgineers Summit 2026! 🔥 La transmisión ya está configurada en YouTube Live. ¡Revisen su agenda personalizada y prepárense para votar!',
    timestamp: Date.now() - 3600000,
    isPinned: true,
    reactions: { '🔥': 28, '🚀': 35, '💎': 19 }
  },
  {
    id: 'msg_02',
    channelId: '#general',
    senderId: 'spk_ricardo',
    senderName: 'Ricardo ("Lightning Fingers")',
    senderAvatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
    senderRole: 'ORGANIZER',
    senderPillar: 'SGX.SYSTEM',
    text: 'Recuerden que la app funciona 100% offline para consultar horarios. Pueden exportar los bloques a Google Calendar o Apple Calendar desde el botón de la sesión.',
    timestamp: Date.now() - 1800000,
    reactions: { '👍': 14, '⚡': 9 }
  },
  {
    id: 'msg_03',
    channelId: '#stage-live',
    senderId: 'spk_artist_tba',
    senderName: 'Artista invitado (por anunciar)',
    senderAvatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png',
    senderRole: 'SPEAKER',
    senderPillar: 'SGX.STAGE',
    text: '¡Listos para el intermedio de artista! Los visualizadores reactivos de partículas están calibrados.',
    timestamp: Date.now() - 900000,
    reactions: { '🎵': 22, '🔥': 17 }
  },
  {
    id: 'msg_04',
    channelId: '#initiates-awaken',
    senderId: 'spk_initiate_1',
    senderName: 'Initiate #1 (SGX Guild)',
    senderAvatar: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
    senderRole: 'INITIATE',
    senderPillar: 'SGX.SHOWCASE',
    text: 'Mi portafolio "Bio-Luminescent WebGL Pavilions" ya está cargado en la galería 3D. ¡Nos vemos en el bloque de las 2:30 PM!',
    timestamp: Date.now() - 600000,
    reactions: { '✨': 18, '👏': 25 }
  }
];

// Initial Attendee Profiles for Networking
export const INITIAL_ATTENDEE_PROFILES: AttendeeProfile[] = [
  {
    id: 'att_01',
    name: 'Carlos Benítez',
    title: 'XR Creative Technologist',
    company: 'Nexus Realities PR',
    avatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Stage%20Icon%20BY.png',
    bio: 'Perfil de muestra (datos simulados). Desarrollador Unity y WebXR apasionado por conciertos virtuales y audio espacial binaural.',
    pillars: ['SGX.STAGE', 'SGX.SYNTHESIZE'],
    isOnline: true,
    ticketType: 'HYBRID_SAN_JUAN',
    socialLinks: { linkedin: 'https://linkedin.com', twitter: 'https://twitter.com' }
  },
  {
    id: 'att_02',
    name: 'Mariana Santos',
    title: '3D Environmental Artist',
    company: 'Caribe Interactive',
    avatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
    bio: 'Perfil de muestra (datos simulados). Modelado procedural, fotogrametría y diseño de escenarios inmersivos para turismo y educación.',
    pillars: ['SGX.SHOWCASE', 'SGX.STORY'],
    isOnline: true,
    ticketType: 'DIGITAL_ACCESS',
    socialLinks: { portfolio: 'https://artstation.com', linkedin: 'https://linkedin.com' }
  },
  {
    id: 'att_03',
    name: 'Jorge Véliz',
    title: 'Fullstack Game Systems Engineer',
    company: 'Indie Spatial Studio',
    avatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Showcase%20Icon%20BY.png',
    bio: 'Perfil de muestra (datos simulados). Especialista en WebSockets, sincronización multiplayer y backends en tiempo real para mundos virtuales.',
    pillars: ['SGX.SYSTEM', 'SGX.SPARK'],
    isOnline: false,
    ticketType: 'VIP_PASS',
    socialLinks: { linkedin: 'https://linkedin.com' }
  },
  {
    id: 'att_04',
    name: 'Lucía Ortiz',
    title: 'Transmedia Creative Director',
    company: 'Studio Cero San Juan',
    avatar: 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Story%20Icon%20BY.png',
    bio: 'Perfil de muestra (datos simulados). Narrativas ramificadas, producción de cine interactivo y arquitectura de universos ficcionales.',
    pillars: ['SGX.STORY', 'SGX.STAGE'],
    isOnline: true,
    ticketType: 'HYBRID_SAN_JUAN'
  }
];

// Interactive Embed Widgets (Mini-Games, Roblox, WebGL Sandboxes, WebXR)
export const INITIAL_EMBED_WIDGETS: EmbedWidget[] = [
  {
    id: 'embed_drone_game',
    title: 'SGX Drone Point-to-Point Simulator',
    category: 'MINI_GAME',
    embedType: 'CODE',
    description: 'Minijuego interactivo nativo desarrollado en Canvas 2D/WebGL. Controla el dron espacial con controles táctiles o teclado (WASD/flechas), recoge cajas de patrocinadores y compite por el récord de tiempo.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Spark1.png',
    externalUrl: 'https://spatialgineers.com/drone-simulator',
    author: 'Spatialgineers Spark Team',
    tags: ['Drone', 'Mini-Game', 'Playable', 'Canvas', 'Physics'],
    rating: 4.9,
    featured: true,
  },
  {
    id: 'embed_spline_3d',
    title: 'Spline 3D Interactive Spatial Environment',
    category: 'WEBGL_XR',
    embedType: 'URL',
    embedUrl: 'https://my.spline.design/interactivecube-953e5e49ad0808b260f38b0ad45ca5d3/',
    externalUrl: 'https://spline.design',
    description: 'Escenario 3D interactivo en tiempo real renderizado mediante WebGL / WebXR. Arrastra con el cursor o el dedo para rotar la geometría espacial, activar luces dinámicas e interactuar con la escena.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    author: 'SGX Showcase & Spline 3D',
    tags: ['Spline', '3D Scene', 'WebGL', 'Interactive', 'WebXR'],
    rating: 5.0,
    featured: true,
  },
  {
    id: 'embed_youtube_stream',
    title: 'YouTube 4K Spatial Stage & Concert Broadcast',
    category: 'STREAM_VIDEO',
    embedType: 'URL',
    embedUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk',
    externalUrl: 'https://youtube.com',
    description: 'Transmisión en vivo oficial del Summit por YouTube Live con visualizadores de escenario. Sintoniza los portafolios de los 8 Initiates y los intermedios de artistas invitados.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Stage1.png',
    author: 'Spatialgineers Broadcast & Los Mismos TV',
    tags: ['YouTube', 'Live Stream', 'Concert', '4K Broadcast'],
    rating: 4.9,
    featured: true,
  },
  {
    id: 'embed_shader_lab',
    title: 'Interactive Live GLSL Cyber Matrix Shader Canvas',
    category: 'CUSTOM_CODE',
    embedType: 'CODE',
    description: 'Sandbox interactivo de shaders procedurales GLSL / Canvas 2D en tiempo real con efecto Matrix Cyberpunk reactivo y controles de velocidad y color.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
    customCode: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #0A0A0A; color: #00DDFF; font-family: monospace; overflow: hidden; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    canvas { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 1; }
    .hud { position: relative; z-index: 10; background: rgba(10, 15, 29, 0.85); border: 1px solid #00DDFF; padding: 18px 24px; border-radius: 8px; text-align: center; backdrop-filter: blur(8px); box-shadow: 0 0 25px rgba(0, 221, 255,0.25); max-width: 480px; }
    h1 { font-size: 18px; margin-bottom: 8px; text-shadow: 0 0 10px #00DDFF; letter-spacing: 2px; }
    p { font-size: 11px; color: #94A3B8; margin-bottom: 14px; }
    .controls { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
    button { background: #00DDFF; color: #000; border: none; padding: 8px 14px; font-weight: bold; font-family: monospace; font-size: 11px; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
    button:hover { background: #FDCC0D; transform: scale(1.05); }
    .status { font-size: 10px; color: #10B981; margin-top: 10px; }
  </style>
</head>
<body>
  <canvas id="matrix"></canvas>
  <div class="hud">
    <h1>SGX MATRIX SHADER ENGINE</h1>
    <p>Renderizado procedural en tiempo real • GLSL Canvas Shader</p>
    <div class="controls">
      <button onclick="toggleColor('#00DDFF')">NEON CYAN</button>
      <button onclick="toggleColor('#FDCC0D')">SGX GOLD</button>
      <button onclick="toggleColor('#FF0055')">CYBER MAGENTA</button>
      <button onclick="toggleSpeed()">SPEED BOOST</button>
    </div>
    <div class="status" id="fps">FPS: 60 • ACTIVE PARTICLES: 1,024</div>
  </div>

  <script>
    const canvas = document.getElementById('matrix');
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    let primaryColor = '#00DDFF';
    let speedMult = 1;

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const characters = 'SPATIALGINEERS0123456789XR3DGLSLWEBGLROBLOX';
    const fontSize = 14;
    const columns = Math.floor(width / fontSize);
    const drops = Array(columns).fill(1);

    function draw() {
      ctx.fillStyle = 'rgba(5, 8, 17, 0.1)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = primaryColor;
      ctx.font = fontSize + 'px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += speedMult;
      }
      requestAnimationFrame(draw);
    }
    draw();

    function toggleColor(color) { primaryColor = color; }
    function toggleSpeed() { speedMult = speedMult === 1 ? 2.5 : 1; }
  </script>
</body>
</html>`,
    author: 'SGX Spark Shaders',
    tags: ['GLSL', 'Shaders', 'WebGL', 'Live Code', 'Matrix'],
    rating: 4.9,
  },
  {
    id: 'embed_roblox_world',
    title: 'Roblox Spatialgineers Live Stage',
    category: 'METAVERSE_ROBLOX',
    embedType: 'URL',
    embedUrl: 'https://www.roblox.com',
    externalUrl: 'https://www.roblox.com/games/spatialgineers-summit',
    description: 'Espacio multijugador en Roblox (embed opcional, si se usa) para los intermedios de artistas invitados durante el Summit 2026. Entra con tu avatar o mira la transmisión en vivo.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Guild/Guild%20color.png',
    author: 'Spatialgineers Roblox Guild',
    tags: ['Roblox', 'Concerts', 'Multiplayer', 'Virtual World'],
    rating: 5.0,
    featured: true,
  },
  {
    id: 'embed_whiteboard',
    title: 'Collaborative Spatial Whiteboard & Architecture Canvas',
    category: 'WEBAPP',
    embedType: 'URL',
    embedUrl: 'https://excalidraw.com',
    externalUrl: 'https://excalidraw.com',
    description: 'Pizarra colaborativa interactiva embebida para diagramar arquitecturas espaciales, bocetar wireframes 3D y compartir ideas de diseño durante los talleres del Summit.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    author: 'Spatialgineers System Team',
    tags: ['Whiteboard', 'Architecture', 'Tool', 'Excalidraw'],
    rating: 4.8,
  },
  {
    id: 'embed_cyber_synth',
    title: 'WebAudio Reactive Spatial Synthesizer',
    category: 'CUSTOM_CODE',
    embedType: 'CODE',
    description: 'Sintetizador WebAudio interactivo en tiempo real con oscilador de frecuencia, filtro paso-bajo y visualizador osciloscópico reactivo.',
    thumbnailUrl: 'https://cdn.spatialgineers.com/Branding/Pilares/Synthesize1.png',
    customCode: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #121212; color: #FFF; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; padding: 20px; }
    .synth-panel { background: #1B1B1B; border: 2px solid #00DDFF; border-radius: 12px; padding: 24px; width: 100%; max-width: 520px; box-shadow: 0 0 30px rgba(0, 221, 255,0.2); }
    h2 { font-size: 16px; color: #00DDFF; text-align: center; margin-bottom: 12px; letter-spacing: 2px; }
    canvas { width: 100%; height: 120px; background: #0A0A0A; border: 1px solid #32527B; border-radius: 6px; margin-bottom: 16px; }
    .keys { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; margin-top: 12px; }
    .key-btn { background: #2B2B2B; border: 1px solid #00DDFF; color: #00DDFF; padding: 14px 4px; font-size: 12px; font-weight: bold; border-radius: 4px; cursor: pointer; text-align: center; transition: all 0.1s; user-select: none; }
    .key-btn:active { background: #FDCC0D; color: #000; transform: translateY(2px); }
    .controls { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 11px; color: #94A3B8; }
  </style>
</head>
<body>
  <div class="synth-panel">
    <h2>SGX SPATIAL AUDIO SYNTHESIZER</h2>
    <div class="controls">
      <span>OSCILLATOR: SINE / SAWTOOTH</span>
      <span>STATUS: READY</span>
    </div>
    <canvas id="scope"></canvas>
    <div class="keys">
      <button class="key-btn" onclick="playNote(261.63)">C4</button>
      <button class="key-btn" onclick="playNote(293.66)">D4</button>
      <button class="key-btn" onclick="playNote(329.63)">E4</button>
      <button class="key-btn" onclick="playNote(349.23)">F4</button>
      <button class="key-btn" onclick="playNote(392.00)">G4</button>
      <button class="key-btn" onclick="playNote(440.00)">A4</button>
      <button class="key-btn" onclick="playNote(493.88)">B4</button>
    </div>
  </div>

  <script>
    let audioCtx;
    const canvas = document.getElementById('scope');
    const ctx = canvas.getContext('2d');
    canvas.width = 480;
    canvas.height = 120;

    function playNote(freq) {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
      drawWave(freq);
    }

    function drawWave(freq) {
      ctx.fillStyle = '#0A0A0A';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = '#00DDFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < canvas.width; x++) {
        const y = 60 + Math.sin(x * 0.05 * (freq / 200)) * 35;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    drawWave(440);
  </script>
</body>
</html>`,
    author: 'SGX Synthesize Audio Team',
    tags: ['WebAudio', 'Synthesizer', 'Spatial Audio', 'Interactive'],
    rating: 4.9,
  }
];

// Sponsorship Tiers (Dossier de Auspicio v2026.10.1). Each Tier includes everything in the one before it.
// Payment in full by Nov 14, 2026 (Tiers 4 and 5 may pay in two installments). Materials by Nov 30, 2026.
// Only sponsors confirmed in writing are listed; no placeholder brands.
export const SPONSORSHIP_TIERS: SponsorshipTier[] = [
  {
    id: 'tier_1',
    tierNumber: 1,
    name: 'Digital Presence',
    priceRange: '$50 – $100',
    keyBenefit: '10 cupos · Logo en la webapp, overlays de la transmisión e interfaz de gamificación',
    yearLongLicense: false,
    features: [
      'Logo en la webapp del Summit y en los overlays de la transmisión de los tres días',
      'Mención de marca en la apertura o el cierre de un día',
      'Logo en la interfaz de gamificación y votación',
      'Listado como supporter en el contenido de recap',
    ],
    sponsors: []
  },
  {
    id: 'tier_2',
    tierNumber: 2,
    name: 'Gamified',
    priceRange: '$250 – $500',
    keyBenefit: '6 cupos · Marca integrada en el minijuego 3D del dron y trivia de marca en vivo',
    yearLongLicense: false,
    features: [
      'Todo lo incluido en Tier 1',
      'Marca integrada en el minijuego 3D del dron (cajas de entrega, zonas de aterrizaje o drops)',
      'Una pregunta de trivia de marca en vivo (+25 XP para quienes participen)',
      'Logo en el dashboard de la webapp',
      'Mención social durante el evento y al menos una publicación de promoción previa',
    ],
    sponsors: []
  },
  {
    id: 'tier_3',
    tierNumber: 3,
    name: 'Experience',
    priceRange: '$750 – $1,000',
    keyBenefit: '6 cupos · Un segmento con el nombre de su marca + video de presentación',
    yearLongLicense: false,
    features: [
      'Todo lo incluido en Tier 2',
      'Un segmento con su nombre, por ejemplo "The [Marca] Showcase" o "[Pilar] powered by [Marca]"',
      'Video de presentación de 30 a 60 segundos antes de su segmento (lo entrega el sponsor o lo produce Spatialgineers)',
      'Reto de marca en el Reactor del SGX Pass (misión y sello propios)',
      'Banners principales y crédito en el recap y el highlight reel',
    ],
    sponsors: []
  },
  {
    id: 'tier_4',
    tierNumber: 4,
    name: 'Signature Experience',
    priceRange: '$1,500 – $2,500',
    keyBenefit: '3 cupos · "Experience by [Marca]" + licencia de acceso por 365 días desde noviembre',
    yearLongLicense: true,
    features: [
      'Todo lo incluido en Tier 3',
      'Nombre "Experience by [Marca]" en una activación principal',
      'Integración de la marca en los minijuegos, el visualizador y el sistema de votación',
      'Documental y minijuego a medida: solo Tier 4 y Tier 5 (el minijuego a medida se cotiza aparte)',
      'Licencia de acceso a la webapp y a sus espacios de promoción y contenido en redes cada vez que se publique algo del Summit, por 365 días desde noviembre. No hay transferencia de código',
      'Exclusividad por categoría: una sola marca de su sector',
      'Reporte final a los 30 días con vistas, asistencia, clics y participación, sin datos personales',
      'Derecho de primera renovación para el Summit 2027 al mismo Tier (la oferta vence 30 días después del Summit 2026)',
    ],
    sponsors: []
  },
  {
    id: 'tier_5',
    tierNumber: 5,
    name: 'Alianza de servicios esenciales',
    priceRange: 'A convenir (sin precio público)',
    keyBenefit: '3 cupos · Para quien aporte servicios esenciales (venue, internet, comida u otros)',
    yearLongLicense: true,
    features: [
      'Para quien aporte servicios esenciales del evento (venue, internet, comida u otros), en especie o monetario',
      'Los beneficios se pactan por escrito con cada aliado e incluyen lo del Tier 4 según el acuerdo',
      'Exclusividad por categoría',
      'La comida es un ejemplo de aporte en especie: si alguien la aporta, se ofrece en el evento, sin compromiso de Spatialgineers',
    ],
    sponsors: [
      { name: 'Chroma Space Studios', logoUrl: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=100&auto=format&fit=crop&q=80', websiteUrl: 'https://chromaspace.pr', description: 'Venue del Día 3 (SGX Showcase) en San Juan' }
    ]
  }
];

// Initial Analytics Metrics
export const INITIAL_ANALYTICS: SummitAnalyticsMetrics = {
  totalRegistered: 0,
  digitalAttendees: 0,
  physicalAttendees: 0,
  liveStreamPeakViewers: 0,
  totalVotesCast: 0,
  chatMessagesSent: 0,
  xr360NodeViews: 0,
  droneGamesPlayed: 0,
  prizesClaimed: 0,
  pillarEngagement: {
    'SGX.STORY': 0,
    'SGX.SHOWCASE': 0,
    'SGX.SPARK': 0,
    'SGX.STAGE': 0,
    'SGX.SYSTEM': 0,
    'SGX.SYNTHESIZE': 0,
  },
  countryDistribution: [],
  hourlyEngagement: []
};

// Complete i18n Translation Dictionary
export const SUMMIT_I18N: Record<LanguageCode, Record<string, string>> = {
  es: {
    hero_title: 'SPATIALGINEERS SUMMIT 2026',
    hero_dates: 'DICIEMBRE 11 – 13, 2026 • SAN JUAN, PUERTO RICO',
    hero_tagline: 'El regreso del evento de spatial computing de Spatialgineers: arquitectura espacial, WebXR, visualizadores en vivo y gamificación.',
    hero_format: '3 DÍAS: DÍAS 1–2 DIGITALES (YOUTUBE LIVE) • DÍA 3 SGX SHOWCASE HÍBRIDO, POR INVITACIÓN, EN CHROMA SPACE STUDIOS',
    hero_badge: 'REGRESA EL SPATIALGINEERS SUMMIT • SEGUNDA EDICIÓN',
    hero_desc: '3 días de spatial computing, artistas invitados, conversaciones de industria y producción virtual en vivo. Días 1 y 2 digitales por YouTube Live. Día 3 (SGX Showcase) híbrido, por invitación y cupo limitado (40 a 60 personas), en Chroma Space Studios, San Juan, PR.',
    countdown_hud_title: 'SGX HUD • CONTEO REGRESIVO OFICIAL',
    countdown_days: 'DÍAS',
    countdown_hours: 'HORAS',
    countdown_mins: 'MIN',
    countdown_secs: 'SEG',
    countdown_cycle: 'CICLO 24H',
    countdown_realtime: 'TIEMPO REAL',
    btn_register: 'REGISTRARSE AL SUMMIT',
    btn_enter_map: 'MAPA 360° INTERACTIVO',
    btn_view_agenda: 'AGENDA & HORARIOS',
    btn_play_vote: 'PLAY & VOTE LIVE',
    btn_chat: 'CHAT EN VIVO & NETWORKING',
    btn_embeds: 'HUB DE MINIJUEGOS & ROBLOX',
    btn_sponsors: 'PATROCINIOS',
    btn_stage_visualizer: 'STAGE VISUALIZER 360°',
    btn_initiates: 'SGX GUILD INITIATES',
    tab_overview: 'RESUMEN GENERAL',
    tab_pillars: '6 PILARES SGX',
    tab_schedule: 'AGENDA & HORARIOS',
    tab_map360: 'MAPAS 360°',
    tab_broadcast: 'SALONES & BROADCAST',
    tab_guild: 'SGX GUILD SHOWCASE',
    tab_speakers: 'SPEAKERS OFICIALES',
    tab_networking: 'CHAT & NETWORKING',
    tab_embeds: 'EMBEDS & JUEGOS',
    tab_sponsors: 'PATROCINIOS & SHOWCASES',
    tab_analytics: 'MÉTRICAS EN VIVO',
    quick_actions_title: 'ACCESO RÁPIDO A MÓDULOS DEL SUMMIT',
    quick_actions_desc: 'Navega directamente a los interactivos, transmisiones y herramientas en tiempo real',
    stat_venue: 'Venue del Día 3 (sujeto a firma)',
    stat_venue_val: 'Chroma Space Studios',
    stat_trials: 'SGX Ranked Trials',
    stat_trials_val: '8 Initiates activos',
    stat_stream: 'Transmisión Global',
    stat_stream_val: 'YouTube + Roblox Live',
    stat_pillars: 'Pilares Tecnológicos',
    stat_pillars_val: '6 Pilares Spatialgineers',
    day_1: 'DÍA 1 • VIRTUAL',
    day_1_date: 'DIC 11',
    day_1_title: 'PILARES SGX & INITIATES',
    day_1_desc: '10:00 am – 4:30 pm. Apertura, seis bloques de pilares (SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System y SGX.Synthesize) con un artista invitado antes de cada uno, y los portafolios de los 8 Initiates (8 min c/u).',
    day_2: 'DÍA 2 • VIRTUAL',
    day_2_date: 'DIC 12',
    day_2_title: 'DÍA DE LA INDUSTRIA',
    day_2_desc: '10:00 am – 4:00 pm. Seis conversaciones de industria de 45 minutos, una por pilar, con personas invitadas (por anunciar). 100% digital.',
    day_3: 'DÍA 3 • HÍBRIDO',
    day_3_date: 'DIC 13',
    day_3_title: 'SGX SHOWCASE',
    day_3_desc: '10:00 am – 4:00 pm. Híbrido, por invitación (40 a 60 personas), en Chroma Space Studios, San Juan y YouTube Live. Demos en vivo, SGX Guild Ranked Trials Pitch Session con los top 6 Initiates (5 min c/u), networking con votación gamificada y premios.',
    pillars_title: 'LOS 6 PILARES METODOLÓGICOS DE SPATIALGINEERS',
    pillars_subtitle: 'Nuestra arquitectura integral de ingeniería espacial, narrativa y producción transmedia.',
    filter_all: 'TODAS LAS SESIONES',
    filter_my_agenda: 'MI AGENDA',
    btn_add_agenda: '+ MI AGENDA',
    btn_remove_agenda: 'GUARDADO',
    btn_export_calendar: 'AÑADIR A CALENDARIO (.ICS)',
    btn_google_calendar: 'GOOGLE CALENDAR',
    btn_notify_session: 'ALERTAR',
    btn_notify_active: 'NOTIFICAR ACTIVO',
    offline_ready: 'ONLINE • CACHE SYNC OK',
    offline_badge: 'MODO OFFLINE (CACHE LOCAL)',
    search_placeholder: 'Buscar sesiones, speakers, temas...',
    chat_title: 'SALA DE CHAT EN VIVO SPATIALGINEERS',
    chat_placeholder: 'Escribe un mensaje para la comunidad...',
    chat_send: 'ENVIAR',
    map_instruction: 'Arrastra con el ratón o el dedo para girar 360°. Haz clic en los nodos.',
    awaken_title: 'SGX GUILD SHOWCASE 2026',
    awaken_subtitle: 'Presentación oficial del SGX Guild System y los SGX Ranked Trials',
    sponsor_title: 'PATROCINADORES Y BRAND SHOWCASES ACTIVOS',
    sponsor_subtitle: 'Descubre las marcas aliadas, ofertas exclusivas y activaciones interactivas.',
    sponsor_ticker_title: 'PATROCINADORES OFICIALES & ALIADOS',
    sponsor_inquiry_btn: 'SOLICITAR PATROCINIO',
    buy_tickets_btn: 'REGISTRO',
    designed_developed_by: '★ Evento diseñado y desarrollado por Spatialgineers, LLC ★',
    footer_venue_partner: 'Venue del Día 3: Chroma Space Studios (San Juan, PR)',
    footer_streaming_partner: 'Transmisión: YouTube Live • LinkedIn Live • Facebook Live. Los Mismos TV transmite junto a nosotros',
    footer_legal: 'Plataforma de computación espacial, telemetría y transmisión en vivo construida con Three.js, WebXR, Firestore y arquitectura de baja latencia.',
    drone_game_title: 'SGX DRONE POINT-TO-POINT SIMULATOR',
    drone_game_instructions: 'Usa las flechas / WASD para volar. Barra espaciadora para TURBO.',
    drone_game_score: 'PUNTUACIÓN',
    drone_game_highscore: 'RÉCORD',
    drone_game_energy: 'TURBO BOOST',
    drone_game_start: 'DESPEGAR AHORA',
    drone_game_retry: 'REINTENTAR VUELO',
    drone_game_collision: '¡COLISIÓN DETECTADA!',
    drone_game_sponsor_tag: 'Espacio de marca disponible para sponsors (Tier 2 en adelante)',
    map_mode_360: '360° FOTOESFERA',
    map_mode_2d: 'RADAR 2D',
    map_node_sessions: 'VER SESIONES DE ESTE NODO',
  },
  en: {
    hero_title: 'SPATIALGINEERS SUMMIT 2026',
    hero_dates: 'DECEMBER 11 – 13, 2026 • SAN JUAN, PUERTO RICO',
    hero_tagline: 'The return of the Spatialgineers spatial computing event: spatial architecture, WebXR, live visualizers and gamification.',
    hero_format: '3 DAYS: DAYS 1–2 DIGITAL (YOUTUBE LIVE) • DAY 3 SGX SHOWCASE, HYBRID, BY INVITATION AT CHROMA SPACE STUDIOS',
    hero_badge: 'THE SPATIALGINEERS SUMMIT RETURNS • SECOND EDITION',
    hero_desc: '3 days of spatial computing, guest artists, industry conversations and live virtual production. Days 1 and 2 are digital on YouTube Live. Day 3 (SGX Showcase) is hybrid, by invitation with limited seats (40 to 60 people), at Chroma Space Studios, San Juan, PR.',
    countdown_hud_title: 'SGX HUD • OFFICIAL COUNTDOWN TIMER',
    countdown_days: 'DAYS',
    countdown_hours: 'HOURS',
    countdown_mins: 'MINS',
    countdown_secs: 'SECS',
    countdown_cycle: '24H CYCLE',
    countdown_realtime: 'REAL-TIME',
    btn_register: 'REGISTER FOR SUMMIT',
    btn_enter_map: 'INTERACTIVE 360° MAP',
    btn_view_agenda: 'AGENDA & SCHEDULE',
    btn_play_vote: 'PLAY & VOTE LIVE',
    btn_chat: 'LIVE CHAT & NETWORKING',
    btn_embeds: 'MINI-GAMES & ROBLOX HUB',
    btn_sponsors: 'SPONSORSHIPS',
    btn_stage_visualizer: 'STAGE VISUALIZER 360°',
    btn_initiates: 'SGX GUILD INITIATES',
    tab_overview: 'OVERVIEW',
    tab_pillars: '6 SGX PILLARS',
    tab_schedule: 'AGENDA & SCHEDULE',
    tab_map360: '360° MAPS',
    tab_broadcast: 'ROOMS & BROADCAST',
    tab_guild: 'SGX GUILD SHOWCASE',
    tab_speakers: 'OFFICIAL SPEAKERS',
    tab_networking: 'CHAT & NETWORKING',
    tab_embeds: 'EMBEDS & GAMES',
    tab_sponsors: 'SPONSORS & SHOWCASES',
    tab_analytics: 'LIVE METRICS',
    quick_actions_title: 'QUICK ACCESS TO SUMMIT MODULES',
    quick_actions_desc: 'Navigate directly to live interactive feeds, broadcasts, and real-time tools',
    stat_venue: 'Day 3 Venue',
    stat_venue_val: 'Chroma Space Studios',
    stat_trials: 'SGX Ranked Trials',
    stat_trials_val: '8 active Initiates',
    stat_stream: 'Global Broadcast',
    stat_stream_val: 'YouTube + Roblox Live',
    stat_pillars: 'Tech Pillars',
    stat_pillars_val: '6 Spatialgineers Pillars',
    day_1: 'DAY 1 • VIRTUAL',
    day_1_date: 'DEC 11',
    day_1_title: 'SGX PILLARS & INITIATES',
    day_1_desc: '10:00 am – 4:30 pm. Opening, six pillar blocks (SGX.Story, SGX.Showcase, SGX.Spark, SGX.Stage, SGX.System and SGX.Synthesize) with a guest artist before each one, and the portfolios of the 8 Initiates (8 min each).',
    day_2: 'DAY 2 • VIRTUAL',
    day_2_date: 'DEC 12',
    day_2_title: 'INDUSTRY DAY',
    day_2_desc: '10:00 am – 4:00 pm. Six 45-minute industry conversations, one per pillar, with guest speakers (to be announced). 100% digital.',
    day_3: 'DAY 3 • HYBRID',
    day_3_date: 'DEC 13',
    day_3_title: 'SGX SHOWCASE',
    day_3_desc: '10:00 am – 4:00 pm. Hybrid, by invitation (40 to 60 people), at Chroma Space Studios, San Juan and on YouTube Live. Live demos, the SGX Guild Ranked Trials Pitch Session with the top 6 Initiates (5 min each), networking with gamified voting and prizes.',
    pillars_title: 'THE 6 METHODOLOGICAL PILLARS OF SPATIALGINEERS',
    pillars_subtitle: 'Our comprehensive framework for spatial engineering, lore architecture, and transmedia production.',
    filter_all: 'ALL SESSIONS',
    filter_my_agenda: 'MY AGENDAS',
    btn_add_agenda: '+ MY AGENDA',
    btn_remove_agenda: 'SAVED',
    btn_export_calendar: 'EXPORT CALENDAR (.ICS)',
    btn_google_calendar: 'GOOGLE CALENDAR',
    btn_notify_session: 'NOTIFY ME',
    btn_notify_active: 'NOTIFY ACTIVE',
    offline_ready: 'ONLINE • CACHE SYNC OK',
    offline_badge: 'OFFLINE MODE (LOCAL CACHE)',
    search_placeholder: 'Search sessions, speakers, topics...',
    chat_title: 'SPATIALGINEERS LIVE COMMUNITY CHAT',
    chat_placeholder: 'Type a message to the community...',
    chat_send: 'SEND',
    map_instruction: 'Click and drag to rotate 360° view. Click hotspots to navigate nodes.',
    awaken_title: 'SGX GUILD SHOWCASE 2026',
    awaken_subtitle: 'Official presentation of the SGX Guild System and SGX Ranked Trials',
    sponsor_title: 'SPONSORS & ACTIVE BRAND SHOWCASES',
    sponsor_subtitle: 'Discover sponsor brands, exclusive offers, and interactive activations.',
    sponsor_ticker_title: 'OFFICIAL SPONSORS & ALLIES',
    sponsor_inquiry_btn: 'BECOME A SPONSOR',
    buy_tickets_btn: 'REGISTER',
    designed_developed_by: '★ Event designed and developed by Spatialgineers, LLC ★',
    footer_venue_partner: 'Day 3 venue: Chroma Space Studios (San Juan, PR)',
    footer_streaming_partner: 'Streaming: YouTube Live • LinkedIn Live • Facebook Live. Los Mismos TV streams alongside us',
    footer_legal: 'Spatial computing, telemetry, and live streaming platform built with Three.js, WebXR, Firestore, and low-latency architecture.',
    drone_game_title: 'SGX DRONE POINT-TO-POINT SIMULATOR',
    drone_game_instructions: 'Use arrow keys / WASD to fly. Spacebar for TURBO BOOST.',
    drone_game_score: 'SCORE',
    drone_game_highscore: 'HIGH SCORE',
    drone_game_energy: 'TURBO BOOST',
    drone_game_start: 'LAUNCH DRONE',
    drone_game_retry: 'RETRY FLIGHT',
    drone_game_collision: 'COLLISION DETECTED!',
    drone_game_sponsor_tag: 'Brand space available for sponsors (Tier 2 and up)',
    map_mode_360: '360° PHOTOSPHERE',
    map_mode_2d: '2D RADAR',
    map_node_sessions: 'VIEW SESSIONS IN THIS NODE',
  },
  ja: {
    hero_title: 'SPATIALGINEERS サミット 2026',
    hero_dates: '2026年12月11日〜13日 • サンフアン、プエルトリコ',
    hero_tagline: 'Spatialgineersの空間コンピューティングイベントが帰ってくる：空間アーキテクチャ、WebXR、ライブビジュアライザー、ゲーミフィケーション。',
    hero_format: '3日間：1〜2日目はデジタル（YouTube Live）、3日目はSGX Showcase（招待制ハイブリッド、Chroma Space Studios）',
    hero_badge: 'Spatialgineers Summit 再び開催 • 第2回',
    hero_desc: '空間コンピューティング、ゲストアーティスト、業界対談、ライブバーチャルプロダクションの3日間。1〜2日目はYouTube Liveでデジタル開催。3日目（SGX Showcase）はサンフアンのChroma Space Studiosで招待制・定員40〜60名のハイブリッド開催（契約締結が前提）。',
    countdown_hud_title: 'SGX HUD • 公式カウントダウン',
    countdown_days: '日',
    countdown_hours: '時間',
    countdown_mins: '分',
    countdown_secs: '秒',
    countdown_cycle: '24時間サイクル',
    countdown_realtime: 'リアルタイム',
    btn_register: 'サミット参加登録',
    btn_enter_map: '360°インタラクティブマップ',
    btn_view_agenda: 'スケジュール＆プログラム',
    btn_play_vote: '参加型投票＆ゲーム',
    btn_chat: 'ライブチャット＆交流',
    btn_embeds: 'ゲーム＆Robloxハブ',
    btn_sponsors: 'スポンサーシップ',
    btn_stage_visualizer: '360°ステージビジュアライザー',
    btn_initiates: 'SGXギルドイニシエイト',
    tab_overview: '概要',
    tab_pillars: '6つの柱 (SGX PILLARS)',
    tab_schedule: 'アジェンダ＆プログラム',
    tab_map360: '360°マップ',
    tab_broadcast: '配信ルーム',
    tab_guild: 'SGXギルドショーケース',
    tab_speakers: '公式登壇者一覧',
    tab_networking: 'チャット＆ネットワーキング',
    tab_embeds: '埋め込み＆ゲーム',
    tab_sponsors: 'スポンサー＆ブース',
    tab_analytics: 'リアルタイム分析',
    quick_actions_title: 'サミット各機能へのクイックアクセス',
    quick_actions_desc: 'インタラクティブ体験、ライブ配信、リアルタイム機能へ直接アクセス',
    stat_venue: '3日目の会場（契約締結が前提）',
    stat_venue_val: 'Chroma Space Studios',
    stat_trials: 'SGX Ranked Trials',
    stat_trials_val: 'アクティブなイニシエイト 8名',
    stat_stream: 'グローバル配信',
    stat_stream_val: 'YouTube + Roblox Live',
    stat_pillars: 'テクノロジーの柱',
    stat_pillars_val: 'Spatialgineers 6つの柱',
    day_1: '1日目 • バーチャル',
    day_1_date: '12月11日',
    day_1_title: 'SGXの柱＆イニシエイト',
    day_1_desc: '10:00〜16:30。オープニング、6つの柱のブロック（SGX.Story、SGX.Showcase、SGX.Spark、SGX.Stage、SGX.System、SGX.Synthesize）と各ブロック前のゲストアーティスト、8名のイニシエイトによるポートフォリオ発表（各8分）。',
    day_2: '2日目 • バーチャル',
    day_2_date: '12月12日',
    day_2_title: '業界デー',
    day_2_desc: '10:00〜16:00。各柱につき1つ、45分の業界対談を6本（ゲストは後日発表）。100%デジタル。',
    day_3: '3日目 • ハイブリッド',
    day_3_date: '12月13日',
    day_3_title: 'SGX SHOWCASE',
    day_3_desc: '10:00〜16:00。Chroma Space Studios（契約締結が前提）とYouTube Liveでの招待制ハイブリッド開催（40〜60名）。ライブデモ、上位6名のイニシエイトによるSGX Guild Ranked Trials Pitch Session（各5分）、ゲーミフィケーション投票と賞品。',
    pillars_title: 'SPATIALGINEERS 6つの方法論の柱',
    pillars_subtitle: '空間工学、世界観設計、トランスメディア制作を統合するフレームワーク。',
    filter_all: 'すべてのセッション',
    filter_my_agenda: 'マイスケジュール',
    btn_add_agenda: '+ スケジュールに追加',
    btn_remove_agenda: '登録済み',
    btn_export_calendar: 'カレンダーに追加 (.ICS)',
    btn_google_calendar: 'Googleカレンダー',
    btn_notify_session: '開始時に通知',
    btn_notify_active: '通知ON',
    offline_ready: 'オンライン • キャッシュ同期完了',
    offline_badge: 'オフラインモード (ローカル保存)',
    search_placeholder: 'セッション、登壇者、トピックを検索...',
    chat_title: 'ライブコミュニティチャット',
    chat_placeholder: 'メッセージを入力...',
    chat_send: '送信',
    map_instruction: 'ドラッグして360°見渡し、ノードをクリックして移動します。',
    awaken_title: 'SGX ギルドショーケース 2026',
    awaken_subtitle: 'SGXギルドシステムとSGXランクタイアルの公式発表',
    sponsor_title: '公式スポンサー＆ブランドブース',
    sponsor_subtitle: 'パートナー企業、限定特典、インタラクティブ企画をご覧ください。',
    sponsor_ticker_title: '公式スポンサー＆協力団体',
    sponsor_inquiry_btn: 'スポンサーシップを申し込む',
    buy_tickets_btn: '参加登録',
    designed_developed_by: '★ イベント設計・開発：Spatialgineers, LLC ★',
    footer_venue_partner: 'Day 3 venue: Chroma Space Studios (San Juan, PR)',
    footer_streaming_partner: 'Streaming: YouTube Live • LinkedIn Live • Facebook Live. Los Mismos TV streams alongside us',
    footer_legal: 'Three.js、WebXR、Firestore、低遅延アーキテクチャで構築された空間コンピューティング＆ライブ配信プラットフォーム。',
    drone_game_title: 'SGX ドローンシミュレーター',
    drone_game_instructions: '矢印キー / WASDで飛行。スペースキーでターボブースト。',
    drone_game_score: 'スコア',
    drone_game_highscore: 'ハイスコア',
    drone_game_energy: 'ターボブースト',
    drone_game_start: '飛行開始',
    drone_game_retry: '再挑戦',
    drone_game_collision: '衝突を検知しました！',
    drone_game_sponsor_tag: 'スポンサー枠あり（Tier 2以上）',
    map_mode_360: '360° フォトスフィア',
    map_mode_2d: '2D レーダー',
    map_node_sessions: 'このノードのセッションを見る',
  }
};

// Calendar & Offline Persistence Helpers
// End time from the Run of Show endTime ("4:30 PM"); falls back to +45 min if it cannot be parsed.
function getSessionEndMinutes(session: SummitSession): number {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec((session.endTime || '').trim());
  if (!m) return session.startMinutes + 45;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === 'PM') h += 12;
  const end = h * 60 + parseInt(m[2], 10);
  return end > session.startMinutes ? end : session.startMinutes + 45;
}

export function generateICSForSession(session: SummitSession): string {
  const sanitize = (text: string) => text.replace(/\n/g, '\\n').replace(/,/g, '\\,');
  
  // Format dates: 20261211T100000Z
  const dateMap: Record<number, string> = {
    1: '20261211',
    2: '20261212',
    3: '20261213',
  };

  const dayDate = dateMap[session.day] || '20261211';
  const startHour = Math.floor(session.startMinutes / 60).toString().padStart(2, '0');
  const startMin = (session.startMinutes % 60).toString().padStart(2, '0');
  const endMinutes = getSessionEndMinutes(session);
  const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0');
  const endMin = (endMinutes % 60).toString().padStart(2, '0');

  const dtStart = `${dayDate}T${startHour}${startMin}00`;
  const dtEnd = `${dayDate}T${endHour}${endMin}00`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Spatialgineers//Summit 2026 Engine//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:sgx_sess_${session.id}_2026@spatialgineers.com`,
    `DTSTAMP:${dayDate}T000000Z`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${sanitize(session.title)}`,
    `DESCRIPTION:${sanitize(session.description + ' \\n\\nVenue: ' + session.venueLocation)}`,
    `LOCATION:${sanitize(session.venueLocation)}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export function downloadICS(session: SummitSession) {
  const icsContent = generateICSForSession(session);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', `Spatialgineers_Summit_${session.id}.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getGoogleCalendarUrl(session: SummitSession): string {
  const dateMap: Record<number, string> = {
    1: '20261211',
    2: '20261212',
    3: '20261213',
  };

  const dayDate = dateMap[session.day] || '20261211';
  const startHour = Math.floor(session.startMinutes / 60).toString().padStart(2, '0');
  const startMin = (session.startMinutes % 60).toString().padStart(2, '0');
  const endMinutes = getSessionEndMinutes(session);
  const endHour = Math.floor(endMinutes / 60).toString().padStart(2, '0');
  const endMin = (endMinutes % 60).toString().padStart(2, '0');

  const dtStart = `${dayDate}T${startHour}${startMin}00`;
  const dtEnd = `${dayDate}T${endHour}${endMin}00`;

  const title = encodeURIComponent(session.title);
  const details = encodeURIComponent(`${session.description}\n\nVenue: ${session.venueLocation}\nSpatialgineers Summit 2026`);
  const location = encodeURIComponent(session.venueLocation);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dtStart}/${dtEnd}&details=${details}&location=${location}`;
}

// Local Storage Offline Management (Bumped to v2026_10_1 so the corrected Run of Show, Map Nodes, Embeds & Tiers take immediate effect)
const STORAGE_KEY_AGENDA = 'sgx_my_agenda_sessions_v2026_10';
const STORAGE_KEY_CUSTOM_SESSIONS = 'sgx_custom_sessions_data_v2026_10_1';
const STORAGE_KEY_CUSTOM_SPEAKERS = 'sgx_custom_speakers_data_v2026_10';
const STORAGE_KEY_CUSTOM_MAP = 'sgx_custom_map_nodes_v2026_10_1';
const STORAGE_KEY_CUSTOM_EMBEDS = 'sgx_custom_embed_widgets_v2026_10_1';
const STORAGE_KEY_CUSTOM_SPONSORS = 'sgx_custom_sponsors_data_v2026_10_1';

export function getSavedAgendaIds(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_AGENDA);
    return raw ? JSON.parse(raw) : ['d1_01', 'd1_14', 'd2_01', 'd3_01', 'd3_06'];
  } catch {
    return ['d1_01', 'd1_14', 'd2_01', 'd3_01', 'd3_06'];
  }
}

export function saveAgendaIds(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_AGENDA, JSON.stringify(ids));
  } catch (e) {
    console.warn('Could not save agenda ids locally', e);
  }
}

export function loadAllSessions(): SummitSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SESSIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_SUMMIT_SESSIONS;
}

export function saveAllSessions(sessions: SummitSession[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_SESSIONS, JSON.stringify(sessions));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Could not save sessions data locally', e);
  }
}

export async function saveSessionToFirestore(session: SummitSession): Promise<void> {
  try {
    const sessionDocRef = doc(db, 'summit_sessions', session.id);
    await setDoc(sessionDocRef, session, { merge: true });
  } catch (err) {
    console.warn('Firestore session sync warning (persisted locally):', err);
  }
}

export async function deleteSessionFromFirestore(sessionId: string): Promise<void> {
  try {
    const sessionDocRef = doc(db, 'summit_sessions', sessionId);
    await deleteDoc(sessionDocRef);
  } catch (err) {
    console.warn('Firestore session delete warning (deleted locally):', err);
  }
}

export function loadAllSpeakers(): SummitSpeaker[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SPEAKERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const legacyPurgedIds = new Set([
          'spk_vyze', 'spk_ericson', 'spk_bucolov', 'spk_bluecider',
          'spk_yaviel', 'spk_rozay', 'spk_trenza',
          'spk_initiate_1', 'spk_initiate_2', 'spk_initiate_3', 'spk_initiate_4',
          'spk_initiate_5', 'spk_initiate_6', 'spk_initiate_7', 'spk_initiate_8'
        ]);
        const map = new Map<string, SummitSpeaker>();
        INITIAL_SUMMIT_SPEAKERS.forEach(s => map.set(s.id, s));

        parsed.forEach((s: any) => {
          if (s && s.id && !legacyPurgedIds.has(s.id) && s.id !== 'spk_danelson' && s.id !== 'spk_ricardo') {
            const avatar = (!s.avatarUrl || s.avatarUrl.includes('unsplash.com'))
              ? 'https://cdn.spatialgineers.com/Branding/Summit/Pillars/Spat%20Spark%20Icon%20BY.png'
              : s.avatarUrl;
            map.set(s.id, { ...s, avatarUrl: avatar });
          }
        });
        return Array.from(map.values());
      }
    }
  } catch {}
  return INITIAL_SUMMIT_SPEAKERS;
}

export function saveAllSpeakers(speakers: SummitSpeaker[]): void {
  try {
    const map = new Map<string, SummitSpeaker>();
    speakers.forEach(s => {
      if (s && s.id) map.set(s.id, s);
    });
    const unique = Array.from(map.values());
    localStorage.setItem(STORAGE_KEY_CUSTOM_SPEAKERS, JSON.stringify(unique));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {
    console.warn('Could not save speakers data locally', e);
  }
}

export async function saveSpeakerToFirestore(speaker: SummitSpeaker): Promise<void> {
  try {
    const speakerDocRef = doc(db, 'summit_speakers', speaker.id);
    await setDoc(speakerDocRef, speaker, { merge: true });
  } catch (err) {
    console.warn('Firestore speaker sync warning (persisted locally):', err);
  }
}

export async function deleteSpeakerFromFirestore(speakerId: string): Promise<void> {
  try {
    const speakerDocRef = doc(db, 'summit_speakers', speakerId);
    await deleteDoc(speakerDocRef);
  } catch (err) {
    console.warn('Firestore speaker delete warning (deleted locally):', err);
  }
}

export async function registerSpeakerProfile(speaker: SummitSpeaker): Promise<SummitSpeaker> {
  const current = loadAllSpeakers();
  const map = new Map<string, SummitSpeaker>();
  current.forEach(s => map.set(s.id, s));
  map.set(speaker.id, speaker);
  const updated = Array.from(map.values());

  saveAllSpeakers(updated);
  await saveSpeakerToFirestore(speaker);
  return speaker;
}

export function loadAllMapNodes(): Map360Node[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_MAP);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_MAP_360_NODES;
}

export function saveAllMapNodes(nodes: Map360Node[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_MAP, JSON.stringify(nodes));
  } catch (e) {
    console.warn('Could not save map nodes data locally', e);
  }
}

export function loadAllEmbedWidgets(): EmbedWidget[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_EMBEDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return INITIAL_EMBED_WIDGETS;
}

export function saveAllEmbedWidgets(widgets: EmbedWidget[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_EMBEDS, JSON.stringify(widgets));
  } catch (e) {
    console.warn('Could not save embed widgets locally', e);
  }
}

export function loadAllSponsorshipTiers(): SponsorshipTier[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_SPONSORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SPONSORSHIP_TIERS;
}

export function saveAllSponsorshipTiers(tiers: SponsorshipTier[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_CUSTOM_SPONSORS, JSON.stringify(tiers));
  } catch (e) {
    console.warn('Could not save sponsors data locally', e);
  }
}

export const STORAGE_KEY_SPONSOR_INQUIRIES = 'sgx_summit_sponsor_inquiries';

export const INITIAL_SPONSOR_INQUIRIES: SponsorInquiry[] = [];

export function loadAllSponsorInquiries(): SponsorInquiry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SPONSOR_INQUIRIES);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Sanitize out dummy entries from previous sessions
        return parsed.filter(item => item.id !== 'inq_sample_01' && item.id !== 'inq_sample_02');
      }
    }
  } catch {}
  return INITIAL_SPONSOR_INQUIRIES;
}

export function saveAllSponsorInquiries(inquiries: SponsorInquiry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_SPONSOR_INQUIRIES, JSON.stringify(inquiries));
  } catch (e) {
    console.warn('Could not save sponsor inquiries locally', e);
  }
}

export function saveSingleSponsorInquiry(inquiry: SponsorInquiry): SponsorInquiry[] {
  const current = loadAllSponsorInquiries();
  const existingIdx = current.findIndex(item => item.id === inquiry.id);
  let updated: SponsorInquiry[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = inquiry;
  } else {
    updated = [inquiry, ...current];
  }
  saveAllSponsorInquiries(updated);
  return updated;
}

export const STORAGE_KEY_APPROVED_SPONSORS = 'sgx_summit_approved_sponsors_v2026_10_1';

export const INITIAL_APPROVED_SPONSORS: ApprovedSponsor[] = [
  {
    id: 'sp_approved_chroma',
    companyName: 'Chroma Space Studios',
    brandSlug: 'chroma-space-studios',
    tierId: 'tier_5',
    tierName: 'Tier 5 · Alianza de servicios esenciales (venue)',
    tagline: 'Venue del Día 3 (SGX Showcase) • San Juan, Puerto Rico',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    websiteUrl: 'https://chromaspace.pr',
    contactName: 'Equipo de Producción Chroma',
    contactEmail: 'contact@chromaspace.pr',
    phone: '',
    description: 'Chroma Space Studios es el venue del Día 3 (SGX Showcase) del Spatialgineers Summit 2026. Es un estudio de producción en San Juan con luces, proyectores y cámaras integrados.',
    highlights: [
      'Estudio de producción en San Juan, PR',
      'Luces, proyectores y cámaras integrados',
      'Venue del Día 3 (SGX Showcase), por invitación y cupo limitado (40 a 60 personas)'
    ],
    specialOfferText: 'El SGX Showcase del Día 3 es presencial por invitación y cupo limitado, y se transmite por YouTube Live.',
    ctaButtonText: 'CONOCER CHROMA SPACE STUDIOS',
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    boothLocation: 'Chroma Space Studios (San Juan)',
    publishedAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'sp_approved_los_mismos_tv',
    companyName: 'Los Mismos TV',
    brandSlug: 'los-mismos-tv',
    tierId: 'tier_4',
    tierName: 'Transmite junto a nosotros',
    tagline: 'Transmite el Spatialgineers Summit 2026 desde su canal, junto al de Spatialgineers',
    logoUrl: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG',
    bannerUrl: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
    websiteUrl: 'https://youtube.com',
    contactName: 'Los Mismos TV',
    contactEmail: '',
    description: 'Los Mismos TV transmite el Spatialgineers Summit 2026 junto a nosotros, desde su canal y junto al canal de Spatialgineers.',
    highlights: [
      'Transmite junto a nosotros desde su canal',
      'YouTube Live es el canal principal del Summit, con LinkedIn Live y Facebook Live',
    ],
    specialOfferText: 'Sigue la transmisión en vivo por YouTube Live y participa en tiempo real.',
    ctaButtonText: 'SEGUIR TRANSMISIÓN',
    activeInVisualizer: true,
    activeInMiniGame: false,
    activeInAppTicker: true,
    boothLocation: 'Transmisión desde su canal',
    publishedAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
  }
];

export function loadAllApprovedSponsors(): ApprovedSponsor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_APPROVED_SPONSORS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Sanitize out purged dummy entities from previous local storage
        const sanitized = parsed.filter(s => s.id !== 'sp_approved_nextgen' && s.id !== 'sp_approved_roblox_guild');
        if (sanitized.length > 0) return sanitized;
      }
    }
  } catch {}
  return INITIAL_APPROVED_SPONSORS;
}

export function saveAllApprovedSponsors(sponsors: ApprovedSponsor[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_APPROVED_SPONSORS, JSON.stringify(sponsors));
  } catch (e) {
    console.warn('Could not save approved sponsors locally', e);
  }
}

export function approveSponsorInquiryAndCreateShowcase(inquiry: SponsorInquiry): {
  updatedInquiries: SponsorInquiry[];
  approvedSponsor: ApprovedSponsor;
  updatedSponsors: ApprovedSponsor[];
} {
  // 1. Mark Inquiry as APPROVED
  const inquiries = loadAllSponsorInquiries();
  const updatedInquiries = inquiries.map(inq => 
    inq.id === inquiry.id ? { ...inq, status: 'APPROVED' as const } : inq
  );
  saveAllSponsorInquiries(updatedInquiries);

  // 2. Create or Update Approved Sponsor Showcase
  const currentApproved = loadAllApprovedSponsors();
  const slug = inquiry.companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existingIdx = currentApproved.findIndex(
    s => s.inquiryId === inquiry.id || s.companyName.toLowerCase() === inquiry.companyName.toLowerCase()
  );

  const defaultLogo = inquiry.websiteUrl 
    ? `https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=400&auto=format&fit=crop&q=80`
    : `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&auto=format&fit=crop&q=80`;

  const newShowcase: ApprovedSponsor = {
    id: existingIdx >= 0 ? currentApproved[existingIdx].id : `sp_appr_${Date.now()}`,
    inquiryId: inquiry.id,
    companyName: inquiry.companyName,
    brandSlug: slug || `sponsor-${Date.now()}`,
    tierId: inquiry.selectedTierId || 'tier_2',
    tierName: inquiry.selectedTierName || 'Official Summit Partner',
    tagline: inquiry.customMessage?.slice(0, 100) || `Patrocinador Oficial de Spatialgineers Summit 2026`,
    logoUrl: existingIdx >= 0 && currentApproved[existingIdx].logoUrl ? currentApproved[existingIdx].logoUrl : defaultLogo,
    bannerUrl: existingIdx >= 0 && currentApproved[existingIdx].bannerUrl ? currentApproved[existingIdx].bannerUrl : 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=1400&auto=format&fit=crop&q=80',
    websiteUrl: inquiry.websiteUrl || 'https://spatialgineers.com',
    contactName: inquiry.contactName,
    contactEmail: inquiry.email,
    phone: inquiry.phone,
    description: inquiry.customMessage || `${inquiry.companyName} se une como patrocinador oficial del Spatialgineers Summit 2026, impulsando el futuro de la computación espacial y experiencias inmersivas.`,
    highlights: [
      `Presencia interactiva oficial en el Summit 2026`,
      `Alianza en ${inquiry.selectedTierName}`,
      `Activación de marca en transmisión 4K y minijuegos 3D`
    ],
    specialOfferText: `Beneficio exclusivo para asistentes del Summit 2026 cortesía de ${inquiry.companyName}.`,
    specialOfferCode: `SGX-${slug.slice(0, 6).toUpperCase()}-26`,
    ctaButtonText: `VISITAR ${inquiry.companyName.toUpperCase()}`,
    activeInVisualizer: true,
    activeInMiniGame: true,
    activeInAppTicker: true,
    boothLocation: 'Chroma Space Studios Partner Stage (San Juan)',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  };

  let updatedSponsors: ApprovedSponsor[];
  if (existingIdx >= 0) {
    updatedSponsors = [...currentApproved];
    updatedSponsors[existingIdx] = { ...currentApproved[existingIdx], ...newShowcase };
  } else {
    updatedSponsors = [newShowcase, ...currentApproved];
  }
  saveAllApprovedSponsors(updatedSponsors);

  // 3. Also sync into SponsorshipTier's sponsors list
  const currentTiers = loadAllSponsorshipTiers();
  const targetTier = currentTiers.find(t => t.id === newShowcase.tierId) || currentTiers[1];
  if (targetTier) {
    const sponsorExistsInTier = targetTier.sponsors.some(s => s.name.toLowerCase() === newShowcase.companyName.toLowerCase());
    if (!sponsorExistsInTier) {
      targetTier.sponsors.push({
        name: newShowcase.companyName,
        logoUrl: newShowcase.logoUrl,
        websiteUrl: newShowcase.websiteUrl,
        description: newShowcase.tagline,
      });
      saveAllSponsorshipTiers([...currentTiers]);
    }
  }

  return {
    updatedInquiries,
    approvedSponsor: newShowcase,
    updatedSponsors,
  };
}

export function updateApprovedSponsor(sponsor: ApprovedSponsor): ApprovedSponsor[] {
  const current = loadAllApprovedSponsors();
  const idx = current.findIndex(s => s.id === sponsor.id);
  let updated: ApprovedSponsor[];
  if (idx >= 0) {
    updated = [...current];
    updated[idx] = { ...sponsor, updatedAt: Date.now() };
  } else {
    updated = [{ ...sponsor, updatedAt: Date.now() }, ...current];
  }
  saveAllApprovedSponsors(updated);

  // Also update corresponding tier
  const currentTiers = loadAllSponsorshipTiers();
  currentTiers.forEach(tier => {
    const sIdx = tier.sponsors.findIndex(s => s.name.toLowerCase() === sponsor.companyName.toLowerCase());
    if (sIdx >= 0) {
      tier.sponsors[sIdx].logoUrl = sponsor.logoUrl;
      tier.sponsors[sIdx].websiteUrl = sponsor.websiteUrl;
      tier.sponsors[sIdx].description = sponsor.tagline;
    }
  });
  saveAllSponsorshipTiers([...currentTiers]);

  return updated;
}

export function deleteApprovedSponsor(id: string): ApprovedSponsor[] {
  const current = loadAllApprovedSponsors();
  const target = current.find(s => s.id === id);
  const updated = current.filter(s => s.id !== id);
  saveAllApprovedSponsors(updated);

  if (target) {
    const currentTiers = loadAllSponsorshipTiers();
    currentTiers.forEach(tier => {
      if (tier.sponsors && Array.isArray(tier.sponsors)) {
        tier.sponsors = tier.sponsors.filter(s => s?.name && s.name.toLowerCase() !== target.companyName.toLowerCase());
      }
    });
    saveAllSponsorshipTiers([...currentTiers]);
  }

  return updated;
}

// Aliases for component convenience
export const loadPersistedSessions = loadAllSessions;
export const loadPersistedSpeakers = loadAllSpeakers;
export const loadPersistedMapNodes = loadAllMapNodes;
export const loadPersistedEmbedWidgets = loadAllEmbedWidgets;
export const loadPersistedSponsorshipTiers = loadAllSponsorshipTiers;
export const loadPersistedApprovedSponsors = loadAllApprovedSponsors;

// Audio Alert Chime for Push Notifications
export function playNotificationChime(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;
    
    // Tone 1: 587.33 Hz (D5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Tone 2: Harmonic Sparkle 1174.66 Hz (D6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1174.66, now + 0.08);
    gain2.gain.setValueAtTime(0.2, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.45);
  } catch (err) {
    console.warn('Audio chime notice:', err);
  }
}

