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

export function ReportsSkeleton() {
  const { colors } = useTheme();
  return (
    <View className="mt-lg" accessibilityLabel="Loading reports">
      <Bar color={colors.border} height={14} width="30%" />
      <Bar className="mt-sm" color={colors.border} height={40} width="55%" />
      <Bar className="mt-sm" color={colors.border} height={16} width="45%" />
      <Bar className="mt-xl" color={colors.border} height={36} />
      <Bar className="mt-md" color={colors.border} height={36} />
      <Bar className="mt-xl" color={colors.border} height={14} width="28%" />
      <Bar className="mt-md" color={colors.border} height={64} />
      <Bar className="mt-sm" color={colors.border} height={64} />
      <Bar className="mt-sm" color={colors.border} height={64} />
    </View>
  );
}
