import {
  buildExportRows,
  buildFuelCsv,
  buildReportOverview,
  countsTowardReportFuel,
  escapeCsvCell,
  filterFuelInRange,
  groupsForKind,
  inReportRange,
  occurredAtDate,
  resolveReportRange,
  scopeFuelForViewer,
  scopeSettlementsForViewer,
  type ReportFuelRow,
  type ReportSettlementRow,
} from '@/utils/reports';

const fuelFixture: ReportFuelRow[] = [
  {
    id: 'f1',
    userId: 'u1',
    cardId: 'c1',
    amount: 2000,
    station: 'PSO Mall',
    area: 'Gulberg',
    occurredAt: new Date(2026, 9, 2, 10, 0, 0).toISOString(),
    syncStatus: 'SYNCED',
  },
  {
    id: 'f2',
    userId: 'u2',
    cardId: 'c1',
    amount: 1500,
    station: 'Shell DHA',
    area: 'DHA',
    occurredAt: new Date(2026, 9, 5, 12, 0, 0).toISOString(),
    syncStatus: 'PENDING',
  },
  {
    id: 'f3',
    userId: 'u1',
    cardId: 'c2',
    amount: 800,
    station: 'PSO Mall',
    area: 'Gulberg',
    occurredAt: new Date(2026, 8, 20, 9, 0, 0).toISOString(),
    syncStatus: 'SYNCED',
  },
  {
    id: 'f4',
    userId: 'u1',
    cardId: 'c1',
    amount: 400,
    station: 'Total',
    area: 'Model Town',
    occurredAt: new Date(2026, 9, 3, 8, 0, 0).toISOString(),
    syncStatus: 'FAILED',
  },
];

const settlementFixture: ReportSettlementRow[] = [
  {
    id: 's1',
    userId: 'u1',
    amount: 1000,
    status: 'confirmed',
    occurredAt: new Date(2026, 9, 4, 11, 0, 0).toISOString(),
  },
  {
    id: 's2',
    userId: 'u2',
    amount: 500,
    status: 'pending',
    occurredAt: new Date(2026, 9, 5, 11, 0, 0).toISOString(),
  },
  {
    id: 's3',
    userId: 'u1',
    amount: 300,
    status: 'confirmed',
    occurredAt: new Date(2026, 8, 10, 11, 0, 0).toISOString(),
  },
];

describe('reports aggregations', () => {
  it('resolves period ranges', () => {
    const now = new Date(2026, 9, 6, 15, 0, 0);
    const month = resolveReportRange('this_month', now);
    expect(month.start?.getDate()).toBe(1);
    expect(month.start?.getMonth()).toBe(9);
    expect(month.end?.getDate()).toBe(6);

    const all = resolveReportRange('all', now);
    expect(all.start).toBeNull();
    expect(all.end).toBeNull();

    const last30 = resolveReportRange('last_30', now);
    expect(last30.start?.getDate()).toBe(7);
    expect(last30.start?.getMonth()).toBe(8);
  });

  it('parses occurredAt and range membership', () => {
    const range = resolveReportRange('this_month', new Date(2026, 9, 6));
    expect(occurredAtDate(fuelFixture[0].occurredAt)?.getMonth()).toBe(9);
    expect(inReportRange(fuelFixture[0].occurredAt, range)).toBe(true);
    expect(inReportRange(fuelFixture[2].occurredAt, range)).toBe(false);
    expect(countsTowardReportFuel({ syncStatus: 'FAILED' })).toBe(false);
  });

  it('scopes fuel and settlements by role', () => {
    expect(scopeFuelForViewer(fuelFixture, { role: 'owner', uid: 'u1' })).toHaveLength(4);
    expect(scopeFuelForViewer(fuelFixture, { role: 'member', uid: 'u1' })).toHaveLength(3);
    expect(
      scopeSettlementsForViewer(settlementFixture, { role: 'member', uid: 'u2' }),
    ).toEqual([settlementFixture[1]]);
  });

  it('builds overview matching ledger math for a month', () => {
    const range = resolveReportRange('this_month', new Date(2026, 9, 6));
    const overview = buildReportOverview({
      fuel: fuelFixture,
      settlements: settlementFixture,
      range,
      personNames: { u1: 'Ali', u2: 'Sara' },
      cardNames: { c1: 'PSO ···1234', c2: 'Shell ···5678' },
    });

    // Oct fuel: 2000 + 1500 (FAILED skipped) = 3500
    expect(overview.fuelTotal).toBe(3500);
    expect(overview.fuelCount).toBe(2);
    // Confirmed settlement in Oct only: 1000
    expect(overview.recovered).toBe(1000);
    expect(overview.outstanding).toBe(2500);

    expect(overview.byPerson).toEqual([
      { key: 'u1', label: 'Ali', amount: 2000, count: 1 },
      { key: 'u2', label: 'Sara', amount: 1500, count: 1 },
    ]);
    expect(overview.byCard[0]).toMatchObject({
      key: 'c1',
      label: 'PSO ···1234',
      amount: 3500,
      count: 2,
    });
    expect(overview.byArea.map((row) => row.key)).toEqual(['gulberg', 'dha']);
    expect(overview.byStation[0]).toMatchObject({
      key: 'pso mall',
      amount: 2000,
      count: 1,
    });
    expect(overview.byTime[0]).toMatchObject({ key: '2026-10', amount: 3500, count: 2 });
  });

  it('includes prior months when period is all', () => {
    const overview = buildReportOverview({
      fuel: fuelFixture,
      settlements: settlementFixture,
      range: resolveReportRange('all'),
      personNames: { u1: 'Ali', u2: 'Sara' },
    });
    // 2000 + 1500 + 800 = 4300 (FAILED skipped)
    expect(overview.fuelTotal).toBe(4300);
    expect(overview.recovered).toBe(1300);
    expect(overview.outstanding).toBe(3000);
    expect(groupsForKind(overview, 'time')).toHaveLength(2);
  });

  it('filters fuel in range without failed rows', () => {
    const range = resolveReportRange('this_month', new Date(2026, 9, 6));
    expect(filterFuelInRange(fuelFixture, range).map((row) => row.id)).toEqual([
      'f1',
      'f2',
    ]);
  });

  it('builds CSV with expected columns and escaped values', () => {
    expect(escapeCsvCell('a,b')).toBe('"a,b"');
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');

    const rows = buildExportRows({
      fuel: fuelFixture,
      range: resolveReportRange('this_month', new Date(2026, 9, 6)),
      personNames: { u1: 'Ali', u2: 'Sara' },
      cardNames: { c1: 'PSO ···1234' },
    });
    const csv = buildFuelCsv(rows);
    const lines = csv.trim().split('\n');
    expect(lines[0]).toBe(
      'occurredAt,person,personId,card,cardId,amount,station,area,syncStatus,id',
    );
    expect(lines).toHaveLength(3);
    expect(csv).toContain('Ali');
    expect(csv).toContain('PSO Mall');
    expect(csv).not.toContain(',400,');
  });

  it('member-scoped overview only uses own fuel and settlements', () => {
    const viewerFuel = scopeFuelForViewer(fuelFixture, { role: 'member', uid: 'u1' });
    const viewerSettlements = scopeSettlementsForViewer(settlementFixture, {
      role: 'member',
      uid: 'u1',
    });
    const overview = buildReportOverview({
      fuel: viewerFuel,
      settlements: viewerSettlements,
      range: resolveReportRange('this_month', new Date(2026, 9, 6)),
      personNames: { u1: 'Ali', u2: 'Sara' },
    });
    expect(overview.fuelTotal).toBe(2000);
    expect(overview.byPerson).toHaveLength(1);
    expect(overview.recovered).toBe(1000);
    expect(overview.outstanding).toBe(1000);
  });
});
