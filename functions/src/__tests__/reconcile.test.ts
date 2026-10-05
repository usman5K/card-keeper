import { reconcileCardBalance } from '../reconcile';

describe('reconcileCardBalance', () => {
  it('syncs sequential spends within credit', () => {
    const result = reconcileCardBalance(
      [{ id: 'r1', amount: 10000, kind: 'RECHARGE' }],
      [
        { id: 't1', amount: 4000, occurredAt: '2026-10-01T10:00:00.000Z' },
        { id: 't2', amount: 5000, occurredAt: '2026-10-01T11:00:00.000Z' },
      ],
    );

    expect(result.serverBalanceSnapshot).toBe(1000);
    expect(result.fuels.map((item) => item.syncStatus)).toEqual(['SYNCED', 'SYNCED']);
  });

  it('marks later overspend as conflict without deleting earlier txs', () => {
    const result = reconcileCardBalance(
      [{ id: 'o1', amount: 5000, kind: 'OPENING' }],
      [
        { id: 't1', amount: 3000, occurredAt: '2026-10-01T10:00:00.000Z' },
        { id: 't2', amount: 3000, occurredAt: '2026-10-01T11:00:00.000Z' },
        { id: 't3', amount: 2500, occurredAt: '2026-10-01T12:00:00.000Z' },
      ],
    );

    expect(result.fuels.map((item) => item.syncStatus)).toEqual([
      'SYNCED',
      'CONFLICT',
      'CONFLICT',
    ]);
    expect(result.fuels[1]?.requiresReview).toBe(true);
    expect(result.serverBalanceSnapshot).toBe(2000);
  });

  it('includes opening, recharge, and signed adjustments in credit total', () => {
    const result = reconcileCardBalance(
      [
        { id: 'o1', amount: 10000, kind: 'OPENING' },
        { id: 'r1', amount: 2000, kind: 'RECHARGE' },
        { id: 'a1', amount: 1500, kind: 'ADJUSTMENT' },
        { id: 'a2', amount: -500, kind: 'ADJUSTMENT' },
      ],
      [{ id: 't1', amount: 4000, occurredAt: '2026-10-01T10:00:00.000Z' }],
    );

    expect(result.fuels[0]?.syncStatus).toBe('SYNCED');
    expect(result.serverBalanceSnapshot).toBe(9000);
  });
});
