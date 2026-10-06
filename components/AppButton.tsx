import { Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

type Props = Omit<PressableProps, 'style'> & {
  label: string;
  variant?: Variant;
  busy?: boolean;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

export function AppButton({
  label,
  variant = 'primary',
  busy = false,
  disabled,
  style,
  compact = false,
  ...rest
}: Props) {
  const { colors } = useTheme();
  const isDisabled = Boolean(disabled || busy);

  const backgroundColor =
    variant === 'primary'
      ? colors.accent
      : variant === 'danger'
        ? colors.danger
        : variant === 'secondary'
          ? colors.surface
          : 'transparent';

  const textColor =
    variant === 'primary' || variant === 'danger' ? '#FFFFFF' : colors.ink;

  const borderColor =
    variant === 'secondary' || variant === 'ghost' ? colors.border : backgroundColor;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          minHeight: compact ? 40 : a11y.minHit,
          paddingHorizontal: compact ? 12 : 16,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor,
          borderWidth: variant === 'secondary' || variant === 'ghost' ? 1 : 0,
          borderColor,
          opacity: isDisabled ? 0.45 : pressed ? 0.88 : 1,
        },
        style,
      ]}
      {...rest}>
      <Text
        style={{
          color: textColor,
          fontSize: compact ? 14 : 16,
          fontWeight: '700',
        }}>
        {busy ? 'Working…' : label}
      </Text>
    </Pressable>
  );
}
