import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AmountField } from '@/components/AmountField';
import { AppButton } from '@/components/AppButton';
import { BottomSheet } from '@/components/BottomSheet';
import { CardListItem } from '@/components/CardListItem';
import { CardsSkeleton } from '@/components/CardsSkeleton';
import { ConfirmSheet } from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { SheetActions } from '@/components/SheetActions';
import {
  createOpeningBalance,
  listAdjustmentsForCard,
  listCardsWithOpening,
  reverseRecharge,
  type AdjustmentDoc,
} from '@/features/adjustments/adjustmentService';
import { useAuth } from '@/features/auth/AuthProvider';
import { projectBalancesForCards } from '@/features/balance/balanceService';
import {
  createCard,
  listVisibleCards,
  updateCard,
} from '@/features/cards/cardService';
import { orgCapabilities } from '@/features/org/capabilities';
import { useOrg } from '@/features/org/OrgProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';
import {
  getCardPin,
  getPinRequestForCard,
  isPinRevealActive,
  listMyPinRequests,
  listPendingPinRequests,
  requestCardPin,
  resolvePinRequest,
  setCardPin,
  sharePinAccess,
  type PinRequestDoc,
} from '@/features/pin/pinService';
import {
  createRecharge,
  listRechargesForCard,
  type RechargeDoc,
} from '@/features/recharges/rechargeService';
import { a11y } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { formatPkr, parsePkrInput } from '@/utils/money';

type TimelineItem =
  | { kind: 'recharge'; occurredAt: string; item: RechargeDoc }
  | { kind: 'adjustment'; occurredAt: string; item: AdjustmentDoc };

type PendingConfirm = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
};

export default function CardsScreen() {
  const { user } = useAuth();
  const { ready: orgReady, orgId, member, refresh } = useOrg();
  const { colors } = useTheme();
  const caps = orgCapabilities(member?.role);
  const isOwner = caps.isOwner;
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [openingCardIds, setOpeningCardIds] = useState<Set<string>>(new Set());
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyCard, setHistoryCard] = useState<FuelCardDoc | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [reversedIds, setReversedIds] = useState<Set<string>>(new Set());
  const [openingOpen, setOpeningOpen] = useState(false);
  const [openingCard, setOpeningCard] = useState<FuelCardDoc | null>(null);
  const [openingOnlyText, setOpeningOnlyText] = useState('');
  const [pinText, setPinText] = useState('');
  const [pendingPins, setPendingPins] = useState<PinRequestDoc[]>([]);
  const [myPins, setMyPins] = useState<PinRequestDoc[]>([]);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealCard, setRevealCard] = useState<FuelCardDoc | null>(null);
  const [revealPin, setRevealPin] = useState<string | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<PinRequestDoc | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

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
        setBalances({});
        setOpeningCardIds(new Set());
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

          const needsProjection = next
            .filter((card) => card.serverBalanceSnapshot == null)
            .map((card) => card.id);
          const snapshotBalances: Record<string, number> = {};
          for (const card of next) {
            if (card.serverBalanceSnapshot != null) {
              snapshotBalances[card.id] = card.serverBalanceSnapshot;
            }
          }
          setBalances(snapshotBalances);

          const [projected, pinRows, openingIds] = await Promise.all([
            needsProjection.length > 0
              ? projectBalancesForCards(orgId, needsProjection).catch(() => ({} as Record<string, number>))
              : Promise.resolve({} as Record<string, number>),
            member.role === 'owner'
              ? listPendingPinRequests(orgId)
              : user
                ? listMyPinRequests(orgId, user.uid)
                : Promise.resolve([] as PinRequestDoc[]),
            listCardsWithOpening(
              orgId,
              next.map((card) => card.id),
            ).catch(() => new Set<string>()),
          ]);
          if (cancelled) {
            return;
          }
          const nextBalances: Record<string, number> = { ...snapshotBalances };
          for (const card of next) {
            if (nextBalances[card.id] == null && projected[card.id] != null) {
              nextBalances[card.id] = projected[card.id];
            }
          }
          setBalances(nextBalances);
          setOpeningCardIds(openingIds);
          if (member.role === 'owner') {
            setPendingPins(pinRows);
            setMyPins([]);
          } else {
            setMyPins(pinRows);
            setPendingPins([]);
          }
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
  }, [orgReady, orgId, member, reloadKey, user]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadKey((value) => value + 1);
  }, []);

  function myRequestFor(cardId: string) {
    return myPins.find((item) => item.cardId === cardId) ?? null;
  }

  async function handleRequestPin(card: FuelCardDoc) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      await requestCardPin(orgId, user.uid, { cardId: card.id });
      toast.success('PIN request sent.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'PIN request failed');
    } finally {
      setBusy(false);
    }
  }

  async function openReveal(card: FuelCardDoc) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      if (!isOwner) {
        const req = await getPinRequestForCard(orgId, card.id, user.uid);
        if (!req || !isPinRevealActive(req)) {
          throw new Error('PIN reveal is not available. Request access from the owner.');
        }
      }
      const value = await getCardPin(orgId, card.id);
      if (!value) {
        throw new Error('No PIN is set for this card yet.');
      }
      setRevealCard(card);
      setRevealPin(value);
      setRevealOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not open PIN');
    } finally {
      setBusy(false);
    }
  }

  async function handleResolve(status: 'approved' | 'rejected') {
    if (!orgId || !user || !resolveTarget) {
      return;
    }
    setBusy(true);
    try {
      await resolvePinRequest(orgId, resolveTarget.id, user.uid, { status });
      setResolveOpen(false);
      setResolveTarget(null);
      toast.success(status === 'approved' ? 'PIN request approved.' : 'PIN request rejected.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not resolve PIN request');
    } finally {
      setBusy(false);
    }
  }

  async function handleShare() {
    if (!orgId || !user || !resolveTarget) {
      return;
    }
    setBusy(true);
    try {
      await sharePinAccess(orgId, resolveTarget.id, user.uid);
      setResolveOpen(false);
      setResolveTarget(null);
      toast.success('PIN shared.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not share PIN access');
    } finally {
      setBusy(false);
    }
  }

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
      if (adjustments.some((item) => item.kind === 'OPENING')) {
        setOpeningCardIds((current) => new Set(current).add(card.id));
      }
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
      toast.error(err instanceof Error ? err.message : 'Could not load card activity');
      setTimeline([]);
      setReversedIds(new Set());
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
    setPinText('');
    setFormOpen(true);
  }

  function openEdit(card: FuelCardDoc) {
    setEditing(card);
    setName(card.name);
    setLast4(card.last4);
    setIssuer(card.issuer);
    setPinText('');
    setFormOpen(true);
  }

  function openHistory(card: FuelCardDoc) {
    setHistoryCard(card);
    setTimeline([]);
    setHistoryOpen(true);
    void loadTimeline(card);
  }

  function openOpening(card: FuelCardDoc) {
    setOpeningCard(card);
    setOpeningOnlyText('');
    setOpeningOpen(true);
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
    try {
      if (editing) {
        await updateCard(orgId, user.uid, editing.id, { name, last4, issuer });
        const pinRaw = pinText.trim();
        if (pinRaw) {
          await setCardPin(orgId, user.uid, editing.id, pinRaw);
        }
        toast.success('Card updated.');
      } else {
        const card = await createCard(orgId, user.uid, { name, last4, issuer });
        const openingRaw = openingText.trim();
        if (openingRaw) {
          const opening = parsePkrInput(openingRaw);
          if (opening > 0) {
            await createOpeningBalance(orgId, user.uid, card.id, opening);
          }
        }
        const pinRaw = pinText.trim();
        if (pinRaw) {
          await setCardPin(orgId, user.uid, card.id, pinRaw);
        }
        toast.success('Card created.');
      }
      setFormOpen(false);
      reload();
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  function confirmReverseRecharge(item: RechargeDoc) {
    setConfirm({
      title: 'Reverse recharge',
      body: `Create a reversal for ${formatPkr(item.amount)}? The original recharge stays on the ledger.`,
      confirmLabel: 'Reverse recharge',
      destructive: true,
      run: async () => {
        if (!orgId || !user || !historyCard) {
          return;
        }
        setBusy(true);
        try {
          await reverseRecharge(orgId, user.uid, item);
          toast.success('Recharge reversed.');
          await loadTimeline(historyCard);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Reverse failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function saveOpeningOnly() {
    if (!orgId || !user || !openingCard) {
      return;
    }
    setBusy(true);
    try {
      const amount = parsePkrInput(openingOnlyText);
      await createOpeningBalance(orgId, user.uid, openingCard.id, amount);
      setOpeningOpen(false);
      setOpeningOnlyText('');
      setOpeningCardIds((current) => new Set(current).add(openingCard.id));
      setOpeningCard(null);
      toast.success('Opening balance set.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Opening balance failed');
    } finally {
      setBusy(false);
    }
  }

  async function saveRecharge() {
    if (!orgId || !user || !rechargeCard) {
      return;
    }
    setBusy(true);
    try {
      const amount = parsePkrInput(amountText);
      await createRecharge(orgId, user.uid, {
        cardId: rechargeCard.id,
        amount,
        source: source.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setRechargeOpen(false);
      toast.success('Recharge recorded.');
      if (editing?.id === rechargeCard.id) {
        await loadTimeline(rechargeCard);
      }
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Recharge failed');
    } finally {
      setBusy(false);
    }
  }

  function confirmDeactivate(card: FuelCardDoc) {
    setConfirm({
      title: 'Deactivate card',
      body: `Stop using ${card.name} for new fuel?`,
      confirmLabel: 'Deactivate card',
      destructive: true,
      run: async () => {
        if (!orgId || !user) {
          return;
        }
        setBusy(true);
        try {
          await updateCard(orgId, user.uid, card.id, { status: 'inactive' });
          setFormOpen(false);
          toast.success('Card deactivated.');
          reload();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Update failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function reactivate(card: FuelCardDoc) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      await updateCard(orgId, user.uid, card.id, { status: 'active' });
      setFormOpen(false);
      toast.success('Card reactivated.');
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-background">
      <View className="px-md pt-md">
        <Text className="text-base text-muted">
          {isOwner
            ? 'Balances, recharges, and PIN access for each fuel card.'
            : 'Cards assigned to you. Request PIN when you need it.'}
        </Text>
        {isOwner ? (
          <View className="mt-md">
            <AppButton label="Add card" onPress={openCreate} />
          </View>
        ) : null}
      </View>

      {isOwner && pendingPins.length > 0 ? (
        <View className="px-md pt-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            PIN requests
          </Text>
          {pendingPins.map((item) => {
            const card = cards.find((c) => c.id === item.cardId);
            return (
              <View
                key={item.id}
                className="mt-sm rounded-lg border border-border bg-surface px-md py-md">
                <Text className="text-base font-semibold text-ink">
                  {card?.name ?? 'Card'} · •••• {card?.last4 ?? '????'}
                </Text>
                <Text className="mt-xs text-sm text-muted">Pending member request</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Review PIN request"
                  className="mt-md self-start rounded-lg bg-accent px-md py-sm"
                  onPress={() => {
                    setResolveTarget(item);
                    setResolveOpen(true);
                  }}>
                  <Text className="text-sm font-semibold text-background">Review</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ) : null}

      {loading ? (
        <CardsSkeleton />
      ) : error && cards.length === 0 ? (
        <View className="px-md pt-lg">
          <EmptyState title="Could not load cards" body={error} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading cards"
            className="mt-md items-center rounded-lg border border-border px-md"
            style={{ minHeight: a11y.minHit, justifyContent: 'center' }}
            onPress={() => {
              setLoading(true);
              setError(null);
              setReloadKey((value) => value + 1);
            }}>
            <Text className="text-base font-medium text-ink">Try again</Text>
          </Pressable>
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
          renderItem={({ item }) => {
            const balance =
              balances[item.id] ?? item.serverBalanceSnapshot ?? null;
            const balanceEstimated =
              item.serverBalanceSnapshot == null && balance != null;
            let pinAction: {
              label: string;
              onPress: () => void;
              primary?: boolean;
              pending?: boolean;
            } | null = null;

            if (!isOwner && item.status === 'active') {
              const req = myRequestFor(item.id);
              if (req && isPinRevealActive(req)) {
                pinAction = {
                  label: 'View PIN',
                  primary: true,
                  onPress: () => {
                    void openReveal(item);
                  },
                };
              } else if (req?.status === 'pending') {
                pinAction = { label: 'PIN request pending', pending: true, onPress: () => undefined };
              } else {
                pinAction = {
                  label: 'Request PIN',
                  onPress: () => {
                    void handleRequestPin(item);
                  },
                };
              }
            } else if (isOwner && item.hasPin) {
              pinAction = {
                label: 'View PIN',
                onPress: () => {
                  void openReveal(item);
                },
              };
            }

            return (
              <CardListItem
                card={item}
                balance={balance}
                balanceEstimated={balanceEstimated}
                isOwner={Boolean(isOwner)}
                showOpening={isOwner && item.status === 'active' && !openingCardIds.has(item.id)}
                pinAction={pinAction}
                onPressCard={() => {
                  if (isOwner) {
                    openEdit(item);
                    return;
                  }
                  openHistory(item);
                }}
                onEdit={() => openEdit(item)}
                onHistory={() => openHistory(item)}
                onAddRecharge={
                  isOwner && item.status === 'active'
                    ? () => openRecharge(item)
                    : undefined
                }
                onAddOpening={
                  isOwner && item.status === 'active' && !openingCardIds.has(item.id)
                    ? () => openOpening(item)
                    : undefined
                }
              />
            );
          }}
        />
      )}

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
        visible={formOpen}
        title={editing ? 'Edit card' : 'Add card'}
        onClose={() => setFormOpen(false)}
        footer={
          isOwner ? (
            <SheetActions>
              {editing?.status === 'active' ? (
                <AppButton
                  label="Deactivate"
                  variant="danger"
                  disabled={busy}
                  onPress={() => confirmDeactivate(editing)}
                />
              ) : editing?.status === 'inactive' ? (
                <AppButton
                  label="Reactivate"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => void reactivate(editing)}
                />
              ) : (
                <AppButton label="Cancel" variant="secondary" onPress={() => setFormOpen(false)} />
              )}
              <AppButton label={busy ? 'Saving…' : 'Save'} busy={busy} onPress={() => void saveCard()} />
            </SheetActions>
          ) : undefined
        }>
        {isOwner ? (
          <>
            <FieldLabel text="Card name" color={colors.muted} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. PSO Shell"
              placeholderTextColor={colors.muted}
              style={fieldStyle(colors)}
            />
            <FieldLabel text="Last 4 digits" color={colors.muted} />
            <TextInput
              value={last4}
              onChangeText={setLast4}
              keyboardType="number-pad"
              maxLength={4}
              placeholder="4821"
              placeholderTextColor={colors.muted}
              style={fieldStyle(colors)}
            />
            <FieldLabel text="Issuer" color={colors.muted} />
            <TextInput
              value={issuer}
              onChangeText={setIssuer}
              placeholder="Optional"
              placeholderTextColor={colors.muted}
              style={fieldStyle(colors)}
            />
            <FieldLabel text="PIN" color={colors.muted} />
            <TextInput
              value={pinText}
              onChangeText={setPinText}
              keyboardType="number-pad"
              maxLength={12}
              secureTextEntry
              placeholder={editing?.hasPin ? 'New PIN (optional)' : 'Optional'}
              placeholderTextColor={colors.muted}
              style={fieldStyle(colors)}
            />
            {!editing ? (
              <View className="mt-md">
                <FieldLabel text="Opening balance (optional)" color={colors.muted} />
                <AmountField value={openingText} onChangeText={setOpeningText} label="Amount (PKR)" />
              </View>
            ) : null}
          </>
        ) : (
          <Text className="text-base text-muted">Only the owner can edit card details.</Text>
        )}
      </BottomSheet>

      <BottomSheet
        visible={historyOpen}
        title={historyCard ? `History · ${historyCard.name}` : 'Card history'}
        onClose={() => {
          setHistoryOpen(false);
          setHistoryCard(null);
          setTimeline([]);
        }}>
        {timelineLoading ? (
          <ActivityIndicator className="mt-md" color={colors.accent} />
        ) : timeline.length === 0 ? (
          <Text className="mt-sm text-base text-muted">No recharges or adjustments yet.</Text>
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
                      className="mt-sm self-start justify-center"
                      style={{ minHeight: a11y.minHit }}
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
      </BottomSheet>

      <BottomSheet
        visible={rechargeOpen}
        title={rechargeCard ? `Add recharge · ${rechargeCard.name}` : 'Add recharge'}
        onClose={() => setRechargeOpen(false)}
        footer={
          <SheetActions>
            <AppButton
              label="Cancel"
              variant="secondary"
              disabled={busy}
              onPress={() => setRechargeOpen(false)}
            />
            <AppButton
              label={busy ? 'Saving…' : 'Save'}
              busy={busy}
              onPress={() => void saveRecharge()}
            />
          </SheetActions>
        }>
        <AmountField value={amountText} onChangeText={setAmountText} />
        <TextInput
          value={source}
          onChangeText={setSource}
          placeholder="Source (optional)"
          placeholderTextColor={colors.muted}
          style={[fieldStyle(colors), { marginTop: 12 }]}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          placeholderTextColor={colors.muted}
          style={[fieldStyle(colors), { marginTop: 12 }]}
        />
      </BottomSheet>

      <BottomSheet
        visible={openingOpen}
        title={openingCard ? `Opening · ${openingCard.name}` : 'Opening balance'}
        onClose={() => {
          setOpeningOpen(false);
          setOpeningCard(null);
        }}
        footer={
          <SheetActions>
            <AppButton
              label="Cancel"
              variant="secondary"
              disabled={busy}
              onPress={() => {
                setOpeningOpen(false);
                setOpeningCard(null);
              }}
            />
            <AppButton
              label={busy ? 'Saving…' : 'Save'}
              busy={busy}
              onPress={() => void saveOpeningOnly()}
            />
          </SheetActions>
        }>
        <Text className="text-base text-muted">
          Creates an OPENING adjustment. This does not edit past amounts.
        </Text>
        <View className="mt-lg">
          <AmountField value={openingOnlyText} onChangeText={setOpeningOnlyText} />
        </View>
      </BottomSheet>

      <BottomSheet
        visible={resolveOpen}
        title="PIN request"
        onClose={() => {
          setResolveOpen(false);
          setResolveTarget(null);
        }}
        footer={
          <View style={{ gap: 8 }}>
            <SheetActions>
              <AppButton
                label="Reject"
                variant="danger"
                disabled={busy}
                onPress={() => void handleResolve('rejected')}
              />
              <AppButton
                label={busy ? 'Working…' : 'Approve'}
                busy={busy}
                onPress={() => void handleResolve('approved')}
              />
            </SheetActions>
            <AppButton
              label="Share access"
              variant="secondary"
              disabled={busy}
              onPress={() => void handleShare()}
            />
          </View>
        }>
        <Text className="text-base text-muted">
          Approve to share a time-limited PIN view. Reject to deny. Share extends access.
        </Text>
      </BottomSheet>

      <BottomSheet
        visible={revealOpen}
        title={revealCard ? `Card PIN · ${revealCard.name}` : 'Card PIN'}
        onClose={() => {
          setRevealOpen(false);
          setRevealPin(null);
          setRevealCard(null);
        }}
        footer={
          <AppButton
            label="Hide PIN"
            onPress={() => {
              setRevealOpen(false);
              setRevealPin(null);
              setRevealCard(null);
            }}
          />
        }>
        <Text className="text-base text-muted">
          Shown briefly. Do not screenshot or share outside the fuel stop.
        </Text>
        <Text
          className="mt-lg text-center text-4xl font-bold tracking-widest text-ink"
          accessibilityLabel="Card PIN value">
          {revealPin ?? '----'}
        </Text>
      </BottomSheet>
    </View>
  );
}

function fieldStyle(colors: { border: string; surface: string; ink: string }) {
  return {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.ink,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
  };
}

function FieldLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{
        color,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        marginBottom: 6,
      }}>
      {text}
    </Text>
  );
}
