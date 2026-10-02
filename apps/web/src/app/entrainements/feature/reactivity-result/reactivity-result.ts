import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  AxisFinding,
  AxisType,
  ReactivitySessionScore,
  analyzeReactivity,
  generateReactivitySession,
  getAxisRecommendations,
  scoreReactivitySession,
} from '@psychotech/shared';
import { BadgeAnnounce } from '../../../shared/ui/badge-announce/badge-announce';
import { buildReactivityMetricRows } from '../../../shared/ui/axis-result-content';
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
import { ReactivityTrChart } from '../../../shared/ui/reactivity-tr-chart/reactivity-tr-chart';

@Component({
  selector: 'app-reactivity-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeAnnounce,
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
  protected readonly page = targetedResultPage(AxisType.REACTIVITY);

  protected readonly scored = computed<ReactivitySessionScore | null>(() => {
    const result = this.page.result();
    return result
      ? scoreReactivitySession(
          generateReactivitySession(result.seed),
          result.stimuli,
          result.waitPresses,
        )
      : null;
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const scored = this.scored();
    return scored ? getAxisRecommendations(analyzeReactivity(scored)) : [];
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    return scored ? buildReactivityMetricRows(scored) : [];
  });
}
