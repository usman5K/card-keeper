export type Pkr = number;

export function assertIntegerPkr(amount: number, label = 'amount'): Pkr {
  if (!Number.isInteger(amount)) {
    throw new Error(`${label} must be a whole PKR amount`);
  }
  return amount;
}

export function addPkr(a: number, b: number): Pkr {
  return assertIntegerPkr(a, 'left') + assertIntegerPkr(b, 'right');
}

export function subtractPkr(a: number, b: number): Pkr {
  return assertIntegerPkr(a, 'left') - assertIntegerPkr(b, 'right');
}

export function sumPkr(amounts: number[]): Pkr {
  let total = 0;
  for (const amount of amounts) {
    total = addPkr(total, amount);
  }
  return total;
}

export function parsePkrInput(raw: string): Pkr {
  const trimmed = raw.trim().replace(/,/g, '');
  if (!/^-?\d+$/.test(trimmed)) {
    throw new Error('Enter a whole rupee amount');
  }
  return assertIntegerPkr(Number(trimmed));
}

export function formatPkr(amount: number, options?: { withSymbol?: boolean }): string {
  const value = assertIntegerPkr(amount);
  const formatted = new Intl.NumberFormat('en-PK', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(value);
  if (options?.withSymbol === false) {
    return formatted;
  }
  return `Rs ${formatted}`;
}
