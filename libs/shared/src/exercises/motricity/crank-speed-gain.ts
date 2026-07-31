export const CRANK_SPEED_GAIN_MIN = 1;

export const CRANK_SPEED_GAIN_MAX = 1.3;

export const CRANK_SPEED_GAIN_SMOOTHING = 0.18;

export function crankSpeedGainTarget(normalizedSpeed: number): number {
  const engagement = Math.min(1, Math.max(0, Math.abs(normalizedSpeed)));
  const eased = engagement * engagement * (3 - 2 * engagement);
  return (
    CRANK_SPEED_GAIN_MIN + (CRANK_SPEED_GAIN_MAX - CRANK_SPEED_GAIN_MIN) * eased
  );
}

export function smoothCrankSpeedGain(
  previousGain: number,
  normalizedSpeed: number,
): number {
  const target = crankSpeedGainTarget(normalizedSpeed);
  return previousGain + (target - previousGain) * CRANK_SPEED_GAIN_SMOOTHING;
}
