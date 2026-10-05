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

export function PeopleSkeleton() {
  return (
    <View className="mt-lg" accessibilityLabel="Loading people">
      <Bar height={14} width="35%" />
      <Bar className="mt-sm" height={44} width="50%" />
      <Bar className="mt-sm" height={16} width="60%" />
      <Bar className="mt-xl" height={14} width="25%" />
      <Bar className="mt-md" height={88} />
      <Bar className="mt-sm" height={88} />
      <Bar className="mt-sm" height={88} />
    </View>
  );
}
