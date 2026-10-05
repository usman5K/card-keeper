import { Text, TextInput, View } from 'react-native';

import { colors } from '@/theme/tokens';

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
  return (
    <View>
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="number-pad"
        placeholder="0"
        placeholderTextColor={colors.muted}
        accessibilityLabel={accessibilityLabel}
        className="mt-sm rounded-lg border border-border bg-surface px-md py-md text-3xl font-bold text-ink"
      />
    </View>
  );
}
