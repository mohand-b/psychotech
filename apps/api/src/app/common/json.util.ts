export function isJsonRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readJsonNumber(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key];
  return typeof value === 'number' ? value : null;
}
