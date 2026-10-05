import { endOfDay, startOfDay, toDate, toMonthKey } from '@/utils/dates';
import { projectOutstanding } from '@/utils/balance';
import { addPkr, assertIntegerPkr, sumPkr } from '@/utils/money';

export type ReportFuelRow = {
  id: string;
  userId: string;
  cardId: string;
  amount: number;
  station: string;
  area: string;
  occurredAt: unknown;
  syncStatus?: string;
};

export type ReportSettlementRow = {
  id: string;
  userId: string;
  amount: number;
  status: string;
  occurredAt: unknown;
};

export type ReportDateRange = {
  start: Date | null;
  end: Date | null;
};

export type ReportPeriod = 'this_month' | 'last_30' | 'last_90' | 'all';

export type ReportGroupKind = 'person' | 'card' | 'area' | 'station' | 'time';

export type ReportGroupTotal = {
  key: string;
  label: string;
  amount: number;
  count: number;
};

export type ReportOverview = {
  fuelTotal: number;
  fuelCount: number;
  recovered: number;
  outstanding: number;
  byPerson: ReportGroupTotal[];
  byCard: ReportGroupTotal[];
  byArea: ReportGroupTotal[];
  byStation: ReportGroupTotal[];
  byTime: ReportGroupTotal[];
};

export type ReportExportRow = {
  id: string;
  occurredAt: string;
  person: string;
  personId: string;
  card: string;
  cardId: string;
  amount: number;
  station: string;
  area: string;
  syncStatus: string;
};

export type NameLookup = Record<string, string>;

const PERIOD_LABELS: Record<ReportPeriod, string> = {
  this_month: 'This month',
  last_30: 'Last 30 days',
  last_90: 'Last 90 days',
  all: 'All time',
};

export function reportPeriodLabel(period: ReportPeriod) {
  return PERIOD_LABELS[period];
}

export function reportPeriodOptions(): { value: ReportPeriod; label: string }[] {
  return (Object.keys(PERIOD_LABELS) as ReportPeriod[]).map((value) => ({
    value,
    label: PERIOD_LABELS[value],
  }));
}

export function resolveReportRange(period: ReportPeriod, now = new Date()): ReportDateRange {
  if (period === 'all') {
    return { start: null, end: null };
  }
  const end = endOfDay(now);
  if (period === 'this_month') {
    return {
      start: startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end,
    };
  }
  const days = period === 'last_30' ? 30 : 90;
  const start = startOfDay(now);
  start.setDate(start.getDate() - (days - 1));
  return { start, end };
}

export function occurredAtDate(value: unknown): Date | null {
  if (value == null) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (
    typeof value === 'object'
    && 'toDate' in value
    && typeof (value as { toDate: unknown }).toDate === 'function'
  ) {
    try {
      const date = (value as { toDate: () => Date }).toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  }
  try {
    return toDate(value as string | number);
  } catch {
    return null;
  }
}

export function inReportRange(value: unknown, range: ReportDateRange) {
  const date = occurredAtDate(value);
  if (!date) {
    return false;
  }
  if (range.start && date < range.start) {
    return false;
  }
  if (range.end && date > range.end) {
    return false;
  }
  return true;
}

export function countsTowardReportFuel(row: Pick<ReportFuelRow, 'syncStatus'>) {
  return row.syncStatus !== 'FAILED';
}

export function scopeFuelForViewer(
  rows: ReportFuelRow[],
  viewer: { role: 'owner' | 'member'; uid: string },
) {
  if (viewer.role === 'owner') {
    return rows;
  }
  return rows.filter((row) => row.userId === viewer.uid);
}

export function scopeSettlementsForViewer(
  rows: ReportSettlementRow[],
  viewer: { role: 'owner' | 'member'; uid: string },
) {
  if (viewer.role === 'owner') {
    return rows;
  }
  return rows.filter((row) => row.userId === viewer.uid);
}

function sortGroupTotals(rows: ReportGroupTotal[]) {
  return [...rows].sort((a, b) => {
    if (a.amount !== b.amount) {
      return b.amount - a.amount;
    }
    return a.label.localeCompare(b.label);
  });
}

function accumulate(
  map: Map<string, ReportGroupTotal>,
  key: string,
  label: string,
  amount: number,
) {
  const existing = map.get(key);
  if (existing) {
    existing.amount = addPkr(existing.amount, amount);
    existing.count += 1;
    return;
  }
  map.set(key, {
    key,
    label,
    amount: assertIntegerPkr(amount, 'fuel'),
    count: 1,
  });
}

export function filterFuelInRange(rows: ReportFuelRow[], range: ReportDateRange) {
  return rows.filter(
    (row) => countsTowardReportFuel(row) && inReportRange(row.occurredAt, range),
  );
}

export function filterConfirmedSettlementsInRange(
  rows: ReportSettlementRow[],
  range: ReportDateRange,
) {
  return rows.filter(
    (row) => row.status === 'confirmed' && inReportRange(row.occurredAt, range),
  );
}

export function buildReportOverview(input: {
  fuel: ReportFuelRow[];
  settlements: ReportSettlementRow[];
  range: ReportDateRange;
  personNames?: NameLookup;
  cardNames?: NameLookup;
}): ReportOverview {
  const fuel = filterFuelInRange(input.fuel, input.range);
  const recoveredRows = filterConfirmedSettlementsInRange(input.settlements, input.range);
  const fuelAmounts = fuel.map((row) => assertIntegerPkr(row.amount, 'fuel'));
  const recoveredAmounts = recoveredRows.map((row) =>
    assertIntegerPkr(row.amount, 'settlement'),
  );
  const fuelTotal = sumPkr(fuelAmounts);
  const recovered = sumPkr(recoveredAmounts);
  const outstanding = projectOutstanding(fuelAmounts, recoveredAmounts);

  const byPerson = new Map<string, ReportGroupTotal>();
  const byCard = new Map<string, ReportGroupTotal>();
  const byArea = new Map<string, ReportGroupTotal>();
  const byStation = new Map<string, ReportGroupTotal>();
  const byTime = new Map<string, ReportGroupTotal>();

  for (const row of fuel) {
    const amount = assertIntegerPkr(row.amount, 'fuel');
    const personLabel = input.personNames?.[row.userId] ?? row.userId;
    const cardLabel = input.cardNames?.[row.cardId] ?? row.cardId;
    const area = row.area.trim() || 'Unknown area';
    const station = row.station.trim() || 'Unknown station';
    const date = occurredAtDate(row.occurredAt);
    const monthKey = date ? toMonthKey(date) : 'Unknown';

    accumulate(byPerson, row.userId, personLabel, amount);
    accumulate(byCard, row.cardId, cardLabel, amount);
    accumulate(byArea, area.toLowerCase(), area, amount);
    accumulate(byStation, station.toLowerCase(), station, amount);
    accumulate(byTime, monthKey, monthKey, amount);
  }

  return {
    fuelTotal,
    fuelCount: fuel.length,
    recovered,
    outstanding,
    byPerson: sortGroupTotals([...byPerson.values()]),
    byCard: sortGroupTotals([...byCard.values()]),
    byArea: sortGroupTotals([...byArea.values()]),
    byStation: sortGroupTotals([...byStation.values()]),
    byTime: [...byTime.values()].sort((a, b) => b.key.localeCompare(a.key)),
  };
}

export function groupsForKind(
  overview: ReportOverview,
  kind: ReportGroupKind,
): ReportGroupTotal[] {
  switch (kind) {
    case 'person':
      return overview.byPerson;
    case 'card':
      return overview.byCard;
    case 'area':
      return overview.byArea;
    case 'station':
      return overview.byStation;
    case 'time':
      return overview.byTime;
  }
}

export function groupKindLabel(kind: ReportGroupKind) {
  switch (kind) {
    case 'person':
      return 'By person';
    case 'card':
      return 'By card';
    case 'area':
      return 'By area';
    case 'station':
      return 'By station';
    case 'time':
      return 'By month';
  }
}

export function escapeCsvCell(value: string | number) {
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildFuelCsv(rows: ReportExportRow[]) {
  const header = [
    'occurredAt',
    'person',
    'personId',
    'card',
    'cardId',
    'amount',
    'station',
    'area',
    'syncStatus',
    'id',
  ];
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(
      [
        escapeCsvCell(row.occurredAt),
        escapeCsvCell(row.person),
        escapeCsvCell(row.personId),
        escapeCsvCell(row.card),
        escapeCsvCell(row.cardId),
        escapeCsvCell(row.amount),
        escapeCsvCell(row.station),
        escapeCsvCell(row.area),
        escapeCsvCell(row.syncStatus),
        escapeCsvCell(row.id),
      ].join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function buildExportRows(input: {
  fuel: ReportFuelRow[];
  range: ReportDateRange;
  personNames?: NameLookup;
  cardNames?: NameLookup;
}): ReportExportRow[] {
  const fuel = filterFuelInRange(input.fuel, input.range);
  return fuel
    .map((row) => {
      const date = occurredAtDate(row.occurredAt);
      return {
        id: row.id,
        occurredAt: date ? date.toISOString() : '',
        person: input.personNames?.[row.userId] ?? row.userId,
        personId: row.userId,
        card: input.cardNames?.[row.cardId] ?? row.cardId,
        cardId: row.cardId,
        amount: assertIntegerPkr(row.amount, 'fuel'),
        station: row.station,
        area: row.area,
        syncStatus: row.syncStatus ?? '',
      };
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
