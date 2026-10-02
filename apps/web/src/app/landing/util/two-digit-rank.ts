const RANK_DIGITS = 2;

export function twoDigitRank(position: number): string {
  return String(position).padStart(RANK_DIGITS, '0');
}
