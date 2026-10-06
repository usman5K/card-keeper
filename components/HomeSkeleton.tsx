import { View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

function Bar({
  height,
  width,
  className,
  color,
}: {
  height: number;
  width?: number | `${number}%`;
  className?: string;
  color: string;
}) {
  return (
    <View
      className={className}
      style={{
        height,
        width: width ?? '100%',
        backgroundColor: color,
        borderRadius: 12,
      }}
    />
  );
}

export function HomeSkeleton() {
  const { colors } = useTheme();
  return (
    <View accessibilityLabel="Loading home">
      <Bar color={colors.border} height={120} />
      <View className="mt-lg flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Bar color={colors.border} height={72} />
        </View>
        <View className="flex-1">
          <Bar color={colors.border} height={72} />
        </View>
      </View>
      <Bar className="mt-xl" color={colors.border} height={14} width="30%" />
      <Bar className="mt-md" color={colors.border} height={56} />
      <Bar className="mt-sm" color={colors.border} height={56} />
    </View>
  );
}
