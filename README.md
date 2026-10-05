# FuelLedger

Local-first shared fuel-card ledger (repo: card-keeper).

## Setup

```bash
npm install
cp .env.example .env
```

Fill `EXPO_PUBLIC_FIREBASE_*` and Google client IDs from Firebase / Google Cloud. See local `uncommit-docs/SETUP.md` for step-by-step setup.

## Scripts

```bash
npm start
npm run ios
npm run android
npm run lint
npm run typecheck
npm run test:firebase-env
npm run test:rules
npm run deploy:rules
```

## Firebase

- Client SDK: Firebase JS (`firebase` 12.x)
- Auth: Google via Expo AuthSession ID token + Firebase credential
- Auth persistence: AsyncStorage on iOS/Android
- Firestore: persistent cache on web; memory cache on native Expo Go until a durable offline path is added
- Rules: `firestore.rules` + `firestore.indexes.json` (deploy with `npm run deploy:rules`)
- Rules tests need JDK 21+ (`openjdk@21`) and the Firestore emulator
- Never commit `.env` or service-account files

Enable Google sign-in in Firebase Authentication, create OAuth client IDs, and put them in `.env`.

## Notes

- Display name: FuelLedger
- UI: app tokens + NativeWind 4 + `@expo/ui` + lucide
- `@expo/ui` native controls need a recent Expo Go or a dev build
