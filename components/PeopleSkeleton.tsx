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

export function PeopleSkeleton() {
  const { colors } = useTheme();
  return (
    <View className="mt-lg" accessibilityLabel="Loading people">
      <Bar color={colors.border} height={14} width="35%" />
      <Bar className="mt-sm" color={colors.border} height={44} width="50%" />
      <Bar className="mt-sm" color={colors.border} height={16} width="60%" />
      <Bar className="mt-xl" color={colors.border} height={14} width="25%" />
      <Bar className="mt-md" color={colors.border} height={88} />
      <Bar className="mt-sm" color={colors.border} height={88} />
      <Bar className="mt-sm" color={colors.border} height={88} />
    </View>
  );
}
