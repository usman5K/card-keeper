import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/AmountField';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { listAllCards } from '@/features/cards/cardService';
import { useOrg } from '@/features/org/OrgProvider';
import {
  listActiveMembers,
  setMemberAssignedCards,
  type OrgMemberDoc,
} from '@/features/org/orgService';
import {
  settlementMethods,
  type SettlementInput,
} from '@/features/settlements/settlementSchema';
import {
  confirmSettlement,
  createSettlement,
  getPersonOutstanding,
  listPendingSettlements,
  type SettlementDoc,
} from '@/features/settlements/settlementService';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { formatPkr, parsePkrInput } from '@/utils/money';

type OutstandingMap = Record<
  string,
  { outstanding: number; fuelTotal: number; settledTotal: number }
>;

const METHOD_LABELS: Record<(typeof settlementMethods)[number], string> = {
  cash: 'Cash',
  bank: 'Bank',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  other: 'Other',
};

export default function PeopleScreen() {
  const { user } = useAuth();
  const { orgId, orgName, member, inviteEmail, refresh } = useOrg();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMemberDoc[]>([]);
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingMap>({});
  const [pending, setPending] = useState<SettlementDoc[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payUserId, setPayUserId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<(typeof settlementMethods)[number]>('cash');
  const [notes, setNotes] = useState('');
  const isOwner = member?.role === 'owner';

  const loadLedger = useCallback(async () => {
    if (!orgId || !member || !user) {
      setMembers([]);
      setCards([]);
      setOutstanding({});
      setPending([]);
      setLoading(false);
      return;
    }

    const nextMembers = await listActiveMembers(orgId);
    const nextCards = isOwner
      ? (await listAllCards(orgId)).filter((card) => card.status === 'active')
      : [];
    const targets = isOwner ? nextMembers : nextMembers.filter((item) => item.id === user.uid);
    const rows = await Promise.all(
      targets.map(async (person) => {
        const row = await getPersonOutstanding(orgId, person.id);
        return [person.id, row] as const;
      }),
    );
    const map: OutstandingMap = {};
    for (const [id, row] of rows) {
      map[id] = {
        outstanding: row.outstanding,
        fuelTotal: row.fuelTotal,
        settledTotal: row.settledTotal,
      };
    }
    const nextPending = isOwner ? await listPendingSettlements(orgId) : [];
    setMembers(nextMembers);
    setCards(nextCards);
    setOutstanding(map);
    setPending(nextPending);
  }, [orgId, member, user, isOwner]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          await loadLedger();
          if (!cancelled) {
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load people');
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loadLedger]);

  function openPayment(userId: string) {
    setPayUserId(userId);
    setAmountText('');
    setMethod('cash');
    setNotes('');
    setSheetOpen(true);
  }

  async function submitPayment() {
    if (!orgId || !user || !payUserId || !member) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amount = parsePkrInput(amountText);
      const input: SettlementInput = {
        userId: isOwner ? payUserId : user.uid,
        amount,
        method,
        notes: notes.trim() || undefined,
      };
      await createSettlement(orgId, user.uid, input, { role: member.role });
      setSheetOpen(false);
      setMessage(
        member.role === 'owner'
          ? 'Settlement recorded and confirmed.'
          : 'Settlement submitted for owner confirmation.',
      );
      await loadLedger();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settlement');
    } finally {
      setBusy(false);
    }
  }

  async function approvePending(item: SettlementDoc) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmSettlement(orgId, item.id, user.uid);
      setMessage('Settlement confirmed.');
      await loadLedger();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm settlement');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAssignment(target: OrgMemberDoc, cardId: string) {
    if (!orgId || !isOwner || target.role === 'owner') {
      return;
    }
    const current = new Set(target.assignedCardIds ?? []);
    if (current.has(cardId)) {
      current.delete(cardId);
    } else {
      current.add(cardId);
    }
    const nextIds = [...current];
    setBusy(true);
    setError(null);
    try {
      await setMemberAssignedCards(orgId, target.id, nextIds);
      setMembers((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, assignedCardIds: nextIds } : item,
        ),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  const myOutstanding = user ? outstanding[user.uid]?.outstanding : undefined;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}>
      <View className="px-md pt-lg">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">Workspace</Text>
        <Text className="mt-sm text-2xl font-bold text-ink">{orgName ?? 'Workspace'}</Text>
        <Text className="mt-sm text-base text-muted">
          {isOwner
            ? 'Outstanding balances and reimbursements.'
            : 'Your outstanding balance and payments.'}
        </Text>
        {!isOwner && myOutstanding !== undefined ? (
          <View className="mt-lg">
            <Text className="text-sm font-medium uppercase tracking-wide text-muted">
              Your outstanding
            </Text>
            <Text className="mt-sm text-4xl font-bold text-ink">{formatPkr(myOutstanding)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Record a payment"
              className="mt-md items-center rounded-lg bg-ink px-md py-md"
              onPress={() => openPayment(user!.uid)}>
              <Text className="text-base font-semibold text-background">Record payment</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text className="px-md pt-md text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {message ? <Text className="px-md pt-md text-sm text-online">{message}</Text> : null}

      {isOwner && pending.length > 0 ? (
        <View className="mt-xl px-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            Pending confirmations
          </Text>
          {pending.map((item) => {
            const person = members.find((m) => m.id === item.userId);
            return (
              <View
                key={item.id}
                className="mt-md rounded-lg border border-border bg-surface px-md py-md">
                <Text className="text-base font-semibold text-ink">
                  {formatPkr(item.amount)} · {METHOD_LABELS[item.method as keyof typeof METHOD_LABELS] ?? item.method}
                </Text>
                <Text className="mt-xs text-sm text-muted">
                  {person?.displayName || person?.email || item.userId}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm settlement"
                  className="mt-md items-center rounded-lg bg-accent px-md py-sm"
                  disabled={busy}
                  onPress={() => void approvePending(item)}>
                  <Text className="text-sm font-semibold text-background">Confirm</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {isOwner ? (
        <View className="mt-xl px-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            Invite member
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@email.com"
            placeholderTextColor={colors.muted}
            className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send invite"
            className="mt-md items-center rounded-lg bg-ink px-md py-md"
            disabled={busy || !email.trim()}
            onPress={() => {
              setBusy(true);
              setError(null);
              setMessage(null);
              void inviteEmail(email)
                .then(() => {
                  setMessage(`Invite sent to ${email.trim().toLowerCase()}`);
                  setEmail('');
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Invite failed');
                })
                .finally(() => setBusy(false));
            }}>
            <Text className="text-base font-semibold text-background">
              {busy ? 'Working…' : 'Send invite'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mt-xl px-md">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">People</Text>
        {loading ? (
          <View className="items-center py-xl">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : members.length === 0 ? (
          <EmptyState title="No members" body="Invite someone to share this ledger." />
        ) : (
          members.map((person) => {
            const assigned = new Set(person.assignedCardIds ?? []);
            const row = outstanding[person.id];
            const showOutstanding = isOwner || person.id === user?.uid;
            return (
              <View
                key={person.id}
                className="mt-md rounded-lg border border-border bg-surface px-md py-md">
                <Text className="text-lg font-semibold text-ink">
                  {person.displayName || person.email}
                </Text>
                <Text className="mt-xs text-sm text-muted">
                  {person.email} · {person.role}
                </Text>
                {showOutstanding && row ? (
                  <View className="mt-md">
                    <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                      Outstanding
                    </Text>
                    <Text className="mt-xs text-2xl font-bold text-ink">
                      {formatPkr(row.outstanding)}
                    </Text>
                    <Text className="mt-xs text-sm text-muted">
                      Fuel {formatPkr(row.fuelTotal)} · Settled {formatPkr(row.settledTotal)}
                    </Text>
                    {isOwner || person.id === user?.uid ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Record payment for ${person.displayName || person.email}`}
                        className="mt-md items-center rounded-lg border border-border px-md py-sm"
                        onPress={() => openPayment(person.id)}>
                        <Text className="text-sm font-medium text-ink">Record payment</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {isOwner && person.role === 'member' ? (
                  <View className="mt-md">
                    <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                      Assigned cards
                    </Text>
                    {cards.length === 0 ? (
                      <Text className="mt-sm text-sm text-muted">
                        Add an active card first, then assign it here.
                      </Text>
                    ) : (
                      <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                        {cards.map((card) => {
                          const selected = assigned.has(card.id);
                          return (
                            <Pressable
                              key={card.id}
                              accessibilityRole="button"
                              accessibilityState={{ selected }}
                              accessibilityLabel={`${selected ? 'Unassign' : 'Assign'} ${card.name}`}
                              disabled={busy}
                              className="rounded-lg border px-md py-sm"
                              style={{
                                borderColor: selected ? colors.accent : colors.border,
                                backgroundColor: selected ? colors.accentSoft : colors.surface,
                              }}
                              onPress={() => void toggleAssignment(person, card.id)}>
                              <Text
                                className="text-sm font-medium"
                                style={{ color: selected ? colors.accent : colors.ink }}>
                                {card.name} · {card.last4}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : null}
                {!isOwner && person.id !== user?.uid ? (
                  <Text className="mt-sm text-sm text-muted">
                    {(person.assignedCardIds ?? []).length} card
                    {(person.assignedCardIds ?? []).length === 1 ? '' : 's'} assigned
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>

      <Modal
        visible={sheetOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setSheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView
            className="max-h-[92%] rounded-t-2xl bg-background"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
            <Text className="text-xl font-semibold text-ink">Record payment</Text>
            <Text className="mt-sm text-sm text-muted">
              Settlements never change card balance. They reduce person outstanding only.
            </Text>
            <View className="mt-lg">
              <AmountField value={amountText} onChangeText={setAmountText} />
            </View>

            {isOwner ? (
              <>
                <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
                  Person
                </Text>
                <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                  {members.map((person) => {
                    const selected = person.id === payUserId;
                    return (
                      <Pressable
                        key={person.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        className="rounded-lg border px-md py-sm"
                        style={{
                          borderColor: selected ? colors.accent : colors.border,
                          backgroundColor: selected ? colors.accentSoft : colors.surface,
                        }}
                        onPress={() => setPayUserId(person.id)}>
                        <Text style={{ color: selected ? colors.accent : colors.ink }}>
                          {person.displayName || person.email}
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
                    className="rounded-lg border px-md py-sm"
                    style={{
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                    }}
                    onPress={() => setMethod(item)}>
                    <Text style={{ color: selected ? colors.accent : colors.ink }}>
                      {METHOD_LABELS[item]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save settlement"
              className="mt-xl items-center rounded-lg bg-ink px-md py-md"
              disabled={busy}
              onPress={() => void submitPayment()}>
              <Text className="text-base font-semibold text-background">
                {busy ? 'Saving…' : isOwner ? 'Confirm payment' : 'Submit for confirmation'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel payment"
              className="mt-md items-center py-md"
              onPress={() => setSheetOpen(false)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
