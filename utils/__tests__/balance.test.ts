import { projectCardBalance, projectOutstanding } from '@/utils/balance';

describe('balance projection', () => {
  it('projects card balance from opening, recharges, fuel, and adjustments', () => {
    const result = projectCardBalance([
      { kind: 'ADJUSTMENT', amount: 10000, adjustmentKind: 'OPENING' },
      { kind: 'RECHARGE', amount: 5000 },
      { kind: 'FUEL', amount: 2500, syncStatus: 'SYNCED' },
      { kind: 'FUEL', amount: 500, syncStatus: 'PENDING', includeInProjection: true },
      { kind: 'FUEL', amount: 999, syncStatus: 'CONFLICT' },
      { kind: 'ADJUSTMENT', amount: -200, adjustmentKind: 'CORRECTION' },
    ]);

    expect(result).toEqual({
      opening: 10000,
      recharges: 5000,
      fuel: 3000,
      adjustments: -200,
      balance: 11800,
      pendingFuel: 500,
    });
  });

  it('projects person outstanding', () => {
    expect(projectOutstanding([1000, 500], [400])).toBe(1100);
  });
});
