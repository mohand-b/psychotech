import { Prisma, Recommendation, SessionAxis } from '@prisma/client';
import {
  AxisMetrics,
  AxisType,
  BadgeDto,
  RecommendationDto,
  RecommendationPriority,
  ScoreBand,
  Sector,
  SessionAxisResultDto,
  SessionDto,
  SessionMode,
  SessionResultDto,
  SessionStatus,
} from '@psychotech/shared';
import { mapEnumValue } from '../common/enum.util';

export const SESSION_INCLUDE = {
  axisResults: true,
  recommendations: true,
} satisfies Prisma.SessionInclude;

export type SessionWithRelations = Prisma.SessionGetPayload<{
  include: typeof SESSION_INCLUDE;
}>;

export function toSessionDto(session: SessionWithRelations): SessionDto {
  return {
    id: session.id,
    mode: mapEnumValue(SessionMode, session.mode),
    sector: mapEnumValue(Sector, session.sector),
    status: mapEnumValue(SessionStatus, session.status),
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
    axisResults: sortedAxisResults(session.axisResults).map(toAxisResultDto),
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
    axisResults: sortedAxisResults(session.axisResults).map(toAxisResultDto),
    recommendations: session.recommendations.map(toRecommendationDto),
    unlockedBadges,
    completedAt: session.completedAt ? session.completedAt.toISOString() : null,
  };
}

function sortedAxisResults(axisResults: SessionAxis[]): SessionAxis[] {
  return [...axisResults].sort((a, b) => a.order - b.order);
}

function toAxisResultDto(axis: SessionAxis): SessionAxisResultDto {
  return {
    axis: mapEnumValue(AxisType, axis.axis),
    order: axis.order,
    normalizedScore: axis.normalizedScore,
    band: axis.band ? mapEnumValue(ScoreBand, axis.band) : null,
    skipped: axis.skipped,
    metrics: axis.metrics === null ? null : (axis.metrics as unknown as AxisMetrics),
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
