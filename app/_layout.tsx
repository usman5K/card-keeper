import { useFonts } from 'expo-font';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { PropsWithChildren, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import 'react-native-reanimated';
import '../global.css';

import { AuthProvider, useAuth } from '@/features/auth/AuthProvider';
import { OrgProvider, useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const { ready, orgId } = useOrg();
  const segments = useSegments();
  const route = segments[0];
  const onLogin = route === 'login';
  const onOnboarding = route === 'onboarding';

  if (loading || (user && !ready)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user && !onLogin) {
    return <Redirect href="/login" />;
  }

  if (user && onLogin) {
    return <Redirect href={orgId ? '/(tabs)' : '/onboarding'} />;
  }

  if (user && !orgId && !onOnboarding) {
    return <Redirect href="/onboarding" />;
  }

  if (user && orgId && onOnboarding) {
    return <Redirect href="/(tabs)" />;
  }

  return children;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <OrgProvider>
        <AuthGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </AuthGate>
      </OrgProvider>
    </AuthProvider>
  );
}
