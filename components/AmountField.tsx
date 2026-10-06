import { Text, TextInput, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

type AmountFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  label?: string;
  accessibilityLabel?: string;
};

export function AmountField({
  value,
  onChangeText,
  label = 'Amount (PKR)',
  accessibilityLabel = 'Amount in PKR',
}: AmountFieldProps) {
  const { colors } = useTheme();

  return (
    <View>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.6 }}>
        {label.toUpperCase()}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.muted}
        accessibilityLabel={accessibilityLabel}
        style={{
          marginTop: 8,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.ink,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 32,
          fontWeight: '700',
        }}
      />
    </View>
  );
}
