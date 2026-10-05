import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { a11y, colors } from '@/theme/tokens';

type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View className="flex-1 justify-end bg-black/40">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation"
          className="flex-1"
          onPress={onCancel}
          disabled={busy}
        />
        <View
          className="rounded-t-2xl bg-background px-md pt-lg"
          style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
          <Text className="text-xl font-semibold text-ink">{title}</Text>
          <Text className="mt-sm text-base text-muted">{body}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={confirmLabel}
            accessibilityState={{ disabled: busy }}
            className="mt-lg items-center rounded-lg px-md"
            style={{
              minHeight: a11y.minHit,
              justifyContent: 'center',
              backgroundColor: destructive ? colors.danger : colors.ink,
              opacity: busy ? 0.6 : 1,
            }}
            disabled={busy}
            onPress={onConfirm}>
            <Text className="text-base font-semibold text-background">
              {busy ? 'Working…' : confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={cancelLabel}
            accessibilityState={{ disabled: busy }}
            className="mt-sm items-center rounded-lg border border-border px-md"
            style={{ minHeight: a11y.minHit, justifyContent: 'center' }}
            disabled={busy}
            onPress={onCancel}>
            <Text className="text-base font-semibold text-ink">{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
