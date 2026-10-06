import { Redirect } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '@/features/auth/AuthProvider';
import { useGoogleSignIn } from '@/features/auth/useGoogleSignIn';
import { useTheme } from '@/features/theme/ThemeProvider';

export default function LoginScreen() {
  const { colors } = useTheme();
  const { user, loading, configured } = useAuth();
  const google = useGoogleSignIn();
  const insets = useSafeAreaInsets();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View
      className="flex-1 justify-center bg-background px-lg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <Text className="text-4xl font-bold text-ink">FuelLedger</Text>
      <Text className="mt-sm text-base text-muted">
        Manage shared fuel cards without the spreadsheet.
      </Text>

      {!configured ? (
        <Text className="mt-xl text-base" style={{ color: colors.offline }}>
          Add Firebase keys to `.env` before signing in.
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        className="mt-xl items-center rounded-lg bg-ink px-md py-md"
        disabled={!google.ready || google.busy}
        onPress={() => {
          void google.promptAsync();
        }}>
        <Text className="text-base font-semibold text-background">
          {google.busy ? 'Signing in…' : 'Continue with Google'}
        </Text>
      </Pressable>

      {!google.ready && configured ? (
        <Text className="mt-md text-sm text-muted">
          Android needs an Android OAuth client ID in `.env`. Web needs localhost redirect URIs.
        </Text>
      ) : null}

      {google.redirectUri ? (
        <Text className="mt-md text-xs text-muted" selectable>
          Redirect URI (add this in Google Cloud if using Web client):{'\n'}
          {google.redirectUri}
        </Text>
      ) : null}

      {google.error ? (
        <Text className="mt-md text-sm" style={{ color: colors.danger }}>
          {google.error}
        </Text>
      ) : null}
    </View>
  );
}
