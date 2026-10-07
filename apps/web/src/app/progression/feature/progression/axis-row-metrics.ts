import { roundToTenth } from '@psychotech/shared';

export const SPARKLINE_MARGIN_RATIO = 0.15;
export const SPARKLINE_FLAT_MARGIN = 1;
const MIN_SESSIONS_FOR_DELTA = 2;

export interface SparklineGeometry {
  width: number;
  top: number;
  bottom: number;
}

export interface SparklineDomain {
  min: number;
  max: number;
}

export function computeSparklineDomain(
  scores: readonly number[],
): SparklineDomain {
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

export function buildSparklinePoints(
  scores: readonly number[],
  geometry: SparklineGeometry,
): string | null {
  if (scores.length < 2) {
    return null;
  }
  const domain = computeSparklineDomain(scores);
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

export function computeAxisProgressDelta(
  firstScore: number | null,
  currentScore: number | null,
  sessionCount: number,
): number | null {
  if (
    firstScore === null ||
    currentScore === null ||
    sessionCount < MIN_SESSIONS_FOR_DELTA
  ) {
    return null;
  }
  return Math.round(currentScore - firstScore);
}
