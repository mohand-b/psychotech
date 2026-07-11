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
  ReactivitySessionScore,
  TargetedReactivityResultDto,
  TrainingRecommendation,
  generateReactivitySession,
  getReactivityRecommendation,
  scoreReactivitySession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { axisSlug } from '../../../shared/util/axis-slug';
import { backFromTargetedResult } from '../../ui/result-navigation';
import { buildReactivityMetricRows } from '../../ui/axis-result-content';
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
import { ReactivityTrChart } from '../../ui/reactivity-tr-chart/reactivity-tr-chart';

@Component({
  selector: 'app-reactivity-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactivityTrChart,
    ResultActions,
    ResultMetrics,
    ResultPage,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
  ],
  templateUrl: './reactivity-result.html',
})
export class ReactivityResult {
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

  protected readonly result = signal<TargetedReactivityResultDto | null>(null);

  constructor() {
    this.facade
      .loadTargetedResult(this.sessionId, AxisType.REACTIVITY)
      .subscribe({
        next: (result) => {
          if (result.axis === AxisType.REACTIVITY) {
            this.result.set(result);
          }
        },
        error: () => this.router.navigate(['/entrainements']),
      });
  }

  protected readonly scored = computed<ReactivitySessionScore | null>(() => {
    const result = this.result();
    return result
      ? scoreReactivitySession(
          generateReactivitySession(result.seed),
          result.stimuli,
          result.waitPresses,
        )
      : null;
  });

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const scored = this.scored();
      return scored ? getReactivityRecommendation(scored) : null;
    },
  );

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    return scored ? buildReactivityMetricRows(scored) : [];
  });

  protected newTraining(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.REACTIVITY),
    ]);
  }

  protected back(): void {
    backFromTargetedResult(this.router, this.cameFromPlay);
  }
}
