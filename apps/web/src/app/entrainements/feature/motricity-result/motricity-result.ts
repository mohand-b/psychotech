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
  MotorSkillsMetrics,
  TargetedMotricityResultDto,
  TrainingRecommendation,
  getMotricityRecommendation,
} from '@psychotech/shared';
import { TrainingSessionFacade } from '../../../sessions/data-access/training-session.facade';
import { axisSlug } from '../../../shared/util/axis-slug';
import { buildMotricityMetricRows } from '../../ui/axis-result-content';
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
import { MotricityTrajectoryChart } from '../../ui/motricity-trajectory-chart/motricity-trajectory-chart';

@Component({
  selector: 'app-motricity-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MotricityTrajectoryChart,
    ResultActions,
    ResultMetrics,
    ResultPage,
    ResultPanel,
    ResultRecommendation,
    ResultSummary,
    ResultTiming,
  ],
  templateUrl: './motricity-result.html',
  styleUrl: './motricity-result.css',
})
export class MotricityResult {
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

  protected readonly result = signal<TargetedMotricityResultDto | null>(null);

  constructor() {
    this.facade
      .loadTargetedResult(this.sessionId, AxisType.MOTOR_SKILLS)
      .subscribe({
        next: (result) => {
          if (result.axis === AxisType.MOTOR_SKILLS) {
            this.result.set(result);
          }
        },
        error: () => this.router.navigate(['/entrainements']),
      });
  }

  protected readonly metrics = computed<MotorSkillsMetrics | null>(
    () => this.result()?.metrics ?? null,
  );

  protected readonly hasTimeline = computed(() => {
    const metrics = this.metrics();
    return (
      metrics !== null &&
      metrics.timeline.some((series) => series.points.length > 0)
    );
  });

  protected readonly recommendation = computed<TrainingRecommendation | null>(
    () => {
      const metrics = this.metrics();
      return metrics ? getMotricityRecommendation(metrics) : null;
    },
  );

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const metrics = this.metrics();
    return metrics ? buildMotricityMetricRows(metrics) : [];
  });

  protected newTraining(): void {
    this.router.navigate([
      '/entrainements/cible',
      axisSlug(AxisType.MOTOR_SKILLS),
    ]);
  }

  protected back(): void {
    this.router.navigate([
      this.cameFromPlay ? '/entrainements/choisir-axe' : '/sessions',
    ]);
  }
}
