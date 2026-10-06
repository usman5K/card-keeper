import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ConfirmSheet } from '@/components/ConfirmSheet';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import { useSync } from '@/features/sync/SyncProvider';
import {
  acknowledgeConflict,
  listConflictFuelTransactions,
  resolveConflictWithAdjust,
  resolveConflictWithReverse,
  type ConflictFuelDoc,
} from '@/features/sync/conflictService';
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';
import { a11y } from '@/theme/tokens';
import { formatPkr, parsePkrInput } from '@/utils/money';

type PendingConfirm = {
  title: string;
  body: string;
  confirmLabel: string;
  destructive?: boolean;
  run: () => Promise<void>;
};
export default function ConflictsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { orgId, member } = useOrg();
  const { refresh: refreshSync } = useSync();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [items, setItems] = useState<ConflictFuelDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<ConflictFuelDoc | null>(null);
  const [amountText, setAmountText] = useState('');
  const [reason, setReason] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (!orgId || !isOwner) {
          if (!cancelled) {
            setItems([]);
            setLoading(false);
          }
          return;
        }
        setLoading(true);
        try {
          const next = await listConflictFuelTransactions(orgId);
          if (!cancelled) {
            setItems(next);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load conflicts');
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
  }, [orgId, isOwner, reloadKey]);

  function afterResolve() {
    setReloadKey((value) => value + 1);
    refreshSync();
  }

  function confirmAcknowledge(item: ConflictFuelDoc) {
    setConfirm({
      title: 'Acknowledge conflict',
      body: `Mark ${formatPkr(item.amount)} at ${item.station} as reviewed without reversing it?`,
      confirmLabel: 'Acknowledge',
      run: async () => {
        if (!orgId || !user) {
          return;
        }
        setBusy(true);
        try {
          await acknowledgeConflict(orgId, user.uid, item.id, 'acknowledge');
          toast.success('Conflict acknowledged.');
          afterResolve();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Acknowledge failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  function confirmReverse(item: ConflictFuelDoc) {
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
          await resolveConflictWithReverse(orgId, user.uid, item);
          toast.success('Conflict reversed.');
          afterResolve();
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Reverse failed');
        } finally {
          setBusy(false);
        }
      },
    });
  }

  async function submitAdjust() {
    if (!orgId || !user || !adjustTarget) {
      return;
    }
    setBusy(true);
    try {
      const amount = parsePkrInput(amountText);
      await resolveConflictWithAdjust(
        orgId,
        user.uid,
        adjustTarget,
        amount,
        reason.trim() || `Conflict adjust ${adjustTarget.id}`,
      );
      setAdjustTarget(null);
      setAmountText('');
      setReason('');
      toast.success('Conflict adjusted.');
      afterResolve();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Adjust failed');
    } finally {
      setBusy(false);
    }
  }

  if (!isOwner) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <Stack.Screen options={{ title: 'Conflict review' }} />
      {loading ? (
        <ActivityIndicator className="mt-xl" color={colors.accent} />
      ) : error && items.length === 0 ? (
        <View className="px-md pt-lg">
          <EmptyState title="Could not load conflicts" body={error} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry loading conflicts"
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
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          ListEmptyComponent={
            <EmptyState
              title="No conflicts"
              body="Overspend conflicts needing review will show up here."
            />
          }
          renderItem={({ item }) => (
            <View className="mb-md border-b border-border pb-md">
              <Text className="text-base font-semibold text-ink">{item.station}</Text>
              <Text className="mt-xs text-sm text-muted">
                {item.area} · {formatPkr(item.amount)}
              </Text>
              <Text className="mt-xs text-sm" style={{ color: colors.danger }}>
                Needs review · {item.syncStatus}
              </Text>
              <View className="mt-md flex-row flex-wrap" style={{ gap: 8 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Acknowledge conflict ${item.station}`}
                  className="items-center justify-center rounded-lg border border-border px-md"
                  style={{ minHeight: a11y.minHit }}
                  disabled={busy}
                  onPress={() => confirmAcknowledge(item)}>
                  <Text className="text-sm font-medium text-ink">Acknowledge</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Reverse conflict ${item.station}`}
                  className="items-center justify-center rounded-lg border px-md"
                  style={{ borderColor: colors.danger, minHeight: a11y.minHit }}
                  disabled={busy}
                  onPress={() => confirmReverse(item)}>
                  <Text className="text-sm font-medium" style={{ color: colors.danger }}>
                    Reverse
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Adjust conflict ${item.station}`}
                  className="items-center justify-center rounded-lg bg-ink px-md"
                  style={{ minHeight: a11y.minHit }}
                  disabled={busy}
                  onPress={() => {
                    setAdjustTarget(item);
                    setAmountText('');
                    setReason('');
                  }}>
                  <Text className="text-sm font-medium text-background">Adjust</Text>
                </Pressable>
              </View>
            </View>
          )}
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

      <Modal
        visible={adjustTarget != null}
        animationType="slide"
        transparent
        onRequestClose={() => setAdjustTarget(null)}>
        <View className="flex-1 justify-end bg-black/40">
          <View
            className="rounded-t-2xl bg-background px-md pt-md"
            style={{ paddingBottom: 24 + insets.bottom }}>
            <Text className="text-xl font-semibold text-ink">Adjust conflict</Text>
            <Text className="mt-sm text-sm text-muted">
              {adjustTarget
                ? `${adjustTarget.station} · ${formatPkr(adjustTarget.amount)}`
                : ''}
            </Text>
            <Text className="mt-md text-sm text-muted">
              Correction amount in whole rupees. Positive adds card credit; negative reduces it.
            </Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="numbers-and-punctuation"
              placeholder="0"
              placeholderTextColor={colors.muted}
              accessibilityLabel="Correction amount in PKR"
              className="mt-sm rounded-lg border border-border bg-surface px-md py-md text-3xl font-bold text-ink"
            />
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason"
              placeholderTextColor={colors.muted}
              className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save conflict adjustment"
              className="mt-xl items-center rounded-lg bg-ink px-md py-md"
              disabled={busy}
              onPress={() => void submitAdjust()}>
              <Text className="text-base font-semibold text-background">
                {busy ? 'Saving…' : 'Save adjustment'}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              className="mt-md items-center py-md"
              onPress={() => setAdjustTarget(null)}>
              <Text className="text-base text-muted">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
