/* SPEAKER GUIDE ("Guía del speaker"): what a speaker sends, how the session
   runs, the technical test and the tone rules, so the team can send only the
   app link. One source for the Speaker portal (before and after sending, and
   once approved), the welcome portal (/bienvenida/speaker#guia), the speaker
   invite email, the Highbot knowledge and the offline guide. Pure data: safe
   to import on the server.

   Source: "Media-Kit-D-Speakers-Summit v2026.10.4" (the speaker kit) and the
   Run of Show v2026.10.2. Dates come from summitDeadlines.ts (the team's
   decisions win over the older dates in the kit, e.g. the 4 nov confirmation
   date is replaced by the 21 nov profile deadline). */

import { DEADLINE_COPY, SUMMIT_CONTACT_EMAIL, SUMMIT_DEADLINES as D } from './summitDeadlines';

type Bi = { es: string; en: string };

export const SPEAKER_GUIDE_ANCHOR = 'guia';
export const SPEAKER_GUIDE_PATH = '/bienvenida/speaker#guia';

/** Recommended bio length (words). */
export const SPEAKER_BIO_WORDS = { min: 50, max: 80 };
/** Minimum photo size (px, long side). */
export const SPEAKER_PHOTO_MIN_PX = 1500;

export interface GuideItem {
  text: Bi;
  /** Where it goes: in the portal form, or by email to info@. */
  where: 'portal' | 'email';
}

/** What we need from you. */
export const SPEAKER_SEND: GuideItem[] = [
  { where: 'portal', text: { es: `Bio de ${SPEAKER_BIO_WORDS.min} a ${SPEAKER_BIO_WORDS.max} palabras en español (y en inglés, si prefieres).`, en: `A ${SPEAKER_BIO_WORDS.min} to ${SPEAKER_BIO_WORDS.max} word bio in Spanish (and in English, if you like).` } },
  { where: 'portal', text: { es: 'Tu usuario de Instagram, LinkedIn o el canal que prefieras, para etiquetarte.', en: 'Your Instagram, LinkedIn or preferred channel handle, so we can tag you.' } },
  { where: 'portal', text: { es: 'Logo de tu empresa o proyecto, si aplica (como enlace).', en: 'Your company or project logo, if any (as a link).' } },
  { where: 'portal', text: { es: '(Opcional) 2 o 3 ideas clave para la audiencia: alimentan las preguntas de votación.', en: '(Optional) 2 or 3 key ideas for the audience: they feed the voting questions.' } },
  { where: 'portal', text: { es: 'Datos técnicos: ciudad, zona horaria, equipo y conexión.', en: 'Technical details: city, time zone, equipment and connection.' } },
  { where: 'portal', text: { es: 'No necesitas foto: tu imagen en el Summit es tu Highbot, el que armas en tu SGX Pass.', en: 'No photo needed: your image at the Summit is your Highbot, the one you build in your SGX Pass.' } },
];

/** How a Day 2 conversation runs (45 minutes per pillar). */
export const SPEAKER_SESSION = {
  parts: [
    { min: 5, label: { es: 'para presentarte', en: 'to introduce yourself' } },
    { min: 30, label: { es: 'de conversación guiada', en: 'of guided conversation' } },
    { min: 10, label: { es: 'de preguntas del chat', en: 'of questions from the chat' } },
  ],
  lines: [
    { es: 'Día 2, sábado 12 de diciembre: una conversación de 45 minutos por pilar SGX, por YouTube Live. Cada pilar tiene 1 o 2 speakers.', en: 'Day 2, Saturday, December 12: one 45-minute conversation per SGX pillar, on YouTube Live. Each pillar has 1 or 2 speakers.' },
    { es: 'Es una conversación, no una charla. Si quieres mostrar video o demo, avísanos antes.', en: 'It is a conversation, not a talk. If you want to show a video or a demo, tell us in advance.' },
    { es: 'Participas 100% remoto. Todo va en hora de Puerto Rico (AST, UTC-4); el Día 2 empieza a las 10:00 a.m.', en: 'You take part 100% remotely. Everything is in Puerto Rico time (AST, UTC-4); Day 2 starts at 10:00 a.m.' },
    { es: 'Si tu bloque es otro día (por ejemplo, como artista), el equipo te confirma el formato por escrito.', en: 'If your block is on another day (for example, as an artist), the team confirms the format in writing.' },
  ] as Bi[],
};

/** Technical test and setup. */
export const SPEAKER_TECH: Bi[] = [
  { es: `Después de tu confirmación coordinamos una prueba técnica antes del ${D.speakerTechCheck.day.es}. Ricardo coordina lo técnico.`, en: `After you confirm, we schedule a technical test before ${D.speakerTechCheck.day.en}. Ricardo handles the technical side.` },
  { es: 'El día de tu bloque, conéctate 30 minutos antes.', en: 'On the day of your block, connect 30 minutes early.' },
  { es: 'Recomendado: internet por cable, auriculares, cámara a la altura de los ojos, luz frontal, fondo ordenado y datos móviles de respaldo.', en: 'Recommended: wired internet, headphones, camera at eye level, front light, a tidy background and mobile data as backup.' },
];

/** Tone and content rules. */
export const SPEAKER_RULES: Bi[] = [
  { es: 'Casos reales, resultados y aprendizajes. Sin pitch de ventas en tu bloque.', en: 'Real cases, results and lessons. No sales pitch in your block.' },
  { es: 'Hablamos de spatial computing.', en: 'We talk about spatial computing.' },
  { es: 'En español los tres días; las redes y YouTube pueden traducir y subtitular.', en: 'In Spanish all three days; social channels and YouTube may translate and caption.' },
  { es: 'Lenguaje inclusivo.', en: 'Inclusive language.' },
  { es: 'Sin música con derechos de autor (solo con licencia o libre de derechos).', en: 'No copyrighted music (only licensed or royalty-free).' },
  { es: 'Sin datos confidenciales de clientes.', en: 'No confidential client data.' },
];

/** What you get. */
export const SPEAKER_RECEIVE: Bi[] = [
  { es: 'Nunca publicamos tu nombre antes de tu confirmación por escrito.', en: 'We never publish your name before your written confirmation.' },
  { es: 'Ya confirmado: te presentamos en redes y en la página de speakers, y tu pase se vuelve tu Holo Card de speaker.', en: 'Once confirmed: we introduce you on social media and on the speakers page, and your pass becomes your speaker Holo Card.' },
  { es: 'Coordinamos contigo antes de publicar cortes.', en: 'We check with you before publishing clips.' },
  { es: 'Recibes tu briefing con horario y preguntas.', en: 'You get your briefing with the schedule and questions.' },
  { es: 'Votación gamificada tipo Kahoot: tu audiencia vota en las pausas del Día 2 y nosotros la operamos.', en: 'Kahoot-style gamified voting: your audience votes in the Day 2 breaks and we run it.' },
];

/** Your route to the Summit, in order. */
export const SPEAKER_ROUTE: { when: Bi; what: Bi }[] = [
  { when: { es: `Hasta el ${D.speakerProfiles.short.es}`, en: `By ${D.speakerProfiles.short.en}` }, what: { es: `Tu perfil en el Portal de speakers. ${DEADLINE_COPY.speakerProfiles.es}`, en: `Your profile in the Speaker portal. ${DEADLINE_COPY.speakerProfiles.en}` } },
  { when: { es: 'Con tu confirmación', en: 'With your confirmation' }, what: { es: 'Recibes tu briefing y coordinamos lo técnico.', en: 'You get your briefing and we coordinate the technical setup.' } },
  { when: { es: `Antes del ${D.speakerTechCheck.short.es}`, en: `Before ${D.speakerTechCheck.short.en}` }, what: { es: 'Prueba técnica con el equipo.', en: 'Technical test with the team.' } },
  { when: { es: '12 dic', en: 'Dec 12' }, what: { es: 'Tu conversación: conéctate 30 minutos antes.', en: 'Your conversation: connect 30 minutes early.' } },
];

/** Who does what in the team. */
export const SPEAKER_CONTACTS: Bi[] = [
  { es: 'Danelson Maldonado González "The Highgineer": programación, invitaciones y acuerdos.', en: 'Danelson Maldonado González "The Highgineer": programming, invitations and agreements.' },
  { es: 'Ricardo A. Hernández Díaz "Lightning Fingers": producción, requisitos técnicos y pruebas.', en: 'Ricardo A. Hernández Díaz "Lightning Fingers": production, technical requirements and tests.' },
];

/** One short paragraph for invites. */
export const SPEAKER_GUIDE_SUMMARY: Bi = {
  es: `Día 2: 45 minutos por pilar (5 de presentación, 30 de conversación y 10 de preguntas), 100% remoto. Bio de ${SPEAKER_BIO_WORDS.min} a ${SPEAKER_BIO_WORDS.max} palabras y datos técnicos en el portal (tu imagen es tu Highbot); prueba técnica antes del ${D.speakerTechCheck.day.es} y conexión 30 minutos antes.`,
  en: `Day 2: 45 minutes per pillar (5 to introduce, 30 of conversation and 10 of questions), 100% remote. A ${SPEAKER_BIO_WORDS.min} to ${SPEAKER_BIO_WORDS.max} word bio and technical details in the portal (your image is your Highbot); technical test before ${D.speakerTechCheck.day.en} and connect 30 minutes early.`,
};

/** Word count for the bio hint in the portal. */
export const countWords = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** The guide as prompt text (Spanish), for the Highbot. */
export function speakerGuidePrompt(): string {
  const send = SPEAKER_SEND.map((i) => `${i.text.es}${i.where === 'email' ? ` (por correo a ${SUMMIT_CONTACT_EMAIL})` : ' (en el Portal de speakers)'}`).join(' ');
  return [
    `- Qué enviar: ${send}`,
    `- La sesión: ${SPEAKER_SESSION.lines.map((l) => l.es).join(' ')} Estructura: ${SPEAKER_SESSION.parts.map((p) => `${p.min} min ${p.label.es}`).join(', ')}.`,
    `- Lo técnico: ${SPEAKER_TECH.map((l) => l.es).join(' ')}`,
    `- Reglas de tono: ${SPEAKER_RULES.map((l) => l.es).join(' ')}`,
    `- Qué recibe: ${SPEAKER_RECEIVE.map((l) => l.es).join(' ')}`,
  ].join('\n');
}
