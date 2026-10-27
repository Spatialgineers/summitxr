# Firestore rules tests (emulator, never production)

```bash
cd scripts/rules-test
npm install            # @firebase/rules-unit-testing + firebase
cp ../../firestore.rules .
npx -y firebase-tools@13.29.1 emulators:exec --only firestore --project demo-sgx "node all.mjs"
# Day 3 window test: rules copy with the window opened
sed "s/2026-12-13T04:00:00Z/2026-01-01T00:00:00Z/; s/2026-12-14T10:00:00Z/2027-01-01T00:00:00Z/" ../../firestore.rules > firestore.day3.rules
```
Server test: start `SGX_TEST_ADMIN_TOKEN=testadmin123 PORT=3000 npx tsx server.ts`, then `node scripts/server-test/wstest.mjs`.
