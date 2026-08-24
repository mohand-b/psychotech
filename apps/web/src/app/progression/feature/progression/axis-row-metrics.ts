import { AxisSparklinePointDto, roundToTenth } from '@psychotech/shared';

export type AxisTrendDirection = 'up' | 'flat' | 'down';

export const AXIS_HISTORY_WINDOW_DAYS = 30;
export const AXIS_TREND_WINDOW = 3;
export const AXIS_TREND_MIN_SESSIONS = 4;
export const AXIS_TREND_SIGNIFICANT_GAP = 3;
export const SPARKLINE_SCALE_MAX = 100;

const MS_PER_DAY = 86_400_000;

export interface SparklineGeometry {
  width: number;
  top: number;
  bottom: number;
}

export function axisScoresWithinWindow(
  sparkline: readonly AxisSparklinePointDto[],
  now: Date,
  windowDays = AXIS_HISTORY_WINDOW_DAYS,
): number[] {
  const oldestKept = now.getTime() - windowDays * MS_PER_DAY;
  return sparkline
    .filter((point) => Date.parse(point.date) >= oldestKept)
    .map((point) => point.score);
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

// Deux moyennes glissantes plutôt qu'un écart entre deux sessions isolées :
// une contre-performance ponctuelle ne doit pas retourner la tendance.
export function axisTrend(
  scores: readonly number[],
): AxisTrendDirection | null {
  if (scores.length < AXIS_TREND_MIN_SESSIONS) {
    return null;
  }
  const recent = scores.slice(-AXIS_TREND_WINDOW);
  const previous = scores.slice(-AXIS_TREND_WINDOW * 2, -AXIS_TREND_WINDOW);
  const gap = mean(recent) - mean(previous);
  if (gap >= AXIS_TREND_SIGNIFICANT_GAP) {
    return 'up';
  }
  if (gap <= -AXIS_TREND_SIGNIFICANT_GAP) {
    return 'down';
  }
  return 'flat';
}

// Échelle fixe 0-100 : les cinq lignes se comparent d'un regard, et la barre de
// seuil tombe à la même hauteur partout.
export function sparklineY(score: number, geometry: SparklineGeometry): number {
  const clamped = Math.min(SPARKLINE_SCALE_MAX, Math.max(0, score));
  const usableHeight = geometry.bottom - geometry.top;
  return roundToTenth(
    geometry.bottom - (clamped / SPARKLINE_SCALE_MAX) * usableHeight,
  );
}

export function sparklinePoints(
  scores: readonly number[],
  geometry: SparklineGeometry,
): string | null {
  if (scores.length < 2) {
    return null;
  }
  const step = geometry.width / (scores.length - 1);
  return scores
    .map(
      (score, index) =>
        `${roundToTenth(index * step)},${sparklineY(score, geometry)}`,
    )
    .join(' ');
}
