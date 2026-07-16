import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AxisFinding,
  AxisType,
  DiscriminationSessionScore,
  TargetedDiscriminationResultDto,
  analyzeDiscrimination,
  generateDiscriminationSession,
  getAxisRecommendations,
  scoreDiscriminationSession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { axisSlug } from '../../../shared/util/axis-slug';
import { backFromTargetedResult } from '../../ui/result-navigation';
import {
  buildDiscriminationChartEntries,
  buildDiscriminationMetricRows,
} from '../../ui/axis-result-content';
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
import { TimeChart, TimeChartEntry } from '../../ui/time-chart/time-chart';

@Component({
  selector: 'app-discrimination-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ResultActions,
    ResultMetrics,
    ResultPage,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
    TimeChart,
  ],
  templateUrl: './discrimination-result.html',
})
export class DiscriminationResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly cameFromPlay = this.facade.session()?.id === this.sessionId;
  protected readonly backLabel = this.cameFromPlay
    ? 'Retour aux axes'
    : 'Retour aux sessions';

  protected readonly axis = AxisType.VISUAL_DISCRIMINATION;
  protected readonly result = signal<TargetedDiscriminationResultDto | null>(
    null,
  );

  constructor() {
    this.facade
      .loadTargetedResult(this.sessionId, AxisType.VISUAL_DISCRIMINATION)
      .subscribe({
        next: (result) => {
          if (result.axis === AxisType.VISUAL_DISCRIMINATION) {
            this.result.set(result);
          }
        },
        error: () => this.router.navigate(['/entrainements']),
      });
  }

  protected readonly scored = computed<DiscriminationSessionScore | null>(
    () => {
      const result = this.result();
      return result
        ? scoreDiscriminationSession(
            generateDiscriminationSession(result.seed),
            result.trials,
          )
        : null;
    },
  );

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const scored = this.scored();
    return scored ? getAxisRecommendations(analyzeDiscrimination(scored)) : [];
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    return scored ? buildDiscriminationMetricRows(scored) : [];
  });

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    return result && scored
      ? buildDiscriminationChartEntries(scored, result)
      : [];
  });

  protected newTraining(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.VISUAL_DISCRIMINATION),
    ]);
  }

  protected back(): void {
    backFromTargetedResult(this.router, this.cameFromPlay);
  }
}
