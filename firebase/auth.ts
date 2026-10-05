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

let auth: Auth | null = null;

export function getFirebaseAuth(): Auth | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (auth) {
    return auth;
  }

  if (Platform.OS === 'web') {
    auth = getAuth(app);
    return auth;
  }

  try {
    auth = initializeAuth(app, {
      persistence: getNativePersistence() as never,
    });
  } catch {
    auth = getAuth(app);
  }

  return auth;
}
