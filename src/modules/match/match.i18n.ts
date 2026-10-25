// SGX Entrepreneur Match - Bilingual Label Dictionary (ES | EN)

export interface MatchI18nStrings {
  // Navigation & Shell
  navTitle: string;
  navGlyphLabel: string;
  tabDeck: string;
  tabMatches: string;
  tabProfile: string;

  // Profile Wizard
  wizardTitle: string;
  wizardSubtitle: string;
  stepPitchLabel: string;
  stepPitchPlaceholder: string;
  stepBringsLabel: string;
  stepSeekingLabel: string;
  stepPillarLabel: string;
  stepOpenToLabel: string;
  reviewTitle: string;
  reviewPublish: string;
  reviewEdit: string;
  wizardPublishedToast: string;

  // Brings Chips
  bringsCapital: string;
  bringsTechnical: string;
  bringsDesign: string;
  brings3dXr: string;
  bringsAudio: string;
  bringsContent: string;
  bringsSales: string;
  bringsNetwork: string;
  bringsMentorship: string;
  bringsLegalOps: string;
  bringsHardware: string;
  bringsCommunity: string;
  bringsOther: string;

  // Seeking Chips
  seekingCofounder: string;
  seekingInvestor: string;
  seekingClient: string;
  seekingCollaborator: string;
  seekingSponsor: string;
  seekingVendor: string;
  seekingMentor: string;
  seekingTalent: string;

  // Open-To Tags
  openToCollab: string;
  openToHire: string;
  openToInvest: string;
  openToGetFunded: string;
  openToPartner: string;

  // Pillars
  pillarStory: string;
  pillarShowcase: string;
  pillarSpark: string;
  pillarStage: string;
  pillarSystems: string;
  pillarSynthesize: string;

  // Card & Deck
  cardBrings: string;
  cardSeeking: string;
  cardOpenTo: string;
  actionPass: string;
  actionConnect: string;
  deckIntentSent: string;
  deckEmpty: string;
  deckEmptyCta: string;

  // Match Event
  hitTitle: string;
  hitSubtitle: string;
  hitSaveVcard: string;
  hitAddNote: string;
  hitViewMatches: string;
  pushMatched: string;

  // My Matches
  mineSearch: string;
  mineExportVcard: string;
  mineExportCsv: string;
  mineEmpty: string;
  mineNotePlaceholder: string;

  // Profile Tab
  profileVisible: string;
  profileHidden: string;
  profileEdit: string;

  // Mission
  missionTitle: string;
  missionStep1: string;
  missionStep2: string;
  missionStep3: string;
  missionBonus: string;

  // Errors
  errPitchRequired: string;
  errSeekingRequired: string;
  errBringsRequired: string;
  errNoAvatar: string;
  errGeneric: string;

  // Admin
  adminTitle: string;
  adminProfiles: string;
  adminHide: string;
  adminUnhide: string;
  adminDelete: string;
  adminReports: string;
  adminStats: string;
  adminKill: string;
}

export const MATCH_I18N: Record<'es' | 'en', MatchI18nStrings> = {
  es: {
    navTitle: 'Entrepreneur Match',
    navGlyphLabel: 'SGX.MATCH',
    tabDeck: 'Descubrir',
    tabMatches: 'Mis Matches',
    tabProfile: 'Mi Perfil',

    wizardTitle: 'Crea tu perfil de match',
    wizardSubtitle: '2 minutos. Así te ve el cuarto.',
    stepPitchLabel: 'En una línea, ¿qué estás construyendo?',
    stepPitchPlaceholder: 'Ej: Plataforma WebXR para onboarding de equipos',
    stepBringsLabel: '¿Qué traes a la mesa?',
    stepSeekingLabel: '¿A quién necesitas en el cuarto?',
    stepPillarLabel: '¿Cuál pilar SGX es tu energía?',
    stepOpenToLabel: 'Estoy abierto a…',
    reviewTitle: 'Así te ve el cuarto',
    reviewPublish: 'Publicar perfil',
    reviewEdit: 'Editar',
    wizardPublishedToast: '¡Estás en el cuarto! +150 XP',

    bringsCapital: 'Capital',
    bringsTechnical: 'Técnico / Dev',
    bringsDesign: 'Diseño',
    brings3dXr: '3D / XR',
    bringsAudio: 'Audio',
    bringsContent: 'Contenido / Marketing',
    bringsSales: 'Ventas',
    bringsNetwork: 'Conexiones / Acceso',
    bringsMentorship: 'Mentoría',
    bringsLegalOps: 'Legal / Ops',
    bringsHardware: 'Hardware',
    bringsCommunity: 'Comunidad',
    bringsOther: 'Otro',

    seekingCofounder: 'Co-fundador',
    seekingInvestor: 'Inversionista',
    seekingClient: 'Cliente',
    seekingCollaborator: 'Colaborador',
    seekingSponsor: 'Patrocinador',
    seekingVendor: 'Proveedor',
    seekingMentor: 'Mentor',
    seekingTalent: 'Talento (contratar)',

    openToCollab: 'Colaborar',
    openToHire: 'Contratar',
    openToInvest: 'Invertir',
    openToGetFunded: 'Levantar capital',
    openToPartner: 'Aliarse',

    pillarStory: 'Story',
    pillarShowcase: 'Showcase',
    pillarSpark: 'Spark',
    pillarStage: 'Stage',
    pillarSystems: 'Systems',
    pillarSynthesize: 'Synthesize',

    cardBrings: 'TRAE',
    cardSeeking: 'BUSCA',
    cardOpenTo: 'Abierto a',
    actionPass: 'Pasar',
    actionConnect: 'Conectar',
    deckIntentSent: 'Interés enviado',
    deckEmpty: 'Ya viste a todos por ahora. Vuelve cuando entren más builders.',
    deckEmptyCta: 'Editar mi perfil',

    hitTitle: '¡ES UN MATCH! ✨',
    hitSubtitle: '+100 XP para los dos',
    hitSaveVcard: 'Guardar contacto',
    hitAddNote: 'Añadir nota privada',
    hitViewMatches: 'Ver en Mis Matches',
    pushMatched: 'Hiciste match con {name}. ¡Conéctense!',

    mineSearch: 'Buscar matches',
    mineExportVcard: 'Exportar vCard',
    mineExportCsv: 'Exportar CSV',
    mineEmpty: 'Aún sin matches. Vuelve al mazo y conecta.',
    mineNotePlaceholder: 'Nota privada (solo tú la ves)',

    profileVisible: 'Visible en el cuarto',
    profileHidden: 'Oculto',
    profileEdit: 'Editar perfil',

    missionTitle: 'Ensambla tu Squad',
    missionStep1: 'Crea tu perfil de match',
    missionStep2: 'Consigue tu primer match',
    missionStep3: 'Llega a 3 matches',
    missionBonus: '+250 XP bono de squad',

    errPitchRequired: 'Añade una línea para publicar',
    errSeekingRequired: 'Elige de 1 a 3 cosas que buscas',
    errBringsRequired: 'Elige al menos una cosa que traes',
    errNoAvatar: 'Crea tu avatar primero para entrar al cuarto',
    errGeneric: 'Tuvimos un detalle técnico. Intenta de nuevo.',

    adminTitle: 'Panel de Match',
    adminProfiles: 'Perfiles',
    adminHide: 'Ocultar',
    adminUnhide: 'Mostrar',
    adminDelete: 'Eliminar',
    adminReports: 'Reportes',
    adminStats: 'Estadísticas',
    adminKill: 'Activar / Desactivar módulo',
  },
  en: {
    navTitle: 'Entrepreneur Match',
    navGlyphLabel: 'SGX.MATCH',
    tabDeck: 'Discover',
    tabMatches: 'My Matches',
    tabProfile: 'My Profile',

    wizardTitle: 'Build your match profile',
    wizardSubtitle: '2 minutes. This is how the room sees you.',
    stepPitchLabel: 'In one line — what are you building?',
    stepPitchPlaceholder: 'e.g. WebXR onboarding platform for teams',
    stepBringsLabel: 'What do you bring to the table?',
    stepSeekingLabel: 'Who do you need in the room?',
    stepPillarLabel: 'Which SGX pillar is your energy?',
    stepOpenToLabel: "I'm open to…",
    reviewTitle: 'This is how the room sees you',
    reviewPublish: 'Publish profile',
    reviewEdit: 'Edit',
    wizardPublishedToast: "You're in the room! +150 XP",

    bringsCapital: 'Capital',
    bringsTechnical: 'Technical / Dev',
    bringsDesign: 'Design',
    brings3dXr: '3D / XR',
    bringsAudio: 'Audio',
    bringsContent: 'Content / Marketing',
    bringsSales: 'Sales',
    bringsNetwork: 'Network / Access',
    bringsMentorship: 'Mentorship',
    bringsLegalOps: 'Legal / Ops',
    bringsHardware: 'Hardware',
    bringsCommunity: 'Community',
    bringsOther: 'Other',

    seekingCofounder: 'Co-founder',
    seekingInvestor: 'Investor',
    seekingClient: 'Client',
    seekingCollaborator: 'Collaborator',
    seekingSponsor: 'Sponsor',
    seekingVendor: 'Vendor',
    seekingMentor: 'Mentor',
    seekingTalent: 'Talent (hiring)',

    openToCollab: 'Collab',
    openToHire: 'Hire',
    openToInvest: 'Invest',
    openToGetFunded: 'Get funded',
    openToPartner: 'Partner',

    pillarStory: 'Story',
    pillarShowcase: 'Showcase',
    pillarSpark: 'Spark',
    pillarStage: 'Stage',
    pillarSystems: 'Systems',
    pillarSynthesize: 'Synthesize',

    cardBrings: 'BRINGS',
    cardSeeking: 'SEEKING',
    cardOpenTo: 'Open to',
    actionPass: 'Pass',
    actionConnect: 'Connect',
    deckIntentSent: 'Interest sent',
    deckEmpty: "You've seen everyone for now. Check back as more builders join.",
    deckEmptyCta: 'Edit my profile',

    hitTitle: "IT'S A MATCH! ✨",
    hitSubtitle: '+100 XP for both of you',
    hitSaveVcard: 'Save contact',
    hitAddNote: 'Add private note',
    hitViewMatches: 'View in My Matches',
    pushMatched: 'You matched with {name}. Go connect!',

    mineSearch: 'Search matches',
    mineExportVcard: 'Export vCard',
    mineExportCsv: 'Export CSV',
    mineEmpty: 'No matches yet. Head to the deck and connect.',
    mineNotePlaceholder: 'Private note (only you see it)',

    profileVisible: 'Visible in the room',
    profileHidden: 'Hidden',
    profileEdit: 'Edit profile',

    missionTitle: 'Assemble Your Squad',
    missionStep1: 'Create your match profile',
    missionStep2: 'Get your first mutual match',
    missionStep3: 'Reach 3 mutual matches',
    missionBonus: '+250 XP squad bonus',

    errPitchRequired: 'Add a one-line pitch to publish',
    errSeekingRequired: 'Pick 1 to 3 things you are looking for',
    errBringsRequired: 'Pick at least one thing you bring',
    errNoAvatar: 'Create your avatar first to enter the room',
    errGeneric: 'Technical issue on our side. Try again.',

    adminTitle: 'Match Panel',
    adminProfiles: 'Profiles',
    adminHide: 'Hide',
    adminUnhide: 'Unhide',
    adminDelete: 'Delete',
    adminReports: 'Reports',
    adminStats: 'Stats',
    adminKill: 'Enable / Disable module',
  }
};
