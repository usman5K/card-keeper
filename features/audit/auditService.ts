import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

import { sanitizeAuditMetadata } from '@/features/audit/auditMeta';
import { getFirestoreDb } from '@/firebase/firestore';
import type { AuditLog, AuditLogDoc } from '@/types/audit';
import type { AuditAction, AuditEntityType } from '@/types/audit';
import { safeLog } from '@/utils/safeLog';

export type WriteAuditInput = {
  actorId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  metadata?: Record<string, unknown>;
};

export { auditActionLabel, sanitizeAuditMetadata } from '@/features/audit/auditMeta';

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function writeAuditLog(orgId: string, input: WriteAuditInput) {
  const metadata = sanitizeAuditMetadata(input.metadata ?? {});
  const body: AuditLog = {
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata,
    createdAt: serverTimestamp(),
  };
  const ref = doc(collection(dbOrThrow(), 'organizations', orgId, 'auditLogs'));
  await setDoc(ref, body);
  safeLog('audit', {
    orgId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorId: input.actorId,
    metadata,
  });
  return { id: ref.id, ...body };
}

export async function listAuditLogs(orgId: string, max = 80): Promise<AuditLogDoc[]> {
  const snap = await getDocs(
    query(
      collection(dbOrThrow(), 'organizations', orgId, 'auditLogs'),
      orderBy('createdAt', 'desc'),
      limit(max),
    ),
  );
  return snap.docs.map((item) => ({
    id: item.id,
    ...(item.data() as AuditLog),
  }));
}
