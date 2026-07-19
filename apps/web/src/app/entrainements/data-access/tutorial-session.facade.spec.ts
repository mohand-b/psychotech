import {
  EnvironmentInjector,
  createEnvironmentInjector,
  runInInjectionContext,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  AxisType,
  LogicFamily,
  LogicNumericStructure,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  TUTORIAL_SEED,
} from '@psychotech/shared';
import { AuthFacade } from '../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../energy/data-access/energy.facade';
import { SessionsApi } from '../../sessions/data-access/sessions.api';
import { TrainingSessionFacade } from '../../sessions/data-access/training-session.facade';
import { TrainingSessionStore } from '../../sessions/data-access/training-session.store';
import { TutorialRunFacade } from './tutorial-run.facade';
import {
  TUTORIAL_SESSION_ID,
  TutorialSessionFacade,
  tutorialSessionProviders,
} from './tutorial-session.facade';

function buildSuspendedSession(): SessionDto {
  return {
    id: 'session-suspendue',
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-reelle',
    contentVersion: 1,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 5,
    currentAxisIndex: 1,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-07-13T10:00:00.000Z',
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [],
    recommendations: [],
  };
}

describe('TutorialSessionFacade', () => {
  let api: {
    start: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    completeTargeted: ReturnType<typeof vi.fn>;
  };
  let rootFacade: TrainingSessionFacade;
  let tutorialInjector: EnvironmentInjector;
  let facade: TrainingSessionFacade;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup(axis?: AxisType): void {
    TestBed.resetTestingModule();
    api = { start: vi.fn(), get: vi.fn(), completeTargeted: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: SessionsApi, useValue: api },
        {
          provide: EnergyFacade,
          useValue: { load: vi.fn(), state: () => null },
        },
        {
          provide: AuthFacade,
          useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
        },
      ],
    });
    rootFacade = TestBed.inject(TrainingSessionFacade);
    tutorialInjector = createEnvironmentInjector(
      tutorialSessionProviders(
        axis as Parameters<typeof tutorialSessionProviders>[0],
      ),
      TestBed.inject(EnvironmentInjector),
    );
    facade = tutorialInjector.get(TrainingSessionFacade);
  }

  it('provides a tutorial facade without touching the root session store', () => {
    setup();
    TestBed.inject(TrainingSessionStore).setSession(buildSuspendedSession());

    expect(facade).toBeInstanceOf(TutorialSessionFacade);
    runInInjectionContext(tutorialInjector, () => {
      facade.startTargeted(AxisType.LOGIC).subscribe();
      facade.completeTargeted([]).subscribe();
    });

    expect(rootFacade.session()?.id).toBe('session-suspendue');
    expect(rootFacade.session()?.status).toBe(SessionStatus.IN_PROGRESS);
    expect(facade.session()?.id).toBe(TUTORIAL_SESSION_ID);
    expect(facade.session()?.status).toBe(SessionStatus.COMPLETED);
  });

  it('never calls the sessions api during a tutorial', () => {
    setup(AxisType.LOGIC);
    runInInjectionContext(tutorialInjector, () => {
      facade.load(TUTORIAL_SESSION_ID).subscribe();
      facade.completeTargeted([]).subscribe();
    });
    expect(api.start).not.toHaveBeenCalled();
    expect(api.get).not.toHaveBeenCalled();
    expect(api.completeTargeted).not.toHaveBeenCalled();
  });

  it('serves the mixed logic tutorial with its five-family composition', () => {
    setup(AxisType.LOGIC);
    const items = facade.logicItems();
    expect(items.map((item) => item.family)).toEqual([
      LogicFamily.NUMERIC,
      LogicFamily.NUMERIC,
      LogicFamily.DOMINO,
      LogicFamily.MATRIX_I,
      LogicFamily.MATRIX_II,
    ]);
    const first = items[0];
    const second = items[1];
    expect(
      first.family === LogicFamily.NUMERIC ? first.structure : null,
    ).toBe(LogicNumericStructure.SEQUENCE);
    expect(
      second.family === LogicFamily.NUMERIC ? second.structure : null,
    ).toBe(LogicNumericStructure.TRIANGLE);
  });

  it('serves the reduced deterministic content per axis', () => {
    setup(AxisType.LOGIC);
    expect(facade.session()?.seed).toBe(TUTORIAL_SEED);
    expect(facade.logicItems()).toHaveLength(5);
    expect(facade.durationSec()).toBe(60);

    setup(AxisType.MEMORY);
    expect(facade.memorySequences()).toHaveLength(1);
    expect(facade.memorySequences()[0].elements).toHaveLength(5);

    setup(AxisType.VISUAL_DISCRIMINATION);
    expect(facade.discriminationTrials()).toHaveLength(5);
    expect(facade.durationSec()).toBe(60);

    setup(AxisType.REACTIVITY);
    expect(facade.durationSec()).toBe(30);
    expect(facade.reactivityStimuli().length).toBeGreaterThan(0);

    setup(AxisType.MOTOR_SKILLS);
    expect(facade.motricityCourses()).toHaveLength(1);
  });

  it('records the run for the end screen when completing', () => {
    setup(AxisType.VISUAL_DISCRIMINATION);
    const runFacade = TestBed.inject(TutorialRunFacade);
    runInInjectionContext(tutorialInjector, () => {
      facade.completeTargetedDiscrimination([]).subscribe();
    });
    expect(runFacade.result()?.axis).toBe(AxisType.VISUAL_DISCRIMINATION);
  });
});
