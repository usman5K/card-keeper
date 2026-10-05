export type CardStatus = 'active' | 'inactive';

export type FuelCard = {
  name: string;
  last4: string;
  issuer: string;
  status: CardStatus;
  // PIN value lives under cards/{id}/secrets/pin (rules-isolated). hasPin is safe metadata.
  hasPin?: boolean;
  serverBalanceSnapshot: number | null;
  serverBalanceUpdatedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FuelCardDoc = FuelCard & { id: string };
