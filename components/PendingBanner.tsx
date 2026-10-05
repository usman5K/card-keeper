import { Pressable, Text, View } from 'react-native';

import { colors } from '@/theme/tokens';
import type { PendingAction } from '@/utils/homeDashboard';

type Props = {
  actions: PendingAction[];
  onPressAction: (action: PendingAction) => void;
};

function toneFor(kind: PendingAction['kind']) {
  if (kind === 'conflict') {
    return { bg: '#FCEBEA', fg: colors.danger };
  }
  if (kind === 'sync') {
    return { bg: '#F5E6C8', fg: colors.offline };
  }
  return { bg: colors.accentSoft, fg: colors.accent };
}

export function PendingBanner({ actions, onPressAction }: Props) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View className="mt-lg" style={{ gap: 8 }}>
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">Pending</Text>
      {actions.map((action) => {
        const tone = toneFor(action.kind);
        const interactive = action.href != null;
        const body = (
          <View className="rounded-lg px-md py-sm" style={{ backgroundColor: tone.bg }}>
            <Text className="text-sm font-medium" style={{ color: tone.fg }}>
              {action.label}
            </Text>
          </View>
        );

        if (!interactive) {
          return (
            <View key={action.id} accessibilityRole="text">
              {body}
            </View>
          );
        }

        return (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onPressAction(action)}>
            {body}
          </Pressable>
        );
      })}
    </View>
  );
}
