export type SyncUiStatus =
  | 'online'
  | 'offline'
  | 'syncing'
  | 'synced'
  | 'pending'
  | 'conflict'
  | 'failed';

export type SyncStatusInput = {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  conflictCount: number;
  failedCount: number;
  recentlySynced?: boolean;
};

export type SyncCounts = {
  pending: number;
  conflict: number;
  failed: number;
};

export function deriveSyncUiStatus(input: SyncStatusInput): SyncUiStatus {
  if (!input.isOnline) {
    return 'offline';
  }
  if (input.failedCount > 0) {
    return 'failed';
  }
  if (input.conflictCount > 0) {
    return 'conflict';
  }
  if (input.isSyncing) {
    return 'syncing';
  }
  if (input.pendingCount > 0) {
    return 'pending';
  }
  if (input.recentlySynced) {
    return 'synced';
  }
  return 'online';
}

export function syncUiLabel(status: SyncUiStatus): string {
  switch (status) {
    case 'online':
      return 'Online';
    case 'offline':
      return 'Offline';
    case 'syncing':
      return 'Syncing';
    case 'synced':
      return 'Synced';
    case 'pending':
      return 'Pending';
    case 'conflict':
      return 'Conflict';
    case 'failed':
      return 'Failed';
  }
}

export function countSyncStatuses(
  items: Array<{ syncStatus?: string; requiresReview?: boolean }>,
): SyncCounts {
  let pending = 0;
  let conflict = 0;
  let failed = 0;

  for (const item of items) {
    if (item.syncStatus === 'PENDING') {
      pending += 1;
    } else if (item.syncStatus === 'FAILED') {
      failed += 1;
    } else if (item.syncStatus === 'CONFLICT' || item.requiresReview) {
      conflict += 1;
    }
  }

  return { pending, conflict, failed };
}

export function balanceIsAuthoritative(status: SyncUiStatus): boolean {
  return status === 'online' || status === 'synced';
}
