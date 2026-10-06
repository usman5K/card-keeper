import { normalizeEmail } from '@/utils/email';

export function assertInviteEmailAvailable(
  email: string,
  members: { email: string }[],
  invites: { email: string; status: string }[],
) {
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email');
  }
  if (members.some((member) => normalizeEmail(member.email) === normalized)) {
    throw new Error('This email is already a member of this workspace');
  }
  if (
    invites.some(
      (invite) =>
        invite.status === 'pending' && normalizeEmail(invite.email) === normalized,
    )
  ) {
    throw new Error('This email already has a pending invite');
  }
  return normalized;
}
