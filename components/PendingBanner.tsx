import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import type { PendingAction } from '@/utils/homeDashboard';

type Props = {
  actions: PendingAction[];
  onPressAction: (action: PendingAction) => void;
};

export function PendingBanner({ actions, onPressAction }: Props) {
  const { colors, resolved } = useTheme();

  if (actions.length === 0) {
    return null;
  }

  return (
    <View className="mt-lg" style={{ gap: 8 }}>
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">Pending</Text>
      {actions.map((action) => {
        const tone =
          action.kind === 'conflict'
            ? {
                bg: resolved === 'dark' ? '#3A1D1A' : '#FCEBEA',
                fg: colors.danger,
              }
            : action.kind === 'sync'
              ? {
                  bg: resolved === 'dark' ? '#3A2E14' : '#F5E6C8',
                  fg: colors.offline,
                }
              : { bg: colors.accentSoft, fg: colors.accent };

        const body = (
          <View className="rounded-xl px-md py-md" style={{ backgroundColor: tone.bg }}>
            <Text className="text-sm font-medium" style={{ color: tone.fg }}>
              {action.label}
            </Text>
          </View>
        );

        if (action.href == null) {
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
