/* FECHAS LÍMITE del Spatialgineers Summit 2026: the one source of truth.
   Every form that closes by itself, every page that shows a deadline, the
   welcome portal, the Highbot knowledge, the offline guide, the invite
   emails and the press kit read the dates from here.

   All dates are Puerto Rico time (UTC-4, no daylight saving). A deadline
   "hasta el X" / "a más tardar el X" means open through the end of day X,
   so `closesAt` is the first instant of the next day.

   Testing only: when localStorage `sgx_now` holds a number (ms since epoch),
   the client helpers use it as "now". Harmless in production (nobody sets it). */

type Bi = { es: string; en: string };

export type DeadlineKey =
  | 'speakerProfiles'
  | 'sponsorApplications'
  | 'sponsorPayment'
  | 'sponsorMaterials'
  | 'day3Invitations'
  | 'day3Requests'
  | 'pressAccreditation';

export interface SummitDeadline {
  /** First instant when it is closed (Puerto Rico time). */
  closesAt: string;
  /** The last day it is open, long form ("21 de noviembre de 2026"). */
  label: Bi;
  /** Short form for tiles and step labels ("21 nov"). */
  short: Bi;
  /** Long form without the year ("21 de noviembre"). */
  day: Bi;
}

export const SUMMIT_DEADLINES: Record<DeadlineKey, SummitDeadline> = {
  /** Speaker and artist profiles: through November 21. */
  speakerProfiles: {
    closesAt: '2026-11-22T00:00:00-04:00',
    label: { es: '21 de noviembre de 2026', en: 'November 21, 2026' },
    short: { es: '21 nov', en: 'Nov 21' },
    day: { es: '21 de noviembre', en: 'November 21' },
  },
  /** Sponsor applications: through November 28. */
  sponsorApplications: {
    closesAt: '2026-11-29T00:00:00-04:00',
    label: { es: '28 de noviembre de 2026', en: 'November 28, 2026' },
    short: { es: '28 nov', en: 'Nov 28' },
    day: { es: '28 de noviembre', en: 'November 28' },
  },
  /** Sponsor full payment: no later than November 30. */
  sponsorPayment: {
    closesAt: '2026-12-01T00:00:00-04:00',
    label: { es: '30 de noviembre de 2026', en: 'November 30, 2026' },
    short: { es: '30 nov', en: 'Nov 30' },
    day: { es: '30 de noviembre', en: 'November 30' },
  },
  /** Sponsor brand materials: no later than November 30. */
  sponsorMaterials: {
    closesAt: '2026-12-01T00:00:00-04:00',
    label: { es: '30 de noviembre de 2026', en: 'November 30, 2026' },
    short: { es: '30 nov', en: 'Nov 30' },
    day: { es: '30 de noviembre', en: 'November 30' },
  },
  /** The team sends the Day 3 invitations no later than December 5. */
  day3Invitations: {
    closesAt: '2026-12-06T00:00:00-04:00',
    label: { es: '5 de diciembre de 2026', en: 'December 5, 2026' },
    short: { es: '5 dic', en: 'Dec 5' },
    day: { es: '5 de diciembre', en: 'December 5' },
  },
  /** Day 3 (in person, by invitation): visitors request it through December 1. */
  day3Requests: {
    closesAt: '2026-12-02T00:00:00-04:00',
    label: { es: '1 de diciembre de 2026', en: 'December 1, 2026' },
    short: { es: '1 dic', en: 'Dec 1' },
    day: { es: '1 de diciembre', en: 'December 1' },
  },
  /** Press accreditation: requests before December 1 (closes at the start of December 1). */
  pressAccreditation: {
    closesAt: '2026-12-01T00:00:00-04:00',
    label: { es: '1 de diciembre de 2026', en: 'December 1, 2026' },
    short: { es: '1 dic', en: 'Dec 1' },
    day: { es: '1 de diciembre', en: 'December 1' },
  },
};

/** The instant (ms) a deadline closes. */
export const deadlineMs = (key: DeadlineKey) => Date.parse(SUMMIT_DEADLINES[key].closesAt);

/** "Now" for the deadline checks: Date.now(), or localStorage `sgx_now` (ms) when a test sets it. */
export function summitNow(): number {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem('sgx_now');
      const n = raw ? Number(raw) : NaN;
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch { /* storage blocked: use the real clock */ }
  return Date.now();
}

export const isClosed = (key: DeadlineKey, now: number = summitNow()) => now >= deadlineMs(key);
export const isOpen = (key: DeadlineKey, now: number = summitNow()) => !isClosed(key, now);

type Lang = 'es' | 'en' | boolean;
const isEs = (l: Lang) => l === true || l === 'es';

/** "21 de noviembre de 2026" / "November 21, 2026". */
export const deadlineLabel = (key: DeadlineKey, lang: Lang = 'es') => (isEs(lang) ? SUMMIT_DEADLINES[key].label.es : SUMMIT_DEADLINES[key].label.en);
/** "21 nov" / "Nov 21". */
export const deadlineShort = (key: DeadlineKey, lang: Lang = 'es') => (isEs(lang) ? SUMMIT_DEADLINES[key].short.es : SUMMIT_DEADLINES[key].short.en);
/** "21 de noviembre" / "November 21". */
export const deadlineDay = (key: DeadlineKey, lang: Lang = 'es') => (isEs(lang) ? SUMMIT_DEADLINES[key].day.es : SUMMIT_DEADLINES[key].day.en);

export const SUMMIT_CONTACT_EMAIL = 'info@spatialgineers.com';

/* ---------- sentences said the same way everywhere ---------- */

const D = SUMMIT_DEADLINES;

export const DEADLINE_COPY = {
  speakerProfiles: {
    es: `Los perfiles de speakers y artistas se reciben hasta el ${D.speakerProfiles.day.es}.`,
    en: `Speaker and artist profiles are accepted through ${D.speakerProfiles.day.en}.`,
  },
  speakerClosed: {
    es: `El portal de speakers cerró el ${D.speakerProfiles.day.es}. Escríbenos a ${SUMMIT_CONTACT_EMAIL}`,
    en: `The speaker portal closed on ${D.speakerProfiles.day.en}. Write to us at ${SUMMIT_CONTACT_EMAIL}`,
  },
  sponsorApplications: {
    es: `Solicitudes de auspicio hasta el ${D.sponsorApplications.day.es}.`,
    en: `Sponsorship applications through ${D.sponsorApplications.day.en}.`,
  },
  sponsorClosed: {
    es: `Las solicitudes de auspicio cerraron el ${D.sponsorApplications.day.es}. Escríbenos a ${SUMMIT_CONTACT_EMAIL}`,
    en: `Sponsorship applications closed on ${D.sponsorApplications.day.en}. Write to us at ${SUMMIT_CONTACT_EMAIL}`,
  },
  sponsorPaymentMaterials: {
    es: `Pago total y materiales de tu marca a más tardar el ${D.sponsorPayment.day.es}.`,
    en: `Full payment and your brand materials no later than ${D.sponsorPayment.day.en}.`,
  },
  sponsorKeyDates: {
    es: `Solicitudes hasta el ${D.sponsorApplications.day.es}; pago total y materiales de la marca a más tardar el ${D.sponsorPayment.day.es}.`,
    en: `Applications through ${D.sponsorApplications.day.en}; full payment and brand materials no later than ${D.sponsorPayment.day.en}.`,
  },
  day3Requests: {
    es: `Las solicitudes para el Día 3 se reciben hasta el ${D.day3Requests.day.es}.`,
    en: `Day 3 requests are accepted through ${D.day3Requests.day.en}.`,
  },
  day3Invitations: {
    es: `El equipo envía las invitaciones al Día 3 a más tardar el ${D.day3Invitations.day.es}.`,
    en: `The team sends Day 3 invitations no later than ${D.day3Invitations.day.en}.`,
  },
} satisfies Record<string, Bi>;
