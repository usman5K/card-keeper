import { fuelInputSchema } from '@/features/fuel/fuelSchema';
import { recentChips } from '@/utils/chips';

describe('fuelInputSchema', () => {
  it('accepts valid fuel input', () => {
    expect(
      fuelInputSchema.parse({
        cardId: 'c1',
        userId: 'u1',
        amount: 2500,
        station: 'PSO Gulberg',
        area: 'Lahore',
      }),
    ).toMatchObject({ amount: 2500, station: 'PSO Gulberg' });
  });

  it('rejects float amounts', () => {
    expect(() =>
      fuelInputSchema.parse({
        cardId: 'c1',
        userId: 'u1',
        amount: 12.5,
        station: 'PSO',
        area: 'City',
      }),
    ).toThrow();
  });
});

describe('recentChips', () => {
  it('dedupes recent values', () => {
    expect(recentChips(['PSO', 'Shell', 'pso', 'Attock'])).toEqual(['PSO', 'Shell', 'Attock']);
  });
});
