import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisType,
  DominoFace,
  LogicFamily,
  LogicItemStatus,
  LogicNumericStructure,
  TargetedLogicResultDto,
  resolveLogicRuleDetail,
  resolveTriangleRuleDetail,
  scoreLogicSession,
} from '@psychotech/shared';
import { ArrowRight } from 'lucide-angular';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { Icon } from '../../../shared/ui/icon/icon';
import { MatrixCell } from '../../../shared/ui/matrix/matrix-cell';
import {
  TriangleDisplayValues,
  TriangleSeries,
  triangleDisplayValues,
} from '../../../shared/ui/triangle/triangle-series';
import { TriangleTile } from '../../../shared/ui/triangle/triangle-tile';
import { axisSlug } from '../../../shared/util/axis-slug';
import { CorrectionShell } from '../../ui/correction-shell/correction-shell';
import { StatusBandEntry } from '../../ui/correction-status-band/correction-status-band';
import { DominoPips } from '../../ui/domino-pips/domino-pips';
import { LogicChoices } from '../../ui/logic-choices/logic-choices';
import { LogicSequence } from '../../ui/logic-sequence/logic-sequence';
import { MATRIX_PROPOSAL_LETTERS } from '../../ui/logic-matrix/logic-matrix';
import {
  LOGIC_STATUS_COLORS,
  LOGIC_STATUS_LABELS,
} from '../../ui/logic-status';
import {
  logicFamilyBoundaries,
  logicItemsForResult,
} from '../../ui/logic-result-items';

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

interface DominoUserAnswer {
  top: DominoFace;
  bottom: DominoFace;
  topCorrect: boolean;
  bottomCorrect: boolean;
}

@Component({
  selector: 'app-logic-correction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CorrectionShell,
    DominoPips,
    Icon,
    LogicChoices,
    LogicSequence,
    MatrixCell,
    TriangleSeries,
    TriangleTile,
  ],
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
  private readonly fromSimulation =
    this.route.snapshot.data['simulation'] === true;
  protected readonly axis = AxisType.LOGIC;
  protected readonly families = LogicFamily;
  protected readonly letters = MATRIX_PROPOSAL_LETTERS;
  protected readonly chevronIcon = ArrowRight;

  protected readonly result = signal<TargetedLogicResultDto | null>(null);
  protected readonly currentIndex = signal(0);


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
    return result ? logicItemsForResult(result) : [];
  });

  protected readonly total = computed(() => this.items().length);

  protected readonly familyBoundaries = computed<number[]>(() =>
    logicFamilyBoundaries(this.items()),
  );

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

  protected readonly sequenceItem = computed(() => {
    const item = this.currentItem();
    return item?.family === LogicFamily.NUMERIC &&
      item.structure === LogicNumericStructure.SEQUENCE
      ? item
      : null;
  });

  protected readonly triangleItem = computed(() => {
    const item = this.currentItem();
    return item?.family === LogicFamily.NUMERIC &&
      item.structure === LogicNumericStructure.TRIANGLE
      ? item
      : null;
  });

  protected readonly triangleCorrectView =
    computed<TriangleDisplayValues | null>(() => {
      const item = this.triangleItem();
      if (!item) {
        return null;
      }
      const missing = item.triangle.missing;
      return triangleDisplayValues(
        item.triangle.triangles[missing.triangleIndex],
        missing.slot,
        item.answer,
      );
    });

  protected readonly triangleUserView =
    computed<TriangleDisplayValues | null>(() => {
      const item = this.triangleItem();
      const value = this.responseByIndex().get(
        this.currentIndex(),
      )?.numericValue;
      if (
        !item ||
        value === null ||
        value === undefined ||
        value === item.answer
      ) {
        return null;
      }
      const missing = item.triangle.missing;
      return triangleDisplayValues(
        item.triangle.triangles[missing.triangleIndex],
        missing.slot,
        value,
      );
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

  protected readonly matrixGridCells = computed(
    () => this.matrixItem()?.matrix.cells.slice(0, 8) ?? [],
  );

  protected readonly dominoUserAnswer = computed<DominoUserAnswer | null>(
    () => {
      const item = this.dominoItem();
      const response = this.responseByIndex().get(this.currentIndex());
      if (
        !item ||
        response?.dominoTop === null ||
        response?.dominoTop === undefined ||
        response.dominoBottom === null ||
        response.dominoBottom === undefined
      ) {
        return null;
      }
      const answer = item.domino.answer;
      const topCorrect = response.dominoTop === answer.top;
      const bottomCorrect = response.dominoBottom === answer.bottom;
      return topCorrect && bottomCorrect
        ? null
        : {
            top: response.dominoTop,
            bottom: response.dominoBottom,
            topCorrect,
            bottomCorrect,
          };
    },
  );

  protected readonly currentStatus = computed<LogicItemStatus>(
    () => this.statuses()[this.currentIndex()] ?? 'UNREACHED',
  );

  protected readonly badge = computed(
    () => STATUS_BADGES[this.currentStatus()],
  );

  protected readonly hint = computed(() => {
    const sequence = this.sequenceItem();
    if (sequence) {
      return resolveLogicRuleDetail(
        { ruleId: sequence.rule.id, sequence: sequence.sequence },
        sequence.choices[sequence.answerIndex],
      );
    }
    return this.currentItem()?.rule.userText ?? '';
  });

  protected readonly triangleRule = computed(() => {
    const item = this.triangleItem();
    return item ? resolveTriangleRuleDetail(item.triangle) : '';
  });

  protected readonly userAnswerIndex = computed(
    () => this.responseByIndex().get(this.currentIndex())?.answerIndex ?? null,
  );

  protected isWrongMatrixChoice(index: number): boolean {
    const item = this.matrixItem();
    return (
      item !== null &&
      this.userAnswerIndex() === index &&
      item.answerIndex !== index
    );
  }

  protected readonly timeLabel = computed(() => {
    if (this.currentStatus() === 'UNREACHED') {
      return '-';
    }
    const timeMs = this.responseByIndex().get(this.currentIndex())?.timeMs;
    return timeMs === undefined ? '-' : `${Math.round(timeMs / 1000)} s`;
  });

  protected readonly isFirst = computed(() => this.currentIndex() === 0);
  protected readonly isLast = computed(
    () => this.currentIndex() >= this.items().length - 1,
  );

  protected goTo(index: number): void {
    if (index < 0 || index >= this.items().length) {
      return;
    }
    this.currentIndex.set(index);
  }

  protected previous(): void {
    this.goTo(this.currentIndex() - 1);
  }

  protected next(): void {
    this.goTo(this.currentIndex() + 1);
  }

  protected backToResult(): void {
    if (this.fromSimulation) {
      this.router.navigate(['/sessions', this.sessionId, 'resultat']);
      return;
    }
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.LOGIC),
      'session',
      this.sessionId,
      'resultat',
    ]);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }
}
