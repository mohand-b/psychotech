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
  MemorySequence,
  MemorySessionScore,
  analyzeMemory,
  generateMemorySession,
  getAxisRecommendations,
  scoreMemorySession,
} from '@psychotech/shared';
import { BadgeAnnounce } from '../../../shared/ui/badge-announce/badge-announce';
import { buildMemoryMetricRows } from '../../../shared/ui/axis-result-content';
import { MemoryReliabilityChart } from '../../../shared/ui/memory-reliability-chart/memory-reliability-chart';
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
import { buildTargetedCorrectionRoute } from '../../../shared/util/session-links';

@Component({
  selector: 'app-memory-result',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BadgeAnnounce,
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
  private readonly router = inject(Router);
  protected readonly page = createTargetedResultPage(AxisType.MEMORY);

  private readonly sequences = computed<MemorySequence[] | null>(() => {
    const result = this.page.result();
    return result ? generateMemorySession(result.seed) : null;
  });

  protected readonly scored = computed<MemorySessionScore | null>(() => {
    const result = this.page.result();
    const sequences = this.sequences();
    return result && sequences
      ? scoreMemorySession(sequences, result.sequences)
      : null;
  });

  protected readonly recommendations = computed<AxisFinding[]>(() => {
    const sequences = this.sequences();
    const scored = this.scored();
    return sequences && scored
      ? getAxisRecommendations(analyzeMemory(sequences, scored))
      : [];
  });

  protected readonly metricRows = computed<ResultMetricRow[]>(() => {
    const scored = this.scored();
    return scored ? buildMemoryMetricRows(scored) : [];
  });

  protected navigateToCorrection(): void {
    this.router.navigate(
      buildTargetedCorrectionRoute(AxisType.MEMORY, this.page.sessionId),
    );
  }
}
