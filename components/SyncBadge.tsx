import {
  AlertCircle,
  Check,
  Loader,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors } from '@/theme/tokens';
import { syncUiLabel, type SyncUiStatus } from '@/utils/syncStatus';

type Props = {
  status?: SyncUiStatus;
  pendingCount?: number;
  conflictCount?: number;
  pressable?: boolean;
};

function tintFor(status: SyncUiStatus) {
  switch (status) {
    case 'offline':
      return colors.offline;
    case 'pending':
    case 'syncing':
      return colors.offline;
    case 'conflict':
    case 'failed':
      return colors.danger;
    case 'synced':
    case 'online':
    default:
      return colors.online;
  }
}

function IconFor({ status, tint }: { status: SyncUiStatus; tint: string }) {
  switch (status) {
    case 'offline':
      return <WifiOff color={tint} size={14} />;
    case 'syncing':
      return <RefreshCw color={tint} size={14} />;
    case 'synced':
      return <Check color={tint} size={14} />;
    case 'pending':
      return <Loader color={tint} size={14} />;
    case 'conflict':
    case 'failed':
      return <AlertCircle color={tint} size={14} />;
    case 'online':
    default:
      return <Wifi color={tint} size={14} />;
  }
}

export function SyncBadge({
  status = 'online',
  pendingCount = 0,
  conflictCount = 0,
  pressable = true,
}: Props) {
  const router = useRouter();
  const tint = tintFor(status);
  const label = syncUiLabel(status);
  const detail =
    status === 'conflict' && conflictCount > 0
      ? ` · ${conflictCount}`
      : status === 'pending' && pendingCount > 0
        ? ` · ${pendingCount}`
        : '';

  const content = (
    <View className="flex-row items-center self-start rounded-full bg-accent-soft px-3 py-1.5">
      <IconFor status={status} tint={tint} />
      <Text style={{ color: tint, marginLeft: 8 }} className="text-sm font-medium">
        {label}
        {detail}
      </Text>
    </View>
  );

  if (!pressable) {
    return content;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Sync status ${label}${detail}`}
      onPress={() => {
        if (status === 'conflict' || conflictCount > 0) {
          router.push('/conflicts');
        }
      }}>
      {content}
    </Pressable>
  );
}
