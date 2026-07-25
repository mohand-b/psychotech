export function formatFrenchDecimal(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
