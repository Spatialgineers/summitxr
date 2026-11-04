/* Welcome portal (/bienvenida and /bienvenida/<rol>): one link per role with
   its walkthrough video, the dates and steps that matter to that role and
   quick links into the app. Shared by the page (client) and by the server,
   which injects the same title, description, FAQ and JSON-LD into index.html
   so the pages can be indexed and quoted without running JavaScript.
   Every fact here comes from the app's own copy (footer, sponsors page,
   speaker portal, press room, Highbot knowledge). Deadlines come from
   summitDeadlines.ts. Do not add dates or promises. */

import { PRESS_FAQ, PRESS_RULES } from './pressKit';
import { DEADLINE_COPY, SUMMIT_DEADLINES as D } from './summitDeadlines';

export const WELCOME_ORIGIN = 'https://summit.spatialgineers.com';
export const WELCOME_PATH = '/bienvenida';

export type WelcomeRole = 'visitante' | 'speaker' | 'sponsor' | 'prensa' | 'equipo';
export type WelcomeVideoKey = WelcomeRole | 'pass' | 'tour' | 'build';

/** The public roles, in the order the hub shows them (equipo is internal). */
export const WELCOME_PUBLIC_ROLES: WelcomeRole[] = ['visitante', 'speaker', 'sponsor', 'prensa'];
export const WELCOME_ROLES: WelcomeRole[] = [...WELCOME_PUBLIC_ROLES, 'equipo'];
export const WELCOME_VIDEO_KEYS: WelcomeVideoKey[] = ['visitante', 'speaker', 'sponsor', 'prensa', 'equipo', 'pass', 'tour', 'build'];

const ROLE_ALIASES: Record<string, WelcomeRole> = {
  visitante: 'visitante', visitantes: 'visitante', creador: 'visitante', creadores: 'visitante', creadora: 'visitante', visitor: 'visitante',
  speaker: 'speaker', speakers: 'speaker', artista: 'speaker', artistas: 'speaker', ponente: 'speaker',
  sponsor: 'sponsor', sponsors: 'sponsor', patrocinador: 'sponsor', patrocinadores: 'sponsor', marca: 'sponsor', marcas: 'sponsor',
  prensa: 'prensa', press: 'prensa', medios: 'prensa', medio: 'prensa', periodista: 'prensa', periodistas: 'prensa', media: 'prensa',
  equipo: 'equipo', team: 'equipo', staff: 'equipo',
};

/** The role a URL segment names (aliases included), or null for the hub. */
export function resolveWelcomeRole(raw: string | null | undefined): WelcomeRole | null {
  if (!raw) return null;
  let key = String(raw).trim().toLowerCase();
  try { key = decodeURIComponent(key); } catch { /* keep as is */ }
  return ROLE_ALIASES[key] || null;
}

export const welcomePathFor = (role: WelcomeRole | null) => (role ? `${WELCOME_PATH}/${role}` : WELCOME_PATH);
export const welcomeUrlFor = (role: WelcomeRole | null) => `${WELCOME_ORIGIN}${welcomePathFor(role)}`;

/** A YouTube video id from an id or any usual link (youtu.be/ID, watch?v=ID, shorts/ID, embed/ID, live/ID). */
export function parseYouTubeId(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  const m = /(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/|\/v\/)([A-Za-z0-9_-]{11})(?![A-Za-z0-9_-])/.exec(s);
  return m ? m[1] : null;
}

export type WelcomeVideoIds = Partial<Record<WelcomeVideoKey, string>>;

/** Clean ids out of the site_config/welcome document (ids or links; anything else is dropped). */
export function welcomeIdsFromDoc(doc: Record<string, unknown> | null | undefined): WelcomeVideoIds {
  const out: WelcomeVideoIds = {};
  if (!doc) return out;
  for (const k of WELCOME_VIDEO_KEYS) {
    const id = parseYouTubeId(doc[k]);
    if (id) out[k] = id;
  }
  return out;
}

/** Portrait (9:16) for the role and pass videos, landscape (16:9) for the tour and the build. */
export const isPortraitVideo = (key: WelcomeVideoKey) => key !== 'tour' && key !== 'build';
export const youTubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youTubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
/** hqdefault always exists (shorts included); maxresdefault only for HD uploads, so only for the landscape ones. */
export const youTubeThumb = (id: string, key: WelcomeVideoKey) =>
  `https://i.ytimg.com/vi/${id}/${isPortraitVideo(key) ? 'hqdefault' : 'maxresdefault'}.jpg`;

type Bi = { es: string; en: string };
export interface WelcomeStep { when: Bi; title: Bi; body: Bi }
export interface WelcomeFaq { q: Bi; a: Bi }

export interface WelcomeRoleCopy {
  role: WelcomeRole;
  /** Short name on the hub card and the page kicker. */
  label: Bi;
  /** Page title (h1) and the <title>. */
  title: Bi;
  metaTitle: Bi;
  description: Bi;
  intro: Bi;
  videoTitle: Bi;
  steps: WelcomeStep[];
  faq: WelcomeFaq[];
  /** Kept out of search results. */
  internal?: boolean;
}

/* ---------- facts, said once (same wording as the footer and the sponsors page) ---------- */

export const WELCOME_FACTS = {
  dates: { es: '11–13 de diciembre de 2026', en: 'December 11–13, 2026' },
  days12: {
    es: 'Días 1 y 2: gratis por YouTube Live, con Los Mismos TV transmitiendo junto a nosotros.',
    en: 'Days 1 and 2: free on YouTube Live, with Los Mismos TV streaming alongside us.',
  },
  day3: { es: 'Día 3: Chroma Space Studios, San Juan. Por invitación.', en: 'Day 3: Chroma Space Studios, San Juan. By invitation.' },
  day3Invitations: DEADLINE_COPY.day3Invitations,
  language: { es: 'En español.', en: 'In Spanish.' },
  press: PRESS_RULES.line,
};

const FAQ_FREE: WelcomeFaq = {
  q: { es: '¿Cuánto cuesta ver el Spatialgineers Summit 2026?', en: 'How much does it cost to watch Spatialgineers Summit 2026?' },
  a: {
    es: 'Nada. Los Días 1 y 2 (11 y 12 de diciembre de 2026) son gratis por YouTube Live, con Los Mismos TV transmitiendo junto a Spatialgineers. El SGX Pass también es gratis.',
    en: 'Nothing. Days 1 and 2 (December 11 and 12, 2026) are free on YouTube Live, with Los Mismos TV streaming alongside Spatialgineers. The SGX Pass is free too.',
  },
};
const FAQ_DAY3: WelcomeFaq = {
  q: { es: '¿Dónde es el Día 3?', en: 'Where is Day 3?' },
  a: {
    es: `El Día 3 (domingo 13 de diciembre) es el SGX Showcase en Chroma Space Studios, San Juan, Puerto Rico: presencial, por invitación y con cupo limitado (40 a 60 personas). ${DEADLINE_COPY.day3Invitations.es} El check-in se hace con el SGX Pass escaneando el QR de la entrada.`,
    en: `Day 3 (Sunday, December 13) is the SGX Showcase at Chroma Space Studios, San Juan, Puerto Rico: in person, by invitation and with limited capacity (40 to 60 people). ${DEADLINE_COPY.day3Invitations.en} Check-in is done with the SGX Pass by scanning the QR at the entrance.`,
  },
};
const FAQ_PASS: WelcomeFaq = {
  q: { es: '¿Qué es el SGX Pass?', en: 'What is the SGX Pass?' },
  a: {
    es: 'Es la credencial gratis del Summit y la Holo Card del Creador. Se forja en un minuto (nombre, email, pilar favorito y tu Highbot) y da el QR de networking, la entrada del Día 3, las misiones y el XP. Un pase por email.',
    en: "It is the Summit's free credential and the Creator's Holo Card. You forge it in a minute (name, email, favorite pillar and your Highbot) and it gives you the networking QR, Day 3 entry, missions and XP. One pass per email.",
  },
};

export const WELCOME_HUB = {
  title: { es: 'Bienvenida al Spatialgineers Summit 2026', en: 'Welcome to Spatialgineers Summit 2026' },
  metaTitle: {
    es: 'Bienvenida · Spatialgineers Summit 2026 · 11–13 dic · San Juan, PR',
    en: 'Welcome · Spatialgineers Summit 2026 · Dec 11–13 · San Juan, PR',
  },
  description: {
    es: `Tu entrada al Spatialgineers Summit 2026 (11–13 dic): elige tu rol, mira tu video de recorrido y forja tu SGX Pass. Días 1 y 2 gratis por YouTube Live; Día 3 en Chroma Space Studios, San Juan (invitaciones a más tardar el ${D.day3Invitations.short.es}).`,
    en: `Your way into Spatialgineers Summit 2026 (Dec 11–13): pick your role, watch your walkthrough video and forge your SGX Pass. Days 1 and 2 free on YouTube Live; Day 3 at Chroma Space Studios, San Juan (invitations by ${D.day3Invitations.short.en}).`,
  },
  intro: {
    es: 'Tres días de spatial computing, artistas invitados y producción virtual en vivo, en español. Elige cómo llegas al Summit: cada rol tiene su video corto y sus fechas clave.',
    en: 'Three days of spatial computing, guest artists and live virtual production, in Spanish. Pick how you come to the Summit: each role has its short video and its key dates.',
  },
  faq: [FAQ_FREE, FAQ_DAY3, FAQ_PASS, {
    q: { es: '¿En qué idioma es el Summit?', en: 'What language is the Summit in?' },
    a: { es: 'En español. Las fechas son el 11, 12 y 13 de diciembre de 2026.', en: 'In Spanish. The dates are December 11, 12 and 13, 2026.' },
  }] as WelcomeFaq[],
};

export const WELCOME_ROLE_COPY: Record<WelcomeRole, WelcomeRoleCopy> = {
  visitante: {
    role: 'visitante',
    label: { es: 'Creadores', en: 'Creators' },
    title: { es: 'Bienvenida, Creador', en: 'Welcome, Creator' },
    metaTitle: { es: 'Creadores: cómo vivir el Spatialgineers Summit 2026', en: 'Creators: how to experience Spatialgineers Summit 2026' },
    description: {
      es: `Guía para Creadores del Spatialgineers Summit 2026: forja tu SGX Pass gratis, arma tu agenda, juega y gana XP. Días 1 y 2 gratis por YouTube Live (11 y 12 dic); Día 3 por invitación en Chroma Space Studios (invitaciones a más tardar el ${D.day3Invitations.short.es}).`,
      en: `Creator guide to Spatialgineers Summit 2026: forge your free SGX Pass, build your agenda, play and earn XP. Days 1 and 2 free on YouTube Live (Dec 11 and 12); Day 3 by invitation at Chroma Space Studios (invitations by ${D.day3Invitations.short.en}).`,
    },
    intro: {
      es: 'Vienes a ver, jugar y conectar. Tu SGX Pass es tu Holo Card: con él guardas tu progreso, ganas XP y entras a Tu Estudio.',
      en: 'You are here to watch, play and connect. Your SGX Pass is your Holo Card: it keeps your progress, earns XP and opens Your Studio.',
    },
    videoTitle: { es: 'Recorrido para Creadores', en: 'Walkthrough for Creators' },
    steps: [
      { when: { es: 'Hoy', en: 'Today' }, title: { es: 'Forja tu SGX Pass', en: 'Forge your SGX Pass' }, body: { es: 'Gratis y en un minuto: nombre, email, pilar favorito y tu Highbot. Te da el QR de networking y tus misiones.', en: 'Free and in a minute: name, email, favorite pillar and your Highbot. It gives you the networking QR and your missions.' } },
      { when: { es: 'Antes del evento', en: 'Before the event' }, title: { es: 'Arma tu agenda y gana XP', en: 'Build your agenda and earn XP' }, body: { es: 'Mira la agenda de los tres días, juega en el hub de juegos y completa las misiones del Reactor.', en: 'Browse the three-day agenda, play in the games hub and complete the Reactor missions.' } },
      { when: { es: '11 y 12 dic', en: 'Dec 11 and 12' }, title: { es: 'Días 1 y 2 en vivo', en: 'Days 1 and 2 live' }, body: { es: 'Gratis por YouTube Live, con Los Mismos TV transmitiendo junto a nosotros. Vota en vivo y gana XP.', en: 'Free on YouTube Live, with Los Mismos TV streaming alongside us. Vote live and earn XP.' } },
      { when: { es: '13 dic', en: 'Dec 13' }, title: { es: 'Día 3: SGX Showcase', en: 'Day 3: SGX Showcase' }, body: { es: 'En Chroma Space Studios, San Juan, por invitación. Puedes solicitar el Día 3 presencial desde tu pase; el check-in es con el QR de tu SGX Pass.', en: 'At Chroma Space Studios, San Juan, by invitation. You can request in-person Day 3 from your pass; check-in uses your SGX Pass QR.' } },
      { when: { es: `A más tardar el ${D.day3Invitations.short.es}`, en: `By ${D.day3Invitations.short.en}` }, title: { es: 'Invitaciones al Día 3', en: 'Day 3 invitations' }, body: { es: `${DEADLINE_COPY.day3Invitations.es} Llegan por correo y tu SGX Pass muestra si estás invitado.`, en: `${DEADLINE_COPY.day3Invitations.en} They arrive by email and your SGX Pass shows whether you are invited.` } },
    ],
    faq: [FAQ_FREE, FAQ_PASS, FAQ_DAY3, {
      q: { es: '¿Cómo gano XP?', en: 'How do I earn XP?' },
      a: { es: 'Jugando, votando en vivo, completando las misiones del Reactor y escaneando pases de otras personas. La Tienda del Reactor deja gastar XP sin bajar de rango.', en: 'By playing, voting live, completing the Reactor missions and scanning other people’s passes. The Reactor store lets you spend XP without losing rank.' },
    }],
  },
  speaker: {
    role: 'speaker',
    label: { es: 'Speakers y artistas', en: 'Speakers and artists' },
    title: { es: 'Bienvenida, speaker', en: 'Welcome, speaker' },
    metaTitle: { es: 'Speakers y artistas · Spatialgineers Summit 2026', en: 'Speakers and artists · Spatialgineers Summit 2026' },
    description: {
      es: `Guía para speakers y artistas del Spatialgineers Summit 2026 (11–13 dic): registra tu perfil en el Portal de speakers hasta el ${D.speakerProfiles.day.es}, arma tu avatar y tu Holo Card, y conoce los tres días del programa.`,
      en: `Guide for speakers and artists at Spatialgineers Summit 2026 (Dec 11–13): register your profile in the Speaker portal through ${D.speakerProfiles.day.en}, build your avatar and Holo Card, and see the three days of the program.`,
    },
    intro: {
      es: 'Presentas en el Summit. Registra tu perfil en el Portal de speakers: el equipo lo revisa y lo publica en el cartel cuando tu participación esté confirmada por escrito.',
      en: 'You are presenting at the Summit. Register your profile in the Speaker portal: the team reviews it and adds it to the lineup once your participation is confirmed in writing.',
    },
    videoTitle: { es: 'Recorrido para speakers', en: 'Walkthrough for speakers' },
    steps: [
      { when: { es: `Hasta el ${D.speakerProfiles.short.es}`, en: `By ${D.speakerProfiles.short.en}` }, title: { es: 'Registra tu perfil', en: 'Register your profile' }, body: { es: `En el Portal de speakers: nombre o nombre artístico, rol, organización, día, pilar SGX, biografía y enlaces. ${DEADLINE_COPY.speakerProfiles.es} Después el portal se cierra.`, en: `In the Speaker portal: name or artist name, role, organization, day, SGX pillar, bio and links. ${DEADLINE_COPY.speakerProfiles.en} After that the portal closes.` } },
      { when: { es: 'En el registro', en: 'While registering' }, title: { es: 'Arma tu avatar', en: 'Build your avatar' }, body: { es: 'En el Summit todos aparecen con su avatar SGX. Con él se arma tu Holo Card de speaker.', en: 'Everyone in the Summit appears with their SGX avatar. It becomes your speaker Holo Card.' } },
      { when: { es: 'Tras la revisión', en: 'After review' }, title: { es: 'Confirmación por escrito', en: 'Written confirmation' }, body: { es: 'El equipo revisa tu perfil y te escribe al confirmar tu participación. Solo entonces aparece en el directorio.', en: 'The team reviews your profile and writes to you once your participation is confirmed. Only then does it appear in the directory.' } },
      { when: { es: '11–13 dic', en: 'Dec 11–13' }, title: { es: 'Tu día en el Summit', en: 'Your day at the Summit' }, body: { es: 'Día 1 (vie 11): digital, pilares e Initiates. Día 2 (sáb 12): digital, Día de la Industria. Día 3 (dom 13): SGX Showcase en Chroma Space Studios, por invitación.', en: 'Day 1 (Fri 11): digital, pillars and Initiates. Day 2 (Sat 12): digital, Industry Day. Day 3 (Sun 13): SGX Showcase at Chroma Space Studios, by invitation.' } },
    ],
    faq: [
      { q: { es: '¿Cómo me registro como speaker o artista?', en: 'How do I register as a speaker or artist?' }, a: { es: `En el Portal de speakers del Summit (summit.spatialgineers.com/portal-speakers): llenas tu perfil, armas tu avatar y lo envías para revisión. ${DEADLINE_COPY.speakerProfiles.es}`, en: `In the Summit Speaker portal (summit.spatialgineers.com/portal-speakers): fill in your profile, build your avatar and send it for review. ${DEADLINE_COPY.speakerProfiles.en}` } },
      { q: { es: '¿Cuándo aparece mi perfil en el cartel?', en: 'When does my profile appear in the lineup?' }, a: { es: 'Cuando el equipo confirma tu participación por escrito. Te escribimos al confirmarla.', en: 'When the team confirms your participation in writing. We write to you when it is confirmed.' } },
      { q: { es: '¿Qué pasa cada día del Summit?', en: 'What happens on each Summit day?' }, a: { es: 'Día 1 (viernes 11 de diciembre): digital, pilares e Initiates. Día 2 (sábado 12): digital, Día de la Industria. Día 3 (domingo 13): SGX Showcase en Chroma Space Studios, San Juan, por invitación.', en: 'Day 1 (Friday, December 11): digital, pillars and Initiates. Day 2 (Saturday 12): digital, Industry Day. Day 3 (Sunday 13): SGX Showcase at Chroma Space Studios, San Juan, by invitation.' } },
      FAQ_PASS,
    ],
  },
  sponsor: {
    role: 'sponsor',
    label: { es: 'Sponsors y marcas', en: 'Sponsors and brands' },
    title: { es: 'Bienvenida, marca', en: 'Welcome, brand' },
    metaTitle: { es: 'Patrocina el Spatialgineers Summit 2026 · Paquetes y fechas', en: 'Sponsor Spatialgineers Summit 2026 · Packages and dates' },
    description: {
      es: `Guía para sponsors del Spatialgineers Summit 2026: 5 paquetes con precios en USD, solicitudes hasta el ${D.sponsorApplications.day.es}, pago total y materiales a más tardar el ${D.sponsorPayment.day.es}. Tu marca en la webapp, la transmisión y el Día 3.`,
      en: `Sponsor guide to Spatialgineers Summit 2026: 5 packages priced in USD, applications through ${D.sponsorApplications.day.en}, full payment and materials no later than ${D.sponsorPayment.day.en}. Your brand on the web app, the broadcast and Day 3.`,
    },
    intro: {
      es: 'Auspiciar es ocupar con tu marca los espacios del Summit: la webapp con núcleo 3D, minijuegos y misiones, la transmisión por YouTube Live y el Día 3 en Chroma Space Studios.',
      en: "Sponsoring means your brand fills the Summit's spaces: the web app with its 3D core, mini-games and missions, the YouTube Live broadcast and Day 3 at Chroma Space Studios.",
    },
    videoTitle: { es: 'Recorrido para sponsors', en: 'Walkthrough for sponsors' },
    steps: [
      { when: { es: `Hasta el ${D.sponsorApplications.short.es}`, en: `By ${D.sponsorApplications.short.en}` }, title: { es: 'Solicita', en: 'Apply' }, body: { es: `Elige uno de los 5 paquetes (precios en USD) y envía el formulario. ${DEADLINE_COPY.sponsorApplications.es} Recibes un código de seguimiento al instante.`, en: `Pick one of the 5 packages (prices in USD) and send the form. ${DEADLINE_COPY.sponsorApplications.en} You get a tracking code right away.` } },
      { when: { es: 'Tras la revisión', en: 'After review' }, title: { es: 'Confirmación', en: 'Confirmation' }, body: { es: 'El equipo de Spatialgineers revisa tu propuesta y te escribe por correo. Rige un contrato corto de auspicio firmado por ambas partes.', en: 'The Spatialgineers team reviews your proposal and emails you. A short sponsorship contract signed by both parties governs.' } },
      { when: { es: D.sponsorPayment.short.es, en: D.sponsorPayment.short.en }, title: { es: 'Pago total y materiales', en: 'Full payment and materials' }, body: { es: DEADLINE_COPY.sponsorPaymentMaterials.es, en: DEADLINE_COPY.sponsorPaymentMaterials.en } },
      { when: { es: '11–13 dic', en: 'Dec 11–13' }, title: { es: 'En vivo', en: 'Live' }, body: { es: 'Tu marca en la webapp, la transmisión y el Día 3. Paquetes 4 y 5 reciben el reporte final a los 30 días.', en: 'Your brand on the web app, the broadcast and Day 3. Packages 4 and 5 get the final report at 30 days.' } },
    ],
    faq: [
      { q: { es: '¿Cuáles son las fechas clave para sponsors?', en: 'What are the key dates for sponsors?' }, a: { es: `${DEADLINE_COPY.sponsorKeyDates.es} El Summit es del 11 al 13 de diciembre de 2026.`, en: `${DEADLINE_COPY.sponsorKeyDates.en} The Summit runs December 11–13, 2026.` } },
      { q: { es: '¿El precio es fijo?', en: 'Is the price fixed?' }, a: { es: 'No. Cada uno de los 5 paquetes tiene un rango en USD y el precio exacto se acuerda según el presupuesto del sponsor. El Paquete 5 no tiene precio público.', en: "No. Each of the 5 packages has a range in USD and the exact price is agreed based on the sponsor's budget. Package 5 has no public price." } },
      { q: { es: '¿Garantizan vistas, asistencia o clics?', en: 'Do you guarantee views, attendance or clicks?' }, a: { es: 'No. Spatialgineers no garantiza un número de vistas, asistentes ni clics. Los Paquetes 4 y 5 reciben un reporte final a los 30 días, sin datos personales.', en: 'No. Spatialgineers does not guarantee a number of views, attendees or clicks. Packages 4 and 5 receive a final report at 30 days, with no personal data.' } },
      { q: { es: '¿Hay exclusividad por categoría?', en: 'Is there category exclusivity?' }, a: { es: 'Sí, en los Paquetes 4 y 5: una sola marca de su sector.', en: 'Yes, in Packages 4 and 5: only one brand from your sector.' } },
    ],
  },
  prensa: {
    role: 'prensa',
    label: { es: 'Prensa y medios', en: 'Press and media' },
    title: { es: 'Bienvenida, prensa', en: 'Welcome, press' },
    metaTitle: { es: 'Prensa · Acreditación al Spatialgineers Summit 2026 · 11–13 dic', en: 'Press · Spatialgineers Summit 2026 accreditation · Dec 11–13' },
    description: {
      es: 'Guía para prensa y medios del Spatialgineers Summit 2026: solicita tu acreditación antes del 1 de diciembre (10 cupos de prensa), descarga el kit de prensa y cubre los 3 días: YouTube Live y el Día 3 en Chroma Space Studios.',
      en: 'Press and media guide to Spatialgineers Summit 2026: request accreditation before December 1 (10 press slots), download the press kit and cover all 3 days: YouTube Live and Day 3 at Chroma Space Studios.',
    },
    intro: {
      es: 'Cubres el Summit. La acreditación de prensa incluye los 3 días: la transmisión por YouTube Live los Días 1 y 2, y la entrada al Día 3 en Chroma Space Studios con el QR de tu SGX Pass.',
      en: 'You are covering the Summit. Press accreditation includes all 3 days: the YouTube Live broadcast on Days 1 and 2, and entry to Day 3 at Chroma Space Studios with your SGX Pass QR.',
    },
    videoTitle: { es: 'Recorrido para prensa', en: 'Walkthrough for press' },
    steps: [
      { when: { es: 'Hoy', en: 'Today' }, title: { es: 'Forja tu SGX Pass', en: 'Forge your SGX Pass' }, body: { es: 'Gratis y en un minuto. Desde tu pase solicitas la acreditación.', en: 'Free and in a minute. You request accreditation from your pass.' } },
      { when: { es: 'Antes del 1 dic', en: 'Before Dec 1' }, title: { es: 'Solicita tu acreditación', en: 'Request accreditation' }, body: { es: 'En la Sala de prensa: tu medio, tu cargo, enlaces a coberturas previas y los días que cubrirás. 10 cupos de prensa. Recibes un código de seguimiento.', en: 'In the Press room: your outlet, your title, links to past coverage and the days you will cover. 10 press slots. You get a tracking code.' } },
      { when: { es: 'Tras la revisión', en: 'After review' }, title: { es: 'Tu pase dice PRENSA', en: 'Your pass says PRESS' }, body: { es: 'Si te aprueban, el equipo te escribe, tu Holo Card cambia a PRENSA y tu pase queda invitado al Día 3.', en: 'If approved, the team writes to you, your Holo Card switches to PRESS and your pass is invited to Day 3.' } },
      { when: { es: '11–13 dic', en: 'Dec 11–13' }, title: { es: 'Cubre los 3 días', en: 'Cover all 3 days' }, body: { es: 'Días 1 y 2 por YouTube Live, con Los Mismos TV transmitiendo junto a nosotros. Día 3 presencial en Chroma Space Studios, San Juan: entras con el QR de tu SGX Pass.', en: 'Days 1 and 2 on YouTube Live, with Los Mismos TV streaming alongside us. Day 3 in person at Chroma Space Studios, San Juan: you get in with your SGX Pass QR.' } },
    ],
    faq: PRESS_FAQ,
  },
  equipo: {
    role: 'equipo',
    internal: true,
    label: { es: 'Equipo', en: 'Team' },
    title: { es: 'Bienvenida, equipo', en: 'Welcome, team' },
    metaTitle: { es: 'Equipo · Spatialgineers Summit 2026', en: 'Team · Spatialgineers Summit 2026' },
    description: {
      es: 'Recorrido interno para el equipo del Spatialgineers Summit 2026: el centro de mando, los inscritos y el Día 3.',
      en: 'Internal walkthrough for the Spatialgineers Summit 2026 team: the command center, registrations and Day 3.',
    },
    intro: {
      es: 'Lo que el equipo usa durante el Summit vive en el admin. Entra con tu cuenta autorizada.',
      en: 'What the team uses during the Summit lives in the admin. Sign in with your authorized account.',
    },
    videoTitle: { es: 'Recorrido para el equipo', en: 'Walkthrough for the team' },
    steps: [
      { when: { es: 'Antes', en: 'Before' }, title: { es: 'Entra al admin', en: 'Open the admin' }, body: { es: 'Con tu cuenta autorizada. Contenido: agenda, speakers, sponsors, paquetes y este portal de bienvenida.', en: 'With your authorized account. Content: agenda, speakers, sponsors, packages and this welcome portal.' } },
      { when: { es: 'Antes', en: 'Before' }, title: { es: 'Inscritos y Día 3', en: 'Registrations and Day 3' }, body: { es: `Registros, código de check-in del Día 3 y propuestas de speakers. Invitaciones al Día 3 a más tardar el ${D.day3Invitations.day.es}.`, en: `Registrations, the Day 3 check-in code and speaker proposals. Day 3 invitations no later than ${D.day3Invitations.day.en}.` } },
      { when: { es: '11–13 dic', en: 'Dec 11–13' }, title: { es: 'En vivo', en: 'Live' }, body: { es: 'Consola del director para la pregunta en vivo y anuncios que llegan al instante a todas las páginas abiertas.', en: 'Director console for the live question, and announcements that reach every open page instantly.' } },
    ],
    faq: [],
  },
};

/** What the hub shows for the extra videos. */
export const WELCOME_EXTRA_VIDEOS: Record<'tour' | 'pass' | 'build', { title: Bi; body: Bi }> = {
  tour: {
    title: { es: 'El recorrido completo', en: 'The full tour' },
    body: { es: 'Todo el Summit en un video: el núcleo 3D, los seis pilares, Tu Estudio y los tres días.', en: 'The whole Summit in one video: the 3D core, the six pillars, Your Studio and the three days.' },
  },
  pass: {
    title: { es: 'Tu SGX Pass en un minuto', en: 'Your SGX Pass in a minute' },
    body: { es: 'Cómo forjar tu pase gratis y qué te da: tu Holo Card, el QR de networking, las misiones y el XP.', en: 'How to forge your free pass and what it gives you: your Holo Card, the networking QR, missions and XP.' },
  },
  build: {
    title: { es: 'Cómo se construyó la app', en: 'How the app was built' },
    body: { es: 'Detrás de cámaras de la webapp del Spatialgineers Summit 2026.', en: 'Behind the scenes of the Spatialgineers Summit 2026 web app.' },
  },
};

export const pick = (b: Bi, es: boolean) => (es ? b.es : b.en);

/** The video key a page leads with. */
export const welcomeVideoKey = (role: WelcomeRole | null): WelcomeVideoKey => role || 'tour';

/* ---------- head data for the server (Spanish: the language of the event) ---------- */

export interface WelcomeHead {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
  videoId: string | null;
  videoKey: WelcomeVideoKey;
  image: string;
  imageWidth: number;
  imageHeight: number;
  heading: string;
  intro: string;
  steps: WelcomeStep[];
  faq: WelcomeFaq[];
}

export function welcomeHead(role: WelcomeRole | null, ids: WelcomeVideoIds): WelcomeHead {
  const copy = role ? WELCOME_ROLE_COPY[role] : null;
  const videoKey = welcomeVideoKey(role);
  const videoId = ids[videoKey] || null;
  const portrait = isPortraitVideo(videoKey);
  return {
    title: copy ? copy.metaTitle.es : WELCOME_HUB.metaTitle.es,
    description: copy ? copy.description.es : WELCOME_HUB.description.es,
    canonical: welcomeUrlFor(role),
    noindex: !!copy?.internal,
    videoId,
    videoKey,
    image: videoId ? youTubeThumb(videoId, videoKey) : `${WELCOME_ORIGIN}/og-image.jpg`,
    imageWidth: videoId ? (portrait ? 480 : 1280) : 1200,
    imageHeight: videoId ? (portrait ? 360 : 720) : 630,
    heading: copy ? copy.title.es : WELCOME_HUB.title.es,
    intro: copy ? copy.intro.es : WELCOME_HUB.intro.es,
    steps: copy ? copy.steps : [],
    faq: copy ? copy.faq : WELCOME_HUB.faq,
  };
}

/** JSON-LD graph: the Event, the page's VideoObject (when there is a video) and its FAQPage. */
export const SGX_ORGANIZER_LD = { '@type': 'Organization', name: 'Spatialgineers LLC', url: 'https://spatialgineers.com' };

/** The Summit as a schema.org Event (shared by the welcome portal and the press room). */
export function summitEventLd(): Record<string, unknown> {
  const organizer = SGX_ORGANIZER_LD;
  return {
    '@type': 'Event',
    '@id': `${WELCOME_ORIGIN}/#event`,
    name: 'Spatialgineers Summit 2026',
    description: 'Tres días de spatial computing, artistas invitados y producción virtual en vivo. Días 1 y 2 gratis por YouTube Live; Día 3 (SGX Showcase) en Chroma Space Studios, San Juan, por invitación.',
    inLanguage: 'es',
    startDate: '2026-12-11T10:00:00-04:00',
    endDate: '2026-12-13T16:00:00-04:00',
    eventAttendanceMode: 'https://schema.org/MixedEventAttendanceMode',
    eventStatus: 'https://schema.org/EventScheduled',
    location: [
      { '@type': 'Place', name: 'Chroma Space Studios', address: { '@type': 'PostalAddress', addressLocality: 'San Juan', addressRegion: 'PR', addressCountry: 'US' } },
      { '@type': 'VirtualLocation', name: 'YouTube Live', url: 'https://www.youtube.com/@spatialgineers' },
    ],
    organizer,
    url: WELCOME_ORIGIN,
    image: `${WELCOME_ORIGIN}/og-image.jpg`,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: WELCOME_ORIGIN, validFrom: '2026-01-01T00:00:00-04:00' },
  };
}

export function welcomeJsonLd(head: WelcomeHead, uploadDate?: string | null): Record<string, unknown> {
  const organizer = SGX_ORGANIZER_LD;
  const event = summitEventLd();
  const graph: Record<string, unknown>[] = [
    event,
    { '@type': 'WebPage', '@id': head.canonical, url: head.canonical, name: head.title, description: head.description, inLanguage: 'es', about: { '@id': `${WELCOME_ORIGIN}/#event` }, isPartOf: { '@type': 'WebSite', name: 'Spatialgineers Summit 2026', url: WELCOME_ORIGIN } },
  ];
  if (head.videoId) {
    const video: Record<string, unknown> = {
      '@type': 'VideoObject',
      name: `${head.heading} · Spatialgineers Summit 2026`,
      description: head.description,
      thumbnailUrl: [`https://i.ytimg.com/vi/${head.videoId}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${head.videoId}/hqdefault.jpg`],
      embedUrl: `https://www.youtube-nocookie.com/embed/${head.videoId}`,
      url: youTubeWatchUrl(head.videoId),
      inLanguage: 'es',
      publisher: organizer,
      about: { '@id': `${WELCOME_ORIGIN}/#event` },
    };
    if (uploadDate) video.uploadDate = uploadDate;
    graph.push(video);
  }
  if (head.faq.length) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: head.faq.map((f) => ({ '@type': 'Question', name: f.q.es, acceptedAnswer: { '@type': 'Answer', text: f.a.es } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}
