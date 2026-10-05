import { Wifi, WifiOff } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { colors } from '@/theme/tokens';

type SyncStatus = 'online' | 'offline';

type Props = {
  status?: SyncStatus;
};

export function SyncBadge({ status = 'online' }: Props) {
  const isOnline = status === 'online';
  const tint = isOnline ? colors.online : colors.offline;
  const Icon = isOnline ? Wifi : WifiOff;

  return (
    <View className="flex-row items-center self-start rounded-full bg-accent-soft px-3 py-1.5">
      <Icon color={tint} size={14} />
      <Text style={{ color: tint, marginLeft: 8 }} className="text-sm font-medium">
        {isOnline ? 'Online' : 'Offline'}
      </Text>
    </View>
  );
}
