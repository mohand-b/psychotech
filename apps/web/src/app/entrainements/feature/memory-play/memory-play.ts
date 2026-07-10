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
  AXIS_TRAINING,
  AxisType,
  MemoryPhase,
  MemorySequence,
  MemorySequenceAnswerDto,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { Check, Delete, MoveRight, Undo2 } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { axisSlug } from '../../../shared/util/axis-slug';
import { axisButtonColor } from '../../ui/axis-button-color';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';

type MemoryStage =
  | 'PHASE_TRANSITION'
  | 'PREPARATION'
  | 'MEMORIZATION'
  | 'RESTITUTION';

const PHASE_TRANSITION_MS = 2000;
const PREPARATION_MS = 2400;
const ELEMENT_ENTER_MS = 150;
const ELEMENT_HOLD_MS = 630;
const ELEMENT_EXIT_MS = 140;
const ELEMENT_GAP_MS = 80;
const RESTITUTION_TICK_MS = 200;

@Component({
  selector: 'app-memory-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ExitConfirm, Icon],
  templateUrl: './memory-play.html',
  styleUrl: './memory-play.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class MemoryPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly presentation = AXIS_PRESENTATION[AxisType.MEMORY];
  protected readonly buttonColor = axisButtonColor(AxisType.MEMORY);
  protected readonly padDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private readonly restitutionSec =
    AXIS_TRAINING[AxisType.MEMORY].restitutionSec;

  protected readonly sequences = this.facade.memorySequences;
  protected readonly total = AXIS_TRAINING[AxisType.MEMORY].exerciseCount;
  protected readonly loaded = signal(false);
  protected readonly stage = signal<MemoryStage>('PREPARATION');
  protected readonly currentIndex = signal(0);
  protected readonly memorizeStep = signal(0);
  protected readonly digitVisible = signal(false);
  protected readonly input = signal<number[]>([]);
  protected readonly submitting = signal(false);
  protected readonly confirmingExit = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  protected readonly restitutionFraction = signal(1);
  protected readonly restitutionSecTotal = this.restitutionSec;
  private readonly results = signal<MemorySequenceAnswerDto[]>([]);

  private pendingTimerId: number | null = null;
  private restitutionIntervalId: number | null = null;
  private restitutionStartedAtMs = 0;
  private hasSubmitted = false;
  private handledCloseRequests = this.facade.closeRequests();

  protected readonly currentSequence = computed<MemorySequence | null>(
    () => this.sequences()[this.currentIndex()] ?? null,
  );
  protected readonly restitutionRemainingSec = computed(() =>
    Math.ceil(this.restitutionFraction() * this.restitutionSecTotal),
  );
  protected readonly completedCount = computed(() => this.results().length);
  protected readonly reversePhase = computed(
    () => this.currentSequence()?.phase === MemoryPhase.INVERSE,
  );

  protected readonly forwardIcon = MoveRight;
  protected readonly reverseIcon = Undo2;
  protected readonly eraseIcon = Delete;
  protected readonly validateIcon = Check;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.clearTimers();
      this.facade.setPerExerciseCountdown(null);
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

  protected press(digit: number): void {
    const sequence = this.currentSequence();
    if (
      this.stage() !== 'RESTITUTION' ||
      !sequence ||
      this.input().length >= sequence.length
    ) {
      return;
    }
    this.input.update((input) => [...input, digit]);
  }

  protected erase(): void {
    if (this.stage() !== 'RESTITUTION') {
      return;
    }
    this.input.update((input) => input.slice(0, -1));
  }

  protected validate(): void {
    const sequence = this.currentSequence();
    if (
      this.stage() !== 'RESTITUTION' ||
      !sequence ||
      this.input().length !== sequence.length
    ) {
      return;
    }
    this.finishSequence(false);
  }

  protected quit(): void {
    this.router.navigate(['/dashboard']);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded() || this.submitting()) {
      return;
    }
    if (event.key === 'Escape') {
      this.confirmingExit.set(false);
      return;
    }
    if (this.confirmingExit()) {
      return;
    }
    if (this.stage() !== 'RESTITUTION') {
      return;
    }
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.erase();
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.validate();
      return;
    }
    const digit = Number(event.key);
    if (Number.isInteger(digit) && event.key.length === 1) {
      event.preventDefault();
      this.press(digit);
    }
  }

  private handleLoaded(session: SessionDto): void {
    if (session.status !== SessionStatus.IN_PROGRESS) {
      this.router.navigate(['/entrainements']);
      return;
    }
    this.loaded.set(true);
    this.results.set([]);
    this.beginSequence(0);
  }

  private beginSequence(index: number): void {
    this.currentIndex.set(index);
    this.input.set([]);
    const sequence = this.sequences()[index];
    const previous = this.sequences()[index - 1];
    if (
      sequence?.phase === MemoryPhase.INVERSE &&
      previous?.phase === MemoryPhase.NORMAL
    ) {
      this.stage.set('PHASE_TRANSITION');
      this.facade.setPerExerciseCountdown(null);
      this.schedule(PHASE_TRANSITION_MS, () => this.beginPreparation());
      return;
    }
    this.beginPreparation();
  }

  private beginPreparation(): void {
    this.stage.set('PREPARATION');
    this.facade.setPerExerciseCountdown(null);
    this.schedule(PREPARATION_MS, () => this.beginMemorization());
  }

  private beginMemorization(): void {
    this.stage.set('MEMORIZATION');
    this.showElement(0);
  }

  private showElement(step: number): void {
    this.memorizeStep.set(step);
    this.digitVisible.set(true);
    this.schedule(ELEMENT_ENTER_MS + ELEMENT_HOLD_MS, () => {
      this.digitVisible.set(false);
      this.schedule(ELEMENT_EXIT_MS + ELEMENT_GAP_MS, () => {
        const sequence = this.currentSequence();
        if (sequence && step + 1 < sequence.length) {
          this.showElement(step + 1);
        } else {
          this.beginRestitution();
        }
      });
    });
  }

  private beginRestitution(): void {
    this.stage.set('RESTITUTION');
    this.restitutionStartedAtMs = Date.now();
    const totalMs = this.restitutionSec * 1000;
    const deadline = this.restitutionStartedAtMs + totalMs;
    this.facade.setPerExerciseCountdown(this.restitutionSec);
    this.restitutionIntervalId = window.setInterval(() => {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        this.finishSequence(true);
        return;
      }
      this.facade.setPerExerciseCountdown(Math.ceil(remainingMs / 1000));
      this.restitutionFraction.set(remainingMs / totalMs);
    }, RESTITUTION_TICK_MS);
  }

  private finishSequence(timedOut: boolean): void {
    if (this.stage() !== 'RESTITUTION') {
      return;
    }
    this.clearTimers();
    this.facade.setPerExerciseCountdown(null);
    this.restitutionFraction.set(1);
    const elapsedMs = Date.now() - this.restitutionStartedAtMs;
    const answer: MemorySequenceAnswerDto = {
      index: this.currentIndex(),
      input: this.input(),
      timeMs: Math.min(elapsedMs, this.restitutionSec * 1000),
      timedOut,
    };
    this.results.update((results) => [...results, answer]);
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < this.total) {
      this.beginSequence(nextIndex);
    } else {
      this.submitAll();
    }
  }

  private submitAll(): void {
    if (this.hasSubmitted) {
      return;
    }
    this.hasSubmitted = true;
    this.submitting.set(true);
    this.confirmingExit.set(false);
    this.facade.completeTargetedMemory(this.results()).subscribe({
      next: () => {
        this.router.navigate([
          '/entrainements/cible',
          axisSlug(AxisType.MEMORY),
          'session',
          this.sessionId,
          'resultat',
        ]);
      },
      error: () => {
        this.hasSubmitted = false;
        this.submitting.set(false);
      },
    });
  }

  private schedule(delayMs: number, callback: () => void): void {
    this.pendingTimerId = window.setTimeout(callback, delayMs);
  }

  private clearTimers(): void {
    if (this.pendingTimerId !== null) {
      window.clearTimeout(this.pendingTimerId);
      this.pendingTimerId = null;
    }
    if (this.restitutionIntervalId !== null) {
      window.clearInterval(this.restitutionIntervalId);
      this.restitutionIntervalId = null;
    }
  }
}
