import { Modal, Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vars } from 'nativewind';

import { AppButton } from '@/components/AppButton';
import { SheetActions } from '@/components/SheetActions';
import { useTheme } from '@/features/theme/ThemeProvider';
import { themeCssVars } from '@/theme/tokens';

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
  const { colors } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onCancel}>
      <View style={[{ flex: 1 }, vars(themeCssVars(colors))]} className="flex-1 justify-end">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss confirmation"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          onPress={onCancel}
          disabled={busy}
        />
        <View
          style={{
            backgroundColor: colors.background,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: Math.max(insets.bottom, 16) + 8,
          }}>
          <Text style={{ color: colors.ink, fontSize: 20, fontWeight: '700' }}>{title}</Text>
          <Text style={{ color: colors.muted, fontSize: 16, marginTop: 8 }}>{body}</Text>
          <View style={{ marginTop: 20 }}>
            <SheetActions>
              <AppButton
                label={cancelLabel}
                variant="secondary"
                disabled={busy}
                onPress={onCancel}
              />
              <AppButton
                label={confirmLabel}
                variant={destructive ? 'danger' : 'primary'}
                busy={busy}
                onPress={onConfirm}
              />
            </SheetActions>
          </View>
        </View>
      </View>
    </Modal>
  );
}
