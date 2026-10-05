export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export type ReconcileFuelInput = {
  id: string;
  amount: number;
  occurredAt: string;
  createdAt?: string | null;
  syncStatus?: SyncStatus;
};

export type ReconcileCreditInput = {
  id: string;
  amount: number;
  kind: 'RECHARGE' | 'OPENING' | 'ADJUSTMENT';
};

export type ReconcileFuelResult = {
  id: string;
  syncStatus: 'SYNCED' | 'CONFLICT';
  requiresReview: boolean;
  serverBalanceBefore: number;
  serverBalanceAfter: number;
};

export type ReconcileResult = {
  fuels: ReconcileFuelResult[];
  serverBalanceSnapshot: number;
};

function sortKey(item: { occurredAt: string; createdAt?: string | null; id: string }) {
  return `${item.occurredAt}|${item.createdAt ?? ''}|${item.id}`;
}

export function reconcileCardBalance(
  credits: ReconcileCreditInput[],
  fuels: ReconcileFuelInput[],
): ReconcileResult {
  const creditTotal = credits.reduce((sum, item) => sum + item.amount, 0);
  const ordered = [...fuels].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));

  let available = creditTotal;
  const results: ReconcileFuelResult[] = [];

  for (const fuel of ordered) {
    const before = available;
    if (fuel.amount <= available) {
      available -= fuel.amount;
      results.push({
        id: fuel.id,
        syncStatus: 'SYNCED',
        requiresReview: false,
        serverBalanceBefore: before,
        serverBalanceAfter: available,
      });
    } else {
      results.push({
        id: fuel.id,
        syncStatus: 'CONFLICT',
        requiresReview: true,
        serverBalanceBefore: before,
        serverBalanceAfter: before,
      });
    }
  }

  return {
    fuels: results,
    serverBalanceSnapshot: available,
  };
}
