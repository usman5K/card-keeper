import { Link } from 'expo-router';
import { Host, Button } from '@expo/ui';
import { Text, View } from 'react-native';

import { SyncBadge } from '@/components/SyncBadge';
import { colors } from '@/theme/tokens';

export default function HomeScreen() {
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
        Available balance
      </Text>
      <Text className="mt-sm text-4xl font-bold text-ink">Rs 0</Text>
      <Text className="mt-sm text-base text-muted">
        Placeholder hero. Fuel entries will land here.
      </Text>
      <Text className="mt-md text-sm text-muted">Workspace loads after Firebase is configured.</Text>

      <View className="mt-xl">
        <Host matchContents>
          <Button label="Add Fuel (smoke)" onPress={() => {}} />
        </Host>
      </View>
    </View>
  );
}
