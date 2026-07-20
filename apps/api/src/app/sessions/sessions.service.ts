import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AXIS_TRAINING,
  AxisFinding,
  AxisFindingsEntry,
  AxisRawResultDto,
  AxisType,
  ControlModality,
  CurrentSessionDto,
  DiscriminationRawResultDto,
  DiscriminationTrialAnswerDto,
  LOGIC_CONTENT_VERSION_V2,
  LOGIC_CONTENT_VERSION_V3,
  LogicFamilyFilter,
  LogicItemAnswerDto,
  LogicRawResultDto,
  MOTRICITY_COURSE_COUNT,
  MemoryPhase,
  MemoryRawResultDto,
  MemorySequenceAnswerDto,
  MotorSkillsMetrics,
  MotricityCourseTrajectoryDto,
  ReactivityRawResultDto,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
  SECTOR_LABELS,
  SUBSCRIPTION_REQUIRED_ERROR_CODE,
  ScoreBand,
  Sector,
  SessionDto,
  SessionHistoryPageDto,
  SessionMode,
  SessionResultDto,
  SessionStatus,
  SimulationObservableDto,
  SimulationSummaryDto,
  SubscriptionTier,
  TargetedAxisResultDto,
  analyzeDiscrimination,
  analyzeLogic,
  analyzeMemory,
  analyzeMotricity,
  analyzeReactivity,
  avisFromScore,
  buildSimulationAppreciation,
  buildSimulationSummary,
  deriveMotorSkillsMetrics,
  generateDiscriminationSession,
  generateLegacyLogicSession,
  computeLogicFamilyAggregates,
  generateLogicSession,
  generateMemorySession,
  generateMotricityCourses,
  generateReactivitySession,
  motricityCourseFinished,
  scoreDiscriminationSession,
  scoreLegacyLogicSession,
  scoreLogicSession,
  scoreMemorySession,
  scoreMotricitySession,
  scoreReactivitySession,
  TrainingOptionId,
  trainingOptionsForAxis,
} from '@psychotech/shared';
import { isFlawlessVisualMetrics } from '../badges/badge.logic';
import { BadgesService } from '../badges/badges.service';
import { mapEnumValue } from '../common/enum.util';
import { energyCost } from '../energy/energy.logic';
import { AxisScore } from '../scoring/scoring.logic';
import { ScoringService } from '../scoring/scoring.service';
import { TierResolutionService } from '../subscriptions/tier-resolution.service';
import { CompleteTargetedSessionRequest } from './dto/complete-targeted-session.request';
import { ListSessionsQuery } from './dto/list-sessions.query';
import { StartSessionRequest } from './dto/start-session.request';
import {
  SESSION_HISTORY_PAGE_SIZE,
  axisContentFullyPlayed,
  computeStreakUpdate,
  resolveSessionAxes,
} from './sessions.logic';
import {
  toCurrentSessionDto,
  toSessionDto,
  toSessionHistoryItemDto,
  toSessionResultDto,
  SessionWithRelations,
} from './sessions.mappers';
import { AxisBestInput, SessionsRepository } from './sessions.repository';

interface LogicContentContext {
  seed: string;
  contentVersion: number;
  logicFamily: LogicFamilyFilter | null;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly repository: SessionsRepository,
    private readonly scoringService: ScoringService,
    private readonly badgesService: BadgesService,
    private readonly tierResolution: TierResolutionService,
  ) {}

  async start(userId: string, request: StartSessionRequest): Promise<SessionDto> {
    const axes = resolveSessionAxes(request.mode, request.axis);
    const cost = energyCost(request.mode);
    if (request.mode !== SessionMode.TUTORIAL) {
      await this.assertSubscribed(userId);
    }
    const enabledOptions = request.options?.enabledOptions ?? [];
    if (enabledOptions.length > 0) {
      if (request.mode !== SessionMode.TARGETED) {
        throw new BadRequestException(
          'Training options are only available for targeted sessions',
        );
      }
      const axisOptionIds = new Set(
        (request.axis ? trainingOptionsForAxis(request.axis) : []).map(
          ({ id }) => id,
        ),
      );
      if (enabledOptions.some((id) => !axisOptionIds.has(id))) {
        throw new BadRequestException(
          'The requested training option does not belong to this axis',
        );
      }
    }
    const logicFamily = request.options?.logicFamily ?? null;
    if (
      logicFamily !== null &&
      (request.mode !== SessionMode.TARGETED || request.axis !== AxisType.LOGIC)
    ) {
      throw new BadRequestException(
        'The family filter is only available for targeted logic sessions',
      );
    }
    const config = await this.repository.findSectorConfig(request.sector);
    if (!config || !config.isActive) {
      throw new BadRequestException('The requested sector is not available');
    }
    const session = await this.repository.createSession({
      userId,
      mode: request.mode,
      sector: request.sector,
      seed: randomUUID(),
      contentVersion: LOGIC_CONTENT_VERSION_V3,
      logicFamily,
      helpEnabled: enabledOptions.includes(TrainingOptionId.LOGIC_HELP),
      trainingOptions: enabledOptions,
      energyCost: cost,
      sectorThreshold: config.admissibilityThreshold,
      axes,
    });
    return toSessionDto(session);
  }

  private async assertSubscribed(userId: string): Promise<void> {
    const subscription = await this.repository.findUserSubscription(userId);
    if (this.tierResolution.resolve(subscription) === SubscriptionTier.FREE) {
      throw new ForbiddenException({
        statusCode: 403,
        code: SUBSCRIPTION_REQUIRED_ERROR_CODE,
        message: 'A paid subscription is required to start this session',
      });
    }
  }

  async completeAxis(
    userId: string,
    sessionId: string,
    axis: AxisType,
    request: CompleteTargetedSessionRequest,
  ): Promise<SessionDto> {
    if (request.axis !== axis) {
      throw new BadRequestException('The axis in the body does not match the route');
    }
    const session = await this.loadInProgressSession(sessionId, userId);
    const mode = mapEnumValue(SessionMode, session.mode);
    if (mode === SessionMode.FULL) {
      return this.completeFullSessionAxis(userId, session, axis, request);
    }
    if (mode !== SessionMode.TARGETED) {
      throw new BadRequestException(
        'Only a targeted or full session can be completed with raw answers',
      );
    }
    const target = session.axisResults.find(
      (result) => mapEnumValue(AxisType, result.axis) === axis,
    );
    if (!target) {
      throw new BadRequestException('The axis is not part of this session');
    }
    const { rawResult, score } = this.scoreRawAnswers(
      this.logicContentContext(session),
      axis,
      request,
    );
    const completed = await this.repository.completeTargetedSession({
      sessionId,
      userId,
      axis,
      rawResult,
      score,
      excludeFromBest: session.logicFamily != null,
      controlModality: request.controlModality ?? null,
      startedAt: target.startedAt ?? session.startedAt,
      completedAt: new Date(),
    });
    return toSessionDto(completed);
  }

  private async completeFullSessionAxis(
    userId: string,
    session: SessionWithRelations,
    axis: AxisType,
    request: CompleteTargetedSessionRequest,
  ): Promise<SessionDto> {
    const orderedAxes = [...session.axisResults].sort(
      (a, b) => a.order - b.order,
    );
    const currentAxis = orderedAxes[session.currentAxisIndex];
    if (!currentAxis || mapEnumValue(AxisType, currentAxis.axis) !== axis) {
      throw new ConflictException(
        'The axis is not the current axis of the simulation',
      );
    }
    const { rawResult, score } = this.scoreRawAnswers(
      this.logicContentContext(session),
      axis,
      request,
    );
    const previousAxis = orderedAxes[session.currentAxisIndex - 1];
    await this.repository.completeFullSessionAxis({
      sessionId: session.id,
      axis,
      rawResult,
      score,
      controlModality: request.controlModality ?? null,
      startedAt:
        currentAxis.startedAt ?? previousAxis?.completedAt ?? session.startedAt,
      completedAt: new Date(),
      nextAxisIndex: session.currentAxisIndex + 1,
    });
    const updated = await this.loadOwnedSession(session.id, userId);
    if (updated.axisResults.every((result) => result.completedAt !== null)) {
      await this.complete(userId, session.id);
      return toSessionDto(await this.loadOwnedSession(session.id, userId));
    }
    return toSessionDto(updated);
  }

  private logicContentContext(session: {
    seed: string;
    contentVersion: number;
    logicFamily: string | null;
  }): LogicContentContext {
    return {
      seed: session.seed,
      contentVersion: session.contentVersion,
      logicFamily: session.logicFamily
        ? mapEnumValue(LogicFamilyFilter, session.logicFamily)
        : null,
    };
  }

  private scoreRawAnswers(
    context: LogicContentContext,
    axis: AxisType,
    request: CompleteTargetedSessionRequest,
  ): {
    rawResult: AxisRawResultDto;
    score: { normalizedScore: number; band: ScoreBand };
  } {
    const seed = context.seed;
    if (axis === AxisType.MOTOR_SKILLS) {
      return this.scoreMotricityTrajectories(
        seed,
        request.courses ?? [],
        request.controlModality ?? null,
      );
    }
    const rawResult =
      axis === AxisType.LOGIC
        ? this.buildLogicRawResult(request.items ?? [])
        : axis === AxisType.MEMORY
          ? this.buildMemoryRawResult(request.sequences ?? [])
          : axis === AxisType.VISUAL_DISCRIMINATION
            ? this.buildDiscriminationRawResult(request.trials ?? [])
            : this.buildReactivityRawResult(
                seed,
                request.stimuli ?? [],
                request.waitPresses ?? [],
              );
    if (!axisContentFullyPlayed(rawResult, request.playedMs)) {
      throw new ConflictException('The session content is not fully played');
    }
    const score =
      rawResult.axis === AxisType.LOGIC
        ? this.scoreLogicAnswers(context, rawResult.items)
        : rawResult.axis === AxisType.MEMORY
          ? this.scoreMemoryAnswers(seed, rawResult.sequences)
          : rawResult.axis === AxisType.VISUAL_DISCRIMINATION
            ? this.scoreDiscriminationAnswers(seed, rawResult.trials)
            : this.scoreReactivityAnswers(
                seed,
                (rawResult as ReactivityRawResultDto).stimuli,
                (rawResult as ReactivityRawResultDto).waitPresses,
              );
    return { rawResult, score };
  }

  private scoreLogicAnswers(
    context: LogicContentContext,
    items: LogicItemAnswerDto[],
  ): { normalizedScore: number; band: ScoreBand } {
    const scored =
      context.contentVersion >= LOGIC_CONTENT_VERSION_V2
        ? scoreLogicSession(
            generateLogicSession(
              context.seed,
              context.logicFamily,
              context.contentVersion,
            ),
            items,
          )
        : scoreLegacyLogicSession(
            generateLegacyLogicSession(context.seed),
            items,
          );
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

  private scoreReactivityAnswers(
    seed: string,
    stimuli: ReactivityStimulusAnswerDto[],
    waitPresses: ReactivityWaitPressDto[],
  ): { normalizedScore: number; band: ScoreBand } {
    const scored = scoreReactivitySession(
      generateReactivitySession(seed),
      stimuli,
      waitPresses,
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
      items: items.map(
        ({
          index,
          answerIndex,
          dominoTop,
          dominoBottom,
          numericValue,
          timeMs,
          helpUsed,
          visited,
        }) => ({
          index,
          answerIndex,
          ...(dominoTop != null ? { dominoTop } : {}),
          ...(dominoBottom != null ? { dominoBottom } : {}),
          ...(numericValue != null ? { numericValue } : {}),
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

  private buildReactivityRawResult(
    seed: string,
    stimuli: ReactivityStimulusAnswerDto[],
    waitPresses: ReactivityWaitPressDto[],
  ): ReactivityRawResultDto {
    const stimulusCount = generateReactivitySession(seed).length;
    const distinctIndexes = new Set(stimuli.map((stimulus) => stimulus.index));
    if (
      distinctIndexes.size !== stimuli.length ||
      stimuli.length > stimulusCount ||
      stimuli.some((stimulus) => stimulus.index >= stimulusCount)
    ) {
      throw new BadRequestException(
        'Stimulus answers must target distinct stimuli of the targeted axis',
      );
    }
    return {
      axis: AxisType.REACTIVITY,
      stimuli: stimuli.map(({ index, commandPressed, trMs }) => ({
        index,
        commandPressed,
        trMs,
      })),
      waitPresses: waitPresses.map(({ atMs }) => ({ atMs })),
    };
  }

  private scoreMotricityTrajectories(
    seed: string,
    trajectories: MotricityCourseTrajectoryDto[],
    controlModality: ControlModality | null,
  ): {
    rawResult: MotorSkillsMetrics;
    score: { normalizedScore: number; band: ScoreBand };
  } {
    const distinctIndexes = new Set(
      trajectories.map((trajectory) => trajectory.index),
    );
    if (
      distinctIndexes.size !== trajectories.length ||
      trajectories.some(
        (trajectory) => trajectory.index >= MOTRICITY_COURSE_COUNT,
      )
    ) {
      throw new BadRequestException(
        'Trajectories must target distinct courses of the targeted axis',
      );
    }
    const courses = generateMotricityCourses(seed);
    const samplesByIndex = new Map(
      trajectories.map((trajectory) => [trajectory.index, trajectory.samples]),
    );
    const allFinished = courses.every((course) =>
      motricityCourseFinished(course, samplesByIndex.get(course.index) ?? []),
    );
    if (!allFinished) {
      throw new ConflictException('The session content is not fully played');
    }
    const scored = scoreMotricitySession(trajectories, seed);
    return {
      rawResult: deriveMotorSkillsMetrics(trajectories, seed, controlModality),
      score: {
        normalizedScore: scored.score,
        band: avisFromScore(scored.score),
      },
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
    if (session.axisResults.some((result) => result.completedAt === null)) {
      throw new ConflictException(
        'Every axis must be fully played before completing the session',
      );
    }
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

  async list(
    userId: string,
    query: ListSessionsQuery,
  ): Promise<SessionHistoryPageDto> {
    if (query.mode && query.axis) {
      throw new BadRequestException(
        'The mode and axis filters are mutually exclusive',
      );
    }
    const rows = await this.repository.listHistory(userId, {
      mode: query.mode,
      axis: query.axis,
      cursor: query.cursor,
      take: SESSION_HISTORY_PAGE_SIZE + 1,
    });
    const hasMore = rows.length > SESSION_HISTORY_PAGE_SIZE;
    const items = rows
      .slice(0, SESSION_HISTORY_PAGE_SIZE)
      .map(toSessionHistoryItemDto);
    return {
      items,
      nextCursor: hasMore ? items[items.length - 1].id : null,
    };
  }

  async current(userId: string): Promise<CurrentSessionDto | null> {
    const session = await this.repository.findCurrentSession(userId);
    return session ? toCurrentSessionDto(session) : null;
  }

  async get(userId: string, sessionId: string): Promise<SessionDto> {
    return toSessionDto(await this.loadOwnedSession(sessionId, userId));
  }

  async simulationSummary(
    userId: string,
    sessionId: string,
  ): Promise<SimulationSummaryDto> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (mapEnumValue(SessionMode, session.mode) !== SessionMode.FULL) {
      throw new NotFoundException('Session is not a full simulation');
    }
    if (mapEnumValue(SessionStatus, session.status) !== SessionStatus.COMPLETED) {
      throw new ConflictException('Session is not completed');
    }
    const sector = mapEnumValue(Sector, session.sector);
    const config = await this.repository.findSectorConfig(sector);
    if (!config) {
      throw new BadRequestException('Sector configuration is missing');
    }
    const criticalByAxis = new Map(
      config.weights.map((weight) => [weight.axis, weight.isCritical]),
    );
    const findingsByAxis: AxisFindingsEntry[] = [];
    const axes = [...session.axisResults]
      .sort((a, b) => a.order - b.order)
      .map((result) => {
        const axis = mapEnumValue(AxisType, result.axis);
        if (result.normalizedScore === null || result.band === null) {
          throw new ConflictException('Session is not completed');
        }
        const isCritical = criticalByAxis.get(axis) ?? false;
        const analysis = this.axisAnalysis(
          axis,
          this.logicContentContext(session),
          result.metrics,
        );
        findingsByAxis.push({ axis, findings: analysis.findings });
        return {
          axis,
          score: Math.round(result.normalizedScore),
          band: mapEnumValue(ScoreBand, result.band),
          isCritical,
          eliminatoryThreshold: isCritical ? config.eliminatoryThreshold : null,
          vigilanceThreshold: config.vigilanceThreshold,
          observables: analysis.observables,
        };
      });
    const globalScore = session.globalScore ?? 0;
    const eliminatoryAxes = axes
      .filter(
        (entry) =>
          entry.isCritical && entry.score < config.eliminatoryThreshold,
      )
      .map((entry) => entry.axis);
    const outcomes = axes.map(({ axis, score, band, isCritical }) => ({
      axis,
      score,
      band,
      isCritical,
    }));
    const selection = buildSimulationSummary(
      outcomes,
      {
        vigilanceThreshold: config.vigilanceThreshold,
        eliminatoryThreshold: config.eliminatoryThreshold,
      },
      findingsByAxis,
    );
    return {
      sessionId: session.id,
      sector,
      completedAt: (session.completedAt ?? session.startedAt).toISOString(),
      globalScore,
      globalBand: session.globalBand
        ? mapEnumValue(ScoreBand, session.globalBand)
        : avisFromScore(globalScore),
      isAdmissible: session.isAdmissible ?? false,
      isEliminated: session.isEliminated ?? false,
      admissibilityThreshold: session.sectorThreshold,
      admissibilityGap:
        Math.round((globalScore - session.sectorThreshold) * 10) / 10,
      eliminatoryAxes,
      axes,
      selection,
      appreciation: buildSimulationAppreciation(
        {
          sectorLabel: SECTOR_LABELS[sector],
          globalScore,
          admissibilityThreshold: session.sectorThreshold,
          eliminatoryThreshold: config.eliminatoryThreshold,
          isEliminated: session.isEliminated ?? false,
        },
        outcomes,
        selection,
        findingsByAxis,
      ),
    };
  }

  private axisAnalysis(
    axis: AxisType,
    context: LogicContentContext,
    metrics: unknown,
  ): { observables: SimulationObservableDto[]; findings: AxisFinding[] } {
    const seed = context.seed;
    if (axis === AxisType.LOGIC) {
      const responses = this.logicItemsFromMetrics(metrics);
      const isV2 = context.contentVersion >= LOGIC_CONTENT_VERSION_V2;
      const v2Items = isV2
        ? generateLogicSession(seed, context.logicFamily, context.contentVersion)
        : null;
      const items = v2Items
        ? v2Items.map((item) => ({
            index: item.index,
            ruleId: item.rule.id,
            difficulty: item.difficulty,
            sequence: [],
            choices: [],
            answerIndex: 0,
            points: item.points,
          }))
        : generateLegacyLogicSession(seed);
      const scored = v2Items
        ? scoreLogicSession(v2Items, responses)
        : scoreLegacyLogicSession(items, responses);
      const answered = scored.correctCount + scored.wrongCount;
      const total = items.length;
      return {
        observables: [
          { label: null, value: `${answered}/${total}`, caption: 'items' },
          {
            label: null,
            value: `${Math.round(scored.precision)} %`,
            caption: 'de précision',
          },
        ],
        findings: analyzeLogic(items, scored, responses),
      };
    }
    if (axis === AxisType.MEMORY) {
      const sequences = generateMemorySession(seed);
      const scored = scoreMemorySession(
        sequences,
        this.memorySequencesFromMetrics(metrics),
      );
      const bestLength = (phase: MemoryPhase) =>
        sequences.reduce(
          (best, sequence, index) =>
            sequence.phase === phase &&
            scored.results[index]?.status === 'PERFECT'
              ? Math.max(best, sequence.length)
              : best,
          0,
        );
      return {
        observables: [
          {
            label: 'restitution normale',
            value: `${bestLength(MemoryPhase.NORMAL)}`,
            caption: null,
          },
          {
            label: 'inversée',
            value: `${bestLength(MemoryPhase.INVERSE)}`,
            caption: null,
          },
        ],
        findings: analyzeMemory(sequences, scored),
      };
    }
    if (axis === AxisType.VISUAL_DISCRIMINATION) {
      const trials = generateDiscriminationSession(seed);
      const scored = scoreDiscriminationSession(
        trials,
        this.discriminationTrialsFromMetrics(metrics),
      );
      const identicalCount = trials.filter((trial) => trial.identical).length;
      const falseAlerts = scored.outcomes.filter(
        (outcome) => outcome === 'FALSE_POSITIVE',
      ).length;
      const falseAlertPct =
        identicalCount === 0
          ? 0
          : Math.round((falseAlerts / identicalCount) * 100);
      return {
        observables: [
          {
            label: null,
            value: `${scored.correctCount}/${trials.length}`,
            caption: null,
          },
          {
            label: 'fausses alertes',
            value: `${falseAlertPct} %`,
            caption: null,
          },
        ],
        findings: analyzeDiscrimination(scored),
      };
    }
    if (axis === AxisType.REACTIVITY) {
      const reactivity = this.reactivityFromMetrics(metrics);
      const scored = scoreReactivitySession(
        generateReactivitySession(seed),
        reactivity.stimuli,
        reactivity.waitPresses,
      );
      return {
        observables: [
          {
            label: 'TR moyen',
            value:
              scored.trMoyMs === null
                ? '-'
                : `${Math.round(scored.trMoyMs)} ms`,
            caption: null,
          },
          {
            label: 'régularité',
            value:
              scored.sdMs === null ? '-' : `± ${Math.round(scored.sdMs)} ms`,
            caption: null,
          },
        ],
        findings: analyzeReactivity(scored),
      };
    }
    const motor = this.motorMetricsFromRow(metrics, null);
    return {
      observables: [
        {
          label: null,
          value: `${motor.coursesCompleted}/${MOTRICITY_COURSE_COUNT}`,
          caption: 'parcours',
        },
        {
          label: 'erreurs mineures',
          value: `${motor.minorErrors}`,
          caption: null,
        },
        { label: 'majeures', value: `${motor.majorErrors}`, caption: null },
      ],
      findings: analyzeMotricity(motor),
    };
  }

  async results(userId: string, sessionId: string): Promise<SessionResultDto> {
    const session = await this.loadOwnedSession(sessionId, userId);
    if (mapEnumValue(SessionStatus, session.status) !== SessionStatus.COMPLETED) {
      throw new ConflictException('Session is not completed');
    }
    return toSessionResultDto(session);
  }

  async targetedResult(
    userId: string,
    sessionId: string,
    axis: AxisType,
  ): Promise<TargetedAxisResultDto> {
    if (
      axis !== AxisType.LOGIC &&
      axis !== AxisType.MEMORY &&
      axis !== AxisType.VISUAL_DISCRIMINATION &&
      axis !== AxisType.REACTIVITY &&
      axis !== AxisType.MOTOR_SKILLS
    ) {
      throw new BadRequestException(
        'Axis results are only available for scored axes',
      );
    }
    const session = await this.loadOwnedSession(sessionId, userId);
    const mode = mapEnumValue(SessionMode, session.mode);
    if (mode !== SessionMode.TARGETED && mode !== SessionMode.FULL) {
      throw new BadRequestException(
        'Only a targeted or full session exposes an axis result',
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
        if (axis === AxisType.MOTOR_SKILLS) {
          continue;
        }
        const computed = this.scoreAxisFromMetrics(
          axis,
          this.logicContentContext(row.session),
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
    let entry = scoredHistory.find(
      (candidate) => candidate.sessionId === sessionId,
    );
    if (!entry) {
      if (axisRow.normalizedScore === null) {
        throw new BadRequestException(
          'The session has no result for this axis',
        );
      }
      entry = {
        sessionId,
        score: Math.round(axisRow.normalizedScore),
        completedAt: (
          axisRow.completedAt ??
          session.completedAt ??
          session.startedAt
        ).getTime(),
      };
    }
    const others = scoredHistory.filter(
      (candidate) =>
        candidate.sessionId !== sessionId &&
        candidate.completedAt < entry.completedAt,
    );
    const othersBest =
      others.length > 0 ? Math.max(...others.map(({ score }) => score)) : null;
    const excludedFromBest = session.logicFamily != null;
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
      bestScore: excludedFromBest
        ? entry.score
        : othersBest === null
          ? entry.score
          : Math.max(othersBest, entry.score),
      isNewBest:
        !excludedFromBest && othersBest !== null && entry.score > othersBest,
      isEqualBest:
        !excludedFromBest && othersBest !== null && entry.score === othersBest,
      previousBestScore: excludedFromBest ? null : othersBest,
    };
    if (axis === AxisType.LOGIC) {
      const answers = this.logicItemsFromMetrics(axisRow.metrics);
      const logicFamily = session.logicFamily
        ? mapEnumValue(LogicFamilyFilter, session.logicFamily)
        : null;
      const families =
        session.contentVersion >= LOGIC_CONTENT_VERSION_V2
          ? computeLogicFamilyAggregates(
              generateLogicSession(
                session.seed,
                logicFamily,
                session.contentVersion,
              ),
              answers,
              logicFamily,
            )
          : undefined;
      return {
        ...base,
        axis: AxisType.LOGIC,
        items: answers,
        contentVersion: session.contentVersion,
        logicFamily,
        ...(families ? { families } : {}),
      };
    }
    if (axis === AxisType.MEMORY) {
      return {
        ...base,
        axis: AxisType.MEMORY,
        sequences: this.memorySequencesFromMetrics(axisRow.metrics),
      };
    }
    if (axis === AxisType.VISUAL_DISCRIMINATION) {
      return {
        ...base,
        axis: AxisType.VISUAL_DISCRIMINATION,
        trials: this.discriminationTrialsFromMetrics(axisRow.metrics),
      };
    }
    if (axis === AxisType.MOTOR_SKILLS) {
      return {
        ...base,
        axis: AxisType.MOTOR_SKILLS,
        metrics: this.motorMetricsFromRow(
          axisRow.metrics,
          session.controlModality
            ? mapEnumValue(ControlModality, session.controlModality)
            : null,
        ),
      };
    }
    const reactivity = this.reactivityFromMetrics(axisRow.metrics);
    return {
      ...base,
      axis: AxisType.REACTIVITY,
      stimuli: reactivity.stimuli,
      waitPresses: reactivity.waitPresses,
    };
  }

  private motorMetricsFromRow(
    metrics: unknown,
    sessionModality: ControlModality | null,
  ): MotorSkillsMetrics {
    const raw = (metrics ?? {}) as Partial<MotorSkillsMetrics>;
    const courses = Array.isArray(raw.courses) ? raw.courses : [];
    const sum = (select: (course: (typeof courses)[number]) => number) =>
      courses.reduce((total, course) => total + select(course), 0);
    return {
      axis: AxisType.MOTOR_SKILLS,
      minorErrors: raw.minorErrors ?? sum((course) => course.minorErrors),
      majorErrors: raw.majorErrors ?? sum((course) => course.majorErrors),
      totalTimeMs: raw.totalTimeMs ?? sum((course) => course.tReelMs),
      coursesCompleted:
        raw.coursesCompleted ??
        courses.filter((course) => course.progressionPct >= 100).length,
      controlModality: raw.controlModality ?? sessionModality,
      ...(raw.handIndependence !== undefined
        ? { handIndependence: raw.handIndependence }
        : {}),
      courses,
      timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
      events: Array.isArray(raw.events) ? raw.events : [],
    };
  }

  private scoreAxisFromMetrics(
    axis:
      | AxisType.LOGIC
      | AxisType.MEMORY
      | AxisType.VISUAL_DISCRIMINATION
      | AxisType.REACTIVITY,
    context: LogicContentContext,
    metrics: unknown,
  ): { normalizedScore: number; band: ScoreBand } {
    const seed = context.seed;
    if (axis === AxisType.LOGIC) {
      return this.scoreLogicAnswers(context, this.logicItemsFromMetrics(metrics));
    }
    if (axis === AxisType.MEMORY) {
      return this.scoreMemoryAnswers(
        seed,
        this.memorySequencesFromMetrics(metrics),
      );
    }
    if (axis === AxisType.VISUAL_DISCRIMINATION) {
      return this.scoreDiscriminationAnswers(
        seed,
        this.discriminationTrialsFromMetrics(metrics),
      );
    }
    const reactivity = this.reactivityFromMetrics(metrics);
    return this.scoreReactivityAnswers(
      seed,
      reactivity.stimuli,
      reactivity.waitPresses,
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

  private reactivityFromMetrics(metrics: unknown): {
    stimuli: ReactivityStimulusAnswerDto[];
    waitPresses: ReactivityWaitPressDto[];
  } {
    const raw = metrics as ReactivityRawResultDto | null;
    if (!raw || raw.axis !== AxisType.REACTIVITY) {
      return { stimuli: [], waitPresses: [] };
    }
    return {
      stimuli: Array.isArray(raw.stimuli) ? raw.stimuli : [],
      waitPresses: Array.isArray(raw.waitPresses) ? raw.waitPresses : [],
    };
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
