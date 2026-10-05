import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useOrg } from '@/features/org/OrgProvider';
import { colors } from '@/theme/tokens';

export default function PeopleScreen() {
  const { orgName, member, inviteEmail } = useOrg();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isOwner = member?.role === 'owner';

  return (
    <View className="flex-1 bg-background px-md pt-lg">
      <Text className="text-sm font-medium uppercase tracking-wide text-muted">Workspace</Text>
      <Text className="mt-sm text-2xl font-bold text-ink">{orgName ?? 'Workspace'}</Text>
      <Text className="mt-sm text-base text-muted">
        {isOwner ? 'Invite people by Google email.' : 'Member view. Card assignment comes next.'}
      </Text>

      {isOwner ? (
        <View className="mt-xl">
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
              {busy ? 'Sending…' : 'Send invite'}
            </Text>
          </Pressable>
          {message ? <Text className="mt-md text-sm text-online">{message}</Text> : null}
          {error ? (
            <Text className="mt-md text-sm" style={{ color: colors.danger }}>
              {error}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
