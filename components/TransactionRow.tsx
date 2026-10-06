import { Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import type { SyncStatus } from '@/types/ledger';
import { formatPkr } from '@/utils/money';

type TransactionRowProps = {
  amount: number;
  title: string;
  subtitle: string;
  syncStatus?: SyncStatus;
};

export function TransactionRow({ amount, title, subtitle, syncStatus }: TransactionRowProps) {
  const { colors } = useTheme();
  const statusColor =
    syncStatus === 'CONFLICT' || syncStatus === 'FAILED'
      ? colors.danger
      : syncStatus === 'PENDING'
        ? colors.offline
        : colors.online;

  return (
    <View className="border-b border-border py-md">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-md">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          <Text className="mt-xs text-sm text-muted">{subtitle}</Text>
        </View>
        <View className="items-end">
          <Text className="text-base font-semibold text-ink">{formatPkr(amount)}</Text>
          {syncStatus ? (
            <Text className="mt-xs text-xs uppercase" style={{ color: statusColor }}>
              {syncStatus}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}
