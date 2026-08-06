export function formatEuroAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
