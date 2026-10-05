import { Text, View } from 'react-native';

export default function ReportsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-md">
      <Text className="text-xl font-semibold text-ink">Reports</Text>
      <Text className="mt-sm text-center text-base text-muted">
        Spend summaries and exports will show here.
      </Text>
    </View>
  );
}
