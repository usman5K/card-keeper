const SECRET_KEYS = new Set([
  'pin',
  'pinplainisolated',
  'pinenc',
  'value',
  'password',
  'secret',
  'token',
]);

function isSecretKey(key: string) {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, '');
  return SECRET_KEYS.has(normalized) || normalized.includes('pin');
}

export function redactSecrets<T>(input: T): T {
  if (input == null || typeof input !== 'object') {
    return input;
  }
  if (Array.isArray(input)) {
    return input.map((item) => redactSecrets(item)) as T;
  }
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (isSecretKey(key)) {
      out[key] = '[redacted]';
      continue;
    }
    out[key] = typeof value === 'object' && value != null ? redactSecrets(value) : value;
  }
  return out as T;
}

export function safeLog(message: string, meta?: Record<string, unknown>) {
  if (meta) {
    console.log(message, redactSecrets(meta));
    return;
  }
  console.log(message);
}
