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
  MemorySessionScore,
  TargetedMemoryResultDto,
  TrainingRecommendation,
  generateMemorySession,
  getMemoryRecommendation,
  scoreMemorySession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { axisSlug } from '../../../shared/util/axis-slug';
import { buildMemoryMetricRows } from '../../ui/axis-result-content';
import { MemoryReliabilityChart } from '../../ui/memory-reliability-chart/memory-reliability-chart';
import { ResultActions } from '../../ui/result-actions/result-actions';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../ui/result-metrics/result-metrics';
import { ResultPage } from '../../ui/result-page/result-page';
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
    ResultPage,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
  ],
  templateUrl: './memory-result.html',
})
export class MemoryResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly cameFromPlay =
    this.facade.session()?.id === this.sessionId;
  protected readonly backLabel = this.cameFromPlay
    ? 'Retour aux axes'
    : 'Retour aux sessions';

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
    return scored ? buildMemoryMetricRows(scored) : [];
  });

  protected review(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.MEMORY),
      'session',
      this.sessionId,
      'correction',
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/cible', axisSlug(AxisType.MEMORY)]);
  }

  protected back(): void {
    this.router.navigate([
      this.cameFromPlay ? '/entrainements/choisir-axe' : '/sessions',
    ]);
  }
}
