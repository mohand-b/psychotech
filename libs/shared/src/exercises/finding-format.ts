export function formatFindingSeconds(ms: number): string {
  const decimals = ms < 995 ? 2 : ms < 9950 ? 1 : 0;
  const factor = 10 ** decimals;
  const seconds = Math.round((ms * factor) / 1000) / factor;
  return `${seconds.toFixed(decimals).replace('.', ',')} s`;
}
