import {
  Firestore,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { getFirebaseApp } from '@/firebase/config';

let db: Firestore | null = null;

export function getFirestoreDb(): Firestore | null {
  const app = getFirebaseApp();
  if (!app) {
    return null;
  }

  if (db) {
    return db;
  }

  try {
    db = initializeFirestore(app, {
      localCache:
        Platform.OS === 'web' ? persistentLocalCache() : memoryLocalCache(),
    });
  } catch {
    db = getFirestore(app);
  }

  return db;
}
