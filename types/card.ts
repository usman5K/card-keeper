export type CardStatus = 'active' | 'inactive';

export type FuelCard = {
  name: string;
  last4: string;
  issuer: string;
  status: CardStatus;
  serverBalanceSnapshot: number | null;
  serverBalanceUpdatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FuelCardDoc = FuelCard & { id: string };
