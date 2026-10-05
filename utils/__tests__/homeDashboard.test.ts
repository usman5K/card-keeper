import { toMonthKey } from '@/utils/dates';
import {
  balanceCaption,
  buildMonthSnapshot,
  buildPendingActions,
  monthFuelSpent,
  occurredAtMonthKey,
  sumAvailableBalance,
} from '@/utils/homeDashboard';

describe('homeDashboard aggregates', () => {
  it('sums known active card balances', () => {
    expect(
      sumAvailableBalance([
        { serverBalanceSnapshot: 10000, status: 'active' },
        { serverBalanceSnapshot: 2500, status: 'active' },
        { serverBalanceSnapshot: 9999, status: 'inactive' },
        { serverBalanceSnapshot: null, status: 'active' },
      ]),
    ).toEqual({
      total: 12500,
      knownCount: 2,
      unknownCount: 1,
      cardCount: 3,
    });
  });

  it('returns null total when no known balances', () => {
    expect(
      sumAvailableBalance([
        { serverBalanceSnapshot: null, status: 'active' },
        { serverBalanceSnapshot: 5000, status: 'inactive' },
      ]),
    ).toEqual({
      total: null,
      knownCount: 0,
      unknownCount: 1,
      cardCount: 1,
    });
  });

  it('reads month key from occurredAt', () => {
    const local = new Date(2026, 9, 5, 12, 0, 0);
    expect(occurredAtMonthKey(local.toISOString())).toBe(toMonthKey(local));
    expect(occurredAtMonthKey(null)).toBeNull();
    expect(occurredAtMonthKey('not-a-date')).toBeNull();
  });

  it('sums fuel spent for a month and skips failed', () => {
    const monthKey = toMonthKey(new Date(2026, 9, 15));
    const spent = monthFuelSpent(
      [
        {
          amount: 1000,
          occurredAt: new Date(2026, 9, 1, 10, 0, 0).toISOString(),
          syncStatus: 'SYNCED',
        },
        {
          amount: 500,
          occurredAt: new Date(2026, 9, 12, 10, 0, 0).toISOString(),
          syncStatus: 'PENDING',
        },
        {
          amount: 200,
          occurredAt: new Date(2026, 8, 15, 10, 0, 0).toISOString(),
          syncStatus: 'SYNCED',
        },
        {
          amount: 300,
          occurredAt: new Date(2026, 9, 3, 10, 0, 0).toISOString(),
          syncStatus: 'FAILED',
        },
      ],
      monthKey,
    );
    expect(spent).toBe(1500);
  });

  it('builds month snapshot', () => {
    const now = new Date(2026, 9, 6, 12, 0, 0);
    expect(
      buildMonthSnapshot({
        now,
        outstanding: 2700,
        fuel: [
          { amount: 1800, occurredAt: new Date(2026, 9, 2, 8, 0, 0).toISOString() },
          { amount: 200, occurredAt: new Date(2026, 8, 1, 8, 0, 0).toISOString() },
        ],
      }),
    ).toEqual({
      monthKey: toMonthKey(now),
      spent: 1800,
      outstanding: 2700,
    });
  });

  it('builds owner pending actions in priority order', () => {
    expect(
      buildPendingActions({
        role: 'owner',
        conflictCount: 2,
        pendingSyncCount: 1,
        pendingPinCount: 3,
        pendingSettlementCount: 1,
      }),
    ).toEqual([
      {
        id: 'conflicts',
        kind: 'conflict',
        label: '2 conflicts need review',
        href: '/conflicts',
      },
      {
        id: 'pins',
        kind: 'pin',
        label: '3 PIN requests',
        href: '/(tabs)/cards',
      },
      {
        id: 'settlements',
        kind: 'settlement',
        label: '1 settlement to confirm',
        href: '/(tabs)/people',
      },
      {
        id: 'sync',
        kind: 'sync',
        label: '1 entry pending sync',
        href: null,
      },
    ]);
  });

  it('hides owner-only pending actions for members', () => {
    expect(
      buildPendingActions({
        role: 'member',
        conflictCount: 5,
        pendingSyncCount: 2,
        pendingPinCount: 1,
        pendingSettlementCount: 4,
      }),
    ).toEqual([
      {
        id: 'pins',
        kind: 'pin',
        label: '1 PIN request pending',
        href: '/(tabs)/cards',
      },
      {
        id: 'sync',
        kind: 'sync',
        label: '2 entries pending sync',
        href: null,
      },
    ]);
  });

  it('builds balance captions for trust and empty states', () => {
    expect(
      balanceCaption({
        trusted: true,
        role: 'owner',
        summary: { total: null, knownCount: 0, unknownCount: 0, cardCount: 0 },
      }),
    ).toBe('Add a card to start tracking balance.');

    expect(
      balanceCaption({
        trusted: false,
        role: 'member',
        summary: { total: 1000, knownCount: 1, unknownCount: 0, cardCount: 1 },
      }),
    ).toBe('Last known across 1 card, not final');

    expect(
      balanceCaption({
        trusted: true,
        role: 'owner',
        summary: { total: 5000, knownCount: 2, unknownCount: 1, cardCount: 3 },
      }),
    ).toBe('Across 2 of 3 cards with known balance');
  });
});
