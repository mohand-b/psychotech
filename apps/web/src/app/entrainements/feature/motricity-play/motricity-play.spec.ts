import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, provideRouter } from '@angular/router';
import {
  AxisType,
  FULL_SESSION_AXIS_ORDER,
  MOTRICITY_CONTENT_VERSION_V2,
  MotricityCourse,
  MotricityCourseTrajectoryDto,
  Sector,
  SessionDto,
  SessionMode,
  SessionStatus,
  generateMotricityCourses,
} from '@psychotech/shared';
import { Observable, of, throwError } from 'rxjs';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { SimulationSummaryFacade } from '../../../sessions/data-access/simulation-summary.facade';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { MotricityPlay } from './motricity-play';

const SESSION_ID = 'session-motricity';
const SECONDS_PER_COURSE = 1;
const PAUSE_BETWEEN_COURSES_SEC = 1;
const COURSE_COUNT = 3;
const FRAME_MS = 50;
const FRAMES_PER_COURSE = (SECONDS_PER_COURSE * 1000) / FRAME_MS + 3;
const MOTRICITY_INDEX = FULL_SESSION_AXIS_ORDER.indexOf(AxisType.MOTOR_SKILLS);

interface MotricityPlayHarness {
  onCountdownFinished(): void;
  resultWait: { failed(): boolean; retry(): void };
}

function examSessionOnMotricity(): SessionDto {
  return {
    id: SESSION_ID,
    mode: SessionMode.FULL,
    sector: Sector.RAILWAY,
    status: SessionStatus.IN_PROGRESS,
    seed: 'seed-motricity',
    contentVersion: MOTRICITY_CONTENT_VERSION_V2,
    logicFamily: null,
    options: { enabledOptions: [] },
    energyCost: 5,
    currentAxisIndex: MOTRICITY_INDEX,
    globalScore: null,
    globalBand: null,
    isAdmissible: null,
    isEliminated: null,
    sectorThreshold: 70,
    startedAt: '2026-09-19T10:00:00.000Z',
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
      startedAt: null,
      completedAt: null,
    })),
    recommendations: [],
  };
}

function coursesStartingOnTheTrack(): MotricityCourse[] {
  return generateMotricityCourses('seed-motricity', {
    contentVersion: MOTRICITY_CONTENT_VERSION_V2,
  }).map((course) => ({
    ...course,
    startPosition: course.centerline[Math.floor(course.centerline.length / 2)],
  }));
}

describe('MotricityPlay (boucle de jeu et envoi des trajectoires)', () => {
  let scheduledFrames: Map<number, FrameRequestCallback>;
  let nextFrameId: number;
  let clockMs: number;

  beforeEach(() => {
    vi.useFakeTimers();
    scheduledFrames = new Map();
    nextFrameId = 1;
    clockMs = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextFrameId;
      nextFrameId += 1;
      scheduledFrames.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      scheduledFrames.delete(id);
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function runFrames(count: number): void {
    for (let frame = 0; frame < count; frame += 1) {
      const pending = [...scheduledFrames.entries()];
      scheduledFrames.clear();
      clockMs += FRAME_MS;
      for (const [, callback] of pending) {
        callback(clockMs);
      }
    }
  }

  function setup(complete: () => Observable<SessionDto>) {
    const completeTargetedMotricity = vi.fn<
      (courses: MotricityCourseTrajectoryDto[]) => Observable<SessionDto>
    >(() => complete());
    const session = examSessionOnMotricity();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: { get: () => SESSION_ID },
              data: {},
            },
          },
        },
        {
          provide: TrainingSessionFacade,
          useValue: {
            session: () => session,
            trainingConfig: () => ({
              exerciseCount: COURSE_COUNT,
              secondsPerCourse: SECONDS_PER_COURSE,
              pauseBetweenCoursesSec: PAUSE_BETWEEN_COURSES_SEC,
            }),
            motricityCourses: signal(coursesStartingOnTheTrack()),
            perExerciseBarFraction: signal(1),
            enabledTrainingOptions: () => [],
            closeRequests: signal(0),
            setPerExerciseCountdown: vi.fn(),
            completeTargetedMotricity,
            clear: vi.fn(),
          },
        },
        {
          provide: GamepadFacade,
          useValue: {
            pairing: signal(null),
            connected: signal(false),
            everConnected: signal(false),
            latency: signal(null),
            latencyIsGood: signal(true),
            pair: vi.fn(),
            pairTutorial: vi.fn(),
            disconnect: vi.fn(),
            sendPhase: vi.fn(),
            sendHaptic: vi.fn(),
            courseLatency: () => null,
            beginCourseLatencyWindow: vi.fn(),
            gamepadInputLost: () => false,
            stick: () => ({ x: 0, y: 0 }),
          },
        },
        { provide: SimulationSummaryFacade, useValue: { loadSummary: vi.fn() } },
      ],
    });
    TestBed.overrideComponent(MotricityPlay, {
      set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
    });
    const navigate = vi
      .spyOn(TestBed.inject(Router), 'navigate')
      .mockResolvedValue(true);
    const fixture: ComponentFixture<MotricityPlay> =
      TestBed.createComponent(MotricityPlay);
    fixture.detectChanges();
    const harness = fixture.componentInstance as unknown as MotricityPlayHarness;
    return { fixture, harness, completeTargetedMotricity, navigate };
  }

  function playEveryCourseUntilTimeout(
    harness: MotricityPlayHarness,
    fixture: ComponentFixture<MotricityPlay>,
  ): void {
    harness.onCountdownFinished();
    for (let course = 0; course < COURSE_COUNT; course += 1) {
      runFrames(FRAMES_PER_COURSE);
      fixture.detectChanges();
      vi.advanceTimersByTime(PAUSE_BETWEEN_COURSES_SEC * 1000);
      fixture.detectChanges();
    }
  }

  function sentCourses(
    completeTargetedMotricity: ReturnType<typeof vi.fn>,
    attempt: number,
  ): MotricityCourseTrajectoryDto[] {
    return completeTargetedMotricity.mock
      .calls[attempt][0] as MotricityCourseTrajectoryDto[];
  }

  it('plays three courses, sends one trajectory per course and really stops the animation loop', () => {
    const { fixture, harness, completeTargetedMotricity, navigate } = setup(() =>
      of({ ...examSessionOnMotricity(), currentAxisIndex: MOTRICITY_INDEX + 1 }),
    );

    playEveryCourseUntilTimeout(harness, fixture);

    expect(completeTargetedMotricity).toHaveBeenCalledTimes(1);
    const courses = sentCourses(completeTargetedMotricity, 0);
    expect(courses.map((course) => course.index)).toEqual([0, 1, 2]);
    for (const course of courses) {
      expect(course.samples.at(-1)?.t).toBe(SECONDS_PER_COURSE * 1000);
    }
    expect(new Set(courses.map((course) => course.samples)).size).toBe(3);
    expect(scheduledFrames.size).toBe(0);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('never resubmits by itself after a failed completion and retries with the very same three courses', () => {
    let attempts = 0;
    const { fixture, harness, completeTargetedMotricity } = setup(() => {
      attempts += 1;
      return attempts === 1
        ? throwError(() => new Error('network down'))
        : of({
            ...examSessionOnMotricity(),
            currentAxisIndex: MOTRICITY_INDEX + 1,
          });
    });

    playEveryCourseUntilTimeout(harness, fixture);
    expect(harness.resultWait.failed()).toBe(true);

    runFrames(FRAMES_PER_COURSE * COURSE_COUNT);
    vi.advanceTimersByTime(10_000);
    expect(completeTargetedMotricity).toHaveBeenCalledTimes(1);
    expect(scheduledFrames.size).toBe(0);

    harness.resultWait.retry();
    expect(completeTargetedMotricity).toHaveBeenCalledTimes(2);
    const first = sentCourses(completeTargetedMotricity, 0);
    const replayed = sentCourses(completeTargetedMotricity, 1);
    expect(replayed).toEqual(first);
    expect(new Set(replayed.map((course) => course.index)).size).toBe(3);
  });
});
