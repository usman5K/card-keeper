import { pinRequestId, pinValueSchema } from '@/features/pin/pinSchema';

describe('pinSchema', () => {
  it('accepts digit PINs of length 4 to 12', () => {
    expect(pinValueSchema.parse('1234')).toBe('1234');
    expect(pinValueSchema.parse('123456789012')).toBe('123456789012');
  });

  it('rejects non-digit or short PINs', () => {
    expect(() => pinValueSchema.parse('12')).toThrow();
    expect(() => pinValueSchema.parse('12ab')).toThrow();
  });

  it('builds deterministic request ids', () => {
    expect(pinRequestId('card1', 'user1')).toBe('card1_user1');
  });
});
