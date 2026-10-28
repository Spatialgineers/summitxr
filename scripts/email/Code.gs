/**
 * Spatialgineers Summit 2026 · SGX mailer (Google Apps Script, runs as info@spatialgineers.com)
 *
 * Every minute it reads Firestore and sends, once per person:
 *   - confirm  : "Tu SGX Pass está forjado"        → every new registration (ticket_inquiries)
 *   - invite   : "Estás invitado al Día 3"         → registrations the team marks INVITED in the admin
 *   - holo     : "Tu Holo Card está lista"         → speakers / sponsors approved in the admin (credential_grants)
 *   - remind1  : "Mañana empieza el Summit"        → everyone, on REMIND_DAY1_AT
 *   - remind3  : "Mañana nos vemos en Chroma"      → Day 3 guests, on REMIND_DAY3_AT
 *
 * Each send is recorded in mail_log/{kind}_{id} (the admin shows ✉ badges from it), so nothing is
 * sent twice. It uses info@'s own Google access to the Firebase project: no passwords, no keys.
 * Setup: docs/EMAIL_SETUP.md. Run setup() once.
 */

const CONFIG = {
  PROJECT_ID: 'gen-lang-client-0564995587',
  DATABASE_ID: 'ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac',
  API: 'https://firestore.googleapis.com',
  SITE: 'https://summit.spatialgineers.com',
  FROM_NAME: 'Spatialgineers Summit',
  REPLY_TO: 'info@spatialgineers.com',
  LOGO: 'https://cdn.spatialgineers.com/Branding/Summit/Spat%20Summit%20Icon%20Logo%20BY.png',
  YOUTUBE: 'https://www.youtube.com/@spatialgineers',
  REMIND_DAY1_AT: '2026-12-10T10:00:00-04:00',
  REMIND_DAY1_UNTIL: '2026-12-11T10:00:00-04:00',
  REMIND_DAY3_AT: '2026-12-12T10:00:00-04:00',
  REMIND_DAY3_UNTIL: '2026-12-13T10:00:00-04:00',
  MAX_PER_RUN: 40,      // emails per minute at most
  QUOTA_RESERVE: 25,    // keep this many of the daily Gmail quota for the team
  TEST_TO: '',          // while testing: every email goes here instead of to the person
};

/* ======================= entry points ======================= */

/** Run once: installs the every-minute trigger and starts from now (older registrations are not emailed). */
function setup() {
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === 'processQueue').forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('processQueue').timeBased().everyMinutes(1).create();
  const p = PropertiesService.getScriptProperties();
  const now = new Date().toISOString();
  ['CURSOR_CONFIRM', 'CURSOR_INVITE', 'CURSOR_HOLO'].forEach((k) => { if (!p.getProperty(k)) p.setProperty(k, now); });
  fsFetch_(fsBase_() + '/ticket_inquiries?pageSize=1'); // proves Firestore access now, not at the first trigger
  Logger.log('Listo: el mailer revisa Firestore cada minuto. Cuota de hoy: ' + MailApp.getRemainingDailyQuota());
}

/** The trigger. Safe to run by hand. */
function processQueue() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;
  const budget = { left: CONFIG.MAX_PER_RUN };
  try {
    sendConfirmations_(budget);
    sendInvites_(budget);
    sendHoloCards_(budget);
    sendReminders_(budget, 'remind1', CONFIG.REMIND_DAY1_AT, CONFIG.REMIND_DAY1_UNTIL);
    sendReminders_(budget, 'remind3', CONFIG.REMIND_DAY3_AT, CONFIG.REMIND_DAY3_UNTIL);
  } catch (e) {
    if (!(e && e.quotaStop)) throw e;
    Logger.log('Pausa: ' + e.message);
  } finally {
    lock.releaseLock();
  }
}

/** Sends one sample of every email to you (the account running the script). Nothing is logged. */
function testAll() {
  const me = Session.getActiveUser().getEmail();
  const reg = { id: 'SGX-DEMO', fullName: 'Nova Rivera', email: me, referenceCode: 'SGX-DEMO', ticketType: 'SHOWCASE_PHYSICAL' };
  ['confirm', 'invite', 'remind1', 'remind3'].forEach((k) => deliver_(me, TEMPLATES[k](reg)));
  deliver_(me, TEMPLATES.holo({ name: 'Nova Rivera' }, 'speaker'));
  Logger.log('5 correos de prueba enviados a ' + me);
}

/** Quick health check in the log: quota, cursors and how many emails were sent. */
function status() {
  const p = PropertiesService.getScriptProperties().getProperties();
  Logger.log('Cuota restante hoy: ' + MailApp.getRemainingDailyQuota());
  Logger.log('Cursores: ' + JSON.stringify(p));
  Logger.log('Disparadores: ' + ScriptApp.getProjectTriggers().map((t) => t.getHandlerFunction()).join(', '));
}

/** Pauses every send (removes the trigger). setup() turns it back on. */
function stop() {
  ScriptApp.getProjectTriggers().forEach((t) => ScriptApp.deleteTrigger(t));
  Logger.log('Mailer detenido.');
}

/* ======================= senders ======================= */

function sendConfirmations_(budget) {
  forEachSince_('ticket_inquiries', 'timestamp', 'CURSOR_CONFIRM', (id, reg) => {
    if (!isEmail_(reg.email)) return true;
    return sendOnce_(budget, 'confirm_' + id, reg.email, TEMPLATES.confirm(Object.assign({ id: id }, reg)));
  });
}

function sendInvites_(budget) {
  forEachSince_('ticket_inquiries', 'invitedAt', 'CURSOR_INVITE', (id, reg) => {
    if (!isEmail_(reg.email) || (reg.status !== 'INVITED' && reg.status !== 'CONFIRMED')) return true;
    return sendOnce_(budget, 'invite_' + id, reg.email, TEMPLATES.invite(Object.assign({ id: id }, reg)));
  });
}

function sendHoloCards_(budget) {
  forEachSince_('credential_grants', 'updatedAt', 'CURSOR_HOLO', (uid, grant) => {
    let ok = true;
    ['speaker', 'sponsor'].forEach((role) => {
      if (!ok || !grant[role]) return;
      const logId = 'holo_' + role + '_' + uid;
      if (logExists_(logId)) return;
      const player = fsFetch_(fsBase_() + '/players/' + encodeURIComponent(uid));
      const email = player && decodeFields_(player.fields).email;
      if (!isEmail_(email)) return; // no email on file: nothing to send
      ok = sendOnce_(budget, logId, email, TEMPLATES.holo(grant[role], role));
    });
    return ok;
  });
}

/** One reminder for everybody (remind1) or for Day 3 guests (remind3) inside its window, page by page. */
function sendReminders_(budget, kind, fromIso, untilIso) {
  const now = Date.now();
  if (now < Date.parse(fromIso) || now > Date.parse(untilIso)) return;
  const p = PropertiesService.getScriptProperties();
  if (p.getProperty('DONE_' + kind)) return;
  let token = p.getProperty('PAGE_' + kind) || '';
  for (;;) {
    const page = fsFetch_(fsBase_() + '/ticket_inquiries?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : ''));
    const docs = (page && page.documents) || [];
    for (let i = 0; i < docs.length; i++) {
      const id = docs[i].name.split('/').pop();
      const reg = decodeFields_(docs[i].fields);
      if (!isEmail_(reg.email) || reg.status === 'DECLINED') continue;
      if (kind === 'remind3' && reg.status !== 'INVITED' && reg.status !== 'CONFIRMED') continue;
      if (!sendOnce_(budget, kind + '_' + id, reg.email, TEMPLATES[kind](Object.assign({ id: id }, reg)))) return; // out of budget: same page next minute
    }
    token = (page && page.nextPageToken) || '';
    if (!token) { p.setProperty('DONE_' + kind, new Date().toISOString()); p.deleteProperty('PAGE_' + kind); return; }
    p.setProperty('PAGE_' + kind, token);
  }
}

/* ======================= plumbing ======================= */

/**
 * Walks docs with field >= cursor (oldest first). fn returns false when the budget ran out:
 * the cursor then stays on that doc and the next run continues from it.
 */
function forEachSince_(collection, field, cursorKey, fn) {
  const p = PropertiesService.getScriptProperties();
  const since = p.getProperty(cursorKey) || new Date().toISOString();
  const rows = fsFetch_(fsBase_() + ':runQuery', {
    method: 'post',
    body: { structuredQuery: {
      from: [{ collectionId: collection }],
      where: { fieldFilter: { field: { fieldPath: field }, op: 'GREATER_THAN_OR_EQUAL', value: { timestampValue: since } } },
      orderBy: [{ field: { fieldPath: field }, direction: 'ASCENDING' }],
      limit: 50,
    } },
  }) || [];
  let cursor = since;
  for (let i = 0; i < rows.length; i++) {
    const d = rows[i].document;
    if (!d) continue;
    const data = decodeFields_(d.fields);
    if (fn(d.name.split('/').pop(), data) === false) break;
    if (data[field]) cursor = data[field];
  }
  if (cursor !== since) p.setProperty(cursorKey, cursor);
}

/** Sends once per log id. Returns false when this run's budget or the daily quota is used up. */
function sendOnce_(budget, logId, to, mail) {
  if (logExists_(logId)) return true;
  if (budget.left <= 0) return false;
  if (MailApp.getRemainingDailyQuota() <= CONFIG.QUOTA_RESERVE) {
    const e = new Error('cuota diaria de Gmail casi agotada; sigo mañana'); e.quotaStop = true; throw e;
  }
  deliver_(to, mail);
  budget.left--;
  fsFetch_(fsBase_() + '/mail_log?documentId=' + encodeURIComponent(logId), {
    method: 'post',
    body: { fields: {
      kind: { stringValue: logId.split('_')[0] },
      to: { stringValue: to },
      subject: { stringValue: mail.subject },
      sentAt: { timestampValue: new Date().toISOString() },
    } },
  });
  return true;
}

function deliver_(to, mail) {
  MailApp.sendEmail({
    to: CONFIG.TEST_TO || to,
    subject: mail.subject,
    body: mail.text,
    htmlBody: mail.html,
    name: CONFIG.FROM_NAME,
    replyTo: CONFIG.REPLY_TO,
  });
}

function logExists_(logId) {
  return fsFetch_(fsBase_() + '/mail_log/' + encodeURIComponent(logId)) !== null;
}

function fsBase_() {
  return CONFIG.API + '/v1/projects/' + CONFIG.PROJECT_ID + '/databases/' + CONFIG.DATABASE_ID + '/documents';
}

function fsFetch_(url, opt) {
  opt = opt || {};
  const params = {
    method: opt.method || 'get',
    headers: {
      Authorization: 'Bearer ' + ScriptApp.getOAuthToken(),
      // Bill the API to the Firebase project (the script's own hidden project has Firestore off).
      'x-goog-user-project': CONFIG.PROJECT_ID,
    },
    muteHttpExceptions: true,
  };
  if (opt.body) { params.contentType = 'application/json'; params.payload = JSON.stringify(opt.body); }
  const res = UrlFetchApp.fetch(url, params);
  const code = res.getResponseCode();
  if (code === 404) return null;
  if (code >= 300) throw new Error('Firestore ' + code + ': ' + res.getContentText().slice(0, 400));
  const txt = res.getContentText();
  return txt ? JSON.parse(txt) : {};
}

function decodeFields_(fields) {
  const out = {};
  Object.keys(fields || {}).forEach((k) => { out[k] = decodeValue_(fields[k]); });
  return out;
}

function decodeValue_(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) return decodeFields_(v.mapValue.fields);
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(decodeValue_);
  return null;
}

function isEmail_(e) {
  return typeof e === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e.trim());
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function firstName_(full) {
  return String(full || '').trim().split(/\s+/)[0] || 'piloto';
}

/* ======================= templates ======================= */

const DAY3_CAL = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  + '&text=' + encodeURIComponent('Spatialgineers Summit 2026 · Día 3 · SGX Showcase')
  + '&dates=20261213T140000Z/20261213T200000Z'
  + '&location=' + encodeURIComponent('Chroma Space Studios, San Juan, Puerto Rico')
  + '&details=' + encodeURIComponent('Tu entrada es el QR de tu SGX Pass: summit.spatialgineers.com/?hangar=day3');

const DAY1_CAL = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
  + '&text=' + encodeURIComponent('Spatialgineers Summit 2026 · Día 1 (YouTube Live)')
  + '&dates=20261211T140000Z/20261211T200000Z'
  + '&details=' + encodeURIComponent('En vivo y gratis: ' + CONFIG.YOUTUBE + '\nTu agenda: ' + CONFIG.SITE + '/?section=agenda');

/** Shared dark SGX layout. Table-based with inline styles so Gmail, Outlook and Apple Mail agree. */
function layout_(o) {
  const block = (b) => '<tr><td style="padding:14px 16px;background:#0d0f12;border-left:3px solid ' + (b.color || '#00DDFF') + ';">'
    + '<div style="font:700 11px/1.3 Arial,Helvetica,sans-serif;letter-spacing:2px;text-transform:uppercase;color:' + (b.color || '#00DDFF') + ';">' + b.k + '</div>'
    + '<div style="font:400 15px/1.5 Arial,Helvetica,sans-serif;color:#e2e8f0;margin-top:4px;">' + b.v + '</div></td></tr>'
    + '<tr><td style="height:8px;line-height:8px;">&nbsp;</td></tr>';
  const html = '<!doctype html><html><body style="margin:0;padding:0;background:#050505;">'
    + '<span style="display:none;max-height:0;overflow:hidden;">' + esc_(o.preheader) + '</span>'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#050505;"><tr><td align="center" style="padding:24px 12px;">'
    + '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#121418;border:1px solid #2a2f38;">'
    + '<tr><td style="height:4px;background:#FDCC0D;line-height:4px;">&nbsp;</td></tr>'
    + '<tr><td style="padding:28px 28px 8px;">'
    + '<img src="' + CONFIG.LOGO + '" width="56" height="56" alt="SGX" style="display:block;border:0;">'
    + '<div style="font:700 11px/1.3 Arial,Helvetica,sans-serif;letter-spacing:3px;color:#00DDFF;text-transform:uppercase;margin-top:18px;">' + o.kicker + '</div>'
    + '<h1 style="margin:8px 0 0;font:900 26px/1.15 Arial,Helvetica,sans-serif;color:#ffffff;">' + o.title + '</h1>'
    + '<p style="margin:14px 0 0;font:400 16px/1.55 Arial,Helvetica,sans-serif;color:#cbd5e1;">' + o.intro + '</p>'
    + '</td></tr>'
    + '<tr><td style="padding:18px 28px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + o.blocks.map(block).join('') + '</table></td></tr>'
    + '<tr><td style="padding:12px 28px 26px;"><a href="' + o.cta.href + '" style="display:inline-block;background:#FDCC0D;color:#050505;text-decoration:none;font:700 15px/1 Arial,Helvetica,sans-serif;padding:15px 22px;">' + o.cta.label + '</a>'
    + (o.cta2 ? '&nbsp;&nbsp;<a href="' + o.cta2.href + '" style="display:inline-block;color:#00DDFF;font:700 14px/1 Arial,Helvetica,sans-serif;padding:15px 4px;">' + o.cta2.label + ' →</a>' : '')
    + '</td></tr>'
    + '<tr><td style="padding:22px 28px 28px;border-top:1px solid #2a2f38;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#7c8594;">'
    + (o.en ? '<em>' + o.en + '</em><br><br>' : '')
    + 'Recibes este correo porque forjaste tu SGX Pass en <a href="' + CONFIG.SITE + '" style="color:#7c8594;">summit.spatialgineers.com</a>. '
    + 'Si tienes preguntas, contesta este correo.<br>Spatialgineers LLC · San Juan, Puerto Rico</td></tr>'
    + '</table></td></tr></table></body></html>';
  const text = [o.titleText, '', o.introText].concat(o.blocks.map((b) => b.k + ': ' + b.v.replace(/<[^>]+>/g, '')))
    .concat(['', o.cta.label + ': ' + o.cta.href, '', 'Spatialgineers LLC · San Juan, Puerto Rico']).join('\n');
  return { subject: o.subject, html: html, text: text };
}

const TEMPLATES = {
  confirm: (r) => {
    const name = esc_(firstName_(r.fullName));
    const wantsDay3 = r.ticketType === 'SHOWCASE_PHYSICAL';
    return layout_({
      subject: '⚡ Tu SGX Pass está forjado · ' + (r.referenceCode || r.id),
      preheader: 'Tu identidad para el Spatialgineers Summit 2026, 11–13 de diciembre.',
      kicker: 'Spatialgineers Summit 2026',
      title: name + ', tu SGX Pass está forjado',
      titleText: 'Tu SGX Pass está forjado',
      intro: 'Pase <strong style="color:#FDCC0D;">' + esc_(r.referenceCode || r.id) + '</strong>. Es tu Holo Card, tu QR de networking y tu entrada al Día 3. Evoluciona con cada misión que completes.',
      introText: 'Pase ' + (r.referenceCode || r.id) + '. Es tu Holo Card, tu QR de networking y tu entrada al Día 3.',
      blocks: [
        { k: 'Días 1 y 2 · 11 y 12 de diciembre', v: 'En vivo y gratis por <a href="' + CONFIG.YOUTUBE + '" style="color:#00DDFF;">YouTube Live</a>, desde donde estés. Empieza a las 10:00 AM (hora de Puerto Rico).', color: '#00DDFF' },
        { k: 'Día 3 · 13 de diciembre · SGX Showcase', v: wantsDay3
          ? 'Pediste ir en persona a Chroma Space Studios (San Juan). El equipo revisa las solicitudes y te avisa por este correo si recibes invitación.'
          : 'Presencial en Chroma Space Studios, San Juan, por invitación.', color: '#FDCC0D' },
        { k: 'Prepárate', v: 'Arma tu agenda con las charlas que no te quieres perder, explora las 6 estaciones y gana XP con las misiones del Reactor.', color: '#B87000' },
      ],
      cta: { label: 'Abrir mi SGX Pass', href: CONFIG.SITE + '/?hangar=pass' },
      cta2: { label: 'Ver la agenda', href: CONFIG.SITE + '/?section=agenda' },
      en: 'English: your SGX Pass is forged. Days 1–2 stream free on YouTube Live (Dec 11–12); Day 3 is in person at Chroma Space Studios, San Juan, by invitation.',
    });
  },

  invite: (r) => layout_({
    subject: '🎟️ Estás invitado al Día 3 · SGX Showcase',
    preheader: 'Domingo 13 de diciembre · Chroma Space Studios, San Juan.',
    kicker: 'Invitación · Día 3',
    title: esc_(firstName_(r.fullName)) + ', nos vemos en el SGX Showcase',
    titleText: 'Estás invitado al Día 3 · SGX Showcase',
    intro: 'Te reservamos un espacio en el Día 3 del Spatialgineers Summit 2026, presencial en Chroma Space Studios.',
    introText: 'Te reservamos un espacio en el Día 3, presencial en Chroma Space Studios.',
    blocks: [
      { k: 'Cuándo', v: 'Domingo 13 de diciembre de 2026 · 10:00 AM (hora de Puerto Rico). <a href="' + DAY3_CAL + '" style="color:#00DDFF;">Añadir a mi calendario</a>', color: '#FDCC0D' },
      { k: 'Dónde', v: 'Chroma Space Studios · San Juan, Puerto Rico', color: '#FDCC0D' },
      { k: 'Tu entrada', v: 'El QR de tu SGX Pass. Ábrelo en la app (Hangar → Día 3) y muéstralo en la puerta. Tu pase: <strong style="color:#FDCC0D;">' + esc_(r.referenceCode || r.id) + '</strong>', color: '#00DDFF' },
      { k: '¿No puedes ir?', v: 'Contesta este correo para liberar tu espacio para otra persona.', color: '#B87000' },
    ],
    cta: { label: 'Ver mi entrada', href: CONFIG.SITE + '/?hangar=day3' },
    cta2: { label: 'Añadir al calendario', href: DAY3_CAL },
    en: 'English: you are invited to Day 3 (SGX Showcase), Sunday Dec 13, 2026, 10:00 AM, Chroma Space Studios, San Juan. Your entrance is your SGX Pass QR (Hangar → Day 3).',
  }),

  holo: (grant, role) => {
    const label = role === 'sponsor' ? 'Sponsor' : 'Speaker';
    return layout_({
      subject: '✨ Tu Holo Card de ' + label + ' está lista',
      preheader: 'Descárgala y compártela: post, story o badge.',
      kicker: 'Holo Card oficial · ' + label,
      title: esc_(firstName_(grant.name)) + ', tu Holo Card de ' + label + ' está lista',
      titleText: 'Tu Holo Card de ' + label + ' está lista',
      intro: 'El equipo aprobó tu credencial. Ya puedes descargar tu Holo Card oficial en formato post, story o badge y compartirla.',
      introText: 'El equipo aprobó tu credencial. Ya puedes descargar tu Holo Card oficial.',
      blocks: [
        { k: 'Dónde está', v: 'Entra con la misma cuenta de Google que usaste y abre tu Hangar → Holo Card.', color: '#00DDFF' },
        { k: 'Compártela', v: 'Etiqueta a @spatialgineers para que la amplifiquemos.', color: '#FDCC0D' },
      ],
      cta: { label: 'Abrir mi Holo Card', href: CONFIG.SITE + '/?hangar=pass' },
      en: 'English: the team approved your ' + label + ' credential. Open your Hangar to download and share your official Holo Card.',
    });
  },

  remind1: (r) => layout_({
    subject: '⏳ Mañana empieza el Spatialgineers Summit 2026',
    preheader: 'Viernes 11 de diciembre, 10:00 AM, en vivo por YouTube.',
    kicker: 'Mañana · Día 1',
    title: esc_(firstName_(r.fullName)) + ', mañana despegamos',
    titleText: 'Mañana empieza el Spatialgineers Summit 2026',
    intro: 'El Día 1 empieza el viernes 11 de diciembre a las 10:00 AM (hora de Puerto Rico), en vivo y gratis por YouTube.',
    introText: 'El Día 1 empieza el viernes 11 de diciembre a las 10:00 AM, en vivo por YouTube.',
    blocks: [
      { k: 'Mira en vivo', v: '<a href="' + CONFIG.YOUTUBE + '" style="color:#00DDFF;">youtube.com/@spatialgineers</a> · <a href="' + DAY1_CAL + '" style="color:#00DDFF;">Añadir a mi calendario</a>', color: '#00DDFF' },
      { k: 'Tu agenda', v: 'Revisa las charlas que guardaste y activa las alertas de las que no te quieres perder.', color: '#FDCC0D' },
      { k: 'Durante el live', v: 'Vota en las encuestas del keynote y completa misiones para ganar XP.', color: '#B87000' },
    ],
    cta: { label: 'Abrir mi agenda', href: CONFIG.SITE + '/?section=agenda' },
    cta2: { label: 'Ir a YouTube', href: CONFIG.YOUTUBE },
    en: 'English: Day 1 starts tomorrow, Friday Dec 11, 10:00 AM (Puerto Rico), free on YouTube Live.',
  }),

  remind3: (r) => layout_({
    subject: '📍 Mañana nos vemos en Chroma Space Studios',
    preheader: 'Domingo 13 de diciembre, 10:00 AM. Ten listo el QR de tu SGX Pass.',
    kicker: 'Mañana · Día 3',
    title: esc_(firstName_(r.fullName)) + ', mañana es el SGX Showcase',
    titleText: 'Mañana nos vemos en Chroma Space Studios',
    intro: 'Te esperamos el domingo 13 de diciembre a las 10:00 AM en Chroma Space Studios, San Juan.',
    introText: 'Te esperamos el domingo 13 de diciembre a las 10:00 AM en Chroma Space Studios, San Juan.',
    blocks: [
      { k: 'Tu entrada', v: 'El QR de tu SGX Pass (Hangar → Día 3). Pase <strong style="color:#FDCC0D;">' + esc_(r.referenceCode || r.id) + '</strong>.', color: '#FDCC0D' },
      { k: 'Calendario', v: '<a href="' + DAY3_CAL + '" style="color:#00DDFF;">Añadir a mi calendario</a>', color: '#00DDFF' },
    ],
    cta: { label: 'Ver mi entrada', href: CONFIG.SITE + '/?hangar=day3' },
    en: 'English: see you tomorrow, Sunday Dec 13, 10:00 AM at Chroma Space Studios, San Juan. Have your SGX Pass QR ready.',
  }),
};
