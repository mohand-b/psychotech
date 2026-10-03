import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  afterRenderEffect,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  DiscriminationAnswer,
  DiscriminationTrial,
  DiscriminationTrialAnswerDto,
  SessionMode,
} from '@psychotech/shared';
import { ArrowLeft, ArrowRight } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { ElementSequence } from '../../../shared/ui/element-sequence/element-sequence';
import { Icon } from '../../../shared/ui/icon/icon';
import { resolveAxisButtonColor } from '../../../shared/ui/axis-button-color';
import { ResultWaitOrchestrator } from '../../data-access/result-wait.orchestrator';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import { AxisCountdown } from '../../ui/axis-countdown/axis-countdown';
import { ResultWait } from '../../ui/result-wait/result-wait';
import { LeavablePlay } from '../play-leave.guard';
import {
  confirmExitOnCloseRequest,
  loadPlayableSession,
  createPlayLeaveControl,
} from '../play-session';
import {
  JitterZoneMetrics,
  buildJitterTransform,
} from './discrimination-jitter';

const SEQUENCE_SIZE = 28;

@Component({
  selector: 'app-discrimination-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisCountdown, ElementSequence, ExitConfirm, Icon, ResultWait],
  providers: [ResultWaitOrchestrator],
  templateUrl: './discrimination-play.html',
  styleUrl: './discrimination-play.css',
  host: {
    '(document:keydown)': 'answerTrialWithArrowKeys($event)',
    '(window:beforeunload)': 'blockUnloadDuringPlay($event)',
  },
})
export class DiscriminationPlay implements LeavablePlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly resultWait = inject(ResultWaitOrchestrator);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.VISUAL_DISCRIMINATION;
  protected readonly presentation =
    AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  protected readonly buttonColor = resolveAxisButtonColor(
    AxisType.VISUAL_DISCRIMINATION,
  );
  protected readonly total = this.facade.getTrainingConfig(
    AxisType.VISUAL_DISCRIMINATION,
  ).exerciseCount;

  protected readonly trials = this.facade.discriminationTrials;
  protected readonly loaded = signal(false);
  protected readonly countingDown = signal(true);
  protected readonly currentIndex = signal(0);
  protected readonly submitting = signal(false);
  protected readonly confirmingExit = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  private readonly results = signal<DiscriminationTrialAnswerDto[]>([]);

  private trialStartedAtMs = Date.now();
  private hasSubmitted = false;
  private readonly leave = createPlayLeaveControl(
    this.loaded,
    () => this.hasSubmitted,
    () => this.confirmingExit.set(true),
  );

  protected readonly currentTrial = computed<DiscriminationTrial | null>(
    () => this.trials()[this.currentIndex()] ?? null,
  );
  protected readonly locked = computed(
    () => this.facade.isExpired() || this.submitting(),
  );
  protected readonly answeredCount = computed(() => this.results().length);
  protected readonly durationSec = this.facade.durationSec;
  protected readonly remainingPercent = computed(
    () => (this.facade.remainingFraction() ?? 0) * 100,
  );
  protected readonly sequenceSize = SEQUENCE_SIZE;

  protected readonly identicalIcon = ArrowLeft;
  protected readonly differentIcon = ArrowRight;

  private readonly zoneA = viewChild<ElementRef<HTMLElement>>('zoneA');
  private readonly contentA = viewChild<ElementRef<HTMLElement>>('contentA');
  private readonly zoneB = viewChild<ElementRef<HTMLElement>>('zoneB');
  private readonly contentB = viewChild<ElementRef<HTMLElement>>('contentB');
  private readonly metricsA = signal<JitterZoneMetrics | null>(null);
  private readonly metricsB = signal<JitterZoneMetrics | null>(null);

  protected readonly transformA = computed(() => {
    const trial = this.currentTrial();
    return trial
      ? buildJitterTransform(trial.offsetA, this.metricsA())
      : 'translate(0px, 0px)';
  });
  protected readonly transformB = computed(() => {
    const trial = this.currentTrial();
    return trial
      ? buildJitterTransform(trial.offsetB, this.metricsB())
      : 'translate(0px, 0px)';
  });

  constructor() {
    this.observeJitterZone(this.zoneA, this.contentA, this.metricsA);
    this.observeJitterZone(this.zoneB, this.contentB, this.metricsB);
    effect(() => {
      if (this.facade.isExpired() && this.loaded() && !this.countingDown()) {
        this.submitAnswers();
      }
    });
    confirmExitOnCloseRequest(
      () => !this.hasSubmitted && this.loaded(),
      () => this.confirmingExit.set(true),
    );
    loadPlayableSession(this.sessionId, this.axis, () => this.openPlay());
  }

  protected answerCurrentTrial(value: DiscriminationAnswer): void {
    if (
      !this.loaded() ||
      this.locked() ||
      this.confirmingExit() ||
      this.countingDown()
    ) {
      return;
    }
    const entry: DiscriminationTrialAnswerDto = {
      index: this.currentIndex(),
      answer: value,
      timeMs: Math.max(0, Date.now() - this.trialStartedAtMs),
    };
    this.results.update((results) => [...results, entry]);
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < this.total) {
      this.currentIndex.set(nextIndex);
      this.trialStartedAtMs = Date.now();
    } else {
      this.submitAnswers();
    }
  }

  confirmLeave(): boolean {
    return this.leave.confirmLeave();
  }

  protected blockUnloadDuringPlay(event: BeforeUnloadEvent): void {
    this.leave.blockUnload(event);
  }

  protected quitToDashboard(): void {
    this.leave.acceptLeave();
    this.router.navigate(['/dashboard']);
  }

  protected answerTrialWithArrowKeys(event: KeyboardEvent): void {
    if (
      event.repeat ||
      !this.loaded() ||
      this.submitting() ||
      this.countingDown()
    ) {
      return;
    }
    if (event.key === 'Escape') {
      this.confirmingExit.set(false);
      return;
    }
    if (this.confirmingExit()) {
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.answerCurrentTrial('IDENTICAL');
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.answerCurrentTrial('DIFFERENT');
    }
  }

  private openPlay(): void {
    this.loaded.set(true);
    this.results.set([]);
    this.currentIndex.set(0);
  }

  protected startPlayAfterCountdown(): void {
    if (!this.countingDown()) {
      return;
    }
    this.countingDown.set(false);
    this.facade.rebaseClock();
    this.trialStartedAtMs = Date.now();
  }

  private observeJitterZone(
    zone: Signal<ElementRef<HTMLElement> | undefined>,
    content: Signal<ElementRef<HTMLElement> | undefined>,
    metrics: WritableSignal<JitterZoneMetrics | null>,
  ): void {
    const measureJitterZone = () => {
      const zoneElement = zone()?.nativeElement;
      const contentElement = content()?.nativeElement;
      if (!zoneElement || !contentElement) {
        return;
      }
      metrics.set({
        zoneWidth: zoneElement.clientWidth,
        zoneHeight: zoneElement.clientHeight,
        contentWidth: contentElement.offsetWidth,
        contentHeight: contentElement.offsetHeight,
      });
    };
    afterRenderEffect(() => {
      this.currentIndex();
      measureJitterZone();
    });
    effect((onCleanup) => {
      const zoneElement = zone()?.nativeElement;
      const contentElement = content()?.nativeElement;
      if (!zoneElement || !contentElement) {
        return;
      }
      const observer = new ResizeObserver(measureJitterZone);
      observer.observe(zoneElement);
      observer.observe(contentElement);
      onCleanup(() => observer.disconnect());
    });
  }

  private submitAnswers(): void {
    if (this.hasSubmitted) {
      return;
    }
    this.hasSubmitted = true;
    this.submitting.set(true);
    this.confirmingExit.set(false);
    const recorded = this.results();
    const answers = [...recorded];
    for (let index = recorded.length; index < this.total; index += 1) {
      answers.push({ index, answer: null, timeMs: 0 });
    }
    const playedMs = this.facade.measureElapsedPlayMs();
    this.resultWait.submitAxisCompletion({
      axis: this.axis,
      complete: () => this.facade.completeDiscriminationAxis(answers, playedMs),
    });
  }
}
