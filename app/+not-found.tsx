import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View className="flex-1 items-center justify-center bg-background px-md">
        <Text className="text-xl font-semibold text-ink">Screen not found</Text>
        <Link href="/" className="mt-md">
          <Text className="text-base text-accent">Go home</Text>
        </Link>
      </View>
    </>
  );
}
