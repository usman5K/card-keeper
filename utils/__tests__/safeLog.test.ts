import { omitSecrets, redactSecrets, safeLog } from '@/utils/safeLog';

describe('safeLog', () => {
  it('redacts pin and nested secret fields', () => {
    const result = redactSecrets({
      action: 'PIN_APPROVE',
      pin: '4321',
      cardId: 'card1',
      nested: { pinPlainIsolated: '9999', ok: true },
    });
    expect(result).toEqual({
      action: 'PIN_APPROVE',
      pin: '[redacted]',
      cardId: 'card1',
      nested: { pinPlainIsolated: '[redacted]', ok: true },
    });
  });

  it('omits secret keys for audit metadata', () => {
    expect(
      omitSecrets({
        pin: '1234',
        cardId: 'c1',
        nested: { value: 'x', amount: 10 },
      }),
    ).toEqual({
      cardId: 'c1',
      nested: { amount: 10 },
    });
  });

  it('never prints pin values through safeLog', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    safeLog('pin event', { pin: '1234', cardId: 'c1' });
    expect(spy).toHaveBeenCalledWith('pin event', {
      pin: '[redacted]',
      cardId: 'c1',
    });
    spy.mockRestore();
  });
});
