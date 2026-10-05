import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme/tokens';

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 bg-background px-md pt-lg">
      <Stack.Screen options={{ title: 'Settings' }} />
      <Text className="text-base text-ink">{user.email ?? user.uid}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Sign out"
        className="mt-xl items-center rounded-lg bg-ink px-md py-md"
        onPress={() => {
          void signOut();
        }}>
        <Text className="text-base font-semibold text-background">Sign out</Text>
      </Pressable>
    </View>
  );
}
