import NetInfo from '@react-native-community/netinfo';
import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { useOrg } from '@/features/org/OrgProvider';
import { getFirestoreDb } from '@/firebase/firestore';
import type { FuelTransaction } from '@/types/ledger';
import {
  balanceIsAuthoritative,
  countSyncStatuses,
  deriveSyncUiStatus,
  type SyncCounts,
  type SyncUiStatus,
} from '@/utils/syncStatus';

type SyncContextValue = {
  status: SyncUiStatus;
  isOnline: boolean;
  isSyncing: boolean;
  counts: SyncCounts;
  balanceTrusted: boolean;
  refresh: () => void;
};

const SyncContext = createContext<SyncContextValue | null>(null);

const EMPTY_COUNTS: SyncCounts = { pending: 0, conflict: 0, failed: 0 };

export function SyncProvider({ children }: PropsWithChildren) {
  const { orgId } = useOrg();
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [counts, setCounts] = useState<SyncCounts>(EMPTY_COUNTS);
  const [recentlySynced, setRecentlySynced] = useState(false);
  const [tick, setTick] = useState(0);
  const wasSyncing = useRef(false);
  const syncedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const connected = state.isConnected !== false;
      const reachable = state.isInternetReachable !== false;
      setIsOnline(connected && reachable);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!orgId) {
      const timer = setTimeout(() => {
        setCounts(EMPTY_COUNTS);
        setIsSyncing(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const db = getFirestoreDb();
    if (!db) {
      return;
    }

    const fuelQuery = query(
      collection(db, 'organizations', orgId, 'transactions'),
      where('type', '==', 'FUEL'),
      orderBy('occurredAt', 'desc'),
      limit(100),
    );

    const unsubscribe = onSnapshot(
      fuelQuery,
      { includeMetadataChanges: true },
      (snap) => {
        const rows = snap.docs.map((item) => item.data() as FuelTransaction);
        setCounts(countSyncStatuses(rows));
        const pendingWrites = snap.metadata.hasPendingWrites;
        setIsSyncing(pendingWrites);

        if (wasSyncing.current && !pendingWrites) {
          setRecentlySynced(true);
          if (syncedTimer.current) {
            clearTimeout(syncedTimer.current);
          }
          syncedTimer.current = setTimeout(() => {
            setRecentlySynced(false);
          }, 2500);
        }
        wasSyncing.current = pendingWrites;
      },
      () => {
        setCounts(EMPTY_COUNTS);
        setIsSyncing(false);
      },
    );

    return () => {
      unsubscribe();
      if (syncedTimer.current) {
        clearTimeout(syncedTimer.current);
      }
    };
  }, [orgId, tick]);

  const refresh = useCallback(() => {
    setTick((value) => value + 1);
  }, []);

  const status = useMemo(
    () =>
      deriveSyncUiStatus({
        isOnline,
        isSyncing,
        pendingCount: counts.pending,
        conflictCount: counts.conflict,
        failedCount: counts.failed,
        recentlySynced,
      }),
    [isOnline, isSyncing, counts, recentlySynced],
  );

  const value = useMemo<SyncContextValue>(
    () => ({
      status,
      isOnline,
      isSyncing,
      counts,
      balanceTrusted: balanceIsAuthoritative(status),
      refresh,
    }),
    [status, isOnline, isSyncing, counts, refresh],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const value = useContext(SyncContext);
  if (!value) {
    throw new Error('useSync must be used inside SyncProvider');
  }
  return value;
}
