import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { writeAuditLog } from '@/features/audit/auditService';
import { fuelInputSchema, type FuelInput } from '@/features/fuel/fuelSchema';
import { getFirestoreDb } from '@/firebase/firestore';
import type { FuelTransaction } from '@/types/ledger';
import { getDeviceId } from '@/utils/deviceId';
import { subtractPkr } from '@/utils/money';

export type FuelTransactionDoc = FuelTransaction & { id: string };

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function createFuelTransaction(
  orgId: string,
  createdBy: string,
  input: FuelInput,
  clientBalanceBefore: number | null,
) {
  const parsed = fuelInputSchema.parse(input);
  const deviceId = await getDeviceId();
  const occurredAt = parsed.occurredAt ?? new Date().toISOString();
  const before = clientBalanceBefore;
  const after =
    before === null ? null : subtractPkr(before, parsed.amount);

  const tx: Record<string, unknown> = {
    type: 'FUEL',
    cardId: parsed.cardId,
    userId: parsed.userId,
    createdBy,
    amount: parsed.amount,
    station: parsed.station.trim(),
    area: parsed.area.trim(),
    occurredAt,
    createdAt: serverTimestamp(),
    deviceId,
    clientBalanceBefore: before,
    clientBalanceAfter: after,
    serverBalanceBefore: null,
    serverBalanceAfter: null,
    syncStatus: 'PENDING',
    requiresReview: false,
  };
  const city = parsed.city?.trim();
  const notes = parsed.notes?.trim();
  if (city) {
    tx.city = city;
  }
  if (notes) {
    tx.notes = notes;
  }

  const ref = await addDoc(collection(dbOrThrow(), 'organizations', orgId, 'transactions'), tx);
  await writeAuditLog(orgId, {
    actorId: createdBy,
    action: 'FUEL_CREATE',
    entityType: 'fuel',
    entityId: ref.id,
    metadata: {
      cardId: parsed.cardId,
      userId: parsed.userId,
      amount: parsed.amount,
      station: parsed.station.trim(),
    },
  });
  return { id: ref.id, ...(tx as FuelTransaction) };
}

export async function listRecentFuelTransactions(
  orgId: string,
  options: { userId?: string; max?: number } = {},
) {
  const max = options.max ?? 20;
  const base = collection(dbOrThrow(), 'organizations', orgId, 'transactions');
  const fuelQuery = options.userId
    ? query(
        base,
        where('type', '==', 'FUEL'),
        where('userId', '==', options.userId),
        orderBy('occurredAt', 'desc'),
        limit(max),
      )
    : query(base, where('type', '==', 'FUEL'), orderBy('occurredAt', 'desc'), limit(max));

  const snap = await getDocs(fuelQuery);
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as FuelTransaction),
  }));
}
