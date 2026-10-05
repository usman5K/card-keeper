export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export type FuelTransaction = {
  type: 'FUEL';
  cardId: string;
  userId: string;
  createdBy: string;
  amount: number;
  station: string;
  area: string;
  city?: string;
  occurredAt: unknown;
  createdAt?: unknown;
  deviceId?: string;
  clientBalanceBefore?: number | null;
  clientBalanceAfter?: number | null;
  serverBalanceBefore?: number | null;
  serverBalanceAfter?: number | null;
  syncStatus: SyncStatus;
  requiresReview: boolean;
  reviewedBy?: string;
  reviewedAt?: unknown;
  reviewAction?: 'acknowledge' | 'reverse' | 'adjust';
  notes?: string;
};

export type Recharge = {
  cardId: string;
  amount: number;
  month?: string;
  source?: string;
  notes?: string;
  createdBy: string;
  occurredAt: unknown;
  createdAt?: unknown;
  deviceId?: string;
};

export type AdjustmentKind = 'OPENING' | 'REVERSAL' | 'CORRECTION';

export type Adjustment = {
  cardId: string;
  amount: number;
  reason: string;
  linkedTxId?: string;
  kind: AdjustmentKind;
  createdBy: string;
  occurredAt: unknown;
  createdAt?: unknown;
};

export type SettlementStatus = 'pending' | 'confirmed';

export type Settlement = {
  userId: string;
  amount: number;
  method: string;
  status: SettlementStatus;
  createdBy: string;
  confirmedBy?: string;
  occurredAt: unknown;
  createdAt?: unknown;
  deviceId?: string;
  notes?: string;
};

export type PinRequestStatus = 'pending' | 'approved' | 'rejected';

export type PinRequest = {
  cardId: string;
  requestedBy: string;
  status: PinRequestStatus;
  resolvedBy?: string;
  resolvedAt?: unknown;
  expiresAt?: unknown;
  sharedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type PinAuditAction =
  | 'PIN_REQUEST'
  | 'PIN_APPROVE'
  | 'PIN_REJECT'
  | 'PIN_SHARE'
  | 'PIN_SET';

export type LedgerFuelEvent = {
  kind: 'FUEL';
  amount: number;
  syncStatus: SyncStatus;
  includeInProjection?: boolean;
};

export type LedgerRechargeEvent = {
  kind: 'RECHARGE';
  amount: number;
};

export type LedgerAdjustmentEvent = {
  kind: 'ADJUSTMENT';
  amount: number;
  adjustmentKind: AdjustmentKind;
};

export type LedgerCardEvent =
  | LedgerFuelEvent
  | LedgerRechargeEvent
  | LedgerAdjustmentEvent;

export type CardBalanceProjection = {
  opening: number;
  recharges: number;
  fuel: number;
  adjustments: number;
  balance: number;
  pendingFuel: number;
};
