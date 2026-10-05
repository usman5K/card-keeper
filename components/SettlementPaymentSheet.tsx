import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/AmountField';
import { settlementMethods } from '@/features/settlements/settlementSchema';
import { colors } from '@/theme/tokens';
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
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <ScrollView
          className="max-h-[92%] rounded-t-2xl bg-background"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
          <Text className="text-xl font-semibold text-ink">Record payment</Text>
          <Text className="mt-sm text-sm text-muted">
            Settlements never change card balance. They reduce person outstanding only.
          </Text>
          <View className="mt-lg">
            <AmountField value={amountText} onChangeText={onChangeAmount} />
          </View>

          {isOwner ? (
            <>
              <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
                Person
              </Text>
              <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                {people.map((person) => {
                  const selected = person.id === payUserId;
                  return (
                    <Pressable
                      key={person.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`Select ${personDisplayName(person)}`}
                      className="rounded-lg border px-md py-sm"
                      style={{
                        borderColor: selected ? colors.accent : colors.border,
                        backgroundColor: selected ? colors.accentSoft : colors.surface,
                      }}
                      onPress={() => onChangePayUserId(person.id)}>
                      <Text style={{ color: selected ? colors.accent : colors.ink }}>
                        {personDisplayName(person)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
            Method
          </Text>
          <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
            {settlementMethods.map((item) => {
              const selected = item === method;
              return (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={settlementMethodLabel(item)}
                  className="rounded-lg border px-md py-sm"
                  style={{
                    borderColor: selected ? colors.accent : colors.border,
                    backgroundColor: selected ? colors.accentSoft : colors.surface,
                  }}
                  onPress={() => onChangeMethod(item)}>
                  <Text style={{ color: selected ? colors.accent : colors.ink }}>
                    {settlementMethodLabel(item)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={notes}
            onChangeText={onChangeNotes}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.muted}
            className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save settlement"
            className="mt-xl items-center rounded-lg bg-ink px-md py-md"
            disabled={busy}
            onPress={onSubmit}>
            <Text className="text-base font-semibold text-background">
              {busy ? 'Saving…' : isOwner ? 'Confirm payment' : 'Submit for confirmation'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel payment"
            className="mt-md items-center py-md"
            onPress={onClose}>
            <Text className="text-base text-muted">Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
