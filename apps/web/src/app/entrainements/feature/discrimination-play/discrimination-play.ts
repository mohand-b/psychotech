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
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { ArrowLeft, ArrowRight } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { ElementSequence } from '../../../shared/ui/element-sequence/element-sequence';
import { Icon } from '../../../shared/ui/icon/icon';
import { axisButtonColor } from '../../ui/axis-button-color';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import { AxisCountdown } from '../../ui/axis-countdown/axis-countdown';
import {
  afterAxisSubmitRoute,
  simulationCurrentAxis,
} from '../../ui/session-flow';
import { JitterZoneMetrics, jitterTransform } from './discrimination-jitter';

const SEQUENCE_SIZE = 28;

@Component({
  selector: 'app-discrimination-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AxisCountdown, Button, ElementSequence, ExitConfirm, Icon],
  templateUrl: './discrimination-play.html',
  styleUrl: './discrimination-play.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class DiscriminationPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.VISUAL_DISCRIMINATION;
  protected readonly presentation =
    AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  protected readonly buttonColor = axisButtonColor(
    AxisType.VISUAL_DISCRIMINATION,
  );
  protected readonly total = this.facade.trainingConfig(
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
  private handledCloseRequests = this.facade.closeRequests();

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
      ? jitterTransform(trial.offsetA, this.metricsA())
      : 'translate(0px, 0px)';
  });
  protected readonly transformB = computed(() => {
    const trial = this.currentTrial();
    return trial
      ? jitterTransform(trial.offsetB, this.metricsB())
      : 'translate(0px, 0px)';
  });

  constructor() {
    this.observeJitterZone(this.zoneA, this.contentA, this.metricsA);
    this.observeJitterZone(this.zoneB, this.contentB, this.metricsB);
    effect(() => {
      if (this.facade.isExpired() && this.loaded() && !this.countingDown()) {
        this.submitAll();
      }
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

  protected answer(value: DiscriminationAnswer): void {
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
      timeMs: Date.now() - this.trialStartedAtMs,
    };
    this.results.update((results) => [...results, entry]);
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < this.total) {
      this.currentIndex.set(nextIndex);
      this.trialStartedAtMs = Date.now();
    } else {
      this.submitAll();
    }
  }

  protected quit(): void {
    this.router.navigate(['/dashboard']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded() || this.submitting() || this.countingDown()) {
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
      this.answer('IDENTICAL');
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.answer('DIFFERENT');
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
    this.results.set([]);
    this.currentIndex.set(0);
  }

  protected onCountdownFinished(): void {
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
    const measure = () => {
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
      measure();
    });
    effect((onCleanup) => {
      const zoneElement = zone()?.nativeElement;
      const contentElement = content()?.nativeElement;
      if (!zoneElement || !contentElement) {
        return;
      }
      const observer = new ResizeObserver(measure);
      observer.observe(zoneElement);
      observer.observe(contentElement);
      onCleanup(() => observer.disconnect());
    });
  }

  private submitAll(): void {
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
    this.facade.completeTargetedDiscrimination(answers).subscribe({
      next: (session) => {
        this.router.navigate(afterAxisSubmitRoute(session, this.axis));
      },
      error: () => {
        this.hasSubmitted = false;
        this.submitting.set(false);
      },
    });
  }
}
