import { settlementInputSchema, confirmSettlementSchema } from '@/features/settlements/settlementSchema';

describe('settlementSchema', () => {
  it('accepts a valid settlement input', () => {
    const parsed = settlementInputSchema.parse({
      userId: 'u1',
      amount: 1500,
      method: 'cash',
    });
    expect(parsed.amount).toBe(1500);
    expect(parsed.method).toBe('cash');
  });

  it('rejects fractional amounts', () => {
    expect(() =>
      settlementInputSchema.parse({
        userId: 'u1',
        amount: 10.5,
        method: 'bank',
      }),
    ).toThrow();
  });

  it('rejects unknown methods', () => {
    expect(() =>
      settlementInputSchema.parse({
        userId: 'u1',
        amount: 100,
        method: 'crypto',
      }),
    ).toThrow();
  });

  it('accepts optional confirm edits', () => {
    expect(confirmSettlementSchema.parse({ amount: 900, method: 'bank' })).toEqual({
      amount: 900,
      method: 'bank',
    });
    expect(confirmSettlementSchema.parse({})).toEqual({});
  });
});
