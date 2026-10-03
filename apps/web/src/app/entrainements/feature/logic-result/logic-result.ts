import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  AxisFinding,
  AxisType,
  LogicFamilyResultDto,
  LogicSessionScore,
  LogicItem,
  analyzeLogic,
  getAxisRecommendations,
  scoreLogicSession,
} from '@psychotech/shared';
import { BadgeAnnounce } from '../../../shared/ui/badge-announce/badge-announce';
import {
  buildLogicChartEntries,
  buildLogicMetricRows,
} from '../../../shared/ui/axis-result-content';
import {
  adaptLogicItemsForAnalyzer,
  findLogicFamilyBoundaries,
  regenerateLogicItems,
} from '../../../shared/ui/logic-result-items';
import { ResultActions } from '../../ui/result-actions/result-actions';
import { ResultFamilyBars } from '../../../shared/ui/result-family-bars/result-family-bars';
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
import { buildTargetedCorrectionRoute } from '../../../shared/util/session-links';

@Component({
  selector: 'app-logic-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeAnnounce,
    ResultActions,
    ResultFamilyBars,
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
  private readonly router = inject(Router);
  protected readonly page = createTargetedResultPage(AxisType.LOGIC);

  private readonly items = computed<LogicItem[] | null>(() => {
    const result = this.page.result();
    return result ? regenerateLogicItems(result) : null;
  });

  protected readonly scored = computed<LogicSessionScore | null>(() => {
    const result = this.page.result();
    const items = this.items();
    return result && items ? scoreLogicSession(items, result.items) : null;
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const result = this.page.result();
    const items = this.items();
    const scored = this.scored();
    return result && items && scored
      ? getAxisRecommendations(
          analyzeLogic(
            adaptLogicItemsForAnalyzer(items),
            scored,
            result.items,
            items,
            result.logicFamily,
          ),
        )
      : [];
  });

  protected readonly recordVisible = computed(() => {
    const result = this.page.result();
    return !result || (result.logicFamily === null && !result.untimed);
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const result = this.page.result();
    const scored = this.scored();
    return result && scored ? buildLogicMetricRows(scored, result) : [];
  });

  protected readonly families = computed<LogicFamilyResultDto[]>(
    () => this.page.result()?.families ?? [],
  );

  protected readonly familyBoundaries = computed<number[]>(() =>
    findLogicFamilyBoundaries(this.items() ?? []),
  );

  protected readonly chartEntries = computed<TimeChartEntry[]>(() => {
    const result = this.page.result();
    const scored = this.scored();
    return result && scored ? buildLogicChartEntries(scored, result) : [];
  });

  protected navigateToCorrection(): void {
    this.router.navigate(
      buildTargetedCorrectionRoute(AxisType.LOGIC, this.page.sessionId),
    );
  }
}
