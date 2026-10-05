import {
  balanceIsAuthoritative,
  countSyncStatuses,
  deriveSyncUiStatus,
  syncUiLabel,
} from '@/utils/syncStatus';

describe('deriveSyncUiStatus', () => {
  it('returns offline when disconnected', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: false,
        isSyncing: true,
        pendingCount: 2,
        conflictCount: 1,
        failedCount: 1,
      }),
    ).toBe('offline');
  });

  it('prefers failed over conflict and pending', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: false,
        pendingCount: 3,
        conflictCount: 2,
        failedCount: 1,
      }),
    ).toBe('failed');
  });

  it('prefers conflict over syncing and pending', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: true,
        pendingCount: 2,
        conflictCount: 1,
        failedCount: 0,
      }),
    ).toBe('conflict');
  });

  it('returns syncing when uploading with no conflicts', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: true,
        pendingCount: 1,
        conflictCount: 0,
        failedCount: 0,
      }),
    ).toBe('syncing');
  });

  it('returns pending when online with queued writes', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: false,
        pendingCount: 2,
        conflictCount: 0,
        failedCount: 0,
      }),
    ).toBe('pending');
  });

  it('returns synced after a recent successful flush', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        conflictCount: 0,
        failedCount: 0,
        recentlySynced: true,
      }),
    ).toBe('synced');
  });

  it('returns online in the steady connected state', () => {
    expect(
      deriveSyncUiStatus({
        isOnline: true,
        isSyncing: false,
        pendingCount: 0,
        conflictCount: 0,
        failedCount: 0,
      }),
    ).toBe('online');
  });
});

describe('countSyncStatuses', () => {
  it('counts pending, conflict, and failed rows', () => {
    expect(
      countSyncStatuses([
        { syncStatus: 'PENDING' },
        { syncStatus: 'PENDING' },
        { syncStatus: 'CONFLICT', requiresReview: true },
        { syncStatus: 'FAILED' },
        { syncStatus: 'SYNCED' },
        { requiresReview: true },
      ]),
    ).toEqual({ pending: 2, conflict: 2, failed: 1 });
  });
});

describe('sync helpers', () => {
  it('labels each ui status', () => {
    expect(syncUiLabel('conflict')).toBe('Conflict');
    expect(syncUiLabel('offline')).toBe('Offline');
  });

  it('treats only online and synced balances as authoritative', () => {
    expect(balanceIsAuthoritative('online')).toBe(true);
    expect(balanceIsAuthoritative('synced')).toBe(true);
    expect(balanceIsAuthoritative('offline')).toBe(false);
    expect(balanceIsAuthoritative('pending')).toBe(false);
    expect(balanceIsAuthoritative('conflict')).toBe(false);
  });
});
