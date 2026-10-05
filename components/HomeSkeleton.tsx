import { View } from 'react-native';

import { colors } from '@/theme/tokens';

function Bar({ height, width, className }: { height: number; width?: number | `${number}%`; className?: string }) {
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

export function HomeSkeleton() {
  return (
    <View className="mt-lg" accessibilityLabel="Loading home">
      <Bar height={14} width="40%" />
      <Bar className="mt-sm" height={44} width="55%" />
      <Bar className="mt-sm" height={16} width="70%" />
      <View className="mt-xl flex-row" style={{ gap: 12 }}>
        <View className="flex-1">
          <Bar height={12} width="50%" />
          <Bar className="mt-sm" height={22} width="80%" />
        </View>
        <View className="flex-1">
          <Bar height={12} width="50%" />
          <Bar className="mt-sm" height={22} width="80%" />
        </View>
      </View>
      <Bar className="mt-xl" height={14} width="30%" />
      <Bar className="mt-md" height={56} />
      <Bar className="mt-sm" height={56} />
      <Bar className="mt-sm" height={56} />
    </View>
  );
}
