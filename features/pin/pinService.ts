import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { writeAuditLog } from '@/features/audit/auditService';
import {
  PIN_REVEAL_MINUTES,
  pinRequestCreateSchema,
  pinRequestId,
  pinResolveSchema,
  pinValueSchema,
} from '@/features/pin/pinSchema';
import { getFirestoreDb } from '@/firebase/firestore';
import type { AuditAction } from '@/types/audit';
import type { PinRequest } from '@/types/ledger';

export type PinRequestDoc = PinRequest & { id: string };

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

function pinSecretRef(orgId: string, cardId: string) {
  return doc(dbOrThrow(), 'organizations', orgId, 'cards', cardId, 'secrets', 'pin');
}

function pinRequestRef(orgId: string, cardId: string, requestedBy: string) {
  return doc(dbOrThrow(), 'organizations', orgId, 'pinRequests', pinRequestId(cardId, requestedBy));
}

function revealExpiry() {
  return Timestamp.fromMillis(Date.now() + PIN_REVEAL_MINUTES * 60 * 1000);
}

async function writePinAudit(
  orgId: string,
  actorId: string,
  action: Extract<
    AuditAction,
    'PIN_REQUEST' | 'PIN_APPROVE' | 'PIN_REJECT' | 'PIN_SHARE'
  >,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await writeAuditLog(orgId, {
    actorId,
    action,
    entityType: 'pinRequest',
    entityId,
    metadata,
  });
}

export async function setCardPin(orgId: string, actorId: string, cardId: string, pin: string) {
  const value = pinValueSchema.parse(pin);
  // v1: plaintext in rules-isolated secrets doc; Phase 2 encrypted/KMS reveal.
  await setDoc(pinSecretRef(orgId, cardId), {
    value,
    updatedAt: serverTimestamp(),
  });
  await updateDoc(doc(dbOrThrow(), 'organizations', orgId, 'cards', cardId), {
    hasPin: true,
    updatedAt: serverTimestamp(),
  });
  await writeAuditLog(orgId, {
    actorId,
    action: 'PIN_SET',
    entityType: 'card',
    entityId: cardId,
    metadata: { cardId },
  });
}

export async function getCardPin(orgId: string, cardId: string) {
  const snap = await getDoc(pinSecretRef(orgId, cardId));
  if (!snap.exists()) {
    return null;
  }
  const value = snap.data()?.value;
  return typeof value === 'string' ? value : null;
}

export async function requestCardPin(
  orgId: string,
  requestedBy: string,
  input: { cardId: string },
) {
  const parsed = pinRequestCreateSchema.parse(input);
  const id = pinRequestId(parsed.cardId, requestedBy);
  const ref = pinRequestRef(orgId, parsed.cardId, requestedBy);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data() as PinRequest;
    if (data.status === 'pending') {
      return { id, ...data };
    }
    if (data.status === 'approved' && isRevealActive(data.expiresAt)) {
      return { id, ...data };
    }
  }

  const body: PinRequest = {
    cardId: parsed.cardId,
    requestedBy,
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, body);
  await writePinAudit(orgId, requestedBy, 'PIN_REQUEST', id, {
    cardId: parsed.cardId,
    requestedBy,
  });
  return { id, ...body };
}

function isRevealActive(expiresAt: unknown) {
  if (!expiresAt) {
    return false;
  }
  if (expiresAt instanceof Timestamp) {
    return expiresAt.toMillis() > Date.now();
  }
  if (typeof expiresAt === 'string') {
    return Date.parse(expiresAt) > Date.now();
  }
  if (typeof expiresAt === 'object' && expiresAt !== null && 'seconds' in expiresAt) {
    const seconds = Number((expiresAt as { seconds: number }).seconds);
    return seconds * 1000 > Date.now();
  }
  return false;
}

export async function resolvePinRequest(
  orgId: string,
  requestId: string,
  resolvedBy: string,
  input: { status: 'approved' | 'rejected' },
) {
  const parsed = pinResolveSchema.parse(input);
  const ref = doc(dbOrThrow(), 'organizations', orgId, 'pinRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('PIN request not found');
  }
  const current = snap.data() as PinRequest;
  if (current.status !== 'pending') {
    throw new Error('PIN request already resolved');
  }

  const patch: Record<string, unknown> = {
    status: parsed.status,
    resolvedBy,
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (parsed.status === 'approved') {
    patch.expiresAt = revealExpiry();
  }
  await updateDoc(ref, patch);
  await writePinAudit(
    orgId,
    resolvedBy,
    parsed.status === 'approved' ? 'PIN_APPROVE' : 'PIN_REJECT',
    requestId,
    { cardId: current.cardId, requestedBy: current.requestedBy, status: parsed.status },
  );
}

export async function sharePinAccess(
  orgId: string,
  requestId: string,
  sharedBy: string,
) {
  const ref = doc(dbOrThrow(), 'organizations', orgId, 'pinRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    throw new Error('PIN request not found');
  }
  const current = snap.data() as PinRequest;
  if (current.status !== 'approved' && current.status !== 'pending') {
    throw new Error('Can only share for pending or approved requests');
  }

  const patch: Record<string, unknown> = {
    status: 'approved',
    resolvedBy: sharedBy,
    resolvedAt: serverTimestamp(),
    sharedAt: serverTimestamp(),
    expiresAt: revealExpiry(),
    updatedAt: serverTimestamp(),
  };
  await updateDoc(ref, patch);
  await writePinAudit(orgId, sharedBy, 'PIN_SHARE', requestId, {
    cardId: current.cardId,
    requestedBy: current.requestedBy,
  });
}

export async function listPendingPinRequests(orgId: string) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'pinRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as PinRequest),
  }));
}

export async function listMyPinRequests(orgId: string, requestedBy: string) {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'pinRequests'),
      where('requestedBy', '==', requestedBy),
      orderBy('createdAt', 'desc'),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as PinRequest),
  }));
}

export async function getPinRequestForCard(
  orgId: string,
  cardId: string,
  requestedBy: string,
) {
  const snap = await getDoc(pinRequestRef(orgId, cardId, requestedBy));
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as PinRequest) };
}

export function isPinRevealActive(request: Pick<PinRequest, 'status' | 'expiresAt'>) {
  return request.status === 'approved' && isRevealActive(request.expiresAt);
}
