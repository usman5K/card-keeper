import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  where,
} from 'firebase/firestore';

import { writeAuditLog } from '@/features/audit/auditService';
import {
  confirmSettlementSchema,
  settlementInputSchema,
  type ConfirmSettlementInput,
  type SettlementInput,
} from '@/features/settlements/settlementSchema';
import { getFirestoreDb } from '@/firebase/firestore';
import type { Settlement, SettlementStatus } from '@/types/ledger';
import { projectOutstanding } from '@/utils/balance';
import { getDeviceId } from '@/utils/deviceId';
import { sumPkr } from '@/utils/money';

export type SettlementDoc = Settlement & { id: string };

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function createSettlement(
  orgId: string,
  createdBy: string,
  input: SettlementInput,
  options: { role: 'owner' | 'member' },
) {
  const parsed = settlementInputSchema.parse(input);
  if (options.role === 'member' && parsed.userId !== createdBy) {
    throw new Error('Members can only record settlements for themselves');
  }

  const deviceId = await getDeviceId();
  const occurredAt = parsed.occurredAt ?? new Date().toISOString();
  const status: SettlementStatus = options.role === 'owner' ? 'confirmed' : 'pending';

  const settlement: Record<string, unknown> = {
    userId: parsed.userId,
    amount: parsed.amount,
    method: parsed.method,
    status,
    createdBy,
    occurredAt,
    createdAt: serverTimestamp(),
    deviceId,
  };
  if (status === 'confirmed') {
    settlement.confirmedBy = createdBy;
  }
  const notes = parsed.notes?.trim();
  if (notes) {
    settlement.notes = notes;
  }

  const ref = await addDoc(
    collection(dbOrThrow(), 'organizations', orgId, 'settlements'),
    settlement,
  );
  await writeAuditLog(orgId, {
    actorId: createdBy,
    action: 'SETTLEMENT_CREATE',
    entityType: 'settlement',
    entityId: ref.id,
    metadata: {
      userId: parsed.userId,
      amount: parsed.amount,
      method: parsed.method,
      status,
    },
  });
  return { id: ref.id, ...(settlement as Settlement) };
}

export async function confirmSettlement(
  orgId: string,
  settlementId: string,
  confirmedBy: string,
  input: ConfirmSettlementInput = {},
) {
  const parsed = confirmSettlementSchema.parse(input);
  const ref = doc(dbOrThrow(), 'organizations', orgId, 'settlements', settlementId);
  const patch: Record<string, unknown> = {
    status: 'confirmed',
    confirmedBy,
  };
  if (parsed.amount !== undefined) {
    patch.amount = parsed.amount;
  }
  if (parsed.method !== undefined) {
    patch.method = parsed.method;
  }
  await updateDoc(ref, patch);
  await writeAuditLog(orgId, {
    actorId: confirmedBy,
    action: 'SETTLEMENT_CONFIRM',
    entityType: 'settlement',
    entityId: settlementId,
    metadata: {
      ...(parsed.amount !== undefined ? { amount: parsed.amount } : {}),
      ...(parsed.method !== undefined ? { method: parsed.method } : {}),
    },
  });
}

export async function listSettlementsForUser(orgId: string, userId: string, max = 50) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'settlements'),
      where('userId', '==', userId),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Settlement),
  }));
}

export async function listPendingSettlements(orgId: string, max = 50) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'settlements'),
      where('status', '==', 'pending'),
      orderBy('occurredAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as Settlement),
  }));
}

export async function listFuelAmountsForUser(orgId: string, userId: string) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'transactions'),
      where('type', '==', 'FUEL'),
      where('userId', '==', userId),
    ),
  );
  return snap.docs
    .map((item) => Number(item.data().amount))
    .filter((amount) => Number.isInteger(amount) && amount > 0);
}

export async function getPersonOutstanding(orgId: string, userId: string) {
  const [fuelAmounts, settlements] = await Promise.all([
    listFuelAmountsForUser(orgId, userId),
    listSettlementsForUser(orgId, userId, 200),
  ]);
  const confirmed = settlements
    .filter((item) => item.status === 'confirmed')
    .map((item) => item.amount);
  return {
    outstanding: projectOutstanding(fuelAmounts, confirmed),
    fuelTotal: sumPkr(fuelAmounts),
    settledTotal: sumPkr(confirmed),
    settlements,
  };
}
