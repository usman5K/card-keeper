import { redactSecrets, safeLog } from '@/utils/safeLog';

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
