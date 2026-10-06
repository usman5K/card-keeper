import { View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

function Bar({
  height,
  className,
  color,
}: {
  height: number;
  className?: string;
  color: string;
}) {
  return (
    <View
      className={className}
      style={{
        height,
        width: '100%',
        backgroundColor: color,
        borderRadius: 16,
      }}
    />
  );
}

export function CardsSkeleton() {
  const { colors } = useTheme();
  return (
    <View className="mt-lg px-md" accessibilityLabel="Loading cards">
      <Bar color={colors.border} height={148} />
      <Bar className="mt-md" color={colors.border} height={148} />
      <Bar className="mt-md" color={colors.border} height={148} />
    </View>
  );
}
