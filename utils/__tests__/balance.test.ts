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

  it('applies fuel and recharge reversals as signed adjustments', () => {
    const result = projectCardBalance([
      { kind: 'ADJUSTMENT', amount: 8000, adjustmentKind: 'OPENING' },
      { kind: 'RECHARGE', amount: 2000 },
      { kind: 'FUEL', amount: 1500, syncStatus: 'SYNCED' },
      { kind: 'ADJUSTMENT', amount: 1500, adjustmentKind: 'REVERSAL' },
      { kind: 'ADJUSTMENT', amount: -2000, adjustmentKind: 'REVERSAL' },
    ]);

    expect(result).toEqual({
      opening: 8000,
      recharges: 2000,
      fuel: 1500,
      adjustments: -500,
      balance: 8000,
      pendingFuel: 0,
    });
  });

  it('projects person outstanding', () => {
    expect(projectOutstanding([1000, 500], [400])).toBe(1100);
  });

  it('projects zero outstanding when fully settled', () => {
    expect(projectOutstanding([2000], [1500, 500])).toBe(0);
  });

  it('allows negative outstanding after over-settlement', () => {
    expect(projectOutstanding([1000], [1200])).toBe(-200);
  });

  it('ignores empty settlement list', () => {
    expect(projectOutstanding([800, 200], [])).toBe(1000);
  });
});
