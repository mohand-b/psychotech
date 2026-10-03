import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  AxisFinding,
  AxisType,
  DiscriminationSessionScore,
  analyzeDiscrimination,
  generateDiscriminationSession,
  getAxisRecommendations,
  scoreDiscriminationSession,
} from '@psychotech/shared';
import { BadgeAnnounce } from '../../../shared/ui/badge-announce/badge-announce';
import {
  buildDiscriminationChartEntries,
  buildDiscriminationMetricRows,
} from '../../../shared/ui/axis-result-content';
import { ResultActions } from '../../ui/result-actions/result-actions';
import {
  ResultMetricRow,
  ResultMetrics,
} from '../../../shared/ui/result-metrics/result-metrics';
import { ResultPage } from '../../ui/result-page/result-page';
import { ResultPanel } from '../../ui/result-panel/result-panel';
import { ResultRecommendation } from '../../ui/result-recommendation/result-recommendation';
import { ResultSummary } from '../../ui/result-summary/result-summary';
import { createTargetedResultPage } from '../targeted-result-page';
import { ResultTiming } from '../../ui/result-timing/result-timing';
import {
  TimeChart,
  TimeChartEntry,
} from '../../../shared/ui/time-chart/time-chart';

@Component({
  selector: 'app-discrimination-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeAnnounce,
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
  protected readonly page = createTargetedResultPage(
    AxisType.VISUAL_DISCRIMINATION,
  );

  protected readonly scored = computed<DiscriminationSessionScore | null>(
    () => {
      const result = this.page.result();
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
    const result = this.page.result();
    const scored = this.scored();
    return result && scored
      ? buildDiscriminationChartEntries(scored, result)
      : [];
  });
}
