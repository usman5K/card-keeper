import { recentChips } from '@/utils/chips';

describe('recentChips', () => {
  it('dedupes case-insensitively and keeps first spellings', () => {
    expect(recentChips(['PSO', 'Shell', 'pso', 'Total', 'Caltex', 'Shell'])).toEqual([
      'PSO',
      'Shell',
      'Total',
      'Caltex',
    ]);
  });

  it('skips blanks and respects max', () => {
    expect(recentChips(['  ', 'A', '', 'B', 'C'], 2)).toEqual(['A', 'B']);
  });
});
