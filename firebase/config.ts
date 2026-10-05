import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

import { isFirebaseConfigured, readFirebasePublicEnv } from '@/firebase/env';

let warnedMissingConfig = false;

export function getFirebaseApp(): FirebaseApp | null {
  const config = readFirebasePublicEnv();
  if (!config) {
    if (__DEV__ && !warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        'Firebase env is incomplete. Copy .env.example to .env and fill EXPO_PUBLIC_FIREBASE_* values.',
      );
    }
    return null;
  }

  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(config);
}

export function assertFirebaseConfigured() {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* in .env');
  }
}
