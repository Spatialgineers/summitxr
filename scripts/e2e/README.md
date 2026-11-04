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
node scripts/e2e/deadlines.cjs # speaker portal / sponsor form close by themselves (localStorage.sgx_now), welcome dates, Day 3 note
node scripts/e2e/guides.cjs    # sponsors "Términos y logística" (/sponsors#terminos), "Guía del speaker" (portal + /bienvenida/speaker#guia), Day 3 Entrepreneurship Match
```

A second stack (so it never touches the emulators on 8085/9099): start the emulators with your own
firebase.json on other ports, then `VITE_EMULATOR_FIRESTORE_PORT=8185 VITE_EMULATOR_AUTH_PORT=9199
VITE_USE_EMULATORS=1 DISABLE_HMR=true PORT=3300 npx tsx server.ts` and run the scripts with
`APP_URL=http://localhost:3300 FS_PORT=8185` (press, visitor, admin and deadlines read `FS_PORT`).

Run `visitor.cjs` before `admin.cjs` (the admin test invites the visitor's registration).
Screenshots go to `scripts/e2e/out/`.
