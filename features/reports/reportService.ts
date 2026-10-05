import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore';

import { listVisibleCards } from '@/features/cards/cardService';
import { listActiveMembers } from '@/features/org/orgService';
import { getFirestoreDb } from '@/firebase/firestore';
import type { FuelTransaction, Settlement } from '@/types/ledger';
import type { OrgMember } from '@/types/org';
import { personDisplayName } from '@/utils/peopleDashboard';
import type {
  NameLookup,
  ReportFuelRow,
  ReportSettlementRow,
} from '@/utils/reports';

const REPORT_MAX = 500;

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

function toFuelRow(id: string, data: FuelTransaction): ReportFuelRow {
  return {
    id,
    userId: data.userId,
    cardId: data.cardId,
    amount: data.amount,
    station: data.station ?? '',
    area: data.area ?? '',
    occurredAt: data.occurredAt,
    syncStatus: data.syncStatus,
  };
}

function toSettlementRow(id: string, data: Settlement): ReportSettlementRow {
  return {
    id,
    userId: data.userId,
    amount: data.amount,
    status: data.status,
    occurredAt: data.occurredAt,
  };
}

export async function listFuelForReport(
  orgId: string,
  options: { userId?: string; max?: number } = {},
): Promise<ReportFuelRow[]> {
  const max = options.max ?? REPORT_MAX;
  const base = collection(dbOrThrow(), 'organizations', orgId, 'transactions');
  const fuelQuery = options.userId
    ? query(
        base,
        where('type', '==', 'FUEL'),
        where('userId', '==', options.userId),
        orderBy('occurredAt', 'desc'),
        limit(max),
      )
    : query(
        base,
        where('type', '==', 'FUEL'),
        orderBy('occurredAt', 'desc'),
        limit(max),
      );
  const snap = await getDocs(fuelQuery);
  return snap.docs.map((item) => toFuelRow(item.id, item.data() as FuelTransaction));
}

export async function listSettlementsForReport(
  orgId: string,
  options: { userId?: string; max?: number } = {},
): Promise<ReportSettlementRow[]> {
  const max = options.max ?? REPORT_MAX;
  const base = collection(dbOrThrow(), 'organizations', orgId, 'settlements');
  const settlementQuery = options.userId
    ? query(
        base,
        where('userId', '==', options.userId),
        orderBy('occurredAt', 'desc'),
        limit(max),
      )
    : query(base, orderBy('occurredAt', 'desc'), limit(max));
  const snap = await getDocs(settlementQuery);
  return snap.docs.map((item) => toSettlementRow(item.id, item.data() as Settlement));
}

export async function loadReportLookups(
  orgId: string,
  member: OrgMember & { id?: string },
): Promise<{ personNames: NameLookup; cardNames: NameLookup }> {
  const [people, cards] = await Promise.all([
    listActiveMembers(orgId),
    listVisibleCards(orgId, member),
  ]);
  const personNames: NameLookup = {};
  for (const person of people) {
    personNames[person.id] = personDisplayName(person);
  }
  const cardNames: NameLookup = {};
  for (const card of cards) {
    cardNames[card.id] = `${card.name} ···${card.last4}`;
  }
  return { personNames, cardNames };
}
