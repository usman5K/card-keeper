# FuelLedger Cloud Functions

Balance reconcile and conflict detection for fuel cards.

```bash
cd functions
npm install
npm test
npm run build
```

Deploy (requires Blaze plan on the Firebase project):

```bash
npm run deploy:functions
```

Emulator:

```bash
firebase emulators:start --only functions,firestore
```
