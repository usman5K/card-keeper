import { Link } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { SyncBadge } from '@/components/SyncBadge';
import { useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';

export default function HomeScreen() {
  const { orgName } = useOrg();

  return (
    <View className="flex-1 bg-background px-md pt-lg">
      <View className="flex-row items-center justify-between">
        <SyncBadge status="online" />
        <Link href="/settings" accessibilityLabel="Open settings">
          <Text style={{ color: colors.accent }} className="text-sm font-medium">
            Settings
          </Text>
        </Link>
      </View>

      <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
        {orgName ?? 'Workspace'}
      </Text>
      <Text className="mt-sm text-sm font-medium uppercase tracking-wide text-muted">
        Available balance
      </Text>
      <Text className="mt-sm text-4xl font-bold text-ink">Rs 0</Text>
      <Text className="mt-sm text-base text-muted">
        Placeholder hero. Fuel entries will land here.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Fuel"
        className="mt-xl items-center rounded-lg bg-ink px-md py-md"
        onPress={() => undefined}>
        <Text className="text-base font-semibold text-background">Add Fuel</Text>
      </Pressable>
    </View>
  );
}
