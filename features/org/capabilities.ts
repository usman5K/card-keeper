import type { ReportGroupKind } from '@/utils/reports';

export type OrgRole = 'owner' | 'member';

export type OrgCapabilities = {
  role: OrgRole | null;
  isOwner: boolean;
  isMember: boolean;
  canManageCards: boolean;
  canInviteMembers: boolean;
  canViewAllMembers: boolean;
  canConfirmSettlements: boolean;
  canReverseFuel: boolean;
  canAddRecharge: boolean;
  canAccessAudit: boolean;
  canAccessConflicts: boolean;
  canAssignCards: boolean;
  canRecordFuelForOthers: boolean;
  peopleTabTitle: string;
  reportsTitle: string;
  reportGroupKinds: ReportGroupKind[];
  defaultReportGroup: ReportGroupKind;
  workspaceRoleLabel: string;
};

const OWNER_GROUPS: ReportGroupKind[] = [
  'person',
  'card',
  'area',
  'station',
  'time',
];

const MEMBER_GROUPS: ReportGroupKind[] = ['card', 'area', 'station', 'time'];

const UNKNOWN_GROUPS: ReportGroupKind[] = ['card', 'time'];

export function orgCapabilities(role: OrgRole | null | undefined): OrgCapabilities {
  const isOwner = role === 'owner';
  const isMember = role === 'member';
  const known = isOwner || isMember;
  return {
    role: known ? role : null,
    isOwner,
    isMember,
    canManageCards: isOwner,
    canInviteMembers: isOwner,
    canViewAllMembers: isOwner,
    canConfirmSettlements: isOwner,
    canReverseFuel: isOwner,
    canAddRecharge: isOwner,
    canAccessAudit: isOwner,
    canAccessConflicts: isOwner,
    canAssignCards: isOwner,
    canRecordFuelForOthers: isOwner,
    peopleTabTitle: isOwner ? 'People' : isMember ? 'Balances' : 'People',
    reportsTitle: isOwner ? 'Org spend' : isMember ? 'Your spend' : 'Reports',
    reportGroupKinds: isOwner ? OWNER_GROUPS : isMember ? MEMBER_GROUPS : UNKNOWN_GROUPS,
    defaultReportGroup: isOwner ? 'person' : 'card',
    workspaceRoleLabel: isOwner ? 'Owner' : isMember ? 'Member' : 'No role',
  };
}
