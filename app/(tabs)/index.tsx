import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AmountField } from '@/components/AmountField';
import { AppButton } from '@/components/AppButton';
import { BalanceHero } from '@/components/BalanceHero';
import { BottomSheet } from '@/components/BottomSheet';
import { ChipRow } from '@/components/ChipRow';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { HomeSkeleton } from '@/components/HomeSkeleton';
import { PendingBanner } from '@/components/PendingBanner';
import { SelectField } from '@/components/SelectField';
import { SheetActions } from '@/components/SheetActions';
import { TransactionRow } from '@/components/TransactionRow';
import {
  listReversalLinkedIds,
  reverseFuelTransaction,
} from '@/features/adjustments/adjustmentService';
import { useAuth } from '@/features/auth/AuthProvider';
import { projectBalancesForCards } from '@/features/balance/balanceService';
import { listAllCards, listVisibleCards } from '@/features/cards/cardService';
import {
  createFuelTransaction,
  listRecentFuelTransactions,
  type FuelTransactionDoc,
} from '@/features/fuel/fuelService';
import { orgCapabilities } from '@/features/org/capabilities';
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
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';
import { a11y } from '@/theme/tokens';
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

type PendingConfirm = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const { orgId, orgName, member } = useOrg();
  const { isOnline, counts, balanceTrusted, refresh: refreshSync } = useSync();
  const { colors } = useTheme();
  const router = useRouter();
  const caps = orgCapabilities(member?.role);
  const isOwner = caps.isOwner;
  const [txs, setTxs] = useState<FuelTransactionDoc[]>([]);
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [projectedByCard, setProjectedByCard] = useState<Record<string, number>>({});
  const [people, setPeople] = useState<OrgMemberDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [fuelCards, setFuelCards] = useState<FuelCardDoc[]>([]);
  const [fuelPeople, setFuelPeople] = useState<OrgMemberDoc[]>([]);
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
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    if (!orgId || !member || !user) {
      const timer = setTimeout(() => {
        setTxs([]);
        setCards([]);
        setProjectedByCard({});
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
            isOwner ? listAllCards(orgId) : listVisibleCards(orgId, member),
            listRecentFuelTransactions(orgId, {
              userId: isOwner ? undefined : user.uid,
              max: FUEL_WINDOW,
            }),
            isOwner ? listActiveMembers(orgId) : Promise.resolve([] as OrgMemberDoc[]),
            isOwner
              ? listPendingPinRequests(orgId)
              : listMyPinRequests(orgId, user.uid),
            isOwner ? listPendingSettlements(orgId) : Promise.resolve([]),
          ]);

          const activeCards = nextCards
            .filter((card) => card.status === 'active')
            .sort((a, b) => a.name.localeCompare(b.name));
          const needsProjection = activeCards
            .filter((card) => card.serverBalanceSnapshot == null)
            .map((card) => card.id);
          const [outstandingRows, reversed, projected] = await Promise.all([
            isOwner
              ? Promise.all(nextPeople.map((person) => getPersonOutstanding(orgId, person.id)))
              : getPersonOutstanding(orgId, user.uid).then((mine) => [mine]),
            isOwner ? listReversalLinkedIds(orgId) : Promise.resolve(new Set<string>()),
            needsProjection.length > 0
              ? projectBalancesForCards(orgId, needsProjection)
              : Promise.resolve({} as Record<string, number>),
          ]);
          const outstanding = outstandingRows.reduce(
            (total, row) => addPkr(total, row.outstanding),
            0,
          );

          if (cancelled) {
            return;
          }

          setCards(activeCards);
          setProjectedByCard(projected);
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

  const balanceSummary = useMemo(
    () =>
      sumAvailableBalance(
        cards.map((card) => ({
          serverBalanceSnapshot: card.serverBalanceSnapshot,
          projectedBalance: projectedByCard[card.id] ?? null,
          status: card.status,
        })),
      ),
    [cards, projectedByCard],
  );
  const balanceIsTrusted =
    balanceTrusted &&
    balanceSummary.projectedCount === 0 &&
    balanceSummary.unknownCount === 0;
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
  const selectedCard =
    fuelCards.find((card) => card.id === cardId) ??
    cards.find((card) => card.id === cardId) ??
    null;
  const heroCaption = balanceCaption({
    trusted: balanceIsTrusted,
    summary: balanceSummary,
    role: isOwner ? 'owner' : 'member',
  });

  async function openSheet() {
    if (!orgId || !member || !user || sheetLoading) {
      return;
    }

    setSheetLoading(true);
    setAmountText('');
    setStation('');
    setArea('');
    setNotes('');

    try {
      const [nextCards, nextPeople] = await Promise.all([
        isOwner ? listAllCards(orgId) : listVisibleCards(orgId, member),
        isOwner ? listActiveMembers(orgId) : Promise.resolve([] as OrgMemberDoc[]),
      ]);
      const activeCards = nextCards
        .filter((card) => card.status === 'active')
        .sort((a, b) => a.name.localeCompare(b.name));
      if (activeCards.length === 0) {
        toast.info(
          isOwner
            ? 'Add a card before logging fuel.'
            : 'Ask the owner to assign you a card before logging fuel.',
        );
        return;
      }

      const nextCardId =
        cardId && activeCards.some((card) => card.id === cardId)
          ? cardId
          : activeCards[0].id;
      const nextUserId = !isOwner
        ? user.uid
        : userId && nextPeople.some((person) => person.id === userId)
          ? userId
          : user.uid;

      setFuelCards(activeCards);
      setFuelPeople(isOwner ? nextPeople : []);
      setCardId(nextCardId);
      setUserId(nextUserId);
      setSheetOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load fuel options');
    } finally {
      setSheetLoading(false);
    }
  }

  function onPendingPress(action: PendingAction) {
    if (!action.href) {
      return;
    }
    router.push(action.href);
  }

  function confirmReverseFuel(item: FuelTransactionDoc) {
    setConfirm({
      title: 'Reverse fuel',
      body: `Create a reversal for ${formatPkr(item.amount)} at ${item.station}? The original entry stays on the ledger.`,
      confirmLabel: 'Reverse fuel',
      destructive: true,
      run: async () => {
        if (!orgId || !user) {
          return;
        }
        setBusy(true);
        try {
          await reverseFuelTransaction(orgId, user.uid, item);
          toast.success('Fuel reversed.');
          setReloadKey((value) => value + 1);
          refreshSync();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Reverse failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function submitFuel() {
    if (!orgId || !user || !cardId || !userId) {
      return;
    }

    const runCreate = async () => {
      setBusy(true);
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
        toast.success(isOnline ? 'Fuel saved.' : 'Fuel saved offline.');
        setReloadKey((value) => value + 1);
        refreshSync();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not save fuel');
      } finally {
        setBusy(false);
      }
    };

    if (!isOnline) {
      setConfirm({
        title: 'Save offline',
        body: 'This fuel entry will sync when you are back online.',
        confirmLabel: 'Save offline',
        run: runCreate,
      });
      return;
    }

    await runCreate();
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="px-md pt-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            {orgName ?? 'Workspace'}
          </Text>
          {caps.isMember ? (
            <Text className="mt-xs text-sm text-muted">
              Member view · fuel on assigned cards only
            </Text>
          ) : null}

          {loading ? (
            <View className="mt-md">
              <HomeSkeleton />
            </View>
          ) : error && cards.length === 0 && txs.length === 0 ? (
            <View className="mt-lg">
              <EmptyState title="Could not load home" body={error} />
              <View className="mt-md">
                <AppButton
                  label="Try again"
                  variant="secondary"
                  onPress={() => {
                    setLoading(true);
                    setError(null);
                    setReloadKey((value) => value + 1);
                  }}
                />
              </View>
            </View>
          ) : (
            <>
              <View className="mt-md">
                <BalanceHero
                  amount={balanceSummary.total}
                  trusted={balanceIsTrusted}
                  caption={heroCaption}
                />
              </View>

              <View className="mt-lg flex-row" style={{ gap: 12 }}>
                <View className="flex-1 rounded-2xl border border-border bg-surface px-md py-md">
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
                  className="flex-1 rounded-2xl border border-border bg-surface px-md py-md"
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
                          className="mb-sm self-start justify-center pb-md"
                          style={{ minHeight: a11y.minHit }}
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

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 12,
        }}>
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
        <AppButton
          label={sheetLoading ? 'Loading…' : 'Add Fuel'}
          onPress={() => void openSheet()}
          busy={sheetLoading}
          disabled={cards.length === 0 || loading || sheetLoading}
        />
      </View>

      <ConfirmSheet
        visible={confirm != null}
        title={confirm?.title ?? ''}
        body={confirm?.body ?? ''}
        confirmLabel={confirm?.confirmLabel ?? ''}
        destructive={confirm?.destructive}
        busy={busy}
        onCancel={() => {
          if (!busy) {
            setConfirm(null);
          }
        }}
        onConfirm={() => {
          const run = confirm?.run;
          if (!run) {
            return;
          }
          void (async () => {
            await run();
            setConfirm(null);
          })();
        }}
      />

      <BottomSheet
        visible={sheetOpen}
        title="Add Fuel"
        onClose={() => setSheetOpen(false)}
        footer={
          <SheetActions>
            <AppButton
              label="Cancel"
              variant="secondary"
              disabled={busy}
              onPress={() => setSheetOpen(false)}
            />
            <AppButton
              label={busy ? 'Saving…' : isOnline ? 'Save' : 'Save offline'}
              busy={busy}
              disabled={fuelCards.length === 0}
              onPress={() => void submitFuel()}
            />
          </SheetActions>
        }>
        <AmountField value={amountText} onChangeText={setAmountText} />

        <View className="mt-lg">
          <SelectField
            label="Card"
            value={cardId}
            options={fuelCards.map((card) => ({
              value: card.id,
              label: card.name,
              detail: `•••• ${card.last4}${card.issuer ? ` · ${card.issuer}` : ''}`,
            }))}
            placeholder="Choose card"
            onChange={setCardId}
          />
        </View>

        {isOwner ? (
          <View className="mt-lg">
            <SelectField
              label="Used by"
              value={userId}
              options={fuelPeople.map((person) => ({
                value: person.id,
                label: person.displayName || person.email,
                detail: person.email,
              }))}
              placeholder="Choose person"
              onChange={setUserId}
            />
          </View>
        ) : null}

        <View className="mt-lg">
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>STATION</Text>
          {stationChips.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <ChipRow options={stationChips} selected={station} onSelect={setStation} />
            </View>
          ) : null}
          <TextInput
            value={station}
            onChangeText={setStation}
            placeholder={stationChips.length ? 'Or type a station' : 'Station name'}
            placeholderTextColor={colors.muted}
            style={{
              marginTop: 8,
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
        </View>

        <View className="mt-lg">
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>AREA</Text>
          {areaChips.length > 0 ? (
            <View style={{ marginTop: 8 }}>
              <ChipRow options={areaChips} selected={area} onSelect={setArea} />
            </View>
          ) : null}
          <TextInput
            value={area}
            onChangeText={setArea}
            placeholder={areaChips.length ? 'Or type an area' : 'Area'}
            placeholderTextColor={colors.muted}
            style={{
              marginTop: 8,
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
        </View>

        <TextInput
          value={notes}
          onChangeText={setNotes}
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
    </View>
  );
}
