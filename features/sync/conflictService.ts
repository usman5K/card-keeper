import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

import {
  createAdjustment,
  reverseFuelTransaction,
} from '@/features/adjustments/adjustmentService';
import { getFirestoreDb } from '@/firebase/firestore';
import type { FuelTransaction } from '@/types/ledger';

export type ConflictFuelDoc = FuelTransaction & { id: string };

export type ConflictReviewAction = 'acknowledge' | 'reverse' | 'adjust';

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function listConflictFuelTransactions(orgId: string, max = 50) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'transactions'),
      where('type', '==', 'FUEL'),
      where('requiresReview', '==', true),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as FuelTransaction),
  }));
}

export async function acknowledgeConflict(
  orgId: string,
  reviewedBy: string,
  fuelId: string,
  action: ConflictReviewAction = 'acknowledge',
) {
  await updateDoc(doc(dbOrThrow(), 'organizations', orgId, 'transactions', fuelId), {
    requiresReview: false,
    reviewedBy,
    reviewedAt: serverTimestamp(),
    reviewAction: action,
  });
}

export async function resolveConflictWithReverse(
  orgId: string,
  reviewedBy: string,
  fuel: { id: string; cardId: string; amount: number },
  reason?: string,
) {
  await reverseFuelTransaction(orgId, reviewedBy, fuel, reason);
  await acknowledgeConflict(orgId, reviewedBy, fuel.id, 'reverse');
}

export async function resolveConflictWithAdjust(
  orgId: string,
  reviewedBy: string,
  fuel: { id: string; cardId: string },
  amount: number,
  reason: string,
) {
  await createAdjustment(orgId, reviewedBy, {
    cardId: fuel.cardId,
    amount,
    kind: 'CORRECTION',
    reason,
    linkedTxId: fuel.id,
  });
  await acknowledgeConflict(orgId, reviewedBy, fuel.id, 'adjust');
}
