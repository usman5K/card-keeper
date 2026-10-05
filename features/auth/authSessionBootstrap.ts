import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';

import { getFirebaseAuth } from '@/firebase/auth';

function readHashParams() {
  if (typeof window === 'undefined') {
    return null;
  }
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) {
    return null;
  }
  return new URLSearchParams(raw);
}

// Must run before Expo Router rewrites the OAuth return URL.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  try {
    WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });
  } catch {
    // Parent window missing or no session in progress.
  }

  const params = readHashParams();
  const idToken = params?.get('id_token');
  if (idToken) {
    const auth = getFirebaseAuth();
    if (auth) {
      void signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
        .then(() => {
          const path = window.location.pathname || '/';
          window.history.replaceState({}, document.title, path);
        })
        .catch(() => undefined);
    }
  }
}
