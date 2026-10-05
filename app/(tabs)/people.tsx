import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHero } from '@/components/BalanceHero';
import { EmptyState } from '@/components/EmptyState';
import { PeopleSkeleton } from '@/components/PeopleSkeleton';
import { SettlementPaymentSheet } from '@/components/SettlementPaymentSheet';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import { listActiveMembers, type OrgMemberDoc } from '@/features/org/orgService';
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
import { useSync } from '@/features/sync/SyncProvider';
import { a11y, colors } from '@/theme/tokens';
import { formatPkr, parsePkrInput } from '@/utils/money';
import {
  assignedCardCountLabel,
  buildPersonListItems,
  inviteEmailLooksValid,
  personDisplayName,
  settlementMethodLabel,
  sortPeopleByOutstanding,
  sumRecoverableOutstanding,
  type PersonFinance,
} from '@/utils/peopleDashboard';

export default function PeopleScreen() {
  const { user } = useAuth();
  const { orgId, orgName, member, inviteEmail } = useOrg();
  const { isOnline } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMemberDoc[]>([]);
  const [finance, setFinance] = useState<Record<string, PersonFinance>>({});
  const [pending, setPending] = useState<SettlementDoc[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payUserId, setPayUserId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<(typeof settlementMethods)[number]>('cash');
  const [notes, setNotes] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  const loadLedger = useCallback(async () => {
    if (!orgId || !member || !user) {
      setMembers([]);
      setFinance({});
      setPending([]);
      setLoading(false);
      return;
    }

    const nextMembers = await listActiveMembers(orgId);
    const targets = isOwner
      ? nextMembers
      : nextMembers.filter((item) => item.id === user.uid);
    const rows = await Promise.all(
      targets.map(async (person) => {
        const row = await getPersonOutstanding(orgId, person.id);
        return [
          person.id,
          {
            outstanding: row.outstanding,
            fuelTotal: row.fuelTotal,
            settledTotal: row.settledTotal,
          },
        ] as const;
      }),
    );
    const map: Record<string, PersonFinance> = {};
    for (const [id, row] of rows) {
      map[id] = row;
    }
    const nextPending = isOwner ? await listPendingSettlements(orgId) : [];
    setMembers(nextMembers);
    setFinance(map);
    setPending(nextPending);
  }, [orgId, member, user, isOwner]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
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
  }, [loadLedger, reloadKey]);

  const listItems = useMemo(() => {
    if (!user || !member) {
      return [];
    }
    return sortPeopleByOutstanding(
      buildPersonListItems(members, finance, {
        role: member.role,
        uid: user.uid,
      }),
    );
  }, [members, finance, user, member]);

  const recoverable = useMemo(() => {
    if (isOwner) {
      return sumRecoverableOutstanding(
        listItems
          .filter((item) => item.outstanding != null)
          .map((item) => ({ outstanding: item.outstanding as number })),
      );
    }
    return user ? (finance[user.uid]?.outstanding ?? 0) : 0;
  }, [isOwner, listItems, finance, user]);

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
      setReloadKey((value) => value + 1);
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
      setReloadKey((value) => value + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not confirm settlement');
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmailLooksValid(email)) {
      setError('Enter a valid email');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await inviteEmail(email);
      setMessage(`Invite sent to ${email.trim().toLowerCase()}`);
      setEmail('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}>
      <View className="px-md pt-lg">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">
          {orgName ?? 'Workspace'}
        </Text>
        <View className="mt-lg">
          <BalanceHero
            amount={loading ? null : recoverable}
            trusted
            label={isOwner ? 'To recover' : 'Your outstanding'}
            caption={
              isOwner
                ? 'Outstanding balances across the workspace.'
                : 'Fuel attributed to you minus confirmed payments.'
            }
            loading={loading}
          />
        </View>
        {!isOwner && user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Record a payment"
            className="mt-md items-center rounded-lg bg-ink px-md"
            style={({ pressed }) => ({
              minHeight: a11y.minHit,
              justifyContent: 'center',
              opacity: pressed ? 0.88 : 1,
            })}
            onPress={() => openPayment(user.uid)}>
            <Text className="text-base font-semibold text-background">Record payment</Text>
          </Pressable>
        ) : null}
      </View>

      {error && !loading && listItems.length === 0 ? (
        <View className="px-md pt-lg">
          <EmptyState title="Could not load people" body={error} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading people"
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
      ) : null}
      {error && listItems.length > 0 ? (
        <Text className="px-md pt-md text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
      ) : null}
      {!isOnline ? (
        <Text className="px-md pt-md text-sm" style={{ color: colors.offline }}>
          Offline. Outstanding amounts may be last known.
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
                  {formatPkr(item.amount)} · {settlementMethodLabel(item.method)}
                </Text>
                <Text className="mt-xs text-sm text-muted">
                  {person ? personDisplayName(person) : item.userId}
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Confirm settlement"
                  className="mt-md items-center justify-center rounded-lg bg-accent px-md"
                  style={{ minHeight: a11y.minHit }}
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
            autoCorrect={false}
            placeholder="name@email.com"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Invite email"
            className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send invite"
            className="mt-md items-center rounded-lg bg-ink px-md py-md"
            disabled={busy || !email.trim()}
            onPress={() => void sendInvite()}>
            <Text className="text-base font-semibold text-background">
              {busy ? 'Working…' : 'Send invite'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View className="mt-xl px-md">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">People</Text>
        {loading ? (
          <PeopleSkeleton />
        ) : listItems.length === 0 && !error ? (
          <EmptyState title="No members" body="Invite someone to share this ledger." />
        ) : listItems.length === 0 ? null : (
          listItems.map((person) => {
            const openable = isOwner || person.id === user?.uid;
            const body = (
              <>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-md">
                    <Text className="text-lg font-semibold text-ink">
                      {personDisplayName(person)}
                    </Text>
                    <Text className="mt-xs text-sm text-muted">
                      {person.email} · {person.role}
                    </Text>
                  </View>
                  {person.outstanding != null ? (
                    <Text
                      className="text-xl font-bold text-ink"
                      accessibilityLabel={`Outstanding ${formatPkr(person.outstanding)}`}>
                      {formatPkr(person.outstanding)}
                    </Text>
                  ) : null}
                </View>
                {person.outstanding != null ? (
                  <Text className="mt-sm text-sm text-muted">
                    Spent {formatPkr(person.fuelTotal ?? 0)} · Settled{' '}
                    {formatPkr(person.settledTotal ?? 0)}
                  </Text>
                ) : (
                  <Text className="mt-sm text-sm text-muted">
                    {assignedCardCountLabel(person.assignedCardIds.length)}
                  </Text>
                )}
              </>
            );

            if (!openable) {
              return (
                <View
                  key={person.id}
                  className="mt-md rounded-lg border border-border bg-surface px-md py-md">
                  {body}
                </View>
              );
            }

            return (
              <Pressable
                key={person.id}
                accessibilityRole="button"
                accessibilityLabel={`Open ${personDisplayName(person)}`}
                className="mt-md rounded-lg border border-border bg-surface px-md py-md"
                onPress={() => router.push(`/person/${person.id}`)}>
                {body}
              </Pressable>
            );
          })
        )}
      </View>

      <SettlementPaymentSheet
        visible={sheetOpen}
        busy={busy}
        isOwner={isOwner}
        amountText={amountText}
        method={method}
        notes={notes}
        payUserId={payUserId}
        people={members}
        onChangeAmount={setAmountText}
        onChangeMethod={setMethod}
        onChangeNotes={setNotes}
        onChangePayUserId={setPayUserId}
        onSubmit={() => void submitPayment()}
        onClose={() => setSheetOpen(false)}
      />
    </ScrollView>
  );
}
