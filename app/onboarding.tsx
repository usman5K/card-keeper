import { Redirect } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';

export default function OnboardingScreen() {
  const { user, loading: authLoading } = useAuth();
  const { ready, orgId, pendingInvites, createWorkspace, joinInvite, error } = useOrg();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  if (authLoading || !ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (orgId) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View className="flex-1 justify-center bg-background px-lg">
      <Text className="text-3xl font-bold text-ink">Set up your workspace</Text>
      <Text className="mt-sm text-base text-muted">
        Create a workspace as owner, or accept an invite sent to your Google email.
      </Text>

      {pendingInvites.length > 0 ? (
        <View className="mt-xl">
          <Text className="text-sm font-medium uppercase tracking-wide text-muted">
            Pending invites
          </Text>
          {pendingInvites.map((invite) => (
            <Pressable
              key={`${invite.orgId}-${invite.inviteId}`}
              accessibilityRole="button"
              accessibilityLabel={`Join ${invite.orgName}`}
              className="mt-md rounded-lg border border-border bg-surface px-md py-md"
              disabled={busy}
              onPress={() => {
                setBusy(true);
                setLocalError(null);
                void joinInvite(invite.orgId, invite.inviteId)
                  .catch((err: unknown) => {
                    setLocalError(err instanceof Error ? err.message : 'Could not join');
                  })
                  .finally(() => setBusy(false));
              }}>
              <Text className="text-base font-semibold text-ink">{invite.orgName}</Text>
              <Text className="mt-xs text-sm text-muted">Tap to join</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text className="mt-xl text-sm font-medium uppercase tracking-wide text-muted">
        Create workspace
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Khan Fleet"
        placeholderTextColor={colors.muted}
        autoCapitalize="words"
        className="mt-md rounded-lg border border-border bg-surface px-md py-md text-base text-ink"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create workspace"
        className="mt-md items-center rounded-lg bg-ink px-md py-md"
        disabled={busy || !name.trim()}
        onPress={() => {
          setBusy(true);
          setLocalError(null);
          void createWorkspace(name)
            .catch((err: unknown) => {
              setLocalError(err instanceof Error ? err.message : 'Could not create workspace');
            })
            .finally(() => setBusy(false));
        }}>
        <Text className="text-base font-semibold text-background">
          {busy ? 'Working…' : 'Create workspace'}
        </Text>
      </Pressable>

      {localError || error ? (
        <Text className="mt-md text-sm" style={{ color: colors.danger }}>
          {localError ?? error}
        </Text>
      ) : null}
    </View>
  );
}
