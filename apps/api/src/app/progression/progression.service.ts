import { Injectable } from '@nestjs/common';
import { AxisProgressionDto, AxisType, ProgressionDto } from '@psychotech/shared';
import {
  PROGRESSION_AXIS_HISTORY_LIMIT,
  PROGRESSION_AXIS_ORDER,
  PROGRESSION_DELTA_WINDOW_DAYS,
  PROGRESSION_EVOLUTION_LIMIT,
  PROGRESSION_SPARKLINE_LIMIT,
} from './progression.constants';
import {
  buildEvolutionCurve,
  buildRadarScores,
  buildSparkline,
  computeDeltaOverWindow,
  extractFeaturedMetric,
} from './progression.logic';
import { ProgressionRepository } from './progression.repository';

@Injectable()
export class ProgressionService {
  constructor(private readonly repository: ProgressionRepository) {}

  async getProgression(userId: string): Promise<ProgressionDto> {
    const now = new Date();
    const [
      streak,
      sessionCounts,
      firstSessionAt,
      bestFullSession,
      evolution,
      firstFullSession,
      lastFullSession,
      axes,
    ] = await Promise.all([
      this.repository.getStreak(userId),
      this.repository.countCompletedSessionsByMode(userId),
      this.repository.getFirstSessionDate(userId),
      this.repository.getBestFullSession(userId),
      this.repository.getEvolution(userId, PROGRESSION_EVOLUTION_LIMIT),
      this.repository.getFirstFullSession(userId),
      this.repository.getLastFullSession(userId),
      this.buildAxes(userId, now),
    ]);

    return {
      stats: {
        currentStreak: streak?.current ?? 0,
        longestStreak: streak?.longest ?? 0,
        completedSessions: sessionCounts.full + sessionCounts.targeted,
        fullSessionsCount: sessionCounts.full,
        targetedSessionsCount: sessionCounts.targeted,
        firstSessionAt: firstSessionAt ? firstSessionAt.toISOString() : null,
        firstFullSessionAt:
          firstFullSession?.completedAt?.toISOString() ?? null,
        firstGlobalScore: firstFullSession?.globalScore ?? null,
        bestGlobalScore: bestFullSession?.globalScore ?? null,
        bestGlobalScoreAt: bestFullSession?.completedAt?.toISOString() ?? null,
      },
      evolution: buildEvolutionCurve(evolution),
      axes,
      radar: {
        first: buildRadarScores(
          firstFullSession?.axes ?? null,
          PROGRESSION_AXIS_ORDER,
        ),
        last: buildRadarScores(
          lastFullSession?.axes ?? null,
          PROGRESSION_AXIS_ORDER,
        ),
      },
    };
  }

  private buildAxes(userId: string, now: Date): Promise<AxisProgressionDto[]> {
    return Promise.all(
      PROGRESSION_AXIS_ORDER.map((axis) => this.buildAxisProgression(userId, axis, now)),
    );
  }

  private async buildAxisProgression(
    userId: string,
    axis: AxisType,
    now: Date,
  ): Promise<AxisProgressionDto> {
    const timeline = await this.repository.getAxisHistory(
      userId,
      axis,
      PROGRESSION_AXIS_HISTORY_LIMIT,
    );
    const current = timeline.length > 0 ? timeline[timeline.length - 1] : null;
    return {
      axis,
      currentScore: current ? current.score : null,
      band: current ? current.band : null,
      deltaOver30Days: computeDeltaOverWindow(timeline, now, PROGRESSION_DELTA_WINDOW_DAYS),
      sparkline: buildSparkline(timeline, PROGRESSION_SPARKLINE_LIMIT),
      featuredMetric: current ? extractFeaturedMetric(axis, current.metrics) : null,
      lastSessionId: current ? current.sessionId : null,
      lastSessionMode: current ? current.sessionMode : null,
    };
  }
}
