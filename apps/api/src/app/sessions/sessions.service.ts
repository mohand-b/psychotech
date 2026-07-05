import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AXIS_TRAINING,
  AxisType,
  LogicRawResultDto,
  ScoreBand,
  Sector,
  SessionDto,
  SessionMode,
  SessionResultDto,
  SessionStatus,
} from '@psychotech/shared';
import { isFlawlessVisualMetrics } from '../badges/badge.logic';
import { BadgesService } from '../badges/badges.service';
import { mapEnumValue } from '../common/enum.util';
import { energyCost } from '../energy/energy.logic';
import { AxisScore } from '../scoring/scoring.logic';
import { ScoringService } from '../scoring/scoring.service';
import { CompleteTargetedSessionRequest } from './dto/complete-targeted-session.request';
import { ListSessionsQuery } from './dto/list-sessions.query';
import { StartSessionRequest } from './dto/start-session.request';
import { SubmitAxisResultRequest } from './dto/submit-axis-result.request';
import { computeStreakUpdate, resolveSessionAxes } from './sessions.logic';
import {
  toSessionDto,
  toSessionResultDto,
  SessionWithRelations,
} from './sessions.mappers';
import { AxisBestInput, SessionsRepository } from './sessions.repository';

@Injectable()
export class SessionsService {
  constructor(
    private readonly repository: SessionsRepository,
    private readonly scoringService: ScoringService,
    private readonly badgesService: BadgesService,
  ) {}

  async start(userId: string, request: StartSessionRequest): Promise<SessionDto> {
    const axes = resolveSessionAxes(request.mode, request.axis);
    const cost = energyCost(request.mode);
    const config = await this.repository.findSectorConfig(request.sector);
    if (!config || !config.isActive) {
      throw new BadRequestException('The requested sector is not available');
    }
    const session = await this.repository.createSession({
      userId,
      mode: request.mode,
      sector: request.sector,
      seed: randomUUID(),
      helpEnabled:
        request.mode === SessionMode.TARGETED
          ? (request.options?.helpEnabled ?? false)
          : false,
      energyCost: cost,
      sectorThreshold: config.admissibilityThreshold,
      axes,
    });
    return toSessionDto(session);
  }

  async submitAxis(
    userId: string,
    sessionId: string,
    axis: AxisType,
    request: SubmitAxisResultRequest,
  ): Promise<SessionDto> {
    const session = await this.loadInProgressSession(sessionId, userId);
    const target = session.axisResults.find(
      (result) => mapEnumValue(AxisType, result.axis) === axis,
    );
    if (!target) {
      throw new BadRequestException('The axis is not part of this session');
    }
    if (request.axis !== axis) {
      throw new BadRequestException('The axis in the body does not match the route');
    }
    const now = new Date();
    if (request.skipped) {
      await this.repository.updateAxisResult(sessionId, axis, {
        normalizedScore: null,
        band: null,
        skipped: true,
        metrics: null,
        startedAt: target.startedAt ?? now,
        completedAt: now,
      });
    } else {
      if (!request.metrics) {
        throw new BadRequestException('Metrics are required to score an axis');
      }
      if (request.metrics.axis !== axis) {
        throw new BadRequestException('The metrics axis does not match the route');
      }
      const { normalizedScore, band } = this.scoringService.scoreAxis(request.metrics);
      await this.repository.updateAxisResult(sessionId, axis, {
        normalizedScore,
        band,
        skipped: false,
        metrics: request.metrics,
        startedAt: target.startedAt ?? now,
        completedAt: now,
      });
    }
    return toSessionDto(await this.loadOwnedSession(sessionId, userId));
  }

  async completeTargeted(
    userId: string,
    sessionId: string,
    axis: AxisType,
    request: CompleteTargetedSessionRequest,
  ): Promise<SessionDto> {
    if (request.axis !== axis) {
      throw new BadRequestException('The axis in the body does not match the route');
    }
    if (axis !== AxisType.LOGIC) {
      throw new BadRequestException('Raw answers are only supported for the logic axis');
    }
    const session = await this.loadInProgressSession(sessionId, userId);
    if (mapEnumValue(SessionMode, session.mode) !== SessionMode.TARGETED) {
      throw new BadRequestException(
        'Only a targeted session can be completed with raw answers',
      );
    }
    const target = session.axisResults.find(
      (result) => mapEnumValue(AxisType, result.axis) === axis,
    );
    if (!target) {
      throw new BadRequestException('The axis is not part of this session');
    }
    const { exerciseCount } = AXIS_TRAINING[AxisType.LOGIC];
    const distinctIndexes = new Set(request.items.map((item) => item.index));
    if (
      distinctIndexes.size !== request.items.length ||
      request.items.length > exerciseCount ||
      request.items.some((item) => item.index >= exerciseCount)
    ) {
      throw new BadRequestException(
        'Item answers must target distinct items of the targeted axis',
      );
    }
    const rawResult: LogicRawResultDto = {
      axis: AxisType.LOGIC,
      items: request.items.map(({ index, answerIndex, timeMs, helpUsed }) => ({
        index,
        answerIndex,
        timeMs,
        helpUsed,
      })),
    };
    const completed = await this.repository.completeTargetedSession({
      sessionId,
      axis,
      rawResult,
      startedAt: target.startedAt ?? session.startedAt,
      completedAt: new Date(),
    });
    return toSessionDto(completed);
  }

  async complete(userId: string, sessionId: string): Promise<SessionResultDto> {
    const session = await this.loadInProgressSession(sessionId, userId);
    const config = await this.repository.findSectorConfig(
      mapEnumValue(Sector, session.sector),
    );
    if (!config) {
      throw new BadRequestException('Sector configuration is missing');
    }
    const thresholds = {
      admissibilityThreshold: session.sectorThreshold,
      vigilanceThreshold: config.vigilanceThreshold,
      eliminatoryThreshold: config.eliminatoryThreshold,
    };
    const weightByAxis = new Map(
      config.weights.map((weight) => [weight.axis, weight]),
    );
    const scores: AxisScore[] = [];
    const axisBests: AxisBestInput[] = [];
    for (const result of session.axisResults) {
      if (result.skipped) {
        continue;
      }
      const score = result.normalizedScore;
      const band = result.band;
      if (score === null || band === null) {
        continue;
      }
      const axis = mapEnumValue(AxisType, result.axis);
      const weight = weightByAxis.get(axis);
      if (!weight) {
        continue;
      }
      scores.push({
        axis,
        score,
        coefficient: weight.coefficient,
        isCritical: weight.isCritical,
      });
      axisBests.push({
        axis,
        score,
        band: mapEnumValue(ScoreBand, band),
        sessionAxisId: result.id,
      });
    }
    const evaluation = this.scoringService.evaluateSession(scores, thresholds);
    const streakContext = await this.repository.findStreakContext(userId);
    const now = new Date();
    const streak = computeStreakUpdate(
      streakContext.streak ?? { current: 0, longest: 0, lastActivityDate: null },
      now,
      streakContext.timezone,
    );
    const visualResult = session.axisResults.find(
      (result) =>
        !result.skipped &&
        mapEnumValue(AxisType, result.axis) === AxisType.VISUAL_DISCRIMINATION,
    );
    const flawlessVisualDiscrimination = visualResult
      ? isFlawlessVisualMetrics(visualResult.metrics)
      : false;
    const completed = await this.repository.completeSession(
      {
        sessionId,
        userId,
        globalScore: evaluation.globalScore,
        globalBand: evaluation.globalBand,
        isAdmissible: evaluation.isAdmissible,
        isEliminated: evaluation.isEliminated,
        completedAt: now,
        axisCount: session.axisResults.length,
        recommendations: evaluation.recommendations,
        axisBests,
        streak: {
          current: streak.current,
          longest: streak.longest,
          lastActivityDate: now,
        },
      },
      (client) =>
        this.badgesService.evaluateAndUnlockWithin(client, userId, {
          currentStreak: streak.current,
          flawlessVisualDiscrimination,
        }),
    );
    return toSessionResultDto(completed.session, completed.unlockedBadges);
  }

  async suspend(userId: string, sessionId: string): Promise<SessionDto> {
    await this.loadInProgressSession(sessionId, userId);
    await this.repository.suspendSession(sessionId);
    return toSessionDto(await this.loadOwnedSession(sessionId, userId));
  }

  async abandon(userId: string, sessionId: string): Promise<SessionDto> {
    const session = await this.loadOwnedSession(sessionId, userId);
    const status = mapEnumValue(SessionStatus, session.status);
    if (status === SessionStatus.COMPLETED || status === SessionStatus.ABANDONED) {
      throw new ConflictException('Session is already finished');
    }
    await this.repository.abandonSession(sessionId, new Date());
    return toSessionDto(await this.loadOwnedSession(sessionId, userId));
  }

  async list(userId: string, query: ListSessionsQuery): Promise<SessionDto[]> {
    const sessions = await this.repository.listSessions(userId, {
      mode: query.mode,
      axis: query.axis,
      from: query.from,
      to: query.to,
    });
    return sessions.map(toSessionDto);
  }

  async get(userId: string, sessionId: string): Promise<SessionDto> {
    return toSessionDto(await this.loadOwnedSession(sessionId, userId));
  }

  async results(userId: string, sessionId: string): Promise<SessionResultDto> {
    return toSessionResultDto(await this.loadOwnedSession(sessionId, userId));
  }

  private async loadInProgressSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionWithRelations> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (mapEnumValue(SessionStatus, session.status) !== SessionStatus.IN_PROGRESS) {
      throw new ConflictException('Session is not in progress');
    }
    return session;
  }

  private async loadOwnedSession(
    sessionId: string,
    userId: string,
  ): Promise<SessionWithRelations> {
    const session = await this.repository.findUserSession(sessionId, userId);
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    return session;
  }
}
