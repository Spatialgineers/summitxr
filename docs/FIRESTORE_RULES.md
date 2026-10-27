# Firestore rules · who can read and write

Admins = `info@spatialgineers.com` or `support@spatialgineers.com` signed in with Google
(or a verified email), or a uid listed in `admins/{uid}`.

| Collection | Read | Write |
|---|---|---|
| `site_config` (feature toggles, announcement) | everyone | admins |
| `summit_content` (live CMS: speakers, sessions, sponsors, embeds, map, tiers) | everyone | admins |
| `summit_speakers`, `summit_sessions`, `approved_sponsors`, `gamification_tiers`, `tenants`, `questions`, `sessions` | everyone | admins |
| `summit_private` (Day 3 check-in code, initiate emails) | admins | admins |
| `credential_grants/{uid}` (Holo Card roles: speaker, sponsor) | owner, admins | admins (on approval) |
| `initiate_claims/{email}` (which initiate an email is) | that person signed in with that verified email (Google), admins | admins |
| `ticket_inquiries` (SGX Pass registrations, doc id = pass code) | admins; owner reads own | create: anyone with a valid pass (uid must be yours, no status); owner edits own details and consent, never the status; status/invitation: admins |
| `sponsor_inquiries` | admins | create: anyone (validated fields; `submittedBy` must be your own uid); update/delete: admins |
| `speaker_submissions` | admins | create: anyone (validated, no self-keynote); admins publish |
| `players` (has emails) | owner, admins | owner, admins |
| `pilot_profiles`, `pilot_leaderboard` | everyone | owner only, allowed fields, XP ≤ 100,000 |
| `gamification_rewards` | everyone | admins; a pilot can only step the inventory down by 1 (never below 0; -1 = unlimited; inactive rewards refused) together with creating their own voucher |
| `redeemed_prizes` (vouchers, names, emails) | owner, admins | create: own voucher, one per reward, same batch as the inventory step |
| `chat_messages` | everyone | create: signed in as yourself, attendee role; reactions: one emoji +1 per write, by anyone signed in; pin/moderate: admins |
| `social_posts` | everyone | create: yourself, never "verified"; likes +1 and comment append only |
| `match_profiles` (public card, no email) | everyone | owner |
| `match_intents`, `match_passes` | the two people involved | create your own |
| `matches` | the two people | created only when both intents exist |
| `match_reports` | admins | create your own |
| `summit_poll_votes` | everyone (counts) | one vote per pilot per poll, no edits |
| `summit_visit_*` | everyone | +1 counters only; region names are plain text |
| `summit_pass_exchanges` | inbox owner | create your own card in someone's inbox |
| `summit_constellations` | everyone | owner (counts only) |
| `summit_checkin_proofs` | admins | Day 3 only, with the door code |
| `summit_checkins` | everyone (region only) | Day 3 only, together with a valid proof |
| `telemetry_*`, `leaderboard_scores` | admins | admins |

Tests: `scripts/rules-test/` (175 cases + Day 3 window) and `scripts/e2e/` (the real app against the emulators).

Deploy: `firebase deploy --only firestore:rules`, or paste `firestore.rules` in
Firebase console → Firestore → Rules → Publish.

Before Day 3: in the admin, tab "0. INSCRITOS & DÍA 3", save the check-in code
and print its QR for the Chroma entrance. Without a saved code, check-in won't open.
