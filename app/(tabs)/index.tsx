import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/AmountField';
import { BalanceHero } from '@/components/BalanceHero';
import { EmptyState } from '@/components/EmptyState';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { PendingBanner } from '@/components/PendingBanner';
import { TransactionRow } from '@/components/TransactionRow';
import {
  listReversalLinkedIds,
  reverseFuelTransaction,
} from '@/features/adjustments/adjustmentService';
import { useAuth } from '@/features/auth/AuthProvider';
import { listVisibleCards } from '@/features/cards/cardService';
import {
  createFuelTransaction,
  listRecentFuelTransactions,
  type FuelTransactionDoc,
} from '@/features/fuel/fuelService';
import { useOrg } from '@/features/org/OrgProvider';
import { listActiveMembers, type OrgMemberDoc } from '@/features/org/orgService';
import {
  listMyPinRequests,
  listPendingPinRequests,
} from '@/features/pin/pinService';
import {
  getPersonOutstanding,
  listPendingSettlements,
} from '@/features/settlements/settlementService';
import { useSync } from '@/features/sync/SyncProvider';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { recentChips } from '@/utils/chips';
import {
  balanceCaption,
  buildMonthSnapshot,
  buildPendingActions,
  sumAvailableBalance,
  type PendingAction,
} from '@/utils/homeDashboard';
import { parsePkrInput, formatPkr, addPkr } from '@/utils/money';

const RECENT_LIMIT = 8;
const FUEL_WINDOW = 100;

export default function HomeScreen() {
  const { user } = useAuth();
  const { orgId, orgName, member } = useOrg();
  const { isOnline, counts, balanceTrusted, refresh: refreshSync } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [txs, setTxs] = useState<FuelTransactionDoc[]>([]);
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [people, setPeople] = useState<OrgMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [amountText, setAmountText] = useState('');
  const [cardId, setCardId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [station, setStation] = useState('');
  const [area, setArea] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [outstandingTotal, setOutstandingTotal] = useState(0);
  const [pendingPinCount, setPendingPinCount] = useState(0);
  const [pendingSettlementCount, setPendingSettlementCount] = useState(0);
  const [reversedIds, setReversedIds] = useState<Set<string>>(new Set());
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!orgId || !member || !user) {
      const timer = setTimeout(() => {
        setTxs([]);
        setCards([]);
        setPeople([]);
        setOutstandingTotal(0);
        setPendingPinCount(0);
        setPendingSettlementCount(0);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [nextCards, nextTxs, nextPeople, pinRows, pendingSettlements] = await Promise.all([
            listVisibleCards(orgId, member),
            listRecentFuelTransactions(orgId, {
              userId: isOwner ? undefined : user.uid,
              max: FUEL_WINDOW,
            }),
            isOwner ? listActiveMembers(orgId) : Promise.resolve([]),
            isOwner
              ? listPendingPinRequests(orgId)
              : listMyPinRequests(orgId, user.uid),
            isOwner ? listPendingSettlements(orgId) : Promise.resolve([]),
          ]);

          const activeCards = nextCards.filter((card) => card.status === 'active');
          let outstanding = 0;
          if (isOwner) {
            const rows = await Promise.all(
              nextPeople.map((person) => getPersonOutstanding(orgId, person.id)),
            );
            outstanding = rows.reduce((total, row) => addPkr(total, row.outstanding), 0);
          } else {
            const mine = await getPersonOutstanding(orgId, user.uid);
            outstanding = mine.outstanding;
          }

          const reversed = isOwner
            ? await listReversalLinkedIds(orgId)
            : new Set<string>();

          if (cancelled) {
            return;
          }

          setCards(activeCards);
          setTxs(nextTxs);
          setPeople(nextPeople);
          setOutstandingTotal(outstanding);
          setPendingPinCount(
            isOwner
              ? pinRows.length
              : pinRows.filter((item) => item.status === 'pending').length,
          );
          setPendingSettlementCount(pendingSettlements.length);
          setReversedIds(reversed);
          setError(null);
          setCardId((current) => current ?? activeCards[0]?.id ?? null);
          setUserId((current) => current ?? user.uid);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load home');
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
  }, [orgId, member, user, isOwner, reloadKey]);

  const balanceSummary = useMemo(() => sumAvailableBalance(cards), [cards]);
  const month = useMemo(
    () =>
      buildMonthSnapshot({
        fuel: txs,
        outstanding: outstandingTotal,
      }),
    [txs, outstandingTotal],
  );
  const pendingActions = useMemo(
    () =>
      buildPendingActions({
        role: isOwner ? 'owner' : 'member',
        conflictCount: counts.conflict,
        pendingSyncCount: counts.pending,
        pendingPinCount,
        pendingSettlementCount,
      }),
    [isOwner, counts.conflict, counts.pending, pendingPinCount, pendingSettlementCount],
  );
  const recentTxs = useMemo(() => txs.slice(0, RECENT_LIMIT), [txs]);
  const stationChips = recentChips(txs.map((item) => item.station));
  const areaChips = recentChips(txs.map((item) => item.area));
  const selectedCard = cards.find((card) => card.id === cardId) ?? null;
  const heroCaption = balanceCaption({
    trusted: balanceTrusted,
    summary: balanceSummary,
    role: isOwner ? 'owner' : 'member',
  });

  function openSheet() {
    setAmountText('');
    setStation('');
    setArea('');
    setNotes('');
    setUserId(user?.uid ?? null);
    if (!cardId && cards[0]) {
      setCardId(cards[0].id);
    }
    setSheetOpen(true);
  }

  function onPendingPress(action: PendingAction) {
    if (!action.href) {
      return;
    }
    router.push(action.href);
  }

  function confirmReverseFuel(item: FuelTransactionDoc) {
    Alert.alert(
      'Reverse fuel',
      `Create a reversal for ${formatPkr(item.amount)} at ${item.station}? The original entry stays on the ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse fuel',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!orgId || !user) {
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await reverseFuelTransaction(orgId, user.uid, item);
                setReloadKey((value) => value + 1);
                refreshSync();
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Reverse failed');
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  async function submitFuel() {
    if (!orgId || !user || !cardId || !userId) {
      return;
    }

    const runCreate = async () => {
      setBusy(true);
      setError(null);
      try {
        const amount = parsePkrInput(amountText);
        const balanceBefore = selectedCard?.serverBalanceSnapshot ?? null;
        await createFuelTransaction(
          orgId,
          user.uid,
          {
            cardId,
            userId: isOwner ? userId : user.uid,
            amount,
            station,
            area,
            notes: notes.trim() || undefined,
          },
          balanceBefore,
        );
        setSheetOpen(false);
        setReloadKey((value) => value + 1);
        refreshSync();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save fuel');
      } finally {
        setBusy(false);
      }
    };

    if (!isOnline) {
      Alert.alert('Saved offline', 'This fuel entry will sync when you are back online.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save offline', onPress: () => void runCreate() },
      ]);
      return;
    }

    await runCreate();
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="px-md pt-md">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-md">
              <Text className="text-sm font-medium uppercase tracking-wide text-muted">
                {orgName ?? 'Workspace'}
              </Text>
            </View>
            <Link href="/settings" accessibilityLabel="Open settings">
              <Text style={{ color: colors.accent }} className="text-sm font-medium">
                Settings
              </Text>
            </Link>
          </View>

          {loading ? (
            <HomeSkeleton />
          ) : error && cards.length === 0 && txs.length === 0 ? (
            <View className="mt-lg">
              <EmptyState title="Could not load home" body={error} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry loading home"
                className="mt-md items-center rounded-lg border border-border px-md py-md"
                onPress={() => {
                  setLoading(true);
                  setError(null);
                  setReloadKey((value) => value + 1);
                }}>
                <Text className="text-base font-medium text-ink">Try again</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View className="mt-lg">
                <BalanceHero
                  amount={balanceSummary.total}
                  trusted={balanceTrusted}
                  caption={heroCaption}
                />
              </View>

              <View className="mt-xl flex-row" style={{ gap: 12 }}>
                <View className="flex-1 rounded-lg border border-border bg-surface px-md py-md">
                  <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                    This month spent
                  </Text>
                  <Text className="mt-sm text-lg font-semibold text-ink">
                    {formatPkr(month.spent)}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    isOwner ? 'Open people to recover outstanding' : 'Open your outstanding'
                  }
                  className="flex-1 rounded-lg border border-border bg-surface px-md py-md"
                  onPress={() => router.push('/(tabs)/people')}>
                  <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                    {isOwner ? 'To recover' : 'Your outstanding'}
                  </Text>
                  <Text className="mt-sm text-lg font-semibold text-ink">
                    {formatPkr(month.outstanding)}
                  </Text>
                </Pressable>
              </View>

              <PendingBanner actions={pendingActions} onPressAction={onPendingPress} />

              {error ? (
                <Text className="mt-md text-sm" style={{ color: colors.danger }}>
                  {error}
                </Text>
              ) : null}

              {isOwner ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Go to Cards to add recharge"
                  className="mt-lg self-start"
                  onPress={() => router.push('/(tabs)/cards')}>
                  <Text className="text-sm font-medium" style={{ color: colors.accent }}>
                    Add recharge
                  </Text>
                </Pressable>
              ) : null}

              <Text className="mt-xl text-sm font-medium uppercase tracking-wide text-muted">
                Recent activity
              </Text>
              {recentTxs.length === 0 ? (
                <EmptyState
                  title="No fuel yet"
                  body="Log your first fill with Add Fuel below."
                />
              ) : (
                recentTxs.map((item) => {
                  const alreadyReversed = reversedIds.has(item.id);
                  return (
                    <View key={item.id}>
                      <TransactionRow
                        amount={item.amount}
                        title={item.station}
                        subtitle={`${item.area}${item.syncStatus === 'PENDING' ? ' · pending sync' : ''}${item.requiresReview ? ' · needs review' : ''}${alreadyReversed ? ' · reversed' : ''}`}
                        syncStatus={item.syncStatus}
                      />
                      {isOwner && !alreadyReversed ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Reverse fuel ${item.station}`}
                          className="mb-sm self-start pb-md"
                          disabled={busy}
                          onPress={() => confirmReverseFuel(item)}>
                          <Text className="text-sm font-medium" style={{ color: colors.danger }}>
                            Reverse fuel
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })
              )}
            </>
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-background px-md pt-md" style={{ paddingBottom: 12 }}>
        {cards.length === 0 && !loading ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Cards to add a card"
            className="mb-sm"
            onPress={() => router.push('/(tabs)/cards')}>
            <Text className="text-center text-sm text-muted">
              {isOwner
                ? 'Add a card on the Cards tab before logging fuel.'
                : 'Ask the owner to assign you a card before logging fuel.'}
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Fuel"
          className="items-center rounded-lg bg-ink px-md py-md"
          style={{ opacity: cards.length === 0 ? 0.45 : 1 }}
          onPress={openSheet}
          disabled={cards.length === 0 || loading}>
          <Text className="text-base font-semibold text-background">Add Fuel</Text>
        </Pressable>
      </View>

      <Modal visible={sheetOpen} animationType="slide" transparent onRequestClose={() => setSheetOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <ScrollView
            className="max-h-[92%] rounded-t-2xl bg-background"
            contentContainerStyle={{ padding: 16, paddingBottom: 40 + insets.bottom }}>
            <Text className="text-xl font-semibold text-ink">Add Fuel</Text>
            <View className="mt-lg">
              <AmountField value={amountText} onChangeText={setAmountText} />
            </View>

            <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">Card</Text>
            <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
              {cards.map((card) => {
                const selected = card.id === cardId;
                return (
                  <Pressable
                    key={card.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className="rounded-lg border px-md py-sm"
                    style={{
                      borderColor: selected ? colors.accent : colors.border,
                      backgroundColor: selected ? colors.accentSoft : colors.surface,
                    }}
                    onPress={() => setCardId(card.id)}>
                    <Text style={{ color: selected ? colors.accent : colors.ink }}>
                      {card.name} · {card.last4}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isOwner ? (
              <>
                <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
                  Used by
                </Text>
                <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                  {people.map((person) => {
                    const selected = person.id === userId;
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
                        onPress={() => setUserId(person.id)}>
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
              Station
            </Text>
            {stationChips.length > 0 ? (
              <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                {stationChips.map((chip) => (
                  <Pressable
                    key={chip}
                    accessibilityRole="button"
                    className="rounded-lg border border-border px-md py-sm"
                    onPress={() => setStation(chip)}>
                    <Text className="text-sm text-ink">{chip}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              value={station}
              onChangeText={setStation}
              placeholder="Station"
              placeholderTextColor={colors.muted}
              className="mt-sm rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
            />

            <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">Area</Text>
            {areaChips.length > 0 ? (
              <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                {areaChips.map((chip) => (
                  <Pressable
                    key={chip}
                    accessibilityRole="button"
                    className="rounded-lg border border-border px-md py-sm"
                    onPress={() => setArea(chip)}>
                    <Text className="text-sm text-ink">{chip}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <TextInput
              value={area}
              onChangeText={setArea}
              placeholder="Area"
              placeholderTextColor={colors.muted}
              className="mt-sm rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
            />

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.muted}
              className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
            />

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save fuel entry"
              className="mt-xl items-center rounded-lg bg-ink px-md py-md"
              disabled={busy}
              onPress={() => void submitFuel()}>
              <Text className="text-base font-semibold text-background">
                {busy ? 'Saving…' : isOnline ? 'Save fuel' : 'Save offline'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel add fuel"
              className="mt-md items-center py-md"
              onPress={() => setSheetOpen(false)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
