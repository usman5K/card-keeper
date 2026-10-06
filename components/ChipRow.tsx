import { Pressable, ScrollView, Text } from 'react-native';

import { useTheme } from '@/features/theme/ThemeProvider';

type Props = {
  options: string[];
  onSelect: (value: string) => void;
  selected?: string | null;
};

export function ChipRow({ options, onSelect, selected = null }: Props) {
  const { colors } = useTheme();

  if (options.length === 0) {
    return null;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingVertical: 4 }}>
      {options.map((option) => {
        const isSelected = option === selected;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(option)}
            style={{
              minHeight: 36,
              paddingHorizontal: 12,
              borderRadius: 999,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: isSelected ? colors.accent : colors.border,
              backgroundColor: isSelected ? colors.accent : colors.surface,
            }}>
            <Text
              style={{
                color: isSelected ? '#FFFFFF' : colors.ink,
                fontSize: 13,
                fontWeight: '600',
              }}>
              {option}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
