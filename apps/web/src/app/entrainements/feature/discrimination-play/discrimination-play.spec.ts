import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  Router,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  CompleteTargetedSessionDto,
  DiscriminationAnswer,
  DiscriminationTrialAnswerDto,
  FULL_SESSION_AXIS_ORDER,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { RESULT_WAIT_DIRECT_REVEAL_MS } from '../../data-access/result-wait.orchestrator';
import { DiscriminationPlay } from './discrimination-play';

const SESSION_ID = 'session-exam-discrimination';
const STARTED_AT = '2026-09-19T08:00:00.000Z';
const COMPLETED_AT = '2026-09-19T08:02:00.000Z';
const DISCRIMINATION_TRAINING = AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION];
const TRIAL_COUNT = DISCRIMINATION_TRAINING.exerciseCount;
const AXIS_DURATION_MS = DISCRIMINATION_TRAINING.timer.durationSec * 1000;
const TRIAL_PACE_MS = 700;
const NETWORK_ERROR_STATUS = 0;
const READING_THE_ERROR_MS = 30000;
const CLOCK_CORRECTION_MS = 90000;
const TRIALS_BEFORE_SECOND_CLOCK_CORRECTION = 10;
const INSISTENT_ATTEMPTS = 5;
const EXAM_HUB_ROUTE = ['/entrainements/examen-blanc/session', SESSION_ID];

function buildExamSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-exam-discrimination',
    contentVersion: 1,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 5,
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: STARTED_AT,
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: FULL_SESSION_AXIS_ORDER.map((axis, order) => ({
      axis,
      order,
      normalizedScore: null,
      band: null,
      skipped: false,
      metrics: null,
      startedAt: STARTED_AT,
      completedAt: null,
    })),
    recommendations: [],
    ...overrides,
  };
}

function buildSessionAfterDiscrimination(): SessionDto {
  const session = buildExamSession({ currentAxisIndex: 1 });
  session.axisResults[0].completedAt = COMPLETED_AT;
  return session;
}

type CompletionOutcome = () => Observable<SessionDto>;

const accepted: CompletionOutcome = () => of(buildSessionAfterDiscrimination());

function rejected(status: number): CompletionOutcome {
  return () => throwError(() => new HttpErrorResponse({ status }));
}

interface Submission {
  sessionId: string;
  axis: AxisType;
  body: CompleteTargetedSessionDto;
}

interface Setup {
  fixture: ComponentFixture<DiscriminationPlay>;
  element: HTMLElement;
  completeTargeted: ReturnType<typeof vi.fn>;
  submissions: Submission[];
  navigate: ReturnType<typeof vi.spyOn>;
}

async function setup(
  outcomes: CompletionOutcome[],
  session: SessionDto = buildExamSession(),
): Promise<Setup> {
  const submissions: Submission[] = [];
  const completeTargeted = vi.fn(
    (sessionId: string, axis: AxisType, body: CompleteTargetedSessionDto) => {
      submissions.push({ sessionId, axis, body: structuredClone(body) });
      const outcome = outcomes[submissions.length - 1] ?? accepted;
      return outcome();
    },
  );
  await TestBed.configureTestingModule({
    imports: [DiscriminationPlay],
    providers: [
      provideRouter([]),
      {
        provide: SessionsApi,
        useValue: {
          start: vi.fn(),
          get: vi.fn(() => of(session)),
          completeTargeted,
        },
      },
      { provide: EnergyFacade, useValue: { load: vi.fn(() => of(null)) } },
      {
        provide: AuthFacade,
        useValue: { currentUser: () => ({ currentSector: Sector.RAILWAY }) },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({ sessionId: SESSION_ID }) },
        },
      },
    ],
  }).compileComponents();
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(DiscriminationPlay);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  return { fixture, element, completeTargeted, submissions, navigate };
}

async function setupPlaying(outcomes: CompletionOutcome[]): Promise<Setup> {
  const result = await setup(outcomes);
  (
    result.element.querySelector('.countdown__skip') as HTMLButtonElement
  ).click();
  result.fixture.detectChanges();
  return result;
}

function advance(setupResult: Setup, ms: number): void {
  vi.advanceTimersByTime(ms);
  setupResult.fixture.detectChanges();
}

function pressKey(setupResult: Setup, key: string): void {
  document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  setupResult.fixture.detectChanges();
}

function tapAnswer(setupResult: Setup, answer: DiscriminationAnswer): void {
  const selector =
    answer === 'DIFFERENT'
      ? '.discri__answer--different'
      : '.discri__answer:not(.discri__answer--different)';
  (setupResult.element.querySelector(selector) as HTMLButtonElement).click();
  setupResult.fixture.detectChanges();
}

const ANSWER_GESTURES: ((setupResult: Setup) => DiscriminationAnswer)[] = [
  (setupResult) => {
    tapAnswer(setupResult, 'IDENTICAL');
    return 'IDENTICAL';
  },
  (setupResult) => {
    pressKey(setupResult, 'ArrowRight');
    return 'DIFFERENT';
  },
  (setupResult) => {
    tapAnswer(setupResult, 'DIFFERENT');
    return 'DIFFERENT';
  },
  (setupResult) => {
    pressKey(setupResult, 'ArrowLeft');
    return 'IDENTICAL';
  },
];

function answerTrials(
  setupResult: Setup,
  count: number,
  firstIndex = 0,
): DiscriminationAnswer[] {
  const given: DiscriminationAnswer[] = [];
  for (let index = firstIndex; index < firstIndex + count; index += 1) {
    advance(setupResult, TRIAL_PACE_MS);
    given.push(ANSWER_GESTURES[index % ANSWER_GESTURES.length](setupResult));
  }
  return given;
}

function pacedEntries(
  given: DiscriminationAnswer[],
): DiscriminationTrialAnswerDto[] {
  return given.map((answer, index) => ({
    index,
    answer,
    timeMs: TRIAL_PACE_MS,
  }));
}

function overlay(element: HTMLElement): HTMLElement | null {
  return element.querySelector('ui-result-wait .wait');
}

function retryButton(element: HTMLElement): HTMLButtonElement {
  return element.querySelector('.wait__retry') as HTMLButtonElement;
}

function submittedTrials(
  submission: Submission,
): DiscriminationTrialAnswerDto[] {
  return submission.body.trials ?? [];
}

class ResizeObserverStub implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
}

describe('DiscriminationPlay (examen blanc, premier axe)', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.inject(TrainingSessionFacade).clear();
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('shows the failed overlay when the timer expires on a rejected completion and re-sends the same 36 trials on retry', async () => {
    const result = await setupPlaying([rejected(HttpStatusCode.Forbidden)]);
    const given = answerTrials(result, 3);

    advance(result, AXIS_DURATION_MS - given.length * TRIAL_PACE_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(result.navigate).not.toHaveBeenCalled();
    expect(overlay(result.element)?.classList).toContain('wait--failed');
    expect(result.element.querySelector('.wait__title')?.textContent).toContain(
      "L'envoi de vos réponses n'a pas abouti.",
    );
    expect(
      result.element.querySelector('.wait__quit')?.textContent?.trim(),
    ).toBe('Quitter sans envoyer');

    const [first] = result.submissions;
    expect(first.sessionId).toBe(SESSION_ID);
    expect(first.axis).toBe(AxisType.VISUAL_DISCRIMINATION);
    expect(first.body.playedMs).toBe(AXIS_DURATION_MS);
    const trials = submittedTrials(first);
    expect(trials).toHaveLength(TRIAL_COUNT);
    expect(trials.map((trial) => trial.index)).toEqual(
      Array.from({ length: TRIAL_COUNT }, (_, index) => index),
    );
    expect(trials.slice(0, given.length)).toEqual(pacedEntries(given));
    expect(
      trials
        .slice(given.length)
        .every((trial) => trial.answer === null && trial.timeMs === 0),
    ).toBe(true);

    advance(result, READING_THE_ERROR_MS);
    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(overlay(result.element)?.classList).toContain('wait--failed');

    retryButton(result.element).click();
    result.fixture.detectChanges();

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    expect(result.submissions[1]).toEqual(first);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('ignores answer taps and arrow keys after a rejected completion and retries with an identical payload', async () => {
    const result = await setupPlaying([rejected(HttpStatusCode.Forbidden)]);
    const given = answerTrials(result, TRIAL_COUNT);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(overlay(result.element)?.classList).toContain('wait--failed');
    expect(result.navigate).not.toHaveBeenCalled();

    for (let attempt = 0; attempt < INSISTENT_ATTEMPTS; attempt += 1) {
      advance(result, TRIAL_PACE_MS);
      tapAnswer(result, 'IDENTICAL');
      tapAnswer(result, 'DIFFERENT');
      pressKey(result, 'ArrowLeft');
      pressKey(result, 'ArrowRight');
    }
    TestBed.inject(TrainingSessionFacade).requestClose();
    result.fixture.detectChanges();
    advance(result, AXIS_DURATION_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(result.navigate).not.toHaveBeenCalled();
    expect(result.element.querySelector('app-exit-confirm')).toBeNull();
    expect(overlay(result.element)?.classList).toContain('wait--failed');
    expect(
      result.element.querySelector('.discri__counter-value')?.textContent,
    ).toContain(`${TRIAL_COUNT}/${TRIAL_COUNT}`);

    retryButton(result.element).click();
    result.fixture.detectChanges();

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    const [first, second] = result.submissions;
    expect(submittedTrials(first)).toEqual(pacedEntries(given));
    expect(second).toEqual(first);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('never reports a negative trial time when the device clock jumps backwards', async () => {
    const result = await setupPlaying([accepted]);

    vi.setSystemTime(Date.now() - CLOCK_CORRECTION_MS);
    answerTrials(result, TRIALS_BEFORE_SECOND_CLOCK_CORRECTION);
    vi.setSystemTime(Date.now() - CLOCK_CORRECTION_MS);
    answerTrials(
      result,
      TRIAL_COUNT - TRIALS_BEFORE_SECOND_CLOCK_CORRECTION,
      TRIALS_BEFORE_SECOND_CLOCK_CORRECTION,
    );

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [submission] = result.submissions;
    const trials = submittedTrials(submission);
    expect(trials).toHaveLength(TRIAL_COUNT);
    expect(trials.filter((trial) => trial.timeMs < 0)).toEqual([]);
    expect(trials.every((trial) => Number.isInteger(trial.timeMs))).toBe(true);
    expect(trials[0].timeMs).toBe(0);
    expect(trials[1].timeMs).toBe(TRIAL_PACE_MS);
    expect(trials[TRIALS_BEFORE_SECOND_CLOCK_CORRECTION].timeMs).toBe(0);
    expect(trials[TRIALS_BEFORE_SECOND_CLOCK_CORRECTION + 1].timeMs).toBe(
      TRIAL_PACE_MS,
    );
    expect(submission.body.playedMs).toBeGreaterThanOrEqual(0);
    expect(overlay(result.element)).toBeNull();
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('keeps the failed overlay while offline and sends a single request for a double-clicked retry', async () => {
    const pendingRetry = new Subject<SessionDto>();
    const result = await setupPlaying([
      rejected(NETWORK_ERROR_STATUS),
      rejected(NETWORK_ERROR_STATUS),
      () => pendingRetry,
    ]);
    answerTrials(result, TRIAL_COUNT);

    retryButton(result.element).click();
    result.fixture.detectChanges();
    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    expect(overlay(result.element)?.classList).toContain('wait--failed');
    expect(result.navigate).not.toHaveBeenCalled();

    const retry = retryButton(result.element);
    retry.click();
    retry.click();
    result.fixture.detectChanges();
    expect(result.completeTargeted).toHaveBeenCalledTimes(3);
    expect(overlay(result.element)).not.toBeNull();
    expect(overlay(result.element)?.classList).not.toContain('wait--failed');
    expect(result.element.querySelector('.wait__retry')).toBeNull();

    pendingRetry.next(buildSessionAfterDiscrimination());
    pendingRetry.complete();
    result.fixture.detectChanges();

    const [first, second, third] = result.submissions;
    expect(submittedTrials(first)).toHaveLength(TRIAL_COUNT);
    expect(second).toEqual(first);
    expect(third).toEqual(first);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('leaves for the dashboard without another request when the candidate quits the failed overlay', async () => {
    const result = await setupPlaying([rejected(NETWORK_ERROR_STATUS)]);
    answerTrials(result, TRIAL_COUNT);

    (result.element.querySelector('.wait__quit') as HTMLButtonElement).click();
    result.fixture.detectChanges();

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('reveals the wait overlay only once a non-last exam axis completion turns slow, then goes to the exam hub', async () => {
    const slowCompletion = new Subject<SessionDto>();
    const result = await setupPlaying([() => slowCompletion]);
    answerTrials(result, TRIAL_COUNT);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(overlay(result.element)).toBeNull();

    advance(result, RESULT_WAIT_DIRECT_REVEAL_MS - 1);
    expect(overlay(result.element)).toBeNull();

    advance(result, 1);
    expect(overlay(result.element)).not.toBeNull();
    expect(overlay(result.element)?.classList).not.toContain('wait--failed');

    tapAnswer(result, 'IDENTICAL');
    pressKey(result, 'ArrowRight');
    expect(result.completeTargeted).toHaveBeenCalledTimes(1);

    slowCompletion.next(buildSessionAfterDiscrimination());
    slowCompletion.complete();
    result.fixture.detectChanges();

    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('sends a reloaded completed exam to its result page and replaces the play url', async () => {
    const result = await setup(
      [],
      buildExamSession({
        status: SessionStatus.COMPLETED,
        currentAxisIndex: FULL_SESSION_AXIS_ORDER.length - 1,
        completedAt: COMPLETED_AT,
      }),
    );

    expect(result.element.querySelector('.countdown__skip')).toBeNull();
    expect(result.completeTargeted).not.toHaveBeenCalled();
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(
      ['/sessions', SESSION_ID, 'resultat'],
      { replaceUrl: true },
    );
  });
});
