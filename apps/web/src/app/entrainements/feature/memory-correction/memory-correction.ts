import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AXIS_TRAINING,
  AxisType,
  MemoryPhase,
  MemoryPositionState,
  MemorySequenceStatus,
  expectedMemoryAnswer,
  generateMemorySession,
  scoreMemorySession,
} from '@psychotech/shared';
import {
  ArrowLeftRight,
  Check,
  Clock,
  CornerUpLeft,
  LucideIconData,
  MoveRight,
  X,
} from 'lucide-angular';
import { Icon } from '../../../shared/ui/icon/icon';
import { CorrectionShell } from '../../ui/correction-shell/correction-shell';
import { StatusBandEntry } from '../../ui/correction-status-band/correction-status-band';
import { loadTargetedResultFromRoute } from '../targeted-result-page';
import {
  buildSimulationResultRoute,
  buildTargetedResultRoute,
} from '../../../shared/util/session-links';

const STATUS_COLORS: Record<MemorySequenceStatus, string> = {
  PERFECT: 'var(--axis-memory)',
  FAILED: 'var(--danger)',
  TIMED_OUT: 'var(--warning)',
};

const STATUS_BADGES: Record<
  MemorySequenceStatus,
  { label: string; backgroundVar: string; colorVar: string }
> = {
  PERFECT: {
    label: 'Réussie',
    backgroundVar: 'var(--axis-memory-pastel)',
    colorVar: 'var(--axis-memory-text)',
  },
  FAILED: {
    label: 'Échouée',
    backgroundVar: 'var(--danger-pastel)',
    colorVar: 'var(--danger-text)',
  },
  TIMED_OUT: {
    label: 'Hors délai',
    backgroundVar: 'var(--warning-pastel)',
    colorVar: 'var(--warning-text)',
  },
};

const LEGEND: StatusBandEntry[] = [
  { colorVar: STATUS_COLORS.PERFECT, label: 'réussie' },
  { colorVar: STATUS_COLORS.FAILED, label: 'échouée' },
  { colorVar: STATUS_COLORS.TIMED_OUT, label: 'hors délai' },
];

interface AnswerCell {
  digit: number | null;
  state: MemoryPositionState;
}

@Component({
  selector: 'app-memory-correction',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CorrectionShell, Icon],
  templateUrl: './memory-correction.html',
  styleUrl: './memory-correction.css',
  host: { '(document:keydown)': 'navigateItemsWithArrowKeys($event)' },
})
export class MemoryCorrection {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly targetedResult = loadTargetedResultFromRoute(
    AxisType.MEMORY,
  );

  private readonly sessionId = this.targetedResult.sessionId;
  private readonly fromSimulation =
    this.route.snapshot.data['simulation'] === true;
  protected readonly axis = AxisType.MEMORY;
  protected readonly total = AXIS_TRAINING[AxisType.MEMORY].exerciseCount;
  protected readonly inversePhase = MemoryPhase.INVERSE;

  protected readonly result = this.targetedResult.result;
  protected readonly currentIndex = signal(0);

  protected readonly normalIcon = MoveRight;
  protected readonly inverseIcon = CornerUpLeft;
  protected readonly checkIcon = Check;
  protected readonly misplacedIcon = ArrowLeftRight;
  protected readonly crossIcon = X;
  protected readonly clockIcon = Clock;

  protected readonly sequences = computed(() => {
    const result = this.result();
    return result ? generateMemorySession(result.seed) : [];
  });

  protected readonly scored = computed(() => {
    const result = this.result();
    return result
      ? scoreMemorySession(this.sequences(), result.sequences)
      : null;
  });

  protected readonly dots = computed<StatusBandEntry[]>(
    () =>
      this.scored()?.results.map(({ status }) => ({
        colorVar: STATUS_COLORS[status],
        label: STATUS_BADGES[status].label,
      })) ?? [],
  );

  protected readonly legend = LEGEND;

  protected readonly currentSequence = computed(
    () => this.sequences()[this.currentIndex()] ?? null,
  );

  protected readonly currentStatus = computed<MemorySequenceStatus>(
    () => this.scored()?.results[this.currentIndex()]?.status ?? 'FAILED',
  );

  protected readonly badge = computed(
    () => STATUS_BADGES[this.currentStatus()],
  );

  protected readonly phaseIcon = computed<LucideIconData>(() =>
    this.currentSequence()?.phase === MemoryPhase.INVERSE
      ? this.inverseIcon
      : this.normalIcon,
  );

  protected readonly phaseLabel = computed(() =>
    this.currentSequence()?.phase === MemoryPhase.INVERSE
      ? 'Ordre inversé'
      : 'Ordre normal',
  );

  protected readonly expectedAnswer = computed(() => {
    const sequence = this.currentSequence();
    return sequence ? expectedMemoryAnswer(sequence) : [];
  });

  protected readonly answerCells = computed<AnswerCell[]>(() => {
    const sequence = this.currentSequence();
    const scored = this.scored();
    const result = this.result();
    if (!sequence || !scored || !result) {
      return [];
    }
    const states = scored.results[this.currentIndex()].positionStates;
    const input =
      result.sequences.find(({ index }) => index === sequence.index)?.input ??
      [];
    return states.map((state, position) => ({
      digit: input[position] ?? null,
      state,
    }));
  });

  protected readonly timeLabel = computed(() => {
    const result = this.result();
    const sequence = this.currentSequence();
    const timeMs = result?.sequences.find(
      ({ index }) => index === sequence?.index,
    )?.timeMs;
    return timeMs === undefined ? '-' : `${Math.round(timeMs / 1000)}`;
  });

  protected readonly isFirst = computed(() => this.currentIndex() === 0);
  protected readonly isLast = computed(
    () => this.currentIndex() >= this.sequences().length - 1,
  );

  protected navigateToItem(index: number): void {
    if (index >= 0 && index < this.sequences().length) {
      this.currentIndex.set(index);
    }
  }

  protected navigateToPreviousItem(): void {
    this.navigateToItem(this.currentIndex() - 1);
  }

  protected navigateToNextItem(): void {
    this.navigateToItem(this.currentIndex() + 1);
  }

  protected returnToResult(): void {
    if (this.fromSimulation) {
      this.router.navigate(buildSimulationResultRoute(this.sessionId));
      return;
    }
    this.router.navigate(
      buildTargetedResultRoute(AxisType.MEMORY, this.sessionId),
    );
  }

  protected navigateItemsWithArrowKeys(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.navigateToPreviousItem();
      return;
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.navigateToNextItem();
    }
  }
}
