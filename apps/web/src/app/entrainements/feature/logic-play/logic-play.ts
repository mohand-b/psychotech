import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AxisType, SessionDto, SessionStatus } from '@psychotech/shared';
import { ArrowLeft, MoveRight, SkipForward } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { Icon } from '../../../shared/ui/icon/icon';
import { axisButtonColor } from '../../ui/axis-button-color';
import { ItemNavBand, ItemNavState } from '../../ui/item-nav-band/item-nav-band';

@Component({
  selector: 'app-logic-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Button, Icon, ItemNavBand],
  templateUrl: './logic-play.html',
  styleUrl: './logic-play.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class LogicPlay {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = this.route.snapshot.paramMap.get(
    'axis',
  ) as AxisType;
  protected readonly presentation = AXIS_PRESENTATION[this.axis];
  protected readonly buttonColor = axisButtonColor(this.axis);
  protected readonly choiceLetters = ['A', 'B', 'C', 'D', 'E'];

  protected readonly items = this.facade.logicItems;
  protected readonly loaded = signal(false);
  protected readonly currentIndex = signal(0);
  protected readonly answers = signal<Record<number, number>>({});
  protected readonly submitting = signal(false);
  protected readonly confirmingFinish = signal(false);
  private readonly visited = signal<ReadonlySet<number>>(new Set([0]));

  private readonly timeSpentMs = new Map<number, number>();
  private enteredAtMs = Date.now();
  private hasSubmitted = false;

  protected readonly currentItem = computed(
    () => this.items()[this.currentIndex()] ?? null,
  );
  protected readonly locked = computed(
    () => this.facade.isExpired() || this.submitting(),
  );
  protected readonly itemStates = computed<ItemNavState[]>(() => {
    const answers = this.answers();
    const visited = this.visited();
    return this.items().map((_, index) =>
      answers[index] !== undefined
        ? 'answered'
        : visited.has(index)
          ? 'skipped'
          : 'pending',
    );
  });
  protected readonly unansweredCount = computed(
    () => this.items().length - Object.keys(this.answers()).length,
  );

  protected readonly backIcon = ArrowLeft;
  protected readonly skipIcon = SkipForward;
  protected readonly arrowIcon = MoveRight;

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
  }

  protected finish(): void {
    if (this.locked()) {
      return;
    }
    if (this.unansweredCount() > 0) {
      this.confirmingFinish.set(true);
      return;
    }
    this.submit();
  }

  protected submit(): void {
    if (this.hasSubmitted || !this.loaded()) {
      return;
    }
    this.hasSubmitted = true;
    this.submitting.set(true);
    this.confirmingFinish.set(false);
    this.commitTime();
    const payload = this.items().map((_, index) => ({
      index,
      answerIndex: this.answers()[index] ?? null,
      timeMs: Math.round(this.timeSpentMs.get(index) ?? 0),
    }));
    this.facade.completeTargeted(payload).subscribe({
      next: () => this.router.navigate(['/dashboard']),
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
    this.visited.update((visited) => new Set(visited).add(index));
    this.currentIndex.set(index);
  }

  protected previous(): void {
    this.goTo(this.currentIndex() - 1);
  }

  protected next(): void {
    const index = this.currentIndex();
    if (index < this.items().length - 1) {
      this.goTo(index + 1);
      return;
    }
    const firstUnanswered = this.items().findIndex(
      (_, itemIndex) => this.answers()[itemIndex] === undefined,
    );
    if (firstUnanswered !== -1) {
      this.goTo(firstUnanswered);
    }
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
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight' || event.key === 'Enter') {
      event.preventDefault();
      this.next();
      return;
    }
    const digit = Number(event.key);
    const choiceCount = this.currentItem()?.choices.length ?? 0;
    if (Number.isInteger(digit) && digit >= 1 && digit <= choiceCount) {
      event.preventDefault();
      this.select(digit - 1);
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
