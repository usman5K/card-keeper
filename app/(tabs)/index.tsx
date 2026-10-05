import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AmountField } from '@/components/AmountField';
import { SyncBadge } from '@/components/SyncBadge';
import { TransactionRow } from '@/components/TransactionRow';
import { useAuth } from '@/features/auth/AuthProvider';
import { listVisibleCards } from '@/features/cards/cardService';
import {
  createFuelTransaction,
  listRecentFuelTransactions,
  type FuelTransactionDoc,
} from '@/features/fuel/fuelService';
import { useOrg } from '@/features/org/OrgProvider';
import { listActiveMembers, type OrgMemberDoc } from '@/features/org/orgService';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';
import { recentChips } from '@/utils/chips';
import { parsePkrInput, formatPkr } from '@/utils/money';

export default function HomeScreen() {
  const { user } = useAuth();
  const { orgId, orgName, member } = useOrg();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [online, setOnline] = useState(true);
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

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      // Web often leaves isInternetReachable null; treat null as online when connected.
      const connected = state.isConnected !== false;
      const reachable = state.isInternetReachable !== false;
      setOnline(connected && reachable);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!orgId || !member || !user) {
      const timer = setTimeout(() => {
        setTxs([]);
        setCards([]);
        setPeople([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const [nextCards, nextTxs, nextPeople] = await Promise.all([
            listVisibleCards(orgId, member),
            listRecentFuelTransactions(orgId, {
              userId: isOwner ? undefined : user.uid,
            }),
            isOwner ? listActiveMembers(orgId) : Promise.resolve([]),
          ]);
          if (cancelled) {
            return;
          }
          const activeCards = nextCards.filter((card) => card.status === 'active');
          setCards(activeCards);
          setTxs(nextTxs);
          setPeople(nextPeople);
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
  }, [orgId, member, user, isOwner]);

  const stationChips = recentChips(txs.map((item) => item.station));
  const areaChips = recentChips(txs.map((item) => item.area));
  const selectedCard = cards.find((card) => card.id === cardId) ?? null;

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
        const nextTxs = await listRecentFuelTransactions(orgId, {
          userId: isOwner ? undefined : user.uid,
        });
        setTxs(nextTxs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save fuel');
      } finally {
        setBusy(false);
      }
    };

    if (!online) {
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
            <SyncBadge status={online ? 'online' : 'offline'} />
            <Link href="/settings" accessibilityLabel="Open settings">
              <Text style={{ color: colors.accent }} className="text-sm font-medium">
                Settings
              </Text>
            </Link>
          </View>

          <Text className="mt-lg text-sm font-medium uppercase tracking-wide text-muted">
            {orgName ?? 'Workspace'}
          </Text>
          <Text className="mt-sm text-sm font-medium uppercase tracking-wide text-muted">
            Available balance
          </Text>
          <Text className="mt-sm text-4xl font-bold text-ink">
            {selectedCard?.serverBalanceSnapshot != null
              ? formatPkr(selectedCard.serverBalanceSnapshot)
              : 'Rs —'}
          </Text>
          <Text className="mt-sm text-base text-muted">
            {selectedCard
              ? `${selectedCard.name} preview. Server reconcile comes next.`
              : 'Add a card to start tracking balance.'}
          </Text>

          {error ? (
            <Text className="mt-md text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}

          <Text className="mt-xl text-sm font-medium uppercase tracking-wide text-muted">
            Recent fuel
          </Text>
          {loading ? (
            <ActivityIndicator className="mt-md" color={colors.accent} />
          ) : txs.length === 0 ? (
            <Text className="mt-md text-base text-muted">No fuel entries yet.</Text>
          ) : (
            txs.map((item) => (
              <TransactionRow
                key={item.id}
                amount={item.amount}
                title={item.station}
                subtitle={`${item.area}${item.syncStatus === 'PENDING' ? ' · pending sync' : ''}`}
                syncStatus={item.syncStatus}
              />
            ))
          )}
        </View>
      </ScrollView>

      <View className="border-t border-border bg-background px-md pt-md" style={{ paddingBottom: 12 }}>
        {cards.length === 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go to Cards to add a card"
            className="mb-sm"
            onPress={() => router.push('/(tabs)/cards')}>
            <Text className="text-center text-sm text-muted">
              Add a card on the Cards tab before logging fuel.
            </Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add Fuel"
          className="items-center rounded-lg bg-ink px-md py-md"
          style={{ opacity: cards.length === 0 ? 0.45 : 1 }}
          onPress={openSheet}
          disabled={cards.length === 0}>
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
                {busy ? 'Saving…' : online ? 'Save fuel' : 'Save offline'}
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
