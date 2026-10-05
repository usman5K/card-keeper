import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { getFirebaseAuth } from '@/firebase/auth';

WebBrowser.maybeCompleteAuthSession();

function readClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
  };
}

export function useGoogleSignIn() {
  const clients = readClientIds();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: clients.webClientId,
    iosClientId: clients.iosClientId,
    androidClientId: clients.androidClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken = response.params.id_token;
    if (!idToken) {
      setError('Google sign-in did not return an ID token.');
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setError('Firebase Auth is not configured.');
      return;
    }

    setBusy(true);
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Google sign-in failed.';
        setError(message);
      })
      .finally(() => {
        setBusy(false);
      });
  }, [response]);

  return {
    ready: Boolean(request) && Boolean(clients.webClientId || clients.iosClientId || clients.androidClientId),
    busy,
    error,
    promptAsync,
  };
}
