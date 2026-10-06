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
import {
  adjustmentInputSchema,
  type AdjustmentInput,
} from '@/features/adjustments/adjustmentSchema';
import { getFirestoreDb } from '@/firebase/firestore';
import type { Adjustment } from '@/types/ledger';

export type AdjustmentDoc = Adjustment & { id: string };

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function createAdjustment(
  orgId: string,
  createdBy: string,
  input: AdjustmentInput,
) {
  const parsed = adjustmentInputSchema.parse(input);
  const occurredAt = parsed.occurredAt ?? new Date().toISOString();

  const row: Record<string, unknown> = {
    cardId: parsed.cardId,
    amount: parsed.amount,
    reason: parsed.reason.trim(),
    kind: parsed.kind,
    createdBy,
    occurredAt,
    createdAt: serverTimestamp(),
  };
  if (parsed.linkedTxId) {
    row.linkedTxId = parsed.linkedTxId;
  }

  const ref = await addDoc(
    collection(dbOrThrow(), 'organizations', orgId, 'adjustments'),
    row,
  );
  await writeAuditLog(orgId, {
    actorId: createdBy,
    action: 'ADJUSTMENT_CREATE',
    entityType: 'adjustment',
    entityId: ref.id,
    metadata: {
      cardId: parsed.cardId,
      amount: parsed.amount,
      kind: parsed.kind,
      ...(parsed.linkedTxId ? { linkedTxId: parsed.linkedTxId } : {}),
    },
  });
  return { id: ref.id, ...(row as Adjustment) };
}

export async function createOpeningBalance(
  orgId: string,
  createdBy: string,
  cardId: string,
  amount: number,
) {
  return createAdjustment(orgId, createdBy, {
    cardId,
    amount,
    kind: 'OPENING',
    reason: 'Opening balance',
  });
}

export async function reverseFuelTransaction(
  orgId: string,
  createdBy: string,
  fuel: { id: string; cardId: string; amount: number },
  reason?: string,
) {
  const existing = await findAdjustmentForLinkedTx(orgId, fuel.id);
  if (existing) {
    throw new Error('This fuel entry was already reversed');
  }
  return createAdjustment(orgId, createdBy, {
    cardId: fuel.cardId,
    amount: fuel.amount,
    kind: 'REVERSAL',
    reason: reason?.trim() || `Reverse fuel ${fuel.id}`,
    linkedTxId: fuel.id,
  });
}

export async function reverseRecharge(
  orgId: string,
  createdBy: string,
  recharge: { id: string; cardId: string; amount: number },
  reason?: string,
) {
  const existing = await findAdjustmentForLinkedTx(orgId, recharge.id);
  if (existing) {
    throw new Error('This recharge was already reversed');
  }
  return createAdjustment(orgId, createdBy, {
    cardId: recharge.cardId,
    amount: -recharge.amount,
    kind: 'REVERSAL',
    reason: reason?.trim() || `Reverse recharge ${recharge.id}`,
    linkedTxId: recharge.id,
  });
}

export async function findAdjustmentForLinkedTx(orgId: string, linkedTxId: string) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'adjustments'),
      where('linkedTxId', '==', linkedTxId),
      limit(1),
    ),
  );
  const first = snap.docs[0];
  if (!first) {
    return null;
  }
  return { id: first.id, ...(first.data() as Adjustment) };
}

export async function listAdjustmentsForCard(orgId: string, cardId: string, max = 40) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'adjustments'),
      where('cardId', '==', cardId),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Adjustment),
  }));
}

export async function listCardsWithOpening(
  orgId: string,
  cardIds: string[],
): Promise<Set<string>> {
  const ids = new Set<string>();
  await Promise.all(
    cardIds.map(async (cardId) => {
      const rows = await listAdjustmentsForCard(orgId, cardId, 40);
      if (rows.some((row) => row.kind === 'OPENING')) {
        ids.add(cardId);
      }
    }),
  );
  return ids;
}

export async function listReversalLinkedIds(orgId: string, max = 200) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'adjustments'),
      where('kind', '==', 'REVERSAL'),
      limit(max),
    ),
  );
  const ids = new Set<string>();
  for (const item of snap.docs) {
    const linked = item.data().linkedTxId;
    if (typeof linked === 'string' && linked) {
      ids.add(linked);
    }
  }
  return ids;
}
