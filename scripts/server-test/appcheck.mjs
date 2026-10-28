/* App Check on the live engine. Starts its own server in enforce mode with a
   local key set (SGX_APPCHECK_JWKS_URL, ignored in production) and checks that
   votes need a valid token, while forged/expired/foreign tokens are refused.
   Run: node scripts/server-test/appcheck.mjs */
import crypto from 'crypto';
import http from 'http';
import { spawn } from 'child_process';
import WebSocket from 'ws';
import fs from 'fs';

const cfg = JSON.parse(fs.readFileSync(new URL('../../firebase-applet-config.json', import.meta.url)));
const NUM = cfg.messagingSenderId;
const PORT = 3011;
let pass = 0, fail = 0; const check = (n, c, x = '') => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n, x); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const other = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', alg: 'RS256', use: 'sig' };
const jwks = http.createServer((q, s) => { s.setHeader('content-type', 'application/json'); s.end(JSON.stringify({ keys: [jwk] })); });
await new Promise((r) => jwks.listen(0, '127.0.0.1', r));
const jwksUrl = `http://127.0.0.1:${jwks.address().port}/jwks`;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token({ key = privateKey, kid = 'k1', iss = `https://firebaseappcheck.googleapis.com/${NUM}`, aud = [`projects/${NUM}`, `projects/${cfg.projectId}`], exp = Math.floor(Date.now() / 1000) + 3600 } = {}) {
  const h = b64({ alg: 'RS256', typ: 'JWT', kid });
  const p = b64({ iss, aud, sub: cfg.appId, exp, iat: Math.floor(Date.now() / 1000) });
  const sig = crypto.sign('RSA-SHA256', Buffer.from(`${h}.${p}`), key).toString('base64url');
  return `${h}.${p}.${sig}`;
}

const srv = spawn('npx', ['tsx', 'server.ts'], {
  env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test', DISABLE_HMR: 'true', SGX_APPCHECK: 'enforce', SGX_APPCHECK_JWKS_URL: jwksUrl, SGX_TEST_ADMIN_TOKEN: 'testadmin123' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let up = false; srv.stdout.on('data', (d) => { if (/Server running/.test(d)) up = true; });
for (let i = 0; i < 60 && !up; i++) await wait(500);
check('server started', up);

const base = `ws://127.0.0.1:${PORT}/ws?tenantId=tenant_spatialgineers&eventId=event_live_main`;
const open = (q) => new Promise((res, rej) => { const ws = new WebSocket(base + q); const msgs = []; ws.on('message', (d) => { try { msgs.push(JSON.parse(d.toString())); } catch {} }); ws.on('open', () => res({ ws, msgs })); ws.on('error', rej); });
const send = (ws, type, payload) => ws.send(JSON.stringify({ type, payload }));

const d = await open('&userId=director1&role=admin');
send(d.ws, 'AUTH', { token: 'testadmin123' }); await wait(300);
send(d.ws, 'UPDATE_QUESTIONS', [{ id: 'q1', prompt: '¿Qué pilar?', options: [{ id: 'a', label: 'Story' }, { id: 'b', label: 'Spark' }] }]); await wait(200);
send(d.ws, 'START_VOTING', { index: 0 }); await wait(300);

async function voteWith(name, tok) {
  const v = await open(`&userId=${name}`);
  if (tok !== undefined) send(v.ws, 'APP_CHECK', { token: tok });
  send(v.ws, 'SUBMIT_VOTE', { optionId: 'a' });
  await wait(700);
  const refused = v.msgs.some((m) => m.type === 'ERROR' && m.payload?.error === 'APP_CHECK_REQUIRED');
  const scored = v.msgs.some((m) => m.type === 'SCORE_UPDATE');
  v.ws.close();
  return { refused, scored };
}

let r = await voteWith('noToken');
check('vote without App Check token refused', r.refused && !r.scored);
r = await voteWith('validTok', token());
check('vote with valid token accepted (token sent right before the vote)', !r.refused && r.scored);
r = await voteWith('forged', token({ key: other.privateKey }));
check('forged signature refused', r.refused && !r.scored);
r = await voteWith('expired', token({ exp: Math.floor(Date.now() / 1000) - 10 }));
check('expired token refused', r.refused);
r = await voteWith('otherProject', token({ iss: 'https://firebaseappcheck.googleapis.com/123', aud: ['projects/123'] }));
check('token from another project refused', r.refused);
r = await voteWith('junk', 'not.a.token');
check('junk token refused', r.refused);

const rest = await fetch(`http://127.0.0.1:${PORT}/api/reaction`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tenantId: 'tenant_spatialgineers', eventId: 'event_live_main', userId: 'restuser', emoji: '🔥' }) });
check('REST reaction without token refused (401)', rest.status === 401);
const rest2 = await fetch(`http://127.0.0.1:${PORT}/api/reaction`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-firebase-appcheck': token() }, body: JSON.stringify({ tenantId: 'tenant_spatialgineers', eventId: 'event_live_main', userId: 'restuser', emoji: '🔥' }) });
check('REST reaction with token accepted', rest2.status < 300, `(${rest2.status})`);
const health = await (await fetch(`http://127.0.0.1:${PORT}/api/health`)).json();
check('health reports App Check mode and counts', health.appCheck?.mode === 'enforce' && health.appCheck.verified >= 2 && health.appCheck.rejected >= 4, JSON.stringify(health.appCheck));

d.ws.close();
srv.kill();
jwks.close();
console.log(`DONE ${pass} pass ${fail} fail`);
process.exit(fail ? 1 : 0);
