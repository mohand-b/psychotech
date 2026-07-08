import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  LogicItemStatus,
  TargetedLogicResultDto,
  generateLogicSession,
  resolveLogicRuleHint,
  scoreLogicSession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import {
  CorrectionShell,
} from '../../ui/correction-shell/correction-shell';
import { StatusBandEntry } from '../../ui/correction-status-band/correction-status-band';
import { LogicChoices } from '../../ui/logic-choices/logic-choices';
import { LogicSequence } from '../../ui/logic-sequence/logic-sequence';
import { LOGIC_STATUS_COLORS, LOGIC_STATUS_LABELS } from '../../ui/logic-status';

const STATUS_BADGES: Record<
  LogicItemStatus,
  { label: string; backgroundVar: string; colorVar: string }
> = {
  CORRECT: {
    label: 'Juste',
    backgroundVar: 'var(--secondary-pastel)',
    colorVar: 'var(--secondary-label)',
  },
  WRONG: {
    label: 'Erreur',
    backgroundVar: 'var(--danger-pastel)',
    colorVar: 'var(--danger-text)',
  },
  SKIPPED: {
    label: 'Sans réponse',
    backgroundVar: 'var(--warning-pastel)',
    colorVar: 'var(--warning-text)',
  },
  UNREACHED: {
    label: 'Non atteint',
    backgroundVar: 'var(--surface-muted)',
    colorVar: 'var(--text-secondary)',
  },
};

const LEGEND_STATUSES: LogicItemStatus[] = [
  'CORRECT',
  'WRONG',
  'SKIPPED',
  'UNREACHED',
];

@Component({
  selector: 'app-logic-correction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CorrectionShell, LogicChoices, LogicSequence],
  templateUrl: './logic-correction.html',
  styleUrl: './logic-correction.css',
  host: { '(document:keydown)': 'onKeydown($event)' },
})
export class LogicCorrection {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  protected readonly axis = AxisType.LOGIC;
  protected readonly total = AXIS_TRAINING[AxisType.LOGIC].exerciseCount;

  protected readonly result = signal<TargetedLogicResultDto | null>(null);
  protected readonly currentIndex = signal(0);

  private readonly sequence = viewChild<LogicSequence>('sequence');

  constructor() {
    this.facade.loadTargetedResult(this.sessionId, AxisType.LOGIC).subscribe({
      next: (result) => {
        if (result.axis === AxisType.LOGIC) {
          this.result.set(result);
        }
      },
      error: () => this.router.navigate(['/entrainements']),
    });
  }

  protected readonly items = computed(() => {
    const result = this.result();
    return result ? generateLogicSession(result.seed) : [];
  });

  protected readonly statuses = computed<LogicItemStatus[]>(() => {
    const result = this.result();
    return result
      ? scoreLogicSession(this.items(), result.items).statuses
      : [];
  });

  protected readonly dots = computed<StatusBandEntry[]>(() =>
    this.statuses().map((status) => ({
      colorVar: LOGIC_STATUS_COLORS[status],
      label: LOGIC_STATUS_LABELS[status],
    })),
  );

  protected readonly legend: StatusBandEntry[] = LEGEND_STATUSES.map(
    (status) => ({
      colorVar: LOGIC_STATUS_COLORS[status],
      label: LOGIC_STATUS_LABELS[status].toLowerCase(),
    }),
  );

  private readonly responseByIndex = computed(() => {
    const result = this.result();
    return new Map(
      (result?.items ?? []).map((response) => [response.index, response]),
    );
  });

  protected readonly currentItem = computed(
    () => this.items()[this.currentIndex()] ?? null,
  );

  protected readonly currentStatus = computed<LogicItemStatus>(
    () => this.statuses()[this.currentIndex()] ?? 'UNREACHED',
  );

  protected readonly badge = computed(() => STATUS_BADGES[this.currentStatus()]);

  protected readonly hint = computed(() => {
    const item = this.currentItem();
    return item ? resolveLogicRuleHint(item) : '';
  });

  protected readonly userAnswerIndex = computed(
    () => this.responseByIndex().get(this.currentIndex())?.answerIndex ?? null,
  );

  protected readonly timeLabel = computed(() => {
    if (this.currentStatus() === 'UNREACHED') {
      return '—';
    }
    const timeMs = this.responseByIndex().get(this.currentIndex())?.timeMs;
    return timeMs === undefined ? '—' : `${Math.round(timeMs / 1000)} s`;
  });

  protected readonly isFirst = computed(() => this.currentIndex() === 0);
  protected readonly isLast = computed(
    () => this.currentIndex() >= this.items().length - 1,
  );

  protected goTo(index: number): void {
    if (index < 0 || index >= this.items().length) {
      return;
    }
    this.sequence()?.close();
    this.currentIndex.set(index);
  }

  protected previous(): void {
    this.goTo(this.currentIndex() - 1);
  }

  protected next(): void {
    this.goTo(this.currentIndex() + 1);
  }

  protected backToResult(): void {
    this.router.navigate([
      '/entrainements/cible',
      AxisType.LOGIC,
      'session',
      this.sessionId,
      'resultat',
    ]);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.sequence()?.close(true);
      return;
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
      return;
    }
    if (event.key === 'h' || event.key === 'H') {
      event.preventDefault();
      this.sequence()?.toggle();
    }
  }
}
