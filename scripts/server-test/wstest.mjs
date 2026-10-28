import WebSocket from 'ws';
const base = 'ws://localhost:3000/ws?tenantId=tenant_spatialgineers&eventId=event_live_main';
const open = (q = '') => new Promise((res, rej) => { const ws = new WebSocket(base + q); const msgs = []; ws.on('message', d => { try { msgs.push(JSON.parse(d.toString())); } catch {} }); ws.on('open', () => res({ ws, msgs })); ws.on('error', rej); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const send = (ws, type, payload) => ws.send(JSON.stringify({ type, payload }));
let pass = 0, fail = 0; const check = (n, c) => { c ? pass++ : fail++; console.log(c ? 'PASS' : 'FAIL', n); };

const a = await open('&userId=attacker1');
send(a.ws, 'UPDATE_QUESTIONS', [{}]); await wait(200);
check('unauth UPDATE_QUESTIONS rejected', a.msgs.some(m => m.type === 'ERROR' && m.payload.error === 'NOT_AUTHORIZED'));
send(a.ws, 'START_VOTING', { index: 0 }); send(a.ws, 'SIMULATE_VOTES', { count: 100000 }); await wait(200);
check('unauth START/SIMULATE rejected', a.msgs.filter(m => m.type === 'ERROR').length >= 3);

const d = await open('&userId=director1&role=admin');
send(d.ws, 'AUTH', { token: 'wrong' }); await wait(300);
check('bad token not admin', d.msgs.some(m => m.type === 'AUTH_RESULT' && m.payload.isAdmin === false));
send(d.ws, 'AUTH', { token: 'testadmin123' }); await wait(300);
check('test token admin', d.msgs.some(m => m.type === 'AUTH_RESULT' && m.payload.isAdmin === true));
send(d.ws, 'UPDATE_QUESTIONS', [{}]); await wait(200);
check('admin invalid questions rejected with error', d.msgs.some(m => m.type === 'ERROR' && /prompt|options/.test(m.payload.error)));
const c2 = await open('&userId=late1'); await wait(200);
check('server still alive after crash payload', c2.msgs.some(m => m.type === 'INIT_STATE'));

send(d.ws, 'UPDATE_QUESTIONS', [{ id: 'q1', prompt: '¿Qué pilar?', options: [{ id: 'a', label: 'Story' }, { id: 'b', label: 'Spark' }] }]); await wait(200);
send(d.ws, 'START_VOTING', { index: 0 }); await wait(300);
const v = await open('&userId=voter1');
send(v.ws, 'SUBMIT_VOTE', { optionId: 'a', userId: 'x1' });
send(v.ws, 'SUBMIT_VOTE', { optionId: 'a', userId: 'x2' });
send(v.ws, 'SUBMIT_VOTE', { optionId: 'b', userId: 'x3' }); await wait(900);
const sums = v.msgs.filter(m => m.type === 'VOTE_UPDATE');
const last = sums[sums.length - 1];
check('one vote per socket despite payload userIds', last && last.payload.totalVotes === 1);
send(v.ws, 'SIMULATE_VOTES', { count: 10 }); await wait(200);
check('voter cannot simulate', v.msgs.some(m => m.type === 'ERROR'));

// A repeated start of the open question (console sends socket + REST) must not wipe votes.
send(d.ws, 'START_VOTING', { index: 0 }); await wait(400);
const v2 = await open('&userId=voter2');
send(v2.ws, 'SUBMIT_VOTE', { optionId: 'b', questionId: 'q1' }); await wait(700);
const before = v2.msgs.filter(m => m.type === 'VOTE_UPDATE').pop()?.payload.totalVotes;
send(d.ws, 'START_VOTING', { index: 0 }); await wait(900);
const v3 = await open('&userId=voter3'); await wait(300);
const synced = v3.msgs.find(m => m.type === 'INIT_STATE')?.payload.voteSummary?.totalVotes;
check('duplicate start keeps the votes', before === 2 && synced === 2);
// A late vote for an older question is refused instead of landing on the current one.
send(v3.ws, 'SUBMIT_VOTE', { optionId: 'a', questionId: 'q_old' }); await wait(500);
check('stale vote (other question) not counted', !v3.msgs.some(m => m.type === 'SCORE_UPDATE'));
// Binary votes carry no question id and are ignored.
v3.ws.send(Buffer.from([1])); await wait(500);
check('binary vote ignored', !v3.msgs.some(m => m.type === 'SCORE_UPDATE'));

const bws = await open('&userId=big1'); let closed = false; bws.ws.on('close', () => { closed = true; }); bws.ws.on('error', () => {}); bws.ws.send('x'.repeat(300 * 1024)); await wait(400);
check('oversized payload closes that socket', closed);
const c3 = await open('&userId=alive2'); await wait(200);
check('server alive after oversized', c3.msgs.some(m => m.type === 'INIT_STATE'));

const bad = await new Promise(r => { const ws = new WebSocket('ws://localhost:3000/ws?tenantId=%3Cscript%3E&eventId=x'); ws.on('close', (code) => r(code)); ws.on('error', () => {}); });
check('invalid tenant id refused', bad === 1008);
console.log(`DONE ${pass} pass ${fail} fail`); process.exit(0);
