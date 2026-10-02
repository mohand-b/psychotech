import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  AxisFinding,
  AxisType,
  MotorSkillsMetrics,
  analyzeMotricity,
  getAxisRecommendations,
} from '@psychotech/shared';
import { BadgeAnnounce } from '../../../shared/ui/badge-announce/badge-announce';
import { buildMotricityMetricRows } from '../../../shared/ui/axis-result-content';
import { ResultActions } from '../../ui/result-actions/result-actions';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../../shared/ui/result-metrics/result-metrics';
import { ResultPage } from '../../ui/result-page/result-page';
import { ResultPanel } from '../../ui/result-panel/result-panel';
import { ResultRecommendation } from '../../ui/result-recommendation/result-recommendation';
import { ResultSummary } from '../../ui/result-summary/result-summary';
import { targetedResultPage } from '../targeted-result-page';
import { ResultTiming } from '../../ui/result-timing/result-timing';
import { MotricityTrajectoryChart } from '../../../shared/ui/motricity-trajectory-chart/motricity-trajectory-chart';

@Component({
  selector: 'app-motricity-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeAnnounce,
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
  protected readonly page = targetedResultPage(AxisType.MOTOR_SKILLS);

  protected readonly metrics = computed<MotorSkillsMetrics | null>(
    () => this.page.result()?.metrics ?? null,
  );

  protected readonly hasTimeline = computed(() => {
    const metrics = this.metrics();
    return (
      metrics !== null &&
      metrics.timeline.some((series) => series.points.length > 0)
    );
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const metrics = this.metrics();
    return metrics ? getAxisRecommendations(analyzeMotricity(metrics)) : [];
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const metrics = this.metrics();
    return metrics ? buildMotricityMetricRows(metrics) : [];
  });
}
