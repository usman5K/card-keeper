import { Text, TextInput, View } from 'react-native';

import { AmountField } from '@/components/AmountField';
import { AppButton } from '@/components/AppButton';
import { BottomSheet } from '@/components/BottomSheet';
import { SelectField } from '@/components/SelectField';
import { SheetActions } from '@/components/SheetActions';
import { settlementMethods } from '@/features/settlements/settlementSchema';
import { useTheme } from '@/features/theme/ThemeProvider';
import { personDisplayName, settlementMethodLabel } from '@/utils/peopleDashboard';

type PersonOption = {
  id: string;
  displayName: string | null;
  email: string;
};

type Props = {
  visible: boolean;
  busy: boolean;
  isOwner: boolean;
  amountText: string;
  method: (typeof settlementMethods)[number];
  notes: string;
  payUserId: string | null;
  people: PersonOption[];
  onChangeAmount: (value: string) => void;
  onChangeMethod: (value: (typeof settlementMethods)[number]) => void;
  onChangeNotes: (value: string) => void;
  onChangePayUserId: (userId: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function SettlementPaymentSheet({
  visible,
  busy,
  isOwner,
  amountText,
  method,
  notes,
  payUserId,
  people,
  onChangeAmount,
  onChangeMethod,
  onChangeNotes,
  onChangePayUserId,
  onSubmit,
  onClose,
}: Props) {
  const { colors } = useTheme();

  return (
    <BottomSheet
      visible={visible}
      title="Record payment"
      onClose={onClose}
      footer={
        <SheetActions>
          <AppButton label="Cancel" variant="secondary" disabled={busy} onPress={onClose} />
          <AppButton
            label={
              busy
                ? 'Saving…'
                : isOwner
                  ? 'Confirm'
                  : 'Submit'
            }
            busy={busy}
            onPress={onSubmit}
          />
        </SheetActions>
      }>
      <Text className="text-sm text-muted">
        Settlements never change card balance. They reduce person outstanding only.
      </Text>
      <View className="mt-lg">
        <AmountField value={amountText} onChangeText={onChangeAmount} />
      </View>

      {isOwner ? (
        <View className="mt-lg">
          <SelectField
            label="Person"
            value={payUserId}
            options={people.map((person) => ({
              value: person.id,
              label: personDisplayName(person),
              detail: person.email,
            }))}
            placeholder="Choose person"
            onChange={onChangePayUserId}
          />
        </View>
      ) : null}

      <View className="mt-lg">
        <SelectField
          label="Method"
          value={method}
          options={settlementMethods.map((item) => ({
            value: item,
            label: settlementMethodLabel(item),
          }))}
          onChange={(value) =>
            onChangeMethod(value as (typeof settlementMethods)[number])
          }
        />
      </View>

      <TextInput
        value={notes}
        onChangeText={onChangeNotes}
        placeholder="Notes (optional)"
        placeholderTextColor={colors.muted}
        style={{
          marginTop: 16,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          color: colors.ink,
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          fontSize: 16,
        }}
      />
    </BottomSheet>
  );
}
