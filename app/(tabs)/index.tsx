import { Host, Button } from '@expo/ui';
import { Text, View } from 'react-native';

import { SyncBadge } from '@/components/SyncBadge';

export default function HomeScreen() {
  return (
    <View className="flex-1 bg-background px-md pt-lg">
      <SyncBadge status="online" />

      <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
        Available balance
      </Text>
      <Text className="mt-sm text-4xl font-bold text-ink">Rs 0</Text>
      <Text className="mt-sm text-base text-muted">
        Placeholder hero. Fuel entries will land here.
      </Text>

      <View className="mt-xl">
        <Host matchContents>
          <Button label="Add Fuel (smoke)" onPress={() => {}} />
        </Host>
      </View>
    </View>
  );
}
