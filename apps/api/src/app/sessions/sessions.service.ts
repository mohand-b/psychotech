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
  DiscriminationRawResultDto,
  DiscriminationTrialAnswerDto,
  LogicItemAnswerDto,
  LogicRawResultDto,
  MemoryRawResultDto,
  MemorySequenceAnswerDto,
  ScoreBand,
  Sector,
  SessionDto,
  SessionMode,
  SessionResultDto,
  SessionStatus,
  TargetedAxisResultDto,
  avisFromScore,
  generateDiscriminationSession,
  generateLogicSession,
  generateMemorySession,
  scoreDiscriminationSession,
  scoreLogicSession,
  scoreMemorySession,
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
    if (
      axis !== AxisType.LOGIC &&
      axis !== AxisType.MEMORY &&
      axis !== AxisType.VISUAL_DISCRIMINATION
    ) {
      throw new BadRequestException(
        'Raw answers are not supported for this axis',
      );
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
    const rawResult =
      axis === AxisType.LOGIC
        ? this.buildLogicRawResult(request.items ?? [])
        : axis === AxisType.MEMORY
          ? this.buildMemoryRawResult(request.sequences ?? [])
          : this.buildDiscriminationRawResult(request.trials ?? []);
    const score =
      rawResult.axis === AxisType.LOGIC
        ? this.scoreLogicAnswers(session.seed, rawResult.items)
        : rawResult.axis === AxisType.MEMORY
          ? this.scoreMemoryAnswers(session.seed, rawResult.sequences)
          : this.scoreDiscriminationAnswers(session.seed, rawResult.trials);
    const completed = await this.repository.completeTargetedSession({
      sessionId,
      userId,
      axis,
      rawResult,
      score,
      startedAt: target.startedAt ?? session.startedAt,
      completedAt: new Date(),
    });
    return toSessionDto(completed);
  }

  private scoreLogicAnswers(
    seed: string,
    items: LogicItemAnswerDto[],
  ): { normalizedScore: number; band: ScoreBand } {
    const scored = scoreLogicSession(generateLogicSession(seed), items);
    return { normalizedScore: scored.score, band: avisFromScore(scored.score) };
  }

  private scoreMemoryAnswers(
    seed: string,
    sequences: MemorySequenceAnswerDto[],
  ): { normalizedScore: number; band: ScoreBand } {
    const scored = scoreMemorySession(generateMemorySession(seed), sequences);
    return { normalizedScore: scored.score, band: avisFromScore(scored.score) };
  }

  private scoreDiscriminationAnswers(
    seed: string,
    trials: DiscriminationTrialAnswerDto[],
  ): { normalizedScore: number; band: ScoreBand } {
    const scored = scoreDiscriminationSession(
      generateDiscriminationSession(seed),
      trials,
    );
    return { normalizedScore: scored.score, band: avisFromScore(scored.score) };
  }

  private buildLogicRawResult(items: LogicItemAnswerDto[]): LogicRawResultDto {
    const { exerciseCount } = AXIS_TRAINING[AxisType.LOGIC];
    const distinctIndexes = new Set(items.map((item) => item.index));
    if (
      items.length === 0 ||
      distinctIndexes.size !== items.length ||
      items.length > exerciseCount ||
      items.some((item) => item.index >= exerciseCount)
    ) {
      throw new BadRequestException(
        'Item answers must target distinct items of the targeted axis',
      );
    }
    return {
      axis: AxisType.LOGIC,
      items: items.map(({ index, answerIndex, timeMs, helpUsed, visited }) => ({
        index,
        answerIndex,
        timeMs,
        helpUsed,
        visited,
      })),
    };
  }

  private buildMemoryRawResult(
    sequences: MemorySequenceAnswerDto[],
  ): MemoryRawResultDto {
    const { exerciseCount, sequences: plan } = AXIS_TRAINING[AxisType.MEMORY];
    const distinctIndexes = new Set(sequences.map((sequence) => sequence.index));
    if (
      sequences.length === 0 ||
      distinctIndexes.size !== sequences.length ||
      sequences.length > exerciseCount ||
      sequences.some((sequence) => sequence.index >= exerciseCount) ||
      sequences.some(
        (sequence) => sequence.input.length > plan[sequence.index].length,
      )
    ) {
      throw new BadRequestException(
        'Sequence answers must target distinct sequences of the targeted axis',
      );
    }
    return {
      axis: AxisType.MEMORY,
      sequences: sequences.map(({ index, input, timeMs, timedOut }) => ({
        index,
        input,
        timeMs,
        timedOut,
      })),
    };
  }

  private buildDiscriminationRawResult(
    trials: DiscriminationTrialAnswerDto[],
  ): DiscriminationRawResultDto {
    const { exerciseCount } = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
    const distinctIndexes = new Set(trials.map((trial) => trial.index));
    if (
      trials.length === 0 ||
      distinctIndexes.size !== trials.length ||
      trials.length > exerciseCount ||
      trials.some((trial) => trial.index >= exerciseCount)
    ) {
      throw new BadRequestException(
        'Trial answers must target distinct trials of the targeted axis',
      );
    }
    return {
      axis: AxisType.VISUAL_DISCRIMINATION,
      trials: trials.map(({ index, answer, timeMs }) => ({
        index,
        answer,
        timeMs,
      })),
    };
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

  async targetedResult(
    userId: string,
    sessionId: string,
    axis: AxisType,
  ): Promise<TargetedAxisResultDto> {
    if (
      axis !== AxisType.LOGIC &&
      axis !== AxisType.MEMORY &&
      axis !== AxisType.VISUAL_DISCRIMINATION
    ) {
      throw new BadRequestException(
        'Axis results are only available for scored axes',
      );
    }
    const session = await this.loadOwnedSession(sessionId, userId);
    if (mapEnumValue(SessionMode, session.mode) !== SessionMode.TARGETED) {
      throw new BadRequestException(
        'Only a targeted session exposes an axis result',
      );
    }
    if (mapEnumValue(SessionStatus, session.status) !== SessionStatus.COMPLETED) {
      throw new ConflictException('Session is not completed');
    }
    const axisRow = session.axisResults.find(
      (result) => mapEnumValue(AxisType, result.axis) === axis,
    );
    if (!axisRow) {
      throw new BadRequestException('The axis is not part of this session');
    }
    const history = await this.repository.findTargetedAxisHistory(userId, axis);
    const scoredHistory: {
      sessionId: string;
      score: number;
      completedAt: number;
    }[] = [];
    for (const row of history) {
      let normalizedScore = row.normalizedScore;
      if (normalizedScore === null) {
        const computed = this.scoreAxisFromMetrics(
          axis,
          row.session.seed,
          row.metrics,
        );
        await this.repository.persistAxisScore(
          row.id,
          computed.normalizedScore,
          computed.band,
        );
        normalizedScore = computed.normalizedScore;
      }
      scoredHistory.push({
        sessionId: row.sessionId,
        score: Math.round(normalizedScore),
        completedAt: (
          row.completedAt ??
          row.session.completedAt ??
          row.session.startedAt
        ).getTime(),
      });
    }
    const entry = scoredHistory.find(
      (candidate) => candidate.sessionId === sessionId,
    );
    if (!entry) {
      throw new BadRequestException('The session has no result for this axis');
    }
    const prior = scoredHistory.filter(
      (candidate) => candidate.completedAt < entry.completedAt,
    );
    const previousScore =
      prior.length > 0 ? prior[prior.length - 1].score : null;
    const priorBest =
      prior.length > 0 ? Math.max(...prior.map(({ score }) => score)) : null;
    const base = {
      sessionId,
      sector: mapEnumValue(Sector, session.sector),
      seed: session.seed,
      helpEnabled: session.helpEnabled,
      score: entry.score,
      band: avisFromScore(entry.score),
      startedAt: (axisRow.startedAt ?? session.startedAt).toISOString(),
      completedAt: (
        axisRow.completedAt ??
        session.completedAt ??
        session.startedAt
      ).toISOString(),
      bestScore:
        priorBest === null ? entry.score : Math.max(priorBest, entry.score),
      isNewBest: priorBest !== null && entry.score > priorBest,
      isEqualBest: priorBest !== null && entry.score === priorBest,
      previousScore,
    };
    if (axis === AxisType.LOGIC) {
      return {
        ...base,
        axis: AxisType.LOGIC,
        items: this.logicItemsFromMetrics(axisRow.metrics),
      };
    }
    if (axis === AxisType.MEMORY) {
      return {
        ...base,
        axis: AxisType.MEMORY,
        sequences: this.memorySequencesFromMetrics(axisRow.metrics),
      };
    }
    return {
      ...base,
      axis: AxisType.VISUAL_DISCRIMINATION,
      trials: this.discriminationTrialsFromMetrics(axisRow.metrics),
    };
  }

  private scoreAxisFromMetrics(
    axis: AxisType.LOGIC | AxisType.MEMORY | AxisType.VISUAL_DISCRIMINATION,
    seed: string,
    metrics: unknown,
  ): { normalizedScore: number; band: ScoreBand } {
    if (axis === AxisType.LOGIC) {
      return this.scoreLogicAnswers(seed, this.logicItemsFromMetrics(metrics));
    }
    if (axis === AxisType.MEMORY) {
      return this.scoreMemoryAnswers(
        seed,
        this.memorySequencesFromMetrics(metrics),
      );
    }
    return this.scoreDiscriminationAnswers(
      seed,
      this.discriminationTrialsFromMetrics(metrics),
    );
  }

  private logicItemsFromMetrics(metrics: unknown): LogicItemAnswerDto[] {
    const raw = metrics as LogicRawResultDto | null;
    return raw && raw.axis === AxisType.LOGIC && Array.isArray(raw.items)
      ? raw.items
      : [];
  }

  private memorySequencesFromMetrics(
    metrics: unknown,
  ): MemorySequenceAnswerDto[] {
    const raw = metrics as MemoryRawResultDto | null;
    return raw && raw.axis === AxisType.MEMORY && Array.isArray(raw.sequences)
      ? raw.sequences
      : [];
  }

  private discriminationTrialsFromMetrics(
    metrics: unknown,
  ): DiscriminationTrialAnswerDto[] {
    const raw = metrics as DiscriminationRawResultDto | null;
    return raw &&
      raw.axis === AxisType.VISUAL_DISCRIMINATION &&
      Array.isArray(raw.trials)
      ? raw.trials
      : [];
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
