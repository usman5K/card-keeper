export type AuditAction =
  | 'ORG_CREATE'
  | 'MEMBER_INVITE'
  | 'MEMBER_ACTIVATE'
  | 'CARD_CREATE'
  | 'CARD_UPDATE'
  | 'CARD_DEACTIVATE'
  | 'RECHARGE_CREATE'
  | 'FUEL_CREATE'
  | 'ADJUSTMENT_CREATE'
  | 'SETTLEMENT_CREATE'
  | 'SETTLEMENT_CONFIRM'
  | 'PIN_REQUEST'
  | 'PIN_APPROVE'
  | 'PIN_REJECT'
  | 'PIN_SHARE'
  | 'PIN_SET'
  | 'CONFLICT_ACKNOWLEDGE'
  | 'CONFLICT_REVERSE'
  | 'CONFLICT_ADJUST';

export type AuditEntityType =
  | 'organization'
  | 'invite'
  | 'member'
  | 'card'
  | 'recharge'
  | 'fuel'
  | 'adjustment'
  | 'settlement'
  | 'pinRequest'
  | 'transaction';

export type AuditLog = {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt?: unknown;
};

export type AuditLogDoc = AuditLog & { id: string };
