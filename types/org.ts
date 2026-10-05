export type MemberRole = 'owner' | 'member';
export type MemberStatus = 'active' | 'invited' | 'removed';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';

export type UserProfile = {
  email: string;
  displayName: string | null;
  photoURL: string | null;
  activeOrgId: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type Organization = {
  name: string;
  ownerId: string;
  currency: 'PKR';
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type OrgMember = {
  role: MemberRole;
  status: MemberStatus;
  email: string;
  displayName: string | null;
  assignedCardIds: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type OrgInvite = {
  email: string;
  invitedBy: string;
  status: InviteStatus;
  orgName: string;
  createdAt?: unknown;
};
