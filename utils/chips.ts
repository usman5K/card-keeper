export function recentChips(values: string[], max = 4) {
  const seen = new Set<string>();
  const chips: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) {
      continue;
    }
    seen.add(trimmed.toLowerCase());
    chips.push(trimmed);
    if (chips.length >= max) {
      break;
    }
  }
  return chips;
}
