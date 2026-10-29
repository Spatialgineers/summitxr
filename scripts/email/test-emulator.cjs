// Runs Code.gs in Node against the Firestore EMULATOR with Apps Script mocked:
// seeds registrations, an invite and a speaker grant, then checks what gets sent.
//   node scripts/email/test-emulator.cjs   (emulator on 127.0.0.1:8085)
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { execFileSync } = require('child_process');

const EMU = 'http://127.0.0.1:8085';
const DB = `${EMU}/v1/projects/gen-lang-client-0564995587/databases/ai-studio-sgxliveengine-630b78e7-0845-4046-9176-53bab53744ac/documents`;
const curl = (method, url, body) => {
  const args = ['-s', '-w', '\n%{http_code}', '-X', method, '-H', 'Authorization: Bearer owner', '-H', 'Content-Type: application/json', url];
  if (body) args.push('-d', JSON.stringify(body));
  const out = execFileSync('curl', args).toString();
  const i = out.lastIndexOf('\n');
  return { code: Number(out.slice(i + 1)), text: out.slice(0, i) };
};
let pass = 0, fail = 0;
const check = (n, c, extra = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, extra); };

function load(windowNow) {
  let src = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8').replace("API: 'https://firestore.googleapis.com'", `API: '${EMU}'`);
  if (windowNow) {
    const a = new Date(Date.now() - 3600e3).toISOString(), b = new Date(Date.now() + 3600e3).toISOString();
    src = src.replace(/REMIND_DAY1_AT: '[^']+'/, `REMIND_DAY1_AT: '${a}'`).replace(/REMIND_DAY1_UNTIL: '[^']+'/, `REMIND_DAY1_UNTIL: '${b}'`)
      .replace(/REMIND_DAY3_AT: '[^']+'/, `REMIND_DAY3_AT: '${a}'`).replace(/REMIND_DAY3_UNTIL: '[^']+'/, `REMIND_DAY3_UNTIL: '${b}'`);
  }
  const sent = [];
  const props = {};
  const ctx = {
    console,
    Logger: { log: (m) => console.log('  [log]', m) },
    UrlFetchApp: { fetch: (url, p) => { const r = curl((p.method || 'get').toUpperCase(), url, p.payload ? JSON.parse(p.payload) : undefined); return { getResponseCode: () => r.code, getContentText: () => r.text }; } },
    ScriptApp: { getOAuthToken: () => 'owner', getProjectTriggers: () => [], deleteTrigger() {}, newTrigger: () => ({ timeBased: () => ({ everyMinutes: () => ({ create() {} }) }) }) },
    MailApp: { sendEmail: (m) => sent.push(m), getRemainingDailyQuota: () => 1500 },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null, setProperty: (k, v) => { props[k] = v; }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => props }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Session: { getActiveUser: () => ({ getEmail: () => 'info@spatialgineers.com' }) },
  };
  vm.createContext(ctx);
  vm.runInContext(src + '\n;this.__api = { processQueue, testAll, TEMPLATES };', ctx);
  return { api: ctx.__api, sent, props };
}

const ts = (ms) => ({ timestampValue: new Date(ms).toISOString() });
const S = (v) => ({ stringValue: v });
const t0 = Date.now();
const tag = String(t0).slice(-6);
const regA = `SGX-A${tag}`, regB = `SGX-B${tag}`, uid = `spk${tag}`;
curl('PATCH', `${DB}/ticket_inquiries/${regA}`, { fields: { email: S(`a${tag}@example.com`), fullName: S('Ana Prueba'), referenceCode: S(regA), ticketType: S('DIGITAL'), timestamp: ts(t0 + 1000) } });
curl('PATCH', `${DB}/ticket_inquiries/${regB}`, { fields: { email: S(`b${tag}@example.com`), fullName: S('Beto Prueba'), referenceCode: S(regB), ticketType: S('SHOWCASE_PHYSICAL'), status: S('INVITED'), timestamp: ts(t0 + 1500), invitedAt: ts(t0 + 2000) } });
curl('PATCH', `${DB}/credential_grants/${uid}`, { fields: { speaker: { mapValue: { fields: { name: S('Carla Speaker') } } }, updatedAt: ts(t0 + 2500) } });
curl('PATCH', `${DB}/players/${uid}`, { fields: { email: S(`c${tag}@example.com`), uid: S(uid) } });

// 1st run: confirmations for A and B, invite for B, Holo Card for the speaker.
const run1 = load(false);
const since = new Date(t0).toISOString();
Object.assign(run1.props, { CURSOR_CONFIRM: since, CURSOR_INVITE: since, CURSOR_HOLO: since });
run1.api.processQueue();
const subj = run1.sent.map((m) => `${m.to} :: ${m.subject}`);
console.log(subj.join('\n'));
check('confirmation to A', subj.some((s) => s.startsWith(`a${tag}`) && /forjado/.test(s)));
check('confirmation to B', subj.some((s) => s.startsWith(`b${tag}`) && /forjado/.test(s)));
check('Day 3 invite to B', subj.some((s) => s.startsWith(`b${tag}`) && /Día 3/.test(s)));
check('Holo Card email to the speaker (email from players)', subj.some((s) => s.startsWith(`c${tag}`) && /Holo Card de Speaker/.test(s)));
check('exactly 4 emails', run1.sent.length === 4, String(run1.sent.length));
check('mail_log written', curl('GET', `${DB}/mail_log/confirm_${regA}`).code === 200 && curl('GET', `${DB}/mail_log/invite_${regB}`).code === 200 && curl('GET', `${DB}/mail_log/holo_speaker_${uid}`).code === 200);
check('html has the pass code and CTA', run1.sent[0].htmlBody.includes('?estudio=pass') && /SGX-[AB]/.test(run1.sent[0].htmlBody));

// 2nd run with the same cursors: nothing is sent twice.
run1.api.processQueue();
check('second run sends nothing new', run1.sent.length === 4, String(run1.sent.length));

// Reminder windows open now: remind1 to A and B (and any older emulator data), remind3 only to B.
const run2 = load(true);
Object.assign(run2.props, { CURSOR_CONFIRM: new Date(t0 + 10e3).toISOString(), CURSOR_INVITE: new Date(t0 + 10e3).toISOString(), CURSOR_HOLO: new Date(t0 + 10e3).toISOString() });
for (let i = 0; i < 30 && !(run2.props.DONE_remind1 && run2.props.DONE_remind3); i++) run2.api.processQueue();
const r1 = run2.sent.filter((m) => /Mañana empieza/.test(m.subject)).map((m) => m.to);
const r3 = run2.sent.filter((m) => /Chroma Space Studios/.test(m.subject)).map((m) => m.to);
check('remind1 reaches A and B', r1.includes(`a${tag}@example.com`) && r1.includes(`b${tag}@example.com`), `${r1.length} sent`);
check('remind3 only to invited guests', r3.includes(`b${tag}@example.com`) && !r3.includes(`a${tag}@example.com`), `${r3.length} sent`);
check('reminders marked done', !!run2.props.DONE_remind1 && !!run2.props.DONE_remind3);

// testAll renders every template.
const run3 = load(false);
run3.api.testAll();
check('testAll sends 5 previews', run3.sent.length === 5);
fs.writeFileSync(path.join(__dirname, 'preview_confirm.html'), run3.sent[0].htmlBody);
fs.writeFileSync(path.join(__dirname, 'preview_invite.html'), run3.sent[1].htmlBody);
console.log(`DONE ${pass} pass ${fail} fail`);
