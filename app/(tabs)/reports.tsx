import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceHero } from '@/components/BalanceHero';
import { ChipRow } from '@/components/ChipRow';
import { EmptyState } from '@/components/EmptyState';
import { ReportsSkeleton } from '@/components/ReportsSkeleton';
import { SelectField } from '@/components/SelectField';
import { useAuth } from '@/features/auth/AuthProvider';
import { orgCapabilities } from '@/features/org/capabilities';
import { useOrg } from '@/features/org/OrgProvider';
import { exportCsvFile } from '@/features/reports/exportCsv';
import {
  listFuelForReport,
  listSettlementsForReport,
  loadReportLookups,
} from '@/features/reports/reportService';
import { useSync } from '@/features/sync/SyncProvider';
import { useTheme } from '@/features/theme/ThemeProvider';
import { toast } from '@/features/toast/ToastProvider';
import { a11y } from '@/theme/tokens';
import { formatPkr } from '@/utils/money';
import {
  buildExportRows,
  buildFuelCsv,
  buildReportOverview,
  groupKindLabel,
  groupsForKind,
  reportPeriodLabel,
  reportPeriodOptions,
  resolveReportRange,
  scopeFuelForViewer,
  scopeSettlementsForViewer,
  type ReportFuelRow,
  type ReportGroupKind,
  type ReportPeriod,
  type ReportSettlementRow,
  type NameLookup,
} from '@/utils/reports';

export default function ReportsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { orgId, orgName, member } = useOrg();
  const { balanceTrusted, isOnline } = useSync();
  const insets = useSafeAreaInsets();
  const caps = orgCapabilities(member?.role);
  const isOwner = caps.isOwner;
  const groupKinds = caps.reportGroupKinds;

  const [period, setPeriod] = useState<ReportPeriod>('this_month');
  const [groupKind, setGroupKind] = useState<ReportGroupKind>(caps.defaultReportGroup);
  const [fuel, setFuel] = useState<ReportFuelRow[]>([]);
  const [settlements, setSettlements] = useState<ReportSettlementRow[]>([]);
  const [personNames, setPersonNames] = useState<NameLookup>({});
  const [cardNames, setCardNames] = useState<NameLookup>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!orgId || !member || !user) {
      setFuel([]);
      setSettlements([]);
      setPersonNames({});
      setCardNames({});
      setLoading(false);
      return;
    }

    const scopedUserId = isOwner ? undefined : user.uid;
    const [nextFuel, nextSettlements, lookups] = await Promise.all([
      listFuelForReport(orgId, { userId: scopedUserId }),
      listSettlementsForReport(orgId, { userId: scopedUserId }),
      loadReportLookups(orgId, member),
    ]);

    const viewer = { role: member.role, uid: user.uid };
    setFuel(scopeFuelForViewer(nextFuel, viewer));
    setSettlements(scopeSettlementsForViewer(nextSettlements, viewer));
    setPersonNames(lookups.personNames);
    setCardNames(lookups.cardNames);
  }, [orgId, member, user, isOwner]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          await load();
          if (!cancelled) {
            setLoadError(null);
          }
        } catch (err) {
          if (!cancelled) {
            setLoadError(err instanceof Error ? err.message : 'Could not load reports');
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load, reloadKey]);

  useEffect(() => {
    setGroupKind(caps.defaultReportGroup);
  }, [orgId, caps.defaultReportGroup]);

  const range = useMemo(() => resolveReportRange(period), [period]);
  const overview = useMemo(
    () =>
      buildReportOverview({
        fuel,
        settlements,
        range,
        personNames,
        cardNames,
      }),
    [fuel, settlements, range, personNames, cardNames],
  );
  const groups = useMemo(
    () => groupsForKind(overview, groupKind),
    [overview, groupKind],
  );

  async function onExport() {
    if (!user || !member) {
      return;
    }
    setExporting(true);
    try {
      const rows = buildExportRows({
        fuel,
        range,
        personNames,
        cardNames,
      });
      if (rows.length === 0) {
        toast.info('Nothing to export for this period.');
        return;
      }
      const csv = buildFuelCsv(rows);
      const stamp = new Date().toISOString().slice(0, 10);
      const result = await exportCsvFile(`fuelledger-${period}-${stamp}.csv`, csv);
      if (!result.ok) {
        toast.error(result.reason);
        return;
      }
      toast.success(
        result.method === 'download' ? 'CSV downloaded.' : 'CSV ready to share.',
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export CSV');
    } finally {
      setExporting(false);
    }
  }

  if (!orgId || !member || !user) {
    return (
      <View className="flex-1 bg-background px-md" style={{ paddingTop: insets.top + 8 }}>
        <EmptyState
          title="Reports"
          body="Join or create a workspace to see spend summaries."
        />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: insets.bottom + 32,
      }}>
      <Text className="text-sm text-muted">{orgName ?? 'Workspace'}</Text>
      <Text className="mt-xs text-xl font-semibold text-ink">{caps.reportsTitle}</Text>
      {!isOwner ? (
        <Text className="mt-xs text-sm text-muted">
          Only your fuel and payments in this workspace.
        </Text>
      ) : null}

      {loading ? <ReportsSkeleton /> : null}

      {!loading && loadError ? (
        <View className="mt-lg">
          <EmptyState title="Could not load reports" body={loadError} />
          <Pressable
            className="mt-md self-start items-center justify-center rounded-lg px-md"
            style={{ backgroundColor: colors.accentSoft, minHeight: a11y.minHit }}
            onPress={() => setReloadKey((value) => value + 1)}
            accessibilityRole="button"
            accessibilityLabel="Retry loading reports">
            <Text className="font-medium" style={{ color: colors.accent }}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      {!loading && !loadError && !isOnline ? (
        <Text className="mt-md text-sm" style={{ color: colors.offline }}>
          Offline. Report totals may be last known.
        </Text>
      ) : null}

      {!loading && !loadError ? (
        <>
          <View className="mt-lg">
            <SelectField
              label="Period"
              value={period}
              options={reportPeriodOptions().map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(value) => setPeriod(value as ReportPeriod)}
            />
          </View>

          <View className="mt-xl">
            <BalanceHero
              amount={overview.fuelTotal}
              trusted={balanceTrusted}
              label={`${reportPeriodLabel(period)} fuel`}
              caption={
                overview.fuelCount === 0
                  ? 'No fuel in this period.'
                  : `${overview.fuelCount} ${overview.fuelCount === 1 ? 'entry' : 'entries'} · recovered ${formatPkr(overview.recovered)}`
              }
            />
            <Text className="mt-md text-base text-muted">
              Period outstanding {formatPkr(overview.outstanding)}
            </Text>
          </View>

          <View className="mt-xl">
            <Text className="mb-sm text-sm font-medium text-muted">Group by</Text>
            <ChipRow
              options={groupKinds.map((kind) => groupKindLabel(kind))}
              selected={groupKindLabel(groupKind)}
              onSelect={(label) => {
                const next = groupKinds.find((kind) => groupKindLabel(kind) === label);
                if (next) {
                  setGroupKind(next);
                }
              }}
            />
          </View>

          <View className="mt-lg">
            <Text className="text-base font-semibold text-ink">
              {groupKindLabel(groupKind)}
            </Text>
            {groups.length === 0 ? (
              <EmptyState
                title="No spend yet"
                body="Fuel entries in this period will group here."
              />
            ) : (
              groups.map((row) => (
                <View
                  key={row.key}
                  className="mt-sm rounded-lg border px-md py-md"
                  style={{
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  }}>
                  <View className="flex-row items-center justify-between">
                    <Text className="flex-1 pr-md text-base font-medium text-ink">
                      {row.label}
                    </Text>
                    <Text className="text-base font-semibold text-ink">
                      {formatPkr(row.amount)}
                    </Text>
                  </View>
                  <Text className="mt-xs text-sm text-muted">
                    {row.count === 1 ? '1 entry' : `${row.count} entries`}
                  </Text>
                </View>
              ))
            )}
          </View>

          <Pressable
            className="mt-xl items-center justify-center rounded-xl px-md"
            style={({ pressed }) => ({
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              minHeight: a11y.minHit,
              opacity: exporting ? 0.6 : pressed ? 0.88 : 1,
            })}
            disabled={exporting}
            onPress={() => {
              void onExport();
            }}
            accessibilityRole="button"
            accessibilityLabel="Export CSV">
            <Text className="text-base font-semibold text-ink">
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Text>
          </Pressable>

        </>
      ) : null}
    </ScrollView>
  );
}
