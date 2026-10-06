import {
  coerceDate,
  endOfDay,
  isSameCalendarDay,
  toDate,
  toMonthKey,
  startOfDay,
} from '@/utils/dates';

describe('dates', () => {
  it('builds month keys and day bounds', () => {
    const date = new Date(2026, 9, 5, 15, 30);
    expect(toMonthKey(date)).toBe('2026-10');
    expect(startOfDay(date).getHours()).toBe(0);
    expect(endOfDay(date).getHours()).toBe(23);
    expect(isSameCalendarDay(date, new Date(2026, 9, 5, 1, 0))).toBe(true);
    expect(isSameCalendarDay(date, new Date(2026, 9, 6, 1, 0))).toBe(false);
  });

  it('parses iso strings and rejects invalid values', () => {
    expect(toDate('2026-10-05T12:00:00.000Z').toISOString()).toBe('2026-10-05T12:00:00.000Z');
    expect(() => toDate('not-a-date')).toThrow(/Invalid date/);
  });

  it('coerces Firestore-like timestamps', () => {
    const date = new Date(2026, 9, 6, 9, 0, 0);
    expect(coerceDate({ toDate: () => date })).toEqual(date);
    expect(coerceDate(null)).toBeNull();
    expect(coerceDate('not-a-date')).toBeNull();
  });
});
