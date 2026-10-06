import type { AuditAction } from '@/types/audit';
import { omitSecrets } from '@/utils/safeLog';

export function sanitizeAuditMetadata(
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  return omitSecrets(metadata);
}

const ACTION_LABELS: Record<AuditAction, string> = {
  ORG_CREATE: 'Created workspace',
  MEMBER_INVITE: 'Invited member',
  MEMBER_INVITE_REVOKE: 'Withdrew invite',
  MEMBER_ACTIVATE: 'Member joined',
  MEMBER_REMOVE: 'Removed member',
  MEMBER_REACTIVATE: 'Reactivated member',
  CARD_CREATE: 'Created card',
  CARD_UPDATE: 'Updated card',
  CARD_DEACTIVATE: 'Deactivated card',
  RECHARGE_CREATE: 'Added recharge',
  FUEL_CREATE: 'Added fuel',
  ADJUSTMENT_CREATE: 'Added adjustment',
  SETTLEMENT_CREATE: 'Recorded settlement',
  SETTLEMENT_CONFIRM: 'Confirmed settlement',
  PIN_REQUEST: 'Requested PIN',
  PIN_APPROVE: 'Approved PIN request',
  PIN_REJECT: 'Rejected PIN request',
  PIN_SHARE: 'Shared PIN access',
  PIN_SET: 'Set card PIN',
  CONFLICT_ACKNOWLEDGE: 'Acknowledged conflict',
  CONFLICT_REVERSE: 'Reversed conflict fuel',
  CONFLICT_ADJUST: 'Adjusted after conflict',
};

export function auditActionLabel(action: string) {
  return ACTION_LABELS[action as AuditAction] ?? action;
}
