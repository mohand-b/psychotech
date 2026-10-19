import { roundToTenth } from '@psychotech/shared';

export function formatFrenchNumber(value: number): string {
  return value.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

export function formatFrenchNumberWithPrecisionOf(
  value: number,
  reference: number,
): string {
  const fractionDigits = Number.isInteger(roundToTenth(reference)) ? 0 : 1;
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatFrenchDecimal(value: number): string {
  return value.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
