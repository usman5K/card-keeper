import { Text, View } from 'react-native';

export default function PeopleScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-md">
      <Text className="text-xl font-semibold text-ink">People</Text>
      <Text className="mt-sm text-center text-base text-muted">
        Members and outstanding balances will show here.
      </Text>
    </View>
  );
}
