import { Text, View } from 'react-native';

export default function CardsScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background px-md">
      <Text className="text-xl font-semibold text-ink">Cards</Text>
      <Text className="mt-sm text-center text-base text-muted">
        Fuel cards will show here.
      </Text>
    </View>
  );
}
