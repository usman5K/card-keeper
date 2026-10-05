import { Redirect, Stack, useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import { useSync } from '@/features/sync/SyncProvider';
import { a11y, colors } from '@/theme/tokens';

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuth();
  const { member } = useOrg();
  const { status } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';

  if (loading) {
    return (
      <View
        className="flex-1 bg-background px-md pt-lg"
        accessibilityLabel="Loading settings">
        <Stack.Screen options={{ title: 'Settings' }} />
        <View
          className="rounded-lg"
          style={{ height: 20, width: '55%', backgroundColor: colors.border }}
        />
        <View
          className="mt-xl rounded-lg"
          style={{ height: a11y.minHit, backgroundColor: colors.border }}
        />
        <View
          className="mt-md rounded-lg"
          style={{ height: a11y.minHit, backgroundColor: colors.border }}
        />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <OfflineBanner visible={status === 'offline'} />
      <View className="px-md pt-lg">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">Account</Text>
        <Text className="mt-sm text-base text-ink">{user.email ?? user.uid}</Text>

        {isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open audit log"
            className="mt-xl items-center rounded-lg border px-md"
            style={({ pressed }) => ({
              borderColor: colors.border,
              backgroundColor: colors.surface,
              minHeight: a11y.minHit,
              justifyContent: 'center',
              opacity: pressed ? 0.88 : 1,
            })}
            onPress={() => router.push('/audit')}>
            <Text className="text-base font-semibold text-ink">Audit log</Text>
          </Pressable>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign out"
          className="mt-xl items-center rounded-lg bg-ink px-md"
          style={({ pressed }) => ({
            minHeight: a11y.minHit,
            justifyContent: 'center',
            opacity: pressed ? 0.88 : 1,
          })}
          onPress={() => {
            void signOut();
          }}>
          <Text className="text-base font-semibold text-background">Sign out</Text>
        </Pressable>
      </View>
    </View>
  );
}
