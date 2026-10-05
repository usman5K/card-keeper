import { View } from 'react-native';

import { colors } from '@/theme/tokens';

function Bar({
  height,
  width,
  className,
}: {
  height: number;
  width?: number | `${number}%`;
  className?: string;
}) {
  return (
    <View
      className={className}
      style={{
        height,
        width: width ?? '100%',
        backgroundColor: colors.border,
        borderRadius: 8,
      }}
    />
  );
}

export function ReportsSkeleton() {
  return (
    <View className="mt-lg" accessibilityLabel="Loading reports">
      <Bar height={14} width="30%" />
      <Bar className="mt-sm" height={40} width="55%" />
      <Bar className="mt-sm" height={16} width="45%" />
      <Bar className="mt-xl" height={36} />
      <Bar className="mt-md" height={36} />
      <Bar className="mt-xl" height={14} width="28%" />
      <Bar className="mt-md" height={64} />
      <Bar className="mt-sm" height={64} />
      <Bar className="mt-sm" height={64} />
    </View>
  );
}
