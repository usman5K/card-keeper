import { Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';

type Props = {
  visible: boolean;
  message?: string;
};

export function OfflineBanner({
  visible,
  message = 'You are offline. Balances are last known, not final.',
}: Props) {
  const { colors, resolved } = useTheme();

  if (!visible) {
    return null;
  }

  return (
    <View
      accessibilityRole="alert"
      className="justify-center px-md"
      style={{
        backgroundColor: resolved === 'dark' ? '#3A2E14' : '#F5E6C8',
        minHeight: a11y.minHit,
      }}>
      <Text className="text-sm font-medium" style={{ color: colors.offline }}>
        {message}
      </Text>
    </View>
  );
}
