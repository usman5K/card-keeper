import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/AmountField';
import { EmptyState } from '@/components/EmptyState';
import {
  createOpeningBalance,
  listAdjustmentsForCard,
  reverseRecharge,
  type AdjustmentDoc,
} from '@/features/adjustments/adjustmentService';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  createCard,
  listVisibleCards,
  updateCard,
} from '@/features/cards/cardService';
import { useOrg } from '@/features/org/OrgProvider';
import {
  createRecharge,
  listRechargesForCard,
  type RechargeDoc,
} from '@/features/recharges/rechargeService';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { formatPkr, parsePkrInput } from '@/utils/money';

type TimelineItem =
  | { kind: 'recharge'; occurredAt: string; item: RechargeDoc }
  | { kind: 'adjustment'; occurredAt: string; item: AdjustmentDoc };

export default function CardsScreen() {
  const { user } = useAuth();
  const { ready: orgReady, orgId, member, refresh } = useOrg();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FuelCardDoc | null>(null);
  const [name, setName] = useState('');
  const [last4, setLast4] = useState('');
  const [issuer, setIssuer] = useState('');
  const [openingText, setOpeningText] = useState('');
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeCard, setRechargeCard] = useState<FuelCardDoc | null>(null);
  const [amountText, setAmountText] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [reversedIds, setReversedIds] = useState<Set<string>>(new Set());
  const [hasOpening, setHasOpening] = useState(false);
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingOnlyText, setOpeningOnlyText] = useState('');

  useEffect(() => {
    if (!orgReady) {
      const timer = setTimeout(() => {
        setLoading(true);
      }, 0);
      return () => clearTimeout(timer);
    }

    if (!orgId || !member) {
      const timer = setTimeout(() => {
        setCards([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      void (async () => {
        try {
          const next = await listVisibleCards(orgId, member);
          if (cancelled) {
            return;
          }
          next.sort((a, b) => a.name.localeCompare(b.name));
          setCards(next);
          setError(null);
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load cards');
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
  }, [orgReady, orgId, member, reloadKey]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  async function loadTimeline(card: FuelCardDoc) {
    if (!orgId) {
      return;
    }
    setTimelineLoading(true);
    try {
      const [recharges, adjustments] = await Promise.all([
        listRechargesForCard(orgId, card.id),
        listAdjustmentsForCard(orgId, card.id),
      ]);
      const linked = new Set(
        adjustments
          .filter((item) => item.kind === 'REVERSAL' && item.linkedTxId)
          .map((item) => item.linkedTxId as string),
      );
      setReversedIds(linked);
      setHasOpening(adjustments.some((item) => item.kind === 'OPENING'));
      const merged: TimelineItem[] = [
        ...recharges.map((item) => ({
          kind: 'recharge' as const,
          occurredAt: String(item.occurredAt ?? ''),
          item,
        })),
        ...adjustments.map((item) => ({
          kind: 'adjustment' as const,
          occurredAt: String(item.occurredAt ?? ''),
          item,
        })),
      ];
      merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
      setTimeline(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load card activity');
      setTimeline([]);
      setReversedIds(new Set());
      setHasOpening(false);
    } finally {
      setTimelineLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setLast4('');
    setIssuer('');
    setOpeningText('');
    setTimeline([]);
    setReversedIds(new Set());
    setHasOpening(false);
    setFormOpen(true);
  }

  function openEdit(card: FuelCardDoc) {
    setEditing(card);
    setName(card.name);
    setLast4(card.last4);
    setIssuer(card.issuer);
    setFormOpen(true);
    void loadTimeline(card);
  }

  function openRecharge(card: FuelCardDoc) {
    setRechargeCard(card);
    setAmountText('');
    setSource('');
    setNotes('');
    setRechargeOpen(true);
  }

  async function saveCard() {
    if (!orgId || !user || !isOwner) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateCard(orgId, editing.id, { name, last4, issuer });
      } else {
        const card = await createCard(orgId, { name, last4, issuer });
        const openingRaw = openingText.trim();
        if (openingRaw) {
          const opening = parsePkrInput(openingRaw);
          if (opening > 0) {
            await createOpeningBalance(orgId, user.uid, card.id, opening);
          }
        }
      }
      setFormOpen(false);
      reload();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function confirmReverseRecharge(item: RechargeDoc) {
    Alert.alert(
      'Reverse recharge',
      `Create a reversal for ${formatPkr(item.amount)}? The original recharge stays on the ledger.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reverse recharge',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              if (!orgId || !user || !editing) {
                return;
              }
              setBusy(true);
              setError(null);
              try {
                await reverseRecharge(orgId, user.uid, item);
                await loadTimeline(editing);
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

  async function saveOpeningOnly() {
    if (!orgId || !user || !editing) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amount = parsePkrInput(openingOnlyText);
      await createOpeningBalance(orgId, user.uid, editing.id, amount);
      setOpeningOpen(false);
      setOpeningOnlyText('');
      await loadTimeline(editing);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Opening balance failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveRecharge() {
    if (!orgId || !user || !rechargeCard) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const amount = parsePkrInput(amountText);
      await createRecharge(orgId, user.uid, {
        cardId: rechargeCard.id,
        amount,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setRechargeOpen(false);
      if (editing?.id === rechargeCard.id) {
        await loadTimeline(rechargeCard);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recharge failed');
    } finally {
      setBusy(false);
    }
  }

  function confirmDeactivate(card: FuelCardDoc) {
    Alert.alert('Deactivate card', `Stop using ${card.name} for new fuel?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Deactivate card',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (!orgId) {
              return;
            }
            setBusy(true);
            try {
              await updateCard(orgId, card.id, { status: 'inactive' });
              setFormOpen(false);
              reload();
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Update failed');
            } finally {
              setBusy(false);
            }
          })();
        },
      },
    ]);
  }

  async function reactivate(card: FuelCardDoc) {
    if (!orgId) {
      return;
    }
    setBusy(true);
    try {
      await updateCard(orgId, card.id, { status: 'active' });
      setFormOpen(false);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-end justify-between px-md pt-md">
        <View className="flex-1 pr-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            Fuel cards
          </Text>
          <Text className="mt-sm text-base text-muted">
            {isOwner
              ? 'Create cards, add recharges, assign on People.'
              : 'Cards assigned to you.'}
          </Text>
        </View>
        {isOwner ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add card"
            className="rounded-lg bg-ink px-md py-sm"
            onPress={openCreate}>
            <Text className="text-sm font-semibold text-background">Add card</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text className="px-md pt-md text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title="No cards yet"
              body={
                isOwner
                  ? 'Add the first fuel card for this workspace.'
                  : 'Ask the owner to assign a card to you.'
              }
            />
          }
          renderItem={({ item }) => (
            <View className="mb-md rounded-lg border border-border bg-surface px-md py-md">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name} ending ${item.last4}`}
                onPress={() => openEdit(item)}>
                <View className="flex-row items-center justify-between">
                  <Text className="text-lg font-semibold text-ink">{item.name}</Text>
                  <Text
                    className="text-xs font-medium uppercase"
                    style={{
                      color: item.status === 'active' ? colors.online : colors.offline,
                    }}>
                    {item.status}
                  </Text>
                </View>
                <Text className="mt-sm text-base text-muted">
                  •••• {item.last4}
                  {item.issuer ? ` · ${item.issuer}` : ''}
                </Text>
              </Pressable>
              {isOwner && item.status === 'active' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add recharge for ${item.name}`}
                  className="mt-md self-start rounded-lg border border-border px-md py-sm"
                  onPress={() => openRecharge(item)}>
                  <Text className="text-sm font-medium text-ink">Add recharge</Text>
                </Pressable>
              ) : null}
            </View>
          )}
        />
      )}

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[90%] rounded-t-2xl bg-background px-md pb-xl pt-lg">
            <Text className="text-xl font-semibold text-ink">
              {editing ? editing.name : 'Add card'}
            </Text>
            {isOwner ? (
              <>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Card name"
                  placeholderTextColor={colors.muted}
                  className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
                />
                <TextInput
                  value={last4}
                  onChangeText={setLast4}
                  keyboardType="number-pad"
                  maxLength={4}
                  placeholder="Last 4 digits"
                  placeholderTextColor={colors.muted}
                  className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
                />
                <TextInput
                  value={issuer}
                  onChangeText={setIssuer}
                  placeholder="Issuer (optional)"
                  placeholderTextColor={colors.muted}
                  className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
                />
                {!editing ? (
                  <View className="mt-md">
                    <Text className="mb-sm text-sm font-medium uppercase tracking-wide text-muted">
                      Opening balance (optional)
                    </Text>
                    <AmountField value={openingText} onChangeText={setOpeningText} />
                  </View>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save card"
                  className="mt-lg items-center rounded-lg bg-ink px-md py-md"
                  disabled={busy}
                  onPress={() => void saveCard()}>
                  <Text className="text-base font-semibold text-background">
                    {busy ? 'Saving…' : 'Save'}
                  </Text>
                </Pressable>
              </>
            ) : null}

            {editing ? (
              <View className="mt-lg">
                <Text className="text-sm font-medium uppercase tracking-wide text-muted">
                  Card activity
                </Text>
                {timelineLoading ? (
                  <ActivityIndicator className="mt-md" color={colors.accent} />
                ) : timeline.length === 0 ? (
                  <Text className="mt-sm text-sm text-muted">No recharges or adjustments yet.</Text>
                ) : (
                  timeline.map((entry) => {
                    if (entry.kind === 'recharge') {
                      const item = entry.item;
                      const alreadyReversed = reversedIds.has(item.id);
                      return (
                        <View key={`r-${item.id}`} className="mt-sm border-b border-border py-sm">
                          <Text className="text-base font-semibold text-ink">
                            {formatPkr(item.amount)}
                          </Text>
                          <Text className="text-sm text-muted">
                            Recharge
                            {item.month ? ` · ${item.month}` : ''}
                            {item.source ? ` · ${item.source}` : ''}
                            {alreadyReversed ? ' · reversed' : ''}
                          </Text>
                          {isOwner && !alreadyReversed ? (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Reverse recharge"
                              className="mt-sm self-start"
                              disabled={busy}
                              onPress={() => confirmReverseRecharge(item)}>
                              <Text className="text-sm font-medium" style={{ color: colors.danger }}>
                                Reverse recharge
                              </Text>
                            </Pressable>
                          ) : null}
                        </View>
                      );
                    }

                    const item = entry.item;
                    return (
                      <View key={`a-${item.id}`} className="mt-sm border-b border-border py-sm">
                        <Text className="text-base font-semibold text-ink">
                          {formatPkr(item.amount)}
                        </Text>
                        <Text className="text-sm text-muted">
                          {item.kind}
                          {item.reason ? ` · ${item.reason}` : ''}
                        </Text>
                      </View>
                    );
                  })
                )}
                {isOwner && editing.status === 'active' ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Add recharge"
                    className="mt-md items-center rounded-lg border border-border px-md py-md"
                    onPress={() => openRecharge(editing)}>
                    <Text className="text-base font-semibold text-ink">Add recharge</Text>
                  </Pressable>
                ) : null}
                {isOwner && !hasOpening ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Set opening balance"
                    className="mt-md items-center rounded-lg border border-border px-md py-md"
                    onPress={() => {
                      setOpeningOnlyText('');
                      setOpeningOpen(true);
                    }}>
                    <Text className="text-base font-semibold text-ink">Set opening balance</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {isOwner && editing && editing.status === 'active' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Deactivate card"
                className="mt-md items-center rounded-lg border border-border px-md py-md"
                disabled={busy}
                onPress={() => confirmDeactivate(editing)}>
                <Text className="text-base font-semibold" style={{ color: colors.danger }}>
                  Deactivate card
                </Text>
              </Pressable>
            ) : null}
            {isOwner && editing && editing.status === 'inactive' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Reactivate card"
                className="mt-md items-center rounded-lg border border-border px-md py-md"
                disabled={busy}
                onPress={() => void reactivate(editing)}>
                <Text className="text-base font-semibold text-ink">Reactivate card</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              className="mt-md items-center py-md"
              onPress={() => setFormOpen(false)}>
              <Text className="text-base text-muted">Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={rechargeOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRechargeOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl bg-background px-md pb-xl pt-lg">
            <Text className="text-xl font-semibold text-ink">
              Add recharge{rechargeCard ? ` · ${rechargeCard.name}` : ''}
            </Text>
            <View className="mt-lg">
              <AmountField value={amountText} onChangeText={setAmountText} />
            </View>
            <TextInput
              value={source}
              onChangeText={setSource}
              placeholder="Source (optional)"
              placeholderTextColor={colors.muted}
              className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
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
              accessibilityLabel="Save recharge"
              className="mt-lg items-center rounded-lg bg-ink px-md py-md"
              disabled={busy}
              onPress={() => void saveRecharge()}>
              <Text className="text-base font-semibold text-background">
                {busy ? 'Saving…' : 'Save recharge'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel recharge"
              className="mt-md items-center py-md"
              onPress={() => setRechargeOpen(false)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={openingOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setOpeningOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl bg-background px-md pb-xl pt-lg">
            <Text className="text-xl font-semibold text-ink">
              Opening balance{editing ? ` · ${editing.name}` : ''}
            </Text>
            <Text className="mt-sm text-base text-muted">
              Creates an OPENING adjustment. This does not edit past amounts.
            </Text>
            <View className="mt-lg">
              <AmountField value={openingOnlyText} onChangeText={setOpeningOnlyText} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save opening balance"
              className="mt-lg items-center rounded-lg bg-ink px-md py-md"
              disabled={busy}
              onPress={() => void saveOpeningOnly()}>
              <Text className="text-base font-semibold text-background">
                {busy ? 'Saving…' : 'Save opening balance'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel opening balance"
              className="mt-md items-center py-md"
              onPress={() => setOpeningOpen(false)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
