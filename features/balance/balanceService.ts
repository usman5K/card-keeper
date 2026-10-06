import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { getFirestoreDb } from '@/firebase/firestore';
import type { Adjustment, FuelTransaction, Recharge, SyncStatus } from '@/types/ledger';
import { projectCardBalance } from '@/utils/balance';

const LEDGER_WINDOW = 500;

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

function asSyncStatus(value: unknown): SyncStatus {
  if (
    value === 'PENDING' ||
    value === 'SYNCED' ||
    value === 'FAILED' ||
    value === 'CONFLICT'
  ) {
    return value;
  }
  return 'SYNCED';
}

async function ledgerEventsForCard(orgId: string, cardId: string) {
  const db = dbOrThrow();
  const [rechargeSnap, fuelSnap, adjustmentSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'recharges'),
        where('cardId', '==', cardId),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'transactions'),
        where('type', '==', 'FUEL'),
        where('cardId', '==', cardId),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'adjustments'),
        where('cardId', '==', cardId),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
  ]);

  const events: Parameters<typeof projectCardBalance>[0] = [];

  for (const doc of rechargeSnap.docs) {
    const row = doc.data() as Recharge;
    events.push({
      kind: 'RECHARGE',
      amount: row.amount,
    });
  }

  for (const doc of fuelSnap.docs) {
    const row = doc.data() as FuelTransaction;
    events.push({
      kind: 'FUEL',
      amount: row.amount,
      syncStatus: asSyncStatus(row.syncStatus),
      includeInProjection: true,
    });
  }

  for (const doc of adjustmentSnap.docs) {
    const row = doc.data() as Adjustment;
    events.push({
      kind: 'ADJUSTMENT',
      amount: row.amount,
      adjustmentKind: row.kind,
    });
  }

  return events;
}

export async function projectBalancesForCards(
  orgId: string,
  cardIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(cardIds.filter(Boolean))];
  if (ids.length === 0) {
    return {};
  }

  // Per-card queries so member rules (assigned cards only) can authorize the lists.
  // One card failing (index/permission) must not wipe the whole Home/Cards load.
  const rows = await Promise.all(
    ids.map(async (cardId) => {
      try {
        const events = await ledgerEventsForCard(orgId, cardId);
        return [cardId, projectCardBalance(events).balance] as const;
      } catch {
        return [cardId, null] as const;
      }
    }),
  );

  const out: Record<string, number> = {};
  for (const [cardId, balance] of rows) {
    if (balance != null) {
      out[cardId] = balance;
    }
  }
  return out;
}
