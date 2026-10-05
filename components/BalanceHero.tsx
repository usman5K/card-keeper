import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import { formatPkr } from '@/utils/money';

type Props = {
  amount: number | null;
  trusted: boolean;
  label?: string;
  caption?: string;
  loading?: boolean;
};

export function BalanceHero({
  amount,
  trusted,
  label = 'Available balance',
  caption,
  loading = false,
}: Props) {
  return (
    <View>
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">{label}</Text>
      {loading ? (
        <View
          className="mt-sm rounded-lg"
          style={{ height: 44, width: 180, backgroundColor: colors.border }}
        />
      ) : (
        <Text
          className="mt-sm text-4xl font-bold text-ink"
          accessibilityLabel={
            amount == null
              ? 'Available balance unknown'
              : `Available balance ${formatPkr(amount)}${trusted ? '' : ', last known'}`
          }>
          {amount == null ? 'Rs —' : formatPkr(amount)}
        </Text>
      )}
      {caption ? <Text className="mt-sm text-base text-muted">{caption}</Text> : null}
      {!trusted && amount != null && !loading ? (
        <Text className="mt-xs text-sm" style={{ color: colors.offline }}>
          Last known, not final
        </Text>
      ) : null}
    </View>
  );
}
