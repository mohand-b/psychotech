import { Injectable, InjectionToken, Provider, inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import {
  AXIS_TUTORIAL,
  AxisTraining,
  AxisType,
  DiscriminationTrialAnswerDto,
  LOGIC_CONTENT_VERSION_V2,
  LogicItemAnswerDto,
  LogicItem,
  MOTRICITY_TUTORIAL_START_WIDTH,
  MemorySequenceAnswerDto,
  MotricityCourseTrajectoryDto,
  MotricityGenerationOptions,
  RailwayPlayableAxis,
  ReactivityStimulusAnswerDto,
  ReactivityWaitPressDto,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  TUTORIAL_SEED,
  TargetedAxisResultDto,
  generateLogicTutorial,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { TrainingSessionStore } from '../../sessions/data-access/training-session.store';
import { TutorialRunFacade } from './tutorial-run.facade';

export const TUTORIAL_SESSION_ID = 'tutoriel';

export const TUTORIAL_AXIS = new InjectionToken<RailwayPlayableAxis>(
  'TUTORIAL_AXIS',
);

export function tutorialSessionProviders(
  axis?: RailwayPlayableAxis,
): Provider[] {
  const providers: Provider[] = [
    TrainingSessionStore,
    { provide: TrainingSessionFacade, useClass: TutorialSessionFacade },
  ];
  if (axis) {
    providers.push({ provide: TUTORIAL_AXIS, useValue: axis });
  }
  return providers;
}

export const tutorialPlayResetGuard: CanActivateFn = () => {
  const facade = inject(TrainingSessionFacade);
  if (facade instanceof TutorialSessionFacade) {
    facade.resetForNewRun();
  }
  return true;
};

@Injectable()
export class TutorialSessionFacade extends TrainingSessionFacade {
  private readonly runFacade = inject(TutorialRunFacade);
  private readonly auth = inject(AuthFacade);
  private readonly presetAxis = inject(TUTORIAL_AXIS, { optional: true });

  constructor() {
    super();
    if (this.presetAxis) {
      this.installTutorialSession(this.presetAxis);
    }
  }

  resetForNewRun(): void {
    if (this.presetAxis) {
      this.installTutorialSession(this.presetAxis);
    }
  }

  protected override trainingFor(axis: AxisType): AxisTraining | undefined {
    return AXIS_TUTORIAL[axis as RailwayPlayableAxis];
  }

  protected override logicItemsFor(session: SessionDto): LogicItem[] {
    return generateLogicTutorial(session.seed);
  }

  protected override motricityGeneration(): MotricityGenerationOptions {
    return { courseCount: 1, startWidths: [MOTRICITY_TUTORIAL_START_WIDTH] };
  }

  override startTargeted(axis: AxisType): Observable<SessionDto> {
    return of(this.installTutorialSession(axis as RailwayPlayableAxis));
  }

  override startFull(): Observable<SessionDto> {
    return throwError(
      () => new Error('Un tutoriel ne démarre jamais de session complète'),
    );
  }

  override load(): Observable<SessionDto> {
    const session = this.session();
    return session
      ? of(session)
      : throwError(() => new Error('Aucun tutoriel en cours'));
  }

  override loadTargetedResult(): Observable<TargetedAxisResultDto> {
    return throwError(
      () => new Error("Un tutoriel n'a pas de résultat enregistré"),
    );
  }

  override completeTargeted(
    items: LogicItemAnswerDto[],
  ): Observable<SessionDto> {
    this.runFacade.record({ axis: AxisType.LOGIC, items });
    return this.completeLocally();
  }

  override completeTargetedMemory(
    sequences: MemorySequenceAnswerDto[],
  ): Observable<SessionDto> {
    this.runFacade.record({ axis: AxisType.MEMORY, sequences });
    return this.completeLocally();
  }

  override completeTargetedDiscrimination(
    trials: DiscriminationTrialAnswerDto[],
  ): Observable<SessionDto> {
    this.runFacade.record({ axis: AxisType.VISUAL_DISCRIMINATION, trials });
    return this.completeLocally();
  }

  override completeTargetedMotricity(
    courses: MotricityCourseTrajectoryDto[],
  ): Observable<SessionDto> {
    this.runFacade.record({ axis: AxisType.MOTOR_SKILLS, courses });
    return this.completeLocally();
  }

  override completeTargetedReactivity(
    stimuli: ReactivityStimulusAnswerDto[],
    waitPresses: ReactivityWaitPressDto[],
    playedMs: number,
  ): Observable<SessionDto> {
    this.runFacade.record({
      axis: AxisType.REACTIVITY,
      stimuli,
      waitPresses,
      playedMs,
    });
    return this.completeLocally();
  }

  private completeLocally(): Observable<SessionDto> {
    const current = this.session();
    if (!current) {
      return throwError(() => new Error('Aucun tutoriel en cours'));
    }
    const completed: SessionDto = {
      ...current,
      status: SessionStatus.COMPLETED,
      completedAt: new Date().toISOString(),
    };
    this.install(completed);
    return of(completed);
  }

  private installTutorialSession(axis: RailwayPlayableAxis): SessionDto {
    this.runFacade.clear();
    const startedAt = new Date().toISOString();
    const session: SessionDto = {
      id: TUTORIAL_SESSION_ID,
      mode: SessionMode.TARGETED,
      sector: this.auth.currentUser()?.currentSector ?? Sector.RAILWAY,
      status: SessionStatus.IN_PROGRESS,
      seed: TUTORIAL_SEED,
      contentVersion: LOGIC_CONTENT_VERSION_V2,
      logicFamily: null,
      options: { enabledOptions: [] },
      energyCost: 0,
      currentAxisIndex: 0,
      globalScore: null,
      globalBand: null,
      isAdmissible: null,
      isEliminated: null,
      sectorThreshold: 0,
      startedAt,
      completedAt: null,
      abandonedAt: null,
      controlModality: null,
      axisResults: [
        {
          axis,
          order: 0,
          normalizedScore: null,
          band: null,
          skipped: false,
          metrics: null,
          startedAt,
          completedAt: null,
        },
      ],
      recommendations: [],
    };
    this.install(session);
    return session;
  }
}
