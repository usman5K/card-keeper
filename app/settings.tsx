import { useState } from 'react';
import { Redirect, Stack, useRouter } from 'expo-router';
import { Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/AppButton';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SelectField } from '@/components/SelectField';
import { ThemePicker } from '@/components/ThemePicker';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOrg } from '@/features/org/OrgProvider';
import { useSync } from '@/features/sync/SyncProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';

export default function SettingsScreen() {
  const { user, signOut, loading } = useAuth();
  const {
    member,
    orgName,
    orgId,
    workspaces,
    pendingInvites,
    switchWorkspace,
    joinInvite,
    createWorkspace,
    refresh,
  } = useOrg();
  const { status } = useSync();
  const { colors, resolved } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isOwner = member?.role === 'owner';
  const [busy, setBusy] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  if (loading) {
    return (
      <View
        style={{ flex: 1, backgroundColor: colors.background, paddingHorizontal: 16, paddingTop: 24 }}
        accessibilityLabel="Loading settings">
        <Stack.Screen options={{ title: 'Settings' }} />
        <View
          style={{ height: 20, width: '55%', borderRadius: 8, backgroundColor: colors.border }}
        />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingBottom: insets.bottom,
      }}>
      <Stack.Screen options={{ title: 'Settings' }} />
      <OfflineBanner visible={status === 'offline'} />
      <View style={{ paddingHorizontal: 16, paddingTop: 24 }}>
        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
          }}>
          Appearance
        </Text>
        <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
          Currently {resolved === 'dark' ? 'dark' : 'light'}
        </Text>
        <View style={{ marginTop: 12 }}>
          <ThemePicker />
        </View>

        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginTop: 28,
          }}>
          Workspace
        </Text>
        <View
          style={{
            marginTop: 12,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surface,
            padding: 16,
          }}>
          <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>
            {orgName ?? 'No active workspace'}
          </Text>
          <Text style={{ color: colors.muted, fontSize: 14, marginTop: 4 }}>
            {user.email ?? user.uid}
            {member?.role ? ` · ${member.role}` : ''}
          </Text>
        </View>

        {workspaces.length > 1 ? (
          <View style={{ marginTop: 12 }}>
            <SelectField
              label="Switch workspace"
              value={orgId}
              options={workspaces.map((item) => ({
                value: item.orgId,
                label: item.orgName,
                detail: item.role,
              }))}
              onChange={(next) => {
                setBusy(true);
                void switchWorkspace(next)
                  .then(() => {
                    toast.success('Workspace switched.');
                  })
                  .catch((err) => {
                    toast.error(err instanceof Error ? err.message : 'Could not switch');
                  })
                  .finally(() => setBusy(false));
              }}
            />
          </View>
        ) : null}

        {pendingInvites.length > 0 ? (
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>
              PENDING INVITES
            </Text>
            {pendingInvites.map((invite) => (
              <View
                key={invite.inviteId}
                style={{
                  marginTop: 8,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surface,
                  padding: 12,
                  gap: 8,
                }}>
                <Text style={{ color: colors.ink, fontWeight: '600' }}>{invite.orgName}</Text>
                <AppButton
                  label={busy ? 'Joining…' : 'Accept invite'}
                  compact
                  busy={busy}
                  onPress={() => {
                    setBusy(true);
                    void joinInvite(invite.orgId, invite.inviteId)
                      .then(() => {
                        toast.success(`Joined ${invite.orgName}.`);
                      })
                      .catch((err) => {
                        toast.error(err instanceof Error ? err.message : 'Could not join');
                      })
                      .finally(() => setBusy(false));
                  }}
                />
              </View>
            ))}
          </View>
        ) : null}

        {creating ? (
          <View style={{ marginTop: 16, gap: 8 }}>
            <TextInput
              value={newOrgName}
              onChangeText={setNewOrgName}
              placeholder="New workspace name"
              placeholderTextColor={colors.muted}
              style={{
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surface,
                color: colors.ink,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 14,
                fontSize: 16,
              }}
            />
            <AppButton
              label="Create workspace"
              busy={busy}
              onPress={() => {
                if (!newOrgName.trim()) {
                  toast.error('Enter a workspace name');
                  return;
                }
                setBusy(true);
                void createWorkspace(newOrgName.trim())
                  .then(() => {
                    setCreating(false);
                    setNewOrgName('');
                    toast.success('Workspace created.');
                  })
                  .catch((err) => {
                    toast.error(err instanceof Error ? err.message : 'Could not create');
                  })
                  .finally(() => setBusy(false));
              }}
            />
            <AppButton
              label="Cancel"
              variant="secondary"
              onPress={() => {
                setCreating(false);
                setNewOrgName('');
              }}
            />
          </View>
        ) : (
          <View style={{ marginTop: 12 }}>
            <AppButton
              label="Create your own workspace"
              variant="secondary"
              onPress={() => setCreating(true)}
            />
          </View>
        )}

        <Text
          style={{
            color: colors.muted,
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            marginTop: 28,
          }}>
          Account
        </Text>

        {isOwner ? (
          <View style={{ marginTop: 12 }}>
            <AppButton
              label="Audit log"
              variant="secondary"
              onPress={() => router.push('/audit')}
            />
          </View>
        ) : null}

        <View style={{ marginTop: 12 }}>
          <AppButton
            label="Refresh workspace"
            variant="ghost"
            onPress={() => {
              void refresh();
            }}
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <AppButton
            label="Sign out"
            variant="danger"
            onPress={() => {
              void signOut();
            }}
          />
        </View>
      </View>
    </View>
  );
}
