export function isIndexBuildingError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? '');
  const code =
    typeof err === 'object' && err && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : '';
  return (
    code === 'failed-precondition' ||
    /requires an index/i.test(message) ||
    /index is currently building/i.test(message) ||
    /failed-precondition/i.test(message)
  );
}

export function friendlyFirestoreMessage(err: unknown, fallback: string): string {
  if (isIndexBuildingError(err)) {
    return 'Balances are still updating. You can keep working; totals may catch up shortly.';
  }
  if (err instanceof Error && err.message.trim()) {
    if (/permission|insufficient/i.test(err.message)) {
      return 'You do not have access to this data.';
    }
    if (/network|offline|unavailable/i.test(err.message)) {
      return 'Network issue. Check connection and try again.';
    }
    if (!/https?:\/\//i.test(err.message) && err.message.length < 180) {
      return err.message;
    }
  }
  return fallback;
}
