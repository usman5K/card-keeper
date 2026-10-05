import type { CardBalanceProjection, LedgerCardEvent } from '@/types/ledger';
import { addPkr, assertIntegerPkr, subtractPkr } from '@/utils/money';

function countsTowardFuelBalance(event: Extract<LedgerCardEvent, { kind: 'FUEL' }>) {
  if (event.syncStatus === 'SYNCED') {
    return true;
  }
  if (event.syncStatus === 'PENDING' && event.includeInProjection !== false) {
    return true;
  }
  return false;
}

export function projectCardBalance(events: LedgerCardEvent[]): CardBalanceProjection {
  let opening = 0;
  let recharges = 0;
  let fuel = 0;
  let adjustments = 0;
  let pendingFuel = 0;

  for (const event of events) {
    if (event.kind === 'RECHARGE') {
      recharges = addPkr(recharges, assertIntegerPkr(event.amount, 'recharge'));
      continue;
    }

    if (event.kind === 'ADJUSTMENT') {
      const amount = assertIntegerPkr(event.amount, 'adjustment');
      if (event.adjustmentKind === 'OPENING') {
        opening = addPkr(opening, amount);
      } else {
        adjustments = addPkr(adjustments, amount);
      }
      continue;
    }

    const amount = assertIntegerPkr(event.amount, 'fuel');
    if (event.syncStatus === 'PENDING') {
      pendingFuel = addPkr(pendingFuel, amount);
    }
    if (countsTowardFuelBalance(event)) {
      fuel = addPkr(fuel, amount);
    }
  }

  const balance = subtractPkr(addPkr(addPkr(opening, recharges), adjustments), fuel);

  return {
    opening,
    recharges,
    fuel,
    adjustments,
    balance,
    pendingFuel,
  };
}

export function projectOutstanding(fuelAmounts: number[], confirmedSettlementAmounts: number[]) {
  const spent = fuelAmounts.reduce((total, amount) => addPkr(total, amount), 0);
  const recovered = confirmedSettlementAmounts.reduce(
    (total, amount) => addPkr(total, amount),
    0,
  );
  return subtractPkr(spent, recovered);
}
