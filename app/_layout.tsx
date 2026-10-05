import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';
import '@/features/auth/authSessionBootstrap';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { OrgProvider, useOrg } from '@/features/org/OrgProvider';
import { SyncProvider } from '@/features/sync/SyncProvider';
import { getFirebaseAuth } from '@/firebase/auth';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'login',
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  const { ready, orgId } = useOrg();
  const segments = useSegments();
  const router = useRouter();
  const liveUser = getFirebaseAuth()?.currentUser ?? user;
  const waiting = loading || (Boolean(liveUser) && !user) || (Boolean(user) && !ready);

  useEffect(() => {
    if (waiting) {
      return;
    }

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined' &&
      (window.location.hash.includes('id_token') || window.location.hash.includes('access_token'))
    ) {
      return;
    }

    const route = segments[0];
    const onLogin = route === 'login';
    const onOnboarding = route === 'onboarding';
    const signedIn = Boolean(liveUser);

    if (!signedIn && !onLogin) {
      router.replace('/login');
      return;
    }

    if (signedIn && onLogin) {
      router.replace(orgId ? '/(tabs)' : '/onboarding');
      return;
    }

    if (signedIn && !orgId && !onOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (signedIn && orgId && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [liveUser, waiting, orgId, segments, router]);

  if (waiting) {
    return (
      <View className="absolute inset-0 z-50 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded && Platform.OS !== 'web') {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [loaded]);

  if (!loaded) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <OrgProvider>
          <SyncProvider>
            <View className="flex-1 bg-background">
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="login" options={{ headerShown: false }} />
                <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ title: 'Settings' }} />
                <Stack.Screen name="conflicts" options={{ title: 'Conflict review' }} />
              </Stack>
              <AuthRedirect />
            </View>
          </SyncProvider>
        </OrgProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
