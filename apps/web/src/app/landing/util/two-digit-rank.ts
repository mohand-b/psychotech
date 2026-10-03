const RANK_DIGITS = 2;

export function formatTwoDigitRank(position: number): string {
  return String(position).padStart(RANK_DIGITS, '0');
}
