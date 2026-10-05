import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

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
      className="px-md py-sm"
      style={{ backgroundColor: '#F5E6C8' }}>
      <Text className="text-sm font-medium" style={{ color: colors.offline }}>
        {message}
      </Text>
    </View>
  );
}
