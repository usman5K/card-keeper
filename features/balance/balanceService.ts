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

export async function projectBalancesForCards(
  orgId: string,
  cardIds: string[],
): Promise<Record<string, number>> {
  const ids = [...new Set(cardIds.filter(Boolean))];
  if (ids.length === 0) {
    return {};
  }

  const idSet = new Set(ids);
  const db = dbOrThrow();

  const [rechargeSnap, fuelSnap, adjustmentSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'recharges'),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'transactions'),
        where('type', '==', 'FUEL'),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
    getDocs(
      query(
        collection(db, 'organizations', orgId, 'adjustments'),
        orderBy('occurredAt', 'desc'),
        limit(LEDGER_WINDOW),
      ),
    ),
  ]);

  const eventsByCard = new Map<string, Parameters<typeof projectCardBalance>[0]>();

  for (const id of ids) {
    eventsByCard.set(id, []);
  }

  for (const doc of rechargeSnap.docs) {
    const row = doc.data() as Recharge;
    if (!idSet.has(row.cardId)) {
      continue;
    }
    eventsByCard.get(row.cardId)?.push({
      kind: 'RECHARGE',
      amount: row.amount,
    });
  }

  for (const doc of fuelSnap.docs) {
    const row = doc.data() as FuelTransaction;
    if (!idSet.has(row.cardId)) {
      continue;
    }
    eventsByCard.get(row.cardId)?.push({
      kind: 'FUEL',
      amount: row.amount,
      syncStatus: asSyncStatus(row.syncStatus),
      includeInProjection: true,
    });
  }

  for (const doc of adjustmentSnap.docs) {
    const row = doc.data() as Adjustment;
    if (!idSet.has(row.cardId)) {
      continue;
    }
    eventsByCard.get(row.cardId)?.push({
      kind: 'ADJUSTMENT',
      amount: row.amount,
      adjustmentKind: row.kind,
    });
  }

  const out: Record<string, number> = {};
  for (const id of ids) {
    out[id] = projectCardBalance(eventsByCard.get(id) ?? []).balance;
  }
  return out;
}
