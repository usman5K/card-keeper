const REQUIRED_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

export type FirebasePublicEnv = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

type EnvSource = Record<string, string | undefined>;

function read(source: EnvSource, key: (typeof REQUIRED_KEYS)[number]) {
  const value = source[key]?.trim();
  return value ? value : null;
}

export function getMissingFirebaseEnvKeys(source: EnvSource = process.env) {
  return REQUIRED_KEYS.filter((key) => !read(source, key));
}

export function isFirebaseConfigured(source: EnvSource = process.env) {
  return getMissingFirebaseEnvKeys(source).length === 0;
}

export function readFirebasePublicEnv(source: EnvSource = process.env): FirebasePublicEnv | null {
  if (!isFirebaseConfigured(source)) {
    return null;
  }

  return {
    apiKey: read(source, 'EXPO_PUBLIC_FIREBASE_API_KEY')!,
    authDomain: read(source, 'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN')!,
    projectId: read(source, 'EXPO_PUBLIC_FIREBASE_PROJECT_ID')!,
    storageBucket: read(source, 'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET')!,
    messagingSenderId: read(source, 'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID')!,
    appId: read(source, 'EXPO_PUBLIC_FIREBASE_APP_ID')!,
  };
}
