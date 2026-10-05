import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import { writeAuditLog } from '@/features/audit/auditService';
import { rechargeInputSchema, type RechargeInput } from '@/features/recharges/rechargeSchema';
import { getFirestoreDb } from '@/firebase/firestore';
import type { Recharge } from '@/types/ledger';
import { toMonthKey } from '@/utils/dates';

export type RechargeDoc = Recharge & { id: string };

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function createRecharge(
  orgId: string,
  createdBy: string,
  input: RechargeInput,
  occurredAt: Date = new Date(),
) {
  const parsed = rechargeInputSchema.parse(input);
  const refill: Record<string, unknown> = {
    cardId: parsed.cardId,
    amount: parsed.amount,
    month: parsed.month ?? toMonthKey(occurredAt),
    createdBy,
    occurredAt: occurredAt.toISOString(),
    createdAt: serverTimestamp(),
  };
  const source = parsed.source?.trim();
  const notes = parsed.notes?.trim();
  if (source) {
    refill.source = source;
  }
  if (notes) {
    refill.notes = notes;
  }

  const ref = await addDoc(collection(dbOrThrow(), 'organizations', orgId, 'recharges'), refill);
  await writeAuditLog(orgId, {
    actorId: createdBy,
    action: 'RECHARGE_CREATE',
    entityType: 'recharge',
    entityId: ref.id,
    metadata: { cardId: parsed.cardId, amount: parsed.amount },
  });
  return { id: ref.id, ...(refill as Recharge) };
}

export async function listRechargesForCard(orgId: string, cardId: string, limit = 20) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'recharges'),
      where('cardId', '==', cardId),
      orderBy('occurredAt', 'desc'),
    ),
  );

  return snap.docs.slice(0, limit).map((item) => ({
    id: item.id,
    ...(item.data() as Recharge),
  }));
}
