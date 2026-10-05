import {
  collection,
  doc,
  documentId,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';

import { getFirestoreDb } from '@/firebase/firestore';
import type { FuelCard, FuelCardDoc } from '@/types/card';
import type { OrgMember } from '@/types/org';

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

function cardsCol(orgId: string) {
  return collection(dbOrThrow(), 'organizations', orgId, 'cards');
}

function mapCard(id: string, data: FuelCard): FuelCardDoc {
  return {
    id,
    name: data.name,
    last4: data.last4,
    issuer: data.issuer ?? '',
    status: data.status,
    hasPin: Boolean(data.hasPin),
    serverBalanceSnapshot: data.serverBalanceSnapshot ?? null,
    serverBalanceUpdatedAt: data.serverBalanceUpdatedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export async function createCard(
  orgId: string,
  input: { name: string; last4: string; issuer?: string },
) {
  const name = input.name.trim();
  const last4 = input.last4.replace(/\D/g, '').slice(-4);
  if (!name) {
    throw new Error('Card name is required');
  }
  if (last4.length !== 4) {
    throw new Error('Enter the last 4 digits');
  }

  const ref = doc(cardsCol(orgId));
  const card: FuelCard = {
    name,
    last4,
    issuer: (input.issuer ?? '').trim(),
    status: 'active',
    hasPin: false,
    serverBalanceSnapshot: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, card);
  return mapCard(ref.id, card);
}

export async function updateCard(
  orgId: string,
  cardId: string,
  input: { name?: string; last4?: string; issuer?: string; status?: FuelCard['status'] },
) {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (!name) {
      throw new Error('Card name is required');
    }
    patch.name = name;
  }
  if (input.last4 !== undefined) {
    const last4 = input.last4.replace(/\D/g, '').slice(-4);
    if (last4.length !== 4) {
      throw new Error('Enter the last 4 digits');
    }
    patch.last4 = last4;
  }
  if (input.issuer !== undefined) {
    patch.issuer = input.issuer.trim();
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  await updateDoc(doc(dbOrThrow(), 'organizations', orgId, 'cards', cardId), patch);
}

export async function getCard(orgId: string, cardId: string) {
  const snap = await getDoc(doc(dbOrThrow(), 'organizations', orgId, 'cards', cardId));
  if (!snap.exists()) {
    return null;
  }
  return mapCard(snap.id, snap.data() as FuelCard);
}

export async function listAllCards(orgId: string) {
  const snap = await getDocs(cardsCol(orgId));
  return snap.docs.map((item) => mapCard(item.id, item.data() as FuelCard));
}

async function listCardsByIds(orgId: string, cardIds: string[]) {
  const unique = [...new Set(cardIds.filter(Boolean))];
  if (unique.length === 0) {
    return [];
  }

  const db = dbOrThrow();
  const results: FuelCardDoc[] = [];
  for (let i = 0; i < unique.length; i += 10) {
    const chunk = unique.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, 'organizations', orgId, 'cards'), where(documentId(), 'in', chunk)),
    );
    for (const item of snap.docs) {
      results.push(mapCard(item.id, item.data() as FuelCard));
    }
  }
  return results;
}

export async function listVisibleCards(orgId: string, member: OrgMember) {
  if (member.role === 'owner') {
    return listAllCards(orgId);
  }
  return listCardsByIds(orgId, member.assignedCardIds ?? []);
}

export function isCardActive(card: Pick<FuelCard, 'status'>) {
  return card.status === 'active';
}
