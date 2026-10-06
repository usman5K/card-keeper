import { Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

type Tone = 'success' | 'warning' | 'danger' | 'neutral';

type Props = {
  label: string;
  tone?: Tone;
};

export function StatusChip({ label, tone = 'neutral' }: Props) {
  const { colors } = useTheme();
  const tint =
    tone === 'success'
      ? colors.online
      : tone === 'warning'
        ? colors.offline
        : tone === 'danger'
          ? colors.danger
          : colors.muted;

  return (
    <View
      className="rounded-md px-sm py-xs"
      style={{ backgroundColor: `${tint}22` }}
      accessibilityLabel={label}>
      <Text className="text-xs font-semibold uppercase" style={{ color: tint }}>
        {label}
      </Text>
    </View>
  );
}
