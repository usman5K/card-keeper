# FuelLedger

Local-first shared fuel-card ledger (repo: card-keeper).

## Setup

```bash
npm install
cp .env.example .env
```

Fill `EXPO_PUBLIC_FIREBASE_*` and Google client IDs from Firebase / Google Cloud. See local `uncommit-docs/SETUP.md` for step-by-step setup.

## Scripts

| Script | Purpose |
|--------|---------|
| `npm start` | Expo dev server |
| `npm test` / `npm run test:unit` | Jest unit tests (money, balance, sync, schemas) |
| `npm run test:functions` | Cloud Functions unit tests (reconcile/conflict) |
| `npm run test:rules` | Firestore rules matrix via emulator |
| `npm run typecheck` | TypeScript `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run test:firebase-env` | Env var sanity check |
| `npm run deploy:rules` | Deploy rules + indexes |
| `npm run deploy:functions` | Build and deploy functions |

Also: `npm run ios`, `npm run android`, `npm run web`.

## CI

Pull requests run `.github/workflows/ci.yml` on Node **22.13** (Expo SDK 57 minimum): `npm ci`, lint, typecheck, app unit tests, functions unit tests, and Firestore rules tests (Temurin JDK 21 + Firebase emulator).

Mark the **Lint, typecheck, tests** check as required in GitHub branch protection when ready.

## Firebase emulators (rules tests)

Rules tests need **JDK 21+** (e.g. Homebrew `openjdk@21`) and the Firebase CLI.

```bash
export JAVA_HOME="$(brew --prefix openjdk@21)"
export PATH="$JAVA_HOME/bin:$PATH"
npm run test:rules
```

That starts the Firestore emulator briefly, runs `scripts/firestore-rules.test.mjs`, then shuts down. Interactive UI (optional):

```bash
export JAVA_HOME="$(brew --prefix openjdk@21)"
export PATH="$JAVA_HOME/bin:$PATH"
npx firebase emulators:start --only firestore
```

Emulator ports are in `firebase.json` (Firestore `8080`, UI `4000`).

## Firebase

- Client SDK: Firebase JS (`firebase` 12.x)
- Auth: Google via Expo AuthSession ID token + Firebase credential
- Auth persistence: AsyncStorage on iOS/Android
- Firestore: persistent cache on web; memory cache on native Expo Go until a durable offline path is added
- Rules: `firestore.rules` + `firestore.indexes.json` (deploy with `npm run deploy:rules`)
- Functions: card balance reconcile + conflict detection (`npm run deploy:functions`, Blaze plan required)
- Never commit `.env` or service-account files

Enable Google sign-in in Firebase Authentication, create OAuth client IDs, and put them in `.env`.

## Notes

- Display name: FuelLedger
- UI: app tokens + NativeWind 4 + `@expo/ui` + lucide
- `@expo/ui` native controls need a recent Expo Go or a dev build
