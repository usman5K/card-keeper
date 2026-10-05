import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native';
import { Redirect, Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import {
  auditActionLabel,
  listAuditLogs,
} from '@/features/audit/auditService';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import type { AuditLogDoc } from '@/types/audit';
import { colors } from '@/theme/tokens';

function formatWhen(value: unknown) {
  if (!value) {
    return '';
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const date = (value as { toDate: () => Date }).toDate();
    return date.toLocaleString();
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString();
  }
  return '';
}

function metaSummary(item: AuditLogDoc) {
  const meta = item.metadata ?? {};
  const parts: string[] = [];
  if (typeof meta.amount === 'number') {
    parts.push(`Rs ${meta.amount}`);
  }
  if (typeof meta.email === 'string') {
    parts.push(meta.email);
  }
  if (typeof meta.name === 'string') {
    parts.push(meta.name);
  }
  if (typeof meta.station === 'string') {
    parts.push(meta.station);
  }
  if (typeof meta.status === 'string') {
    parts.push(meta.status);
  }
  if (typeof meta.kind === 'string') {
    parts.push(meta.kind);
  }
  if (typeof meta.cardId === 'string') {
    parts.push(`card ${meta.cardId.slice(0, 6)}`);
  }
  return parts.join(' · ');
}

export default function AuditScreen() {
  const { user, loading: authLoading } = useAuth();
  const { orgId, member } = useOrg();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [items, setItems] = useState<AuditLogDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          const next = await listAuditLogs(orgId);
          if (!cancelled) {
            setItems(next);
            setError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err.message : 'Could not load audit log');
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
  }, [orgId, isOwner]);

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (!isOwner) {
    return (
      <View className="flex-1 bg-background px-md pt-lg" style={{ paddingTop: insets.top + 16 }}>
        <Stack.Screen options={{ title: 'Audit log' }} />
        <EmptyState
          title="Owner only"
          body="Audit history is available to the workspace owner."
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          className="mt-lg items-center rounded-lg bg-ink px-md py-md"
          onPress={() => router.back()}>
          <Text className="text-base font-semibold text-background">Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <Stack.Screen options={{ title: 'Audit log' }} />
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          ListEmptyComponent={
            <EmptyState
              title="No audit events yet"
              body="Financial and membership actions will appear here."
            />
          }
          ListHeaderComponent={
            error ? (
              <Text className="mb-md text-sm" style={{ color: colors.danger }}>
                {error}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const summary = metaSummary(item);
            const when = formatWhen(item.createdAt);
            return (
              <View
                className="mb-sm rounded-lg border px-md py-md"
                style={{ borderColor: colors.border, backgroundColor: colors.surface }}>
                <Text className="text-base font-semibold text-ink">
                  {auditActionLabel(item.action)}
                </Text>
                <Text className="mt-sm text-sm text-muted">
                  {item.entityType} · {item.entityId.slice(0, 10)}
                </Text>
                {summary ? (
                  <Text className="mt-sm text-sm text-ink">{summary}</Text>
                ) : null}
                {when ? <Text className="mt-sm text-xs text-muted">{when}</Text> : null}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}
