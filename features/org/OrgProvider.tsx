import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from '@/features/auth/AuthProvider';
import {
  acceptInvite,
  createOrganization,
  ensureUserProfile,
  findPendingInvitesForEmail,
  getActiveMembership,
  getOrganization,
  inviteMemberByEmail,
  listWorkspacesForEmail,
  switchActiveOrg,
  type WorkspaceMembership,
} from '@/features/org/orgService';
import type { OrgMember, UserProfile } from '@/types/org';
import { isFirebaseConfigured } from '@/firebase/env';

type PendingInvite = {
  orgId: string;
  orgName: string;
  inviteId: string;
};

type OrgContextValue = {
  ready: boolean;
  profile: UserProfile | null;
  orgId: string | null;
  orgName: string | null;
  member: OrgMember | null;
  pendingInvites: PendingInvite[];
  workspaces: WorkspaceMembership[];
  error: string | null;
  refresh: () => Promise<void>;
  refreshMembership: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  joinInvite: (orgId: string, inviteId: string) => Promise<void>;
  inviteEmail: (email: string) => Promise<void>;
  switchWorkspace: (orgId: string) => Promise<void>;
};

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [member, setMember] = useState<OrgMember | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refreshMembership = useCallback(async () => {
    if (!user || !orgId || !isFirebaseConfigured()) {
      return;
    }
    try {
      const membership = await getActiveMembership(user.uid, orgId);
      if (membership) {
        setMember(membership);
      }
    } catch {
      // Keep last-known membership; focus refresh is best-effort.
    }
  }, [user, orgId]);

  const refresh = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setProfile(null);
      setOrgId(null);
      setOrgName(null);
      setMember(null);
      setPendingInvites([]);
      setWorkspaces([]);
      setReady(true);
      return;
    }

    setError(null);
    try {
      const nextProfile = await ensureUserProfile(user);
      setProfile(nextProfile);

      const [invites, memberships] = await Promise.all([
        findPendingInvitesForEmail(nextProfile.email),
        listWorkspacesForEmail(nextProfile.email),
      ]);
      setPendingInvites(
        invites.map((item) => ({
          orgId: item.orgId,
          orgName: item.orgName,
          inviteId: item.inviteId,
        })),
      );
      setWorkspaces(memberships);

      if (nextProfile.activeOrgId) {
        const [org, membership] = await Promise.all([
          getOrganization(nextProfile.activeOrgId),
          getActiveMembership(user.uid, nextProfile.activeOrgId),
        ]);
        if (org && membership) {
          setOrgId(org.id);
          setOrgName(org.name);
          setMember(membership);
          setReady(true);
          return;
        }
      }

      if (memberships.length === 1) {
        await switchActiveOrg(user, memberships[0].orgId);
        const org = await getOrganization(memberships[0].orgId);
        const membership = await getActiveMembership(user.uid, memberships[0].orgId);
        setOrgId(org?.id ?? memberships[0].orgId);
        setOrgName(org?.name ?? memberships[0].orgName);
        setMember(membership);
        setReady(true);
        return;
      }

      setOrgId(null);
      setOrgName(null);
      setMember(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load workspace';
      setError(message);
    } finally {
      setReady(true);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<OrgContextValue>(
    () => ({
      ready,
      profile,
      orgId,
      orgName,
      member,
      pendingInvites,
      workspaces,
      error,
      refresh,
      refreshMembership,
      createWorkspace: async (name: string) => {
        if (!user) {
          throw new Error('Not signed in');
        }
        await createOrganization(user, name);
        await refresh();
      },
      joinInvite: async (nextOrgId: string, inviteId: string) => {
        if (!user) {
          throw new Error('Not signed in');
        }
        await acceptInvite(user, nextOrgId, inviteId);
        await refresh();
      },
      inviteEmail: async (email: string) => {
        if (!user || !orgId) {
          throw new Error('No active workspace');
        }
        if (member?.role !== 'owner') {
          throw new Error('Only the owner can invite members');
        }
        await inviteMemberByEmail(orgId, user.uid, email);
        await refresh();
      },
      switchWorkspace: async (nextOrgId: string) => {
        if (!user) {
          throw new Error('Not signed in');
        }
        await switchActiveOrg(user, nextOrgId);
        await refresh();
      },
    }),
    [
      ready,
      profile,
      orgId,
      orgName,
      member,
      pendingInvites,
      workspaces,
      error,
      refresh,
      refreshMembership,
      user,
    ],
  );

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const value = useContext(OrgContext);
  if (!value) {
    throw new Error('useOrg must be used inside OrgProvider');
  }
  return value;
}
