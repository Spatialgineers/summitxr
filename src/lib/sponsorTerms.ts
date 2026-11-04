/* SPONSOR TERMS & LOGISTICS ("Términos y logística"): the conditions a sponsor
   needs before paying, so the team can send only the app link.
   One source for the sponsors page (/sponsors#terminos), the welcome portal
   (/bienvenida/sponsor), the sponsor form, the invite email, the Highbot
   knowledge and the offline guide. Pure data: safe to import on the server.

   Source: "SGX-Summit-Dossier-Auspicio-ES-EN" (27 oct 2026), "SGX-Summit-Kit-
   Patrocinio v2026.10.2" and the Documento Maestro (Ground Truth, 27 oct 2026).
   Dates come from summitDeadlines.ts (the team's decisions win over the older
   dates in those documents). Left out on purpose (por confirmar or internal):
   budgets and goals, costs, insurance, the contract template, the postal
   address and anything about partners whose agreement is not signed. */

import { SUMMIT_CONTACT_EMAIL, SUMMIT_DEADLINES as D } from './summitDeadlines';

type Bi = { es: string; en: string };

/** The ATH Móvil Business account name, as the documents give it. */
export const SPONSOR_ATH_NAME = 'SpatialgineersLLC';

/** What to write in the payment comment (brand and package filled in by the sponsor). */
export const SPONSOR_PAYMENT_COMMENT: Bi = {
  es: 'Spatialgineers Summit Auspicio [tu marca] Paquete [1–5]',
  en: 'Spatialgineers Summit Auspicio [your brand] Paquete [1–5]',
};

/** The 365-day license of Packages 4 and 5. */
export const SPONSOR_LICENSE = {
  from: { es: '1 de noviembre de 2026', en: 'November 1, 2026' },
  to: { es: '31 de octubre de 2027', en: 'October 31, 2027' },
};

/** Packages 4 and 5: the final report, 30 days after the last day (December 13). */
export const SPONSOR_REPORT_DAY: Bi = { es: '12 de enero de 2027', en: 'January 12, 2027' };

/** Spatialgineers approves or comments on materials within this many calendar days. */
export const SPONSOR_MATERIALS_REVIEW_DAYS = 4;

/** The URL of the section, for links from emails and other pages. */
export const SPONSOR_TERMS_PATH = '/sponsors#terminos';
export const SPONSOR_TERMS_ANCHOR = 'terminos';

/** The four numbers a sponsor asks first (tiles above the accordion). */
export const SPONSOR_TERMS_FACTS: { k: Bi; v: Bi }[] = [
  { k: { es: D.sponsorPayment.short.es, en: D.sponsorPayment.short.en }, v: { es: 'Pago total', en: 'Full payment' } },
  { k: { es: D.sponsorMaterials.short.es, en: D.sponsorMaterials.short.en }, v: { es: 'Materiales de tu marca', en: 'Your brand materials' } },
  { k: { es: `${SPONSOR_MATERIALS_REVIEW_DAYS} días`, en: `${SPONSOR_MATERIALS_REVIEW_DAYS} days` }, v: { es: 'Aprobación de materiales', en: 'Materials review' } },
  { k: { es: '~12 ene 2027', en: '~Jan 12, 2027' }, v: { es: 'Reporte final · Paquetes 4 y 5', en: 'Final report · Packages 4 and 5' } },
];

export interface SponsorTerm {
  id: string;
  title: Bi;
  /** Short paragraphs or bullet lines, in order. */
  lines: Bi[];
}

export const SPONSOR_TERMS: SponsorTerm[] = [
  {
    id: 'pago',
    title: { es: 'Formas de pago', en: 'How to pay' },
    lines: [
      { es: `Pago total a más tardar el ${D.sponsorPayment.day.es}, después de firmar el contrato corto de auspicio.`, en: `Full payment no later than ${D.sponsorPayment.day.en}, after signing the short sponsorship contract.` },
      { es: `ATH Móvil Business a "${SPONSOR_ATH_NAME}".`, en: `ATH Móvil Business to "${SPONSOR_ATH_NAME}".` },
      { es: 'Cheque.', en: 'Check.' },
      { es: `Transferencia bancaria: la cuenta se brinda a solicitud (${SUMMIT_CONTACT_EMAIL}).`, en: `Bank transfer: the account is provided on request (${SUMMIT_CONTACT_EMAIL}).` },
      { es: `En el comentario del pago escribe: "${SPONSOR_PAYMENT_COMMENT.es}".`, en: `In the payment comment write: "${SPONSOR_PAYMENT_COMMENT.en}".` },
      { es: `Paquetes 4 y 5: pueden pagar en dos plazos si hace falta. Los plazos se coordinan con el equipo y el total queda pagado a más tardar el ${D.sponsorPayment.day.es}.`, en: `Packages 4 and 5: may pay in two installments if needed. Installments are coordinated with the team and the total is paid no later than ${D.sponsorPayment.day.en}.` },
    ],
  },
  {
    id: 'precio',
    title: { es: 'Precio e IVU', en: 'Price and sales tax (IVU)' },
    lines: [
      { es: 'El precio exacto dentro de cada rango se acuerda según el presupuesto del sponsor.', en: "The exact price within each range is agreed based on the sponsor's budget." },
      { es: 'El precio acordado es el que se paga: Spatialgineers no cobra IVU por separado.', en: 'The agreed price is the price you pay: Spatialgineers does not charge IVU (Puerto Rico sales tax) separately.' },
    ],
  },
  {
    id: 'materiales',
    title: { es: 'Materiales de tu marca', en: 'Your brand materials' },
    lines: [
      { es: `Envía tu logo, video o mensaje a ${SUMMIT_CONTACT_EMAIL} a más tardar el ${D.sponsorMaterials.day.es}, en los formatos que te indique el equipo.`, en: `Send your logo, video or message to ${SUMMIT_CONTACT_EMAIL} no later than ${D.sponsorMaterials.day.en}, in the formats the team gives you.` },
      { es: `Spatialgineers aprueba o comenta tus materiales dentro de ${SPONSOR_MATERIALS_REVIEW_DAYS} días calendario después de recibirlos.`, en: `Spatialgineers approves or comments on your materials within ${SPONSOR_MATERIALS_REVIEW_DAYS} calendar days after receiving them.` },
      { es: 'La integración final en la webapp, el ticker y los overlays de la transmisión se hace después de esa entrega.', en: 'The final integration in the web app, the ticker and the broadcast overlays happens after that delivery.' },
    ],
  },
  {
    id: 'categorias',
    title: { es: 'Categorías no permitidas', en: 'Categories not accepted' },
    lines: [
      { es: 'No se aceptan sponsors de política partidista ni de alcohol. No habrá sponsor de alcohol en absoluto.', en: 'We do not accept partisan political or alcohol sponsors. There will be no alcohol sponsor at all.' },
    ],
  },
  {
    id: 'exclusividad',
    title: { es: 'Exclusividad por categoría', en: 'Category exclusivity' },
    lines: [
      { es: 'Solo en los Paquetes 4 y 5: una sola marca de su sector.', en: 'Packages 4 and 5 only: one brand per sector.' },
    ],
  },
  {
    id: 'licencia',
    title: { es: 'Licencia de 365 días (Paquetes 4 y 5)', en: '365-day license (Packages 4 and 5)' },
    lines: [
      { es: `Acceso a la webapp y a sus espacios de promoción y contenido en redes cada vez que se publique algo del Summit, por 365 días: del ${SPONSOR_LICENSE.from.es} al ${SPONSOR_LICENSE.to.es}.`, en: `Access to the web app and its promotion and social content spaces every time something about the Summit is published, for 365 days: from ${SPONSOR_LICENSE.from.en} to ${SPONSOR_LICENSE.to.en}.` },
      { es: 'Es una licencia de acceso: no hay transferencia de código.', en: 'It is an access license: no code is transferred.' },
      { es: 'Paquete 4: derecho de primera renovación para el Summit 2027 en el mismo paquete. La oferta vence 30 días después del Summit 2026.', en: 'Package 4: first right of renewal for the 2027 Summit in the same package. The offer expires 30 days after the 2026 Summit.' },
    ],
  },
  {
    id: 'reporte',
    title: { es: 'Reporte final y cifras', en: 'Final report and numbers' },
    lines: [
      { es: `Paquetes 4 y 5: reporte final alrededor del ${SPONSOR_REPORT_DAY.es} (30 días después del último día del Summit), con vistas, asistencia, clics y participación, sin datos personales.`, en: `Packages 4 and 5: a final report around ${SPONSOR_REPORT_DAY.en} (30 days after the last day of the Summit), with views, attendance, clicks and participation, with no personal data.` },
      { es: 'No se garantizan cifras: Spatialgineers no garantiza un número de vistas, asistentes ni clics. El reporte entrega las cifras reales.', en: 'No numbers are guaranteed: Spatialgineers does not guarantee a number of views, attendees or clicks. The report gives the actual figures.' },
    ],
  },
  {
    id: 'cancelacion',
    title: { es: 'Cancelación y reembolso', en: 'Cancellation and refunds' },
    lines: [
      { es: 'Si Spatialgineers cancela por causas que puede controlar, devuelve lo pagado.', en: 'If Spatialgineers cancels for reasons it can control, it refunds what was paid.' },
      { es: 'Si el evento se afecta por causas fuera de su control, Spatialgineers informa el dinero ya invertido y devuelve el restante según las aportaciones, u ofrece otros beneficios dentro de la plataforma durante el año.', en: 'If the event is affected for reasons beyond its control, Spatialgineers reports the money already invested and returns the remainder according to contributions, or offers other benefits on the platform during the year.' },
    ],
  },
  {
    id: 'fuerza-mayor',
    title: { es: 'Fuerza mayor', en: 'Force majeure' },
    lines: [
      { es: 'Huracanes, cortes de energía o internet y caídas de plataformas de terceros (como YouTube).', en: 'Hurricanes, power or internet outages and outages of third-party platforms (such as YouTube).' },
    ],
  },
  {
    id: 'dia-3',
    title: { es: 'Si el Día 3 no puede hacerse en el venue', en: 'If Day 3 cannot happen at the venue' },
    lines: [
      { es: 'El SGX Showcase no se cancela: si el Día 3 presencial no puede realizarse en el venue, se pospone o se hace virtual. Los Días 1 y 2 digitales siguen.', en: 'The SGX Showcase is not cancelled: if the in-person Day 3 cannot take place at the venue, it is postponed or held virtually. The digital Days 1 and 2 go on.' },
    ],
  },
  {
    id: 'contrato',
    title: { es: 'El contrato manda', en: 'The contract governs' },
    lines: [
      { es: 'Esta página y el dossier de auspicio no son una oferta vinculante. Rige el contrato corto de auspicio firmado por ambas partes.', en: 'This page and the sponsorship dossier are not a binding offer. The short sponsorship contract signed by both parties governs.' },
      { es: 'Si el español y el inglés no coinciden, rige el español.', en: 'If the Spanish and English texts differ, the Spanish text governs.' },
    ],
  },
];

/** One short paragraph for invites and closing notes. */
export const SPONSOR_TERMS_SUMMARY: Bi = {
  es: `Pago total a más tardar el ${D.sponsorPayment.day.es} por ATH Móvil Business, cheque o transferencia (cuenta a solicitud); materiales a más tardar el ${D.sponsorMaterials.day.es}. IVU, cancelación, licencia de los Paquetes 4 y 5 y más: en "Términos y logística".`,
  en: `Full payment no later than ${D.sponsorPayment.day.en} by ATH Móvil Business, check or transfer (account on request); materials no later than ${D.sponsorMaterials.day.en}. Sales tax, cancellation, the Package 4 and 5 license and more: in "Terms and logistics".`,
};

/** The terms as prompt text (Spanish), for the Highbot. */
export function sponsorTermsPrompt(): string {
  return SPONSOR_TERMS.map((t) => `- ${t.title.es}: ${t.lines.map((l) => l.es).join(' ')}`).join('\n');
}
