# FuelLedger

Local-first shared fuel-card ledger (repo: card-keeper).

## Setup

```bash
npm install
cp .env.example .env
```

## Scripts

```bash
npm start          # Expo dev server
npm run ios        # iOS
npm run android    # Android
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit
```

## Notes

- Display name: FuelLedger
- UI: app tokens + NativeWind 4 + `@expo/ui` + lucide
- `@expo/ui` native controls need a recent Expo Go or a dev build; the smoke Host on Home should still compile for typecheck/export
- Do not commit `.env` or Firebase service-account files
