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

export default function CardsScreen() {
  const { user } = useAuth();
  const { orgId, member, refresh } = useOrg();
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
  const [busy, setBusy] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [rechargeCard, setRechargeCard] = useState<FuelCardDoc | null>(null);
  const [amountText, setAmountText] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [timeline, setTimeline] = useState<RechargeDoc[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    if (!orgId || !member) {
      const timer = setTimeout(() => {
        setCards([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
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
  }, [orgId, member, reloadKey]);

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
      const next = await listRechargesForCard(orgId, card.id);
      setTimeline(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load recharges');
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setName('');
    setLast4('');
    setIssuer('');
    setTimeline([]);
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
    if (!orgId || !isOwner) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await updateCard(orgId, editing.id, { name, last4, issuer });
      } else {
        await createCard(orgId, { name, last4, issuer });
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.name} ending ${item.last4}`}
              className="mb-md rounded-lg border border-border bg-surface px-md py-md"
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
              {isOwner && item.status === 'active' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Add recharge for ${item.name}`}
                  className="mt-md self-start rounded-lg border border-border px-md py-sm"
                  onPress={() => openRecharge(item)}>
                  <Text className="text-sm font-medium text-ink">Add recharge</Text>
                </Pressable>
              ) : null}
            </Pressable>
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
                  Recent recharges
                </Text>
                {timelineLoading ? (
                  <ActivityIndicator className="mt-md" color={colors.accent} />
                ) : timeline.length === 0 ? (
                  <Text className="mt-sm text-sm text-muted">No recharges yet.</Text>
                ) : (
                  timeline.map((item) => (
                    <View key={item.id} className="mt-sm border-b border-border py-sm">
                      <Text className="text-base font-semibold text-ink">
                        {formatPkr(item.amount)}
                      </Text>
                      <Text className="text-sm text-muted">
                        {item.month ?? ''}
                        {item.source ? ` · ${item.source}` : ''}
                      </Text>
                    </View>
                  ))
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
    </View>
  );
}
