import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { getFirebaseAuth } from '@/firebase/auth';

WebBrowser.maybeCompleteAuthSession({ skipRedirectCheck: true });

function readClientIds() {
  return {
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim() || undefined,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim() || undefined,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.trim() || undefined,
  };
}

function missingClientMessage() {
  if (Platform.OS === 'android') {
    return 'Set EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to an Android OAuth client (not the Web client). See SETUP.md.';
  }
  if (Platform.OS === 'ios') {
    return 'Set EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to an iOS OAuth client. See SETUP.md.';
  }
  return 'Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and add localhost redirect URIs in Google Cloud.';
}

function authErrorMessage(err: unknown) {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = String((err as { code?: string }).code ?? '');
    if (code === 'auth/unauthorized-domain') {
      return 'Add this domain under Firebase Auth authorized domains.';
    }
  }
  return err instanceof Error ? err.message : 'Google sign-in failed.';
}

export function useGoogleSignIn() {
  const clients = useMemo(() => readClientIds(), []);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const redirectUri = useMemo(() => AuthSession.makeRedirectUri(), []);

  const platformClientId =
    Platform.OS === 'ios'
      ? clients.iosClientId
      : Platform.OS === 'android'
        ? clients.androidClientId
        : clients.webClientId;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: clients.webClientId,
    iosClientId: clients.iosClientId || clients.webClientId,
    androidClientId: clients.androidClientId || clients.webClientId,
    redirectUri,
  });

  useEffect(() => {
    if (!platformClientId) {
      setError(missingClientMessage());
    }
  }, [platformClientId]);

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') {
        setError(response.error?.message ?? 'Google sign-in was rejected.');
      }
      return;
    }

    const idToken =
      response.params.id_token ??
      response.authentication?.idToken ??
      undefined;

    if (!idToken) {
      setError('Google sign-in did not return an ID token. Check OAuth client type and redirect URIs.');
      return;
    }

    const auth = getFirebaseAuth();
    if (!auth) {
      setError('Firebase Auth is not configured.');
      return;
    }

    setBusy(true);
    setError(null);
    signInWithCredential(auth, GoogleAuthProvider.credential(idToken))
      .then(async () => {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location.hash) {
          const path = window.location.pathname || '/';
          window.history.replaceState({}, document.title, path);
        }
      })
      .catch((err: unknown) => {
        setError(authErrorMessage(err));
      })
      .finally(() => {
        setBusy(false);
      });
  }, [response]);

  async function startSignIn() {
    setError(null);
    if (Platform.OS === 'web') {
      if (!request?.url) {
        setError('Google sign-in is not ready yet.');
        return;
      }
      setBusy(true);
      // Same-window redirect so Firebase can persist auth (popup storage is unreliable here).
      window.location.assign(request.url);
      return;
    }

    setBusy(true);
    try {
      await promptAsync();
    } catch (err: unknown) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return {
    ready: Boolean(request) && Boolean(platformClientId),
    busy,
    error,
    redirectUri: request?.redirectUri ?? redirectUri,
    promptAsync: startSignIn,
  };
}
