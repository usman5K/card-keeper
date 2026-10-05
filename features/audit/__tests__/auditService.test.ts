import { auditActionLabel, sanitizeAuditMetadata } from '@/features/audit/auditMeta';

describe('sanitizeAuditMetadata', () => {
  it('omits pin and secret keys entirely', () => {
    expect(
      sanitizeAuditMetadata({
        cardId: 'c1',
        pin: '4321',
        pinPlainIsolated: '9999',
        nested: { value: 'secret', amount: 100 },
      }),
    ).toEqual({
      cardId: 'c1',
      nested: { amount: 100 },
    });
  });

  it('keeps safe financial metadata', () => {
    expect(
      sanitizeAuditMetadata({
        amount: 500,
        kind: 'OPENING',
        cardId: 'card1',
      }),
    ).toEqual({
      amount: 500,
      kind: 'OPENING',
      cardId: 'card1',
    });
  });
});

describe('auditActionLabel', () => {
  it('maps known actions', () => {
    expect(auditActionLabel('FUEL_CREATE')).toBe('Added fuel');
    expect(auditActionLabel('PIN_SET')).toBe('Set card PIN');
  });

  it('returns raw action for unknowns', () => {
    expect(auditActionLabel('CUSTOM')).toBe('CUSTOM');
  });
});
