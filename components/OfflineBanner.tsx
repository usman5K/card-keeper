import { Text, View } from 'react-native';

import { a11y, colors } from '@/theme/tokens';

type Props = {
  visible: boolean;
  message?: string;
};

export function OfflineBanner({
  visible,
  message = 'You are offline. Balances are last known, not final.',
}: Props) {
  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      className="justify-center px-md"
      style={{ backgroundColor: '#F5E6C8', minHeight: a11y.minHit }}>
      <Text className="text-sm font-medium" style={{ color: colors.offline }}>
        {message}
      </Text>
    </View>
  );
}
