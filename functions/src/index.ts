import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { onDocumentCreated } from 'firebase-functions/firestore';

import {
  reconcileCardBalance,
  type ReconcileCreditInput,
  type ReconcileFuelInput,
} from './reconcile';

initializeApp();
const db = getFirestore();

async function loadCardLedger(orgId: string, cardId: string) {
  const [rechargesSnap, adjustmentsSnap, fuelsSnap] = await Promise.all([
    db.collection('organizations').doc(orgId).collection('recharges').where('cardId', '==', cardId).get(),
    db.collection('organizations').doc(orgId).collection('adjustments').where('cardId', '==', cardId).get(),
    db
      .collection('organizations')
      .doc(orgId)
      .collection('transactions')
      .where('cardId', '==', cardId)
      .get(),
  ]);

  const credits: ReconcileCreditInput[] = [];
  for (const doc of rechargesSnap.docs) {
    const data = doc.data();
    credits.push({ id: doc.id, amount: Number(data.amount) || 0, kind: 'RECHARGE' });
  }
  for (const doc of adjustmentsSnap.docs) {
    const data = doc.data();
    const kind = data.kind === 'OPENING' ? 'OPENING' : 'ADJUSTMENT';
    credits.push({ id: doc.id, amount: Number(data.amount) || 0, kind });
  }

  const fuels: ReconcileFuelInput[] = fuelsSnap.docs
    .filter((doc) => doc.data().type === 'FUEL')
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        amount: Number(data.amount) || 0,
        occurredAt: String(data.occurredAt ?? ''),
        createdAt:
          typeof data.createdAt?.toDate === 'function'
            ? data.createdAt.toDate().toISOString()
            : String(data.createdAt ?? ''),
        syncStatus: data.syncStatus,
      };
    });

  return { credits, fuels };
}

export async function reconcileOrgCard(orgId: string, cardId: string) {
  const { credits, fuels } = await loadCardLedger(orgId, cardId);
  const result = reconcileCardBalance(credits, fuels);
  const batch = db.batch();

  for (const fuel of result.fuels) {
    const ref = db.collection('organizations').doc(orgId).collection('transactions').doc(fuel.id);
    batch.update(ref, {
      syncStatus: fuel.syncStatus,
      requiresReview: fuel.requiresReview,
      serverBalanceBefore: fuel.serverBalanceBefore,
      serverBalanceAfter: fuel.serverBalanceAfter,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  const cardRef = db.collection('organizations').doc(orgId).collection('cards').doc(cardId);
  batch.update(cardRef, {
    serverBalanceSnapshot: result.serverBalanceSnapshot,
    serverBalanceUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  await batch.commit();
  return result;
}

export const onFuelTransactionCreated = onDocumentCreated(
  'organizations/{orgId}/transactions/{txId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const data = snap.data();
    if (data.type !== 'FUEL' || !data.cardId) {
      return;
    }
    const orgId = event.params.orgId;
    const cardId = String(data.cardId);
    try {
      await reconcileOrgCard(orgId, cardId);
    } catch (err) {
      logger.error('fuel reconcile failed', { orgId, cardId, err });
      throw err;
    }
  },
);

export const onRechargeCreated = onDocumentCreated(
  'organizations/{orgId}/recharges/{rechargeId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const data = snap.data();
    if (!data.cardId) {
      return;
    }
    const orgId = event.params.orgId;
    const cardId = String(data.cardId);
    try {
      await reconcileOrgCard(orgId, cardId);
    } catch (err) {
      logger.error('recharge reconcile failed', { orgId, cardId, err });
      throw err;
    }
  },
);

export const onAdjustmentCreated = onDocumentCreated(
  'organizations/{orgId}/adjustments/{adjustmentId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      return;
    }
    const data = snap.data();
    if (!data.cardId) {
      return;
    }
    const orgId = event.params.orgId;
    const cardId = String(data.cardId);
    try {
      await reconcileOrgCard(orgId, cardId);
    } catch (err) {
      logger.error('adjustment reconcile failed', { orgId, cardId, err });
      throw err;
    }
  },
);
