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
  error: string | null;
  refresh: () => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  joinInvite: (orgId: string, inviteId: string) => Promise<void>;
  inviteEmail: (email: string) => Promise<void>;
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
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user || !isFirebaseConfigured()) {
      setProfile(null);
      setOrgId(null);
      setOrgName(null);
      setMember(null);
      setPendingInvites([]);
      setReady(true);
      return;
    }

    setReady(false);
    setError(null);
    try {
      const nextProfile = await ensureUserProfile(user);
      setProfile(nextProfile);

      if (nextProfile.activeOrgId) {
        const [org, membership] = await Promise.all([
          getOrganization(nextProfile.activeOrgId),
          getActiveMembership(user.uid, nextProfile.activeOrgId),
        ]);
        if (org && membership) {
          setOrgId(org.id);
          setOrgName(org.name);
          setMember(membership);
          setPendingInvites([]);
          setReady(true);
          return;
        }
      }

      setOrgId(null);
      setOrgName(null);
      setMember(null);
      const invites = await findPendingInvitesForEmail(nextProfile.email);
      setPendingInvites(
        invites.map((item) => ({
          orgId: item.orgId,
          orgName: item.orgName,
          inviteId: item.inviteId,
        })),
      );
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
      error,
      refresh,
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
      },
    }),
    [ready, profile, orgId, orgName, member, pendingInvites, error, refresh, user],
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
