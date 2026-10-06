import { Pressable, Text, View } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';
import type { ThemePreference } from '@/theme/tokens';

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemePicker() {
  const { preference, setPreference, colors } = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: 12,
        padding: 4,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        gap: 4,
      }}
      accessibilityRole="radiogroup"
      accessibilityLabel="Appearance">
      {OPTIONS.map((option) => {
        const selected = preference === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={`${option.label} appearance`}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: a11y.minHit,
              borderRadius: 10,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 8,
              backgroundColor: selected ? colors.accent : 'transparent',
              opacity: pressed ? 0.9 : 1,
            })}
            onPress={() => setPreference(option.value)}>
            <Text
              style={{
                color: selected ? '#FFFFFF' : colors.ink,
                fontSize: 14,
                fontWeight: '700',
              }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
