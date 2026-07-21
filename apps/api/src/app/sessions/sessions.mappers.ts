import { Prisma, Recommendation, SessionAxis } from '@prisma/client';
import {
  AxisMetrics,
  AxisProgressStatus,
  AxisRawResultDto,
  AxisType,
  BadgeDto,
  ControlModality,
  CurrentSessionDto,
  LogicFamilyFilter,
  RecommendationDto,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionAxisResultDto,
  SessionDto,
  SessionHistoryItemDto,
  SessionMode,
  SessionResultDto,
  SessionStatus,
  TrainingOptionId,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';
import { activePlayDurationSec, sessionUntimed } from './sessions.logic';

export const SESSION_INCLUDE = {
  axisResults: true,
  recommendations: true,
} satisfies Prisma.SessionInclude;

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}>;

export function toSessionDto(session: SessionWithRelations): SessionDto {
  const mode = mapEnumValue(SessionMode, session.mode);
  const status = mapEnumValue(SessionStatus, session.status);
  const exposeAxisScores =
    mode !== SessionMode.FULL || status === SessionStatus.COMPLETED;
  return {
    id: session.id,
    mode,
    sector: mapEnumValue(Sector, session.sector),
    status,
    seed: session.seed,
    contentVersion: session.contentVersion,
    logicFamily: session.logicFamily
      ? mapEnumValue(LogicFamilyFilter, session.logicFamily)
      : null,
    options: {
      enabledOptions: session.trainingOptions as TrainingOptionId[],
      logicFamily: session.logicFamily
        ? mapEnumValue(LogicFamilyFilter, session.logicFamily)
        : null,
    },
    energyCost: session.energyCost,
    currentAxisIndex: session.currentAxisIndex,
    globalScore: session.globalScore,
    globalBand: session.globalBand ? mapEnumValue(ScoreBand, session.globalBand) : null,
    isAdmissible: session.isAdmissible,
    isEliminated: session.isEliminated,
    sectorThreshold: session.sectorThreshold,
    startedAt: session.startedAt.toISOString(),
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    abandonedAt: session.abandonedAt ? session.abandonedAt.toISOString() : null,
    controlModality: session.controlModality
      ? mapEnumValue(ControlModality, session.controlModality)
      : null,
    axisResults: sortedAxisResults(session.axisResults).map((axis) =>
      toAxisResultDto(axis, exposeAxisScores),
    ),
    recommendations: session.recommendations.map(toRecommendationDto),
  };
}

export function toSessionResultDto(
  session: SessionWithRelations,
  unlockedBadges: BadgeDto[] = [],
): SessionResultDto {
  return {
    sessionId: session.id,
    mode: mapEnumValue(SessionMode, session.mode),
    sector: mapEnumValue(Sector, session.sector),
    status: mapEnumValue(SessionStatus, session.status),
    globalScore: session.globalScore,
    globalBand: session.globalBand ? mapEnumValue(ScoreBand, session.globalBand) : null,
    isAdmissible: session.isAdmissible,
    isEliminated: session.isEliminated,
    sectorThreshold: session.sectorThreshold,
    axisResults: sortedAxisResults(session.axisResults).map((axis) =>
      toAxisResultDto(axis, true),
    ),
    recommendations: session.recommendations.map(toRecommendationDto),
    unlockedBadges,
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
  };
}

export function toSessionHistoryItemDto(
  session: SessionWithRelations,
): SessionHistoryItemDto {
  const mode = mapEnumValue(SessionMode, session.mode);
  const status = mapEnumValue(SessionStatus, session.status);
  const axisResults = sortedAxisResults(session.axisResults);
  const finishedAt =
    session.completedAt ?? session.abandonedAt ?? session.startedAt;
  const isAbandoned = status === SessionStatus.ABANDONED;
  const targetedAxis = axisResults[0];
  const score = isAbandoned
    ? null
    : mode === SessionMode.FULL
      ? session.globalScore
      : (targetedAxis?.normalizedScore ?? null);
  const band = isAbandoned
    ? null
    : mode === SessionMode.FULL
      ? session.globalBand
      : (targetedAxis?.band ?? null);
  return {
    id: session.id,
    mode,
    axis:
      mode === SessionMode.FULL || !targetedAxis
        ? null
        : mapEnumValue(AxisType, targetedAxis.axis),
    sector: mapEnumValue(Sector, session.sector),
    status,
    logicFamily: session.logicFamily
      ? mapEnumValue(LogicFamilyFilter, session.logicFamily)
      : null,
    untimed: sessionUntimed(session),
    finishedAt: finishedAt.toISOString(),
    durationSec: activePlayDurationSec(axisResults),
    score,
    band: band ? mapEnumValue(ScoreBand, band) : null,
    axisReached:
      mode === SessionMode.FULL && isAbandoned
        ? Math.min(session.currentAxisIndex + 1, axisResults.length)
        : null,
    axisTotal: axisResults.length,
  };
}

export function toCurrentSessionDto(
  session: SessionWithRelations,
): CurrentSessionDto {
  let currentAssigned = false;
  return {
    id: session.id,
    mode: mapEnumValue(SessionMode, session.mode),
    sector: mapEnumValue(Sector, session.sector),
    axes: sortedAxisResults(session.axisResults).map((axis) => {
      if (axis.completedAt !== null || axis.skipped) {
        return {
          axis: mapEnumValue(AxisType, axis.axis),
          status: AxisProgressStatus.DONE,
        };
      }
      const status = currentAssigned
        ? AxisProgressStatus.PENDING
        : AxisProgressStatus.CURRENT;
      currentAssigned = true;
      return { axis: mapEnumValue(AxisType, axis.axis), status };
    }),
  };
}

function sortedAxisResults(axisResults: SessionAxis[]): SessionAxis[] {
  return [...axisResults].sort((a, b) => a.order - b.order);
}

function toAxisResultDto(
  axis: SessionAxis,
  exposeScores: boolean,
): SessionAxisResultDto {
  return {
    axis: mapEnumValue(AxisType, axis.axis),
    order: axis.order,
    normalizedScore: exposeScores ? axis.normalizedScore : null,
    band:
      exposeScores && axis.band ? mapEnumValue(ScoreBand, axis.band) : null,
    skipped: axis.skipped,
    metrics:
      !exposeScores || axis.metrics === null
        ? null
        : (axis.metrics as unknown as AxisMetrics | AxisRawResultDto),
    startedAt: axis.startedAt ? axis.startedAt.toISOString() : null,
    completedAt: axis.completedAt ? axis.completedAt.toISOString() : null,
  };
}

function toRecommendationDto(recommendation: Recommendation): RecommendationDto {
  return {
    axis: mapEnumValue(AxisType, recommendation.axis),
    priority: mapEnumValue(RecommendationPriority, recommendation.priority),
    code: recommendation.code,
    label: recommendation.label,
  };
}
