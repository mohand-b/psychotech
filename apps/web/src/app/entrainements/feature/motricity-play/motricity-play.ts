import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  ControlModality,
  MOTRICITY_CANVAS_HEIGHT,
  MOTRICITY_CANVAS_WIDTH,
  MOTRICITY_CURSOR_RADIUS,
  MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC,
  MOTRICITY_SAMPLE_INTERVAL_MS,
  MotricityCourse,
  MotricityCourseTrajectoryDto,
  MotricityPoint,
  MotricitySampleDto,
  GAMEPAD_MAX_OVERDRIVE,
  SessionDto,
  SessionMode,
  SessionStatus,
  TrainingOptionId,
  motricityAnchoredArc,
  motricityCursorZone,
} from '@psychotech/shared';
import { GamepadFacade } from '../../../gamepad/data-access/gamepad.facade';
import { crankSmoothedSpeed } from '../../../gamepad/data-access/gamepad-logic';
import { Crank } from '../../../gamepad/ui/crank/crank';
import { GamepadPairing } from '../../../gamepad/ui/gamepad-pairing/gamepad-pairing';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { Button } from '../../../shared/ui/button/button';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { ResultWaitOrchestrator } from '../../data-access/result-wait.orchestrator';
import { AxisCountdown } from '../../ui/axis-countdown/axis-countdown';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import { ResultWait } from '../../ui/result-wait/result-wait';
import { simulationCurrentAxis } from '../../ui/session-flow';
import {
  MotricityLiveState,
  advanceMotricityLive,
  createMotricityLiveState,
  liveMajorErrors,
} from './motricity-live';

type MotricityPhase = 'PLAYING' | 'TRANSITION';
type CursorState = 'depart' | 'normal' | 'contact' | 'outside';

const MAX_FRAME_MS = 50;
const ARC_COMPLETION_TOLERANCE = 0.5;
const BADGE_WIDTH = 58;
const BADGE_HEIGHT = 24;

@Component({
  selector: 'app-motricity-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisCountdown,
    Button,
    Crank,
    ExitConfirm,
    GamepadPairing,
    ResultWait,
  ],
  providers: [ResultWaitOrchestrator],
  templateUrl: './motricity-play.html',
  styleUrl: './motricity-play.css',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class MotricityPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly gamepad = inject(GamepadFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly resultWait = inject(ResultWaitOrchestrator);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.MOTOR_SKILLS;
  protected readonly presentation = AXIS_PRESENTATION[AxisType.MOTOR_SKILLS];
  protected readonly tutorial = this.route.snapshot.data['tutorial'] === true;
  private readonly training = this.facade.trainingConfig(AxisType.MOTOR_SKILLS);

  protected readonly canvasWidth = MOTRICITY_CANVAS_WIDTH;
  protected readonly canvasHeight = MOTRICITY_CANVAS_HEIGHT;
  protected readonly cursorRadius = MOTRICITY_CURSOR_RADIUS;
  protected readonly badgeWidth = BADGE_WIDTH;
  protected readonly badgeHeight = BADGE_HEIGHT;
  protected readonly courseCount = this.training.exerciseCount;

  protected readonly loaded = signal(false);
  protected readonly countingDown = signal(true);
  protected readonly courseIndex = signal(0);
  protected readonly phase = signal<MotricityPhase>('PLAYING');
  protected readonly cursorX = signal(0);
  protected readonly cursorY = signal(0);
  protected readonly cursorState = signal<CursorState>('depart');
  protected readonly minorErrors = signal(0);
  protected readonly majorErrors = signal(0);
  protected readonly transitionCountdown = signal(
    this.training.pauseBetweenCoursesSec,
  );
  protected readonly confirmingExit = signal(false);
  protected readonly crankSpeedX = signal(0);
  protected readonly crankSpeedY = signal(0);
  protected readonly timerFraction = computed(
    () => this.facade.perExerciseBarFraction() ?? 1,
  );
  protected readonly traveledPoints = signal('');
  protected readonly suspended = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  protected readonly liveErrorCountersEnabled = computed(() =>
    this.facade
      .enabledTrainingOptions()
      .includes(TrainingOptionId.MOTOR_LIVE_ERROR_COUNTERS),
  );

  protected readonly gamepadPairing = this.gamepad.pairing;
  protected readonly gamepadConnected = this.gamepad.connected;
  protected readonly gamepadExclusive = this.gamepad.everConnected;
  protected readonly gamepadLatency = this.gamepad.latency;
  protected readonly gamepadLatencyGood = this.gamepad.latencyIsGood;
  protected readonly showPairing = computed(
    () =>
      this.loaded() &&
      this.phase() === 'PLAYING' &&
      !this.suspended() &&
      (this.cursorState() === 'depart' || this.gamepadConnected()),
  );

  protected readonly courses = this.facade.motricityCourses;
  protected readonly course = computed<MotricityCourse | null>(
    () => this.courses()[this.courseIndex()] ?? null,
  );
  protected readonly polygonPoints = computed(() => {
    const course = this.course();
    return course
      ? course.polygon
          .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
          .join(' ')
      : '';
  });
  protected readonly leftSidePoints = computed(() => {
    const course = this.course();
    return course
      ? course.leftSide
          .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
          .join(' ')
      : '';
  });
  protected readonly rightSidePoints = computed(() => {
    const course = this.course();
    return course
      ? course.rightSide
          .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
          .join(' ')
      : '';
  });
  protected readonly centerlinePoints = computed(() => {
    const course = this.course();
    return course
      ? course.centerline
          .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
          .join(' ')
      : '';
  });

  private live: MotricityLiveState = createMotricityLiveState();
  private maxArc = 0;
  private position: MotricityPoint = { x: 0, y: 0 };
  private samples: MotricitySampleDto[] = [];
  private trajectories: MotricityCourseTrajectoryDto[] = [];
  private lastSampleT = -Infinity;
  private rafId: number | null = null;
  private lastFrameTs: number | null = null;
  private transitionTimerId: number | null = null;
  private hasSubmitted = false;
  private crankPendingXRad = 0;
  private crankPendingYRad = 0;
  private usedTouchCranks = false;
  private previousCursorState: CursorState = 'depart';
  private handledCloseRequests = this.facade.closeRequests();

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.stopLoop();
      this.clearTransitionTimer();
      this.facade.setPerExerciseCountdown(null);
      this.gamepad.disconnect();
    });
    effect(() => {
      const requests = this.facade.closeRequests();
      if (requests !== this.handledCloseRequests) {
        this.handledCloseRequests = requests;
        if (!this.hasSubmitted && this.loaded()) {
          this.confirmingExit.set(true);
        }
      }
    });
    const active = this.facade.session();
    if (active?.id === this.sessionId) {
      this.handleLoaded(active);
    } else {
      this.facade.load(this.sessionId).subscribe({
        next: (session) => this.handleLoaded(session),
        error: () => this.router.navigate(['/entrainements']),
      });
    }
  }

  protected quit(): void {
    this.router.navigate(['/dashboard']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded()) {
      return;
    }
    if (event.key === 'Escape') {
      this.confirmingExit.set(false);
    }
  }

  protected regeneratePairing(): void {
    this.requestPairing();
  }

  private requestPairing(): void {
    if (this.tutorial) {
      this.gamepad.pairTutorial();
    } else {
      this.gamepad.pair(this.sessionId);
    }
  }

  protected onCrankRotate(axis: 'x' | 'y', deltaRad: number): void {
    this.usedTouchCranks = true;
    if (axis === 'x') {
      this.crankPendingXRad += deltaRad;
    } else {
      this.crankPendingYRad += deltaRad;
    }
  }

  private handleLoaded(session: SessionDto): void {
    if (session.status !== SessionStatus.IN_PROGRESS) {
      this.router.navigate(['/entrainements']);
      return;
    }
    if (
      session.mode === SessionMode.FULL &&
      simulationCurrentAxis(session) !== this.axis
    ) {
      this.router.navigate(['/entrainements/simulation/session', session.id]);
      return;
    }
    this.loaded.set(true);
    if (!this.gamepad.connected()) {
      this.requestPairing();
    }
  }

  protected onCountdownFinished(): void {
    if (!this.countingDown()) {
      return;
    }
    this.countingDown.set(false);
    this.beginCourse(0);
    this.startLoop();
  }

  private beginCourse(index: number): void {
    const course = this.courses()[index];
    this.courseIndex.set(index);
    this.phase.set('PLAYING');
    this.live = createMotricityLiveState();
    this.maxArc = 0;
    this.traveledPoints.set('');
    this.samples = [];
    this.lastSampleT = -Infinity;
    this.position = { ...course.startPosition };
    this.cursorX.set(this.position.x);
    this.cursorY.set(this.position.y);
    this.cursorState.set('depart');
    this.previousCursorState = 'depart';
    this.minorErrors.set(0);
    this.majorErrors.set(0);
    this.crankSpeedX.set(0);
    this.crankSpeedY.set(0);
    this.crankPendingXRad = 0;
    this.crankPendingYRad = 0;
    this.gamepad.beginCourseLatencyWindow();
    this.facade.setPerExerciseCountdown(this.training.secondsPerCourse, 1);
  }

  private startLoop(): void {
    const tick = (timestamp: number) => {
      this.step(timestamp);
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  private stopLoop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private step(timestamp: number): void {
    const deltaMs =
      this.lastFrameTs === null
        ? 0
        : Math.min(MAX_FRAME_MS, timestamp - this.lastFrameTs);
    this.lastFrameTs = timestamp;
    const course = this.course();
    if (!course || this.phase() !== 'PLAYING' || this.hasSubmitted) {
      return;
    }
    if (
      this.gamepadExclusive() &&
      this.gamepad.gamepadInputLost(performance.now())
    ) {
      this.suspended.set(true);
      return;
    }
    this.suspended.set(false);

    this.updateCrankSpeeds(deltaMs);
    this.move(course, deltaMs);
    const zone = motricityCursorZone(course, this.position);
    const nextCursorState: CursorState =
      zone === 'GARAGE' && !this.live.started
        ? 'depart'
        : zone === 'OUTSIDE'
          ? 'outside'
          : zone === 'TOUCHING'
            ? 'contact'
            : 'normal';
    this.cursorState.set(nextCursorState);
    if (
      this.gamepadConnected() &&
      nextCursorState !== this.previousCursorState
    ) {
      if (nextCursorState === 'contact') {
        this.gamepad.sendHaptic('CONTACT');
      } else if (nextCursorState === 'outside') {
        this.gamepad.sendHaptic('EXIT');
      }
    }
    this.previousCursorState = nextCursorState;
    this.live = advanceMotricityLive(this.live, zone, deltaMs);
    if (!this.live.started) {
      this.facade.setPerExerciseCountdown(this.training.secondsPerCourse, 1);
      return;
    }

    const limitMs = this.training.secondsPerCourse * 1000;
    const activeMs = Math.min(this.live.activeMs, limitMs);
    if (activeMs - this.lastSampleT >= MOTRICITY_SAMPLE_INTERVAL_MS - 0.5) {
      this.samples.push({
        t: Math.round(activeMs),
        x: this.position.x,
        y: this.position.y,
      });
      this.lastSampleT = activeMs;
    }
    this.minorErrors.set(this.live.minorErrors);
    this.majorErrors.set(liveMajorErrors(this.live));
    this.facade.setPerExerciseCountdown(
      Math.max(0, Math.ceil((limitMs - activeMs) / 1000)),
      Math.max(0, 1 - activeMs / limitMs),
    );

    const arc = motricityAnchoredArc(
      course,
      this.position,
      this.maxArc,
      deltaMs,
    );
    if (arc > this.maxArc) {
      this.maxArc = arc;
      this.traveledPoints.set(this.traveledPath(course, arc));
    }
    const crossed =
      this.maxArc >= course.totalLength - ARC_COMPLETION_TOLERANCE;
    if (crossed || this.live.activeMs >= limitMs) {
      this.finishCourse(crossed ? Math.round(activeMs) : limitMs);
    }
  }

  private traveledPath(course: MotricityCourse, arc: number): string {
    if (arc <= 0) {
      return '';
    }
    let remaining = arc;
    const points: MotricityPoint[] = [course.centerline[0]];
    for (const segment of course.segments) {
      if (remaining >= segment.length) {
        points.push(segment.end);
        remaining -= segment.length;
      } else {
        const ratio = remaining / segment.length;
        points.push({
          x: segment.start.x + (segment.end.x - segment.start.x) * ratio,
          y: segment.start.y + (segment.end.y - segment.start.y) * ratio,
        });
        break;
      }
    }
    return points
      .map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`)
      .join(' ');
  }

  private updateCrankSpeeds(deltaMs: number): void {
    if (deltaMs <= 0) {
      return;
    }
    const dtSec = deltaMs / 1000;
    this.crankSpeedX.set(
      crankSmoothedSpeed(this.crankSpeedX(), this.crankPendingXRad / dtSec),
    );
    this.crankSpeedY.set(
      crankSmoothedSpeed(this.crankSpeedY(), this.crankPendingYRad / dtSec),
    );
    this.crankPendingXRad = 0;
    this.crankPendingYRad = 0;
  }

  private move(course: MotricityCourse, deltaMs: number): void {
    if (this.confirmingExit()) {
      return;
    }
    let inputX: number;
    let inputY: number;
    let speedFactor: number;
    if (this.gamepadExclusive()) {
      const stick = this.gamepad.stick();
      inputX = stick.x;
      inputY = stick.y;
      const deflection = Math.hypot(inputX, inputY);
      if (deflection === 0) {
        return;
      }
      speedFactor = Math.min(GAMEPAD_MAX_OVERDRIVE, deflection);
    } else if (this.crankSpeedX() !== 0 || this.crankSpeedY() !== 0) {
      inputX = this.crankSpeedX();
      inputY = this.crankSpeedY();
      speedFactor = Math.min(GAMEPAD_MAX_OVERDRIVE, Math.hypot(inputX, inputY));
    } else {
      return;
    }
    const magnitude = Math.hypot(inputX, inputY);
    const distance =
      MOTRICITY_CURSOR_SPEED_UNITS_PER_SEC * (deltaMs / 1000) * speedFactor;
    let x = this.position.x + (inputX / magnitude) * distance;
    let y = this.position.y + (inputY / magnitude) * distance;
    x = Math.min(
      MOTRICITY_CANVAS_WIDTH - MOTRICITY_CURSOR_RADIUS,
      Math.max(MOTRICITY_CURSOR_RADIUS, x),
    );
    y = Math.min(
      MOTRICITY_CANVAS_HEIGHT - MOTRICITY_CURSOR_RADIUS,
      Math.max(MOTRICITY_CURSOR_RADIUS, y),
    );
    ({ x, y } = this.resolveGarageWalls(course, x, y));
    this.position = { x, y };
    this.cursorX.set(x);
    this.cursorY.set(y);
  }

  private resolveGarageWalls(
    course: MotricityCourse,
    x: number,
    y: number,
  ): MotricityPoint {
    let resolvedX = x;
    let resolvedY = y;
    for (let pass = 0; pass < 2; pass += 1) {
      for (const wall of course.garageWalls) {
        const dx = wall.end.x - wall.start.x;
        const dy = wall.end.y - wall.start.y;
        const lengthSq = dx * dx + dy * dy;
        const t =
          lengthSq === 0
            ? 0
            : Math.min(
                1,
                Math.max(
                  0,
                  ((resolvedX - wall.start.x) * dx +
                    (resolvedY - wall.start.y) * dy) /
                    lengthSq,
                ),
              );
        const closestX = wall.start.x + t * dx;
        const closestY = wall.start.y + t * dy;
        const distance = Math.hypot(resolvedX - closestX, resolvedY - closestY);
        if (distance > 0 && distance < MOTRICITY_CURSOR_RADIUS) {
          const push = (MOTRICITY_CURSOR_RADIUS - distance) / distance;
          resolvedX += (resolvedX - closestX) * push;
          resolvedY += (resolvedY - closestY) * push;
        }
      }
    }
    return { x: resolvedX, y: resolvedY };
  }

  private finishCourse(finalT: number): void {
    this.samples.push({
      t: finalT,
      x: this.position.x,
      y: this.position.y,
    });
    const latency = this.gamepad.courseLatency();
    this.trajectories.push({
      index: this.courseIndex(),
      samples: this.samples,
      ...(latency
        ? {
            avgLatencyMs: Math.round(latency.avgMs),
            jitterMs: Math.round(latency.jitterMs),
          }
        : {}),
    });
    if (this.courseIndex() < this.courseCount - 1) {
      this.phase.set('TRANSITION');
      this.transitionCountdown.set(this.training.pauseBetweenCoursesSec);
      this.transitionTimerId = window.setInterval(() => {
        const next = this.transitionCountdown() - 1;
        this.transitionCountdown.set(next);
        if (next <= 0) {
          this.clearTransitionTimer();
          this.beginCourse(this.courseIndex() + 1);
        }
      }, 1000);
      return;
    }
    this.submit();
  }

  private clearTransitionTimer(): void {
    if (this.transitionTimerId !== null) {
      window.clearInterval(this.transitionTimerId);
      this.transitionTimerId = null;
    }
  }

  private submit(): void {
    if (this.hasSubmitted) {
      return;
    }
    this.hasSubmitted = true;
    this.stopLoop();
    this.facade.setPerExerciseCountdown(null);
    const controlModality = this.gamepadExclusive()
      ? ControlModality.PHONE_GAMEPAD
      : this.usedTouchCranks
        ? ControlModality.TOUCH_JOYSTICKS
        : ControlModality.KEYBOARD;
    this.gamepad.sendPhase('FINISHED');
    this.resultWait.submit({
      axis: this.axis,
      complete: () =>
        this.facade.completeTargetedMotricity(
          this.trajectories,
          controlModality,
        ),
      onSilentFailure: () => {
        this.hasSubmitted = false;
      },
    });
  }
}
