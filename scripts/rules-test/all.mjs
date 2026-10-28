import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, getDocs, query, where, collection, serverTimestamp, updateDoc, deleteDoc, writeBatch, increment, arrayUnion, addDoc, deleteField } from 'firebase/firestore';
import fs from 'fs';

const env = await initializeTestEnvironment({ projectId: 'demo-sgx', firestore: { rules: fs.readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8085 } });
await env.clearFirestore();
const ctx = (uid, token) => env.authenticatedContext(uid, token).firestore();
const alice = ctx('alice');
const bob = ctx('bob');
const anon = env.unauthenticatedContext().firestore();
const admin = ctx('adm1', { email: 'info@spatialgineers.com', email_verified: true });
const support = ctx('adm2', { email: 'support@spatialgineers.com', firebase: { sign_in_provider: 'google.com' } });
const fakeAdmin = ctx('fake', { email: 'info@spatialgineers.com', email_verified: false, firebase: { sign_in_provider: 'password' } });
let n = 0, failed = 0;
const ok = async (name, p) => { try { await assertSucceeds(p); n++; } catch (e) { failed++; console.log('FAIL (should allow)', name, e.message.slice(0, 160)); } };
const no = async (name, p) => { try { await assertFails(p); n++; } catch (e) { failed++; console.log('FAIL (should deny)', name); } };

// Seed admin-only docs
await env.withSecurityRulesDisabled(async (c) => {
  const db = c.firestore();
  await setDoc(doc(db, 'summit_private', 'checkin'), { code: 'chroma-test1234' });
  await setDoc(doc(db, 'gamification_rewards', 'r1'), { title: 'Cupón', claimedCount: 0, inventoryCount: 2 });
  await setDoc(doc(db, 'chat_messages', 'm1'), { channelId: '#general', senderId: 'bob', authorUid: 'bob', senderName: 'Bob', text: 'hola', reactions: {} });
  await setDoc(doc(db, 'social_posts', 'p1'), { content: 'x', likes: 0, comments: [], commentsCount: 0, sharesCount: 0, authorUid: 'bob' });
  await setDoc(doc(db, 'ticket_inquiries', 't_bob'), { email: 'bob@x.com', ticketType: 'DIGITAL', userId: 'bob', status: 'PENDING' });
  await setDoc(doc(db, 'redeemed_prizes', 'rx_bob'), { userId: 'bob', userEmail: 'bob@x.com' });
});

// Admin identity
await ok('super admin writes site_config', setDoc(doc(admin, 'site_config', 'feature_toggles'), { toggles: {} }));
await ok('support admin (google) writes site_config', setDoc(doc(support, 'site_config', 'feature_toggles'), { toggles: { a: 1 } }));
await no('unverified owner email is not admin', setDoc(doc(fakeAdmin, 'site_config', 'feature_toggles'), { toggles: {} }));
await no('visitor cannot write site_config', setDoc(doc(alice, 'site_config', 'feature_toggles'), { toggles: {} }));
await no('anon cannot write site_config', setDoc(doc(anon, 'site_config', 'feature_toggles'), { toggles: {} }));
await ok('anyone reads site_config', getDoc(doc(anon, 'site_config', 'feature_toggles')));
await ok('admin announcement', setDoc(doc(admin, 'site_config', 'announcement'), { id: 'n1', title: 'Hola', message: 'Empezamos', priority: 'HIGH', at: serverTimestamp() }));
await no('announcement bad priority', setDoc(doc(admin, 'site_config', 'announcement'), { id: 'n1', title: 'Hola', message: 'x', priority: 'URGENT', at: serverTimestamp() }));
await ok('self admin-doc check readable', getDoc(doc(alice, 'admins', 'alice')));
await no('cannot read other admin doc', getDoc(doc(alice, 'admins', 'adm1')));
await no('visitor cannot make self admin', setDoc(doc(alice, 'admins', 'alice'), { email: 'a@a.com', role: 'DIRECTOR' }));
await ok('super admin adds admin', setDoc(doc(admin, 'admins', 'bob'), { email: 'bob@x.com', role: 'OPERATOR' }));
const bobAdmin = bob; // bob is now an admin via admins/{uid}
await ok('admins-doc admin can publish content', setDoc(doc(bobAdmin, 'summit_content', 'speakers'), { items: [{ id: 's1' }], updatedAt: serverTimestamp() }));
await env.withSecurityRulesDisabled(async (c) => { await deleteDoc(doc(c.firestore(), 'admins', 'bob')); });

// Live content
await ok('admin publishes speakers', setDoc(doc(admin, 'summit_content', 'speakers'), { items: [{ id: 's1', name: 'X' }], updatedAt: serverTimestamp() }));
await ok('anyone reads content', getDocs(collection(anon, 'summit_content')));
await no('visitor cannot publish content', setDoc(doc(alice, 'summit_content', 'speakers'), { items: [], updatedAt: serverTimestamp() }));
await no('content extra keys', setDoc(doc(admin, 'summit_content', 'speakers'), { items: [], updatedAt: serverTimestamp(), x: 1 }));
for (const c of ['summit_speakers', 'summit_sessions', 'approved_sponsors', 'gamification_tiers', 'tenants', 'questions', 'sessions', 'leaderboard_scores']) {
  await no(`visitor cannot write ${c}`, setDoc(doc(alice, c, 'x1'), { a: 1 }));
  await ok(`admin writes ${c}`, setDoc(doc(admin, c, 'x1'), { a: 1 }));
  await no(`visitor cannot delete ${c}`, deleteDoc(doc(alice, c, 'x1')));
}
await no('private readable by visitor', getDoc(doc(alice, 'summit_private', 'checkin')));
await ok('private readable by admin', getDoc(doc(admin, 'summit_private', 'checkin')));
await no('telemetry readable by visitor', getDocs(collection(alice, 'telemetry_events')));

// Registrations
const reg = { email: 'alice@x.com', ticketType: 'SHOWCASE_PHYSICAL', fullName: 'Alice', referenceCode: 'SGX26', status: 'PENDING', userId: 'alice', imageConsent: true, consentAt: Date.now(), timestamp: serverTimestamp() };
await ok('register pass', setDoc(doc(alice, 'ticket_inquiries', 't_alice'), reg));
await no('register CONFIRMED status', setDoc(doc(alice, 'ticket_inquiries', 't_alice2'), { ...reg, status: 'CONFIRMED' }));
await no('register for other uid', setDoc(doc(alice, 'ticket_inquiries', 't_alice3'), { ...reg, userId: 'bob' }));
await no('register extra field', setDoc(doc(alice, 'ticket_inquiries', 't_alice4'), { ...reg, isVip: true }));
await no('register bad consent type', setDoc(doc(alice, 'ticket_inquiries', 't_alice5'), { ...reg, imageConsent: 'yes' }));
await no('visitor cannot read other registration', getDoc(doc(alice, 'ticket_inquiries', 't_bob')));
await ok('owner reads own registration', getDoc(doc(bob, 'ticket_inquiries', 't_bob')));
await no('visitor cannot list registrations', getDocs(collection(alice, 'ticket_inquiries')));
await ok('admin lists registrations', getDocs(collection(admin, 'ticket_inquiries')));
await ok('admin invites', updateDoc(doc(admin, 'ticket_inquiries', 't_bob'), { status: 'INVITED', invitedAt: serverTimestamp() }));
await no('admin bad status', updateDoc(doc(admin, 'ticket_inquiries', 't_bob'), { status: 'VIP' }));
await no('owner cannot self-confirm', updateDoc(doc(bob, 'ticket_inquiries', 't_bob'), { status: 'CONFIRMED' }));

// Sponsor inquiries
const inq = { id: 'inq_1', companyName: 'ACME', contactName: 'Ana', email: 'ana@acme.com', phone: '787', selectedTierId: 'tier_2', selectedTierName: 'T2', estimatedBudget: '5k', goals: ['brand'], submittedAt: Date.now(), status: 'PENDING_REVIEW', referenceCode: 'SGX-SPONSOR-2026-1234' };
await ok('anon sends sponsor inquiry', setDoc(doc(anon, 'sponsor_inquiries', 'inq_1'), inq));
await no('sponsor inquiry id mismatch', setDoc(doc(anon, 'sponsor_inquiries', 'inq_2'), inq));
await no('sponsor inquiry approved status', setDoc(doc(anon, 'sponsor_inquiries', 'inq_3'), { ...inq, id: 'inq_3', status: 'APPROVED' }));
await no('visitor cannot read inquiries', getDocs(collection(alice, 'sponsor_inquiries')));
await ok('admin reads inquiries', getDocs(collection(admin, 'sponsor_inquiries')));
await no('cannot overwrite inquiry', setDoc(doc(anon, 'sponsor_inquiries', 'inq_1'), { ...inq, companyName: 'Evil' }));

// Speaker submissions
const sp = { id: 'spk_1', name: 'Speaker', role: 'Dev', organization: 'Org', avatarUrl: 'https://x/y.png', bio: 'bio', day: 2, isKeynote: false, socialLinks: {}, submittedAt: serverTimestamp(), submittedBy: 'alice' };
await ok('speaker submits', setDoc(doc(alice, 'speaker_submissions', 'spk_1'), sp));
await no('speaker self keynote', setDoc(doc(alice, 'speaker_submissions', 'spk_2'), { ...sp, id: 'spk_2', isKeynote: true }));
await no('visitor cannot read submissions', getDocs(collection(alice, 'speaker_submissions')));
await ok('admin reads submissions', getDocs(collection(admin, 'speaker_submissions')));

// Players & pilots
await ok('own player doc', setDoc(doc(alice, 'players', 'alice'), { uid: 'alice', username: 'Alice', tenantId: 't', eventId: 'e', email: 'a@x.com' }));
await no('other player doc', setDoc(doc(alice, 'players', 'bob'), { uid: 'bob', username: 'Bob', tenantId: 't', eventId: 'e' }));
await no('cannot read other player (emails)', getDoc(doc(alice, 'players', 'bob')));
await no('cannot list players', getDocs(collection(alice, 'players')));
const prof = { uid: 'alice', nickname: 'Alice', avatarSeed: 's', avatarColor: '#fff', level: 2, totalXp: 900, rankTitle: 'Cadete', updatedAt: Date.now() };
await ok('own pilot profile', setDoc(doc(alice, 'pilot_profiles', 'alice'), prof));
await no('pilot profile for other uid', setDoc(doc(alice, 'pilot_profiles', 'bob'), { ...prof, uid: 'bob' }));
await no('pilot xp over cap', setDoc(doc(alice, 'pilot_profiles', 'alice'), { ...prof, totalXp: 99999999 }));
await no('pilot extra field', setDoc(doc(alice, 'pilot_profiles', 'alice'), { ...prof, isAdmin: true }));
const lb = { uid: 'alice', nickname: 'Alice', avatarSeed: 's', avatarColor: '#fff', rankTitle: 'Cadete', level: 2, totalXp: 900, droneHighScore: 10, totalTricks: 1, connectionsCount: 0, votesCount: 1, updatedAt: Date.now() };
await ok('own leaderboard row', setDoc(doc(alice, 'pilot_leaderboard', 'alice'), lb));
await no('leaderboard row for other', setDoc(doc(alice, 'pilot_leaderboard', 'bob'), { ...lb, uid: 'bob' }));
await no('leaderboard inflated', setDoc(doc(alice, 'pilot_leaderboard', 'alice'), { ...lb, totalXp: 500000 }));
await ok('leaderboard public read', getDocs(collection(anon, 'pilot_leaderboard')));

// Rewards: voucher + inventory together
const voucher = { id: 'r1_alice', rewardId: 'r1', rewardTitle: 'Cupón', category: 'DIGITAL', userId: 'alice', userEmail: '', userName: 'Alice', voucherCode: 'SGX-1', xpSpent: 100, claimedAt: Date.now(), status: 'ACTIVE' };
{
  const b = writeBatch(alice);
  b.set(doc(alice, 'redeemed_prizes', 'r1_alice'), voucher);
  b.update(doc(alice, 'gamification_rewards', 'r1'), { claimedCount: increment(1), inventoryCount: increment(-1), lastClaimId: 'r1_alice', updatedAt: Date.now() });
  await ok('redeem in one batch', b.commit());
}
{
  const b = writeBatch(alice);
  b.set(doc(alice, 'redeemed_prizes', 'r1_alice'), voucher);
  b.update(doc(alice, 'gamification_rewards', 'r1'), { claimedCount: increment(1), inventoryCount: increment(-1), lastClaimId: 'r1_alice', updatedAt: Date.now() });
  await no('cannot redeem twice', b.commit());
}
await no('voucher without inventory step', setDoc(doc(bob, 'redeemed_prizes', 'r1_bob'), { ...voucher, id: 'r1_bob', userId: 'bob' }));
await no('inventory step without voucher', updateDoc(doc(bob, 'gamification_rewards', 'r1'), { claimedCount: increment(1), lastClaimId: 'r1_bob', updatedAt: Date.now() }));
await no('visitor cannot rewrite reward', updateDoc(doc(bob, 'gamification_rewards', 'r1'), { title: 'Gratis', accessUrl: 'https://evil' }));
await no('cannot read others vouchers', getDoc(doc(alice, 'redeemed_prizes', 'rx_bob')));
await no('cannot list all vouchers', getDocs(collection(alice, 'redeemed_prizes')));
await ok('reads own vouchers by query', getDocs(query(collection(alice, 'redeemed_prizes'), where('userId', '==', 'alice'))));
await ok('admin lists vouchers', getDocs(collection(admin, 'redeemed_prizes')));

// Chat
const msg = { channelId: '#general', senderId: 'alice', authorUid: 'alice', senderName: 'Alice', senderRole: 'ATTENDEE', text: 'Hola', timestamp: Date.now(), reactions: {} };
await ok('chat create', addDoc(collection(alice, 'chat_messages'), msg));
await no('chat impersonation', addDoc(collection(alice, 'chat_messages'), { ...msg, senderId: 'bob', authorUid: 'bob' }));
await no('chat anon', addDoc(collection(anon, 'chat_messages'), msg));
await no('chat fake official role', addDoc(collection(alice, 'chat_messages'), { ...msg, senderRole: 'ADMIN' }));
await no('chat self-pin', addDoc(collection(alice, 'chat_messages'), { ...msg, isPinned: true }));
await no('chat huge avatar', addDoc(collection(alice, 'chat_messages'), { ...msg, senderAvatar: 'data:image/png;base64,' + 'A'.repeat(5000) }));
await ok('chat reaction', updateDoc(doc(alice, 'chat_messages', 'm1'), { 'reactions.🔥': increment(1) }));
await no('chat edit other text', updateDoc(doc(alice, 'chat_messages', 'm1'), { text: 'hacked' }));
await no('chat pin by visitor', updateDoc(doc(alice, 'chat_messages', 'm1'), { isPinned: true }));
await ok('admin pins', updateDoc(doc(admin, 'chat_messages', 'm1'), { isPinned: true }));

// Social posts
const post = { content: 'Hola Summit', hashtags: [], platform: 'instagram', author: { name: 'A', handle: '@a', avatar: '/brand/sgx-bolt.svg', badge: 'Asistente', verified: false }, createdAt: Date.now(), likes: 0, commentsCount: 0, sharesCount: 0, isFeaturedOnStage: false, comments: [], authorUid: 'alice' };
await ok('post create', setDoc(doc(alice, 'social_posts', 'post_a'), post));
await no('post fake verified', setDoc(doc(alice, 'social_posts', 'post_b'), { ...post, author: { ...post.author, verified: true } }));
await no('post featured by visitor', setDoc(doc(alice, 'social_posts', 'post_c'), { ...post, isFeaturedOnStage: true }));
await ok('like +1', updateDoc(doc(alice, 'social_posts', 'p1'), { likes: increment(1) }));
await no('like +100', updateDoc(doc(alice, 'social_posts', 'p1'), { likes: 500 }));
await ok('comment append', updateDoc(doc(alice, 'social_posts', 'p1'), { comments: arrayUnion({ id: 'c1', text: 'hey' }), commentsCount: increment(1) }));
await no('comments wiped', updateDoc(doc(alice, 'social_posts', 'p1'), { comments: [], commentsCount: 0 }));

// Match
const card = { uid: 'alice', displayName: 'Alice', organization: 'Org', roleTitle: 'Dev', avatarSeed: 's', profile: { pitch: 'Busco socio', pillar: 'spark', visible: true }, updatedAt: Date.now() };
await ok('own match card', setDoc(doc(alice, 'match_profiles', 'alice'), card));
await no('match card with email', setDoc(doc(alice, 'match_profiles', 'alice'), { ...card, email: 'a@x.com' }));
await no('match card for other', setDoc(doc(alice, 'match_profiles', 'bob'), { ...card, uid: 'bob' }));
await ok('match cards public', getDocs(collection(anon, 'match_profiles')));
await ok('alice intent to bob', setDoc(doc(alice, 'match_intents', 'alice_bob'), { id: 'alice_bob', fromUid: 'alice', toUid: 'bob', createdAt: 'now' }));
await no('forged intent', setDoc(doc(alice, 'match_intents', 'bob_alice'), { id: 'bob_alice', fromUid: 'bob', toUid: 'alice', createdAt: 'now' }));
await ok('missing reverse intent readable', getDoc(doc(alice, 'match_intents', 'bob_alice')));
await no('third party reads intent', getDoc(doc(ctx('carol'), 'match_intents', 'alice_bob')));
await no('match without both intents', setDoc(doc(alice, 'matches', 'alice__bob'), { id: 'alice__bob', userA: 'alice', userB: 'bob', createdAt: 'now', xpAwarded: true, notes: {} }));
await ok('bob intent to alice', setDoc(doc(bob, 'match_intents', 'bob_alice'), { id: 'bob_alice', fromUid: 'bob', toUid: 'alice', createdAt: 'now' }));
await ok('match with both intents', setDoc(doc(bob, 'matches', 'alice__bob'), { id: 'alice__bob', userA: 'alice', userB: 'bob', createdAt: 'now', xpAwarded: true, notes: {} }));
await ok('member reads match', getDoc(doc(alice, 'matches', 'alice__bob')));
await no('outsider reads match', getDoc(doc(ctx('carol'), 'matches', 'alice__bob')));
await no('outsider lists matches', getDocs(collection(ctx('carol'), 'matches')));
await ok('own pass', setDoc(doc(alice, 'match_passes', 'alice_carol'), { id: 'alice_carol', fromUid: 'alice', toUid: 'carol', createdAt: 'now' }));
await ok('report', setDoc(doc(alice, 'match_reports', 'report_1_alice'), { id: 'report_1_alice', fromUid: 'alice', targetUid: 'carol', reason: 'spam', createdAt: 'now' }));
await no('read reports', getDocs(collection(alice, 'match_reports')));

// Polls
await ok('poll vote', setDoc(doc(alice, 'summit_poll_votes', 'poll_day1_open_alice'), { pollId: 'poll_day1_open', optionId: 'opt_story', uid: 'alice', at: serverTimestamp() }));
await no('poll vote twice (overwrite)', setDoc(doc(alice, 'summit_poll_votes', 'poll_day1_open_alice'), { pollId: 'poll_day1_open', optionId: 'opt_spark', uid: 'alice', at: serverTimestamp() }));
await no('poll vote for other uid', setDoc(doc(alice, 'summit_poll_votes', 'poll_day1_open_bob'), { pollId: 'poll_day1_open', optionId: 'opt_story', uid: 'bob', at: serverTimestamp() }));
await no('poll vote anon', setDoc(doc(anon, 'summit_poll_votes', 'poll_day1_open_x'), { pollId: 'poll_day1_open', optionId: 'opt_story', uid: 'x', at: serverTimestamp() }));
await ok('poll votes public', getDocs(query(collection(anon, 'summit_poll_votes'), where('pollId', '==', 'poll_day1_open'))));

// Visit radar XSS guard
const region = (name) => ({ name, kind: 'municipio', country: 'PR', lat: 18.4, lon: -66.1, totalVisits: 1, uniqueVisitors: 1, lastVisitAt: serverTimestamp() });
await ok('region with accents', setDoc(doc(alice, 'summit_visit_regions', 'pr_mayaguez'), region('Mayagüez')));
await ok('region with punctuation', setDoc(doc(alice, 'summit_visit_regions', 'us_saint'), region("Saint-Jean (St. John's), U.S.")));
await no('region with markup', setDoc(doc(alice, 'summit_visit_regions', 'xss1'), region('<img src=x onerror=alert(1)>')));

// Day 3 check-in (outside the window today)
{
  const b = writeBatch(alice);
  b.set(doc(alice, 'summit_checkin_proofs', 'alice'), { code: 'chroma-test1234', at: serverTimestamp() });
  b.set(doc(alice, 'summit_checkins', 'alice'), { regionId: 'pr_sj', regionName: 'San Juan', at: serverTimestamp() });
  await no('check-in closed before Day 3', b.commit());
}
await no('check-in without proof', setDoc(doc(alice, 'summit_checkins', 'alice'), { regionId: 'pr_sj', regionName: 'San Juan', at: serverTimestamp() }));

// Existing SGX Pass collections still behave
await ok('pass exchange', setDoc(doc(bob, 'summit_pass_exchanges', 'alice_bob'), { toUid: 'alice', fromUid: 'bob', card: { c: 'SGX26-A', n: 'Bob', s: 'B1', p: 'STAGE', r: '', o: '' }, at: serverTimestamp() }));
await no('exchange inbox private', getDocs(query(collection(ctx('carol'), 'summit_pass_exchanges'), where('toUid', '==', 'alice'))));


// ---- Plan de cierre: exact payloads of the new client code ----
// Registration keyed by pass code, merge, no status (passNetwork.registerPass)
const regPayload = (extra = {}) => ({ email: 'carol@x.com', fullName: 'Carol', ticketType: 'DIGITAL', referenceCode: 'SGX26-CCCC-DDDD', roleTitle: '', organization: '', imageConsent: true, consentAt: Date.now(), userId: 'carol', timestamp: serverTimestamp(), ...extra });
const carol = ctx('carol');
await ok('register by pass code (merge, no status)', setDoc(doc(carol, 'ticket_inquiries', 'SGX26-CCCC-DDDD'), regPayload(), { merge: true }));
await ok('admin invites carol', updateDoc(doc(admin, 'ticket_inquiries', 'SGX26-CCCC-DDDD'), { status: 'INVITED', invitedAt: serverTimestamp() }));
await ok('owner edits details later (merge, keeps INVITED)', setDoc(doc(carol, 'ticket_inquiries', 'SGX26-CCCC-DDDD'), regPayload({ fullName: 'Carol R.', ticketType: 'SHOWCASE_PHYSICAL' }), { merge: true }));
{
  let snap = {};
  await env.withSecurityRulesDisabled(async (c) => { snap = (await getDoc(doc(c.firestore(), 'ticket_inquiries', 'SGX26-CCCC-DDDD'))).data() || {}; });
  if (snap.status !== 'INVITED' || snap.fullName !== 'Carol R.') { failed++; console.log('FAIL status kept after owner edit', snap.status, snap.fullName); } else n++;
}
await no('owner cannot set status', setDoc(doc(carol, 'ticket_inquiries', 'SGX26-CCCC-DDDD'), { status: 'CONFIRMED' }, { merge: true }));
await no('other user cannot edit carol registration', setDoc(doc(alice, 'ticket_inquiries', 'SGX26-CCCC-DDDD'), regPayload({ userId: 'alice' }), { merge: true }));

// Chat reactions: exactly +1 on one emoji
await ok('reaction +1 again', updateDoc(doc(alice, 'chat_messages', 'm1'), { 'reactions.🔥': increment(1) }));
await ok('new emoji starts at 1', updateDoc(doc(alice, 'chat_messages', 'm1'), { 'reactions.🚀': increment(1) }));
await no('reaction set to 999', updateDoc(doc(alice, 'chat_messages', 'm1'), { 'reactions.🔥': 999 }));
await no('reaction object value', updateDoc(doc(alice, 'chat_messages', 'm1'), { reactions: { x: { a: 1 } } }));
await no('reactions wiped', updateDoc(doc(alice, 'chat_messages', 'm1'), { reactions: {} }));
await no('two emojis at once', updateDoc(doc(alice, 'chat_messages', 'm1'), { 'reactions.🔥': increment(1), 'reactions.🚀': increment(1) }));

// Rewards: sold out and unlimited stock
await env.withSecurityRulesDisabled(async (c) => {
  await setDoc(doc(c.firestore(), 'gamification_rewards', 'r0'), { title: 'Agotado', claimedCount: 3, inventoryCount: 0 });
  await setDoc(doc(c.firestore(), 'gamification_rewards', 'rinf'), { title: 'Ilimitado', claimedCount: 0, inventoryCount: -1 });
  await setDoc(doc(c.firestore(), 'gamification_rewards', 'roff'), { title: 'Inactivo', claimedCount: 0, inventoryCount: 5, isActive: false });
});
const claim = (who, rid, step) => { const d = ctx(who); const b = writeBatch(d); b.set(doc(d, 'redeemed_prizes', `${rid}_${who}`), { ...voucher, id: `${rid}_${who}`, rewardId: rid, userId: who }); b.update(doc(d, 'gamification_rewards', rid), { claimedCount: increment(1), ...(step ? { inventoryCount: increment(-1) } : {}), lastClaimId: `${rid}_${who}`, updatedAt: Date.now() }); return b.commit(); };
await no('sold-out reward (inventory unchanged)', claim('dave', 'r0', false));
await no('sold-out reward (step to -1)', claim('dave', 'r0', true));
await ok('unlimited reward', claim('dave', 'rinf', false));
await no('inactive reward', claim('erin', 'roff', true));

// Announcement exactly as publishAnnouncement sends it
await ok('announcement (client shape)', setDoc(doc(admin, 'site_config', 'announcement'), { id: 'notif_1', title: 'Empezamos', message: 'Día 1 en vivo', priority: 'HIGH', actionUrl: '/summit', at: serverTimestamp() }));

// Pilot profile: full replace with nested stats (toCloudProfile shape), repeated updates
const cloud = { uid: 'alice', nickname: 'Alice', callsign: 'ALC', avatarSeed: 's', avatarColor: '#fff', level: 3, totalXp: 1200, rankTitle: 'Cadete', createdAt: 1, lastActive: Date.now(), weekendStats: { totalInteractions: 5, votesSubmitted: 2 }, weekendActivity: [{ id: 'a1', title: 't' }], droneStats: { highScore: 10, totalFlights: 1, totalTricks: 0 }, achievements: [{ id: 'x', unlocked: true }], updatedAt: Date.now() };
await ok('pilot profile debounced update 1', setDoc(doc(alice, 'pilot_profiles', 'alice'), cloud));
await ok('pilot profile debounced update 2', setDoc(doc(alice, 'pilot_profiles', 'alice'), { ...cloud, totalXp: 1500, level: 4 }));

// Match: admin visibility only on existing card; member reads match
await ok('admin hides existing card', setDoc(doc(admin, 'match_profiles', 'alice'), { profile: { visible: false } }, { merge: true }));
await ok('first sender reads the match doc', getDoc(doc(alice, 'matches', 'alice__bob')));


// Holo Card roles: grants (admin approval) and initiate claims (verified email)
const aliceG = ctx('aliceG', { email: 'alice.guild@example.com', email_verified: true, firebase: { sign_in_provider: 'google.com' } });
const aliceFake = ctx('aliceF', { email: 'alice.guild@example.com', email_verified: false, firebase: { sign_in_provider: 'password' } });
await ok('admin grants speaker card', setDoc(doc(admin, 'credential_grants', 'alice'), { speaker: { name: 'Alice', title: 'Keynote', grantedAt: 1 }, updatedAt: serverTimestamp() }, { merge: true }));
await ok('admin grants sponsor card (merge)', setDoc(doc(admin, 'credential_grants', 'alice'), { sponsor: { name: 'Alice', org: 'ACME', grantedAt: 2 }, updatedAt: serverTimestamp() }, { merge: true }));
await no('grant with extra role key', setDoc(doc(admin, 'credential_grants', 'bob'), { initiate: { name: 'Bob' } }));
await no('visitor cannot grant self', setDoc(doc(alice, 'credential_grants', 'alice'), { speaker: { name: 'Alice' } }));
await ok('owner reads own grant', getDoc(doc(alice, 'credential_grants', 'alice')));
await ok('owner reads own missing grant', getDoc(doc(bob, 'credential_grants', 'bob')));
await no('cannot read someone else grant', getDoc(doc(bob, 'credential_grants', 'alice')));
await no('visitor cannot list grants', getDocs(collection(alice, 'credential_grants')));
await ok('admin revokes a role', updateDoc(doc(admin, 'credential_grants', 'alice'), { sponsor: deleteField(), updatedAt: serverTimestamp() }));
await ok('admin writes initiate claim', setDoc(doc(admin, 'initiate_claims', 'alice.guild@example.com'), { initiateId: 'init_3', updatedAt: serverTimestamp() }));
await no('visitor cannot write initiate claim', setDoc(doc(alice, 'initiate_claims', 'alice@x.com'), { initiateId: 'init_1' }));
await ok('initiate reads own claim (Google)', getDoc(doc(aliceG, 'initiate_claims', 'alice.guild@example.com')));
await no('unverified same email cannot read claim', getDoc(doc(aliceFake, 'initiate_claims', 'alice.guild@example.com')));
await no('other person cannot read claim', getDoc(doc(bob, 'initiate_claims', 'alice.guild@example.com')));
await no('visitor cannot list claims', getDocs(collection(aliceG, 'initiate_claims')));
await ok('admin saves initiate emails (private)', setDoc(doc(admin, 'summit_private', 'initiate_emails'), { emails: { init_3: 'alice.guild@example.com' }, updatedAt: serverTimestamp() }));
await no('visitor cannot read initiate emails', getDoc(doc(alice, 'summit_private', 'initiate_emails')));
await ok('admin publishes initiates roster', setDoc(doc(admin, 'summit_content', 'initiates'), { items: [{ id: 'init_3', name: 'G' }], updatedAt: Date.now() }));
await ok('sponsor inquiry with own uid', setDoc(doc(alice, 'sponsor_inquiries', 'inq_u1'), { ...inq, id: 'inq_u1', submittedBy: 'alice' }));
await no('sponsor inquiry with someone else uid', setDoc(doc(alice, 'sponsor_inquiries', 'inq_u2'), { ...inq, id: 'inq_u2', submittedBy: 'bob' }));
await no('anon sponsor inquiry claiming a uid', setDoc(doc(anon, 'sponsor_inquiries', 'inq_u3'), { ...inq, id: 'inq_u3', submittedBy: 'alice' }));

// One SGX Pass per email (pass_emails/{sha256})
const K = 'a'.repeat(64);
await ok('claim email for own pass', setDoc(doc(alice, 'pass_emails', K), { code: 'SGX-AAAA-0001', userId: 'alice', at: serverTimestamp() }));
await ok('signed-in visitor can check a claim', getDoc(doc(bob, 'pass_emails', K)));
await no('anon cannot check a claim', getDoc(doc(anon, 'pass_emails', K)));
await no('another person cannot take a claimed email', setDoc(doc(bob, 'pass_emails', K), { code: 'SGX-BBBB-0002', userId: 'bob', at: serverTimestamp() }));
await no('claim for someone else uid', setDoc(doc(bob, 'pass_emails', 'b'.repeat(64)), { code: 'SGX-BBBB-0002', userId: 'alice', at: serverTimestamp() }));
await no('claim with a short key', setDoc(doc(bob, 'pass_emails', 'short'), { code: 'SGX-BBBB-0002', userId: 'bob', at: serverTimestamp() }));
await no('claim with extra field', setDoc(doc(bob, 'pass_emails', 'c'.repeat(64)), { code: 'X', userId: 'bob', at: serverTimestamp(), email: 'b@x.com' }));
await ok('owner updates own claim code', setDoc(doc(alice, 'pass_emails', K), { code: 'SGX-AAAA-0009', userId: 'alice', at: serverTimestamp() }));
await no('visitor cannot list claims of emails', getDocs(collection(alice, 'pass_emails')));
await ok('admin lists email claims', getDocs(collection(admin, 'pass_emails')));
await ok('registration with affinity', setDoc(doc(alice, 'ticket_inquiries', 't_alice_aff'), { ...reg, affinity: 'SPARK' }));
await no('registration with bad affinity', setDoc(doc(alice, 'ticket_inquiries', 't_alice_aff2'), { ...reg, affinity: 'NOPE' }));

// Error reports from visitors (client_errors)
const errDoc = (o = {}) => ({ kind: 'error', message: 'TypeError: x is undefined', fingerprint: 'error|TypeError', sessionId: 'abc123', path: '/', ua: 'UA', viewport: '390x844', online: true, uid: null, build: '', stack: 'at f', component: '', at: serverTimestamp(), ...o });
await ok('anon device files an error report', setDoc(doc(anon, 'client_errors', 'e1'), errDoc()));
await ok('signed-in visitor files a report with own uid', setDoc(doc(alice, 'client_errors', 'e2'), errDoc({ uid: 'alice' })));
await no('report claiming another uid', setDoc(doc(alice, 'client_errors', 'e3'), errDoc({ uid: 'bob' })));
await no('report with unknown kind', setDoc(doc(anon, 'client_errors', 'e4'), errDoc({ kind: 'spam' })));
await no('report with huge message', setDoc(doc(anon, 'client_errors', 'e5'), errDoc({ message: 'x'.repeat(600) })));
await no('report with extra field', setDoc(doc(anon, 'client_errors', 'e6'), errDoc({ email: 'a@b.com' })));
await no('report with client clock', setDoc(doc(anon, 'client_errors', 'e7'), errDoc({ at: new Date() })));
await no('visitor cannot read error reports', getDoc(doc(alice, 'client_errors', 'e1')));
await no('visitor cannot list error reports', getDocs(collection(alice, 'client_errors')));
await no('visitor cannot edit a report', setDoc(doc(anon, 'client_errors', 'e1'), errDoc({ message: 'changed' })));
await ok('admin lists error reports', getDocs(collection(admin, 'client_errors')));
await ok('admin clears a report', deleteDoc(doc(admin, 'client_errors', 'e1')));

console.log(`RESULT ${n} passed, ${failed} failed`);
await env.cleanup();
process.exit(failed ? 1 : 0);
