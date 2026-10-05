import { adjustmentInputSchema } from '@/features/adjustments/adjustmentSchema';

describe('adjustmentSchema', () => {
  it('accepts a valid opening balance', () => {
    const parsed = adjustmentInputSchema.parse({
      cardId: 'c1',
      amount: 25000,
      reason: 'Opening balance',
      kind: 'OPENING',
    });
    expect(parsed.kind).toBe('OPENING');
    expect(parsed.amount).toBe(25000);
  });

  it('rejects zero and fractional amounts', () => {
    expect(() =>
      adjustmentInputSchema.parse({
        cardId: 'c1',
        amount: 0,
        reason: 'noop',
        kind: 'CORRECTION',
      }),
    ).toThrow();
    expect(() =>
      adjustmentInputSchema.parse({
        cardId: 'c1',
        amount: 10.5,
        reason: 'bad',
        kind: 'CORRECTION',
      }),
    ).toThrow();
  });

  it('rejects non-positive opening amounts', () => {
    expect(() =>
      adjustmentInputSchema.parse({
        cardId: 'c1',
        amount: -100,
        reason: 'Opening balance',
        kind: 'OPENING',
      }),
    ).toThrow();
  });

  it('accepts fuel and recharge reversals', () => {
    expect(
      adjustmentInputSchema.parse({
        cardId: 'c1',
        amount: 1200,
        reason: 'Reverse fuel',
        kind: 'REVERSAL',
        linkedTxId: 't1',
      }).amount,
    ).toBe(1200);
    expect(
      adjustmentInputSchema.parse({
        cardId: 'c1',
        amount: -5000,
        reason: 'Reverse recharge',
        kind: 'REVERSAL',
        linkedTxId: 'r1',
      }).amount,
    ).toBe(-5000);
  });
});
