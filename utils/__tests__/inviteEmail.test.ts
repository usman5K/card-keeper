import { assertInviteEmailAvailable } from '@/utils/inviteGuard';

describe('assertInviteEmailAvailable', () => {
  const members = [{ email: 'Owner@Example.com' }, { email: 'member@example.com' }];
  const invites = [
    { email: 'pending@example.com', status: 'pending' },
    { email: 'old@example.com', status: 'revoked' },
  ];

  it('normalizes and allows a new email', () => {
    expect(assertInviteEmailAvailable('  New@Example.com ', members, invites)).toBe(
      'new@example.com',
    );
  });

  it('rejects an existing member', () => {
    expect(() => assertInviteEmailAvailable('member@example.com', members, invites)).toThrow(
      'already a member',
    );
  });

  it('rejects a pending invite', () => {
    expect(() => assertInviteEmailAvailable('pending@example.com', members, invites)).toThrow(
      'pending invite',
    );
  });

  it('allows a revoked invite email', () => {
    expect(assertInviteEmailAvailable('old@example.com', members, invites)).toBe(
      'old@example.com',
    );
  });
});
