import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHero } from '@/components/BalanceHero';
import { EmptyState } from '@/components/EmptyState';
import { SettlementPaymentSheet } from '@/components/SettlementPaymentSheet';
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
  type SettlementDoc,
} from '@/features/settlements/settlementService';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { formatPkr, parsePkrInput } from '@/utils/money';
import {
  assignedCardCountLabel,
  canOpenPersonDetail,
  personDisplayName,
  settlementMethodLabel,
  settlementStatusLabel,
} from '@/utils/peopleDashboard';

export default function PersonDetailScreen() {
  const { userId: rawUserId } = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const { user } = useAuth();
  const { orgId, member, refresh } = useOrg();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [person, setPerson] = useState<OrgMemberDoc | null>(null);
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [outstanding, setOutstanding] = useState(0);
  const [fuelTotal, setFuelTotal] = useState(0);
  const [settledTotal, setSettledTotal] = useState(0);
  const [settlements, setSettlements] = useState<SettlementDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<(typeof settlementMethods)[number]>('cash');
  const [notes, setNotes] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const allowed =
    Boolean(user && member && userId) &&
    canOpenPersonDetail(
      { role: member?.role ?? 'member', uid: user?.uid ?? '' },
      userId ?? '',
    );

  const load = useCallback(async () => {
    if (!orgId || !member || !user || !userId || !allowed) {
      setPerson(null);
      setCards([]);
      setSettlements([]);
      setLoading(false);
      return;
    }

    const members = await listActiveMembers(orgId);
    const target = members.find((item) => item.id === userId) ?? null;
    if (!target) {
      setPerson(null);
      setError('Member not found');
      setLoading(false);
      return;
    }

    const [row, nextCards] = await Promise.all([
      getPersonOutstanding(orgId, userId),
      isOwner
        ? listAllCards(orgId).then((items) => items.filter((card) => card.status === 'active'))
        : Promise.resolve([] as FuelCardDoc[]),
    ]);

    setPerson(target);
    setOutstanding(row.outstanding);
    setFuelTotal(row.fuelTotal);
    setSettledTotal(row.settledTotal);
    setSettlements(row.settlements);
    setCards(nextCards);
    setError(null);
  }, [orgId, member, user, userId, allowed, isOwner]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          await load();
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load member');
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
  }, [load, reloadKey]);

  async function submitPayment() {
    if (!orgId || !user || !userId || !member) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amount = parsePkrInput(amountText);
      const input: SettlementInput = {
        userId: isOwner ? userId : user.uid,
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
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settlement');
    } finally {
      setBusy(false);
    }
  }

  async function approvePending(item: SettlementDoc) {
    if (!orgId || !user || !isOwner) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await confirmSettlement(orgId, item.id, user.uid);
      setMessage('Settlement confirmed.');
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm settlement');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAssignment(cardId: string) {
    if (!orgId || !isOwner || !person || person.role === 'owner') {
      return;
    }
    const current = new Set(person.assignedCardIds ?? []);
    if (current.has(cardId)) {
      current.delete(cardId);
    } else {
      current.add(cardId);
    }
    const nextIds = [...current];
    setBusy(true);
    setError(null);
    try {
      await setMemberAssignedCards(orgId, person.id, nextIds);
      setPerson({ ...person, assignedCardIds: nextIds });
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  const title = person ? personDisplayName(person) : 'Person';

  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: 40 + insets.bottom, paddingTop: 16 }}>
        <View className="px-md">
          {!allowed ? (
            <EmptyState
              title="Not available"
              body="You can only view your own outstanding balance."
            />
          ) : loading ? (
            <View className="items-center py-xl">
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : !person ? (
            <EmptyState title="Member not found" body="They may have left this workspace." />
          ) : (
            <>
              <Text className="text-sm text-muted">
                {person.email} · {person.role}
              </Text>
              <View className="mt-lg">
                <BalanceHero
                  amount={outstanding}
                  trusted
                  label="Outstanding"
                  caption="Fuel spent minus confirmed settlements."
                />
              </View>

              <View className="mt-xl flex-row" style={{ gap: 12 }}>
                <View className="flex-1 rounded-lg border border-border bg-surface px-md py-md">
                  <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                    Spent
                  </Text>
                  <Text className="mt-sm text-xl font-bold text-ink">{formatPkr(fuelTotal)}</Text>
                </View>
                <View className="flex-1 rounded-lg border border-border bg-surface px-md py-md">
                  <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                    Settled
                  </Text>
                  <Text className="mt-sm text-xl font-bold text-ink">
                    {formatPkr(settledTotal)}
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Record payment"
                className="mt-lg items-center rounded-lg bg-ink px-md py-md"
                onPress={() => {
                  setAmountText('');
                  setMethod('cash');
                  setNotes('');
                  setSheetOpen(true);
                }}>
                <Text className="text-base font-semibold text-background">Record payment</Text>
              </Pressable>

              {error ? (
                <Text className="mt-md text-sm" style={{ color: colors.danger }}>
                  {error}
                </Text>
              ) : null}
              {message ? <Text className="mt-md text-sm text-online">{message}</Text> : null}

              <View className="mt-xl">
                <Text className="text-sm font-medium uppercase tracking-wide text-muted">
                  Card assignments
                </Text>
                {isOwner && person.role === 'member' ? (
                  cards.length === 0 ? (
                    <Text className="mt-sm text-sm text-muted">
                      Add an active card first, then assign it here.
                    </Text>
                  ) : (
                    <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                      {cards.map((card) => {
                        const selected = (person.assignedCardIds ?? []).includes(card.id);
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
                            onPress={() => void toggleAssignment(card.id)}>
                            <Text
                              className="text-sm font-medium"
                              style={{ color: selected ? colors.accent : colors.ink }}>
                              {card.name} · {card.last4}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )
                ) : (
                  <Text className="mt-sm text-sm text-muted">
                    {assignedCardCountLabel((person.assignedCardIds ?? []).length)}
                  </Text>
                )}
              </View>

              <View className="mt-xl">
                <Text className="text-sm font-medium uppercase tracking-wide text-muted">
                  Payments
                </Text>
                {settlements.length === 0 ? (
                  <Text className="mt-sm text-sm text-muted">No payments yet.</Text>
                ) : (
                  settlements.map((item) => (
                    <View
                      key={item.id}
                      className="mt-md rounded-lg border border-border bg-surface px-md py-md">
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 pr-md">
                          <Text className="text-base font-semibold text-ink">
                            {formatPkr(item.amount)} · {settlementMethodLabel(item.method)}
                          </Text>
                          <Text className="mt-xs text-sm text-muted">
                            {settlementStatusLabel(item.status)}
                            {item.notes ? ` · ${item.notes}` : ''}
                          </Text>
                        </View>
                        <Text
                          className="text-xs font-medium uppercase"
                          style={{
                            color:
                              item.status === 'pending' ? colors.offline : colors.online,
                          }}>
                          {item.status}
                        </Text>
                      </View>
                      {isOwner && item.status === 'pending' ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Confirm settlement"
                          className="mt-md items-center rounded-lg bg-accent px-md py-sm"
                          disabled={busy}
                          onPress={() => void approvePending(item)}>
                          <Text className="text-sm font-semibold text-background">Confirm</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  ))
                )}
              </View>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to people"
                className="mt-xl items-center py-md"
                onPress={() => router.back()}>
                <Text className="text-base text-muted">Back to People</Text>
              </Pressable>
            </>
          )}
        </View>
      </ScrollView>

      <SettlementPaymentSheet
        visible={sheetOpen}
        busy={busy}
        isOwner={isOwner}
        amountText={amountText}
        method={method}
        notes={notes}
        payUserId={userId ?? null}
        people={person ? [person] : []}
        onChangeAmount={setAmountText}
        onChangeMethod={setMethod}
        onChangeNotes={setNotes}
        onChangePayUserId={() => undefined}
        onSubmit={() => void submitPayment()}
        onClose={() => setSheetOpen(false)}
      />
    </>
  );
}
