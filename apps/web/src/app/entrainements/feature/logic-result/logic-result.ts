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
  LogicItem,
  LogicSessionScore,
  TargetedLogicResultDto,
  analyzeLogic,
  generateLogicSession,
  getAxisRecommendations,
  scoreLogicSession,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { axisSlug } from '../../../shared/util/axis-slug';
import { backFromTargetedResult } from '../../ui/result-navigation';
import {
  buildLogicChartEntries,
  buildLogicMetricRows,
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
  selector: 'app-logic-result',
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
  templateUrl: './logic-result.html',
})
export class LogicResult {
  private readonly facade = inject(TrainingSessionFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly sessionId =
    this.route.snapshot.paramMap.get('sessionId') ?? '';
  private readonly cameFromPlay = this.facade.session()?.id === this.sessionId;
  protected readonly backLabel = this.cameFromPlay
    ? 'Retour aux axes'
    : 'Retour aux sessions';

  protected readonly axis = AxisType.LOGIC;
  protected readonly result = signal<TargetedLogicResultDto | null>(null);

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

  private readonly items = computed<LogicItem[] | null>(() => {
    const result = this.result();
    return result ? generateLogicSession(result.seed) : null;
  });

  protected readonly scored = computed<LogicSessionScore | null>(() => {
    const result = this.result();
    const items = this.items();
    return result && items ? scoreLogicSession(items, result.items) : null;
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const result = this.result();
    const items = this.items();
    const scored = this.scored();
    return result && items && scored
      ? getAxisRecommendations(analyzeLogic(items, scored, result.items))
      : [];
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const result = this.result();
    const scored = this.scored();
    return result && scored ? buildLogicMetricRows(scored, result) : [];
  });

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.result();
    const scored = this.scored();
    return result && scored ? buildLogicChartEntries(scored, result) : [];
  });

  protected review(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.LOGIC),
      'session',
      this.sessionId,
      'correction',
    ]);
  }

  protected newTraining(): void {
    this.router.navigate(['/entrainements/cible', axisSlug(AxisType.LOGIC)]);
  }

  protected back(): void {
    backFromTargetedResult(this.router, this.cameFromPlay);
  }
}
