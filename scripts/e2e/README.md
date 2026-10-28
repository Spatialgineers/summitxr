# End-to-end tests against the Firebase emulators (never production)

The app talks to the local Firestore + Auth emulators only when `VITE_USE_EMULATORS=1`
**and** it runs on localhost (`src/lib/firebase.ts`). Every request to the real Firebase
project is blocked and counted by the scripts; the run fails if there is even one.

```bash
cd scripts/e2e
cp ../../firestore.rules .
npx -y firebase-tools@13.29.1 emulators:start --only firestore,auth --project gen-lang-client-0564995587 &
# in the repo root, another terminal:
VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3200 npx tsx server.ts
# then:
node scripts/e2e/visitor.cjs   # forge pass, profile, poll, chat, sponsor form, visits, all tabs
node scripts/e2e/admin.cjs     # Google sign-in as info@ (emulated), invite, Day 3 code, announcement, CMS publish
node scripts/e2e/holo.cjs      # Holo Card = pass; speaker in review → approved; initiate by Google email; viewer
node scripts/e2e/pilot.cjs     # Pilot Builder in the Forge and in Avatar Studio (desktop + 390 px)
```

Run `visitor.cjs` before `admin.cjs` (the admin test invites the visitor's registration).
Screenshots go to `scripts/e2e/out/`.
