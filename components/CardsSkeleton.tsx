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

export function CardsSkeleton() {
  return (
    <View className="mt-lg px-md" accessibilityLabel="Loading cards">
      <Bar height={88} />
      <Bar className="mt-md" height={88} />
      <Bar className="mt-md" height={88} />
    </View>
  );
}
