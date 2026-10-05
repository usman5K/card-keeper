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

## Environments and EAS

FuelLedger uses three EAS environments that match Firebase separation (dev vs prod):

| Profile | EAS environment | App variant | Firebase project | Distribution |
|---------|-----------------|-------------|------------------|--------------|
| `development` | `development` | Dev bundle id + name | Dev | Dev client, internal |
| `preview` | `preview` | Preview bundle id + name | Dev (or staging) | Internal APK / ad hoc |
| `production` | `production` | Store bundle id | Prod | Store-ready |

Profiles live in `eas.json`. App name and bundle identifiers switch via `APP_VARIANT` in `app.config.ts` (see [Expo app variants](https://docs.expo.dev/tutorial/eas/multiple-app-variants/)).

### Local `.env` (never commit)

```bash
cp .env.example .env
```

Fill every `EXPO_PUBLIC_*` key from `.env.example`. `.env` and `.env.*` are gitignored (`!.env.example` only). Do not put Firebase private keys, service accounts, or store credentials in the repo.

### EAS-hosted `EXPO_PUBLIC_*` (per environment)

Do **not** put API keys or client IDs in `eas.json`. Set them on EAS for each environment ([EAS environment variables](https://docs.expo.dev/eas/environment-variables/)):

```bash
npx eas-cli@latest login
npx eas-cli@latest init   # once; links the Expo project

# Repeat per env: development | preview | production
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_API_KEY --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_PROJECT_ID --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_FIREBASE_APP_ID --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID --value '<value>' --environment development --visibility plaintext
npx eas-cli@latest env:set --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value '<value>' --environment development --visibility plaintext

npx eas-cli@latest env:list --environment development
```

Use **plaintext** or **sensitive** for client `EXPO_PUBLIC_*` values (they are embedded in the app binary). Reserve **secret** visibility for job-only values (for example `NPM_TOKEN`), not client config.

Point `development` / `preview` at the Firebase **dev** project and `production` at **prod**. Create matching Google OAuth clients for each bundle id / package name.

Verified tooling (stable): EAS CLI **24.10.0** (`npm` `latest`, 2026-10-06). Docs: [eas.json](https://docs.expo.dev/build/eas-json/), [environment variables](https://docs.expo.dev/eas/environment-variables/).

### Build commands

```bash
npx eas-cli@latest build --profile development --platform android
npx eas-cli@latest build --profile preview --platform all
npx eas-cli@latest build --profile production --platform all
```

### Distribution checklist (not full store submission)

1. Expo account linked (`eas init`) and credentials generated when prompted.
2. Firebase **dev** and **prod** projects created; Auth Google provider enabled on each.
3. `EXPO_PUBLIC_*` set on EAS for `development`, `preview`, and `production`.
4. OAuth clients cover each Android package / iOS bundle id variant.
5. Preview: internal install (Android APK from `preview` profile; iOS ad hoc / internal).
6. Production: run a production build; smoke-test Auth + Firestore before any store listing.
7. Store listing, screenshots, privacy policy, and App Store / Play Console submission are out of scope here (`eas submit` profile is stubbed only).
