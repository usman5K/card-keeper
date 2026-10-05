import { isSameCalendarDay, toMonthKey, startOfDay } from '@/utils/dates';

describe('dates', () => {
  it('builds month keys and day bounds', () => {
    const date = new Date(2026, 9, 5, 15, 30);
    expect(toMonthKey(date)).toBe('2026-10');
    expect(startOfDay(date).getHours()).toBe(0);
    expect(isSameCalendarDay(date, new Date(2026, 9, 5, 1, 0))).toBe(true);
    expect(isSameCalendarDay(date, new Date(2026, 9, 6, 1, 0))).toBe(false);
  });
});
