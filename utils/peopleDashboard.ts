import { addPkr, assertIntegerPkr } from '@/utils/money';

export type PersonFinance = {
  outstanding: number;
  fuelTotal: number;
  settledTotal: number;
};

export type PersonListInput = {
  id: string;
  displayName: string | null;
  email: string;
  role: 'owner' | 'member';
  assignedCardIds?: string[];
};

export type PersonListItem = {
  id: string;
  displayName: string | null;
  email: string;
  role: 'owner' | 'member';
  assignedCardIds: string[];
  outstanding: number | null;
  fuelTotal: number | null;
  settledTotal: number | null;
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  bank: 'Bank',
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  other: 'Other',
};

export function personDisplayName(person: {
  displayName?: string | null;
  email: string;
}) {
  const name = person.displayName?.trim();
  return name && name.length > 0 ? name : person.email;
}

export function canViewPersonFinance(
  viewer: { role: 'owner' | 'member'; uid: string },
  personId: string,
) {
  return viewer.role === 'owner' || viewer.uid === personId;
}

export function canOpenPersonDetail(
  viewer: { role: 'owner' | 'member'; uid: string },
  personId: string,
) {
  return canViewPersonFinance(viewer, personId);
}

export function buildPersonListItems(
  people: PersonListInput[],
  financeByUserId: Record<string, PersonFinance>,
  viewer: { role: 'owner' | 'member'; uid: string },
): PersonListItem[] {
  return people.map((person) => {
    const show = canViewPersonFinance(viewer, person.id);
    const row = financeByUserId[person.id];
    return {
      id: person.id,
      displayName: person.displayName,
      email: person.email,
      role: person.role,
      assignedCardIds: person.assignedCardIds ?? [],
      outstanding: show && row ? assertIntegerPkr(row.outstanding, 'outstanding') : null,
      fuelTotal: show && row ? assertIntegerPkr(row.fuelTotal, 'fuel') : null,
      settledTotal: show && row ? assertIntegerPkr(row.settledTotal, 'settled') : null,
    };
  });
}

export function sortPeopleByOutstanding(items: PersonListItem[]): PersonListItem[] {
  return [...items].sort((a, b) => {
    if (a.outstanding != null && b.outstanding != null && a.outstanding !== b.outstanding) {
      return b.outstanding - a.outstanding;
    }
    if (a.outstanding != null && b.outstanding == null) {
      return -1;
    }
    if (a.outstanding == null && b.outstanding != null) {
      return 1;
    }
    return personDisplayName(a).localeCompare(personDisplayName(b));
  });
}

export function sumRecoverableOutstanding(rows: { outstanding: number }[]): number {
  return rows.reduce(
    (total, row) => addPkr(total, assertIntegerPkr(row.outstanding, 'outstanding')),
    0,
  );
}

export function assignedCardCountLabel(count: number) {
  return count === 1 ? '1 card assigned' : `${count} cards assigned`;
}

export function settlementMethodLabel(method: string) {
  return METHOD_LABELS[method] ?? method;
}

export function settlementStatusLabel(status: string) {
  if (status === 'confirmed') {
    return 'Confirmed';
  }
  if (status === 'pending') {
    return 'Pending';
  }
  return status;
}

export function inviteEmailLooksValid(email: string) {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf('@');
  if (at <= 0 || at === trimmed.length - 1) {
    return false;
  }
  return trimmed.includes('.', at);
}
