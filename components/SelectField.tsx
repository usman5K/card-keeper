import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y } from '@/theme/tokens';

export type SelectOption = {
  value: string;
  label: string;
  detail?: string;
};

type Props = {
  label: string;
  value: string | null;
  options: SelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
};

const OPTIONS_MAX_HEIGHT = 220;

export function SelectField({
  label,
  value,
  options,
  placeholder = 'Select',
  onChange,
}: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((item) => item.value === value) ?? null;

  return (
    <View>
      <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((current) => !current)}
        style={{
          marginTop: 8,
          minHeight: a11y.minHit,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text
            numberOfLines={1}
            style={{
              color: selected ? colors.ink : colors.muted,
              fontSize: 16,
              fontWeight: '500',
            }}>
            {selected?.label ?? placeholder}
          </Text>
          {selected?.detail ? (
            <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
              {selected.detail}
            </Text>
          ) : null}
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <ChevronDown color={colors.muted} size={18} />
        </View>
      </Pressable>

      {open ? (
        <View
          style={{
            marginTop: 8,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            overflow: 'hidden',
            maxHeight: OPTIONS_MAX_HEIGHT,
          }}>
          {options.length === 0 ? (
            <Text style={{ color: colors.muted, fontSize: 14, padding: 14 }}>
              No options available
            </Text>
          ) : (
            <ScrollView
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: OPTIONS_MAX_HEIGHT }}
              bounces={options.length > 4}>
              {options.map((option, index) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                    style={{
                      minHeight: a11y.minHit,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: isSelected ? colors.accentSoft : 'transparent',
                      borderTopWidth: index === 0 ? 0 : 1,
                      borderTopColor: colors.border,
                    }}>
                    <Text
                      style={{
                        color: isSelected ? colors.accent : colors.ink,
                        fontSize: 16,
                        fontWeight: '500',
                      }}>
                      {option.label}
                    </Text>
                    {option.detail ? (
                      <Text style={{ color: colors.muted, fontSize: 13, marginTop: 2 }}>
                        {option.detail}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}
