import { formatPkr, parsePkrInput, addPkr, subtractPkr, sumPkr } from '@/utils/money';

describe('money', () => {
  it('adds and subtracts whole PKR only', () => {
    expect(addPkr(100, 50)).toBe(150);
    expect(subtractPkr(100, 40)).toBe(60);
    expect(sumPkr([10, 20, 30])).toBe(60);
  });

  it('rejects float arithmetic inputs', () => {
    expect(() => addPkr(10.5, 1)).toThrow(/whole PKR/);
    expect(() => subtractPkr(1, 0.1)).toThrow(/whole PKR/);
  });

  it('parses and formats PKR', () => {
    expect(parsePkrInput('1,250')).toBe(1250);
    expect(formatPkr(1250)).toBe('Rs 1,250');
    expect(formatPkr(1250, { withSymbol: false })).toBe('1,250');
    expect(() => parsePkrInput('12.5')).toThrow(/whole rupee/);
  });
});
