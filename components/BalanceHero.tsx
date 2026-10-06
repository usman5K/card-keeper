import { Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { formatPkr } from '@/utils/money';

type Props = {
  amount: number | null;
  trusted: boolean;
  label?: string;
  caption?: string;
  loading?: boolean;
  awaitingSync?: boolean;
};

export function BalanceHero({
  amount,
  trusted,
  label = 'Available balance',
  caption,
  loading = false,
  awaitingSync = false,
}: Props) {
  const { colors } = useTheme();
  const showSyncWarning = !trusted && awaitingSync && amount != null && !loading;

  return (
    <View className="rounded-2xl border border-border bg-surface px-md py-lg">
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
              : `Available balance ${formatPkr(amount)}${trusted ? '' : ', estimated'}`
          }>
          {amount == null ? 'Rs —' : formatPkr(amount)}
        </Text>
      )}
      {caption ? <Text className="mt-sm text-base text-muted">{caption}</Text> : null}
      {showSyncWarning ? (
        <Text className="mt-xs text-sm" style={{ color: colors.offline }}>
          Not final until server sync
        </Text>
      ) : null}
    </View>
  );
}
