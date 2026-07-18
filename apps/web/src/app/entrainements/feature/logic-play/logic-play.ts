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
  DominoFace,
  LogicFamily,
  LogicItemAnswerDto,
  SessionDto,
  SessionMode,
  SessionStatus,
} from '@psychotech/shared';
import { ArrowLeft, SkipForward } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { AXIS_PRESENTATION } from '../../../shared/ui/axis-presentation';
import { Button } from '../../../shared/ui/button/button';
import { axisButtonColor } from '../../ui/axis-button-color';
import {
  afterAxisSubmitRoute,
  simulationCurrentAxis,
} from '../../ui/session-flow';
import { AxisCountdown } from '../../ui/axis-countdown/axis-countdown';
import { ExitConfirm } from '../../ui/exit-confirm/exit-confirm';
import {
  ItemNavBand,
  ItemNavSegment,
  ItemNavState,
} from '../../ui/item-nav-band/item-nav-band';
import { LogicChoices } from '../../ui/logic-choices/logic-choices';
import {
  DominoAnswerFace,
  LogicDomino,
} from '../../ui/logic-domino/logic-domino';
import {
  LogicMatrix,
  MATRIX_PROPOSAL_LETTERS,
} from '../../ui/logic-matrix/logic-matrix';
import { LogicSequence } from '../../ui/logic-sequence/logic-sequence';

interface DominoAnswer {
  top: DominoFace | null;
  bottom: DominoFace | null;
}

const EMPTY_DOMINO_ANSWER: DominoAnswer = { top: null, bottom: null };

const SEGMENT_LABELS: Record<LogicFamily, string> = {
  [LogicFamily.NUMERIC]: 'Suites numériques',
  [LogicFamily.DOMINO]: 'Dominos',
  [LogicFamily.MATRIX_I]: 'Matrices I',
  [LogicFamily.MATRIX_II]: 'Matrices II',
};

@Component({
  selector: 'app-logic-play',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AxisCountdown,
    Button,
    ExitConfirm,
    ItemNavBand,
    LogicChoices,
    LogicDomino,
    LogicMatrix,
    LogicSequence,
  ],
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
  protected readonly families = LogicFamily;

  protected readonly items = this.facade.logicItems;
  protected readonly remainingSec = this.facade.remainingSec;
  protected readonly durationSec = this.facade.durationSec;
  protected readonly remainingPercent = computed(
    () => (this.facade.remainingFraction() ?? 0) * 100,
  );
  protected readonly loaded = signal(false);
  protected readonly countingDown = signal(true);
  protected readonly currentIndex = signal(0);
  protected readonly answers = signal<Record<number, number>>({});
  protected readonly dominoAnswers = signal<Record<number, DominoAnswer>>({});
  protected readonly activeFace = signal<DominoAnswerFace>('top');
  protected readonly submitting = signal(false);
  protected readonly confirmingExit = signal(false);
  protected readonly sessionMode = computed(
    () => this.facade.session()?.mode ?? SessionMode.TARGETED,
  );
  protected readonly helpEnabled = this.facade.helpEnabled;
  private readonly helpUsed = signal<ReadonlySet<number>>(new Set());
  private readonly visited = signal<ReadonlySet<number>>(new Set([0]));
  private readonly sequence = viewChild<LogicSequence>('sequence');
  private readonly dominoBoard = viewChild<LogicDomino>('dominoBoard');
  private readonly matrixBoard = viewChild<LogicMatrix>('matrixBoard');

  private readonly timeSpentMs = new Map<number, number>();
  private enteredAtMs = Date.now();
  private hasSubmitted = false;
  private handledCloseRequests = this.facade.closeRequests();

  protected readonly currentItem = computed(
    () => this.items()[this.currentIndex()] ?? null,
  );
  protected readonly numericItem = computed(() => {
    const item = this.currentItem();
    return item?.family === LogicFamily.NUMERIC ? item : null;
  });
  protected readonly dominoItem = computed(() => {
    const item = this.currentItem();
    return item?.family === LogicFamily.DOMINO ? item : null;
  });
  protected readonly matrixItem = computed(() => {
    const item = this.currentItem();
    return item?.family === LogicFamily.MATRIX_I ||
      item?.family === LogicFamily.MATRIX_II
      ? item
      : null;
  });
  protected readonly currentDominoAnswer = computed(
    () => this.dominoAnswers()[this.currentIndex()] ?? EMPTY_DOMINO_ANSWER,
  );
  protected readonly currentHint = computed(
    () => this.currentItem()?.rule.userText ?? '',
  );
  protected readonly currentHelpUsed = computed(() =>
    this.helpUsed().has(this.currentIndex()),
  );
  protected readonly locked = computed(
    () => this.facade.isExpired() || this.submitting(),
  );
  protected readonly segments = computed<ItemNavSegment[] | null>(() => {
    const groups: ItemNavSegment[] = [];
    let lastFamily: LogicFamily | null = null;
    for (const item of this.items()) {
      if (item.family !== lastFamily) {
        groups.push({ label: SEGMENT_LABELS[item.family] });
        lastFamily = item.family;
      }
    }
    return groups.length > 1 ? groups : null;
  });
  protected readonly itemStates = computed<ItemNavState[]>(() => {
    const visited = this.visited();
    const current = this.currentIndex();
    return this.items().map((_, index) =>
      this.answeredAt(index)
        ? 'answered'
        : visited.has(index) && index !== current
          ? 'skipped'
          : 'pending',
    );
  });
  protected readonly unansweredCount = computed(
    () =>
      this.items().filter((_, index) => !this.answeredAt(index)).length,
  );
  protected readonly currentAnswered = computed(() =>
    this.answeredAt(this.currentIndex()),
  );
  protected readonly isLastItem = computed(
    () => this.currentIndex() === this.items().length - 1,
  );
  protected readonly nextUnansweredIndex = computed(() => {
    const total = this.items().length;
    const current = this.currentIndex();
    for (let offset = 1; offset < total; offset += 1) {
      const index = (current + offset) % total;
      if (!this.answeredAt(index)) {
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
      if (this.facade.isExpired() && this.loaded() && !this.countingDown()) {
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

  private answeredAt(index: number): boolean {
    const item = this.items()[index];
    if (!item) {
      return false;
    }
    if (item.family === LogicFamily.DOMINO) {
      const answer = this.dominoAnswers()[index];
      return (
        answer !== undefined && answer.top !== null && answer.bottom !== null
      );
    }
    return this.answers()[index] !== undefined;
  }

  protected finish(): void {
    if (this.locked() || !this.loaded()) {
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
    const payload: LogicItemAnswerDto[] = this.items().map((item, index) => {
      const base = {
        index,
        timeMs: Math.round(this.timeSpentMs.get(index) ?? 0),
        helpUsed: this.helpUsed().has(index),
        visited: this.visited().has(index) || this.answeredAt(index),
      };
      if (item.family === LogicFamily.DOMINO) {
        const answer = this.dominoAnswers()[index];
        return {
          ...base,
          answerIndex: null,
          dominoTop: answer?.top ?? null,
          dominoBottom: answer?.bottom ?? null,
        };
      }
      return { ...base, answerIndex: this.answers()[index] ?? null };
    });
    this.facade.completeTargeted(payload).subscribe({
      next: (session) =>
        this.router.navigate(afterAxisSubmitRoute(session, this.axis)),
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

  protected selectFace(face: DominoAnswerFace): void {
    if (this.locked() || !this.loaded()) {
      return;
    }
    this.activeFace.set(face);
  }

  protected enterDominoDigit(digit: DominoFace): void {
    if (this.locked() || !this.loaded() || !this.dominoItem()) {
      return;
    }
    const index = this.currentIndex();
    const face = this.activeFace();
    this.dominoAnswers.update((answers) => ({
      ...answers,
      [index]: {
        ...(answers[index] ?? EMPTY_DOMINO_ANSWER),
        [face]: digit,
      },
    }));
    this.activeFace.set('bottom');
  }

  protected eraseDominoDigit(): void {
    if (this.locked() || !this.loaded() || !this.dominoItem()) {
      return;
    }
    const index = this.currentIndex();
    const answer = this.dominoAnswers()[index] ?? EMPTY_DOMINO_ANSWER;
    const face: DominoAnswerFace =
      this.activeFace() === 'bottom' && answer.bottom === null
        ? 'top'
        : this.activeFace();
    this.dominoAnswers.update((answers) => ({
      ...answers,
      [index]: { ...(answers[index] ?? EMPTY_DOMINO_ANSWER), [face]: null },
    }));
    this.activeFace.set(face);
  }

  protected clearDominoAnswer(): void {
    if (this.locked() || !this.loaded() || !this.dominoItem()) {
      return;
    }
    const index = this.currentIndex();
    this.dominoAnswers.update((answers) => ({
      ...answers,
      [index]: { ...EMPTY_DOMINO_ANSWER },
    }));
    this.activeFace.set('top');
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
    this.closeHint();
    this.visited.update((visited) => new Set(visited).add(index));
    this.currentIndex.set(index);
    this.activeFace.set('top');
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

  private hintOpenNow(): boolean {
    return (
      (this.sequence()?.hintOpen() ||
        this.dominoBoard()?.hintOpen() ||
        this.matrixBoard()?.hintOpen()) ??
      false
    );
  }

  private toggleHint(): void {
    this.sequence()?.toggle();
    this.dominoBoard()?.toggleHint();
    this.matrixBoard()?.toggleHint();
  }

  private closeHint(returnFocus = false): void {
    this.sequence()?.close(returnFocus);
    this.dominoBoard()?.closeHint(returnFocus);
    this.matrixBoard()?.closeHint(returnFocus);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.loaded() || this.submitting() || this.countingDown()) {
      return;
    }
    if (event.key === 'Escape') {
      if (this.hintOpenNow()) {
        this.closeHint(true);
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
        this.toggleHint();
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
    const item = this.currentItem();
    if (!item || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (item.family === LogicFamily.DOMINO) {
      if (event.key === 'Backspace') {
        event.preventDefault();
        this.eraseDominoDigit();
        return;
      }
      if (/^[0-6]$/.test(event.key)) {
        event.preventDefault();
        this.enterDominoDigit(Number(event.key) as DominoFace);
      }
      return;
    }
    const choiceCount =
      item.family === LogicFamily.NUMERIC
        ? item.choices.length
        : item.proposals.length;
    const digit = Number(event.key);
    if (Number.isInteger(digit) && digit >= 1 && digit <= choiceCount) {
      event.preventDefault();
      this.select(digit - 1);
      return;
    }
    const letterIndex = MATRIX_PROPOSAL_LETTERS.indexOf(
      event.key.toUpperCase(),
    );
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
    if (
      session.mode === SessionMode.FULL &&
      simulationCurrentAxis(session) !== this.axis
    ) {
      this.router.navigate(['/entrainements/simulation/session', session.id]);
      return;
    }
    this.enteredAtMs = Date.now();
    this.loaded.set(true);
  }

  protected onCountdownFinished(): void {
    if (!this.countingDown()) {
      return;
    }
    this.countingDown.set(false);
    this.facade.rebaseClock();
    this.enteredAtMs = Date.now();
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
