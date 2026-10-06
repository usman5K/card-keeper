import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Info, Mail } from 'lucide-react-native';

import { AppButton } from '@/components/AppButton';
import { BalanceHero } from '@/components/BalanceHero';
import { BottomSheet } from '@/components/BottomSheet';
import { ChipRow } from '@/components/ChipRow';
import { EmptyState } from '@/components/EmptyState';
import { PeopleSkeleton } from '@/components/PeopleSkeleton';
import { SettlementPaymentSheet } from '@/components/SettlementPaymentSheet';
import { SheetActions } from '@/components/SheetActions';
import { useAuth } from '@/features/auth/AuthProvider';
import { orgCapabilities } from '@/features/org/capabilities';
import { useOrg } from '@/features/org/OrgProvider';
import {
  listActiveMembers,
  listOrgInvites,
  revokeInvite,
  setMemberStatus,
  type OrgInviteDoc,
  type OrgMemberDoc,
} from '@/features/org/orgService';
import { assertInviteEmailAvailable } from '@/utils/inviteGuard';
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
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';
import { a11y } from '@/theme/tokens';
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
  type PersonListItem,
} from '@/utils/peopleDashboard';

type PeopleFilter = 'All' | 'Invited' | 'Members';

const FILTERS: PeopleFilter[] = ['All', 'Invited', 'Members'];

export default function PeopleScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { orgId, orgName, member, inviteEmail } = useOrg();
  const { isOnline } = useSync();
  const router = useRouter();
  const caps = orgCapabilities(member?.role);
  const isOwner = caps.isOwner;
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMemberDoc[]>([]);
  const [invites, setInvites] = useState<OrgInviteDoc[]>([]);
  const [finance, setFinance] = useState<Record<string, PersonFinance>>({});
  const [pending, setPending] = useState<SettlementDoc[]>([]);
  const [myPending, setMyPending] = useState<SettlementDoc[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [payUserId, setPayUserId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<(typeof settlementMethods)[number]>('cash');
  const [notes, setNotes] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [filter, setFilter] = useState<PeopleFilter>('All');
  const [infoPerson, setInfoPerson] = useState<PersonListItem | null>(null);

  const loadLedger = useCallback(async () => {
    if (!orgId || !member || !user) {
      setMembers([]);
      setInvites([]);
      setFinance({});
      setPending([]);
      setMyPending([]);
      setLoading(false);
      return;
    }

    if (!isOwner) {
      const row = await getPersonOutstanding(orgId, user.uid);
      setMembers([
        {
          id: user.uid,
          role: member.role,
          status: member.status,
          email: member.email,
          displayName: member.displayName,
          assignedCardIds: member.assignedCardIds ?? [],
          createdAt: member.createdAt,
          updatedAt: member.updatedAt,
        },
      ]);
      setInvites([]);
      setFinance({
        [user.uid]: {
          outstanding: row.outstanding,
          fuelTotal: row.fuelTotal,
          settledTotal: row.settledTotal,
        },
      });
      setPending([]);
      setMyPending(row.settlements.filter((item) => item.status === 'pending'));
      return;
    }

    const nextMembers = await listActiveMembers(orgId);
    const rows = await Promise.all(
      nextMembers.map(async (person) => {
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
    const [nextPending, nextInvites] = await Promise.all([
      listPendingSettlements(orgId),
      listOrgInvites(orgId),
    ]);
    setMembers(nextMembers);
    setInvites(nextInvites.filter((item) => item.status === 'pending'));
    setFinance(map);
    setPending(nextPending);
    setMyPending([]);
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

  const showMembers = filter === 'All' || filter === 'Members';
  const showInvites = isOwner && (filter === 'All' || filter === 'Invited');
  const filteredEmpty =
    !loading &&
    !error &&
    (showMembers ? listItems.length === 0 : true) &&
    (showInvites ? invites.length === 0 : true);

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
      toast.success(
        member.role === 'owner'
          ? 'Settlement recorded and confirmed.'
          : 'Settlement submitted for owner confirmation.',
      );
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save settlement');
    } finally {
      setBusy(false);
    }
  }

  async function approvePending(item: SettlementDoc) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      await confirmSettlement(orgId, item.id, user.uid);
      toast.success('Settlement confirmed.');
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not confirm settlement');
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite() {
    if (!inviteEmailLooksValid(email)) {
      toast.error('Enter a valid email');
      return;
    }
    try {
      assertInviteEmailAvailable(email, members, invites);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite not allowed');
      return;
    }
    setBusy(true);
    try {
      const invited = email.trim().toLowerCase();
      await inviteEmail(email);
      toast.success(`Invite sent to ${invited}`);
      setEmail('');
      setFilter('Invited');
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invite failed');
    } finally {
      setBusy(false);
    }
  }

  async function withdrawInvite(inviteId: string) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      await revokeInvite(orgId, inviteId, user.uid);
      toast.success('Invite withdrawn.');
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not withdraw invite');
    } finally {
      setBusy(false);
    }
  }

  async function removeMember(memberId: string, label: string) {
    if (!orgId || !user) {
      return;
    }
    setBusy(true);
    try {
      await setMemberStatus(orgId, memberId, 'removed', user.uid);
      toast.success(`Removed ${label} from this workspace.`);
      setInfoPerson(null);
      setReloadKey((value) => value + 1);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not remove member');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}>
          {orgName ?? 'Workspace'}
        </Text>
        <View style={{ marginTop: 16 }}>
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
          <View style={{ marginTop: 12, gap: 10 }}>
            <AppButton label="Record payment" onPress={() => openPayment(user.uid)} />
            <AppButton
              label="View your history"
              variant="secondary"
              onPress={() => router.push(`/person/${user.uid}`)}
            />
          </View>
        ) : null}
        {!isOwner ? (
          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 12 }}>
            Member workspace. You can log fuel on assigned cards, request PIN access, and settle
            your own balance. Invites, cards, and org reports stay with the owner.
          </Text>
        ) : null}
      </View>

      {error && !loading && (isOwner ? listItems.length === 0 : true) ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
          <EmptyState
            title={isOwner ? 'Could not load people' : 'Could not load balances'}
            body={error}
          />
          <View style={{ marginTop: 12 }}>
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
      ) : null}
      {!isOnline ? (
        <Text style={{ color: colors.offline, paddingHorizontal: 16, paddingTop: 12, fontSize: 14 }}>
          Offline. Outstanding amounts may be last known.
        </Text>
      ) : null}

      {!isOwner ? (
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          {loading ? <PeopleSkeleton /> : null}
          {!loading && user ? (
            <>
              <View style={cardStyle(colors)}>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Your totals</Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 8 }}>
                  Spent {formatPkr(finance[user.uid]?.fuelTotal ?? 0)} · Settled{' '}
                  {formatPkr(finance[user.uid]?.settledTotal ?? 0)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                  {assignedCardCountLabel(member?.assignedCardIds?.length ?? 0)}
                </Text>
              </View>
              {myPending.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={sectionLabel(colors.muted)}>Awaiting owner confirmation</Text>
                  {myPending.map((item) => (
                    <View key={item.id} style={cardStyle(colors)}>
                      <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
                        {formatPkr(item.amount)} · {settlementMethodLabel(item.method)}
                      </Text>
                      <Text
                        style={{
                          color: colors.offline,
                          fontSize: 13,
                          marginTop: 4,
                          fontWeight: '600',
                        }}>
                        Pending
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {isOwner && pending.length > 0 ? (
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={sectionLabel(colors.muted)}>Pending confirmations</Text>
          {pending.map((item) => {
            const person = members.find((m) => m.id === item.userId);
            return (
              <View key={item.id} style={cardStyle(colors)}>
                <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
                  {formatPkr(item.amount)} · {settlementMethodLabel(item.method)}
                </Text>
                <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
                  {person ? personDisplayName(person) : item.userId}
                </Text>
                <View style={{ marginTop: 12 }}>
                  <AppButton
                    label="Confirm"
                    compact
                    disabled={busy}
                    onPress={() => void approvePending(item)}
                  />
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {isOwner ? (
        <View style={{ marginTop: 24, paddingHorizontal: 16 }}>
          <Text style={sectionLabel(colors.muted)}>Invite member</Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            They join when they sign in with the same Google email.
          </Text>
          <View
            style={{
              marginTop: 14,
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 56,
              borderWidth: 1,
              borderColor: colors.border,
              backgroundColor: colors.surface,
              borderRadius: 14,
              paddingHorizontal: 14,
              gap: 10,
            }}>
            <Mail color={colors.muted} size={20} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              placeholder="name@email.com"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Invite email"
              style={{
                flex: 1,
                color: colors.ink,
                fontSize: 17,
                paddingVertical: 16,
                minHeight: 56,
              }}
            />
          </View>
          <View style={{ marginTop: 12 }}>
            <AppButton
              label="Send invite"
              busy={busy}
              disabled={!email.trim()}
              onPress={() => void sendInvite()}
            />
          </View>
        </View>
      ) : null}

      {isOwner ? (
        <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
          <Text style={sectionLabel(colors.muted)}>People</Text>
          <View style={{ marginTop: 10 }}>
            <ChipRow
              options={FILTERS}
              selected={filter}
              onSelect={(value) => setFilter(value as PeopleFilter)}
            />
          </View>

          {loading ? <PeopleSkeleton /> : null}

          {!loading && filteredEmpty ? (
            <EmptyState
              title={
                filter === 'Invited'
                  ? 'No pending invites'
                  : filter === 'Members'
                    ? 'No members'
                    : 'No people yet'
              }
              body={
                filter === 'Invited'
                  ? 'Send an invite above to add someone.'
                  : 'Invite someone to share this ledger. Open a member to assign cards and record payments.'
              }
            />
          ) : null}

          {showInvites && !loading
            ? invites.map((invite) => (
                <View key={invite.id} style={[cardStyle(colors), { marginTop: 12 }]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <View style={{ flex: 1, paddingRight: 12 }}>
                      <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>
                        {invite.email}
                      </Text>
                      <Text
                        style={{
                          color: colors.offline,
                          fontSize: 13,
                          marginTop: 4,
                          fontWeight: '600',
                        }}>
                        Invited
                      </Text>
                    </View>
                    <AppButton
                      label="Withdraw"
                      variant="secondary"
                      compact
                      disabled={busy}
                      onPress={() => void withdrawInvite(invite.id)}
                    />
                  </View>
                </View>
              ))
            : null}

          {showMembers && !loading
            ? listItems.map((person) => (
                <View key={person.id} style={[cardStyle(colors), { marginTop: 12 }]}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${personDisplayName(person)}`}
                      style={{ flex: 1, minHeight: a11y.minHit }}
                      onPress={() => router.push(`/person/${person.id}`)}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'flex-start',
                          justifyContent: 'space-between',
                        }}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>
                            {personDisplayName(person)}
                          </Text>
                          <Text style={{ color: colors.muted, fontSize: 13, marginTop: 4 }}>
                            {person.email} · {person.role}
                          </Text>
                        </View>
                        {person.outstanding != null ? (
                          <Text
                            accessibilityLabel={`Outstanding ${formatPkr(person.outstanding)}`}
                            style={{ color: colors.ink, fontSize: 18, fontWeight: '700' }}>
                            {formatPkr(person.outstanding)}
                          </Text>
                        ) : null}
                      </View>
                      {person.outstanding != null ? (
                        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
                          Spent {formatPkr(person.fuelTotal ?? 0)} · Settled{' '}
                          {formatPkr(person.settledTotal ?? 0)}
                        </Text>
                      ) : (
                        <Text style={{ color: colors.muted, fontSize: 13, marginTop: 8 }}>
                          {assignedCardCountLabel(person.assignedCardIds.length)}
                        </Text>
                      )}
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`More info for ${personDisplayName(person)}`}
                      hitSlop={8}
                      onPress={() => setInfoPerson(person)}
                      style={({ pressed }) => ({
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <Info color={colors.ink} size={18} />
                    </Pressable>
                  </View>
                  {person.outstanding != null ? (
                    <View style={{ marginTop: 12 }}>
                      <AppButton
                        label="Record payment"
                        compact
                        variant="secondary"
                        onPress={() => openPayment(person.id)}
                      />
                    </View>
                  ) : null}
                </View>
              ))
            : null}
        </View>
      ) : null}

      <BottomSheet
        visible={infoPerson != null}
        title={infoPerson ? personDisplayName(infoPerson) : 'Person'}
        onClose={() => setInfoPerson(null)}
        footer={
          infoPerson ? (
            <SheetActions>
              {(isOwner || infoPerson.id === user?.uid) ? (
                <AppButton
                  label="Open"
                  variant="secondary"
                  onPress={() => {
                    const id = infoPerson.id;
                    setInfoPerson(null);
                    router.push(`/person/${id}`);
                  }}
                />
              ) : (
                <AppButton label="Close" variant="secondary" onPress={() => setInfoPerson(null)} />
              )}
              {isOwner && infoPerson.role !== 'owner' && infoPerson.id !== user?.uid ? (
                <AppButton
                  label="Remove"
                  variant="danger"
                  disabled={busy}
                  onPress={() =>
                    void removeMember(infoPerson.id, personDisplayName(infoPerson))
                  }
                />
              ) : (
                <AppButton label="Done" onPress={() => setInfoPerson(null)} />
              )}
            </SheetActions>
          ) : undefined
        }>
        {infoPerson ? (
          <View style={{ gap: 14 }}>
            <InfoRow label="Email" value={infoPerson.email} colors={colors} />
            <InfoRow label="Role" value={infoPerson.role} colors={colors} />
            {infoPerson.outstanding != null ? (
              <>
                <InfoRow
                  label="Outstanding"
                  value={formatPkr(infoPerson.outstanding)}
                  colors={colors}
                />
                <InfoRow
                  label="Spent"
                  value={formatPkr(infoPerson.fuelTotal ?? 0)}
                  colors={colors}
                />
                <InfoRow
                  label="Settled"
                  value={formatPkr(infoPerson.settledTotal ?? 0)}
                  colors={colors}
                />
              </>
            ) : (
              <InfoRow
                label="Cards"
                value={assignedCardCountLabel(infoPerson.assignedCardIds.length)}
                colors={colors}
              />
            )}
          </View>
        ) : null}
      </BottomSheet>

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

function sectionLabel(color: string) {
  return {
    color,
    fontSize: 13,
    fontWeight: '600' as const,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  };
}

function cardStyle(colors: { border: string; surface: string }) {
  return {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
  };
}

function InfoRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: { muted: string; ink: string };
}) {
  return (
    <View>
      <Text style={{ color: colors.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: colors.ink, fontSize: 16, marginTop: 4 }}>{value}</Text>
    </View>
  );
}
