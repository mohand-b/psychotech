import { formatFrenchDecimal } from '../util/format-number';

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatSecondsTenths(milliseconds: number): string {
  return `${formatFrenchDecimal(milliseconds / 1000)} s`;
}
