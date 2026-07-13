import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  REACTIVITY_COMMAND_BY_TYPE,
  ReactivityCommand,
  ReactivityStimulus,
  ReactivityStimulusAnswerDto,
  ReactivityStimulusType,
  ReactivityWaitPressDto,
  SessionDto,
  SessionMode,
  SessionStatus,
  TrainingOptionId,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { AxisCountdown } from '../../ui/axis-countdown/axis-countdown';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import {
  afterAxisSubmitRoute,
  simulationCurrentAxis,
} from '../../ui/session-flow';

type PlayState = 'WAITING' | 'STIMULUS' | 'TRANSITION';

interface ActiveStimulus {
  stimulus: ReactivityStimulus;
  x: number;
  y: number;
}

interface FugitiveFeedback {
  kind: 'tr' | 'wrong' | 'early';
  text: string;
  x: number;
  y: number;
}

interface TransitionCard {
  type: Exclude<ReactivityStimulusType, 'YELLOW'>;
  keycap: string;
  keyLabel: string;
  alreadyActive: ReactivityStimulusType[];
}

const TICK_MS = 50;
const FEEDBACK_MS = 600;
const TRANSITION_MS = 3000;
const STIMULUS_SIZE_PX = 72;
const ZONE_MARGIN_X_PX = 24;
const ZONE_MARGIN_Y_PX = 16;
const FEEDBACK_OFFSET_PX = 56;

const TRANSITION_CARDS: Record<'BLUE' | 'RED', TransitionCard> = {
  BLUE: {
    type: 'BLUE',
    keycap: '→',
    keyLabel: 'Flèche droite',
    alreadyActive: ['YELLOW'],
  },
  RED: {
    type: 'RED',
    keycap: 'Espace',
    keyLabel: 'Barre Espace',
    alreadyActive: ['YELLOW', 'BLUE'],
  },
};

@Component({
  selector: 'app-reactivity-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisCountdown, ExitConfirm],
  templateUrl: './reactivity-play.html',
  styleUrl: './reactivity-play.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class ReactivityPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.REACTIVITY;
  protected readonly presentation = AXIS_PRESENTATION[AxisType.REACTIVITY];
  private readonly training = this.facade.trainingConfig(AxisType.REACTIVITY);
  private readonly totalMs = this.training.timer.durationSec * 1000;
  private readonly phaseMs = this.training.phaseDurationSec * 1000;

  protected readonly stimulusSize = STIMULUS_SIZE_PX;

  protected readonly loaded = signal(false);
  protected readonly countingDown = signal(true);
  protected readonly state = signal<PlayState>('WAITING');
  protected readonly phase = signal(1);
  protected readonly activeStimulus = signal<ActiveStimulus | null>(null);
  protected readonly feedback = signal<FugitiveFeedback | null>(null);
  protected readonly transitionCard = signal<TransitionCard | null>(null);
  protected readonly transitionCountdown = signal(3);
  protected readonly confirmingExit = signal(false);
  protected readonly leaving = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  protected readonly remainingFraction = computed(
    () => this.facade.remainingFraction() ?? 1,
  );
  private readonly liveMetricsEnabled = computed(() =>
    this.facade
      .enabledTrainingOptions()
      .includes(TrainingOptionId.REACTIVITY_LIVE_METRICS),
  );

  private readonly zone = viewChild<ElementRef<HTMLElement>>('zone');

  private stimuli: ReactivityStimulus[] = [];
  private nextStimulusIndex = 0;
  private epochMs = 0;
  private suspendedMs = 0;
  private transitionStartedRealMs = 0;
  private stimulusVisibleAtMs = 0;
  private stimulusAnswered = false;
  private nextTransitionBoundary: number | null = null;
  private tickerId: number | null = null;
  private feedbackTimerId: number | null = null;
  private hasSubmitted = false;

  private readonly answers: ReactivityStimulusAnswerDto[] = [];
  private readonly waitPresses: ReactivityWaitPressDto[] = [];
  private handledCloseRequests = this.facade.closeRequests();

  constructor() {
    effect(() => {
      const requests = this.facade.closeRequests();
      if (requests !== this.handledCloseRequests) {
        this.handledCloseRequests = requests;
        if (this.loaded() && !this.hasSubmitted) {
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
    this.destroyRef.onDestroy(() => {
      this.stopTicker();
      this.clearFeedbackTimer();
      this.facade.setEffectiveCountdown(null);
    });
  }

  protected stimulusColorVar(type: ReactivityStimulusType): string {
    return type === 'YELLOW'
      ? 'var(--stimulus-yellow)'
      : type === 'BLUE'
        ? 'var(--stimulus-blue)'
        : 'var(--stimulus-red)';
  }

  protected readonly blueActive = computed(() => this.phase() >= 2);
  protected readonly redActive = computed(() => this.phase() >= 3);

  protected press(command: ReactivityCommand): void {
    if (
      !this.loaded() ||
      this.hasSubmitted ||
      this.confirmingExit() ||
      this.countingDown()
    ) {
      return;
    }
    if (this.state() === 'TRANSITION') {
      return;
    }
    if (this.state() === 'STIMULUS' && !this.stimulusAnswered) {
      this.answerStimulus(command);
      return;
    }
    this.waitPresses.push({ atMs: Math.round(this.effectiveNow()) });
    this.showFeedback({
      kind: 'early',
      text: 'Trop tôt',
      x: 0,
      y: FEEDBACK_OFFSET_PX,
    });
  }

  protected confirmExit(): void {
    if (this.leaving()) {
      return;
    }
    this.leaving.set(true);
    this.stopTicker();
    this.router.navigate(['/dashboard']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.repeat) {
      return;
    }
    if (event.key === 'Escape') {
      this.confirmingExit.set(false);
      return;
    }
    const command: ReactivityCommand | null =
      event.key === 'ArrowLeft'
        ? 'LEFT'
        : event.key === 'ArrowRight'
          ? 'RIGHT'
          : event.key === ' ' || event.code === 'Space'
            ? 'SPACE'
            : null;
    if (command === null) {
      return;
    }
    event.preventDefault();
    this.press(command);
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
    this.stimuli = this.facade.reactivityStimuli();
    this.nextTransitionBoundary = this.phaseMs;
    this.loaded.set(true);
  }

  protected onCountdownFinished(): void {
    if (!this.countingDown()) {
      return;
    }
    this.countingDown.set(false);
    this.facade.rebaseClock();
    this.epochMs = performance.now();
    this.startTicker();
  }

  private effectiveNow(): number {
    return performance.now() - this.epochMs - this.suspendedMs;
  }

  private startTicker(): void {
    this.tickerId = window.setInterval(() => this.tick(), TICK_MS);
  }

  private stopTicker(): void {
    if (this.tickerId !== null) {
      window.clearInterval(this.tickerId);
      this.tickerId = null;
    }
  }

  private tick(): void {
    if (this.hasSubmitted || this.state() === 'TRANSITION') {
      return;
    }
    const effective = this.effectiveNow();
    this.facade.setEffectiveCountdown({
      remainingSec: Math.max(0, Math.ceil((this.totalMs - effective) / 1000)),
      fraction: Math.min(1, Math.max(0, 1 - effective / this.totalMs)),
    });
    if (this.state() === 'STIMULUS') {
      const active = this.activeStimulus();
      if (
        active &&
        effective >=
          active.stimulus.appearAtMs + this.training.responseWindowMs &&
        !this.stimulusAnswered
      ) {
        this.recordAnswer(active.stimulus.index, null, null);
        this.activeStimulus.set(null);
        this.state.set('WAITING');
      }
      return;
    }
    if (effective >= this.totalMs) {
      this.submit();
      return;
    }
    if (
      this.nextTransitionBoundary !== null &&
      effective >= this.nextTransitionBoundary
    ) {
      this.startTransition();
      return;
    }
    const next = this.stimuli[this.nextStimulusIndex];
    if (next && effective >= next.appearAtMs) {
      this.showStimulus(next);
    }
  }

  private startTransition(): void {
    const card =
      this.nextTransitionBoundary === this.phaseMs
        ? TRANSITION_CARDS.BLUE
        : TRANSITION_CARDS.RED;
    this.nextTransitionBoundary =
      this.nextTransitionBoundary === this.phaseMs ? 2 * this.phaseMs : null;
    this.feedback.set(null);
    this.transitionCard.set(card);
    this.transitionCountdown.set(TRANSITION_MS / 1000);
    this.state.set('TRANSITION');
    this.transitionStartedRealMs = performance.now();
    const countdownId = window.setInterval(() => {
      this.transitionCountdown.update((value) => Math.max(1, value - 1));
    }, 1000);
    window.setTimeout(() => {
      window.clearInterval(countdownId);
      this.suspendedMs += performance.now() - this.transitionStartedRealMs;
      this.transitionCard.set(null);
      this.phase.update((value) => value + 1);
      this.state.set('WAITING');
    }, TRANSITION_MS);
  }

  private showStimulus(stimulus: ReactivityStimulus): void {
    const zone = this.zone()?.nativeElement;
    if (!zone) {
      return;
    }
    const width = zone.clientWidth;
    const height = zone.clientHeight;
    const amplitudeX = Math.max(
      0,
      width / 2 - ZONE_MARGIN_X_PX - STIMULUS_SIZE_PX / 2,
    );
    const amplitudeY = Math.max(
      0,
      height / 2 - ZONE_MARGIN_Y_PX - STIMULUS_SIZE_PX / 2,
    );
    this.nextStimulusIndex += 1;
    this.stimulusAnswered = false;
    this.feedback.set(null);
    this.clearFeedbackTimer();
    this.activeStimulus.set({
      stimulus,
      x: width / 2 + stimulus.position.fx * amplitudeX,
      y: height / 2 + stimulus.position.fy * amplitudeY,
    });
    this.state.set('STIMULUS');
    requestAnimationFrame(() => {
      this.stimulusVisibleAtMs = performance.now();
    });
  }

  private answerStimulus(command: ReactivityCommand): void {
    const active = this.activeStimulus();
    if (!active) {
      return;
    }
    this.stimulusAnswered = true;
    const trMs = Math.max(
      0,
      Math.round(performance.now() - this.stimulusVisibleAtMs),
    );
    this.recordAnswer(active.stimulus.index, command, trMs);
    const correct =
      REACTIVITY_COMMAND_BY_TYPE[active.stimulus.type] === command;
    this.activeStimulus.set(null);
    this.state.set('WAITING');
    this.showFeedback(
      correct
        ? {
            kind: 'tr',
            text: `${trMs} ms`,
            x: active.x,
            y: active.y + FEEDBACK_OFFSET_PX,
          }
        : {
            kind: 'wrong',
            text: 'Mauvaise commande',
            x: active.x,
            y: active.y + FEEDBACK_OFFSET_PX,
          },
    );
  }

  private recordAnswer(
    index: number,
    commandPressed: ReactivityCommand | null,
    trMs: number | null,
  ): void {
    this.answers.push({ index, commandPressed, trMs });
  }

  private showFeedback(feedback: FugitiveFeedback): void {
    if (!this.liveMetricsEnabled()) {
      return;
    }
    this.clearFeedbackTimer();
    this.feedback.set(feedback);
    this.feedbackTimerId = window.setTimeout(() => {
      this.feedback.set(null);
      this.feedbackTimerId = null;
    }, FEEDBACK_MS);
  }

  private clearFeedbackTimer(): void {
    if (this.feedbackTimerId !== null) {
      window.clearTimeout(this.feedbackTimerId);
      this.feedbackTimerId = null;
    }
  }

  private submit(): void {
    if (this.hasSubmitted) {
      return;
    }
    this.hasSubmitted = true;
    this.stopTicker();
    const playedMs = Math.max(0, Math.round(this.effectiveNow()));
    for (const stimulus of this.stimuli.slice(this.nextStimulusIndex)) {
      this.recordAnswer(stimulus.index, null, null);
    }
    this.facade
      .completeTargetedReactivity(this.answers, this.waitPresses, playedMs)
      .subscribe({
        next: (session) => {
          this.facade.setEffectiveCountdown(null);
          this.router.navigate(afterAxisSubmitRoute(session, this.axis));
        },
        error: () => {
          this.hasSubmitted = false;
        },
      });
  }
}
