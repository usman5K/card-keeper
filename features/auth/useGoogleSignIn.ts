import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getFirebaseAuth } from '@/firebase/auth';

WebBrowser.maybeCompleteAuthSession();

function readClientIds() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined;
  const iosClientId =
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || webClientId;
  const androidClientId =
    process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || webClientId;

  return { webClientId, iosClientId, androidClientId };
}

export function useGoogleSignIn() {
  const clients = useMemo(() => readClientIds(), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const platformReady =
    Platform.OS === 'ios'
      ? Boolean(clients.iosClientId)
      : Platform.OS === 'android'
        ? Boolean(clients.androidClientId)
        : Boolean(clients.webClientId);

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
    ready: Boolean(request) && platformReady,
    busy,
    error,
    promptAsync,
  };
}
