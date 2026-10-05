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

import { EmptyState } from '@/components/EmptyState';
import {
  createCard,
  listVisibleCards,
  updateCard,
} from '@/features/cards/cardService';
import { useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';

export default function CardsScreen() {
  const { orgId, member, refresh } = useOrg();
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

  function openCreate() {
    setEditing(null);
    setName('');
    setLast4('');
    setIssuer('');
    setFormOpen(true);
  }

  function openEdit(card: FuelCardDoc) {
    if (!isOwner) {
      return;
    }
    setEditing(card);
    setName(card.name);
    setLast4(card.last4);
    setIssuer(card.issuer);
    setFormOpen(true);
  }

  async function saveCard() {
    if (!orgId) {
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
    <View className="flex-1 bg-background">
      <View className="flex-row items-end justify-between px-md pt-md">
        <View className="flex-1 pr-md">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            Fuel cards
          </Text>
          <Text className="mt-sm text-base text-muted">
            {isOwner
              ? 'Create cards and assign them on People.'
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
              onPress={() => openEdit(item)}
              disabled={!isOwner}>
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
          )}
        />
      )}

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="rounded-t-2xl bg-background px-md pb-xl pt-lg">
            <Text className="text-xl font-semibold text-ink">
              {editing ? 'Edit card' : 'Add card'}
            </Text>
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
            {editing && editing.status === 'active' ? (
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
            {editing && editing.status === 'inactive' ? (
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
              accessibilityLabel="Cancel"
              className="mt-md items-center py-md"
              onPress={() => setFormOpen(false)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
