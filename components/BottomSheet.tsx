import type { ReactNode } from 'react';
import {
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { vars } from 'nativewind';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y, themeCssVars } from '@/theme/tokens';

const SHEET_MAX = Math.round(Dimensions.get('window').height * 0.9);

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export function BottomSheet({ visible, title, onClose, children, footer }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={[{ flex: 1 }, vars(themeCssVars(colors))]}
        className="flex-1 justify-end"
        // Keep dimmer independent of theme surface.
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' }}
          onPress={onClose}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            style={{
              maxHeight: SHEET_MAX,
              backgroundColor: colors.background,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderColor: colors.border,
            }}>
            <View className="flex-row items-center justify-between px-md pt-md pb-sm">
              <Text className="flex-1 pr-md text-xl font-semibold text-ink">{title}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={{
                  minHeight: a11y.minHit,
                  minWidth: a11y.minHit,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                <Text style={{ color: colors.muted, fontSize: 16, fontWeight: '600' }}>Close</Text>
              </Pressable>
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: SHEET_MAX - 160 }}
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: footer ? 12 : Math.max(insets.bottom, 16) + 16,
              }}>
              {children}
            </ScrollView>
            {footer ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border,
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: Math.max(insets.bottom, 12) + 8,
                  backgroundColor: colors.background,
                  gap: 8,
                }}>
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
