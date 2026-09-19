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
  FULL_SESSION_AXIS_ORDER,
  MemoryPhase,
  MemorySequenceAnswerDto,
  SESSION_ENERGY_COST,
  Sector,
  SessionAxisResultDto,
  SessionDto,
  SessionMode,
  SessionStatus,
  TargetedAxisResultDto,
} from '@psychotech/shared';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { SessionsApi } from '../../../sessions/data-access/sessions.api';
import { TrainingSessionStore } from '../../../sessions/data-access/training-session.store';
import { MemoryPlay } from './memory-play';

const SESSION_ID = 'session-memory';
const SESSION_STARTED_AT = '2026-07-16T10:00:00.000Z';
const PREPARATION_MS = 2400;
const ELEMENT_TOTAL_MS = 1000;
const PHASE_TRANSITION_MS = 2000;
const RESTITUTION_TICK_MS = 200;
const THINKING_MS = 1500;
const CLOCK_DRIFT_MS = 2000;
const CLOCK_JUMP_MS = 3_600_000;
const NETWORK_DOWN_STATUS = 0;
const MEMORY_TRAINING = AXIS_TRAINING[AxisType.MEMORY];
const TRAINING_SEQUENCES = MEMORY_TRAINING.sequences;
const RESTITUTION_MS = MEMORY_TRAINING.restitutionSec * 1000;
const LAST_SEQUENCE_INDEX = TRAINING_SEQUENCES.length - 1;
const MEMORY_AXIS_INDEX = FULL_SESSION_AXIS_ORDER.indexOf(AxisType.MEMORY);
const EXAM_HUB_ROUTE = ['/entrainements/examen-blanc/session', SESSION_ID];
const VALIDATE_BUTTONS = '.memo__pad-validate button, .memo__actions button';
const VALIDATE_HOSTS =
  '.memo__pad-validate ui-button, .memo__actions ui-button';

function axisResult(
  axis: AxisType,
  order: number,
  completedAt: string | null = null,
): SessionAxisResultDto {
  return {
    axis,
    order,
    normalizedScore: null,
    band: null,
    skipped: false,
    metrics: null,
    startedAt: SESSION_STARTED_AT,
    completedAt,
  };
}

function buildSession(overrides: Partial<SessionDto> = {}): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.TARGETED,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-memory',
    contentVersion: 1,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: SESSION_ENERGY_COST[SessionMode.TARGETED],
    currentAxisIndex: 0,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: SESSION_STARTED_AT,
    completedAt: null,
    abandonedAt: null,
    controlModality: null,
    axisResults: [axisResult(AxisType.MEMORY, 0)],
    recommendations: [],
    ...overrides,
  };
}

function buildFullSession(currentAxisIndex: number): SessionDto {
  return buildSession({
    mode: SessionMode.FULL,
    energyCost: SESSION_ENERGY_COST[SessionMode.FULL],
    currentAxisIndex,
    axisResults: FULL_SESSION_AXIS_ORDER.map((axis, order) =>
      axisResult(
        axis,
        order,
        order < currentAxisIndex ? SESSION_STARTED_AT : null,
      ),
    ),
  });
}

interface Setup {
  fixture: ComponentFixture<MemoryPlay>;
  element: HTMLElement;
  completeTargeted: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  navigate: ReturnType<typeof vi.spyOn>;
}

async function setup(
  session: SessionDto = buildSession(),
  completed: SessionDto = { ...session, status: SessionStatus.COMPLETED },
): Promise<Setup> {
  const completeTargeted = vi.fn(() => of(completed));
  const get = vi.fn();
  const targetedResult = vi.fn(() =>
    of({
      sessionId: SESSION_ID,
      axis: AxisType.MEMORY,
    } as TargetedAxisResultDto),
  );
  await TestBed.configureTestingModule({
    imports: [MemoryPlay],
    providers: [
      provideRouter([]),
      {
        provide: SessionsApi,
        useValue: { start: vi.fn(), get, completeTargeted, targetedResult },
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
  TestBed.inject(TrainingSessionStore).setSession(session);
  const router = TestBed.inject(Router);
  const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(MemoryPlay);
  fixture.detectChanges();
  const element: HTMLElement = fixture.nativeElement;
  (element.querySelector('.countdown__skip') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { fixture, element, completeTargeted, get, navigate };
}

function setupExamAtMemory(): Promise<Setup> {
  return setup(
    buildFullSession(MEMORY_AXIS_INDEX),
    buildFullSession(MEMORY_AXIS_INDEX + 1),
  );
}

function installTimerAndStoreHooks(): void {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    TestBed.inject(TrainingSessionStore).setSession(null);
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
}

function advance(setupResult: Setup, ms: number): void {
  vi.advanceTimersByTime(ms);
  setupResult.fixture.detectChanges();
}

function reachRestitution(setupResult: Setup, length: number): void {
  advance(setupResult, PREPARATION_MS + length * ELEMENT_TOTAL_MS);
}

function reachRestitutionOf(setupResult: Setup, index: number): void {
  const config = TRAINING_SEQUENCES[index];
  if (
    config.phase === MemoryPhase.INVERSE &&
    TRAINING_SEQUENCES[index - 1]?.phase === MemoryPhase.NORMAL
  ) {
    advance(setupResult, PHASE_TRANSITION_MS);
  }
  reachRestitution(setupResult, config.length);
}

function pressKey(setupResult: Setup, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, cancelable: true });
  document.dispatchEvent(event);
  setupResult.fixture.detectChanges();
  return event;
}

function typeDigit(setupResult: Setup, digit: number, times: number): void {
  for (let position = 0; position < times; position += 1) {
    pressKey(setupResult, String(digit));
  }
}

function sequenceDigit(index: number): number {
  return index + 1;
}

function expectedInput(index: number): number[] {
  return Array.from({ length: TRAINING_SEQUENCES[index].length }, () =>
    sequenceDigit(index),
  );
}

function answerSequence(
  setupResult: Setup,
  index: number,
  thinkingMs = 0,
): void {
  reachRestitutionOf(setupResult, index);
  advance(setupResult, thinkingMs);
  typeDigit(
    setupResult,
    sequenceDigit(index),
    TRAINING_SEQUENCES[index].length,
  );
  pressKey(setupResult, 'Enter');
}

function answerSequencesBefore(setupResult: Setup, endIndex: number): void {
  for (let index = 0; index < endIndex; index += 1) {
    answerSequence(setupResult, index);
  }
}

function tap(setupResult: Setup, selector: string): void {
  const controls = Array.from(
    setupResult.element.querySelectorAll<HTMLElement>(selector),
  );
  expect(controls.length).toBeGreaterThan(0);
  for (const control of controls) {
    control.click();
    setupResult.fixture.detectChanges();
  }
}

function slots(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('.memo__slot'));
}

function failedOverlay(element: HTMLElement): HTMLElement | null {
  return element.querySelector<HTMLElement>('ui-result-wait .wait--failed');
}

function rejectWith(status: number): Observable<never> {
  return throwError(() => new HttpErrorResponse({ status }));
}

function sentSequences(
  setupResult: Setup,
  attempt: number,
): MemorySequenceAnswerDto[] {
  const [, , body] = setupResult.completeTargeted.mock.calls[attempt] as [
    string,
    AxisType,
    CompleteTargetedSessionDto,
  ];
  return body.sequences ?? [];
}

function expectOneAnswerPerSequence(
  sequences: MemorySequenceAnswerDto[],
): void {
  expect(sequences.map((sequence) => sequence.index)).toEqual(
    TRAINING_SEQUENCES.map((_, index) => index),
  );
}

describe('MemoryPlay (passer un emplacement)', () => {
  installTimerAndStoreHooks();

  it('marks a skipped position as a distinct empty slot and keeps typing at the next one', async () => {
    const result = await setup();
    reachRestitution(result, TRAINING_SEQUENCES[0].length);

    const skipButton = result.element.querySelector(
      '.memo__key--skip',
    ) as HTMLButtonElement;
    expect(skipButton).not.toBeNull();
    skipButton.click();
    result.fixture.detectChanges();

    let cells = slots(result.element);
    expect(cells[0].classList).toContain('memo__slot--skipped');
    expect(cells[0].classList).not.toContain('memo__slot--filled');
    expect(cells[0].textContent?.trim()).toBe('–');
    expect(cells[1].classList).toContain('memo__slot--current');

    pressKey(result, '5');
    cells = slots(result.element);
    expect(cells[1].classList).toContain('memo__slot--filled');
    expect(cells[1].textContent?.trim()).toBe('5');
  });

  it('skips from the keyboard with the space key, prevents scrolling and disables the button once full', async () => {
    const result = await setup();
    const length = TRAINING_SEQUENCES[0].length;
    reachRestitution(result, length);

    for (let position = 0; position < length; position += 1) {
      const event = pressKey(result, ' ');
      expect(event.defaultPrevented).toBe(true);
    }
    const cells = slots(result.element);
    expect(
      cells.every((cell) => cell.classList.contains('memo__slot--skipped')),
    ).toBe(true);
    expect(
      (result.element.querySelector('.memo__key--skip') as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    pressKey(result, ' ');
    expect(slots(result.element)).toHaveLength(length);
  });

  it('leaves the P key inert during restitution', async () => {
    const result = await setup();
    reachRestitution(result, TRAINING_SEQUENCES[0].length);

    const lower = pressKey(result, 'p');
    const upper = pressKey(result, 'P');

    expect(lower.defaultPrevented).toBe(false);
    expect(upper.defaultPrevented).toBe(false);
    const cells = slots(result.element);
    expect(
      cells.some(
        (cell) =>
          cell.classList.contains('memo__slot--skipped') ||
          cell.classList.contains('memo__slot--filled'),
      ),
    ).toBe(false);
    expect(cells[0].classList).toContain('memo__slot--current');
  });

  it('submits null for skipped positions without shifting the other digits', async () => {
    const result = await setup();
    for (const [index, config] of TRAINING_SEQUENCES.entries()) {
      reachRestitutionOf(result, index);
      if (index === 0) {
        pressKey(result, '7');
        pressKey(result, ' ');
        pressKey(result, '4');
        pressKey(result, '9');
      } else {
        typeDigit(result, 1, config.length);
      }
      pressKey(result, 'Enter');
    }

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const [sessionId, axis, body] = result.completeTargeted.mock.calls[0] as [
      string,
      AxisType,
      CompleteTargetedSessionDto,
    ];
    expect(sessionId).toBe(SESSION_ID);
    expect(axis).toBe(AxisType.MEMORY);
    const sequences = body.sequences ?? [];
    expect(sequences).toHaveLength(TRAINING_SEQUENCES.length);
    expect(sequences[0].input).toEqual([7, null, 4, 9]);
    expect(sequences[0].timedOut).toBe(false);
  });
});

describe("MemoryPlay (fin d'axe en examen blanc)", () => {
  installTimerAndStoreHooks();

  it('replays the frozen five sequences after a failed completion whatever the candidate presses meanwhile', async () => {
    const result = await setupExamAtMemory();
    result.completeTargeted.mockImplementationOnce(() =>
      rejectWith(HttpStatusCode.Forbidden),
    );
    answerSequencesBefore(result, TRAINING_SEQUENCES.length);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(failedOverlay(result.element)).not.toBeNull();
    const firstAttempt = structuredClone(sentSequences(result, 0));
    expectOneAnswerPerSequence(firstAttempt);

    pressKey(result, 'Enter');
    tap(result, VALIDATE_BUTTONS);
    tap(result, VALIDATE_HOSTS);
    typeDigit(result, 9, TRAINING_SEQUENCES[LAST_SEQUENCE_INDEX].length);
    pressKey(result, 'Backspace');
    tap(result, '.memo__key--erase');
    tap(result, '.memo__key--zero');
    tap(result, VALIDATE_HOSTS);
    pressKey(result, 'Enter');
    advance(result, RESTITUTION_MS + RESTITUTION_TICK_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(result.navigate).not.toHaveBeenCalled();
    expect(failedOverlay(result.element)).not.toBeNull();

    tap(result, '.wait__retry');

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    const replayed = sentSequences(result, 1);
    expectOneAnswerPerSequence(replayed);
    expect(replayed).toEqual(firstAttempt);
    expect(replayed[LAST_SEQUENCE_INDEX].input).toEqual(
      expectedInput(LAST_SEQUENCE_INDEX),
    );
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('replays the same five sequences when the last one was closed by the restitution timeout and the completion failed twice', async () => {
    const result = await setupExamAtMemory();
    result.completeTargeted
      .mockImplementationOnce(() => rejectWith(HttpStatusCode.Forbidden))
      .mockImplementationOnce(() => rejectWith(NETWORK_DOWN_STATUS));
    answerSequencesBefore(result, LAST_SEQUENCE_INDEX);
    reachRestitutionOf(result, LAST_SEQUENCE_INDEX);
    typeDigit(result, 8, 2);
    advance(result, RESTITUTION_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(failedOverlay(result.element)).not.toBeNull();
    const firstAttempt = structuredClone(sentSequences(result, 0));
    expectOneAnswerPerSequence(firstAttempt);
    expect(firstAttempt[LAST_SEQUENCE_INDEX]).toEqual({
      index: LAST_SEQUENCE_INDEX,
      input: [8, 8],
      timeMs: RESTITUTION_MS,
      timedOut: true,
    });

    typeDigit(result, 8, 3);
    pressKey(result, 'Enter');
    tap(result, '.memo__key--zero');
    tap(result, '.memo__key--zero');
    tap(result, '.memo__key--zero');
    tap(result, VALIDATE_BUTTONS);
    tap(result, VALIDATE_HOSTS);
    advance(result, RESTITUTION_MS + RESTITUTION_TICK_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);

    tap(result, '.wait__retry');

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    expect(failedOverlay(result.element)).not.toBeNull();
    expect(result.navigate).not.toHaveBeenCalled();

    tap(result, '.wait__retry');

    expect(result.completeTargeted).toHaveBeenCalledTimes(3);
    expect(sentSequences(result, 1)).toEqual(firstAttempt);
    expect(sentSequences(result, 2)).toEqual(firstAttempt);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('keeps every timeMs inside the restitution window when the system clock jumps backwards or forwards', async () => {
    const result = await setupExamAtMemory();

    reachRestitutionOf(result, 0);
    vi.setSystemTime(Date.now() - CLOCK_JUMP_MS);
    advance(result, THINKING_MS);
    typeDigit(result, sequenceDigit(0), TRAINING_SEQUENCES[0].length);
    pressKey(result, 'Enter');

    reachRestitutionOf(result, 1);
    advance(result, THINKING_MS);
    vi.setSystemTime(Date.now() - CLOCK_DRIFT_MS);
    typeDigit(result, sequenceDigit(1), TRAINING_SEQUENCES[1].length);
    pressKey(result, 'Enter');

    reachRestitutionOf(result, 2);
    vi.setSystemTime(Date.now() + CLOCK_JUMP_MS);
    advance(result, RESTITUTION_TICK_MS);

    answerSequence(result, 3, THINKING_MS);
    answerSequence(result, LAST_SEQUENCE_INDEX, THINKING_MS);

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    const sequences = sentSequences(result, 0);
    expectOneAnswerPerSequence(sequences);
    expect(sequences.map((sequence) => sequence.timeMs)).toEqual([
      0,
      0,
      RESTITUTION_MS,
      THINKING_MS,
      THINKING_MS,
    ]);
    expect(sequences.map((sequence) => sequence.timedOut)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('sends a single replay when the candidate double-taps the retry button', async () => {
    const result = await setupExamAtMemory();
    const replay = new Subject<SessionDto>();
    result.completeTargeted
      .mockImplementationOnce(() => rejectWith(NETWORK_DOWN_STATUS))
      .mockImplementationOnce(() => replay.asObservable());
    answerSequencesBefore(result, TRAINING_SEQUENCES.length);

    const retry = result.element.querySelector(
      '.wait__retry',
    ) as HTMLButtonElement;
    expect(retry).not.toBeNull();
    retry.click();
    retry.click();
    result.fixture.detectChanges();

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    expect(failedOverlay(result.element)).toBeNull();
    expect(result.element.querySelector('ui-result-wait')).not.toBeNull();

    replay.next(buildFullSession(MEMORY_AXIS_INDEX + 1));
    replay.complete();

    expect(result.completeTargeted).toHaveBeenCalledTimes(2);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('reaches the exam hub when the first response was lost and the replay is answered 409 with the axis recorded', async () => {
    const result = await setupExamAtMemory();
    result.completeTargeted
      .mockImplementationOnce(() => rejectWith(NETWORK_DOWN_STATUS))
      .mockImplementationOnce(() => rejectWith(HttpStatusCode.Conflict));
    result.get.mockReturnValue(of(buildFullSession(MEMORY_AXIS_INDEX + 1)));
    answerSequencesBefore(result, TRAINING_SEQUENCES.length);

    expect(failedOverlay(result.element)).not.toBeNull();
    expect(result.get).not.toHaveBeenCalled();

    tap(result, '.wait__retry');

    expect(result.get).toHaveBeenCalledWith(SESSION_ID);
    expect(sentSequences(result, 1)).toEqual(sentSequences(result, 0));
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(EXAM_HUB_ROUTE, {
      replaceUrl: true,
    });
  });

  it('tells the truth about unsent answers and lets the candidate leave without sending again', async () => {
    const result = await setupExamAtMemory();
    result.completeTargeted.mockImplementationOnce(() =>
      rejectWith(HttpStatusCode.Forbidden),
    );
    answerSequencesBefore(result, TRAINING_SEQUENCES.length);

    const quitButton = result.element.querySelector(
      '.wait__quit',
    ) as HTMLButtonElement;
    expect(quitButton).not.toBeNull();
    expect(quitButton.textContent?.trim()).toBe('Quitter sans envoyer');

    quitButton.click();
    result.fixture.detectChanges();

    expect(result.completeTargeted).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledTimes(1);
    expect(result.navigate).toHaveBeenCalledWith(['/dashboard']);
  });
});
