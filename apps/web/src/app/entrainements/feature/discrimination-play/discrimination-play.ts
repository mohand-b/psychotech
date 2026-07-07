import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  DiscriminationAnswer,
  DiscriminationTrial,
  DiscriminationTrialAnswerDto,
  SessionDto,
  SessionStatus,
} from '@psychotech/shared';
import { ArrowLeft, ArrowRight } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { ElementSequence } from '../../../shared/ui/element-sequence/element-sequence';
import { Icon } from '../../../shared/ui/icon/icon';
import { axisButtonColor } from '../../ui/axis-button-color';

const LONG_TRIAL_THRESHOLD = 8;
const SEQUENCE_SIZE = 28;
const SEQUENCE_SIZE_COMPACT = 22;

@Component({
  selector: 'app-discrimination-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ElementSequence, Icon],
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
  protected readonly presentation =
    AXIS_PRESENTATION[AxisType.VISUAL_DISCRIMINATION];
  protected readonly buttonColor = axisButtonColor(
    AxisType.VISUAL_DISCRIMINATION,
  );
  protected readonly total =
    AXIS_TRAINING[AxisType.VISUAL_DISCRIMINATION].exerciseCount;

  protected readonly trials = this.facade.discriminationTrials;
  protected readonly loaded = signal(false);
  protected readonly currentIndex = signal(0);
  protected readonly submitting = signal(false);
  protected readonly confirmingFinish = signal(false);
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
  protected readonly unansweredCount = computed(
    () => this.total - this.answeredCount(),
  );
  protected readonly remainingPercent = computed(
    () => (this.facade.remainingFraction() ?? 0) * 100,
  );
  protected readonly sequenceSize = computed(() => {
    const trial = this.currentTrial();
    return trial && trial.a.length > LONG_TRIAL_THRESHOLD
      ? SEQUENCE_SIZE_COMPACT
      : SEQUENCE_SIZE;
  });

  protected readonly identicalIcon = ArrowLeft;
  protected readonly differentIcon = ArrowRight;

  constructor() {
    effect(() => {
      if (this.facade.isExpired() && this.loaded()) {
        this.submitAll();
      }
    });
    effect(() => {
      const requests = this.facade.closeRequests();
      if (requests !== this.handledCloseRequests) {
        this.handledCloseRequests = requests;
        if (!this.hasSubmitted && this.loaded()) {
          this.confirmingFinish.set(true);
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
    if (!this.loaded() || this.locked() || this.confirmingFinish()) {
      return;
    }
    const entry: DiscriminationTrialAnswerDto = {
      index: this.currentIndex(),
      answer: value,
      timeMs: Date.now() - this.trialStartedAtMs,
    };
    this.results.update((results) => [...results, entry]);
    this.facade.recordDiscriminationResult(this.sessionId, entry);
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < this.total) {
      this.currentIndex.set(nextIndex);
      this.trialStartedAtMs = Date.now();
    } else {
      this.submitAll();
    }
  }

  protected confirmFinish(): void {
    this.submitAll();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded() || this.submitting()) {
      return;
    }
    if (event.key === 'Escape') {
      this.confirmingFinish.set(false);
      return;
    }
    if (this.confirmingFinish()) {
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
    this.loaded.set(true);
    const recorded = this.facade.discriminationResultsFor(this.sessionId);
    this.results.set(recorded);
    if (recorded.length >= this.total) {
      this.submitAll();
      return;
    }
    this.currentIndex.set(recorded.length);
    this.trialStartedAtMs = Date.now();
  }

  private submitAll(): void {
    if (this.hasSubmitted) {
      return;
    }
    this.hasSubmitted = true;
    this.submitting.set(true);
    this.confirmingFinish.set(false);
    const recorded = this.results();
    const answers = [...recorded];
    for (let index = recorded.length; index < this.total; index += 1) {
      answers.push({ index, answer: null, timeMs: 0 });
    }
    this.facade.completeTargetedDiscrimination(answers).subscribe({
      next: () => {
        this.facade.clearDiscriminationResults(this.sessionId);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.hasSubmitted = false;
        this.submitting.set(false);
      },
    });
  }
}
