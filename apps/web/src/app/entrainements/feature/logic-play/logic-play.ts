import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  SessionDto,
  SessionMode,
  SessionStatus,
  resolveLogicRuleHint,
} from '@psychotech/shared';
import { ArrowLeft, SkipForward } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { axisSlug } from '../../../shared/util/axis-slug';
import { axisButtonColor } from '../../ui/axis-button-color';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import { ItemNavBand, ItemNavState } from '../../ui/item-nav-band/item-nav-band';
import { LogicChoices } from '../../ui/logic-choices/logic-choices';
import { LogicSequence } from '../../ui/logic-sequence/logic-sequence';

@Component({
  selector: 'app-logic-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, ExitConfirm, ItemNavBand, LogicChoices, LogicSequence],
  templateUrl: './logic-play.html',
  styleUrl: './logic-play.css',
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class LogicPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.LOGIC;
  protected readonly presentation = AXIS_PRESENTATION[this.axis];
  protected readonly buttonColor = axisButtonColor(this.axis);
  protected readonly choiceLetters = ['A', 'B', 'C', 'D'];

  protected readonly items = this.facade.logicItems;
  protected readonly remainingSec = this.facade.remainingSec;
  protected readonly durationSec = this.facade.durationSec;
  protected readonly remainingPercent = computed(
    () => (this.facade.remainingFraction() ?? 0) * 100,
  );
  protected readonly loaded = signal(false);
  protected readonly currentIndex = signal(0);
  protected readonly answers = signal<Record<number, number>>({});
  protected readonly submitting = signal(false);
  protected readonly confirmingExit = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  protected readonly helpEnabled = this.facade.helpEnabled;
  private readonly helpUsed = signal<ReadonlySet<number>>(new Set());
  private readonly visited = signal<ReadonlySet<number>>(new Set([0]));
  private readonly sequence = viewChild<LogicSequence>('sequence');

  private readonly timeSpentMs = new Map<number, number>();
  private enteredAtMs = Date.now();
  private hasSubmitted = false;
  private handledCloseRequests = this.facade.closeRequests();

  protected readonly currentItem = computed(
    () => this.items()[this.currentIndex()] ?? null,
  );
  protected readonly currentHint = computed(() => {
    const item = this.currentItem();
    return item ? resolveLogicRuleHint(item) : '';
  });
  protected readonly currentHelpUsed = computed(() =>
    this.helpUsed().has(this.currentIndex()),
  );
  protected readonly locked = computed(
    () => this.facade.isExpired() || this.submitting(),
  );
  protected readonly itemStates = computed<ItemNavState[]>(() => {
    const answers = this.answers();
    const visited = this.visited();
    const current = this.currentIndex();
    return this.items().map((_, index) =>
      answers[index] !== undefined
        ? 'answered'
        : visited.has(index) && index !== current
          ? 'skipped'
          : 'pending',
    );
  });
  protected readonly unansweredCount = computed(
    () => this.items().length - Object.keys(this.answers()).length,
  );
  protected readonly currentAnswered = computed(
    () => this.answers()[this.currentIndex()] !== undefined,
  );
  protected readonly isLastItem = computed(
    () => this.currentIndex() === this.items().length - 1,
  );
  protected readonly nextUnansweredIndex = computed(() => {
    const answers = this.answers();
    const total = this.items().length;
    const current = this.currentIndex();
    for (let offset = 1; offset < total; offset += 1) {
      const index = (current + offset) % total;
      if (answers[index] === undefined) {
        return index;
      }
    }
    return -1;
  });

  protected readonly backIcon = ArrowLeft;
  protected readonly skipIcon = SkipForward;

  constructor() {
    const active = this.facade.session();
    if (active?.id === this.sessionId) {
      this.handleLoaded(active);
    } else {
      this.facade.load(this.sessionId).subscribe({
        next: (session) => this.handleLoaded(session),
        error: () => this.router.navigate(['/entrainements']),
      });
    }
    effect(() => {
      if (this.facade.isExpired() && this.loaded()) {
        this.submit();
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
  }

  protected finish(): void {
    if (this.locked() || !this.loaded()) {
      return;
    }
    if (this.unansweredCount() > 0) {
      this.goTo(this.nextUnansweredIndex());
      return;
    }
    this.submit();
  }

  protected quit(): void {
    this.router.navigate(['/dashboard']);
  }

  protected submit(): void {
    if (this.hasSubmitted || !this.loaded()) {
      return;
    }
    this.hasSubmitted = true;
    this.submitting.set(true);
    this.confirmingExit.set(false);
    this.commitTime();
    const payload = this.items().map((_, index) => ({
      index,
      answerIndex: this.answers()[index] ?? null,
      timeMs: Math.round(this.timeSpentMs.get(index) ?? 0),
      helpUsed: this.helpUsed().has(index),
      visited:
        this.visited().has(index) || this.answers()[index] !== undefined,
    }));
    this.facade.completeTargeted(payload).subscribe({
      next: () =>
        this.router.navigate([
          '/entrainements/cible',
          axisSlug(this.axis),
          'session',
          this.sessionId,
          'resultat',
        ]),
      error: () => {
        this.hasSubmitted = false;
        this.submitting.set(false);
      },
    });
  }

  protected select(choiceIndex: number): void {
    if (this.locked() || !this.loaded()) {
      return;
    }
    const index = this.currentIndex();
    this.answers.update((answers) => ({ ...answers, [index]: choiceIndex }));
  }

  protected goTo(index: number): void {
    if (
      !this.loaded() ||
      this.locked() ||
      index === this.currentIndex() ||
      index < 0 ||
      index >= this.items().length
    ) {
      return;
    }
    this.commitTime();
    this.sequence()?.close();
    this.visited.update((visited) => new Set(visited).add(index));
    this.currentIndex.set(index);
  }

  protected markHelpUsed(): void {
    const index = this.currentIndex();
    this.helpUsed.update((used) => new Set(used).add(index));
  }

  protected previous(): void {
    this.goTo(this.currentIndex() - 1);
  }

  protected skip(): void {
    const target = this.nextUnansweredIndex();
    if (target !== -1) {
      this.goTo(target);
    }
  }

  protected confirmNext(): void {
    if (this.locked() || !this.currentAnswered()) {
      return;
    }
    if (this.isLastItem()) {
      this.finish();
      return;
    }
    this.goTo(this.currentIndex() + 1);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded() || this.submitting()) {
      return;
    }
    if (event.key === 'Escape') {
      if (this.sequence()?.hintOpen()) {
        this.sequence()?.close(true);
      } else {
        this.confirmingExit.set(false);
      }
      return;
    }
    if (this.confirmingExit()) {
      return;
    }
    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      if (this.helpEnabled()) {
        this.sequence()?.toggle();
      }
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.goTo(this.currentIndex() + 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      this.confirmNext();
      return;
    }
    const choiceCount = this.currentItem()?.choices.length ?? 0;
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= choiceCount) {
      event.preventDefault();
      this.select(digit - 1);
      return;
    }
    const letterIndex = this.choiceLetters.indexOf(event.key.toUpperCase());
    if (letterIndex !== -1 && letterIndex < choiceCount) {
      event.preventDefault();
      this.select(letterIndex);
    }
  }

  private handleLoaded(session: SessionDto): void {
    if (session.status !== SessionStatus.IN_PROGRESS) {
      this.router.navigate(['/entrainements']);
      return;
    }
    this.enteredAtMs = Date.now();
    this.loaded.set(true);
  }

  private commitTime(): void {
    const now = Date.now();
    const index = this.currentIndex();
    this.timeSpentMs.set(
      index,
      (this.timeSpentMs.get(index) ?? 0) + (now - this.enteredAtMs),
    );
    this.enteredAtMs = now;
  }
}
