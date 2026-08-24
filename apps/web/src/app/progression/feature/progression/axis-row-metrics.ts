import { AxisSparklinePointDto, roundToTenth } from '@psychotech/shared';

export const AXIS_HISTORY_WINDOW_DAYS = 30;
export const SPARKLINE_MARGIN_RATIO = 0.15;
export const SPARKLINE_FLAT_MARGIN = 1;

const MS_PER_DAY = 86_400_000;

export interface SparklineGeometry {
  width: number;
  top: number;
  bottom: number;
}

export interface SparklineDomain {
  min: number;
  max: number;
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

// Échelle propre à l'axe : une échelle 0-100 commune écrase les écarts réels et
// donne cinq lignes plates. La marge évite que les extrêmes touchent les bords.
export function sparklineDomain(scores: readonly number[]): SparklineDomain {
  if (scores.length === 0) {
    return { min: 0, max: 1 };
  }
  const lowest = Math.min(...scores);
  const highest = Math.max(...scores);
  const span = highest - lowest;
  if (span === 0) {
    return {
      min: lowest - SPARKLINE_FLAT_MARGIN,
      max: highest + SPARKLINE_FLAT_MARGIN,
    };
  }
  const margin = span * SPARKLINE_MARGIN_RATIO;
  return { min: lowest - margin, max: highest + margin };
}

export function sparklinePoints(
  scores: readonly number[],
  geometry: SparklineGeometry,
): string | null {
  if (scores.length < 2) {
    return null;
  }
  const domain = sparklineDomain(scores);
  const span = domain.max - domain.min;
  const usableHeight = geometry.bottom - geometry.top;
  const step = geometry.width / (scores.length - 1);
  return scores
    .map((score, index) => {
      const y = geometry.bottom - ((score - domain.min) / span) * usableHeight;
      return `${roundToTenth(index * step)},${roundToTenth(y)}`;
    })
    .join(' ');
}
