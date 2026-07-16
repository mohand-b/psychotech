import {
  AxisFeaturedMetric,
  AxisFeaturedMetricDto,
  AxisSparklinePointDto,
  AxisType,
  EvolutionPointDto,
  RadarAxisScoreDto,
  ScoreBand,
  SessionMode,
} from '@psychotech/shared';
import { isJsonRecord, readJsonNumber } from '../common/json.util';
import { MS_PER_DAY } from './progression.constants';

export interface AxisTimelinePoint {
  date: Date;
  score: number;
  band: ScoreBand;
  metrics: unknown;
  sessionId: string;
  sessionMode: SessionMode;
}

export interface EvolutionInput {
  sessionId: string;
  completedAt: Date;
  globalScore: number;
  band: ScoreBand;
}

export interface RadarAxisScore {
  axis: AxisType;
  score: number | null;
}

export function buildEvolutionCurve(points: EvolutionInput[]): EvolutionPointDto[] {
  return points.map((point) => ({
    sessionId: point.sessionId,
    date: point.completedAt.toISOString(),
    globalScore: point.globalScore,
    band: point.band,
  }));
}

export function buildSparkline(
  timeline: AxisTimelinePoint[],
  maxPoints: number,
): AxisSparklinePointDto[] {
  const start = Math.max(0, timeline.length - maxPoints);
  return timeline.slice(start).map((point) => ({
    date: point.date.toISOString(),
    score: point.score,
  }));
}

export function computeDeltaOverWindow(
  timeline: AxisTimelinePoint[],
  now: Date,
  windowDays: number,
): number | null {
  if (timeline.length === 0) {
    return null;
  }
  const current = timeline[timeline.length - 1];
  const cutoff = now.getTime() - windowDays * MS_PER_DAY;
  let baseline: AxisTimelinePoint | null = null;
  for (const point of timeline) {
    if (point.date.getTime() <= cutoff) {
      baseline = point;
    } else {
      break;
    }
  }
  if (!baseline) {
    return null;
  }
  return roundToOneDecimal(current.score - baseline.score);
}

export function extractFeaturedMetric(
  axis: AxisType,
  metrics: unknown,
): AxisFeaturedMetricDto | null {
  if (!isJsonRecord(metrics)) {
    return null;
  }
  if (axis === AxisType.MEMORY) {
    const normal = readJsonNumber(metrics, 'maxLengthNormal');
    const inverse = readJsonNumber(metrics, 'maxLengthInverse');
    if (normal === null && inverse === null) {
      return null;
    }
    return {
      metric: AxisFeaturedMetric.MAX_MEMORIZED_LENGTH,
      value: Math.max(normal ?? 0, inverse ?? 0),
    };
  }
  if (axis === AxisType.REACTIVITY) {
    const meanReactionTime = readJsonNumber(metrics, 'meanReactionTimeMs');
    if (meanReactionTime === null) {
      return null;
    }
    return {
      metric: AxisFeaturedMetric.MEAN_REACTION_TIME_MS,
      value: meanReactionTime,
    };
  }
  return null;
}

export function buildRadarScores(
  axisScores: RadarAxisScore[] | null,
  axisOrder: AxisType[],
): RadarAxisScoreDto[] {
  return axisOrder.map((axis) => {
    const match = axisScores?.find((entry) => entry.axis === axis);
    return { axis, score: match ? match.score : null };
  });
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}
