import {
  assignedCardCountLabel,
  buildPersonListItems,
  canOpenPersonDetail,
  canViewPersonFinance,
  inviteEmailLooksValid,
  personDisplayName,
  settlementMethodLabel,
  settlementStatusLabel,
  sortPeopleByOutstanding,
  sumRecoverableOutstanding,
} from '@/utils/peopleDashboard';

describe('peopleDashboard', () => {
  const people = [
    {
      id: 'owner1',
      displayName: 'Owner',
      email: 'owner@example.com',
      role: 'owner' as const,
      assignedCardIds: [],
    },
    {
      id: 'm1',
      displayName: 'Ahmed',
      email: 'ahmed@example.com',
      role: 'member' as const,
      assignedCardIds: ['c1', 'c2'],
    },
    {
      id: 'm2',
      displayName: null,
      email: 'bilal@example.com',
      role: 'member' as const,
      assignedCardIds: ['c1'],
    },
  ];

  const finance = {
    owner1: { outstanding: 0, fuelTotal: 0, settledTotal: 0 },
    m1: { outstanding: 2500, fuelTotal: 4000, settledTotal: 1500 },
    m2: { outstanding: 900, fuelTotal: 900, settledTotal: 0 },
  };

  it('uses display name when present', () => {
    expect(personDisplayName({ displayName: 'Ahmed', email: 'a@x.com' })).toBe('Ahmed');
    expect(personDisplayName({ displayName: '  ', email: 'a@x.com' })).toBe('a@x.com');
    expect(personDisplayName({ displayName: null, email: 'a@x.com' })).toBe('a@x.com');
  });

  it('limits finance visibility to owner or self', () => {
    expect(canViewPersonFinance({ role: 'owner', uid: 'owner1' }, 'm1')).toBe(true);
    expect(canViewPersonFinance({ role: 'member', uid: 'm1' }, 'm1')).toBe(true);
    expect(canViewPersonFinance({ role: 'member', uid: 'm1' }, 'm2')).toBe(false);
    expect(canOpenPersonDetail({ role: 'member', uid: 'm1' }, 'm2')).toBe(false);
  });

  it('builds list with finance null for teammates of a member', () => {
    const items = buildPersonListItems(people, finance, { role: 'member', uid: 'm1' });
    const self = items.find((item) => item.id === 'm1');
    const other = items.find((item) => item.id === 'm2');
    expect(self).toMatchObject({
      outstanding: 2500,
      fuelTotal: 4000,
      settledTotal: 1500,
    });
    expect(other).toMatchObject({
      outstanding: null,
      fuelTotal: null,
      settledTotal: null,
    });
  });

  it('exposes all finance for owner', () => {
    const items = buildPersonListItems(people, finance, { role: 'owner', uid: 'owner1' });
    expect(items.find((item) => item.id === 'm2')?.outstanding).toBe(900);
  });

  it('sorts by outstanding descending then name', () => {
    const items = buildPersonListItems(people, finance, { role: 'owner', uid: 'owner1' });
    const sorted = sortPeopleByOutstanding(items);
    expect(sorted.map((item) => item.id)).toEqual(['m1', 'm2', 'owner1']);
  });

  it('puts rows without finance after outstanding rows', () => {
    const items = buildPersonListItems(people, finance, { role: 'member', uid: 'm1' });
    const sorted = sortPeopleByOutstanding(items);
    expect(sorted[0]?.id).toBe('m1');
    expect(sorted.slice(1).map((item) => item.id)).toEqual(['m2', 'owner1']);
  });

  it('sums recoverable outstanding', () => {
    expect(sumRecoverableOutstanding([{ outstanding: 2500 }, { outstanding: 900 }])).toBe(3400);
  });

  it('formats assignment and settlement labels', () => {
    expect(assignedCardCountLabel(0)).toBe('0 cards assigned');
    expect(assignedCardCountLabel(1)).toBe('1 card assigned');
    expect(assignedCardCountLabel(2)).toBe('2 cards assigned');
    expect(settlementMethodLabel('jazzcash')).toBe('JazzCash');
    expect(settlementMethodLabel('wire')).toBe('wire');
    expect(settlementStatusLabel('pending')).toBe('Pending');
    expect(settlementStatusLabel('confirmed')).toBe('Confirmed');
  });

  it('validates invite email shape', () => {
    expect(inviteEmailLooksValid('name@email.com')).toBe(true);
    expect(inviteEmailLooksValid('  Name@Email.COM ')).toBe(true);
    expect(inviteEmailLooksValid('nodomain')).toBe(false);
    expect(inviteEmailLooksValid('@x.com')).toBe(false);
    expect(inviteEmailLooksValid('a@b')).toBe(false);
  });
});
