import { toMonthKey } from '@/utils/dates';
import { addPkr, assertIntegerPkr, sumPkr } from '@/utils/money';

export type CardBalanceInput = {
  serverBalanceSnapshot: number | null;
  status?: string;
};

export type FuelAmountInput = {
  amount: number;
  occurredAt: unknown;
  syncStatus?: string;
};

export type AvailableBalanceSummary = {
  total: number | null;
  knownCount: number;
  unknownCount: number;
  cardCount: number;
};

export type MonthSnapshot = {
  monthKey: string;
  spent: number;
  outstanding: number;
};

export type PendingActionKind = 'conflict' | 'pin' | 'settlement' | 'sync';

export type PendingAction = {
  id: string;
  kind: PendingActionKind;
  label: string;
  href: '/conflicts' | '/(tabs)/cards' | '/(tabs)/people' | null;
};

export function sumAvailableBalance(cards: CardBalanceInput[]): AvailableBalanceSummary {
  const active = cards.filter((card) => card.status !== 'inactive');
  let total = 0;
  let knownCount = 0;
  let unknownCount = 0;

  for (const card of active) {
    if (card.serverBalanceSnapshot == null) {
      unknownCount += 1;
      continue;
    }
    total = addPkr(total, assertIntegerPkr(card.serverBalanceSnapshot, 'card balance'));
    knownCount += 1;
  }

  return {
    total: knownCount === 0 ? null : total,
    knownCount,
    unknownCount,
    cardCount: active.length,
  };
}

export function occurredAtMonthKey(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  try {
    return toMonthKey(String(value));
  } catch {
    return null;
  }
}

export function monthFuelSpent(txs: FuelAmountInput[], monthKey: string): number {
  const amounts: number[] = [];
  for (const tx of txs) {
    if (tx.syncStatus === 'FAILED') {
      continue;
    }
    if (occurredAtMonthKey(tx.occurredAt) !== monthKey) {
      continue;
    }
    amounts.push(assertIntegerPkr(tx.amount, 'fuel'));
  }
  return sumPkr(amounts);
}

export function buildMonthSnapshot(input: {
  now?: Date;
  fuel: FuelAmountInput[];
  outstanding: number;
}): MonthSnapshot {
  const monthKey = toMonthKey(input.now ?? new Date());
  return {
    monthKey,
    spent: monthFuelSpent(input.fuel, monthKey),
    outstanding: assertIntegerPkr(input.outstanding, 'outstanding'),
  };
}

export function buildPendingActions(input: {
  role: 'owner' | 'member';
  conflictCount: number;
  pendingSyncCount: number;
  pendingPinCount: number;
  pendingSettlementCount: number;
}): PendingAction[] {
  const actions: PendingAction[] = [];

  if (input.role === 'owner' && input.conflictCount > 0) {
    actions.push({
      id: 'conflicts',
      kind: 'conflict',
      label:
        input.conflictCount === 1
          ? '1 conflict needs review'
          : `${input.conflictCount} conflicts need review`,
      href: '/conflicts',
    });
  }

  if (input.pendingPinCount > 0) {
    actions.push({
      id: 'pins',
      kind: 'pin',
      label:
        input.role === 'owner'
          ? input.pendingPinCount === 1
            ? '1 PIN request'
            : `${input.pendingPinCount} PIN requests`
          : input.pendingPinCount === 1
            ? '1 PIN request pending'
            : `${input.pendingPinCount} PIN requests pending`,
      href: '/(tabs)/cards',
    });
  }

  if (input.role === 'owner' && input.pendingSettlementCount > 0) {
    actions.push({
      id: 'settlements',
      kind: 'settlement',
      label:
        input.pendingSettlementCount === 1
          ? '1 settlement to confirm'
          : `${input.pendingSettlementCount} settlements to confirm`,
      href: '/(tabs)/people',
    });
  }

  if (input.pendingSyncCount > 0) {
    actions.push({
      id: 'sync',
      kind: 'sync',
      label:
        input.pendingSyncCount === 1
          ? '1 entry pending sync'
          : `${input.pendingSyncCount} entries pending sync`,
      href: null,
    });
  }

  return actions;
}

export function balanceCaption(input: {
  trusted: boolean;
  summary: AvailableBalanceSummary;
  role: 'owner' | 'member';
}): string {
  const { trusted, summary, role } = input;
  if (summary.cardCount === 0) {
    return role === 'owner'
      ? 'Add a card to start tracking balance.'
      : 'No cards assigned yet.';
  }
  if (summary.total == null) {
    return 'Balance not synced yet.';
  }
  const scope =
    summary.cardCount === 1
      ? '1 card'
      : `${summary.cardCount} cards`;
  if (!trusted) {
    return `Last known across ${scope}, not final`;
  }
  if (summary.unknownCount > 0) {
    return `Across ${summary.knownCount} of ${summary.cardCount} cards with known balance`;
  }
  return `Across ${scope}`;
}
