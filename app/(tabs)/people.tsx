import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { listAllCards } from '@/features/cards/cardService';
import { useOrg } from '@/features/org/OrgProvider';
import {
  listActiveMembers,
  setMemberAssignedCards,
  type OrgMemberDoc,
} from '@/features/org/orgService';
import { colors } from '@/theme/tokens';
import type { FuelCardDoc } from '@/types/card';

export default function PeopleScreen() {
  const { orgId, orgName, member, inviteEmail, refresh } = useOrg();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<OrgMemberDoc[]>([]);
  const [cards, setCards] = useState<FuelCardDoc[]>([]);
  const isOwner = member?.role === 'owner';

  useEffect(() => {
    if (!orgId || !member) {
      const timer = setTimeout(() => {
        setMembers([]);
        setCards([]);
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const nextMembers = await listActiveMembers(orgId);
          const nextCards = isOwner
            ? (await listAllCards(orgId)).filter((card) => card.status === 'active')
            : [];
          if (cancelled) {
            return;
          }
          setMembers(nextMembers);
          setCards(nextCards);
          setError(null);
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
  }, [orgId, member, isOwner]);

  async function toggleAssignment(target: OrgMemberDoc, cardId: string) {
    if (!orgId || !isOwner || target.role === 'owner') {
      return;
    }
    const current = new Set(target.assignedCardIds ?? []);
    if (current.has(cardId)) {
      current.delete(cardId);
    } else {
      current.add(cardId);
    }
    const nextIds = [...current];
    setBusy(true);
    setError(null);
    try {
      await setMemberAssignedCards(orgId, target.id, nextIds);
      setMembers((prev) =>
        prev.map((item) =>
          item.id === target.id ? { ...item, assignedCardIds: nextIds } : item,
        ),
      );
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ paddingBottom: 40, paddingTop: insets.top }}>
      <View className="px-md pt-lg">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">Workspace</Text>
        <Text className="mt-sm text-2xl font-bold text-ink">{orgName ?? 'Workspace'}</Text>
        <Text className="mt-sm text-base text-muted">
          {isOwner ? 'Invite people and assign cards.' : 'Your workspace roster.'}
        </Text>
      </View>

      {error ? (
        <Text className="px-md pt-md text-sm" style={{ color: colors.danger }}>
          {error}
        </Text>
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
            placeholder="name@email.com"
            placeholderTextColor={colors.muted}
            className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send invite"
            className="mt-md items-center rounded-lg bg-ink px-md py-md"
            disabled={busy || !email.trim()}
            onPress={() => {
              setBusy(true);
              setError(null);
              setMessage(null);
              void inviteEmail(email)
                .then(() => {
                  setMessage(`Invite sent to ${email.trim().toLowerCase()}`);
                  setEmail('');
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Invite failed');
                })
                .finally(() => setBusy(false));
            }}>
            <Text className="text-base font-semibold text-background">
              {busy ? 'Working…' : 'Send invite'}
            </Text>
          </Pressable>
          {message ? <Text className="mt-md text-sm text-online">{message}</Text> : null}
        </View>
      ) : null}

      <View className="mt-xl px-md">
        <Text className="text-sm font-medium uppercase tracking-wide text-muted">People</Text>
        {loading ? (
          <View className="items-center py-xl">
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : members.length === 0 ? (
          <EmptyState title="No members" body="Invite someone to share this ledger." />
        ) : (
          members.map((person) => {
            const assigned = new Set(person.assignedCardIds ?? []);
            return (
              <View
                key={person.id}
                className="mt-md rounded-lg border border-border bg-surface px-md py-md">
                <Text className="text-lg font-semibold text-ink">
                  {person.displayName || person.email}
                </Text>
                <Text className="mt-xs text-sm text-muted">
                  {person.email} · {person.role}
                </Text>
                {isOwner && person.role === 'member' ? (
                  <View className="mt-md">
                    <Text className="text-xs font-medium uppercase tracking-wide text-muted">
                      Assigned cards
                    </Text>
                    {cards.length === 0 ? (
                      <Text className="mt-sm text-sm text-muted">
                        Add an active card first, then assign it here.
                      </Text>
                    ) : (
                      <View className="mt-sm flex-row flex-wrap" style={{ gap: 8 }}>
                        {cards.map((card) => {
                          const selected = assigned.has(card.id);
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
                              onPress={() => void toggleAssignment(person, card.id)}>
                              <Text
                                className="text-sm font-medium"
                                style={{ color: selected ? colors.accent : colors.ink }}>
                                {card.name} · {card.last4}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                ) : null}
                {!isOwner ? (
                  <Text className="mt-sm text-sm text-muted">
                    {(person.assignedCardIds ?? []).length} card
                    {(person.assignedCardIds ?? []).length === 1 ? '' : 's'} assigned
                  </Text>
                ) : null}
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}
