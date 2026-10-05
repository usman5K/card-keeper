import { rechargeInputSchema } from '@/features/recharges/rechargeSchema';

describe('rechargeInputSchema', () => {
  it('accepts integer positive PKR amounts', () => {
    expect(
      rechargeInputSchema.parse({
        cardId: 'card1',
        amount: 5000,
        source: 'Bank',
      }),
    ).toMatchObject({ cardId: 'card1', amount: 5000 });
  });

  it('rejects float or non-positive amounts', () => {
    expect(() =>
      rechargeInputSchema.parse({ cardId: 'card1', amount: 12.5 }),
    ).toThrow();
    expect(() =>
      rechargeInputSchema.parse({ cardId: 'card1', amount: 0 }),
    ).toThrow();
  });
});
