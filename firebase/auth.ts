import AsyncStorage from '@react-native-async-storage/async-storage';
import { Auth, getAuth, initializeAuth } from 'firebase/auth';
import { Platform } from 'react-native';

import { getFirebaseApp } from '@/firebase/config';

function getNativePersistence() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const authModule = require('firebase/auth') as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => unknown;
  };
  return authModule.getReactNativePersistence(AsyncStorage);
}

type AuthGlobal = typeof globalThis & { __fuelLedgerAuth?: Auth | null };

function authSlot(): AuthGlobal {
  return globalThis as AuthGlobal;
}

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  const slot = authSlot();
  if (slot.__fuelLedgerAuth) {
    return slot.__fuelLedgerAuth;
  }

  // Web: getAuth includes browser persistence + popup/redirect resolvers.
  if (Platform.OS === 'web') {
    slot.__fuelLedgerAuth = getAuth(app);
    return slot.__fuelLedgerAuth;
  }

  try {
    slot.__fuelLedgerAuth = initializeAuth(app, {
      persistence: getNativePersistence() as never,
    });
  } catch {
    slot.__fuelLedgerAuth = getAuth(app);
  }

  return slot.__fuelLedgerAuth;
}
