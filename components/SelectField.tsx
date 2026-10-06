import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { vars } from 'nativewind';

import { useTheme } from '@/features/theme/ThemeProvider';
import { a11y, themeCssVars } from '@/theme/tokens';

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
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder}`}
        className="mt-sm flex-row items-center justify-between rounded-xl border px-md"
        style={{
          minHeight: a11y.minHit,
          borderColor: colors.border,
          backgroundColor: colors.surface,
        }}
        onPress={() => setOpen(true)}>
        <View className="flex-1 pr-sm">
          <Text
            className="text-base font-medium"
            style={{ color: selected ? colors.ink : colors.muted }}
            numberOfLines={1}>
            {selected?.label ?? placeholder}
          </Text>
          {selected?.detail ? (
            <Text className="mt-xs text-sm" style={{ color: colors.muted }} numberOfLines={1}>
              {selected.detail}
            </Text>
          ) : null}
        </View>
        <ChevronDown color={colors.muted} size={18} />
      </Pressable>

      <Modal visible={open} animationType="fade" transparent onRequestClose={() => setOpen(false)}>
        <View style={[{ flex: 1 }, vars(themeCssVars(colors))]} className="flex-1 justify-end">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss options"
            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }}
            onPress={() => setOpen(false)}
          />
          <View
            style={{
              maxHeight: '70%',
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              borderTopWidth: 1,
              borderColor: colors.border,
              paddingBottom: 20,
            }}>
            <Text className="px-md pt-md text-base font-semibold text-ink">{label}</Text>
            <ScrollView keyboardShouldPersistTaps="handled" className="mt-sm">
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    className="flex-row items-center justify-between px-md py-md"
                    style={{
                      minHeight: a11y.minHit,
                      backgroundColor: isSelected ? colors.accentSoft : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    }}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}>
                    <View className="flex-1 pr-md">
                      <Text
                        className="text-base font-medium"
                        style={{ color: isSelected ? colors.accent : colors.ink }}>
                        {option.label}
                      </Text>
                      {option.detail ? (
                        <Text className="mt-xs text-sm" style={{ color: colors.muted }}>
                          {option.detail}
                        </Text>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Text style={{ color: colors.accent, fontWeight: '700' }}>Selected</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
