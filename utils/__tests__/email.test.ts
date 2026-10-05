import { emailsMatch, normalizeEmail } from '@/utils/email';

describe('email helpers', () => {
  it('normalizes trim and case', () => {
    expect(normalizeEmail('  Owner@Example.COM ')).toBe('owner@example.com');
  });

  it('matches emails ignoring case and surrounding space', () => {
    expect(emailsMatch('Owner@Example.com', ' owner@example.com ')).toBe(true);
    expect(emailsMatch('a@b.com', 'c@d.com')).toBe(false);
  });
});
