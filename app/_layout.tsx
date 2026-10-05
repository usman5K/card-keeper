import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { OrgProvider, useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

if (Platform.OS !== 'web') {
  SplashScreen.preventAutoHideAsync().catch(() => undefined);
}

function AuthRedirect() {
  const { user, loading } = useAuth();
  const { ready, orgId } = useOrg();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading || (user && !ready)) {
      return;
    }

    const route = segments[0];
    const onLogin = route === 'login';
    const onOnboarding = route === 'onboarding';

    if (!user && !onLogin) {
      router.replace('/login');
      return;
    }

    if (user && onLogin) {
      router.replace(orgId ? '/(tabs)' : '/onboarding');
      return;
    }

    if (user && !orgId && !onOnboarding) {
      router.replace('/onboarding');
      return;
    }

    if (user && orgId && onOnboarding) {
      router.replace('/(tabs)');
    }
  }, [user, loading, ready, orgId, segments, router]);

  if (loading || (user && !ready)) {
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
    <AuthProvider>
      <OrgProvider>
        <View className="flex-1 bg-background">
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
          <AuthRedirect />
        </View>
      </OrgProvider>
    </AuthProvider>
  );
}
