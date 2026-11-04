/* SALA DE PRENSA (/prensa): the press accreditation rules, the fact sheet,
   the founders' bios and the press kit files. Pure data: the page (client),
   the server (head + no-JS copy of /prensa), the welcome portal and the kit
   builder (scripts/press-kit/build.cjs) all read it from here.
   Every fact comes from the app's own copy or from the team. Do not add
   numbers, dates or promises here that the team has not confirmed. */

import { SUMMIT_DEADLINES, deadlineMs, summitNow } from './summitDeadlines';

type Bi = { es: string; en: string };

export const PRESS_PATH = '/prensa';
export const PRESS_ORIGIN = 'https://summit.spatialgineers.com';
export const PRESS_URL = `${PRESS_ORIGIN}${PRESS_PATH}`;

/** Requests close at the start of December 1, 2026 (Puerto Rico time). The date lives in summitDeadlines.ts. */
export const PRESS_DEADLINE_ISO = SUMMIT_DEADLINES.pressAccreditation.closesAt;
export const PRESS_DEADLINE = deadlineMs('pressAccreditation');
/** Ten press accreditations in all (no per-outlet rule). */
export const PRESS_SLOTS = 10;

export const isPressOpen = (now = summitNow()) => now < PRESS_DEADLINE;

export const PRESS_RULES = {
  deadline: { es: `Solicita antes del ${SUMMIT_DEADLINES.pressAccreditation.label.es}`, en: `Apply before ${SUMMIT_DEADLINES.pressAccreditation.label.en}` },
  slots: { es: `${PRESS_SLOTS} cupos de prensa`, en: `${PRESS_SLOTS} press slots` },
  access: {
    es: 'La acreditación cubre los 3 días: la transmisión por YouTube Live los Días 1 y 2, y la entrada presencial al Día 3 en Chroma Space Studios con el QR de tu SGX Pass.',
    en: 'Accreditation covers all 3 days: the YouTube Live broadcast on Days 1 and 2, and in-person entry to Day 3 at Chroma Space Studios with your SGX Pass QR.',
  },
  line: {
    es: `Prensa: solicita tu acreditación en summit.spatialgineers.com/prensa antes del ${SUMMIT_DEADLINES.pressAccreditation.day.es} (10 cupos de prensa).`,
    en: `Press: request accreditation at summit.spatialgineers.com/prensa before ${SUMMIT_DEADLINES.pressAccreditation.day.en} (10 press slots).`,
  },
} satisfies Record<string, Bi>;

export type PressMediaType = 'tv' | 'radio' | 'print' | 'digital' | 'podcast' | 'creator';
export const PRESS_MEDIA_TYPES: { id: PressMediaType; label: Bi }[] = [
  { id: 'tv', label: { es: 'TV', en: 'TV' } },
  { id: 'radio', label: { es: 'Radio', en: 'Radio' } },
  { id: 'print', label: { es: 'Prensa escrita', en: 'Print' } },
  { id: 'digital', label: { es: 'Medio digital', en: 'Digital outlet' } },
  { id: 'podcast', label: { es: 'Podcast', en: 'Podcast' } },
  { id: 'creator', label: { es: 'Creador de contenido', en: 'Content creator' } },
];
export const mediaTypeLabel = (id: string | undefined, es = true) => {
  const t = PRESS_MEDIA_TYPES.find((m) => m.id === id);
  return t ? (es ? t.label.es : t.label.en) : (id || '');
};

export const PRESS_DAYS: { day: 1 | 2 | 3; label: Bi; how: Bi }[] = [
  { day: 1, label: { es: 'Día 1 · vie 11 dic', en: 'Day 1 · Fri Dec 11' }, how: { es: 'Digital, por YouTube Live', en: 'Digital, on YouTube Live' } },
  { day: 2, label: { es: 'Día 2 · sáb 12 dic', en: 'Day 2 · Sat Dec 12' }, how: { es: 'Digital, por YouTube Live', en: 'Digital, on YouTube Live' } },
  { day: 3, label: { es: 'Día 3 · dom 13 dic', en: 'Day 3 · Sun Dec 13' }, how: { es: 'Presencial en Chroma Space Studios', en: 'In person at Chroma Space Studios' } },
];

/* ---------- fact sheet ---------- */

export const PRESS_FACTS: { k: Bi; v: Bi }[] = [
  { k: { es: 'Evento', en: 'Event' }, v: { es: 'Spatialgineers Summit 2026', en: 'Spatialgineers Summit 2026' } },
  { k: { es: 'Fechas', en: 'Dates' }, v: { es: '11, 12 y 13 de diciembre de 2026', en: 'December 11, 12 and 13, 2026' } },
  { k: { es: 'Días 1 y 2', en: 'Days 1 and 2' }, v: { es: 'Digitales y gratis por YouTube Live, con Los Mismos TV transmitiendo junto a Spatialgineers.', en: 'Digital and free on YouTube Live, with Los Mismos TV streaming alongside Spatialgineers.' } },
  { k: { es: 'Día 3', en: 'Day 3' }, v: { es: 'SGX Showcase presencial en Chroma Space Studios, San Juan, Puerto Rico. Por invitación: el equipo las envía a más tardar el 5 de diciembre.', en: 'In-person SGX Showcase at Chroma Space Studios, San Juan, Puerto Rico. By invitation: the team sends them no later than December 5.' } },
  { k: { es: 'Idioma', en: 'Language' }, v: { es: 'Español', en: 'Spanish' } },
  { k: { es: 'Formato', en: 'Format' }, v: { es: 'Seis pilares del SGX Framework: Story, Showcase, Spark, Stage, System y Synthesize.', en: 'Six pillars of the SGX Framework: Story, Showcase, Spark, Stage, System and Synthesize.' } },
  { k: { es: 'Organiza', en: 'Organizer' }, v: { es: 'Spatialgineers LLC, estudio de ingeniería creativa y computación espacial en Puerto Rico.', en: 'Spatialgineers LLC, a creative engineering and spatial computing studio in Puerto Rico.' } },
  { k: { es: 'Fundadores', en: 'Founders' }, v: { es: 'Danelson Maldonado González "The Highgineer" y Ricardo A. Hernández Díaz "Lightning Fingers".', en: 'Danelson Maldonado González "The Highgineer" and Ricardo A. Hernández Díaz "Lightning Fingers".' } },
  { k: { es: 'Portafolio', en: 'Portfolio' }, v: { es: '60+ espacios digitales y 10 juegos interactivos.', en: '60+ digital spaces and 10 interactive games.' } },
  { k: { es: 'Web del Summit', en: 'Summit website' }, v: { es: 'summit.spatialgineers.com', en: 'summit.spatialgineers.com' } },
  { k: { es: 'Prensa', en: 'Press' }, v: { es: `Acreditación antes del ${SUMMIT_DEADLINES.pressAccreditation.label.es}: 10 cupos de prensa. info@spatialgineers.com`, en: `Accreditation before ${SUMMIT_DEADLINES.pressAccreditation.label.en}: 10 press slots. info@spatialgineers.com` } },
];

export const PRESS_ABOUT: { summit: Bi; studio: Bi } = {
  summit: {
    es: 'El Spatialgineers Summit 2026 son tres días de computación espacial, artistas invitados y producción virtual en vivo, en español. Los Días 1 y 2 (11 y 12 de diciembre) son digitales y gratis por YouTube Live, con Los Mismos TV transmitiendo junto a Spatialgineers. El Día 3 (13 de diciembre) es el SGX Showcase presencial en Chroma Space Studios, San Juan, por invitación. El programa se organiza en los seis pilares del SGX Framework: Story, Showcase, Spark, Stage, System y Synthesize. La experiencia vive en una webapp con núcleo 3D, el SGX Pass gratis (la Holo Card de cada Creador), el Highbot y una arena de votación en vivo.',
    en: 'Spatialgineers Summit 2026 is three days of spatial computing, guest artists and live virtual production, in Spanish. Days 1 and 2 (December 11 and 12) are digital and free on YouTube Live, with Los Mismos TV streaming alongside Spatialgineers. Day 3 (December 13) is the in-person SGX Showcase at Chroma Space Studios, San Juan, by invitation. The program is organized around the six pillars of the SGX Framework: Story, Showcase, Spark, Stage, System and Synthesize. The experience lives in a web app with a 3D core, the free SGX Pass (each Creator’s Holo Card), the Highbot and a live voting arena.',
  },
  studio: {
    es: 'Spatialgineers LLC es un estudio de ingeniería creativa y computación espacial en Puerto Rico: producción 3D, medios inmersivos, gamificación, WebXR, VR/AR e IA. Opera desde 2023 y es LLC desde marzo de 2026. Sus fundadores, Danelson Maldonado González y Ricardo A. Hernández Díaz, son ingenieros mecánicos del Recinto Universitario de Mayagüez (UPR). Su portafolio público suma más de 60 espacios digitales y 10 juegos interactivos. Lema: "Ingeniando imaginación, construyendo realidades."',
    en: 'Spatialgineers LLC is a creative engineering and spatial computing studio in Puerto Rico: 3D production, immersive media, gamification, WebXR, VR/AR and AI. It has operated since 2023 and became an LLC in March 2026. Its founders, Danelson Maldonado González and Ricardo A. Hernández Díaz, are mechanical engineers from the University of Puerto Rico at Mayagüez (RUM). Its public portfolio counts 60+ digital spaces and 10 interactive games. Motto: "Engineering Imagination, Building Realities."',
  },
};

export interface PressBio { id: string; name: string; alias: string; role: Bi; bio: Bi; photo: string }

export const PRESS_FOUNDERS: PressBio[] = [
  {
    id: 'danelson',
    name: 'Danelson Maldonado González',
    alias: 'The Highgineer',
    role: { es: 'Presidente, CEO y Director Creativo', en: 'President, CEO and Creative Director' },
    bio: {
      es: 'Danelson Maldonado González, "The Highgineer", es cofundador, Presidente, CEO y Director Creativo de Spatialgineers. Ingeniero mecánico del Recinto Universitario de Mayagüez (UPR), dirige la visión, la estrategia creativa, las alianzas, la narrativa y la dirección de arte del estudio. Es el creador del SGX Framework de seis pilares y de Highcoon, la IP propia de Spatialgineers. En el Summit abre la transmisión del Día 1 y, el Día 3, presenta con su avatar y captura facial en tiempo real.',
      en: 'Danelson Maldonado González, "The Highgineer", is co-founder, President, CEO and Creative Director of Spatialgineers. A mechanical engineer from the University of Puerto Rico at Mayagüez (RUM), he leads the studio’s vision, creative strategy, partnerships, narrative and art direction. He created the six-pillar SGX Framework and Highcoon, Spatialgineers’ own IP. At the Summit he opens the Day 1 broadcast and, on Day 3, presents with his avatar and real-time facial capture.',
    },
    photo: '/press/fotos/danelson-maldonado-the-highgineer.jpg',
  },
  {
    id: 'ricardo',
    name: 'Ricardo A. Hernández Díaz',
    alias: 'Lightning Fingers',
    role: { es: 'Vicepresidente, CPO y Director Técnico', en: 'Vice President, CPO and Technical Director' },
    bio: {
      es: 'Ricardo A. Hernández Díaz, "Lightning Fingers", es cofundador, Vicepresidente, CPO y Director Técnico de Spatialgineers. Ingeniero mecánico del Recinto Universitario de Mayagüez (UPR), lidera la ingeniería y la implementación: Blender, Unity, Unreal, Roblox y WebXR, con la web primero en Three.js. En el Summit acompaña el bloque de SGX.Showcase y prepara la escena y la iluminación del Día 3 en Chroma Space Studios.',
      en: 'Ricardo A. Hernández Díaz, "Lightning Fingers", is co-founder, Vice President, CPO and Technical Director of Spatialgineers. A mechanical engineer from the University of Puerto Rico at Mayagüez (RUM), he leads engineering and implementation: Blender, Unity, Unreal, Roblox and WebXR, web-first in Three.js. At the Summit he joins the SGX.Showcase block and sets up the stage and lighting for Day 3 at Chroma Space Studios.',
    },
    photo: '/press/fotos/ricardo-hernandez-lightning-fingers.jpg',
  },
];

/* ---------- the kit's files (built by scripts/press-kit/build.cjs) ---------- */

export const PRESS_KIT_DIR = '/press';
export const PRESS_KIT_ZIP = '/press/spatialgineers-summit-2026-kit-de-prensa.zip';
export const PRESS_FACT_SHEET_PDF = '/press/spatialgineers-summit-2026-ficha-de-prensa.pdf';

export type PressAssetKind = 'logo' | 'photo' | 'screenshot';
export interface PressAsset {
  kind: PressAssetKind;
  /** path under public/ (served as is) */
  file: string;
  /** a small preview next to it */
  thumb: string;
  title: Bi;
  credit: string;
  /** where the builder takes it from: a CDN url, a file in public/, or a screenshot made by the builder */
  source: { url?: string; local?: string; shot?: string };
}

const photo = (slug: string, cdn: string, title: Bi): PressAsset => ({
  kind: 'photo', file: `/press/fotos/${slug}.jpg`, thumb: `/press/thumbs/${slug}.jpg`, title,
  credit: 'Foto: Spatialgineers', source: { url: `https://cdn.spatialgineers.com/Nosotros/${cdn}.png` },
});
const shot = (slug: string, title: Bi): PressAsset => ({
  kind: 'screenshot', file: `/press/app/${slug}.jpg`, thumb: `/press/thumbs/${slug}.jpg`, title,
  credit: 'Captura: Spatialgineers Summit 2026', source: { shot: slug },
});

export const PRESS_ASSETS: PressAsset[] = [
  { kind: 'logo', file: '/press/logos/spatialgineers-summit-2026-logo.png', thumb: '/press/thumbs/spatialgineers-summit-2026-logo.png', title: { es: 'Logo del Spatialgineers Summit', en: 'Spatialgineers Summit logo' }, credit: 'Spatialgineers LLC', source: { url: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png' } },
  { kind: 'logo', file: '/press/logos/spatialgineers-logo.png', thumb: '/press/thumbs/spatialgineers-logo.png', title: { es: 'Logo de Spatialgineers', en: 'Spatialgineers logo' }, credit: 'Spatialgineers LLC', source: { url: 'https://cdn.spatialgineers.com/Branding/Logo%20BY.PNG' } },
  { kind: 'logo', file: '/press/logos/spatialgineers-summit-2026-insignia.png', thumb: '/press/thumbs/spatialgineers-summit-2026-insignia.png', title: { es: 'Insignia del Summit (fondo transparente)', en: 'Summit badge (transparent background)' }, credit: 'Spatialgineers LLC', source: { local: 'brand/summit-logo.png' } },
  photo('fundadores-danelson-y-ricardo', 'IMG_2026', { es: 'Los fundadores: The Highgineer y Lightning Fingers', en: 'The founders: The Highgineer and Lightning Fingers' }),
  photo('danelson-maldonado-the-highgineer', 'IMG_2028', { es: 'Danelson Maldonado González, "The Highgineer"', en: 'Danelson Maldonado González, "The Highgineer"' }),
  photo('ricardo-hernandez-lightning-fingers', 'IMG_2029', { es: 'Ricardo A. Hernández Díaz, "Lightning Fingers"', en: 'Ricardo A. Hernández Díaz, "Lightning Fingers"' }),
  photo('comunidad-spatialgineers', 'IMG_2037', { es: 'La comunidad Spatialgineers', en: 'The Spatialgineers community' }),
  photo('demo-computacion-espacial', 'IMG_2038', { es: 'Demostración de computación espacial', en: 'Spatial computing demo' }),
  photo('taller-de-prototipado', 'IMG_2039', { es: 'Taller de prototipado', en: 'Prototyping workshop' }),
  photo('demo-realidad-virtual', 'IMG_2041', { es: 'Demostración con visores de realidad virtual', en: 'Virtual reality headset demo' }),
  shot('app-nucleo-3d', { es: 'La webapp: el núcleo 3D con los seis pilares', en: 'The web app: the 3D core with the six pillars' }),
  shot('app-holo-card', { es: 'La Holo Card del SGX Pass', en: 'The SGX Pass Holo Card' }),
  shot('app-highbot', { es: 'El Highbot en Avatar Studio', en: 'The Highbot in Avatar Studio' }),
  shot('app-arena-en-vivo', { es: 'La arena de votación en vivo', en: 'The live voting arena' }),
  shot('app-agenda', { es: 'La agenda de los tres días', en: 'The three-day agenda' }),
];

/* ---------- press FAQ (page + welcome portal JSON-LD) ---------- */

export const PRESS_FAQ: { q: Bi; a: Bi }[] = [
  {
    q: { es: '¿Cómo pido la acreditación de prensa para el Spatialgineers Summit 2026?', en: 'How do I request press accreditation for Spatialgineers Summit 2026?' },
    a: { es: `En summit.spatialgineers.com/prensa: forjas tu SGX Pass gratis y llenas la solicitud con tu medio, tu cargo, enlaces a coberturas previas y los días que cubrirás. Recibes un código de seguimiento al enviarla. La fecha límite es el ${SUMMIT_DEADLINES.pressAccreditation.label.es}.`, en: `At summit.spatialgineers.com/prensa: forge your free SGX Pass and fill in the request with your outlet, your title, links to past coverage and the days you will cover. You get a tracking code when you send it. The deadline is ${SUMMIT_DEADLINES.pressAccreditation.label.en}.` },
  },
  {
    q: { es: '¿Cuántos cupos de prensa hay?', en: 'How many press slots are there?' },
    a: { es: 'Diez cupos de prensa. El equipo de Spatialgineers revisa cada solicitud y te escribe al aprobarla.', en: 'Ten press slots. The Spatialgineers team reviews each request and writes to you once it is approved.' },
  },
  {
    q: { es: '¿Qué incluye la acreditación?', en: 'What does accreditation include?' },
    a: { es: 'Los tres días: la cobertura de la transmisión por YouTube Live los Días 1 y 2 (11 y 12 de diciembre) y la entrada presencial al Día 3 (13 de diciembre) en Chroma Space Studios, San Juan, con el QR de tu SGX Pass. Tu Holo Card cambia a PRENSA.', en: 'All three days: coverage of the YouTube Live broadcast on Days 1 and 2 (December 11 and 12) and in-person entry to Day 3 (December 13) at Chroma Space Studios, San Juan, with your SGX Pass QR. Your Holo Card switches to PRESS.' },
  },
  {
    q: { es: '¿Dónde está el kit de prensa?', en: 'Where is the press kit?' },
    a: { es: 'En summit.spatialgineers.com/prensa: logos, fotos de los fundadores, capturas de la webapp y la ficha de prensa en PDF, todo en un ZIP o cada archivo por separado. Para entrevistas: info@spatialgineers.com.', en: 'At summit.spatialgineers.com/prensa: logos, photos of the founders, screenshots of the web app and the press fact sheet as a PDF, all in one ZIP or each file on its own. For interviews: info@spatialgineers.com.' },
  },
];

export const PRESS_META = {
  title: { es: 'Sala de prensa · Spatialgineers Summit 2026 · Acreditación y kit de prensa', en: 'Press room · Spatialgineers Summit 2026 · Accreditation and press kit' },
  description: {
    es: 'Acreditación de prensa para el Spatialgineers Summit 2026 (11–13 dic): solicita antes del 1 de diciembre, 10 cupos de prensa. Kit de prensa con logos, fotos, capturas y ficha en PDF.',
    en: 'Press accreditation for Spatialgineers Summit 2026 (Dec 11–13): apply before December 1, 10 press slots. Press kit with logos, photos, screenshots and a PDF fact sheet.',
  },
};
