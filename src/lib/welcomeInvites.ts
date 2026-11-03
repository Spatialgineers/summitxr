/* Personal invites for the welcome portal. The admin fills a few fields (or
   takes them from an agenda session) and gets a short message per role plus a
   personal link: /bienvenida/<rol>?n=<nombre>&s=<sesión> (or d, h, t, p when
   there is no session; k = paquete for sponsors). The role page greets the
   person with those values as plain text. The links carry no secrets and the
   server marks them noindex; the canonical stays the clean role URL.

   EDIT THE MESSAGES HERE: one template per role. {placeholders} are swapped
   in; a line that starts with "?" is optional and is dropped when all its
   placeholders are empty. Keep them short
   (3–5 lines), warm and in Spanish. */

import type { SummitSession } from '../types/summit';
import { SGX_PILLARS, findPillar } from './sgxPillars';
import { welcomeUrlFor, type WelcomeRole } from './welcomePortal';
import { SGX_EMAIL, SGX_INSTAGRAM, SGX_YOUTUBE } from './sgxLinks';

export const INVITE_TEMPLATES: Record<WelcomeRole, { subject: string; lines: string[] }> = {
  speaker: {
    subject: 'Tu sesión en el Spatialgineers Summit 2026',
    lines: [
      'Hola {nombre}, te esperamos en el Spatialgineers Summit 2026.',
      '?Tu sesión: «{titulo}» · {pilar} · {dia}, {hora}.',
      'Aquí tienes tu video guía y los pasos para dejar tu perfil listo: {link}',
    ],
  },
  sponsor: {
    subject: 'Tu marca en el Spatialgineers Summit 2026',
    lines: [
      'Hola {nombre}, gracias por sumar tu marca al Spatialgineers Summit 2026 (11–13 dic).',
      '?Tu nivel: {paquete}.',
      'Fechas clave: pago total a más tardar el 14 de noviembre y materiales hasta el 30 de noviembre.',
      'Tu video guía y los pasos, aquí: {link}',
    ],
  },
  prensa: {
    subject: 'Acreditación de prensa · Spatialgineers Summit 2026',
    lines: [
      'Hola {nombre}, te invitamos a cubrir el Spatialgineers Summit 2026 (11–13 dic).',
      'La acreditación de prensa cubre los 3 días: YouTube Live los Días 1 y 2 y el Día 3 en Chroma Space Studios.',
      'Solicítala antes del 1 de diciembre (6 cupos, uno por medio). Tu video guía, los pasos y el kit de prensa: {link}',
    ],
  },
  visitante: {
    subject: 'Te esperamos en el Spatialgineers Summit 2026',
    lines: [
      'Hola {nombre}, te esperamos en el Spatialgineers Summit 2026: 11–13 de diciembre.',
      'Días 1 y 2 gratis por YouTube Live; el Día 3 en Chroma Space Studios, por invitación.',
      'Mira tu video guía y forja tu SGX Pass gratis aquí: {link}',
    ],
  },
  equipo: {
    subject: 'Equipo · Spatialgineers Summit 2026',
    lines: [
      'Hola {nombre}, bienvenido al equipo del Spatialgineers Summit 2026.',
      '?Tu bloque: «{titulo}» · {dia}, {hora}.',
      'Tu video guía y los accesos del equipo: {link}',
    ],
  },
};

export const DAY_LABEL: Record<1 | 2 | 3, string> = {
  1: 'Día 1 · vie 11 dic',
  2: 'Día 2 · sáb 12 dic',
  3: 'Día 3 · dom 13 dic',
};

export interface InviteFields {
  nombre?: string;
  sessionId?: string;
  dia?: 1 | 2 | 3;
  hora?: string;
  titulo?: string;
  /** Pillar slug (story, showcase, spark, stage, system, synthesize). */
  pilar?: string;
  /** Sponsor package 1–5. */
  paquete?: number;
}

const LIMITS = { n: 60, h: 20, t: 120 };
/** Plain text only: no control characters or angle brackets, trimmed and capped. */
const clean = (v: string | null | undefined, max: number) =>
  (v || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);

export const pillarName = (slug?: string) => (slug ? findPillar(slug)?.name : undefined);
export const PILLAR_OPTIONS = SGX_PILLARS.map((p) => ({ slug: p.slug, name: p.name }));

/** Fields read from a personal link's query string (every one optional and capped). */
export function parseInvite(search: string): InviteFields | null {
  const sp = new URLSearchParams(search);
  const out: InviteFields = {};
  const n = clean(sp.get('n'), LIMITS.n); if (n) out.nombre = n;
  const s = clean(sp.get('s'), 64); if (/^[A-Za-z0-9_-]+$/.test(s)) out.sessionId = s;
  const d = Number(sp.get('d')); if (d === 1 || d === 2 || d === 3) out.dia = d;
  const h = clean(sp.get('h'), LIMITS.h); if (h) out.hora = h;
  const t = clean(sp.get('t'), LIMITS.t); if (t) out.titulo = t;
  const p = findPillar(clean(sp.get('p'), 20)); if (p) out.pilar = p.slug;
  const k = Number(sp.get('k')); if (Number.isInteger(k) && k >= 1 && k <= 5) out.paquete = k;
  return Object.keys(out).length ? out : null;
}

/** The session's day, time, title and pillar override the explicit fields when it is found. */
export function fromSession(fields: InviteFields, sessions: SummitSession[]): InviteFields {
  const s = fields.sessionId ? sessions.find((x) => x.id === fields.sessionId) : undefined;
  if (!s) return fields;
  return { ...fields, dia: s.day, hora: s.startTime, titulo: s.title, pilar: findPillar(s.pillarId)?.slug || fields.pilar };
}

/** /bienvenida/<rol>?n=…&s=… (explicit d, h, t, p only when there is no session id). */
export function inviteLink(role: WelcomeRole, f: InviteFields): string {
  const sp = new URLSearchParams();
  const n = clean(f.nombre, LIMITS.n); if (n) sp.set('n', n);
  if (f.sessionId) sp.set('s', f.sessionId);
  else {
    if (f.dia) sp.set('d', String(f.dia));
    const h = clean(f.hora, LIMITS.h); if (h) sp.set('h', h);
    const t = clean(f.titulo, LIMITS.t); if (t) sp.set('t', t);
    if (f.pilar) sp.set('p', f.pilar);
  }
  if (role === 'sponsor' && f.paquete) sp.set('k', String(f.paquete));
  const q = sp.toString();
  return `${welcomeUrlFor(role)}${q ? `?${q}` : ''}`;
}

/** The message for a role with the fields swapped in. */
export function inviteMessage(role: WelcomeRole, f: InviteFields): { subject: string; text: string; link: string } {
  const link = inviteLink(role, f);
  const values: Record<string, string> = {
    nombre: clean(f.nombre, LIMITS.n),
    titulo: clean(f.titulo, LIMITS.t),
    pilar: pillarName(f.pilar) || '',
    dia: f.dia ? DAY_LABEL[f.dia] : '',
    hora: clean(f.hora, LIMITS.h),
    paquete: f.paquete ? `Paquete ${f.paquete}` : '',
    link,
  };
  const lines = INVITE_TEMPLATES[role].lines.map((raw) => {
    const optional = raw.startsWith('?');
    const line = optional ? raw.slice(1) : raw;
    const keys = [...line.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
    if (optional && keys.every((k) => !values[k])) return null;
    let out = line.replace(/\{(\w+)\}/g, (_, k) => values[k] || '');
    // tidy what an empty field leaves behind ("Hola , te…", "« » · ", trailing separators)
    out = out.replace(/Hola ,/, 'Hola,').replace(/«»\s*·?\s*/g, '').replace(/(\s·\s)+(?=[,.]|$)/g, '').replace(/,\s*\./g, '.').replace(/\s·\s,/g, ',').replace(/:\s*·\s*/g, ': ').replace(/\s{2,}/g, ' ');
    return out.trim();
  }).filter(Boolean) as string[];
  return { subject: INVITE_TEMPLATES[role].subject, text: lines.join('\n'), link };
}

/* ---------- HTML email (Gmail / Outlook / Apple Mail safe) ----------
   Tables, inline styles, no scripts, no external CSS, 600px wide.
   EDIT THE COPY HERE: one intro line and three short next steps per role. */

export const INVITE_EMAILS: Record<WelcomeRole, { preheader: string; intro: string; steps: [string, string, string] }> = {
  speaker: {
    preheader: 'Tu video guía y los pasos para dejar tu perfil listo.',
    intro: 'Te esperamos en el Spatialgineers Summit 2026, del 11 al 13 de diciembre. Aquí tienes tu video guía y lo que te toca antes del evento.',
    steps: [
      'Registra tu perfil en el Portal de speakers: rol, organización, biografía y enlaces.',
      'Arma tu avatar SGX: con él se crea tu Holo Card de speaker.',
      'El equipo confirma tu participación por escrito y publica tu perfil en el cartel.',
    ],
  },
  sponsor: {
    preheader: 'Fechas clave: pago total 14 nov · materiales 30 nov.',
    intro: 'Gracias por sumar tu marca al Spatialgineers Summit 2026 (11–13 dic): la webapp, la transmisión por YouTube Live y el Día 3 en Chroma Space Studios.',
    steps: [
      'Elige tu paquete y envía la solicitud desde Patrocina el Summit.',
      'Pago total a más tardar el 14 de noviembre.',
      'Materiales de tu marca hasta el 30 de noviembre.',
    ],
  },
  prensa: {
    preheader: 'Acreditación antes del 1 de diciembre · 6 cupos, uno por medio.',
    intro: 'Te invitamos a cubrir el Spatialgineers Summit 2026 (11–13 dic). La acreditación de prensa incluye los 3 días: la transmisión por YouTube Live los Días 1 y 2, y la entrada al Día 3 en Chroma Space Studios, San Juan.',
    steps: [
      'Forja tu SGX Pass gratis y solicita tu acreditación en la Sala de prensa antes del 1 de diciembre.',
      'Hay 6 cupos, uno por medio. Si te aprueban, tu Holo Card dice PRENSA y tu pase queda invitado al Día 3.',
      'Descarga el kit de prensa: logos, fotos de los fundadores, capturas de la webapp y la ficha en PDF.',
    ],
  },
  visitante: {
    preheader: 'Forja tu SGX Pass gratis y mira tu video guía.',
    intro: 'Te esperamos en el Spatialgineers Summit 2026: Días 1 y 2 gratis por YouTube Live (11 y 12 dic) y el Día 3 en Chroma Space Studios, por invitación.',
    steps: [
      'Forja tu SGX Pass gratis en un minuto.',
      'Arma tu agenda de los tres días y juega para ganar XP.',
      'El 11 y 12 de diciembre, míralo en vivo por YouTube Live.',
    ],
  },
  equipo: {
    preheader: 'Tu video guía y los accesos del equipo.',
    intro: 'Bienvenido al equipo del Spatialgineers Summit 2026. Lo que usamos durante el evento vive en el admin.',
    steps: [
      'Entra al admin con tu cuenta autorizada.',
      'Revisa Inscritos y Día 3: registros y código de check-in.',
      'Durante el Summit: Consola del director y Anuncios.',
    ],
  },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** The personalized HTML email for a role (every field escaped). */
export function inviteEmailHtml(role: WelcomeRole, f: InviteFields, videoId?: string | null): string {
  const { subject, link } = inviteMessage(role, f);
  const copy = INVITE_EMAILS[role];
  const nombre = clean(f.nombre, LIMITS.n);
  const titulo = clean(f.titulo, LIMITS.t);
  const session = [titulo ? `«${titulo}»` : '', pillarName(f.pilar) || '', f.dia ? DAY_LABEL[f.dia] : '', clean(f.hora, LIMITS.h)].filter(Boolean);
  const vid = videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId) ? videoId : null;
  const font = 'font-family:Arial,Helvetica,sans-serif;';
  const mono = "font-family:'Courier New',Courier,monospace;";
  const kicker = `margin:0 0 6px;${mono}font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#00DDFF;`;
  const media = vid
    ? `<a href="${esc(link)}" style="text-decoration:none;"><img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" width="536" alt="Ver tu video guía" style="display:block;width:100%;max-width:536px;height:auto;border:1px solid #00DDFF;" /></a>
          <p style="margin:8px 0 0;${mono}font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#00DDFF;">&#9654; Ver tu video guía</p>`
    : `<a href="${esc(link)}" style="text-decoration:none;"><img src="https://summit.spatialgineers.com/holo/sgxLogo.png" width="96" alt="Spatialgineers Summit 2026" style="display:block;margin:0 auto;width:96px;height:auto;border:0;" /></a>`;
  const sessionCard = (role === 'speaker' || role === 'equipo') && session.length ? `
      <tr><td style="padding:0 32px 24px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111111;border-left:3px solid #00DDFF;">
          <tr><td style="padding:14px 16px;">
            <p style="${kicker}">${role === 'speaker' ? 'Tu sesión' : 'Tu bloque'}</p>
            <p style="margin:0;${font}font-size:16px;line-height:1.45;color:#FFFFFF;">${session.map(esc).join(' &middot; ')}</p>
          </td></tr>
        </table>
      </td></tr>` : '';
  const paquete = role === 'sponsor' && f.paquete ? `
      <tr><td style="padding:0 32px 24px;">
        <p style="${kicker}">Tu nivel</p>
        <p style="margin:0;${font}font-size:16px;color:#FFFFFF;">Paquete ${esc(String(f.paquete))}</p>
      </td></tr>` : '';
  const steps = copy.steps.map((s, i) => `
          <tr>
            <td width="36" valign="top" style="padding:0 0 12px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="26" height="26" align="center" bgcolor="#FDCC0D" style="background:#FDCC0D;${font}font-size:14px;font-weight:bold;color:#050505;">${i + 1}</td></tr></table></td>
            <td valign="top" style="padding:3px 0 12px;${font}font-size:15px;line-height:1.5;color:#DDDDDD;">${esc(s)}</td>
          </tr>`).join('');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#050505;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#050505;">${esc(copy.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#050505" style="background:#050505;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#0B0B0B" style="width:100%;max-width:600px;background:#0B0B0B;border:1px solid #3A3000;">
      <tr><td height="3" bgcolor="#FDCC0D" style="height:3px;background:#FDCC0D;font-size:0;line-height:0;">&nbsp;</td></tr>
      <tr><td style="padding:28px 32px 8px;">
        <p style="margin:0;${mono}font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FDCC0D;">Spatialgineers Summit 2026 &middot; 11&ndash;13 dic</p>
        <h1 style="margin:14px 0 0;${font}font-size:26px;line-height:1.2;text-transform:uppercase;color:#FFFFFF;">${nombre ? `Hola ${esc(nombre)}` : 'Hola'}</h1>
      </td></tr>
      <tr><td style="padding:8px 32px 24px;${font}font-size:16px;line-height:1.55;color:#DDDDDD;">${esc(copy.intro)}</td></tr>${sessionCard}${paquete}
      <tr><td align="center" style="padding:0 32px 24px;">
        ${media}
      </td></tr>
      <tr><td align="center" style="padding:0 32px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td align="center" bgcolor="#FDCC0D" style="background:#FDCC0D;">
            <a href="${esc(link)}" style="display:inline-block;padding:14px 28px;${font}font-size:15px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#050505;text-decoration:none;">Abrir mi portal</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 32px 12px;">
        <p style="${kicker}margin-bottom:12px;">Tus próximos pasos</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${steps}
        </table>
      </td></tr>
      <tr><td style="padding:16px 32px 28px;border-top:1px solid #222222;${font}font-size:13px;line-height:1.6;color:#999999;">
        <a href="mailto:${esc(SGX_EMAIL)}" style="color:#FDCC0D;text-decoration:none;">${esc(SGX_EMAIL)}</a>
        &nbsp;&middot;&nbsp;<a href="${esc(SGX_INSTAGRAM)}" style="color:#FDCC0D;text-decoration:none;">Instagram</a>
        &nbsp;&middot;&nbsp;<a href="${esc(SGX_YOUTUBE)}" style="color:#FDCC0D;text-decoration:none;">YouTube</a><br />
        &copy; 2026 Spatialgineers LLC
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
