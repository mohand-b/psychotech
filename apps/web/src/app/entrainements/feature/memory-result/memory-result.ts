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
  MemorySessionScore,
  TargetedMemoryResultDto,
  TrainingRecommendation,
  generateMemorySession,
  getMemoryRecommendation,
  scoreMemorySession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { MemoryReliabilityChart } from '../../ui/memory-reliability-chart/memory-reliability-chart';
import { ResultActions } from '../../ui/result-actions/result-actions';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../ui/result-metrics/result-metrics';
import { ResultPanel } from '../../ui/result-panel/result-panel';
import { ResultRecommendation } from '../../ui/result-recommendation/result-recommendation';
import { ResultSummary } from '../../ui/result-summary/result-summary';
import { ResultTiming } from '../../ui/result-timing/result-timing';

@Component({
  selector: 'app-memory-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MemoryReliabilityChart,
    ResultActions,
    ResultMetrics,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
  ],
  templateUrl: './memory-result.html',
  styleUrl: './memory-result.css',
})
export class MemoryResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly training = AXIS_TRAINING[AxisType.MEMORY];

  protected readonly result = signal<TargetedMemoryResultDto | null>(null);

  constructor() {
    this.facade.loadTargetedResult(this.sessionId, AxisType.MEMORY).subscribe({
      next: (result) => {
        if (result.axis === AxisType.MEMORY) {
          this.result.set(result);
        }
      },
      error: () => this.router.navigate(['/entrainements']),
    });
  }

  protected readonly scored = computed<MemorySessionScore | null>(() => {
    const result = this.result();
    return result
      ? scoreMemorySession(generateMemorySession(result.seed), result.sequences)
      : null;
  });

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const scored = this.scored();
      return scored ? getMemoryRecommendation(scored) : null;
    },
  );

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    if (!scored) {
      return [];
    }
    const normalCount = this.training.sequences.filter(
      ({ phase }) => phase === MemoryPhase.NORMAL,
    ).length;
    const inverseCount = this.training.sequences.length - normalCount;
    return [
      {
        label: 'Séquences parfaites',
        value: `${scored.perfectCount}`,
        suffix: `/${this.training.sequences.length}`,
      },
      {
        label: 'Ordre normal',
        value: `${scored.perfectNormalCount}`,
        suffix: `/${normalCount}`,
      },
      {
        label: 'Ordre inversé',
        value: `${scored.perfectInverseCount}`,
        suffix: `/${inverseCount}`,
      },
      {
        label: 'Éléments restitués',
        value: `${scored.restitutedPct}`,
        suffix: ' %',
      },
      {
        label: 'Éléments bien placés',
        value: `${scored.placedPct}`,
        suffix: ' %',
      },
      {
        label: 'Restitutions hors délai',
        value: `${scored.timedOutCount}`,
      },
    ];
  });

  protected review(): void {
    this.router.navigate([
      '/entrainements/cible',
      AxisType.MEMORY,
      'session',
      this.sessionId,
      'correction',
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/cible', AxisType.MEMORY]);
  }

  protected backToAxes(): void {
    this.router.navigate(['/entrainements/choisir-axe']);
  }
}
