# Deploy notes · Spatialgineers Summit 2026

## Live engine (votes, presets, stage)

All live voting state (rooms, votes, scores) lives in the server process's memory
(`src/server/engine/roomManager.ts`). A restart loses it, and a second instance
splits the audience into separate rooms that don't see each other's votes.

During the event (Dec 11–13) the service must run as **one instance**:

- Cloud Run → the service → *Edit & deploy new revision* → *Revision scaling*:
  **Minimum instances = 1, Maximum instances = 1**.
- *Networking* → enable **Session affinity**.
- Keep the instance warm (min instances 1) so the first vote after idle doesn't hit a cold start.

## Admins

Directors are verified on the server with their Firebase ID token. The allowlist
comes from the env var `SGX_ADMIN_EMAILS` (comma separated). Default:
`info@spatialgineers.com,support@spatialgineers.com`. Both sign in with Google.

## Firestore

Rules live in `firestore.rules`; deploy them with
`firebase deploy --only firestore:rules` (or paste them in the Firebase console).
See `docs/FIRESTORE_RULES.md` for who can read and write each collection.
