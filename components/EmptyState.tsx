import { Text, View } from 'react-native';

type EmptyStateProps = {
  title: string;
  body: string;
};

export function EmptyState({ title, body }: EmptyStateProps) {
  return (
    <View className="items-center px-md py-xl">
      <Text className="text-lg font-semibold text-ink">{title}</Text>
      <Text className="mt-sm text-center text-base text-muted">{body}</Text>
    </View>
  );
}
