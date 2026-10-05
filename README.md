# FuelLedger

Local-first shared fuel-card ledger (repo: card-keeper).

## Setup

```bash
npm install
cp .env.example .env
```

Fill `EXPO_PUBLIC_FIREBASE_*` from your Firebase web app settings. The app boots without them, but Auth/Firestore stay inactive until they are set.

## Scripts

```bash
npm start
npm run ios
npm run android
npm run lint
npm run typecheck
npm run test:firebase-env
```

## Firebase

- Client SDK: Firebase JS (`firebase` 12.x)
- Auth: Google via Expo AuthSession ID token + Firebase credential
- Auth persistence: AsyncStorage on iOS/Android
- Firestore: persistent cache on web; memory cache on native Expo Go until a durable offline path is added
- Never commit `.env` or service-account files

Enable Google sign-in in Firebase Authentication, create OAuth client IDs, and put them in `.env`.

## Notes

- Display name: FuelLedger
- UI: app tokens + NativeWind 4 + `@expo/ui` + lucide
- `@expo/ui` native controls need a recent Expo Go or a dev build
